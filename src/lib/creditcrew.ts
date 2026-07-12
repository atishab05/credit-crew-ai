// Shared types for CreditCrew AI application entities.
export type AgentName =
  | "financial_data"
  | "revenue_intelligence"
  | "cash_flow"
  | "compliance"
  | "payment_behaviour"
  | "risk"
  | "recommendation"
  | "explainability";

export const AGENTS: { key: AgentName; label: string; description: string }[] = [
  { key: "financial_data", label: "Financial Data", description: "Unifies raw inputs into a canonical MSME profile." },
  { key: "revenue_intelligence", label: "Revenue Intelligence", description: "Growth, seasonality and revenue stability." },
  { key: "cash_flow", label: "Cash Flow", description: "Liquidity, cash conversion, working capital." },
  { key: "compliance", label: "Compliance", description: "GST filings, on-time discipline, tax consistency." },
  { key: "payment_behaviour", label: "Payment Behaviour", description: "UPI collection velocity, supplier payments." },
  { key: "risk", label: "Risk Signals", description: "Anomalies, fraud markers, concentration risk." },
  { key: "recommendation", label: "Recommendation", description: "Weighted health score, capacity and product." },
  { key: "explainability", label: "Explainability", description: "Human-readable reasoning behind every output." },
];

export const DATA_SOURCES = [
  { key: "gst", label: "GST", description: "Filings, turnover, tax history" },
  { key: "upi", label: "UPI", description: "Digital collections & payouts" },
  { key: "aa", label: "Account Aggregator", description: "Bank statement rails" },
  { key: "epfo", label: "EPFO", description: "Workforce & payroll signals" },
  { key: "electricity", label: "Electricity", description: "Utility consumption & operational activity" },
  { key: "fuel", label: "Fuel Costs", description: "Operational cost data for trading & logistics" },
  { key: "digital_footprint", label: "Digital Footprint", description: "Platform activity, e-commerce & business discipline" },
] as const;

export type DataSource = (typeof DATA_SOURCES)[number]["key"];

export type ApplicationStatus =
  | "draft"
  | "analysis_running"
  | "analysis_complete"
  | "reviewed"
  | "approved"
  | "rejected"
  | "documents_requested";
