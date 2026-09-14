// src/components/ResumeForm.tsx

import { useState } from "react";
import type { ResumeData } from "../types";
import SummaryWriterButton from "./SummaryWriterButton";
import SkillSuggestButton from "./SkillSuggestButton";

interface Props {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  jd?: string;
  resumeId?: string;
  onSummaryGenerated?: (newSummary: string, previousSummary: string) => void;
}

// ============================================================
// Validation & formatting helpers
// ============================================================

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("04")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10 && /^0[2378]/.test(digits)) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("61")) {
    return `+61 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return raw;
};

const validatePhone = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("04")) return null;
  if (digits.length === 10 && /^0[2378]/.test(digits)) return null;
  if (digits.length === 11 && digits.startsWith("61")) return null;
  if (digits.length >= 10 && digits.length <= 15) return null;
  return "Enter a valid phone number — AU mobile (04XX XXX XXX), landline (02) XXXX XXXX, or +61 XXX XXX XXX.";
};

const SKILL_LENGTH_LIMIT = 40;
const SKILL_COUNT_SOFT_LIMIT = 25;
const SUMMARY_IDEAL_MAX = 600;
const BULLET_LENGTH_LIMIT = 220;
const BULLET_COUNT_SOFT_LIMIT = 8;
const AWARD_DESCRIPTION_LIMIT = 200;

interface BulletAnalysis {
  count: number;
  longLines: { preview: string; length: number; lineNumber: number }[];
  averageLength: number;
}

const analyzeBullets = (text: string): BulletAnalysis => {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
  const longLines = lines
    .map((l, i) => ({
      preview: l.slice(0, 40),
      length: l.length,
      lineNumber: i + 1,
    }))
    .filter((l) => l.length > BULLET_LENGTH_LIMIT);
  const averageLength =
    lines.length > 0
      ? Math.round(lines.reduce((sum, l) => sum + l.length, 0) / lines.length)
      : 0;
  return { count: lines.length, longLines, averageLength };
};

// ============================================================
// Reusable UI
// ============================================================

const SectionCard: React.FC<{
  title: string;
  hint?: string;
  variant?: "default" | "muted";
  action?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}> = ({ title, hint, variant = "default", action, id, children }) => (
  <section
    id={id}
    style={{
      background:
        variant === "muted"
          ? "var(--bg-subtle, #f7f7f8)"
          : "var(--bg-surface, #fff)",
      border: "1px solid var(--border, #e2e2e5)",
      borderRadius: 8,
      padding: "1.1rem 1.25rem",
      marginBottom: "0.85rem",
      scrollMarginTop: 80,
    }}
  >
    <div style={{ marginBottom: hint ? "0.85rem" : "0.75rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary, #1a1a1a)",
          }}
        >
          {title}
        </h3>
        {action}
      </div>
      {hint && (
        <p
          style={{
            margin: "5px 0 0 0",
            fontSize: 13,
            color: "var(--text-secondary, #6b6b70)",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </p>
      )}
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ marginBottom: "0.6rem" }}>
    <label
      style={{
        display: "block",
        fontSize: 14,
        fontWeight: 500,
        color: "var(--text-primary, #1a1a1a)",
        marginBottom: 5,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);

const FieldError: React.FC<{ id: string; message: string }> = ({
  id,
  message,
}) => (
  <p
    id={id}
    role="alert"
    aria-live="assertive"
    className="animate-fade-slide"
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 6,
      margin: "2px 0 0.6rem 0",
      fontSize: 12.5,
      color: "var(--danger-text, #d33b3b)",
      lineHeight: 1.45,
      fontWeight: 500,
    }}
  >
    <span aria-hidden="true" style={{ flexShrink: 0 }}>
      ✕
    </span>
    <span>{message}</span>
  </p>
);

const FieldWarning: React.FC<{ message: React.ReactNode }> = ({ message }) => (
  <div
    role="status"
    aria-live="polite"
    className="animate-fade-slide"
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 6,
      marginTop: 4,
      marginBottom: "0.6rem",
      fontSize: 12.5,
      color: "var(--warning-text, #a06e00)",
      lineHeight: 1.45,
    }}
  >
    <span aria-hidden="true" style={{ flexShrink: 0 }}>
      ⚠
    </span>
    <span>{message}</span>
  </div>
);

const FieldInfo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 6,
      marginTop: 4,
      fontSize: 12,
      color: "var(--text-secondary, #6b6b70)",
      lineHeight: 1.5,
    }}
  >
    <span aria-hidden="true" style={{ flexShrink: 0, opacity: 0.6 }}>
      ℹ
    </span>
    <span>{children}</span>
  </div>
);

const ExampleBox: React.FC<{
  intro?: string;
  strong: string[];
  weak: string[];
}> = ({ intro, strong, weak }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--accent, #6d5bd0)",
          fontSize: 12.5,
          fontWeight: 500,
          padding: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span aria-hidden="true">{open ? "▾" : "▸"}</span>
        {open ? "Hide examples" : "See examples"}
      </button>

      {open && (
        <div
          className="animate-fade-slide"
          style={{
            marginTop: 8,
            padding: "0.85rem 0.9rem",
            background: "var(--bg-subtle, #f7f7f8)",
            border: "1px solid var(--border, #e2e2e5)",
            borderRadius: 8,
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          {intro && (
            <p
              style={{
                margin: "0 0 10px 0",
                color: "var(--text-secondary, #6b6b70)",
              }}
            >
              {intro}
            </p>
          )}

          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--success-text, #2e9e5b)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 5,
              }}
            >
              <span aria-hidden="true">✓</span> Strong
            </div>
            {strong.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  background: "var(--success-subtle, #e8f5ee)",
                  borderRadius: 6,
                  color: "var(--text-primary, #1a1a1a)",
                  marginBottom: 4,
                }}
              >
                {s}
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--danger-text, #d33b3b)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 5,
              }}
            >
              <span aria-hidden="true">✕</span> Weak
            </div>
            {weak.map((w, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  background: "var(--danger-subtle, #fbeaea)",
                  borderRadius: 6,
                  color: "var(--text-secondary, #6b6b70)",
                  marginBottom: 4,
                }}
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const UnknownChip: React.FC<{ onUndo: () => void }> = ({ onUndo }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: -4,
      marginBottom: "0.6rem",
      fontSize: 12,
      color: "var(--text-secondary, #6b6b70)",
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        background: "var(--bg-subtle, #f7f7f8)",
        fontSize: 11.5,
        fontWeight: 500,
      }}
    >
      ✓ Dates unknown
    </span>
    <button
      type="button"
      onClick={onUndo}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--accent, #6d5bd0)",
        fontSize: 12,
        fontWeight: 500,
        padding: 0,
        cursor: "pointer",
      }}
    >
      Undo
    </button>
  </div>
);

const CharCounter: React.FC<{
  current: number;
  ideal: number;
  label: string;
}> = ({ current, ideal, label }) => {
  const pct = Math.min((current / ideal) * 100, 130);
  const over = current > ideal;
  const near = current > ideal * 0.85 && !over;

  const color = over
    ? "var(--warning, #c88a00)"
    : near
      ? "var(--accent, #6d5bd0)"
      : "var(--text-muted, #9b9b9f)";

  return (
    <div style={{ marginTop: 4 }}>
      <div className="char-bar-track">
        <div
          className="char-bar-fill"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: color,
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11.5,
          color,
          fontWeight: 500,
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 4,
        }}
      >
        <span>
          {current} / {ideal} {label}
        </span>
        {over && (
          <span style={{ fontWeight: 600 }}>Over by {current - ideal}</span>
        )}
      </div>
    </div>
  );
};

const BulletAnalysisRow: React.FC<{ text: string; label: string }> = ({
  text,
  label,
}) => {
  const analysis = analyzeBullets(text);
  if (analysis.count === 0) return null;

  const tooMany = analysis.count > BULLET_COUNT_SOFT_LIMIT;
  const hasLong = analysis.longLines.length > 0;

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          color: "var(--text-muted, #9b9b9f)",
          marginTop: -2,
          marginBottom: 4,
        }}
      >
        <span>
          {analysis.count} {label}
        </span>
        {analysis.averageLength > 0 && (
          <span style={{ opacity: 0.6 }}>
            ~{analysis.averageLength} chars avg
          </span>
        )}
      </div>

      {hasLong && (
        <FieldWarning
          message={
            <>
              {analysis.longLines.length === 1
                ? `Line ${analysis.longLines[0].lineNumber} is ${analysis.longLines[0].length} characters.`
                : `${analysis.longLines.length} lines are over ${BULLET_LENGTH_LIMIT} characters (lines ${analysis.longLines
                    .map((l) => l.lineNumber)
                    .join(", ")}).`}{" "}
              Ideal bullets are 1–2 lines. Split long ones or trim to the
              strongest point.
            </>
          }
        />
      )}

      {tooMany && (
        <FieldWarning
          message={`${analysis.count} bullets is a lot for one role. 4–6 strongest bullets make more impact than a full list.`}
        />
      )}
    </>
  );
};

// ============================================================
// Skills input — remounts on resume change
// ============================================================
const SkillsInput: React.FC<{
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  error: string | null;
  setError: (msg: string | null) => void;
}> = ({ data, onChange, error, setError }) => {
  const [raw, setRaw] = useState(() => data.skills.join(", "));

  const commitRaw = (value: string) => {
    setRaw(value);
    const skills = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...data, skills });

    const tooLong = skills.find((s) => s.length > SKILL_LENGTH_LIMIT);
    if (tooLong) {
      setError(
        `"${tooLong.slice(0, 30)}${tooLong.length > 30 ? "…" : ""}" is ${tooLong.length} characters. Skills should be short keywords — trim to under ${SKILL_LENGTH_LIMIT} characters.`,
      );
    } else {
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const trimmed = raw.trim();
      if (!trimmed) return;
      const next = trimmed.endsWith(",") ? `${trimmed} ` : `${trimmed}, `;
      commitRaw(next);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    const next = data.skills.filter((s) => s !== skillToRemove);
    const nextRaw = next.join(", ");
    setRaw(nextRaw);
    onChange({ ...data, skills: next });
    const tooLong = next.find((s) => s.length > SKILL_LENGTH_LIMIT);
    setError(
      tooLong
        ? `A skill is over ${SKILL_LENGTH_LIMIT} characters — trim it to a short keyword.`
        : null,
    );
  };

  return (
    <>
      <input
        id="skills-input"
        placeholder="React, TypeScript, Node.js, PostgreSQL, AWS"
        value={raw}
        onChange={(e) => commitRaw(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-invalid={!!error}
        aria-describedby={error ? "skills-error" : undefined}
        style={{
          display: "block",
          width: "100%",
          padding: "0.55rem 0.7rem",
          marginBottom: "0.5rem",
          border: `1px solid ${
            error ? "var(--danger, #d33b3b)" : "var(--border-strong, #d8d8dc)"
          }`,
          borderRadius: 6,
          fontSize: 14,
          background: "var(--bg-input, #fff)",
          color: "var(--text-primary, #1a1a1a)",
          outline: "none",
        }}
      />

      {error && <FieldError id="skills-error" message={error} />}

      {data.skills.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}
        >
          {data.skills.map((skill, i) => {
            const tooLong = skill.length > SKILL_LENGTH_LIMIT;
            return (
              <span
                key={`${skill}-${i}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 8px 3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  background: tooLong
                    ? "var(--danger-subtle, #fbeaea)"
                    : "var(--accent-subtle, #f0edfc)",
                  color: tooLong
                    ? "var(--danger-text, #d33b3b)"
                    : "var(--accent-text, #6d5bd0)",
                }}
              >
                {tooLong && <span aria-hidden="true">✕</span>}
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  aria-label={`Remove ${skill}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                    opacity: 0.6,
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 6,
          fontSize: 12,
          color: "var(--text-muted, #9b9b9f)",
          lineHeight: 1.5,
        }}
      >
        <span aria-hidden="true" style={{ opacity: 0.6 }}>
          ℹ
        </span>
        <span>
          Separate skills with a{" "}
          <strong style={{ fontWeight: 600 }}>comma</strong>, or press{" "}
          <kbd style={kbdStyle}>Enter</kbd> after each one.
        </span>
      </div>

      {data.skills.length > SKILL_COUNT_SOFT_LIMIT && (
        <FieldWarning
          message={`You have ${data.skills.length} skills. 25+ can make a resume look unfocused — consider trimming to your strongest 15–20.`}
        />
      )}

      {data.skills.length > 0 &&
        data.skills.length <= SKILL_COUNT_SOFT_LIMIT &&
        !error && (
          <FieldInfo>
            {data.skills.length} skill{data.skills.length === 1 ? "" : "s"} —
            rendered comma-separated in the PDF.
          </FieldInfo>
        )}
    </>
  );
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 5px",
  fontSize: 11,
  fontFamily: "inherit",
  fontWeight: 600,
  background: "var(--bg-subtle, #f7f7f8)",
  border: "1px solid var(--border, #e2e2e5)",
  borderRadius: 4,
  color: "var(--text-secondary, #6b6b70)",
};

// ============================================================
// Main component
// ============================================================

const ResumeForm: React.FC<Props> = ({
  data,
  onChange,
  jd = "",
  resumeId = "default",
  onSummaryGenerated,
}) => {
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [skillsRawSnapshot, setSkillsRawSnapshot] = useState(() =>
    data.skills.join(", "),
  );

  const setError = (field: string, message: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const updatePersonalInfo = (field: string, value: string) =>
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });

  const handlePhoneChange = (value: string) => {
    updatePersonalInfo("phone", value);
    if (errors.phone) setError("phone", validatePhone(value));
  };

  const handlePhoneBlur = (raw: string) => {
    const err = validatePhone(raw);
    setError("phone", err);
    if (!err && raw.trim()) updatePersonalInfo("phone", formatPhone(raw));
  };

  const companySuggestions = Array.from(
    new Set(data.experience.map((e) => e.company.trim()).filter(Boolean)),
  );

  // --- Experience ---
  const addExperience = () =>
    onChange({
      ...data,
      experience: [
        ...data.experience,
        {
          id: crypto.randomUUID(),
          company: "",
          role: "",
          startDate: "",
          endDate: "",
          description: "",
          datesUnknown: false,
        },
      ],
    });
  const updateExperience = (id: string, field: string, value: any) =>
    onChange({
      ...data,
      experience: data.experience.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    });
  const removeExperience = (id: string) =>
    onChange({
      ...data,
      experience: data.experience.filter((e) => e.id !== id),
    });

  // --- Education ---
  const addEducation = () =>
    onChange({
      ...data,
      education: [
        ...data.education,
        {
          id: crypto.randomUUID(),
          institution: "",
          degree: "",
          fieldOfStudy: "",
          graduationDate: "",
          graduationStatus: "graduated",
        },
      ],
    });
  const updateEducation = (id: string, field: string, value: any) =>
    onChange({
      ...data,
      education: data.education.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    });
  const removeEducation = (id: string) =>
    onChange({ ...data, education: data.education.filter((e) => e.id !== id) });

  // --- Projects ---
  const addProject = () =>
    onChange({
      ...data,
      projects: [
        ...data.projects,
        {
          id: crypto.randomUUID(),
          name: "",
          description: "",
          technologies: "",
          link: "",
          startDate: "",
          endDate: "",
          datesUnknown: false,
        },
      ],
    });
  const updateProject = (id: string, field: string, value: any) =>
    onChange({
      ...data,
      projects: data.projects.map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    });
  const removeProject = (id: string) =>
    onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });

  // --- Certifications ---
  const addCertification = () =>
    onChange({
      ...data,
      certifications: [
        ...data.certifications,
        {
          id: crypto.randomUUID(),
          name: "",
          issuer: "",
          date: "",
          credentialId: "",
        },
      ],
    });
  const updateCertification = (id: string, field: string, value: string) =>
    onChange({
      ...data,
      certifications: data.certifications.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    });
  const removeCertification = (id: string) =>
    onChange({
      ...data,
      certifications: data.certifications.filter((c) => c.id !== id),
    });

  // --- Languages ---
  const addLanguage = () =>
    onChange({
      ...data,
      languages: [
        ...data.languages,
        { id: crypto.randomUUID(), name: "", proficiency: "" },
      ],
    });
  const updateLanguage = (id: string, field: string, value: string) =>
    onChange({
      ...data,
      languages: data.languages.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      ),
    });
  const removeLanguage = (id: string) =>
    onChange({ ...data, languages: data.languages.filter((l) => l.id !== id) });

  // --- Volunteer ---
  const addVolunteer = () =>
    onChange({
      ...data,
      volunteer: [
        ...data.volunteer,
        {
          id: crypto.randomUUID(),
          organization: "",
          role: "",
          startDate: "",
          endDate: "",
          description: "",
          datesUnknown: false,
        },
      ],
    });
  const updateVolunteer = (id: string, field: string, value: any) =>
    onChange({
      ...data,
      volunteer: data.volunteer.map((v) =>
        v.id === id ? { ...v, [field]: value } : v,
      ),
    });
  const removeVolunteer = (id: string) =>
    onChange({ ...data, volunteer: data.volunteer.filter((v) => v.id !== id) });

  // --- Awards ---
  const addAward = () =>
    onChange({
      ...data,
      awards: [
        ...data.awards,
        {
          id: crypto.randomUUID(),
          title: "",
          issuer: "",
          date: "",
          description: "",
        },
      ],
    });
  const updateAward = (id: string, field: string, value: string) =>
    onChange({
      ...data,
      awards: data.awards.map((a) =>
        a.id === id ? { ...a, [field]: value } : a,
      ),
    });
  const removeAward = (id: string) =>
    onChange({ ...data, awards: data.awards.filter((a) => a.id !== id) });

  // --- Custom Sections ---
  const addCustomSection = () =>
    onChange({
      ...data,
      customSections: [
        ...data.customSections,
        { id: crypto.randomUUID(), title: "", bullets: [""] },
      ],
    });
  const updateCustomSectionTitle = (id: string, title: string) =>
    onChange({
      ...data,
      customSections: data.customSections.map((s) =>
        s.id === id ? { ...s, title } : s,
      ),
    });
  const updateCustomBullet = (
    sectionId: string,
    index: number,
    value: string,
  ) =>
    onChange({
      ...data,
      customSections: data.customSections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              bullets: s.bullets.map((b, i) => (i === index ? value : b)),
            }
          : s,
      ),
    });
  const addCustomBullet = (sectionId: string) =>
    onChange({
      ...data,
      customSections: data.customSections.map((s) =>
        s.id === sectionId ? { ...s, bullets: [...s.bullets, ""] } : s,
      ),
    });
  const removeCustomBullet = (sectionId: string, index: number) =>
    onChange({
      ...data,
      customSections: data.customSections.map((s) =>
        s.id === sectionId
          ? { ...s, bullets: s.bullets.filter((_, i) => i !== index) }
          : s,
      ),
    });
  const removeCustomSection = (id: string) =>
    onChange({
      ...data,
      customSections: data.customSections.filter((s) => s.id !== id),
    });

  const summaryOverLimit = data.summary.length > SUMMARY_IDEAL_MAX;

  // --- Skill suggestions from JD ---
  const handleAddSuggestedSkill = (skill: string) => {
    if (!skill.trim()) return;
    if (data.skills.some((s) => s.toLowerCase() === skill.toLowerCase()))
      return;
    const next = [...data.skills, skill];
    onChange({ ...data, skills: next });
    setSkillsRawSnapshot(next.join(", "));
  };

  const handleAddAllSuggested = (skills: string[]) => {
    const existingLower = new Set(data.skills.map((s) => s.toLowerCase()));
    const toAdd = skills
      .map((s) => s.trim())
      .filter((s) => s && !existingLower.has(s.toLowerCase()));
    if (toAdd.length === 0) return;
    const next = [...data.skills, ...toAdd];
    onChange({ ...data, skills: next });
    setSkillsRawSnapshot(next.join(", "));
  };

  const PresentButton = ({ onClick }: { onClick: () => void }) => (
    <button type="button" onClick={onClick} style={smallGhostBtnStyle}>
      Present
    </button>
  );

  const UnknownButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      style={smallGhostBtnStyle}
      title="I don't remember the exact dates for this role"
    >
      Unknown
    </button>
  );

  const getDateWarning = (item: {
    startDate: string;
    endDate: string;
    datesUnknown?: boolean;
  }) => {
    if (item.datesUnknown) return null;
    const hasStart = item.startDate.trim().length > 0;
    const hasEnd = item.endDate.trim().length > 0;
    if (!hasStart && !hasEnd)
      return "No dates added — recruiters often skip roles without dates.";
    if (!hasStart)
      return "Missing start date — add one, or mark dates as unknown.";
    if (!hasEnd)
      return "Missing end date — click Present if ongoing, or Unknown if you don't recall.";
    return null;
  };

  return (
    <div>
      <datalist id="company-suggestions">
        {companySuggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* ---------- Personal info ---------- */}
      <SectionCard
        id="section-personal"
        title="Personal information"
        hint="City and region are enough. LinkedIn and website become clickable links in the PDF."
      >
        <Field label="Full name">
          <input
            placeholder="Jane Doe"
            value={data.personalInfo.fullName}
            onChange={(e) => updatePersonalInfo("fullName", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input
            placeholder="jane@example.com"
            value={data.personalInfo.email}
            onChange={(e) => updatePersonalInfo("email", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Phone">
          <input
            id="phone-input"
            placeholder="0451 040 548"
            value={data.personalInfo.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={(e) => handlePhoneBlur(e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            style={{
              ...inputStyle,
              borderColor: errors.phone ? "var(--danger, #d33b3b)" : undefined,
            }}
          />
        </Field>
        {errors.phone && <FieldError id="phone-error" message={errors.phone} />}
        <Field label="City / Region">
          <input
            placeholder="Sydney, NSW"
            value={data.personalInfo.location}
            onChange={(e) => updatePersonalInfo("location", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="Website (optional)">
          <input
            placeholder="yourportfolio.com"
            value={data.personalInfo.website || ""}
            onChange={(e) => updatePersonalInfo("website", e.target.value)}
            style={inputStyle}
          />
        </Field>
        <Field label="LinkedIn (optional)">
          <input
            placeholder="linkedin.com/in/janedoe"
            value={data.personalInfo.linkedin || ""}
            onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
            style={inputStyle}
          />
        </Field>
      </SectionCard>

      {/* ---------- Professional summary ---------- */}
      <SectionCard
        id="section-summary"
        title="Professional summary"
        hint="3–4 lines pitching who you are and what you're targeting."
        action={
          onSummaryGenerated ? (
            <SummaryWriterButton
              data={data}
              jd={jd}
              onGenerated={onSummaryGenerated}
            />
          ) : undefined
        }
      >
        <textarea
          placeholder="Frontend engineer with 4 years of experience building React apps..."
          value={data.summary}
          onChange={(e) => onChange({ ...data, summary: e.target.value })}
          rows={4}
          style={inputStyle}
        />
        {data.summary.length > 0 && (
          <CharCounter
            current={data.summary.length}
            ideal={SUMMARY_IDEAL_MAX}
            label="characters (ideal)"
          />
        )}
        {summaryOverLimit && (
          <FieldWarning
            message={`Your summary is ${
              data.summary.length - SUMMARY_IDEAL_MAX
            } characters over the ideal length. Recruiters skim — cut anything that isn't your strongest differentiator.`}
          />
        )}
        <ExampleBox
          intro="A strong summary names your role, your years of experience, your strongest proof point, and what you're targeting."
          strong={[
            "Frontend engineer with 4 years of experience building React apps at scale. Led migration to React 18, cutting load time by 40%. Targeting a mid-level role at a product-led company.",
            "Hospitality leader with 5+ years at Hungry Jack's, progressing from Crew Member to Assistant Manager. Certified in Unleash People Power and Driving Quality Profit. Seeking an Assistant Restaurant Manager role.",
          ]}
          weak={[
            "I am a hard-working individual looking for opportunities to grow in a dynamic company where I can utilize my skills and experience.",
            "Experienced professional with a passion for excellence and a proven track record of success.",
          ]}
        />
      </SectionCard>

      {/* ---------- Work experience ---------- */}
      <SectionCard
        id="section-experience"
        title="Work experience"
        hint="Most recent first. One bullet per line — start with an action verb."
      >
        {data.experience.map((exp) => {
          const warning = getDateWarning(exp);
          return (
            <div key={exp.id} style={entryCardStyle}>
              <Field label="Company">
                <input
                  list="company-suggestions"
                  placeholder="Start typing to reuse a past company"
                  value={exp.company}
                  onChange={(e) =>
                    updateExperience(exp.id, "company", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="Role">
                <input
                  placeholder="Frontend Engineer"
                  value={exp.role}
                  onChange={(e) =>
                    updateExperience(exp.id, "role", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <Field label="Start">
                    <input
                      placeholder="Jan 2022"
                      value={exp.startDate}
                      onChange={(e) =>
                        updateExperience(exp.id, "startDate", e.target.value)
                      }
                      disabled={exp.datesUnknown}
                      style={{
                        ...inputStyle,
                        opacity: exp.datesUnknown ? 0.5 : 1,
                      }}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="End">
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <input
                        placeholder="Present"
                        value={exp.endDate}
                        onChange={(e) =>
                          updateExperience(exp.id, "endDate", e.target.value)
                        }
                        disabled={exp.datesUnknown}
                        style={{
                          ...inputStyle,
                          marginBottom: 0,
                          opacity: exp.datesUnknown ? 0.5 : 1,
                        }}
                      />
                      <PresentButton
                        onClick={() => {
                          updateExperience(exp.id, "endDate", "Present");
                          updateExperience(exp.id, "datesUnknown", false);
                        }}
                      />
                      {!exp.datesUnknown && (
                        <UnknownButton
                          onClick={() =>
                            updateExperience(exp.id, "datesUnknown", true)
                          }
                        />
                      )}
                    </div>
                  </Field>
                </div>
              </div>

              {exp.datesUnknown ? (
                <UnknownChip
                  onUndo={() => updateExperience(exp.id, "datesUnknown", false)}
                />
              ) : warning ? (
                <FieldWarning message={warning} />
              ) : null}

              <Field label="Description (one bullet per line)">
                <textarea
                  placeholder={
                    "Led migration to React 18, cutting load time by 40%\nBuilt reusable component library used across 6 teams"
                  }
                  value={exp.description}
                  onChange={(e) =>
                    updateExperience(exp.id, "description", e.target.value)
                  }
                  rows={4}
                  style={inputStyle}
                />
              </Field>
              <BulletAnalysisRow text={exp.description} label="bullets" />

              <ExampleBox
                intro="Strong bullets use a verb + what you did + measurable outcome. Weak bullets describe duties without results."
                strong={[
                  "Led migration to React 18, cutting page load time by 40%.",
                  "Mentored 3 junior engineers, all promoted within 12 months.",
                  "Built a component library used across 6 product teams, reducing UI development time by 30%.",
                ]}
                weak={[
                  "Responsible for various frontend tasks as needed.",
                  "Helped with coding and other duties.",
                  "Worked on the website.",
                ]}
              />

              <button
                onClick={() => removeExperience(exp.id)}
                style={removeBtnStyle}
              >
                Remove
              </button>
            </div>
          );
        })}
        <button onClick={addExperience} style={addBtnStyle}>
          + Add experience
        </button>
      </SectionCard>

      {/* ---------- Projects ---------- */}
      <SectionCard
        id="section-projects"
        title="Projects"
        hint="Great for tech, design, students, or career-changers. Links become clickable in the PDF."
      >
        {data.projects.map((proj) => {
          const warning = getDateWarning(proj);
          return (
            <div key={proj.id} style={entryCardStyle}>
              <Field label="Project name">
                <input
                  placeholder="Resume Builder"
                  value={proj.name}
                  onChange={(e) =>
                    updateProject(proj.id, "name", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="Technologies">
                <input
                  placeholder="React, TypeScript, Vite"
                  value={proj.technologies}
                  onChange={(e) =>
                    updateProject(proj.id, "technologies", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="Link">
                <input
                  placeholder="github.com/you/project"
                  value={proj.link}
                  onChange={(e) =>
                    updateProject(proj.id, "link", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <Field label="Start">
                    <input
                      value={proj.startDate}
                      onChange={(e) =>
                        updateProject(proj.id, "startDate", e.target.value)
                      }
                      disabled={proj.datesUnknown}
                      style={{
                        ...inputStyle,
                        opacity: proj.datesUnknown ? 0.5 : 1,
                      }}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="End">
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <input
                        value={proj.endDate}
                        onChange={(e) =>
                          updateProject(proj.id, "endDate", e.target.value)
                        }
                        disabled={proj.datesUnknown}
                        style={{
                          ...inputStyle,
                          marginBottom: 0,
                          opacity: proj.datesUnknown ? 0.5 : 1,
                        }}
                      />
                      <PresentButton
                        onClick={() => {
                          updateProject(proj.id, "endDate", "Present");
                          updateProject(proj.id, "datesUnknown", false);
                        }}
                      />
                      {!proj.datesUnknown && (
                        <UnknownButton
                          onClick={() =>
                            updateProject(proj.id, "datesUnknown", true)
                          }
                        />
                      )}
                    </div>
                  </Field>
                </div>
              </div>

              {proj.datesUnknown ? (
                <UnknownChip
                  onUndo={() => updateProject(proj.id, "datesUnknown", false)}
                />
              ) : warning ? (
                <FieldWarning message={warning} />
              ) : null}

              <Field label="Description (one bullet per line)">
                <textarea
                  value={proj.description}
                  onChange={(e) =>
                    updateProject(proj.id, "description", e.target.value)
                  }
                  rows={3}
                  style={inputStyle}
                />
              </Field>
              <BulletAnalysisRow text={proj.description} label="bullets" />

              <button
                onClick={() => removeProject(proj.id)}
                style={removeBtnStyle}
              >
                Remove
              </button>
            </div>
          );
        })}
        <button onClick={addProject} style={addBtnStyle}>
          + Add project
        </button>
      </SectionCard>

      {/* ---------- Education ---------- */}
      <SectionCard
        id="section-education"
        title="Education"
        hint="Degree, institution, and dates are enough."
      >
        {data.education.map((edu) => (
          <div key={edu.id} style={entryCardStyle}>
            <Field label="Institution">
              <input
                placeholder="University of Sydney"
                value={edu.institution}
                onChange={(e) =>
                  updateEducation(edu.id, "institution", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Degree">
              <input
                placeholder="Bachelor of Science"
                value={edu.degree}
                onChange={(e) =>
                  updateEducation(edu.id, "degree", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Field of study">
              <input
                placeholder="Computer Science"
                value={edu.fieldOfStudy}
                onChange={(e) =>
                  updateEducation(edu.id, "fieldOfStudy", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <Field label="Graduation date">
                  <input
                    placeholder="Jul 2024"
                    value={edu.graduationDate}
                    onChange={(e) =>
                      updateEducation(edu.id, "graduationDate", e.target.value)
                    }
                    style={inputStyle}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Status">
                  <select
                    value={edu.graduationStatus || "graduated"}
                    onChange={(e) =>
                      updateEducation(
                        edu.id,
                        "graduationStatus",
                        e.target.value,
                      )
                    }
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="graduated">Graduated</option>
                    <option value="expected">Expected</option>
                  </select>
                </Field>
              </div>
            </div>
            <button
              onClick={() => removeEducation(edu.id)}
              style={removeBtnStyle}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={addEducation} style={addBtnStyle}>
          + Add education
        </button>
      </SectionCard>

      {/* ---------- Certifications ---------- */}
      <SectionCard
        id="section-certifications"
        title="Certifications"
        hint="Essential in trades, healthcare, IT, finance."
      >
        {data.certifications.map((cert) => (
          <div key={cert.id} style={entryCardStyle}>
            <Field label="Certification name">
              <input
                placeholder="AWS Solutions Architect"
                value={cert.name}
                onChange={(e) =>
                  updateCertification(cert.id, "name", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Issuer">
              <input
                placeholder="Amazon Web Services"
                value={cert.issuer}
                onChange={(e) =>
                  updateCertification(cert.id, "issuer", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Date earned">
              <input
                placeholder="Mar 2024"
                value={cert.date}
                onChange={(e) =>
                  updateCertification(cert.id, "date", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Credential ID (optional)">
              <input
                value={cert.credentialId}
                onChange={(e) =>
                  updateCertification(cert.id, "credentialId", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <button
              onClick={() => removeCertification(cert.id)}
              style={removeBtnStyle}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={addCertification} style={addBtnStyle}>
          + Add certification
        </button>
      </SectionCard>

      {/* ---------- Skills ---------- */}
      <SectionCard
        id="section-skills"
        title="Skills"
        hint={`The #1 factor for ATS matching. Keep each skill short (under ${SKILL_LENGTH_LIMIT} characters).`}
        action={
          <SkillSuggestButton
            jd={jd}
            currentSkills={data.skills}
            onAddSkill={handleAddSuggestedSkill}
            onAddAll={handleAddAllSuggested}
          />
        }
      >
        <SkillsInput
          key={`${resumeId}-${skillsRawSnapshot}`}
          data={data}
          onChange={onChange}
          error={errors.skills || null}
          setError={(msg) => setError("skills", msg)}
        />
      </SectionCard>

      {/* ---------- Languages ---------- */}
      <SectionCard
        id="section-languages"
        title="Languages"
        hint="Include if multilingual and role is customer-facing or international."
      >
        {data.languages.map((lang) => (
          <div key={lang.id} style={entryCardStyle}>
            <Field label="Language">
              <input
                placeholder="English"
                value={lang.name}
                onChange={(e) =>
                  updateLanguage(lang.id, "name", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Proficiency">
              <input
                placeholder="Native / Fluent / B2"
                value={lang.proficiency}
                onChange={(e) =>
                  updateLanguage(lang.id, "proficiency", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <button
              onClick={() => removeLanguage(lang.id)}
              style={removeBtnStyle}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={addLanguage} style={addBtnStyle}>
          + Add language
        </button>
      </SectionCard>

      {/* ---------- Volunteer ---------- */}
      <SectionCard
        id="section-volunteer"
        title="Volunteer experience"
        hint="Useful if relevant to the role or fills a gap."
      >
        {data.volunteer.map((vol) => {
          const warning = getDateWarning(vol);
          return (
            <div key={vol.id} style={entryCardStyle}>
              <Field label="Organization">
                <input
                  value={vol.organization}
                  onChange={(e) =>
                    updateVolunteer(vol.id, "organization", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>
              <Field label="Role">
                <input
                  value={vol.role}
                  onChange={(e) =>
                    updateVolunteer(vol.id, "role", e.target.value)
                  }
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ flex: 1 }}>
                  <Field label="Start">
                    <input
                      value={vol.startDate}
                      onChange={(e) =>
                        updateVolunteer(vol.id, "startDate", e.target.value)
                      }
                      disabled={vol.datesUnknown}
                      style={{
                        ...inputStyle,
                        opacity: vol.datesUnknown ? 0.5 : 1,
                      }}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="End">
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <input
                        value={vol.endDate}
                        onChange={(e) =>
                          updateVolunteer(vol.id, "endDate", e.target.value)
                        }
                        disabled={vol.datesUnknown}
                        style={{
                          ...inputStyle,
                          marginBottom: 0,
                          opacity: vol.datesUnknown ? 0.5 : 1,
                        }}
                      />
                      <PresentButton
                        onClick={() => {
                          updateVolunteer(vol.id, "endDate", "Present");
                          updateVolunteer(vol.id, "datesUnknown", false);
                        }}
                      />
                      {!vol.datesUnknown && (
                        <UnknownButton
                          onClick={() =>
                            updateVolunteer(vol.id, "datesUnknown", true)
                          }
                        />
                      )}
                    </div>
                  </Field>
                </div>
              </div>

              {vol.datesUnknown ? (
                <UnknownChip
                  onUndo={() => updateVolunteer(vol.id, "datesUnknown", false)}
                />
              ) : warning ? (
                <FieldWarning message={warning} />
              ) : null}

              <Field label="Description (one bullet per line)">
                <textarea
                  value={vol.description}
                  onChange={(e) =>
                    updateVolunteer(vol.id, "description", e.target.value)
                  }
                  rows={3}
                  style={inputStyle}
                />
              </Field>
              <BulletAnalysisRow text={vol.description} label="bullets" />

              <button
                onClick={() => removeVolunteer(vol.id)}
                style={removeBtnStyle}
              >
                Remove
              </button>
            </div>
          );
        })}
        <button onClick={addVolunteer} style={addBtnStyle}>
          + Add volunteer
        </button>
      </SectionCard>

      {/* ---------- Awards ---------- */}
      <SectionCard
        id="section-awards"
        title="Awards & achievements"
        hint="Include notable ones only."
      >
        {data.awards.map((award) => (
          <div key={award.id} style={entryCardStyle}>
            <Field label="Award title">
              <input
                value={award.title}
                onChange={(e) => updateAward(award.id, "title", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Issuer">
              <input
                value={award.issuer}
                onChange={(e) =>
                  updateAward(award.id, "issuer", e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Date">
              <input
                value={award.date}
                onChange={(e) => updateAward(award.id, "date", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Description (optional)">
              <textarea
                value={award.description}
                onChange={(e) =>
                  updateAward(award.id, "description", e.target.value)
                }
                rows={2}
                style={inputStyle}
              />
            </Field>
            {award.description.length > 0 &&
              award.description.length <= AWARD_DESCRIPTION_LIMIT && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted, #9b9b9f)",
                    marginTop: -4,
                    marginBottom: 6,
                  }}
                >
                  {award.description.length} / {AWARD_DESCRIPTION_LIMIT}{" "}
                  characters
                </div>
              )}
            {award.description.length > AWARD_DESCRIPTION_LIMIT && (
              <FieldWarning
                message={`Award description is ${award.description.length} characters. Keep it under ${AWARD_DESCRIPTION_LIMIT} — a single line works best.`}
              />
            )}
            <button
              onClick={() => removeAward(award.id)}
              style={removeBtnStyle}
            >
              Remove
            </button>
          </div>
        ))}
        <button onClick={addAward} style={addBtnStyle}>
          + Add award
        </button>
      </SectionCard>

      {/* ---------- Custom sections ---------- */}
      <SectionCard
        id="section-customSections"
        title="Custom sections"
        hint="Anything else — Publications, Interests, etc."
      >
        {data.customSections.map((section) => (
          <div key={section.id} style={entryCardStyle}>
            <Field label="Section title">
              <input
                placeholder="Publications"
                value={section.title}
                onChange={(e) =>
                  updateCustomSectionTitle(section.id, e.target.value)
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Bullets">
              {section.bullets.map((bullet, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "0.4rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <input
                    placeholder={`Bullet ${i + 1}`}
                    value={bullet}
                    onChange={(e) =>
                      updateCustomBullet(section.id, i, e.target.value)
                    }
                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                  />
                  <button
                    onClick={() => removeCustomBullet(section.id, i)}
                    style={iconBtnStyle}
                  >
                    ×
                  </button>
                </div>
              ))}
            </Field>
            <div
              style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}
            >
              <button
                onClick={() => addCustomBullet(section.id)}
                style={addBtnStyle}
              >
                + Bullet
              </button>
              <button
                onClick={() => removeCustomSection(section.id)}
                style={removeBtnStyle}
              >
                Remove section
              </button>
            </div>
          </div>
        ))}
        <button onClick={addCustomSection} style={addBtnStyle}>
          + Add custom section
        </button>
      </SectionCard>
    </div>
  );
};

// ---------- Styles ----------
const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.55rem 0.7rem",
  marginBottom: "0.5rem",
  border: "1px solid var(--border-strong, #d8d8dc)",
  borderRadius: 6,
  fontSize: 14,
  background: "var(--bg-input, #fff)",
  color: "var(--text-primary, #1a1a1a)",
  outline: "none",
};

const entryCardStyle: React.CSSProperties = {
  border: "1px solid var(--border, #e2e2e5)",
  borderRadius: 6,
  padding: "0.85rem",
  marginBottom: "0.65rem",
  background: "var(--bg-subtle, #f7f7f8)",
};

const addBtnStyle: React.CSSProperties = {
  padding: "0.5rem 0.9rem",
  background: "transparent",
  color: "var(--accent, #6d5bd0)",
  border: "1px dashed var(--border-strong, #d8d8dc)",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
};

const removeBtnStyle: React.CSSProperties = {
  padding: "0.35rem 0.7rem",
  background: "transparent",
  color: "var(--danger-text, #d33b3b)",
  border: "1px solid var(--danger, #d33b3b)",
  borderRadius: 6,
  fontSize: 12.5,
  marginTop: "0.35rem",
};

const smallGhostBtnStyle: React.CSSProperties = {
  padding: "0.55rem 0.65rem",
  background: "var(--bg-surface, #fff)",
  color: "var(--text-primary, #1a1a1a)",
  border: "1px solid var(--border-strong, #d8d8dc)",
  borderRadius: 6,
  fontSize: 12.5,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const iconBtnStyle: React.CSSProperties = {
  width: 34,
  background: "transparent",
  color: "var(--danger-text, #d33b3b)",
  border: "1px solid var(--border-strong, #d8d8dc)",
  borderRadius: 6,
  fontSize: 14,
  padding: 0,
};

export default ResumeForm;
