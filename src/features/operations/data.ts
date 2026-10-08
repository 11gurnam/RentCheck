import "server-only";
import { createDatabaseClient } from "@/lib/database/server";
export async function operationMode() {
  const { data, error } = await (await createDatabaseClient()).rpc("get_operation_mode");
  if (error || !data || typeof data.accepts_real_data !== "boolean") throw new Error("Intake configuration unavailable");
  return data as { accepts_real_data: boolean; evidence_retention_days: number };
}
