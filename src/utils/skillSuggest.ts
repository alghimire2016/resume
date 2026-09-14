// src/utils/skillSuggest.ts

import { callAIJSON } from "./aiClient";

export interface SkillSuggestion {
  skill: string;
  category: "technical" | "soft" | "tool" | "certification" | "domain";
}

export interface SkillSuggestResult {
  suggestions: SkillSuggestion[];
  notes: string;
}

export async function suggestSkills(
  jobDescription: string,
  currentSkills: string[],
  signal?: AbortSignal,
): Promise<SkillSuggestResult> {
  const alreadyHave = currentSkills.filter(Boolean).map((s) => s.toLowerCase());

  const prompt = `You are a career advisor. Read the JOB DESCRIPTION and extract the most valuable SKILLS a candidate should list on their resume to match this role.

Return ONLY valid JSON matching this exact shape:

{
  "suggestions": [
    { "skill": "Project Management", "category": "soft" },
    { "skill": "React", "category": "technical" }
  ],
  "notes": string
}

RULES:

1. Extract 10–15 skills total. Prioritise skills that appear MOST OFTEN or are most central to the role.
2. Each skill should be a SHORT keyword or short phrase (1–3 words). Never a full sentence.
3. Categories (choose ONE per skill):
   - "technical" — programming languages, frameworks, methodologies (React, Python, CI/CD, Agile)
   - "soft" — people/leadership skills (Leadership, People Management, Communication)
   - "tool" — software/platforms (Salesforce, Excel, Figma, Jira)
   - "certification" — named credentials (PMP, AWS Certified, First Aid)
   - "domain" — industry knowledge (Food Safety, Financial Modelling, Customer Service)
4. Use title-case for the skill name (e.g., "Customer Service", "Project Management").
5. Do NOT include:
   - Company names, cities, or people
   - Generic filler: "team", "role", "position", "opportunity", "experience", "years"
   - Any skill already present in the candidate's list below (case-insensitive match)
   - Passive phrases like "Ability to", "Knowledge of", "Experience with"
6. "notes" is ONE short sentence (max 80 chars) describing the top theme of the role.

CANDIDATE ALREADY HAS THESE SKILLS (do NOT suggest these):
${alreadyHave.length > 0 ? alreadyHave.join(", ") : "(none yet)"}

JOB DESCRIPTION:
"""
${jobDescription}
"""

Return JSON now.`;

  const parsed = await callAIJSON<SkillSuggestResult>(prompt, signal);

  // Sanitize: drop any suggestion that duplicates what the user already has
  const haveSet = new Set(alreadyHave);
  if (Array.isArray(parsed.suggestions)) {
    parsed.suggestions = parsed.suggestions.filter(
      (s) => s?.skill && !haveSet.has(s.skill.toLowerCase()),
    );
  } else {
    parsed.suggestions = [];
  }

  return parsed;
}
