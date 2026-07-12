import { Badge } from "@/components/ui/badge";

export function formatCurrency(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
    analysis_running: { label: "Analysing", className: "bg-accent/15 text-accent border-accent/30" },
    analysis_complete: { label: "Ready to review", className: "bg-primary/10 text-primary border-primary/30" },
    reviewed: { label: "Reviewed", className: "bg-primary/10 text-primary border-primary/30" },
    approved: { label: "Approved", className: "bg-success/15 text-success border-success/30" },
    rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive border-destructive/30" },
    documents_requested: { label: "Docs requested", className: "bg-warning/20 text-warning-foreground border-warning/40" },
  };
  const m = map[status] ?? { label: status, className: "" };
  return <Badge variant="outline" className={m.className}>{m.label}</Badge>;
}

export function riskBadge(rating: string) {
  const map: Record<string, string> = {
    Low: "bg-emerald-50 text-emerald-700 border-emerald-300",
    Moderate: "bg-blue-50 text-blue-700 border-blue-300",
    Elevated: "bg-amber-50 text-amber-700 border-amber-300",
    High: "bg-red-50 text-red-700 border-red-300",
  };
  return <Badge variant="outline" className={map[rating] ?? ""}>{rating} risk</Badge>;
}
