// src/components/ResumeUploader.tsx

import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { callAIJSON } from "../utils/aiClient";
import { isMissingKeyError, openAISettings } from "../utils/aiKey";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  onParsed: (data: any) => void;
  hasActivity?: boolean;
}

const COLLAPSE_KEY = "resume-uploader-collapsed";

const ResumeUploader: React.FC<Props> = ({ onParsed, hasActivity = false }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const abortRef = useRef<AbortController | null>(null);
  const userToggledRef = useRef(false);

  useEffect(() => {
    if (hasActivity && !collapsed && !userToggledRef.current) {
      setCollapsed(true);
      try {
        localStorage.setItem(COLLAPSE_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [hasActivity, collapsed]);

  const toggleCollapsed = () => {
    userToggledRef.current = true;
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const extractPdfText = async (
    file: File,
    signal: AbortSignal,
  ): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }
    return fullText.trim();
  };

  const parseWithAI = async (
    rawText: string,
    signal: AbortSignal,
  ): Promise<any> => {
    const prompt = `You are a resume parser. Extract the following resume text into strict JSON.

Return ONLY valid JSON matching this TypeScript shape exactly:

{
  "personalInfo": { "fullName": string, "email": string, "phone": string, "location": string, "website": string, "linkedin": string },
  "summary": string,
  "experience": [{ "company": string, "role": string, "startDate": string, "endDate": string, "description": string }],
  "education": [{ "institution": string, "degree": string, "fieldOfStudy": string, "graduationDate": string }],
  "projects": [{ "name": string, "description": string, "technologies": string, "link": string, "startDate": string, "endDate": string }],
  "certifications": [{ "name": string, "issuer": string, "date": string, "credentialId": string }],
  "skills": [string],
  "languages": [{ "name": string, "proficiency": string }],
  "volunteer": [{ "organization": string, "role": string, "startDate": string, "endDate": string, "description": string }],
  "awards": [{ "title": string, "issuer": string, "date": string, "description": string }]
}

Rules:
- Missing fields: use "" or [].
- "description": each bullet on its own line, joined with "\\n".
- Do NOT invent info.
- Dates as written (e.g. "Jun 2022").
- "location": city and region only.

Resume text:
"""${rawText}"""`;

    return callAIJSON<any>(prompt, signal);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setIsParsing(true);
    setError(null);
    setFileName(file.name);
    setStatus("Extracting text…");

    try {
      let rawText = "";
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        rawText = await extractPdfText(file, controller.signal);
      } else {
        rawText = await file.text();
      }
      if (!rawText || rawText.length < 20)
        throw new Error("Could not extract text.");

      setStatus("Analysing with AI…");
      const parsed = await parseWithAI(rawText, controller.signal);
      setStatus("✓ Filled your resume");
      onParsed(parsed);
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) {
        setStatus("");
        setError(null);
        setFileName("");
      } else if (isMissingKeyError(err)) {
        openAISettings();
        setStatus("");
        setFileName("");
      } else {
        console.error(err);
        setError(err?.message || "Failed to parse the resume.");
      }
    } finally {
      setIsParsing(false);
      setTimeout(() => setStatus(""), 3000);
      event.target.value = "";
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  // ---------- Collapsed slim bar ----------
  if (collapsed) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0.55rem 0.9rem",
          background: "var(--bg-surface, #fff)",
          border: "1px solid var(--border, #e2e2e5)",
          borderRadius: 8,
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "var(--accent-subtle, #f0edfc)",
            color: "var(--accent-text, #6d5bd0)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ⤴
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--text-secondary, #6b6b70)",
            flex: 1,
            minWidth: 0,
          }}
        >
          Import from an existing PDF
        </span>

        <label
          style={{
            padding: "5px 12px",
            background: "var(--accent, #6d5bd0)",
            color: "#fff",
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: isParsing ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            opacity: isParsing ? 0.6 : 1,
          }}
        >
          {isParsing ? "Analysing…" : "📎 Upload"}
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={isParsing}
            style={{ display: "none" }}
          />
        </label>

        {isParsing && (
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
        )}

        <button
          onClick={toggleCollapsed}
          title="Show import details"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted, #9b9b9f)",
            fontSize: 11.5,
            cursor: "pointer",
            padding: 0,
          }}
        >
          More ▾
        </button>

        {status && !isParsing && (
          <span
            style={{
              fontSize: 12,
              color: "var(--success-text, #2e9e5b)",
              fontWeight: 500,
            }}
          >
            {status}
          </span>
        )}
        {error && (
          <span
            style={{
              fontSize: 12,
              color: "var(--danger-text, #d33b3b)",
              fontWeight: 500,
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }

  // ---------- Full banner ----------
  return (
    <div
      style={{
        background: "var(--accent-subtle, #f0edfc)",
        border: "1px solid var(--border, #e2e2e5)",
        borderRadius: 10,
        padding: "1.5rem 1.75rem",
        marginBottom: "1.5rem",
        boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.06))",
        position: "relative",
      }}
    >
      <button
        onClick={toggleCollapsed}
        title="Collapse"
        aria-label="Collapse import panel"
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "transparent",
          border: "none",
          color: "var(--text-muted, #9b9b9f)",
          fontSize: 14,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        ▴
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "var(--accent, #6d5bd0)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          ⤴
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--text-primary, #1a1a1a)",
            }}
          >
            Import an existing resume
          </h2>
          <p
            style={{
              margin: "3px 0 0 0",
              fontSize: 13,
              color: "var(--text-secondary, #6b6b70)",
              lineHeight: 1.5,
            }}
          >
            Upload a PDF and AI will fill in the whole form. Review everything —
            AI isn't perfect.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          flexWrap: "wrap",
          marginTop: "1rem",
        }}
      >
        <label
          style={{
            padding: "10px 20px",
            background: isParsing
              ? "var(--text-muted, #9b9b9f)"
              : "var(--accent, #6d5bd0)",
            color: "#ffffff",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: isParsing ? "not-allowed" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: isParsing
              ? "none"
              : "0 2px 4px rgba(109, 91, 208, 0.25)",
            transition:
              "background 0.15s ease, box-shadow 0.15s ease, transform 0.12s ease",
          }}
          onMouseEnter={(e) => {
            if (!isParsing) {
              e.currentTarget.style.transform = "scale(1.02)";
              e.currentTarget.style.filter = "brightness(1.08)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.filter = "brightness(1)";
          }}
        >
          {isParsing ? "Analysing…" : "📎 Browse file"}
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={isParsing}
            style={{ display: "none" }}
          />
        </label>

        {isParsing && (
          <button
            onClick={handleCancel}
            style={{
              padding: "8px 14px",
              background: "transparent",
              color: "var(--danger-text, #d33b3b)",
              border: "1px solid var(--danger, #d33b3b)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            ✕ Cancel
          </button>
        )}

        <span
          style={{
            fontSize: 13,
            color: "var(--text-secondary, #6b6b70)",
          }}
        >
          {fileName || "or scroll down and start from scratch"}
        </span>
      </div>

      {isParsing && status && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "var(--accent-text, #6d5bd0)",
            fontWeight: 500,
          }}
        >
          {status}
        </div>
      )}
      {!isParsing && status && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "var(--success-text, #2e9e5b)",
            fontWeight: 500,
          }}
        >
          {status}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            color: "var(--danger-text, #d33b3b)",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default ResumeUploader;
