import "server-only";
import { z } from "zod";
import { managementList, overview, platformFilters } from "@/features/admin-platform/data";
import { reviewLanguage } from "@/features/reviews/language";
import { statusLabel, verificationApplication, verificationManagement } from "@/features/verification-management/data";
import { createDatabaseClient } from "@/lib/database/server";
import { normalize } from "./knowledge";
import { isAdminQuestion, localAdminIntent, modelAdminIntent } from "./admin-intent";
import { adminNavigation, type AdminContext, type AdminIntent, type AdminSubject } from "./admin-schema";
import type { AssistantLink, AssistantReply, AssistantRequest } from "./schema";

type RecordCard = NonNullable<AssistantReply["records"]>[number];
type ActivityKind = "complaints" | "disputes" | "flagged_properties" | "disputed_properties" | "complaint_ranking" | "decisions";
type Incident = {
  id: string; kind: "dispute" | "review_report" | "photo_report" | "message_report" | "property";
  property_id: string | null; property: string | null; city: string | null; status: string; created_at: string; incidents: number | null;
};
const limit = 5;
const verificationPath = "/admin/verification-management";
const dateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
});
const uuid = z.uuid();
const formatDate = (value: string) => dateTime.format(new Date(value));
const label = (value: string) => value ? value[0].toUpperCase() + value.slice(1).replaceAll("_", " ") : "";
function tally(count: number, singular: string) {
  const [noun, ...description] = singular.split(/(?= (?:with|awaiting) )/);
  const plural = /[^aeiou]y$/.test(noun) ? noun.slice(0, -1) + "ies" : noun + "s";
  return count.toLocaleString("en-IN") + " " + (count === 1 ? singular : plural + description.join(""));
}
const propHref = (id: string) => "/admin/properties?id=" + id;
const pathWith = (path: string, filters: Record<string, string | undefined>) => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) if (value) params.set(name, value);
  return params.size ? path + "?" + params : path;
};

async function properties(subject: string) {
  const result = await managementList("properties", platformFilters.parse(uuid.safeParse(subject).success ? { id: subject } : { q: subject, sort: "name" }));
  return result.rows.map(row => ({
    id: row.id, name: row.name, city: row.city, kind: "property" as const,
  }));
}

async function landlords(subject: string): Promise<AdminSubject[]> {
  const db = await createDatabaseClient();
  const [managers, claimants] = await Promise.all([
    db.from("landlords").select("id,name").ilike("name", "%" + subject.replace(/[\\%_]/g, "\\$&") + "%").limit(20),
    managementList("users", platformFilters.parse({ q: subject, role: "landlord", sort: "name" })),
  ]);
  if (managers.error) throw new Error("Landlord records unavailable");
  return [
    ...(managers.data ?? []).map(row => ({ ...row, kind: "manager" as const })),
    ...claimants.rows.filter(row => normalize(row.name).includes(normalize(subject)))
      .map(row => ({ id: row.id, name: row.name, kind: "claimant" as const })),
  ];
}

function selectMatches(matches: AdminSubject[], subject: string) {
  const exact = matches.filter(match => normalize(match.name) === normalize(subject));
  return exact.length ? exact : matches;
}

function quickSelection(message: string, labels: string[]) {
  const plain = normalize(message);
  const ordinal = plain.match(/^(?:(?:open|select|show|choose) )?(?:the )?(?:option )?(first|second|third|fourth|fifth|[1-5])(?: one| option)?$/)?.[1];
  if (ordinal) return Number(ordinal) ? Number(ordinal) - 1 : ["first", "second", "third", "fourth", "fifth"].indexOf(ordinal);
  const name = plain.replace(/^(?:open|choose|select|show)(?: me)? (?:the )?/, "");
  if (/^(?:it|that one|this one)$/.test(name) && labels.length === 1) return 0;
  if (!name) return -1;
  const matches = labels.map((entry, index) => normalize(entry).includes(name) ? index : -1).filter(index => index >= 0);
  return matches.length === 1 ? matches[0] : -1;
}

