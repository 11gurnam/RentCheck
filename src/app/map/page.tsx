import { AccountShell } from "@/components/ui/account-shell";
import { createDatabaseClient } from "@/lib/database/server";
import { RecordedMap, type MappedProperty } from "@/features/discovery/map";
export default async function MapPage() {
  const db = await createDatabaseClient();
  const { data, error } = await db.from("property_locations").select("property_id,latitude,longitude,precision").order("property_id").limit(100);
  if (error) throw new Error("Locations unavailable");
  const rows = await Promise.all((data ?? []).map(async l => {
    const { data, error } = await db.from("properties").select("id,name,is_demo").eq("id", l.property_id).maybeSingle();
    if (error) throw new Error("Map profile unavailable");
    return data ? { ...data, latitude: Number(l.latitude), longitude: Number(l.longitude), precision: l.precision } : null;
  }));
  return <AccountShell><h1>Recorded property locations.</h1><p>Only explicitly supplied coordinates appear. Approximate pins are not exact building locations. No address is converted into a location automatically. Up to 100 recorded locations are shown.</p><RecordedMap properties={rows.filter((p): p is MappedProperty => p !== null)} /><a href="/search">Back to search</a></AccountShell>;
}
