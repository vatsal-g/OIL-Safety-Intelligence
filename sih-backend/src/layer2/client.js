const axios = require("axios");

const LAYER2_URL =
  process.env.LAYER2_URL || "http://localhost:8000/analyze";

const LAYER2_TIMEOUT_MS = parseInt(
  process.env.LAYER2_TIMEOUT_MS || "2500",
  10
);

/**
 * Calls the Python Layer 2 FastAPI /analyze endpoint.
 * Falls back gracefully when Layer 2 is unavailable.
 *
 * @param {string} rawText
 * @returns {Promise<{result: Object, fallback: Object}>}
 */
async function runLayer2WithFallback(rawText) {
  const startTime = Date.now();
  const loggedAt = new Date();

  const fallbackData = {
    layer2Available: false,
    fallbackTriggered: true,
    fallbackReason: null,
    timeoutMs: LAYER2_TIMEOUT_MS,
    loggedAt,
  };

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
        confidenceScore:
          typeof data.confidenceScore === "number"
            ? data.confidenceScore
            : null,
        reconstructedHazard: data.reconstructedHazard || null,
        executionTimeMs,
      },
      fallback: {
        ...fallbackData,
        layer2Available: true,
        fallbackTriggered: false,
        fallbackReason: null,
      },
    };
  } catch (error) {
    let fallbackReason = "5xx_error";

    if (
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase().includes("timeout")
    ) {
      fallbackReason = "timeout";
    } else if (
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND"
    ) {
      fallbackReason = "network_error";
    } else if (error.response?.status >= 500) {
      fallbackReason = "5xx_error";
    }

    fallbackData.fallbackReason = fallbackReason;

    return {
      result: {
        invoked: false,
        action: "Unknown",
        object: "Unknown",
        controlDeficiency: "Fallback mode active",
        confidenceScore: 0,
        reconstructedHazard: null,
        executionTimeMs: Date.now() - startTime,
      },
      fallback: fallbackData,
    };
  }
}

module.exports = { runLayer2WithFallback };