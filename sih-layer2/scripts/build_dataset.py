"""
Build the Layer 2 training corpus.

Inputs (all local, nothing downloaded):
  * layer2_sih/January2015toNovember2025.csv           - OSHA accident abstracts
  * ../OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL.csv      - additional abstracts (optional)
  * layer2_sih/data/layer2_50_annotation_FILLED.csv     - 50 human-reviewed seed rows

Outputs:
  * data/weak_training_set.csv   - OSHA rows with rule-derived (weak) labels
  * data/human_seed.csv          - the 50 human rows, normalised + split assigned
  * data/dataset_report.json     - row counts and label coverage

The weak labels come from the evidence/rule layer. That makes them *not*
independent of the rule layer at inference time - documented in
docs/MODEL_CARD.md. Their purpose is to let a character-n-gram model generalise
to phrasings the regexes miss, and to give the SIF prior something to learn.

Usage:  python scripts/build_dataset.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src import lex_controls as LC  # noqa: E402
from src.evidence import detect_consequence, detect_controls, detect_energy, detect_low_energy  # noqa: E402
from src.normalize import prepare, token_count  # noqa: E402
from src.rules import resolve_action, resolve_object  # noqa: E402
from src.sif import score_sif  # noqa: E402

DATA = ROOT / "data"
OSHA_LOCAL = ROOT / "January2015toNovember2025.csv"
OSHA_EXTRA = ROOT.parent / "OSHA HSE DATA_ALL ABSTRACTS 15-17_FINAL.csv"
HUMAN = DATA / "layer2_50_annotation_FILLED.csv"

TEXT_COLUMNS_OLD = ["Abstract Text", "Event Description", "Event Keywords", "Event type", "Nature of Injury"]
TEXT_COLUMNS_NEW = ["Final Narrative", "EventTitle", "NatureTitle", "Part of Body Title", "SourceTitle", "Secondary Source Title"]
HOLDOUT_FRACTION = 0.30
RANDOM_STATE = 20260829

# Rule confidence required before a weak slot label is used as a training target.
MIN_SLOT_CONFIDENCE = 0.50


def load_osha() -> pd.DataFrame:
    frames = []
    for path in (OSHA_LOCAL, OSHA_EXTRA):
        if not path.exists():
            print(f"[skip] {path.name} not found")
            continue
        frame = pd.read_csv(path, low_memory=False)
        frame["_source"] = path.name
        frames.append(frame)
        print(f"[load] {path.name}: {len(frame)} rows")
    if not frames:
        raise SystemExit("No OSHA source CSV found - cannot build the weak corpus.")
    merged = pd.concat(frames, ignore_index=True)
    if "summary_nr" in merged.columns:
        before = len(merged)
        merged = merged.drop_duplicates(subset=["summary_nr"], keep="first")
        print(f"[dedupe] {before} -> {len(merged)} rows on summary_nr")
    elif "ID" in merged.columns:
        before = len(merged)
        merged = merged.drop_duplicates(subset=["ID"], keep="first")
        print(f"[dedupe] {before} -> {len(merged)} rows on ID")
    if "Final Narrative" in merged.columns:
        cols = [c for c in TEXT_COLUMNS_NEW if c in merged.columns]
    else:
        cols = [c for c in TEXT_COLUMNS_OLD if c in merged.columns]
    merged["text"] = merged[cols].fillna("").astype(str).agg(" ".join, axis=1).map(prepare)
    merged = merged[merged["text"].str.len() > 40].reset_index(drop=True)
    return merged


def weak_label_row(text: str) -> dict[str, object]:
    action, _ = resolve_action(text)
    obj, _ = resolve_object(text)
    controls = detect_controls(text)
    energies = detect_energy(text)
    sif = score_sif(
        energies=energies,
        controls=controls,
        consequences=detect_consequence(text),
        control_severity=LC.SEVERITY,
        low_energy_context=detect_low_energy(text),
        model_prior=None,
        token_count=token_count(text),
    )
    return {
        "weak_action": action.label if action.confidence >= MIN_SLOT_CONFIDENCE else "",
        "weak_action_conf": round(action.confidence, 3),
        "weak_object": obj.label if obj.confidence >= MIN_SLOT_CONFIDENCE else "",
        "weak_object_conf": round(obj.confidence, 3),
        "weak_controls": "|".join(sorted(controls)),
        "weak_sif_score": sif.score,
        "weak_sif_class": sif.classification,
        "weak_energies": "|".join(sorted(energies)),
    }


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    osha = load_osha()
    print(f"[weak-label] scoring {len(osha)} OSHA narratives with the rule layer...")
    labels = pd.DataFrame([weak_label_row(t) for t in osha["text"]])
    id_col = "summary_nr" if "summary_nr" in osha.columns else "ID"
    weak = pd.concat([osha[[id_col, "_source", "text"]].rename(columns={id_col:"summary_nr"}).reset_index(drop=True), labels], axis=1)
    weak.to_csv(DATA / "weak_training_set.csv", index=False)

    if not HUMAN.exists():
        raise SystemExit(f"Human seed file missing: {HUMAN}")
    human = pd.read_csv(HUMAN)
    human["text_prepared"] = human["text"].map(prepare)
    human = human[human["text_prepared"].str.len() > 20].reset_index(drop=True)
    # Deterministic, stratified-by-SIF holdout so evaluation is never trained on.
    human["split"] = "train"
    holdout = (
        human.groupby("human_sif_label", group_keys=False)
        .apply(lambda g: g.sample(frac=HOLDOUT_FRACTION, random_state=RANDOM_STATE), include_groups=False)
        .index
    )
    human.loc[human.index.isin(holdout), "split"] = "holdout"
    human.to_csv(DATA / "human_seed.csv", index=False)

    report = {
        "osha_rows": int(len(weak)),
        "osha_sources": sorted(weak["_source"].unique().tolist()),
        "weak_action_labelled": int((weak["weak_action"] != "").sum()),
        "weak_object_labelled": int((weak["weak_object"] != "").sum()),
        "weak_rows_with_control_evidence": int((weak["weak_controls"] != "").sum()),
        "weak_sif_class_counts": {str(k): int(v) for k, v in weak["weak_sif_class"].value_counts().items()},
        "weak_action_counts": {
            str(k): int(v) for k, v in weak.loc[weak.weak_action != "", "weak_action"].value_counts().items()
        },
        "weak_object_counts": {
            str(k): int(v) for k, v in weak.loc[weak.weak_object != "", "weak_object"].value_counts().items()
        },
        "human_rows": int(len(human)),
        "human_split_counts": {str(k): int(v) for k, v in human["split"].value_counts().items()},
        "human_sif_counts": {str(k): int(v) for k, v in human["human_sif_label"].value_counts().items()},
        "notes": [
            "Weak labels are derived from the rule/evidence layer, not from independent annotation.",
            "human_* columns are PROVISIONAL human-reviewed seed labels, not expert-certified ground truth.",
            "incident fatality is NOT used as a SIF label anywhere in this pipeline.",
        ],
    }
    (DATA / "dataset_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2)[:2000])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
