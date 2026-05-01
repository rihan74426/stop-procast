import mongoose from "mongoose";

// ─── Inline schema (no separate model file needed) ────────────────────
const FeedbackSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["bug", "suggestion", "praise", "question"],
      default: "suggestion",
    },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, default: "", maxlength: 2000 },
    sessionId: { type: String, default: null },
    userId: { type: String, default: null },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [String], // sessionIds that upvoted
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "wont_fix", "duplicate"],
      default: "open",
    },
    adminNote: { type: String, default: "" },
    createdAt: { type: String },
    resolvedAt: { type: String, default: null },
  },
  { timestamps: false }
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ status: 1 });

export function getFeedbackModel() {
  return mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);
}

// In-memory fallback when DB is unavailable
export const memStore = [];

export function generateId() {
  return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
