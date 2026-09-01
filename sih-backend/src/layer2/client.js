const axios = require("axios");

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
    };
  }
}

module.exports = { runLayer2WithFallback };