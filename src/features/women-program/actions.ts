"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { genderOptions, optionalRating, ratingFields } from "./fields";

type Feedback = { status?: "success" | "error"; message?: string };

function refreshScores() {
  revalidatePath("/properties", "layout");
  revalidatePath("/search");
  revalidatePath("/compare");
  revalidatePath("/saved");
  revalidatePath("/admin");
}

export async function saveWomenPreferences(_: Feedback, form: FormData): Promise<Feedback> {
  await requireUser();
  const parsed = z.object({
    gender: z.union([z.literal(""), z.enum(genderOptions.map(([value]) => value))]),
    description: z.string().trim().max(100),
    tenancy: z.enum(["", "current", "former", "none"]),
  }).safeParse({
    gender: form.get("gender"), description: form.get("description") ?? "", tenancy: form.get("tenancy") ?? "",
  });
  if (!parsed.success) return { status: "error", message: "Check your private profile answers." };
  const { gender, description, tenancy } = parsed.data;
  const optedIn = gender === "woman" && (tenancy === "current" || tenancy === "former") && form.get("opt_in") === "on";
  const db = await createDatabaseClient();
  const { error } = await db.rpc("set_my_women_program", {
    p_gender: gender || null, p_description: description || null, p_tenancy: tenancy || null, p_opted_in: optedIn,
  });
  if (error) return { status: "error", message: "We couldn’t save your private preferences." };
  revalidatePath("/account");
  refreshScores();
  return { status: "success", message: "Private preferences saved." };
}

export async function saveWomenFeedback(_: Feedback, form: FormData): Promise<Feedback> {
  await requireUser("/account/reviews");
  const review = z.uuid().safeParse(form.get("review"));
  if (!review.success) return { status: "error", message: "Review unavailable." };
  const remove = form.get("intent") === "remove";
  const comment = z.string().trim().max(1500).safeParse(form.get("comment") ?? "");
  const ratings: Record<string, number> = {};
  if (!remove) {
    if (!comment.success || form.get("consent") !== "on")
      return { status: "error", message: "Check your feedback and confirm consent for this review." };
    for (const [key] of ratingFields) {
      const value = form.get(key);
      if (optionalRating(key) && value === "") continue;
      if (typeof value !== "string" || !/^[1-5]$/.test(value))
        return { status: "error", message: "Choose a rating from 1 to 5 for each required category." };
      ratings[key] = Number(value);
    }
  }
  const db = await createDatabaseClient();
  const { error } = await db.rpc("set_my_women_feedback", {
    p_review: review.data, p_ratings: remove ? null : ratings,
    p_comment: remove ? null : comment.data || null, p_consent: !remove,
  });
  if (error) return { status: "error", message: "We couldn’t save your feedback. Check your program enrollment and review status." };
  revalidatePath(`/reviews/${review.data}/edit`);
  refreshScores();
  return { status: "success", message: remove ? "Your women’s program feedback was withdrawn." : "Private feedback saved for this tenancy." };
}
