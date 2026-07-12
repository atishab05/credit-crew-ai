# Sandbox integration — IDBI alternative data APIs

## Adapter contract

Every external source is fronted by a module in `src/lib/adapters/`. Each module exports:

- `fetchMock(ctx)` — deterministic offline data (default).
- `fetchSandbox(ctx)` — calls the IDBI endpoint; falls back to mock if env vars are absent.
- `healthCheck()` — cheap `/health` ping used by the "Connect" button.

The dispatcher in `src/lib/adapters/index.ts` chooses mock vs sandbox based on `DATA_SOURCE_MODE`. Agents consume the returned DTO unchanged — flipping modes is env-only.

## Environment variables

| Source | Base URL | API key | Extra |
| --- | --- | --- | --- |
| GST | `IDBI_GST_BASE_URL` | `IDBI_GST_API_KEY` | — |
| UPI | `IDBI_UPI_BASE_URL` | `IDBI_UPI_API_KEY` | — |
| Account Aggregator | `IDBI_AA_BASE_URL` | `IDBI_AA_API_KEY` | `IDBI_AA_CONSENT_HANDLE` |
| EPFO | `IDBI_EPFO_BASE_URL` | `IDBI_EPFO_API_KEY` | — |
| Electricity | `IDBI_ELEC_BASE_URL` | `IDBI_ELEC_API_KEY` | — |
| Mode switch | `DATA_SOURCE_MODE` | `mock` (default) or `sandbox` | — |
| mTLS (optional) | — | `IDBI_MTLS_KEY` | `IDBI_MTLS_CERT`, `IDBI_MTLS_CA` |

All keys land in AWS Secrets Manager (`creditcrew/<env>/idbi/*`) and are injected into the ECS task at runtime — never committed.

## Expected response shapes

Contracts live in `src/lib/adapters/types.ts`. Sandbox adapters currently expect the IDBI endpoints to return JSON matching those shapes. Where the bank's real response differs, adapt in the sandbox function only — the agent layer stays untouched.

```ts
// GST
{ annual_turnover: number; months: { month: number; value: number }[]; filings_on_time_pct: number }
// UPI
{ monthly_collections: { month: number; value: number }[]; collection_velocity_days: number }
// AA
{ avg_balance: number; cash_conversion_days: number }
// EPFO
{ employees: number; on_time_pf_pct: number }
// Electricity
{ avg_monthly_kwh: number; on_time_bill_pct: number }
```

## Network path

Bank sandbox APIs are reached from the NAT egress IPs of the CreditCrew VPC (share via `terraform output nat_egress_ips`). If IDBI exposes the sandbox via PrivateLink, add a VPC interface endpoint in `modules/network` and swap `fetch` targets to the endpoint DNS.

## mTLS

When IDBI requires client certificates, adapters read `IDBI_MTLS_CERT` / `KEY` / `CA` from Secrets Manager and pass them to a shared `undici` `Agent`. Rotation is a `put-secret-value` + ECS force-deploy — no image rebuild.

## Failure behaviour

- Health check failure → source shown as "failed" in the UI, error surfaced in `data_connections.metadata.error`, audit event written.
- Assessment continues on connected sources; recommendation `confidence_level` degrades with fewer sources.
