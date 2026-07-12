import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, Download, FileText, ShieldCheck, Loader2, Lock } from "lucide-react";
import {
  isS3Configured,
  getUploadUrl,
  registerDocument,
  listDocuments,
  getDownloadUrl,
} from "@/lib/documents.functions";

function fmtBytes(n?: number | null) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentsPanel({ applicationId }: { applicationId: string }) {
  const qc = useQueryClient();
  const cfg = useServerFn(isS3Configured);
  const list = useServerFn(listDocuments);
  const sign = useServerFn(getUploadUrl);
  const register = useServerFn(registerDocument);
  const download = useServerFn(getDownloadUrl);

  const cfgQ = useQuery({ queryKey: ["s3-configured"], queryFn: () => cfg() });
  const docsQ = useQuery({
    queryKey: ["documents", applicationId],
    queryFn: () => list({ data: { application_id: applicationId } }),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const dlMut = useMutation({
    mutationFn: (id: string) => download({ data: { application_id: applicationId, document_id: id } }),
    onSuccess: (r) => {
      const a = document.createElement("a");
      a.href = r.download_url;
      a.download = r.filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    onError: (e: any) => toast.error(e?.message ?? "Download failed"),
  });

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const { upload_url, method, s3_key } = await sign({
        data: {
          application_id: applicationId,
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        },
      });
      const putRes = await fetch(upload_url, {
        method,
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
      if (!putRes.ok) {
        const t = await putRes.text();
        throw new Error(`Upload rejected by S3 [${putRes.status}]: ${t.slice(0, 200)}`);
      }
      await register({
        data: {
          application_id: applicationId,
          s3_key,
          filename: file.name,
          content_type: file.type || undefined,
          size_bytes: file.size,
        },
      });
      toast.success("Uploaded to encrypted S3 bucket");
      qc.invalidateQueries({ queryKey: ["documents", applicationId] });
      qc.invalidateQueries({ queryKey: ["application", applicationId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const configured = cfgQ.data?.configured;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" /> Supporting documents
        </CardTitle>
        <CardDescription>
          Stored in an encrypted AWS S3 bucket with server-side encryption (SSE) and audit logging when AWS is connected.
          When AWS is unavailable, files are stored locally on the app server for hackathon/demo use.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Secure storage not connected</AlertTitle>
            <AlertDescription>
              A workspace admin can link the Amazon S3 connector to enable document uploads.
              Uploads never touch the app server — the browser uploads directly to S3 via a
              short-lived signed URL issued by the backend.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={!configured || busy}
          >
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {busy ? "Uploading…" : "Upload document"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Max 25&nbsp;MB per file. Common formats: PDF, JPG, PNG, XLSX.
          </span>
        </div>

        <div className="rounded-md border divide-y">
          {docsQ.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading documents…</div>
          ) : (docsQ.data ?? []).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No documents uploaded yet.
            </div>
          ) : (
            (docsQ.data as any[]).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtBytes(d.size_bytes)} · uploaded {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!configured || dlMut.isPending}
                  onClick={() => dlMut.mutate(d.id)}
                >
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
