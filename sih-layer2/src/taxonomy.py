"""
Canonical label sets for Layer 2 (Context Finder).

Every label emitted by the pipeline MUST come from one of these tuples.
Nothing else is a valid output value. `scripts/train.py`, `scripts/evaluate.py`
and the API response schema all import from here so the vocabulary can never
drift between training, evaluation and serving.
"""

from __future__ import annotations

UNKNOWN = "unknown"
NONE = "none"

ACTIONS: tuple[str, ...] = (
    "pressure_testing",
    "hot_work",
    "confined_space",
    "working_at_height",
    "lifting",
    "electrical_work",
    "line_breaking",
    "excavation",
    "driving",
    "chemical_handling",
    "drilling_wellwork",
    "maintenance_repair",
    "material_handling",
    "cleaning",
    "inspection_testing",
    "construction_installation",
    "manual_tools",
    "unknown",
)

OBJECTS: tuple[str, ...] = (
    "pipeline",
    "well_casing",
    "pressure_vessel",
    "tank",
    "valve",
    "pump",
    "rotating_equipment",
    "electrical_panel",
    "electrical_cable",
    "crane_lifting_equipment",
    "vehicle",
    "confined_space",
    "scaffold",
    "ladder",
    "chemical",
    "gas_hydrocarbon",
    "hand_tool",
    "machinery",
    "unknown",
)

CONTROL_DEFICIENCIES: tuple[str, ...] = (
    "no_isolation",
    "no_permit",
    "no_gas_test",
    "missing_pressure_control",
    "barrier_bypassed",
    "jsa_missing",
    "no_hazard_analysis",
    "moc_missing",
    "procedure_missing",
    "procedure_not_followed",
    "guarding_missing",
    "ppe_missing",
    "supervision_inadequate",
    "wrong_rating",
    "barrier_failed",
    "communication_failure",
    "exclusion_zone_missing",
    "unknown_stored_energy",
    "none",
)

IOGP_RULES: tuple[str, ...] = (
    "Bypassing Safety Controls",
    "Confined Space",
    "Driving",
    "Energy Isolation",
    "Hot Work",
    "Line of Fire",
    "Safe Mechanical Lifting",
    "Work at Height",
    "Work Authorisation",
    "none",
)

SIF_CLASSES: tuple[str, ...] = (
    "SIF_POTENTIAL",
    "NON_SIF_POTENTIAL",
    "UNCERTAIN",
)

# Actions that are generic descriptions of *what job the person held* rather
# than a specific hazardous activity. When a specific action is also present in
# the text, the specific one wins. Used by src/rules.py.
GENERIC_ACTIONS: frozenset[str] = frozenset(
    {
        "maintenance_repair",
        "material_handling",
        "cleaning",
        "inspection_testing",
        "manual_tools",
        "construction_installation",
    }
)

# Objects that are catch-all containers ("equipment", "machine"). Any more
# specific object outranks these.
GENERIC_OBJECTS: frozenset[str] = frozenset({"machinery", "hand_tool"})


def is_valid(label: str, vocabulary: tuple[str, ...]) -> bool:
    return label in vocabulary


def coerce(label: str | None, vocabulary: tuple[str, ...], fallback: str) -> str:
    """Force an arbitrary string onto the canonical vocabulary."""
    if label is None:
        return fallback
    text = str(label).strip()
    return text if text in vocabulary else fallback
