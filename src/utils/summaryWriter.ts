// src/utils/summaryWriter.ts

import { callAI } from "./aiClient";
import type { ResumeData } from "../types";
import { extractKeywords } from "./keywordMatch";

export type SummaryStyle = "professional" | "bold";

export interface SummaryIngredients {
  matchedKeywords: string[];
  missingKeywords: string[];
  highImpactMissing: string[];
  extraStrengths: string[];
  hasEnoughContext: boolean;
  hasExperience: boolean;
  hasSkills: boolean;
  hasEducation: boolean;
}

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildResumeText(data: ResumeData): string {
  const parts: string[] = [];
  if (data.summary) parts.push(data.summary);
  data.experience.forEach((e) => {
    if (e.role) parts.push(e.role);
    if (e.company) parts.push(e.company);
    if (e.description) parts.push(e.description);
  });
  data.skills.forEach((s) => parts.push(s));
  data.education.forEach((e) => {
    if (e.degree) parts.push(e.degree);
    if (e.fieldOfStudy) parts.push(e.fieldOfStudy);
    if (e.institution) parts.push(e.institution);
  });
  data.certifications.forEach((c) => {
    if (c.name) parts.push(c.name);
    if (c.issuer) parts.push(c.issuer);
  });
  data.projects.forEach((p) => {
    if (p.name) parts.push(p.name);
    if (p.technologies) parts.push(p.technologies);
    if (p.description) parts.push(p.description);
  });
  return parts.join(" ").toLowerCase();
}

export function previewIngredients(
  data: ResumeData,
  jd: string,
): SummaryIngredients {
  const keywords = extractKeywords(jd);
  const resumeText = buildResumeText(data);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    const pattern = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
    if (pattern.test(resumeText)) matched.push(kw);
    else missing.push(kw);
  }

  const highImpactMissing = [...missing]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);

  const matchedLower = new Set(matched.map((m) => m.toLowerCase()));
  const extraStrengths = data.skills
    .filter((s) => {
      const lower = s.toLowerCase().trim();
      if (lower.length < 3 || lower.length > 40) return false;
      if (matchedLower.has(lower)) return false;
      for (const m of matchedLower) {
        if (m.includes(lower) || lower.includes(m)) return false;
      }
      return true;
    })
    .slice(0, 10);

  const hasExperience = data.experience.some(
    (e) => e.role.trim() || e.company.trim() || e.description.trim(),
  );
  const hasSkills = data.skills.length >= 3;
  const hasEducation = data.education.some(
    (e) => e.degree.trim() || e.institution.trim(),
  );

  return {
    matchedKeywords: matched,
    missingKeywords: missing,
    highImpactMissing,
    extraStrengths,
    hasEnoughContext: hasExperience || hasSkills || hasEducation,
    hasExperience,
    hasSkills,
    hasEducation,
  };
}

export interface WriteSummaryOptions {
  resumeData: ResumeData;
  jobDescription: string;
  style?: SummaryStyle;
  ingredients: SummaryIngredients;
  signal?: AbortSignal;
}

export async function writeSummary(opts: WriteSummaryOptions): Promise<string> {
  const style = opts.style || "professional";
  const styleGuide =
    style === "bold"
      ? "Confident and direct. Lead with the strongest real achievement. Use strong action verbs."
      : "Polished and professional. Balanced tone. Factual, no fluff.";

  const candidateContext = {
    recentRoles: opts.resumeData.experience.slice(0, 3).map((e) => ({
      role: e.role,
      company: e.company,
      dates: [e.startDate, e.endDate].filter(Boolean).join(" – "),
      realBullets: e.description.split("\n").filter(Boolean).slice(0, 4),
    })),
    allSkills: opts.resumeData.skills,
    education: opts.resumeData.education.map((e) => ({
      degree: e.degree,
      field: e.fieldOfStudy,
      institution: e.institution,
      year: e.graduationDate,
    })),
    certifications: opts.resumeData.certifications.map((c) => c.name),
    location: opts.resumeData.personalInfo.location,
  };

  const extraStrengthsBlock = opts.ingredients.extraStrengths.length
    ? opts.ingredients.extraStrengths.join(", ")
    : "(none)";

  const prompt = `You are a professional resume writer. Write a 3–4 sentence professional summary that HIGHLIGHTS THE CANDIDATE'S REAL EXPERIENCE, tailored to the job they're applying for.

CRITICAL RULES:
1. Every single fact must come from the CANDIDATE CONTEXT below. Never invent companies, roles, achievements, metrics, or skills.
2. Do NOT paraphrase the job description. The JD tells you what the candidate is TARGETING — not what they've DONE.
3. Lead with the candidate's STRONGEST real proof point: a specific achievement, a measurable result, or a clear progression.
4. Match the seniority implied by the candidate's real experience — don't oversell.

SKILL SELECTION (IMPORTANT):
The candidate has skills in two buckets — use BOTH:

A. JD-MATCHED SKILLS (highest priority — use 3–5 of these):
${opts.ingredients.matchedKeywords.slice(0, 15).join(", ") || "(none)"}

B. EXTRA STRENGTHS FROM THE CANDIDATE (use 1–2 of these if they support the target role, even if the JD doesn't mention them):
${extraStrengthsBlock}

If the candidate has a strong skill in bucket B that would help them stand out for this role, INCLUDE it. Don't artificially limit yourself to only JD keywords.

DO NOT MENTION THESE (the candidate doesn't have them):
${opts.ingredients.missingKeywords.slice(0, 20).join(", ") || "(none)"}

HOW TO STRUCTURE IT:
- Sentence 1: Target role (from JD) + years of experience + current/most recent role
- Sentence 2: The single strongest real achievement from their experience bullets (use a real number if one exists)
- Sentence 3: 3–4 relevant skills — mostly from bucket A, optionally 1–2 from bucket B
- Sentence 4: What they're targeting / what value they bring

STYLE: ${styleGuide}

HARD CONSTRAINTS:
- Length: 300–550 characters. Never exceed 550.
- No bullet points. One flowing paragraph.
- No placeholders like [Company Name].
- No clichés: "hard-working", "passionate", "team player", "results-driven", "dynamic", "utilize my skills", "seeking a challenging role".
- No first-person pronouns ("I", "my").
- Start with a noun phrase, e.g. "Hospitality leader with..."

CANDIDATE CONTEXT (the ONLY source of truth):
${JSON.stringify(candidateContext, null, 2)}

JOB DESCRIPTION:
"""
${opts.jobDescription}
"""

Return ONLY the summary text. No headings, no quotes, no explanations.`;

  return callAI({
    prompt,
    temperature: 0.5,
    signal: opts.signal,
  });
}
