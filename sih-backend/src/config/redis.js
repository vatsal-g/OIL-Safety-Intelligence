const { createClient } = require("redis");

const isSecure = process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://");

const redisClient = createClient({
  url: process.env.REDIS_URL,
<<<<<<< HEAD
  socket: {
    keepAlive: 10000, // Send TCP keep-alive packets every 10 seconds to avoid ECONNRESET
    reconnectStrategy: (retries) => {
      // Exponential backoff up to 3 seconds max delay
      return Math.min(retries * 100, 3000);
    },
    ...(isSecure && {
      tls: true,
      rejectUnauthorized: false,
    }),
  },
});

redisClient.on("error", (err) => {
  // Gracefully log ECONNRESET connection drops without breaking execution
  if (err.code === "ECONNRESET" || err.message?.includes("ECONNRESET")) {
    console.warn("⚠️ Upstash Redis connection reset by peer. Auto-reconnecting...");
  } else {
    console.error("❌ Upstash Redis Error:", err.message || err);
  }
=======
  ...(isSecure && {
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  }),
});

redisClient.on("error", (err) => {
  console.error("❌ Upstash Redis Error:", err.message || err);
>>>>>>> origin/main
});

redisClient.on("connect", () => {
  console.log("⚡ Connected to Upstash Redis Cache!");
});

<<<<<<< HEAD
redisClient.on("reconnecting", () => {
  console.log("🔄 Reconnecting to Upstash Redis...");
});

=======
>>>>>>> origin/main
(async () => {
  try {
    if (process.env.REDIS_URL) {
      await redisClient.connect();
    }
  } catch (err) {
<<<<<<< HEAD
    console.error("❌ Upstash Redis Initial Connection Failed:", err.message);
=======
    console.error("❌ Connection Failed:", err.message);
>>>>>>> origin/main
  }
})();

module.exports = redisClient;