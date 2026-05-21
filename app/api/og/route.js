/**
 * app/api/og/route.js
 *
 * Dynamic Open Graph image generator using Next.js ImageResponse.
 * Generates a 1200x630 PNG for each project on-the-fly.
 *
 * Usage: /api/og?title=My+Project&desc=Short+desc&scope=standard
 *
 * Install: npm install @vercel/og  (already bundled in Next.js 13+)
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Momentum Project";
  const desc =
    searchParams.get("desc") || "Track your execution with Momentum.";
  const scope = searchParams.get("scope") || "standard";

  const scopeColor =
    {
      lean: "#1d9e75",
      standard: "#7f77dd",
      ambitious: "#ba7517",
    }[scope] || "#7f77dd";

  const scopeLabel =
    {
      lean: "Lean Plan",
      standard: "Standard Plan",
      ambitious: "Ambitious Plan",
    }[scope] || "Project";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "#0c0c0f",
          padding: "60px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "8px",
            height: "630px",
            background: scopeColor,
          }}
        />

        {/* Top row: logo + scope badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: scopeColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              🚀
            </div>
            <span
              style={{
                fontSize: "22px",
                fontWeight: "700",
                color: "#f0f0f5",
                letterSpacing: "-0.5px",
              }}
            >
              Momentum
            </span>
          </div>

          <div
            style={{
              padding: "6px 16px",
              borderRadius: "99px",
              background: scopeColor + "22",
              border: `1px solid ${scopeColor}`,
              color: scopeColor,
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {scopeLabel}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 40 ? "44px" : "56px",
            fontWeight: "800",
            color: "#f0f0f5",
            letterSpacing: "-1.5px",
            lineHeight: "1.1",
            marginBottom: "20px",
            maxWidth: "900px",
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "22px",
            color: "#9898a8",
            lineHeight: "1.4",
            maxWidth: "800px",
            marginBottom: "40px",
          }}
        >
          {desc}
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#1d9e75",
            }}
          />
          <span style={{ fontSize: "16px", color: "#6b6b7e" }}>
            momentumio.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
}
