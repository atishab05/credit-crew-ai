import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { fetchMetadata, healthCheck as adapterHealthCheck } from "@/lib/adapters";
import { getAllDataSourceSettings } from "@/lib/data-source-settings.server";


const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const CreateInput = z.object({
  applicant_name: z.string().min(2).max(120),
  pan: z.string().regex(PAN, "Invalid PAN format (e.g. ABCDE1234F)"),
  gstin: z.string().regex(GSTIN, "Invalid GSTIN format"),
  consent_given: z.literal(true, { errorMap: () => ({ message: "Borrower consent is required (DPDP)" }) }),
  consent_reference: z.string().min(3).max(120),
  retention_days: z.number().int().min(30).max(3650).default(365),
});

export const createApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const retention_until = new Date(now.getTime() + data.retention_days * 24 * 60 * 60 * 1000);
    const { data: app, error } = await (supabase as any)
      .from("applications")
      .insert({
        loan_officer_id: userId,
        applicant_name: data.applicant_name,
        pan: data.pan.toUpperCase(),
        gstin: data.gstin.toUpperCase(),
        consent_given: true,
        consent_reference: data.consent_reference,
        consent_at: now.toISOString(),
        retention_until: retention_until.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const sources = ["gst", "upi", "aa", "epfo"];
    await (supabase as any).from("data_connections").insert(
      sources.map((s) => ({ application_id: app.id, source: s, status: "pending" })),
    );
    await (supabase as any).from("audit_logs").insert({
      application_id: app.id,
      action: "application_created",
      actor_id: userId,
      details: {
        applicant_name: data.applicant_name,
        consent_reference: data.consent_reference,
        retention_days: data.retention_days,
      },
    });
    return { id: app.id as string };
  });

export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

export const getApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase as any;
    const [app, conns, agents, audit] = await Promise.all([
      s.from("applications").select("*").eq("id", data.id).maybeSingle(),
      s.from("data_connections").select("*").eq("application_id", data.id).order("source"),
      s.from("agent_results").select("*").eq("application_id", data.id).order("started_at"),
      s.from("audit_logs").select("*").eq("application_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (app.error) throw new Error(app.error.message);
    if (!app.data) throw new Error("Application not found");
    return {
      application: app.data,
      connections: conns.data ?? [],
      agents: agents.data ?? [],
      audit: audit.data ?? [],
    };
  });

export const connectSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      source: z.enum(["gst", "upi", "aa", "epfo"]),
      simulateFailure: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as any;

    const resetRow = {
      application_id: data.application_id,
      source: data.source,
      status: "pending",
      connected_at: null,
      metadata: null,
    };

    const { error: initError } = await s
      .from("data_connections")
      .upsert(resetRow, { onConflict: ["application_id", "source"] });
    if (initError) throw new Error(initError.message);

    const { data: app } = await s.from("applications").select("pan,gstin").eq("id", data.application_id).maybeSingle();
    const ctx = { applicantId: data.application_id, pan: app?.pan ?? "", gstin: app?.gstin ?? "" };

    let status: "connected" | "failed" = "connected";
    let metadata: any = null;
    let mode: "mock" | "sandbox" = "mock";

    if (data.simulateFailure) {
      status = "failed";
      metadata = { error: "Sandbox API unreachable", mode };
    } else {
      try {
        // Health-check sandbox reachability before pulling data.
        const hc = await adapterHealthCheck(data.source);
        mode = hc.mode;
        if (!hc.ok) throw new Error(hc.error ?? "health check failed");
        metadata = { ...(await fetchMetadata(data.source, ctx)), mode };
      } catch (e: any) {
        status = "failed";
        metadata = { error: e?.message ?? "adapter failure", mode };
      }
    }

    const { error } = await s
      .from("data_connections")
      .upsert(
        {
          application_id: data.application_id,
          source: data.source,
          status,
          connected_at: new Date().toISOString(),
          metadata,
        },
        { onConflict: ["application_id", "source"] },
      );
    if (error) throw new Error(error.message);
    return { ok: true, status, mode, metadata };
  });


export const submitDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      decision: z.enum(["approved", "rejected", "documents_requested"]),
      notes: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as any;
    const statusMap: Record<string, string> = {
      approved: "approved",
      rejected: "rejected",
      documents_requested: "documents_requested",
    };
    const { error } = await s
      .from("applications")
      .update({
        decision: data.decision,
        decision_notes: data.notes ?? null,
        decided_at: new Date().toISOString(),
        status: statusMap[data.decision],
      })
      .eq("id", data.application_id);
    if (error) throw new Error(error.message);
    await s.from("audit_logs").insert({
      application_id: data.application_id,
      action: "decision_made",
      actor_id: context.userId,
      details: { decision: data.decision, notes: data.notes ?? null },
    });
    return { ok: true };
  });

