"""
Hazardous-energy and consequence lexicon.

Used by the explainable SIF model (`src/sif.py`). Every entry carries a
severity in 0-1 that reflects *how much energy is available to kill or
seriously injure someone*, independent of what actually happened.

`LOW_ENERGY_CONTEXT` is a de-escalator: same-level slips, paper cuts and office
environments must not be scored as SIF precursors just because a model saw the
word "injury".
"""

from __future__ import annotations

ENERGY_PATTERNS: dict[str, tuple[float, list[str]]] = {
    "pressure": (
        0.9,
        [
            r"\bpressuri[sz]\w+",
            r"\bunder pressure\b|\bhigh pressure\b|\bpressure test\w*|\bhydro ?test\w*",
            r"\bpneumatic\b|\bhydraulic (?:pressure|system|line|hose)\b",
            r"\bcompressed (?:air|gas|nitrogen)\b|\bgas cylinder\b|\bair receiver\b",
            r"\bpsi\b|\bbarg?\b|\bkpa\b|\bmpa\b",
            r"\bblow ?out\b|\bburst\b|\brupture\w*|\bwhipp?(?:ed|ing)? (?:hose|line)\b",
            r"\bstored energy\b|\bresidual pressure\b|\btrapped (?:pressure|fluid)\b",
        ],
    ),
    "hydrocarbon_flammable": (
        0.9,
        [
            r"\bhydrocarbon\w*|\bnatural gas\b|\bsour gas\b|\bfuel gas\b|\blpg\b|\bpropane\b|\bmethane\b",
            r"\bcrude\b|\bcondensate\b|\bdiesel\b|\bgasoline\b|\bpetrol\b|\bsolvent vapour\b",
            r"\bflammable\b|\bcombustible (?:gas|vapour|vapor|atmosphere)\b|\bexplosive atmosphere\b",
            r"\bfire\b|\bexplosion\b|\bflash fire\b|\bignit\w+|\bdeflagration\b",
        ],
    ),
    "electrical": (
        0.85,
        [
            r"\benergi[sz]ed\b|\blive (?:circuit|conductor|wire|cable|panel|electrical|line)\b",
            r"\barc flash\b|\belectrocut\w*|\belectric(?:al)? shock\b|\bflash burn\b",
            r"\bhigh voltage\b|\b\d{2,4}\s?(?:v|volt|kv)\b|\bswitch ?gear\b|\bbus ?bar\b",
            r"\btransformer\b|\bmotor control (?:centre|center)\b|\boverhead power line\b",
            r"\belectrical panel\b|\bdistribution (?:board|panel)\b|\bcircuit breaker\b|\bpower supply\b",
            r"\belectrical (?:system|installation|equipment|fault|work)\b|\bconductor\b|\bpower line\b",
        ],
    ),
    "gravity_height": (
        0.85,
        [
            r"\bfell (?:from|off|through)\b|\bfall(?:ing)? (?:from|off|through)\b",
            r"\bwork(?:ing)? at height\b|\bscaffold\w*|\bladder\b|\broof\b|\bman ?lift\b|\baerial lift\b",
            r"\bfall (?:arrest|protection)\b|\bharness\b|\blanyard\b|\bopen (?:hole|hatch|floor opening)\b",
            r"\b(?:1[0-9]|[2-9][0-9]|[1-9]\d\d)\s?(?:foot|feet|ft|meters?|metres?|m)\b.{0,20}\b(?:above|high|fall|drop|below)",
        ],
    ),
    "suspended_load": (
        0.85,
        [
            r"\bsuspended load\b|\bunder (?:the )?load\b|\bcrane\b|\bhoist\w*|\bsling\w*|\bshackle\w*",
            r"\bdropped object\b|\bload (?:shifted|slipped|swung|fell)\b|\bboom (?:collapse|failure)\b",
            r"\blifting (?:operation|plan|equipment|gear)\b|\brigging\b|\btag ?line\b",
        ],
    ),
    "vehicle_motion": (
        0.85,
        [
            r"\bmotor vehicle\b|\bdriv(?:e|ing|er)\b|\bhighway\b|\broad traffic\b",
            r"\bstruck by (?:a )?(?:vehicle|truck|forklift|trailer|mobile plant)\b",
            r"\broll ?over\b|\brolled over\b|\bcollid\w+|\breversing\b|\brun over\b|\bpinned (?:between|against)\b",
        ],
    ),
    "mechanical_rotating": (
        0.8,
        [
            r"\bcaught in\b|\bcaught between\b|\bentangl\w+|\bdrawn into\b|\bpull\w+ into\b",
            r"\brotating\b|\bnip point\b|\bpinch point\b|\bconveyor\b|\bbelt drive\b|\bimpeller\b|\bagitator\b",
            r"\bamputat\w+|\bcrush\w+|\bdegloved?\b|\bpower press\b|\bunexpected (?:start|movement)\b",
        ],
    ),
    "toxic_asphyxiant": (
        0.9,
        [
            r"\bconfined space\b|\boxygen deficien\w+|\bcnfined\b",
            r"\bhydrogen sulphide\b|\bh2s\b|\bcarbon monoxide\b|\bnitrogen (?:purge|blanket|asphyxiation)\b",
            r"\basphyxiat\w+|\bengulf\w+|\binert\w* atmosphere\b|\bimmediately dangerous to life\b",
            r"\btoxic (?:gas|vapour|vapor|fume)\w*|\bchlorine\b|\bammonia\b|\bfume\w* inhal\w+",
        ],
    ),
    "excavation_collapse": (
        0.85,
        [
            r"\bcave[ -]?in\b|\btrench collapse\b|\bwall collapse\b|\bstructural collapse\b",
            r"\bburied\b|\bengulf\w+ (?:in|by) (?:soil|sand|grain|material)\b|\bshoring\b",
        ],
    ),
    "thermal": (
        0.78,
        [
            r"\bsteam\b|\bscald\w*|\bmolten\b|\bhot (?:oil|water|surface|work|slag)\b",
            r"\bthird[- ]degree burn\w*|\bsevere burn\w*|\bthermal burn\w*|\bcryogenic\b|\bliquid nitrogen\b",
        ],
    ),
    "chemical_corrosive": (
        0.7,
        [
            r"\bacid\b|\bcaustic\b|\bcorrosive\b|\bsulphuric\b|\bsulfuric\b|\bhydrofluoric\b",
            r"\bchemical burn\w*|\bsplash\w*|\beye (?:injur|damage|burn)\w*",
        ],
    ),
    "radiation": (
        0.78,
        [r"\bradiograph\w*|\bradioactive\b|\bgamma (?:source|ray)\b|\bionising radiation\b|\bionizing radiation\b"],
    ),
    "struck_by": (
        0.75,
        [
            r"\bstruck by\b|\bstruck against\b|\bhit by\b|\bline of fire\b",
            r"\bflying (?:object|debris|particle)\w*|\bprojectile\b|\bkick ?back\b|\bstored spring\b",
        ],
    ),
}

