// src/utils/atsScorer.ts

import { callAIJSON } from "./aiClient";

export interface ATSCategory {
  name: string;
  score: number;
  maxScore: number;
  issues: string[];
  tips: string[];
}

export interface SectionScore {
  section: string;
  score: number;
  note: string;
}

export interface ATSResult {
  overallScore: number;
  summary: string;
  categories: ATSCategory[];
  sectionScores: SectionScore[];
  matchedKeywords: string[];
  missingKeywords: string[];
  topFixes: string[];
}

export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
): Promise<ATSResult> {
  const prompt = `You are an expert ATS (Applicant Tracking System) analyzer used by recruiters at Fortune 500 companies. You evaluate resumes the way real ATS software (Workday, Taleo, Greenhouse, Lever, iCIMS) does.

Analyze the RESUME against the JOB DESCRIPTION below. Return ONLY valid JSON matching this exact shape (no markdown, no explanation, no code fences):

{
  "overallScore": number,
  "summary": string,
  "categories": [
    { "name": "Contact Information", "score": number, "maxScore": 10, "issues": [string], "tips": [string] },
    { "name": "Section Headings",    "score": number, "maxScore": 15, "issues": [string], "tips": [string] },
    { "name": "Keyword Match",       "score": number, "maxScore": 30, "issues": [string], "tips": [string] },
    { "name": "Formatting",          "score": number, "maxScore": 15, "issues": [string], "tips": [string] },
    { "name": "Content Quality",     "score": number, "maxScore": 15, "issues": [string], "tips": [string] },
    { "name": "Completeness",        "score": number, "maxScore": 15, "issues": [string], "tips": [string] }
  ],
  "sectionScores": [
    { "section": "Contact Information", "score": number, "note": string },
    { "section": "Professional Summary", "score": number, "note": string },
    { "section": "Work Experience",      "score": number, "note": string },
    { "section": "Skills",               "score": number, "note": string },
    { "section": "Education",            "score": number, "note": string },
    { "section": "Keyword Match",        "score": number, "note": string },
    { "section": "Formatting & ATS",     "score": number, "note": string }
  ],
  "matchedKeywords": [string],
  "missingKeywords": [string],
  "topFixes": [string]
}

SCORING RULES:

Categories (score out of maxScore):
1. Contact Information (max 10): email in plain text (3), phone present (3), city/region (2), LinkedIn or portfolio (2)
2. Section Headings (max 15): standard "Work Experience" (5), standard "Education" (4), standard "Skills" (3), standard "Professional Summary" (3)
3. Keyword Match (max 30): extract the 20 most important skills/keywords/phrases from the JD; score proportionally (matched / total) * 30; include exact matches AND clear synonyms
4. Formatting (max 15): single-column layout (5), standard fonts (5), no images/graphics (5)
5. Content Quality (max 15): action verbs (5), quantified achievements (5), bullet length 1-2 lines (5)
6. Completeness (max 15): summary present (5), all experience has dates (5), skills 8+ keywords (5)

Section Scores (each 0–100, independent of the categories above):
- "Contact Information": how complete and professional is the contact block
- "Professional Summary": pitch quality — specific, targeted, proof-driven (or empty → low)
- "Work Experience": bullet strength, action verbs, quantified achievements, all dates present
- "Skills": relevance to the JD, appropriate number (8-20), short keywords not sentences
- "Education": degree, institution, dates present
- "Keyword Match": % of important JD keywords present in the resume
- "Formatting & ATS": layout cleanliness, single-column, standard fonts, parseable structure

For each section score, "note" is ONE short sentence (max 80 chars).

Rules for output:
- "issues" = specific problems found (concrete, cite what you saw)
- "tips" = actionable advice to fix them
- "topFixes" = 3-5 highest-impact changes, ordered by impact
- "matchedKeywords" = skills from the JD that DO appear in the resume
- "missingKeywords" = important skills from the JD that do NOT appear
- If resume text is very short or clearly broken, set overallScore low and explain in summary
- Do NOT invent information not present in either document

RESUME TEXT:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jobDescription}
"""`;

  return callAIJSON<ATSResult>(prompt);
}
