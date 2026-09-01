const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const prisma = require("../config/prisma");
const { runLayer1WithTiming } = require("../layer1/timingWrapper");
const { runLayer2WithFallback } = require("../layer2/client");
<<<<<<< HEAD
const redisClient = require("../config/redis");

const REPORTS_CACHE_KEY = "reports:all";

// ---- Route-Specific Rate Limiter (Increased for bulk processing/seeding) ----
const classifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Increased to allow bulk ingestion without 429 errors
=======
const redisClient = require("../config/redis"); // Redis client import

const REPORTS_CACHE_KEY = "reports:all";

// ---- Route-Specific Rate Limiter ----
// Restricts classification requests to 15 requests per minute per IP
const classifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // Limit each IP to 15 classification requests per minute
>>>>>>> origin/main
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Classification rate limit exceeded. Please wait a minute before submitting more reports."
  }
});

/**
<<<<<<< HEAD
 * Helper to safely clear Redis cache
 */
async function clearReportsCache() {
  if (redisClient.isOpen) {
    try {
      await redisClient.del(REPORTS_CACHE_KEY);
    } catch (cacheErr) {
      console.warn("Redis Cache Invalidation Warning:", cacheErr.message);
    }
  }
}

/**
=======
>>>>>>> origin/main
 * POST /api/reports/classify
 */
