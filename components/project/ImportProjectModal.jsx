"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjectStore } from "@/lib/store/projectStore";
import { createProject } from "@/lib/schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { FiFilePlus, FiCheckCircle } from "react-icons/fi";

export function ImportProjectModal({ open, onClose }) {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);
  const fileRef = useRef(null);
  const { t } = useI18n();

  const [status, setStatus] = useState("idle");
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
      setErrorMsg(t("import_error_only_json"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);
        let project = null;
        if (raw.projects && Array.isArray(raw.projects)) {
          project = raw.projects[0];
        } else if (raw.projectTitle !== undefined) {
          project = raw;
        } else {
          throw new Error(t("import_error_format"));
        }
        if (!project?.projectTitle) throw new Error(t("import_error_no_title"));
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
        setErrorMsg(err?.message || t("import_error_parse"));
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setStatus("importing");
    try {
      const fresh = createProject({
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
      setErrorMsg(t("import_error_import"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("import_title")}
      size="md"
    >
      <div className="flex flex-col gap-5">
        {/* ── Success ── */}
        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--emerald-bg)" }}
            >
              <FiCheckCircle size={24} style={{ color: "var(--emerald)" }} />
            </div>
            <p
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("import_success_title")}
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("import_success_desc")}
            </p>
          </div>
        ) : (
          <>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("import_desc")}
            </p>

            {/* Drop zone */}
            <label
              className="flex flex-col items-center justify-center gap-3 rounded-[var(--r-lg)] border-2 border-dashed px-6 py-8 cursor-pointer transition-all"
              style={{
                borderColor:
                  status === "ready" ? "var(--emerald)" : "var(--border)",
                background:
                  status === "ready" ? "var(--emerald-bg)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (status !== "ready")
                  e.currentTarget.style.borderColor = "var(--violet)";
              }}
              onMouseLeave={(e) => {
                if (status !== "ready")
                  e.currentTarget.style.borderColor = "var(--border)";
              }}
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
                  <FiCheckCircle
                    size={28}
                    style={{ color: "var(--emerald)" }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--emerald-dim)" }}
                  >
                    {preview.title}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {preview.phases} {t("import_phases")} · {preview.tasks}{" "}
                    {t("import_tasks")}
                    {preview.timeline ? ` · ${preview.timeline}` : ""}
                  </p>
                  <p
                    className="text-xs underline"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {t("import_dropzone_different")}
                  </p>
                </>
              ) : (
                <>
                  <FiFilePlus
                    size={28}
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <p
                    className="text-sm text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("import_dropzone_click")}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {t("import_dropzone_hint")}
                  </p>
                </>
              )}
            </label>

            {/* Error */}
            {status === "error" && (
              <div
                className="rounded-[var(--r-md)] border px-4 py-3 text-sm"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--coral) 40%, transparent)",
                  background: "var(--coral-bg)",
                  color: "var(--coral)",
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* Preview card */}
            {status === "ready" && preview && (
              <div
                className="rounded-[var(--r-lg)] border p-4 flex flex-col gap-2"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {t("import_preview_label")}
                </p>
                <p
                  className="font-display font-semibold text-base"
                  style={{ color: "var(--text-primary)" }}
                >
                  {preview.title}
                </p>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {preview.goal}
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    `${preview.phases} ${t("import_phases")}`,
                    `${preview.tasks} ${t("import_tasks")}`,
                    ...(preview.timeline ? [preview.timeline] : []),
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "var(--bg-muted)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleClose}>
                {t("import_cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={status !== "ready"}
                loading={status === "importing"}
              >
                {status === "importing"
                  ? t("import_importing")
                  : t("import_title")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
