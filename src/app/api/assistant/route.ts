import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getPublicEnvironment, getSiteOrigin } from "@/lib/environment";
import { getVerifiedUser, isAdministrator } from "@/lib/auth/session";
import { createMediaClient } from "@/lib/database/privileged";
import { assistantRequest } from "@/features/assistant/schema";
import { answerAssistant } from "@/features/assistant/service";
import { isAdminQuestion } from "@/features/assistant/admin-intent";
import type { AssistantRole } from "@/features/assistant/admin-schema";
import { answerAdmin } from "@/features/assistant/admin-service";

const bodyLimit = 8192;
let localMinute = 0;
let localRequests = 0;

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      bytes += value.byteLength;
      if (bytes > bodyLimit) throw new Error("Body too large");
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel();
  }
}

async function reserveRequest(request: Request) {
  if (!getPublicEnvironment()) {
    const minute = Math.floor(Date.now() / 60000);
    if (localMinute !== minute) { localMinute = minute; localRequests = 0; }
    return ++localRequests <= 18;
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Assistant quota store unavailable");
  // Use a header only when the deployment proxy sets it and strips incoming copies.
  const trustedHeader = process.env.RENTCHECK_ASSISTANT_IP_HEADER || (process.env.NETLIFY ? "x-nf-client-connection-ip" : "");
  const clientIP = trustedHeader ? request.headers.get(trustedHeader) ?? "" : "";
  const account = isIP(clientIP) ? null : await getVerifiedUser();
  const identity = isIP(clientIP) ? `ip:${clientIP}` : account ? `user:${account.id}` : "anonymous";
  const bucket = createHmac("sha256", secret).update(identity).digest("hex");
  const { data, error } = await createMediaClient().rpc("reserve_assistant_request", { p_bucket: bucket });
  if (error) throw new Error("Assistant quota store unavailable");
  return data === true;
}

async function assistantViewer(): Promise<{ role: AssistantRole; viewer: string }> {
  const user = await getVerifiedUser();
  return {
    role: user && await isAdministrator() ? "admin" : "user",
    viewer: user ? createHash("sha256").update("rentcheck-assistant:" + user.id).digest("hex") : "guest",
  };
}

export async function GET() {
  return json(await assistantViewer());
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== new URL(request.url).origin && origin !== getSiteOrigin())) {
    return json({ message: "Open RentCheck to use the assistant." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ message: "Send a chat message as JSON." }, 415);
  }
  let body: unknown;
  try { body = await readBody(request); }
  catch { return json({ message: "I couldn’t read that message. Try a shorter question." }, 400); }
  const input = assistantRequest.safeParse(body);
  if (!input.success) return json({ message: "Enter a shorter message or start a new chat." }, 400);
  const viewer = await assistantViewer();
  try {
    if (!await reserveRequest(request)) {
      return json({ ...viewer, message: "The assistant has received several requests. Try again in a minute." }, 429, { "Retry-After": "60" });
    }
    if (viewer.role === "admin") {
      const reply = await answerAdmin(input.data);
      if (reply) return json({ ...reply, ...viewer, context: input.data.context });
    } else if (input.data.adminContext || (input.data.message && isAdminQuestion(input.data.message))) {
      return json({ ...viewer, message: "That information is available to RentCheck administrators." }, 403);
    }
    const reply = await answerAssistant(input.data);
    return json({ ...reply, ...viewer, adminContext: viewer.role === "admin" ? input.data.adminContext : undefined });
  } catch {
    return json({ ...viewer, message: "I couldn’t get that information right now. Try again in a moment." }, 503);
  }
}