const subjectLabel = (subject: AdminSubject) =>
  [subject.name, subject.city || (subject.kind === "manager" ? "Property manager" : subject.kind === "claimant" ? "Property claimant" : "")].filter(Boolean).join(" · ");

function listReply(context: AdminContext, intent: AdminIntent, total: number, noun: string, cards: RecordCard[], queue: AssistantLink, extraLinks: AssistantLink[] = []): AssistantReply {
  const scope = context.subject ? " for " + context.subject.name : "";
  const result = "I found " + tally(total, noun) + scope + ".";
  const link = cards[0]?.links?.[0];
  const single = intent.action === "open" && total === 1 && (intent.subject || context.subject) && link;
  const scoped = intent.subject || context.subject;
  const navigate = intent.action === "open" ? (single ? link.href : scoped ? undefined : queue.href) : undefined;
  return {
    text: intent.action === "open" && navigate ? "Opening " + (single ? cards[0].title : queue.label.toLowerCase()) + "." :
      result + (intent.action === "open" && total > 1 ? " Which one would you like to open?" : total > cards.length && cards.length ? " Here are " + cards.length + "." : ""),
    links: [queue, ...extraLinks],
    records: intent.action === "count" ? undefined : cards,
    navigate,
    adminContext: {
      ...context,
      records: intent.action === "count" ? undefined : cards.flatMap(card =>
        card.links?.[0] ? [{ name: card.title.slice(0, 250), href: card.links[0].href }] : []),
    },
  };
}

async function propertyReply(context: AdminContext, intent: AdminIntent) {
  const id = context.subject?.id;
  const published = id ? undefined : "published";
  const data = await managementList("properties", platformFilters.parse({ id, status: published, sort: intent.sort }));
  const cards = data.rows.slice(0, limit).map(row => ({
    title: row.name,
    detail: [row.city, label(row.status), "Listed " + formatDate(row.created_at)].filter(Boolean).join(" · "),
    links: [{ label: "View property", href: propHref(row.id) }],
  }));
  return listReply(context, intent, data.total, "listed property", cards, {
    label: "Properties", href: pathWith("/admin/properties", { status: published, sort: intent.sort }),
  });
}

async function verificationReply(context: AdminContext, intent: AdminIntent, propertyName?: string) {
  const type = intent.resource === "ownership_claims" ? "landlord" : intent.resource === "tenant_verifications" ? "tenant" : "";
  const status = intent.status === "unresolved" ? "pending" :
    intent.status && !["all", "resolved"].includes(intent.status) ? intent.status : "";
  const sort = intent.sort ?? "newest";
  const property = context.subject?.kind === "property" ? context.subject.id : undefined;
  const data = await verificationManagement({ query: "", type, status, sort, property, page: 1 });
  const openProperties = propertyName && /\b(?:show|find|list)\b.*\bproperties\b.*\bpending\b/.test(normalize(propertyName));
  const cards = data.rows.slice(0, openProperties ? data.rows.length : limit).map(row => ({
    title: row.property,
    detail: [row.kind === "tenant" ? "Tenant verification" : "Ownership claim", statusLabel(row.status), "Submitted " + formatDate(row.created_at)].join(" · "),
    links: [
      { label: openProperties ? "View property" : "View request", href: openProperties ? propHref(row.property_id) : verificationPath + "/" + row.kind + "/" + row.id },
      openProperties
        ? { label: "View request", href: verificationPath + "/" + row.kind + "/" + row.id }
        : { label: "View property", href: propHref(row.property_id) },
    ],
  }));
  const queue = {
    label: type === "landlord" ? "Ownership claims" : type === "tenant" ? "Tenant verification" : "Verification requests",
    href: pathWith(verificationPath, { type, status, sort, property }),
  };
  const typeLabel = type === "landlord" ? "ownership claim" : type === "tenant" ? "tenant verification request" : "verification request";
  const matching = openProperties ? cards.filter((card, i) => cards.findIndex(other => other.links[0].href === card.links[0].href) === i).slice(0, limit) : cards.slice(0, limit);
  return listReply(context, intent, data.total, [status.replaceAll("_", " "), typeLabel].filter(Boolean).join(" "), matching, queue);
}

