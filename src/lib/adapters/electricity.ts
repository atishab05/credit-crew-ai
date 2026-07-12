import type { AdapterContext, ElectricityMetadata, HealthCheckResult } from "./types";
import { seededRand } from "./util";

// Electricity is a bonus alternative data source described in the PRD /
// IDBI sandbox brief but not currently wired into agents. The adapter
// exists so it can be flipped on without further refactor.
export function fetchMock(ctx: AdapterContext): ElectricityMetadata {
  const rand = seededRand(ctx.applicantId + "electricity");
  return {
    avg_monthly_kwh: 800 + Math.floor(rand() * 4200),
    on_time_bill_pct: 85 + Math.floor(rand() * 14),
  };
}

export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<ElectricityMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_ELEC_BASE_URL;
  const key = process.env.IDBI_ELEC_API_KEY;
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/consumer/${encodeURIComponent(ctx.pan)}/usage`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Electricity sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as ElectricityMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_ELEC_BASE_URL;
  const key = process.env.IDBI_ELEC_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
