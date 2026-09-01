const rateLimit = require("express-rate-limit");

// Standard API Rate Limiter: max 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    error: "Too many requests from this IP, please try again after 15 minutes."
  }
});

// Strict Limiter for Report Submission Route: max 10 reports per minute
const reportLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 report submissions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: "Report submission rate limit exceeded. Please wait a minute before sending more logs."
  }
});

module.exports = { apiLimiter, reportLimiter };