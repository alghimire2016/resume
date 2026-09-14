// src/components/TemplatePicker.tsx

import { useState } from "react";
import type { ResumeData, TemplateId, AccentId } from "../types";
import { TEMPLATES, ACCENT_COLORS } from "../templates";
import ExpandableRow from "./ExpandableRow";

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  onHoverPreview?: (
    template: TemplateId | null,
    accent: AccentId | null,
  ) => void;
}

const TemplatePicker: React.FC<Props> = ({
  data,
  onChange,
  onHoverPreview,
}) => {
  const [expanded, setExpanded] = useState(false);

  const currentTemplate =
    TEMPLATES.find((t) => t.id === data.template) || TEMPLATES[0];
  const currentAccent =
    ACCENT_COLORS.find((c) => c.id === data.accentColor) || ACCENT_COLORS[0];

  const setTemplate = (id: TemplateId) => onChange({ ...data, template: id });
  const setAccent = (id: AccentId) => onChange({ ...data, accentColor: id });

  const badges = (
    <>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: 999,
          background: "var(--accent-subtle, #f0edfc)",
          color: "var(--accent-text, #6d5bd0)",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        {currentTemplate.label}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1px solid var(--border-strong, #d8d8dc)",
          background: currentAccent.swatch,
          flexShrink: 0,
        }}
      />
    </>
  );

  return (
    <ExpandableRow
      id="style-picker"
      title="Style"
      subtitle={expanded ? undefined : "Click to change template & accent"}
      badges={badges}
      expanded={expanded}
      onToggle={() => {
        setExpanded((s) => !s);
        // Clear preview override when collapsing
        if (expanded) onHoverPreview?.(null, null);
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary, #6b6b70)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        Template
        <span
          style={{
            marginLeft: 8,
            fontWeight: 400,
            textTransform: "none",
            letterSpacing: 0,
            color: "var(--text-muted, #9b9b9f)",
          }}
        >
          (hover to preview)
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
          marginBottom: "1.25rem",
        }}
      >
        {TEMPLATES.map((t) => {
          const selected = data.template === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              onMouseEnter={() => onHoverPreview?.(t.id, null)}
              onMouseLeave={() => onHoverPreview?.(null, null)}
              onFocus={() => onHoverPreview?.(t.id, null)}
              onBlur={() => onHoverPreview?.(null, null)}
              aria-pressed={selected}
              className={`template-card${selected ? " selected" : ""}`}
              style={{
                textAlign: "left",
                padding: "0.75rem 0.9rem",
                background: selected
                  ? "var(--accent-subtle, #f0edfc)"
                  : "var(--bg-subtle, #f7f7f8)",
                border: `1px solid ${
                  selected ? "var(--accent, #6d5bd0)" : "var(--border, #e2e2e5)"
                }`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: selected
                    ? "var(--accent-text, #6d5bd0)"
                    : "var(--text-primary, #1a1a1a)",
                  marginBottom: 3,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: `2px solid ${
                      selected
                        ? "var(--accent, #6d5bd0)"
                        : "var(--border-strong, #d8d8dc)"
                    }`,
                    background: selected
                      ? "var(--accent, #6d5bd0)"
                      : "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s ease",
                  }}
                >
                  {selected && (
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#fff",
                      }}
                    />
                  )}
                </span>
                {t.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary, #6b6b70)",
                  lineHeight: 1.45,
                  paddingLeft: 20,
                }}
              >
                {t.description}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary, #6b6b70)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}
      >
        Accent color
        {data.template !== "modern" && (
          <span
            style={{
              marginLeft: 8,
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
              color: "var(--text-muted, #9b9b9f)",
            }}
          >
            (used by Modern template)
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {ACCENT_COLORS.map((c) => {
          const selected = data.accentColor === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setAccent(c.id)}
              aria-label={`Accent color ${c.label}`}
              aria-pressed={selected}
              title={c.label}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: c.swatch,
                border: selected
                  ? "3px solid var(--text-primary, #1a1a1a)"
                  : "2px solid var(--border-strong, #d8d8dc)",
                padding: 0,
                cursor: "pointer",
                transition: "transform 0.15s ease, border-color 0.15s ease",
                transform: selected ? "scale(1.12)" : "scale(1)",
              }}
            />
          );
        })}
      </div>

      <p
        style={{
          margin: "0.85rem 0 0 0",
          fontSize: 12,
          color: "var(--text-muted, #9b9b9f)",
          lineHeight: 1.5,
        }}
      >
        Accent is only applied to your name and section underlines. Body text
        stays black for ATS safety.
      </p>
    </ExpandableRow>
  );
};

export default TemplatePicker;
