import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";
import { NetworkMonitor } from "@/components/ui/NetworkMonitor";
import { NotificationInit } from "@/components/ui/NotificationInit";

export const metadata = {
  title: "Momentum — Finish What You Start",
  description:
    "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
};

export default function RootLayout({ children }) {
  // These are NEXT_PUBLIC_ vars — safe to embed in HTML sent to the browser.
  // We write them into localStorage via an inline script that runs
  // BEFORE puter.js loads, so puter picks them up during its own init
  // and never needs to show an auth popup.
  const puterAppId = process.env.NEXT_PUBLIC_PUTER_APP_ID ?? "";
  const puterAuthToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN ?? "";

  // Only emit the credential script when both values are present.
  // If they're missing, puter.js is skipped entirely — we fall back to
  // the OpenRouter API route for all generation.
  const hasPuterCreds = puterAppId.trim() && puterAuthToken.trim();

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://api.fontshare.com" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />

          {/*
           * STEP 1 — Write puter credentials into localStorage.
           * This inline script is synchronous and runs before ANY other
           * script on the page, including puter.js below.
           * Puter reads localStorage["puter.app.id"] and
           * localStorage["puter.auth.token"] exactly once during its own
           * init — so they must be present before puter.js executes.
           */}
          {hasPuterCreds && (
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){try{
  var appId=${JSON.stringify(puterAppId)};
  var token=${JSON.stringify(puterAuthToken)};
  if(appId && !localStorage.getItem("puter.app.id"))
    localStorage.setItem("puter.app.id", appId);
  if(token && !localStorage.getItem("puter.auth.token"))
    localStorage.setItem("puter.auth.token", token);
}catch(e){}})();`,
              }}
            />
          )}

          {/*
           * STEP 2 — Load puter.js AFTER credentials are in localStorage.
           * Using `defer` (not `async`) so execution order relative to
           * other deferred scripts is predictable, but it still doesn't
           * block HTML parsing.
           * Only loaded when credentials are present — no point loading
           * the SDK if we'd fall back to the API route anyway.
           */}
          {hasPuterCreds && <script src="https://js.puter.com/v2/" defer />}
        </head>
        <body>
          <ThemeProvider>
            <I18nProvider>
              {children}
              <ToastContainer />
              <NetworkMonitor />
              <NotificationInit />
            </I18nProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