async function moderationReply(context: AdminContext, intent: AdminIntent, reviewId?: string) {
  const property = context.subject?.kind === "property" ? context.subject.id : undefined;
  const reported = !reviewId && intent.reported && !intent.abusive ? "true" : "";
  const flagged = reviewId || intent.status === "all" || reported ? "" : "true";
  const sort = intent.sort === "oldest" ? "oldest" : "reported";
  const filters = platformFilters.parse({ id: reviewId, property, flagged, reported, sort });
  const data = await managementList("reviews", filters);
  let rows = data.rows;
  if (intent.abusive && data.total > rows.length) {
    // Reuse the existing local language check. Do not send review text to the model or browser.
    const pages = await Promise.all(Array.from({ length: Math.min(5, Math.ceil(data.total / 20)) - 1 },
      (_, index) => managementList("reviews", { ...filters, page: index + 2 })));
    rows = rows.concat(pages.flatMap(page => page.rows));
  }
  const scanned = rows.length;
  if (intent.abusive) rows = rows.filter(row => reviewLanguage(row.body ?? "").flagged);
  const cards = rows.slice(0, limit).map(row => ({
    title: row.property || "Tenant review",
    detail: [label(row.status), tally(row.pending_reports ?? 0, "unresolved report"), "Posted " + formatDate(row.created_at)].join(" · "),
    links: [{ label: "Moderate review", href: "/admin/reviews?id=" + row.id }],
  }));
  const queue = { label: "Review moderation", href: pathWith("/admin/reviews", { property, flagged, reported, sort }) };
  const reply = listReply(context, intent, intent.abusive ? rows.length : data.total,
    intent.abusive ? "reported review with potentially abusive language" : flagged ? "review awaiting moderation" : reported ? "reported review" : "review",
    cards, queue);
  if (intent.abusive && scanned < data.total) reply.text += " I checked the first " + scanned + " reviews in the filtered queue.";
  if (reviewId && intent.action === "open") {
    reply.navigate = cards[0]?.links[0].href;
    if (reply.navigate) reply.text = "Opening the review for " + cards[0].title + ".";
  }
  return reply;
}

