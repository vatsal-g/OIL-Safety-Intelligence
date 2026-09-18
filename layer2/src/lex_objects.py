"""
Object / environment lexicon. Same (pattern, strength) convention as
`lex_actions`, with a specificity discount for catch-all containers.
"""

from __future__ import annotations

OBJECT_PATTERNS: dict[str, list[tuple[str, float]]] = {
    "pipeline": [
        (r"\bpipe ?line\b", 0.97),
        (r"\bflow ?line\b|\btrunk ?line\b|\bheader\b|\bmanifold\b", 0.88),
        (r"\bpiping\b|\bpipe ?work\b|\bpipe spool\b", 0.85),
        (r"\blive line\b|\bprocess line\b|\bproduct line\b|\bgas line\b|\bwater line\b", 0.9),
        (r"\bthe line\b|\ba line\b", 0.7),
        (r"\bpipe\b", 0.72),
    ],
    "well_casing": [
        (r"\bwell ?casing\b|\bcasing string\b|\bcasing shoe\b|\bcasing hanger\b", 0.97),
        (r"\bwell ?head\b|\bwell ?bore\b|\bchristmas tree\b|\bx-?mas tree\b", 0.93),
        (r"\bannulus\b|\bproduction tubing\b|\btubing string\b", 0.9),
        (r"\bblowout preventer\b", 0.88),
        (r"\bcasing\b", 0.8),
        (r"\bwell no\.?\b|\bwell #\s*\d|\bthe well\b", 0.75),
    ],
    "pressure_vessel": [
        (r"\bpressure vessel\b|\bpressurised vessel\b|\bpressurized vessel\b", 0.97),
        (r"\bboiler\b|\bautoclave\b|\bair receiver\b|\baccumulator\b", 0.9),
        (r"\bseparator\b|\bscrubber\b|\bknock ?out drum\b|\bsurge drum\b", 0.88),
        (r"\bvessel\b", 0.75),
        (r"\bcylinder\b|\bgas bottle\b", 0.8),
    ],
    "tank": [
        (r"\bstorage tank\b|\bcrude tank\b|\bfuel tank\b|\bslop tank\b", 0.95),
        (r"\btank\b", 0.82),
        (r"\bsilo\b|\bhopper\b|\bbund\b|\bsump\b", 0.75),
    ],
    "valve": [
        (r"\bvalve\b", 0.88),
        (r"\bpressure safety valve\b|\bpressure relief valve\b|\bblock valve\b|\bcheck valve\b", 0.93),
        (r"\bactuator\b|\bchoke\b", 0.72),
    ],
    "pump": [
        (r"\bpump\b|\bpumping unit\b", 0.9),
        (r"\bcentrifugal pump\b|\bmud pump\b|\btriplex pump\b", 0.95),
    ],
    "rotating_equipment": [
        (r"\brotating equipment\b", 0.97),
        (r"\bcompressor\b|\bturbine\b|\bgear ?box\b|\bdrive shaft\b|\bcoupling guard\b", 0.9),
        (r"\bblower\b|\bfan\b|\bimpeller\b|\bagitator\b|\bmixer\b", 0.88),
        (r"\bconveyor\b|\bbelt drive\b|\bchain drive\b|\bpulley\b|\bsprocket\b", 0.85),
        (r"\bmotor\b|\bspindle\b|\bflywheel\b|\bcentrifuge\b", 0.8),
        (r"\blathe\b|\bmill(?:ing)? machine\b|\bpress brake\b|\bpower press\b", 0.85),
    ],
    "electrical_panel": [
        (r"\belectrical panel\b|\bcontrol panel\b|\bdistribution (?:board|panel)\b", 0.97),
        (r"\bswitch ?gear\b|\bmotor control (?:centre|center)\b|\bmcc\b", 0.95),
        (r"\bcircuit breaker\b|\bbreaker panel\b|\bfuse (?:box|panel)\b", 0.92),
        (r"\btransformer\b|\bbus ?bar\b|\bsubstation\b", 0.88),
        (r"\bjunction box\b|\bstarter (?:box|panel)\b|\bvariable frequency drive\b", 0.85),
    ],
    "electrical_cable": [
        (r"\b(?:electrical |power |live )?cable\b", 0.88),
        (r"\bconductor\b|\bconduit\b|\bwiring\b|\bwire\b|\bextension (?:cord|lead)\b", 0.82),
        (r"\boverhead (?:power )?line\b|\bburied cable\b|\bpower line\b", 0.93),
    ],
    "crane_lifting_equipment": [
        (r"\bcrane\b", 0.95),
        (r"\bhoist\b|\bchain block\b|\bcome[- ]?along\b|\bwinch\b", 0.9),
        (r"\bsling\w*|\bshackle\w*|\bwire rope\b|\bspreader bar\b|\blifting (?:lug|eye|beam)\b", 0.9),
        (r"\bforklift\b|\btelehandler\b|\bman ?basket\b|\bboom lift\b", 0.85),
        (r"\brigging (?:gear|equipment)\b|\blifting equipment\b|\blifting gear\b", 0.95),
    ],
    "vehicle": [
        (r"\bmotor vehicle\b|\blight vehicle\b|\bheavy vehicle\b", 0.95),
        (r"\btruck\b|\btrailer\b|\bpick ?up\b|\bvan\b|\bbus\b|\bcar\b", 0.85),
        (r"\bvehicle\b", 0.9),
        (r"\bdozer\b|\bloader\b|\bbackhoe\b|\bexcavator\b|\bdump ?truck\b|\bhaul ?truck\b", 0.82),
    ],
    "confined_space": [
        (r"\bconfined space\b", 0.97),
        (r"\bman ?hole\b|\bman ?way\b|\bsewer\b|\bpit\b|\bculvert\b|\bduct ?work\b", 0.8),
        (r"\bcrawl space\b|\bvoid space\b|\bcaisson\b|\bcofferdam\b", 0.85),
    ],
    "scaffold": [(r"\bscaffold\w*", 0.95), (r"\bstaging\b|\bwork platform\b|\btrestle\b", 0.75)],
    "ladder": [(r"\bladder\b", 0.95), (r"\bstep ?ladder\b|\bextension ladder\b", 0.97)],
    "chemical": [
        (r"\bchemical\w*", 0.85),
        (r"\bacid\b|\bcaustic\b|\bsolvent\b|\bammonia\b|\bchlorine\b|\bsulphuric\b|\bsulfuric\b", 0.9),
        (r"\bcorrosive\b|\bhazardous substance\b|\btoxic (?:liquid|substance)\b", 0.85),
        (r"\bglycol\b|\bmethanol\b|\bamine\b|\bbiocide\b|\bhydrogen sulphide\b", 0.9),
    ],
    "gas_hydrocarbon": [
        (r"\bhydrocarbon\w*", 0.95),
        (r"\bnatural gas\b|\bsour gas\b|\bfuel gas\b|\blpg\b|\bpropane\b|\bmethane\b", 0.93),
        (r"\bcrude (?:oil)?\b|\bcondensate\b|\bdiesel\b|\bgasoline\b|\bpetrol\b", 0.88),
        (r"\bflammable (?:gas|vapour|vapor|atmosphere)\b|\bvapour cloud\b", 0.9),
        (r"\bsteam\b", 0.78),
        (r"\bnitrogen\b|\binert gas\b|\bcompressed air\b", 0.75),
    ],
    "hand_tool": [
        (r"\bhand tool\w*|\bpower tool\w*", 0.9),
        (r"\bhammer\b|\bwrench\b|\bspanner\b|\bchisel\b|\bpry ?bar\b|\bcrow ?bar\b|\bscrewdriver\b", 0.85),
        (r"\bangle grinder\b|\bsaw\b|\bdrill\b|\bknife\b|\bblade\b|\bnail gun\b", 0.8),
    ],
    "machinery": [
        (r"\bmachiner?y?\b|\bmachine (?:centre|center|tool)\b", 0.85),
        (r"\bequipment\b|\bplant\b|\bapparatus\b|\bunit\b|\bsystem\b", 0.6),
    ],
}

SPECIFICITY: dict[str, float] = {
    "pipeline": 0.98,
    "well_casing": 1.0,
    "pressure_vessel": 0.98,
    "tank": 0.96,
    "valve": 0.9,
    "pump": 0.94,
    "rotating_equipment": 0.96,
    "electrical_panel": 1.0,
    "electrical_cable": 0.94,
    "crane_lifting_equipment": 0.98,
    "vehicle": 0.96,
    "confined_space": 1.0,
    "scaffold": 0.98,
    "ladder": 0.98,
    "chemical": 0.94,
    "gas_hydrocarbon": 0.92,
    "hand_tool": 0.72,
    "machinery": 0.55,
}
