"""
Layer 2 pipeline: text in, structured safety context out.

Order of precedence, by design:

1. Rule / evidence layer (auditable phrase matches).
2. Statistical models - only to fill a slot the rules abstained on, and always
   marked `source="model"` with a capped confidence because there is no span to
   show the user.
3. Control deficiencies are **never** taken from the model alone. Model-only
   suggestions are surfaced separately in `uncertain_control_candidates`.
"""

from __future__ import annotations

from typing import Any

from . import lex_controls as LC
from . import taxonomy as TX
from .evidence import detect_consequence, detect_controls, detect_energy, detect_low_energy
from .models import ModelBundle, load_bundle
from .normalize import prepare, token_count
from .rules import Slot, map_iogp_rules, resolve_action, resolve_object
from .sif import score_sif

# A model prediction with no textual evidence is never allowed to look certain.
MODEL_MIN_CONFIDENCE = 0.40
MODEL_CONFIDENCE_CAP = 0.60
# Threshold above which a model-only control suggestion is worth showing as a
# candidate for human review (still never asserted).
CONTROL_CANDIDATE_THRESHOLD = 0.65

MODEL_NOTE = (
    "Layer 2 output is evidence-gated and NOT validated for production safety "
    "decisions. Control deficiencies are only asserted when supporting text is "
    "present; SIF potential is an explainable risk score, not a certified "
    "SIF classification. See docs/MODEL_CARD.md."
)


def _slot_dict(slot: Slot) -> dict[str, Any]:
    return {
        "label": str(slot.label),
        "confidence": round(float(slot.confidence), 3),
        "evidence": [str(e) for e in slot.evidence],
        "source": str(slot.source),
        "alternatives": [
            {"label": str(a["label"]), "confidence": round(float(a["confidence"]), 3)}  # type: ignore[index]
            for a in slot.alternatives
        ],
    }


def _fill_from_model(
    slot: Slot,
    probabilities: dict[str, float],
    vocabulary: tuple[str, ...],
) -> Slot:
    """Use the classifier as a confidence-based second opinion.

    Rules remain the primary evidence source, but a sufficiently strong
    statistical prediction may correct a weak/mismatched rule decision.
    """
    if not probabilities:
        return slot
    candidates = {k: v for k, v in probabilities.items() if k in vocabulary and k != TX.UNKNOWN}
    if not candidates:
        return slot
    best = max(candidates, key=candidates.get)
    probability = float(candidates[best])
    ranked = sorted(candidates.items(), key=lambda kv: kv[1], reverse=True)[1:3]

    # Keep strong, evidence-backed rules. Let the model arbitrate when it is
    # at least as confident as the rule, or when the rule abstained.
    if slot.source == "rule" and slot.label != TX.UNKNOWN:
        if slot.label == "line_breaking":
            return slot
        if probability < 0.40 or probability < float(slot.confidence):
            return slot
    elif probability < MODEL_MIN_CONFIDENCE:
        return slot

    return Slot(
        label=best,
        confidence=round(min(MODEL_CONFIDENCE_CAP, probability), 3),
        evidence=[] if best != slot.label else list(slot.evidence),
        source="model_override" if slot.source == "rule" and best != slot.label else "model_no_evidence",
        alternatives=[{"label": k, "confidence": round(float(v), 3)} for k, v in ranked],
    )


