import "server-only";
import { redirect } from "next/navigation";
import { createDatabaseClient } from "@/lib/database/server";
import { getPublicEnvironment } from "@/lib/environment";
import { safeDestination } from "@/features/accounts/validation";

export async function getVerifiedUser() {
  if (!getPublicEnvironment()) return null;
  try {
    const client = await createDatabaseClient();
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}

export async function requireUser(destination = "/account") {
  const user = await getVerifiedUser();
  if (!user)
    redirect(
      `/sign-in?next=${encodeURIComponent(safeDestination(destination))}`,
    );
  return user;
}

export async function getOwnProfile() {
  try {
    const client = await createDatabaseClient();
    const { data, error } = await client.rpc("get_my_account");
    if (error || !data?.[0]) return null;
    return data[0] as {
      profile_id: string;
      public_alias: string;
      is_administrator: boolean;
    };
  } catch {
    return null;
  }
}

export async function isAdministrator() {
  try {
    const client = await createDatabaseClient();
    const { data, error } = await client.rpc("is_administrator");
    return !error && data === true;
  } catch {
    return false;
  }
}
