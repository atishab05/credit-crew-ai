// Shared adapter types for external data sources (GST / UPI / AA / EPFO / Electricity).
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

export type ConnectionMetadata =
  | GstMetadata
  | UpiMetadata
  | AaMetadata
  | EpfoMetadata
  | ElectricityMetadata;

export type AdapterSource = "gst" | "upi" | "aa" | "epfo" | "electricity";

export type HealthCheckResult = { ok: boolean; latency_ms: number; mode: "mock" | "sandbox"; error?: string };

export type AdapterSandboxConfig = {
  baseUrlOverride?: string | null;
};

export type AdapterContext = {
  applicantId: string;
  pan: string;
  gstin: string;
};