def _model_control_candidates(
    bundle: ModelBundle, text: str, asserted: set[str]
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for label, model in (bundle.controls or {}).items():
        if label in asserted or label not in TX.CONTROL_DEFICIENCIES:
            continue
        probability = bundle.binary_probability(model, text)
        if probability is None or probability < CONTROL_CANDIDATE_THRESHOLD:
            continue
        out.append(
            {
                "label": str(label),
                "model_probability": round(float(probability), 3),
                "status": "uncertain_no_textual_evidence",
                "evidence": [],
            }
        )
    out.sort(key=lambda c: float(c["model_probability"]), reverse=True)
    return out[:5]


def analyze(text: str, report_id: str | None = None, layer1: dict[str, Any] | None = None) -> dict[str, Any]:
    """Analyse one safety report. Returns pure JSON-compatible Python types."""
    prepared = prepare(text)
    tokens = token_count(prepared)
    bundle = load_bundle()

    if not prepared:
        return _empty_response(report_id, bundle, layer1, "empty input text")

    action_slot, _ = resolve_action(prepared)
    object_slot, _ = resolve_object(prepared)

    # Do not let a statistical model manufacture a confident action/object
    # from an ultra-short fragment that contains too little context.
    if tokens >= 4:
        action_probs = bundle.blended_probabilities(bundle.action, bundle.adapter_action, prepared)
        object_probs = bundle.blended_probabilities(bundle.object_, bundle.adapter_object, prepared)
        action_slot = _fill_from_model(action_slot, action_probs, TX.ACTIONS)
        object_slot = _fill_from_model(object_slot, object_probs, TX.OBJECTS)
    else:
        action_slot.label = TX.UNKNOWN
        action_slot.confidence = 0.0
        action_slot.evidence = []
        action_slot.alternatives = []
        action_slot.source = "abstain_short_text"
        object_slot.label = TX.UNKNOWN
        object_slot.confidence = 0.0
        object_slot.evidence = []
        object_slot.alternatives = []
        object_slot.source = "abstain_short_text"

    action_slot.label = TX.coerce(action_slot.label, TX.ACTIONS, TX.UNKNOWN)
    object_slot.label = TX.coerce(object_slot.label, TX.OBJECTS, TX.UNKNOWN)

    controls = detect_controls(prepared)
    energies = detect_energy(prepared)
    consequences = detect_consequence(prepared)
    low_energy = detect_low_energy(prepared)

    control_list = [
        {
            "label": str(label),
            "confidence": round(float(hit.score), 3),
            "severity": round(float(LC.SEVERITY.get(label, 0.5)), 3),
            "evidence": [str(e) for e in hit.evidence],
            # Character offsets into `text_prepared` so a reviewer (or Layer 3)
            # can highlight the exact words the assertion rests on.
            "spans": [[int(s), int(e)] for s, e in hit.spans],
            "source": "evidence",
        }
        for label, hit in sorted(controls.items(), key=lambda kv: kv[1].score, reverse=True)
    ][:6]

    candidates = _model_control_candidates(bundle, prepared, set(controls))

    sif = score_sif(
        energies=energies,
        controls=controls,
        consequences=consequences,
        control_severity=LC.SEVERITY,
        low_energy_context=low_energy,
        model_prior=bundle.binary_probability(bundle.sif, prepared),
        token_count=tokens,
    )

    iogp = map_iogp_rules(action_slot.label, object_slot.label, controls, energies, prepared)

    evidence: list[str] = []
    for bucket in (control_list, ):
        for item in bucket:
            evidence.extend(item["evidence"])  # type: ignore[arg-type]
    evidence.extend(sif.evidence)
    evidence.extend(action_slot.evidence)
    evidence.extend(object_slot.evidence)
    evidence = [str(e) for e in dict.fromkeys(e for e in evidence if e)][:10]

    return {
        "report_id": str(report_id) if report_id is not None else None,
        "text_prepared": prepared,
        "action": _slot_dict(action_slot),
        "object": _slot_dict(object_slot),
        "control_deficiencies": control_list,
        "uncertain_control_candidates": candidates,
        "sif": {
            "score": float(sif.score),
            "classification": str(sif.classification),
            "abstained": bool(sif.abstained),
            "note": str(sif.note),
            "components": {k: float(v) for k, v in sif.components.items()},
            "reasons": sif.reasons,
        },
        "iogp_rules": [str(r["rule"]) for r in iogp][:4],
        "iogp_rule_details": iogp[:4],
        "hazardous_energies": [
            {"label": str(k), "severity": float(v.score), "evidence": [str(e) for e in v.evidence]}
            for k, v in sorted(energies.items(), key=lambda kv: kv[1].score, reverse=True)
        ][:5],
        "evidence": evidence,
        "meta": {
            "token_count": int(tokens),
            "models_available": bool(bundle.available),
            "model_problems": [str(p) for p in bundle.problems],
            "layer1_context": layer1 or {},
            "note": MODEL_NOTE,
        },
    }


def _empty_response(
    report_id: str | None, bundle: ModelBundle, layer1: dict[str, Any] | None, reason: str
) -> dict[str, Any]:
    return {
        "report_id": str(report_id) if report_id is not None else None,
        "text_prepared": "",
        "action": {"label": TX.UNKNOWN, "confidence": 0.0, "evidence": [], "source": "abstain", "alternatives": []},
        "object": {"label": TX.UNKNOWN, "confidence": 0.0, "evidence": [], "source": "abstain", "alternatives": []},
        "control_deficiencies": [],
        "uncertain_control_candidates": [],
        "sif": {
            "score": 0.0,
            "classification": "UNCERTAIN",
            "abstained": True,
            "note": reason,
            "components": {"energy": 0.0, "control_gap": 0.0, "consequence": 0.0, "model_prior": 0.0},
            "reasons": [],
        },
        "iogp_rules": [],
        "iogp_rule_details": [],
        "hazardous_energies": [],
        "evidence": [],
        "meta": {
            "token_count": 0,
            "models_available": bool(bundle.available),
            "model_problems": [str(p) for p in bundle.problems],
            "layer1_context": layer1 or {},
            "note": MODEL_NOTE,
        },
    }
