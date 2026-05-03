"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

const IDEA_EXAMPLES = [
  "Learn a new language",
  "Write a book",
  "Launch a business",
  "Get fit",
  "Plan a trip",
  "Build a habit",
  "Study for an exam",
  "Start a side project",
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-[var(--r-xl)] bg-[var(--violet-bg)] flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path
              d="M6 18h24M18 6l12 12-12 12"
              stroke="var(--violet)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-[var(--r-xl)] bg-[var(--violet-bg)] animate-ping opacity-40" />
      </div>

      <h2 className="font-display font-semibold text-2xl text-[var(--text-primary)] mb-3">
        What are you working towards?
      </h2>
      <p className="text-[var(--text-secondary)] max-w-sm leading-relaxed mb-8">
        Whether it's a business idea, a fitness goal, a creative project, or
        anything else. Drop it in and get a structured plan you can actually
        follow.
      </p>

      <Link href="/new">
        <Button size="lg" className="gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2v12M2 8h12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Start your first plan
        </Button>
      </Link>

      <p className="mt-6 text-xs text-[var(--text-tertiary)]">
        Takes 2 minutes. Works for any goal, any domain.
      </p>
    </div>
  );
}
s;
