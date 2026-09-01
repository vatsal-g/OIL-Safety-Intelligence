# Model Card — Layer 2 "Context Finder"

**Component:** Layer 2 of the OIL Safety Intelligence stack (SIH 2026, PS 26165)
**Version:** 1.0.0
**Date:** 2026-08-29
**Status:** research prototype. **NOT validated for production safety decisions.**

---

## 1. What this component does

Given one free-text safety report — typically unclear, indirect, or written by
someone who is not a safety professional — Layer 2 returns a structured
interpretation:

| Field | Meaning |
|---|---|
| `action` | what task was being performed (18-value taxonomy) |
| `object` | what was being worked on / the environment (19 values) |
| `control_deficiencies` | which barriers were missing or defeated (19 values incl. `none`) |
| `sif` | Serious-Injury-or-Fatality potential: score, classification, reasons |
| `iogp_rules` | candidate IOGP Life-Saving Rule(s) (10 values incl. `none`) |
| `evidence` | the exact spans of the report that support the above |
| confidences | per-slot confidence, plus explicit abstention |

The taxonomies are closed. `src/taxonomy.py` is the single source of truth and
`src/pipeline.py` coerces every emitted label into it, so the API can never
return a value outside the agreed vocabulary.

## 2. Intended use / out of scope

**Intended:** triage support — surfacing that a report *may* describe a
high-potential event so a human safety professional reviews it sooner, and
showing them which words drove that conclusion.

**Out of scope:** deciding SIF classification of record; closing or dismissing
an investigation; disciplinary use; regulatory reporting; any use where a false
negative goes unreviewed. A `NON_SIF_POTENTIAL` output is **not** clearance.

## 3. Architecture and why

```
text
 └─ normalize.py     unicode/whitespace, ~35 unambiguous typo repairs,
 │                   abbreviation expansion (LOTO, PTW, CSE, PSV, H2S, BOP...)
 ├─ evidence.py      lexicon matching -> (label, score, evidence spans)
 │                   two-stage negation-aware control detection
 ├─ rules.py         argmax with specificity discounting; IOGP mapping
 ├─ models.py        TF-IDF + LogisticRegression bundle (secondary only)
 ├─ sif.py           explainable additive risk score with abstention
 └─ pipeline.py      precedence, confidence caps, JSON-safe assembly
```

**Why linear models over n-grams and not a transformer.** The supervised signal
available is 50 provisional human rows plus ~4.8k rule-labelled OSHA
narratives. That is far too little to fine-tune a transformer without it simply
memorising the rule layer, the requirement is CPU-only local inference, and the
output has to be auditable to a specific phrase. A TF-IDF `FeatureUnion` of
word 1–2 grams and `char_wb` 3–5 grams trains in ~30 s, and the character
n-grams are what deliver robustness to the misspellings and casing noise that
dominate real report text. No GPU, no API keys, no network calls at inference.

## 4. THE SAFETY RULE: evidence gating

> A control deficiency is asserted **only** when the report text contains a span
> supporting it. The statistical model can never assert one.

Implementation:

* `detect_controls()` is two-stage. Stage A matches self-sufficient phrases
  ("without first isolating"). Stage B requires a **control mention** (e.g.
  "lock out", "gas test", "work permit") *and* an **absence cue** (~26 patterns:
  without / no / never / failed / missing / bypassed / disabled / did not /
  before …) within a 90-character window clipped to the sentence, with the joint
  span capped at 160 characters. A cue further from the mention scores lower.
