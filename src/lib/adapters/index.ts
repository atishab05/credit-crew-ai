import type { AdapterContext, AdapterSource, ConnectionMetadata, HealthCheckResult } from "./types";
import { currentMode } from "./util";
import * as gst from "./gst";
import * as upi from "./upi";
import * as aa from "./aa";
import * as epfo from "./epfo";
import * as electricity from "./electricity";

const REGISTRY = { gst, upi, aa, epfo, electricity } as const;

export async function fetchMetadata(source: AdapterSource, ctx: AdapterContext): Promise<ConnectionMetadata> {
  const adapter = REGISTRY[source];
  if (currentMode() === "sandbox") return adapter.fetchSandbox(ctx);
  return adapter.fetchMock(ctx);
}

export async function healthCheck(source: AdapterSource): Promise<HealthCheckResult> {
  return REGISTRY[source].healthCheck();
}

export { currentMode };
export type { AdapterContext, AdapterSource, ConnectionMetadata, HealthCheckResult };
