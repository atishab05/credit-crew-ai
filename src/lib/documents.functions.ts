import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

function ensureS3Env() {
  const lovable = process.env.LOVABLE_API_KEY;
  const s3 = process.env.AWS_S3_API_KEY;
  if (!lovable || !s3) {
    throw new Error(
      "AWS S3 is not connected for this project. A workspace admin must link the Amazon S3 connector to enable secure document uploads.",
    );
  }
  return { lovable, s3 };
}

export const isS3Configured = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return { configured: Boolean(process.env.AWS_S3_API_KEY && process.env.LOVABLE_API_KEY) };
  });

async function assertApplicationOwnership(context: any, application_id: string) {
  const { data, error } = await (context.supabase as any)
    .from("applications")
    .select("id, loan_officer_id")
    .eq("id", application_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.loan_officer_id !== context.userId) throw new Error("Application not found");
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120);
}

export const getUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      filename: z.string().min(1).max(200),
      content_type: z.string().max(120).optional(),
      size_bytes: z.number().int().nonnegative().max(25 * 1024 * 1024).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertApplicationOwnership(context, data.application_id);
    const { lovable, s3 } = ensureS3Env();

    const key = `applications/${data.application_id}/${Date.now()}_${safeFilename(data.filename)}`;
    const res = await fetch(`${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=write`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovable}`,
        "X-Connection-Api-Key": s3,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ object_path: key }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Could not create upload URL [${res.status}]: ${body}`);
    }
    const { url, expires_in, method } = await res.json();
    return { upload_url: url as string, method: (method as string) ?? "PUT", expires_in, s3_key: key };
  });

export const registerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      application_id: z.string().uuid(),
      s3_key: z.string().min(1),
      filename: z.string().min(1),
      content_type: z.string().optional(),
      size_bytes: z.number().int().nonnegative().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertApplicationOwnership(context, data.application_id);
    const s = context.supabase as any;
    const { data: doc, error } = await s
      .from("documents")
      .insert({
        application_id: data.application_id,
        uploaded_by: context.userId,
        s3_key: data.s3_key,
        filename: data.filename,
        content_type: data.content_type ?? null,
        size_bytes: data.size_bytes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await s.from("audit_logs").insert({
      application_id: data.application_id,
      action: "document_uploaded",
      actor_id: context.userId,
      details: { filename: data.filename, s3_key: data.s3_key, size_bytes: data.size_bytes ?? null },
    });
    return doc;
  });

export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ application_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertApplicationOwnership(context, data.application_id);
    const { data: docs, error } = await (context.supabase as any)
      .from("documents")
      .select("*")
      .eq("application_id", data.application_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (docs ?? []) as any[];
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ application_id: z.string().uuid(), document_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertApplicationOwnership(context, data.application_id);
    const { lovable, s3 } = ensureS3Env();
    const { data: doc, error } = await (context.supabase as any)
      .from("documents")
      .select("*")
      .eq("id", data.document_id)
      .eq("application_id", data.application_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) throw new Error("Document not found");

    const res = await fetch(`${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovable}`,
        "X-Connection-Api-Key": s3,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ object_path: doc.s3_key }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Could not create download URL [${res.status}]: ${body}`);
    }
    const { url, expires_in } = await res.json();
    return { download_url: url as string, expires_in, filename: doc.filename as string };
  });
