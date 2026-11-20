import "server-only";
import { getProperty, type Property } from "@/features/discovery/data";
import { rentalLabels } from "@/features/property-information/preferences";
import { reviewFeed } from "@/features/reviews/data";
import { getVerifiedUser } from "@/lib/auth/session";
import { createDatabaseClient } from "@/lib/database/server";
import { normalize } from "./knowledge";
import type { AssistantReply, AssistantRequest } from "./schema";

const account = { label: "Your account", href: "/account" };
const reviews = { label: "Your reviews", href: "/account/reviews" };
const propertyId = /^\/properties\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\?|$)/i;
const details = /\b(?:rating|ratings|reviews?|amenities|facilities|rental preferences|allows?|allowed|accepts?|eligible|tenant preferences|recommendations?|description|offer)\b/;

async function ownVerification(): Promise<AssistantReply> {
  if (!await getVerifiedUser()) {
    return { text: "Sign in to check the verification status of your stays.", links: [{ label: "Sign in", href: "/sign-in?next=%2Faccount" }] };
  }
  const db = await createDatabaseClient();
  const { data, error } = await db.rpc("get_my_tenancy_status");
  if (error) throw new Error("Tenancy verification is unavailable");
  const stays = (data ?? []) as { review_id: string; property: string; is_demo: boolean; verified: boolean }[];
  if (!stays.length) return { text: "You haven’t added a stay to verify yet. You can start by writing a tenant review.", links: [reviews] };
  const selected = stays.slice(0, 5);
  const applications = await db.rpc("get_my_verifications");
  if (applications.error) throw new Error("Verification requests are unavailable");
  const requests = (applications.data ?? []) as { review_id: string; status: string }[];
  return {
    text: "Here’s the tenant verification status for your " + (stays.length === 1 ? "stay." : "stays."),
    links: [account],
    records: selected.map(stay => {
      const status = requests.find(request => request.review_id === stay.review_id)?.status;
      const detail = stay.verified ? (stay.is_demo ? "Verified demo stay" : "Verified tenant for this stay") :
        status === "pending" ? "Verification pending" : status === "rejected" ? "Verification declined" :
          status === "disputed" ? "Verification disputed" : status === "revoked" ? "Verification revoked" : "Stay unverified";
      return { title: stay.property, detail, links: [{ label: "View verification", href: "/reviews/" + stay.review_id + "/edit" }] };
    }),
  };
}

async function replyFor(property: Property, plain: string): Promise<AssistantReply> {
  const base = "/properties/" + property.id;
  const demo = property.is_demo ? " This is a demonstration property." : "";
  const reviewCount = property.review_count + (property.review_count === 1 ? " review" : " reviews");
  const score = (value: number) => Number(value).toFixed(1) + "/5";
  if (/\bwom[ae]n\b/.test(plain) && /\b(?:recommend\w*|ratings?|reviews?|safety|feedback)\b/.test(plain)) {
    const women = property.information?.women;
    return {
      text: (women ? property.name + " has a Women Tenant Rating of " + score(women.rating) + " from " + women.count +
        (women.count === 1 ? " review." : " reviews.") : "A Women Tenant Rating isn’t available for " + property.name + ".") + demo,
      links: [{ label: women ? "Women Tenant Rating" : "View property", href: women ? base + "#women-experiences" : base }],
    };
  }
  if (/\b(?:preferences|allows?|allowed|accepts?|eligible|tenants can|(?:students|couples|families|bachelors) (?:can|rent))\b/.test(plain)) {
    const labels = rentalLabels(property.information?.preferences ?? []);
    return {
      text: (labels.length ? property.name + " lists these rental preferences: " + labels.join(", ") + "." :
        "The landlord hasn’t listed rental preferences for " + property.name + ".") + demo,
      links: [{ label: "View property", href: base }],
    };
  }
  if (/\b(?:amenities|facilities|description|offer)\b/.test(plain)) {
    const description = property.description?.trim();
    return {
      text: (description ? "From the property description for " + property.name + ": " + description.slice(0, 450) +
        (description.length > 450 ? "…" : "") : property.name + " doesn’t list amenities in its property description.") + demo,
      links: [{ label: "Property overview", href: base + "#property-overview" }],
    };
  }
  if (/\b(?:what do (?:the )?(?:tenants|reviews) say|(?:show|read|see) (?:me )?(?:the )?(?:tenant )?reviews|what (?:are|were) tenant experiences)\b/.test(plain)) {
    const { rows } = await reviewFeed(property.id);
    return {
      text: property.name + " has " + reviewCount + "." + demo,
      records: rows.filter(review => review.body.trim()).slice(0, 2).map(review => ({
        title: "Tenant review · " + score(review.property_rating),
        detail: review.body.trim().slice(0, 220) + (review.body.trim().length > 220 ? "…" : ""),
        links: [{ label: "Read review", href: base + "#review-" + review.id }],
      })),
      links: [{ label: "Read tenant reviews", href: base + "#experiences" }],
    };
  }
  const criteria = property.criterion_scores.filter(criterion => normalize(criterion.label).split(" ").some(word => word.length >= 4 && plain.includes(word)));
  return {
    text: (criteria.length ?
      property.name + " — " + criteria.map(criterion => criterion.label + " " + score(criterion.rating)).join(" · ") + "." :
      property.property_rating == null ? property.name + " has " + reviewCount + " and no overall rating yet." :
        property.name + " has an overall rating of " + score(property.property_rating) + " from " + reviewCount + ".") + demo,
    links: [{ label: "Read tenant reviews", href: base + "#experiences" }],
  };
}

