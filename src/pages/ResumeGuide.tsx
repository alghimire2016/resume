// src/pages/ResumeGuide.tsx

import { useState } from "react";

type GuideSection =
  | "what-is-ats"
  | "must-have"
  | "situational"
  | "skip"
  | "do"
  | "dont"
  | "by-stage";

// ============================================================
// Reusable UI
// ============================================================

const SectionTitle = ({ icon, title }: { icon: string; title: string }) => (
  <h2
    style={{
      margin: "0 0 1rem 0",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: "-0.01em",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <span>{icon}</span>
    <span>{title}</span>
  </h2>
);

const Card: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "warn";
}> = ({ children, variant = "default" }) => (
  <div
    style={{
      background:
        variant === "warn" ? "var(--warning-subtle)" : "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "1.1rem 1.25rem",
      marginBottom: "0.85rem",
      lineHeight: 1.65,
      color: "var(--text-secondary)",
      fontSize: 13.5,
    }}
  >
    {children}
  </div>
);

const NumberedCard: React.FC<{
  number: string;
  title: string;
  children: React.ReactNode;
}> = ({ number, title, children }) => (
  <div
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "1rem 1.15rem",
      marginBottom: "0.7rem",
      display: "flex",
      gap: "0.9rem",
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        flexShrink: 0,
        fontSize: 13,
      }}
    >
      {number}
    </div>
    <div style={{ flex: 1 }}>
      <h3
        style={{
          margin: "0 0 0.4rem 0",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontSize: 13.5,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  </div>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      marginTop: "0.5rem",
      padding: "0.6rem 0.75rem",
      background: "var(--accent-subtle)",
      fontSize: 12.5,
      color: "var(--accent-text)",
      borderRadius: 6,
      lineHeight: 1.55,
    }}
  >
    💡 {children}
  </div>
);

const Table = ({ rows }: { rows: [string, string][] }) => (
  <div
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
    }}
  >
    {rows.map(([section, when], i) => (
      <div
        key={i}
        style={{
          display: "flex",
          padding: "0.8rem 1.1rem",
          borderBottom:
            i < rows.length - 1 ? "1px solid var(--border)" : "none",
          gap: "1rem",
        }}
      >
        <div
          style={{
            width: 190,
            fontWeight: 600,
            fontSize: 13,
            color: "var(--text-primary)",
            flexShrink: 0,
          }}
        >
          {section}
        </div>
        <div
          style={{
            flex: 1,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.55,
          }}
        >
          {when}
        </div>
      </div>
    ))}
  </div>
);

const SkipCard = ({ title, reason }: { title: string; reason: string }) => (
  <div
    style={{
      background: "var(--danger-subtle)",
      borderRadius: 8,
      padding: "0.7rem 0.9rem",
      marginBottom: "0.45rem",
    }}
  >
    <strong style={{ fontSize: 13, color: "var(--danger-text)" }}>
      {title}
    </strong>
    <p
      style={{
        margin: "2px 0 0 0",
        fontSize: 12.5,
        color: "var(--text-secondary)",
        lineHeight: 1.5,
      }}
    >
      {reason}
    </p>
  </div>
);

const DoCard = ({ items }: { items: string[] }) => (
  <div
    style={{
      background: "var(--success-subtle)",
      borderRadius: 12,
      padding: "1rem 1.15rem",
    }}
  >
    {items.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          gap: "0.6rem",
          padding: "4px 0",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.55,
        }}
      >
        <span style={{ color: "var(--success-text)", fontWeight: 700 }}>✓</span>
        <span>{item}</span>
      </div>
    ))}
  </div>
);

const DontCard = ({ items }: { items: string[] }) => (
  <div
    style={{
      background: "var(--danger-subtle)",
      borderRadius: 12,
      padding: "1rem 1.15rem",
    }}
  >
    {items.map((item, i) => (
      <div
        key={i}
        style={{
          display: "flex",
          gap: "0.6rem",
          padding: "4px 0",
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.55,
        }}
      >
        <span style={{ color: "var(--danger-text)", fontWeight: 700 }}>✗</span>
        <span>{item}</span>
      </div>
    ))}
  </div>
);

const StageCard = ({
  stage,
  order,
  note,
  color,
}: {
  stage: string;
  order: string;
  note: string;
  color: string;
}) => (
  <div
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      padding: "1rem 1.15rem",
      marginBottom: "0.7rem",
    }}
  >
    <h3
      style={{ margin: "0 0 0.4rem 0", fontSize: 14, fontWeight: 600, color }}
    >
      {stage}
    </h3>
    <div
      style={{
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        background: "var(--bg-subtle)",
        padding: "6px 10px",
        borderRadius: 6,
        marginBottom: "0.5rem",
        color: "var(--text-secondary)",
      }}
    >
      {order}
    </div>
    <p
      style={{
        margin: 0,
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.55,
      }}
    >
      {note}
    </p>
  </div>
);

// ============================================================
// Section content
// ============================================================

