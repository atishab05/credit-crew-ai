/**
 * Fuel adapter — mock shape + sandbox tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/fuel.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-fuel-001",
  pan: "FGHIJ6789K",
  gstin: "07FGHIJ6789K1Z8",
};

const BASE = "https://sandbox.idbi.example";

function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_FUEL_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_FUEL_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_FUEL_API_KEY;
    else process.env.IDBI_FUEL_API_KEY = origKey;
  });
}

describe("fuel.fetchMock — shape", () => {
  it("returns FuelMetadata with all required fields", () => {
    const r = fetchMock(CTX);
    assert.ok(r.avg_monthly_fuel_spend > 0);
    assert.equal(r.monthly_fuel_spend.length, 12);
    assert.ok(r.fuel_cost_to_turnover_pct >= 3 && r.fuel_cost_to_turnover_pct <= 12);
  });

  it("monthly_fuel_spend entries have month 1-12 with positive values", () => {
    fetchMock(CTX).monthly_fuel_spend.forEach((m, i) => {
      assert.equal(m.month, i + 1);
      assert.ok(m.value > 0);
    });
  });

  it("avg_monthly_fuel_spend equals mean of monthly series", () => {
    const r = fetchMock(CTX);
    const mean = Math.round(r.monthly_fuel_spend.reduce((s, m) => s + m.value, 0) / 12);
    assert.equal(r.avg_monthly_fuel_spend, mean);
  });

  it("is deterministic", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });
});

describe("fuel.fetchSandbox", () => {
  it("falls back to mock when env vars absent", async () => {
    assert.deepEqual(await fetchSandbox(CTX, { baseUrlOverride: null }), fetchMock(CTX));
  });

  it("GETs /entity/:pan/fuel-costs and returns parsed body", async () => {
    const expected = {
      avg_monthly_fuel_spend: 75_000,
      monthly_fuel_spend: [{ month: 1, value: 75_000 }],
      fuel_cost_to_turnover_pct: 7.2,
    };
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/fuel-costs"), "URL must include /fuel-costs");
      assert.ok(calledUrl.includes(CTX.pan), "URL must include PAN");
      assert.deepEqual(result, expected);
    });
  });

  it("throws on non-ok response", async () => {
    const fakeFetch = (async () => ({
      ok: false, status: 401, text: async () => "Unauthorized",
    }) as unknown as Response) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      await assert.rejects(
        () => fetchSandbox(CTX, { baseUrlOverride: BASE }),
        /Fuel sandbox error \[401\]/,
      );
    });
  });
});

describe("fuel.healthCheck", () => {
  it("mock mode — ok:true when no base URL", async () => {
    const r = await healthCheck({ baseUrlOverride: null });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "mock");
  });
});
