import { expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { fixtureAdmin } from "../helpers/admin-fixture";
import { localBackendConfiguration } from "../helpers/local-backend";

it("keeps rental statements, verified tenancies and women’s feedback independent", async () => {
  const config = localBackendConfiguration();
  if (!config) throw new Error("Isolated backend required");
  const client = (key: string) => createClient(config.url, key, { auth: { persistSession: false } });
  const service = client(config.serviceKey);
  const anonymous = client(config.publicKey);
  const people: { id: string; api: ReturnType<typeof client> }[] = [];
  const documents: string[] = [];
  let property: string | null = null;
  const ratings = { neighbourhood: 5, security: 5, privacy: 5, conditions: 5, fair_treatment: 5, overall: 5, recommendation: 5 };
  try {
    for (let i = 0; i < 7; i++) {
      const email = `women-program-${crypto.randomUUID()}@example.test`;
      const password = "Synthetic private preferences password";
      const user = await service.auth.admin.createUser({ email, password, email_confirm: true });
      expect(user.error).toBeNull();
      const api = client(config.publicKey);
      people.push({ id: user.data.user!.id, api });
      expect((await api.auth.signInWithPassword({ email, password })).error).toBeNull();
    }
    const admin = people[5];
    const landlord = people[6];
    fixtureAdmin(admin.id, true);
    expect((await anonymous.rpc("get_my_women_program")).error).not.toBeNull();
    expect((await anonymous.rpc("get_admin_rental_preferences")).error).not.toBeNull();
    expect((await people[0].api.rpc("get_admin_rental_preferences")).error?.code).toBe("42501");
    expect((await people[0].api.rpc("get_admin_women_program")).error?.code).toBe("42501");
    expect((await admin.api.rpc("get_admin_women_program")).error).toBeNull();

    const name = "Program fixture " + crypto.randomUUID().slice(0, 8);
    const preferences = ["women","couples","female_bachelors"];
    const created = await landlord.api.rpc("create_property", { p_input: {
      name, declaredOwner: true, tenantPreferences: preferences,
      address: "Synthetic recommendation lane " + crypto.randomUUID(), state: "Delhi",
      city: "New Delhi", locality: "Test area", type: "Flat", min: 1000, max: 2500, synthetic: true,
    } });
    expect(created.error).toBeNull();
    property = created.data;
    const summary = () => anonymous.rpc("get_women_property_summary", { p_property: property });
    const counts = () => anonymous.rpc("womens_recommendation_counts", { p_property: property });
    const facts = async () => {
      const result = await anonymous.rpc("get_public_property_information", { p_properties: [property] });
      expect(result.error).toBeNull();
      return result.data[0];
    };
    const search = async (filters: Record<string, unknown>) => {
      const result = await anonymous.rpc("search_properties_facets", { p_query: name, ...filters });
      expect(result.error).toBeNull();
      return result.data.map((row: { id: string }) => row.id);
    };
    let firstReview: string | undefined;
    let lastRequest: string | undefined;
    const evidence = await sharp({ create: { width: 400, height: 300, channels: 3, background: "white" } }).jpeg().toBuffer();
    expect(await facts()).toMatchObject({ preferences: [], verified_count: 0, women: null });
    expect(await search({ p_preferences: ["women"] })).toEqual([]);
    expect((await landlord.api.rpc("set_property_rental_preferences", { p_property: property, p_values: ["anyone"] })).error?.code).toBe("42501");
    const claimDoc = crypto.randomUUID();
    const claimPath = `claim/${claimDoc}.jpg`;
    documents.push(claimPath);
    expect((await service.storage.from("rental-documents").upload(claimPath,evidence,{ contentType:"image/jpeg" })).error).toBeNull();
    const claim = await service.rpc("register_claim_document", {
      p_user: landlord.id, p_property: property, p_landlord: null, p_document: claimDoc,
    });
    expect(claim.error).toBeNull();
    const approve = { p_claim: claim.data, p_decision: "approved", p_reason: "Synthetic representative evidence reviewed." };
    expect((await admin.api.rpc("decide_claim", approve)).error).toBeNull();
    expect(await search({ p_preferences: preferences })).toEqual([property]);
    expect(await search({ p_preferences: ["women","students"] })).toEqual([]);
    expect(await search({ p_preferences: ["women"], p_verification: "reviews" })).toEqual([]);
    expect(await search({ p_preferences: ["women"], p_women: "recommended" })).toEqual([]);
    const change = (actor: typeof landlord, values: string[]) =>
      actor.api.rpc("set_property_rental_preferences", { p_property: property, p_values: values });
    expect((await change(people[0],["anyone"])).error?.code).toBe("42501");
    expect((await change(landlord,["anyone","women"])).error?.code).toBe("22023");
    expect((await change(landlord,["anyone"])).error).toBeNull();
    expect(await search({ p_preferences: ["students","women"] })).toEqual([property]);
    expect((await change(landlord,preferences)).error).toBeNull();
    const audit = await admin.api.rpc("get_admin_audit_search", { p_filters: { entity: property, action: "rental_preferences_updated" } });
    expect(audit.data?.total).toBe(3);

    for (const [i, person] of people.slice(0, 5).entries()) {
      const former = i === 0;
      const review = await person.api.rpc("create_review", { p_input: {
        property, start: "2020-01-01", end: former ? "2021-01-01" : "", current: !former,
        paid: 1500, propertyRating: 2, body: "A synthetic tenancy recommendation fixture.",
        woman: true, recommend: true, synthetic: true,
      } });
      expect(review.error).toBeNull();
      const id = review.data.id as string;
      firstReview ??= id;
      const feedback = {
        p_review: id, p_ratings: former ? { ...ratings, security: null, overall: 1, recommendation: 1 } : ratings,
        p_comment: "Private synthetic note", p_consent: true,
      };
      expect((await person.api.rpc("set_my_women_feedback", feedback)).error?.code).toBe("42501");
      expect((await person.api.rpc("set_my_women_program", {
        p_gender: "woman", p_tenancy: former ? "former" : "current", p_description: null, p_opted_in: true,
      })).error).toBeNull();
      expect((await person.api.rpc("set_my_women_feedback", { ...feedback, p_ratings: { ...ratings, security: 6 } })).error?.code).toBe("22023");
      expect((await person.api.rpc("set_my_women_feedback", { ...feedback, p_consent: null })).error?.code).toBe("42501");
      expect((await person.api.rpc("set_my_women_feedback", feedback)).error).toBeNull();
      expect((await person.api.rpc("get_my_women_program", { p_review: id })).data.feedback.comment).toBe("Private synthetic note");
      expect((await admin.api.rpc("get_my_women_program", { p_review: id })).data.feedback).toBeNull();
      const pending = await summary();
      expect(pending.error).toBeNull();
      expect(pending.data).toBeNull();
      const document = crypto.randomUUID();
      const file = `verification/${document}.jpg`;
      documents.push(file);
      expect((await service.storage.from("rental-documents").upload(file, evidence, { contentType: "image/jpeg" })).error).toBeNull();
      const request = await service.rpc("register_verification_document", {
        p_user: person.id, p_review: id, p_document: document,
      });
      expect(request.error).toBeNull();
      lastRequest = request.data;
      expect((await admin.api.rpc("decide_verification", {
        p_request: request.data, p_decision: "approved", p_reason: "Fictional test evidence approved for this tenancy.",
      })).error).toBeNull();
    }

    const published = await summary();
    expect(published.error).toBeNull();
    expect(published.data).toMatchObject({ count: 5, rating: 4.2, categories: { neighbourhood: 5 }, recent: {} });
    expect(published.data.categories).not.toHaveProperty("security");
    expect(published.data.recommendation).toBeGreaterThan(3.5);
    expect(published.data.categories).not.toHaveProperty("landlord");
    expect(JSON.stringify(published.data)).not.toContain("Private synthetic note");
    expect((await counts()).data?.[0]).toMatchObject({ eligible_count: 5, recommended: true });
    expect(await facts()).toMatchObject({ verified_count: 5, current_count: 4, former_count: 1, women_recommended: true });
    expect(await search({ p_preferences: preferences,p_verification:"former",p_women:"recommended" })).toEqual([property]);
    expect(await search({ p_verification:"current",p_women:"reviews" })).toEqual([property]);
    expect(await search({ p_women:"safety" })).toEqual([]);
    expect((await anonymous.rpc("get_admin_women_property_feedback", { p_property: property })).error).not.toBeNull();
    const administrative = await admin.api.rpc("get_admin_women_property_feedback", { p_property: property });
    expect(administrative.data.ratings).toHaveLength(5);
    expect(JSON.stringify(administrative.data)).not.toContain("Private synthetic note");
    const overall = await anonymous.from("property_scores").select("property_rating").eq("property_id", property).single();
    expect(overall.data?.property_rating).toBe(2);

    expect((await people[1].api.rpc("set_my_women_feedback", {
      p_review: firstReview, p_ratings: ratings, p_comment: null, p_consent: true,
    })).error?.code).toBe("42501");
    expect((await people[0].api.rpc("set_my_women_program", {
      p_gender: "woman", p_tenancy: "former", p_description: null, p_opted_in: false,
    })).error).toBeNull();
    expect((await summary()).data).toBeNull();
    expect((await counts()).data?.[0]).toMatchObject({ eligible_count: 0, recommended: false });
    expect((await people[0].api.rpc("get_my_women_program", { p_review: firstReview })).data.feedback).toBeNull();
    expect((await people[0].api.rpc("set_my_women_program", {
      p_gender: "woman", p_tenancy: "former", p_description: null, p_opted_in: true,
    })).error).toBeNull();
    expect((await summary()).data).toBeNull();
    expect((await people[0].api.rpc("set_my_women_feedback", {
      p_review: firstReview, p_ratings: ratings, p_comment: null, p_consent: true,
    })).error).toBeNull();
    expect((await summary()).data).toMatchObject({ count: 5 });
    expect(await search({ p_women:"safety" })).toEqual([property]);
    expect((await admin.api.rpc("decide_claim", { ...approve, p_decision:"revoked" })).error).toBeNull();
    expect(await facts()).toMatchObject({ preferences: [], verified_count: 5, women_recommended:true });
    expect(await search({ p_preferences:["women"],p_women:"recommended" })).toEqual([]);
    expect(await search({ p_women:"recommended" })).toEqual([property]);
    expect((await admin.api.rpc("decide_verification", {
      p_request: lastRequest, p_decision: "revoked", p_reason: "Fictional verification removed to verify recalculation.",
    })).error).toBeNull();
    expect((await summary()).data).toBeNull();
    expect((await admin.api.rpc("admin_platform_action", {
      p_kind: "property", p_target: property, p_action: "hidden",
      p_reason: "Hide this synthetic property to test public search visibility.",
    })).error).toBeNull();
    expect(await search({})).toEqual([]);
    expect((await anonymous.rpc("get_public_property_information", { p_properties: [property] })).data).toEqual([]);
  } finally {
    if (documents.length) await service.storage.from("rental-documents").remove(documents);
    for (const person of people) await service.auth.admin.deleteUser(person.id);
    if (property) await service.from("properties").delete().eq("id", property);
  }
}, 45_000);
