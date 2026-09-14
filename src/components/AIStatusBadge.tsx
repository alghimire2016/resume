// src/components/AIStatusBadge.tsx

import { useState, useRef, useEffect } from "react";
import { getStoredMeta, openAISettings, lockNow } from "../utils/aiKey";
import type { ProviderId } from "../utils/aiProviders";
import { getProvider } from "../utils/aiProviders";

interface Props {
  hasKey: boolean;
  onOpenSettings: () => void;
}

interface Meta {
  providerId: ProviderId;
  model: string;
  maskedKey: string | null;
  verifiedAt: number;
  isEnvFallback: boolean;
}

const AIStatusBadge: React.FC<Props> = ({ hasKey, onOpenSettings }) => {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load meta when popover opens
  useEffect(() => {
    if (!open) return;
    getStoredMeta().then((m) => {
      if (m) {
        setMeta({
          providerId: m.providerId,
          model: m.model,
          maskedKey: m.maskedKey,
          verifiedAt: m.verifiedAt,
          isEnvFallback: m.isEnvFallback,
        });
      }
    });
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const clickHandler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", clickHandler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", clickHandler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  // ---- Config for the two states ----
  const config = hasKey
    ? {
        label: "AI ready",
        dot: "var(--success, #2e9e5b)",
        bg: "var(--success-subtle, #e8f5ee)",
        text: "var(--success-text, #2e9e5b)",
        tooltip: "Click to manage your AI provider",
      }
    : {
        label: "AI: Add key",
        dot: "var(--warning, #c88a00)",
        bg: "var(--warning-subtle, #fdf6e3)",
        text: "var(--warning-text, #a06e00)",
        tooltip: "Add an API key to enable AI features",
      };

  const handleBadgeClick = () => {
    if (!hasKey) {
      onOpenSettings();
      return;
    }
    setOpen((o) => !o);
  };

  const handleManage = () => {
    setOpen(false);
    onOpenSettings();
  };

  const handleLock = async () => {
    await lockNow();
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        onClick={handleBadgeClick}
        title={config.tooltip}
        aria-label={config.label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: 999,
          background: config.bg,
          color: config.text,
          fontSize: 11.5,
          fontWeight: 600,
          border: "1px solid transparent",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: config.dot,
            display: "inline-block",
          }}
        />
        {config.label}
      </button>

      {/* Popover — only when a key is set and badge is clicked */}
      {open && hasKey && meta && (
        <div
          className="animate-fade-slide"
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 50,
            width: 280,
            background: "var(--bg-surface, #fff)",
            border: "1px solid var(--border, #e2e2e5)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            padding: "0.9rem",
          }}
        >
          {/* Provider + model */}
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--text-muted, #9b9b9f)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              AI provider
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary, #1a1a1a)",
                marginBottom: 2,
              }}
            >
              {getProvider(meta.providerId).label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary, #6b6b70)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {meta.model}
            </div>
          </div>

          {/* Masked key */}
          {meta.maskedKey && (
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: "var(--text-muted, #9b9b9f)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                }}
              >
                Key
              </div>
              <div
                style={{
                  fontSize: 12,
                  padding: "5px 8px",
                  background: "var(--bg-subtle, #f7f7f8)",
                  border: "1px solid var(--border, #e2e2e5)",
                  borderRadius: 5,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  color: "var(--text-primary, #1a1a1a)",
                }}
              >
                {meta.maskedKey}
              </div>
            </div>
          )}

          {/* Verified timestamp */}
          {!meta.isEnvFallback && meta.verifiedAt > 0 && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted, #9b9b9f)",
                marginBottom: 10,
              }}
            >
              Verified {new Date(meta.verifiedAt).toLocaleString()}
            </div>
          )}

          {meta.isEnvFallback && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted, #9b9b9f)",
                marginBottom: 10,
              }}
            >
              Using environment variable
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 6,
              paddingTop: 10,
              borderTop: "1px solid var(--border, #e2e2e5)",
            }}
          >
            <button
              onClick={handleManage}
              style={{
                flex: 1,
                padding: "6px 10px",
                background: "var(--accent, #6d5bd0)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Manage
            </button>
            <button
              onClick={handleLock}
              title="Clear keys from this session"
              style={{
                padding: "6px 10px",
                background: "transparent",
                color: "var(--text-secondary, #6b6b70)",
                border: "1px solid var(--border, #e2e2e5)",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              🔒 Lock
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIStatusBadge;
