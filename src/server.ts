import "./lib/error-capture";

import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

const LOCAL_UPLOAD_BASE = path.resolve(process.cwd(), "local_uploads");
const LOCAL_UPLOAD_SECRET = process.env.LOCAL_UPLOAD_SECRET || "creditcrew-local-upload-secret";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isValidLocalKey(key: string) {
  const normalized = path.posix.normalize(key.replace(/\\/g, "/"));
  return !normalized.startsWith("../") && !path.isAbsolute(normalized) && /^[a-zA-Z0-9_.\-/]+$/.test(normalized);
}

function verifyLocalSignature(key: string, expires: string | null, sig: string | null) {
  if (!expires || !sig) return false;
  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  const expected = crypto
    .createHmac("sha256", LOCAL_UPLOAD_SECRET)
    .update(`${key}|${expiresAt}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(sig, "hex"));
}

async function handleLocalDocumentRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/local-documents/")) return null;

  const key = url.searchParams.get("key");
  const expires = url.searchParams.get("expires");
  const sig = url.searchParams.get("sig");

  if (!key || !isValidLocalKey(key) || !verifyLocalSignature(key, expires, sig)) {
    return new Response("Invalid or missing key/signature", { status: 400 });
  }

  const normalized = path.normalize(key);
  const filePath = path.join(LOCAL_UPLOAD_BASE, normalized);

  if (url.pathname === "/api/local-documents/upload") {
    if (request.method !== "PUT") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const buffer = Buffer.from(await request.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    return new Response(null, { status: 200 });
  }

  if (url.pathname === "/api/local-documents/download") {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    try {
      const data = await fs.readFile(filePath);
      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Content-Disposition", `attachment; filename="${path.basename(normalized)}"`);
      return new Response(data, { status: 200, headers });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }

  return new Response("Not Found", { status: 404 });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const localResponse = await handleLocalDocumentRequest(request);
      if (localResponse) return localResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
