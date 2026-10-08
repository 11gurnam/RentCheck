import { z } from "zod";
import { createDatabaseClient } from "@/lib/database/server";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    v = z
      .object({ property: z.uuid(), start: z.iso.date() })
      .safeParse(Object.fromEntries(params));
  if (!v.success)
    return Response.json(
      { message: "Choose a property and valid tenancy start date." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const { data, error } = await (
    await createDatabaseClient()
  ).rpc("preview_review_landlord", {
    p_property: v.data.property,
    p_start: v.data.start,
  });
  if (error)
    return Response.json(
      { message: "Landlord preview unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return Response.json(
    { landlord: data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
