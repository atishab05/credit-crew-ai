/**
 * Electricity adapter — mock shape + sandbox tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/electricity.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-elec-001",
  pan: "EFGHI5678J",
  gstin: "24EFGHI5678J1Z5",
};

const BASE = "https://sandbox.idbi.example";

function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_ELEC_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_ELEC_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_ELEC_API_KEY;
    else process.env.IDBI_ELEC_API_KEY = origKey;
  });
}

describe("electricity.fetchMock — shape", () => {
  it("returns ElectricityMetadata with avg_monthly_kwh and on_time_bill_pct", () => {
    const r = fetchMock(CTX);
    assert.ok(r.avg_monthly_kwh >= 800 && r.avg_monthly_kwh < 5000);
    assert.ok(r.on_time_bill_pct >= 85 && r.on_time_bill_pct <= 98);
  });

  it("is deterministic", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });
});

describe("electricity.fetchSandbox", () => {
  it("falls back to mock when env vars absent", async () => {
    assert.deepEqual(await fetchSandbox(CTX, { baseUrlOverride: null }), fetchMock(CTX));
  });

  it("GETs /consumer/:pan/usage and returns parsed body", async () => {
    const expected = { avg_monthly_kwh: 3200, on_time_bill_pct: 91 };
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/consumer/"), "URL must include /consumer/");
      assert.ok(calledUrl.includes(CTX.pan), "URL must include PAN");
      assert.deepEqual(result, expected);
    });
  });
});

describe("electricity.healthCheck", () => {
  it("mock mode — ok:true when no base URL", async () => {
    const r = await healthCheck({ baseUrlOverride: null });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "mock");
  });

  it("sandbox — ok:false on network failure", async () => {
    const fakeFetch = (async () => { throw new Error("connect ETIMEDOUT"); }) as unknown as typeof fetch;
    await withSandboxFetch(fakeFetch, async () => {
      const r = await healthCheck({ baseUrlOverride: BASE });
      assert.equal(r.ok, false);
      assert.ok(r.error?.includes("ETIMEDOUT"));
    });
  });
});
