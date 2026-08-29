<div align="center">

# 🛢️ OIL Safety Intelligence
### AI/NLP SIF Precursor Detection System

**Smart India Hackathon 2026 · Oil India Limited (OIL)**

*An automated, lightweight, explainable system that catches the safety reports that matter — before they become fatalities, not after.*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Layer%202-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-Dashboard-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=flat-square)]()
[![Layer 1](https://img.shields.io/badge/Layer%201-Tested%20✓-brightgreen?style=flat-square)]()
[![Layer 2](https://img.shields.io/badge/Layer%202-In%20Progress-orange?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)]()

<br/>

[Architecture](#-architecture-overview) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Team](#-team--ownership)

</div>

<br/>

---


## 📋 Table of Contents

<table>
<tr>
<td valign="top" width="33%">

**Overview**
- [The Problem](#-the-problem)
- [What We Built](#-what-we-built)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)

**Setup**
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)

</td>
<td valign="top" width="33%">

**Core Systems**
- [Database — MongoDB + Prisma](#-database--mongodb--prisma)
- [Caching — Redis](#-caching--redis)
- [Layer 1 — Direct Matcher](#-layer-1--direct-matcher)
- [Layer 2 — Context Finder](#-layer-2--context-finder-fastapi--ml)
- [Fallback & Integration](#-fallback--integration-boundary)

</td>
<td valign="top" width="33%">

**Reference**
- [API Reference](#-api-reference)
- [Training Data](#-training-data)
- [Team & Ownership](#-team--ownership)
- [Judge Q&A](#-judge-qa--anticipated-questions)
- [Roadmap](#-roadmap)

</td>
</tr>
</table>

---

## 🎯 The Problem

<div align="center">

| 📉 Non-fatal accidents | ⚠️ Fatalities |
|:---:|:---:|
| **↓ ~51%** | **↓ ~25.5%** |

*Minor incidents and fatal incidents don't share root causes — an organisation can get much better at preventing small injuries while making almost no progress on what actually kills people.*

</div>

<br/>


Oil India Limited (OIL) collects a large volume of Unsafe Act / Unsafe Condition (UA/UC) reports and Near-Miss reports from field operations. Today, these are triaged **manually on a monthly or quarterly review cycle.** That cadence is far too slow for genuinely dangerous patterns — a precursor to a fatal incident can sit unreviewed for weeks while the underlying hazard remains live in the field.

### Our Goal
Build an automated, lightweight prototype that:
- Identifies the roughly **20–25%** of reports that carry genuine fatal potential (true **SIFs** — Serious Injury and Fatality precursors)
- Automatically maps each one to the relevant **IOGP Life-Saving Rule**
- Surfaces the resulting precursor patterns on an **interactive executive dashboard** — so leadership sees hotspots as they emerge, not months later

---

## 🏗️ What We Built

A **two-layer, explainable AI/NLP pipeline** that classifies incoming safety reports as `SIF_Potential` or `Non_SIF_Potential`, tags them against IOGP Life-Saving Rules, and surfaces the results on a live dashboard — all deployable on-premise, on standard CPU, with zero cloud licensing cost and zero third-party data exposure.

```
Report enters
      │
      ▼
┌─────────────────────┐
│  LAYER 1             │  <5ms · exact keyword/acronym match
│  Direct Matcher       │  100% explainable
└──────────┬───────────┘
           │
    matched? ──yes──▶ Save to DB ──▶ Dashboard
           │
           no
           ▼
┌─────────────────────┐
│  LAYER 2             │  Semantic slot parsing
│  Context Finder       │  (Action / Object / Control Deficiency)
└──────────┬───────────┘
           │
   layer 2 healthy? ──no──▶ Fallback to Layer 1 result (graceful degradation)
           │
          yes
           ▼
    Save to DB ──▶ Dashboard
```

---

## 🔍 Architecture Overview

The system is built around a simple idea: **use a fast, simple, 100% explainable check first, and only bring in smarter (but slower) analysis for the reports that genuinely need it.**

### Layer 1 — Deterministic Pattern Engine ("The Direct Matcher")
Layer 1 is the system's first pass — a fast, literal reader that scans each report's text for exact keywords, site-specific acronyms, and a library of predefined pattern rules.

| Property | Value |
|---|---|
| Runtime | Inside Node.js/Express — no separate service call |
| Execution time | **<5ms per report** (measured, not assumed — see [Layer 1 section](#-layer-1--direct-matcher)) |
| Hardware | Standard CPU only |
| Explainability | 100% — always points to the exact matched words |

Most clearly-written UA/UC reports resolve entirely at this layer. A report that plainly says *"welding near pipeline, no gas test performed"* needs nothing more sophisticated than a direct pattern match.

### Layer 2 — Semantic Intent & Fuzzy Context Parser ("The Context Finder")
Not every report is written clearly — field reports are typed quickly, contain typos, use indirect phrasing, or never use the exact keyword a rule is looking for. Layer 2 catches those cases via **slot parsing**, breaking a report into three independent slots:

- **Action** — what activity was occurring (e.g. *Welding, Entering, Repairing*)
- **Object / Environment** — the equipment or location involved (e.g. *Pipeline, Vessel, HV Panel*)
- **Control Deficiency** — the implicit absence of a required safety barrier (e.g. *"unverified"*, *"no permit present"*)

By combining these three slots, Layer 2 reconstructs the hazard even when no single keyword would have triggered Layer 1 — e.g. recognising *"welder working on tank, permit not yet signed off"* as a Hot Work / Energy Isolation precursor, without ever seeing the words "gas test" or "isolation."

### Fault Tolerance
If Layer 2 experiences delays or errors, the system **seamlessly falls back to the Layer 1 result** instead of failing the request. The core backend never crashes because of a downstream service issue — it keeps operating with the deterministic layer alone until Layer 2 is healthy again. This fallback is tested and verified live (see [Fallback section](#-fallback--integration-boundary)).

---

## 🛠️ Tech Stack

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | React.js + Tailwind CSS | Triage Queue, Explainability Modals, Heatmaps, Executive Dashboard |
| **Backend API** | Node.js + Express + Prisma ORM + MongoDB | Report ingestion, Layer 1 matching, DB aggregations, core business logic |
| **Caching** | Redis (Upstash) | Response caching for the reports feed, cache invalidation on new writes |
| **Layer 2 Microservice** | Python + FastAPI (stateless) | Fuzzy context parsing, text normalization |
| **ML Training** | Python (scikit-learn / NLP libraries) | Trains the Layer 2 slot-parsing model on filtered public safety datasets |
| **Deployment** | On-premise, standard CPU | 100% on-premise deployable, zero cloud licensing fees, keeps OIL's data in-house |

### Why MongoDB (not PostgreSQL)?
Report data flows through the two-layer pipeline in **variable shape** — a report resolved at Layer 1 never has Layer 2 fields at all; a report that reaches Layer 2 has an additional nested object. In PostgreSQL this needs nullable columns or a joined table. In MongoDB, a document simply **omits the Layer 2 sub-object when it doesn't apply** — no migrations, no null-column clutter. This is a deliberate architectural decision based on how the pipeline's output actually varies, not a shortcut for convenience.

### Why Prisma on top of MongoDB?
MongoDB is schemaless by default. Prisma reintroduces structure at the application layer:
- **Single source of truth** — `schema.prisma` defines every field in one file every sub-team builds against
- **End-to-end type safety** — a missing field is caught at compile time, not discovered mid-demo
- **Consistent query interface** regardless of underlying DB
- **Documentation by default** — the schema file doubles as living architecture documentation for judges

### Why Redis?
The dashboard's `GET /api/reports` endpoint is read frequently (every dashboard load/refresh) but only needs to change when a *new* report is classified. Redis caches this response for 5 minutes and is explicitly invalidated the moment a new report is written — cutting DB load without ever serving stale data past a write.

### Why not a hosted LLM (OpenAI, etc.)?
Two reasons:
1. **Data privacy** — OIL's internal safety data cannot be transmitted offsite to a third-party API.
2. **Auditability** — our local rule-based and slot-parsing approach is fully transparent, whereas a hosted LLM operates as an unexplainable black box. In a regulated safety context, every flag may need to be justified to a safety regulator — a black box can't do that.

---

## 📁 Project Structure

```
OIL-Safety-Intelligence/
├── prisma/
│   └── schema.prisma          # Finalized DB schema (MongoDB + Prisma)
│
├── src/
│   ├── config/
│   │   └── redis.js           # Redis (Upstash) client setup
│   │
│   ├── layer1/
│   │   ├── patternRules.js    # Hazard pattern rule library (35 rules, growing)
│   │   ├── matcher.js         # Core keyword/acronym matching logic
│   │   └── timingWrapper.js   # Wraps matcher, measures real execution time
│   │
│   ├── layer2/
│   │   └── client.js          # Axios client → FastAPI microservice, with timeout + fallback
│   │
│   └── routes/
│       └── reportRoute.js     # POST /api/reports/classify, GET /api/reports
│
├── tests/
│   └── layer1.test.js         # Unit tests — all 35 rules + edge cases
│
├── .env                        # DATABASE_URL, REDIS_URL, LAYER2_URL, PORT
├── server.js                   # Express app entry point
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A MongoDB instance (Atlas or self-hosted)
- A Redis instance (Upstash or self-hosted) — optional, degrades gracefully if absent
- Python 3.10+ (for the Layer 2 FastAPI service, once available)


## 🗄️ Database — MongoDB + Prisma

The schema centers on a single `Report` collection with **four embedded structures** reflecting the two-layer pipeline:

| Embedded Type | Present When | Purpose |
|---|---|---|
| `Layer1Result` | Always | Whether a direct pattern match occurred, matched keywords, execution time |
| `Layer2Result` | Only if Layer 1 was inconclusive | Parsed Action / Object / Control-Deficiency slots, confidence score |
| `FallbackInfo` | Always | Audit trail for the Node.js ↔ FastAPI integration boundary |
| `FinalResult` | Always | The consolidated, dashboard-facing result |

```prisma
model Report {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  rawText       String
  source        String   // "OSHA" | "MSHA" | "BSEE" | "ASRS" | "OIL_synthetic" | "OIL_live"
  siteId        String?
  activityTag   String?
  reportedAt    DateTime @default(now())
  eventDate     DateTime?

  layer1        Layer1Result
  layer2        Layer2Result?
  fallback      FallbackInfo
  finalResult   FinalResult

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([finalResult.classification])
  @@index([finalResult.iogpRule])
  @@index([finalResult.layerUsed])
  @@index([siteId])
  @@index([activityTag])
  @@index([eventDate])
}
```

Full schema: [`prisma/schema.prisma`](./prisma/schema.prisma)

Indexes are set on `classification`, `iogpRule`, `siteId`, `activityTag`, and `eventDate` to support the dashboard's hotspot and trend queries.

---

## ⚡ Caching — Redis

`GET /api/reports` is cached for **5 minutes** under the key `reports:all`. Every successful `POST /api/reports/classify` **invalidates** that cache immediately, so the dashboard never serves stale data for more than one write cycle.

```js
// Read path
if (redisClient.isOpen) {
  const cached = await redisClient.get(REPORTS_CACHE_KEY);
  if (cached) return res.json(JSON.parse(cached));
}
// ...query MongoDB, then:
await redisClient.setEx(REPORTS_CACHE_KEY, 300, JSON.stringify(reports));

// Write path (invalidation)
if (redisClient.isOpen) {
  await redisClient.del(REPORTS_CACHE_KEY);
}
```

All Redis calls are guarded with `isOpen` checks — if Redis is unconfigured or down, the system transparently falls back to querying MongoDB directly on every request. **No crash, no error spam, just reduced caching benefit.**

---

## 🎯 Layer 1 — Direct Matcher

<p>
<img alt="Rules" src="https://img.shields.io/badge/Rules-35-blue?style=flat-square"/>
<img alt="Categories" src="https://img.shields.io/badge/IOGP%20Categories-9-blue?style=flat-square"/>
<img alt="Speed" src="https://img.shields.io/badge/Execution-%3C0.2ms-brightgreen?style=flat-square"/>
<img alt="Tests" src="https://img.shields.io/badge/Tests-22%2F22%20passing-brightgreen?style=flat-square"/>
</p>

### Rule Library
35 pattern rules across 9 IOGP-aligned hazard categories:

| Category | Example Keywords |
|---|---|
| 🔒 Energy Isolation | `LOTO`, `lock out tag out`, `energy not isolated` |
| 🔥 Hot Work | `welding`, `no gas test`, `flash fire`, `propane torch` |
| 🚪 Confined Space | `confined space`, `CSE`, `no atmospheric test` |
| ⚡ Line of Fire | `struck by`, `caught between`, `pinch point` |
| ⚙️ Mechanical Lifting | `tongs slipped`, `spinner chain caught` |
| 🪜 Working at Height | `fall from height`, `no fall protection`, `SRL` |
| 🏗️ Lifting Operations | `sling failure`, `improper rigging` |
| 🚗 Driving Safety | `seatbelt not worn`, `vehicle collision` |
| ⚡ Marine / High Voltage | `HV panel`, `arc flash`, `energized circuit` |
| ☣️ Chemical Exposure | `H2S`, `unlabeled container`, `chemical splash` |

Over half of these keyword sets were **mined directly from real OSHA incident narratives** (marked `// mined` in [`patternRules.js`](./src/layer1/patternRules.js)), not hand-guessed — e.g. *"gas valve was not fully shut"*, *"without the lock out/tag out system in place"*.

### Verified Performance
Tested live against real OSHA oil/gas incident narratives: **9/9 correctly matched**, with execution times consistently **under 0.2ms** — well inside the <5ms target.

```bash
node tests/layer1.test.js
# === Results: 22 passed, 0 failed (12+ rules covered) ===
```

---

## 🧩 Layer 2 — Context Finder (FastAPI + ML)

*Owned by the Backend/ML team.*

A stateless Python FastAPI microservice, invoked only when Layer 1 returns no match. Receives raw report text, returns parsed Action/Object/Control-Deficiency slots plus a confidence score.

```
POST http://<layer2-host>/predict
Body: { "text": "<raw report text>" }

Response:
{
  "action": "Welding",
  "object": "Pipeline",
  "controlDeficiency": "no permit present",
  "confidenceScore": 0.82,
  "reconstructedHazard": "Hot work performed without valid permit"
}
```

**Statelessness matters:** the service holds no persistent data — it can be restarted, scaled, or replaced without any risk of data loss, since MongoDB (via Prisma) remains the single source of truth for all report data and outcomes.

### Training Status
Layer 2's model is trained on public safety datasets (see [Training Data](#-training-data) below). Current accuracy is a known work-in-progress — the team's diagnosis is that raw dataset volume matters less than **relevance filtering**: of ~106,000 OSHA records, only a small, highly relevant subset actually represents IOGP-style hazard precursor language, and training on the full unfiltered set introduces noise the model has to fight against.

---

## 🔄 Fallback & Integration Boundary

*Owned by the Core Operations & Integration Lead.*

The Node.js ↔ FastAPI boundary — request formatting, timeout handling, graceful fallback — is the **single highest-risk point in the system** if not owned clearly. This project assigns it explicitly so that if Layer 2 fails during a demo or in production, fallback activates cleanly rather than surfacing as an unhandled error.

```js
// src/layer2/client.js
async function runLayer2WithFallback(rawText) {
  try {
    const response = await axios.post(LAYER2_URL, { text: rawText }, { timeout: LAYER2_TIMEOUT_MS });
    return { result: {...}, fallback: { fallbackTriggered: false, ... } };
  } catch (error) {
    let fallbackReason = "5xx_error";
    if (error.code === "ECONNABORTED") fallbackReason = "timeout";
    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") fallbackReason = "network_error";
    return { result: null, fallback: { fallbackTriggered: true, fallbackReason, ... } };
  }
}
```

### Verified Live
This fallback path has been tested end-to-end — Layer 2 was deliberately made unreachable, and the system correctly:
1. Attempted Layer 2
2. Caught the network error
3. Set `fallback.fallbackTriggered: true`, `fallback.fallbackReason: "network_error"`
4. Set `finalResult.layerUsed: "layer1_fallback"`
5. Returned a safe `Non_SIF_Potential` classification with **no crash, no unhandled error**

This is the exact story judges will probe — and it's real, not aspirational.

---

## 📡 API Reference

### `POST /api/reports/classify`
Classify a new safety report.

<details>
<summary><strong>▸ Request body</strong></summary>

```json
{
  "rawText": "Welder working on tank, no gas test performed before starting hot work.",
  "source": "OIL_live",
  "siteId": "Duliajan",
  "activityTag": "Maintenance",
  "eventDate": "2026-08-29"
}
```

</details>

<details>
<summary><strong>▸ Response — Layer 1 match</strong></summary>

```json
{
  "id": "...",
  "layer1": {
    "attempted": true,
    "matched": true,
    "matchedKeywords": ["hot work", "no gas test"],
    "matchedRuleId": "L1-003",
    "matchedIogpRules": ["Hot Work"],
    "executionTimeMs": 0.16
  },
  "layer2": null,
  "fallback": { "fallbackTriggered": false, ... },
  "finalResult": {
    "classification": "SIF_Potential",
    "iogpRule": "Hot Work",
    "layerUsed": "layer1",
    "evidenceSource": "layer1",
    "evidenceTrail": ["hot work", "no gas test"],
    "reviewStatus": "pending"
  }
}
```

</details>

### `GET /api/reports`
Fetch the most recent 50 reports (Redis-cached, 5 min TTL).

### `GET /health`
Basic liveness check.
```json
{ "status": "OK", "timestamp": "..." }
```

---

## 📊 Training Data

Since no OIL ground-truth data is available, the system trains on **authentic, open public safety datasets**, filtered for incidents with **low recorded severity but high potential severity** — exactly the SIF-precursor pattern we're trying to detect.

| Source | Role |
|---|---|
| **OSHA** (Severe Injury Reports + ITA) | Primary narrative source; SIR gives severe-outcome text, ITA gives the broader/near-miss counterpart |
| **MSHA** | Mine accident/injury records with structured severity + narrative fields |
| **BSEE** | Offshore oil & gas incident investigations — closest domain match to OIL |
| **NASA ASRS** | Aviation near-miss narratives — used for precursor-language patterns despite cross-domain source |

The underlying engine is **domain-agnostic** — connecting it to OIL's own report data going forward is a configuration swap, not a rebuild.

### Class Imbalance Handling
The system is deliberately tuned for **high recall over high precision**. The reasoning is a direct cost comparison: a false positive costs about two minutes of human review time, while a false negative can cost a life. Given that asymmetry, the system errs on the side of flagging a borderline report for human review rather than silently dismissing it.

---

<div align="center">

### 🛢️ Built for Smart India Hackathon 2026
**Oil India Limited**

*Explainable by design. Fast by architecture. Built to catch what monthly reviews miss.*

<br/>


</div>