const WhatIsATS = () => (
  <div>
    <SectionTitle icon="🤖" title="What is an ATS?" />
    <Card>
      <p style={{ marginTop: 0 }}>
        <strong style={{ color: "var(--text-primary)" }}>ATS</strong> stands for{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Applicant Tracking System
        </strong>{" "}
        — software companies use to collect, scan, and filter job applications.
        When you apply online, your resume usually goes into an ATS before a
        human ever sees it.
      </p>
      <p>
        Popular platforms:{" "}
        <strong style={{ color: "var(--text-primary)" }}>
          Workday, Taleo, Greenhouse, Lever, iCIMS, SuccessFactors
        </strong>
        . Most large companies and nearly all recruiters use one.
      </p>
    </Card>
    <Card>
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: 13.5,
          color: "var(--text-primary)",
        }}
      >
        What an ATS actually does
      </h3>
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.75 }}>
        <li>
          <strong style={{ color: "var(--text-primary)" }}>Parses</strong> your
          resume into structured data
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)" }}>Indexes</strong> it
          so recruiters can search by keyword
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)" }}>Ranks</strong>{" "}
          applicants based on match to the job description
        </li>
        <li>
          <strong style={{ color: "var(--text-primary)" }}>Filters</strong> out
          resumes that don't meet minimum criteria
        </li>
      </ol>
    </Card>
    <Card variant="warn">
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: 13.5,
          color: "var(--warning-text)",
        }}
      >
        Why it matters
      </h3>
      <p style={{ margin: 0 }}>
        If your resume can't be parsed, a human never sees it. Roughly{" "}
        <strong>
          75% of resumes are rejected before a human looks at them
        </strong>{" "}
        — mostly due to formatting and keyword issues.
      </p>
    </Card>
    <Card>
      <h3
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: 13.5,
          color: "var(--text-primary)",
        }}
      >
        Common myths
      </h3>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.75 }}>
        <li>"I need to stuff keywords" — No. Stuffing gets you blacklisted.</li>
        <li>
          "I should use a designer template" — Designers hate ATS, ATS hates
          designers.
        </li>
        <li>
          "PDFs are always better" — Only if the text is selectable. Scanned
          PDFs fail.
        </li>
        <li>"ATS auto-rejects by score" — No ATS has a fixed cutoff.</li>
      </ul>
    </Card>
  </div>
);

const MustHave = () => (
  <div>
    <SectionTitle icon="✅" title="Must-have sections" />
    <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 13.5 }}>
      The essentials. Every resume should have them.
    </p>
    <NumberedCard number="1" title="Contact information (header)">
      <p style={{ margin: 0 }}>
        Full name, phone, email, city/region. LinkedIn or portfolio URL if
        relevant.
      </p>
      <Hint>
        No full street address needed. Skip photo, date of birth, marital
        status.
      </Hint>
    </NumberedCard>
    <NumberedCard number="2" title="Professional summary">
      <p style={{ margin: 0 }}>
        3–4 lines pitching who you are and what you're targeting. Write it last.
      </p>
      <Hint>
        Skip only if you're very early career with nothing to summarize.
      </Hint>
    </NumberedCard>
    <NumberedCard number="3" title="Work experience">
      <p style={{ margin: 0 }}>
        Reverse chronological. Job title, company, dates, bullet points of
        achievements.
      </p>
      <Hint>
        Required unless zero work history. Start every bullet with an action
        verb.
      </Hint>
    </NumberedCard>
    <NumberedCard number="4" title="Education">
      <p style={{ margin: 0 }}>Degree, institution, dates.</p>
      <Hint>
        After 3–5 years of work, Education moves to the bottom and shrinks to
        one line.
      </Hint>
    </NumberedCard>
    <NumberedCard number="5" title="Skills">
      <p style={{ margin: 0 }}>
        A dedicated keyword section, separate from prose.
      </p>
      <Hint>
        The #1 factor for ATS keyword matching. 8–15 specific skills from the
        job description.
      </Hint>
    </NumberedCard>
  </div>
);

const Situational = () => (
  <div>
    <SectionTitle icon="⚖️" title="Situational sections" />
    <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 13.5 }}>
      Include these depending on your industry and career stage.
    </p>
    <Table
      rows={[
        [
          "Certifications",
          "Trades, healthcare, food service, finance, IT. E.g., RSA, First Aid, PMP, AWS.",
        ],
        ["Projects", "Strong for tech, design, students, career-changers."],
        [
          "Technical proficiencies",
          "IT, engineering, design, finance, ops roles.",
        ],
        [
          "Awards / Achievements",
          "If notable — sales targets, honors, formal recognition.",
        ],
        ["Volunteer experience", "If relevant or fills an experience gap."],
        [
          "Languages",
          "If multilingual and the role is customer-facing or international.",
        ],
        [
          "Publications / Research",
          "Academic, scientific, or research-heavy fields only.",
        ],
        [
          "Core Competencies",
          "Senior/executive roles — leadership keyword block.",
        ],
      ]}
    />
  </div>
);

