// src/pages/ResumeCreator.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import * as pdfjsLib from "pdfjs-dist";
import ResumeForm from "../components/ResumeForm";
import ResumeDocument from "../components/ResumeDocument";
import ResumeUploader from "../components/ResumeUploader";
import TemplatePicker from "../components/TemplatePicker";
import SectionOrderPanel from "../components/SectionOrderPanel";
import JDMatchPanel from "../components/JDMatchPanel";
import CoverLetterPanel from "../components/CoverLetterPanel";
import ResumeSelector from "../components/ResumeSelector";
import SectionNav from "../components/SectionNav";
import UndoToast from "../components/UndoToast";
import type { ToastData } from "../components/UndoToast";
import {
  loadStorage,
  saveStorage,
  createNewResume,
  duplicateResume,
  defaultResumeData,
} from "../storage";
import type { StorageState, SavedResume } from "../storage";
import type { JDKeywordResult } from "../utils/keywordMatch";
import { DEFAULT_SECTION_ORDER } from "../types";
import type { ResumeData } from "../types";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const PREVIEW_THRESHOLD = 2;
const HISTORY_LIMIT = 50;
const JD_STORAGE_KEY = "resume-builder-jd-v1";

const getChecklist = (data: ResumeData) => [
  {
    key: "name",
    label: "Full name",
    done: !!data.personalInfo.fullName.trim(),
  },
  { key: "email", label: "Email", done: !!data.personalInfo.email.trim() },
  { key: "phone", label: "Phone", done: !!data.personalInfo.phone.trim() },
  {
    key: "location",
    label: "City / region",
    done: !!data.personalInfo.location.trim(),
  },
  {
    key: "summary",
    label: "Professional summary",
    done: data.summary.trim().length >= 40,
  },
  {
    key: "experience",
    label: "At least 1 work experience",
    done: data.experience.some((e) => e.company.trim() && e.role.trim()),
  },
  {
    key: "education",
    label: "At least 1 education entry",
    done: data.education.some((e) => e.institution.trim() && e.degree.trim()),
  },
  { key: "skills", label: "At least 3 skills", done: data.skills.length >= 3 },
];

const countFilledFields = (data: ResumeData): number => {
  let count = 0;
  const p = data.personalInfo;
  count += [
    p.fullName,
    p.email,
    p.phone,
    p.location,
    p.website,
    p.linkedin,
  ].filter((v) => v && v.trim()).length;
  if (data.summary.trim()) count += 1;
  count += data.experience.length * 3;
  count += data.education.length * 2;
  count += data.projects.length * 2;
  count += data.certifications.length;
  count += data.skills.length;
  count += data.languages.length;
  count += data.volunteer.length * 2;
  count += data.awards.length;
  return count;
};

const hasRealActivity = (data: ResumeData): boolean => {
  return (
    !!data.personalInfo.fullName.trim() ||
    data.summary.trim().length > 20 ||
    data.experience.length > 0 ||
    data.education.length > 0 ||
    data.skills.length >= 3
  );
};

