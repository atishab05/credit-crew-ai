import type { AdapterContext, AdapterSource, AdapterSandboxConfig, ConnectionMetadata, HealthCheckResult } from "./types";
import * as gst from "./gst";
import * as upi from "./upi";
import * as aa from "./aa";
import * as epfo from "./epfo";
import * as electricity from "./electricity";
import { getDataSourceSetting } from "@/lib/data-source-settings.server";

const REGISTRY = { gst, upi, aa, epfo, electricity } as const;

export async function fetchMetadata(source: AdapterSource, ctx: AdapterContext): Promise<ConnectionMetadata> {
  const setting = await getDataSourceSetting(source);
  const adapter = REGISTRY[source];
  if (setting.mode === "sandbox") return adapter.fetchSandbox(ctx, { baseUrlOverride: setting.base_url });
  return adapter.fetchMock(ctx);
}

export async function healthCheck(source: AdapterSource): Promise<HealthCheckResult> {
  const setting = await getDataSourceSetting(source);
  if (setting.mode === "sandbox") return REGISTRY[source].healthCheck({ baseUrlOverride: setting.base_url });
  return { ok: true, latency_ms: 0, mode: "mock" };
}

export type { AdapterContext, AdapterSource, ConnectionMetadata, HealthCheckResult };
