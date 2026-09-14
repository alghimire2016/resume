// src/components/ExpandableRow.tsx

interface Props {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  id?: string;
}

const ExpandableRow: React.FC<Props> = ({
  title,
  subtitle,
  badges,
  expanded,
  onToggle,
  children,
  id,
}) => {
  const contentId = id ? `${id}-body` : undefined;

  return (
    <div
      className="expandable-card"
      style={{
        background: "var(--bg-surface, #fff)",
        borderTop: `1px solid var(--border, #e2e2e5)`,
        borderRight: `1px solid var(--border, #e2e2e5)`,
        borderBottom: `1px solid var(--border, #e2e2e5)`,
        borderLeft: `3px solid ${
          expanded ? "var(--accent, #6d5bd0)" : "var(--border, #e2e2e5)"
        }`,
        borderRadius: 8,
        marginBottom: "1.25rem",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="expandable-row"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "0.9rem 1.1rem",
          background: "transparent",
          border: "none",
          textAlign: "left",
          fontSize: 15,
          fontWeight: 600,
          color: "var(--text-primary, #1a1a1a)",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <span>{title}</span>
          {badges}
          {subtitle && (
            <span
              style={{
                fontSize: 12.5,
                color: "var(--text-muted, #9b9b9f)",
                fontWeight: 400,
              }}
            >
              {subtitle}
            </span>
          )}
        </span>

        <span className="expandable-row-chevron-wrap" aria-hidden="true">
          <svg
            className={`expandable-row-chevron${expanded ? " open" : ""}`}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      <div
        className={`expandable-content-wrapper${expanded ? " open" : ""}`}
        aria-hidden={!expanded}
      >
        <div className="expandable-content-inner">
          <div
            id={contentId}
            style={{
              padding: "0 1.1rem 1.1rem",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandableRow;
