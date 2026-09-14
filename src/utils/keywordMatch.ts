// src/utils/keywordMatch.ts

import { callAIJSON } from "./aiClient";

// ============================================================
// Stopwords
// ============================================================
const STOPWORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "all",
  "also",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "below",
  "between",
  "both",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "doing",
  "down",
  "during",
  "each",
  "else",
  "etc",
  "even",
  "ever",
  "every",
  "few",
  "for",
  "from",
  "further",
  "get",
  "got",
  "had",
  "has",
  "have",
  "having",
  "he",
  "her",
  "here",
  "hers",
  "herself",
  "him",
  "himself",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "itself",
  "just",
  "let",
  "like",
  "likely",
  "may",
  "me",
  "might",
  "mine",
  "more",
  "most",
  "much",
  "must",
  "my",
  "myself",
  "need",
  "needs",
  "new",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "once",
  "one",
  "only",
  "or",
  "other",
  "our",
  "ours",
  "ourselves",
  "out",
  "over",
  "own",
  "same",
  "she",
  "should",
  "since",
  "so",
  "some",
  "such",
  "than",
  "that",
  "the",
  "their",
  "theirs",
  "them",
  "themselves",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "too",
  "under",
  "until",
  "up",
  "us",
  "use",
  "used",
  "using",
  "very",
  "via",
  "was",
  "we",
  "well",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "who",
  "whom",
  "why",
  "will",
  "with",
  "within",
  "without",
  "would",
  "year",
  "years",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "ability",
  "able",
  "across",
  "based",
  "candidate",
  "candidates",
  "company",
  "day",
  "days",
  "environment",
  "excellent",
  "experience",
  "experienced",
  "good",
  "great",
  "help",
  "high",
  "higher",
  "highest",
  "ideal",
  "include",
  "includes",
  "including",
  "job",
  "join",
  "knowledge",
  "looking",
  "low",
  "lower",
  "lowest",
  "month",
  "months",
  "opportunity",
  "part",
  "position",
  "provide",
  "provides",
  "qualifications",
  "relevant",
  "similar",
  "skills",
  "skill",
  "strong",
  "successful",
  "success",
  "team",
  "teams",
  "time",
  "times",
  "track",
  "understanding",
  "want",
  "week",
  "weeks",
  "work",
  "working",
  "field",
  "demonstrated",
  "proven",
  "record",
  "related",
  "familiar",
  "familiarity",
  "expect",
  "expected",
  "expectations",
  "level",
  "least",
  "minimum",
  "plus",
  "preferred",
  "required",
  "requirements",
  "responsibilities",
  "role",
  "duties",
  "tasks",
  "must",
  "apply",
  "application",
  "applicant",
  "please",
  "ensure",
  "ensuring",
  "helping",
  "support",
  "supporting",
  "maintain",
  "maintaining",
  "perform",
  "performing",
  "assist",
  "assisting",
  "develop",
  "developing",
  "collaborate",
  "collaborating",
  "communicate",
  "self-starter",
  "detail-oriented",
  "team-player",
  "team player",
  "deep",
  "broad",
  "wide",
  "extensive",
  "significant",
  "substantial",
  "various",
  "multiple",
  "written",
  "verbal",
  "interpersonal",
  "professional",
  "bringing",
  "brought",
  "bring",
  "value",
  "values",
  "valued",
  "valuable",
  "career",
  "careers",
  "retail",
  "hospitality",
  "office",
  "warehouse",
  "stock",
  "stocks",
  "mindset",
  "mindsets",
  "business",
  "businesses",
  "guest",
  "guests",
  "member",
  "members",
  "staff",
  "staffs",
  "pay",
  "wage",
  "wages",
  "salary",
  "salaries",
  "shift",
  "shifts",
  "schedule",
  "scheduling",
  "scheduled",
  "production",
  "produced",
  "hungry",
  "power",
  "people",
  "fast",
  "paced",
  "day-to-day",
  "end-to-end",
  "fast-paced",
  "hands-on",
  "going",
  "come",
  "put",
  "take",
  "make",
  "makes",
  "made",
  "give",
  "gives",
  "given",
  "look",
  "see",
  "seen",
  "know",
  "knows",
  "known",
  "think",
  "thinks",
  "thought",
  "wants",
  "wanted",
  "try",
  "tries",
]);

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const looksLikeGibberish = (word: string): boolean => {
  if (/[+#.\d]/.test(word)) return false;
  if (word.length <= 3) return false;

  let run = 0;
  for (const ch of word) {
    if (/[bcdfghjklmnpqrstvwxyz]/.test(ch)) {
      run++;
      if (run >= 5) return true;
    } else {
      run = 0;
    }
  }

  if (word.length >= 5 && !/[aeiouy]/.test(word)) return true;

  return false;
};

// ============================================================
// Extract clean keywords
// ============================================================
export function extractKeywords(jd: string): string[] {
  if (!jd.trim()) return [];

  const phraseMatches =
    jd.match(/\b[A-Z][a-zA-Z+#.\-]+(?:\s+[A-Z][a-zA-Z+#.\-]+){1,3}\b/g) || [];
  const phrases = new Set<string>();
  for (const phrase of phraseMatches) {
    const words = phrase.split(/\s+/);
    if (words.length > 3) continue;
    if (STOPWORDS.has(words[0].toLowerCase())) continue;
    phrases.add(phrase.toLowerCase());
  }

  const cleaned = jd.toLowerCase().replace(/[^\w\s+#.\-]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const counts: Record<string, number> = {};
  for (const raw of tokens) {
    const w = raw.replace(/^[.\-+#]+|[.\-+#]+$/g, "");
    if (w.length < 4 || w.length > 30) continue;
    if (STOPWORDS.has(w)) continue;
    if (/^\d+$/.test(w)) continue;
    if (!/[a-z]/.test(w)) continue;
    if (looksLikeGibberish(w)) continue;
    counts[w] = (counts[w] || 0) + 1;
  }

  const scored = Object.entries(counts)
    .map(([word, freq]) => {
      let score = freq;
      if (word.length >= 8) score *= 2.0;
      else if (word.length >= 6) score *= 1.5;
      if (/[+#.]/.test(word)) score *= 2.2;
      if (word.length <= 4) score *= 0.6;
      return { word, score };
    })
    .sort((a, b) => b.score - a.score);

  const result: string[] = [];
  const seen = new Set<string>();
  for (const p of phrases) {
    if (!seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  }

  const phraseWords = new Set<string>();
  for (const p of phrases) {
    p.split(/\s+/).forEach((w) => phraseWords.add(w));
  }
  for (const s of scored.slice(0, 30)) {
    if (seen.has(s.word)) continue;
    if (phraseWords.has(s.word)) continue;
    seen.add(s.word);
    result.push(s.word);
  }

  return result.slice(0, 30);
}

// ============================================================
// Flatten resume into text
// ============================================================
export function resumeToText(data: any): string {
  const parts: string[] = [];
  const p = data.personalInfo || {};
  if (p.fullName) parts.push(p.fullName);
  if (p.location) parts.push(p.location);
  if (data.summary) parts.push(data.summary);

  (data.experience || []).forEach((e: any) => {
    if (e.role) parts.push(e.role);
    if (e.company) parts.push(e.company);
    if (e.description) parts.push(e.description);
  });
  (data.projects || []).forEach((pr: any) => {
    if (pr.name) parts.push(pr.name);
    if (pr.technologies) parts.push(pr.technologies);
    if (pr.description) parts.push(pr.description);
  });
  (data.education || []).forEach((ed: any) => {
    if (ed.degree) parts.push(ed.degree);
    if (ed.fieldOfStudy) parts.push(ed.fieldOfStudy);
    if (ed.institution) parts.push(ed.institution);
  });
  (data.certifications || []).forEach((c: any) => {
    if (c.name) parts.push(c.name);
    if (c.issuer) parts.push(c.issuer);
  });
  (data.skills || []).forEach((s: string) => parts.push(s));
  (data.languages || []).forEach((l: any) => {
    if (l.name) parts.push(l.name);
  });
  (data.volunteer || []).forEach((v: any) => {
    if (v.role) parts.push(v.role);
    if (v.organization) parts.push(v.organization);
    if (v.description) parts.push(v.description);
  });
  (data.awards || []).forEach((a: any) => {
    if (a.title) parts.push(a.title);
    if (a.description) parts.push(a.description);
  });
  (data.customSections || []).forEach((s: any) => {
    if (s.title) parts.push(s.title);
    (s.bullets || []).forEach((b: string) => parts.push(b));
  });

  return parts.join(" \n ");
}

// ============================================================
// Rule-based matching
// ============================================================
export interface PrioritizedKeyword {
  word: string;
  score: number;
}

export interface JDKeywordResult {
  matched: string[];
  missing: string[];
  missingHigh: PrioritizedKeyword[];
  missingLow: PrioritizedKeyword[];
  matchPercent: number;
  topMissing: string[];
  totalKeywords: number;
}

const scoreMissing = (word: string): number => {
  let score = 1;
  if (word.length >= 8) score *= 2.0;
  else if (word.length >= 6) score *= 1.5;
  if (/[+#.]/.test(word)) score *= 2.2;
  if (/-/.test(word)) score *= 1.4;
  if (/\s/.test(word)) score *= 1.8;
  if (word.length <= 4) score *= 0.6;
  return score;
};

export function matchResumeToJD(
  resumeText: string,
  jd: string,
): JDKeywordResult | null {
  const keywords = extractKeywords(jd);
  if (keywords.length === 0) return null;

  const haystack = resumeText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of keywords) {
    const pattern = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
    if (pattern.test(haystack)) matched.push(kw);
    else missing.push(kw);
  }

  const matchPercent =
    keywords.length > 0
      ? Math.round((matched.length / keywords.length) * 100)
      : 0;

  const scoredMissing: PrioritizedKeyword[] = missing
    .map((w) => ({ word: w, score: scoreMissing(w) }))
    .sort((a, b) => b.score - a.score);

  const splitIndex = Math.max(3, Math.ceil(scoredMissing.length * 0.4));
  const missingHigh = scoredMissing.slice(0, splitIndex);
  const missingLow = scoredMissing.slice(splitIndex);

  return {
    matched,
    missing,
    missingHigh,
    missingLow,
    matchPercent,
    topMissing: missingHigh.slice(0, 6).map((k) => k.word),
    totalKeywords: keywords.length,
  };
}

// ============================================================
// Per-section coverage
// ============================================================
export interface SectionCoverage {
  section: string;
  icon: string;
  matchedCount: number;
  matchedKeywords: string[];
}

export function matchBySection(data: any, jd: string): SectionCoverage[] {
  const keywords = extractKeywords(jd);
  if (keywords.length === 0) return [];

  const sections: { name: string; icon: string; text: string }[] = [
    { name: "Summary", icon: "📝", text: data.summary || "" },
    {
      name: "Experience",
      icon: "💼",
      text: (data.experience || [])
        .map(
          (e: any) =>
            `${e.role || ""} ${e.company || ""} ${e.description || ""}`,
        )
        .join(" "),
    },
    { name: "Skills", icon: "🛠", text: (data.skills || []).join(", ") },
    {
      name: "Education",
      icon: "🎓",
      text: (data.education || [])
        .map(
          (e: any) =>
            `${e.degree || ""} ${e.fieldOfStudy || ""} ${e.institution || ""}`,
        )
        .join(" "),
    },
    {
      name: "Projects",
      icon: "🚀",
      text: (data.projects || [])
        .map(
          (p: any) =>
            `${p.name || ""} ${p.technologies || ""} ${p.description || ""}`,
        )
        .join(" "),
    },
    {
      name: "Certifications",
      icon: "🏅",
      text: (data.certifications || [])
        .map((c: any) => `${c.name || ""} ${c.issuer || ""}`)
        .join(" "),
    },
  ];

  return sections
    .filter((s) => s.text.trim().length > 0)
    .map((s) => {
      const haystack = s.text.toLowerCase();
      const matched: string[] = [];
      for (const kw of keywords) {
        const pattern = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
        if (pattern.test(haystack)) matched.push(kw);
      }
      return {
        section: s.name,
        icon: s.icon,
        matchedCount: matched.length,
        matchedKeywords: matched,
      };
    })
    .sort((a, b) => b.matchedCount - a.matchedCount);
}

// ============================================================
// AI-refined matching
// ============================================================
export interface AIRefinedResult {
  matchPercent: number;
  matched: string[];
  missingHigh: string[];
  missingLow: string[];
  sectionScores: { section: string; score: number; note: string }[];
  notes: string;
}

export async function refineWithAI(
  resumeText: string,
  jd: string,
): Promise<AIRefinedResult> {
  const prompt = `You are an ATS keyword matcher. Compare the RESUME and JOB DESCRIPTION.

Return ONLY valid JSON matching this shape:

{
  "matchPercent": number,
  "matched": [string],
  "missingHigh": [string],
  "missingLow": [string],
  "sectionScores": [
    { "section": "Summary", "score": number, "note": string },
    { "section": "Experience", "score": number, "note": string },
    { "section": "Skills", "score": number, "note": string },
    { "section": "Education", "score": number, "note": string }
  ],
  "notes": string
}

Rules:
- Extract the 20 most important SKILLS, TOOLS, CERTIFICATIONS, and DOMAIN TERMS from the JD.
- Ignore filler words (team, role, company, high, success, etc.).
- Recognize SYNONYMS: JS = JavaScript, Postgres = PostgreSQL, AWS = Amazon Web Services, PM = Project Management.
- "matched" = skills the resume clearly has (exact OR synonym match).
- "missingHigh" = important skills the resume lacks, ordered by importance to the role.
- "missingLow" = nice-to-have skills the resume lacks.
- "sectionScores" (each 0–100): how strong is each resume section for THIS role.
- "notes" = one-sentence overall impression (max 100 chars).
- matchPercent = round(matched / (matched + missingHigh + missingLow) * 100).

RESUME:
"""
${resumeText}
"""

JOB DESCRIPTION:
"""
${jd}
"""`;

  return callAIJSON<AIRefinedResult>(prompt);
}
