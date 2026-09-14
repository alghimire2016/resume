// src/storage.ts

import type { ResumeData } from "./types";
import { DEFAULT_SECTION_ORDER } from "./types";

export interface SavedResume {
  id: string;
  name: string;
  data: ResumeData;
  createdAt: number;
  updatedAt: number;
}

export interface StorageState {
  activeId: string;
  list: SavedResume[];
}

const STORAGE_KEY = "resume-builder-resumes-v2";
const LEGACY_KEY = "resume-builder-data-v1";

export const defaultResumeData = (): ResumeData => ({
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
  },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  skills: [],
  languages: [],
  volunteer: [],
  awards: [],
  customSections: [],
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  template: "classic",
  accentColor: "purple",
});

const newResume = (name: string, data?: ResumeData): SavedResume => {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    data: data ? { ...data } : defaultResumeData(),
    createdAt: now,
    updatedAt: now,
  };
};

// Ensure old saves load cleanly (missing fields get defaults)
const normalizeResume = (r: SavedResume): SavedResume => {
  const defs = defaultResumeData();
  return {
    ...r,
    data: {
      ...defs,
      ...r.data,
      personalInfo: { ...defs.personalInfo, ...(r.data?.personalInfo || {}) },
      sectionOrder:
        Array.isArray(r.data?.sectionOrder) && r.data.sectionOrder.length > 0
          ? r.data.sectionOrder
          : [...DEFAULT_SECTION_ORDER],
      template: r.data?.template || "classic",
      accentColor: r.data?.accentColor || "purple",
    },
  };
};

export function loadStorage(): StorageState {
  // Try current schema
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StorageState;
      if (parsed?.list?.length > 0 && parsed.activeId) {
        parsed.list = parsed.list.map(normalizeResume);
        // Safety: activeId must exist in list
        if (!parsed.list.some((r) => r.id === parsed.activeId)) {
          parsed.activeId = parsed.list[0].id;
        }
        return parsed;
      }
    }
  } catch {
    // fall through
  }

  // Try legacy single-resume schema
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacyData = JSON.parse(legacyRaw) as Partial<ResumeData>;
      const migrated = newResume("My Resume", {
        ...defaultResumeData(),
        ...legacyData,
        personalInfo: {
          ...defaultResumeData().personalInfo,
          ...(legacyData.personalInfo || {}),
        },
      } as ResumeData);
      const state: StorageState = { activeId: migrated.id, list: [migrated] };
      saveStorage(state);
      return state;
    }
  } catch {
    // fall through
  }

  // Fresh install
  const fresh = newResume("My Resume");
  const state: StorageState = { activeId: fresh.id, list: [fresh] };
  saveStorage(state);
  return state;
}

export function saveStorage(state: StorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save storage:", err);
  }
}

export const createNewResume = (name: string): SavedResume => newResume(name);

export const duplicateResume = (
  source: SavedResume,
  newName: string,
): SavedResume => ({
  ...source,
  id: crypto.randomUUID(),
  name: newName,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  data: JSON.parse(JSON.stringify(source.data)), // deep clone so edits don't bleed
});
