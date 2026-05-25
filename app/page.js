"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { clearMomentumStorage } from "@/lib/clearStorage";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  FaRocket,
  FaFire,
  FaChartBar,
  FaRobot,
  FaCheckCircle,
  FaBolt,
  FaArrowRight,
  FaPlay,
} from "react-icons/fa";

/* ─── LandingNav ──────────────────────────────────────────────────────── */
function LandingNav() {
  const { theme, toggle } = useTheme();
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerk();
  const { t, locale, changeLocale } = useI18n();
  const [langOpen, setLangOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target))
        setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  const handleSignOutConfirmed = async () => {
    setSigningOut(true);
    clearMomentumStorage();
    useProjectStore.setState({ projects: [], hydrated: false });
    await signOut({ redirectUrl: "/" });
    setSigningOut(false);
    setShowSignOutConfirm(false);
  };

  return (
    <>
      <nav
        className="h-14 border-b flex items-center px-4 sm:px-8 gap-2 sticky top-0 z-40"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 flex-1 shrink-0 group"
        >
          <div className="h-7 w-7 rounded-[var(--r-md)] overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/favicon.png"
              alt="Momentum"
              width={28}
              height={28}
              className="object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
          <span className="font-display font-semibold text-sm tracking-tight text-[var(--text-primary)] hidden xs:block sm:block">
            Momentum
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Language picker */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen((o) => !o)}
              aria-label={t("lang_select")}
              className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-[var(--r-md)] border transition-all"
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
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="hidden md:inline text-xs">
                {currentLang.label}
              </span>
              <svg
                width="9"
                height="9"
                viewBox="0 0 10 10"
                fill="none"
                className={`transition-transform duration-150 hidden sm:block ${
                  langOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M2 3.5l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {langOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-44 rounded-[var(--r-lg)] border overflow-hidden z-50"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg-elevated)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLocale(lang.code);
                      setLangOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors"
                    style={{
                      background:
                        locale === lang.code
                          ? "var(--violet-bg)"
                          : "transparent",
                      color:
                        locale === lang.code
                          ? "var(--violet-dim)"
                          : "var(--text-secondary)",
                      fontWeight: locale === lang.code ? 500 : 400,
                    }}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.label}</span>
                    {locale === lang.code && (
                      <span
                        className="ml-auto text-xs"
                        style={{ color: "var(--violet)" }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={t("settings_theme")}
            className="h-8 w-8 flex items-center justify-center rounded-[var(--r-md)] border transition-all shrink-0"
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
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Auth */}
          {isLoaded &&
            (isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="h-8 px-3 sm:px-4 flex items-center text-xs font-semibold rounded-[var(--r-md)] text-white transition-all"
                  style={{ background: "var(--violet)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--violet-dim)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--violet)")
                  }
                >
                  {t("nav_dashboard")}
                </Link>
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  className="h-8 px-2 sm:px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-[var(--r-md)] border transition-all shrink-0"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                    background: "transparent",
                  }}
                  title={t("signout_confirm_title")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-subtle)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.firstName || "User"}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        background: "var(--violet-bg)",
                        color: "var(--violet-dim)",
                      }}
                    >
                      {(
                        user?.firstName?.[0] ||
                        user?.emailAddresses?.[0]?.emailAddress?.[0] ||
                        "U"
                      ).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline truncate max-w-[80px]">
                    {user?.firstName || t("nav_sign_in_short")}
                  </span>
                </button>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button
                    className="h-8 px-3 text-xs font-medium rounded-[var(--r-md)] border transition-all whitespace-nowrap"
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
                    {t("nav_sign_in_short")}
                  </button>
                </SignInButton>
                <Link
                  href="/dashboard"
                  className="h-8 px-3 sm:px-4 flex items-center text-xs font-semibold rounded-[var(--r-md)] text-white transition-all whitespace-nowrap"
                  style={{ background: "var(--violet)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--violet-dim)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--violet)")
                  }
                >
                  {t("dashboard_link_label")}
                </Link>
              </>
            ))}
        </div>
      </nav>

      <Modal
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        title={t("signout_confirm_title")}
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("signout_confirm_desc")}
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowSignOutConfirm(false)}
              disabled={signingOut}
            >
              {t("common_cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSignOutConfirmed}
              loading={signingOut}
            >
              {t("signout_confirm_label")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ─── StatPill ────────────────────────────────────────────────────────── */
function StatPill({ value, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="font-display font-bold text-2xl sm:text-3xl tabular-nums leading-none"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
      <span
        className="text-[11px] tracking-wide uppercase"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── FeatureCard ─────────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, color, bg, title, desc, index }) {
  return (
    <div
      className="rounded-[var(--r-lg)] items-center text-center justify-items-center border p-6 flex flex-col gap-4 transition-all duration-300 cursor-default"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg-surface)",
        animationDelay: `${index * 80}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,.07)";
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div
        className="w-11 h-11 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
        style={{ background: bg }}
      >
        <Icon size={19} style={{ color }} />
      </div>
      <div>
        <h3
          className="font-display font-semibold text-[15px] mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── StepCard ────────────────────────────────────────────────────────── */
