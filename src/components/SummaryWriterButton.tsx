// src/components/SummaryWriterButton.tsx

import { useState, useRef, useEffect } from "react";
import type { ResumeData } from "../types";
import { writeSummary, previewIngredients } from "../utils/summaryWriter";
import type { SummaryStyle, SummaryIngredients } from "../utils/summaryWriter";
import { isMissingKeyError, openAISettings } from "../utils/aiKey";

interface Props {
  data: ResumeData;
  jd: string;
  onGenerated: (newSummary: string, previousSummary: string) => void;
}

type Step = "idle" | "previewing" | "loading";

const SummaryWriterButton: React.FC<Props> = ({ data, jd, onGenerated }) => {
  const [step, setStep] = useState<Step>("idle");
  const [style, setStyle] = useState<SummaryStyle>("professional");
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SummaryIngredients | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasJD = !!jd.trim() && jd.trim().length >= 50;

  useEffect(() => {
    if (step === "previewing" && hasJD) {
      setPreview(previewIngredients(data, jd));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, jd, step, hasJD]);

  const handleStart = () => {
    setError(null);
    if (!hasJD) {
      setError("Paste a job description in the Job match panel first.");
      return;
    }
    setShowStyleMenu(false);

    const ingredients = previewIngredients(data, jd);
    if (!ingredients.hasEnoughContext) {
      setError(
        "Add at least one work experience, a few skills, or an education entry before writing.",
      );
      return;
    }
    setPreview(ingredients);
    setStep("previewing");
  };

  const handleConfirmWrite = async () => {
    if (!preview) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStep("loading");
    setError(null);

    const previousSummary = data.summary;

    try {
      const result = await writeSummary({
        resumeData: data,
        jobDescription: jd,
        style,
        ingredients: preview,
        signal: controller.signal,
      });
      onGenerated(result, previousSummary);
      setStep("idle");
      setPreview(null);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // silent cancel
      } else if (isMissingKeyError(err)) {
        openAISettings();
        setStep("idle");
        setPreview(null);
      } else {
        console.error(err);
        setError(err?.message || "Failed to write summary.");
        setStep("idle");
        setPreview(null);
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (step === "loading") abortRef.current?.abort();
    setStep("idle");
    setPreview(null);
    setError(null);
  };

  const jumpToSkills = () => {
    document
      .getElementById("section-skills")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setStep("idle");
    setPreview(null);
  };

  // ---------- idle ----------
  if (step === "idle") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowStyleMenu((s) => !s)}
            disabled={!hasJD}
            style={{
              padding: "5px 10px",
              background: "transparent",
              color: "var(--text-secondary, #6b6b70)",
              border: "1px solid var(--border, #e2e2e5)",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              cursor: hasJD ? "pointer" : "not-allowed",
              opacity: hasJD ? 1 : 0.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {style === "professional" ? "Professional" : "Bold"}
            <span aria-hidden="true" style={{ fontSize: 9, opacity: 0.6 }}>
              ▾
            </span>
          </button>
          {showStyleMenu && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                zIndex: 20,
                minWidth: 180,
                background: "var(--bg-surface, #fff)",
                border: "1px solid var(--border, #e2e2e5)",
                borderRadius: 8,
                padding: 4,
                boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.1))",
              }}
            >
              {(
                [
                  {
                    id: "professional",
                    label: "Professional",
                    desc: "Balanced, factual",
                  },
                  {
                    id: "bold",
                    label: "Bold",
                    desc: "Confident, achievement-led",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setStyle(opt.id);
                    setShowStyleMenu(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    background:
                      style === opt.id
                        ? "var(--accent-subtle, #f0edfc)"
                        : "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12.5,
                    color:
                      style === opt.id
                        ? "var(--accent-text, #6d5bd0)"
                        : "var(--text-primary, #1a1a1a)",
                    fontWeight: style === opt.id ? 600 : 500,
                  }}
                >
                  <div>{opt.label}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted, #9b9b9f)",
                      fontWeight: 400,
                      marginTop: 1,
                    }}
                  >
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleStart}
          disabled={!hasJD}
          title={
            hasJD
              ? "Write a summary based on your real experience, targeted at this job"
              : "Paste a job description in Job match first"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            background: hasJD
              ? "var(--accent, #6d5bd0)"
              : "var(--bg-subtle, #f7f7f8)",
            color: hasJD ? "#fff" : "var(--text-muted, #9b9b9f)",
            border: "none",
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: hasJD ? "pointer" : "not-allowed",
            transition: "background 0.15s ease, transform 0.12s ease",
          }}
          onMouseEnter={(e) => {
            if (hasJD) {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.filter = "brightness(1.08)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          ✨{" "}
          {data.summary.trim() ? "Rewrite for this job" : "Write for this job"}
        </button>

        {error && (
          <span
            className="animate-fade-slide"
            style={{
              fontSize: 12,
              color: "var(--danger-text, #d33b3b)",
              fontWeight: 500,
              width: "100%",
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }

  // ---------- previewing ----------
  if (step === "previewing" && preview) {
    const strongCount = preview.matchedKeywords.length;
    const extrasCount = preview.extraStrengths.length;
    const missingCount = preview.missingKeywords.length;
    const strongMatch = strongCount >= 8 && missingCount <= 5;

    return (
      <div
        className="animate-fade-slide"
        style={{
          width: "100%",
          background: "var(--bg-subtle, #f7f7f8)",
          border: "1px solid var(--border, #e2e2e5)",
          borderRadius: 8,
          padding: "0.85rem 1rem",
          marginTop: 4,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, #1a1a1a)",
            marginBottom: 8,
          }}
        >
          {strongMatch
            ? "✨ Ready to write a strong summary"
            : missingCount > 0
              ? "⚠ Some JD skills are missing from your resume"
              : "✨ Ready to write"}
        </div>

        {strongCount > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--success-text, #2e9e5b)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
              }}
            >
              ✓ Skills you have that the JD asks for ({strongCount})
            </div>
            <p
              style={{
                margin: "0 0 6px 0",
                fontSize: 11.5,
                color: "var(--text-muted, #9b9b9f)",
                lineHeight: 1.5,
              }}
            >
              These come from your resume (Skills + experience) and match the
              job. The AI will use 3–5 of them.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {preview.matchedKeywords.slice(0, 12).map((k) => (
                <span
                  key={k}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--success-subtle, #e8f5ee)",
                    color: "var(--success-text, #2e9e5b)",
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {k}
                </span>
              ))}
              {preview.matchedKeywords.length > 12 && (
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted, #9b9b9f)",
                    alignSelf: "center",
                  }}
                >
                  +{preview.matchedKeywords.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}

        {extrasCount > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent-text, #6d5bd0)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
              }}
            >
              ✨ Your other real skills ({extrasCount}) — not in the JD, but may
              be added
            </div>
            <p
              style={{
                margin: "0 0 6px 0",
                fontSize: 11.5,
                color: "var(--text-muted, #9b9b9f)",
                lineHeight: 1.5,
              }}
            >
              Not required by the job, but they add depth. The AI will use 1–2
              if they fit naturally.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {preview.extraStrengths.map((k) => (
                <span
                  key={k}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--accent-subtle, #f0edfc)",
                    color: "var(--accent-text, #6d5bd0)",
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {missingCount > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--warning-text, #a06e00)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 4,
              }}
            >
              ⚠ JD keywords NOT in your resume ({missingCount}) — won't be used
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {preview.highImpactMissing.map((k) => (
                <span
                  key={k}
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "var(--warning-subtle, #fdf6e3)",
                    color: "var(--warning-text, #a06e00)",
                    fontSize: 11.5,
                    fontWeight: 500,
                  }}
                >
                  {k}
                </span>
              ))}
              {missingCount > preview.highImpactMissing.length && (
                <span
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted, #9b9b9f)",
                    alignSelf: "center",
                  }}
                >
                  +{missingCount - preview.highImpactMissing.length} more
                </span>
              )}
            </div>
          </div>
        )}

        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
        >
          <button
            type="button"
            onClick={handleConfirmWrite}
            style={{
              padding: "6px 14px",
              background: "var(--accent, #6d5bd0)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ✨ Write with what I have
          </button>

          {missingCount > 0 && (
            <button
              type="button"
              onClick={jumpToSkills}
              style={{
                padding: "6px 14px",
                background: "transparent",
                color: "var(--accent, #6d5bd0)",
                border: "1px solid var(--accent, #6d5bd0)",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Add skills first →
            </button>
          )}

          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: "6px 12px",
              background: "transparent",
              color: "var(--text-secondary, #6b6b70)",
              border: "none",
              borderRadius: 6,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------- loading ----------
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 12.5,
          color: "var(--accent-text, #6d5bd0)",
          fontWeight: 500,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        ✨ Writing from your experience…
      </span>
      <button
        type="button"
        onClick={handleCancel}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--danger-text, #d33b3b)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ✕ Cancel
      </button>
    </div>
  );
};

export default SummaryWriterButton;
