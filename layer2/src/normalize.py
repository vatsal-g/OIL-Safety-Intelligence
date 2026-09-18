"""
Text normalisation for Layer 2.

Two normalisation levels are used:

* :func:`normalize` - light-touch, *offset preserving where possible*: lower-cases,
  collapses runs of whitespace, and standardises a few unicode look-alikes. This
  is the text the evidence layer matches against, so the spans it returns are
  readable back to the user.
* :func:`expand_abbreviations` - rewrites domain shorthand (LOTO, PTW, CSE, PPE...)
  into the long form so a single regex can cover both. Because this changes
  string lengths it is applied to a *separate* copy of the text used only for
  detection fallbacks; evidence spans are always taken from the light-touch
  version.
"""

from __future__ import annotations

import re
import unicodedata

# Domain shorthand -> canonical long form.
# Order matters: longer keys are applied first (see _ABBREV_RE construction).
ABBREVIATIONS: dict[str, str] = {
    "loto": "lock out tag out isolation",
    "lototo": "lock out tag out try out isolation",
    "ptw": "work permit",
    "cse": "confined space entry",
    "cswp": "confined space work permit",
    "jsa": "jsa job safety analysis",
    "jha": "jsa job hazard analysis",
    "tra": "task risk assessment",
    "moc": "moc management of change",
    "psv": "pressure safety valve",
    "prv": "pressure relief valve",
    "psm": "process safety management",
    "ppe": "ppe personal protective equipment",
    "lel": "lower explosive limit gas",
    "h2s": "hydrogen sulphide gas",
    "hc": "hydrocarbon",
    "bop": "blowout preventer well control equipment",
    "swl": "safe working load rating",
    "wll": "working load limit rating",
    "sscr": "safety critical element",
    "lsr": "life saving rule",
    "eww": "energised work",
    "hv": "high voltage electrical",
    "lv": "low voltage electrical",
    "mcc": "motor control centre electrical panel",
    "vfd": "variable frequency drive electrical panel",
    "sop": "standard operating procedure",
    "toolbox talk": "toolbox talk pre job briefing",
    "scba": "ppe self contained breathing apparatus",
    "faf": "fall arrest ppe",
    "epc": "energy isolation certificate",
}

_ABBREV_RE = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in sorted(ABBREVIATIONS, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)

# Cheap, high-precision typo repairs seen in real free-text safety reports.
# Only unambiguous ones — we deliberately do NOT run a general spell-checker,
# because silently "correcting" a safety narrative is a data-integrity risk.
TYPO_FIXES: dict[str, str] = {
    "presurized": "pressurized",
    "presurised": "pressurised",
    "pressureized": "pressurized",
    "pressurised": "pressurized",
    "pressurising": "pressurizing",
    "pressurise": "pressurize",
    "isolatoin": "isolation",
    "isolaton": "isolation",
    "isoloation": "isolation",
    "lockout": "lock out",
    "lock-out": "lock out",
    "tagout": "tag out",
    "tag-out": "tag out",
    "deenergize": "de-energize",
    "deenergized": "de-energized",
    "deenergised": "de-energised",
    "confied": "confined",
    "confinded": "confined",
    "atmoshpere": "atmosphere",
    "atmospere": "atmosphere",
    "weldng": "welding",
    "weldiing": "welding",
    "scaffoling": "scaffolding",
    "scafolding": "scaffolding",
    "labder": "ladder",
    "eletrical": "electrical",
    "electical": "electrical",
    "elecrical": "electrical",
    "regulater": "regulator",
    "regualtor": "regulator",
    "permitt": "permit",
    "guage": "gauge",
    "manetenance": "maintenance",
    "maintanance": "maintenance",
    "maintenence": "maintenance",
    "excavaton": "excavation",
    "tresnch": "trench",
    "hydrocabon": "hydrocarbon",
}

_TYPO_RE = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in sorted(TYPO_FIXES, key=len, reverse=True)) + r")\b"
)

_WS_RE = re.compile(r"\s+")

# Unicode punctuation that regularly appears in copy-pasted reports.
_TRANSLATIONS = str.maketrans(
    {
        "‘": "'",
        "’": "'",
        "“": '"',
        "”": '"',
        "–": "-",
        "—": "-",
        "−": "-",
        " ": " ",
        "​": " ",
        "\t": " ",
        "\r": " ",
        "\n": " ",
    }
)


def normalize(text: object) -> str:
    """Lower-case, de-unicode and collapse whitespace. Never raises."""
    if text is None:
        return ""
    raw = text if isinstance(text, str) else str(text)
    raw = unicodedata.normalize("NFKC", raw)
    raw = raw.translate(_TRANSLATIONS)
    raw = raw.lower()
    raw = _WS_RE.sub(" ", raw)
    return raw.strip()


def fix_typos(text: str) -> str:
    return _TYPO_RE.sub(lambda m: TYPO_FIXES[m.group(1)], text)


def expand_abbreviations(text: str) -> str:
    return _ABBREV_RE.sub(lambda m: ABBREVIATIONS[m.group(1).lower()], text)


def prepare(text: object) -> str:
    """
    The canonical detection string: normalised + typo-repaired + abbreviation
    expanded. Evidence spans are sliced out of *this* string, so what the API
    returns is always a verbatim substring of what the matcher saw.
    """
    return _WS_RE.sub(" ", expand_abbreviations(fix_typos(normalize(text)))).strip()


def token_count(text: str) -> int:
    return len([t for t in re.split(r"[^a-z0-9]+", normalize(text)) if t])


def sentences(text: str) -> list[tuple[int, int]]:
    """Return (start, end) offsets of sentence-ish spans in `text`."""
    spans: list[tuple[int, int]] = []
    start = 0
    for match in re.finditer(r"[.;!?]+(?:\s|$)", text):
        end = match.end()
        if end - start > 1:
            spans.append((start, end))
        start = end
    if start < len(text):
        spans.append((start, len(text)))
    return spans or [(0, len(text))]
