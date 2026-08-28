const axios = require("axios");

const LAYER2_URL = process.env.LAYER2_URL || "http://localhost:8000/predict";
const LAYER2_TIMEOUT_MS = parseInt(process.env.LAYER2_TIMEOUT_MS || "2500", 10);

/**
 * Calls Python FastAPI microservice with configurable timeout and error handling.
 * @param {string} rawText
 * @returns {Promise<{result: Object|null, fallback: Object}>}
 */
async function runLayer2WithFallback(rawText) {
  const startTime = Date.now();
  const loggedAt = new Date();

  try {
    const response = await axios.post(
      LAYER2_URL,
      { text: rawText },
      { timeout: LAYER2_TIMEOUT_MS }
    );

    const executionTimeMs = Date.now() - startTime;
    const data = response.data || {};

    return {
      result: {
        invoked: true,
        action: data.action || null,
        object: data.object || null,
        controlDeficiency: data.controlDeficiency || null,
        confidenceScore: typeof data.confidenceScore === "number" ? data.confidenceScore : null,
        reconstructedHazard: data.reconstructedHazard || null,
        executionTimeMs,
      },
      fallback: {
        layer2Available: true,
        fallbackTriggered: false,
        fallbackReason: null,
        timeoutMs: LAYER2_TIMEOUT_MS,
        loggedAt,
      },
    };
  } catch (error) {
    let fallbackReason = "5xx_error";
    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      fallbackReason = "timeout";
    } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      fallbackReason = "network_error";
    }

    return {
      result: null,
      fallback: {
        layer2Available: false,
        fallbackTriggered: true,
        fallbackReason,
        timeoutMs: LAYER2_TIMEOUT_MS,
        loggedAt,
      },
    };
  }
}

module.exports = { runLayer2WithFallback };