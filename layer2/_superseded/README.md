# Superseded files

Nothing here is used by the running service. It is kept, not deleted, so the
original state of the repository remains inspectable. A full byte-for-byte copy
of the pre-modification tree also exists at
`../../layer2_sih_BACKUP_20260829/`.

## models/

Five scikit-learn artifacts pickled with **scikit-learn 1.8.0** while this
environment runs **1.9.0**. Loading them raised
`InconsistentVersionWarning` on every import, which is an unsafe basis for a
safety tool: unpickling across minor versions is not a supported operation and
can silently change estimator behaviour. They were replaced by a single
`models/layer2_bundle.joblib` that records the scikit-learn version it was
trained with, and `src/models.py` refuses to trust a bundle whose recorded
version does not match the runtime.

Regenerate the current bundle at any time with `python scripts/train.py`.

## docs/model_card.md, docs/training_metrics_weak.json, docs/bsee_smoke_test.json

Documentation and metrics describing the previous (substring-matching)
implementation. Superseded by `docs/MODEL_CARD.md`, `docs/training_report.json`
and `docs/evaluation_report.json`.

## data/annotation_review_1000.csv

Broken. The file contains only the five `human_*` label columns and eight rows,
with **no narrative text at all** — the old `src/train.py` overwrote it with a
label-only projection. It cannot be used for supervision in that state and is
kept purely as a record. The intact human labels live in
`data/layer2_50_annotation_FILLED.csv`.

## scripts/scripts_old_train.py.bak

The original `src/train.py`. Retained because it documents two decisions that
were deliberately reversed:

1. It read a hard-coded Linux path
   `/mnt/data/ITA_Case_Detail_Data_2025_through_3-15-2026 (1).csv`, which does
   not exist on this machine (or anywhere in this repository), so the script
   could never run here.
2. It derived the SIF label directly from `incident_outcome == death`. Fatality
   is not equivalent to SIF potential — a near-miss with a released energy
   source has SIF potential and no injury at all — so the current pipeline
   scores SIF from hazardous energy, barrier state and consequence context
   instead, with consequence contributing only 13% of the score.
