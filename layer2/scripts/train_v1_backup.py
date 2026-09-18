"""
Train the Layer 2 statistical layer.

Architecture (chosen for this data, not for novelty):

  features : TF-IDF word 1-2 grams  UNION  char_wb 3-5 grams
             char n-grams are what buy robustness to typos, casing noise and
             morphology ("pressurising" / "presurized" / "PRESSURIZED").
  action   : multinomial LogisticRegression  (single-label, 18 classes)
  object   : multinomial LogisticRegression  (single-label, 19 classes)
  controls : one binary LogisticRegression per deficiency with >= MIN_POSITIVES
             weak positives - used ONLY to raise review candidates, never to
             assert a deficiency (see src/pipeline.py)
  sif      : binary LogisticRegression on the explainable scorer's confident
             ends, contributing at most 5% of the final SIF score

Why not transformers: ~4.8k narratives, CPU-only requirement, and the decision
must be auditable. A linear model over n-grams is inspectable, trains in
seconds, and the heavy lifting is done by the evidence layer anyway.

Usage:  python scripts/train.py
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src import taxonomy as TX  # noqa: E402

DATA = ROOT / "data"
MODELS = ROOT / "models"
DOCS = ROOT / "docs"

WEAK = DATA / "weak_training_set.csv"
HUMAN = DATA / "human_seed.csv"

HUMAN_WEIGHT = 8.0  # human seed rows are worth more than weak labels
MIN_CLASS_ROWS = 8
MIN_POSITIVES = 25
RANDOM_STATE = 20260829


def build_vectorizer() -> FeatureUnion:
    return FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=2,
                    max_features=60000,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=3,
                    max_features=120000,
                    sublinear_tf=True,
                    strip_accents="unicode",
                ),
            ),
        ]
    )


def fit_multiclass(
    features, labels: np.ndarray, weights: np.ndarray, name: str
) -> tuple[LogisticRegression | None, dict[str, object]]:
    counts = pd.Series(labels).value_counts()
    keep_classes = counts[counts >= MIN_CLASS_ROWS].index
    mask = np.isin(labels, keep_classes)
    if mask.sum() < 50 or len(keep_classes) < 2:
        return None, {"note": f"insufficient weak-label coverage for {name}"}
    model = LogisticRegression(
        max_iter=3000,
        C=4.0,
        class_weight="balanced",
        solver="lbfgs",
        random_state=RANDOM_STATE,
    )
    model.fit(features[mask], labels[mask], sample_weight=weights[mask])
    return model, {
        "training_rows": int(mask.sum()),
        "classes": sorted(str(c) for c in model.classes_),
        "dropped_rare_classes": sorted(str(c) for c in counts[counts < MIN_CLASS_ROWS].index),
    }


def main() -> int:
    if not WEAK.exists() or not HUMAN.exists():
        raise SystemExit("Training data missing. Run: python scripts/build_dataset.py")

    MODELS.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    weak = pd.read_csv(WEAK).fillna({"weak_action": "", "weak_object": "", "weak_controls": ""})
    human = pd.read_csv(HUMAN)
    human_train = human[human["split"] == "train"].reset_index(drop=True)
    print(f"[data] weak rows={len(weak)}  human train rows={len(human_train)}  (holdout kept unseen)")

    corpus = pd.concat(
        [
            pd.DataFrame(
                {
                    "text": weak["text"].astype(str),
                    "action": weak["weak_action"].astype(str),
                    "object": weak["weak_object"].astype(str),
                    "controls": weak["weak_controls"].astype(str),
                    "sif_score": weak["weak_sif_score"].astype(float),
                    "sif_label": np.where(
                        weak["weak_sif_class"] == "SIF_POTENTIAL",
                        1,
                        np.where(weak["weak_sif_class"] == "NON_SIF_POTENTIAL", 0, -1),
                    ),
                    "weight": 1.0,
                }
            ),
            pd.DataFrame(
                {
                    "text": human_train["text_prepared"].astype(str),
                    "action": human_train["human_action"].astype(str),
                    "object": human_train["human_object"].astype(str),
                    "controls": human_train["human_control_deficiency"].astype(str).replace("none", ""),
                    "sif_score": np.nan,
                    "sif_label": human_train["human_sif_label"].astype(float).astype(int),
                    "weight": HUMAN_WEIGHT,
                }
            ),
        ],
        ignore_index=True,
    )

    vectorizer = build_vectorizer()
    features = vectorizer.fit_transform(corpus["text"])
    print(f"[features] {features.shape[0]} x {features.shape[1]}")

    report: dict[str, object] = {
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "sklearn_version": sklearn.__version__,
        "python_version": sys.version.split()[0],
        "feature_matrix": list(features.shape),
        "human_train_rows": int(len(human_train)),
        "weak_rows": int(len(weak)),
    }

    weights = corpus["weight"].to_numpy(dtype=float)

    action_mask = corpus["action"].isin(TX.ACTIONS) & (corpus["action"] != "") & (corpus["action"] != TX.UNKNOWN)
    action_model, action_meta = fit_multiclass(
        features[action_mask.to_numpy()],
        corpus.loc[action_mask, "action"].to_numpy(),
        weights[action_mask.to_numpy()],
        "action",
    )
    report["action"] = action_meta

    object_mask = corpus["object"].isin(TX.OBJECTS) & (corpus["object"] != "") & (corpus["object"] != TX.UNKNOWN)
    object_model, object_meta = fit_multiclass(
        features[object_mask.to_numpy()],
        corpus.loc[object_mask, "object"].to_numpy(),
        weights[object_mask.to_numpy()],
        "object",
    )
    report["object"] = object_meta

    control_models: dict[str, LogisticRegression] = {}
    control_meta: dict[str, object] = {}
    exploded = corpus["controls"].fillna("").str.split("|")
    for label in TX.CONTROL_DEFICIENCIES:
        if label == TX.NONE:
            continue
        target = exploded.map(lambda parts, label=label: int(label in parts)).to_numpy()
        positives = int(target.sum())
        if positives < MIN_POSITIVES:
            control_meta[label] = {"skipped": f"only {positives} weak positives (< {MIN_POSITIVES})"}
            continue
        model = LogisticRegression(
            max_iter=2000, C=4.0, class_weight="balanced", solver="lbfgs", random_state=RANDOM_STATE
        )
        model.fit(features, target, sample_weight=weights)
        control_models[label] = model
        control_meta[label] = {"weak_positives": positives}
    report["controls"] = control_meta

    sif_mask = (corpus["sif_label"] >= 0).to_numpy()
    sif_target = corpus.loc[sif_mask, "sif_label"].to_numpy(dtype=int)
    sif_model = None
    if len(np.unique(sif_target)) >= 2:
        sif_model = LogisticRegression(
            max_iter=3000, C=2.0, class_weight="balanced", solver="lbfgs", random_state=RANDOM_STATE
        )
        sif_model.fit(features[sif_mask], sif_target, sample_weight=weights[sif_mask])
        report["sif"] = {
            "training_rows": int(sif_mask.sum()),
            "positive_rate": round(float(sif_target.mean()), 4),
            "excluded_uncertain_rows": int((~sif_mask).sum()),
        }
    else:
        report["sif"] = {"note": "insufficient class variety in weak SIF labels"}

    bundle = {
        "vectorizer": vectorizer,
        "action": action_model,
        "object": object_model,
        "controls": control_models,
        "sif": sif_model,
        "sklearn_version": sklearn.__version__,
        "meta": report,
    }
    joblib.dump(bundle, MODELS / "layer2_bundle.joblib", compress=3)
    (MODELS / "bundle_meta.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (DOCS / "training_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[saved] {MODELS / 'layer2_bundle.joblib'}")
    print(json.dumps(report, indent=2)[:2500])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
