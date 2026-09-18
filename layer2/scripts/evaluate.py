"""
Evaluate Layer 2.

What can and cannot honestly be measured here:

* The 50 human-reviewed rows in `data/layer2_50_annotation_FILLED.csv` are
  PROVISIONAL seed labels produced during this project, not expert-certified
  ground truth, and 15 of them are held out from model training. They are the
  only labels available, so every metric below is reported with its N and must
  be read as indicative only.
* No independent SIF ground truth exists for the OSHA corpus. Metrics computed
  against the weak labels measure *self-consistency*, not accuracy, and are
  reported in a separate section that says so.
* Control-deficiency ground truth is a single label per row in the seed file
  while the model emits a set, so control metrics are computed as
  "did the asserted set contain the human label".

Usage:  python scripts/evaluate.py
Writes: docs/evaluation_report.json  (+ console summary)
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src import lex_controls as LC  # noqa: E402
from src.evidence import detect_consequence, detect_controls, detect_energy, detect_low_energy  # noqa: E402
from src.normalize import token_count  # noqa: E402
from src.pipeline import analyze  # noqa: E402
from src.rules import resolve_action, resolve_object  # noqa: E402
from src.sif import score_sif  # noqa: E402

DATA = ROOT / "data"
DOCS = ROOT / "docs"
HUMAN = DATA / "human_seed.csv"
WEAK = DATA / "weak_training_set.csv"


def rules_only(text: str) -> dict[str, object]:
    """Pipeline with the statistical layer switched off (no human supervision)."""
    action, _ = resolve_action(text)
    obj, _ = resolve_object(text)
    controls = detect_controls(text)
    sif = score_sif(
        energies=detect_energy(text),
        controls=controls,
        consequences=detect_consequence(text),
        control_severity=LC.SEVERITY,
        low_energy_context=detect_low_energy(text),
        model_prior=None,
        token_count=token_count(text),
    )
    return {
        "action": action.label,
        "object": obj.label,
        "controls": set(controls),
        "sif_score": sif.score,
        "sif_class": sif.classification,
    }


def slot_metrics(truth: list[str], predicted: list[str], name: str) -> dict[str, object]:
    labels = sorted(set(truth) | set(predicted))
    accuracy = float(np.mean([t == p for t, p in zip(truth, predicted)])) if truth else 0.0
    abstain = float(np.mean([p == "unknown" for p in predicted])) if predicted else 0.0
    decided = [(t, p) for t, p in zip(truth, predicted) if p != "unknown"]
    return {
        "n": len(truth),
        "accuracy": round(accuracy, 4),
        "accuracy_when_not_abstaining": round(
            float(np.mean([t == p for t, p in decided])) if decided else 0.0, 4
        ),
        "abstain_rate": round(abstain, 4),
        "macro_f1": round(float(f1_score(truth, predicted, average="macro", zero_division=0)), 4),
        "weighted_f1": round(float(f1_score(truth, predicted, average="weighted", zero_division=0)), 4),
        "labels": labels,
        "confusion_matrix": confusion_matrix(truth, predicted, labels=labels).tolist(),
        "note": f"{name}: single-label accuracy against provisional human seed labels",
    }


def control_metrics(truth: list[str], predicted: list[set[str]]) -> dict[str, object]:
    tp = fp = fn = tn = 0
    for label, pred in zip(truth, predicted):
        if label in ("none", "", "nan"):
            if pred:
                fp += len(pred)
            else:
                tn += 1
        else:
            if label in pred:
                tp += 1
                fp += len(pred) - 1
            else:
                fn += 1
                fp += len(pred)
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return {
        "n": len(truth),
        "true_positive": tp,
        "false_positive": fp,
        "false_negative": fn,
        "true_negative_rows_correctly_left_empty": tn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "note": (
            "human ground truth is ONE control label per row while the system emits a set, "
            "so extra asserted labels count as false positives even when plausible"
        ),
    }


def sif_metrics(truth: list[int], scores: list[float], classes: list[str]) -> dict[str, object]:
    truth_array = np.asarray(truth, dtype=int)
    predicted_strict = np.asarray([1 if c == "SIF_POTENTIAL" else 0 for c in classes], dtype=int)
    decided = np.asarray([c != "UNCERTAIN" for c in classes], dtype=bool)

    def prf(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
        p, r, f, _ = precision_recall_fscore_support(
            y_true, y_pred, average="binary", zero_division=0, labels=[0, 1]
        )
        return {"precision": round(float(p), 4), "recall": round(float(r), 4), "f1": round(float(f), 4)}

    out: dict[str, object] = {
        "n": int(len(truth_array)),
        "positive_rate_in_truth": round(float(truth_array.mean()), 4),
        "abstain_rate": round(float((~decided).mean()), 4),
        "uncertain_treated_as_negative": prf(truth_array, predicted_strict),
        "confusion_matrix_uncertain_as_negative": confusion_matrix(
            truth_array, predicted_strict, labels=[0, 1]
        ).tolist(),
    }
    if decided.any():
        out["on_decided_rows_only"] = prf(truth_array[decided], predicted_strict[decided])
        out["decided_rows"] = int(decided.sum())
    if len(np.unique(truth_array)) == 2:
        out["pr_auc_on_continuous_score"] = round(
            float(average_precision_score(truth_array, np.asarray(scores, dtype=float))), 4
        )
    else:
        out["pr_auc_on_continuous_score"] = "not computable - only one class present"
    return out


def iogp_hit_rate(truth: list[str], predicted: list[list[str]]) -> dict[str, object]:
    considered = [(t, p) for t, p in zip(truth, predicted) if t not in ("none", "", "nan")]
    if not considered:
        return {"n": 0, "note": "no non-'none' IOGP ground truth available"}
    top1 = np.mean([t == (p[0] if p else "") for t, p in considered])
    any_hit = np.mean([t in p for t, p in considered])
    return {
        "n": len(considered),
        "top1_exact": round(float(top1), 4),
        "present_in_returned_candidates": round(float(any_hit), 4),
        "mean_candidates_returned": round(float(np.mean([len(p) for _, p in considered])), 3),
    }


def evaluate_frame(frame: pd.DataFrame, use_models: bool, section: str) -> dict[str, object]:
    truth_action, truth_object, truth_control, truth_sif, truth_iogp = [], [], [], [], []
    pred_action, pred_object, pred_control, pred_sif_score, pred_sif_class, pred_iogp = [], [], [], [], [], []

    for row in frame.itertuples(index=False):
        text = str(row.text_prepared)
        if use_models:
            result = analyze(text)
            pred_action.append(result["action"]["label"])
            pred_object.append(result["object"]["label"])
            pred_control.append({c["label"] for c in result["control_deficiencies"]})
            pred_sif_score.append(result["sif"]["score"])
            pred_sif_class.append(result["sif"]["classification"])
            pred_iogp.append(list(result["iogp_rules"]))
        else:
            result = rules_only(text)
            pred_action.append(result["action"])
            pred_object.append(result["object"])
            pred_control.append(result["controls"])
            pred_sif_score.append(result["sif_score"])
            pred_sif_class.append(result["sif_class"])
            pred_iogp.append([])

        truth_action.append(str(row.human_action))
        truth_object.append(str(row.human_object))
        truth_control.append(str(row.human_control_deficiency))
        truth_sif.append(int(float(row.human_sif_label)))
        truth_iogp.append(str(row.human_iogp_rule))

    out: dict[str, object] = {
        "section": section,
        "statistical_layer_used": use_models,
        "action": slot_metrics(truth_action, pred_action, "action"),
        "object": slot_metrics(truth_object, pred_object, "object"),
        "control_deficiency": control_metrics(truth_control, pred_control),
        "sif": sif_metrics(truth_sif, pred_sif_score, pred_sif_class),
    }
    if use_models:
        out["iogp_rules"] = iogp_hit_rate(truth_iogp, pred_iogp)
    return out


def weak_self_consistency(sample: int = 800) -> dict[str, object]:
    """Agreement between the served pipeline and the weak labels. NOT accuracy."""
    if not WEAK.exists():
        return {"note": "weak_training_set.csv not built"}
    weak = pd.read_csv(WEAK).fillna("")
    weak = weak.sample(n=min(sample, len(weak)), random_state=7)
    agree_action = agree_object = considered_action = considered_object = 0
    sif_agree = 0
    for row in weak.itertuples(index=False):
        result = analyze(str(row.text))
        if str(row.weak_action):
            considered_action += 1
            agree_action += int(result["action"]["label"] == str(row.weak_action))
        if str(row.weak_object):
            considered_object += 1
            agree_object += int(result["object"]["label"] == str(row.weak_object))
        sif_agree += int(result["sif"]["classification"] == str(row.weak_sif_class))
    return {
        "sampled_rows": int(len(weak)),
        "action_agreement": round(agree_action / considered_action, 4) if considered_action else None,
        "object_agreement": round(agree_object / considered_object, 4) if considered_object else None,
        "sif_class_agreement": round(sif_agree / len(weak), 4),
        "note": (
            "SELF-CONSISTENCY ONLY. Weak labels were generated by the same rule layer the "
            "pipeline serves, so high agreement here proves nothing about correctness. "
            "Reported to detect regressions between build_dataset.py and the served pipeline."
        ),
    }


def main() -> int:
    if not HUMAN.exists():
        raise SystemExit("Run: python scripts/build_dataset.py first")
    human = pd.read_csv(HUMAN)
    holdout = human[human["split"] == "holdout"].reset_index(drop=True)

    report: dict[str, object] = {
        "ground_truth_status": (
            "INSUFFICIENT VALIDATED GROUND TRUTH. The only labels available are 50 provisional "
            "human-reviewed seed rows created during this project. No expert-certified SIF "
            "dataset was available, so all numbers below are indicative, small-N, and must not "
            "be quoted as validated accuracy."
        ),
        "human_seed_rows_total": int(len(human)),
        "human_holdout_rows": int(len(holdout)),
        "primary_full_pipeline_on_human_holdout": evaluate_frame(
            holdout, use_models=True, section="full pipeline (rules + models) on 15 unseen human rows"
        ),
        "rules_only_on_all_50_human_rows": evaluate_frame(
            human,
            use_models=False,
            section=(
                "rules/evidence layer only on all 50 human rows - valid because the rule layer "
                "uses zero human supervision, so no leakage"
            ),
        ),
        "full_pipeline_on_all_50_human_rows_LEAKY": evaluate_frame(
            human,
            use_models=True,
            section=(
                "OPTIMISTIC: 35 of these 50 rows were in model training. Reported only for "
                "comparison with the holdout figures - do NOT quote this as performance."
            ),
        ),
        "weak_label_self_consistency": weak_self_consistency(),
        "human_label_distribution": {
            "action": dict(Counter(human["human_action"].astype(str))),
            "object": dict(Counter(human["human_object"].astype(str))),
            "control_deficiency": dict(Counter(human["human_control_deficiency"].astype(str))),
            "sif": dict(Counter(human["human_sif_label"].astype(str))),
            "iogp_rule": dict(Counter(human["human_iogp_rule"].astype(str))),
        },
    }

    DOCS.mkdir(parents=True, exist_ok=True)
    (DOCS / "evaluation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("=" * 74)
    print("LAYER 2 EVALUATION -", report["ground_truth_status"][:60] + "...")
    print("=" * 74)
    for key in (
        "primary_full_pipeline_on_human_holdout",
        "rules_only_on_all_50_human_rows",
        "full_pipeline_on_all_50_human_rows_LEAKY",
    ):
        block = report[key]
        print(f"\n[{key}]  n={block['action']['n']}")
        print(f"  {block['section']}")
        print(
            f"  action  acc={block['action']['accuracy']}  macroF1={block['action']['macro_f1']}"
            f"  abstain={block['action']['abstain_rate']}"
        )
        print(
            f"  object  acc={block['object']['accuracy']}  macroF1={block['object']['macro_f1']}"
            f"  abstain={block['object']['abstain_rate']}"
        )
        control = block["control_deficiency"]
        print(f"  control P={control['precision']} R={control['recall']} F1={control['f1']}")
        sif = block["sif"]
        strict = sif["uncertain_treated_as_negative"]
        print(
            f"  sif     P={strict['precision']} R={strict['recall']} F1={strict['f1']}"
            f"  PR-AUC={sif['pr_auc_on_continuous_score']}  abstain={sif['abstain_rate']}"
        )
        if "iogp_rules" in block:
            print(f"  iogp    {block['iogp_rules']}")
    print(f"\nFull report -> {DOCS / 'evaluation_report.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
