"use client";

import { useEffect, useRef, useState } from "react";
import { parseBlueprint } from "@/lib/ai/parser";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function StepReview({
  idea,
  clarifications,
  scopeLevel,
  onBack,
  onCommit,
}) {
  const [raw, setRaw] = useState("");
  const [blueprint, setBlueprint] = useState(null);
  const [status, setStatus] = useState("streaming"); // streaming | done | error
  const [error, setError] = useState(null);
  const rawRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    async function stream() {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "generate",
            idea,
            clarifications,
            scopeLevel,
          }),
        });

        if (!res.ok) throw new Error("Generation failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          rawRef.current += decoder.decode(value);
          setRaw(rawRef.current);
        }

        if (!cancelled) {
          const parsed = parseBlueprint(rawRef.current);
          setBlueprint(parsed);
          setStatus("done");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setStatus("error");
        }
      }
    }
    stream();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-[var(--r-lg)] border border-[var(--coral)] bg-[var(--coral-bg)] p-5 text-[var(--coral)]">
          <p className="font-medium mb-1">Generation failed</p>
          <p className="text-sm">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (status === "streaming") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-2">
            Building your blueprint…
          </h1>
          <p className="text-[var(--text-secondary)]">
            The AI is structuring your project in real-time.
          </p>
        </div>
        {/* Live token stream */}
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-5 font-mono text-xs text-[var(--text-tertiary)] max-h-64 overflow-y-auto leading-relaxed">
          {raw || <span className="animate-pulse">Thinking…</span>}
          <span className="inline-block w-0.5 h-3 bg-[var(--violet)] ml-0.5 animate-pulse" />
        </div>
      </div>
    );
  }

  // Done — show structured blueprint
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[var(--emerald)]" />
          <span className="text-sm text-[var(--emerald)] font-medium">
            Blueprint ready
          </span>
        </div>
        <h1 className="text-3xl font-display font-semibold text-[var(--text-primary)] mb-1">
          {blueprint.projectTitle}
        </h1>
        <p className="text-[var(--text-secondary)]">{blueprint.oneLineGoal}</p>
      </div>

      {/* Phases */}
      <div>
        <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
          {blueprint.phases.length} phases · {blueprint.tasks.length} tasks ·{" "}
          {blueprint.timeline}
        </p>
        <div className="flex flex-col gap-3">
          {blueprint.phases.map((phase, i) => (
            <div
              key={phase.id}
              className="rounded-[var(--r-lg)] border border-[var(--border)] p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded-full bg-[var(--violet-bg)] flex items-center justify-center text-xs font-medium text-[var(--violet-dim)]">
                  {i + 1}
                </div>
                <p className="font-medium text-[var(--text-primary)]">
                  {phase.name}
                </p>
              </div>
              <p className="text-sm text-[var(--text-secondary)] ml-9">
                {phase.objective}
              </p>
              {phase.milestones.length > 0 && (
                <div className="ml-9 mt-3 flex flex-wrap gap-2">
                  {phase.milestones.map((m) => (
                    <Badge key={m.id} variant="slate">
                      {m.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Success criteria */}
      {blueprint.successCriteria.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-3">
            Success criteria
          </p>
          <ul className="flex flex-col gap-2">
            {blueprint.successCriteria.map((c, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="text-[var(--emerald)] mt-0.5">✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Change scope
        </Button>
        <Button variant="emerald" size="lg" onClick={() => onCommit(blueprint)}>
          Commit to this plan →
        </Button>
      </div>
    </div>
  );
}