// ---------- Agent simulation ----------

function seededRand(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function buildMockConnectionMetadata(source: string, seed: string) {
  const rand = seededRand(seed + source);
  const months = Array.from({ length: 12 }, (_, i) => {
    const base = 800000 + Math.floor(rand() * 900000);
    return { month: i + 1, value: Math.round(base * (0.7 + rand() * 0.6)) };
  });
  if (source === "gst") return { annual_turnover: months.reduce((s, m) => s + m.value, 0), months, filings_on_time_pct: 82 + Math.floor(rand() * 15) };
  if (source === "upi") return { monthly_collections: months, collection_velocity_days: 6 + Math.floor(rand() * 10) };
  if (source === "aa") return { avg_balance: 400000 + Math.floor(rand() * 800000), cash_conversion_days: 30 + Math.floor(rand() * 40) };
  return { employees: 8 + Math.floor(rand() * 40), on_time_pf_pct: 88 + Math.floor(rand() * 10) };
}

async function upsertAgent(s: any, application_id: string, agent_name: string, status: string, output: any = null) {
  const patch: any = { status };
  if (status === "completed" || status === "failed") patch.completed_at = new Date().toISOString();
  if (output) patch.output = output;
  const { data: existing } = await s
    .from("agent_results")
    .select("id")
    .eq("application_id", application_id)
    .eq("agent_name", agent_name)
    .maybeSingle();
  if (existing) {
    await s.from("agent_results").update(patch).eq("id", existing.id);
  } else {
    await s.from("agent_results").insert({ application_id, agent_name, ...patch });
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export const runAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ application_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const s = context.supabase as any;
    const application_id = data.application_id;

    const { data: app } = await s.from("applications").select("*").eq("id", application_id).maybeSingle();
    if (!app) throw new Error("Application not found");

    await s.from("applications").update({ status: "analysis_running", overall_health_score: null, risk_rating: null, borrowing_capacity: null, recommended_loan_product: null, confidence_level: null }).eq("id", application_id);
    await s.from("agent_results").delete().eq("application_id", application_id);
    await s.from("audit_logs").insert({ application_id, action: "assessment_started", actor_id: context.userId, details: {} });

    const { data: conns } = await s.from("data_connections").select("*").eq("application_id", application_id);
    const available = (conns ?? []).filter((c: any) => c.status === "connected");
    const rand = seededRand(app.pan);

    const gst = available.find((c: any) => c.source === "gst")?.metadata ?? null;
    const upi = available.find((c: any) => c.source === "upi")?.metadata ?? null;
    const aa = available.find((c: any) => c.source === "aa")?.metadata ?? null;
    const epfo = available.find((c: any) => c.source === "epfo")?.metadata ?? null;

    const agentOutputs: Record<string, any> = {};

    const steps: { name: string; run: () => any }[] = [
      { name: "financial_data", run: () => ({ sources_connected: available.map((c: any) => c.source), annual_turnover: gst?.annual_turnover ?? Math.round(6_000_000 + rand() * 8_000_000), employees: epfo?.employees ?? 12 }) },
      { name: "revenue_intelligence", run: () => {
        const months = gst?.months ?? upi?.monthly_collections ?? [];
        const values = months.map((m: any) => m.value);
        const avg = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 1_200_000;
        const growth = values.length >= 2 ? Math.round(((values.at(-1) - values[0]) / values[0]) * 100) : Math.round(rand() * 20 - 5);
        const stability = Math.max(30, 90 - Math.abs(growth));
        return { avg_monthly_revenue: Math.round(avg), yoy_growth_pct: growth, stability_score: stability, series: values };
      } },
      { name: "cash_flow", run: () => ({ liquidity_ratio: +(1.1 + rand() * 1.2).toFixed(2), cash_conversion_days: aa?.cash_conversion_days ?? 45, working_capital_gap: Math.round(200000 + rand() * 500000) }) },
      { name: "compliance", run: () => ({ gst_filings_on_time_pct: gst?.filings_on_time_pct ?? 78, tax_consistency: rand() > 0.3 ? "consistent" : "minor_variances", late_filings_last_12m: Math.floor(rand() * 3) }) },
      { name: "payment_behaviour", run: () => ({ upi_collection_velocity_days: upi?.collection_velocity_days ?? 9, supplier_payment_on_time_pct: 70 + Math.floor(rand() * 25), avg_ticket_size: Math.round(2500 + rand() * 4000) }) },
      { name: "risk", run: () => {
        const flags: string[] = [];
        const conc = 30 + Math.round(rand() * 45);
        if (conc > 55) flags.push(`Top customer concentration ${conc}%`);
        if (rand() > 0.75) flags.push("Revenue anomaly detected in Q2");
        if (available.length < 4) flags.push(`${4 - available.length} data source(s) unavailable`);
        return { concentration_risk_pct: conc, anomaly_flags: flags, fraud_signals: 0 };
      } },
    ];

    for (const step of steps) {
      await upsertAgent(s, application_id, step.name, "running");
      await sleep(450);
      const out = step.run();
      agentOutputs[step.name] = out;
      await upsertAgent(s, application_id, step.name, "completed", out);
      await s.from("audit_logs").insert({ application_id, action: "agent_completed", actor_id: context.userId, details: { agent: step.name } });
    }

    // Recommendation
    await upsertAgent(s, application_id, "recommendation", "running");
    await sleep(500);
    const rev = agentOutputs.revenue_intelligence;
    const cf = agentOutputs.cash_flow;
    const comp = agentOutputs.compliance;
    const pb = agentOutputs.payment_behaviour;
    const risk = agentOutputs.risk;

    const revScore = Math.min(100, rev.stability_score * 0.6 + Math.max(0, rev.yoy_growth_pct + 10) * 2);
    const cfScore = Math.min(100, cf.liquidity_ratio * 30 + (60 - Math.min(60, cf.cash_conversion_days)));
    const compScore = comp.gst_filings_on_time_pct - comp.late_filings_last_12m * 5;
    const pbScore = 100 - Math.min(60, pb.upi_collection_velocity_days * 4) + (pb.supplier_payment_on_time_pct - 70) * 0.5;
    const riskPenalty = risk.concentration_risk_pct * 0.4 + risk.anomaly_flags.length * 6;

    const raw = revScore * 0.30 + cfScore * 0.25 + compScore * 0.20 + pbScore * 0.15 - riskPenalty * 0.5 + 20;
    const health = Math.max(20, Math.min(96, Math.round(raw)));
    const risk_rating = health >= 78 ? "Low" : health >= 60 ? "Moderate" : health >= 45 ? "Elevated" : "High";
    const capacity = Math.round(rev.avg_monthly_revenue * 0.30 * 12 * (health / 100));
    const product = cf.liquidity_ratio < 1.4 ? "Working Capital Loan" : health >= 75 ? "Term Loan" : rev.yoy_growth_pct > 12 ? "Equipment Finance" : "Overdraft Facility";
    const confidence = available.length === 4 ? "high" : available.length >= 2 ? "medium" : "low";

    const recOutput = {
      overall_health_score: health,
      risk_rating,
      borrowing_capacity: capacity,
      recommended_loan_product: product,
      confidence_level: confidence,
      component_scores: { revenue: Math.round(revScore), cash_flow: Math.round(cfScore), compliance: Math.round(compScore), payment_behaviour: Math.round(pbScore), risk_penalty: Math.round(riskPenalty) },
    };
    agentOutputs.recommendation = recOutput;
    await upsertAgent(s, application_id, "recommendation", "completed", recOutput);

    // Explainability
    await upsertAgent(s, application_id, "explainability", "running");
    await sleep(400);
    const reasons: string[] = [];
    reasons.push(`Average monthly revenue estimated at ₹${(rev.avg_monthly_revenue / 100000).toFixed(1)}L with ${rev.yoy_growth_pct}% YoY movement.`);
    reasons.push(`Liquidity ratio ${cf.liquidity_ratio} and cash conversion of ${cf.cash_conversion_days} days ${cf.liquidity_ratio < 1.4 ? "signal working-capital pressure" : "indicate healthy working capital"}.`);
    reasons.push(`GST filings ${comp.gst_filings_on_time_pct}% on-time with ${comp.late_filings_last_12m} late in last 12 months.`);
    reasons.push(`UPI collection velocity of ${pb.upi_collection_velocity_days} days and ${pb.supplier_payment_on_time_pct}% on-time supplier payments.`);
    if (risk.anomaly_flags.length) reasons.push(`Risk flags: ${risk.anomaly_flags.join("; ")}.`);
    reasons.push(`Borrowing capacity capped at 30% of annualised revenue, adjusted by health score ${health}/100 → ₹${(capacity / 100000).toFixed(1)}L.`);
    if (confidence !== "high") reasons.push(`Confidence marked ${confidence} because ${4 - available.length} data source(s) were unavailable.`);

    const explOutput = { reasons };
    await upsertAgent(s, application_id, "explainability", "completed", explOutput);

    await s.from("applications").update({
      status: "analysis_complete",
      overall_health_score: health,
      risk_rating,
      borrowing_capacity: capacity,
      recommended_loan_product: product,
      confidence_level: confidence,
    }).eq("id", application_id);

    await s.from("audit_logs").insert({ application_id, action: "assessment_completed", actor_id: context.userId, details: { health, risk_rating, capacity } });

    return { ok: true, health, risk_rating, capacity, product, confidence };
  });
