# CreditCrew AI

Multi-agent AI underwriting workspace for credit-invisible MSMEs.
Built for the IDBI Innovate 2026 hackathon.

---

## What it does

CreditCrew AI gives a bank loan officer a single workspace to:

1. **Create an MSME application** — capture GSTIN, PAN and a DPDP-compliant borrower consent artefact.
2. **Connect seven alternative data sources** — GST, UPI, Account Aggregator, EPFO, Electricity, Fuel Costs and Digital Footprint — via typed sandbox adapters.
3. **Run an eight-agent assessment** — specialist agents fire in sequence, each writing live progress to the UI.
4. **Review a Financial Health Card** — composite health score (20–96), risk rating, borrowing capacity, recommended loan product and plain-language explanations.
5. **Record a decision** — Approve / Reject / Request Documents, all timestamped in an append-only audit log.
6. **Manage supporting documents** — upload to S3 via short-lived pre-signed URLs; application servers never see file bytes.

---

## Eight-agent pipeline

| # | Agent | Role |
|---|-------|------|
| 1 | **Financial Data** | Unifies raw inputs from all connected sources into a canonical MSME profile |
| 2 | **Revenue Intelligence** | Analyses growth, seasonality and revenue stability; corroborates with Electricity trends |
| 3 | **Cash Flow** | Computes liquidity ratio, cash-conversion days and working-capital gap; adjusts for fuel cost intensity |
| 4 | **Compliance** | Scores GST filing punctuality, EPFO contributions and electricity bill on-time rates |
| 5 | **Payment Behaviour** | Evaluates UPI collection velocity, supplier payment discipline and transaction pattern classification |
| 6 | **Risk Signals** | Flags concentration risk, revenue anomalies, digital inactivity and non-disciplined UPI patterns |
| 7 | **Recommendation** | Produces the weighted health score, borrowing capacity and recommended loan product |
| 8 | **Explainability** | Writes a plain-language summary of every factor that drove the recommendation |

---

## Seven alternative data sources

| Source | Adapter module | Sandbox env vars |
|--------|---------------|-----------------|
| GST | `src/lib/adapters/gst.ts` | `IDBI_GST_BASE_URL`, `IDBI_GST_API_KEY` |
| UPI | `src/lib/adapters/upi.ts` | `IDBI_UPI_BASE_URL`, `IDBI_UPI_API_KEY` |
| Account Aggregator | `src/lib/adapters/aa.ts` | `IDBI_AA_BASE_URL`, `IDBI_AA_API_KEY`, `IDBI_AA_CONSENT_HANDLE` |
| EPFO | `src/lib/adapters/epfo.ts` | `IDBI_EPFO_BASE_URL`, `IDBI_EPFO_API_KEY` |
| Electricity | `src/lib/adapters/electricity.ts` | `IDBI_ELEC_BASE_URL`, `IDBI_ELEC_API_KEY` |
| Fuel Costs | `src/lib/adapters/fuel.ts` | `IDBI_FUEL_BASE_URL`, `IDBI_FUEL_API_KEY` |
| Digital Footprint | `src/lib/adapters/digital_footprint.ts` | `IDBI_DFP_BASE_URL`, `IDBI_DFP_API_KEY` |

The app runs in **mock** mode out of the box. Set a source's mode to **sandbox** in Settings and supply the env vars above — no code change required. mTLS is supported via `IDBI_MTLS_CERT`, `IDBI_MTLS_KEY` and `IDBI_MTLS_CA`.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Routing & data fetching | TanStack Router, TanStack Start, React Query |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Backend / auth | Supabase (Postgres, Row-Level Security, Auth) |
| Infrastructure | AWS ECS Fargate, RDS Postgres, S3+KMS, CloudFront, WAFv2, Secrets Manager |
| IaC | Terraform (modules: network, data, compute, edge, observability, IAM) |
| CI/CD | GitHub Actions with OIDC (no long-lived AWS keys) |

---

## Project structure

```
src/
  routes/                    # Page components (TanStack file-based routing)
    index.tsx                # Landing page
    auth.tsx                 # Sign-in / sign-up
    compliance.tsx           # Trust & Compliance page
    _authenticated.dashboard.tsx
    _authenticated.history.tsx
    _authenticated.applications.new.tsx
    _authenticated.applications.$id.tsx
    _authenticated.settings.tsx
  components/
    creditcrew/              # Domain-specific components (HealthCard, AgentProgress, etc.)
    ui/                      # shadcn/ui primitives
  lib/
    creditcrew.ts            # Shared types: AgentName, DATA_SOURCES, ApplicationStatus
    creditcrew.functions.ts  # Server functions: createApplication, runAssessment, connectSource, …
    adapters/                # One typed adapter per data source + shared health-check interface
    assessment-scoring.ts    # Scoring utilities
    documents.functions.ts   # S3 pre-signed URL helpers
  integrations/
    supabase/                # Supabase client, auth middleware, generated types
    lovable/                 # Lovable platform integration
supabase/
  migrations/                # Postgres schema (applications, data_connections, agent_results, audit_logs, documents)
terraform/
  modules/                   # network, data, compute, edge, observability, IAM
  envs/                      # dev / uat / prod tfvars
docs/
  ARCHITECTURE.md
  RUNBOOK.md
  SECURITY_CONTROLS.md
  SANDBOX_INTEGRATION.md
  HANDOVER.md
```

---

## Getting started

```bash
npm install
npm run dev
```

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Compliance & security highlights

- **DPDP Act 2023** — borrower consent captured at application intake with a configurable retention window; PAN and GSTIN masked in list views.
- **RBI Digital Lending Guidelines** — every data pull is tied to a consent artefact; all AI recommendations require a human-in-the-loop decision.
- **Row-level security** — every Supabase table is scoped to the owning loan officer; server functions re-verify ownership on every privileged action.
- **Secrets** — AWS keys and adapter credentials live in Secrets Manager; never in application code or browser responses.
- **Audit log** — append-only `audit_logs` table records every application event with actor, timestamp and structured details.
- **Document storage** — files go browser → S3 pre-signed URL; the app server never handles file bytes. Objects are encrypted at rest with KMS and protected by Object Lock.
- **AWS deployment** — ECS Fargate inside the bank's VPC in `ap-south-1` (data localisation), fronted by CloudFront + WAFv2; sandbox API egress over VPC Endpoint / PrivateLink.

See [`docs/SECURITY_CONTROLS.md`](docs/SECURITY_CONTROLS.md) and the Trust & Compliance page (`/compliance`) for the full security posture.

---

## Infrastructure

Terraform modules cover the complete AWS reference architecture:

```
Internet → CloudFront → AWS WAF → ALB
                                   ↓
                          ECS Fargate (app tasks)
                          ├── RDS Postgres (Multi-AZ, KMS, PITR)
                          ├── S3 + KMS  (documents, audit logs / Object Lock)
                          ├── Secrets Manager (adapter API keys, mTLS)
                          ├── CloudWatch Logs + Alarms
                          └── VPC Endpoint / PrivateLink → IDBI sandbox APIs
```

See [`terraform/README.md`](terraform/README.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Notes

- This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history (no force-push, rebase or squash of already-pushed commits).
- Sandbox data is entirely synthetic — no real borrower data is used in the hackathon prototype.
- For the full handover bundle (IaC, Dockerfile, CI/CD pipeline, markdown docs), see [`docs/HANDOVER.md`](docs/HANDOVER.md).
