/**
 * EPFO adapter — mock shape + sandbox tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/epfo.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-epfo-001",
  pan: "DEFGH4567I",
  gstin: "33DEFGH4567I1Z1",
};

const BASE = "https://sandbox.idbi.example";

function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_EPFO_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_EPFO_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_EPFO_API_KEY;
    else process.env.IDBI_EPFO_API_KEY = origKey;
  });
}

describe("epfo.fetchMock — shape", () => {
  it("returns EpfoMetadata with employees and on_time_pf_pct", () => {
    const r = fetchMock(CTX);
    assert.ok(r.employees >= 8 && r.employees < 48);
    assert.ok(r.on_time_pf_pct >= 88 && r.on_time_pf_pct <= 97);
  });

  it("is deterministic", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });
});

describe("epfo.fetchSandbox", () => {
  it("falls back to mock when env vars absent", async () => {
    assert.deepEqual(await fetchSandbox(CTX, { baseUrlOverride: null }), fetchMock(CTX));
  });

  it("GETs /employer/:pan/contributions and returns parsed body", async () => {
    const expected = { employees: 25, on_time_pf_pct: 94 };
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/employer/"), "URL must include /employer/");
      assert.ok(calledUrl.includes(CTX.pan), "URL must include PAN");
      assert.deepEqual(result, expected);
    });
  });

  it("throws on non-ok response", async () => {
    const fakeFetch = (async () => ({
      ok: false, status: 404, text: async () => "Not Found",
    }) as unknown as Response) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      await assert.rejects(
        () => fetchSandbox(CTX, { baseUrlOverride: BASE }),
        /EPFO sandbox error \[404\]/,
      );
    });
  });
});

describe("epfo.healthCheck", () => {
  it("mock mode — ok:true when no base URL", async () => {
    const r = await healthCheck({ baseUrlOverride: null });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "mock");
  });
});
