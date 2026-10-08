import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { z } from "zod";
import { operationMode } from "@/features/operations/data";
import {
  AssociationForm,
  ManagerForm,
  type Profile,
  type History,
} from "@/features/moderation/forms";
export default async function AssociationsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  await requireUser("/admin");
  if (!(await isAdministrator()))
    return (
      <AccountShell>
        <h1>Access restricted.</h1>
      </AccountShell>
    );
  const db = await createDatabaseClient(),
    params = await searchParams;
  const real = (await operationMode()).accepts_real_data;
  const [p, l] = await Promise.all([
    db.from("properties").select("id,name").order("name"),
    db.from("landlords").select("id,name").order("name"),
  ]);
  if (p.error || l.error) throw new Error("Profiles unavailable");
  const chosen = z.uuid().safeParse(params.property).success
    ? (p.data as Profile[]).find((x) => x.id === params.property)
    : null;
  let history: History[] = [];
  if (chosen) {
    const h = await db
      .from("management_associations")
      .select("*")
      .eq("property_id", chosen.id)
      .order("start_date");
    if (h.error) throw new Error("History unavailable");
    history = h.data;
  }
  return (
    <AccountShell>
      <h1>Maintain management history</h1>
      <p>
        Periods cannot overlap. Replacing a period archives its old association;
        existing tenancy reviews keep their original manager snapshots.
      </p>
      <form method="get" className="auth-form">
        <label>
          Property
          <select name="property" defaultValue={params.property}>
            {(p.data as Profile[]).map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <button>Inspect management history</button>
      </form>
      {chosen && (
        <section className="dashboard-card">
          <h2>{chosen.name}</h2>
          {history.map((h) => (
            <p key={h.id}>
              {(l.data as Profile[]).find((x) => x.id === h.landlord_id)?.name}{" "}
              · {h.start_date} → {h.end_date ?? "Ongoing"}
            </p>
          ))}
          <AssociationForm
            property={chosen.id}
            managers={l.data}
            history={history}
          />
        </section>
      )}
      <section className="dashboard-card">
        <h2>{real ? "Add a manager profile" : "Add a fictional manager"}</h2>
        <p>
          Inspect the existing manager names above first. Exact duplicate names
          are refused; similar names require acknowledgement.
        </p>
        <ManagerForm real={real} />
      </section>
    </AccountShell>
  );
}
