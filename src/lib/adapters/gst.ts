import type { AdapterContext, GstMetadata, HealthCheckResult } from "./types";
import { seededRand } from "./util";

// MOCK: identical output shape and values to the original inline generator.
export function fetchMock(ctx: AdapterContext): GstMetadata {
  const rand = seededRand(ctx.applicantId + "gst");
  const months = Array.from({ length: 12 }, (_, i) => {
    const base = 800000 + Math.floor(rand() * 900000);
    return { month: i + 1, value: Math.round(base * (0.7 + rand() * 0.6)) };
  });
  return {
    annual_turnover: months.reduce((s, m) => s + m.value, 0),
    months,
    filings_on_time_pct: 82 + Math.floor(rand() * 15),
  };
}

// SANDBOX: calls IDBI-provided GST endpoint. Env vars documented in
// docs/SANDBOX_INTEGRATION.md. Falls back to mock if not configured.
export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<GstMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_GST_BASE_URL;
  const key = process.env.IDBI_GST_API_KEY;
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/gstin/${encodeURIComponent(ctx.gstin)}/summary`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GST sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as GstMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_GST_BASE_URL;
  const key = process.env.IDBI_GST_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
