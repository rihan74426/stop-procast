import LandingContent from "@/components/landing/LandingContent";

// derive SITE_URL similar to app/layout.js
const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://momentumio.vercel.app";

export default function RootPage() {
  // Server component - renders the client LandingContent
  return <LandingContent />;
}

export const metadata = {
  title: "Momentum — AI Project Planner | Finish What You Start",
  description:
    "Free AI-powered project planning. Turn ideas into structured action plans with phases, milestones, tasks and a daily next action — no credit card required.",
  keywords: [
    "AI project planner",
    "project planning",
    "productivity",
    "goal planning",
    "task manager",
    "streak tracker",
    "blueprint generator",
  ],
  openGraph: {
    title: "Momentum — Finish What You Start",
    description:
      "Turn any idea into a concrete plan. AI-generated blueprints, milestones and daily next actions to beat procrastination.",
    url: SITE_URL + "/",
    siteName: "Momentum",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-card.png`,
        width: 1200,
        height: 630,
        alt: "Momentum — finish what you start",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Momentum — Finish What You Start",
    description:
      "AI project planning with phases, milestones, and daily accountability.",
    images: [`${SITE_URL}/og-card.png`],
    creator: "@momentumapp",
  },
  alternates: {
    canonical: SITE_URL + "/",
    // minimal languages map — keep in sync with app/layout.js if needed
    languages: {
      en: SITE_URL + "/",
    },
  },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is Momentum free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Momentum is free to use. Create projects, generate AI blueprints, and track execution — no credit card required.",
          },
        },
        {
          "@type": "Question",
          name: "What kinds of projects can I plan with Momentum?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Any goal works: software projects, side businesses, learning goals, fitness plans, creative projects, home renovations, career changes.",
          },
        },
        {
          "@type": "Question",
          name: "How does the AI project planning work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You describe your goal in plain text. Momentum asks 3 clarifying questions, then generates a full blueprint: project phases, milestones with deadlines, concrete tasks, risk factors, and a daily next action.",
          },
        },
      ],
    }),
  },
};
