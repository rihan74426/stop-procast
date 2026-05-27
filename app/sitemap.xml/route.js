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

  // Only these pages have server-rendered crawlable content
  const publicRoutes = [
    { path: "/", priority: "1.0", changefreq: "weekly" },
    { path: "/new", priority: "0.8", changefreq: "monthly" },
    { path: "/feedback", priority: "0.5", changefreq: "weekly" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
