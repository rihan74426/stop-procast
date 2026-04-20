"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { useTheme } from "@/lib/theme";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { clearAll } from "@/lib/persistence";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const projects = useProjectStore((s) => s.projects);
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("sp_api_key") ?? ""
      : ""
  );
  const [saved, setSaved] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSaveApiKey = () => {
    localStorage.setItem("sp_api_key", apiKey);
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
    clearAll();
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

              {/* API key */}
              <Section title="AI Integration">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  StopProcast uses the Anthropic API to generate project plans.
                  Add your API key below. It`s stored locally in your browser
                  and never sent to any server other than Anthropic.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="flex-1 h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                  <Button
                    onClick={handleSaveApiKey}
                    variant={saved ? "subtle" : "primary"}
                    size="md"
                  >
                    {saved ? "✓ Saved" : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-2">
                  Get your key at{" "}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--violet)] hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </Section>

              {/* Data */}
              <Section title="Data">
                <Row
                  label="Export all projects"
                  description={`${projects.length} project${
                    projects.length !== 1 ? "s" : ""
                  } stored locally`}
                >
                  <Button variant="ghost" size="sm" onClick={handleExportAll}>
                    Export JSON
                  </Button>
                </Row>
                <Row
                  label="Clear all data"
                  description="Permanently delete all projects. Cannot be undone."
                >
                  <Button variant="danger" size="sm" onClick={handleClearAll}>
                    {confirmClear ? "Click again to confirm" : "Clear all"}
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
                  Version 0.1.0 · All data stored locally in your browser
                </p>
              </Section>
            </div>
          </div>
        </main>
      </div>
    </div>
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
