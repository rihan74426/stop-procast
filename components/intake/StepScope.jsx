"use client";

import { Button } from "@/components/ui/Button";

const SCOPES = [
  {
    id: "lean",
    label: "Lean",
    subtitle: "Ship fast, learn fast",
    description:
      "Ruthlessly minimal. 2 phases, core features only. Perfect for validating an idea.",
    timeHint: "2–3 weeks",
    color: "var(--emerald)",
    bg: "var(--emerald-bg)",
  },
  {
    id: "standard",
    label: "Standard",
    subtitle: "Balanced & realistic",
    description:
      "Solid plan with 3 phases. All important features, no gold-plating.",
    timeHint: "4–8 weeks",
    color: "var(--violet)",
    bg: "var(--violet-bg)",
    recommended: true,
  },
  {
    id: "ambitious",
    label: "Ambitious",
    subtitle: "Full vision",
    description:
      "4–5 phases covering everything. For projects you're fully committed to.",
    timeHint: "8–16 weeks",
    color: "var(--amber)",
    bg: "var(--amber-bg)",
  },
];

export function StepScope({ value, onChange, onBack, onNext }) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          Choose your scope
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          This shapes how the AI plans your project. You can always adjust
          later.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        {SCOPES.map((scope) => {
          const selected = value === scope.id;
          return (
            <button
              key={scope.id}
              onClick={() => onChange(scope.id)}
              className={[
                "relative text-left rounded-[var(--r-lg)] border-2 p-4 sm:p-5 transition-all duration-200",
                selected
                  ? "border-[var(--violet)] shadow-[var(--shadow-md)]"
                  : "border-[var(--border)] hover:border-[var(--slate-4)]",
              ].join(" ")}
            >
              {scope.recommended && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-medium rounded-full text-white"
                  style={{ background: "var(--violet)" }}
                >
                  Recommended
                </span>
              )}

              {/* Color dot */}
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-[var(--r-md)] flex items-center justify-center mb-3 sm:mb-4"
                style={{ background: scope.bg }}
              >
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                  style={{ background: scope.color }}
                />
              </div>

              <p className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] mb-0.5">
                {scope.label}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mb-2 sm:mb-3">
                {scope.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed mb-3 sm:mb-4">
                {scope.description}
              </p>
              <p className="text-xs font-medium" style={{ color: scope.color }}>
                ≈ {scope.timeHint}
              </p>

              {selected && (
                <div
                  className="absolute top-3 sm:top-4 right-3 sm:right-4 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--violet)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path
                      d="M2 5l2 2 4-4"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          ← Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!value}
          size="lg"
          className="flex-1 sm:flex-none justify-center"
        >
          Generate plan →
        </Button>
      </div>
    </div>
  );
}
