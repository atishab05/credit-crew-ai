import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createApplication } from "@/lib/creditcrew.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications/new")({
  component: NewApplication,
});

function NewApplication() {
  const navigate = useNavigate();
  const create = useServerFn(createApplication);
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentRef, setConsentRef] = useState("");
  const [retention, setRetention] = useState(365);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await create({
        data: {
          applicant_name: name,
          pan: pan.toUpperCase(),
          gstin: gstin.toUpperCase(),
          consent_given: true,
          consent_reference: consentRef,
          retention_days: retention,
        },
      });
      toast.success("Application created");
      navigate({ to: "/applications/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create application");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy &&
    name.length >= 2 &&
    pan.length === 10 &&
    gstin.length === 15 &&
    consent &&
    consentRef.trim().length >= 3;

  return (
    <div className="p-6 lg:p-10 max-w-2xl">
      <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to dashboard
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>New MSME assessment</CardTitle>
          <CardDescription>
            Enter basic identifiers and record borrower consent. Data is processed under the DPDP Act 2023
            and RBI Digital Lending Guidelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Applicant / entity name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ashirwad Textiles Pvt Ltd" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>PAN</Label>
              <Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="font-mono uppercase" maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} placeholder="27AAAAA0000A1Z5" className="font-mono uppercase" maxLength={15} />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <div className="flex items-start gap-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-accent mt-0.5" /> Consent &amp; retention (DPDP)
            </div>
            <div className="space-y-2">
              <Label>Consent artefact reference</Label>
              <Input
                value={consentRef}
                onChange={(e) => setConsentRef(e.target.value)}
                placeholder="e.g. AA consent handle or signed form ID"
              />
              <p className="text-xs text-muted-foreground">
                Store the Account Aggregator consent handle, e-signature ID or physical form reference so it can be produced during audit.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Retention window (days)</Label>
              <Input
                type="number"
                min={30}
                max={3650}
                value={retention}
                onChange={(e) => setRetention(Math.max(30, Math.min(3650, Number(e.target.value) || 365)))}
              />
              <p className="text-xs text-muted-foreground">
                After this window, the borrower may request erasure of personal data associated with this assessment.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
              <span>
                I confirm the borrower has given explicit, informed consent to fetch and process
                GST, UPI, Account Aggregator, EPFO, Electricity, Fuel and Digital Footprint data
                for the purpose of this credit assessment.
              </span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={submit} disabled={!canSubmit}>
              {busy ? "Creating…" : "Create & continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