const ResumeCreator: React.FC = () => {
  // ---------- STORAGE ----------
  const [storage, setStorage] = useState<StorageState>(loadStorage);
  const activeResume =
    storage.list.find((r) => r.id === storage.activeId) || storage.list[0];
  const resumeData = activeResume.data;

  const updateResumeData = useCallback(
    (next: ResumeData | ((prev: ResumeData) => ResumeData)) => {
      setStorage((s) => {
        const active = s.list.find((r) => r.id === s.activeId);
        if (!active) return s;
        const newData = typeof next === "function" ? next(active.data) : next;
        return {
          ...s,
          list: s.list.map((r) =>
            r.id === s.activeId
              ? { ...r, data: newData, updatedAt: Date.now() }
              : r,
          ),
        };
      });
    },
    [],
  );

  // ---------- AUTOSAVE ----------
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [savePulseKey, setSavePulseKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      saveStorage(storage);
      setSavedAt(new Date());
      setSavePulseKey((k) => k + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [storage]);

  // ---------- UNDO / REDO ----------
  const [past, setPast] = useState<ResumeData[]>([]);
  const [future, setFuture] = useState<ResumeData[]>([]);
  const lastCommittedRef = useRef<ResumeData>(resumeData);
  const skipCommitRef = useRef(false);
  const commitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPast([]);
    setFuture([]);
    lastCommittedRef.current = resumeData;
    skipCommitRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage.activeId]);

  useEffect(() => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    if (JSON.stringify(resumeData) === JSON.stringify(lastCommittedRef.current))
      return;

    if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      setPast((p) => [
        ...p.slice(-(HISTORY_LIMIT - 1)),
        lastCommittedRef.current,
      ]);
      setFuture([]);
      lastCommittedRef.current = resumeData;
    }, 500);

    return () => {
      if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
    };
  }, [resumeData]);

  const historyRef = useRef({ past, future, resumeData });
  historyRef.current = { past, future, resumeData };

  const undo = useCallback(() => {
    const { past: p, resumeData: rd } = historyRef.current;
    if (p.length === 0) return;
    const prev = p[p.length - 1];
    skipCommitRef.current = true;
    setPast((arr) => arr.slice(0, -1));
    setFuture((f) => [rd, ...f]);
    updateResumeData(prev);
    lastCommittedRef.current = prev;
  }, [updateResumeData]);

  const redo = useCallback(() => {
    const { future: f, resumeData: rd } = historyRef.current;
    if (f.length === 0) return;
    const next = f[0];
    skipCommitRef.current = true;
    setFuture((arr) => arr.slice(1));
    setPast((p) => [...p, rd]);
    updateResumeData(next);
    lastCommittedRef.current = next;
  }, [updateResumeData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (isField) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ---------- TOAST ----------
  const [toast, setToast] = useState<ToastData | null>(null);

  // ---------- JOB DESCRIPTION ----------
  const [jd, setJd] = useState<string>(() => {
    try {
      return localStorage.getItem(JD_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(JD_STORAGE_KEY, jd);
    } catch {
      // ignore
    }
  }, [jd]);

  // ---------- RESUME MANAGEMENT ----------
  const handleSwitchResume = (id: string) =>
    setStorage((s) => ({ ...s, activeId: id }));

  const handleCreateResume = () => {
    const fresh = createNewResume("New Resume");
    setStorage((s) => ({ ...s, activeId: fresh.id, list: [...s.list, fresh] }));
  };

  const handleDuplicateResume = (id: string) => {
    const source = storage.list.find((r) => r.id === id);
    if (!source) return;
    const dup = duplicateResume(source, `${source.name} (copy)`);
    setStorage((s) => ({ ...s, activeId: dup.id, list: [...s.list, dup] }));
  };

  const handleRenameResume = (id: string, name: string) =>
    setStorage((s) => ({
      ...s,
      list: s.list.map((r) =>
        r.id === id ? { ...r, name, updatedAt: Date.now() } : r,
      ),
    }));

  const handleDeleteResume = (id: string) =>
    setStorage((s) => {
      const filtered = s.list.filter((r) => r.id !== id);
      if (filtered.length === 0) {
        const fresh = createNewResume("My Resume");
        return { activeId: fresh.id, list: [fresh] };
      }
      const newActiveId = s.activeId === id ? filtered[0].id : s.activeId;
      return { activeId: newActiveId, list: filtered };
    });

  const handleReorderResumes = (newList: SavedResume[]) =>
    setStorage((s) => ({ ...s, list: newList }));

  // ---------- AI PARSE ----------
  const addIdsAndDefaults = (parsed: any): ResumeData => {
    const p = parsed || {};
    const withId = (arr: any[]) =>
      (Array.isArray(arr) ? arr : []).map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      }));
    const defs = defaultResumeData();
    return {
      personalInfo: { ...defs.personalInfo, ...(p.personalInfo || {}) },
      summary: p.summary || "",
      experience: withId(p.experience),
      education: withId(p.education),
      projects: withId(p.projects),
      certifications: withId(p.certifications),
      skills: Array.isArray(p.skills) ? p.skills.filter(Boolean) : [],
      languages: withId(p.languages),
      volunteer: withId(p.volunteer),
      awards: withId(p.awards),
      customSections: [],
      sectionOrder: [...DEFAULT_SECTION_ORDER],
      template: resumeData.template,
      accentColor: resumeData.accentColor,
    };
  };

  const handleParsedData = (parsed: any) => {
    const before = resumeData;
    const after = addIdsAndDefaults(parsed);
    const filled = countFilledFields(after);
    updateResumeData(after);

    setToast({
      id: crypto.randomUUID(),
      message: `AI filled your resume — ${filled} fields detected`,
      detail: "Review everything. AI can miss things.",
      actionLabel: "Undo",
      onAction: () => {
        skipCommitRef.current = true;
        updateResumeData(before);
        setToast({
          id: crypto.randomUUID(),
          message: "Reverted AI import",
          duration: 3000,
        });
      },
      duration: 10000,
    });
  };

  // ---------- AI SUMMARY ----------
  const handleSummaryGenerated = (
    newSummary: string,
    previousSummary: string,
  ) => {
    skipCommitRef.current = true;
    updateResumeData((prev) => ({ ...prev, summary: newSummary }));

    setToast({
      id: crypto.randomUUID(),
      message: "✨ AI wrote a new summary",
      detail: "Targeted at the job description you pasted",
      actionLabel: "Undo",
      onAction: () => {
        skipCommitRef.current = true;
        updateResumeData((prev) => ({ ...prev, summary: previousSummary }));
        setToast({
          id: crypto.randomUUID(),
          message: "Reverted summary",
          duration: 3000,
        });
      },
      duration: 12000,
    });
  };

  // ---------- PREVIEW ----------
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [previewOverride, setPreviewOverride] = useState<{
    template?: string;
    accentColor?: string;
  } | null>(null);
  const [fullPreview, setFullPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const dataForPreview = previewOverride
          ? { ...resumeData, ...previewOverride }
          : resumeData;
        const blob = await pdf(
          <ResumeDocument data={dataForPreview as ResumeData} />,
        ).toBlob();
        if (cancelled) return;
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        const buf = await blob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        if (!cancelled) setPageCount(doc.numPages);
      } catch (err) {
        console.error("Preview render failed:", err);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [resumeData, previewOverride]);

  // ---------- CLEAR ----------
  const handleClearAll = () => {
    if (
      !confirm(
        `Clear all data in "${activeResume.name}"? This cannot be undone.`,
      )
    )
      return;
    updateResumeData(defaultResumeData());
  };

  // ---------- DERIVED ----------
  const [showChecklist, setShowChecklist] = useState(false);
  const [jdResult, setJdResult] = useState<JDKeywordResult | null>(null);
  const jdPanelRef = useRef<HTMLDivElement>(null);

  const checklist = getChecklist(resumeData);
  const completed = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const percent = Math.round((completed / total) * 100);
  const showPreview = completed >= PREVIEW_THRESHOLD && !!previewUrl;
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const userHasActivity = hasRealActivity(resumeData);

  const jdMatchColor = !jdResult
    ? "var(--text-muted, #9b9b9f)"
    : jdResult.matchPercent >= 75
      ? "var(--success, #2e9e5b)"
      : jdResult.matchPercent >= 50
        ? "var(--accent, #6d5bd0)"
        : "var(--warning, #c88a00)";

  const completeColor = "var(--accent, #6d5bd0)";

  return (
    <div
      style={{
        padding: "1.25rem clamp(1rem, 2.5vw, 1.75rem)",
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      {/* ---------- HEADER ---------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--text-primary, #1a1a1a)",
            }}
          >
            Resume Creator
          </h1>

          <ResumeSelector
            resumes={storage.list}
            activeId={storage.activeId}
            onSwitch={handleSwitchResume}
            onCreate={handleCreateResume}
            onDuplicate={handleDuplicateResume}
            onRename={handleRenameResume}
            onDelete={handleDeleteResume}
            onReorder={handleReorderResumes}
          />

          {savedAt && (
            <span
              role="status"
              aria-live="polite"
              style={{
                fontSize: 12,
                color: "var(--success-text, #2e9e5b)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              <span
                key={savePulseKey}
                className="save-dot-pulse"
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--success, #2e9e5b)",
                  display: "inline-block",
                }}
              />
              Saved{" "}
              {savedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo (Ctrl+Z)"
            style={iconActionBtn(canUndo)}
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo (Ctrl+Y)"
            style={iconActionBtn(canRedo)}
          >
            ↷
          </button>
          <button
            onClick={handleClearAll}
            title="Clear all data in this resume"
            aria-label="Clear all data in this resume"
            style={{
              padding: "0.4rem 0.85rem",
              background: "transparent",
              color: "var(--danger-text, #d33b3b)",
              border: "1px solid var(--danger, #d33b3b)",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* ---------- RESUME HEALTH ---------- */}
      <div
        style={{
          background: "var(--bg-surface, #ffffff)",
          border: "1px solid var(--border, #e2e2e5)",
          borderRadius: 8,
          padding: "1rem 1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        {/* Completeness row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: percent < 100 ? "0.5rem" : 0,
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary, #1a1a1a)",
              }}
            >
              Resume health
            </span>

            {percent === 100 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "var(--success-subtle, #e8f5ee)",
                  color: "var(--success-text, #2e9e5b)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                ✓ Complete
              </span>
            ) : (
              <>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary, #6b6b70)",
                  }}
                >
                  · Completeness
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: completeColor,
                  }}
                >
                  {percent}%
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-secondary, #6b6b70)",
                  }}
                >
                  ({completed}/{total} essentials)
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setShowChecklist((s) => !s)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--accent, #6d5bd0)",
              fontSize: 13,
              fontWeight: 500,
              padding: 0,
            }}
          >
            {showChecklist ? "Hide checklist" : "Show checklist"}
          </button>
        </div>

        {percent < 100 && (
          <div
            style={{
              height: 6,
              background: "var(--progress-track, #e8e8ea)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              className="progress-fill"
              style={{
                height: "100%",
                width: `${percent}%`,
                background: completeColor,
              }}
            />
          </div>
        )}

        {/* Job match row */}
        {jdResult && (
          <div style={{ marginTop: percent < 100 ? "1rem" : "0.85rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary, #6b6b70)",
                  }}
                >
                  · Job match
                </span>
                <span
                  style={{ fontSize: 18, fontWeight: 700, color: jdMatchColor }}
                >
                  {jdResult.matchPercent}%
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-secondary, #6b6b70)",
                  }}
                >
                  ({jdResult.matched.length}/{jdResult.totalKeywords} keywords)
                </span>
              </div>

              {jdResult.missing.length > 0 && (
                <button
                  onClick={() => {
                    jdPanelRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--accent, #6d5bd0)",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  See missing keywords →
                </button>
              )}
            </div>

            <div
              style={{
                height: 6,
                background: "var(--progress-track, #e8e8ea)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                className="progress-fill"
                style={{
                  height: "100%",
                  width: `${jdResult.matchPercent}%`,
                  background: jdMatchColor,
                }}
              />
            </div>
          </div>
        )}

        {pageCount !== null && pageCount > 0 && (
          <div
            style={{
              marginTop: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color:
                pageCount > 1
                  ? "var(--warning-text, #a06e00)"
                  : "var(--text-secondary, #6b6b70)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background:
                  pageCount > 1
                    ? "var(--warning-subtle, #fdf6e3)"
                    : "var(--bg-subtle, #f7f7f8)",
                color:
                  pageCount > 1
                    ? "var(--warning-text, #a06e00)"
                    : "var(--text-secondary, #6b6b70)",
              }}
            >
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </span>
            {pageCount > 1 && (
              <span style={{ fontSize: 12.5 }}>
                Try the Compact template or trim bullets to fit on 1 page.
              </span>
            )}
          </div>
        )}

        {showChecklist && (
          <div
            className="animate-fade-slide"
            style={{ marginTop: "0.85rem", display: "grid", gap: 4 }}
          >
            {checklist.map((item) => (
              <div
                key={item.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: 13,
                  color: "var(--text-secondary, #6b6b70)",
                }}
              >
                <span
                  style={{
                    width: 16,
                    color: item.done
                      ? "var(--success, #2e9e5b)"
                      : "var(--text-muted, #9b9b9f)",
                    fontWeight: 700,
                  }}
                >
                  {item.done ? "✓" : "○"}
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- JOB MATCH NUDGE ---------- */}
      {jdResult && jdResult.missing.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "0.7rem 1rem",
            background: "var(--accent-subtle, #f0edfc)",
            border: "1px solid var(--accent, #6d5bd0)",
            borderRadius: 8,
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16 }}>
              ✨
            </span>
            <span
              style={{
                fontSize: 13.5,
                color: "var(--accent-text, #6d5bd0)",
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ fontWeight: 700 }}>
                {jdResult.missing.length} keyword
                {jdResult.missing.length === 1 ? "" : "s"}
              </strong>{" "}
              from the job description{" "}
              {jdResult.missing.length === 1 ? "is" : "are"} missing from your
              resume.
            </span>
          </div>

          <button
            onClick={() => {
              document
                .getElementById("section-skills")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            style={{
              padding: "5px 12px",
              background: "var(--accent, #6d5bd0)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Go to Skills →
          </button>
        </div>
      )}

      {/* ---------- AI IMPORT ---------- */}
      <ResumeUploader
        onParsed={handleParsedData}
        hasActivity={userHasActivity}
      />

      {/* ---------- JOB MATCH ---------- */}
      <div ref={jdPanelRef}>
        <JDMatchPanel
          data={resumeData}
          jd={jd}
          setJd={setJd}
          onResult={setJdResult}
          onKeywordClick={() => {
            document
              .getElementById("section-skills")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      </div>

      {/* ---------- COVER LETTER ---------- */}
      <CoverLetterPanel data={resumeData} jd={jd} resumeId={activeResume.id} />

      {/* ---------- STYLE ---------- */}
      <TemplatePicker
        data={resumeData}
        onChange={updateResumeData}
        onHoverPreview={(template) =>
          setPreviewOverride(template ? { template } : null)
        }
      />

      {/* ---------- LAYOUT ---------- */}
      <SectionOrderPanel data={resumeData} onChange={updateResumeData} />

      {/* ---------- THREE-COLUMN (or full preview) ---------- */}
      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {!fullPreview && <SectionNav data={resumeData} />}

        {!fullPreview && (
          <div
            style={{
              flex: "1 1 340px",
              minWidth: 0,
              maxHeight: "calc(100vh - 200px)",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
          >
            <ResumeForm
              data={resumeData}
              onChange={updateResumeData}
              jd={jd}
              resumeId={activeResume.id}
              onSummaryGenerated={handleSummaryGenerated}
            />

            <div style={{ marginTop: "1.5rem" }}>
              <PDFDownloadLink
                document={<ResumeDocument data={resumeData} />}
                fileName={`${
                  activeResume.name.replace(/[^\w\s-]/g, "").trim() || "resume"
                }.pdf`}
                style={{
                  display: "inline-block",
                  padding: "0.7rem 1.2rem",
                  backgroundColor: "var(--accent, #6d5bd0)",
                  color: "#ffffff",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                {({ loading }) => (loading ? "Generating…" : "Download PDF")}
              </PDFDownloadLink>
            </div>
          </div>
        )}

        <div
          style={{
            flex: fullPreview ? "1 1 100%" : "1 1 340px",
            minWidth: 0,
            height: fullPreview ? "calc(100vh - 140px)" : "calc(100vh - 200px)",
            border: "1px solid var(--border-strong, #d8d8dc)",
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--bg-subtle, #f7f7f8)",
            position: "relative",
          }}
        >
          {showPreview ? (
            <>
              <button
                onClick={() => setFullPreview((f) => !f)}
                title={fullPreview ? "Exit full view" : "View fullscreen"}
                aria-label={fullPreview ? "Exit full view" : "View fullscreen"}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  zIndex: 10,
                  padding: "6px 12px",
                  background: "rgba(30, 30, 35, 0.85)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {fullPreview ? "⤡ Exit full view" : "⤢ Full view"}
              </button>

              <iframe
                key={previewUrl}
                title="Resume preview"
                src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "#f7f7f8",
                }}
              />
            </>
          ) : (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 40,
                    marginBottom: 12,
                    opacity: 0.35,
                    lineHeight: 1,
                  }}
                >
                  📄
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-muted, #9b9b9f)",
                    maxWidth: 280,
                    lineHeight: 1.55,
                    marginBottom: 6,
                  }}
                >
                  Your resume preview will appear here.
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--text-muted, #9b9b9f)",
                    maxWidth: 280,
                    lineHeight: 1.55,
                    opacity: 0.8,
                  }}
                >
                  Add at least {PREVIEW_THRESHOLD} essentials to see it come to
                  life.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- TOAST ---------- */}
      <UndoToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

const iconActionBtn = (enabled: boolean): React.CSSProperties => ({
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-surface, #fff)",
  border: "1px solid var(--border, #e2e2e5)",
  borderRadius: 6,
  fontSize: 16,
  color: enabled
    ? "var(--text-primary, #1a1a1a)"
    : "var(--text-muted, #9b9b9f)",
  cursor: enabled ? "pointer" : "not-allowed",
  opacity: enabled ? 1 : 0.5,
  padding: 0,
});

export default ResumeCreator;
