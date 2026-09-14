// src/components/CoverLetterDocument.tsx

import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData } from "../types";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  header: { marginBottom: 24 },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 1.3,
    marginBottom: 4,
    color: "#1a1a1a",
  },
  contact: {
    fontSize: 10,
    color: "#4a4a4a",
    lineHeight: 1.4,
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
    color: "#1a1a1a",
    marginBottom: 20,
  },
  salutation: {
    fontSize: 11,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 1.55,
  },
  signoff: {
    fontSize: 11,
    marginTop: 14,
    marginBottom: 6,
  },
  signature: {
    fontSize: 11,
    fontWeight: "bold",
  },
});

interface Props {
  data: ResumeData;
  letterText: string;
}

const CoverLetterDocument: React.FC<Props> = ({ data, letterText }) => {
  const p = data.personalInfo;
  const contactParts = [p.email, p.phone, p.location].filter(Boolean);
  const today = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Split the letter into paragraphs on blank lines
  const paragraphs = letterText
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);

  // The final 2 paragraphs are usually the sign-off + name — pull them apart
  // so we can render the name in bold
  let body: string[] = [];
  let signoff = "";
  let signatureName = p.fullName || "";

  if (paragraphs.length >= 2) {
    const last = paragraphs[paragraphs.length - 1];
    const secondLast = paragraphs[paragraphs.length - 2];
    if (/^(sincerely|best|regards|thank)/i.test(secondLast)) {
      body = paragraphs.slice(0, -2);
      signoff = secondLast;
      signatureName = last || signatureName;
    } else if (/^(sincerely|best|regards|thank)/i.test(last)) {
      body = paragraphs.slice(0, -1);
      signoff = last;
      signatureName = p.fullName || "";
    } else {
      body = paragraphs;
      signoff = "Sincerely,";
      signatureName = p.fullName || "";
    }
  } else {
    body = paragraphs;
    signoff = "Sincerely,";
    signatureName = p.fullName || "";
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{p.fullName || "Your Name"}</Text>
          {contactParts.length > 0 && (
            <Text style={styles.contact}>{contactParts.join("  |  ")}</Text>
          )}
        </View>

        {/* Date */}
        <Text style={styles.date}>{today}</Text>

        {/* Salutation */}
        <Text style={styles.salutation}>Dear Hiring Manager,</Text>

        {/* Body */}
        {body.map((para, i) => (
          <Text key={i} style={styles.paragraph}>
            {para}
          </Text>
        ))}

        {/* Sign-off */}
        <Text style={styles.signoff}>{signoff}</Text>
        <Text style={styles.signature}>{signatureName}</Text>
      </Page>
    </Document>
  );
};

export default CoverLetterDocument;
