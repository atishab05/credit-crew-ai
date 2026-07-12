/**
 * UPI adapter — mock shape + discipline classification + sandbox tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchMock, fetchSandbox, healthCheck } from "../../src/lib/adapters/upi.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-test-upi-001",
  pan: "BCDFE2345G",
  gstin: "29BCDFE2345G1Z3",
};

const BASE = "https://sandbox.idbi.example";

function withSandboxFetch(mockFn: typeof fetch, run: () => Promise<void>): Promise<void> {
  const orig = globalThis.fetch;
  const origKey = process.env.IDBI_UPI_API_KEY;
  globalThis.fetch = mockFn;
  process.env.IDBI_UPI_API_KEY = "test-key";
  return run().finally(() => {
    globalThis.fetch = orig;
    if (origKey === undefined) delete process.env.IDBI_UPI_API_KEY;
    else process.env.IDBI_UPI_API_KEY = origKey;
  });
}

// ── Mock adapter ──────────────────────────────────────────────────────────────

describe("upi.fetchMock — shape", () => {
  it("returns a UpiMetadata shaped object with all required fields", () => {
    const r = fetchMock(CTX);
    assert.ok(Array.isArray(r.monthly_collections));
    assert.equal(r.monthly_collections.length, 12);
    assert.ok(typeof r.collection_velocity_days === "number");
    assert.ok(typeof r.sale_txn_pct === "number");
    assert.ok(typeof r.purchase_txn_pct === "number");
    assert.ok(typeof r.total_transactions_12m === "number");
    assert.ok(["disciplined", "irregular", "non_disciplined"].includes(r.discipline_label));
  });

  it("monthly_collections entries are {month, value} with month 1-12 and positive values", () => {
    const { monthly_collections } = fetchMock(CTX);
    monthly_collections.forEach((m, i) => {
      assert.equal(m.month, i + 1);
      assert.ok(m.value > 0);
    });
  });

  it("collection_velocity_days is in range [6, 15]", () => {
    const { collection_velocity_days } = fetchMock(CTX);
    assert.ok(collection_velocity_days >= 6 && collection_velocity_days <= 15);
  });

  it("sale_txn_pct is in range [40, 74]", () => {
    const { sale_txn_pct } = fetchMock(CTX);
    assert.ok(sale_txn_pct >= 40 && sale_txn_pct <= 74);
  });

  it("purchase_txn_pct is in range [15, 39]", () => {
    const { purchase_txn_pct } = fetchMock(CTX);
    assert.ok(purchase_txn_pct >= 15 && purchase_txn_pct <= 39);
  });

  it("total_transactions_12m is in range [120, 599]", () => {
    const { total_transactions_12m } = fetchMock(CTX);
    assert.ok(total_transactions_12m >= 120 && total_transactions_12m <= 599);
  });

  it("is deterministic", () => {
    assert.deepEqual(fetchMock(CTX), fetchMock(CTX));
  });
});

describe("upi.fetchMock — discipline_label derivation", () => {
  it("discipline_label is consistent with velocity and sale_txn_pct", () => {
    const seeds = ["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"];
    for (const id of seeds) {
      const r = fetchMock({ ...CTX, applicantId: id });
      if (r.collection_velocity_days <= 8 && r.sale_txn_pct >= 55) {
        assert.equal(r.discipline_label, "disciplined");
      } else if (r.collection_velocity_days <= 12) {
        assert.equal(r.discipline_label, "irregular");
      } else {
        assert.equal(r.discipline_label, "non_disciplined");
      }
    }
  });
});

// ── Sandbox adapter ───────────────────────────────────────────────────────────

describe("upi.fetchSandbox", () => {
  it("falls back to mock when env vars absent", async () => {
    assert.deepEqual(await fetchSandbox(CTX, { baseUrlOverride: null }), fetchMock(CTX));
  });

  it("calls /merchant/:pan/collections and returns parsed body", async () => {
    const expected = {
      monthly_collections: [{ month: 1, value: 500000 }],
      collection_velocity_days: 7,
      sale_txn_pct: 60,
      purchase_txn_pct: 20,
      total_transactions_12m: 300,
      discipline_label: "disciplined" as const,
    };
    let calledUrl = "";
    const fakeFetch = (async (url: string) => {
      calledUrl = url;
      return { ok: true, json: async () => expected, text: async () => "" } as Response;
    }) as typeof fetch;

    await withSandboxFetch(fakeFetch, async () => {
      const result = await fetchSandbox(CTX, { baseUrlOverride: BASE });
      assert.ok(calledUrl.includes("/merchant/"), "URL must include /merchant/");
      assert.ok(calledUrl.includes(CTX.pan), "URL must include PAN");
      assert.deepEqual(result, expected);
    });
  });
});

describe("upi.healthCheck", () => {
  it("returns mock ok:true when no base URL", async () => {
    const r = await healthCheck({ baseUrlOverride: null });
    assert.equal(r.ok, true);
    assert.equal(r.mode, "mock");
  });
});
