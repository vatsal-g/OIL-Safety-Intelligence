const { runLayer1Matcher } = require("../src/layer1/matcher");

/**
 * Layer 1 test suite — no external test framework required,
 * runs with plain `node test.js`. Covers:
 *  - one positive case per rule (all 12 rules fire correctly)
 *  - true negative (no hazard language -> matched: false)
 *  - multi-rule match (report hitting more than one IOGP rule)
 *  - edge cases: empty string, null, non-string input
 *  - case-insensitivity check
 */

let passed = 0;
let failed = 0;

function assert(description, condition) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${description}`);
  } else {
    failed++;
    console.log(`  FAIL  ${description}`);
  }
}

console.log("=== Layer 1 Matcher — Test Suite ===\n");

// ---- One positive case per rule ----
const ruleCases = [
  { text: "Contractor entered LOTO zone without isolation.", ruleId: "L1-001" },
  { text: "Technician reported isolation not verified before restart.", ruleId: "L1-002" },
  { text: "Crew began hot work without a gas test performed.", ruleId: "L1-003" },
  { text: "Job started with no permit present for the activity.", ruleId: "L1-004" },
  { text: "Worker entered confined space without atmospheric test.", ruleId: "L1-005" },
  { text: "Person entered vessel with no attendant on standby.", ruleId: "L1-006" },
  { text: "Employee was struck by falling debris near the walkway.", ruleId: "L1-007" },
  { text: "Incident occurred while working under a suspended load.", ruleId: "L1-008" },
  { text: "Worker experienced a fall from height, harness not worn.", ruleId: "L1-009" },
  { text: "Crane operation failed due to sling failure during lift.", ruleId: "L1-010" },
  { text: "Driver was involved in a vehicle collision on site road.", ruleId: "L1-011" },
  { text: "Technician received electrical shock near HV panel.", ruleId: "L1-012" },
];

console.log("-- Per-rule positive matches --");
ruleCases.forEach(({ text, ruleId }) => {
  const result = runLayer1Matcher(text);
  assert(`${ruleId}: "${text.slice(0, 45)}..."`, result.matched === true && result.matchedRuleId === ruleId);
});

// ---- True negative ----
console.log("\n-- True negative (no hazard language) --");
const negativeResult = runLayer1Matcher("Employee completed routine paperwork at the site office, no incident occurred.");
assert("Routine report does not trigger a match", negativeResult.matched === false);
assert("Routine report has empty evidence trail", negativeResult.matchedKeywords.length === 0);

// ---- Multi-rule match ----
console.log("\n-- Multi-rule match --");
const multiResult = runLayer1Matcher("Welder performing hot work near tank, no gas test, and no permit present for the job.");
assert("Multi-rule report matched", multiResult.matched === true);
assert("Multi-rule report captures keywords from both rules", multiResult.matchedKeywords.length >= 3);
assert("Multi-rule report lists only one IOGP rule (both are Hot Work)", multiResult.matchedIogpRules.length === 1);

// ---- Edge cases ----
console.log("\n-- Edge cases --");
assert("Empty string does not crash, returns unmatched", runLayer1Matcher("").matched === false);
assert("Null input does not crash, returns unmatched", runLayer1Matcher(null).matched === false);
assert("Undefined input does not crash, returns unmatched", runLayer1Matcher(undefined).matched === false);
assert("Non-string input does not crash, returns unmatched", runLayer1Matcher(12345).matched === false);

// ---- Case-insensitivity ----
console.log("\n-- Case-insensitivity --");
const upperResult = runLayer1Matcher("CONFINED SPACE entry with NO ATTENDANT present.");
assert("Uppercase text still matches (case-insensitive)", upperResult.matched === true && upperResult.matchedRuleId === "L1-005");

// ---- Summary ----
console.log(`\n=== Results: ${passed} passed, ${failed} failed (${ruleCases.length} rules covered) ===`);
if (failed > 0) process.exit(1);
