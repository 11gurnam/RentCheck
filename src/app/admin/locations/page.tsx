import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { LocationForm } from "@/features/discovery/location-form";
export default async function LocationsAdminPage() {
  await requireUser("/admin");
  if (!(await isAdministrator())) return <AccountShell><h1>Access restricted.</h1></AccountShell>;
  const db = await createDatabaseClient(), { data, error } = await db.from("properties").select("id,name").order("name").limit(100);
  const locations = await db.from("property_locations").select("*").limit(100);
  if (error || locations.error) throw new Error("Location administration unavailable");
  return <AccountShell><h1>Maintain property coordinates.</h1><p>Enter coordinates from a checked source, identify it in the reason and choose the correct precision. Do not invent a position from an address. Exact locations become public.</p><LocationForm properties={data ?? []} /><h2>Recorded coordinates</h2>{locations.data?.map(l => <p key={l.property_id}>{data?.find(p => p.id === l.property_id)?.name}: {l.latitude}, {l.longitude} ({l.precision})</p>)}</AccountShell>;
}
