import { it, expect } from "vitest";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { localBackendConfiguration } from "../helpers/local-backend";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { cleanupReviewUser } from "../helpers/review-cleanup";
const c = localBackendConfiguration();
if (!c) throw new Error("Local backend required");
it("reports, stable management snapshots and atomic merge conflict resolutions through real API", async () => {
  const service = createClient(c.url, c.serviceKey, {
    auth: { persistSession: false },
  });
  const users: string[] = [],
    clients: (typeof service)[] = [],
    properties: string[] = [],
    paths: string[] = [];
  let manager: string | undefined;
  const historic = "10000000-0000-4000-8000-000000000004",
    current = "10000000-0000-4000-8000-000000000001";
  try {
    for (let n = 0; n < 3; n++) {
      const email = "moderation-api-" + crypto.randomUUID() + "@example.test",
        password = "Synthetic moderation password";
      const u = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      expect(u.error).toBeNull();
      users.push(u.data.user!.id);
      const client = createClient(c.url, c.publicKey, {
        auth: { persistSession: false },
      });
      expect(
        (await client.auth.signInWithPassword({ email, password })).error,
      ).toBeNull();
      clients.push(client);
    }
    fixtureAdmin(users[2], true);
    for (let n = 0; n < 2; n++) {
      const p = await clients[1].rpc("create_property", {
        p_input: {
          name: "Fictional merge " + n + " " + crypto.randomUUID(),
          address: "Invented merge lane " + crypto.randomUUID(),
          state: "Delhi",
          city: "Merge test city",
          locality: "Fictional locality",
          type: "Flat",
          min: 1000,
          max: 2000,
          declaredOwner: n === 0,
          synthetic: true,
        },
        p_acknowledged: true,
      });
      expect(p.error).toBeNull();
      properties.push(p.data);
    }
    const [source, target] = properties;
    const a = await clients[2].rpc("maintain_association", {
      p_property: source,
      p_landlord: historic,
      p_start: "2020-01-01",
      p_end: null,
      p_replace: null,
      p_reason: "Synthetic original management period",
    });
    expect(a.error).toBeNull();
    expect(a.data).toMatch(/^[a-f0-9-]{36}$/);
    expect(
      (
        await clients[2].rpc("maintain_association", {
          p_property: target,
          p_landlord: current,
          p_start: "2020-01-01",
          p_end: null,
          p_replace: null,
          p_reason: "Synthetic target management period",
        })
      ).error,
    ).toBeNull();
    const input = {
      start: "2021-01-01",
      end: "2022-01-01",
      current: false,
      paid: 1500,
      propertyRating: 4,
      managerRating: 2,
      body: "Synthetic preserved review with historic management snapshot.",
      synthetic: true,
    };
    const r1 = await clients[0].rpc("create_review", {
        p_input: { ...input, property: source },
      }),
      r2 = await clients[0].rpc("create_review", {
        p_input: { ...input, property: target },
      });
    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
    expect(
      (
        await clients[0].rpc("maintain_association", {
          p_property: source,
          p_landlord: current,
          p_start: "2022-01-01",
          p_end: null,
          p_replace: a.data,
          p_reason: "Unauthorized manager change attempt",
        })
      ).error?.code,
    ).toBe("42501");

    expect(
      (
        await clients[2].rpc("maintain_association", {
          p_property: source,
          p_landlord: current,
          p_start: "2022-01-01",
          p_end: null,
          p_replace: null,
          p_reason: "Synthetic overlapping period rejected",
        })
      ).error?.code,
    ).toBe("23P01");
    expect(
      (
        await clients[2].rpc("maintain_association", {
          p_property: source,
          p_landlord: current,
          p_start: "2022-01-01",
          p_end: null,
          p_replace: a.data,
          p_reason: "Synthetic correction preserving old snapshots",
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("get_review_feed", { p_property: source })).data[0]
        .landlord_id,
    ).toBe(historic);
    for (const p of properties)
      expect(
        (
          await clients[0].rpc("set_saved_property", {
            p_property: p,
            p_saved: true,
          })
        ).error,
      ).toBeNull();
    expect(
      (
        await clients[1].rpc("report_review", {
          p_review: r1.data.id,
          p_reason: "Synthetic concern pending investigation",
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("get_review_feed", { p_property: source })).data,
    ).toHaveLength(1);
    const reports = await clients[2].rpc("get_admin_reports");
    expect(reports.error).toBeNull();
    const report = reports.data.find(
      (r: { review: string }) => r.review === r1.data.id,
    );
    expect(
      (
        await clients[0].rpc("decide_report", {
          p_report: report.id,
          p_decision: "removed",
          p_reason: "Unauthorized report removal attempt",
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await clients[2].rpc("decide_report", {
          p_report: report.id,
          p_decision: "kept",
          p_reason: "Synthetic investigation found reason to retain review",
        })
      ).error,
    ).toBeNull();
    const jpeg = await sharp({
        create: { width: 320, height: 240, channels: 3, background: "white" },
      })
        .jpeg()
        .toBuffer(),
      claims: string[] = [];
    for (const property of properties) {
      const doc = crypto.randomUUID(),
        path = "claim/" + doc + ".jpg";
      paths.push(path);
      expect(
        (
          await service.storage
            .from("rental-documents")
            .upload(path, jpeg, { contentType: "image/jpeg" })
        ).error,
      ).toBeNull();
      const claim = await service.rpc("register_claim_document", {
        p_user: users[1],
        p_property: property,
        p_landlord: null,
        p_document: doc,
      });
      expect(claim.error).toBeNull();
      claims.push(claim.data);
    }
    expect(
      (
        await clients[2].rpc("decide_claim", {
          p_claim: claims[0],
          p_decision: "approved",
          p_reason: "Synthetic ownership evidence approved",
        })
      ).error,
    ).toBeNull();
    const args = {
      p_source: source,
      p_target: target,
      p_archive: [],
      p_revoke: [],
      p_history: "target",
      p_details: "target",
      p_reason: "Synthetic duplicate merge reviewed explicitly",
    };
    expect((await clients[0].rpc("merge_properties", args)).error?.code).toBe(
      "42501",
    );
    expect(
      (await clients[2].rpc("merge_properties", args)).error?.message,
    ).toContain("overlapping tenancies");
    expect(
      (
        await clients[2].rpc("merge_properties", {
          ...args,
          p_archive: [r2.data.id],
        })
      ).error?.message,
    ).toContain("conflicting active claims");
    // Both refusals roll back all writes, saves, claims and public visibility.
    expect(
      (await clients[0].from("properties").select("id").in("id", properties))
        .data,
    ).toHaveLength(2);
    expect(
      (await clients[0].rpc("get_saved_properties")).data.filter(
        (p: { property_id: string }) => properties.includes(p.property_id),
      ),
    ).toHaveLength(2);
    expect(
      (
        await clients[2].rpc("merge_properties", {
          ...args,
          p_archive: [r2.data.id],
          p_revoke: [claims[1]],
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].from("properties").select("id").eq("id", source)).data,
    ).toHaveLength(0);
    const feed = await clients[0].rpc("get_review_feed", {
      p_property: target,
    });
    expect(feed.data).toHaveLength(1);
    expect(feed.data[0].id).toBe(r1.data.id);
    expect(feed.data[0].landlord_id).toBe(historic);
    expect(feed.data[0].body).toBe(input.body);
    expect(
      (await clients[0].rpc("get_saved_properties")).data.filter(
        (p: { property_id: string }) => properties.includes(p.property_id),
      ),
    ).toEqual([{ property_id: target }]);
    const own = await clients[0].rpc("get_my_reviews");
    expect(
      own.data.find((r: { id: string }) => r.id === r2.data.id).status,
    ).toBe("removed");
    const claimRows = await clients[1].rpc("get_my_claims");
    expect(
      claimRows.data.find((r: { id: string }) => r.id === claims[0])
        .property_id,
    ).toBe(target);
    expect(
      (
        await clients[2].rpc("decide_claim", {
          p_claim: claims[0],
          p_decision: "revoked",
          p_reason: "Synthetic representative revocation after merge",
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await clients[1].rpc("create_review", {
          p_input: {
            ...input,
            property: target,
            start: "2024-01-01",
            end: "2024-12-01",
          },
        })
      ).error?.code,
    ).toBe("42501");
    expect(
      (
        await clients[1].rpc("report_review", {
          p_review: r1.data.id,
          p_reason: "Synthetic final moderation removal test",
        })
      ).error,
    ).toBeNull(); // existing kept report is idempotent
    expect(
      (
        await clients[0].rpc("report_review", {
          p_review: r1.data.id,
          p_reason: "Synthetic new investigation of retained review",
        })
      ).error,
    ).toBeNull();
    const newReports = await clients[2].rpc("get_admin_reports");
    const pending = newReports.data.find(
      (r: { review: string; status: string }) =>
        r.review === r1.data.id && r.status === "pending",
    );
    expect(
      (
        await clients[2].rpc("decide_report", {
          p_report: pending.id,
          p_decision: "removed",
          p_reason: "Synthetic administrator reasoned removal",
        })
      ).error,
    ).toBeNull();
    expect(
      (await clients[0].rpc("get_review_feed", { p_property: target })).data,
    ).toHaveLength(0);
    expect(
      (
        await clients[0]
          .from("property_scores")
          .select("*")
          .eq("property_id", target)
      ).data?.[0]?.property_rating ?? null,
    ).toBeNull();
    const audit = await clients[2].rpc("get_admin_audit");
    expect(
      audit.data.some(
        (e: { action: string; entity_id: string }) =>
          e.action === "property_merge" && e.entity_id === target,
      ),
    ).toBe(true);
    expect((await clients[0].rpc("get_admin_audit")).error?.code).toBe("42501");
    const raceProperties: string[] = [];
    for (let n = 0; n < 2; n++) {
      const p = await clients[0].rpc("create_property", {
        p_input: {
          name: "Fictional race merge " + crypto.randomUUID(),
          address: "Invented race merge lane " + crypto.randomUUID(),
          state: "Delhi",
          city: "Merge race city",
          locality: "Fictional locality",
          type: "Flat",
          min: 1000,
          max: 2000,
          synthetic: true,
        },
        p_acknowledged: true,
      });
      expect(p.error).toBeNull();
      properties.push(p.data);
      raceProperties.push(p.data);
    }
    const [merged, created] = await Promise.all([
      clients[2].rpc("merge_properties", {
        ...args,
        p_source: raceProperties[0],
        p_target: raceProperties[1],
      }),
      clients[0].rpc("create_review", {
        p_input: { ...input, property: raceProperties[0], managerRating: null },
      }),
    ]);
    expect(merged.error).toBeNull();
    expect(
      (
        await clients[0].rpc("get_review_feed", {
          p_property: raceProperties[0],
        })
      ).data,
    ).toHaveLength(0);
    const racedFeed = await clients[0].rpc("get_review_feed", {
      p_property: raceProperties[1],
    });
    expect(racedFeed.data).toHaveLength(created.error ? 0 : 1);
    const managerInput = {
      p_name: "Fictional manager " + crypto.randomUUID(),
      p_description: "Synthetic management profile",
      p_acknowledged: false,
      p_reason: "Synthetic administrator manager creation",
    };
    expect(
      (await clients[0].rpc("create_manager_profile", managerInput)).error
        ?.code,
    ).toBe("42501");
    const made = await clients[2].rpc("create_manager_profile", managerInput);
    expect(made.error).toBeNull();
    manager = made.data;
    expect(
      (await clients[2].rpc("create_manager_profile", managerInput)).error
        ?.message,
    ).toContain("already exists");
  } finally {
    if (manager)
      expect(
        (await service.from("landlords").delete().eq("id", manager)).error,
      ).toBeNull();
    if (paths.length)
      await service.storage.from("rental-documents").remove(paths);
    for (const u of users) {
      cleanupReviewUser(u);
      expect((await service.auth.admin.deleteUser(u)).error).toBeNull();
    }
    if (properties.length) {
      expect(
        (
          await service
            .from("management_associations")
            .delete()
            .in("property_id", properties)
        ).error,
      ).toBeNull();
      expect(
        (await service.from("properties").delete().in("id", properties)).error,
      ).toBeNull();
    }
  }
});
