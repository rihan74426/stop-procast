/**
 * app/layout.js — REPLACE your current file with this.
 *
 * Key changes:
 * 1. Uses next/font/google instead of @import in CSS — eliminates render-blocking
 * 2. Passes font CSS variables to <body> so globals.css still works
 * 3. Adds generateMetadata-compatible metadata export
 * 4. Adds <link rel="preconnect"> for puter CDN
 */

import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";
import { NetworkMonitor } from "@/components/ui/NetworkMonitor";
import { NotificationInit } from "@/components/ui/NotificationInit";
import { LANGUAGES } from "@/lib/i18n/translations";
import { Fira_Sans, DM_Sans } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";

// ─── Fonts via next/font (eliminates render-blocking CDN request) ─────
const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
  preload: true,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://momentumio.vercel.app";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Momentum — Finish What You Start",
    template: "%s | Momentum",
  },
  description:
    "Turn any idea, goal, or plan into structured action. AI-powered project planning with built-in accountability and streak tracking.",
  applicationName: "Momentum",
  authors: [{ name: "Momentum" }],
  keywords: [
    "project planning",
    "AI planning",
    "productivity",
    "goal tracking",
    "task management",
    "anti-procrastination",
  ],
  creator: "Momentum",
  publisher: "Momentum",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Momentum",
    title: "Momentum — Finish What You Start",
    description:
      "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
    images: [
      {
        url: `${SITE_URL}/og-card.png`,
        width: 1200,
        height: 630,
        alt: "Momentum — finish what you start",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Momentum — Finish What You Start",
    description:
      "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
    images: [`${SITE_URL}/og-card.png`],
    creator: "@momentumapp",
  },
  verification: {
    // Add these once you set up Search Console and Bing Webmaster:
    // google: "your-google-verification-code",
    // yandex: "your-yandex-code",
    // bing: "your-bing-code",
  },
  alternates: {
    canonical: `${SITE_URL}/`,
    languages: LANGUAGES.reduce((acc, l) => {
      acc[l.code] =
        l.code === "en" ? `${SITE_URL}/` : `${SITE_URL}/?lang=${l.code}`;
      return acc;
    }, {}),
  },
};

export default function RootLayout({ children }) {
  const puterAppId = process.env.NEXT_PUBLIC_PUTER_APP_ID ?? "";
  const puterAuthToken = process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN ?? "";
  const hasPuterCreds = puterAppId.trim() && puterAuthToken.trim();

  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${firaSans.variable} ${dmSans.variable}`}
      >
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
          {/* Preconnect for third-party origins — reduces DNS/TLS latency */}
          <link rel="preconnect" href="https://clerk.momentumio.vercel.app" />
          {hasPuterCreds && (
            <link rel="preconnect" href="https://js.puter.com" />
          )}
          {/* JSON-LD — SoftwareApplication schema for better rich results */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "SoftwareApplication",
                    "@id": `${SITE_URL}#app`,
                    name: "Momentum",
                    url: SITE_URL,
                    applicationCategory: "ProductivityApplication",
                    operatingSystem: "Web",
                    description:
                      "AI-powered project planning with built-in accountability.",
                    offers: {
                      "@type": "Offer",
                      price: "0",
                      priceCurrency: "USD",
                    },
                    logo: `${SITE_URL}/favicon.png`,
                  },
                  {
                    "@type": "Organization",
                    "@id": `${SITE_URL}#org`,
                    name: "Momentum",
                    url: SITE_URL,
                    logo: `${SITE_URL}/favicon.png`,
                  },
                  {
                    "@type": "WebSite",
                    "@id": `${SITE_URL}#website`,
                    url: SITE_URL,
                    name: "Momentum",
                    description:
                      "Turn any idea into a structured execution plan.",
                    publisher: { "@id": `${SITE_URL}#org` },
                    potentialAction: {
                      "@type": "SearchAction",
                      target: `${SITE_URL}/?q={search_term_string}`,
                      "query-input": "required name=search_term_string",
                    },
                  },
                ],
              }),
            }}
          />
          {/* Puter credentials bootstrap — runs before React hydrates */}
          {hasPuterCreds && (
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){try{
  var a=${JSON.stringify(puterAppId)};
  var t=${JSON.stringify(puterAuthToken)};
  if(a&&!localStorage.getItem("puter.app.id"))localStorage.setItem("puter.app.id",a);
  if(t&&!localStorage.getItem("puter.auth.token"))localStorage.setItem("puter.auth.token",t);
}catch(e){}})();`,
              }}
            />
          )}
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
