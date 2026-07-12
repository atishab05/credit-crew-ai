import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, FileText, Cloud, ArrowLeft, KeyRound, Database, Users, Network, Package } from "lucide-react";


export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Trust & Compliance — CreditCrew AI" },
      {
        name: "description",
        content:
          "How CreditCrew AI is built for RBI, SEBI and DPDP alignment on AWS, with tenant isolation, encryption, consent and audit-ready decision logs.",
      },
      { property: "og:title", content: "Trust & Compliance — CreditCrew AI" },
      { property: "og:description", content: "RBI, SEBI and DPDP-aligned MSME underwriting on AWS." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CompliancePage,
});

function CompliancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 space-y-10">
        <section>
          <Badge className="mb-3">Trust & Compliance</Badge>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
            Production-ready underwriting, built for regulated Indian lending
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            This page is maintained by the CreditCrew AI team to summarise the current
            security and privacy controls of the app. It describes the platform capabilities
            enabled today; it is not an independent certification.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5 text-accent" /> AWS-native deployment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                CreditCrew AI is designed to run inside a bank's own AWS environment.
                Documents are uploaded directly from the browser to an Amazon S3 bucket
                via short-lived, server-issued pre-signed URLs — application servers
                never see the file bytes.
              </p>
              <p>
                Analytical workloads target Amazon Athena on S3 data lakes, so lenders
                can point CreditCrew at existing GST / bureau / bank-statement lakes
                without moving data out of their AWS account.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-accent" /> RBI &amp; SEBI alignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                The workflow is built to fit RBI's Digital Lending Guidelines and the
                Account Aggregator framework: every data pull is tied to an explicit
                borrower consent artefact and an immutable audit trail.
              </p>
              <p>
                Loan officers remain the decisioning authority — every AI recommendation
                is accompanied by a human-in-the-loop approval, rejection or
                documents-requested action, all timestamped in the audit log.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-accent" /> DPDP Act 2023</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Personal data is collected only for the stated underwriting purpose,
                with borrower consent captured at intake. PAN and GSTIN are masked in
                list views and shown in full only to the assigned loan officer.
              </p>
              <p>
                A retention window is recorded with every application so data
                principals can request erasure once the purpose is met.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-accent" /> Tenant isolation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Row-level security policies scope every applicant, connection,
                document and audit entry to the owning loan officer. Server-side
                checks re-verify ownership on every privileged action.
              </p>
              <p>
                Secrets (AWS keys, service credentials) live in the platform's secret
                store — never in application code and never returned to the browser.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-accent" /> Encryption &amp; storage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Data in transit is protected end-to-end with TLS 1.2+. Objects at rest
                in S3 use server-side encryption (SSE); the primary database enforces
                encryption at rest and daily point-in-time backups.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> Auditability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Every application event — creation, data-source connection, agent
                completion, document upload, decision — is written to an append-only
                audit table with actor, timestamp and structured details, ready for
                supervisor review or regulatory inspection.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-accent" /> Shared responsibility</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                CreditCrew AI provides the platform controls listed above. The
                deploying bank is responsible for its own AWS account hardening,
                key-management policies, network perimeter, regulatory reporting and
                for configuring retention periods and role assignments that match its
                internal policies.
              </p>
              <p>
                For a technical deep-dive, architecture diagram or a copy of the
                data-processing addendum, contact the CreditCrew AI team.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* AWS reference architecture */}
        <section className="space-y-4">
          <div>
            <Badge variant="outline" className="mb-2">Reference architecture</Badge>
            <h2 className="text-2xl font-semibold">AWS-native, deployable in the bank's own account</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              CreditCrew AI ships as a container that runs on Amazon ECS Fargate inside the bank's VPC in <span className="font-mono">ap-south-1</span> (data localisation).
              All egress to the IDBI sandbox APIs goes over private links; the public edge is fronted by CloudFront and AWS WAF.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Network className="h-4 w-4 text-accent" /> Component map</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted/50 rounded p-4 overflow-x-auto leading-relaxed">
{`  Internet ─▶ CloudFront ─▶ AWS WAF ─▶ ALB ─┐
                                            ▼
                                   ECS Fargate (app tasks)
                                   ├─▶ RDS Postgres (Multi-AZ, KMS, PITR)
                                   ├─▶ S3 + KMS  (documents, audit logs / Object Lock)
                                   ├─▶ Secrets Manager (adapter API keys, mTLS)
                                   ├─▶ CloudWatch Logs + Alarms
                                   └─▶ VPC Endpoint / PrivateLink ─▶ IDBI sandbox APIs`}
              </pre>
              <div className="text-xs text-muted-foreground mt-3">
                Full IaC (Terraform modules for network, data, compute, edge, observability, IAM), Dockerfile, and a GitHub Actions OIDC deploy pipeline live in <span className="font-mono">terraform/</span>, <span className="font-mono">docker/</span> and <span className="font-mono">.github/workflows/</span> respectively.
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sandbox integration model */}
        <section className="space-y-4">
          <div>
            <Badge variant="outline" className="mb-2">Sandbox integration</Badge>
            <h2 className="text-2xl font-semibold">Wired for IDBI's synthetic datasets &amp; internal APIs</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
              Every alternative data source is fronted by a typed adapter. The app runs in <span className="font-mono">mock</span> mode out of the box and flips to <span className="font-mono">sandbox</span> mode once IDBI's endpoints and credentials are injected via environment variables — no code change required.
            </p>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2">Source</th>
                      <th className="text-left px-4 py-2">Adapter module</th>
                      <th className="text-left px-4 py-2">Sandbox env vars</th>
                      <th className="text-left px-4 py-2">Fallback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      { s: "GST", m: "src/lib/adapters/gst.ts", e: "IDBI_GST_BASE_URL, IDBI_GST_API_KEY" },
                      { s: "UPI", m: "src/lib/adapters/upi.ts", e: "IDBI_UPI_BASE_URL, IDBI_UPI_API_KEY" },
                      { s: "Account Aggregator", m: "src/lib/adapters/aa.ts", e: "IDBI_AA_BASE_URL, IDBI_AA_API_KEY, IDBI_AA_CONSENT_HANDLE" },
                      { s: "EPFO", m: "src/lib/adapters/epfo.ts", e: "IDBI_EPFO_BASE_URL, IDBI_EPFO_API_KEY" },
                      { s: "Electricity", m: "src/lib/adapters/electricity.ts", e: "IDBI_ELEC_BASE_URL, IDBI_ELEC_API_KEY" },
                    ].map((r) => (
                      <tr key={r.s}>
                        <td className="px-4 py-2 font-medium">{r.s}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.m}</td>
                        <td className="px-4 py-2 font-mono text-xs">{r.e}</td>
                        <td className="px-4 py-2 text-muted-foreground">Deterministic mock</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-muted-foreground p-4 border-t">
                mTLS: adapters accept <span className="font-mono">IDBI_MTLS_CERT</span>, <span className="font-mono">IDBI_MTLS_KEY</span>, <span className="font-mono">IDBI_MTLS_CA</span> secrets when IDBI requires client certificates. Egress IPs and CIDRs to allowlist are pinned by the NAT gateway provisioned in <span className="font-mono">terraform/modules/network</span>.
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Handover artifacts */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4 text-accent" /> Handover bundle for IDBI engineering</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>The following artifacts are shipped alongside the app source, ready for review by the bank's engineering and infosec teams:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-mono">terraform/</span> — VPC, RDS, ECS Fargate, S3+KMS, CloudFront, WAFv2, Secrets Manager, IAM, CloudWatch. Split into modules with <span className="font-mono">dev / uat / prod</span> tfvars.</li>
                <li><span className="font-mono">docker/Dockerfile</span> — multi-stage build; pushed to ECR by <span className="font-mono">.github/workflows/deploy.yml</span> via OIDC (no long-lived AWS keys).</li>
                <li><span className="font-mono">docs/ARCHITECTURE.md</span>, <span className="font-mono">RUNBOOK.md</span>, <span className="font-mono">SECURITY_CONTROLS.md</span>, <span className="font-mono">SANDBOX_INTEGRATION.md</span>, <span className="font-mono">HANDOVER.md</span> — bank-review-ready markdown, PDF-convertible with pandoc.</li>
                <li><span className="font-mono">make zip</span> produces a single self-contained handover archive for offline submission.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

      </main>

      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CreditCrew AI. Trust page maintained by the app owner.
      </footer>
    </div>
  );
}
