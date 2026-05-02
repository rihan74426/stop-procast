import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

// In dev, Next.js hot-reloads can create multiple connections — use global cache
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const OPTS = {
  bufferCommands: false, // fail fast instead of buffering
  maxPoolSize: 5, // free tier Atlas M0 limit
  minPoolSize: 1,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  family: 4, // force IPv4 — fixes SSL TLS errors on Windows/some hosts
  retryWrites: true,
  retryReads: true,
};

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in .env.local");
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, OPTS)
      .then((m) => {
        console.log("✓ MongoDB connected");
        return m;
      })
      .catch((err) => {
        // Reset so next call retries
        cached.promise = null;
        console.error("✗ MongoDB connection failed:", err.message);
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Graceful wrapper — returns null instead of throwing.
 * Use in API routes where MongoDB is optional (guest mode).
 */
export async function tryConnectDB() {
  try {
    return await connectDB();
  } catch {
    return null;
  }
}
