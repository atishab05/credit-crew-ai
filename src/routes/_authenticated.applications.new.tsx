import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createApplication } from "@/lib/creditcrew.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/applications/new")({
  component: NewApplication,
});

function NewApplication() {
  const navigate = useNavigate();
  const create = useServerFn(createApplication);
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await create({ data: { applicant_name: name, pan: pan.toUpperCase(), gstin: gstin.toUpperCase() } });
      toast.success("Application created");
      navigate({ to: "/applications/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-2xl">
      <Link to="/dashboard" className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4"><ArrowLeft className="h-3 w-3" /> Back to dashboard</Link>
      <Card>
        <CardHeader>
          <CardTitle>New MSME assessment</CardTitle>
          <CardDescription>Enter basic identifiers to open a case. You'll connect data sources next.</CardDescription>
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
          <div className="pt-2 flex justify-end">
            <Button onClick={submit} disabled={busy || !name || pan.length !== 10 || gstin.length !== 15}>
              {busy ? "Creating…" : "Create & continue"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
