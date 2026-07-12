/**
 * Pure scoring kernel extracted from runAssessment.
 *
 * This module contains no Supabase calls, no sleep(), no createServerFn —
 * only the deterministic math that turns connected-source metadata into
 * agent outputs and a final recommendation. Import it directly in tests.
 */

import type {
  GstMetadata,
  UpiMetadata,
  AaMetadata,
  EpfoMetadata,
  ElectricityMetadata,
  FuelMetadata,
  DigitalFootprintMetadata,
} from "../adapters/types.js";
import { seededRand } from "./adapters/util.js";

export type ConnectedSources = {
  gst?: GstMetadata | null;
  upi?: UpiMetadata | null;
  aa?: AaMetadata | null;
  epfo?: EpfoMetadata | null;
  electricity?: ElectricityMetadata | null;
  fuel?: FuelMetadata | null;
  digital_footprint?: DigitalFootprintMetadata | null;
};

export type AgentOutputs = {
  financial_data: Record<string, unknown>;
  revenue_intelligence: {
    avg_monthly_revenue: number;
    yoy_growth_pct: number;
    stability_score: number;
    series: number[];
    elec_corroboration: "high_activity" | "moderate_activity" | null;
  };
  cash_flow: {
    liquidity_ratio: number;
    cash_conversion_days: number;
    working_capital_gap: number;
    fuel_cost_to_turnover_pct: number | null;
  };
  compliance: {
    gst_filings_on_time_pct: number;
    tax_consistency: string;
    late_filings_last_12m: number;
    electricity_bill_on_time_pct: number | null;
    epfo_pf_on_time_pct: number | null;
  };
  payment_behaviour: {
    upi_collection_velocity_days: number;
    supplier_payment_on_time_pct: number;
    avg_ticket_size: number;
    upi_sale_txn_pct: number | null;
    upi_purchase_txn_pct: number | null;
    upi_total_transactions_12m: number | null;
    upi_discipline_label: UpiMetadata["discipline_label"] | null;
  };
  risk: {
    concentration_risk_pct: number;
    anomaly_flags: string[];
    fraud_signals: number;
    digital_discipline_score: number | null;
  };
  recommendation: {
    overall_health_score: number;
    risk_rating: "Low" | "Moderate" | "Elevated" | "High";
    borrowing_capacity: number;
    recommended_loan_product: string;
    confidence_level: "high" | "medium" | "low";
    component_scores: {
      revenue: number;
      cash_flow: number;
      compliance: number;
      payment_behaviour: number;
      digital_footprint: number;
      risk_penalty: number;
    };
  };
  explainability: { reasons: string[] };
};

export const TOTAL_SOURCES = 7;

/**
 * Run the full assessment scoring pipeline against the given connected sources.
 * The `pan` string seeds the deterministic random generator (same as production).
 */
