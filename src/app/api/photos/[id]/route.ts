import { createMediaClient } from "@/lib/database/privileged";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404 });
  const media = createMediaClient();
  const { data: path, error } = await media.rpc("get_photo_path", {
    p_photo: id,
  });
  if (error || !path)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const { data, error: downloadError } = await media.storage
    .from("review-photos")
    .download(path);
  if (downloadError || !data) return new Response(null, { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
