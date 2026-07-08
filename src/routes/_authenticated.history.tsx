import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApplications } from "@/lib/creditcrew.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { formatCurrency, statusBadge, riskBadge } from "@/components/creditcrew/format";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const fetchApps = useServerFn(listApplications);
  const { data } = useQuery({ queryKey: ["applications"], queryFn: () => fetchApps() });
  const [q, setQ] = useState("");
  const apps = ((data as any[]) ?? []).filter((a) =>
    !q || a.applicant_name.toLowerCase().includes(q.toLowerCase()) || a.pan?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-semibold">Assessment history</h1>
        <p className="text-muted-foreground mt-1">Filter, review and audit past MSME assessments.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All applications</CardTitle>
          <Input className="mt-2 max-w-xs" placeholder="Search by name or PAN" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide border-b">
            <div className="col-span-4">Applicant</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Risk</div>
            <div className="col-span-2 text-right">Capacity</div>
            <div className="col-span-2 text-right">Decision</div>
          </div>
          {apps.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No matches.</div>
          ) : (
            <div className="divide-y">
              {apps.map((a: any) => (
                <Link key={a.id} to="/applications/$id" params={{ id: a.id }} className="grid grid-cols-12 items-center gap-3 px-4 py-3 hover:bg-muted/40">
                  <div className="col-span-4">
                    <div className="font-medium">{a.applicant_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{a.pan}</div>
                  </div>
                  <div className="col-span-2">{statusBadge(a.status)}</div>
                  <div className="col-span-2">{a.risk_rating ? riskBadge(a.risk_rating) : <span className="text-xs text-muted-foreground">—</span>}</div>
                  <div className="col-span-2 text-right font-mono text-sm">{a.borrowing_capacity ? formatCurrency(a.borrowing_capacity) : "—"}</div>
                  <div className="col-span-2 text-right text-sm capitalize">{a.decision?.replace("_", " ") ?? <span className="text-muted-foreground">Pending</span>}</div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
