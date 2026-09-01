const axios = require("axios");

<<<<<<< HEAD
async function runLayer2WithFallback(rawText) {
  const timeoutMs = parseInt(process.env.LAYER2_TIMEOUT_MS || "2500", 10);
  const layer2Url = process.env.LAYER2_URL || "http://localhost:5001/analyze";

  const fallbackData = {
    layer2Available: false,
    fallbackTriggered: true,
    fallbackReason: null,
    timeoutMs,
    loggedAt: new Date(),
  };

  try {
    const response = await axios.post(
      layer2Url,
      { reportText: rawText },
      { timeout: timeoutMs }
    );

    return {
      result: response.data,
      fallback: {
        ...fallbackData,
        layer2Available: true,
        fallbackTriggered: false,
      },
    };
  } catch (error) {
    fallbackData.fallbackReason = error.code === "ECONNABORTED" ? "Timeout" : error.message;
    
    return {
      result: {
        action: "Unknown",
        object: "Unknown",
        controlDeficiency: "Fallback mode active",
        confidenceScore: 0.0,
      },
      fallback: fallbackData,
=======
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
>>>>>>> origin/main
    };
  }
}

module.exports = { runLayer2WithFallback };