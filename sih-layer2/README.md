# Layer 2 — Context Finder

SIH 2026, Problem Statement 26165. Layer 2 of the OIL Safety Intelligence stack.

Give it one unclear or indirectly-worded safety report; it returns the **action**,
the **object/environment**, the **control deficiencies**, an explainable **SIF
potential** score, candidate **IOGP Life-Saving Rules**, and the **exact text**
that supports every one of those conclusions.

Runs entirely locally on CPU. No GPU, no API keys, no cloud inference.

> **Status: research prototype. Not validated for production safety decisions.**
> Ground truth is 50 provisional human-reviewed rows. Read
> [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md) before quoting any number from it.

---

## The one rule that matters

**A control deficiency is only ever asserted when the report text contains a
span supporting it.** The statistical model cannot assert one. Model-only
suspicions appear in a separate `uncertain_control_candidates` field, marked
`uncertain_no_textual_evidence`, with an empty evidence list. Evidence is always
sliced out of the report — never generated. See §4 of the model card.

---

## Quick start (Windows / PowerShell)

Run every command from the `layer2_sih` directory.

### 1. Create and activate a virtual environment

```powershell
cd "C:\Users\vatsa\OneDrive\Desktop\OIL Safety Intelligence\Layer 2\layer2_sih"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks the activation script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 2. Install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 3. Build the training corpus

```powershell
python scripts/build_dataset.py
```

### 4. Train

```powershell
python scripts/train.py
```

Takes about 30 seconds and writes `models/layer2_bundle.joblib`.

### 5. Evaluate

```powershell
python scripts/evaluate.py
```

Writes `docs/evaluation_report.json`.

### 6. Run the tests

```powershell
python -m pytest tests -q
```

### 7. Start the API

```powershell
python -m uvicorn src.api:app --reload
```

### 8. Open the interactive docs

```powershell
Start-Process "http://127.0.0.1:8000/docs"
```

### 9. Test one report from PowerShell

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/analyze -Method Post -ContentType "application/json" -Body '{"report_id":"R-001","text":"Worker was pressurizing a well casing using temporary equipment without a pressure regulator or pressure safety valve."}' | ConvertTo-Json -Depth 8
```

### 10. Run the full API smoke test

With the server running, in a second PowerShell window:

```powershell
python scripts/smoke_test_api.py
```

### Without starting a server

