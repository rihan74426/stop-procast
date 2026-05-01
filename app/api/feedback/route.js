// app/api/feedback/route.js
// Feedback & bug reports — stored in MongoDB (or falls back to in-memory)
// Public read, write-once per session (no auth required)

import { tryConnectDB } from "@/lib/db/mongoose";
import { generateId, getFeedbackModel, memStore } from "@/lib/models/Feedback";
import { getSessionId } from "@/lib/sessionId";

// ─── GET /api/feedback — list all, newest first ───────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 50);
    const skip = (page - 1) * limit;

    const db = await tryConnectDB();
    if (!db) {
      const filtered = status
        ? memStore.filter((f) => f.status === status)
        : memStore;
      return Response.json({
        items: filtered.slice(skip, skip + limit),
        total: filtered.length,
        fallback: true,
      });
    }

    const Feedback = getFeedbackModel();
    const query = status ? { status } : {};
    const [items, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(query),
    ]);

    return Response.json({ items, total });
  } catch (err) {
    console.error("[feedback GET]", err.message);
    return Response.json({ items: [], total: 0 });
  }
}

// ─── POST /api/feedback — submit new report ───────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, title, body: text, sessionId } = body;

    if (!title?.trim() || title.trim().length < 5) {
      return Response.json(
        { error: "Title must be at least 5 characters." },
        { status: 400 }
      );
    }

    const validTypes = ["bug", "suggestion", "praise", "question"];
    const safeType = validTypes.includes(type) ? type : "suggestion";

    const item = {
      id: generateId(),
      type: safeType,
      title: title.trim().slice(0, 120),
      body: (text ?? "").trim().slice(0, 2000),
      sessionId: sessionId ?? null,
      userId: null, // extend later with Clerk auth
      upvotes: 0,
      upvotedBy: [],
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    const db = await tryConnectDB();
    if (!db) {
      memStore.unshift(item);
      return Response.json({ item, fallback: true }, { status: 201 });
    }

    const Feedback = getFeedbackModel();
    const doc = await Feedback.create(item);
    const { _id, __v, ...clean } = doc.toObject();
    return Response.json({ item: clean }, { status: 201 });
  } catch (err) {
    console.error("[feedback POST]", err.message);
    return Response.json({ error: "Failed to submit" }, { status: 500 });
  }
}

// ─── PATCH /api/feedback — upvote or admin status update ─────────────
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, action, sessionId, status, adminNote } = body;

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const db = await tryConnectDB();
    if (!db) {
      const item = memStore.find((f) => f.id === id);
      if (!item) return Response.json({ error: "Not found" }, { status: 404 });
      if (
        action === "upvote" &&
        sessionId &&
        !item.upvotedBy.includes(sessionId)
      ) {
        item.upvotes++;
        item.upvotedBy.push(sessionId);
      }
      return Response.json({ item });
    }

    const Feedback = getFeedbackModel();

    if (action === "upvote" && sessionId) {
      const doc = await Feedback.findOneAndUpdate(
        { id, upvotedBy: { $ne: sessionId } },
        { $inc: { upvotes: 1 }, $push: { upvotedBy: sessionId } },
        { new: true }
      ).lean();
      if (!doc) return Response.json({ alreadyVoted: true });
      const { _id, __v, ...clean } = doc;
      return Response.json({ item: clean });
    }

    // Admin status update (simple — no auth check, add Clerk guard in prod)
    if (status) {
      const validStatuses = [
        "open",
        "in_progress",
        "resolved",
        "wont_fix",
        "duplicate",
      ];
      if (!validStatuses.includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      const patch = {
        status,
        ...(adminNote !== undefined ? { adminNote } : {}),
        ...(status === "resolved"
          ? { resolvedAt: new Date().toISOString() }
          : {}),
      };
      const doc = await Feedback.findOneAndUpdate(
        { id },
        { $set: patch },
        { new: true }
      ).lean();
      if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
      const { _id, __v, ...clean } = doc;
      return Response.json({ item: clean });
    }

    return Response.json({ error: "No valid action" }, { status: 400 });
  } catch (err) {
    console.error("[feedback PATCH]", err.message);
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }
}
