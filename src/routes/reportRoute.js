const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { runLayer1WithTiming } = require("../layer1/timingWrapper");
const { runLayer2WithFallback } = require("../layer2/client");
const redisClient = require("../config/redis"); // Redis client import

const prisma = new PrismaClient();
const REPORTS_CACHE_KEY = "reports:all";

/**
 * POST /api/reports/classify
 */
router.post("/classify", async (req, res) => {
  try {
    const { rawText, source, siteId, activityTag, eventDate } = req.body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return res.status(400).json({ error: "rawText is required and must be a non-empty string." });
    }

    // 1. Run Layer 1 Regex Matcher
    const layer1Result = runLayer1WithTiming(rawText);

    const layer1Data = {
      attempted: true,
      matched: layer1Result.matched,
      matchedKeywords: layer1Result.matchedKeywords,
      matchedRuleId: layer1Result.matchedRuleId,
      matchedIogpRules: layer1Result.matchedIogpRules || [],
      executionTimeMs: layer1Result.executionTimeMs,
    };

    let layer2Data = null;
    let fallbackData = {
      layer2Available: true,
      fallbackTriggered: false,
      fallbackReason: null,
      timeoutMs: parseInt(process.env.LAYER2_TIMEOUT_MS || "2500", 10),
      loggedAt: new Date(),
    };

    let finalResultData = {};

    // ---- CASE 1: Layer 1 Direct Match ----
    if (layer1Result.matched) {
      finalResultData = {
        classification: "SIF_Potential",
        iogpRule: layer1Result.matchedIogpRules[0] || null,
        layerUsed: "layer1",
        evidenceSource: "layer1",
        evidenceTrail: layer1Result.matchedKeywords,
        reviewStatus: "pending",
      };
    } 
    // ---- CASE 2: Layer 1 Inconclusive -> Invoke Layer 2 ML Microservice ----
    else {
      const l2Execution = await runLayer2WithFallback(rawText);
      layer2Data = l2Execution.result;
      fallbackData = l2Execution.fallback;

      // High confidence classification from ML model
      if (layer2Data && layer2Data.confidenceScore !== null && layer2Data.confidenceScore >= 0.70) {
        finalResultData = {
          classification: "SIF_Potential",
          iogpRule: null,
          layerUsed: "layer2",
          evidenceSource: "layer2",
          evidenceTrail: [
            `Action: ${layer2Data.action || "N/A"}`,
            `Object: ${layer2Data.object || "N/A"}`,
            `Deficiency: ${layer2Data.controlDeficiency || "N/A"}`,
          ],
          reviewStatus: "pending",
        };
      } else {
        finalResultData = {
          classification: "Non_SIF_Potential",
          iogpRule: null,
          layerUsed: fallbackData.fallbackTriggered ? "layer1_fallback" : "layer2",
          evidenceSource: fallbackData.fallbackTriggered ? "layer1" : "layer2",
          evidenceTrail: [],
          reviewStatus: "pending",
        };
      }
    }

    // 2. Persist to MongoDB using Prisma
    const savedReport = await prisma.report.create({
      data: {
        rawText,
        source: source || "OIL_live",
        siteId: siteId || null,
        activityTag: activityTag || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        layer1: layer1Data,
        layer2: layer2Data,
        fallback: fallbackData,
        finalResult: finalResultData,
      },
    });

    // Invalidate Redis cache so the GET endpoint returns updated data
    try {
      await redisClient.del(REPORTS_CACHE_KEY);
    } catch (cacheErr) {
      console.error("Redis Cache Invalidation Error:", cacheErr);
    }

    return res.status(200).json(savedReport);
  } catch (error) {
    console.error("Error processing classification request:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// GET /api/reports - Fetch all reports for Frontend Dashboard (Cached via Redis)
router.get("/", async (req, res) => {
  try {
    // 1. Check Redis Cache
    if (redisClient.isOpen) {
      const cachedReports = await redisClient.get(REPORTS_CACHE_KEY);
      if (cachedReports) {
        return res.status(200).json(JSON.parse(cachedReports));
      }
    }

    // 2. Cache Miss -> Query MongoDB via Prisma
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 3. Store in Redis for 5 minutes (300 seconds)
    if (redisClient.isOpen) {
      await redisClient.setEx(REPORTS_CACHE_KEY, 300, JSON.stringify(reports));
    }

    return res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;