<div align="center">

# 🛢️ OIL Safety Intelligence
### AI/NLP SIF Precursor Detection System

*Catches the safety reports that matter — before they become fatalities, not after.*

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-Layer%202-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[![Layer 1](https://img.shields.io/badge/Layer%201-Live-brightgreen?style=flat-square)]()
[![Layer 2](https://img.shields.io/badge/Layer%202-Live-brightgreen?style=flat-square)]()
[![Fallback](https://img.shields.io/badge/Fallback-Tested-brightgreen?style=flat-square)]()
[![System Status](https://img.shields.io/badge/System%20Status-Live-brightgreen?style=flat-square)]()
[![Pattern Engine](https://img.shields.io/badge/Pattern%20Engine-Not%20Implemented-lightgrey?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)]()

<br/>

[Architecture](#-architecture) · [Components](#-components) · [Layer 1](#-layer-1--direct-matcher) · [Layer 2](#-layer-2--context-finder) · [Fallback](#-fallback--integration-boundary) · [System Status](#-system-status) · [API Reference](#-api-reference) · [Getting Started](#-getting-started)

</div>

<br>

---

## 📋 Table of Contents

<table>
<tr>
<td valign="top" width="33%">

**Overview**
- [The Problem](#-the-problem)
- [What We Built](#-what-we-built)
- [Architecture](#-architecture)
- [Components](#-components)
- [Project Structure](#-project-structure)

</td>
<td valign="top" width="33%">

**Pipeline**
- [Layer 1 — Direct Matcher](#-layer-1--direct-matcher)
- [Layer 2 — Context Finder](#-layer-2--context-finder)
- [Fallback & Integration](#-fallback--integration-boundary)
- [Database Model](#-database-model)
- [System Status](#-system-status)

</td>
<td valign="top" width="33%">

**Reference**
- [Tech Stack](#-tech-stack)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Known Gaps & Roadmap](#-known-gaps--roadmap)

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

Oil and Gas Industry collects a large volume of Unsafe Act / Unsafe Condition (UA/UC) reports and Near-Miss reports from field operations. Today these are triaged **manually, on a monthly or quarterly review cycle** — far too slow for genuinely dangerous patterns. A precursor to a fatal incident can sit unreviewed for weeks while the underlying hazard stays live in the field.

**Goal:** an automated, lightweight, explainable prototype that:
- Identifies the roughly **20–25%** of reports carrying genuine fatal potential — true **SIFs** (Serious Injury and Fatality precursors)
- Automatically maps each one to the relevant **IOGP Life-Saving Rule**
- Surfaces the resulting precursor patterns on an **interactive executive dashboard**
- Runs **entirely on-premise**, on standard CPU, with **zero cloud licensing cost and zero third-party data exposure**

---

## 🏗️ What We Built

A **two-layer, explainable AI/NLP pipeline** that classifies every incoming safety report as `SIF_Potential` or `Non_SIF_Potential`, tags it against an IOGP Life-Saving Rule, and surfaces the result on a live dashboard — with a **fallback layer** that guarantees the pipeline degrades gracefully instead of failing, and a **System Status page** that reports the real, live health of every component instead of a hardcoded "everything's fine."

```
                         Report enters
                               │
                               ▼
                 ┌───────────────────────────┐
                 │   LAYER 1 — Direct Matcher │   <5ms · exact keyword/acronym match
                 │   (in-process, Node.js)    │   34-rule library · 100% explainable
                 └─────────────┬──────────────┘
                                │
                     matched a rule? ───────── yes ──▶ Save to DB ──▶ Dashboard
                                │
                                no (inconclusive)
                                ▼
                 ┌───────────────────────────┐
                 │   LAYER 2 — Context Finder  │   Semantic slot parsing:
                 │   (FastAPI microservice)    │   Action / Object / Control Deficiency
                 └─────────────┬──────────────┘
                                │
                    Layer 2 healthy & responded in time? ── no ──▶ FALLBACK LAYER
                                │                                        │
                               yes                                      ▼
                                │                          Use Layer 1 result only,
                                ▼                          log fallback reason,
                        Save to DB ──▶ Dashboard           continue without crashing
                                                                        │
                                                                        ▼
                                                              Save to DB ──▶ Dashboard
```

---

## 🔍 Architecture

The system runs three deployable units plus a dashboard, all talking through one backend so the browser never touches the database, cache, or ML service directly.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (React)                              │
│   Dashboard · Triage Queue · Reports · Rules · Patterns · System Status   │
└───────────────────────────────┬────────────────────────────────────────┘
                                  │  HTTPS (fetch)
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    BACKEND API — Node.js + Express                        │
│                                                                            │
│   POST /api/reports/classify ──▶ Layer 1 (in-process) ──▶ Layer 2 client │
│   GET  /api/reports           ──▶ Prisma ──▶ MongoDB (cached via Redis)  │
│   GET  /api/reports/:id       ──▶ Prisma ──▶ MongoDB                    │
│   PATCH /api/reports/:id/status ──▶ Prisma ──▶ MongoDB                  │
│   GET  /api/system/status     ──▶ live health checks (§ System Status)  │
│                                                                            │
└───────┬─────────────────┬─────────────────────┬──────────────────────────┘
        │                 │                     │
        ▼                 ▼                     ▼
┌───────────────┐ ┌───────────────┐   ┌─────────────────────────┐
│  MongoDB Atlas │ │ Redis (Upstash)│   │  LAYER 2 — FastAPI      │
│  via Prisma    │ │ response cache │   │  (Python, stateless)    │
│  (Report docs) │ │ for GET /reports│  │  POST /analyze          │
│                │ │                │   │  GET  /health           │
└───────────────┘ └───────────────┘   └─────────────────────────┘
```

**Design principle:** use a fast, simple, 100% explainable check first (Layer 1), and only bring in slower, smarter analysis (Layer 2) for the reports that genuinely need it — with a fallback layer guaranteeing the pipeline never fails outright just because the smarter layer is briefly unavailable.

---

## 🧩 Components

| Component | Language / Framework | Deployable unit | Responsibility |
|---|---|---|---|
| **Frontend Dashboard** | React 19 + TypeScript + Vite | Static SPA | Triage queue, report detail, rule/pattern browsing, executive dashboard, live System Status page |
| **Backend API** | Node.js 22 + Express 5 | Single Node process | Report ingestion, Layer 1 execution, Layer 2 orchestration, fallback handling, persistence, caching, system health aggregation |
| **Layer 1 — Direct Matcher** | Plain JS, in-process | Runs inside the backend | Deterministic keyword/acronym rule matching (35 rules) |
| **Layer 2 — Context Finder** | Python + FastAPI | Separate microservice | Semantic slot parsing (Action / Object / Control Deficiency) for reports Layer 1 can't resolve |
| **Fallback Layer** | Node.js, inside `layer2/client.js` | Runs inside the backend | Guarantees graceful degradation to the Layer 1 result if Layer 2 times out or errors |
| **Database** | MongoDB Atlas + Prisma ORM | Managed cluster | Single `Report` collection with embedded per-layer results |
| **Cache** | Redis (Upstash) | Managed instance | Short-TTL cache for the reports feed; invalidated on every new write |
| **System Status** | Node.js (backend) + React (frontend) | Part of backend + frontend | Live, on-demand health checks for every component above — replaces the old hardcoded "Operational" badges |

---

## 📁 Project Structure

```
OIL-Safety-Intelligence/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # Report model + embedded Layer1/Layer2/Fallback/FinalResult types
│   ├── src/
│   │   ├── config/
│   │   │   ├── prisma.js              # Shared Prisma client singleton
│   │   │   └── redis.js               # Redis (Upstash) client setup
│   │   ├── layer1/
│   │   │   ├── patternRules.js        # 35-rule hazard pattern library
│   │   │   ├── matcher.js             # Core keyword/acronym matching logic
│   │   │   └── timingWrapper.js       # Wraps matcher, measures real execution time
│   │   ├── layer2/
│   │   │   └── client.js              # Axios client → FastAPI, with timeout + FALLBACK LAYER
│   │   ├── services/
│   │   │   └── healthChecks.js        # DB / Redis / Layer 2 / Layer 1 live health checks
│   │   └── routes/
│   │       ├── reportRoute.js         # classify / list / detail / status-update endpoints
│   │       └── systemStatusRoute.js   # GET /api/system/status aggregator
│   |
│   ├── server.js                      # Express entry point, mounts routes, caches Layer 1 self-test
│   └── package.json
│
├── frontend/
│   └── src/
│       ├── features/
│       │   ├── overview/              # Executive dashboard
│       │   ├── triage/                # Triage queue
│       │   ├── reports/               # Report list + detail
│       │   ├── rules/                 # IOGP Life-Saving Rules
│       │   ├── patterns/              # Recurring pattern browsing (mock — see Roadmap)
│       │   ├── sites/                 # Site-level breakdowns
│       │   ├── audit/                 # Audit log
│       │   ├── ingestion/             # Data ingestion
│       │   ├── settings/
│       │   └── system-status/         # Live System Status page
│       ├── hooks/
│       │   ├── useSystemStatus.ts     # Manual + opt-in-auto polling hook for system health
│       │   ├── useNavigation.ts
│       │   ├── useNotifications.ts
│       │   └── useSearch.ts
│       ├── lib/
│       │   ├── api.ts                 # fetchApi, fetchReports, getSystemStatus
│       │   └── adapters.ts            # Backend → frontend report shape mapping
│       ├── components/
│       │   ├── ui/                    # Card, Badge, Icon, SectionHead, etc.
│       │   └── layout/
│       │       └── Sidebar.tsx        # Nav + live AI Engine status dot
│       └── data/                      # Mock data backing not-yet-wired features (patterns, rules)
│
├── layer2/
│   ├── app.py                         # FastAPI service — POST /analyze, GET /health
│   ├── models/                        # Trained slot-parsing model artifacts
│   ├── scripts/                       # Dataset build + training scripts
│   ├── docs/
│   │   └── MODEL_CARD.md              # Model limitations, ground-truth caveats
│   └── requirements.txt
│
└── README.md                          # You are here
```

---

## 🥇 Layer 1 — Direct Matcher

The system's first pass: a fast, literal reader that scans a report's raw text for exact keywords, acronyms, and phrasing patterns, matched against a **35-rule pattern library** (`patternRules.js`) covering hazard categories like Energy Isolation, Hot Work, Confined Space, and more.

| Property | Value |
|---|---|
| Runtime | In-process inside the Node.js/Express backend — **no network hop** |
| Execution time | **<5ms per report**, measured with `process.hrtime.bigint()` (nanosecond precision), not assumed |
| Hardware | Standard CPU only |
| Explainability | 100% — every classification points to the exact matched keyword(s) |
| Startup self-test | Runs once when the server boots (`checkLayer1()` in `healthChecks.js`), cached on `app.locals.layer1Health` |

```js
// src/layer1/matcher.js
function runLayer1Matcher(rawText) {
  // normalizes text, scans all 35 rules for keyword hits
  // returns { matched, matchedKeywords, matchedRuleId, matchedIogpRules }
}
```

Most clearly-written UA/UC reports resolve entirely here. A report that plainly says *"welding near pipeline, no gas test performed"* needs nothing more sophisticated than a direct pattern match — and gets classified in single-digit milliseconds.

---

## 🧠 Layer 2 — Context Finder

Not every report is written clearly — field reports are typed quickly, contain typos, use indirect phrasing, or simply never use the exact keyword a Layer 1 rule is scanning for. When Layer 1 comes back inconclusive, the backend calls out to the **Layer 2 FastAPI microservice**, which performs **semantic slot parsing**, breaking the report into three independent slots:

- **Action** — what activity was occurring (e.g. *Welding, Entering, Repairing*)
- **Object / Environment** — the equipment or location involved (e.g. *Pipeline, Vessel, HV Panel*)
- **Control Deficiency** — the implicit absence of a required safety barrier (e.g. *"unverified"*, *"no permit present"*)

By combining these three slots, Layer 2 reconstructs the hazard even when no single keyword would have triggered Layer 1 — e.g. recognising *"welder working on tank, permit not yet signed off"* as a Hot Work / Energy Isolation precursor without ever seeing the words "gas test" or "isolation."

**One rule that matters:** a control deficiency is only ever asserted when the report text contains a span that supports it — Layer 2 never generates evidence, only slices it out of the original text. Model-only suspicions with no textual support are surfaced separately as `uncertain_no_textual_evidence` and never treated as a confirmed finding.

| Property | Value |
|---|---|
| Runtime | Separate Python + FastAPI process, called via HTTP (`POST /analyze`) |
| Deployment | 100% local CPU inference — no GPU, no external API keys |
| Timeout | Configurable via `LAYER2_TIMEOUT_MS` (default 2500ms for classification, 2000ms for the health check) |
| Health endpoint | `GET /health` — reports whether the trained model bundle loaded correctly |
| Status | Research prototype — ground truth is a provisional, human-reviewed sample. See `layer2/docs/MODEL_CARD.md` before quoting any accuracy figure from it |

---

## 🛟 Fallback — Integration Boundary

The fallback layer is what makes the two-layer pipeline **fault-tolerant** rather than fragile. It lives at the Node.js ↔ FastAPI boundary, in `src/layer2/client.js`:

```js
async function runLayer2WithFallback(rawText) {
  try {
    const response = await axios.post(LAYER2_URL, { reportText: rawText }, { timeout: LAYER2_TIMEOUT_MS });
    return { result: response.data, fallback: { fallbackTriggered: false, layer2Available: true } };
  } catch (error) {
    // Layer 2 timed out, errored, or is unreachable — fall back to Layer 1 alone.
    return {
      result: { action: "Unknown", object: "Unknown", controlDeficiency: "Fallback mode active", confidenceScore: 0.0 },
      fallback: { fallbackTriggered: true, fallbackReason: error.code === "ECONNABORTED" ? "Timeout" : error.message },
    };
  }
}
```

**Guarantees:**
- If Layer 2 is slow, down, or errors out, the request **never fails** — the backend classifies the report using the Layer 1 result alone and logs *why* the fallback fired (`FallbackInfo.fallbackReason`).
- Every report carries a permanent, queryable audit trail of whether it went through Layer 1 only, Layer 1 + Layer 2, or Layer 1 + fallback (`finalResult.layerUsed`: `"layer1"` | `"layer2"` | `"layer1_fallback"`).
- The **System Status** page's SIF Classifier card reflects this in real time — if Layer 2 is down, that card goes red without taking Processing Engine or Rule Mapper down with it.

---

## 🗄️ Database Model

A single `Report` collection in MongoDB, modeled through Prisma with **four embedded types** that mirror the pipeline stages:

| Embedded Type | Present When | Purpose |
|---|---|---|
| `Layer1Result` | Always | Whether a direct pattern match occurred, matched keywords, execution time |
| `Layer2Result` | Only if Layer 1 was inconclusive | Parsed Action / Object / Control-Deficiency slots, confidence score |
| `FallbackInfo` | Always | Audit trail for the Layer 1 ↔ Layer 2 integration boundary |
| `FinalResult` | Always | The consolidated, dashboard-facing classification |

```prisma
model Report {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  rawText       String
  source        String              // "OSHA" | "MSHA" | "BSEE" | "ASRS" | "OIL_synthetic" | "OIL_live"
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
}
```

> **MongoDB + Prisma gotcha worth documenting:** Prisma's Mongo connector requires an explicit `is:` wrapper to filter on a field *inside* an embedded type — `where: { finalResult: { is: { layerUsed: "layer1" } } }`, not `where: { finalResult: { layerUsed: "layer1" } }`. The latter throws `Unknown argument`. This is exactly what the System Status per-layer counts rely on.

**Why MongoDB, not PostgreSQL?** Report shape varies by pipeline stage — a report resolved at Layer 1 never has Layer 2 fields at all. MongoDB documents simply omit the Layer 2 sub-object when it doesn't apply; no nullable columns, no migrations.

**Why Prisma on top of MongoDB?** Single source of truth (`schema.prisma`), compile-time type safety, and living documentation of every field — instead of MongoDB's default schemaless free-for-all.

---

## 📡 System Status

The System Status page used to be a static, hardcoded array — four cards that always said "Operational" no matter what was actually happening in the backend. It's now backed by **real, live health checks** run on demand.

### What each card actually checks

| Card | Backing check | What "Down" really means |
|---|---|---|
| **Processing Engine** | MongoDB connectivity + `prisma.report.count()` | Database unreachable or query failed |
| **SIF Classifier** | Live `GET /health` call to the Layer 2 FastAPI service (2s timeout) | Layer 2 service down, timed out, or its models failed to load |
| **Rule Mapper** | One-time self-test of the Layer 1 matcher at server startup, cached | The 35-rule library failed to load or the matcher threw on a test call |
| **Pattern Engine** | *None — intentionally* | Always reports `not_implemented`; there is no backend job that computes trends yet (see [Known Gaps](#-known-gaps--roadmap)) |

### How it works

```
GET /api/system/status  (backend, systemStatusRoute.js)
        │
        ├──▶ checkDatabase(prisma)   → MongoDB ping + per-layer counts
        ├──▶ checkRedis(redisClient) → PING
        ├──▶ checkLayer2()           → GET {LAYER2_URL}/health, 2s timeout
        └──▶ layer1Health (cached at startup, not re-run per request)
                │
                ▼
        aggregate + return { components: [...], infrastructure: {...} }
```

- Each check is **independent and isolated** — a Layer 2 timeout marks only that card "down"/"degraded"; it can never hang or crash the rest of the response.
- Failures **never leak** raw error messages, stack traces, or connection strings to the browser — only short, generic reasons (`"unreachable"`, `"unreachable or timed out"`). The backend `.env` holds live MongoDB/Redis credentials that must never be exposed through an error string.

### On-demand, not constant polling

Earlier versions of this page auto-polled every 30 seconds. That's now **opt-in**:

- **On page load** — one check runs automatically, once.
- **"Check Now" button** — triggers a fresh check on demand.
- **"Auto-refresh every 30s" toggle** — off by default; switch it on only if you actually want the loop running.
- The **sidebar's "AI Engine" dot** does its own single check on load and does *not* poll — it reflects the same `overallState()` (worst-of Processing Engine / SIF Classifier / Rule Mapper) without adding background traffic.

```ts
// frontend/src/hooks/useSystemStatus.ts
const { data, error, loading, checking, refresh } = useSystemStatus({ autoRefresh: false });
// refresh() → manual "Check Now"
// { autoRefresh: true, intervalMs: 30000 } → opt-in 30s loop
```

---

## 🛠️ Tech Stack

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind | Dashboard, triage queue, report/rule/pattern browsing, live System Status |
| **Backend API** | Node.js 22 + Express 5 + Prisma ORM | Ingestion, Layer 1 execution, Layer 2 orchestration, fallback, health aggregation |
| **Database** | MongoDB Atlas | Single `Report` collection, embedded per-layer results |
| **Caching** | Redis (Upstash) | Response caching for the reports feed, invalidated on every write |
| **Layer 2 Microservice** | Python + FastAPI | Semantic slot parsing, `/health` self-report |
| **ML Training** | Python (scikit-learn / NLP libraries) | Trains the Layer 2 slot-parsing model offline |
| **Deployment** | On-premise, standard CPU | Zero cloud licensing fees, keeps OIL's data in-house end to end |

### Why not a hosted LLM (OpenAI, etc.)?
1. **Data privacy** — OIL's internal safety data cannot be transmitted offsite to a third-party API.
2. **Auditability** — the rule-based and slot-parsing approach is fully transparent and every flag traces back to specific text. A hosted LLM would be an unexplainable black box in a context where flags may need to be justified to a safety regulator.

---

## 📖 API Reference

### Reports

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/reports/classify` | Ingest a raw report; runs Layer 1 → (Layer 2 or fallback) → persists the result |
| `GET` | `/api/reports` | List all reports, most recent first (optional `?limit=`); Redis-cached for 60s |
| `GET` | `/api/reports/:id` | Fetch one report by its MongoDB ObjectId; 404 for any non-ObjectId-shaped id |
| `PATCH` | `/api/reports/:id/status` | Update a report's `reviewStatus` (`pending` ↔ `reviewed`) |

### System Status

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/system/status` | Runs all live health checks and returns component + infrastructure state |

```json
{
  "components": [
    { "name": "Processing Engine", "state": "up", "processed": 482 },
    { "name": "SIF Classifier",   "state": "up", "processed": 316 },
    { "name": "Rule Mapper",      "state": "up", "processed": 482 },
    { "name": "Pattern Engine",   "state": "not_implemented", "processed": 0 }
  ],
  "infrastructure": { "database": "up", "redis": "up" }
}
```

`state` is one of `"up" | "degraded" | "down" | "not_implemented"`.

### Health check (raw process liveness, not component health)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Backend process liveness — always `{ status: "OK" }` if the Node process is up at all |

---

## 🚀 Getting Started

### Prerequisites
- Node.js **22+**
- Python **3.10+** (for the Layer 2 FastAPI service)
- A MongoDB instance (Atlas recommended)
- A Redis instance (Upstash recommended) — optional, the system degrades gracefully without it

### 1. Backend
```bash
cd backend
npm install
npx prisma generate
npm start
```
Confirm it's alive:
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/system/status
```

### 2. Layer 2 service
```bash
cd layer2
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --port 5001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

**`backend/.env`**
```env
PORT=5000
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority"
REDIS_URL="rediss://<user>:<password>@<upstash-host>:<port>"
LAYER2_URL="http://localhost:5001/analyze"
LAYER2_TIMEOUT_MS=2500
FRONTEND_ORIGINS="http://localhost:5173,http://localhost:3000"
NODE_ENV=development
```

**`frontend/.env`**
```env
VITE_API_BASE_URL="http://localhost:5000/api"
```

> Never commit real values for `DATABASE_URL` or `REDIS_URL` — both are live credentials. The System Status endpoint is specifically designed to never echo these back, even on failure.

---

## 🧭 Known Gaps & Roadmap

| Gap | Status | What's needed |
|---|---|---|
| **Pattern Engine** | Not implemented | A scheduled/triggered backend job to compute recurring rule + activity co-occurrence trends, and somewhere to store the result (currently there's only the `Report` model — a `Pattern` model or cached aggregation would be needed) |
| **Rules & Patterns pages** | Backed by mock data | `RuleDetailPage.tsx` / `PatternDetailPage.tsx` currently read from `src/data/reports.ts` (mock IDs like `OIL-2026-1804`), not the live backend — their "Supporting Reports" rows are intentionally non-clickable until this is wired to `fetchReports()` |
| **System Status auto-refresh** | Opt-in, off by default | Working as intended — flagged here only so it isn't mistaken for an oversight |

---

<div align="center">

*AI NLP SIH PRECURSOR DETECTION SYSTEM*
</div>
