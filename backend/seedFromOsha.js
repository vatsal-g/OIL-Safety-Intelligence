/**
 * seedFromOsha.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const DELAY_MS = 50; 

const RELEVANT_NAICS_PREFIXES = ["211", "212", "213", "324", "486"];

const SITE_POOL = ["Duliajan", "Naharkatia", "Moran", "Bongaigaon", "Numaligarh"];
const ACTIVITY_POOL = ["Maintenance", "Drilling", "Production", "Turnaround", "Inspection", "Construction"];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitCsvLine(line) {
  const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
  if (!line) return [];
  return line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
}

async function sendRequestWithRetry(payload, index, total, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        console.warn(`[${index}/${total}] Rate limit hit (429). Retrying in 5s... (Attempt ${attempt}/${maxRetries})`);
        await sleep(5000);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        console.log(`[${index}/${total}] FAILED (${res.status}): ${body.slice(0, 100)}`);
        return false;
      }

      const data = await res.json();
      const classification = data?.finalResult?.classification || "Classified";
      console.log(`[${index}/${total}] OK — ${classification} — "${payload.rawText.slice(0, 50)}..."`);
      return true;
    } catch (err) {
      console.log(`[${index}/${total}] ERROR: ${err.message}`);
      return false;
    }
  }
  return false;
}

async function main() {
  const csvPath = process.argv[2];
  const offset = parseInt(process.argv[3] || "100", 10); // Start index (e.g., 100 for 101st row)
  const count = parseInt(process.argv[4] || "200", 10);  // Total count to seed (e.g., 200)

  if (!csvPath) {
    console.error("Usage: node seedFromOsha.js <path-to-csv> [offset] [count]");
    process.exit(1);
  }

  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`Reading ${resolvedPath}...`);

  const fileStream = fs.createReadStream(resolvedPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let header = null;
  let naicsIdx = -1;
  let narrativeIdx = -1;
  const relevantRows = [];

  for await (const line of rl) {
    if (!header) {
      header = splitCsvLine(line).map((h) => h.replace(/^"|"$/g, "").trim());
      naicsIdx = header.indexOf("Primary NAICS");
      narrativeIdx = header.indexOf("Final Narrative");

      if (naicsIdx === -1 || narrativeIdx === -1) {
        console.error("Could not find 'Primary NAICS' or 'Final Narrative' columns in the CSV header.");
        process.exit(1);
      }
      continue;
    }

    const cols = splitCsvLine(line);
    const naics = (cols[naicsIdx] || "").replace(/^"|"$/g, "").trim();
    const narrative = (cols[narrativeIdx] || "").replace(/^"|"$/g, "").trim();

    if (
      narrative.length > 20 &&
      (RELEVANT_NAICS_PREFIXES.some((prefix) => naics.startsWith(prefix)) || naics === "")
    ) {
      relevantRows.push(narrative);
    }
  }

  console.log(`Found ${relevantRows.length} relevant oil/gas rows with valid narratives.`);

  if (relevantRows.length === 0) {
    console.warn("No rows matched criteria.");
    process.exit(0);
  }

  // Pick slice starting from index [offset] up to [offset + count]
  const selected = relevantRows.slice(offset, offset + count);

  console.log(`Seeding ${selected.length} reports (rows ${offset + 1} to ${offset + selected.length}) to ${API_BASE_URL}/api/reports/classify ...\n`);

  let success = 0;
  let failed = 0;

  for (const [i, rawText] of selected.entries()) {
    const payload = {
      rawText,
      source: "OSHA",
      siteId: pickRandom(SITE_POOL),
      activityTag: pickRandom(ACTIVITY_POOL),
    };

    const isSuccess = await sendRequestWithRetry(payload, i + 1, selected.length);
    if (isSuccess) {
      success++;
    } else {
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
}

main();