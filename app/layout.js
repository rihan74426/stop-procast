import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { ToastContainer } from "@/components/ui/Toast";
import { NetworkMonitor } from "@/components/ui/NetworkMonitor";
import { NotificationInit } from "@/components/ui/NotificationInit";
import { LANGUAGES } from "@/lib/i18n/translations";
import { Anek_Bangla, Tajawal } from "next/font/google";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

// ─── Locale-specific fonts ────────────────────────────────────────────
// preload: false → Next.js will NOT inject a <link rel="preload"> for
// these fonts on every page. The font files are self-hosted by Next.js
// at build time (no runtime dependency on Google CDN), but the browser
// only fetches them when it actually encounters an element that uses the
// CSS variable — i.e. when .lang-bn / .lang-ar is present on <html>.
// Users on Latin/other locales pay zero network cost.

const anekBangla = Anek_Bangla({
  subsets: ["bengali"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-bengali",
  display: "swap",
  preload: false,
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});

export const metadata = {
  title: "Momentum > Finish What You Start",
  description:
    "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
  applicationName: "Momentum",
  authors: [{ name: "Momentum" }],
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
  openGraph: {
    type: "website",
    title: "Momentum > Finish What You Start",
    description:
      "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
    url: SITE_URL,
    siteName: "Momentum",
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
    title: "Momentum > Finish What You Start",
    description:
      "Turn any idea, goal, or plan into structured action. AI-powered planning with built-in accountability.",
    images: [`${SITE_URL}/og-card.png`],
  },
  alternates: {
    canonical: SITE_URL + "/",
    languages: LANGUAGES.reduce((acc, l) => {
      acc[l.code] =
        l.code === "en" ? SITE_URL + "/" : SITE_URL + `/?lang=${l.code}`;
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
      {/*
        Both font CSS variable class names are attached to <html> so the
        variables (--font-bengali, --font-arabic) exist in scope everywhere.
        globals.css only activates them under .lang-bn / .lang-ar, which
        I18nProvider toggles on the html element at runtime.
      */}
      <html
        lang="en"
        suppressHydrationWarning
        className={`${anekBangla.variable} ${tajawal.variable}`}
      >
        <head>
          {/* next/font self-hosts the font files at build time, so no  */}
          {/* runtime connection to fonts.googleapis.com is needed.      */}
          <link rel="preconnect" href="https://api.fontshare.com" />

          <meta name="description" content={metadata.description} />
          <meta name="author" content="Momentum" />
          <link rel="canonical" href={metadata.alternates.canonical} />

          {/* OpenGraph */}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={metadata.openGraph.title} />
          <meta
            property="og:description"
            content={metadata.openGraph.description}
          />
          <meta property="og:url" content={metadata.openGraph.url} />
          <meta property="og:site_name" content="Momentum" />
          <meta
            property="og:image"
            content={metadata.openGraph.images[0].url}
          />
          <meta
            property="og:image:alt"
            content="Momentum — finish what you start"
          />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={metadata.twitter.title} />
          <meta
            name="twitter:description"
            content={metadata.twitter.description}
          />
          <meta name="twitter:image" content={metadata.twitter.images[0]} />

          {/* Hreflang */}
          {LANGUAGES.map((l) => (
            <link
              key={l.code}
              rel="alternate"
              hrefLang={l.code}
              href={`${SITE_URL}${l.code === "en" ? "/" : `/?lang=${l.code}`}`}
            />
          ))}
          <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

          {/* JSON-LD */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "Organization",
                    "@id": `${SITE_URL}#org`,
                    name: "Momentum",
                    url: SITE_URL,
                    logo: `${SITE_URL}/favicon.png`,
                    sameAs: [],
                  },
                  {
                    "@type": "WebSite",
                    "@id": `${SITE_URL}#website`,
                    url: SITE_URL,
                    name: "Momentum",
                    description: metadata.description,
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