function StepCard({ number, title, desc, accent, isLast }) {
  return (
    <div className="relative flex gap-5 group">
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-display font-bold shrink-0 transition-all duration-200 group-hover:scale-110"
          style={{
            background: accent.bg,
            color: accent.text,
            border: `2px solid ${accent.border}`,
          }}
        >
          {number}
        </div>
        {!isLast && (
          <div
            className="w-px flex-1 mt-2"
            style={{ background: "var(--border)" }}
          />
        )}
      </div>
      <div className={`flex-1 pt-1.5 ${!isLast ? "pb-10" : "pb-2"}`}>
        <p
          className="font-display font-semibold text-[15px] mb-1.5"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ─── TestimonialCard ─────────────────────────────────────────────────── */
function TestimonialCard({ quote, name, role, initials, color }) {
  return (
    <div
      className="rounded-[var(--r-lg)] border p-5 flex flex-col gap-4 transition-all duration-200"
      style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Stars */}
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            width="13"
            height="13"
            viewBox="0 0 12 12"
            fill="var(--coral)"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.2.53 3.1L6 8l-2.78 1.5.53-3.1L1.5 4.2l3.15-.47L6 1z" />
          </svg>
        ))}
      </div>
      <p
        className="text-sm leading-relaxed flex-1"
        style={{ color: "var(--text-secondary)" }}
      >
        "{quote}"
      </p>
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: color.bg, color: color.text }}
        >
          {initials}
        </div>
        <div>
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {name}
          </p>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {role}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── LandingContent ──────────────────────────────────────────────────── */
