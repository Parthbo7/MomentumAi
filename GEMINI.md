# Momentum AI — Gemini Developer Guide (GEMINI.md)

Welcome to the **Momentum AI** development workspace. This document outlines our shared architecture, codebase conventions, tech stack guidelines, and workflows to ensure high-quality and consistent contributions.

---

## 1. Project Overview & Product Vision

Momentum AI is an AI-powered productivity companion designed to prevent missed deadlines. Unlike passive reminder applications, Momentum AI acts as an active accountability partner that analyzes user commitments, predicts scheduling risks, and generates actionable, time-blocked plans.

- **Primary Repository:** React 19 Single Page Application (SPA) driven by Vite 8 and TypeScript.
- **Backend Service:** Serverless integration with Firebase (Authentication & Firestore NoSQL database).
- **AI Processing Layer:** Deep integration with Gemini 2.5 to analyze workload stress, predict deadline risk scores, and auto-schedule study/work blocks.

---

## 2. Technology Stack

Our tech stack is modern and selected for extreme rapid prototyping and client performance:

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19.2 | Function-based components, hook-driven architecture |
| **Build Tooling** | Vite 8.0 & TypeScript 6.0 | Fast HMR, strict type checking (`tsc -b`) |
| **CSS & Styling** | Tailwind CSS 4.3 | Utility-first, clean transition times, Custom theme config |
| **Database & Auth** | Firebase SDK 12.15 | Firestore real-time listener sync & secure auth sessions |
| **Iconography** | Lucide React | Modern, clean outline icons |
| **Motion & Animation** | Framer Motion 12.4 | Soft page transitions and responsive user feedback |

---

## 3. Architecture & Codebase Directory Structure

```
E:\MomentumAI\
├── DESIGN.md                   # Full Architectural & Database Schema Design
├── PRD.md                      # Product Requirements Document & Features List
├── package.json                # Project Dependencies & Build Scripts
├── index.html                  # Main SPA entrypoint
├── src/
│   ├── App.tsx                 # Core application layout, auth state observer & routing
│   ├── main.tsx                # React DOM render mount
│   ├── index.css               # Global Tailwind directives & theme configuration
│   ├── firebase.ts             # Firebase client initializers & export references
│   ├── firebaseService.ts      # Core collection services, CRUD helpers & DB type definitions
│   ├── assets/                 # SVGs and landing hero graphic elements
│   ├── lib/
│   │   └── goalScheduleEngine.ts # Core scheduling helpers for planning algorithms
│   ├── components/             # React visual interface modules
│   │   ├── AuthModal.tsx       # Sign-in/Sign-up overlay handlers
│   │   ├── AuthScreen.tsx      # Core authentication visual panels
│   │   ├── Dashboard.tsx       # Master 3-column layout controller
│   │   ├── TaskWorkspace.tsx   # Task creation, tracking, and prioritization lists
│   │   ├── GoalsHabitsWorkspace.tsx # Multi-tier planning tools for habit tracking
│   │   ├── GamificationWidgets.tsx # Streak trackers, XP indicators & Momentum Score
│   │   └── calendar/           # Full calendar dashboard sub-workspace
│   │       ├── CalendarWorkspace.tsx # Primary Calendar schedule engine
│   │       ├── CalendarGrid.tsx      # Month, week, and day matrix renders
│   │       ├── aiScheduler.ts        # AI time-blocking scheduler integration
│   │       └── AnalyticsPanel.tsx    # Productivity statistics visualizer
```

---

## 4. Key Developer Conventions

### A. Code Style & Formatting
- **Functional Components:** Always write React components using functional declarations (`function MyComponent() {}`) rather than arrow declarations (`const MyComponent = () => {}`) where possible, matching the standard set in `src/App.tsx`.
- **TypeScript Strictness:** Never use `any` bypasses or casting shortcuts. Leverage the strict types defined inside `src/firebaseService.ts` for database entities.
- **Component File Layout:** Group sub-components in designated folders (e.g., `./src/components/calendar/`) to prevent the root components folder from becoming cluttered.

### B. Database Operations & Typing (`src/firebaseService.ts`)
We use Firestore for database synchronization. All Firestore operations, triggers, and types **must** be declared or defined in `src/firebaseService.ts`. Ensure your components consume these helpers rather than instantiating direct Firestore collections:
- **`UserProfile`**: User profile parameters, including levels, XP, theme preferences, and Momentum Score.
- **`DbTask`**: Multi-priority (`low`, `medium`, `high`, `critical`) and status (`not_started`, `in_progress`, `completed`, `overdue`, etc.) task entity schema.
- **`DbEvent`**: User-scheduled physical calendar meetings and time blocks.

### C. Design Theme & Custom CSS Colors
Ensure consistent color application to keep the visual system polished:
- **Light Mode (Canvas: `#F8FAFC`, Sidebar/Cards: `#FFFFFF`):** Soft, high-contrast typography. Accent colors utilize lavender-purple variations (`#6D5DF6` and `#8B7CF8`).
- **Dark Mode (Canvas: `#0B0B0F`, Sidebar: `#111318`):** Deep charcoal colors, translucent white borders, vibrant neon priorities.
- **Priority Indicator Palette:**
  - **Critical:** Danger, `#EF4444` (Electric Red)
  - **High:** Warning, `#F59E0B` (Electric Orange)
  - **Medium:** Success, `#22C55E` (Electric Green)
  - **Low:** Info, `#06D6FF` (Electric Cyan)

---

## 5. Development & Quality Assurance Workflows

### Command Cheat Sheet

Always run the correct build and lint commands before pushing any code to maintain repository integrity.

| Task | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Server** | `npm run dev` | Launch local Vite development server with hot module reloading. |
| **Type Check & Build** | `npm run build` | Compile codebases with `tsc` first, then bundle assets via Vite. |
| **Code Linting** | `npm run lint` | Run project-wide ESLint checks and output warnings. |
| **Preview Production Build** | `npm run preview` | Spin up a local static server to preview local `./dist` assets. |

### Verification Pipeline (Pre-Commit / Pre-PR)
Before completing any task, execute the following chain to ensure zero build regressions:
```powershell
npm run lint && npm run build
```

---

## 6. Safety & Security

- **Environment & API Keys:** Under no circumstances should individual Gemini API keys or credentials be hardcoded in files. Keep standard settings defined in `.env` files or using Firestore secure service parameters.
- **No Direct Reverts:** Never revert codebase modifications unless they cause verified breaking test failures or build compilation errors.
- **Avoid Interactive Prompts in Background Tasks:** If executing test runners or dev build watchers, always prefer clean one-shot executions to keep developer feedback immediate and responsive.
