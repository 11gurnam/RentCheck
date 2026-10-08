"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { operationMode } from "@/features/operations/data";
import {
  contributionSchema,
  type ContributionState,
  type Duplicate,
} from "./validation";
export async function contribute(
  _previous: ContributionState,
  form: FormData,
): Promise<ContributionState> {
  await requireUser("/properties/new");
  const parsed = contributionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      message: parsed.error.issues
        .map((i) => `${i.path.join(" ")}: ${i.message}`)
        .join(" "),
    };
  const input = parsed.data;
  const recordMode = form.get("recordMode");
  if (recordMode !== "demo" && recordMode !== "real") return { status: "error", message: "Reload the contribution form to confirm the record type." };
  if (recordMode === "real" && !(await operationMode()).accepts_real_data) return { status: "error", message: "Real-data intake is currently disabled." };
  let id: string;
  try {
    const db = await createDatabaseClient();
    const check = await db.rpc("find_property_duplicates", {
      p_state: input.state,
      p_city: input.city,
      p_address: input.address,
      p_name: input.name,
    });
    if (check.error) throw check.error;
    const candidates = check.data as Duplicate[];
    if (candidates.some((c) => c.exact))
      return {
        status: "error",
        message:
          "This address already has a profile. Open the existing place below.",
        candidates,
      };
    if (candidates.length && input.acknowledged !== "on")
      return {
        status: "error",
        message:
          "Please review these likely duplicates before adding a distinct place.",
        candidates,
      };
    const result = await db.rpc("create_property", {
      p_input: {
        ...input,
        synthetic: recordMode === "demo",
        consent: true,
        declaredOwner: input.declaredOwner === "on",
      },
      p_acknowledged: input.acknowledged === "on",
    });
    if (result.error) throw result.error;
    id = result.data;
  } catch {
    return {
      status: "error",
      message:
        "We couldn’t add this place. It may have just been added by someone else; check search and try again.",
    };
  }
  revalidatePath("/search");
  redirect(`/properties/${id}`);
}
export async function saveProperty(
  _previous: { message?: string },
  form: FormData,
) {
  const id = String(form.get("property"));
  const { z } = await import("zod");
  if (!z.uuid().safeParse(id).success) return { message: "Invalid property." };
  await requireUser(`/properties/${id}`);
  try {
    const db = await createDatabaseClient();
    const { error } = await db.rpc("set_saved_property", {
      p_property: id,
      p_saved: form.get("saved") === "true",
    });
    if (error) throw error;
  } catch {
    return { message: "We couldn’t update your shortlist. Please try again." };
  }
  revalidatePath(`/properties/${id}`);
  revalidatePath("/saved");
  return {
    message:
      form.get("saved") === "true"
        ? "Added to your shortlist."
        : "Removed from your shortlist.",
  };
}
