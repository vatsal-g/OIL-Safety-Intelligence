"""
Statistical model wrapper.

Design constraints that matter here:

* The models are a *secondary* signal. If the artefacts are missing or were
  pickled by a different scikit-learn version, the service must still start and
  still answer - degraded to rules only - rather than crash or silently return
  numbers produced by a mismatched estimator.
* Every probability leaving this module is a plain Python float, never
  `numpy.float64`, so FastAPI can serialise it without a custom encoder.
"""

from __future__ import annotations

import json
import os
import warnings
from dataclasses import dataclass, field
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE / "models"
BUNDLE_PATH = MODEL_DIR / "layer2_bundle.joblib"
META_PATH = MODEL_DIR / "bundle_meta.json"


@dataclass
class ModelBundle:
    """Loaded artefacts plus a record of anything that went wrong."""

    vectorizer: object | None = None
    action: object | None = None
    object_: object | None = None
    controls: dict[str, object] = field(default_factory=dict)
    sif: object | None = None
    adapter_vectorizer: object | None = None
    adapter_action: object | None = None
    adapter_object: object | None = None
    adapter_weight: float = 0.0
    meta: dict[str, object] = field(default_factory=dict)
    available: bool = False
    problems: list[str] = field(default_factory=list)

    def probabilities(self, model: object, text: str) -> dict[str, float]:
        if self.vectorizer is None or model is None:
            return {}
        try:
            features = self.vectorizer.transform([text])  # type: ignore[attr-defined]
            row = model.predict_proba(features)[0]  # type: ignore[attr-defined]
            classes = model.classes_  # type: ignore[attr-defined]
            return {str(c): float(p) for c, p in zip(classes, row)}
        except Exception as exc:  # pragma: no cover - defensive
            self.problems.append(f"predict_proba failed: {type(exc).__name__}: {exc}")
            return {}

    def adapter_probabilities(self, model: object, text: str) -> dict[str, float]:
        if self.adapter_vectorizer is None or model is None:
            return {}
        try:
            features = self.adapter_vectorizer.transform([text])  # type: ignore[attr-defined]
            row = model.predict_proba(features)[0]  # type: ignore[attr-defined]
            classes = model.classes_  # type: ignore[attr-defined]
            return {str(c): float(p) for c, p in zip(classes, row)}
        except Exception as exc:  # pragma: no cover - defensive
            self.problems.append(f"adapter predict_proba failed: {type(exc).__name__}: {exc}")
            return {}

    def blended_probabilities(self, base_model: object, adapter_model: object, text: str) -> dict[str, float]:
        base = self.probabilities(base_model, text)
        adapter = self.adapter_probabilities(adapter_model, text)
        if not adapter:
            return base
        if not base:
            return adapter
        weight = max(0.0, min(1.0, float(self.adapter_weight)))
        keys = set(base) | set(adapter)
        return {k: (1.0 - weight) * float(base.get(k, 0.0)) + weight * float(adapter.get(k, 0.0)) for k in keys}

    def binary_probability(self, model: object, text: str) -> float | None:
        probs = self.probabilities(model, text)
        if not probs:
            return None
        for key in ("1", "1.0", "True"):
            if key in probs:
                return probs[key]
        # Fall back to the highest-indexed class.
        return probs[sorted(probs)[-1]]


_BUNDLE: ModelBundle | None = None


def load_bundle(force: bool = False) -> ModelBundle:
    """Load (and memoise) the model bundle. Never raises."""
    global _BUNDLE
    if _BUNDLE is not None and not force:
        return _BUNDLE

    bundle = ModelBundle()
    if not BUNDLE_PATH.exists():
        bundle.problems.append(
            f"model bundle not found at {BUNDLE_PATH}; running rules-only. "
            "Run: python scripts/train.py"
        )
        _BUNDLE = bundle
        return bundle

    try:
        import joblib
        import sklearn

        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            payload = joblib.load(BUNDLE_PATH)
            for entry in caught:
                if "InconsistentVersionWarning" in type(entry.message).__name__ or "unpickle" in str(entry.message):
                    bundle.problems.append(f"sklearn version mismatch: {str(entry.message)[:160]}")

        trained_with = str(payload.get("sklearn_version", "unknown"))
        if trained_with != sklearn.__version__:
            bundle.problems.append(
                f"bundle trained with scikit-learn {trained_with}, running {sklearn.__version__}; "
                "retrain with scripts/train.py"
            )

        bundle.vectorizer = payload.get("vectorizer")
        bundle.action = payload.get("action")
        bundle.object_ = payload.get("object")
        bundle.controls = payload.get("controls") or {}
        bundle.sif = payload.get("sif")
        bundle.adapter_vectorizer = payload.get("adapter_vectorizer")
        bundle.adapter_action = payload.get("adapter_action")
        bundle.adapter_object = payload.get("adapter_object")
        bundle.adapter_weight = float(payload.get("adapter_weight", 0.0) or 0.0)
        bundle.meta = payload.get("meta") or {}
        bundle.available = bundle.vectorizer is not None
    except Exception as exc:
        bundle.problems.append(f"failed to load model bundle: {type(exc).__name__}: {exc}")

    if META_PATH.exists():
        try:
            bundle.meta.setdefault("training_report", json.loads(META_PATH.read_text(encoding="utf-8")))
        except Exception:
            pass

    _BUNDLE = bundle
    return bundle


def bundle_status() -> dict[str, object]:
    bundle = load_bundle()
    return {
        "models_available": bool(bundle.available),
        "control_models": sorted(bundle.controls),
        "problems": list(bundle.problems),
        "trained_at": bundle.meta.get("trained_at", "unknown"),
        "sklearn_version_at_training": bundle.meta.get("sklearn_version", "unknown"),
    }


def legacy_artifacts() -> list[str]:
    """Pre-existing single-purpose .joblib files kept for reference only."""
    names = [
        "tfidf_vectorizer.joblib",
        "action_model.joblib",
        "object_model.joblib",
        "sif_model_weak.joblib",
        "control_models.joblib",
    ]
    return [n for n in names if (MODEL_DIR / n).exists()]


__all__ = [
    "BASE",
    "MODEL_DIR",
    "BUNDLE_PATH",
    "ModelBundle",
    "load_bundle",
    "bundle_status",
    "legacy_artifacts",
    "os",
]
