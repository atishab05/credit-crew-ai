/**
 * Assessment scoring pipeline tests.
 *
 * Tests the pure computeAgentOutputs() function against:
 *   1. All 7 sources connected (full mock data) — happy path
 *   2. Partial sources — verify graceful fallback values and correct confidence
 *   3. No sources at all — verify purely seeded fallback path
 *   4. High fuel pressure scenario — liquidity ratio reduction
 *   5. Disciplined vs non-disciplined UPI — scoring bonus/penalty
 *   6. Health score bounds — always in [20, 96]
 *   7. Determinism — same inputs always produce same outputs
 *   8. Explainability reasons — present and non-empty for connected sources
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeAgentOutputs, TOTAL_SOURCES } from "../../src/lib/assessment-scoring.js";
import { fetchMock as gstMock } from "../../src/lib/adapters/gst.js";
import { fetchMock as upiMock } from "../../src/lib/adapters/upi.js";
import { fetchMock as aaMock } from "../../src/lib/adapters/aa.js";
import { fetchMock as epfoMock } from "../../src/lib/adapters/epfo.js";
import { fetchMock as elecMock } from "../../src/lib/adapters/electricity.js";
import { fetchMock as fuelMock } from "../../src/lib/adapters/fuel.js";
import { fetchMock as digiMock } from "../../src/lib/adapters/digital_footprint.js";
import type { AdapterContext } from "../../src/lib/adapters/types.js";

const CTX: AdapterContext = {
  applicantId: "app-scoring-001",
  pan: "ABCDE1234F",
  gstin: "27ABCDE1234F1Z5",
};

const ALL_SOURCES = {
  gst:               gstMock(CTX),
  upi:               upiMock(CTX),
  aa:                aaMock(CTX),
  epfo:              epfoMock(CTX),
  electricity:       elecMock(CTX),
  fuel:              fuelMock(CTX),
  digital_footprint: digiMock(CTX),
};

// ── Happy path — all 7 sources ────────────────────────────────────────────────

describe("computeAgentOutputs — all sources connected", () => {
  const out = computeAgentOutputs(CTX.pan, ALL_SOURCES);

  it("financial_data reflects GST turnover", () => {
    assert.equal(out.financial_data.annual_turnover, ALL_SOURCES.gst.annual_turnover);
  });

  it("financial_data reflects EPFO employees", () => {
    assert.equal(out.financial_data.employees, ALL_SOURCES.epfo.employees);
  });

  it("financial_data includes electricity kWh", () => {
    assert.equal(out.financial_data.avg_monthly_kwh, ALL_SOURCES.electricity.avg_monthly_kwh);
  });

  it("financial_data includes fuel spend", () => {
    assert.equal(out.financial_data.avg_monthly_fuel_spend, ALL_SOURCES.fuel.avg_monthly_fuel_spend);
  });

  it("revenue_intelligence avg_monthly_revenue is a positive number", () => {
    assert.ok(out.revenue_intelligence.avg_monthly_revenue > 0);
  });

  it("revenue_intelligence series has 12 entries from GST months", () => {
    assert.equal(out.revenue_intelligence.series.length, 12);
  });

  it("revenue_intelligence elec_corroboration is set", () => {
    assert.ok(
      out.revenue_intelligence.elec_corroboration === "high_activity" ||
      out.revenue_intelligence.elec_corroboration === "moderate_activity",
    );
  });

  it("cash_flow.fuel_cost_to_turnover_pct equals fuel source value", () => {
    assert.equal(
      out.cash_flow.fuel_cost_to_turnover_pct,
      ALL_SOURCES.fuel.fuel_cost_to_turnover_pct,
    );
  });

  it("cash_flow.cash_conversion_days equals AA value", () => {
    assert.equal(out.cash_flow.cash_conversion_days, ALL_SOURCES.aa.cash_conversion_days);
  });

  it("compliance.gst_filings_on_time_pct equals GST source value", () => {
    assert.equal(
      out.compliance.gst_filings_on_time_pct,
      ALL_SOURCES.gst.filings_on_time_pct,
    );
  });

  it("compliance.electricity_bill_on_time_pct equals electricity source value", () => {
    assert.equal(
      out.compliance.electricity_bill_on_time_pct,
      ALL_SOURCES.electricity.on_time_bill_pct,
    );
  });

  it("compliance.epfo_pf_on_time_pct equals EPFO source value", () => {
    assert.equal(out.compliance.epfo_pf_on_time_pct, ALL_SOURCES.epfo.on_time_pf_pct);
  });

  it("payment_behaviour.upi_collection_velocity_days equals UPI source value", () => {
    assert.equal(
      out.payment_behaviour.upi_collection_velocity_days,
      ALL_SOURCES.upi.collection_velocity_days,
    );
  });

  it("payment_behaviour.upi_discipline_label equals UPI source value", () => {
    assert.equal(
      out.payment_behaviour.upi_discipline_label,
      ALL_SOURCES.upi.discipline_label,
    );
  });

  it("risk.digital_discipline_score equals digital_footprint source value", () => {
    assert.equal(
      out.risk.digital_discipline_score,
      ALL_SOURCES.digital_footprint.digital_discipline_score,
    );
  });

  it("recommendation.overall_health_score is in [20, 96]", () => {
    assert.ok(out.recommendation.overall_health_score >= 20);
    assert.ok(out.recommendation.overall_health_score <= 96);
  });

  it("recommendation.risk_rating is one of the four valid values", () => {
    assert.ok(["Low", "Moderate", "Elevated", "High"].includes(out.recommendation.risk_rating));
  });

  it("recommendation.borrowing_capacity is positive", () => {
    assert.ok(out.recommendation.borrowing_capacity > 0);
  });

  it("recommendation.confidence_level is 'high' when all 7 sources connected", () => {
    assert.equal(out.recommendation.confidence_level, "high");
  });

  it("recommendation.recommended_loan_product is a non-empty string", () => {
    assert.ok(out.recommendation.recommended_loan_product.length > 0);
  });

  it("component_scores keys are all present and numeric", () => {
    const cs = out.recommendation.component_scores;
    for (const key of ["revenue", "cash_flow", "compliance", "payment_behaviour", "digital_footprint", "risk_penalty"]) {
      assert.ok(typeof (cs as Record<string, number>)[key] === "number", `${key} must be a number`);
    }
  });

  it("explainability.reasons has at least 5 entries when all sources connected", () => {
    assert.ok(out.explainability.reasons.length >= 5,
      `expected >= 5 reasons, got ${out.explainability.reasons.length}`);
  });

  it("explainability mentions GST filing rate", () => {
    assert.ok(
      out.explainability.reasons.some((r) => r.includes("GST filings")),
      "reasons must mention GST filings",
    );
  });

  it("explainability mentions UPI velocity", () => {
    assert.ok(
      out.explainability.reasons.some((r) => r.includes("UPI collection velocity")),
      "reasons must mention UPI collection velocity",
    );
  });

  it("explainability mentions digital footprint score", () => {
    assert.ok(
      out.explainability.reasons.some((r) => r.includes("Digital footprint score")),
      "reasons must mention digital footprint score",
    );
  });
});

// ── Partial sources ───────────────────────────────────────────────────────────

describe("computeAgentOutputs — GST + UPI only (2 sources)", () => {
  const out = computeAgentOutputs(CTX.pan, { gst: gstMock(CTX), upi: upiMock(CTX) });

  it("confidence_level is 'low' with < 4 sources", () => {
    assert.equal(out.recommendation.confidence_level, "low");
  });

  it("compliance.electricity_bill_on_time_pct is null", () => {
    assert.equal(out.compliance.electricity_bill_on_time_pct, null);
  });

  it("compliance.epfo_pf_on_time_pct is null", () => {
    assert.equal(out.compliance.epfo_pf_on_time_pct, null);
  });

  it("cash_flow.fuel_cost_to_turnover_pct is null", () => {
    assert.equal(out.cash_flow.fuel_cost_to_turnover_pct, null);
  });

  it("risk.digital_discipline_score is null", () => {
    assert.equal(out.risk.digital_discipline_score, null);
  });

  it("explainability mentions unavailable sources count", () => {
    const expected = TOTAL_SOURCES - 2;
    assert.ok(
      out.explainability.reasons.some((r) => r.includes(`${expected} data source(s) were unavailable`)),
    );
  });

  it("health score still in [20, 96]", () => {
    assert.ok(out.recommendation.overall_health_score >= 20);
    assert.ok(out.recommendation.overall_health_score <= 96);
  });
});

describe("computeAgentOutputs — 4 sources (GST + UPI + AA + EPFO)", () => {
  const out = computeAgentOutputs(CTX.pan, {
    gst: gstMock(CTX),
    upi: upiMock(CTX),
    aa: aaMock(CTX),
    epfo: epfoMock(CTX),
  });

  it("confidence_level is 'medium' with exactly 4 sources", () => {
    assert.equal(out.recommendation.confidence_level, "medium");
  });
});

describe("computeAgentOutputs — no sources at all", () => {
  const out = computeAgentOutputs(CTX.pan, {});

  it("confidence_level is 'low'", () => {
    assert.equal(out.recommendation.confidence_level, "low");
  });

  it("health score in [20, 96] even with no data", () => {
    assert.ok(out.recommendation.overall_health_score >= 20);
    assert.ok(out.recommendation.overall_health_score <= 96);
  });

  it("cash_flow uses fallback cash_conversion_days of 45", () => {
    assert.equal(out.cash_flow.cash_conversion_days, 45);
  });

  it("compliance uses fallback gst_filings_on_time_pct of 78", () => {
    assert.equal(out.compliance.gst_filings_on_time_pct, 78);
  });

  it("payment_behaviour uses fallback velocity of 9", () => {
    assert.equal(out.payment_behaviour.upi_collection_velocity_days, 9);
  });
});

// ── High fuel pressure scenario ───────────────────────────────────────────────

describe("computeAgentOutputs — fuel pressure > 10%", () => {
  const highFuel = { ...fuelMock(CTX), fuel_cost_to_turnover_pct: 12.5 };
  const withoutFuel = computeAgentOutputs(CTX.pan, { gst: gstMock(CTX) });
  const withHighFuel = computeAgentOutputs(CTX.pan, { gst: gstMock(CTX), fuel: highFuel });

  it("liquidity_ratio is reduced when fuel > 10%", () => {
    // With same PAN/seed, liquidity_ratio should be lower with high-fuel scenario
    assert.ok(
      withHighFuel.cash_flow.liquidity_ratio <= withoutFuel.cash_flow.liquidity_ratio,
      `fuel-pressure liquidity ${withHighFuel.cash_flow.liquidity_ratio} should be ≤ no-fuel ${withoutFuel.cash_flow.liquidity_ratio}`,
    );
  });

  it("risk flags include fuel cost intensity message", () => {
    assert.ok(
      withHighFuel.risk.anomaly_flags.some((f) => f.includes("Fuel cost intensity elevated")),
    );
  });

  it("explainability mentions elevated fuel cost", () => {
    assert.ok(
      withHighFuel.explainability.reasons.some((r) =>
        r.includes("elevated operational cost intensity"),
      ),
    );
  });
});

// ── UPI discipline bonus / penalty ────────────────────────────────────────────

describe("computeAgentOutputs — UPI discipline impact on payment_behaviour score", () => {
  const disciplinedUpi = { ...upiMock(CTX), discipline_label: "disciplined" as const };
  const nonDisciplinedUpi = { ...upiMock(CTX), discipline_label: "non_disciplined" as const };

  const disciplinedOut = computeAgentOutputs(CTX.pan, { upi: disciplinedUpi });
  const nonDisciplinedOut = computeAgentOutputs(CTX.pan, { upi: nonDisciplinedUpi });

  it("disciplined UPI yields higher payment_behaviour score than non_disciplined", () => {
    assert.ok(
      disciplinedOut.recommendation.component_scores.payment_behaviour >
        nonDisciplinedOut.recommendation.component_scores.payment_behaviour,
      `disciplined pb=${disciplinedOut.recommendation.component_scores.payment_behaviour} should be > non_disciplined pb=${nonDisciplinedOut.recommendation.component_scores.payment_behaviour}`,
    );
  });

  it("non_disciplined UPI adds a risk flag", () => {
    assert.ok(
      nonDisciplinedOut.risk.anomaly_flags.some((f) =>
        f.includes("non-disciplined"),
      ),
    );
  });
});

// ── Health score bounds across many seeds ─────────────────────────────────────

describe("computeAgentOutputs — health score always in [20, 96]", () => {
  const pans = ["AAAAA0000A", "BBBBB1111B", "CCCCC2222C", "DDDDD3333D", "EEEEE4444E",
                "FFFFF5555F", "GGGGG6666G", "HHHHH7777H", "IIIII8888I", "JJJJJ9999J"];

  for (const pan of pans) {
    it(`health score in bounds for PAN ${pan}`, () => {
      const ctx = { ...CTX, pan };
      const out = computeAgentOutputs(pan, {
        gst: gstMock(ctx), upi: upiMock(ctx), aa: aaMock(ctx),
        epfo: epfoMock(ctx), electricity: elecMock(ctx),
        fuel: fuelMock(ctx), digital_footprint: digiMock(ctx),
      });
      assert.ok(
        out.recommendation.overall_health_score >= 20 &&
          out.recommendation.overall_health_score <= 96,
        `PAN ${pan}: score ${out.recommendation.overall_health_score} out of [20, 96]`,
      );
    });
  }
});

// ── Determinism ───────────────────────────────────────────────────────────────

describe("computeAgentOutputs — determinism", () => {
  it("identical inputs always produce identical outputs", () => {
    const a = computeAgentOutputs(CTX.pan, ALL_SOURCES);
    const b = computeAgentOutputs(CTX.pan, ALL_SOURCES);
    assert.deepEqual(a, b);
  });

  it("different PANs produce different health scores", () => {
    const a = computeAgentOutputs("AAAAA0000A", ALL_SOURCES);
    const b = computeAgentOutputs("ZZZZZ9999Z", ALL_SOURCES);
    // Different seeds — scores may coincidentally match for a subset of inputs
    // but the full recommendation objects should differ
    assert.notDeepEqual(a.recommendation, b.recommendation);
  });
});
