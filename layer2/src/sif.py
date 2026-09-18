"""
Explainable SIF-potential scoring.

SIF potential is *not* "was someone badly hurt". It is "could this plausibly
have killed or permanently disabled someone". So the score is built from four
auditable components rather than read off a classifier:

    energy       - how much hazardous energy the text shows is present
    control_gap  - severity of the barriers the text shows were missing/failed
    consequence  - severity of the realised outcome (supporting evidence only)
    model_prior  - the weak-supervision classifier, capped at a small weight

    score = 0.50*energy + 0.32*control_gap + 0.13*consequence + 0.05*prior
            + 0.12 if (energy >= 0.7 and control_gap >= 0.7)   # precursor pattern

Fatality alone cannot carry the score: `consequence` is weighted at 0.13, so a
fatal report with no identifiable energy or barrier evidence lands in UNCERTAIN,
not SIF_POTENTIAL. That is deliberate - see docs/MODEL_CARD.md.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .evidence import LabelHit

W_ENERGY = 0.50
W_CONTROL = 0.32
W_CONSEQUENCE = 0.13
W_PRIOR = 0.05
PRECURSOR_BONUS = 0.12

SIF_THRESHOLD = 0.50
UNCERTAIN_THRESHOLD = 0.30

# Reports shorter than this cannot be judged either way.
MIN_TOKENS_FOR_DECISION = 5


@dataclass
class SifResult:
    score: float
    classification: str
    reasons: list[dict[str, object]] = field(default_factory=list)
    components: dict[str, float] = field(default_factory=dict)
    evidence: list[str] = field(default_factory=list)
    abstained: bool = False
    note: str = ""


def _top(hits: dict[str, LabelHit]) -> tuple[str, float, list[str]]:
    if not hits:
        return "", 0.0, []
    best = max(hits.values(), key=lambda h: h.score)
    return best.label, float(best.score), list(best.evidence)


def score_sif(
    *,
    energies: dict[str, LabelHit],
    controls: dict[str, LabelHit],
    consequences: dict[str, LabelHit],
    control_severity: dict[str, float],
    low_energy_context: list[str],
    model_prior: float | None,
    token_count: int,
) -> SifResult:
    reasons: list[dict[str, object]] = []
    evidence: list[str] = []

    energy_name, energy_score, energy_evidence = _top(energies)
    if energy_name:
        reasons.append(
            {
                "factor": "hazardous_energy",
                "detail": energy_name,
                "contribution": round(W_ENERGY * energy_score, 3),
                "evidence": energy_evidence[:2],
            }
        )
        evidence.extend(energy_evidence[:2])

    control_gap = 0.0
    control_name = ""
    for label, hit in controls.items():
        severity = control_severity.get(label, 0.5)
        # A weakly-evidenced deficiency contributes proportionally less.
        weighted = severity * min(1.0, hit.score / 0.9)
        if weighted > control_gap:
            control_gap, control_name = weighted, label
    if control_name:
        reasons.append(
            {
                "factor": "control_deficiency",
                "detail": control_name,
                "contribution": round(W_CONTROL * control_gap, 3),
                "evidence": controls[control_name].evidence[:2],
            }
        )
        evidence.extend(controls[control_name].evidence[:2])

    consequence_name, consequence_score, consequence_evidence = _top(consequences)
    if consequence_name:
        reasons.append(
            {
                "factor": "realised_consequence",
                "detail": consequence_name,
                "contribution": round(W_CONSEQUENCE * consequence_score, 3),
                "evidence": consequence_evidence[:2],
            }
        )

    prior = float(model_prior) if model_prior is not None else 0.0
    if model_prior is not None:
        reasons.append(
            {
                "factor": "weak_supervision_model_prior",
                "detail": "TF-IDF classifier trained on weak labels",
                "contribution": round(W_PRIOR * prior, 3),
                "evidence": [],
            }
        )

    score = (
        W_ENERGY * energy_score
        + W_CONTROL * control_gap
        + W_CONSEQUENCE * consequence_score
        + W_PRIOR * prior
    )

    if energy_score >= 0.7 and control_gap >= 0.7:
        score += PRECURSOR_BONUS
        reasons.append(
            {
                "factor": "precursor_pattern",
                "detail": "high hazardous energy combined with a failed/absent barrier",
                "contribution": PRECURSOR_BONUS,
                "evidence": [],
            }
        )

    # De-escalation: low-energy context and nothing serious detected.
    if low_energy_context and energy_score < 0.7 and consequence_score < 0.6:
        score *= 0.45
        reasons.append(
            {
                "factor": "low_energy_context",
                "detail": "same-level / office / minor-injury context",
                "contribution": "de-escalating",
                "evidence": low_energy_context[:2],
            }
        )

    score = round(max(0.0, min(0.99, score)), 3)

    abstained = False
    note = ""
    if token_count < MIN_TOKENS_FOR_DECISION:
        classification = "UNCERTAIN"
        abstained = True
        note = "report too short to assess SIF potential"
    elif not energy_name and not control_name and not consequence_name:
        if low_energy_context:
            classification = "NON_SIF_POTENTIAL"
            note = "explicit low-energy context and no hazardous-energy or barrier evidence"
        else:
            classification = "UNCERTAIN"
            abstained = True
            note = "no hazardous-energy, barrier or consequence evidence found in the text"
    elif score >= SIF_THRESHOLD:
        classification = "SIF_POTENTIAL"
    elif score >= UNCERTAIN_THRESHOLD:
        classification = "UNCERTAIN"
        abstained = True
        note = "evidence suggests elevated risk but is insufficient to assert SIF potential"
    else:
        classification = "NON_SIF_POTENTIAL"

    return SifResult(
        score=score,
        classification=classification,
        reasons=reasons,
        components={
            "energy": round(energy_score, 3),
            "control_gap": round(control_gap, 3),
            "consequence": round(consequence_score, 3),
            "model_prior": round(prior, 3),
        },
        evidence=list(dict.fromkeys(e for e in evidence if e))[:5],
        abstained=abstained,
        note=note,
    )
