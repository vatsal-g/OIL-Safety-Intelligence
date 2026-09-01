"""
Evidence layer.

Everything in this module answers one question: *what exact text in the report
supports this label?* Nothing here ever returns a label without a span, which
is the mechanism that keeps the service from inventing control deficiencies.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from . import lex_controls as LC
from . import lex_energy as LE
from .normalize import sentences

# Compiled-pattern cache; the lexicons are static so this is populated once.
_CACHE: dict[str, re.Pattern[str]] = {}

# Window (characters) searched either side of a control mention for an
# absence cue. Kept tight so cues do not leak across clauses.
WINDOW = 90

# Absence cues that are common English words and therefore weaker evidence.
# Entries must be the exact pattern strings used in LC.ABSENCE_CUES.
_WEAK_CUES = {
    r"\bno\b",
    r"\bnot\b",
    r"\bremoved\b",
    LC._SEQUENCE_CUE,
    r"\bunaware\b|\bassumed\b|\bbelieved\b",
}

# Labels whose control *mentions* are too generic to gate on a nearby cue -
# these are only ever emitted from an explicit CONTROL_DIRECT phrase.
DIRECT_ONLY: frozenset[str] = frozenset(
    {
        "barrier_failed",
        "procedure_not_followed",
        "procedure_missing",
        "wrong_rating",
        "communication_failure",
        "unknown_stored_energy",
    }
)


def rx(pattern: str) -> re.Pattern[str]:
    compiled = _CACHE.get(pattern)
    if compiled is None:
        compiled = re.compile(pattern)
        _CACHE[pattern] = compiled
    return compiled


def snippet(text: str, start: int, end: int, limit: int = 120) -> str:
    """Trim a raw span into something readable and safe to show a user."""
    start = max(0, start)
    end = min(len(text), end)
    piece = text[start:end].strip(" ,;:.-")
    piece = re.sub(r"\s+", " ", piece)
    if len(piece) > limit:
        piece = piece[:limit].rsplit(" ", 1)[0] + "..."
    return piece


@dataclass
class LabelHit:
    label: str
    score: float
    evidence: list[str] = field(default_factory=list)
    spans: list[tuple[int, int]] = field(default_factory=list)

    def add(self, text: str, start: int, end: int) -> None:
        piece = snippet(text, start, end)
        if piece and piece not in self.evidence:
            self.evidence.append(piece)
            self.spans.append((start, end))


# ---------------------------------------------------------------------------
# Generic (pattern, strength) lexicon matching - used for action and object
# ---------------------------------------------------------------------------
def _position_factor(text_length: int, start: int) -> float:
    """
    In a long narrative the task being performed is stated up front; the tail
    describes the mechanism of injury and the aftermath. Matches late in a long
    report are therefore mildly discounted so an incidental mention ("...using
    an excavator to hold the load") cannot outrank the stated activity.
    """
    if text_length <= 300:
        return 1.0
    relative = start / text_length
    if relative <= 0.25:
        return 1.0
    return 1.0 - 0.18 * min(1.0, (relative - 0.25) / 0.75)


def match_scored(
    text: str,
    patterns: dict[str, list[tuple[str, float]]],
    specificity: dict[str, float],
) -> dict[str, LabelHit]:
    hits: dict[str, LabelHit] = {}
    length = len(text)
    for label, entries in patterns.items():
        best = 0.0
        hit = LabelHit(label=label, score=0.0)
        for pattern, strength in entries:
            for match in rx(pattern).finditer(text):
                best = max(best, strength * _position_factor(length, match.start()))
                hit.add(text, match.start(), match.end())
                break  # one span per pattern is enough evidence
        if best > 0.0:
            # Small bonus for corroboration from several distinct phrases,
            # capped so it can never fabricate certainty.
            corroboration = min(0.04 * (len(hit.evidence) - 1), 0.06)
            hit.score = round(min(0.99, (best + corroboration) * specificity.get(label, 1.0)), 4)
            hits[label] = hit
    return hits


# ---------------------------------------------------------------------------
# Control deficiencies - two-stage, evidence gated
# ---------------------------------------------------------------------------
def _sentence_bounds(text: str, position: int) -> tuple[int, int]:
    for start, end in sentences(text):
        if start <= position < end:
            return start, end
    return 0, len(text)


def _find_cue(text: str, topic_start: int, topic_end: int) -> tuple[str, int, int, float] | None:
    """
    Look for an absence cue in the clause window around a control mention.
    Returns (cue_pattern, cue_start, cue_end, cue_weight) or None.
    """
    sent_start, sent_end = _sentence_bounds(text, topic_start)
    left = max(sent_start, topic_start - WINDOW)
    right = min(sent_end, topic_end + WINDOW)
    window = text[left:right]
    best: tuple[str, int, int, float] | None = None
    for cue in LC.ABSENCE_CUES:
        for match in rx(cue).finditer(window):
            cue_start = left + match.start()
            cue_end = left + match.end()
            if cue in LC.ORDER_SENSITIVE_CUES and cue_start > topic_start:
                continue
            weight = 0.62 if cue in _WEAK_CUES else 0.85
            # A cue immediately adjacent to the mention is stronger evidence
            # than one at the far edge of the window.
            distance = min(abs(topic_start - cue_end), abs(cue_start - topic_end))
            weight -= min(0.18, distance / 500.0)
            if best is None or weight > best[3]:
                best = (cue, cue_start, cue_end, weight)
    return best


def _presence_cue_position(text: str, topic_start: int, topic_end: int) -> int | None:
    """Offset of the first 'control was in place' cue in the clause window."""
    sent_start, sent_end = _sentence_bounds(text, topic_start)
    left = max(sent_start, topic_start - WINDOW)
    window = text[left : min(sent_end, topic_end + WINDOW)]
    positions = [left + m.start() for cue in LC.PRESENCE_CUES if (m := rx(cue).search(window))]
    return min(positions) if positions else None


def detect_controls(text: str) -> dict[str, LabelHit]:
    """
    Return only control deficiencies that have explicit textual support.
    A label absent from the result means "no evidence found", never "absent".
    """
    hits: dict[str, LabelHit] = {}

    # Stage A: self-sufficient phrases.
    for label, entries in LC.CONTROL_DIRECT.items():
        for pattern, strength in entries:
            match = rx(pattern).search(text)
            if not match:
                continue
            hit = hits.setdefault(label, LabelHit(label=label, score=0.0))
            hit.score = max(hit.score, strength)
            hit.add(text, match.start(), match.end())

    # Stage B: control mention + nearby absence cue.
    for label, topics in LC.CONTROL_TOPICS.items():
        if label in DIRECT_ONLY:
            continue
        for topic in topics:
            for match in rx(topic).finditer(text):
                cue = _find_cue(text, match.start(), match.end())
                if cue is None:
                    continue
                _, cue_start, cue_end, weight = cue
                presence = _presence_cue_position(text, match.start(), match.end())
                # Negation scope: an absence cue that comes *before* a
                # "control was in place" phrase negates it
                # ("without verifying that the atmosphere had been tested").
                # Only damp when the presence phrase comes first.
                if presence is not None and presence < cue_start:
                    weight *= 0.55
                span_start = min(cue_start, match.start())
                span_end = max(cue_end, match.end())
                if span_end - span_start > 160:  # cue too far away to be trusted
                    continue
                hit = hits.setdefault(label, LabelHit(label=label, score=0.0))
                hit.score = max(hit.score, round(weight, 4))
                hit.add(text, span_start, span_end)
                break

    for hit in hits.values():
        hit.score = round(min(0.97, hit.score), 4)
        del hit.evidence[3:]
        del hit.spans[3:]
    return hits


# ---------------------------------------------------------------------------
# Hazardous energy / consequence / de-escalation
# ---------------------------------------------------------------------------
def detect_energy(text: str) -> dict[str, LabelHit]:
    hits: dict[str, LabelHit] = {}
    for name, (severity, patterns) in LE.ENERGY_PATTERNS.items():
        hit = LabelHit(label=name, score=0.0)
        for pattern in patterns:
            match = rx(pattern).search(text)
            if match:
                hit.score = severity
                hit.add(text, match.start(), match.end())
        if hit.score > 0:
            del hit.evidence[2:]
            hits[name] = hit
    return hits


def detect_consequence(text: str) -> dict[str, LabelHit]:
    hits: dict[str, LabelHit] = {}
    for name, (severity, patterns) in LE.CONSEQUENCE_PATTERNS.items():
        hit = LabelHit(label=name, score=0.0)
        for pattern in patterns:
            match = rx(pattern).search(text)
            if match:
                hit.score = severity
                hit.add(text, match.start(), match.end())
        if hit.score > 0:
            del hit.evidence[2:]
            hits[name] = hit
    return hits


def detect_low_energy(text: str) -> list[str]:
    found: list[str] = []
    for pattern in LE.LOW_ENERGY_CONTEXT:
        match = rx(pattern).search(text)
        if match:
            piece = snippet(text, match.start(), match.end())
            if piece and piece not in found:
                found.append(piece)
    return found[:3]
