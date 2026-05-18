import { tryConnectDB } from "@/lib/db/mongoose";
import Project from "@/lib/models/Project";

function iso(d) {
  try {
    return new Date(d).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export async function GET() {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const staticRoutes = ["/", "/new", "/settings", "/feedback"];
  let projectUrls = [];

  try {
    const db = await tryConnectDB();
    if (db) {
      const docs = await Project.find({}, "id updatedAt createdAt")
        .lean()
        .limit(5000);
      projectUrls = (docs || []).map((p) => ({
        loc: `${siteUrl}/project/${p.id}`,
        lastmod: iso(p.updatedAt || p.createdAt),
      }));
    }
  } catch (err) {
    // DB not available — continue with static routes only
    console.warn("[sitemap] could not fetch projects:", err?.message || err);
  }

  const urls = [
    ...staticRoutes.map((r) => ({
      loc: `${siteUrl}${r}`,
      lastmod: iso(new Date()),
    })),
    ...projectUrls,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls
      .map(
        (u) => `<url>
      <loc>${u.loc}</loc>
      <lastmod>${u.lastmod}</lastmod>
    </url>`
      )
      .join("\n")}
  </urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
