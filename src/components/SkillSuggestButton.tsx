// src/components/SkillSuggestButton.tsx

import { useState, useRef } from "react";
import { suggestSkills } from "../utils/skillSuggest";
import type { SkillSuggestion } from "../utils/skillSuggest";
import { isMissingKeyError, openAISettings } from "../utils/aiKey";

interface Props {
  jd: string;
  currentSkills: string[];
  onAddSkill: (skill: string) => void;
  onAddAll: (skills: string[]) => void;
}

type Step = "idle" | "loading" | "showing";

const CATEGORY_COLORS: Record<
  SkillSuggestion["category"],
  { bg: string; text: string; label: string }
> = {
  technical: {
    bg: "var(--accent-subtle, #f0edfc)",
    text: "var(--accent-text, #6d5bd0)",
    label: "Technical",
  },
  soft: {
    bg: "var(--success-subtle, #e8f5ee)",
    text: "var(--success-text, #2e9e5b)",
    label: "Soft",
  },
  tool: {
    bg: "rgba(251, 191, 36, 0.15)",
    text: "var(--warning-text, #a06e00)",
    label: "Tool",
  },
  certification: {
    bg: "rgba(248, 113, 113, 0.12)",
    text: "var(--danger-text, #d33b3b)",
    label: "Certification",
  },
  domain: {
    bg: "rgba(120, 180, 240, 0.15)",
    text: "#3b82f6",
    label: "Domain",
  },
};

const SkillSuggestButton: React.FC<Props> = ({
  jd,
  currentSkills,
  onAddSkill,
  onAddAll,
}) => {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SkillSuggestion[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const hasJD = !!jd.trim() && jd.trim().length >= 50;

  const handleFetch = async () => {
    setError(null);
    if (!hasJD) {
      setError("Paste a job description in the Job match panel first.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStep("loading");
    setAddedSkills(new Set());

    try {
      const result = await suggestSkills(jd, currentSkills, controller.signal);
      setSuggestions(result.suggestions || []);
      setNotes(result.notes || "");
      setStep("showing");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setStep("idle");
      } else if (isMissingKeyError(err)) {
        openAISettings();
        setStep("idle");
      } else {
        console.error(err);
        setError(err?.message || "Failed to fetch suggestions.");
        setStep("idle");
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (step === "loading") abortRef.current?.abort();
    setStep("idle");
    setSuggestions([]);
    setNotes("");
    setAddedSkills(new Set());
  };

  const handleAdd = (skill: string) => {
    onAddSkill(skill);
    setAddedSkills((prev) => new Set(prev).add(skill));
  };

  const handleAddAll = () => {
    const toAdd = suggestions
      .filter((s) => !addedSkills.has(s.skill))
      .map((s) => s.skill);
    if (toAdd.length === 0) return;
    onAddAll(toAdd);
    setAddedSkills(new Set(suggestions.map((s) => s.skill)));
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
        <button
          type="button"
          onClick={handleFetch}
          disabled={!hasJD}
          title={
            hasJD
              ? "AI suggests skills from the job description"
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
          ✨ Suggest from job
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

  // ---------- loading ----------
  if (step === "loading") {
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
          }}
        >
          ✨ Reading the job description…
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
  }

  // ---------- showing suggestions ----------
  const remaining = suggestions.filter((s) => !addedSkills.has(s.skill));
  const allAdded = remaining.length === 0;

  return (
    <div
      className="animate-fade-slide"
      style={{
        width: "100%",
        background: "var(--bg-subtle, #f7f7f8)",
        border: "1px solid var(--border, #e2e2e5)",
        borderRadius: 8,
        padding: "0.85rem 1rem",
        marginTop: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary, #1a1a1a)",
          }}
        >
          {allAdded
            ? "✓ All suggestions added"
            : `✨ ${remaining.length} skill${remaining.length === 1 ? "" : "s"} suggested`}
        </div>
        {notes && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-muted, #9b9b9f)",
              fontStyle: "italic",
            }}
          >
            {notes}
          </div>
        )}
      </div>

      <p
        style={{
          margin: "0 0 10px 0",
          fontSize: 12,
          color: "var(--text-secondary, #6b6b70)",
          lineHeight: 1.5,
        }}
      >
        Click any to add it to your skills — only add the ones that are
        genuinely true for you.
      </p>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        {suggestions.map((s) => {
          const added = addedSkills.has(s.skill);
          const palette =
            CATEGORY_COLORS[s.category] || CATEGORY_COLORS.technical;
          return (
            <button
              key={s.skill}
              type="button"
              onClick={() => !added && handleAdd(s.skill)}
              disabled={added}
              title={`${palette.label}${added ? " — added" : " — click to add"}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                background: added ? "var(--bg-surface, #fff)" : palette.bg,
                color: added ? "var(--text-muted, #9b9b9f)" : palette.text,
                border: added
                  ? "1px solid var(--border, #e2e2e5)"
                  : "1px solid transparent",
                fontSize: 12,
                fontWeight: 500,
                cursor: added ? "default" : "pointer",
                opacity: added ? 0.7 : 1,
                transition: "transform 0.12s ease, opacity 0.12s ease",
              }}
              onMouseEnter={(e) => {
                if (!added) {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.opacity = "0.9";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.opacity = "1";
              }}
            >
              <span
                aria-hidden="true"
                style={{ fontSize: 11, fontWeight: 700, lineHeight: 1 }}
              >
                {added ? "✓" : "+"}
              </span>
              {s.skill}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!allAdded && (
          <button
            type="button"
            onClick={handleAddAll}
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
            + Add all {remaining.length}
          </button>
        )}

        <button
          type="button"
          onClick={handleFetch}
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
          ↻ Regenerate
        </button>

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
          Close
        </button>
      </div>
    </div>
  );
};

export default SkillSuggestButton;
