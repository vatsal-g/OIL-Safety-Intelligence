const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const prisma = require("../config/prisma");
const { runLayer1WithTiming } = require("../layer1/timingWrapper");
const { runLayer2WithFallback } = require("../layer2/client");
const redisClient = require("../config/redis");

const REPORTS_CACHE_KEY = "reports:all";

// ---- Route-Specific Rate Limiter ----
const classifyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.CLASSIFY_RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Classification rate limit exceeded. Please wait a minute before submitting more reports.",
  },
});

/**
 * Safely clear Redis cache.
 */
async function clearReportsCache() {
  if (!redisClient.isOpen) {
    return;
  }

  try {
    await redisClient.del(REPORTS_CACHE_KEY);
  } catch (cacheErr) {
    console.warn("Redis Cache Invalidation Warning:", cacheErr.message);
  }
}

/**
 * POST /api/reports/classify
 */
router.post("/classify", classifyLimiter, async (req, res) => {
  try {
    const { rawText, source, siteId, activityTag, eventDate } = req.body;

    if (
      !rawText ||
      typeof rawText !== "string" ||
      rawText.trim().length === 0
    ) {
      return res.status(400).json({
        error: "rawText is required and must be a non-empty string.",
      });
    }

    // 1. Run Layer 1 Matcher
    const layer1Result = runLayer1WithTiming(rawText);

    const layer1Data = {
      attempted: true,
      matched: layer1Result.matched,
      matchedKeywords: layer1Result.matchedKeywords || [],
      matchedRuleId: layer1Result.matchedRuleId || null,
      matchedIogpRules: layer1Result.matchedIogpRules || [],
      executionTimeMs: layer1Result.executionTimeMs || 0,
    };

    let layer2Data = null;

    let fallbackData = {
      layer2Available: true,
      fallbackTriggered: false,
      fallbackReason: null,
      timeoutMs: parseInt(
        process.env.LAYER2_TIMEOUT_MS || "2500",
        10
      ),
      loggedAt: new Date(),
    };

    let finalResultData = {};

    // ---- CASE 1: Layer 1 Direct Match ----
    if (layer1Result.matched) {
      finalResultData = {
        classification: "SIF_Potential",
        iogpRule:
          layer1Result.matchedIogpRules[0] || "General Safety",
        layerUsed: "layer1",
        evidenceSource: "layer1",
        evidenceTrail: layer1Result.matchedKeywords || [],
        reviewStatus: "pending",
      };
    }

    // ---- CASE 2: Layer 1 Inconclusive -> Layer 2 ----
    else {
      const l2Execution = await runLayer2WithFallback(rawText);

      layer2Data = l2Execution.result;
      fallbackData = l2Execution.fallback || fallbackData;

      if (layer2Data) {
        const actionStr =
          layer2Data.action && layer2Data.action !== "None"
            ? layer2Data.action
            : null;

        const objectStr =
          layer2Data.object && layer2Data.object !== "None"
            ? layer2Data.object
            : null;

        const deficiencyStr =
          layer2Data.controlDeficiency &&
          layer2Data.controlDeficiency !== "None"
            ? layer2Data.controlDeficiency
            : null;

        const confidence =
          layer2Data.confidenceScore !== undefined &&
          layer2Data.confidenceScore !== null
            ? layer2Data.confidenceScore
            : 0.5;

        const inferredRule = actionStr
          ? actionStr.replace(/_/g, " ")
          : objectStr
            ? objectStr.replace(/_/g, " ")
            : "Hazard Identification";

        const evidenceTrail = [
          `Action: ${actionStr || "Unspecified"}`,
          `Object: ${objectStr || "Unspecified"}`,
          `Deficiency: ${deficiencyStr || "General hazard"}`,
          `Confidence Score: ${confidence}`,
        ];

        finalResultData = {
          classification:
            confidence >= 0.5
              ? "SIF_Potential"
              : "Non_SIF_Potential",
          iogpRule: inferredRule,
          layerUsed: fallbackData.fallbackTriggered
            ? "layer1_fallback"
            : "layer2",
          evidenceSource: fallbackData.fallbackTriggered
            ? "layer1"
            : "layer2",
          evidenceTrail,
          reviewStatus: "pending",
        };
      } else {
        finalResultData = {
          classification: "Non_SIF_Potential",
          iogpRule: "General Safety",
          layerUsed: "layer1_fallback",
          evidenceSource: "layer1",
          evidenceTrail: [
            "Layer 2 service unavailable; evaluated by fallback handler.",
          ],
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

        layer2: layer2Data
          ? {
              invoked: layer2Data.invoked ?? true,
              action: layer2Data.action || null,
              object: layer2Data.object || null,
              controlDeficiency:
                layer2Data.controlDeficiency || null,
              confidenceScore:
                layer2Data.confidenceScore ?? null,
              reconstructedHazard:
                layer2Data.reconstructedHazard || null,
              executionTimeMs:
                layer2Data.executionTimeMs ?? null,
            }
          : undefined,

        fallback: fallbackData,
        finalResult: finalResultData,
      },
    });

    // Invalidate Redis cache so dashboard gets fresh data.
    await clearReportsCache();

    return res.status(200).json(savedReport);
  } catch (error) {
    console.error(
      "Error processing classification request:",
      error
    );

    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * GET /api/reports
 * Fetch all reports, optionally limited by ?limit=N.
 */
router.get("/", async (req, res) => {
  try {
    const limitParam = req.query.limit
      ? parseInt(req.query.limit, 10)
      : null;

    const cacheKey =
      limitParam && !Number.isNaN(limitParam)
        ? `${REPORTS_CACHE_KEY}:${limitParam}`
        : REPORTS_CACHE_KEY;

    // 1. Check Redis cache
    if (redisClient.isOpen) {
      try {
        const cachedReports = await redisClient.get(cacheKey);

        if (cachedReports) {
          return res.status(200).json(JSON.parse(cachedReports));
        }
      } catch (redisErr) {
        console.warn(
          "Redis read warning, falling back to MongoDB:",
          redisErr.message
        );
      }
    }

    // 2. Query MongoDB
    try {
      const queryOptions = {
        orderBy: {
          createdAt: "desc",
        },
      };

      if (limitParam && !Number.isNaN(limitParam) && limitParam > 0) {
        queryOptions.take = limitParam;
      }

      const reports = await prisma.report.findMany(queryOptions);

      // 3. Cache for 60 seconds
      if (redisClient.isOpen) {
        try {
          await redisClient.setEx(
            cacheKey,
            60,
            JSON.stringify(reports)
          );
        } catch (setErr) {
          console.warn(
            "Failed to set Redis cache:",
            setErr.message
          );
        }
      }

      return res.status(200).json(reports);
    } catch (dbErr) {
      console.error(
        "MongoDB/Prisma connection error:",
        dbErr.message
      );

      // Keep dashboard alive even if DB temporarily fails.
      return res.status(200).json([]);
    }
  } catch (error) {
    console.error("Error fetching reports:", error);

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

/**
 * GET /api/reports/:id
 * Fetch a single report.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({
        error: "Report not found",
      });
    }

    return res.status(200).json(report);
  } catch (error) {
    if (
      error.code === "P2023" ||
      error.name === "PrismaClientValidationError"
    ) {
      return res.status(404).json({
        error: "Report not found",
      });
    }

    console.error("Error fetching report detail:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

/**
 * PATCH /api/reports/:id/status
 * Update review status.
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existingReport = await prisma.report.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return res.status(404).json({
        error: "Report not found",
      });
    }

    const updatedFinalResult = {
      ...(existingReport.finalResult || {}),
      reviewStatus: status,
    };

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        finalResult: updatedFinalResult,
      },
    });

    await clearReportsCache();

    return res.status(200).json(updatedReport);
  } catch (error) {
    console.error("Error updating report status:", error);

    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

module.exports = router;