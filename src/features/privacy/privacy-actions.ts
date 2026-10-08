"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createDatabaseClient } from "@/lib/database/server";
import { createMediaClient } from "@/lib/database/privileged";
import { requireUser } from "@/lib/auth/session";
import { getSiteOrigin } from "@/lib/environment";
import { purgeMedia } from "./purge";
import { recentAuthentication } from "./recent-auth";
type State = { message?: string };
export async function recoverPassword(
  _: State,
  form: FormData,
): Promise<State> {
  const email = z.email().max(254).safeParse(form.get("email"));
  if (!email.success) return { message: "Enter a valid email address." };
  try {
    const { error } = await (
      await createDatabaseClient()
    ).auth.resetPasswordForEmail(email.data, {
      redirectTo: getSiteOrigin() + "/auth/confirm",
    });
    if (error)
      return { message: "Could not request recovery. Try again shortly." };
  } catch {
    return { message: "Account service unavailable. Try again shortly." };
  }
  return {
    message:
      "If that address has an account, a password recovery email has been sent. Open its link to choose a new password.",
  };
}
export async function changePassword(_: State, form: FormData): Promise<State> {
  await requireUser("/account/password");
  const v = z
    .object({
      password: z.string().min(10).max(128),
      confirmPassword: z.string(),
    })
    .refine((v) => v.password === v.confirmPassword)
    .safeParse(Object.fromEntries(form));
  if (!v.success)
    return { message: "Use 10–128 characters and matching passwords." };
  const db = await createDatabaseClient(),
    claims = await db.auth.getClaims();
  if (claims.error || !recentAuthentication(claims.data?.claims))
    return {
      message:
        "Sign out and sign in again, or open a new recovery email, before changing your password. Confirmation must be within ten minutes.",
    };
  const { error } = await db.auth.updateUser({ password: v.data.password });
  if (error)
    return {
      message:
        "Could not change your password. Try a different password or a fresh recovery link.",
    };
  await db.auth.signOut({ scope: "others" });
  revalidatePath("/account");
  return {
    message: "Password updated. Use the new password next time you sign in.",
  };
}
export async function deleteAccount(_: State, form: FormData): Promise<State> {
  const user = await requireUser("/account/privacy");
  if (
    form.get("confirmation") !== "DELETE MY ACCOUNT" ||
    form.get("understood") !== "on"
  )
    return {
      message:
        "Type DELETE MY ACCOUNT and confirm you understand the deletion.",
    };
  const db = await createDatabaseClient(),
    claims = await db.auth.getClaims();
  if (
    claims.error ||
    claims.data?.claims.sub !== user.id ||
    !recentAuthentication(claims.data?.claims)
  )
    return {
      message:
        "Sign out and sign in again before deleting your account. Confirmation must be within ten minutes.",
    };
  const service = createMediaClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error)
    return {
      message:
        "Account deletion could not be confirmed. Refresh and sign in to check, then retry if the account still exists.",
    };
  const complete = await purgeMedia(service, user.id);
  await db.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect(
    "/sign-in?notice=" +
      (complete ? "account-deleted" : "account-deleted-purge-pending"),
  );
}
export async function markNotificationRead(
  _: State,
  form: FormData,
): Promise<State> {
  await requireUser("/account/notifications");
  const id = z.uuid().safeParse(form.get("notification"));
  if (!id.success) return { message: "Notification unavailable." };
  const { error } = await (
    await createDatabaseClient()
  ).rpc("mark_notification_read", { p_notification: id.data });
  if (error) return { message: "Notification unavailable." };
  revalidatePath("/account/notifications");
  return { message: "Marked as read." };
}