# De-escalators. If one of these matches and no energy source above ~0.7 is
# present, the report is very unlikely to be a SIF precursor.
LOW_ENERGY_CONTEXT: list[str] = [
    r"\bslipp?(?:ed|ing)? on (?:a |the )?(?:wet|slippery|icy|greasy)?\s?(?:office )?floor\b",
    r"\bslip,? trip,? (?:and |or )?fall\b|\bsame[- ]level fall\b|\btripped over\b",
    r"\boffice\b|\bbreak room\b|\bcanteen\b|\bcar ?park\b|\bstair(?:case|well)?\b|\bhall ?way\b|\bcorridor\b",
    r"\bpaper cut\b|\bminor (?:cut|abrasion|bruise|strain)\w*|\bfirst aid (?:only|case)\b",
    r"\bstrain\w* (?:his|her|their) (?:back|shoulder|wrist)\b|\bergonomic\b|\brepetitive strain\b",
    r"\binsect (?:bite|sting)\b|\bheat (?:stress|exhaustion)\b|\bdehydrat\w+",
]

# Realised-consequence severity. Present only to *support* a SIF judgement -
# a fatality alone is NOT treated as sufficient for SIF potential (see
# docs/MODEL_CARD.md), and a first-aid outcome does not rule it out.
CONSEQUENCE_PATTERNS: dict[str, tuple[float, list[str]]] = {
    "fatal": (1.0, [r"\bfatalit\w+|\bfatally\b|\bdied\b|\bdeath\b|\bwas killed\b|\bdeceased\b|\bpronounced dead\b"]),
    "life_threatening": (
        0.85,
        [
            r"\bamputat\w+|\bdegloved?\b|\bcrush(?:ed|ing) (?:injur|his|her|their)\w*",
            r"\bunconscious\b|\bcardiac arrest\b|\bcpr\b|\bresuscitat\w+|\bintubat\w+",
            r"\belectrocut\w+|\bthird[- ]degree burn\w*|\bburns? to (?:\d{1,3})\s?(?:%|percent)\b",
            r"\bskull fracture\b|\bspinal (?:injur|fracture)\w*|\btraumatic brain\b|\bintern(?:al)? (?:bleeding|injur\w*)\b",
            r"\bair ?lift\w*|\bmedevac\w*|\bintensive care\b|\bcritical condition\b",
        ],
    ),
    "serious": (
        0.6,
        [
            r"\bfractur\w+|\bbroken (?:leg|arm|hip|rib|bone|pelvis|back)\w*|\bhospitali[sz]\w+|\badmitted to hospital\b",
            r"\bsurgery\b|\bstitches\b|\bsevere (?:laceration|burn|injur)\w*|\bloss of (?:eye|sight|vision)\b",
        ],
    ),
    "minor": (0.15, [r"\bfirst aid\b|\bminor injur\w*|\bbruis\w+|\babrasion\w*|\bno injur\w*|\bnear ?miss\b"]),
}
