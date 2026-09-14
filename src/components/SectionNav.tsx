// src/components/SectionNav.tsx

import { useEffect, useState } from "react";
import type { ResumeData, SectionKey } from "../types";
import { SECTION_LABELS } from "../types";

interface Props {
  data: ResumeData;
}

interface NavItem {
  key: string;
  label: string;
  icon: string;
  formSectionId: string;
  status: "complete" | "partial" | "empty";
  count?: number;
  essential: boolean;
}

const COLLAPSE_KEY = "resume-builder-nav-collapsed";
const HIDE_EMPTY_KEY = "resume-builder-nav-hide-empty";

// These sections always show, even if empty — they're required
// on every resume, so hiding them would be confusing.
const ESSENTIAL_KEYS = new Set([
  "personal",
  "summary",
  "experience",
  "education",
  "skills",
]);

const ICONS: Record<string, string> = {
  personal: "👤",
  summary: "📝",
  experience: "💼",
  projects: "🚀",
  education: "🎓",
  certifications: "🏅",
  skills: "🛠",
  languages: "🌐",
  volunteer: "🤝",
  awards: "🏆",
  customSections: "➕",
};

const computeSectionStatus = (
  key: SectionKey,
  data: ResumeData,
): NavItem | null => {
  const base = {
    key,
    label: SECTION_LABELS[key],
    icon: ICONS[key] || "•",
    formSectionId: `section-${key}`,
    essential: ESSENTIAL_KEYS.has(key),
  };

  switch (key) {
    case "summary": {
      const len = data.summary.trim().length;
      return {
        ...base,
        status: len >= 40 ? "complete" : len > 0 ? "partial" : "empty",
      };
    }
    case "experience": {
      const total = data.experience.length;
      const complete = data.experience.filter(
        (e) =>
          e.company.trim() &&
          e.role.trim() &&
          (e.startDate.trim() || e.datesUnknown),
      ).length;
      return {
        ...base,
        count: total,
        status:
          total === 0 ? "empty" : complete === total ? "complete" : "partial",
      };
    }
    case "projects": {
      const total = data.projects.length;
      const complete = data.projects.filter((p) => p.name.trim()).length;
      return {
        ...base,
        count: total,
        status:
          total === 0 ? "empty" : complete === total ? "complete" : "partial",
      };
    }
    case "education": {
      const total = data.education.length;
      const complete = data.education.filter(
        (e) => e.institution.trim() && e.degree.trim(),
      ).length;
      return {
        ...base,
        count: total,
        status:
          total === 0 ? "empty" : complete === total ? "complete" : "partial",
      };
    }
    case "certifications": {
      const total = data.certifications.length;
      return {
        ...base,
        count: total,
        status: total === 0 ? "empty" : "complete",
      };
    }
    case "skills": {
      const total = data.skills.length;
      return {
        ...base,
        count: total,
        status: total >= 3 ? "complete" : total > 0 ? "partial" : "empty",
      };
    }
    case "languages": {
      const total = data.languages.length;
      return {
        ...base,
        count: total,
        status: total === 0 ? "empty" : "complete",
      };
    }
    case "volunteer": {
      const total = data.volunteer.length;
      const complete = data.volunteer.filter(
        (v) => v.organization.trim() && v.role.trim(),
      ).length;
      return {
        ...base,
        count: total,
        status:
          total === 0 ? "empty" : complete === total ? "complete" : "partial",
      };
    }
    case "awards": {
      const total = data.awards.length;
      return {
        ...base,
        count: total,
        status: total === 0 ? "empty" : "complete",
      };
    }
    case "customSections": {
      const total = data.customSections.filter(
        (s) => s.title.trim() && s.bullets.some((b) => b.trim()),
      ).length;
      return {
        ...base,
        count: total,
        status: total === 0 ? "empty" : "complete",
      };
    }
    default:
      return null;
  }
};

const computeStatus = (data: ResumeData): NavItem[] => {
  const items: NavItem[] = [];

  const p = data.personalInfo;
  const filled = [p.fullName, p.email, p.phone, p.location].filter((v) =>
    v.trim(),
  ).length;
  items.push({
    key: "personal",
    label: "Personal Info",
    icon: ICONS.personal,
    formSectionId: "section-personal",
    status: filled === 4 ? "complete" : filled > 0 ? "partial" : "empty",
    essential: true,
  });

  data.sectionOrder.forEach((key) => {
    const item = computeSectionStatus(key, data);
    if (item) items.push(item);
  });

  return items;
};

const statusLabel = (status: NavItem["status"]): string => {
  if (status === "complete") return "Complete";
  if (status === "partial") return "Started";
  return "Not started";
};

const Dot: React.FC<{ status: NavItem["status"]; collapsed: boolean }> = ({
  status,
  collapsed,
}) => {
  const label = `Status: ${statusLabel(status)}`;
  if (status === "empty") {
    return (
      <span
        aria-label={label}
        title={label}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          border: "1.5px solid var(--border-strong, #d8d8dc)",
          background: "transparent",
          flexShrink: 0,
          display: "inline-block",
          position: collapsed ? "absolute" : "static",
          bottom: collapsed ? 4 : "auto",
          right: collapsed ? 4 : "auto",
        }}
      />
    );
  }
  const color = status === "complete" ? "#2e9e5b" : "#c88a00";
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        display: "inline-block",
        position: collapsed ? "absolute" : "static",
        bottom: collapsed ? 4 : "auto",
        right: collapsed ? 4 : "auto",
      }}
    />
  );
};

