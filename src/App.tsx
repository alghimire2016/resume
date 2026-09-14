// src/App.tsx

import { useState, useEffect } from "react";
import ResumeCreator from "./pages/ResumeCreator";
import ATSChecker from "./pages/ATSChecker";
import ResumeGuide from "./pages/ResumeGuide";
import AISettingsModal from "./components/AISettingsModal";
import AIStatusBadge from "./components/AIStatusBadge";
import { useTheme } from "./theme";
import { hasApiKey, OPEN_SETTINGS_EVENT, AI_KEY_EVENT } from "./utils/aiKey";

type Tab = "create" | "check" | "guide";

function App() {
  const [tab, setTab] = useState<Tab>("create");
  const { theme, toggle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyPresent, setKeyPresent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const present = await hasApiKey();
      if (!cancelled) setKeyPresent(present);
    };
    refresh();
    window.addEventListener(AI_KEY_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(AI_KEY_EVENT, refresh);
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) hasApiKey().then(setKeyPresent);
  }, [settingsOpen]);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, handler);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handler);
  }, []);

  const tabBtn = (isActive: boolean): React.CSSProperties => ({
    padding: "0.75rem 1rem",
    background: "transparent",
    border: "none",
    borderBottom: isActive
      ? "2px solid var(--accent)"
      : "2px solid transparent",
    color: isActive ? "var(--accent)" : "var(--text-secondary)",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    marginBottom: "-1px",
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0.7rem 0",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "var(--accent)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                R
              </span>
              <span>Resume Studio</span>
            </div>

            <nav style={{ display: "flex" }}>
              <button
                onClick={() => setTab("create")}
                style={tabBtn(tab === "create")}
              >
                Create Resume
              </button>
              <button
                onClick={() => setTab("check")}
                style={tabBtn(tab === "check")}
              >
                Check ATS
              </button>
              <button
                onClick={() => setTab("guide")}
                style={tabBtn(tab === "guide")}
              >
                Guide
              </button>
            </nav>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AIStatusBadge
              hasKey={keyPresent}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <button
              onClick={() => setSettingsOpen(true)}
              title="AI Settings"
              aria-label="AI Settings"
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                cursor: "pointer",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            <button
              onClick={toggle}
              aria-label="Toggle theme"
              title={theme === "light" ? "Switch to dark" : "Switch to light"}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
          </div>
        </div>
      </header>

      <main>
        {tab === "create" && <ResumeCreator />}
        {tab === "check" && <ATSChecker />}
        {tab === "guide" && <ResumeGuide />}
      </main>

      <AISettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
