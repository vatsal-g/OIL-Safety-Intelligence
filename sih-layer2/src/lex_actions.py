"""
Action lexicon.

Each entry is (pattern, strength). `strength` is the confidence that *this
phrase*, on its own, indicates the action (0-1). `SPECIFICITY` then discounts
labels that are generic job descriptors so that, e.g., "maintenance technician
pressurising a well" resolves to `pressure_testing`, not `maintenance_repair`.

Patterns are matched against the prepared (lower-cased, abbreviation-expanded)
text with `re.search`, so they must be written in lower case.
"""

from __future__ import annotations

ACTION_PATTERNS: dict[str, list[tuple[str, float]]] = {
    "pressure_testing": [
        (r"\bpressure[ -]?test\w*", 0.97),
        (r"\bhydro[ -]?test\w*|\bhydrostatic test\w*", 0.97),
        (r"\bpneumatic test\w*|\bair test\w*", 0.93),
        # Active voice only. "the system was still pressurized" describes a
        # *state*, not the task being performed, and must not win the argmax
        # over the real activity (e.g. line breaking).
        (r"\bpressuri[sz](?:e|es|ing)\b", 0.93),
        (r"\b(?:being|to be|whilst being|while being) pressuri[sz]ed\b", 0.9),
        (r"\bleak test\w*|\bproof test\w*|\btightness test\w*", 0.9),
        (r"\bapplying pressure\b|\bbuild(?:ing)? up pressure\b|\bcharg\w+ with (?:air|nitrogen|gas)", 0.88),
        (r"\bblank(?:ing)? off .{0,20}pressure|\bpump(?:ing)? up (?:the )?(?:line|casing|vessel)", 0.85),
    ],
    "hot_work": [
        (r"\bhot work\b", 0.97),
        (r"\bweld(?:s|ed|ing|er|ers)?\b", 0.95),
        (r"\bcutting torch\b|\boxy[ -]?(?:acetylene|fuel)\b|\bburning bar\b", 0.95),
        (r"\bgrind\w*", 0.6),
        (r"\bbraz\w+|\bsolder\w*", 0.88),
        (r"\bflame cut\w*|\btorch cut\w*|\bplasma cut\w*", 0.93),
        (r"\bspark[- ]producing\b|\bignition source\b", 0.7),
    ],
    "confined_space": [
        (r"\bconfined space\b", 0.97),
        (r"\benter(?:ed|ing)? (?:the |a )?(?:tank|vessel|silo|sump|pit|manhole|sewer|duct)\b", 0.92),
        (r"\b(?:tank|vessel|silo|sump|manhole|sewer) entry\b", 0.95),
        (r"\bman(?:hole|way)\b", 0.7),
        (r"\bcrawl(?:ed|ing)? (?:in|into|inside)\b", 0.65),
    ],
    "working_at_height": [
        (r"\bwork(?:ing)? at height\b|\bworking at heights\b", 0.97),
        (r"\bfell (?:from|off|through)\b|\bfall(?:ing)? (?:from|off|through)\b", 0.9),
        (r"\bon (?:a |the )?(?:scaffold\w*|ladder|roof|man ?lift|aerial lift|boom lift|elevated platform)", 0.9),
        (r"\bclimb\w+ (?:a |the )?(?:ladder|scaffold\w*|structure|tower|mast)", 0.9),
        (r"\bfall (?:arrest|protection)\b|\bharness\b|\blanyard\b", 0.5),
        (r"\bmezzanine\b|\bcatwalk\b|\bderrick (?:board|floor)\b|\bmonkey board\b", 0.7),
        (r"\b\d{1,3}[ -]?(?:foot|feet|ft|meter|metre|m)\b.{0,25}\b(?:above|high|elevat|fall|drop)", 0.7),
    ],
    "lifting": [
        (r"\bcrane\b|\boverhead hoist\b", 0.93),
        (r"\brigg(?:ing|er)\b|\bsling\w*\b|\bshackle\w*\b|\bspreader bar\b", 0.9),
        (r"\bhoist\w*", 0.88),
        (r"\blift(?:ing|ed)? (?:operation|plan|the load|a load|equipment)\b", 0.93),
        (r"\bsuspended load\b|\bunder (?:the )?load\b", 0.92),
        (r"\bforklift\b|\btelehandler\b|\bman ?basket\b", 0.7),
        (r"\bmechanical lift\w*\b|\bcrane lift\b", 0.95),
    ],
    "electrical_work": [
        (r"\belectrical (?:work|fault|panel|installation|maintenance|system)\b", 0.93),
        (r"\benergi[sz]ed\b|\blive (?:circuit|conductor|wire|cable|panel|electrical)\b", 0.9),
        (r"\barc flash\b|\belectrocut\w*|\belectric(?:al)? shock\b", 0.95),
        (r"\bswitch ?gear\b|\bcircuit breaker\b|\bbus ?bar\b|\btransformer\b", 0.9),
        (r"\b\d{2,4}\s?(?:v|volt|kv)\b", 0.8),
        (r"\b(?:electrical|power) wir(?:e|ing)\b|\bwiring\b|\bconduit\b|\bjunction box\b|\bdistribution board\b", 0.72),
        (r"\bde-?energi[sz]\w*", 0.6),
    ],
    "line_breaking": [
        (r"\bline break\w*|\bbreak(?:ing)? (?:the )?(?:line|containment)\b", 0.97),
        (r"\bbreak(?:ing)? into (?:the )?(?:line|pipe|system)\b", 0.95),
        (r"\bopen\w* (?:the |a )?(?:flange|line|valve|pipe|drain|vent|connection)\b", 0.88),
        (r"\bremov\w+ (?:a |the )?(?:connection|flange|spool|blind|hose|fitting|bolt)\w*", 0.85),
        (r"\bdisconnect\w+ (?:a |the )?(?:line|hose|pipe|flange|coupling)\b", 0.88),
        (r"\blive line\b|\bon the live (?:line|pipe|system)\b", 0.93),
        (r"\bde-?coupl\w+|\bunbolt\w*|\bcrack(?:ed|ing)? (?:the )?flange\b", 0.85),
        (r"\bloosen\w+ (?:the )?(?:fitting|flange|bolt|cap|plug)\w*", 0.8),
    ],
    "excavation": [
        (r"\bexcavat\w*", 0.95),
        (r"\btrench\w*", 0.93),
        (r"\bdigg?(?:ing|ed)\b|\bshoring\b|\btrench box\b", 0.85),
        (r"\bcave[ -]?in\b|\bcollapse of (?:the )?(?:trench|excavation|wall)\b", 0.9),
        (r"\bbackhoe\b|\bexcavator\b", 0.5),
    ],
    "driving": [
        (r"\bdriv(?:e|ing|er)\b", 0.9),
        (r"\bmotor vehicle\b|\broad traffic\b|\bhighway\b|\bhigh ?way\b", 0.85),
        (r"\bseat ?belt\b", 0.8),
        (r"\bcollid\w+ with\b|\brear[- ]ended\b|\brolled over\b|\broll ?over\b", 0.8),
        (r"\breversing (?:the )?(?:truck|vehicle|trailer)\b", 0.85),
    ],
    "chemical_handling": [
        (r"\bchemical\w*", 0.82),
        (r"\bsolvent\b|\bacid\b|\bcaustic\b|\bchlorine\b|\bammonia\b|\bsulphuric\b|\bsulfuric\b", 0.88),
        (r"\bdecant\w*|\btransfer\w+ (?:of )?(?:chemical|acid|caustic|fuel|solvent)", 0.9),
        (r"\bmix(?:ing|ed)? (?:chemical|acid|caustic|reagent)", 0.9),
        (r"\bcorrosive\b|\btoxic (?:substance|liquid|chemical)\b", 0.8),
    ],
    "drilling_wellwork": [
        (r"\bdrill(?:ing)? (?:rig|floor|crew|operation|ahead)\b", 0.95),
        (r"\bwell ?(?:work|bore|head|site|intervention|control)\b", 0.9),
        (r"\bwork ?over\b|\bsnubbing\b|\bcoiled tubing\b|\bwire ?line\b", 0.9),
        (r"\bcasing (?:string|shoe|hanger)\b|\bannulus\b|\btripping (?:pipe|out|in)\b", 0.9),
        (r"\bblowout preventer\b|\bkick\b.{0,20}\bwell\b", 0.85),
        (r"\btop drive\b|\bmud pump\b|\bdrill (?:pipe|collar|string)\b", 0.85),
    ],
    "maintenance_repair": [
        (r"\bmaintenance\b", 0.85),
        (r"\brepair\w*|\bservic(?:e|ing|ed)\b|\boverhaul\w*", 0.85),
        (r"\btrouble ?shoot\w*|\bdiagnos\w+ (?:a |the )?fault\b", 0.85),
        (r"\breplac\w+ (?:a |the )?(?:part|bearing|seal|belt|filter|component|motor|pump|valve)", 0.85),
        (r"\bunjam\w*|\bclear\w+ (?:a |the )?(?:jam|blockage|choke)\b", 0.85),
        (r"\bpreventive maintenance\b|\bshut ?down maintenance\b|\bturnaround\b", 0.9),
    ],
    "material_handling": [
        (r"\bmaterial handling\b", 0.95),
        (r"\bstack\w+|\bpallet\w*|\bunload\w+|\bload\w+ (?:the )?(?:truck|trailer|pallet)", 0.85),
        (r"\bcarry\w+ (?:a |the )?(?:pipe|plate|drum|bag|sack|box|load)", 0.8),
        (r"\bmanual handling\b|\blift(?:ing|ed)? by hand\b", 0.85),
        (r"\bmov(?:e|ing) material\w*", 0.85),
        (r"\b(?:load|unload)\w* (?:a |the )?(?:pallet|truck|trailer|crate|container|drum)\w*", 0.88),
        (r"\bmov(?:e|ing|ed) (?:equipment|a load|the load|crates?|drums?|boxes)\b", 0.85),
    ],
    "cleaning": [
        (r"\bclean(?:ing|ed)\b|\bhousekeeping\b", 0.85),
        (r"\bwash(?:ing|ed)?\b|\bhydro ?blast\w*|\bsteam clean\w*|\bpressure wash\w*", 0.85),
        (r"\bsweep\w*|\bmopp?(?:ing|ed)\b|\bdegreas\w*", 0.8),
        (r"\bflush(?:ing|ed)? (?:the )?(?:line|system|tank|vessel)", 0.8),
    ],
    "inspection_testing": [
        (r"\binspect\w*", 0.85),
        (r"\bsurvey\w*|\baudit\w*|\bwalk ?down\b|\bwalk ?through\b", 0.75),
        (r"\bndt\b|\bradiograph\w*|\bultrasonic (?:test|thickness)\w*", 0.9),
        (r"\btak(?:e|ing) (?:a )?(?:reading|measurement|sample)\b|\bgaug(?:e|ing)\b", 0.8),
        (r"\bfunction test\w*|\bcalibrat\w*", 0.82),
    ],
    "construction_installation": [
        (r"\bconstruction\b", 0.85),
        (r"\binstall\w*|\berect\w+|\bassembl\w+|\bcommission\w+", 0.82),
        (r"\bdemolit\w*|\bdismantl\w*|\btear ?down\b", 0.85),
        (r"\bconcrete pour\w*|\bform ?work\b|\breinforc\w+ (?:bar|steel)\b", 0.85),
    ],
    "manual_tools": [
        (r"\bhand tool\w*|\bpower tool\w*", 0.9),
        (r"\bangle grinder\b|\bcircular saw\b|\bchain ?saw\b|\bband ?saw\b|\btable saw\b", 0.88),
        (r"\bhammer\w*|\bwrench\w*|\bspanner\w*|\bchisel\w*|\bcrow ?bar\b|\bpry ?bar\b", 0.8),
        (r"\bnail gun\b|\bstaple gun\b|\bimpact driver\b|\bcut[- ]?off saw\b", 0.88),
        (r"\bknife\b|\bblade\b|\butility knife\b", 0.72),
        (r"\bhand ?held drill\b|\bcordless drill\b|\bdrill(?:ing)? a hole\b", 0.82),
        (r"\b(?:pedestal|bench|angle|die) grinder\b|\bgrinder\b", 0.85),
    ],
}

# Multiplied into the raw pattern score. Generic descriptors are damped so a
# co-occurring specific hazardous activity wins the argmax.
SPECIFICITY: dict[str, float] = {
    "pressure_testing": 1.0,
    "hot_work": 1.0,
    "confined_space": 1.0,
    "working_at_height": 0.98,
    "lifting": 0.98,
    "electrical_work": 0.96,
    "line_breaking": 1.0,
    "excavation": 1.0,
    "driving": 0.96,
    "chemical_handling": 0.94,
    "drilling_wellwork": 0.96,
    "maintenance_repair": 0.62,
    "material_handling": 0.66,
    "cleaning": 0.62,
    "inspection_testing": 0.62,
    "construction_installation": 0.66,
    "manual_tools": 0.72,
}
