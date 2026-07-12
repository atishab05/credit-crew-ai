// Shared adapter types for external data sources (GST / UPI / AA / EPFO / Electricity / Fuel / DigitalFootprint).
// Adapters are called from server functions only. They return plain DTOs the
// agent layer already understands, so switching between mock and sandbox
// modes requires no changes downstream.

export type MonthValue = { month: number; value: number };

export type GstMetadata = {
  annual_turnover: number;
  months: MonthValue[];
  filings_on_time_pct: number;
};

export type UpiMetadata = {
  monthly_collections: MonthValue[];
  collection_velocity_days: number;
  /** Share of inbound transactions classified as sales receipts (0-100). */
  sale_txn_pct: number;
  /** Share of outbound transactions classified as purchase/supplier payments (0-100). */
  purchase_txn_pct: number;
  /** Total transaction count over the last 12 months. */
  total_transactions_12m: number;
  /** Payment discipline classification. */
  discipline_label: "disciplined" | "irregular" | "non_disciplined";
};

export type AaMetadata = {
  avg_balance: number;
  cash_conversion_days: number;
};

export type EpfoMetadata = {
  employees: number;
  on_time_pf_pct: number;
};

export type ElectricityMetadata = {
  avg_monthly_kwh: number;
  on_time_bill_pct: number;
};

/** Fuel / operational cost data — relevant for trading, logistics and manufacturing MSMEs. */
export type FuelMetadata = {
  /** Average monthly fuel spend in INR. */
  avg_monthly_fuel_spend: number;
  /** Month-over-month fuel spend series (12 months). */
  monthly_fuel_spend: MonthValue[];
  /** Fuel cost as percentage of reported turnover (operational intensity proxy). */
  fuel_cost_to_turnover_pct: number;
};

/** Digital platform footprint — e-commerce, GeM, ONDC, and project platform activity. */
export type DigitalFootprintMetadata = {
  /** Number of active digital platform registrations. */
  active_platform_count: number;
  /** Months with recorded platform activity in the last 12. */
  active_months_last_12: number;
  /** Days since last recorded digital activity. */
  last_activity_days_ago: number;
  /** Overall digital discipline score 0-100. */
  digital_discipline_score: number;
};

export type ConnectionMetadata =
  | GstMetadata
  | UpiMetadata
  | AaMetadata
  | EpfoMetadata
  | ElectricityMetadata
  | FuelMetadata
  | DigitalFootprintMetadata;

export type AdapterSource = "gst" | "upi" | "aa" | "epfo" | "electricity" | "fuel" | "digital_footprint";

export type HealthCheckResult = { ok: boolean; latency_ms: number; mode: "mock" | "sandbox"; error?: string };

export type AdapterSandboxConfig = {
  baseUrlOverride?: string | null;
};

export type AdapterContext = {
  applicantId: string;
  pan: string;
  gstin: string;
};