export function computeAgentOutputs(pan: string, sources: ConnectedSources): AgentOutputs {
  const { gst, upi, aa, epfo, electricity: elec, fuel, digital_footprint: digi } = sources;
  const rand = seededRand(pan);
  const connectedCount = Object.values(sources).filter(Boolean).length;

  // ── financial_data ────────────────────────────────────────────────────────
  const financial_data = {
    sources_connected: Object.entries(sources).filter(([, v]) => v != null).map(([k]) => k),
    annual_turnover: gst?.annual_turnover ?? Math.round(6_000_000 + rand() * 8_000_000),
    employees: epfo?.employees ?? 12,
    avg_monthly_kwh: elec?.avg_monthly_kwh ?? null,
    avg_monthly_fuel_spend: fuel?.avg_monthly_fuel_spend ?? null,
  };

  // ── revenue_intelligence ─────────────────────────────────────────────────
  const months = gst?.months ?? upi?.monthly_collections ?? [];
  const values = months.map((m) => m.value);
  const avg = values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : 1_200_000;
  const growth =
    values.length >= 2
      ? Math.round(((values.at(-1)! - values[0]) / values[0]) * 100)
      : Math.round(rand() * 20 - 5);
  const stability = Math.max(30, 90 - Math.abs(growth));
  const elec_corroboration = elec
    ? elec.avg_monthly_kwh > 2000
      ? ("high_activity" as const)
      : ("moderate_activity" as const)
    : null;
  const revenue_intelligence = {
    avg_monthly_revenue: Math.round(avg),
    yoy_growth_pct: growth,
    stability_score: stability,
    series: values,
    elec_corroboration,
  };

  // ── cash_flow ─────────────────────────────────────────────────────────────
  const liquidity_ratio_raw = +(1.1 + rand() * 1.2).toFixed(2);
  const fuel_cost_to_turnover_pct = fuel?.fuel_cost_to_turnover_pct ?? null;
  const fuel_pressure = fuel_cost_to_turnover_pct !== null && fuel_cost_to_turnover_pct > 10;
  const cash_flow = {
    liquidity_ratio: fuel_pressure
      ? Math.max(1.0, liquidity_ratio_raw - 0.2)
      : liquidity_ratio_raw,
    cash_conversion_days: aa?.cash_conversion_days ?? 45,
    working_capital_gap: Math.round(200_000 + rand() * 500_000),
    fuel_cost_to_turnover_pct,
  };

  // ── compliance ────────────────────────────────────────────────────────────
  const compliance = {
    gst_filings_on_time_pct: gst?.filings_on_time_pct ?? 78,
    tax_consistency: rand() > 0.3 ? "consistent" : "minor_variances",
    late_filings_last_12m: Math.floor(rand() * 3),
    electricity_bill_on_time_pct: elec?.on_time_bill_pct ?? null,
    epfo_pf_on_time_pct: epfo?.on_time_pf_pct ?? null,
  };

  // ── payment_behaviour ─────────────────────────────────────────────────────
  const payment_behaviour = {
    upi_collection_velocity_days: upi?.collection_velocity_days ?? 9,
    supplier_payment_on_time_pct: 70 + Math.floor(rand() * 25),
    avg_ticket_size: Math.round(2500 + rand() * 4000),
    upi_sale_txn_pct: upi?.sale_txn_pct ?? null,
    upi_purchase_txn_pct: upi?.purchase_txn_pct ?? null,
    upi_total_transactions_12m: upi?.total_transactions_12m ?? null,
    upi_discipline_label: upi?.discipline_label ?? null,
  };

  // ── risk ──────────────────────────────────────────────────────────────────
  const anomaly_flags: string[] = [];
  const conc = 30 + Math.round(rand() * 45);
  if (conc > 55) anomaly_flags.push(`Top customer concentration ${conc}%`);
  if (rand() > 0.75) anomaly_flags.push("Revenue anomaly detected in Q2");
  if (fuel && fuel.fuel_cost_to_turnover_pct > 12)
    anomaly_flags.push(`Fuel cost intensity elevated at ${fuel.fuel_cost_to_turnover_pct}% of turnover`);
  if (digi && digi.last_activity_days_ago > 30)
    anomaly_flags.push(`Digital platform inactive for ${digi.last_activity_days_ago} days`);
  if (upi?.discipline_label === "non_disciplined")
    anomaly_flags.push("UPI transaction pattern classified as non-disciplined");
  if (connectedCount < TOTAL_SOURCES)
    anomaly_flags.push(`${TOTAL_SOURCES - connectedCount} data source(s) unavailable`);
  const risk = {
    concentration_risk_pct: conc,
    anomaly_flags,
    fraud_signals: 0,
    digital_discipline_score: digi?.digital_discipline_score ?? null,
  };

  // ── recommendation ────────────────────────────────────────────────────────
  const revScore = Math.min(
    100,
    revenue_intelligence.stability_score * 0.6 +
      Math.max(0, revenue_intelligence.yoy_growth_pct + 10) * 2,
  );
  const cfScore = Math.min(
    100,
    cash_flow.liquidity_ratio * 30 + (60 - Math.min(60, cash_flow.cash_conversion_days)),
  );
  const elecBill =
    compliance.electricity_bill_on_time_pct ?? compliance.gst_filings_on_time_pct;
  const pfOnTime = compliance.epfo_pf_on_time_pct ?? 90;
  const compScore =
    compliance.gst_filings_on_time_pct * 0.6 +
    elecBill * 0.2 +
    pfOnTime * 0.2 -
    compliance.late_filings_last_12m * 5;
  const disciplineBonus =
    payment_behaviour.upi_discipline_label === "disciplined"
      ? 8
      : payment_behaviour.upi_discipline_label === "non_disciplined"
        ? -10
        : 0;
  const txnVolumeBonus = payment_behaviour.upi_total_transactions_12m
    ? Math.min(10, payment_behaviour.upi_total_transactions_12m / 60)
    : 0;
  const pbScore =
    100 -
    Math.min(60, payment_behaviour.upi_collection_velocity_days * 4) +
    (payment_behaviour.supplier_payment_on_time_pct - 70) * 0.5 +
    disciplineBonus +
    txnVolumeBonus;
  const digiBonus =
    risk.digital_discipline_score !== null
      ? (risk.digital_discipline_score / 100) * 8
      : 0;
  const riskPenalty = risk.concentration_risk_pct * 0.4 + risk.anomaly_flags.length * 6;

  const raw =
    revScore * 0.28 +
    cfScore * 0.23 +
    compScore * 0.19 +
    pbScore * 0.14 +
    digiBonus -
    riskPenalty * 0.5 +
    20;
  const health = Math.max(20, Math.min(96, Math.round(raw)));
  const risk_rating =
    health >= 78
      ? ("Low" as const)
      : health >= 60
        ? ("Moderate" as const)
        : health >= 45
          ? ("Elevated" as const)
          : ("High" as const);
  const capacity = Math.round(
    revenue_intelligence.avg_monthly_revenue * 0.3 * 12 * (health / 100),
  );
  const product =
    cash_flow.liquidity_ratio < 1.4
      ? "Working Capital Loan"
      : health >= 75
        ? "Term Loan"
        : revenue_intelligence.yoy_growth_pct > 12
          ? "Equipment Finance"
          : "Overdraft Facility";
  const confidence =
    connectedCount === TOTAL_SOURCES
      ? ("high" as const)
      : connectedCount >= 4
        ? ("medium" as const)
        : ("low" as const);

  const recommendation = {
    overall_health_score: health,
    risk_rating,
    borrowing_capacity: capacity,
    recommended_loan_product: product,
    confidence_level: confidence,
    component_scores: {
      revenue: Math.round(revScore),
      cash_flow: Math.round(cfScore),
      compliance: Math.round(compScore),
      payment_behaviour: Math.round(pbScore),
      digital_footprint: Math.round(digiBonus),
      risk_penalty: Math.round(riskPenalty),
    },
  };

  // ── explainability ────────────────────────────────────────────────────────
  const reasons: string[] = [];
  reasons.push(
    `Average monthly revenue estimated at ₹${(revenue_intelligence.avg_monthly_revenue / 100000).toFixed(1)}L with ${revenue_intelligence.yoy_growth_pct}% YoY movement.`,
  );
  reasons.push(
    `Liquidity ratio ${cash_flow.liquidity_ratio} and cash conversion of ${cash_flow.cash_conversion_days} days ${cash_flow.liquidity_ratio < 1.4 ? "signal working-capital pressure" : "indicate healthy working capital"}.`,
  );
  if (cash_flow.fuel_cost_to_turnover_pct !== null)
    reasons.push(
      `Fuel costs represent ${cash_flow.fuel_cost_to_turnover_pct}% of turnover — ${cash_flow.fuel_cost_to_turnover_pct > 10 ? "elevated operational cost intensity, weighing on working capital" : "within normal range for sector"}.`,
    );
  reasons.push(
    `GST filings ${compliance.gst_filings_on_time_pct}% on-time with ${compliance.late_filings_last_12m} late in last 12 months.`,
  );
  if (compliance.electricity_bill_on_time_pct !== null)
    reasons.push(
      `Electricity bills paid on time ${compliance.electricity_bill_on_time_pct}% — utility payment discipline ${compliance.electricity_bill_on_time_pct >= 90 ? "strong" : "needs improvement"}.`,
    );
  if (compliance.epfo_pf_on_time_pct !== null)
    reasons.push(`EPFO provident fund contributions ${compliance.epfo_pf_on_time_pct}% on-time.`);
  reasons.push(
    `UPI collection velocity of ${payment_behaviour.upi_collection_velocity_days} days and ${payment_behaviour.supplier_payment_on_time_pct}% on-time supplier payments.`,
  );
  if (payment_behaviour.upi_discipline_label)
    reasons.push(
      `UPI transaction pattern (${payment_behaviour.upi_total_transactions_12m} transactions, ${payment_behaviour.upi_sale_txn_pct}% sales / ${payment_behaviour.upi_purchase_txn_pct}% purchases) classified as ${payment_behaviour.upi_discipline_label.replace("_", " ")}.`,
    );
  if (risk.digital_discipline_score !== null)
    reasons.push(
      `Digital footprint score ${risk.digital_discipline_score}/100 — active on ${digi?.active_platform_count} platform(s) with ${digi?.active_months_last_12} active months in the last year.`,
    );
  if (risk.anomaly_flags.length)
    reasons.push(`Risk flags: ${risk.anomaly_flags.join("; ")}.`);
  reasons.push(
    `Borrowing capacity capped at 30% of annualised revenue, adjusted by health score ${health}/100 → ₹${(capacity / 100000).toFixed(1)}L.`,
  );
  if (confidence !== "high")
    reasons.push(
      `Confidence marked ${confidence} because ${TOTAL_SOURCES - connectedCount} data source(s) were unavailable.`,
    );

  return {
    financial_data,
    revenue_intelligence,
    cash_flow,
    compliance,
    payment_behaviour,
    risk,
    recommendation,
    explainability: { reasons },
  };
}
