import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// No routes are hard-protected — auth is optional everywhere.
// We keep this matcher empty intentionally: add routes here in the future
// if you need to enforce auth (e.g. /account, /admin).
const isProtectedRoute = createRouteMatcher([
  // "/account(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // These paths are unconditionally public — never intercepted
  if (
    pathname.startsWith("/feedback") ||
    pathname.startsWith("/api/feedback")
  ) {
    return;
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and well-known paths
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
