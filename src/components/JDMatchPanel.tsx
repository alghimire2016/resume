// src/components/JDMatchPanel.tsx

import { useState, useEffect, useRef } from "react";
import type { ResumeData } from "../types";
import {
  matchResumeToJD,
  resumeToText,
  matchBySection,
  refineWithAI,
} from "../utils/keywordMatch";
import type {
  JDKeywordResult,
  SectionCoverage,
  AIRefinedResult,
} from "../utils/keywordMatch";
import ExpandableRow from "./ExpandableRow";

interface Props {
  data: ResumeData;
  jd: string;
  setJd: (jd: string) => void;
  onResult?: (result: JDKeywordResult | null) => void;
  onKeywordClick?: (keyword: string) => void;
}

const JDMatchPanel: React.FC<Props> = ({
  data,
  jd,
  setJd,
  onResult,
  onKeywordClick,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<JDKeywordResult | null>(null);
  const [sections, setSections] = useState<SectionCoverage[]>([]);
  const [aiResult, setAiResult] = useState<AIRefinedResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastResultKey, setLastResultKey] = useState(0);
  const prevResultRef = useRef<string>("");

  // Rule-based analysis (debounced)
  useEffect(() => {
    if (!jd.trim() || jd.trim().length < 30) {
      setResult(null);
      setSections([]);
      setAiResult(null);
      onResult?.(null);
      return;
    }
    const timer = setTimeout(() => {
      const resumeText = resumeToText(data);
      const r = matchResumeToJD(resumeText, jd);
      setResult(r);
      setSections(matchBySection(data, jd));
      onResult?.(r);

      if (r) {
        const key = `${r.matched.length}-${r.missing.length}-${jd.length}`;
        if (key !== prevResultRef.current) {
          prevResultRef.current = key;
          setLastResultKey((k) => k + 1);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, jd]);

  // Clear AI result when JD changes
  useEffect(() => {
    setAiResult(null);
    setAiError(null);
  }, [jd]);

  const handleRefineWithAI = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const resumeText = resumeToText(data);
      const refined = await refineWithAI(resumeText, jd);
      setAiResult(refined);
    } catch (err: any) {
      console.error(err);
      setAiError(err?.message || "AI refinement failed. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const hasJD = !!jd.trim() && jd.trim().length >= 30;
  const usingAI = !!aiResult;

  const matchPercent = usingAI
    ? aiResult!.matchPercent
    : (result?.matchPercent ?? 0);
  const matchColor =
    matchPercent >= 75
      ? "var(--success, #2e9e5b)"
      : matchPercent >= 50
        ? "var(--accent, #6d5bd0)"
        : "var(--warning, #c88a00)";

  const badges =
    result && !expanded ? (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 999,
          background: "var(--bg-subtle, #f7f7f8)",
          color: matchColor,
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        {matchPercent}% match
        {usingAI && <span style={{ fontSize: 10, opacity: 0.7 }}>✨</span>}
      </span>
    ) : undefined;

  // Pill
  const Pill: React.FC<{
    label: string;
    kind: "matched" | "missing-high" | "missing-low";
    index: number;
  }> = ({ label, kind, index }) => {
    const palette = {
      matched: {
        bg: "var(--success-subtle, #e8f5ee)",
        color: "var(--success-text, #2e9e5b)",
        icon: "✓",
      },
      "missing-high": {
        bg: "var(--warning-subtle, #fdf6e3)",
        color: "var(--warning-text, #a06e00)",
        icon: "✕",
      },
      "missing-low": {
        bg: "var(--bg-subtle, #f7f7f8)",
        color: "var(--text-secondary, #6b6b70)",
        icon: "·",
      },
    }[kind];

    const isClickable = kind !== "matched" && !!onKeywordClick;
    const baseStyle: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px 3px 8px",
      borderRadius: 999,
      background: palette.bg,
      color: palette.color,
      fontSize: 12,
      fontWeight: 500,
      border: "none",
      animationDelay: `${Math.min(index * 25, 500)}ms`,
    };

    if (!isClickable) {
      return (
        <span className="pill-animate" style={baseStyle}>
          <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.7 }}>
            {palette.icon}
          </span>
          {label}
        </span>
      );
    }

    return (
      <button
        type="button"
        className="pill-animate"
        onClick={() => onKeywordClick?.(label)}
        title={`Click to jump to your Skills section`}
        style={{ ...baseStyle, cursor: "pointer" }}
      >
        <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.7 }}>
          {palette.icon}
        </span>
        {label}
        <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.55 }}>
          →
        </span>
      </button>
    );
  };

  return (
    <ExpandableRow
      id="jd-match"
      title="Job match"
      subtitle={
        expanded
          ? undefined
          : hasJD
            ? usingAI
              ? "AI-refined · Click to see"
              : "Click to see missing keywords"
            : "Paste a job description to see matches"
      }
      badges={badges}
      expanded={expanded}
      onToggle={() => setExpanded((s) => !s)}
    >
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-secondary, #6b6b70)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 6,
        }}
      >
        Paste the job description
      </label>
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job posting here — responsibilities, requirements, everything."
        rows={7}
        style={{
          width: "100%",
          padding: "0.6rem 0.75rem",
          border: "1px solid var(--border-strong, #d8d8dc)",
          borderRadius: 6,
          fontSize: 13,
          fontFamily: "inherit",
          lineHeight: 1.5,
          color: "var(--text-primary, #1a1a1a)",
          background: "var(--bg-input, #fff)",
          resize: "vertical",
          outline: "none",
          marginBottom: "1rem",
          boxSizing: "border-box",
        }}
      />

      {/* Refine with AI row */}
      {hasJD && result && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleRefineWithAI}
            disabled={aiLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              background: usingAI ? "transparent" : "var(--accent, #6d5bd0)",
              color: usingAI ? "var(--accent-text, #6d5bd0)" : "#fff",
              border: usingAI
                ? "1px solid var(--accent, #6d5bd0)"
                : "1px solid transparent",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: aiLoading ? "wait" : "pointer",
            }}
          >
            {aiLoading
              ? "✨ Refining…"
              : usingAI
                ? "✨ Re-refine with AI"
                : "✨ Refine with AI"}
          </button>

          {usingAI && (
            <button
              onClick={() => setAiResult(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary, #6b6b70)",
                fontSize: 12.5,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Use basic match
            </button>
          )}

          <span
            style={{
              fontSize: 11.5,
              color: "var(--text-muted, #9b9b9f)",
            }}
          >
            {usingAI
              ? "AI identified synonyms and context"
              : "Adds synonyms and context — takes a few seconds"}
          </span>
        </div>
      )}

      {aiError && (
        <p
          className="animate-fade-slide"
          style={{
            margin: "0 0 1rem 0",
            fontSize: 12.5,
            color: "var(--danger-text, #d33b3b)",
          }}
        >
          {aiError}
        </p>
      )}

      {/* Results */}
      {result && !aiResult && (
        <div key={lastResultKey}>
          {/* Per-section coverage */}
          {sections.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-secondary, #6b6b70)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Where your keywords live
              </div>
              {sections.map((s, i) => (
                <div
                  key={s.section}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 0",
                    borderBottom:
                      i < sections.length - 1
                        ? "1px solid var(--border, #e2e2e5)"
                        : "none",
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary, #1a1a1a)",
                      width: 110,
                      flexShrink: 0,
                    }}
                  >
                    {s.section}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      minWidth: 0,
                    }}
                  >
                    {s.matchedKeywords.slice(0, 6).map((k) => (
                      <span
                        key={k}
                        style={{
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "var(--bg-subtle, #f7f7f8)",
                          color: "var(--text-secondary, #6b6b70)",
                          fontSize: 11,
                        }}
                      >
                        {k}
                      </span>
                    ))}
                    {s.matchedKeywords.length > 6 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted, #9b9b9f)",
                          alignSelf: "center",
                        }}
                      >
                        +{s.matchedKeywords.length - 6} more
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        s.matchedCount >= 8
                          ? "var(--success, #2e9e5b)"
                          : s.matchedCount >= 4
                            ? "var(--accent, #6d5bd0)"
                            : "var(--text-muted, #9b9b9f)",
                      flexShrink: 0,
                      minWidth: 26,
                      textAlign: "right",
                    }}
                  >
                    {s.matchedCount}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Matched */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--success-text, #2e9e5b)",
                marginBottom: 6,
              }}
            >
              <span aria-hidden="true">✓</span>
              Matched ({result.matched.length})
            </div>
            {result.matched.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.matched.map((k, i) => (
                  <Pill key={k} label={k} kind="matched" index={i} />
                ))}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: "var(--text-muted, #9b9b9f)",
                }}
              >
                No matches yet — add more skills or keywords from the job
                description.
              </p>
            )}
          </div>

          {/* Missing high */}
          {result.missingHigh.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--warning-text, #a06e00)",
                  marginBottom: 6,
                }}
              >
                <span aria-hidden="true">⚠</span>
                High-impact missing ({result.missingHigh.length})
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 400,
                    color: "var(--text-muted, #9b9b9f)",
                  }}
                >
                  — worth adding
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.missingHigh.map((k, i) => (
                  <Pill
                    key={k.word}
                    label={k.word}
                    kind="missing-high"
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Missing low */}
          {result.missingLow.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-secondary, #6b6b70)",
                  marginBottom: 6,
                }}
              >
                <span aria-hidden="true" style={{ opacity: 0.6 }}>
                  ·
                </span>
                Nice-to-have missing ({result.missingLow.length})
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 400,
                    color: "var(--text-muted, #9b9b9f)",
                  }}
                >
                  — low priority
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {result.missingLow.map((k, i) => (
                  <Pill
                    key={k.word}
                    label={k.word}
                    kind="missing-low"
                    index={i}
                  />
                ))}
              </div>
            </div>
          )}

          {result.missingHigh.length > 0 && (
            <div
              style={{
                padding: "0.7rem 0.85rem",
                background: "var(--accent-subtle, #f0edfc)",
                borderLeft: "3px solid var(--accent, #6d5bd0)",
                borderRadius: 4,
                fontSize: 12.5,
                color: "var(--accent-text, #6d5bd0)",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ display: "block", marginBottom: 3 }}>
                💡 How to close the gap
              </strong>
              Click any high-impact keyword to jump to your Skills section. Only
              add keywords that are genuinely true.
            </div>
          )}
        </div>
      )}

      {/* AI refined view */}
      {aiResult && (
        <div className="animate-fade-slide">
          {/* Section scores */}
          {aiResult.sectionScores && aiResult.sectionScores.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--text-secondary, #6b6b70)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Section strength for this role
              </div>
              {aiResult.sectionScores.map((s) => (
                <div key={s.section} style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary, #1a1a1a)",
                      }}
                    >
                      {s.section}
                    </span>
                    <span
                      style={{
                        fontSize: 12.5,
                        fontWeight: 700,
                        color:
                          s.score >= 80
                            ? "var(--success, #2e9e5b)"
                            : s.score >= 60
                              ? "var(--accent, #6d5bd0)"
                              : "var(--warning, #c88a00)",
                      }}
                    >
                      {s.score}/100
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: "var(--progress-track, #e8e8ea)",
                      borderRadius: 999,
                      overflow: "hidden",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      className="progress-fill"
                      style={{
                        height: "100%",
                        width: `${s.score}%`,
                        background:
                          s.score >= 80
                            ? "var(--success, #2e9e5b)"
                            : s.score >= 60
                              ? "var(--accent, #6d5bd0)"
                              : "var(--warning, #c88a00)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary, #6b6b70)",
                      lineHeight: 1.5,
                    }}
                  >
                    {s.note}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Matched (AI) */}
          {aiResult.matched.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--success-text, #2e9e5b)",
                  marginBottom: 6,
                }}
              >
                <span aria-hidden="true">✓</span>
                Matched ({aiResult.matched.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {aiResult.matched.map((k, i) => (
                  <Pill key={k} label={k} kind="matched" index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Missing (AI) */}
          {aiResult.missingHigh.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--warning-text, #a06e00)",
                  marginBottom: 6,
                }}
              >
                <span aria-hidden="true">⚠</span>
                High-impact missing ({aiResult.missingHigh.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {aiResult.missingHigh.map((k, i) => (
                  <Pill key={k} label={k} kind="missing-high" index={i} />
                ))}
              </div>
            </div>
          )}

          {aiResult.missingLow.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-secondary, #6b6b70)",
                  marginBottom: 6,
                }}
              >
                <span aria-hidden="true" style={{ opacity: 0.6 }}>
                  ·
                </span>
                Nice-to-have missing ({aiResult.missingLow.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {aiResult.missingLow.map((k, i) => (
                  <Pill key={k} label={k} kind="missing-low" index={i} />
                ))}
              </div>
            </div>
          )}

          {aiResult.notes && (
            <div
              style={{
                padding: "0.7rem 0.85rem",
                background: "var(--accent-subtle, #f0edfc)",
                borderLeft: "3px solid var(--accent, #6d5bd0)",
                borderRadius: 4,
                fontSize: 12.5,
                color: "var(--accent-text, #6d5bd0)",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ display: "block", marginBottom: 3 }}>
                ✨ AI assessment
              </strong>
              {aiResult.notes}
            </div>
          )}
        </div>
      )}

      {!result && jd.trim().length > 0 && jd.trim().length < 30 && (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: "var(--text-muted, #9b9b9f)",
          }}
        >
          Paste at least a few sentences for keyword analysis.
        </p>
      )}
    </ExpandableRow>
  );
};

export default JDMatchPanel;
