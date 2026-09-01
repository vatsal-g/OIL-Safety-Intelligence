"""
Control-deficiency lexicon.

Detection is deliberately **two-stage and evidence-gated**:

1. `CONTROL_TOPICS[label]` matches a *mention of the control itself*
   ("lock out", "work permit", "atmosphere tested", "pressure regulator").
   A mention alone is NOT a deficiency.
2. An absence / failure cue (`ABSENCE_CUES`) must also appear inside the same
   clause window for the label to be emitted, and the evidence span returned is
   the text between the cue and the topic mention.

`CONTROL_DIRECT[label]` holds phrases that are self-sufficient on their own
("worked on the live line", "guard had been removed").

`PRESENCE_CUES` suppress a detection when the narrative says the control *was*
in place ("after the line was isolated", "a permit was obtained").

This is what stops the service inventing `ppe_missing` for a report that never
mentioned PPE.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Stage 1: mentions of each control
# ---------------------------------------------------------------------------
CONTROL_TOPICS: dict[str, list[str]] = {
    "no_isolation": [
        r"\block(?:ing|ed|s)? out\b",
        r"\btag(?:ging|ged)? out\b",
        r"\bisolat\w+",
        r"\bde-?energi[sz]\w+",
        r"\bzero energy\b",
        r"\benergy isolation\b",
        r"\bdepressuri[sz]\w+",
        r"\bblind\w*\b|\bblank\w+ off\b|\bdouble block and bleed\b",
        r"\bbled? (?:down|off)\b|\bvent(?:ed|ing)? (?:down|off)\b",
        r"\bbreaker\b.{0,15}\b(?:open|off)\b|\bswitch(?:ed)? off\b|\bpower supply\b",
    ],
    "no_permit": [
        r"\bwork permit\b",
        r"\bpermit\b",
        r"\bwork authoris\w+|\bwork authoriz\w+",
        r"\bhot work permit\b|\bconfined space (?:entry )?permit\b",
    ],
    "no_gas_test": [
        r"\bgas test\w*|\bgas monitor\w*|\bgas detect\w*",
        r"\batmospher\w+",
        r"\bair (?:monitor\w*|test\w*|quality)\b",
        r"\boxygen (?:level|content|reading)\b",
        r"\blower explosive limit\b|\bcombustible gas (?:reading|test)\b",
        r"\bsniff\w+ (?:the )?(?:space|tank|vessel)\b",
    ],
    "missing_pressure_control": [
        r"\bpressure regulator\b|\bregulator\b",
        r"\bpressure safety valve\b|\bpressure relief valve\b|\brelief valve\b",
        r"\bpressure relief\b|\bover ?pressure protection\b|\brupture disc\b",
        r"\bpressure gaug\w+|\bpressure indicator\b",
        r"\bpressure limit\w*|\btest pressure\b|\bmaximum allowable working pressure\b",
    ],
    "barrier_bypassed": [
        r"\binterlock\w*|\bsafety (?:device|control|system|switch|trip)\b",
        r"\btrip (?:system|function)\b|\balarm\b|\bshut ?down system\b",
        r"\blimit switch\b|\bemergency stop\b|\be-?stop\b",
        r"\bpermissive\b|\bkey ?switch\b",
    ],
    "jsa_missing": [
        r"\bjsa\b|\bjob safety analysis\b|\bjob hazard analysis\b",
        r"\btask risk assessment\b|\btool ?box talk\b|\bpre ?job brief\w*",
    ],
    "no_hazard_analysis": [
        r"\bhazard (?:analysis|assessment|identification|review)\b",
        r"\brisk assessment\b|\bhazop\b|\bwhat[- ]if (?:study|analysis)\b",
    ],
    "moc_missing": [
        r"\bmanagement of change\b|\bmoc\b|\bchange control\b",
        r"\bdesign change\b|\bmodification (?:approval|request)\b",
    ],
    "procedure_missing": [
        r"\bprocedure\b|\bwork instruction\b|\bstandard operating procedure\b",
        r"\bmethod statement\b|\blifting plan\b|\bisolation (?:plan|certificate)\b",
    ],
    "procedure_not_followed": [
        r"\bprocedure\b|\bwork instruction\b|\bstandard operating procedure\b",
        r"\brule\w*|\binstruction\w*|\bpolicy\b|\bmethod statement\b|\bpermit conditions?\b",
    ],
    "guarding_missing": [
        r"\bguard\w*",
        r"\bcover\b|\bshield\b|\bfence\b|\benclosure\b|\bhand ?rail\b|\bgrating\b",
    ],
    "ppe_missing": [
        r"\bppe\b|\bpersonal protective equipment\b",
        r"\bhard ?hat\b|\bhelmet\b|\bglove\w*|\bgoggle\w*|\bface ?shield\b|\bsafety glasses\b",
        r"\bharness\b|\blanyard\b|\bfall arrest\b|\brespirator\b|\bbreathing apparatus\b",
        r"\bsafety (?:boot|shoe)\w*|\bhearing protection\b|\bear ?plug\w*|\bflame retardant\b",
    ],
    "supervision_inadequate": [
        r"\bsupervis\w+",
        r"\bstand ?by (?:person|man|attendant)\b|\bhole watch\b|\bfire watch\b|\bbanksman\b",
        r"\bcompetent person\b|\bauthorised person\b|\bauthorized person\b|\btrain\w+",
    ],
    "wrong_rating": [
        r"\brat(?:ing|ed)\b|\bsafe working load\b|\bworking load limit\b",
        r"\bcapacity\b|\bdesign (?:limit|pressure|temperature)\b|\bspecification\b",
    ],
    "barrier_failed": [
        r"\bcontainment\b|\bbarrier\b|\bseal\b|\bgasket\b|\bhose\b|\bfitting\b",
        r"\bvalve\b|\bblind\b|\bplug\b|\bcap\b|\bweld\b|\bwall thickness\b",
    ],
    "communication_failure": [
        r"\bcommunicat\w+|\bradio\b|\bhand ?over\b|\bshift change\b",
        r"\bnotif\w+|\binform\w+|\bsignal\w*|\bwarn\w+",
    ],
    "exclusion_zone_missing": [
        r"\bbarricad\w+|\bexclusion zone\b|\bdrop zone\b|\brestricted area\b",
        r"\bcordon\w*|\bwarning (?:sign|tape)\b|\bsafety tape\b|\btraffic control\b",
    ],
    "unknown_stored_energy": [
        r"\bresidual (?:pressure|energy|product|voltage)\b",
        r"\bstored energy\b|\btrapped (?:pressure|energy|fluid)\b",
        r"\bunexpected (?:start|movement|release|energi[sz]ation)\b",
        r"\bspring (?:tension|energy)\b|\bcapacitor\b|\bhydraulic accumulator\b",
        r"\bstart(?:ed)? (?:up )?(?:un)?expectedly\b|\bre-?start\w+ (?:on its own|automatically)\b",
    ],
}

# ---------------------------------------------------------------------------
# Stage 2: cues that the control was absent / failed / not effective
# ---------------------------------------------------------------------------
# Ordering words. Shared constant because ORDER_SENSITIVE_CUES below has to
# reference the identical pattern string.
_SEQUENCE_CUE = r"\bbefore\b|\bprior to\b|\byet to be\b|\bstill to be\b"

ABSENCE_CUES: list[str] = [
    r"\bwithout\b",
    r"\bno\b",
    r"\bnot\b",
    r"\bnever\b",
    r"\bnone\b",
    r"\bnothing\b",
    r"\bfail(?:ed|ure|s|ing)?\b",
    r"\bmissing\b",
    r"\babsent\b",
    r"\black(?:ed|ing|s)?\b",
    r"\bomitt?ed\b",
    r"\bneglect\w*",
    r"\bforg[eo]t\w*",
    r"\bskipp?ed\b",
    r"\bbypass\w*",
    r"\bdefeat\w*",
    r"\boverr[io]d\w*",
    r"\bdisabl\w+",
    r"\bdefective\b|\bfaulty\b|\binoperable\b|\bout of service\b|\bunserviceable\b",
    r"\bremoved\b",
    r"\binadequate\b|\binsufficient\b|\bincomplete\b|\bimproper\b|\bincorrect\b|\bwrong\b",
    r"\bunverified\b|\bunconfirmed\b|\bunauthoris\w+|\bunauthoriz\w+",
    r"\bexpired\b|\bout of date\b|\bnot valid\b|\binvalid\b",
    r"\bdid ?n[o']?t\b|\bwas ?n[o']?t\b|\bwere ?n[o']?t\b|\bhad ?n[o']?t\b|\bcould ?n[o']?t\b",
    _SEQUENCE_CUE,
    r"\bunaware\b|\bassumed\b|\bbelieved\b",
]

# Cues that only count when they *precede* the control mention, because as a
# suffix they usually mean the opposite ("isolation before work" is fine).
# These must be the *exact* pattern strings used in ABSENCE_CUES - membership is
# tested by string identity, not by what the regex happens to match.
ORDER_SENSITIVE_CUES: frozenset[str] = frozenset({_SEQUENCE_CUE})

# ---------------------------------------------------------------------------
# Self-sufficient deficiency phrases
# ---------------------------------------------------------------------------
CONTROL_DIRECT: dict[str, list[tuple[str, float]]] = {
    "no_isolation": [
        (r"\b(?:while|whilst|with) (?:the )?(?:\w+ ){0,3}(?:still )?(?:pressuri[sz]ed|energi[sz]ed|under pressure|live)\b", 0.9),
        (r"\bon (?:the |a )?live (?:line|pipe|system|circuit|cable|panel|equipment)\b", 0.9),
        (r"\blive work\b|\bwork(?:ing|ed)? (?:on|with) live\b|\benergi[sz]ed work\b", 0.88),
        (r"\bstill (?:pressuri[sz]ed|energi[sz]ed|running|rotating|turning|in service|live)\b", 0.88),
        (r"\bhad not been (?:isolated|de-?energi[sz]ed|locked out|depressuri[sz]ed)\b", 0.95),
        (r"\bfailed to (?:isolate|lock out|de-?energi[sz]e|depressuri[sz]e)\b", 0.95),
        (r"\bwithout (?:first )?(?:isolating|locking out|de-?energi[sz]ing|depressuri[sz]ing)\b", 0.95),
    ],
    "no_permit": [
        (r"\bunpermitted\b|\bno permit (?:was )?(?:in place|issued|raised|obtained)\b", 0.95),
        (r"\bpermit (?:had )?(?:not|never) been (?:issued|raised|obtained|signed)\b", 0.95),
    ],
    "no_gas_test": [
        (r"\buntested atmosphere\b|\batmosphere (?:was )?(?:not|never) (?:been )?tested\b", 0.95),
        (r"\bwithout (?:a )?gas test\b|\bno gas test\b", 0.95),
    ],
    "missing_pressure_control": [
        (r"\bover ?pressuri[sz]\w+", 0.85),
        (r"\bexceeded (?:the )?(?:test |design |maximum )?pressure\b", 0.9),
    ],
    "barrier_bypassed": [
        (r"\bbypass\w+ (?:the )?(?:interlock|safety|guard|alarm|trip|shut ?down|permissive)\w*", 0.95),
        (r"\b(?:interlock|safety device|trip|alarm|limit switch|emergency stop)\w*\b.{0,25}\b(?:bypass\w*|defeat\w*|disabl\w*|jumper\w*|overr[io]d\w*)", 0.95),
        (r"\b(?:jumper|jump wire|cheater|hot ?wired)\b", 0.85),
    ],
    "guarding_missing": [
        (r"\bunguarded\b|\bguard\w* (?:was |had been |were )?(?:removed|missing|off|not in place|absent)\b", 0.95),
        (r"\bexposed (?:moving part|rotating|drive|belt|blade|nip point|pinch point)\w*", 0.9),
        (r"\bnip point\b|\bpinch point\b.{0,25}\b(?:exposed|unguarded)\b", 0.85),
    ],
    "procedure_not_followed": [
        (r"\bdid not follow\b|\bfailed to follow\b|\bnot in accordance with\b|\bcontrary to (?:the )?(?:procedure|instruction|permit)\b", 0.93),
        (r"\bwork ?around\b|\bshort ?cut\b|\bdeviat\w+ from (?:the )?(?:procedure|plan|permit)\b", 0.9),
    ],
    "barrier_failed": [
        (r"\bloss of containment\b|\bcontainment (?:was )?(?:lost|breached|failed)\b", 0.95),
        (r"\b(?:hose|gasket|seal|weld|fitting|coupling|flange|valve|blind)\b.{0,25}\b(?:fail\w+|rupture\w*|burst|blew|parted|let go|leak\w*)", 0.9),
        (r"\bcatastrophic failure\b|\bstructural failure\b|\bcollapse[ds]?\b", 0.85),
    ],
    "wrong_rating": [
        (r"\bunder ?si[zs]ed\b|\bover ?loaded\b|\bexceeded (?:the )?(?:rating|capacity|safe working load|working load limit)\b", 0.93),
        (r"\bwrong (?:rating|size|spec\w*|material|grade|class)\b|\bnot rated for\b", 0.93),
        (r"\bincompatible (?:material|equipment|fitting)\b", 0.85),
    ],
    "exclusion_zone_missing": [
        (r"\bnot barricaded\b|\bno barricade\b|\bunbarricaded\b|\bno exclusion zone\b", 0.93),
        (r"\b(?:entered|walk\w+ (?:in|into|through))\b.{0,25}\b(?:swing radius|drop zone|line of fire|exclusion zone)\b", 0.85),
    ],
    "unknown_stored_energy": [
        (r"\bunexpected\w* (?:start\w*|movement|motion|release|rotat\w*|energi[sz]\w*)\b", 0.9),
        (r"\bresidual (?:pressure|energy|voltage|product)\b", 0.9),
        (r"\bstored energy\b|\btrapped (?:pressure|fluid|energy)\b", 0.9),
        (r"\bstarted (?:up )?(?:un)?expectedly\b|\bcycled unexpectedly\b|\bsudden(?:ly)? (?:released|movement|start)\w*", 0.88),
        (r"\bcoast\w+ (?:down|to a stop)\b|\bstill coasting\b|\bhad not (?:fully )?stopped\b", 0.88),
    ],
    "supervision_inadequate": [
        (r"\bunsupervised\b|\bno (?:supervisor|supervision|stand ?by|attendant|hole watch|fire watch|banksman)\b", 0.93),
        (r"\b(?:untrained|not (?:been )?trained|no training|not competent|uncertified)\b", 0.9),
        (r"\bworking alone\b|\blone work\w*", 0.72),
    ],
    "communication_failure": [
        (r"\bmis ?communicat\w+|\bcommunication (?:break ?down|failure)\b|\bpoor communication\b",  0.93),
        (r"\bwas not (?:informed|notified|told|aware)\b|\bno hand ?over\b|\bunaware that\b", 0.88),
    ],
    "ppe_missing": [
        (r"\bwas not wearing\b|\bwear\w+ no\b|\bwithout (?:any )?(?:ppe|personal protective equipment|gloves?|helmet|hard ?hat|goggles?|face ?shield|harness|respirator)\b", 0.93),
        (r"\bno (?:ppe|gloves?|helmet|hard ?hat|goggles?|harness|respirator|fall protection)\b", 0.93),
    ],
    "no_hazard_analysis": [
        (r"\bhazard (?:was |had )?not (?:been )?(?:identified|assessed|recognis\w+|recogniz\w+)\b", 0.9),
        (r"\bno (?:risk assessment|hazard (?:analysis|assessment|identification))\b", 0.93),
    ],
    "moc_missing": [
        (r"\bmodified\b.{0,30}\bwithout (?:approval|authoris\w+|authoriz\w+|management of change)\b", 0.93),
        (r"\bimprovis\w+|\bmake ?shift\b|\bjury[- ]?rigg\w*", 0.8),
    ],
    "jsa_missing": [
        (r"\bno (?:jsa|job safety analysis|job hazard analysis|tool ?box talk|pre ?job brief\w*)\b", 0.93),
    ],
    "procedure_missing": [
        (r"\bno (?:procedure|work instruction|method statement|lifting plan)\b", 0.93),
        (r"\bprocedure (?:did not exist|was not available|had not been written)\b", 0.93),
    ],
}

# ---------------------------------------------------------------------------
# Suppression: the control was demonstrably in place
# ---------------------------------------------------------------------------
PRESENCE_CUES: list[str] = [
    r"\bwas (?:properly |correctly |fully )?(?:isolated|de-?energi[sz]ed|locked out|depressuri[sz]ed|tested|obtained|issued|in place|worn|installed|barricaded|verified|confirmed)\b",
    r"\bhad been (?:properly |correctly |fully )?(?:isolated|de-?energi[sz]ed|locked out|depressuri[sz]ed|tested|obtained|issued|worn|installed|verified|confirmed)\b",
    r"\bafter (?:the \w+ was |being )?(?:isolat\w+|de-?energi[sz]\w+|lock\w+ out|depressuri[sz]\w+|test\w+|permitted)\b",
    r"\bwere (?:wearing|worn|in place|installed|isolated|tested)\b",
    r"\bin accordance with (?:the )?(?:procedure|permit|plan|instruction)\b",
    r"\bas required by (?:the )?(?:procedure|permit|plan)\b",
]

# Severity of the missing barrier, used by the explainable SIF model.
SEVERITY: dict[str, float] = {
    "no_isolation": 0.95,
    "no_gas_test": 0.9,
    "missing_pressure_control": 0.9,
    "barrier_bypassed": 0.9,
    "unknown_stored_energy": 0.88,
    "barrier_failed": 0.85,
    "guarding_missing": 0.8,
    "exclusion_zone_missing": 0.78,
    "wrong_rating": 0.78,
    "no_permit": 0.7,
    "procedure_not_followed": 0.68,
    "procedure_missing": 0.6,
    "no_hazard_analysis": 0.6,
    "jsa_missing": 0.55,
    "moc_missing": 0.6,
    "supervision_inadequate": 0.6,
    "communication_failure": 0.55,
    "ppe_missing": 0.45,
    "none": 0.0,
}