const Skip = () => (
  <div>
    <SectionTitle icon="🚫" title="What to skip" />
    <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 13.5 }}>
      Outdated, unhelpful, or actively harmful.
    </p>
    <SkipCard
      title="References"
      reason="'Available upon request' is outdated."
    />
    <SkipCard
      title="Photo"
      reason="Not standard in AU, US, UK. Can trigger bias screening."
    />
    <SkipCard title="Hobbies / Interests" reason="Only if directly relevant." />
    <SkipCard
      title="Full mailing address"
      reason="City and region are enough."
    />
    <SkipCard
      title="DOB, marital status, nationality"
      reason="Not needed; illegal to ask in many countries."
    />
    <SkipCard
      title="Objective AND Summary"
      reason="Pick one. Summary is the modern standard."
    />
    <SkipCard title="Fancy graphics / icons" reason="ATS can't parse them." />
    <SkipCard
      title="Skill ratings (bars / stars)"
      reason="'JavaScript: 4/5' means nothing. Just list the skill."
    />
  </div>
);

const DoThis = () => (
  <div>
    <SectionTitle icon="👍" title="Do this" />
    <DoCard
      items={[
        "Use a clean, single-column layout",
        "Save as PDF (with selectable text) or DOCX",
        'Standard headings: "Work Experience," "Education," "Skills"',
        "Start every bullet with a strong action verb",
        "Quantify achievements: numbers, %, $, timeframes",
        "Tailor your resume for every job",
        "Put the most important info first",
        "Standard fonts: Arial, Calibri, Helvetica",
        "1 page for < 10 years experience, 2 max for senior",
        "Proofread — typos are an instant reject",
        "Save the file with your name in it",
      ]}
    />
  </div>
);

const DontThis = () => (
  <div>
    <SectionTitle icon="👎" title="Don't do this" />
    <DontCard
      items={[
        "Multi-column layouts",
        "Images, icons, logos, or photos",
        "Tables or text boxes",
        "Scanned image PDFs",
        "Headers or footers for important info",
        "Keyword stuffing or white text",
        "Lies or exaggerations",
        "Paragraphs — bullets only for experience",
        'First-person pronouns ("I led…")',
        '"References available upon request"',
        "Creative section names",
        "The same resume for every job",
      ]}
    />
  </div>
);

const ByStage = () => (
  <div>
    <SectionTitle icon="📈" title="By career stage" />
    <p style={{ color: "var(--text-muted)", marginTop: 0, fontSize: 13.5 }}>
      The best section order depends on your experience.
    </p>
    <StageCard
      stage="Student / No experience"
      order="Education → Projects → Skills → Volunteer"
      note="Education leads. Add projects, part-time work, or volunteer experience."
      color="#8b5cf6"
    />
    <StageCard
      stage="1–5 years experience"
      order="Experience → Skills → Education"
      note="Work Experience leads. Skills becomes your #1 keyword source."
      color="#3b82f6"
    />
    <StageCard
      stage="Senior / Executive"
      order="Summary → Core Competencies → Experience → Education"
      note="Add a 'Core Competencies' section. Education shrinks to one line."
      color="#10b981"
    />
    <StageCard
      stage="Career changer"
      order="Summary → Skills → Projects → Experience → Education"
      note="Lead with a strong summary. Projects and skills prove your new direction."
      color="#f59e0b"
    />
  </div>
);

// ============================================================
// Main component
// ============================================================

const ResumeGuide: React.FC = () => {
  const [active, setActive] = useState<GuideSection>("what-is-ats");

  const sections: { key: GuideSection; label: string; icon: string }[] = [
    { key: "what-is-ats", label: "What is an ATS?", icon: "🤖" },
    { key: "must-have", label: "Must-have sections", icon: "✅" },
    { key: "situational", label: "Situational sections", icon: "⚖️" },
    { key: "skip", label: "What to skip", icon: "🚫" },
    { key: "do", label: "Do this", icon: "👍" },
    { key: "dont", label: "Don't do this", icon: "👎" },
    { key: "by-stage", label: "By career stage", icon: "📈" },
  ];

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <h1
        style={{
          margin: "0 0 0.35rem 0",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        Resume & ATS guide
      </h1>
      <p
        style={{
          color: "var(--text-muted)",
          marginTop: 0,
          fontSize: 13.5,
          maxWidth: 700,
        }}
      >
        Everything you need to know about writing a modern, ATS-friendly resume.
      </p>

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-start",
          marginTop: "1.25rem",
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 220,
            position: "sticky",
            top: 90,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "0.5rem",
            flexShrink: 0,
          }}
        >
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "0.5rem 0.7rem",
                marginBottom: 2,
                background:
                  active === s.key ? "var(--accent-subtle)" : "transparent",
                color:
                  active === s.key
                    ? "var(--accent-text)"
                    : "var(--text-secondary)",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active === s.key ? 600 : 500,
                textAlign: "left",
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {active === "what-is-ats" && <WhatIsATS />}
          {active === "must-have" && <MustHave />}
          {active === "situational" && <Situational />}
          {active === "skip" && <Skip />}
          {active === "do" && <DoThis />}
          {active === "dont" && <DontThis />}
          {active === "by-stage" && <ByStage />}
        </div>
      </div>
    </div>
  );
};

export default ResumeGuide;
