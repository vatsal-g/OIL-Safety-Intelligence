require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const reportRoute = require("./src/routes/reportRoute");
const prisma = require("./src/config/prisma");
const redisClient = require("./src/config/redis");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

// Render runs the service behind a proxy.
app.set("trust proxy", 1);

// ---- CORS Configuration ----
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
];

const allowedOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header
      // (curl, Postman, server-to-server requests).
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

// ---- Global Rate Limiter ----
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many requests from this IP, please try again after 15 minutes.",
  },
});

app.use("/api/", globalApiLimiter);

// ---- Error Handling Middleware ----
// Must come after express.json() and before routes.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Malformed JSON in request body.",
    });
  }

  if (err.message && err.message.includes("not allowed by CORS")) {
    return res.status(403).json({
      error: "Origin not allowed.",
    });
  }

  next(err);
});

// ---- Routes ----
app.use("/api/reports", reportRoute);

// ---- Health Check Endpoint ----
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date(),
  });
});

// ---- Fallback Error Handler ----
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    error: "Internal Server Error",
  });
});

// ---- Server Initialization ----
const server = app.listen(PORT, HOST, () => {
  console.log("=================================================");
  console.log(`SIH-26165 Express Server Live on ${HOST}:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`Allowed Origins: ${allowedOrigins.join(", ")}`);
  console.log("=================================================");
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