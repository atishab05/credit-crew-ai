import type { AaMetadata, AdapterContext, AdapterSandboxConfig, HealthCheckResult } from "./types";
import { seededRand } from "./util";

export function fetchMock(ctx: AdapterContext): AaMetadata {
  const rand = seededRand(ctx.applicantId + "aa");
  // Consume the same 12 months of rand() calls as the original generator
  // to keep the seed stream in lockstep with the legacy metadata.
  Array.from({ length: 12 }, () => {
    const base = 800000 + Math.floor(rand() * 900000);
    return Math.round(base * (0.7 + rand() * 0.6));
  });
  return {
    avg_balance: 400000 + Math.floor(rand() * 800000),
    cash_conversion_days: 30 + Math.floor(rand() * 40),
  };
}

export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<AaMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_AA_BASE_URL;
  const key = process.env.IDBI_AA_API_KEY;
  const consent = process.env.IDBI_AA_CONSENT_HANDLE; // AA per-consent handle, per RBI/ReBIT spec
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/statements/summary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ pan: ctx.pan, consentHandle: consent ?? null }),
  });
  if (!res.ok) throw new Error(`AA sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as AaMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_AA_BASE_URL;
  const key = process.env.IDBI_AA_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
