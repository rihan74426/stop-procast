import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";
import { NetworkMonitor } from "@/components/ui/NetworkMonitor";
import { NotificationInit } from "@/components/ui/NotificationInit";
import { LANGUAGES } from "@/lib/i18n/translations";
import { THEME_SCRIPT } from "@/lib/theme";
import { PuterLoader } from "@/components/providers/PuterLoader";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://momentumio.vercel.app";

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://momentumio.vercel.app"
  ),
  title: {
    default: "Momentum — AI Project Planner | Finish What You Start",
    template: "%s | Momentum",
  },
  description:
    "Free AI-powered project planning tool. Turn any idea into a structured action plan with phases, milestones, and daily accountability. Beat procrastination and ship your projects.",
  applicationName: "Momentum",
  authors: [{ name: "Nuruddin", url: "https://nuruddin-webician.vercel.app" }],
  keywords: [
    "AI project planner",
    "free project planning tool",
    "project management app",
    "AI productivity tool",
    "beat procrastination",
    "project execution tracker",
    "goal planning app",
    "task management AI",
    "project blueprint generator",
    "streak tracker app",
  ],
  creator: "Nuruddin",
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
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />

          {/* Preconnect only — fonts load via @font-face unicode-range in globals.css */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />

          {/* Only Fredoka needed — Bengali/Arabic load via unicode-range @font-face */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&display=optional"
          />

          {/* 4. JSON-LD structured data */}
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
                ],
              }),
            }}
          />
        </head>
        <body>
          <ThemeProvider>
            <I18nProvider>
              {children}
              <ToastContainer />
              <NetworkMonitor />
              <NotificationInit />
              {/* Load puter after hydration — not in <head> */}
              <PuterLoader
                appId={process.env.NEXT_PUBLIC_PUTER_APP_ID ?? ""}
                authToken={process.env.NEXT_PUBLIC_PUTER_AUTH_TOKEN ?? ""}
              />
            </I18nProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
