// app/api/feedback/route.js
// Feedback & bug reports — stored in MongoDB (or falls back to in-memory)
// Email notifications handled by portfolio dashboard (forwardToExternalDashboard)

import { auth, clerkClient } from "@clerk/nextjs/server";
import { tryConnectDB } from "@/lib/db/mongoose";
import { generateId, getFeedbackModel, memStore } from "@/lib/models/Feedback";

const EXTERNAL_FEEDBACK_URL =
  "https://nuruddin-webician.vercel.app/api/feedback";

// Helper to create an AbortSignal with a timeout that works across runtimes
function createTimeoutSignal(ms) {
  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    try {
      return AbortSignal.timeout(ms);
    } catch {
      // fall through
    }
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener("abort", () => clearTimeout(id), {
    once: true,
  });
  return controller.signal;
}

// ─── Forward to portfolio dashboard + trigger email via portfolio Formspree ──
// Fire-and-forget. Portfolio's /api/feedback handles its own Formspree notify.
async function forwardToExternalDashboard(item) {
  try {
    const secret = process.env.FEEDBACK_API_SECRET; //[cite: 3]
    if (!secret) {
      console.warn(
        "[feedback] FEEDBACK_API_SECRET not set — skipping external forward" //[cite: 3]
      );
      return;
    }

    const res = await fetch(EXTERNAL_FEEDBACK_URL, {
      //[cite: 3]
      method: "POST", //[cite: 3]
      headers: {
        "Content-Type": "application/json", //[cite: 3]
        "x-feedback-secret": secret, //[cite: 3]
      },
      body: JSON.stringify({
        //[cite: 3]
        appId: "Momentum", //[cite: 3]
        type: item.type === "suggestion" ? "feature" : item.type, //[cite: 3]
        message: item.body ? `${item.title}\n\n${item.body}` : item.title, //[cite: 3]
        metadata: {
          originalType: item.type, //[cite: 3]
          feedbackId: item.id, //[cite: 3]
          sessionId: item.sessionId ?? null, //[cite: 3]
          submittedAt: item.createdAt, //[cite: 3]
        },
      }),
      signal: createTimeoutSignal(12000), //[cite: 3]
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<unreadable>"); //[cite: 3]
      console.warn(`[feedback] external forward returned ${res.status}:`, text); //[cite: 3]
    }
  } catch (err) {
    console.warn("[feedback] external forward failed:", err?.message ?? err); //[cite: 3]
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
      body = await request.json(); //
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 }); //[cite: 3]
    }

    const { type, title, body: text, sessionId } = body; //[cite: 3]

    if (!title?.trim() || title.trim().length < 5) {
      //[cite: 3]
      return Response.json(
        { error: "Title must be at least 5 characters." }, //[cite: 3]
        { status: 400 } //[cite: 3]
      );
    }

    const validTypes = ["bug", "suggestion", "praise", "question"]; //[cite: 3]
    const safeType = validTypes.includes(type) ? type : "suggestion"; //[cite: 3]

    const item = {
      id: generateId(), //[cite: 3]
      type: safeType, //[cite: 3]
      title: title.trim().slice(0, 120), //[cite: 3]
      body: (text ?? "").trim().slice(0, 2000), //[cite: 3]
      sessionId: sessionId ?? null, //[cite: 3]
      userId: null, //[cite: 3]
      upvotes: 0, //[cite: 3]
      upvotedBy: [], //[cite: 3]
      status: "open", //[cite: 3]
      adminNote: "", //[cite: 3]
      createdAt: new Date().toISOString(), //[cite: 3]
      resolvedAt: null, //[cite: 3]
    };

    const db = await tryConnectDB(); //[cite: 3]
    let savedItem = item; //[cite: 3]

    if (!db) {
      memStore.unshift(item); //[cite: 3]
    } else {
      const Feedback = getFeedbackModel(); //[cite: 3]
      const doc = await Feedback.create(item); //[cite: 3]
      const { _id, __v, ...clean } = doc.toObject(); //[cite: 3]
      savedItem = clean; //[cite: 3]
    }

    // ✅ FIXED: Using Next.js/Vercel waitUntil mechanism
    // This safely keeps the lambda environment alive until the dispatch finishes,
    // without forcing the user to wait for it.
    if (
      typeof process !== "undefined" &&
      typeof process.waitUntil === "function"
    ) {
      process.waitUntil(forwardToExternalDashboard(savedItem));
    } else {
      // Fallback if local runtime doesn't expose it globally
      forwardToExternalDashboard(savedItem); //[cite: 3]
    }

    return Response.json({ item: savedItem, fallback: !db }, { status: 201 }); //[cite: 3]
  } catch (err) {
    console.error("[feedback POST]", err.message); //[cite: 3]
    return Response.json({ error: "Failed to submit" }, { status: 500 }); //[cite: 3]
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
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

    if (
      (status !== undefined || adminNote !== undefined) &&
      action !== "upvote"
    ) {
      const admin = await isAdminUser();
      if (!admin)
        return Response.json({ error: "Unauthorized" }, { status: 403 });
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
