import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listApplications } from "@/lib/creditcrew.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FilePlus2, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, statusBadge, riskBadge } from "@/components/creditcrew/format";
import { maskPan, maskGstin } from "@/lib/pii";
import { AdapterHealthWidget } from "@/components/creditcrew/AdapterHealthWidget";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const fetchApps = useServerFn(listApplications);
  const { data } = useQuery({ queryKey: ["applications"], queryFn: () => fetchApps() });
  const apps = (data ?? []) as any[];

  const stats = {
    total: apps.length,
    running: apps.filter((a) => a.status === "analysis_running").length,
    completed: apps.filter((a) => ["analysis_complete", "approved", "rejected", "documents_requested"].includes(a.status)).length,
    decided: apps.filter((a) => a.decision).length,
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-accent font-medium">Underwriting workspace</p>
          <h1 className="text-3xl font-semibold mt-1">Loan officer dashboard</h1>
          <p className="text-muted-foreground mt-1">Kick off a new assessment or review active cases.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/applications/new"><FilePlus2 className="h-4 w-4 mr-2" /> New assessment</Link>
        </Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total applications" value={stats.total} icon={TrendingUp} />
        <StatCard label="Analysis running" value={stats.running} icon={Clock} accent />
        <StatCard label="Ready for review" value={stats.completed - stats.decided} icon={ArrowRight} />
        <StatCard label="Decisions made" value={stats.decided} icon={CheckCircle2} />
      </div>

      <AdapterHealthWidget />

      <Card>
        <CardHeader><CardTitle>Recent assessments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {apps.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No applications yet. Create your first MSME assessment to get started.
            </div>
          ) : (
            <div className="divide-y">
              {apps.slice(0, 10).map((a) => (
                <Link key={a.id} to="/applications/$id" params={{ id: a.id }} className="grid grid-cols-12 items-center gap-3 p-4 hover:bg-muted/40 transition-colors">
                  <div className="col-span-4">
                    <div className="font-medium">{a.applicant_name}</div>
                    <div className="text-xs text-muted-foreground font-mono" title="PAN and GSTIN are masked in list views (DPDP)">{maskPan(a.pan)} · {maskGstin(a.gstin)}</div>
                  </div>
                  <div className="col-span-2 text-sm">{statusBadge(a.status)}</div>
                  <div className="col-span-2 text-sm">{a.risk_rating ? riskBadge(a.risk_rating) : <span className="text-muted-foreground">—</span>}</div>
                  <div className="col-span-2 text-right font-mono text-sm">
                    {a.borrowing_capacity ? formatCurrency(a.borrowing_capacity) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <div className="col-span-2 text-right">
                    {a.decision ? <Badge variant="outline">{a.decision.replace("_", " ")}</Badge> : <span className="text-xs text-muted-foreground">Pending</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-md grid place-items-center ${accent ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
