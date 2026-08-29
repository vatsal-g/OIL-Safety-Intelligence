const { createClient } = require("redis");

const isSecure = process.env.REDIS_URL && process.env.REDIS_URL.startsWith("rediss://");

const redisClient = createClient({
  url: process.env.REDIS_URL,
  ...(isSecure && {
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  }),
});

redisClient.on("error", (err) => {
  console.error("❌ Upstash Redis Error:", err.message || err);
});

redisClient.on("connect", () => {
  console.log("⚡ Connected to Upstash Redis Cache!");
});

(async () => {
  try {
    if (process.env.REDIS_URL) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error("❌ Connection Failed:", err.message);
  }
})();

module.exports = redisClient;