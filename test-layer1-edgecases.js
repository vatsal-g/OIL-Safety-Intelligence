// test-layer1-edgecases.js
const { runLayer1WithTiming } = require("./src/layer1/timingWrapper");

const edgeCases = [
  {
    name: "Edge Case 1: Uppercase & Mixed Formatting",
    text: "URGENT: HOT WORK WELDING EXECUTED NEAR PIPE WITHOUT PTW SIGNED OFF!",
  },
  {
    name: "Edge Case 2: Mined Keyword with Punctuation & Typos",
    text: "worker entered vessel without the lock out/tag out system in place... gas valve was not fully shut!!",
  },
  {
    name: "Edge Case 3: Empty / Whitespace Input",
    text: "   \n\t   ",
  },
  {
    name: "Edge Case 4: Non-string / Null Payload Handling",
    text: null,
  },
  {
    name: "Edge Case 5: Safe Narrative (Zero Hazards / Clean Report)",
    text: "Technician performed routine daily walkthrough of control room. No issues observed, all gauges normal.",
  },
  {
    name: "Edge Case 6: Multiple Simultaneous Hazard Matches",
    text: "Worker operating grinding tool without gas test (Hot Work), standing directly under suspended load (Line of Fire), and harness not worn at height.",
  },
  {
    name: "Edge Case 7: Substring Overlap & Acronym Match",
    text: "LOTO procedures violated while attempting maintenance on high voltage panel.",
  },
];

console.log("==================================================");
console.log("🧪 RUNNING LAYER 1 EDGE CASE VALIDATION SUITE");
console.log("==================================================\n");

edgeCases.forEach((test, index) => {
  const result = runLayer1WithTiming(test.text);

  console.log(`Test #${index + 1}: ${test.name}`);
  console.log(`Input: "${test.text}"`);
  console.log(`Matched: ${result.matched}`);
  console.log(`Matched Keywords: ${JSON.stringify(result.matchedKeywords)}`);
  console.log(`Matched IOGP Rules: ${JSON.stringify(result.matchedIogpRules)}`);
  console.log(`Execution Time: ${result.executionTimeMs} ms`);
  console.log("--------------------------------------------------\n");
});