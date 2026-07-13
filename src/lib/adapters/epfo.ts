import type { AdapterContext, AdapterSandboxConfig, EpfoMetadata, HealthCheckResult } from "./types";
import { seededRand } from "./util";

export function fetchMock(ctx: AdapterContext): EpfoMetadata {
  const rand = seededRand(ctx.applicantId + "epfo");
  Array.from({ length: 12 }, () => {
    const base = 800000 + Math.floor(rand() * 900000);
    return Math.round(base * (0.7 + rand() * 0.6));
  });
  return {
    employees: 8 + Math.floor(rand() * 40),
    on_time_pf_pct: 88 + Math.floor(rand() * 10),
  };
}

export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<EpfoMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_EPFO_BASE_URL;
  const key = process.env.IDBI_EPFO_API_KEY;
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/employer/${encodeURIComponent(ctx.pan)}/contributions`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`EPFO sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as EpfoMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_EPFO_BASE_URL;
  const key = process.env.IDBI_EPFO_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
