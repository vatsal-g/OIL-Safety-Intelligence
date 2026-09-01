const { PrismaClient } = require("@prisma/client");

/**
 * Shared Prisma Client singleton.
 *
 * Why this file exists: instantiating `new PrismaClient()` inside
 * every route file opens a separate connection pool per instance.
 * MongoDB Atlas (and most managed DBs) cap total concurrent
 * connections — under load (e.g. multiple judges hitting the demo
 * at once), this multiplies fast and can exhaust the connection
 * limit for no good reason.
 *
 * Import this one instance everywhere instead of creating new ones:
 *   const prisma = require("../config/prisma");
 */

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

// In development, Node's module cache can reset on hot-reload
// (nodemon), which would otherwise create a new client each time.
// Stashing it on `global` prevents that.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;