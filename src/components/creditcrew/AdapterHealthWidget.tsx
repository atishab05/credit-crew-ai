import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkAdapterHealth } from "@/lib/creditcrew.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Minus, RefreshCw } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  gst: "GST",
  upi: "UPI",
  aa: "Account Aggregator",
  epfo: "EPFO",
  electricity: "Electricity",
  fuel: "Fuel Costs",
  digital_footprint: "Digital Footprint",
};

type HealthRow = {
  source: string;
  ok: boolean;
  latency_ms: number;
  mode: "mock" | "sandbox";
  error: string | null;
};

function StatusIcon({ ok, mode }: { ok: boolean; mode: "mock" | "sandbox" }) {
  if (mode === "mock") return <Minus className="h-4 w-4 text-muted-foreground" />;
  return ok
    ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    : <XCircle className="h-4 w-4 text-destructive" />;
}

function ModeBadge({ mode }: { mode: "mock" | "sandbox" }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide border ${
      mode === "sandbox"
        ? "bg-secondary/10 text-secondary border-secondary/30"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {mode}
    </span>
  );
}

export function AdapterHealthWidget() {
  const check = useServerFn(checkAdapterHealth);

  const { data, isFetching, isError, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["adapter-health"],
    queryFn: () => check(),
    // Don't auto-poll — health checks hit real sandbox endpoints
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rows = (data ?? []) as HealthRow[];
  const sandboxCount = rows.filter((r) => r.mode === "sandbox").length;
  const sandboxOk = rows.filter((r) => r.mode === "sandbox" && r.ok).length;
  const sandboxFail = sandboxCount - sandboxOk;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Adapter health</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sandboxCount === 0
              ? "All sources in mock mode — no sandbox endpoints to check."
              : sandboxFail === 0
              ? `${sandboxOk}/${sandboxCount} sandbox adapter${sandboxOk !== 1 ? "s" : ""} reachable.`
              : `${sandboxFail} sandbox adapter${sandboxFail !== 1 ? "s" : ""} unreachable.`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={isFetching}
          onClick={() => refetch()}
          className="shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Checking…" : "Refresh"}
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        {isError ? (
          <div className="text-sm text-destructive">Failed to load health status.</div>
        ) : rows.length === 0 && isFetching ? (
          <div className="text-sm text-muted-foreground">Checking adapters…</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((row) => (
              <div
                key={row.source}
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${
                  row.mode === "sandbox" && !row.ok
                    ? "border-destructive/30 bg-destructive/5"
                    : row.mode === "sandbox" && row.ok
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon ok={row.ok} mode={row.mode} />
                    <span className="text-sm font-medium truncate">{SOURCE_LABELS[row.source] ?? row.source}</span>
                  </div>
                  {row.mode === "sandbox" && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {row.ok ? `${row.latency_ms} ms` : row.error ?? "unreachable"}
                    </div>
                  )}
                </div>
                <ModeBadge mode={row.mode} />
              </div>
            ))}
          </div>
        )}
        {dataUpdatedAt > 0 && (
          <p className="text-[11px] text-muted-foreground mt-3">
            Last checked {new Date(dataUpdatedAt).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
