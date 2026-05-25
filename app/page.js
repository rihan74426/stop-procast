"use client";

import Link from "next/link";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { ToastContainer } from "@/components/ui/Toast";
import {
  FaRocket,
  FaFire,
  FaChartBar,
  FaRobot,
  FaCheckCircle,
  FaBolt,
} from "react-icons/fa";

/* ─── Inner content (needs i18n + user) ──────────────────────────────── */
function LandingContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { t } = useI18n();

  // Signed-in users skip the landing and go straight to their dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // While redirecting, show nothing (avoids flash)
  if (!isLoaded || isSignedIn) return null;

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
    >
      {/* ── Nav bar ── */}
      <nav
        className="h-14 border-b flex items-center px-4 sm:px-8 gap-4 sticky top-0 z-30"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{ background: "var(--violet)" }}
          >
            M
          </div>
          <span
            className="font-display font-semibold text-sm"
            style={{ color: "var(--text-primary)" }}
          >
            Momentum
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button
              className="h-9 px-4 text-sm font-medium rounded-[var(--r-md)] border transition-all"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Sign in
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button
              className="h-9 px-4 text-sm font-semibold rounded-[var(--r-md)] transition-all text-white"
              style={{ background: "var(--violet)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--violet-dim)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--violet)")
              }
            >
              Get started free
            </button>
          </SignUpButton>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-28 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
          style={{
            background: "var(--violet-bg)",
            color: "var(--violet-dim)",
            borderColor: "var(--violet)",
          }}
        >
          <FaBolt className="inline" size={10} />
          AI-powered project planning
        </div>

        <h1
          className="font-display font-bold text-4xl sm:text-6xl leading-tight tracking-tight mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          {t("guest_hero_title_1")}{" "}
          <span style={{ color: "var(--violet)" }}>
            {t("guest_hero_title_2")}
          </span>
        </h1>

        <p
          className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("guest_hero_subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/new"
            className="inline-flex items-center justify-center h-12 px-8 rounded-[var(--r-md)] text-base font-semibold text-white transition-all w-full sm:w-auto"
            style={{ background: "var(--violet)" }}
          >
            <FaRocket className="mr-2" size={14} />
            {t("guest_cta_primary")}
          </Link>

          <SignInButton mode="modal">
            <button
              className="inline-flex items-center justify-center h-12 px-8 rounded-[var(--r-md)] text-sm font-medium border transition-all w-full sm:w-auto"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-secondary)",
                background: "transparent",
              }}
            >
              Already have an account? Sign in
            </button>
          </SignInButton>
        </div>

        <p className="mt-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {t("guest_cta_free")}
        </p>
      </section>

      {/* ── Features ── */}
      <section
        className="border-t border-b py-14 sm:py-20"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <h2
            className="font-display font-bold text-2xl sm:text-3xl text-center mb-10"
            style={{ color: "var(--text-primary)" }}
          >
            Everything you need to ship
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: FaRobot,
                color: "var(--violet)",
                bg: "var(--violet-bg)",
                title: t("guest_feature_ai_title"),
                desc: t("guest_feature_ai_desc"),
              },
              {
                icon: FaFire,
                color: "var(--coral)",
                bg: "var(--coral-bg)",
                title: t("guest_feature_streak_title"),
                desc: t("guest_feature_streak_desc"),
              },
              {
                icon: FaChartBar,
                color: "var(--emerald)",
                bg: "var(--emerald-bg)",
                title: t("guest_feature_hub_title"),
                desc: t("guest_feature_hub_desc"),
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-[var(--r-lg)] border text-center p-5"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg-surface)",
                    placeItems: "center",
                  }}
                >
                  <div
                    className="w-10 h-10 justify-center  rounded-[var(--r-md)] flex items-center justify mb-4"
                    style={{ background: f.bg }}
                  >
                    <Icon style={{ color: f.color }} size={18} />
                  </div>
                  <h3
                    className="font-display font-semibold text-base mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
        <h2
          className="font-display font-bold text-2xl sm:text-3xl text-center mb-10"
          style={{ color: "var(--text-primary)" }}
        >
          How it works
        </h2>

        <div className="flex flex-col gap-6">
          {[
            {
              step: "01",
              title: "Describe your goal",
              desc: "Paste a raw idea, a dream project, or a vague goal. Doesn't matter how rough.",
            },
            {
              step: "02",
              title: "AI builds your blueprint",
              desc: "Momentum generates phases, milestones, tasks and risk flags — structured for execution.",
            },
            {
              step: "03",
              title: "Work the plan, ship it",
              desc: "Track daily next actions, streaks and blockers. Get re-engagement nudges when you go quiet.",
            },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-5">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-display font-bold shrink-0"
                style={{
                  background: "var(--violet-bg)",
                  color: "var(--violet-dim)",
                  border: "2px solid var(--violet)",
                }}
              >
                {s.step}
              </div>
              <div className="pt-2">
                <p
                  className="font-display font-semibold text-base mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {s.title}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        className="border-t py-14 sm:py-20"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-8">
          <h2
            className="font-display font-bold text-2xl sm:text-3xl text-center mb-8"
            style={{ color: "var(--text-primary)" }}
          >
            {t("guest_faq_title")}
          </h2>
          {[
            { q: t("guest_faq_1_q"), a: t("guest_faq_1_a") },
            { q: t("guest_faq_2_q"), a: t("guest_faq_2_a") },
            { q: t("guest_faq_3_q"), a: t("guest_faq_3_a") },
            { q: t("guest_faq_4_q"), a: t("guest_faq_4_a") },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="border-b py-4 group"
              style={{ borderColor: "var(--border)" }}
            >
              <summary
                className="text-sm font-medium cursor-pointer list-none flex items-center justify-between gap-3"
                style={{ color: "var(--text-primary)" }}
              >
                <span className="flex-1">{q}</span>
                <span
                  className="group-open:rotate-180 transition-transform shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  ▾
                </span>
              </summary>
              <p
                className="text-sm mt-3 leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="max-w-2xl mx-auto px-4 sm:px-8 py-16 text-center">
        <FaCheckCircle
          className="mx-auto mb-4"
          size={32}
          style={{ color: "var(--emerald)" }}
        />
        <h2
          className="font-display font-bold text-2xl sm:text-3xl mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Ready to finish something?
        </h2>
        <p
          className="mb-8 text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          Your first project takes 2 minutes to plan. No credit card required.
        </p>
        <Link
          href="/new"
          className="inline-flex items-center justify-center h-12 px-10 rounded-[var(--r-md)] text-base font-semibold text-white transition-all"
          style={{ background: "var(--violet)" }}
        >
          Start for free →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}
      >
        © {new Date().getFullYear()} Momentum · Built by{" "}
        <a
          href="https://nuruddin-webician.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--violet)" }}
        >
          Nuruddin
        </a>
      </footer>
    </div>
  );
}

/* ─── Page wrapper (providers already in layout.js) ──────────────────── */
export default function RootPage() {
  return <LandingContent />;
}
