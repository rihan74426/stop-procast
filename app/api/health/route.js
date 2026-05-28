export async function GET() {
  // Lightweight probe used by curl / monitoring
  const payload = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.VERCEL ? "vercel" : "local",
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // short cache so checks are fresh but not overly chatty
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
