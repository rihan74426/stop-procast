import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env.local");
}

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5, // lower for free tier Atlas M0
      minPoolSize: 1,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
      family: 4, // force IPv4 — fixes most SSL TLS errors on Windows
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log("✓ MongoDB connected");
        return m;
      })
      .catch((err) => {
        cached.promise = null; // allow retry on next request
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