* **Negation scope** is handled. A presence cue ("was in place", "had been
  tested") only damps the score when it appears *before* the absence cue, so
  "*without* verifying that the atmosphere *had been tested*" is correctly a
  deficiency, while "a valid work permit *was in place before* the work started"
  is not.
* **Order-sensitive cues.** "before" / "prior to" only count when they precede
  the control mention, because as a suffix they usually mean the control was
  applied first.
* Six labels are `DIRECT_ONLY` (`barrier_failed`, `procedure_not_followed`,
  `procedure_missing`, `wrong_rating`, `communication_failure`,
  `unknown_stored_energy`) — their generic mentions are too ambiguous to gate on
  a nearby cue, so they are emitted only from an explicit phrase.
* Model-only suggestions go to a **separate** field,
  `uncertain_control_candidates`, each carrying
  `"status": "uncertain_no_textual_evidence"` and an **empty** evidence list.
  They are never merged into `control_deficiencies`.
* For `action` / `object`, the model fills a slot **only if the rule layer
  abstained**, and the result is labelled `source="model_no_evidence"` with its
  confidence capped at **0.60** because there is no span to show.
* Every asserted deficiency also carries character `spans` into
  `text_prepared`, so the exact words can be highlighted and independently
  checked. `tests/test_evidence_gating.py` enforces all of the above.

Nothing in the system generates or paraphrases evidence text — every span is
sliced out of the prepared report string.

## 5. SIF scoring

`score = 0.50·energy + 0.32·control_gap + 0.13·consequence + 0.05·model_prior`
(+ a 0.12 *precursor* bonus when high hazardous energy co-occurs with a
high-severity barrier gap — the classic SIF precursor pattern).

* Thresholds: `≥ 0.50` → `SIF_POTENTIAL`; `< 0.30` → `NON_SIF_POTENTIAL`;
  in between → **`UNCERTAIN`** (explicit abstention).
* Reports shorter than 5 tokens, or with no energy, barrier or consequence
  evidence at all, abstain rather than being forced to 0 or 1.
* Explicit low-energy context (wet office floor, break room, first aid) applies
  a ×0.45 de-escalation, which is how "slipped on a wet office floor" avoids
  being flagged.
* The output includes `components` and `reasons` — every contribution is
  itemised with its evidence, so the score is inspectable rather than asserted.

**Fatality is NOT used as a SIF label anywhere.** The user requirement and the
underlying safety logic agree: a fatality is an outcome, not a potential, and a
no-injury near miss can carry full SIF potential. Consequence severity
contributes at most 13% of the score, as *context*. The old `src/train.py`
(kept in `_superseded/`) did use `incident_outcome == death` directly; that was
removed.

## 6. Data

| File | Rows | Role | Notes |
|---|---|---|---|
| `January2015toNovember2025.csv` | 4,847 | raw source | OSHA accident abstracts, 29 columns |
| `../OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL.csv` | 4,847 | raw source | identical schema and content; removed by de-duplication on `summary_nr` |
| `data/layer2_50_annotation_FILLED.csv` | 50 | **only human labels** | `human_action`, `human_object`, `human_control_deficiency`, `human_sif_label`, `human_iogp_rule` |
| `data/weak_training_set.csv` | 4,844 | derived | rule-layer (weak) labels over the de-duplicated OSHA text |
| `data/human_seed.csv` | 50 | derived | the human rows, normalised, with a 35 train / 15 holdout split |

Text is built by concatenating `Abstract Text`, `Event Description`,
`Event Keywords`, `Event type`, `Nature of Injury`, then normalising; rows
shorter than 40 characters are dropped.

**`ITA_Case_Detail_Data_2025_through_3-15-2026 (1).csv` is not present.** It was
referenced by a hard-coded Linux path in the previous training script. The
filesystem was searched; the file does not exist in or near this repository, so
nothing depends on it.

### Label provenance — read this before quoting any number

* The 50 `human_*` rows are **PROVISIONAL HUMAN-REVIEWED SEED LABELS** created
  during this project. They are **not** expert-certified ground truth and have
  not been through inter-annotator agreement. They are also skewed:
  `human_sif_label` is 40×1 / 10×0, `human_object` is `machinery` in 19 of 50
  rows, and `human_control_deficiency` is `none` in 36 of 50.
* The ~4.8k OSHA labels are **weak**: they were produced by the same rule layer
  that runs at inference time. Agreement between the model and those labels
  therefore measures **self-consistency, not accuracy**, and is reported under
  that name. This circularity is the single biggest limitation of this build.
  The weak labels exist to let character n-grams generalise to phrasings the
  regexes miss, not to establish correctness.
* No labels were fabricated to inflate dataset size, and no existing data file
  was deleted or overwritten.

## 7. Training

`python scripts/build_dataset.py` → `python scripts/train.py`.

* Features: word TF-IDF (1,2), `min_df=2`, ≤60k features ∪ `char_wb` (3,5),
  `min_df=3`, ≤120k features; both `sublinear_tf`, accents stripped.
* `action`, `object`: multinomial `LogisticRegression(C=4.0,
  class_weight="balanced", max_iter=3000)`; classes with fewer than 8 rows are
  dropped rather than modelled on noise.
* `control_deficiencies`: one binary logistic model per label with ≥25 weak
  positives (6 qualified). Used **only** to raise review candidates.
* `sif`: binary logistic model trained only on rows where the explainable
  scorer was *confident*; `UNCERTAIN` rows are excluded rather than coerced.
* Human seed rows carry `sample_weight = 8.0`; only the 35 `split == "train"`
  rows are used. `RANDOM_STATE = 20260829` throughout.
* Artifacts: `models/layer2_bundle.joblib` (records its own
  `sklearn_version`), `models/bundle_meta.json`, `docs/training_report.json`.

If the bundle is missing, or was pickled by a different scikit-learn version,
`load_bundle()` records the problem in `meta.model_problems`, reports it on
`GET /health`, and the service **degrades to rules-only instead of crashing**.

## 8. Evaluation methodology and results

`python scripts/evaluate.py` → `docs/evaluation_report.json`.

> **INSUFFICIENT VALIDATED GROUND TRUTH.** The only labels available are 50
> provisional human-reviewed rows produced during this project. No
> expert-certified SIF dataset was available. Every figure below is
> small-N and indicative. None of it may be quoted as validated accuracy.

Three separately-labelled sections are reported, because they are not equally
trustworthy:

1. **Primary — full pipeline on the 15 unseen human rows** (never trained on).
2. **Rules-only on all 50 human rows.** Legitimate on the full 50 because the
   rule/evidence layer uses zero human supervision, so there is no leakage.
3. **Full pipeline on all 50 — flagged `LEAKY`.** 35 of those rows were in
   training. Comparison only.

Plus a **self-consistency** section against the weak labels, which exists to
detect drift between `build_dataset.py` and the served pipeline, and is
explicitly not an accuracy measure.

### Primary: full pipeline, 15 unseen human rows

| Slot | Metric |
|---|---|
| action | acc 0.333, macro-F1 0.303, abstain 0.133 |
| object | acc 0.400, macro-F1 0.241, abstain 0.133 |
| control deficiency | P 0.333, R 0.200, F1 0.250 |
| SIF | P 0.800, R 0.667, F1 0.727, PR-AUC 0.862, abstain 0.133 |
| IOGP rule | top-1 0.429, in returned candidates 0.714 |

### Rules-only, all 50 human rows (no leakage)

| Slot | Metric |
|---|---|
| action | acc 0.360, macro-F1 0.348, abstain 0.080 |
| object | acc 0.520, macro-F1 0.328, abstain 0.080 |
| control deficiency | P 0.375, R 0.214, F1 0.273 |
| SIF | P 0.800, R 0.700, F1 0.747, PR-AUC 0.814, abstain 0.120 |

Control metrics are pessimistic by construction: the human file records **one**
control label per row while the system emits a **set**, so every additional
asserted label counts as a false positive even when it is defensible.

### Honest reading of these numbers

SIF ranking is the most usable output (PR-AUC ≈ 0.81–0.86 on 50 and 15 rows
respectively) and the seven specification cases all resolve as intended. Action
and object accuracy near 0.33–0.52 is **weak**, and the cause is identifiable
rather than mysterious: OSHA abstracts are long and mention several hazards, the
human annotator labelled the *primary task* while the rule layer picks the
highest-specificity keyword anywhere in the narrative — frequently from the
injury-mechanism clause at the end. Mitigations applied: specificity discounting
of generic descriptors, active-voice-only pressure patterns so "was still
pressurized" describes a state rather than the task, and a mild positional
discount on matches late in long narratives. This is not solved. It needs more
annotated data, not more regex tuning, and further tuning against 50 provisional
rows would be overfitting to labels that are themselves unverified.

## 9. Known limitations

1. Ground truth is 50 provisional rows. Everything else is weak supervision
   derived from the rule layer — the metrics cannot separate "the model is
   right" from "the model agrees with the regexes".
2. English only. Rules are lexical; unusual phrasing, other languages, or
   heavy jargon will silently reduce recall.
3. Missing evidence looks the same as an absent hazard. A label absent from the
   output means **"no evidence found"**, never "the control was present". This
   is a deliberate false-negative bias: the system prefers silence to invention.
4. Long multi-hazard narratives resolve `action`/`object` unreliably (§8).
5. Control recall is low (~0.20–0.21). Reports that imply a deficiency without
   any absence wording are missed.
6. OSHA abstracts are US general-industry, weighted toward fatal outcomes
   (2,964 of 4,847). Oil-and-gas-specific and near-miss language is
   under-represented relative to the target domain.
7. Confidences are logistic-regression outputs and lexicon strengths. They are
   **not calibrated** against observed frequencies; treat them as ordering
   information, not probabilities.
8. `sif` weights and thresholds were chosen for explainability and sanity on the
   specification cases. They are not fitted to outcome data, because no
   validated SIF outcome data was available.
9. No adversarial-input hardening beyond length limits. Text is accepted as-is.

## 10. Layer 1 / Layer 3 integration

Layer 2 is self-contained and requires nothing from Layer 1 to run. `POST
/analyze` accepts an optional `layer1` object; it is echoed back under
`meta.layer1_context` and **does not influence inference**, so Layer 1 metadata
can be attached later without changing or revalidating any Layer 2 behaviour.
No Layer 1 code is present in or required by this directory.

## 11. Reproducing

```powershell
python scripts/build_dataset.py
python scripts/train.py
python scripts/evaluate.py
python -m pytest tests -q
```

Deterministic given the same inputs (`RANDOM_STATE = 20260829`). Pinned
environment: Python 3.14.6, scikit-learn 1.9.0, pandas 3.0.3, numpy 2.4.6 — see
`requirements.txt`.
