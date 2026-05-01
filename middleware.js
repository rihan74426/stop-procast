import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that don't require auth
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/api/generate",
  "/api/projects(.*)",
  "/api/reengage(.*)",
  "/",
  "/new(.*)",
  "/project/(.*)",
  "/settings(.*)",
  "/feedback(.*)",

  // Allow public access to project pages (adjust as needed)
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
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
