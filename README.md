# ⚔️ Embark — Client Onboarding Tracker

<div align="center">

### **Client onboarding, leveled up.** 🚀

[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Tests-52_passing-22c55e?style=for-the-badge)](#)
[![Version](https://img.shields.io/badge/Version-8.2-f59e0b?style=for-the-badge)](#)
[![PWA](https://img.shields.io/badge/PWA-installable-a855f7?style=for-the-badge)](#)

*Embark replaces the chaos of spreadsheets and scattered notes with a structured, gamified system that keeps every client onboarding on track — from first call to go-live.*

</div>

---

## 🌟 Why Embark?

Most onboarding tools are either too simple (a checklist app) or too complex (an enterprise CRM nobody actually uses). Embark hits the sweet spot — it's powerful enough to handle real operational complexity, but designed to be fun to use every single day.

- ✅ **Full visibility** across every active client at a glance
- 🎮 **Gamified** — earn XP, level up, unlock achievements
- ⚡ **Blazing fast** — runs entirely in the browser, no backend required
- 🧩 **Modular** — configure exactly the dashboard you want
- 🤖 **AI-assisted** — health summaries, risk briefs, portfolio intelligence, proactive anomaly detection
- 📦 **PWA** — install it like a native app, works offline

---

## 🆕 What's New in v8.2 — Security & Stability

A focused hardening release addressing security vulnerabilities, data bugs, and performance issues surfaced by a full codebase audit.

### Security
- **API key protection** — Anthropic API key no longer written to localStorage. It lives only in memory and is never persisted to storage.
- **XSS fix in portal export** — All client-controlled values (names, task titles, phase names, etc.) are now HTML-escaped before being written into exported portal files.
- **iframe embed allowlist** — Embedded media URLs are validated against a strict allowlist (Loom, YouTube, Calendly, Typeform). A sandbox bypass (`allow-same-origin` + `allow-scripts`) has been removed.

### Bug Fixes
- **Webhook backup/restore data loss** — All webhook endpoints were silently lost on every backup restore due to a storage key mismatch. Fixed.
- **Health score accuracy** — New clients no longer start at a perfect 100/100. Communication recency now defaults to 0.
- **SLA accuracy** — The first-response SLA is now dismissed by actual communication entries, not by any completed internal task.
- **Client filter accuracy** — Clients with no contact history no longer match "last contacted within N days" filters.
- **Go-live date off-by-one** — Date comparisons now normalize to local midnight, fixing a 1-day error for users outside UTC.
- **`the_planner` deed** — Can now be unlocked (was registered but never evaluated).
- **Storage keys standardized** — `onboarding-clients` and `onboarding-automations` renamed to `embark-clients` / `embark-automations`. Existing data is auto-migrated.

### Performance & Stability
- Memoized expensive per-card computations (health score, churn risk, next action, go-live forecast)
- Fixed `requestAnimationFrame` and `setTimeout` memory leaks on component unmount
- Fixed a gamification overlay dismiss loop
- Stabilized notification helper re-memoization cascade

See [CHANGELOG.md](./CHANGELOG.md) for the full list of 35 fixes.

---

## 🔖 Previous: v8.1 — Email Bulk Import & Contact Export

Onboard a whole batch of contacts without going through the intake wizard one at a time.

### 📧 Email Bulk Import
Paste a list of emails into **Settings → Data**. Embark groups them by domain into named client drafts, flags any domain that already has a client (so you never create duplicates), lets you fill in contact names and mark the primary contact, then creates everything in one click.

### 📤 Export All Contact Emails
Download a clean CSV of every contact email across all clients — Client Name, Contact Name, Email, Title, Is Primary, Phone. Falls back to the legacy client email for older records.

---

## 🔖 v8.0 — "Embark Ascendant"

Embark v8.0 is a full competitive upgrade — closing every gap against Rocketlane, Arrows.to, GUIDEcx, and ChurnZero with 14 new features across four tiers.

### 🎨 White-Label Portal Branding
Every client portal now reflects **your brand**. Upload a logo, set your accent color, company name, and tagline in Settings → Branding. Clients see your identity, not Embark's.

### 🎬 Embedded Media in Portal Tasks
Attach **Loom videos, YouTube tutorials, Calendly booking links, and Typeform surveys** directly inside checklist tasks. Clients see the embed inline in their portal — watch the walkthrough and complete the task in one place. URLs are auto-detected; Loom and YouTube share links are automatically converted to embed URLs.

### ✍️ Approval / Sign-Off Tasks
Mark any task as requiring client approval. Clients see **Approve / Request Changes** buttons in their portal. Approved tasks auto-complete; rejections capture a note. Pending approvals surface in Focus Mode with a count badge.

### 📄 AI Status Reports
One-click generation of a structured client update — **Executive Summary, Progress, What's Next, and Blockers** — using live client data. Copy to clipboard or send via email template. Last 5 reports per client are saved for reference.

### 📞 AI Meeting Brief
Before every call, click **Meeting Brief** for an instant pre-call intelligence brief — health snapshot, recent communications, open action items, AI-suggested talking points, and a suggested agenda. Auto-generates on open.

### ✨ AI Onboarding Plan Generator
Generate a complete onboarding plan from a prompt. Pick industry, complexity, and team size in the new client wizard and Embark builds phases, tasks, owners, and due dates. Preview, accept, or regenerate.

### 📈 Predictive Intelligence
- **Go-Live Forecast** — velocity-based prediction (tasks/day over 14 days) shown on every client card; "On-Time Forecast %" stat on the dashboard
- **Engagement Score** — 0–100 score measuring portal recency, client task completion, comms frequency, and response speed; Engagement Watch leaderboard on the dashboard
- **Churn Risk** — health history slope classified as Stable / Declining / High Risk; Churn Watch section on the dashboard
- **NPS / CSAT** — shareable `/#survey/{id}` links; styled 0–10 scale survey; NPS Overview widget (promoters / passives / detractors) when 3+ clients have responded

### 🔍 Smart Segments & Filter Builder
Multi-condition **AND/OR filter builder** in the client list. Filter by health, status, priority, lifecycle stage, last contact, go-live proximity, MRR, and more. Three built-in quick segments: At Risk Renewals, Stalled Onboardings, High Value + Low Health. Save custom segments for reuse.

### 📧 Email Sequence Automation
New `send_email_sequence` automation action with a **per-step template + delay builder** and horizontal timeline visualizer. New `phase_completed` trigger fires sequences when a phase is advanced.

### ⚖️ Team Capacity Planning
New **Capacity tab** in Team Manager shows each member's active clients, open tasks, and a color-coded capacity bar (green / yellow / red). The member with the most headroom is flagged as Recommended. Configurable per-member capacity limits.

### 🏆 Post-Onboarding Success Plan
After graduation, create a **90-Day or Annual Success Plan** with Adoption, QBR, Expansion, and Renewal Prep tracks. Inline KPI editing (adoption %, MRR expansion, QBR status, NPS target). Prompted automatically after every graduation.

---

## 🔖 Previous: v7.0 — "Embark Unstoppable" (scroll up for v8.0)

### 🗂️ Global Task Kanban Board
A full **drag-and-drop task board** spanning every active client. Four columns — To Do, In Progress, Blocked, Done. Filter down to specific clients so the board stays focused instead of showing hundreds of cards. Click any card to open a slide-in drawer with subtasks, comments, and status controls. Every client also gets its own board tab in their detail view.

### 🤝 Two-Way Client Portal
The client portal is no longer read-only. Clients can now **check off their own tasks**, leave per-task comments, post project status updates, and attach files — all from the same shareable URL they already have. CSMs see a "Last viewed by client: X ago" badge and can toggle between Client View and a CSM Summary that shows portal activity at a glance.

### 🧠 AI Proactive Intelligence
AI that acts before you ask:
- **AI Risk Brief** — per-client panel with a Low / Medium / High / Critical tier badge. Critical tier pulses red.
- **AI Portfolio Brief** — dashboard widget that scans all active clients and surfaces the top 3 at-risk ones with recommended plays.
- **Anomaly Detection** — background monitor checks every 60 seconds for health drops and fires alerts to the Morning Briefing automatically.
- **AI Draft** — ✨ button in the Communication Timeline pre-fills your summary based on recent activity.
- **"Why at risk?"** — 🧠 button in Focus Mode opens an AI chat pre-seeded with that client's context for instant triage.

### 📋 Smart Intake Forms
Build intake forms with **7 field types and conditional logic**, publish them at a public `/#form/{id}` URL, and Embark automatically creates the client and applies your chosen template when a prospect submits. No manual entry needed.

### ⏱️ Time Tracking
Track every minute against real client work:
- **Live timer** with a pulsing red indicator on the active task
- **Manual log** with hours/minutes, billable toggle, and note
- **Per-client Time Report** tab showing total, billable, and non-billable hours broken down by task
- **Time Report dashboard widget** ranking your top clients by hours

---

## ✨ Feature Highlights

### 📊 Personalized Dashboard
Choose from **15 configurable widgets** via **Build-A-Dash** — each user picks exactly what they want to see. Stats bar, client health grid, SLA status, CRM pipeline, renewals countdown, go-live dates, AI portfolio brief, time report, and more. Your dashboard, your way.

### 🩺 Onboarding Health Score
Every client gets a **0–100 health score** computed in real-time from task completion rate, SLA status, communication recency, and blocked tasks. Color-coded badges (green / yellow / red) make at-risk clients impossible to miss.

### ⚔️ Gamification & Character Classes
Pick your hero class and earn XP for doing your job:

| Class | Role | XP Bonus |
|-------|------|----------|
| ⚔️ Paladin | The Protector | On-time completions & unblocking tasks |
| 🧙 Wizard | The Strategist | AI features & automations |
| 🏹 Ranger | The Scout | Communications & notes logged |
| 🗡️ Rogue | The Executor | Early completions & client graduations |

Level up, unlock **deeds** (achievements), and compete on the **🏆 Hall of Heroes** leaderboard with your team.

### 🤖 AI-Powered Features
- **Health Pulse** — 3–5 sentence AI health summary for any client, cached and refreshable
- **AI Risk Brief** — tier-rated risk assessment (Low → Critical) with proactive alerts
- **AI Portfolio Brief** — portfolio-wide analysis surfacing at-risk clients with recommended plays
- **Kickoff Pack Generator** — one-click AI draft of a client-facing kickoff email + internal team brief
- **Smart Task Suggestions** — AI recommends checklist tasks based on services and go-live date
- **AI Status Reports** — structured client update with Executive Summary, Progress, What's Next, and Blockers
- **AI Meeting Brief** — pre-call intelligence brief with health, comms, action items, and suggested agenda
- **AI Plan Generator** — generate a full phase + task plan from industry/complexity inputs in the new client wizard

### ⚙️ Automation Engine
Build no-code automation rules: *"When priority changes to High → notify the team."* Triggers, conditions, and actions — all visual, no code required.

### 🚪 Phase Gates
Organize work into phases. Tasks in later phases are **locked** until all prior-phase work is done. No more jumping ahead and leaving gaps.

### 🎓 Client Graduation Ceremony
When every checklist item is done, Embark fires **confetti** 🎉, generates an AI handoff summary, pins it as a note, and awards 75 XP. Completing a client actually feels like an achievement.

### 📋 Client Portal
Generate a beautiful, **shareable two-way portal** for your clients. Clients can check off tasks, leave comments, post status updates, and attach files — all from the same URL. Embark shows CSMs when the client last visited.

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| 🖼️ Framework | React 19 + TypeScript |
| ⚡ Build | Vite |
| 🎨 Styling | Tailwind CSS v4 |
| 💾 State | localStorage via custom hooks |
| 🧪 Testing | Vitest — 52 tests passing |
| 📱 PWA | vite-plugin-pwa (installable, offline-capable) |
| 🔍 Monitoring | Sentry (production only) |
| 🚂 Deployment | Docker + nginx, Railway-ready |

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test:run

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173), register an account, and the **5-step onboarding wizard** will walk you through everything. ✨

---

## 📦 Everything That's In The Box

| Feature | What It Does |
|---------|-------------|
| 🔐 Auth | Per-user accounts with login/register; localStorage now, backend-ready |
| 🧭 Onboarding Wizard | 5-step guided setup: profile → team → class → dashboard |
| 📊 Build-A-Dash | 15 configurable widgets, layout saved per user |
| 👥 Client List | Filter, sort, search, bulk actions, health badges, smart segments |
| 🗂️ Task Kanban Board | Drag-and-drop board across all clients; filter to specific clients |
| ✅ Tasks View | Cross-client task list with filters, due dates, assignees |
| 📅 Planner | Calendar-based planner with daily planning mode |
| ⚙️ Automations | No-code rule engine; email sequence builder with timeline visualizer |
| 📈 Reports | 10+ widgets: velocity trends, bottleneck heatmaps, phase duration |
| 🏆 Hall of Heroes | Team leaderboard with XP, level, class, and deed badges |
| 🔗 Integrations | Webhook delivery with retry logic and delivery logs |
| 🤖 AI Center | Health Pulse, Risk Brief, Portfolio Brief, Status Reports, Meeting Brief, Plan Generator |
| 🤝 Two-Way Portal | Clients check tasks, approve deliverables, embed media, post updates |
| 🎨 White-Label Portal | Custom logo, accent color, company name, and tagline per workspace |
| 🎬 Embedded Media | Loom, YouTube, Calendly, Typeform iframes inline in portal tasks |
| ✍️ Approval Tasks | Client Approve / Request Changes workflow with Focus Mode alerts |
| 📋 Intake Forms | Form builder with conditional logic; auto-creates clients on submit |
| ⏱️ Time Tracking | Live timer, manual log, billable split, per-client report |
| 📈 Predictive Intelligence | Go-live forecast, engagement score, churn risk, NPS collection |
| 🔍 Smart Segments | Multi-condition AND/OR filter builder; save and reuse segments |
| ⚖️ Capacity Planning | Per-member workload view with recommended assignee |
| 🏆 Success Plans | 90-day and annual post-onboarding plans with KPI tracking |
| 📱 PWA | Install to desktop, works offline |
| 🌗 Dark Mode | Full dark/light theme support |
| ⌨️ Command Palette | `Ctrl+K` global search and navigation |
| 📧 Email Bulk Import | Paste emails → auto-group by domain → create clients + contacts in one action |
| 📤 Export | Excel status reports, HTML client portals, contact email CSV |
| 🔔 SLA Tracking | Warnings and breach alerts per client |
| 📝 Notes & Comms | Rich notes with templates + full communication history with AI Draft |
| 🪄 Milestones | Key events tracked separately from tasks |

---

## 🚂 Deploying to Railway

The project is fully pre-configured for one-click Railway deployment:

1. Push to GitHub
2. Connect your repo at [railway.app](https://railway.app)
3. Optionally add `VITE_SENTRY_DSN` for error monitoring
4. Railway auto-detects `railway.toml` → builds via `Dockerfile` → deploys 🎉

See `.env.example` for all environment variables.

---

## 🗺️ Roadmap

- [ ] 🗄️ PostgreSQL backend (Railway) for real multi-user persistence
- [ ] 🔒 RBAC — role-based permissions per team
- [ ] 📧 Real email delivery (SMTP / SendGrid) — sequences fire for real
- [ ] 📱 Native mobile app
- [ ] 🔄 CRM bi-directional sync (Salesforce, HubSpot)
- [ ] 💬 Real-time multi-user collaboration (WebSocket)

---

<div align="center">

Built with ❤️ using React + TypeScript + Vite

*Designed for ops teams who onboard clients at scale and want to actually enjoy doing it.*

</div>
