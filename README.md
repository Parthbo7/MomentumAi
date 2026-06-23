# Momentum AI 🚀

> Proactive AI-Powered Productivity Companion that Prevents Missed Deadlines

Momentum AI is a premium, high-velocity SaaS planning workspace designed for students, professionals, and founders. Unlike traditional productivity tools that rely on passive notifications, Momentum AI continuously monitors deadlines, maps workloads, and guides users with real-time schedule optimizations.

---

## Key Features

- **Interactive Weekly Calendar Overview**: Sleek, dominant visual layout displaying color-coded events, glowing current day trackers, and direct action triggers.
- **AI Recommendation Engine**: Context-aware insight panels warning of upcoming deadline clusters and suggesting active resolutions.
- **Fixed Navigation Left Sidebar**: High-fidelity sidebar including custom menu listings and the signature circular **Momentum Score** telemetry widget.
- **Upcoming Tasks Stream**: Urgency-aware task lists color-coded by prioritization (Critical, High, Medium, Low).
- **Comprehensive Analytics Telemetry**: Quick stat metrics on tasks completed, focus hours logged, and overdue tasks.
- **Bi-directional Integrations**: Real-time sync capabilities with Google Calendar and external developer logs.

---

## System Architecture

```
                                  +-----------------------+
                                  |    React + Vite       |
                                  |    Tailwind CSS v4    |
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
        +------------+------------+                       +------------+------------+
        |  Firebase Backend       |                       |  AI Intelligence Layer  |
        |  - Firestore Db         |                       |  - Gemini 2.5 API       |
        |  - Authentication       |                       |  - Stress Forecasting   |
        +-------------------------+                       +-------------------------+
```

For a comprehensive technical breakdown of Firestore schemas, component layout, and design system tokens, view the [DESIGN.md](file:///e:/MomentumAI/DESIGN.md) specification file.

---

## Technology Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Google Font family (Inter & Outfit)
- **Icons**: Lucide React
- **Backend & Database**: Firebase Firestore & Firebase Auth

---

## Local Setup & Development

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) installed on your system.

### 2. Install Dependencies
Clone the repository, navigate to the folder, and run:
```bash
npm install
```

### 3. Run Development Server
Start the local server with hot module reloading (HMR) active:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### 4. Build for Production
To build the project bundle for deployment:
```bash
npm run build
```
To run the production build locally:
```bash
npm run preview
```
