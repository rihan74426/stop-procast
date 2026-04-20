"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { useTheme } from "@/lib/theme";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { clearLocal } from "@/lib/persistence";
import { DataProvider } from "@/components/providers/DataProvider";

function SettingsContent() {
  const { theme, toggle } = useTheme();
  const projects = useProjectStore((s) => s.projects);

  // Never read localStorage during render — always use useEffect
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setOpenrouterKey(localStorage.getItem("sp_openrouter_key") ?? "");
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem("sp_openrouter_key", openrouterKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportAll = () => {
    const data = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), projects },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stopprocast-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearLocal();
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <h1 className="font-display font-semibold text-2xl text-[var(--text-primary)] mb-8">
              Settings
            </h1>

            <div className="flex flex-col gap-6">
              {/* Appearance */}
              <Section title="Appearance">
                <Row
                  label="Theme"
                  description="Switch between light and dark mode"
                >
                  <Button variant="ghost" size="sm" onClick={toggle}>
                    {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
                  </Button>
                </Row>
              </Section>

              {/* AI */}
              <Section title="AI Integration">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  StopProcast uses OpenRouter to generate project plans. Your
                  key is stored in your browser only. Get a free key at{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--violet)] hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={openrouterKey}
                    onChange={(e) => setOpenrouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="flex-1 h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                  <Button
                    onClick={handleSaveKey}
                    variant={saved ? "subtle" : "primary"}
                    size="md"
                  >
                    {saved ? "✓ Saved" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Model is set via{" "}
                  <code className="font-mono">OPENROUTER_MODEL</code> in{" "}
                  <code className="font-mono">.env.local</code>. Default: Gemini
                  2.0 Flash (free).
                </p>
              </Section>

              {/* Data */}
              <Section title="Data">
                <Row
                  label="Export all projects"
                  description={`${projects.length} project${
                    projects.length !== 1 ? "s" : ""
                  } saved`}
                >
                  <Button variant="ghost" size="sm" onClick={handleExportAll}>
                    Export JSON
                  </Button>
                </Row>
                <Row
                  label="Clear local cache"
                  description="Removes local cache only. Your data in MongoDB is preserved."
                >
                  <Button variant="danger" size="sm" onClick={handleClearAll}>
                    {confirmClear ? "Click again to confirm" : "Clear cache"}
                  </Button>
                </Row>
              </Section>

              {/* About */}
              <Section title="About">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  StopProcast is a project execution OS. Drop in an idea, get an
                  AI-generated blueprint, and let the pressure system keep you
                  moving until it ships.
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-3">
                  Version 0.1.0 · AI by OpenRouter · Auth by Clerk · DB by
                  MongoDB
                </p>
              </Section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DataProvider>
      <SettingsContent />
    </DataProvider>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {title}
        </p>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