export async function publicDetails(input: AssistantRequest): Promise<AssistantReply | null> {
  if (!input.message) return null;
  const plain = normalize(input.message);
  if (/\b(?:my (?:own )?(?:tenant |tenancy )?verification|(?:tenant |tenancy )?verification status|am i (?:a )?verified tenant)\b/.test(plain) &&
    !/\b(?:how (?:do|can) i (?:verify|submit)|how does .* work)\b/.test(plain)) return ownVerification();
  if (!details.test(plain) || /\b(?:how (?:do|can|does|to)|best|highest|top rated|how many properties|(?:find|show|list|compare|search for) (?:me )?properties)\b/.test(plain)) {
    if (!/\bwhat do (?:the )?(?:tenants|reviews) say\b/.test(plain)) return null;
  }
  const id = input.page?.match(propertyId)?.[1];
  const subject = input.message.match(/["“]([^"”]{1,120})["”]/)?.[1] ?? input.message.match(
    /\b(?:for|of|about|at|does)\s+(.+?)(?:\s+(?:have|allow|accept|offer|like)\b.*)?[?.!]*$/i,
  )?.[1];
  if (subject && !/^(?:(?:this|that|the) property|this place|it|women(?: tenants?)?|bachelors|students|families|couples)$/i.test(subject)) {
    const db = await createDatabaseClient();
    const { data, error } = await db.from("property_discovery").select("id,name,city")
      .ilike("name", "%" + subject.trim().slice(0, 120).replace(/[\\%_]/g, "\\$&") + "%").limit(6);
    if (error) throw new Error("Property information unavailable");
    const matches = (data ?? []) as Pick<Property, "id" | "name" | "city">[];
    const exact = matches.filter(value => normalize(value.name) === normalize(subject));
    const candidates = exact.length ? exact : matches;
    if (candidates.length > 1) return {
      text: "I found several matching properties. Which one do you mean?",
      links: candidates.slice(0, 5).map(candidate => ({ label: candidate.name + " · " + candidate.city, href: "/properties/" + candidate.id })),
    };
    if (!candidates.length) return null;
    const property = await getProperty(candidates[0].id, { includeCriterionScores: true });
    return property ? replyFor(property, plain) : null;
  }
  if (!id || (!/\b(?:this|that|here|its|it)\b/.test(plain) && subject)) return null;
  const property = await getProperty(id, { includeCriterionScores: true });
  return property ? replyFor(property, plain) : null;
}
