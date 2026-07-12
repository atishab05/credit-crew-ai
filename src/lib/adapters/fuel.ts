import type { AdapterContext, FuelMetadata, HealthCheckResult, AdapterSandboxConfig } from "./types";
import { seededRand } from "./util";

// Fuel / operational cost adapter.
// Relevant for trading, logistics, and manufacturing MSMEs where fuel costs
// are a reliable proxy for operational activity and business volume.
export function fetchMock(ctx: AdapterContext): FuelMetadata {
  const rand = seededRand(ctx.applicantId + "fuel");
  const monthly_fuel_spend = Array.from({ length: 12 }, (_, i) => {
    const base = 30000 + Math.floor(rand() * 120000);
    return { month: i + 1, value: Math.round(base * (0.8 + rand() * 0.4)) };
  });
  const avg_monthly_fuel_spend = Math.round(
    monthly_fuel_spend.reduce((s, m) => s + m.value, 0) / 12,
  );
  // Fuel cost as % of turnover — typically 3-12% for trading/logistics
  const fuel_cost_to_turnover_pct = +(3 + rand() * 9).toFixed(1);
  return { avg_monthly_fuel_spend, monthly_fuel_spend, fuel_cost_to_turnover_pct };
}

export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<FuelMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_FUEL_BASE_URL;
  const key = process.env.IDBI_FUEL_API_KEY;
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/entity/${encodeURIComponent(ctx.pan)}/fuel-costs`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Fuel sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as FuelMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_FUEL_BASE_URL;
  const key = process.env.IDBI_FUEL_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
