"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { createProject } from "@/lib/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FiFileMinus, FiFilePlus } from "react-icons/fi";

/**
 * ImportProjectModal — accepts a Momentum JSON export and imports it as a new project.
 * Strips old IDs and timestamps so it behaves like a fresh project.
 */
export function ImportProjectModal({ open, onClose }) {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);
  const fileRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | parsing | error | success
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const [parsed, setParsed] = useState(null);

  const reset = () => {
    setStatus("idle");
    setErrorMsg("");
    setPreview(null);
    setParsed(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setStatus("error");
      setErrorMsg(
        "Only .json files are supported. Export from project → Export JSON first."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);

        // Support both direct project objects and the backup format
        // { version, exportedAt, projects: [...] } (exported from Settings)
        // or a single project object
        let project = null;
        if (raw.projects && Array.isArray(raw.projects)) {
          // Backup file — take first project or show picker (for now, first)
          project = raw.projects[0];
        } else if (raw.projectTitle !== undefined) {
          project = raw;
        } else {
          throw new Error(
            "Unrecognised format. File must be a Momentum project export."
          );
        }

        if (!project?.projectTitle) {
          throw new Error(
            "Project has no title. Is this a valid Momentum export?"
          );
        }

        setParsed(project);
        setPreview({
          title: project.projectTitle,
          goal: project.oneLineGoal,
          phases: project.phases?.length ?? 0,
          tasks: project.tasks?.length ?? 0,
          timeline: project.timeline ?? "",
        });
        setStatus("ready");
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setStatus("importing");
    try {
      // Re-hydrate as a fresh project — new ID, new timestamps, reset progress
      const fresh = createProject({
        // Keep all AI-generated content
        projectTitle: parsed.projectTitle,
        oneLineGoal: parsed.oneLineGoal,
        problemStatement: parsed.problemStatement ?? "",
        targetUser: parsed.targetUser ?? "",
        successCriteria: parsed.successCriteria ?? [],
        scope: parsed.scope ?? { mustHave: [], niceToHave: [], outOfScope: [] },
        scopeLevel: parsed.scopeLevel ?? "standard",
        phases: parsed.phases ?? [],
        tasks: (parsed.tasks ?? []).map((t) => ({
          ...t,
          status: "todo",
          completedAt: null,
        })),
        blockers: [],
        resources: parsed.resources ?? [],
        toolsSuggested: parsed.toolsSuggested ?? [],
        estimatedEffort: parsed.estimatedEffort ?? "",
        timeline: parsed.timeline ?? "",
        reviewQuestions: parsed.reviewQuestions ?? [],
        dailyNextAction: parsed.dailyNextAction ?? "",
      });

      const id = await addProject(fresh);
      setStatus("success");
      setTimeout(() => {
        handleClose();
        router.push(`/project/${id}`);
      }, 800);
    } catch {
      setStatus("error");
      setErrorMsg("Failed to import project. Please try again.");
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Project" size="md">
      <div className="flex flex-col gap-5">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--emerald-bg)] flex items-center justify-center text-2xl">
              ✓
            </div>
            <p className="font-semibold text-[var(--text-primary)]">
              Project imported!
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Taking you there now…
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Import a project you previously exported as JSON. Tasks will be
              reset to{" "}
              <span className="font-medium text-[var(--text-primary)]">
                todo
              </span>{" "}
              so you can start fresh with the same plan.
            </p>

            {/* Drop zone / file picker */}
            <label
              className={[
                "flex flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border-2 border-dashed px-6 py-8 cursor-pointer transition-all",
                status === "ready"
                  ? "border-[var(--emerald)] bg-[var(--emerald-bg)]"
                  : "border-[var(--border)] hover:border-[var(--violet)] hover:bg-[var(--violet-bg)]",
              ].join(" ")}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFile}
              />
              {status === "ready" ? (
                <>
                  <span className="text-2xl">✓</span>
                  <p className="text-sm font-medium text-[var(--emerald-dim)]">
                    {preview.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {preview.phases} phases · {preview.tasks} tasks
                    {preview.timeline ? ` · ${preview.timeline}` : ""}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] underline">
                    Click to choose a different file
                  </p>
                </>
              ) : (
                <>
                  <span className="text-3xl">
                    <FiFilePlus />
                  </span>
                  <p className="text-sm text-[var(--text-secondary)] text-center">
                    Click to select a{" "}
                    <span className="font-medium text-[var(--text-primary)]">
                      .json
                    </span>{" "}
                    export file
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Exported from Project → Export JSON
                  </p>
                </>
              )}
            </label>

            {status === "error" && (
              <div className="rounded-[var(--r-md)] border border-[var(--coral)] bg-[var(--coral-bg)] px-4 py-3 text-sm text-[var(--coral)]">
                {errorMsg}
              </div>
            )}

            {status === "ready" && preview && (
              <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
                <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider font-medium mb-1">
                  Preview
                </p>
                <p className="font-display font-semibold text-base text-[var(--text-primary)]">
                  {preview.title}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {preview.goal}
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                    {preview.phases} phases
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                    {preview.tasks} tasks reset to todo
                  </span>
                  {preview.timeline && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      {preview.timeline}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={status !== "ready"}
                loading={status === "importing"}
              >
                {`${status === "importing" ? "Importing" : "Import"} project`}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
