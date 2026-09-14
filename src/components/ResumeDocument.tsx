// src/components/ResumeDocument.tsx

import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";
import type { ResumeData, SectionKey } from "../types";

const BLACK = "#1a1a1a";
const GRAY = "#4a4a4a";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 32,
    paddingBottom: 38,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: BLACK,
  },
  header: { marginBottom: 10 },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    lineHeight: 1.25,
    marginBottom: 5,
    color: BLACK,
  },
  contactLine: { fontSize: 9.5, color: GRAY, lineHeight: 1.4, marginBottom: 2 },
  section: { marginTop: 9 },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
    paddingBottom: 2,
    marginBottom: 5,
    lineHeight: 1.25,
    color: BLACK,
  },
  entryHeader: {
    fontSize: 10.5,
    fontWeight: "bold",
    lineHeight: 1.35,
    marginBottom: 1,
    color: BLACK,
  },
  entrySub: { fontSize: 9.5, color: GRAY, lineHeight: 1.35, marginBottom: 3 },
  bullet: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 1.5,
    paddingLeft: 8,
    color: BLACK,
    orphans: 2,
    widows: 2,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.4,
    marginBottom: 3,
    color: BLACK,
    orphans: 2,
    widows: 2,
  },
  link: { color: "#0b5cad", textDecoration: "underline" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: "center",
  },
  pageNumber: { fontSize: 8, color: "#999999", fontFamily: "Helvetica" },
});

interface Props {
  data: ResumeData;
}

const toBullets = (text: string): string[] =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const toUrl = (u: string): string =>
  /^https?:\/\//i.test(u) ? u : `https://${u}`;

const joinDates = (start?: string, end?: string): string => {
  const parts = [start?.trim(), end?.trim()].filter(Boolean);
  return parts.join(" – ");
};

const getDateLine = (item: {
  startDate: string;
  endDate: string;
  datesUnknown?: boolean;
}): string => {
  if (item.datesUnknown) return "Dates unknown";
  return joinDates(item.startDate, item.endDate);
};

// ATS-friendly education line:
//   "Western Sydney University — Graduated Jul 2024"
//   "Western Sydney University — Expected Jul 2025"
//   "Western Sydney University" (no date)
const formatEducationMeta = (edu: {
  institution: string;
  graduationDate: string;
  graduationStatus?: "graduated" | "expected";
}): string => {
  const inst = edu.institution.trim();
  const date = edu.graduationDate.trim();
  if (!date) return inst;
  const status = edu.graduationStatus === "expected" ? "Expected" : "Graduated";
  return inst ? `${inst} — ${status} ${date}` : `${status} ${date}`;
};

const LinkLine: React.FC<{ parts: { text: string; href?: string }[] }> = ({
  parts,
}) => (
  <Text style={styles.entrySub}>
    {parts.map((p, i) => (
      <Text key={i}>
        {p.href ? (
          <Link src={toUrl(p.href)} style={styles.link}>
            {p.text}
          </Link>
        ) : (
          p.text
        )}
        {i < parts.length - 1 ? "  |  " : ""}
      </Text>
    ))}
  </Text>
);

