"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const EXAMPLES = [
  "A mobile app that helps remote teams do async standups without boring meetings",
  "A Chrome extension that blocks distracting sites during deep work sessions",
  "A SaaS tool for freelancers to auto-generate invoices from time logs",
];

export function StepCapture({ value, onChange, onNext }) {
  const [focused, setFocused] = useState(false);

  const canProceed = value.trim().length >= 20;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          What do you want to build?
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          Describe your idea in plain language. Messy is fine — the more honest,
          the better the plan.
        </p>
      </div>

      {/* Input */}
      <div
        className={[
          "rounded-[var(--r-lg)] border-2 transition-colors duration-200",
          focused ? "border-[var(--violet)]" : "border-[var(--border)]",
        ].join(" ")}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="e.g. I want to build a tool that helps indie makers track their projects without getting overwhelmed by complex PM software..."
          rows={5}
          className="w-full bg-transparent px-4 sm:px-5 py-3 sm:py-4 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none text-sm sm:text-base leading-relaxed"
          autoFocus
        />
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-[var(--border)] flex items-center justify-between">
          <span
            className={`text-xs ${
              value.length < 20
                ? "text-[var(--text-tertiary)]"
                : "text-[var(--emerald)]"
            }`}
          >
            {value.length < 20
              ? `${20 - value.length} more chars`
              : "✓ Good — more detail = better plan"}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">
            {value.length} chars
          </span>
        </div>
      </div>

      {/* Examples */}
      <div>
        <p className="text-xs text-[var(--text-tertiary)] mb-2 sm:mb-3 uppercase tracking-wider font-medium">
          Need inspiration?
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => onChange(ex)}
              className="text-left text-sm text-[var(--text-secondary)] px-3 sm:px-4 py-2.5 sm:py-3 rounded-[var(--r-md)] border border-[var(--border)] hover:border-[var(--violet)] hover:text-[var(--text-primary)] hover:bg-[var(--violet-bg)] transition-all duration-150"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
          className="gap-2 sm:gap-3 w-full sm:w-auto justify-center"
        >
          Continue
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
