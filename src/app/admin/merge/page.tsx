import { AccountShell } from "@/components/ui/account-shell";
import { requireUser, isAdministrator } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { z } from "zod";
import {
  MergeForm,
  type Profile,
  type Preview,
} from "@/features/moderation/forms";
export default async function MergePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; target?: string; notice?: string }>;
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
  const { data, error } = await db
    .from("properties")
    .select("id,name")
    .order("name");
  if (error) throw new Error("Profiles unavailable");
  const profiles = data as Profile[];
  let preview: Preview | null = null;
  if (
    z.uuid().safeParse(params.source).success &&
    z.uuid().safeParse(params.target).success &&
    params.source !== params.target
  ) {
    const r = await db.rpc("get_merge_preview", {
      p_source: params.source,
      p_target: params.target,
    });
    if (r.error) throw new Error("Preview unavailable");
    preview = r.data;
  }
  return (
    <AccountShell>
      <h1>Inspect a property merge</h1>
      {params.notice === "merged" && (
        <p role="status">
          Profiles merged transactionally. Source archived; decisions and
          previous records retained.
        </p>
      )}
      <form method="get" className="auth-form">
        <label>
          Source profile to archive
          <select name="source" defaultValue={params.source} required>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target profile to keep
          <select name="target" defaultValue={params.target} required>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button>Inspect both profiles</button>
      </form>
      {preview && preview.profiles.length === 2 ? (
        <section className="dashboard-card">
          <h2>Review the proposed resolutions</h2>
          {preview.profiles.map((p) => (
            <article key={p.id}>
              <h3>
                {p.id === params.source ? "Source" : "Target"}: {p.name}
              </h3>
              <p>
                {p.address} · ₹{p.rent_min}–₹{p.rent_max}
              </p>
              <p>{p.description}</p>
            </article>
          ))}
          <h3>Active management periods</h3>
          {preview.associations.map((a) => (
            <p key={a.id}>
              {a.property_id === params.source ? "Source" : "Target"} ·{" "}
              {a.landlord_id} · {a.start_date} → {a.end_date ?? "Ongoing"}
            </p>
          ))}
          <MergeForm
            source={params.source!}
            target={params.target!}
            preview={preview}
          />
        </section>
      ) : (
        <p>
          Choose two different published profiles to inspect. A merged source is
          archived and unavailable publicly.
        </p>
      )}
    </AccountShell>
  );
}
