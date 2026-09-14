// src/utils/coverLetter.ts

import { callAI } from "./aiClient";
import type { ResumeData } from "../types";

export type CoverTone = "professional" | "warm" | "concise";

export interface GenerateOptions {
  resumeData: ResumeData;
  jobDescription: string;
  tone?: CoverTone;
  companyName?: string;
  signal?: AbortSignal;
}

export async function generateCoverLetter(
  opts: GenerateOptions,
): Promise<string> {
  const tone = opts.tone || "professional";
  const toneGuide =
    tone === "warm"
      ? "Warm and personable, but still professional. Natural, human voice."
      : tone === "concise"
        ? "Concise and direct. Short paragraphs. No filler sentences."
        : "Polished and professional. Standard business-letter tone.";

  const resumeSummary = {
    name: opts.resumeData.personalInfo.fullName,
    location: opts.resumeData.personalInfo.location,
    summary: opts.resumeData.summary,
    recentRoles: opts.resumeData.experience.slice(0, 3).map((e) => ({
      role: e.role,
      company: e.company,
      description: e.description,
    })),
    skills: opts.resumeData.skills.slice(0, 15),
    education: opts.resumeData.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
    })),
  };

  const prompt = `Write a compelling cover letter for this candidate.

TONE: ${toneGuide}

RULES:
- Length: 250–350 words. Do not exceed 400 words.
- Structure: greeting → hook (why this role) → 2 paragraphs of specific proof from the resume → closing (call to action).
- Use SPECIFIC examples from the resume — mention real companies, real achievements, real numbers.
- Do NOT invent experience. If the resume doesn't have a metric, don't make one up.
- Do NOT use clichés like "I am writing to apply for" or "I would be a great fit."
- Do NOT include placeholders like [Company Name] if you can infer the company from the JD.
- Open with a hook that shows you understand the role/company.
- Include ONE concrete achievement or metric in the second paragraph.
- Sign off with "Sincerely," and the candidate's name.
- Output ONLY the letter text (no markdown, no explanations, no headings).

CANDIDATE:
${JSON.stringify(resumeSummary, null, 2)}

JOB DESCRIPTION:
"""
${opts.jobDescription}
"""

${opts.companyName ? `COMPANY NAME: ${opts.companyName}` : ""}

Write the cover letter now.`;

  return callAI({
    prompt,
    temperature: 0.6,
    signal: opts.signal,
  });
}
