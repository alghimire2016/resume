// src/templates.ts

import type { TemplateId, AccentId } from "./types";

// ---------- Accent colors ----------
export interface AccentColor {
  id: AccentId;
  label: string;
  hex: string;
  swatch: string;
}

export const ACCENT_COLORS: AccentColor[] = [
  { id: "purple", label: "Purple", hex: "#5b4bb5", swatch: "#6d5bd0" },
  { id: "blue", label: "Blue", hex: "#1e5a9e", swatch: "#2a7bce" },
  { id: "teal", label: "Teal", hex: "#0f6e6e", swatch: "#179b9b" },
  { id: "green", label: "Green", hex: "#2b6a3f", swatch: "#3a9a58" },
  { id: "orange", label: "Orange", hex: "#a14b0c", swatch: "#e0691a" },
  { id: "slate", label: "Slate", hex: "#374151", swatch: "#4b5563" },
];

export const getAccent = (id: AccentId): AccentColor =>
  ACCENT_COLORS.find((c) => c.id === id) || ACCENT_COLORS[0];

// ---------- Templates ----------
export interface TemplateMeta {
  id: TemplateId;
  label: string;
  description: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "classic",
    label: "Classic",
    description:
      "Timeless single-column layout. Black text, clean section rules. Maximum ATS safety.",
  },
  {
    id: "modern",
    label: "Modern",
    description:
      "Accent-colored name and section underlines. Same ATS-safe structure, a bit more personality.",
  },
  {
    id: "compact",
    label: "Compact",
    description:
      "Tighter spacing and smaller type. Fits more onto one page — good for early-career candidates.",
  },
];
