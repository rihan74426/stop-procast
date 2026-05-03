// PATCH: Add this import at the top of app/settings/page.jsx
// import { NotificationSettings } from "@/components/ui/NotificationSettings";

// PATCH: Add this section inside the settings page, after the Appearance section:
/*
<Section title="Notifications">
  <p className="text-sm text-[var(--text-secondary)] -mt-1 leading-relaxed">
    Get a morning reminder to stay on track with your goals.
  </p>
  <NotificationSettings />
</Section>
*/

// Full updated settings page with notifications section:
"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/lib/store/projectStore";
import { useTheme } from "@/lib/theme";
import { TopBar } from "@/components/layout/Topbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { clearLocal } from "@/lib/persistence";
import { DataProvider } from "@/components/providers/DataProvider";
import { useI18n } from "@/lib/i18n";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";
import { AI_MODELS, getStoredModel, setStoredModel } from "@/lib/ai/models";
import { loadUserProfile, saveUserProfile } from "@/lib/userProfile";
import { NotificationSettings } from "@/components/ui/NotificationSettings";

function SettingsContent() {
  const { theme, toggle } = useTheme();
  const { t, locale, changeLocale } = useI18n();
  const projects = useProjectStore((s) => s.projects);

  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedModel, setSelectedModel] = useState("model1");
  const [profile, setProfile] = useState({
    profession: "",
    skills: "",
    experienceLevel: "intermediate",
    responseStyle: "detailed",
    extraContext: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setSelectedModel(getStoredModel());
    setProfile(loadUserProfile());
  }, []);

  const handleModelChange = (id) => {
    setSelectedModel(id);
    setStoredModel(id);
  };

  const handleProfileChange = (key, val) =>
    setProfile((p) => ({ ...p, [key]: val }));

  const handleSaveProfile = () => {
    saveUserProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleExportAll = () => {
    const data = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), projects },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum-backup-${Date.now()}.json`;
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <h1 className="font-display font-semibold text-xl sm:text-2xl text-[var(--text-primary)] mb-6 sm:mb-8">
              {t("settings_title")}
            </h1>

            <div className="flex flex-col gap-4 sm:gap-6 pb-4">
              {/* Appearance */}
              <Section title={t("settings_appearance")}>
                <Row
                  label={t("settings_theme")}
                  description={t("settings_theme_desc")}
                >
                  <Button variant="ghost" size="sm" onClick={toggle}>
                    {theme === "dark"
                      ? t("settings_light")
                      : t("settings_dark")}
                  </Button>
                </Row>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                    {t("settings_language")}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mb-3">
                    {t("settings_language_desc")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => changeLocale(loc)}
                        className={[
                          "px-3 py-1.5 text-xs rounded-[var(--r-full)] border transition-all font-medium",
                          loc === locale
                            ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--violet-dim)]",
                        ].join(" ")}
                      >
                        {LOCALE_NAMES[loc]}
                      </button>
                    ))}
                  </div>
                </div>
              </Section>

              {/* Notifications */}
              <Section title="Notifications">
                <p className="text-sm text-[var(--text-secondary)] -mt-1 leading-relaxed">
                  Get a morning reminder to stay on track with your daily tasks.
                </p>
                <NotificationSettings />
              </Section>

              {/* AI Model */}
              <Section title={t("settings_ai_model")}>
                <p className="text-sm text-[var(--text-secondary)] -mt-1 leading-relaxed">
                  {t("settings_ai_model_desc")}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {AI_MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={[
                          "text-left p-3.5 rounded-[var(--r-lg)] border-2 transition-all",
                          isSelected
                            ? "border-[var(--violet)] bg-[var(--violet-bg)]"
                            : "border-[var(--border)] hover:border-[var(--slate-4,#c8c8d4)] bg-[var(--bg-surface)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {model.name}
                          </span>
                          <span
                            className={[
                              "text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                              isSelected
                                ? "bg-[var(--violet)] text-white"
                                : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]",
                            ].join(" ")}
                          >
                            {model.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-snug">
                          {model.description}
                        </p>
                        {isSelected && (
                          <p className="text-[11px] text-[var(--violet-dim)] font-medium mt-2">
                            ✓ Currently active
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Your Profile */}
              <Section title={t("settings_ai_profile")}>
                <p className="text-sm text-[var(--text-secondary)] -mt-1 leading-relaxed">
                  {t("settings_ai_profile_desc")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Field label={t("settings_profession")}>
                    <input
                      type="text"
                      value={profile.profession}
                      onChange={(e) =>
                        handleProfileChange("profession", e.target.value)
                      }
                      placeholder={t("settings_profession_placeholder")}
                      className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                    />
                  </Field>
                  <Field label={t("settings_skills")}>
                    <input
                      type="text"
                      value={profile.skills}
                      onChange={(e) =>
                        handleProfileChange("skills", e.target.value)
                      }
                      placeholder={t("settings_skills_placeholder")}
                      className="w-full h-10 px-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                    />
                  </Field>
                </div>

                <Field label={t("settings_experience")}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["beginner", "intermediate", "advanced", "expert"].map(
                      (level) => (
                        <button
                          key={level}
                          onClick={() =>
                            handleProfileChange("experienceLevel", level)
                          }
                          className={[
                            "py-2 text-xs rounded-[var(--r-md)] border font-medium capitalize transition-all",
                            profile.experienceLevel === level
                              ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--text-primary)]",
                          ].join(" ")}
                        >
                          {t(`settings_exp_${level}`)}
                        </button>
                      ),
                    )}
                  </div>
                </Field>

                <Field label={t("settings_response_style")}>
                  <div className="grid grid-cols-2 gap-2">
                    {["concise", "detailed", "friendly", "technical"].map(
                      (style) => (
                        <button
                          key={style}
                          onClick={() =>
                            handleProfileChange("responseStyle", style)
                          }
                          className={[
                            "py-2 px-3 text-xs rounded-[var(--r-md)] border font-medium text-left transition-all",
                            profile.responseStyle === style
                              ? "bg-[var(--violet)] text-white border-[var(--violet)]"
                              : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--violet)] hover:text-[var(--text-primary)]",
                          ].join(" ")}
                        >
                          {t(`settings_style_${style}`)}
                        </button>
                      ),
                    )}
                  </div>
                </Field>

                <Field label={t("settings_extra_context")}>
                  <textarea
                    rows={3}
                    value={profile.extraContext}
                    onChange={(e) =>
                      handleProfileChange("extraContext", e.target.value)
                    }
                    placeholder={t("settings_extra_placeholder")}
                    className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-base)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--violet)]"
                  />
                </Field>

                <div className="flex justify-end">
                  <Button
                    variant={profileSaved ? "subtle" : "primary"}
                    onClick={handleSaveProfile}
                  >
                    {profileSaved
                      ? t("settings_profile_saved")
                      : t("settings_save_profile")}
                  </Button>
                </div>
              </Section>

              {/* Data */}
              <Section title={t("settings_data")}>
                <Row
                  label={t("settings_export_all")}
                  description={
                    projects.length !== 1
                      ? t("settings_export_desc_plural", { n: projects.length })
                      : t("settings_export_desc", { n: projects.length })
                  }
                >
                  <Button variant="ghost" size="sm" onClick={handleExportAll}>
                    {t("settings_export_json")}
                  </Button>
                </Row>
                <Row
                  label={t("settings_clear_cache")}
                  description={t("settings_clear_desc")}
                >
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleClearAll}
                    className="shrink-0"
                  >
                    {confirmClear
                      ? t("settings_clear_confirm")
                      : t("settings_clear_btn")}
                  </Button>
                </Row>
              </Section>

              {/* About */}
              <Section title={t("settings_about")}>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {t("settings_about_desc")}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {t("settings_version")}
                </p>
              </Section>
            </div>
          </div>
          <Footer />
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
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
          {title}
        </p>
      </div>
      <div className="px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-4 sm:gap-5">
        {children}
      </div>
    </div>
  );
}

function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </p>
        {description && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {children}
    </div>
  );
}
