const { runLayer1Matcher } = require("./matcher");

/**
 * runLayer1WithTiming
 * Wraps runLayer1Matcher() to measure actual execution time.
 * This feeds directly into the Layer1Result.executionTimeMs
 * field in the DB schema, and is also the real evidence behind
 * the "<5ms per report" claim in the architecture doc — measured,
 * not assumed.
 *
 * process.hrtime.bigint() is used instead of Date.now() because
 * it has nanosecond precision — Date.now() only has millisecond
 * resolution, which is too coarse to reliably measure a <5ms
 * operation (it could read 0ms or 1ms for the same run purely
 * due to rounding).
 *
 * @param {string} rawText - the report's raw narrative text
 * @returns {{
 *   attempted: true,
 *   matched: boolean,
 *   matchedKeywords: string[],
 *   matchedRuleId: string|null,
 *   matchedIogpRules: string[],
 *   executionTimeMs: number
 * }}
 */
function runLayer1WithTiming(rawText) {
  const startTime = process.hrtime.bigint();

  const result = runLayer1Matcher(rawText);

  const endTime = process.hrtime.bigint();
  const executionTimeMs = Number(endTime - startTime) / 1_000_000; // ns -> ms

  return {
    attempted: true,
    ...result,
    executionTimeMs: Number(executionTimeMs.toFixed(4)),
  };
}

module.exports = { runLayer1WithTiming };
