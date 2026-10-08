import { getVerifiedUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getVerifiedUser();
  if (!user)
    return new Response(null, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const { data: path, error } = await (
    await createDatabaseClient()
  ).rpc("get_authorized_document", { p_document: id });
  if (error || !path)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const { data, error: downloadError } = await createMediaClient()
    .storage.from("rental-documents")
    .download(path);
  if (downloadError || !data) return new Response(null, { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": path.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      "Content-Disposition":
        'attachment; filename="rental-evidence.' +
        (path.endsWith(".pdf") ? 'pdf"' : 'jpg"'),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