async function activityReply(context: AdminContext, intent: AdminIntent, kind: ActivityKind) {
  const subject = context.subject;
  const property = subject?.kind === "property" ? subject.id : undefined;
  const landlord = subject && subject.kind !== "property" ? subject : undefined;
  const status = intent.status === "pending" || intent.status === "unresolved" ? "unresolved" : intent.status === "resolved" ? "resolved" : "";
  const { data, error } = await (await createDatabaseClient()).rpc("get_assistant_admin_activity", {
    p_kind: kind, p_property: property ?? null, p_landlord: landlord?.id ?? null, p_landlord_kind: landlord?.kind ?? "",
    p_status: status, p_days: intent.days ?? 0, p_sort: intent.sort ?? "newest", p_application_type: intent.applicationType ?? "",
  });
  if (error) throw new Error("Administrative activity is unavailable");
  if (kind === "decisions") {
    const counts = data as { approved: number; rejected: number };
    const type = intent.applicationType === "tenant" ? "tenant verification" : intent.applicationType === "landlord" ? "ownership" : "verification";
    const approval = tally(counts.approved, "approval");
    const rejection = tally(counts.rejected, "rejection");
    return {
      text: "This month, I found " + (intent.decision === "approved" ? approval : intent.decision === "rejected" ? rejection : approval + " and " + rejection) + " for " + type + " requests.",
      links: [{ label: "View audit log", href: "/admin/audit" }],
      navigate: intent.action === "open" ? "/admin/audit" : undefined,
      adminContext: context,
    };
  }
  const { rows, total } = data as { rows: Incident[]; total: number };
  const cards = rows.map(row => {
    const report = row.kind.endsWith("_report");
    const title = row.kind === "property" ? row.property || "Property" :
      [label(row.kind), row.property].filter(Boolean).join(" · ");
    const detail = row.kind === "property" ? [row.city, tally(row.incidents ?? 0, kind === "complaint_ranking" ? "complaint" : "open case")].filter(Boolean).join(" · ")
      : [label(row.status), "Submitted " + formatDate(row.created_at)].join(" · ");
    const main = row.kind === "property" ? { label: "View property", href: propHref(row.id) } :
      row.kind === "dispute" ? { label: "Open dispute", href: "/admin/disputes?id=" + row.id } :
      { label: "View report", href: (row.kind === "message_report" ? "/admin/messages" : "/admin/reports") + "#" + row.kind.replace("_", "-") + "-" + row.id };
    const links = [main];
    if ((report || row.kind === "dispute") && row.property_id) links.push({ label: "View property", href: propHref(row.property_id) });
    return { title, detail, links };
  });
  const queue = {
    label: "Disputes and reports",
    href: pathWith("/admin/disputes", { status, property, older_days: intent.days?.toString(), sort: intent.sort }),
  };
  const noun = kind === "flagged_properties" ? "flagged property" : kind === "disputed_properties" ? "property with an open dispute" :
    kind === "complaint_ranking" ? "property with complaints" : kind === "disputes" ? "dispute" : "complaint";
  const extras = kind === "complaints" ? [{ label: "Review and photo reports", href: "/admin/reports" }, { label: "Message reports", href: "/admin/messages" }] : [];
  if (intent.action === "open" && ["complaint_ranking", "flagged_properties", "disputed_properties"].includes(kind) && !subject) {
    intent = { ...intent, action: "list" };
  }
  return listReply(context, intent, total, [status, noun].filter(Boolean).join(" "), cards, queue, extras);
}

async function execute(intent: AdminIntent, input: AssistantRequest, subject?: AdminSubject): Promise<AssistantReply> {
  const criteria = { ...intent };
  delete criteria.subject;
  const context: AdminContext = { intent: criteria, subject };
  const resource = intent.resource;
  if (resource === "properties") return propertyReply(context, intent);
  if (resource === "moderation") {
    const reviewId = intent.subject && uuid.safeParse(intent.subject).success && !subject ? intent.subject : undefined;
    return moderationReply(context, intent, reviewId);
  }
  if (resource === "verifications" || resource === "tenant_verifications" || resource === "ownership_claims") {
    return verificationReply(context, intent, input.message);
  }
  if (resource === "overview" || resource === "tenants" || resource === "verified_landlords") {
    const stats = await overview();
    const links = resource === "tenants" ? [{ label: "View tenants", href: "/admin/users?role=tenant" }] :
      resource === "verified_landlords" ? [{ label: "View verified landlords", href: "/admin/users?role=landlord&landlord_verified=true" }] :
      [{ label: "Admin overview", href: "/admin" }];
    const text = resource === "tenants" ? "RentCheck has " + tally(stats.tenants, "registered tenant") + "." :
      resource === "verified_landlords" ? "RentCheck has " + tally(stats.verified_landlords, "landlord with verified ownership") + "." :
      "RentCheck has " + [tally(stats.properties, "property profile"), tally(stats.tenants, "tenant"),
        tally(stats.pending, "pending verification request"), tally(stats.flagged, "review awaiting moderation")].join(" · ") + ".";
    return { text, links, navigate: intent.action === "open" ? links[0].href : undefined, adminContext: context };
  }
  return activityReply(context, intent, resource);
}

function currentProperty(page?: string) {
  const path = page?.match(/^\/properties\/([\da-f-]{36})(?:\?|$)/i)?.[1];
  const admin = /^\/admin\/properties\?/.test(page ?? "") ? new URLSearchParams(page?.split("?")[1]).get("id") : null;
  return uuid.safeParse(path ?? admin).data;
}