const LegendPopover: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-legend-popover]")) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      data-legend-popover
      className="animate-fade-slide"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 30,
        width: 200,
        background: "var(--bg-surface, #fff)",
        border: "1px solid var(--border, #e2e2e5)",
        borderRadius: 8,
        boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.12))",
        padding: "0.6rem 0.75rem",
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
        Legend
      </div>
      <div style={legendRowStyle}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#2e9e5b",
            flexShrink: 0,
          }}
        />
        <span style={legendTextStyle}>Complete</span>
      </div>
      <div style={legendRowStyle}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#c88a00",
            flexShrink: 0,
          }}
        />
        <span style={legendTextStyle}>Started</span>
      </div>
      <div style={legendRowStyle}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: "1.5px solid var(--border-strong, #d8d8dc)",
            background: "transparent",
            flexShrink: 0,
          }}
        />
        <span style={legendTextStyle}>Not started</span>
      </div>
      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid var(--border, #e2e2e5)",
          fontSize: 11.5,
          color: "var(--text-muted, #9b9b9f)",
          lineHeight: 1.5,
        }}
      >
        Optional sections hide when empty — expand the list to see them all.
      </div>
    </div>
  );
};

const SectionNav: React.FC<Props> = ({ data }) => {
  const [active, setActive] = useState<string>("personal");
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [hideEmpty, setHideEmpty] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(HIDE_EMPTY_KEY);
      return saved === null ? true : saved === "1";
    } catch {
      return true;
    }
  });
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_EMPTY_KEY, hideEmpty ? "1" : "0");
    } catch {
      // ignore
    }
  }, [hideEmpty]);

  const allItems = computeStatus(data);

  const visibleItems = allItems.filter((item) => {
    if (item.essential) return true;
    if (!hideEmpty) return true;
    return item.status !== "empty";
  });

  const hiddenCount = allItems.length - visibleItems.length;
  const idsKey = visibleItems.map((i) => i.formSectionId).join(",");

  useEffect(() => {
    const ids = visibleItems.map((i) => i.formSectionId);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.id;
          setActive(id.replace(/^section-/, ""));
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const completed = allItems.filter((i) => i.status === "complete").length;
  const total = allItems.length;

  const navWidth = collapsed ? 60 : 210;

  return (
    <nav
      className="section-nav"
      aria-label="Resume sections"
      style={{
        width: navWidth,
        flexShrink: 0,
        position: "sticky",
        top: 80,
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        paddingRight: 4,
        transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface, #fff)",
          border: "1px solid var(--border, #e2e2e5)",
          borderRadius: 10,
          padding: collapsed ? "0.5rem 0.4rem" : "0.75rem 0.5rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 6px 10px",
            borderBottom: "1px solid var(--border, #e2e2e5)",
            marginBottom: 6,
            position: "relative",
          }}
        >
          {!collapsed && (
            <div
              style={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text-muted, #9b9b9f)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Sections
                  <button
                    type="button"
                    onClick={() => setShowLegend((s) => !s)}
                    aria-label="Show legend"
                    title="What do the dots mean?"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "1px solid var(--border, #e2e2e5)",
                      background: "transparent",
                      color: "var(--text-secondary, #6b6b70)",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ?
                  </button>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-secondary, #6b6b70)",
                    marginTop: 3,
                  }}
                >
                  {completed} of {total} complete
                </div>
              </div>

              {showLegend && (
                <LegendPopover onClose={() => setShowLegend(false)} />
              )}
            </div>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "transparent",
              border: "1px solid var(--border, #e2e2e5)",
              color: "var(--text-secondary, #6b6b70)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              padding: 0,
              cursor: "pointer",
              flexShrink: 0,
              marginLeft: collapsed ? "auto" : 0,
              marginRight: collapsed ? "auto" : 0,
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        {/* Nav rows */}
        {visibleItems.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => jumpTo(item.formSectionId)}
              title={collapsed ? item.label : `Jump to ${item.label}`}
              className="section-nav-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: collapsed ? 0 : 8,
                width: "100%",
                padding: collapsed ? "8px 0" : "6px 8px",
                marginBottom: 1,
                background: isActive
                  ? "var(--accent-subtle, #f0edfc)"
                  : "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? "var(--accent-text, #6d5bd0)"
                  : "var(--text-primary, #1a1a1a)",
                justifyContent: collapsed ? "center" : "flex-start",
                position: "relative",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: collapsed ? 16 : 13,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {item.icon}
              </span>

              {!collapsed && (
                <>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {item.label}
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: "var(--text-muted, #9b9b9f)",
                        flexShrink: 0,
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                  <Dot status={item.status} collapsed={false} />
                </>
              )}

              {collapsed && <Dot status={item.status} collapsed={true} />}
            </button>
          );
        })}

        {/* Show/hide empty toggle */}
        {!collapsed && hiddenCount > 0 && (
          <button
            onClick={() => setHideEmpty(false)}
            style={{
              width: "100%",
              padding: "5px 8px",
              marginTop: 6,
              background: "transparent",
              border: "none",
              borderRadius: 6,
              color: "var(--text-muted, #9b9b9f)",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
            Show {hiddenCount} empty section{hiddenCount === 1 ? "" : "s"}
          </button>
        )}

        {!collapsed && hiddenCount === 0 && !hideEmpty && (
          <button
            onClick={() => setHideEmpty(true)}
            style={{
              width: "100%",
              padding: "5px 8px",
              marginTop: 6,
              background: "transparent",
              border: "none",
              borderRadius: 6,
              color: "var(--text-muted, #9b9b9f)",
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Hide empty sections
          </button>
        )}
      </div>
    </nav>
  );
};

const legendRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "3px 0",
  fontSize: 12,
};

const legendTextStyle: React.CSSProperties = {
  color: "var(--text-secondary, #6b6b70)",
};

export default SectionNav;
