const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const redisClient = require("../config/redis");
const { checkDatabase, checkRedis, checkLayer2 } = require("../services/healthChecks");

/**
 * GET /api/system/status
 * Aggregates live health checks for every backend-adjacent component
 * into one response the frontend can poll. Layer 1's health is computed
 * once at startup and cached on app.locals (see server.js) since it's an
 * in-process self-test, not something worth re-running every 30s.
 */
router.get("/status", async (req, res) => {
  const [db, redis, layer2] = await Promise.all([
    checkDatabase(prisma),
    checkRedis(redisClient),
    checkLayer2(),
  ]);

  const layer1 = req.app.locals.layer1Health || { state: "down", rulesLoaded: 0 };

  res.json({
    components: [
      { name: "Processing Engine", state: db.state, processed: db.total },
      { name: "SIF Classifier", state: layer2.state, processed: db.byLayer.layer2 ?? 0 },
      { name: "Rule Mapper", state: layer1.state, processed: db.total },
      { name: "Pattern Engine", state: "not_implemented", processed: 0 },
    ],
    infrastructure: {
      database: db.state,
      redis: redis.state,
    },
  });
});

module.exports = router;
