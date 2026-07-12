/**
 * Digital footprint adapter — mock shape + discipline score formula + sandbox tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/digital_footprint.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-digi-001",
  pan: "GHIJK7890L",
  gstin: "09GHIJK7890L1Z6",
};

const BASE = "https://sandbox.idbi.example";

function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_DIGITAL_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_DIGITAL_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_DIGITAL_API_KEY;
    else process.env.IDBI_DIGITAL_API_KEY = origKey;
  });
}

describe("digital_footprint.fetchMock — shape", () => {
  it("returns DigitalFootprintMetadata with all required fields in range", () => {
    const r = fetchMock(CTX);
    assert.ok(r.active_platform_count >= 1 && r.active_platform_count <= 5);
    assert.ok(r.active_months_last_12 >= 4 && r.active_months_last_12 <= 12);
    assert.ok(r.last_activity_days_ago >= 0 && r.last_activity_days_ago < 45);
    assert.ok(r.digital_discipline_score >= 0 && r.digital_discipline_score <= 100);
  });

  it("digital_discipline_score is consistent with the scoring formula", () => {
    const seeds = ["a1", "b2", "c3", "d4", "e5", "f6"];
    for (const id of seeds) {
      const r = fetchMock({ ...CTX, applicantId: id });
      const raw =
        (r.active_platform_count / 5) * 30 +
        (r.active_months_last_12 / 12) * 40 +
        Math.max(0, 30 - r.last_activity_days_ago) * (30 / 30);
      const expected = Math.min(100, Math.round(raw));
      assert.equal(r.digital_discipline_score, expected,
        `seed ${id}: score mismatch — expected ${expected}, got ${r.digital_discipline_score}`);
    }
  });

  it("is deterministic", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });
});

describe("digital_footprint.fetchSandbox", () => {
  it("falls back to mock when env vars absent", async () => {
    assert.deepEqual(await fetchSandbox(CTX, { baseUrlOverride: null }), fetchMock(CTX));
  });

  it("GETs /entity/:pan/digital-footprint and returns parsed body", async () => {
    const expected = {
      active_platform_count: 3,
      active_months_last_12: 10,
      last_activity_days_ago: 5,
      digital_discipline_score: 72,
    };
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/digital-footprint"), "URL must include /digital-footprint");
      assert.ok(calledUrl.includes(CTX.pan), "URL must include PAN");
      assert.deepEqual(result, expected);
    });
  });

  it("throws on non-ok response", async () => {
    const fakeFetch = (async () => ({
      ok: false, status: 500, text: async () => "Internal Server Error",
    }) as unknown as Response) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      await assert.rejects(
        () => fetchSandbox(CTX, { baseUrlOverride: BASE }),
        /Digital footprint sandbox error \[500\]/,
      );
    });
  });
});

describe("digital_footprint.healthCheck", () => {
  it("mock mode — ok:true when no base URL", async () => {
    const r = await healthCheck({ baseUrlOverride: null });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "mock");
  });
});
