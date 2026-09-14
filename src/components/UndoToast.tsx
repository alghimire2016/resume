// src/components/UndoToast.tsx

import { useEffect, useState } from "react";

export interface ToastData {
  id: string;
  message: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface Props {
  toast: ToastData | null;
  onDismiss: () => void;
}

// Toast is intentionally dark in BOTH themes (like modern apps do).
// Using a fixed color instead of a CSS var avoids the "white on white"
// bug that appeared when --text-primary switched to light in dark mode.
const TOAST_BG = "#1f1f24";
const TOAST_TEXT = "#f5f5f7";
const TOAST_MUTED = "rgba(245, 245, 247, 0.7)";

const UndoToast: React.FC<Props> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);
    const duration = toast.duration ?? 8000;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 180);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: `translateX(-50%) translateY(${exiting ? "20px" : "0"})`,
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.18s ease, transform 0.18s ease",
        zIndex: 100,
        maxWidth: "90vw",
        width: 440,
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0.85rem 1rem",
          background: TOAST_BG,
          color: TOAST_TEXT,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          fontSize: 13.5,
          lineHeight: 1.45,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#2e9e5b",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ✓
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{toast.message}</div>
          {toast.detail && (
            <div style={{ fontSize: 12, color: TOAST_MUTED, marginTop: 1 }}>
              {toast.detail}
            </div>
          )}
        </div>

        {toast.actionLabel && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.();
              setExiting(true);
              setTimeout(onDismiss, 180);
            }}
            style={{
              background: "rgba(255,255,255,0.14)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "5px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.14)";
            }}
          >
            {toast.actionLabel}
          </button>
        )}

        <button
          onClick={() => {
            setExiting(true);
            setTimeout(onDismiss, 180);
          }}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            color: "#fff",
            opacity: 0.5,
            border: "none",
            fontSize: 16,
            lineHeight: 1,
            padding: 2,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default UndoToast;
