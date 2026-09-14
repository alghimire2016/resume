// src/components/CoverLetterPanel.tsx

import { useState, useEffect, useRef } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import type { ResumeData } from "../types";
import { generateCoverLetter } from "../utils/coverLetter";
import type { CoverTone } from "../utils/coverLetter";
import CoverLetterDocument from "./CoverLetterDocument";
import ExpandableRow from "./ExpandableRow";
import { isMissingKeyError, openAISettings } from "../utils/aiKey";

interface Props {
  data: ResumeData;
  jd: string;
  resumeId: string;
}

const STORAGE_PREFIX = "resume-cover-letter-";

const CoverLetterPanel: React.FC<Props> = ({ data, jd, resumeId }) => {
  const storageKey = `${STORAGE_PREFIX}${resumeId}`;

  const [expanded, setExpanded] = useState(false);
  const [tone, setTone] = useState<CoverTone>("professional");
  const [letter, setLetter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setLetter(saved || "");
    } catch {
      setLetter("");
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      if (letter) localStorage.setItem(storageKey, letter);
      else localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [letter, storageKey]);

  const hasJD = !!jd.trim() && jd.trim().length >= 50;
  const hasLetter = letter.trim().length > 50;

  const handleGenerate = async () => {
    setError(null);
    if (!hasJD) {
      setError("Paste a job description in the Job match panel first.");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const result = await generateCoverLetter({
        resumeData: data,
        jobDescription: jd,
        tone,
        signal: controller.signal,
      });
      setLetter(result);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // silent cancel
      } else if (isMissingKeyError(err)) {
        openAISettings();
      } else {
        console.error(err);
        setError(err?.message || "Failed to generate cover letter.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select the text manually.");
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.personalInfo.fullName || "cover-letter"}-cover-letter.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const badges = hasLetter ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        background: "var(--success-subtle, #e8f5ee)",
        color: "var(--success-text, #2e9e5b)",
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      Ready
    </span>
  ) : undefined;

  return (
    <ExpandableRow
      id="cover-letter"
      title="Cover letter"
      subtitle={
        expanded
          ? undefined
          : hasLetter
            ? "Click to view or edit"
            : hasJD
              ? "Generate a tailored cover letter"
              : "Paste a job description first"
      }
      badges={badges}
      expanded={expanded}
      onToggle={() => setExpanded((s) => !s)}
    >
      <p
        style={{
          margin: "0 0 1rem 0",
          fontSize: 12.5,
          color: "var(--text-secondary, #6b6b70)",
          lineHeight: 1.55,
        }}
      >
        Uses your resume and the job description from the Job match panel. The
        generated letter is fully editable.
      </p>

      {!hasJD && (
        <div
          style={{
            padding: "0.7rem 0.85rem",
            background: "var(--warning-subtle, #fdf6e3)",
            borderLeft: "3px solid var(--warning, #c88a00)",
            borderRadius: 4,
            fontSize: 12.5,
            color: "var(--warning-text, #a06e00)",
            marginBottom: "1rem",
          }}
        >
          ⚠ Paste a job description in the Job match panel above before
          generating.
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <label
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--text-primary, #1a1a1a)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Tone:
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as CoverTone)}
            disabled={loading}
            style={{
              padding: "4px 8px",
              border: "1px solid var(--border-strong, #d8d8dc)",
              borderRadius: 6,
              fontSize: 12.5,
              background: "var(--bg-input, #fff)",
              color: "var(--text-primary, #1a1a1a)",
              cursor: "pointer",
            }}
          >
            <option value="professional">Professional</option>
            <option value="warm">Warm</option>
            <option value="concise">Concise</option>
          </select>
        </label>

        <button
          onClick={handleGenerate}
          disabled={loading || !hasJD}
          style={{
            padding: "6px 14px",
            background:
              loading || !hasJD
                ? "var(--text-muted, #9b9b9f)"
                : "var(--accent, #6d5bd0)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: loading || !hasJD ? "not-allowed" : "pointer",
          }}
        >
          {loading
            ? "✨ Writing…"
            : hasLetter
              ? "✨ Regenerate"
              : "✨ Generate letter"}
        </button>
      </div>

      {error && (
        <p
          className="animate-fade-slide"
          style={{
            margin: "0 0 1rem 0",
            fontSize: 12.5,
            color: "var(--danger-text, #d33b3b)",
          }}
        >
          {error}
        </p>
      )}

      {loading && (
        <div
          style={{
            background: "var(--bg-subtle, #f7f7f8)",
            borderRadius: 8,
            padding: "1.1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            className="skeleton-line"
            style={{ height: 12, marginBottom: 8 }}
          />
          <div
            className="skeleton-line"
            style={{ height: 12, width: "92%", marginBottom: 8 }}
          />
          <div
            className="skeleton-line"
            style={{ height: 12, width: "85%", marginBottom: 8 }}
          />
          <div
            className="skeleton-line"
            style={{ height: 12, marginBottom: 8 }}
          />
          <div className="skeleton-line" style={{ height: 12, width: "90%" }} />
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                color: "var(--text-secondary, #6b6b70)",
              }}
            >
              ✨ Writing your cover letter…
            </span>
            <button
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
        </div>
      )}

      {letter && !loading && (
        <>
          <textarea
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            rows={18}
            spellCheck
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              border: "1px solid var(--border-strong, #d8d8dc)",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              lineHeight: 1.55,
              color: "var(--text-primary, #1a1a1a)",
              background: "var(--bg-input, #fff)",
              resize: "vertical",
              outline: "none",
              marginBottom: "0.85rem",
              boxSizing: "border-box",
              whiteSpace: "pre-wrap",
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: "0.5rem",
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                padding: "5px 12px",
                background: "transparent",
                color: "var(--accent, #6d5bd0)",
                border: "1px solid var(--accent, #6d5bd0)",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copied" : "Copy text"}
            </button>
            <button
              onClick={handleDownloadTxt}
              style={{
                padding: "5px 12px",
                background: "transparent",
                color: "var(--text-primary, #1a1a1a)",
                border: "1px solid var(--border-strong, #d8d8dc)",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Download .txt
            </button>
            <PDFDownloadLink
              document={<CoverLetterDocument data={data} letterText={letter} />}
              fileName={`${data.personalInfo.fullName || "cover-letter"}-cover-letter.pdf`}
              style={{
                padding: "5px 12px",
                background: "var(--accent, #6d5bd0)",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {({ loading: pdfLoading }) =>
                pdfLoading ? "Generating PDF…" : "Download PDF"
              }
            </PDFDownloadLink>
          </div>

          <p
            style={{
              margin: "0.35rem 0 0 0",
              fontSize: 11.5,
              color: "var(--text-muted, #9b9b9f)",
            }}
          >
            Edit the letter above — changes save automatically to this resume.
          </p>
        </>
      )}
    </ExpandableRow>
  );
};

export default CoverLetterPanel;
