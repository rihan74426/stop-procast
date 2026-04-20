"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useProjectStore } from "@/lib/store/projectStore";
import { ConfettiBlast } from "@/components/completion/ConfettiBlast";
import { ProjectStats } from "@/components/completion/ProjectStats";
import { Postmortem } from "@/components/completion/Postmortem";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";

export default function CompletePage({ params }) {
  const { id } = use(params);
  const project = useProjectStore((s) => s.getProject(id));
  const [section, setSection] = useState("celebrate"); // celebrate | retro | done

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[var(--text-secondary)]">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] flex flex-col">
      <TopBar />
      <ConfettiBlast />

      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {section === "celebrate" && (
            <div className="flex flex-col gap-8 text-center items-center">
              {/* Hero */}
              <div>
                <div className="text-6xl mb-4">🚀</div>
                <h1 className="font-display font-bold text-4xl text-[var(--text-primary)] mb-3">
                  You shipped it.
                </h1>
                <p className="text-lg text-[var(--text-secondary)] max-w-md">
                  <strong className="text-[var(--text-primary)]">
                    {project.projectTitle}
                  </strong>{" "}
                  is done. Most people never finish what they start. You did.
                </p>
              </div>

              {/* Stats */}
              <div className="w-full text-left">
                <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider mb-4 text-center">
                  Project stats
                </p>
                <ProjectStats project={project} />
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setSection("retro")}>
                  Write retrospective →
                </Button>
                <Button
                  variant="emerald"
                  size="lg"
                  onClick={() => setSection("done")}
                >
                  All done ✓
                </Button>
              </div>
            </div>
          )}

          {section === "retro" && (
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setSection("celebrate")}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                ← Back
              </button>
              <Postmortem project={project} onDone={() => setSection("done")} />
            </div>
          )}

          {section === "done" && (
            <div className="flex flex-col gap-8 text-center items-center">
              <div>
                <div className="text-5xl mb-4">🎯</div>
                <h2 className="font-display font-bold text-3xl text-[var(--text-primary)] mb-3">
                  What`s next?
                </h2>
                <p className="text-[var(--text-secondary)] max-w-sm">
                  Your retrospective is saved. Build on this momentum.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <Link href="/new" className="flex-1">
                  <Button size="lg" className="w-full justify-center">
                    Start next project
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full justify-center"
                  >
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
