require("dotenv").config();
const express = require("express");
const cors = require("cors");
const reportRoute = require("./src/routes/reportRoute");
const prisma = require("./src/config/prisma");
const redisClient = require("./src/config/redis");

const app = express();
const PORT = process.env.PORT || 5000;

// ---- CORS ----
// Restrict to the actual frontend
// origin(s), configurable via .env so dev/staging/prod can differ.
const allowedOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);

app.use(express.json());

// ---- Malformed JSON handling ----
// Express 5's default error handler returns a fairly unhelpful
// response if the request body is broken JSON. This middleware
// must come right after express.json() and before the routes, so
// a bad body returns a clean 400 instead of a raw stack trace.
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Malformed JSON in request body." });
  }
  // A rejected CORS origin surfaces as a plain Error thrown from
  // the origin callback above — that's a client-side "not allowed"
  // situation, not a server fault, so it gets 403, not 500.
  if (err.message && err.message.includes("not allowed by CORS")) {
    return res.status(403).json({ error: "Origin not allowed." });
  }
  next(err);
});

// Routes
app.use("/api/reports", reportRoute);

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// ---- Fallback error handler ----
// Catches anything that reaches here unhandled, so the process
// never dies on an unexpected error mid-demo.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const server = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 SIH-26165 Express Server Live on Port ${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 Allowed Origins: ${allowedOrigins.join(", ")}`);
  console.log(`=================================================`);
});

// ---- Graceful shutdown ----
// On Ctrl+C or a process manager's stop signal, close the DB and
// Redis connections cleanly instead of just killing the process.
// Not demo-critical, but avoids leaving dangling connections open
// on Atlas/Upstash during repeated restarts while developing.
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