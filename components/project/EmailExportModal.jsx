"use client";

import { useState } from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FiCheckCircle } from "react-icons/fi";

function encodeProjectData(project) {
  try {
    const json = JSON.stringify(project);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

export function EmailExportModal({ open, onClose, project }) {
  const { t } = useI18n();
  const { isSignedIn, user } = useUser();
  const [email, setEmail] = useState(
    user?.emailAddresses?.[0]?.emailAddress || ""
  );
  const [format, setFormat] = useState("markdown");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = async () => {
    if (!isValidEmail || !project) return;
    setStatus("sending");
    setErrorMsg("");
    try {
      const encoded = encodeProjectData(project);
      if (!encoded) {
        setStatus("error");
        setErrorMsg(t("common_error"));
        return;
      }
      const res = await fetch("/api/export-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          projectId: project.id,
          format,
          projectData: encoded,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(
          data.error ||
            (res.status === 503
              ? "Email service not configured. Please use PDF or Markdown export."
              : t("export_email_error"))
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("common_error"));
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setErrorMsg("");
    setEmail(user?.emailAddresses?.[0]?.emailAddress || "");
    onClose();
  };

  // ── Sign-in gate ──────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title={t("export_email_title")}
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="w-14 h-14 rounded-[var(--r-xl)] flex items-center justify-center"
              style={{ background: "var(--violet-bg)" }}
            >
              <FiCheckCircle size={26} style={{ color: "var(--violet)" }} />
            </div>
            <div>
              <p
                className="font-display font-semibold text-lg mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {t("export_email_gate_title")}
              </p>
              <p
                className="text-sm leading-relaxed max-w-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("export_email_gate_desc")}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-1">
              <SignUpButton mode="modal">
                <button
                  onClick={handleClose}
                  className="w-full h-11 rounded-[var(--r-md)] text-white text-sm font-semibold transition-colors"
                  style={{ background: "var(--violet)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--violet-dim)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--violet)")
                  }
                >
                  {t("export_email_gate_signup")}
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  onClick={handleClose}
                  className="w-full h-11 rounded-[var(--r-md)] border text-sm transition-colors"
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
                  {t("export_email_gate_signin")}
                </button>
              </SignInButton>
            </div>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {t("export_email_gate_free")}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("export_email_title")}
      size="sm"
    >
      <div className="flex flex-col gap-5">
        {/* ── Success state ── */}
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--emerald-bg)" }}
            >
              <FiCheckCircle size={24} style={{ color: "var(--emerald)" }} />
            </div>
            <div>
              <p
                className="font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {t("export_email_success")}
              </p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("export_email_success_to")} <strong>{email}</strong>
              </p>
            </div>
            <Button onClick={handleClose} variant="ghost" size="sm">
              {t("export_email_close")}
            </Button>
          </div>
        ) : (
          <>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("export_email_desc")}
            </p>

            {/* Format picker */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {t("export_email_format")}
              </label>
              <div className="flex gap-2">
                {[
                  { id: "markdown", label: "Markdown" },
                  { id: "json", label: "JSON" },
                  { id: "both", label: "Both" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className="flex-1 py-2 text-xs font-medium rounded-[var(--r-md)] border transition-all"
                    style={{
                      background:
                        format === f.id ? "var(--violet)" : "transparent",
                      color:
                        format === f.id ? "white" : "var(--text-secondary)",
                      borderColor:
                        format === f.id ? "var(--violet)" : "var(--border)",
                    }}
                    onMouseEnter={(e) => {
                      if (format !== f.id) {
                        e.currentTarget.style.borderColor = "var(--violet)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (format !== f.id) {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email input */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                {t("export_email_label")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMsg("");
                  }
                }}
                placeholder={t("export_email_placeholder")}
                onKeyDown={(e) =>
                  e.key === "Enter" && isValidEmail && handleSend()
                }
                className="w-full h-10 px-3 rounded-[var(--r-md)] border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:ring-offset-1"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--text-tertiary) 40%, transparent)",
                  background: "var(--bg-base)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Error */}
            {status === "error" && (
              <div
                className="rounded-[var(--r-md)] border px-3 py-2.5 text-sm"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--coral) 40%, transparent)",
                  background: "var(--coral-bg)",
                  color: "var(--coral)",
                }}
              >
                {errorMsg || t("export_email_error")}
              </div>
            )}

            {/* Project preview */}
            <div
              className="rounded-[var(--r-md)] border px-3 py-2.5 flex items-center gap-3"
              style={{
                background: "var(--bg-subtle)",
                borderColor: "var(--border)",
              }}
            >
              <div
                className="w-8 h-8 rounded-[var(--r-sm)] flex items-center justify-center text-sm shrink-0"
                style={{ background: "var(--violet-bg)" }}
              >
                <FiCheckCircle size={14} style={{ color: "var(--violet)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {project?.projectTitle || "Untitled"}
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {project?.tasks?.length || 0}{" "}
                  {t("export_email_project_tasks")} ·{" "}
                  {project?.phases?.length || 0}{" "}
                  {t("export_email_project_phases")}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleClose} size="sm">
                {t("export_email_cancel")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={!isValidEmail}
                loading={status === "sending"}
                size="sm"
              >
                {t("export_email_send")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
