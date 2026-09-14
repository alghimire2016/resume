# Resume Studio

A local-first, AI-powered resume builder with ATS checking, job matching, and cover letter generation. Built with React, TypeScript, and Vite.

> **Bring Your Own Key (BYOK).** This app does not include AI by default. You connect your own API key (Gemini, Grok, OpenRouter, DeepSeek, Ollama, or any OpenAI-compatible endpoint). It's used only for your requests and never leaves your browser.

---

## ✨ Features

### Resume Builder
- **All standard sections** — Personal info, Summary, Experience, Education, Projects, Certifications, Skills, Languages, Volunteer, Awards, plus unlimited custom sections
- **3 templates** — Classic, Modern, Compact
- **6 accent colors** — used tastefully on the name and section underlines only (body text stays black for ATS safety)
- **Live PDF preview** with full-view toggle and page-count indicator
- **Drag-and-drop section reordering**
- **Present / Unknown date handling** for ongoing or unremembered roles
- **Company autocomplete** — reuse companies you've typed before
- **Undo/Redo** — Ctrl+Z / Ctrl+Y across the whole form
- **Auto-save** — everything persists to your browser

### AI Features (requires your own API key)
- **Import from PDF** — upload an existing resume and AI fills the form
- **Write for this job** — generates a targeted professional summary using only your real experience
- **Skill suggestions** — AI extracts relevant skills from a job description, grouped by category
- **Refine keyword match** — AI-powered matching that recognizes synonyms (JS ↔ JavaScript, Postgres ↔ PostgreSQL)
- **Cover letter generator** — 3 tones, editable, exports to PDF
- **ATS Checker** — overall score, section-by-section breakdown, and top fixes

### Storage
- **Multiple resumes** — save, rename, duplicate, and drag-reorder them
- **Auto-save** — every keystroke is persisted
- **Cover letter per resume** — stored separately

### Design
- **Dark / light mode** — follows your system preference by default
- **Minimal, distraction-free UI**
- **Keyboard shortcuts** — Ctrl+Z undo, Ctrl+Y redo

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** — [download](https://nodejs.org)
- **Git** — [download](https://git-scm.com/download/win) (Windows) or `brew install git` (Mac)

### Install and run

```bash
# Clone the repo
git clone https://github.com/alghimire2016/resume.git
cd resume

# Install dependencies
npm install

# Start the dev server
npm run dev
