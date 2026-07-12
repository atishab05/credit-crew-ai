/**
 * GST adapter — mock shape + sandbox HTTP delegation tests.
 *
 * Mock tests: purely synchronous, no network, no env vars required.
 * Sandbox tests: set a dummy API key env var + override globalThis.fetch so
 * the adapter takes the real HTTP path, then restore both after each test.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/gst.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-001",
  pan: "ABCDE1234F",
  gstin: "27ABCDE1234F1Z5",
};

const BASE = "https://sandbox.idbi.example";

/** Replace globalThis.fetch and set the API key env var for one test. */
function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_GST_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_GST_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_GST_API_KEY;
    else process.env.IDBI_GST_API_KEY = origKey;
  });
}

// ── Mock adapter ──────────────────────────────────────────────────────────────

describe("gst.fetchMock", () => {
  it("returns a GstMetadata shaped object", () => {
    const result = fetchMock(CTX);
    assert.ok(typeof result.annual_turnover === "number", "annual_turnover must be a number");
    assert.ok(result.annual_turnover > 0, "annual_turnover must be positive");
    assert.ok(Array.isArray(result.months), "months must be an array");
    assert.equal(result.months.length, 12, "must contain 12 months");
    assert.ok(typeof result.filings_on_time_pct === "number", "filings_on_time_pct must be a number");
    assert.ok(result.filings_on_time_pct >= 0 && result.filings_on_time_pct <= 100);
  });

  it("months entries have correct shape (month 1-12, positive value)", () => {
    const { months } = fetchMock(CTX);
    months.forEach((m, i) => {
      assert.equal(m.month, i + 1);
      assert.ok(m.value > 0);
    });
  });

  it("annual_turnover equals sum of monthly values", () => {
    const result = fetchMock(CTX);
    const sum = result.months.reduce((s, m) => s + m.value, 0);
    assert.equal(result.annual_turnover, sum);
  });

  it("is deterministic — same context always returns same values", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });

  it("different applicantIds produce different outputs", () => {
    const a = fetchMock(CTX);
    const b = fetchMock({ ...CTX, applicantId: "app-test-002" });
    assert.notEqual(a.annual_turnover, b.annual_turnover);
  });
});

// ── Sandbox adapter (mocked HTTP) ────────────────────────────────────────────

describe("gst.fetchSandbox", () => {
  it("falls back to mock when env vars are absent", async () => {
    // No env var set → must return identical result to fetchMock
    const result = await fetchSandbox(CTX, { baseUrlOverride: null });
    assert.deepEqual(result, fetchMock(CTX));
  });

  it("calls the correct endpoint and returns parsed JSON", async () => {
    const expected = { annual_turnover: 9_999_999, months: [], filings_on_time_pct: 95 };
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/gstin/"), "URL must include /gstin/ segment");
      assert.ok(calledUrl.includes(CTX.gstin), "URL must include the GSTIN");
      assert.deepEqual(result, expected);
    });
  });

  it("throws on non-ok HTTP response", async () => {
    const fakeFetch = (async () => ({
      ok: false, status: 503, text: async () => "Service Unavailable",
    }) as unknown as Response) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      await assert.rejects(
        () => fetchSandbox(CTX, { baseUrlOverride: BASE }),
        /GST sandbox error \[503\]/,
      );
    });
  });
});

// ── Health check ─────────────────────────────────────────────────────────────

describe("gst.healthCheck", () => {
  it("returns mock-mode ok:true when env vars are absent", async () => {
    const result = await healthCheck({ baseUrlOverride: null });
    assert.equal(result.ok, true);
    assert.equal(result.mode, "mock");
    assert.equal(result.latency_ms, 0);
  });

  it("returns sandbox ok:true on 200 response", async () => {
    const fakeFetch = (async () => ({ ok: true } as Response)) as typeof fetch;
    await withSandboxFetch(fakeFetch, async () => {
      const result = await healthCheck({ baseUrlOverride: BASE });
      assert.equal(result.ok, true);
      assert.equal(result.mode, "sandbox");
    });
  });

  it("returns sandbox ok:false on non-200 response", async () => {
    const fakeFetch = (async () => ({ ok: false, status: 502 } as Response)) as typeof fetch;
    await withSandboxFetch(fakeFetch, async () => {
      const result = await healthCheck({ baseUrlOverride: BASE });
      assert.equal(result.ok, false);
      assert.equal(result.mode, "sandbox");
      assert.ok(result.error?.includes("502"));
    });
  });

  it("returns ok:false with error message on network failure", async () => {
    const fakeFetch = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    await withSandboxFetch(fakeFetch, async () => {
      const result = await healthCheck({ baseUrlOverride: BASE });
      assert.equal(result.ok, false);
      assert.equal(result.mode, "sandbox");
      assert.ok(result.error?.includes("ECONNREFUSED"));
    });
  });
});
