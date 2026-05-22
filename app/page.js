"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useProjectStore } from "@/lib/store/projectStore";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { DataProvider } from "@/components/providers/DataProvider";
import { SavePromptModal } from "@/components/ui/SavePromptModal";
import { ImportProjectModal } from "@/components/project/ImportProjectModal";
import { useI18n } from "@/lib/i18n";
import {
  FaStar,
  FaRocket,
  FaLightbulb,
  FaClock,
  FaFire,
  FaBullseye,
  FaChartLine,
  FaSmile,
  FaRobot,
  FaChartBar,
} from "react-icons/fa";

// ─── Greeting system ──────────────────────────────────────────────────

function getTimeGreeting(t) {
  const h = new Date().getHours();
  if (h < 5) return t("greeting_midnight");
  if (h < 12) return t("greeting_morning");
  if (h < 17) return t("greeting_afternoon");
  if (h < 21) return t("greeting_evening");
  return t("greeting_night");
}

const STRANGER_GREETING_KEYS = [
  { key: "stranger_greeting_0", icon: FaStar },
  { key: "stranger_greeting_1", icon: FaRocket },
  { key: "stranger_greeting_2", icon: FaLightbulb },
  { key: "stranger_greeting_3", icon: FaClock },
  { key: "stranger_greeting_4", icon: FaFire },
  { key: "stranger_greeting_5", icon: FaBullseye },
  { key: "stranger_greeting_6", icon: FaChartLine },
];

const RETURNING_MOTIVATION_KEYS = [
  "returning_motivation_0",
  "returning_motivation_1",
  "returning_motivation_2",
  "returning_motivation_3",
  "returning_motivation_4",
  "returning_motivation_5",
  "returning_motivation_6",
];

// ─── Dashboard greeting ───────────────────────────────────────────────

function DashboardGreeting({ user, projectCount }) {
  const { t } = useI18n();
  const timeGreeting = getTimeGreeting(t);
  const isSignedIn = !!user;

  const dayIndex = Math.floor(Date.now() / 86400000);

  if (!isSignedIn) {
    const greetingDef =
      STRANGER_GREETING_KEYS[dayIndex % STRANGER_GREETING_KEYS.length];
    const Icon = greetingDef.icon;
    return (
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">
            <Icon />
          </span>
          <h1 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text-primary)]">
            {t(greetingDef.key)}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          {t("stranger_greeting_subtitle")}
        </p>
      </div>
    );
  }

  const firstName =
    user.firstName || user.username || t("greeting_fallback_name");
  const motivationKey =
    RETURNING_MOTIVATION_KEYS[dayIndex % RETURNING_MOTIVATION_KEYS.length];

  return (
    <div className="mb-2">
      <h1 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text-primary)]">
        {timeGreeting}, {firstName} <FaSmile className="inline" />
      </h1>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
        {projectCount > 0 ? t(motivationKey) : t("greeting_no_projects")}
      </p>
    </div>
  );
}

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Momentum free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can create and execute one project without signing up. Sign up free to manage up to 4 projects with full sync.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI planning work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You describe your goal in plain language. Momentum AI breaks it into phases, milestones, and concrete tasks sized for under 2 hours each.",
      },
    },
    {
      "@type": "Question",
      name: "What is the pressure score?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Momentum calculates a project pressure score based on idle days, missed milestones, active blockers, and low progress to nudge you before a project stalls.",
      },
    },
  ],
};

// ─── Main dashboard ───────────────────────────────────────────────────

