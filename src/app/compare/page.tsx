import { AccountShell } from "@/components/ui/account-shell";
import { getProperty } from "@/features/discovery/data";
import { PropertyComparison } from "@/features/discovery/compare";
import { createDatabaseClient } from "@/lib/database/server";
export default async function ComparePage() {
  const { data, error } = await (await createDatabaseClient()).from("properties").select("id").order("name").limit(100);
  if (error) throw new Error("Comparison unavailable");
  const rows = await Promise.all((data ?? []).map(p => getProperty(p.id)));
  return <AccountShell><h1>Compare accommodation.</h1><p>Compare up to three published properties. Ratings remain separate from management ratings. The first 100 published profiles are available here.</p><PropertyComparison properties={rows.filter(p => p !== null)} /><p><a href="/search">Explore accommodation</a> · <a href="/map">Recorded locations</a></p></AccountShell>;
}
