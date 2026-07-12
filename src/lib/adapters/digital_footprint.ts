import type { AdapterContext, DigitalFootprintMetadata, HealthCheckResult, AdapterSandboxConfig } from "./types";
import { seededRand } from "./util";

// Digital footprint adapter.
// Tracks activity across e-commerce platforms (Amazon, Flipkart), government
// portals (GeM, ONDC), and project/tender listings to gauge ongoing business
// discipline and operational health.
export function fetchMock(ctx: AdapterContext): DigitalFootprintMetadata {
  const rand = seededRand(ctx.applicantId + "digital_footprint");
  const active_platform_count = 1 + Math.floor(rand() * 5);      // 1–5 platforms
  const active_months_last_12 = 4 + Math.floor(rand() * 9);      // 4–12 months active
  const last_activity_days_ago = Math.floor(rand() * 45);         // 0–45 days ago
  // Higher platform count, more active months, and recent activity → higher score
  const raw =
    (active_platform_count / 5) * 30 +
    (active_months_last_12 / 12) * 40 +
    Math.max(0, 30 - last_activity_days_ago) * (30 / 30);
  const digital_discipline_score = Math.min(100, Math.round(raw));
  return { active_platform_count, active_months_last_12, last_activity_days_ago, digital_discipline_score };
}

export async function fetchSandbox(ctx: AdapterContext, config?: AdapterSandboxConfig): Promise<DigitalFootprintMetadata> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_DIGITAL_BASE_URL;
  const key = process.env.IDBI_DIGITAL_API_KEY;
  if (!base || !key) return fetchMock(ctx);
  const res = await fetch(`${base}/entity/${encodeURIComponent(ctx.pan)}/digital-footprint`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Digital footprint sandbox error [${res.status}]: ${await res.text()}`);
  return (await res.json()) as DigitalFootprintMetadata;
}

export async function healthCheck(config?: AdapterSandboxConfig): Promise<HealthCheckResult> {
  const base = config?.baseUrlOverride?.replace(/\/$/, "") ?? process.env.IDBI_DIGITAL_BASE_URL;
  const key = process.env.IDBI_DIGITAL_API_KEY;
  const t0 = Date.now();
  if (!base || !key) return { ok: true, latency_ms: 0, mode: "mock" };
  try {
    const res = await fetch(`${base}/health`, { headers: { Authorization: `Bearer ${key}` } });
    return { ok: res.ok, latency_ms: Date.now() - t0, mode: "sandbox", error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, latency_ms: Date.now() - t0, mode: "sandbox", error: e?.message ?? "unreachable" };
  }
}
