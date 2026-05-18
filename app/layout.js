import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";
import { NetworkMonitor } from "@/components/ui/NetworkMonitor";
import { NotificationInit } from "@/components/ui/NotificationInit";
import { LANGUAGES } from "@/lib/i18n/translations"; // added for hreflang list

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

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const siteTitle = "Momentum > Finish What You Start";
  const siteDescription =
    "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.";

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

          {/* Basic SEO / Social tags */}
          <meta name="description" content={siteDescription} />
          <meta name="author" content="Momentum" />
          <link rel="canonical" href={siteUrl + "/"} />

          {/* OpenGraph */}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={siteTitle} />
          <meta property="og:description" content={siteDescription} />
          <meta property="og:url" content={siteUrl} />
          <meta property="og:site_name" content="Momentum" />
          <meta property="og:image" content={`${siteUrl}/og-card.png`} />
          <meta
            property="og:image:alt"
            content="Momentum — finish what you start"
          />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={siteTitle} />
          <meta name="twitter:description" content={siteDescription} />
          <meta name="twitter:image" content={`${siteUrl}/og-card.png`} />

          {/* Hreflang alternates (assumes root per-locale pages; safe fallback to query param) */}
          {LANGUAGES.map((l) => (
            <link
              key={l.code}
              rel="alternate"
              hrefLang={l.rtl ? l.code + "-r" : l.code}
              href={`${siteUrl}${l.code === "en" ? "/" : `/?lang=${l.code}`}`}
            />
          ))}
          <link rel="alternate" hrefLang="x-default" href={siteUrl} />

          {/* JSON-LD structured data: WebSite + Organization */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Organization",
                    "@id": `${siteUrl}#org`,
                    name: "Momentum",
                    url: siteUrl,
                    logo: `${siteUrl}/favicon.png`,
                    sameAs: [],
                  },
                  {
                    "@type": "WebSite",
                    "@id": `${siteUrl}#website`,
                    url: siteUrl,
                    name: "Momentum",
                    description: siteDescription,
                    publisher: { "@id": `${siteUrl}#org` },
                    potentialAction: {
                      "@type": "SearchAction",
                      target: `${siteUrl}/?q={search_term_string}`,
                      "query-input": "required name=search_term_string",
                    },
                  },
                ],
              }),
            }}
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
