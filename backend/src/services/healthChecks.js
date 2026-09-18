/**
 * System Status — individual component health checks.
 *
 * Each function is independent and swallows its own errors, returning
 * a small { state, ... } object instead of throwing. That's on purpose:
 * one slow/failing component (e.g. Layer 2 down) must never take out the
 * whole /api/system/status response for the others.
 *
 * IMPORTANT: never return raw error messages, stack traces, or connection
 * strings here. Only short, generic reason strings — this backend's .env
 * holds live MongoDB/Redis credentials, and those must never be
 * reachable from an error string that reaches the browser.
 */

const { runLayer1Matcher } = require("../layer1/matcher");
const { patternRules } = require("../layer1/patternRules");

/**
 * Database (MongoDB via Prisma).
 * A cheap connectivity check plus real per-layer counts, read from
 * finalResult.layerUsed ("layer1" | "layer2" | "layer1_fallback"),
 * which already exists on every report.
 */
async function checkDatabase(prisma) {
  const start = Date.now();
  try {
    const [total, layer1Count, layer2Count, layer1FallbackCount] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { finalResult: { is: { layerUsed: "layer1" } } } }),
      prisma.report.count({ where: { finalResult: { is: { layerUsed: "layer2" } } } }),
      prisma.report.count({ where: { finalResult: { is: { layerUsed: "layer1_fallback" } } } }),
    ]);

    return {
      state: "up",
      latencyMs: Date.now() - start,
      total,
      byLayer: {
        layer1: layer1Count,
        layer2: layer2Count,
        layer1_fallback: layer1FallbackCount,
      },
    };
  } catch (err) {
    return { state: "down", latencyMs: Date.now() - start, error: "unreachable", total: 0, byLayer: {} };
  }
}

/**
 * Redis — a raw PING is the standard, near-zero-cost check.
 */
async function checkRedis(redisClient) {
  const start = Date.now();
  try {
    if (!redisClient.isOpen) {
      return { state: "down", latencyMs: Date.now() - start, error: "not connected" };
    }
    const pong = await redisClient.ping();
    return { state: pong === "PONG" ? "up" : "degraded", latencyMs: Date.now() - start };
  } catch (err) {
    return { state: "down", latencyMs: Date.now() - start, error: "unreachable" };
  }
}

/**
 * Layer 2 (SIF Classifier) — calls the FastAPI service's own /health
 * endpoint. Derives the base URL from LAYER2_URL (same env var
 * layer2/client.js reads for /analyze) so there's only one place that
 * needs to change if the service moves. Hard 2s timeout — this must
 * never block the rest of the status report.
 */
async function checkLayer2() {
  const base = (process.env.LAYER2_URL || "http://localhost:5001/analyze").replace(/\/analyze\/?$/, "");
  const start = Date.now();
  try {
    const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      return { state: "degraded", latencyMs: Date.now() - start };
    }
    const data = await res.json();
    return { state: "up", latencyMs: Date.now() - start, modelsLoaded: data.models ?? null };
  } catch (err) {
    return { state: "down", latencyMs: Date.now() - start, error: "unreachable or timed out" };
  }
}

/**
 * Layer 1 (Rule Mapper) — not a network service, runs in-process.
 * "Checking" it means confirming the rule library loaded and a match
 * call doesn't throw. Intended to run once at server startup and be
 * cached (see server.js), not re-run on every status poll.
 */
function checkLayer1() {
  try {
    if (!Array.isArray(patternRules) || patternRules.length === 0) {
      return { state: "down", error: "rule library failed to load", rulesLoaded: 0 };
    }
    runLayer1Matcher("self-test: no isolation performed before maintenance");
    return { state: "up", rulesLoaded: patternRules.length };
  } catch (err) {
    return { state: "down", error: "matcher threw on self-test", rulesLoaded: 0 };
  }
}

module.exports = { checkDatabase, checkRedis, checkLayer2, checkLayer1 };