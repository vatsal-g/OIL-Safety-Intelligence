"""
Rule layer: resolve Action / Object from the lexicons and map the resolved
context onto IOGP Life-Saving Rule candidates.

The rule layer is deliberately the *primary* extractor. The statistical models
in `src/models.py` are only consulted when the rules find nothing, or to break
a near-tie, because a matched phrase is auditable evidence and a TF-IDF weight
is not.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import lex_actions as LA
from . import lex_objects as LO
from .evidence import LabelHit, match_scored, rx

# Below this the rule signal is treated as too weak to assert a label.
MIN_RULE_SCORE = 0.45


@dataclass
class Slot:
    label: str = "unknown"
    confidence: float = 0.0
    evidence: list[str] = field(default_factory=list)
    source: str = "abstain"
    alternatives: list[dict[str, object]] = field(default_factory=list)


def _resolve(hits: dict[str, LabelHit], top_k: int = 3) -> tuple[LabelHit | None, list[dict[str, object]]]:
    ranked = sorted(hits.values(), key=lambda h: h.score, reverse=True)
    alternatives = [
        {"label": h.label, "confidence": round(float(h.score), 3)} for h in ranked[1:top_k]
    ]
    return (ranked[0] if ranked else None), alternatives


def resolve_action(text: str) -> tuple[Slot, dict[str, LabelHit]]:
    hits = match_scored(text, LA.ACTION_PATTERNS, LA.SPECIFICITY)
    best, alternatives = _resolve(hits)
    if best is None or best.score < MIN_RULE_SCORE:
        return Slot(alternatives=alternatives), hits
    return (
        Slot(
            label=best.label,
            confidence=round(float(best.score), 3),
            evidence=list(best.evidence[:3]),
            source="rule",
            alternatives=alternatives,
        ),
        hits,
    )


def resolve_object(text: str) -> tuple[Slot, dict[str, LabelHit]]:
    hits = match_scored(text, LO.OBJECT_PATTERNS, LO.SPECIFICITY)
    best, alternatives = _resolve(hits)
    if best is None or best.score < MIN_RULE_SCORE:
        return Slot(alternatives=alternatives), hits
    return (
        Slot(
            label=best.label,
            confidence=round(float(best.score), 3),
            evidence=list(best.evidence[:3]),
            source="rule",
            alternatives=alternatives,
        ),
        hits,
    )


# ---------------------------------------------------------------------------
# IOGP Life-Saving Rule mapping
# ---------------------------------------------------------------------------
# Each rule is triggered by a combination of resolved slots, detected control
# deficiencies and detected energies. `reason` is carried through to the API so
# the mapping is never a black box.

_LINE_OF_FIRE_PATTERNS = [
    r"\bline of fire\b",
    r"\bstruck by\b|\bstruck against\b|\bhit by\b|\bcaught (?:in|between)\b|\bpinned\b",
    r"\bdropped object\b|\bfalling object\b|\bflying (?:object|debris|particle)\w*",
    r"\bwhipp?(?:ed|ing)? (?:hose|line)\b|\bstored energy\b|\brelease of pressure\b",
    r"\bsuspended load\b|\bunder (?:the )?load\b|\bswing radius\b",
]

_HEIGHT_OBJECTS = {"scaffold", "ladder"}
_LIFTING_OBJECTS = {"crane_lifting_equipment"}


def map_iogp_rules(
    action: str,
    object_label: str,
    controls: dict[str, LabelHit],
    energies: dict[str, LabelHit],
    text: str,
) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []

    def add(rule: str, reason: str, evidence: list[str], confidence: float) -> None:
        for existing in out:
            if existing["rule"] == rule:
                if confidence > float(existing["confidence"]):
                    existing["confidence"] = round(confidence, 3)
                    existing["reason"] = reason
                for piece in evidence:
                    if piece not in existing["evidence"]:  # type: ignore[operator]
                        existing["evidence"].append(piece)  # type: ignore[attr-defined]
                return
        out.append(
            {
                "rule": rule,
                "confidence": round(confidence, 3),
                "reason": reason,
                "evidence": [e for e in evidence if e][:3],
            }
        )

    def ev(*keys: str) -> list[str]:
        pieces: list[str] = []
        for key in keys:
            hit = controls.get(key) or energies.get(key)
            if hit:
                pieces.extend(hit.evidence)
        return pieces

    # Energy Isolation
    if "no_isolation" in controls:
        add("Energy Isolation", "control deficiency: no_isolation", ev("no_isolation"), controls["no_isolation"].score)
    if "unknown_stored_energy" in controls:
        add(
            "Energy Isolation",
            "control deficiency: unknown_stored_energy",
            ev("unknown_stored_energy"),
            controls["unknown_stored_energy"].score * 0.95,
        )

    # Confined Space
    if action == "confined_space" or object_label == "confined_space" or "no_gas_test" in controls:
        pieces = ev("no_gas_test", "toxic_asphyxiant")
        confined = rx(r"\bconfined space\b").search(text)
        if confined:
            pieces.insert(0, "confined space")
        if confined or "no_gas_test" in controls:
            add("Confined Space", "confined-space entry context", pieces, 0.9 if confined else 0.7)

    # Hot Work
    if action == "hot_work" or rx(r"\bhot work\b|\bweld\w*|\bcutting torch\b|\bgrind\w*").search(text):
        match = rx(r"\bhot work\b|\bweld\w*|\bcutting torch\b|\bgrind\w*").search(text)
        add("Hot Work", "hot-work activity detected", [match.group(0)] if match else [], 0.9 if action == "hot_work" else 0.6)

    # Work at Height
    if action == "working_at_height" or object_label in _HEIGHT_OBJECTS or "gravity_height" in energies:
        add(
            "Work at Height",
            "work-at-height / gravity energy present",
            ev("gravity_height"),
            0.9 if action == "working_at_height" else 0.7,
        )

    # Safe Mechanical Lifting
    if action == "lifting" or object_label in _LIFTING_OBJECTS or "suspended_load" in energies:
        add(
            "Safe Mechanical Lifting",
            "mechanical lifting context",
            ev("suspended_load"),
            0.9 if action == "lifting" else 0.7,
        )

    # Driving
    if action == "driving" or (object_label == "vehicle" and "vehicle_motion" in energies):
        add("Driving", "vehicle operation context", ev("vehicle_motion"), 0.9 if action == "driving" else 0.7)

    # Bypassing Safety Controls
    for label in ("barrier_bypassed", "guarding_missing"):
        if label in controls:
            add(
                "Bypassing Safety Controls",
                f"control deficiency: {label}",
                ev(label),
                controls[label].score * (1.0 if label == "barrier_bypassed" else 0.85),
            )

    # Work Authorisation
    for label in ("no_permit", "jsa_missing", "no_hazard_analysis", "moc_missing", "procedure_missing"):
        if label in controls:
            add(
                "Work Authorisation",
                f"control deficiency: {label}",
                ev(label),
                controls[label].score * (1.0 if label == "no_permit" else 0.8),
            )

    # Line of Fire - requires a released/releasable energy path, not just risk.
    lof_evidence: list[str] = []
    lof_confidence = 0.0
    for pattern in _LINE_OF_FIRE_PATTERNS:
        match = rx(pattern).search(text)
        if match:
            lof_evidence.append(match.group(0))
            lof_confidence = max(lof_confidence, 0.8)
    stored = {"pressure", "suspended_load", "mechanical_rotating", "struck_by", "vehicle_motion"} & set(energies)
    if stored and (controls or lof_evidence):
        lof_confidence = max(lof_confidence, 0.78)
        for key in stored:
            lof_evidence.extend(energies[key].evidence[:1])
    if lof_confidence > 0:
        add("Line of Fire", "stored/released energy with a person in the path", lof_evidence, lof_confidence)

    out.sort(key=lambda r: float(r["confidence"]), reverse=True)
    return out
