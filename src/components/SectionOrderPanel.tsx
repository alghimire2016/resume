// src/components/SectionOrderPanel.tsx

import { useState } from "react";
import type { ResumeData } from "../types";
import { SECTION_LABELS } from "../types";
import ExpandableRow from "./ExpandableRow";

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

const SectionOrderPanel: React.FC<Props> = ({ data, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => () => setDragIndex(index);

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newOrder = [...data.sectionOrder];
    const [moved] = newOrder.splice(dragIndex, 1);
    newOrder.splice(index, 0, moved);
    onChange({ ...data, sectionOrder: newOrder });
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <ExpandableRow
      id="section-order-panel"
      title="Layout"
      subtitle={expanded ? undefined : "Reorder sections"}
      expanded={expanded}
      onToggle={() => setExpanded((s) => !s)}
    >
      <p
        style={{
          fontSize: 12.5,
          color: "var(--text-secondary, #6b6b70)",
          margin: "0 0 12px 0",
          lineHeight: 1.55,
        }}
      >
        Drag the handle to reorder how sections appear in your resume. Empty
        sections are hidden automatically.
      </p>

      {data.sectionOrder.map((key, i) => (
        <div
          key={key}
          draggable
          onDragStart={handleDragStart(i)}
          onDragOver={handleDragOver(i)}
          onDragEnd={handleDragEnd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            background: "var(--bg-subtle, #f7f7f8)",
            border: "1px solid var(--border, #e2e2e5)",
            borderRadius: 6,
            marginBottom: 4,
            cursor: "grab",
            opacity: dragIndex === i ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          <span className="drag-handle" aria-hidden="true">
            ⋮⋮
          </span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--text-primary, #1a1a1a)",
            }}
          >
            {SECTION_LABELS[key]}
          </span>
        </div>
      ))}
    </ExpandableRow>
  );
};

export default SectionOrderPanel;
