import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  // No routes are hard-protected — auth is optional everywhere.
  // Add specific routes here if needed in the future, e.g.:
  // "/account(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Feedback page is always public — explicitly skip any protection
  if (req.nextUrl.pathname.startsWith("/feedback")) return;

  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
