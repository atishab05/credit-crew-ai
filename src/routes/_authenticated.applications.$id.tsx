import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getApplication, connectSource, runAssessment, submitDecision } from "@/lib/creditcrew.functions";
import { getDataSourceSettings, type DataSourceSetting } from "@/lib/data-source-settings.functions";
import { AGENTS, DATA_SOURCES, type AgentName, type DataSource } from "@/lib/creditcrew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatCurrency, statusBadge, riskBadge } from "@/components/creditcrew/format";
import { DocumentsPanel } from "@/components/creditcrew/DocumentsPanel";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Zap, ArrowLeft, ThumbsUp, ThumbsDown, FileQuestion, Sparkles, ShieldCheck } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/applications/$id")({
  component: AppDetail,
});

function AppDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getApplication);
  const connect = useServerFn(connectSource);
  const run = useServerFn(runAssessment);
  const decide = useServerFn(submitDecision);
  const fetchSettings = useServerFn(getDataSourceSettings);
  const settingsQuery = useQuery({
    queryKey: ["data-source-settings"],
    queryFn: () => fetchSettings(),
  });

  const q = useQuery({
    queryKey: ["application", id],
    queryFn: () => fetchOne({ data: { id } }),
    refetchInterval: (query) => {
      const st = (query.state.data as any)?.application?.status;
      return st === "analysis_running" ? 900 : false;
    },
  });

  const data = q.data;
  const app = data?.application;

  const connectMut = useMutation({
    mutationFn: (v: { source: DataSource; simulateFailure?: boolean }) => connect({ data: { application_id: id, source: v.source, simulateFailure: v.simulateFailure } }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["application", id] });
      if (res?.metadata?.error) {
        toast.error(res.metadata.error + (res?.mode ? ` (${res.mode})` : ""));
      } else {
        toast.success(res?.status === "connected" ? "Connected" : "Updated");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const runMut = useMutation({
    mutationFn: () => run({ data: { application_id: id } }),
    onSuccess: () => { toast.success("Assessment complete"); qc.invalidateQueries({ queryKey: ["application", id] }); qc.invalidateQueries({ queryKey: ["applications"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Run failed"),
  });

  const [notes, setNotes] = useState("");
  const [tab, setTab] = useState<string | undefined>(undefined);
  const decideMut = useMutation({
    mutationFn: (decision: "approved" | "rejected" | "documents_requested") => decide({ data: { application_id: id, decision, notes } }),
    onSuccess: () => { toast.success("Decision recorded"); qc.invalidateQueries({ queryKey: ["application", id] }); qc.invalidateQueries({ queryKey: ["applications"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const handleRunAssessment = () => {
    setTab("run");
    runMut.mutate();
  };

  const handleConnect = (source: DataSource, simulateFailure?: boolean) => {
    setTab("sources");
    connectMut.mutate({ source, simulateFailure });
  };

  if (q.isLoading || !data) return <div className="p-10 text-muted-foreground">Loading assessment…</div>;

  const conns = data.connections;
  const connectedCount = conns.filter((c: any) => c.status === "connected").length;
  const agents = data.agents;
  const audit = data.audit;
  const running = app.status === "analysis_running";
  const recommendation = agents.find((a: any) => a.agent_name === "recommendation")?.output;
  const explanation = agents.find((a: any) => a.agent_name === "explainability")?.output;

  const defaultTab = app.status === "analysis_running" ? "run" : app.status === "analysis_complete" || app.decision ? "health" : "sources";

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl">
      <div>
        <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Dashboard</Link>
        <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-3xl font-semibold">{app.applicant_name}</h1>
            <div className="text-sm text-muted-foreground font-mono mt-1">{app.pan} · {app.gstin}</div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(app.status)}
            {app.risk_rating && riskBadge(app.risk_rating)}
            {app.decision && <Badge variant="outline" className="capitalize">{app.decision.replace("_", " ")}</Badge>}
          </div>
        </div>
      </div>

      <Tabs value={tab ?? defaultTab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sources">1. Data sources</TabsTrigger>
          <TabsTrigger value="run">2. Agent run</TabsTrigger>
          <TabsTrigger value="health" disabled={!recommendation}>3. Health card</TabsTrigger>
          <TabsTrigger value="decision" disabled={!recommendation}>4. Decision</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        {/* SOURCES */}
        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connect data sources</CardTitle>
              <CardDescription>
                Connection status is based on the current saved mode per source. {connectedCount}/7 connected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={(connectedCount / 7) * 100} className="mb-6 h-2" />
              <div className="grid gap-4 md:grid-cols-2">
                {DATA_SOURCES.map((src) => {
                  const c = conns.find((x: any) => x.source === src.key);
                  const status = c?.status ?? "pending";
                  return (
                    <div key={src.key} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{src.label}</div>
                          <div className="text-xs text-muted-foreground">{src.description}</div>
                          <div className="mt-2">
                            <Badge variant={settingsQuery.data?.[src.key]?.mode === "sandbox" ? "secondary" : "outline"} className="text-xs uppercase">
                              {settingsQuery.data?.[src.key]?.mode === "sandbox" ? "Sandbox" : "Mock"}
                            </Badge>
                          </div>
                        </div>
                        <SourceStatusIcon status={status} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={connectMut.isPending} onClick={() => handleConnect(src.key)}>
                          {status === "connected" ? "Reconnect" : "Connect"}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={connectMut.isPending} onClick={() => handleConnect(src.key, true)}>
                          Simulate failure
                        </Button>
                      </div>
                      {c?.metadata?.error && (
                        <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2">
                          <div className="text-sm font-medium text-destructive">Connection error</div>
                          <div className="text-xs text-destructive/90 mt-1">{c.metadata.error}{c?.metadata?.mode ? ` (${c.metadata.mode})` : ""}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end">
                <Button disabled={connectedCount === 0 || runMut.isPending || running} onClick={handleRunAssessment}>
                  <Zap className="h-4 w-4 mr-2" /> Run multi-agent assessment
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGENT RUN */}
        <TabsContent value="run" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Agent collaboration</CardTitle>
                <CardDescription>{running ? "Agents are analysing this MSME…" : recommendation ? "All agents completed." : "Trigger the run to see agents work."}</CardDescription>
              </div>
              <Button disabled={connectedCount === 0 || runMut.isPending || running} onClick={handleRunAssessment}>
                <Zap className="h-4 w-4 mr-2" /> {recommendation ? "Re-run" : "Run assessment"}
              </Button>
            </CardHeader>
            <CardContent>
              {(running || runMut.isPending) && <RunProgress agents={agents} />}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {AGENTS.map((a) => {
                  const r = agents.find((x: any) => x.agent_name === a.key);
                  const st = r?.status ?? "pending";
                  return (
                    <div key={a.key} className={`rounded-lg border p-4 transition-all ${st === "running" ? "border-accent bg-accent/5" : st === "completed" ? "border-success/40 bg-success/5" : "bg-card"}`}>
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-medium">{a.label}</div>
                        <AgentStatusIcon status={st} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{a.description}</div>
                    </div>
                  );
                })}
              </div>
              <AgentTimeline agents={agents} running={running} />
              <AgentDataFlow agents={agents} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* HEALTH CARD */}
        <TabsContent value="health" className="space-y-4">
          {recommendation && <HealthCard recommendation={recommendation} explanation={explanation} agents={agents} />}
        </TabsContent>

        {/* DECISION */}
        <TabsContent value="decision" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Loan officer decision</CardTitle>
              <CardDescription>You are in the loop — AI assesses, you decide.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {app.decision ? (
                <div className="rounded-md border bg-muted/40 p-4">
                  <div className="text-sm">Recorded decision: <Badge variant="outline" className="capitalize ml-1">{app.decision.replace("_", " ")}</Badge></div>
                  {app.decision_notes && <div className="text-sm text-muted-foreground mt-2">Notes: {app.decision_notes}</div>}
                </div>
              ) : (
                <>
                  <Textarea placeholder="Notes / justification for supervisor" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => decideMut.mutate("approved")} disabled={decideMut.isPending}>
                      <ThumbsUp className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button variant="destructive" onClick={() => decideMut.mutate("rejected")} disabled={decideMut.isPending}>
                      <ThumbsDown className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button variant="outline" onClick={() => decideMut.mutate("documents_requested")} disabled={decideMut.isPending}>
                      <FileQuestion className="h-4 w-4 mr-2" /> Request documents
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS */}
        <TabsContent value="documents" className="space-y-4">
          <DocumentsPanel applicationId={id} />
          {app.consent_given && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Consent &amp; retention</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Consent reference</div>
                  <div className="font-mono break-all">{app.consent_reference ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Consent recorded</div>
                  <div>{app.consent_at ? new Date(app.consent_at).toLocaleString() : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Retention until</div>
                  <div>{app.retention_until ? new Date(app.retention_until).toLocaleDateString() : "—"}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
            <CardContent>
              {audit.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events yet.</div>
              ) : (
                <ol className="relative border-l pl-6 space-y-4">
                  {audit.map((e: any) => (
                    <li key={e.id} className="text-sm">
                      <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-accent" />
                      <div className="font-medium capitalize">{e.action.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                      {e.details && Object.keys(e.details).length > 0 && (
                        <pre className="mt-1 text-xs bg-muted/50 rounded p-2 overflow-x-auto">{JSON.stringify(e.details, null, 2)}</pre>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SourceStatusIcon({ status }: { status: string }) {
  if (status === "connected") return <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-4 w-4" /> Connected</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="h-4 w-4" /> Failed</span>;
  return <span className="text-xs text-muted-foreground">Not connected</span>;
}

function AgentStatusIcon({ status }: { status: string }) {
  if (status === "running") return <Loader2 className="h-4 w-4 text-accent animate-spin" />;
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <div className="h-2 w-2 rounded-full bg-muted-foreground/30 mt-1" />;
}

function RunProgress({ agents }: { agents: any[] }) {
  const completed = agents.filter((a) => a.status === "completed").length;
  const total = AGENTS.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="mb-6 rounded-lg border bg-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-accent" /> Assessment running…</span>
        <span className="text-muted-foreground tabular-nums">{completed}/{total} agents complete</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="text-xs text-muted-foreground">{pct}% complete — results refresh automatically.</div>
    </div>
  );
}

function AgentTimeline({ agents, running }: { agents: any[]; running: boolean }) {
  const events = AGENTS.map((a) => {
    const r = agents.find((x: any) => x.agent_name === a.key);
    return { key: a.key, label: a.label, status: r?.status ?? "pending", started_at: r?.started_at, completed_at: r?.completed_at };
  }).filter((e) => e.status !== "pending" || running);

  if (events.length === 0) {
    return <div className="mt-6 text-xs text-muted-foreground">Timeline will appear once the run starts.</div>;
  }

  const fmt = (t?: string) => (t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");

  return (
    <div className="mt-6">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Live timeline</div>
      <ol className="relative border-l pl-6 space-y-3">
        {events.map((e) => (
          <li key={e.key} className="text-sm">
            <div className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full ring-2 ring-background ${e.status === "completed" ? "bg-success" : e.status === "running" ? "bg-accent animate-pulse" : e.status === "failed" ? "bg-destructive" : "bg-muted-foreground/30"}`} />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AgentStatusIcon status={e.status} />
                <span className="font-medium">{e.label}</span>
                <Badge variant="outline" className="capitalize text-[10px]">{e.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground tabular-nums">
                {e.status === "running" ? `started ${fmt(e.started_at)}` : e.completed_at ? `${fmt(e.started_at)} → ${fmt(e.completed_at)}` : fmt(e.started_at)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HealthCard({ recommendation, explanation, agents }: { recommendation: any; explanation: any; agents: any[] }) {
  const score = recommendation.overall_health_score as number;
  const scoreColor = score >= 78 ? "text-success" : score >= 60 ? "text-accent" : score >= 45 ? "text-warning-foreground" : "text-destructive";

  return (
    <div className="space-y-4">
      <Card className="bg-hero text-primary-foreground overflow-hidden">
        <CardContent className="p-8 grid gap-6 md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-primary-foreground/70">Health score</div>
            <div className={`text-5xl font-semibold tabular-nums mt-1 ${scoreColor.replace("text-", "text-")}`} style={{ color: "white" }}>{score}<span className="text-lg text-primary-foreground/60">/100</span></div>
            <div className="mt-2 text-xs text-primary-foreground/70">Confidence: <span className="capitalize">{recommendation.confidence_level}</span></div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-primary-foreground/70">Risk rating</div>
            <div className="text-2xl font-semibold mt-2">{recommendation.risk_rating}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-primary-foreground/70">Borrowing capacity</div>
            <div className="text-2xl font-semibold tabular-nums mt-2">{formatCurrency(recommendation.borrowing_capacity)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-primary-foreground/70">Suggested product</div>
            <div className="text-lg font-semibold mt-2">{recommendation.recommended_loan_product}</div>
          </div>
        </CardContent>
      </Card>

      {explanation?.reasons && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /> Why this recommendation?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {explanation.reasons.map((r: string, i: number) => (
                <li key={i} className="flex gap-2"><ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{r}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Agent findings breakdown</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {AGENTS.filter((a) => !["recommendation", "explainability"].includes(a.key)).map((a) => {
              const r = agents.find((x: any) => x.agent_name === a.key);
              if (!r?.output) return null;
              return (
                <AccordionItem key={a.key} value={a.key}>
                  <AccordionTrigger>{a.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(r.output).map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <div className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</div>
                          <div className="font-mono">{formatValue(v)}</div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function formatValue(v: any): string {
  if (Array.isArray(v)) return v.length ? v.map(formatValue).join(", ") : "—";
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AgentDataFlow({ agents }: { agents: any[] }) {
  const dataFlowMap: Record<string, string[]> = {
    financial_data: [],
    revenue_intelligence: ["financial_data"],
    cash_flow: ["financial_data", "revenue_intelligence"],
    compliance: ["financial_data"],
    payment_behaviour: ["financial_data", "cash_flow"],
    risk: ["financial_data", "revenue_intelligence", "cash_flow", "compliance", "payment_behaviour"],
    recommendation: ["risk", "revenue_intelligence", "cash_flow"],
    explainability: ["recommendation", "risk", "compliance", "payment_behaviour"],
  };

  const getAgentInfo = (key: string) => AGENTS.find((a) => a.key === key);
  const getAgentStatus = (key: string) => agents.find((a) => a.agent_name === key)?.status ?? "pending";

  return (
    <div className="mt-6">
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-4">Inter-agent data flow</div>
      <div className="grid gap-4">
        {AGENTS.map((agent) => {
          const dependencies = dataFlowMap[agent.key] || [];
          const status = getAgentStatus(agent.key);
          
          if (dependencies.length === 0) {
            return (
              <div key={agent.key} className="rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-medium">{agent.label}</div>
                  <Badge variant="outline" className="capitalize text-[10px]">{status}</Badge>
                </div>
              </div>
            );
          }

          const depAgents = dependencies.map((depKey) => {
            const depAgent = getAgentInfo(depKey);
            const depStatus = getAgentStatus(depKey);
            return { key: depKey, label: depAgent?.label || depKey, status: depStatus };
          });

          return (
            <div key={agent.key} className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium">{agent.label}</div>
                <Badge variant="outline" className="capitalize text-[10px]">{status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Receives data from:</div>
              <div className="flex flex-wrap gap-1">
                {depAgents.map((dep) => (
                  <span key={dep.key} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${dep.status === "completed" ? "bg-success/10 text-success" : dep.status === "running" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                    {dep.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
