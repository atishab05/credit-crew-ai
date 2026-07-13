import type { AdapterContext, AdapterSandboxConfig, HealthCheckResult, UpiMetadata } from "./types";
import { seededRand } from "./util";

export function fetchMock(ctx: AdapterContext): UpiMetadata {
  const rand = seededRand(ctx.applicantId + "upi");
  const months = Array.from({ length: 12 }, (_, i) => {
    const base = 800000 + Math.floor(rand() * 900000);
    return { month: i + 1, value: Math.round(base * (0.7 + rand() * 0.6)) };
  });
  const velocity = 6 + Math.floor(rand() * 10);
  const sale_txn_pct = 40 + Math.floor(rand() * 35);       // 40–75% sales
  const purchase_txn_pct = 15 + Math.floor(rand() * 25);   // 15–40% purchases
  const total_transactions_12m = 120 + Math.floor(rand() * 480);
  const discipline_label: UpiMetadata["discipline_label"] =
    velocity <= 8 && sale_txn_pct >= 55 ? "disciplined"
    : velocity <= 12 ? "irregular"
    : "non_disciplined";
  return {
    monthly_collections: months,
    collection_velocity_days: velocity,
    sale_txn_pct,
    purchase_txn_pct,
    total_transactions_12m,
    discipline_label,
  };
}

export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<UpiMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_UPI_BASE_URL;
  const key = process.env.IDBI_UPI_API_KEY;
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/merchant/${encodeURIComponent(ctx.pan)}/collections`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`UPI sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as UpiMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_UPI_BASE_URL;
  const key = process.env.IDBI_UPI_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
