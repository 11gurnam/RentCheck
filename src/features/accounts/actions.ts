"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { createDatabaseClient } from "@/lib/database/server";
import { getSiteOrigin } from "@/lib/environment";
import { requireUser } from "@/lib/auth/session";
import {
  aliasSchema,
  registerSchema,
  signInSchema,
  safeDestination,
  type FormState,
} from "./validation";

function invalidFields(error: ZodError): FormState {
  return {
    status: "error",
    message: "Please check the highlighted fields.",
    fieldErrors: Object.fromEntries(
      error.issues.map((issue) => [issue.path[0], issue.message]),
    ),
  };
}
const unavailable: FormState = {
  status: "error",
  message:
    "We couldn’t connect to the account service. Please try again shortly.",
};

export async function signIn(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = signInSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!input.success) return invalidFields(input.error);
  try {
    const client = await createDatabaseClient();
    const { error } = await client.auth.signInWithPassword(input.data);
    if (error)
      return {
        status: "error",
        message:
          "We couldn’t sign you in. Check your email and password, and confirm your email if you just registered.",
      };
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect(safeDestination(form.get("next")));
}

export async function register(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const input = registerSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    confirmPassword: form.get("confirmPassword"),
    alias: form.get("alias"),
  });
  if (!input.success) return invalidFields(input.error);
  let hasSession: boolean;
  try {
    const client = await createDatabaseClient();
    const { email, password, alias } = input.data;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { public_alias: alias },
        emailRedirectTo: `${getSiteOrigin()}/auth/callback?next=/account`,
      },
    });
    if (error)
      return {
        status: "error",
        message:
          "We couldn’t create the account. Try again shortly, or sign in if you already registered.",
      };
    hasSession = !!data.session;
  } catch {
    return unavailable;
  }
  if (hasSession) {
    revalidatePath("/", "layout");
    redirect("/account");
  }
  return {
    status: "success",
    message:
      "Check your email for a confirmation link. Once confirmed, sign in to continue. If you already have an account, you can sign in instead.",
  };
}

export async function updateAlias(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  await requireUser();
  const input = aliasSchema.safeParse(form.get("alias"));
  if (!input.success)
    return {
      status: "error",
      fieldErrors: { alias: input.error.issues[0].message },
      message: "Please check your public alias.",
    };
  try {
    const client = await createDatabaseClient();
    const { error } = await client.rpc("set_public_alias", {
      requested_alias: input.data,
    });
    if (error)
      return {
        status: "error",
        message: "We couldn’t save your alias. Please try again.",
      };
  } catch {
    return unavailable;
  }
  revalidatePath("/account");
  return { status: "success", message: "Your public alias has been saved." };
}

export async function signOut(): Promise<FormState> {
  try {
    const client = await createDatabaseClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return unavailable;
  } catch {
    return unavailable;
  }
  revalidatePath("/", "layout");
  redirect("/sign-in?notice=signed-out");
}

export async function signInWithGoogle(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (process.env.GOOGLE_AUTH_ENABLED !== "true")
    return {
      status: "error",
      message:
        "Google sign-in isn’t available yet. Please use email and password.",
    };
  let destination: string;
  try {
    const client = await createDatabaseClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent(safeDestination(form.get("next")))}`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) return unavailable;
    destination = data.url;
  } catch {
    return unavailable;
  }
  redirect(destination);
}
