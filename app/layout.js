import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";
import { NetworkMonitor } from "@/components/ui/NetworkMonitor";
import { NotificationInit } from "@/components/ui/NotificationInit";

export const metadata = {
  title: "Momentum > Finish What You Start",
  description:
    "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
    shortcut: "/favicon.png",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  const puterAppId = process.env.NEXT_PUBLIC_PUTER_APP_ID ?? "";
  const puterAuthToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN ?? "";
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
           * STEP 1 — Write puter credentials into localStorage before puter.js loads.
           * This must run synchronously before any other script on the page.
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
           * defer preserves execution order relative to other deferred scripts.
           * Only loaded when credentials are present.
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
