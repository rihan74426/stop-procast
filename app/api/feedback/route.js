// app/api/feedback/route.js
// Feedback & bug reports — stored in MongoDB (or falls back to in-memory)
// Public read, write-once per session (no auth required to view/submit)
// Admin actions require Clerk auth + publicMetadata.role === "admin"
// New submissions fire a Formspree email to admins automatically.

import { auth, clerkClient } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import { generateId, getFeedbackModel, memStore } from "@/lib/models/Feedback";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/mpqbqjkd";

// ─── Notify admins via Formspree ──────────────────────────────────────
// Fire-and-forget — never blocks the response or throws to the client.

async function notifyAdmins(item) {
  try {
    const typeLabel =
      {
        bug: "🐛 Bug Report",
        suggestion: "💡 Idea / Suggestion",
        praise: "⭐ Praise",
        question: "❓ Question",
      }[item.type] ?? item.type;

    const params = new URLSearchParams();
    params.set("type", typeLabel);
    params.set("title", item.title);
    params.set("details", item.body || "(no details provided)");
    params.set("submitted_at", item.createdAt);
    params.set(
      "feedback_url",
      `${
        process.env.NEXT_PUBLIC_APP_URL ?? "https://momentum-app.com"
      }/feedback`
    );
    params.set("_subject", `[Momentum Feedback] ${typeLabel}: ${item.title}`);

    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[feedback] Formspree notify failed:", res.status, text);
    }
  } catch (err) {
    // Never propagate — email notification is best-effort
    console.warn("[feedback] Formspree notify error:", err.message);
  }
}

// ─── Helper: verify admin ─────────────────────────────────────────────

async function isAdminUser() {
  try {
    const { userId } = await auth();
    if (!userId) return false;
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user?.publicMetadata?.role === "admin";
  } catch {
    return false;
  }
}

// ─── GET /api/feedback ────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "30"));
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

// ─── POST /api/feedback ───────────────────────────────────────────────
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

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
      userId: null,
      upvotes: 0,
      upvotedBy: [],
      status: "open",
      adminNote: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    const db = await tryConnectDB();
    let savedItem = item;

    if (!db) {
      memStore.unshift(item);
    } else {
      const Feedback = getFeedbackModel();
      const doc = await Feedback.create(item);
      const { _id, __v, ...clean } = doc.toObject();
      savedItem = clean;
    }

    // Notify admins via Formspree — fire-and-forget, never blocks response
    notifyAdmins(savedItem);

    return Response.json({ item: savedItem, fallback: !db }, { status: 201 });
  } catch (err) {
    console.error("[feedback POST]", err.message);
    return Response.json({ error: "Failed to submit" }, { status: 500 });
  }
}

// ─── PATCH /api/feedback — upvote or admin update ────────────────────
export async function PATCH(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, action, sessionId, status, adminNote } = body;

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    // Admin actions require server-side verification
    if (
      (status !== undefined || adminNote !== undefined) &&
      action !== "upvote"
    ) {
      const admin = await isAdminUser();
      if (!admin) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
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
      if (status) item.status = status;
      if (adminNote !== undefined) item.adminNote = adminNote;
      return Response.json({ item });
    }

    const Feedback = getFeedbackModel();

    // Upvote — idempotent per session
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

    // Admin status/note update
    if (status !== undefined || adminNote !== undefined) {
      const validStatuses = [
        "open",
        "in_progress",
        "resolved",
        "wont_fix",
        "duplicate",
      ];
      if (status && !validStatuses.includes(status)) {
        return Response.json({ error: "Invalid status" }, { status: 400 });
      }
      const patch = {
        ...(status !== undefined ? { status } : {}),
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
