// src/components/AISettingsModal.tsx

import { useEffect, useState } from "react";
import { PROVIDERS, getProvider } from "../utils/aiProviders";
import type { ProviderId } from "../utils/aiProviders";
import {
  getStoredMeta,
  saveConfig,
  clearConfig,
  lockNow,
  verifyConfig,
  getInactivityMinutes,
  setInactivityMinutes,
} from "../utils/aiKey";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface MetaInfo {
  providerId: ProviderId;
  model: string;
  maskedKey: string | null;
  verifiedAt: number;
  isEnvFallback: boolean;
}

const AISettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [editing, setEditing] = useState(false);

  const [providerId, setProviderId] = useState<ProviderId>("gemini");
  const [model, setModel] = useState("gemini-3.6-flash");
  const [baseUrl, setBaseUrl] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [customModel, setCustomModel] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);

  const [inactivityMins, setInactivityMinsState] = useState(
    getInactivityMinutes(),
  );

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoadingMeta(true);
      const m = await getStoredMeta();
      setMeta(m);
      if (m) {
        setProviderId(m.providerId);
        const preset = getProvider(m.providerId);
        setBaseUrl(preset.baseUrl);
        setModel(m.model);
        setEditing(m.isEnvFallback);
      } else {
        const preset = getProvider("gemini");
        setProviderId("gemini");
        setBaseUrl(preset.baseUrl);
        setModel(preset.defaultModel);
        setEditing(true);
      }
      setKey("");
      setShowKey(false);
      setResult(null);
      setCustomModel(false);
      setInactivityMinsState(getInactivityMinutes());
      setLoadingMeta(false);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const preset = getProvider(providerId);

  const handleProviderChange = (id: ProviderId) => {
    setProviderId(id);
    const p = getProvider(id);
    setBaseUrl(p.baseUrl);
    setModel(p.defaultModel);
    setCustomModel(false);
    setResult(null);
  };

  const handleVerifyAndSave = async () => {
    setVerifying(true);
    setResult(null);
    const r = await verifyConfig({
      providerId,
      model: model.trim(),
      baseUrl: baseUrl.trim(),
      key: preset.requiresKey ? key.trim() : null,
    });
    if (r.ok) {
      await saveConfig({
        providerId,
        model: model.trim(),
        baseUrl: baseUrl.trim(),
        key: preset.requiresKey ? key.trim() : null,
      });
      const m = await getStoredMeta();
      setMeta(m);
      setKey("");
      setEditing(false);
      setResult({
        kind: "ok",
        message: "Connected — key verified successfully",
      });
      setTimeout(() => setResult(null), 2500);
    } else {
      setResult({ kind: "error", message: r.error || "Verification failed" });
    }
    setVerifying(false);
  };

  const handleRemove = async () => {
    if (
      !confirm(
        "Remove the saved AI configuration? AI features will be disabled.",
      )
    )
      return;
    await clearConfig();
    setMeta(null);
    setEditing(true);
    setKey("");
    setResult(null);
  };

  const handleLockNow = async () => {
    await lockNow();
    setMeta(null);
    setEditing(true);
    setKey("");
    setResult({
      kind: "ok",
      message: "Locked — keys cleared from this session.",
    });
    setTimeout(() => setResult(null), 2000);
  };

  const handleInactivityChange = (mins: number) => {
    setInactivityMinutes(mins);
    setInactivityMinsState(mins);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI Settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        className="animate-fade-slide"
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--bg-surface, #fff)",
          border: "1px solid var(--border, #e2e2e5)",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.1rem 1.25rem",
            borderBottom: "1px solid var(--border, #e2e2e5)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary, #1a1a1a)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            ✨ AI Settings
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary, #6b6b70)",
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem" }}>
          {loadingMeta ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading…
            </div>
          ) : (
            <>
              {/* ---- Empty state (first-time user) ---- */}
              {!meta && editing && (
                <div
                  style={{
                    padding: "1rem 1.15rem",
                    background: "var(--accent-subtle, #f0edfc)",
                    border: "1px solid transparent",
                    borderRadius: 10,
                    marginBottom: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary, #1a1a1a)",
                      marginBottom: 4,
                    }}
                  >
                    Bring your own AI
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--text-secondary, #6b6b70)",
                      lineHeight: 1.55,
                    }}
                  >
                    This app doesn't include AI by default. You connect your own
                    API key, and it's used only for your requests. Nothing is
                    shared with anyone beyond the encrypted key stored in this
                    browser.
                  </div>
                </div>
              )}

              {/* ---- Connected state ---- */}
              {meta && !editing && (
                <div
                  style={{
                    background: "var(--success-subtle, #e8f5ee)",
                    border: "1px solid rgba(46, 158, 91, 0.25)",
                    borderRadius: 8,
                    padding: "0.9rem 1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "2px 9px",
                        borderRadius: 999,
                        background: "var(--success, #2e9e5b)",
                        color: "#fff",
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      ✓ Connected
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {getProvider(meta.providerId).label}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "4px 12px",
                      fontSize: 12.5,
                      color: "var(--text-secondary, #6b6b70)",
                      marginBottom: 10,
                    }}
                  >
                    <span>Model:</span>
                    <span
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      {meta.model}
                    </span>
                    {meta.maskedKey && (
                      <>
                        <span>Key:</span>
                        <span
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            color: "var(--text-primary)",
                          }}
                        >
                          {meta.maskedKey}
                        </span>
                      </>
                    )}
                    {meta.isEnvFallback ? (
                      <>
                        <span>Source:</span>
                        <span>Environment variable</span>
                      </>
                    ) : (
                      meta.verifiedAt > 0 && (
                        <>
                          <span>Last verified:</span>
                          <span>
                            {new Date(meta.verifiedAt).toLocaleString()}
                          </span>
                        </>
                      )
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setEditing(true)}
                      style={smallOutlineBtn}
                    >
                      Replace
                    </button>
                    <button
                      onClick={handleLockNow}
                      style={smallOutlineBtn}
                      title="Clear keys from this session"
                    >
                      🔒 Lock now
                    </button>
                    <button onClick={handleRemove} style={smallDangerBtn}>
                      Remove key
                    </button>
                  </div>
                </div>
              )}

              {/* ---- Edit form ---- */}
              {(!meta || editing) && (
                <>
                  <Field label="Provider">
                    <select
                      value={providerId}
                      onChange={(e) =>
                        handleProviderChange(e.target.value as ProviderId)
                      }
                      style={inputStyle}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Model">
                    {preset.models.length > 0 && !customModel ? (
                      <select
                        value={model}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setCustomModel(true);
                            setModel("");
                          } else {
                            setModel(e.target.value);
                          }
                        }}
                        style={inputStyle}
                      >
                        {preset.models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__custom__">Custom model…</option>
                      </select>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="e.g. gpt-4o-mini"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {preset.models.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomModel(false);
                              setModel(preset.defaultModel);
                            }}
                            style={smallOutlineBtn}
                          >
                            Presets
                          </button>
                        )}
                      </div>
                    )}
                  </Field>

                  {(providerId === "custom" || providerId === "ollama") && (
                    <Field label="Base URL">
                      <input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        style={inputStyle}
                      />
                    </Field>
                  )}

                  {preset.requiresKey && (
                    <Field label="API Key">
                      <div style={{ position: "relative" }}>
                        <input
                          type={showKey ? "text" : "password"}
                          value={key}
                          onChange={(e) => {
                            setKey(e.target.value);
                            setResult(null);
                          }}
                          placeholder={preset.keyPlaceholder}
                          spellCheck={false}
                          autoComplete="off"
                          style={{
                            ...inputStyle,
                            paddingRight: "2.5rem",
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((s) => !s)}
                          aria-label={showKey ? "Hide key" : "Show key"}
                          style={{
                            position: "absolute",
                            right: 6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "transparent",
                            border: "none",
                            color: "var(--text-secondary, #6b6b70)",
                            fontSize: 14,
                            cursor: "pointer",
                            padding: 4,
                          }}
                        >
                          {showKey ? "🙈" : "👁"}
                        </button>
                      </div>
                      {preset.signupUrl && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted)",
                            marginTop: 6,
                          }}
                        >
                          Get a key at{" "}
                          <a
                            href={preset.signupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--accent, #6d5bd0)",
                              textDecoration: "underline",
                            }}
                          >
                            {new URL(preset.signupUrl).hostname}
                          </a>
                        </div>
                      )}
                    </Field>
                  )}

                  {!preset.requiresKey && (
                    <div
                      style={{
                        padding: "0.7rem 0.9rem",
                        background: "var(--accent-subtle, #f0edfc)",
                        borderRadius: 6,
                        fontSize: 12.5,
                        color: "var(--accent-text, #6d5bd0)",
                        lineHeight: 1.55,
                        marginBottom: "1rem",
                      }}
                    >
                      No API key needed for Ollama. Just make sure it's running
                      on <code>{preset.baseUrl}</code>. If you get CORS errors,
                      start Ollama with <code>OLLAMA_ORIGINS=*</code>.
                    </div>
                  )}

                  {result && (
                    <div
                      className="animate-fade-slide"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "0.7rem 0.85rem",
                        background:
                          result.kind === "ok"
                            ? "var(--success-subtle, #e8f5ee)"
                            : "var(--danger-subtle, #fbeaea)",
                        border: `1px solid ${
                          result.kind === "ok"
                            ? "rgba(46, 158, 91, 0.3)"
                            : "rgba(211, 59, 59, 0.3)"
                        }`,
                        borderRadius: 6,
                        fontSize: 12.5,
                        color:
                          result.kind === "ok"
                            ? "var(--success-text, #2e9e5b)"
                            : "var(--danger-text, #d33b3b)",
                        marginBottom: "1rem",
                        fontWeight: 500,
                        lineHeight: 1.5,
                      }}
                    >
                      <span aria-hidden="true" style={{ flexShrink: 0 }}>
                        {result.kind === "ok" ? "✓" : "✕"}
                      </span>
                      <span>{result.message}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={handleVerifyAndSave}
                      disabled={
                        verifying ||
                        !model.trim() ||
                        (preset.requiresKey && !key.trim())
                      }
                      style={{
                        padding: "8px 18px",
                        background:
                          verifying ||
                          !model.trim() ||
                          (preset.requiresKey && !key.trim())
                            ? "var(--text-muted, #9b9b9f)"
                            : "var(--accent, #6d5bd0)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor:
                          verifying ||
                          !model.trim() ||
                          (preset.requiresKey && !key.trim())
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {verifying ? "Verifying…" : "Save & Verify"}
                    </button>

                    {editing && meta && (
                      <button
                        onClick={() => {
                          setEditing(false);
                          setKey("");
                          setResult(null);
                        }}
                        style={{
                          padding: "8px 14px",
                          background: "transparent",
                          color: "var(--text-secondary, #6b6b70)",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Security section */}
              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--border, #e2e2e5)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-muted, #9b9b9f)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                  }}
                >
                  🔒 Privacy & Security
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-secondary, #6b6b70)",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    Your key is <strong>encrypted at rest</strong> in this
                    browser's session storage and only lives in memory while you
                    use the app. It's cleared when you close the tab. It's only
                    used to power AI features here — no usage or billing data
                    leaves your browser.
                  </div>

                  <Field label="Auto-lock after inactivity">
                    <select
                      value={inactivityMins}
                      onChange={(e) =>
                        handleInactivityChange(parseInt(e.target.value, 10))
                      }
                      style={{ ...inputStyle, width: "auto", minWidth: 160 }}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={180}>3 hours</option>
                      <option value={1440}>24 hours</option>
                    </select>
                  </Field>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- Small reusable pieces ----------
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: "0.9rem" }}>
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-muted, #9b9b9f)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.7rem",
  border: "1px solid var(--border-strong, #d8d8dc)",
  borderRadius: 6,
  fontSize: 13.5,
  background: "var(--bg-input, #fff)",
  color: "var(--text-primary, #1a1a1a)",
  outline: "none",
  boxSizing: "border-box",
};

const smallOutlineBtn: React.CSSProperties = {
  padding: "5px 12px",
  background: "transparent",
  color: "var(--accent, #6d5bd0)",
  border: "1px solid var(--accent, #6d5bd0)",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
};

const smallDangerBtn: React.CSSProperties = {
  padding: "5px 12px",
  background: "transparent",
  color: "var(--danger-text, #d33b3b)",
  border: "1px solid var(--danger, #d33b3b)",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: "pointer",
};

export default AISettingsModal;
