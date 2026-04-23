"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AI_MODELS, getStoredModel, setStoredModel } from "@/lib/ai/models";
import { useI18n } from "@/lib/i18n";

const EXAMPLES = [
  "A mobile app that helps remote teams do async standups without boring meetings",
  "A Chrome extension that blocks distracting sites during deep work sessions",
  "A SaaS tool for freelancers to auto-generate invoices from time logs",
];

export function StepCapture({ value, onChange, onNext }) {
  const { t } = useI18n();
  const [focused, setFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getStoredModel);

  const canProceed = value.trim().length >= 20;

  const handleModelSelect = (id) => {
    setSelectedModel(id);
    setStoredModel(id);
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          {t("intake_what")}
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          {t("intake_what_desc")}
        </p>
      </div>

      {/* Textarea */}
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

      {/* AI Model selector */}
      <div>
        <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-2.5">
          {t("model_choose")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {AI_MODELS.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => handleModelSelect(model.id)}
                className={[
                  "relative text-left rounded-[var(--r-md)] border-2 px-3 py-2.5 transition-all duration-150",
                  isSelected
                    ? "border-[var(--violet)] bg-[var(--violet-bg)]"
                    : "border-[var(--border)] hover:border-[var(--slate-4)] bg-[var(--bg-surface)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold ${
                      isSelected
                        ? "text-[var(--violet-dim)]"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {model.name}
                  </span>
                  <span
                    className={[
                      "text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                      isSelected
                        ? "bg-[var(--violet)] text-white"
                        : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                    ].join(" ")}
                  >
                    {model.badge}
                  </span>
                </div>
                <p
                  className={`text-[10px] leading-snug ${
                    isSelected
                      ? "text-[var(--violet-dim)]"
                      : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {model.description}
                </p>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-[var(--violet)] flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4l1.5 1.5 3-3"
                        stroke="white"
                        strokeWidth="1.4"
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
          {t("intake_continue")}
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
