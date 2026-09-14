// src/types.ts

export type SectionKey =
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "certifications"
  | "skills"
  | "languages"
  | "volunteer"
  | "awards"
  | "customSections";

export type TemplateId = "classic" | "modern" | "compact";
export type AccentId =
  | "purple"
  | "blue"
  | "teal"
  | "green"
  | "orange"
  | "slate";

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  "summary",
  "experience",
  "projects",
  "education",
  "certifications",
  "skills",
  "languages",
  "volunteer",
  "awards",
  "customSections",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  skills: "Skills",
  languages: "Languages",
  volunteer: "Volunteer Experience",
  awards: "Awards & Achievements",
  customSections: "Custom Sections",
};

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
  };
  summary: string;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  skills: string[];
  languages: Language[];
  volunteer: Volunteer[];
  awards: Award[];
  customSections: CustomSection[];
  sectionOrder: SectionKey[];
  template: TemplateId; // NEW
  accentColor: AccentId; // NEW
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  datesUnknown?: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationDate: string;
  graduationStatus?: "graduated" | "expected";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string;
  link: string;
  startDate: string;
  endDate: string;
  datesUnknown?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialId: string;
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
}

export interface Volunteer {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  datesUnknown?: boolean;
}

export interface Award {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description: string;
}

export interface CustomSection {
  id: string;
  title: string;
  bullets: string[];
}
