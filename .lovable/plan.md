
# CreditCrew AI — Hackathon MVP

Multi-agent AI underwriting workspace for MSMEs. Loan officers create applications, connect data sources (mocked), watch 8 AI agents analyze, then approve/reject with full audit trail.

## Scope (MVP)

**In:** Auth, application CRUD, mock data-source connectors, simulated 8-agent orchestration (server function, no real ML), Financial Health Card, explainability, decisions, history, audit log.
**Out:** Real GST/UPI/AA/EPFO APIs, real ML, PDF export, comparison view, admin panel, mobile layout.

## Backend (Lovable Cloud / Supabase)

**Tables** (with grants + RLS):
- `profiles` — id, full_name, role, branch (auto-created via trigger on signup)
- `applications` — id, loan_officer_id, applicant_name, pan, gstin, status, overall_health_score, risk_rating, borrowing_capacity, recommended_loan_product, confidence_level, decision, decision_notes, decided_at, timestamps
- `data_connections` — id, application_id, source ('gst'|'upi'|'aa'|'epfo'), status, connected_at, metadata jsonb
- `agent_results` — id, application_id, agent_name, status, output jsonb, started_at, completed_at
- `audit_logs` — id, application_id, action, actor_id, details jsonb, created_at

**RLS:** owners read/write their own applications and cascade-related rows via `application_id → loan_officer_id = auth.uid()`.

**Server function** `runAssessment({ applicationId })` (protected via `requireSupabaseAuth`):
- Loads app + connections, sequentially runs 8 simulated agents, writes `agent_results` rows as they progress, seeded rule-based scoring using connection metadata + deterministic pseudo-random from PAN.
- Final agent updates `applications` with score/rating/capacity/product/confidence.
- Writes `audit_logs` entries.

## Frontend Routes

- `/auth` — sign up / log in
- `/_authenticated` layout (redirect if signed out) — shell with sidebar nav
  - `/` — Dashboard: stats + list of active assessments + "New Assessment" CTA
  - `/applications/new` — Create MSME (name, PAN, GSTIN)
  - `/applications/$id` — Wizard tabs: Data Sources → Agent Run → Health Card → Decision
  - `/applications/$id/history` inline audit trail panel
  - `/history` — Filterable table of all assessments

## Key Screens

1. **Data Connection** — 4 cards (GST/UPI/AA/EPFO), "Connect" toggles status connected/failed (simulated), progress bar.
2. **Agent Collaboration Visualizer** — 8 agent cards in a flow diagram, live updates via TanStack Query polling every 800ms while status is `analysis_running`.
3. **Financial Health Card** — Big score gauge, risk badge, borrowing capacity, recommended product, expandable per-agent findings with metrics.
4. **Decision Panel** — Approve / Reject / Request Documents + notes, confirmation dialog.

## Design System

Bank-grade professional look. Deep navy primary, teal accent, subtle gray surfaces. Update `src/styles.css` tokens to:
- `--primary` deep navy (~oklch(0.28 0.12 265))
- `--accent` teal (~oklch(0.62 0.10 190))
- Neutral warm-gray background, crisp borders, monospaced numerals for figures.
- Custom Button variants for `hero` and `outline-accent`; Badge variants for risk levels (low/moderate/high).
- Recharts for a small revenue sparkline in the Health Card.

## Technical Details

- TanStack Start file routes, `_authenticated` layout gate using existing Supabase auth middleware.
- `createServerFn` for `runAssessment`, `createApplication`, `connectDataSource`, `submitDecision`, `listApplications`, `getApplication`.
- TanStack Query with `ensureQueryData` in loaders; `useQuery` with `refetchInterval` for live agent progress.
- Zod validation for PAN (`[A-Z]{5}[0-9]{4}[A-Z]`) and GSTIN.
- Single migration creating enums, tables, grants, RLS policies, and `handle_new_user` trigger for profiles.

## Deliverable order

1. Enable Lovable Cloud + migration + auth wiring.
2. Design tokens + shared layout/nav.
3. Server functions + agent simulator.
4. Screens: auth → dashboard → new application → data connections → agent visualizer → health card → decision → history.
