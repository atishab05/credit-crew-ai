/**
 * Account Aggregator adapter — mock shape + sandbox tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/aa.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-aa-001",
  pan: "CDEFG3456H",
  gstin: "06CDEFG3456H1Z2",
};

const BASE = "https://sandbox.idbi.example";

function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_AA_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_AA_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_AA_API_KEY;
    else process.env.IDBI_AA_API_KEY = origKey;
  });
}

describe("aa.fetchMock — shape", () => {
  it("returns AaMetadata with avg_balance and cash_conversion_days", () => {
    const r = fetchMock(CTX);
    assert.ok(typeof r.avg_balance === "number");
    assert.ok(r.avg_balance > 0);
    assert.ok(typeof r.cash_conversion_days === "number");
    assert.ok(r.cash_conversion_days >= 30 && r.cash_conversion_days < 70);
  });

  it("avg_balance is in expected range [400000, 1200000)", () => {
    const { avg_balance } = fetchMock(CTX);
    assert.ok(avg_balance >= 400000 && avg_balance < 1_200_000);
  });

  it("is deterministic", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });

  it("different seeds produce different values", () => {
    const a = fetchMock(CTX);
    const b = fetchMock({ ...CTX, applicantId: "app-test-aa-002" });
    assert.ok(a.avg_balance !== b.avg_balance || a.cash_conversion_days !== b.cash_conversion_days);
  });
});

describe("aa.fetchSandbox", () => {
  it("falls back to mock when env vars absent", async () => {
    assert.deepEqual(await fetchSandbox(CTX, { baseUrlOverride: null }), fetchMock(CTX));
  });

  it("POSTs to /statements/summary with PAN and returns parsed body", async () => {
    const expected = { avg_balance: 750_000, cash_conversion_days: 38 };
    let calledUrl = "";
    let calledInit: RequestInit | undefined;
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calledUrl = url;
      calledInit = init;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/statements/summary"), "URL must include /statements/summary");
      assert.equal(calledInit?.method, "POST");
      const body = JSON.parse(calledInit?.body as string);
      assert.equal(body.pan, CTX.pan);
      assert.deepEqual(result, expected);
    });
  });
});

describe("aa.healthCheck", () => {
  it("mock mode — ok:true, latency 0", async () => {
    const r = await healthCheck({ baseUrlOverride: null });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "mock");
    assert.equal(r.latency_ms, 0);
  });
});
