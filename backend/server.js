require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const reportRoute = require("./src/routes/reportRoute");
const systemStatusRoute = require("./src/routes/systemStatusRoute");
const prisma = require("./src/config/prisma");
const redisClient = require("./src/config/redis");
const { checkLayer1 } = require("./src/services/healthChecks");

const app = express();
const PORT = process.env.PORT || 5000;

// ---- CORS Configuration ----
const defaultOrigins = ["http://localhost:5173", "http://localhost:3000"];
const allowedOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(",").map((origin) => origin.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ---- Global Rate Limiter (Increased for development & data seeding) ----
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased from 100 to 10000 to prevent local rate limit blocks
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." }
});

app.use("/api/", globalApiLimiter);

// ---- Middleware: Error Handling & CORS Guards ----
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in request body." });
  }
  if (err.message && err.message.includes("not allowed by CORS")) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  next(err);
});

// ---- Layer 1 self-test, run once at startup and cached ----
// Layer 1 is in-process (no network hop), so there's no point re-running
// this check on every /api/system/status poll — compute it once here.
app.locals.layer1Health = checkLayer1();

// ---- Routes ----
app.use("/api/reports", reportRoute);
app.use("/api/system", systemStatusRoute);

// ---- Health Check Endpoint ----
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// ---- Fallback Error Handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// ---- Server Initialization ----
const server = app.listen(PORT, () => {
console.log(` Express Server Live on Port ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`Allowed Origins: ${allowedOrigins.join(", ")}`);

});

// ---- Graceful Shutdown ----
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Prisma disconnected.");
    } catch (err) {
      console.error("Error disconnecting Prisma:", err);
    }
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
        console.log("Redis disconnected.");
      }
    } catch (err) {
      console.error("Error disconnecting Redis:", err);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));