router.post("/classify", classifyLimiter, async (req, res) => {
  try {
    const { rawText, source, siteId, activityTag, eventDate } = req.body;

    if (!rawText || typeof rawText !== "string" || rawText.trim().length === 0) {
      return res.status(400).json({ error: "rawText is required and must be a non-empty string." });
    }

<<<<<<< HEAD
    // 1. Run Layer 1 Matcher
=======
    // 1. Run Layer 1 Regex Matcher
>>>>>>> origin/main
    const layer1Result = runLayer1WithTiming(rawText);

    const layer1Data = {
      attempted: true,
      matched: layer1Result.matched,
<<<<<<< HEAD
      matchedKeywords: layer1Result.matchedKeywords || [],
      matchedRuleId: layer1Result.matchedRuleId || null,
      matchedIogpRules: layer1Result.matchedIogpRules || [],
      executionTimeMs: layer1Result.executionTimeMs || 0,
=======
      matchedKeywords: layer1Result.matchedKeywords,
      matchedRuleId: layer1Result.matchedRuleId,
      matchedIogpRules: layer1Result.matchedIogpRules || [],
      executionTimeMs: layer1Result.executionTimeMs,
>>>>>>> origin/main
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
<<<<<<< HEAD
        iogpRule: layer1Result.matchedIogpRules[0] || "General Safety",
        layerUsed: "layer1",
        evidenceSource: "layer1",
        evidenceTrail: layer1Result.matchedKeywords || [],
=======
        iogpRule: layer1Result.matchedIogpRules[0] || null,
        layerUsed: "layer1",
        evidenceSource: "layer1",
        evidenceTrail: layer1Result.matchedKeywords,
>>>>>>> origin/main
        reviewStatus: "pending",
      };
    } 
    // ---- CASE 2: Layer 1 Inconclusive -> Invoke Layer 2 ML Microservice ----
    else {
      const l2Execution = await runLayer2WithFallback(rawText);
      layer2Data = l2Execution.result;
<<<<<<< HEAD
      fallbackData = l2Execution.fallback || fallbackData;

      if (layer2Data) {
        const actionStr = layer2Data.action && layer2Data.action !== "None" ? layer2Data.action : null;
        const objectStr = layer2Data.object && layer2Data.object !== "None" ? layer2Data.object : null;
        const deficiencyStr = layer2Data.controlDeficiency && layer2Data.controlDeficiency !== "None" ? layer2Data.controlDeficiency : null;
        const confidence = layer2Data.confidenceScore !== undefined && layer2Data.confidenceScore !== null 
          ? layer2Data.confidenceScore 
          : 0.5;

        const inferredRule = actionStr 
          ? actionStr.replace(/_/g, " ") 
          : (objectStr ? objectStr.replace(/_/g, " ") : "Hazard Identification");

        finalResultData = {
          classification: confidence >= 0.50 ? "SIF_Potential" : "Non_SIF_Potential",
          iogpRule: inferredRule,
          layerUsed: fallbackData.fallbackTriggered ? "layer1_fallback" : "layer2",
          evidenceSource: fallbackData.fallbackTriggered ? "layer1" : "layer2",
          evidenceTrail: [
            `Action: ${actionStr || "Unspecified"}`,
            `Object: ${objectStr || "Unspecified"}`,
            `Deficiency: ${deficiencyStr || "General hazard"}`,
            `Confidence Score: ${confidence}`,
=======
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
>>>>>>> origin/main
          ],
          reviewStatus: "pending",
        };
      } else {
<<<<<<< HEAD
        finalResultData = {
          classification: "Non_SIF_Potential",
          iogpRule: "General Safety",
          layerUsed: "layer1_fallback",
          evidenceSource: "layer1",
          evidenceTrail: ["Layer 2 service unavailable; evaluated by fallback handler."],
=======
        const lowConfidenceTrail =
          layer2Data && !fallbackData.fallbackTriggered
            ? [
                `Action: ${layer2Data.action || "N/A"}`,
                `Object: ${layer2Data.object || "N/A"}`,
                `Deficiency: ${layer2Data.controlDeficiency || "N/A"}`,
                `Confidence: ${
                  layer2Data.confidenceScore !== null ? layer2Data.confidenceScore : "N/A"
                } (below 0.70 threshold)`,
              ]
            : [];

        finalResultData = {
          classification: "Non_SIF_Potential",
          iogpRule: null,
          layerUsed: fallbackData.fallbackTriggered ? "layer1_fallback" : "layer2",
          evidenceSource: fallbackData.fallbackTriggered ? "layer1" : "layer2",
          evidenceTrail: lowConfidenceTrail,
>>>>>>> origin/main
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
<<<<<<< HEAD
        layer2: layer2Data ? {
          invoked: layer2Data.invoked ?? true,
          action: layer2Data.action || null,
          object: layer2Data.object || null,
          controlDeficiency: layer2Data.controlDeficiency || null,
          confidenceScore: layer2Data.confidenceScore ?? null,
          reconstructedHazard: layer2Data.reconstructedHazard || null,
          executionTimeMs: layer2Data.executionTimeMs ?? null,
        } : undefined,
=======
        layer2: layer2Data,
>>>>>>> origin/main
        fallback: fallbackData,
        finalResult: finalResultData,
      },
    });

<<<<<<< HEAD
    // Invalidate Redis cache so dashboard updates immediately
    await clearReportsCache();
=======
    // Invalidate Redis cache so the GET endpoint returns updated data
    if (redisClient.isOpen) {
      try {
        await redisClient.del(REPORTS_CACHE_KEY);
      } catch (cacheErr) {
        console.error("Redis Cache Invalidation Error:", cacheErr);
      }
    }
>>>>>>> origin/main

    return res.status(200).json(savedReport);
  } catch (error) {
    console.error("Error processing classification request:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

<<<<<<< HEAD
// GET /api/reports - Fetch all reports (No hardcoded limit, returns total complete set)
router.get("/", async (req, res) => {
  try {
    const limitParam = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const cacheKey = limitParam ? `${REPORTS_CACHE_KEY}:${limitParam}` : REPORTS_CACHE_KEY;

    // 1. Check Redis Cache
    if (redisClient.isOpen) {
      try {
        const cachedReports = await redisClient.get(cacheKey);
        if (cachedReports) {
          return res.status(200).json(JSON.parse(cachedReports));
        }
      } catch (redisErr) {
        console.warn("Redis read warning, falling back to MongoDB:", redisErr.message);
      }
    }

    // 2. Query MongoDB via Prisma without hardcoded limits
    try {
      const queryOptions = {
        orderBy: { createdAt: "desc" },
      };

      if (limitParam && !isNaN(limitParam)) {
        queryOptions.take = limitParam;
      }

      const reports = await prisma.report.findMany(queryOptions);

      // Store in Redis cache for 60 seconds
      if (redisClient.isOpen) {
        try {
          await redisClient.setEx(cacheKey, 60, JSON.stringify(reports));
        } catch (setErr) {
          console.warn("Failed to set Redis cache:", setErr.message);
        }
      }

      return res.status(200).json(reports);
    } catch (dbErr) {
      console.error("MongoDB/Prisma connection error:", dbErr.message);
      return res.status(200).json([]);
    }
=======
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
>>>>>>> origin/main
  } catch (error) {
    console.error("Error fetching reports:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

<<<<<<< HEAD
/**
 * GET /api/reports/:id - Fetch single report detail by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    return res.status(200).json(report);
  } catch (error) {
    if (error.code === "P2023" || error.name === "PrismaClientValidationError") {
      return res.status(404).json({ error: "Report not found" });
    }
    console.error("Error fetching report detail:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

/**
 * PATCH /api/reports/:id/status - Update review status
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingReport = await prisma.report.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return res.status(404).json({ error: "Report not found" });
    }

    const updatedFinalResult = {
      ...(existingReport.finalResult || {}),
      reviewStatus: status,
    };

    const updatedReport = await prisma.report.update({
      where: { id },
      data: { finalResult: updatedFinalResult },
    });

    await clearReportsCache();

    return res.status(200).json(updatedReport);
  } catch (error) {
    console.error("Error updating report status:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

=======
>>>>>>> origin/main
module.exports = router;