function DashboardContent() {
  const { t } = useI18n();
  const { user, isLoaded } = useUser();
  const projects = useProjectStore((s) => s.projects);
  const { isSignedIn } = useUser();

  const active = projects.filter((p) => !p.completionDate);
  const completed = projects.filter((p) => p.completionDate);
  const [showImport, setShowImport] = useState(false);
  if (!isLoaded || (!isSignedIn && projects.length === 0)) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            <GuestLanding t={t} />
            <Footer />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <div className="flex items-start justify-between mb-6 sm:mb-8 gap-4">
              <div className="flex-1 min-w-0">
                {isLoaded && (
                  <DashboardGreeting user={user} projectCount={active.length} />
                )}

                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  {active.length === 0
                    ? t("dashboard_no_active")
                    : active.length === 1
                    ? t("dashboard_active_count", { count: 1 })
                    : t("dashboard_active_count_plural", {
                        count: active.length,
                      })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImport(true)}
                  className="gap-1.5"
                  title="Import a project from JSON"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 1v8M4 6l3 3 3-3M2 11h10"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </Button>

                <Link href="/new">
                  <Button size="sm" className="gap-1.5 sm:gap-2">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1v12M1 7h12"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="hidden sm:inline">
                      {t("dashboard_new_project")}
                    </span>
                    <span className="sm:hidden">{t("dashboard_new")}</span>
                  </Button>
                </Link>
              </div>
            </div>

            {projects.length === 0 && <EmptyState />}
            {}
            {active.length > 0 && (
              <section className="mb-8 sm:mb-10">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                  {t("dashboard_active")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {active.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section className="pb-16 lg:pb-4">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3 sm:mb-4">
                  {t("dashboard_shipped")}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {completed.map((p) => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
          {projects.length > 0 && <Footer />}
        </main>
      </div>

      <ImportProjectModal
        open={showImport}
        onClose={() => setShowImport(false)}
      />
      <SavePromptModal />
    </div>
  );
}

function GuestLanding({ t }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      {/* Hero — indexable H1 */}
      <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--text-primary)] leading-tight tracking-tight mb-6">
        Turn any idea into a{" "}
        <span style={{ color: "var(--violet)" }}>finished project</span>
      </h1>
      <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed mb-10">
        Momentum breaks down your goals into phases, milestones, and daily
        actions. AI builds the plan. You execute it — with streak tracking and
        pressure alerts to keep you accountable.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4 mb-20">
        <a
          href="/new"
          className="inline-flex items-center justify-center h-12 px-8 rounded-[var(--r-md)] bg-[var(--violet)] text-white font-semibold text-base hover:bg-[var(--violet-dim)] transition-colors"
        >
          Start your first project →
        </a>
        <span className="text-sm text-[var(--text-tertiary)] self-center">
          Free · No sign-up required to start
        </span>
      </div>

      {/* Feature grid — indexable content */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
        {[
          {
            icon: FaRobot,
            title: "AI-generated plan",
            desc: "Describe your goal. Momentum builds phases, milestones, and tasks tailored to your scope.",
          },
          {
            icon: FaFire,
            title: "Streak & pressure system",
            desc: "Daily streaks and project pressure scores keep procrastination at bay.",
          },
          {
            icon: FaChartBar,
            title: "Execution hub",
            desc: "One view for your next action, blockers, timeline, and overall progress.",
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] p-5"
            >
              <span className="text-3xl mb-3 block">
                <Icon />
              </span>
              <h2 className="font-display font-semibold text-base text-[var(--text-primary)] mb-2">
                {f.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* FAQ — rich snippet eligible */}
      <div className="mb-16">
        <h2 className="font-display font-semibold text-2xl text-[var(--text-primary)] mb-6">
          Frequently asked questions
        </h2>
        {[
          {
            q: "Is Momentum free to use?",
            a: "Yes. You can create and execute one project without signing up. Sign up free to manage up to 4 projects with full sync.",
          },
          {
            q: "How does the AI planning work?",
            a: "You describe your goal in plain language. Momentum's AI breaks it into phases, milestones, and concrete tasks sized for under 2 hours each.",
          },
          {
            q: "What is the pressure score?",
            a: "Momentum calculates a project pressure score based on idle days, missed milestones, active blockers, and low progress. It nudges you before a project stalls.",
          },
          {
            q: "Can I export my project?",
            a: "Yes — export to Markdown, JSON, or PDF at any time. You can also import a JSON backup to restart a plan fresh.",
          },
        ].map(({ q, a }) => (
          <details
            key={q}
            className="border-b border-[var(--border)] py-4 group"
          >
            <summary className="text-sm font-medium text-[var(--text-primary)] cursor-pointer list-none flex items-center justify-between">
              {q}
              <span className="text-[var(--text-tertiary)] group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
              {a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DataProvider>
      <DashboardContent />
    </DataProvider>
  );
}
