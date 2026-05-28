/**
 * GET /api/cron/daily-reminders
 * Runs daily at 6 AM UTC via Vercel cron.
 * Finds projects idle for 3+ days and sends a re-engagement email.
 * Protected by CRON_SECRET env var.
 */

import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";
import { clerkClient } from "@clerk/nextjs/server";

const CRON_SECRET = process.env.CRON_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(request) {
  // Verify this is a legitimate cron call
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await tryConnectDB();
  if (!db) {
    return Response.json(
      { ok: false, error: "DB unavailable" },
      { status: 503 }
    );
  }

  try {
    // Find projects idle for 3–14 days (not completed, belongs to a user)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();

    const idleProjects = await Project.find({
      userId: { $ne: null },
      completionDate: null,
      lastActivityAt: { $lte: threeDaysAgo, $gte: fourteenDaysAgo },
    })
      .select("id projectTitle oneLineGoal userId lastActivityAt")
      .limit(200)
      .lean();

    if (!idleProjects.length) {
      return Response.json({
        ok: true,
        sent: 0,
        message: "No idle projects found",
      });
    }

    // Group by userId to send one email per user (max)
    const byUser = {};
    for (const p of idleProjects) {
      if (!byUser[p.userId]) byUser[p.userId] = [];
      byUser[p.userId].push(p);
    }

    let sent = 0;
    let errors = 0;

    for (const [userId, userProjects] of Object.entries(byUser)) {
      try {
        // Get user email from Clerk
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const email = user?.emailAddresses?.[0]?.emailAddress;
        if (!email) continue;

        const firstName = user.firstName || "there";
        const project = userProjects[0]; // nudge about the most relevant project
        const idleDays = Math.floor(
          (Date.now() - new Date(project.lastActivityAt)) / 86400000
        );

        const result = await sendReminderEmail({
          email,
          firstName,
          project,
          idleDays,
          totalIdle: userProjects.length,
        });

        if (result) sent++;
        else errors++;
      } catch (err) {
        console.error(`[cron/daily-reminders] user ${userId}:`, err.message);
        errors++;
      }
    }

    console.log(
      `[cron/daily-reminders] sent=${sent} errors=${errors} total=${
        Object.keys(byUser).length
      }`
    );
    return Response.json({ ok: true, sent, errors });
  } catch (err) {
    console.error("[cron/daily-reminders]", err.message);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

async function sendReminderEmail({
  email,
  firstName,
  project,
  idleDays,
  totalIdle,
}) {
  if (!RESEND_API_KEY) {
    // Dev mode — just log
    console.log(
      `[cron] Would email ${email}: "${project.projectTitle}" idle ${idleDays}d`
    );
    return true;
  }

  const projectUrl = `${SITE_URL}/project/${project.id}`;
  const subject =
    idleDays >= 7
      ? `⚠️ "${project.projectTitle}" hasn't moved in ${idleDays} days`
      : `👋 Ready to pick up "${project.projectTitle}" again?`;

  const html = buildReminderHtml({
    firstName,
    project,
    idleDays,
    totalIdle,
    projectUrl,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Momentum <reminders@momentum-app.com>",
      to: [email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[cron/daily-reminders] Resend error:", text);
    return false;
  }
  return true;
}

function buildReminderHtml({
  firstName,
  project,
  idleDays,
  totalIdle,
  projectUrl,
}) {
  const urgencyColor = idleDays >= 7 ? "#d85a30" : "#7f77dd";
  const urgencyEmoji = idleDays >= 7 ? "⚠️" : "👋";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Momentum Reminder</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,${urgencyColor} 0%,#534ab7 100%);padding:28px 32px;">
    <p style="margin:0 0 6px;font-size:22px;">${urgencyEmoji}</p>
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#fff;">
      Hey ${firstName}, your project needs you
    </h1>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">
      "${project.projectTitle}" has been idle for ${idleDays} day${
    idleDays !== 1 ? "s" : ""
  }.
    </p>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:15px;color:#3c3c50;line-height:1.6;">
      ${
        project.oneLineGoal
          ? `Your goal: <em>${project.oneLineGoal}</em>`
          : "You had a goal. It's still waiting for you."
      }
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#6b6b7e;line-height:1.6;">
      The hardest part is just getting started again. One task is all it takes to rebuild your streak.
    </p>
    <a href="${projectUrl}"
       style="display:inline-block;padding:12px 28px;background:${urgencyColor};color:#fff;font-size:14px;font-weight:600;border-radius:10px;text-decoration:none;">
      Pick up where you left off →
    </a>
    ${
      totalIdle > 1
        ? `<p style="margin:20px 0 0;font-size:13px;color:#9898a8;">
           You also have ${totalIdle - 1} other idle project${
            totalIdle - 1 !== 1 ? "s" : ""
          }.
         </p>`
        : ""
    }
  </div>
  <div style="padding:16px 32px 24px;border-top:1px solid #eee;">
    <p style="margin:0;font-size:12px;color:#9898a8;">
      You're receiving this because you have an active project on 
      <a href="${SITE_URL}" style="color:#7f77dd;">Momentum</a>.
    </p>
  </div>
</div>
</body></html>`;
}
