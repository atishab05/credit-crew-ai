# CreditCrew AI — Architecture

## Purpose
Multi-agent MSME credit underwriting workspace. Agents pull alternative data (GST, UPI, Account Aggregator, EPFO, electricity), produce a health score, risk rating, borrowing capacity and product recommendation. A loan officer retains the final decision (human-in-the-loop).

## Runtime topology

```
                       ┌────────────┐
Internet ─▶ CloudFront ▶│ AWS WAFv2 │──▶ ALB (HTTPS) ──▶ ECS Fargate service
                       └────────────┘                       │  (TanStack Start SSR + agents)
                                                            ├──▶ RDS Postgres (Multi-AZ, KMS)
                                                            ├──▶ S3 (docs + audit) SSE-KMS + Object Lock
                                                            ├──▶ Secrets Manager (adapter keys, mTLS)
                                                            ├──▶ CloudWatch Logs + Alarms
                                                            └──▶ VPC endpoint / PrivateLink
                                                                       │
                                                                       ▼
                                                          IDBI Sandbox APIs
                                                          (GST / UPI / AA / EPFO / Electricity)
```

- Region: **ap-south-1** (Mumbai) — RBI data-localisation.
- Availability: 3 AZs, Multi-AZ RDS, Fargate autoscaling (target CPU 60 %, min = env baseline, max 10).
- Public edge: CloudFront + WAFv2 (AWS managed OWASP + KnownBadInputs + 2000 req / 5 min rate-limit), geo-restricted to India.
- Private egress: NAT gateway per AZ; egress IPs shared with IDBI for allowlisting. mTLS certs from Secrets Manager when required.

## Application

- **TanStack Start v1** (React 19 + Vite 7) with Nitro `node-server` build (`.output/server/index.mjs`).
- SSR runs inside the container. Server functions (`createServerFn`) do all privileged work; agent orchestration runs in-process against the data-source adapter layer.
- Auth: Supabase-managed today (see `SANDBOX_INTEGRATION.md` for optional Amazon Cognito swap).
- Database: Postgres. Existing migrations under `supabase/migrations/`; runs unmodified against RDS Postgres 16.
- Object storage: S3 bucket per environment, versioned, KMS-encrypted, `BucketOwnerEnforced`, Object Lock in GOVERNANCE mode for 7 years (RBI record retention).

## Data flow — assessment run

1. Officer creates application → DPDP consent captured, retention set, audit event written.
2. Officer connects each source → adapter's `healthCheck()` pings sandbox → `fetchMetadata()` writes canonical DTO to `data_connections`.
3. Officer clicks **Run assessment** → 6 specialist agents + recommendation + explainability agent run sequentially, each writing its output + status to `agent_results` and an audit event.
4. Health card renders from `agent_results`. Officer approves / rejects / requests documents.

## SLOs (targets)

| Metric | Target |
| --- | --- |
| App availability | 99.9 % monthly |
| P95 page TTFB | < 400 ms (Mumbai) |
| P95 assessment run | < 8 s (sandbox mode) |
| RPO | 15 min (RDS PITR) |
| RTO | 60 min (Multi-AZ failover + ECS redeploy) |
