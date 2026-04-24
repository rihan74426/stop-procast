"use client";

import { useState } from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function EmailExportModal({ open, onClose, project }) {
  const { t } = useI18n();
  const { isSignedIn } = useUser();
  const [email, setEmail] = useState("");
  const [format, setFormat] = useState("markdown");
  const [status, setStatus] = useState("idle");

  const isValidEmail = email.includes("@") && email.includes(".");

  const handleSend = async () => {
    if (!isValidEmail || !project) return;
    setStatus("sending");
    try {
      const encoded = btoa(
        encodeURIComponent(JSON.stringify(project)).replace(
          /%([0-9A-F]{2})/g,
          (_, p1) => String.fromCharCode(parseInt(p1, 16))
        )
      );
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
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setEmail("");
    onClose();
  };

  const formats = [
    { id: "markdown", label: "Markdown" },
    { id: "json", label: "JSON" },
    { id: "both", label: "Both" },
  ];

  // Auth gate for non-signed-in users
  if (!isSignedIn) {
    return (
      <Modal
        open={open}
        onClose={handleClose}
        title="Export via Email"
        size="sm"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-14 h-14 rounded-[var(--r-xl)] bg-[var(--violet-bg)] flex items-center justify-center text-2xl">
              ✉️
            </div>
            <div>
              <p className="font-display font-semibold text-lg text-[var(--text-primary)] mb-1">
                Sign in to export
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
                Create a free account to export your plan — and keep all your
                work saved across devices.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full mt-1">
              <SignUpButton mode="modal">
                <button
                  onClick={handleClose}
                  className="w-full h-11 rounded-[var(--r-md)] bg-[var(--violet)] text-white text-sm font-semibold hover:bg-[var(--violet-dim)] transition-colors active:scale-[0.98]"
                >
                  Create free account
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  onClick={handleClose}
                  className="w-full h-11 rounded-[var(--r-md)] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Sign in
                </button>
              </SignInButton>
            </div>

            <p className="text-xs text-[var(--text-tertiary)]">
              Free forever. No credit card required.
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  // Signed-in: show full export form
  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("export_email_title")}
      size="sm"
    >
      <div className="flex flex-col gap-5">
        {status === "success" ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--emerald-bg)] flex items-center justify-center text-2xl">
              ✓
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] mb-1">
                {t("export_email_success")}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Sent to <strong>{email}</strong>
              </p>
            </div>
            <Button onClick={handleClose} variant="ghost" size="sm">
              Close
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {t("export_email_desc")}
            </p>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                {t("export_email_format")}
              </label>
              <div className="flex gap-2">
                {formats.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={[
                      "flex-1 py-2 text-xs font-medium rounded-[var(--r-md)] border transition-all",
                      format === f.id
                        ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--text-primary)]",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                {t("export_email_label")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setStatus("idle");
                }}
                placeholder={t("export_email_placeholder")}
                onKeyDown={(e) =>
                  e.key === "Enter" && isValidEmail && handleSend()
                }
                className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)] focus:border-[var(--violet)] transition-all"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-[var(--coral)]">
                {t("export_email_error")}
              </p>
            )}

            <div className="rounded-[var(--r-md)] bg-[var(--bg-subtle)] px-3 py-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-[var(--r-sm)] bg-[var(--violet-bg)] flex items-center justify-center text-sm shrink-0">
                📦
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {project?.projectTitle || "Untitled"}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {project?.tasks?.length || 0} tasks ·{" "}
                  {project?.phases?.length || 0} phases
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={handleClose} size="sm">
                Cancel
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