export async function answerAdmin(input: AssistantRequest): Promise<AssistantReply | null> {
  if (!input.message) return null;
  const message = input.message;
  const previous = input.adminContext;
  const adminPage = /^\/admin(?:\/|\?|$)/.test(input.page ?? "");
  if (previous?.choices?.length) {
    const choice = previous.choices[quickSelection(message, previous.choices.map(subjectLabel))];
    if (choice) return execute(previous.intent, input, choice);
  }
  if (previous?.records?.length) {
    const record = previous.records[quickSelection(message, previous.records.map(record => record.name))];
    if (record && adminNavigation.test(record.href)) {
      return { text: "Opening " + record.name + ".", navigate: record.href, adminContext: previous };
    }
  }
  const plain = normalize(message);
  const intent = localAdminIntent(message, previous, adminPage) ??
    (isAdminQuestion(message) || adminPage || previous ? await modelAdminIntent(message, previous) : null);
  if (!intent) return isAdminQuestion(message) ?
    { text: "Which admin information are you looking for? I can help with verification requests, complaints, properties or review moderation.", adminContext: previous } : null;

  if (intent.resource === "moderation" && intent.subject && uuid.safeParse(intent.subject).success && /\breview\b/.test(plain)) {
    return execute(intent, input);
  }
  if (intent.resource === "disputes" && intent.action === "open" && intent.subject && uuid.safeParse(intent.subject).success && !/\b(?:for|against) (?:this |that |the )?property\b/.test(plain)) {
    const cases = await managementList("cases", platformFilters.parse({ id: intent.subject }));
    const record = cases.rows[0];
    if (record) return { text: "Opening the dispute.", navigate: "/admin/disputes?id=" + record.id, adminContext: previous };
  }
  if (intent.action === "open" && intent.subject && uuid.safeParse(intent.subject).success &&
    (intent.resource === "tenant_verifications" || intent.resource === "ownership_claims")) {
    const kind = intent.resource === "tenant_verifications" ? "tenant" : "landlord";
    const request = await verificationApplication(kind, intent.subject);
    const navigate = verificationPath + "/" + kind + "/" + request.id;
    return { text: "Opening the request for " + request.property + ".", navigate, adminContext: { intent: { resource: intent.resource, action: "open" } } };
  }

  const wantsPrior = /\b(?:this|that|the same|previous) (?:property|landlord|one)\b/.test(plain) ||
    (previous?.intent.resource === intent.resource && /^(?:(?:and|show|only|just|sort by) )?(?:the )?(?:oldest|newest|pending|unresolved|resolved|latest|rejected|all|how many|over|older than|more than)\b/.test(plain));
  const onProperty = wantsPrior ? currentProperty(input.page) : undefined;
  const name = ["overview", "tenants", "verified_landlords"].includes(intent.resource) ? undefined : intent.subject ?? onProperty;
  let subject = !name && wantsPrior ? previous?.subject : undefined;
  if (name) {
    const matches = selectMatches(await (intent.subjectKind === "landlord" ? landlords(name) : properties(name)), name);
    if (!matches.length) return { text: "I couldn’t find a matching " + (intent.subjectKind ?? "property") + ". Try the exact name.", adminContext: previous };
    if (matches.length > 1) {
      const choices = matches.slice(0, limit);
      const criteria = { ...intent };
      delete criteria.subject;
      return {
        text: "I found multiple matches. Which one do you mean? Reply with its name, city or option number.",
        records: choices.map((choice, index) => ({
          title: (index + 1) + ". " + choice.name,
          detail: choice.city ?? (choice.kind === "manager" ? "Property manager" : choice.kind === "claimant" ? "Property claimant" : ""),
          links: choice.kind === "property" ? [{ label: "View property", href: propHref(choice.id) }] : undefined,
        })),
        adminContext: { intent: criteria, choices },
      };
    }
    subject = matches[0];
  }
  if (wantsPrior && !subject && /\b(?:this|that|same|previous) (?:property|landlord)\b/.test(plain)) {
    return { text: "Which " + (plain.includes("landlord") ? "landlord" : "property") + " should I look up?", adminContext: previous };
  }
  return execute(intent, input, subject);
}
