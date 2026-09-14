// src/components/ResumeSelector.tsx

import { useState, useRef, useEffect } from "react";
import type { SavedResume } from "../storage";

interface Props {
  resumes: SavedResume[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (newList: SavedResume[]) => void;
}

const ResumeSelector: React.FC<Props> = ({
  resumes,
  activeId,
  onSwitch,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onReorder,
}) => {
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const active = resumes.find((r) => r.id === activeId) || resumes[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (draggingRef.current) return;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const startRename = (r: SavedResume) => {
    setRenamingId(r.id);
    setRenameValue(r.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim())
      onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  // --- Drag reorder ---
  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    draggingRef.current = true;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Firefox needs data set for drag to work
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== overId) setOverId(id);
  };

  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      draggingRef.current = false;
      return;
    }
    const fromIndex = resumes.findIndex((r) => r.id === dragId);
    const toIndex = resumes.findIndex((r) => r.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...resumes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorder(next);
    setDragId(null);
    setOverId(null);
    // Slight delay to avoid triggering the outside-click close
    setTimeout(() => {
      draggingRef.current = false;
    }, 100);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setOverId(null);
    setTimeout(() => {
      draggingRef.current = false;
    }, 100);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          background: "var(--bg-subtle, #f7f7f8)",
          border: "1px solid var(--border, #e2e2e5)",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-primary, #1a1a1a)",
          cursor: "pointer",
          maxWidth: 260,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {active?.name || "Untitled"}
        </span>
        <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.6 }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 40,
            width: 360,
            maxWidth: "90vw",
            background: "var(--bg-surface, #fff)",
            border: "1px solid var(--border, #e2e2e5)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.06))",
            padding: "0.4rem",
          }}
        >
          <div
            style={{
              padding: "4px 8px 6px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted, #9b9b9f)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Your resumes
          </div>

          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {resumes.map((r) => {
              const isActive = r.id === activeId;
              const isRenaming = renamingId === r.id;
              const isDragging = dragId === r.id;
              const isOver = overId === r.id && dragId !== r.id;

              return (
                <div
                  key={r.id}
                  onDragOver={handleDragOver(r.id)}
                  onDrop={handleDrop(r.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 6px",
                    borderRadius: 6,
                    background: isActive
                      ? "var(--accent-subtle, #f0edfc)"
                      : "transparent",
                    marginBottom: 2,
                    opacity: isDragging ? 0.4 : 1,
                    borderTop: isOver
                      ? "2px solid var(--accent, #6d5bd0)"
                      : "2px solid transparent",
                    transition: "opacity 0.15s ease",
                  }}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      style={{
                        flex: 1,
                        padding: "4px 8px",
                        border: "1px solid var(--accent, #6d5bd0)",
                        borderRadius: 4,
                        fontSize: 13,
                        background: "var(--bg-input, #fff)",
                        color: "var(--text-primary, #1a1a1a)",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <>
                      <span
                        draggable
                        onDragStart={handleDragStart(r.id)}
                        onDragEnd={handleDragEnd}
                        title="Drag to reorder"
                        aria-hidden="true"
                        style={{
                          color: "var(--text-muted, #9b9b9f)",
                          fontSize: 14,
                          letterSpacing: "-2px",
                          cursor: "grab",
                          userSelect: "none",
                          padding: "0 2px",
                          flexShrink: 0,
                        }}
                      >
                        ⋮⋮
                      </span>
                      <button
                        onClick={() => {
                          onSwitch(r.id);
                          setOpen(false);
                        }}
                        style={{
                          flex: 1,
                          textAlign: "left",
                          background: "transparent",
                          border: "none",
                          padding: "4px 6px",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive
                            ? "var(--accent-text, #6d5bd0)"
                            : "var(--text-primary, #1a1a1a)",
                          cursor: "pointer",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.name}
                      </button>
                      <button
                        onClick={() => startRename(r)}
                        title="Rename"
                        aria-label={`Rename ${r.name}`}
                        style={miniBtn}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => onDuplicate(r.id)}
                        title="Duplicate"
                        aria-label={`Duplicate ${r.name}`}
                        style={miniBtn}
                      >
                        ⧉
                      </button>
                      {resumes.length > 1 && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `Delete "${r.name}"? This cannot be undone.`,
                              )
                            ) {
                              onDelete(r.id);
                            }
                          }}
                          title="Delete"
                          aria-label={`Delete ${r.name}`}
                          style={{
                            ...miniBtn,
                            color: "var(--danger-text, #d33b3b)",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border, #e2e2e5)",
              marginTop: 4,
              paddingTop: 4,
            }}
          >
            <button
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "7px 8px",
                background: "transparent",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--accent, #6d5bd0)",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              + New blank resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const miniBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: "none",
  borderRadius: 4,
  color: "var(--text-secondary, #6b6b70)",
  fontSize: 13,
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

export default ResumeSelector;