const ResumeDocument: React.FC<Props> = ({ data }) => {
  const contactParts = [
    data.personalInfo.email,
    data.personalInfo.phone,
    data.personalInfo.location,
  ].filter(Boolean);

  const linkParts: { text: string; href?: string }[] = [];
  if (data.personalInfo.website)
    linkParts.push({
      text: data.personalInfo.website,
      href: data.personalInfo.website,
    });
  if (data.personalInfo.linkedin)
    linkParts.push({
      text: data.personalInfo.linkedin,
      href: data.personalInfo.linkedin,
    });

  const renderSection = (key: SectionKey) => {
    switch (key) {
      case "summary":
        if (!data.summary) return null;
        return (
          <View style={styles.section} key={key} wrap={false}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.body}>{data.summary}</Text>
          </View>
        );

      case "experience":
        if (data.experience.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {data.experience.map((exp) => {
              const dateLine = getDateLine(exp);
              return (
                <View key={exp.id} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={styles.entryHeader}>
                    {exp.role || "Role"}
                    {exp.company ? ` — ${exp.company}` : ""}
                  </Text>
                  {dateLine ? (
                    <Text style={styles.entrySub}>{dateLine}</Text>
                  ) : null}
                  {toBullets(exp.description).map((line, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {line.replace(/^[-•]\s*/, "")}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        );

      case "projects":
        if (data.projects.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {data.projects.map((proj) => {
              const metaParts: { text: string; href?: string }[] = [];
              if (proj.technologies)
                metaParts.push({ text: proj.technologies });
              if (proj.link)
                metaParts.push({ text: proj.link, href: proj.link });
              const dateLine = getDateLine(proj);
              if (dateLine) metaParts.push({ text: dateLine });

              return (
                <View key={proj.id} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={styles.entryHeader}>
                    {proj.name || "Project"}
                  </Text>
                  {metaParts.length > 0 && <LinkLine parts={metaParts} />}
                  {toBullets(proj.description).map((line, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {line.replace(/^[-•]\s*/, "")}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        );

      case "education":
        if (data.education.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu) => (
              <View key={edu.id} style={{ marginBottom: 5 }} wrap={false}>
                <Text style={styles.entryHeader}>
                  {edu.degree || "Degree"}
                  {edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ""}
                </Text>
                <Text style={styles.entrySub}>{formatEducationMeta(edu)}</Text>
              </View>
            ))}
          </View>
        );

      case "certifications":
        if (data.certifications.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {data.certifications.map((cert) => {
              const meta = [
                cert.date,
                cert.credentialId && `ID: ${cert.credentialId}`,
              ]
                .filter(Boolean)
                .join("  |  ");
              return (
                <View key={cert.id} style={{ marginBottom: 4 }} wrap={false}>
                  <Text style={styles.entryHeader}>
                    {cert.name || "Certification"}
                    {cert.issuer ? ` — ${cert.issuer}` : ""}
                  </Text>
                  {meta ? <Text style={styles.entrySub}>{meta}</Text> : null}
                </View>
              );
            })}
          </View>
        );

      case "skills":
        if (data.skills.length === 0) return null;
        return (
          <View style={styles.section} key={key} wrap={false}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {/* Comma-separated list — the ATS-preferred format.
                This is far more reliably parsed than "• • •" blocks. */}
            <Text style={styles.body} wrap={false}>
              {data.skills.join(", ")}
            </Text>
          </View>
        );

      case "languages":
        if (data.languages.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Languages</Text>
            {data.languages.map((lang) => (
              <Text key={lang.id} style={styles.body} wrap={false}>
                {lang.name}
                {lang.proficiency ? ` — ${lang.proficiency}` : ""}
              </Text>
            ))}
          </View>
        );

      case "volunteer":
        if (data.volunteer.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Volunteer Experience</Text>
            {data.volunteer.map((vol) => {
              const dateLine = getDateLine(vol);
              return (
                <View key={vol.id} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={styles.entryHeader}>
                    {vol.role || "Role"}
                    {vol.organization ? ` — ${vol.organization}` : ""}
                  </Text>
                  {dateLine ? (
                    <Text style={styles.entrySub}>{dateLine}</Text>
                  ) : null}
                  {toBullets(vol.description).map((line, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {line.replace(/^[-•]\s*/, "")}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        );

      case "awards":
        if (data.awards.length === 0) return null;
        return (
          <View style={styles.section} key={key}>
            <Text style={styles.sectionTitle}>Awards & Achievements</Text>
            {data.awards.map((award) => {
              const header = [
                award.title || "Award",
                award.issuer ? ` — ${award.issuer}` : "",
                award.date ? ` (${award.date})` : "",
              ].join("");
              return (
                <View key={award.id} style={{ marginBottom: 4 }} wrap={false}>
                  <Text style={styles.entryHeader}>{header}</Text>
                  {award.description && (
                    <Text style={styles.bullet}>• {award.description}</Text>
                  )}
                </View>
              );
            })}
          </View>
        );

      case "customSections": {
        const visible = data.customSections.filter(
          (s) => s.title || s.bullets.some((b) => b.trim()),
        );
        if (visible.length === 0) return null;
        return (
          <View key={key}>
            {visible.map((section) => (
              <View style={styles.section} key={section.id} wrap={false}>
                <Text style={styles.sectionTitle}>
                  {section.title || "Custom Section"}
                </Text>
                {section.bullets
                  .filter((b) => b.trim())
                  .map((b, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {b.replace(/^[-•]\s*/, "")}
                    </Text>
                  ))}
              </View>
            ))}
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>
            {data.personalInfo.fullName || "Your Name"}
          </Text>
          {contactParts.length > 0 && (
            <Text style={styles.contactLine}>{contactParts.join("  |  ")}</Text>
          )}
          {linkParts.length > 0 && <LinkLine parts={linkParts} />}
        </View>

        {data.sectionOrder.map((key) => renderSection(key))}

        <View fixed style={styles.footer}>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export default ResumeDocument;