function LandingContent() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) return null;

  const features = [
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
  ];

  const steps = [
    {
      number: "01",
      title: t("guest_step_1_title"),
      desc: t("guest_step_1_desc"),
      accent: {
        bg: "var(--violet-bg)",
        text: "var(--violet-dim)",
        border: "var(--violet)",
      },
    },
    {
      number: "02",
      title: t("guest_step_2_title"),
      desc: t("guest_step_2_desc"),
      accent: {
        bg: "var(--emerald-bg)",
        text: "var(--emerald)",
        border: "var(--emerald)",
      },
    },
    {
      number: "03",
      title: t("guest_step_3_title"),
      desc: t("guest_step_3_desc"),
      accent: {
        bg: "var(--coral-bg)",
        text: "var(--coral)",
        border: "var(--coral)",
      },
    },
  ];

  const testimonials = [
    {
      quote: t("guest_testimonial_1_quote"),
      name: t("guest_testimonial_1_name"),
      role: t("guest_testimonial_1_role"),
      initials: "AK",
      color: { bg: "var(--violet-bg)", text: "var(--violet-dim)" },
    },
    {
      quote: t("guest_testimonial_2_quote"),
      name: t("guest_testimonial_2_name"),
      role: t("guest_testimonial_2_role"),
      initials: "SR",
      color: { bg: "var(--emerald-bg)", text: "var(--emerald)" },
    },
    {
      quote: t("guest_testimonial_3_quote"),
      name: t("guest_testimonial_3_name"),
      role: t("guest_testimonial_3_role"),
      initials: "MJ",
      color: { bg: "var(--coral-bg)", text: "var(--coral)" },
    },
  ];

  const faqs = [
    { q: t("guest_faq_1_q"), a: t("guest_faq_1_a") },
    { q: t("guest_faq_2_q"), a: t("guest_faq_2_a") },
    { q: t("guest_faq_3_q"), a: t("guest_faq_3_a") },
    { q: t("guest_faq_4_q"), a: t("guest_faq_4_a") },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
    >
      <LandingNav />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.06]"
            style={{
              background:
                "radial-gradient(ellipse at center, var(--violet) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 border"
            style={{
              background: "var(--violet-bg)",
              color: "var(--violet-dim)",
              borderColor: "var(--violet)",
            }}
          >
            <Link
              href="/dashboard"
              style={{ color: "var(--text-primary)" }}
              className="h-8 px-3 sm:px-4 flex items-center text-xs font-semibold rounded-[var(--r-md)] transition-all whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--violet-dim)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "var(--violet)")
              }
            >
              {t("guest_dashboard_go")}
            </Link>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-bold text-[2.75rem] sm:text-6xl leading-[1.08] tracking-tight mb-6"
            style={{ color: "var(--text-primary)" }}
          >
            {t("guest_hero_title_1")}{" "}
            <span
              className="relative inline-block"
              style={{ color: "var(--violet)" }}
            >
              {t("guest_hero_title_2")}
              {/* Underline accent */}
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="6"
                viewBox="0 0 200 6"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M0 5 Q50 1 100 3.5 Q150 6 200 2"
                  stroke="var(--violet)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              </svg>
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("guest_hero_subtitle")}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-5">
            <Link
              href="/new"
              className="inline-flex items-center justify-center gap-2 h-12 px-8 rounded-[var(--r-md)] text-sm font-semibold text-white transition-all duration-200 w-full sm:w-auto"
              style={{ background: "var(--violet)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--violet-dim)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 10px 28px rgba(124,58,237,.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--violet)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <FaRocket size={12} />
              {t("guest_cta_primary")}
            </Link>

            <SignInButton mode="modal">
              <button
                className="inline-flex items-center justify-center h-12 px-8 rounded-[var(--r-md)] text-sm font-medium border transition-all duration-200 w-full sm:w-auto gap-2"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--text-tertiary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <FaPlay size={9} />
                {t("guest_cta_signin_long")}
              </button>
            </SignInButton>
          </div>

          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {t("guest_cta_free")}
          </p>

          {/* Social proof */}
          <div
            className="mt-16 flex items-center justify-center gap-6 sm:gap-16 border-t pt-10"
            style={{ borderColor: "var(--border)" }}
          >
            <StatPill value="2 min" label={t("guest_stat_plan")} />
            <div
              className="w-px h-10"
              style={{ background: "var(--border)" }}
            />
            <StatPill value="$0" label={t("guest_stat_card")} />
            <div
              className="w-px h-10"
              style={{ background: "var(--border)" }}
            />
            <StatPill value="∞" label={t("guest_stat_projects")} />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section
        className="border-t border-b py-16 sm:py-20"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <h2
              className="font-display font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {t("guest_features_heading")}
            </h2>
            <p
              className="text-sm max-w-sm mx-auto"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("guest_features_sub")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2
            className="font-display font-bold text-2xl sm:text-3xl mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {t("guest_how_heading")}
          </h2>
          <p
            className="text-sm max-w-xs mx-auto"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("guest_how_sub")}
          </p>
        </div>

        <div>
          {steps.map((s, i) => (
            <StepCard key={s.number} {...s} isLast={i === steps.length - 1} />
          ))}
        </div>

        <div className="text-center mt-4">
          <Link
            href="/new"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-all duration-200 group"
            style={{ color: "var(--violet)" }}
          >
            {t("guest_how_cta")}
            <FaArrowRight
              size={10}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section
        className="border-t border-b py-16 sm:py-20"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <h2
              className="font-display font-bold text-2xl sm:text-3xl mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {t("guest_testimonials_heading")}
            </h2>
            <p
              className="text-sm max-w-xs mx-auto"
              style={{ color: "var(--text-tertiary)" }}
            >
              {t("guest_testimonials_sub")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {testimonials.map((t_) => (
              <TestimonialCard key={t_.name} {...t_} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <h2
          className="font-display font-bold text-2xl sm:text-3xl text-center mb-10"
          style={{ color: "var(--text-primary)" }}
        >
          {t("guest_faq_title")}
        </h2>

        <div
          className="flex flex-col rounded-[var(--r-lg)] border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={faq.q}
                className={i < faqs.length - 1 ? "border-b" : ""}
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
                  style={{
                    background: isOpen ? "var(--bg-elevated)" : "transparent",
                    color: isOpen
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) =>
                    !isOpen &&
                    (e.currentTarget.style.background = "var(--bg-subtle)")
                  }
                  onMouseLeave={(e) =>
                    !isOpen &&
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <span className="text-sm font-medium flex-1">{faq.q}</span>
                  <span
                    className="transition-transform duration-200 shrink-0 text-base"
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "none",
                      color: isOpen ? "var(--violet)" : "var(--text-tertiary)",
                    }}
                  >
                    ▾
                  </span>
                </button>

                <div
                  style={{
                    maxHeight: isOpen ? "200px" : "0",
                    overflow: "hidden",
                    transition: "max-height 0.25s ease",
                  }}
                >
                  <p
                    className="px-5 pb-4 text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section
        className="border-t py-20"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-elevated)",
        }}
      >
        <div className="max-w-xl mx-auto px-4 sm:px-8 text-center">
          {/* Icon badge */}
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6"
            style={{ background: "var(--emerald-bg)" }}
          >
            <FaCheckCircle size={26} style={{ color: "var(--emerald)" }} />
          </div>

          <h2
            className="font-display font-bold text-2xl sm:text-3xl mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {t("guest_final_cta_heading")}
          </h2>
          <p
            className="mb-8 text-base leading-relaxed max-w-sm mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("guest_final_cta_desc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/new"
              className="inline-flex items-center justify-center gap-2 h-12 px-10 rounded-[var(--r-md)] text-sm font-semibold text-white transition-all duration-200 w-full sm:w-auto"
              style={{ background: "var(--violet)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--violet-dim)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 10px 28px rgba(124,58,237,.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--violet)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <FaRocket size={12} />
              {t("guest_final_cta_btn")}
            </Link>

            <SignInButton mode="modal">
              <button
                className="inline-flex items-center justify-center h-12 px-8 rounded-[var(--r-md)] text-sm font-medium border transition-all duration-200 w-full sm:w-auto"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-surface)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {t("nav_sign_in_short")}
              </button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-tertiary)" }}
      >
        {t("footer_copyright", { year: new Date().getFullYear() })} ·{" "}
        {t("footer_built_by")}{" "}
        <a
          href="https://nuruddin-webician.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--violet)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          Nuruddin
        </a>
      </footer>
    </div>
  );
}

/* ─── Icons ───────────────────────────────────────────────────────────── */
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M11.54 4.46l-1.41 1.41M4.95 11.54l-1.41 1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9A6 6 0 0 1 7 2.5a6 6 0 1 0 6.5 6.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Export ──────────────────────────────────────────────────────────── */
export default function RootPage() {
  return <LandingContent />;
}