```powershell
python -m src.inference "A worker entered a confined space without verifying that the atmosphere had been tested."
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | service status, whether the model bundle loaded, any version problems |
| GET | `/taxonomy` | the four closed label vocabularies |
| POST | `/analyze` | analyse one report |
| POST | `/analyze/batch` | analyse many reports in one call |
| GET | `/docs` | Swagger UI |

### `POST /analyze`

Request — `report_id` and `layer1` are both optional:

```json
{
  "report_id": "R-001",
  "text": "Worker was pressurizing a well casing using temporary equipment without a pressure regulator or pressure safety valve.",
  "layer1": {"facility": "Terminal B", "shift": "night"}
}
```

Response (abridged):

```json
{
  "report_id": "R-001",
  "action":  {"label": "pressure_testing", "confidence": 0.93, "evidence": ["pressurizing"], "source": "rule"},
  "object":  {"label": "well_casing", "confidence": 0.97, "evidence": ["well casing"], "source": "rule"},
  "control_deficiencies": [
    {
      "label": "missing_pressure_control",
      "confidence": 0.95,
      "severity": 0.9,
      "evidence": ["without a pressure regulator"],
      "spans": [[70, 100]],
      "source": "evidence"
    }
  ],
  "uncertain_control_candidates": [],
  "sif": {
    "score": 0.88,
    "classification": "SIF_POTENTIAL",
    "abstained": false,
    "components": {"energy": 0.9, "control_gap": 0.9, "consequence": 0.0, "model_prior": 0.71},
    "reasons": [{"factor": "hazardous_energy", "detail": "pressure", "contribution": 0.45, "evidence": ["pressurizing"]}]
  },
  "iogp_rules": ["Line of Fire"],
  "hazardous_energies": [{"label": "pressure", "severity": 0.9, "evidence": ["pressurizing"]}],
  "evidence": ["without a pressure regulator", "pressurizing", "well casing"],
  "meta": {"token_count": 18, "models_available": true, "model_problems": [], "layer1_context": {}}
}
```

`sif.classification` is one of `SIF_POTENTIAL`, `NON_SIF_POTENTIAL`, or
`UNCERTAIN`. **`UNCERTAIN` is a real answer** — reports with insufficient
evidence are not forced into 0 or 1. `NON_SIF_POTENTIAL` is triage guidance, not
clearance.

All values are plain JSON types. No numpy scalars reach the response.

---

## Layer 1 and Layer 3

Layer 2 runs standalone and contains no Layer 1 code. The optional `layer1`
object on `/analyze` is echoed back under `meta.layer1_context` and does not
influence inference, so Layer 1 metadata can be added later without changing or
revalidating Layer 2. Evidence `spans` are character offsets into
`text_prepared`, ready for a Layer 3 UI to highlight.

---

## Layout

```
src/
  taxonomy.py     the four closed label vocabularies (single source of truth)
  normalize.py    unicode, whitespace, typo repair, abbreviation expansion
  lex_actions.py  action lexicon  (pattern, strength) + specificity discounts
  lex_objects.py  object lexicon
  lex_controls.py control mentions, absence cues, direct phrases, severities
  lex_energy.py   hazardous energies, consequence severity, de-escalators
  evidence.py     span extraction; two-stage negation-aware control detection
  rules.py        slot resolution + IOGP Life-Saving Rule mapping
  models.py       model bundle loading, version-mismatch handling
  sif.py          explainable additive SIF score with abstention
  pipeline.py     precedence, confidence caps, JSON-safe assembly
  api.py          FastAPI app
  inference.py    CLI + backwards-compatible analyze() shim
scripts/
  build_dataset.py  OSHA -> weak labels; human seed split
  train.py          TF-IDF + logistic regression bundle
  evaluate.py       honest, leakage-aware metrics
  smoke_test_api.py HTTP smoke test against a running server
tests/              7 required cases, robustness, evidence gating, API
models/             layer2_bundle.joblib + bundle_meta.json
data/               human labels, weak corpus, dataset report
docs/               MODEL_CARD.md, training_report.json, evaluation_report.json
_superseded/        replaced artifacts, kept for inspection (see its README)
```

## Taxonomies

**Action** (18): `pressure_testing`, `hot_work`, `confined_space`,
`working_at_height`, `lifting`, `electrical_work`, `line_breaking`,
`excavation`, `driving`, `chemical_handling`, `drilling_wellwork`,
`maintenance_repair`, `material_handling`, `cleaning`, `inspection_testing`,
`construction_installation`, `manual_tools`, `unknown`

**Control deficiency** (19): `no_isolation`, `no_permit`, `no_gas_test`,
`missing_pressure_control`, `ppe_missing`, `guarding_missing`,
`barrier_bypassed`, `barrier_failed`, `procedure_not_followed`,
`procedure_missing`, `training_gap`, `supervision_inadequate`, `wrong_rating`,
`moc_missing`, `communication_failure`, `exclusion_zone_missing`,
`unknown_stored_energy`, `inspection_missing`, `none`

Call `GET /taxonomy` for the full lists of objects and IOGP rules.

## Known limitations (short version)

* Ground truth is **50 provisional rows**, not expert-certified. Metrics are
  small-N and indicative.
* The weak OSHA labels come from the same rule layer that serves inference, so
  agreement with them measures self-consistency, not accuracy.
* `action` / `object` accuracy on long multi-hazard narratives is weak
  (≈0.33–0.52).
* Control recall is low (≈0.20). Deficiencies implied without absence wording
  are missed.
* An absent label means **"no evidence found"**, never "the control was
  present".
* Confidences are not calibrated probabilities.
* Fatality is never used as a SIF label.

Full detail, including the evaluation methodology and the reasoning behind every
design decision: [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md).
