const { patternRules } = require("./patternRules");

/**
 * runLayer1Matcher
 * Scans report text for exact keyword/acronym matches against
 * the pattern rule library. Pure function — no DB, no Express,
 * no side effects — so it can be unit tested standalone before
 * wiring into the API route.
 *
 * @param {string} rawText - the report's raw narrative text
 * @returns {{
 *   matched: boolean,
 *   matchedKeywords: string[],
 *   matchedRuleId: string|null,
 *   matchedIogpRules: string[]
 * }}
 */
function runLayer1Matcher(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return {
      matched: false,
      matchedKeywords: [],
      matchedRuleId: null,
      matchedIogpRules: [],
    };
  }

  const normalizedText = rawText.toLowerCase();

  const matchedKeywords = [];
  const matchedRuleIds = [];
  const matchedIogpRules = new Set();

  for (const rule of patternRules) {
    let ruleMatched = false;

    for (const keyword of rule.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        ruleMatched = true;
      }
    }

    if (ruleMatched) {
      matchedRuleIds.push(rule.ruleId);
      matchedIogpRules.add(rule.iogpRule);
    }
  }

  return {
    matched: matchedRuleIds.length > 0,
    matchedKeywords,
    matchedRuleId: matchedRuleIds[0] || null, // first rule hit; revisit if priority order needed
    matchedIogpRules: Array.from(matchedIogpRules),
  };
}

module.exports = { runLayer1Matcher };
