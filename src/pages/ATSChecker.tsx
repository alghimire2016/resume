// src/pages/ATSChecker.tsx

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { analyzeResume } from "../utils/atsScorer";
import type { ATSResult } from "../utils/atsScorer";
import type { ResumeData } from "../types";
import { isMissingKeyError, openAISettings } from "../utils/aiKey";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const STORAGE_KEY = "resume-builder-data-v1";

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

function getSavedResumeText(): string | null {
  try {
    const v2 = localStorage.getItem("resume-builder-resumes-v2");
    if (v2) {
      const parsed = JSON.parse(v2);
      const active = parsed?.list?.find((r: any) => r.id === parsed.activeId);
      if (active?.data) {
        const text = resumeDataToText(active.data);
        if (text.length > 20) return text;
      }
    }
  } catch {
    // fall through
  }
  try {
    const legacy = localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      const text = resumeDataToText(data);
      return text.length > 20 ? text : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function resumeDataToText(data: ResumeData): string {
  const lines: string[] = [];
  const p = data.personalInfo;
  if (p.fullName) lines.push(p.fullName);
  const contactLine = [p.email, p.phone, p.location]
    .filter(Boolean)
    .join(" | ");
  if (contactLine) lines.push(contactLine);
  if (p.linkedin) lines.push(p.linkedin);
  if (p.website) lines.push(p.website);

  if (data.summary) {
    lines.push("\nPROFESSIONAL SUMMARY");
    lines.push(data.summary);
  }
  if (data.experience.length) {
    lines.push("\nWORK EXPERIENCE");
    data.experience.forEach((e) => {
      lines.push(`${e.role} — ${e.company}`);
      lines.push(`${e.startDate} – ${e.endDate}`);
      if (e.description) lines.push(e.description);
      lines.push("");
    });
  }
  if (data.projects.length) {
    lines.push("\nPROJECTS");
    data.projects.forEach((pr) => {
      lines.push(pr.name);
      if (pr.technologies) lines.push(`Technologies: ${pr.technologies}`);
      if (pr.link) lines.push(pr.link);
      if (pr.startDate || pr.endDate)
        lines.push(`${pr.startDate} – ${pr.endDate}`);
      if (pr.description) lines.push(pr.description);
      lines.push("");
    });
  }
  if (data.education.length) {
    lines.push("\nEDUCATION");
    data.education.forEach((e) => {
      lines.push(
        `${e.degree} ${e.fieldOfStudy ? `in ${e.fieldOfStudy}` : ""} — ${e.institution}`,
      );
      if (e.graduationDate) lines.push(e.graduationDate);
      lines.push("");
    });
  }
  if (data.certifications.length) {
    lines.push("\nCERTIFICATIONS");
    data.certifications.forEach((c) =>
      lines.push(`${c.name} — ${c.issuer} (${c.date})`),
    );
  }
  if (data.skills.length) {
    lines.push("\nSKILLS");
    lines.push(data.skills.join(", "));
  }
  if (data.languages.length) {
    lines.push("\nLANGUAGES");
    data.languages.forEach((l) => lines.push(`${l.name} — ${l.proficiency}`));
  }
  if (data.volunteer.length) {
    lines.push("\nVOLUNTEER EXPERIENCE");
    data.volunteer.forEach((v) => {
      lines.push(`${v.role} — ${v.organization}`);
      lines.push(`${v.startDate} – ${v.endDate}`);
      if (v.description) lines.push(v.description);
    });
  }
  if (data.awards.length) {
    lines.push("\nAWARDS");
    data.awards.forEach((a) => {
      lines.push(`${a.title} — ${a.issuer} (${a.date})`);
      if (a.description) lines.push(a.description);
    });
  }
  return lines.join("\n").trim();
}

const ATSChecker: React.FC = () => {
  const [resumeSource, setResumeSource] = useState<"current" | "upload">(
    "current",
  );
  const [uploadedText, setUploadedText] = useState<string>("");
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [result, setResult] = useState<ATSResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentResumeText = getSavedResumeText();
  const hasCurrentResume = currentResumeText !== null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await extractPdfText(file);
      if (!text || text.length < 20) throw new Error("Could not extract text.");
      setUploadedText(text);
      setUploadedFileName(file.name);
    } catch (err: any) {
      setError(err?.message || "Failed to read the file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);

    let resumeText = "";
    if (resumeSource === "current") {
      if (!currentResumeText) {
        setError("No saved resume found. Build one first or upload a PDF.");
        return;
      }
      resumeText = currentResumeText;
    } else {
      if (!uploadedText) {
        setError("Please upload a resume PDF first.");
        return;
      }
      resumeText = uploadedText;
    }
    if (!jobDescription.trim() || jobDescription.trim().length < 30) {
      setError("Please paste a job description (at least a few sentences).");
      return;
    }

    setLoading(true);
    try {
      const res = await analyzeResume(resumeText, jobDescription);
      setResult(res);
    } catch (err: any) {
      if (isMissingKeyError(err)) {
        openAISettings();
      } else {
        console.error(err);
        setError(err?.message || "Analysis failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number, max = 100): string => {
    const pct = max === 100 ? score / 100 : score / max;
    if (pct >= 0.8) return "var(--success, #2e9e5b)";
    if (pct >= 0.6) return "var(--warning, #c88a00)";
    return "var(--danger, #d33b3b)";
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <h1
        style={{
          margin: "0 0 0.35rem 0",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-primary, #1a1a1a)",
        }}
      >
        ATS Check
      </h1>
      <p
        style={{
          color: "var(--text-muted, #9b9b9f)",
          marginTop: 0,
          fontSize: 13.5,
          maxWidth: 700,
        }}
      >
        See how an Applicant Tracking System reads your resume — and how well it
        matches a job description. Get a section-by-section breakdown so you
        know exactly what to fix.
      </p>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>1. Your resume</h3>
        <div
          style={{
            display: "flex",
            gap: "1.25rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <label style={radioLabelStyle}>
            <input
              type="radio"
              name="resumeSource"
              checked={resumeSource === "current"}
              onChange={() => setResumeSource("current")}
              disabled={!hasCurrentResume}
            />
            <span style={{ marginLeft: 6 }}>
              Use my current resume
              {!hasCurrentResume && (
                <span
                  style={{ color: "var(--text-muted, #9b9b9f)", fontSize: 12 }}
                >
                  {" "}
                  (none saved)
                </span>
              )}
            </span>
          </label>
          <label style={radioLabelStyle}>
            <input
              type="radio"
              name="resumeSource"
              checked={resumeSource === "upload"}
              onChange={() => setResumeSource("upload")}
            />
            <span style={{ marginLeft: 6 }}>Upload a different resume</span>
          </label>
        </div>

        {resumeSource === "upload" && (
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ fontSize: 13 }}
            />
            {uploadedFileName && (
              <p
                style={{
                  fontSize: 12.5,
                  color: "var(--success-text, #2e9e5b)",
                  marginTop: 6,
                }}
              >
                ✓ {uploadedFileName}
              </p>
            )}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>2. Job description</h3>
        <p
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: 12.5,
            color: "var(--text-muted, #9b9b9f)",
          }}
        >
          Paste the full job posting — responsibilities, requirements,
          everything.
        </p>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here…"
          rows={10}
          style={textareaStyle}
        />
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: "0.7rem 1.3rem",
            background: loading
              ? "var(--text-muted, #9b9b9f)"
              : "var(--accent, #6d5bd0)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Analyzing…" : "Analyze resume"}
        </button>
        {error && (
          <p
            className="animate-fade-slide"
            style={{
              color: "var(--danger-text, #d33b3b)",
              fontSize: 12.5,
              marginTop: 8,
            }}
          >
            {error}
          </p>
        )}
      </div>

      {loading && (
        <div style={cardStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              className="skeleton-line"
              style={{ width: "40%", height: 20 }}
            />
            <div
              className="skeleton-line"
              style={{ width: "100%", height: 8 }}
            />
            <div
              className="skeleton-line"
              style={{ width: "85%", height: 12 }}
            />
            <div
              className="skeleton-line"
              style={{ width: "100%", height: 12, marginTop: 8 }}
            />
            <div
              className="skeleton-line"
              style={{ width: "70%", height: 12 }}
            />
            <div
              className="skeleton-line"
              style={{ width: "100%", height: 12, marginTop: 8 }}
            />
            <div
              className="skeleton-line"
              style={{ width: "60%", height: 12 }}
            />
          </div>
          <p
            style={{
              marginTop: 18,
              fontSize: 12.5,
              color: "var(--text-muted, #9b9b9f)",
              textAlign: "center",
            }}
          >
            Reading your resume, matching keywords, scoring each section…
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="animate-fade-slide">
          <div
            style={{
              ...cardStyle,
              background: "var(--accent-subtle, #f0edfc)",
              borderColor: "transparent",
            }}
          >
            <h2
              style={{ margin: "0 0 0.5rem 0", fontSize: 15, fontWeight: 600 }}
            >
              Overall score
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  color: scoreColor(result.overallScore),
                  lineHeight: 1,
                }}
              >
                {result.overallScore}
                <span
                  style={{
                    fontSize: 16,
                    color: "var(--text-muted, #9b9b9f)",
                    fontWeight: 500,
                  }}
                >
                  {" "}
                  / 100
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 8,
                    background: "var(--progress-track, #e8e8ea)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="progress-fill"
                    style={{
                      height: "100%",
                      width: `${result.overallScore}%`,
                      background: scoreColor(result.overallScore),
                    }}
                  />
                </div>
              </div>
            </div>
            <p
              style={{
                marginTop: "0.85rem",
                color: "var(--text-secondary, #6b6b70)",
                fontSize: 13.5,
                lineHeight: 1.6,
              }}
            >
              {result.summary}
            </p>
          </div>

          {result.sectionScores && result.sectionScores.length > 0 && (
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.85rem",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <h3 style={{ ...cardTitleStyle, margin: 0 }}>
                  Section-by-section score
                </h3>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted, #9b9b9f)",
                  }}
                >
                  Fix the lowest score first
                </span>
              </div>

              {result.sectionScores
                .slice()
                .sort((a, b) => a.score - b.score)
                .map((sec) => (
                  <div
                    key={sec.section}
                    style={{
                      padding: "0.7rem 0",
                      borderBottom: "1px solid var(--border, #e2e2e5)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 5,
                        gap: 12,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 13.5,
                          color: "var(--text-primary, #1a1a1a)",
                        }}
                      >
                        {sec.section}
                      </strong>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: scoreColor(sec.score),
                          flexShrink: 0,
                        }}
                      >
                        {sec.score}/100
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "var(--progress-track, #e8e8ea)",
                        borderRadius: 999,
                        overflow: "hidden",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        className="progress-fill"
                        style={{
                          height: "100%",
                          width: `${sec.score}%`,
                          background: scoreColor(sec.score),
                        }}
                      />
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12.5,
                        color: "var(--text-secondary, #6b6b70)",
                        lineHeight: 1.5,
                      }}
                    >
                      {sec.note}
                    </p>
                  </div>
                ))}
            </div>
          )}

          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Category breakdown</h3>
            {result.categories.map((cat, i) => (
              <div
                key={cat.name}
                style={{
                  padding: "0.7rem 0",
                  borderBottom:
                    i < result.categories.length - 1
                      ? "1px solid var(--border, #e2e2e5)"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong
                    style={{
                      fontSize: 13.5,
                      color: "var(--text-primary, #1a1a1a)",
                    }}
                  >
                    {cat.name}
                  </strong>
                  <span
                    style={{
                      fontSize: 13,
                      color: scoreColor(cat.score, cat.maxScore),
                      fontWeight: 600,
                    }}
                  >
                    {cat.score} / {cat.maxScore}
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    background: "var(--progress-track, #e8e8ea)",
                    borderRadius: 999,
                    marginTop: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="progress-fill"
                    style={{
                      height: "100%",
                      width: `${(cat.score / cat.maxScore) * 100}%`,
                      background: scoreColor(cat.score, cat.maxScore),
                    }}
                  />
                </div>

                {cat.issues.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--danger-text, #d33b3b)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Issues
                    </div>
                    <ul
                      style={{
                        margin: "4px 0 0 0",
                        paddingLeft: 18,
                        fontSize: 13,
                        color: "var(--text-secondary, #6b6b70)",
                        lineHeight: 1.6,
                      }}
                    >
                      {cat.issues.map((issue, j) => (
                        <li key={j}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cat.tips.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--success-text, #2e9e5b)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Tips
                    </div>
                    <ul
                      style={{
                        margin: "4px 0 0 0",
                        paddingLeft: 18,
                        fontSize: 13,
                        color: "var(--text-secondary, #6b6b70)",
                        lineHeight: 1.6,
                      }}
                    >
                      {cat.tips.map((tip, j) => (
                        <li key={j}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ ...cardStyle, flex: 1, minWidth: 280 }}>
              <h3
                style={{
                  ...cardTitleStyle,
                  color: "var(--success-text, #2e9e5b)",
                }}
              >
                Matched keywords ({result.matchedKeywords.length})
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.matchedKeywords.map((k, i) => (
                  <span key={i} style={matchedPillStyle}>
                    ✓ {k}
                  </span>
                ))}
                {result.matchedKeywords.length === 0 && (
                  <span
                    style={{
                      color: "var(--text-muted, #9b9b9f)",
                      fontSize: 12.5,
                    }}
                  >
                    None found
                  </span>
                )}
              </div>
            </div>
            <div style={{ ...cardStyle, flex: 1, minWidth: 280 }}>
              <h3
                style={{
                  ...cardTitleStyle,
                  color: "var(--danger-text, #d33b3b)",
                }}
              >
                Missing keywords ({result.missingKeywords.length})
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.missingKeywords.map((k, i) => (
                  <span key={i} style={missingPillStyle}>
                    ✕ {k}
                  </span>
                ))}
                {result.missingKeywords.length === 0 && (
                  <span
                    style={{
                      color: "var(--success-text, #2e9e5b)",
                      fontSize: 12.5,
                    }}
                  >
                    None — great job!
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              ...cardStyle,
              background: "var(--warning-subtle, #fdf6e3)",
              borderColor: "transparent",
            }}
          >
            <h3
              style={{
                ...cardTitleStyle,
                color: "var(--warning-text, #a06e00)",
              }}
            >
              Top fixes
            </h3>
            <ol
              style={{
                paddingLeft: 20,
                margin: 0,
                color: "var(--text-secondary, #6b6b70)",
                lineHeight: 1.7,
                fontSize: 13.5,
              }}
            >
              {result.topFixes.map((fix, i) => (
                <li key={i}>{fix}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface, #fff)",
  border: "1px solid var(--border, #e2e2e5)",
  borderRadius: 12,
  padding: "1.1rem 1.25rem",
  marginBottom: "1rem",
};

const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 0.5rem 0",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-primary, #1a1a1a)",
};

const radioLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontSize: 13.5,
  cursor: "pointer",
  color: "var(--text-secondary, #6b6b70)",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.7rem",
  border: "1px solid var(--border-strong, #d8d8dc)",
  borderRadius: 8,
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--text-primary, #1a1a1a)",
  background: "var(--bg-input, #fff)",
  resize: "vertical",
  outline: "none",
  lineHeight: 1.5,
};

const matchedPillStyle: React.CSSProperties = {
  background: "var(--success-subtle, #e8f5ee)",
  color: "var(--success-text, #2e9e5b)",
  padding: "3px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
};

const missingPillStyle: React.CSSProperties = {
  background: "var(--danger-subtle, #fbeaea)",
  color: "var(--danger-text, #d33b3b)",
  padding: "3px 10px",
  borderRadius: 12,
  fontSize: 12,
  fontWeight: 500,
};

export default ATSChecker;
