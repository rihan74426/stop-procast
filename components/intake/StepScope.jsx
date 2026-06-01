"use client";

import React from "react";
import PropTypes from "prop-types";
import { t } from "../../lib/i18n/translations";

const options = [
  { id: "lean", labelKey: "scope_lean_label", hintKey: "scope_lean_hint" },
  {
    id: "standard",
    labelKey: "scope_standard_label",
    hintKey: "scope_standard_hint",
  },
  {
    id: "ambitious",
    labelKey: "scope_ambitious_label",
    hintKey: "scope_ambitious_hint",
  },
];

export function StepScope({
  lang = "en",
  scope = "standard",
  onChange = () => {},
  onBack,
  onNext,
}) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
          {t(lang, "intake_scope")}
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          {t(lang, "intake_scope_desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
        {options.map((opt) => {
          const selected = scope === opt.id;
          return (
            <label
              key={opt.id}
              className={`scope-option relative text-left rounded-[var(--r-lg)] border-2 p-4 sm:p-5 transition-all duration-200 ${
                selected
                  ? "border-[var(--violet)] shadow-[var(--shadow-md)]"
                  : "border-[var(--border)] hover:border-[var(--slate-4)]"
              }`}
              style={{
                display: "block",
                border: selected ? "1px solid #007acc" : "1px solid #ddd",
                padding: "12px",
                marginBottom: "8px",
                borderRadius: 6,
                cursor: "pointer",
              }}
              role="radiogroup"
              aria-label={t(lang, "intake_scope")}
            >
              <input
                type="radio"
                name="scope"
                value={opt.id}
                checked={selected}
                onChange={() => onChange(opt.id)}
                style={{ marginRight: 8 }}
              />
              <strong className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] mb-0.5">
                {t(lang, opt.labelKey)}
              </strong>
              <div
                className="hint"
                style={{
                  fontSize: 13,
                  color: "#666",
                  marginTop: 6,
                }}
              >
                {t(lang, opt.hintKey)}
              </div>
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
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="btn-ghost">
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!scope}
          className="btn-primary flex-1 sm:flex-none justify-center"
          style={{
            background: "#007acc",
            color: "#fff",
            border: "none",
            padding: "10px 14px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {t(lang, "intake_generate")}
        </button>
      </div>
    </div>
  );
}

StepScope.propTypes = {
  lang: PropTypes.string,
  scope: PropTypes.oneOf(["lean", "standard", "ambitious"]),
  onChange: PropTypes.func,
};
