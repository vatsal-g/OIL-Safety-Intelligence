/**
 * Layer 1 — Direct Matcher Pattern Rule Library
 * SIH 26165 | SIF Precursor Detection System
 *
 * Each rule = one detectable hazard signature.
 * keywords: exact phrases/acronyms to scan for (case-insensitive)
 * iogpRule: the IOGP Life-Saving Rule this pattern maps to
 * ruleId: stable identifier, stored in Layer1Result.matchedRuleId
 *
 * v2 — expanded set: 34 rules.
 * ones added after mining real narrative text from the OSHA SIR
 * oil/gas subset (NAICS 211/213111/324/486, 1,383 rows). Keywords
 * marked (mined) below were pulled directly from real incident
 * narratives, not guessed — e.g. "gas valve was not fully shut",
 * "without the lock out/tag out system in place", "flash fire".
 * The rest extend coverage for phrasing variants and typos, since
 * field reports are rarely written in clean, uniform language.
 */

const patternRules = [
  // ---- Energy Isolation ----
  {
    ruleId: "L1-001",
    iogpRule: "Energy Isolation",
    keywords: ["loto", "lock out tag out", "lockout tagout", "no isolation", "energy not isolated"],
  },
  {
    ruleId: "L1-002",
    iogpRule: "Energy Isolation",
    keywords: ["unverified isolation", "isolation not verified", "failed to isolate"],
  },
  {
    ruleId: "L1-013",
    iogpRule: "Energy Isolation",
    keywords: ["without the lock out", "lock out/tag out system in place", "without loto", "lock out not applied"], // mined
  },
  {
    ruleId: "L1-014",
    iogpRule: "Energy Isolation",
    keywords: ["equipment not de-energized", "residual energy", "stored energy not released", "machine not shut down"],
  },
  {
    ruleId: "L1-015",
    iogpRule: "Energy Isolation",
    keywords: ["zero energy state", "energy source not locked", "isolation point missed"],
  },

  // ---- Hot Work ----
  {
    ruleId: "L1-003",
    iogpRule: "Hot Work",
    keywords: ["hot work", "welding", "cutting torch", "grinding near", "no gas test", "gas test not performed"],
  },
  {
    ruleId: "L1-004",
    iogpRule: "Hot Work",
    keywords: ["ptw", "permit to work", "permit not signed", "no permit present", "expired permit"],
  },
  {
    ruleId: "L1-016",
    iogpRule: "Hot Work",
    keywords: ["gas valve was not fully shut", "gas valve not fully closed", "gas valve left open"], // mined
  },
  {
    ruleId: "L1-017",
    iogpRule: "Hot Work",
    keywords: ["flash fire", "flame flashed", "gas flashed", "fuel gas system detonated", "vapors ignited"], // mined
  },
  {
    ruleId: "L1-018",
    iogpRule: "Hot Work",
    keywords: ["propane torch", "rosebud torch", "welding on tank", "welding on access door", "welding near"], // mined
  },
  {
    ruleId: "L1-019",
    iogpRule: "Hot Work",
    keywords: ["ignition source", "sparks near", "spark near drain", "static discharge", "combustible atmosphere"],
  },
  {
    ruleId: "L1-020",
    iogpRule: "Hot Work",
    keywords: ["fire watch not present", "no fire watch", "spotter not assigned"],
  },

  // ---- Confined Space ----
  {
    ruleId: "L1-005",
    iogpRule: "Confined Space",
    keywords: ["confined space", "cse", "vessel entry", "tank entry", "no atmospheric test"],
  },
  {
    ruleId: "L1-006",
    iogpRule: "Confined Space",
    keywords: ["entered without authorization", "no attendant", "no standby person"],
  },
  {
    ruleId: "L1-021",
    iogpRule: "Confined Space",
    keywords: ["hydrocarbon sewer", "flashed into sewer", "oily water sewer", "entered tank without testing"], // mined
  },
  {
    ruleId: "L1-022",
    iogpRule: "Confined Space",
    keywords: ["gas monitor not used", "atmosphere not tested", "oxygen level not checked", "entry permit missing"],
  },

  // ---- Line of Fire ----
  {
    ruleId: "L1-007",
    iogpRule: "Line of Fire",
    keywords: ["struck by", "caught between", "pinch point", "line of fire", "dropped object"],
  },
  {
    ruleId: "L1-008",
    iogpRule: "Line of Fire",
    keywords: ["suspended load", "overhead load", "crane lift", "rigging failure"],
  },
  {
    ruleId: "L1-023",
    iogpRule: "Line of Fire",
    keywords: ["caught in running equipment", "caught in machinery", "compressed by shifting", "finger caught"], // mined
  },
  {
    ruleId: "L1-024",
    iogpRule: "Line of Fire",
    keywords: ["struck by swinging object", "struck by falling object", "object fell from vehicle", "load shifted"], // mined
  },
  {
    ruleId: "L1-025",
    iogpRule: "Line of Fire",
    keywords: ["positioned in line of fire", "standing under load", "hands in pinch point", "reached into moving"],
  },
  {
    ruleId: "L1-026",
    iogpRule: "Mechanical Lifting",
    keywords: ["tongs slipped", "wrench slipped", "elevator slipped", "spinner chain caught", "pipe spinner"], // mined
  },

  // ---- Working at Height ----
  {
    ruleId: "L1-009",
    iogpRule: "Working at Height",
    keywords: ["fall from height", "no fall protection", "harness not worn", "unprotected edge"],
  },
  {
    ruleId: "L1-027",
    iogpRule: "Working at Height",
    keywords: ["fell from elevated", "fell from man-lift", "fell from derrick", "srl", "self retracting lifeline"], // mined
  },
  {
    ruleId: "L1-028",
    iogpRule: "Working at Height",
    keywords: ["ladder unsecured", "ladder not tied off", "working from unsecured ladder"],
  },

  // ---- Lifting Operations ----
  {
    ruleId: "L1-010",
    iogpRule: "Lifting Operations",
    keywords: ["overloaded", "sling failure", "improper rigging", "lifting gear failure"],
  },
  {
    ruleId: "L1-029",
    iogpRule: "Lifting Operations",
    keywords: ["forklift load shifted", "load unsecured", "improperly secured load", "forks not level"], // mined
  },

  // ---- Driving Safety ----
  {
    ruleId: "L1-011",
    iogpRule: "Driving Safety",
    keywords: ["seatbelt not worn", "speeding", "vehicle collision", "rollover"],
  },
  {
    ruleId: "L1-030",
    iogpRule: "Driving Safety",
    keywords: ["pre-drive inspection", "struck by tire", "airing up tire", "vehicle not inspected"], // mined
  },

  // ---- Marine / High Voltage ----
  {
    ruleId: "L1-012",
    iogpRule: "Marine / High Voltage",
    keywords: ["high voltage panel", "hv panel", "electrical shock", "arc flash"],
  },
  {
    ruleId: "L1-031",
    iogpRule: "Marine / High Voltage",
    keywords: ["energized circuit", "live wire", "electrical panel open", "exposed conductor"],
  },

  // ---- Chemical / Exposure (new category, mined) ----
  {
    ruleId: "L1-032",
    iogpRule: "Chemical Exposure",
    keywords: ["labeled as methanol", "chemical exposure", "toxic vapor", "h2s", "hydrogen sulfide"], // mined
  },
  {
    ruleId: "L1-033",
    iogpRule: "Chemical Exposure",
    keywords: ["misidentified drum", "unlabeled container", "wrong chemical used"], // mined
  },
  {
    ruleId: "L1-034",
    iogpRule: "Chemical Exposure",
    keywords: ["burns from chemical", "chemical splash", "exposed to fumes"],
  },
];

module.exports = { patternRules };