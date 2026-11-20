import type { AssistantLink, Topic } from "./schema";

// Public passages adapted from the introduction, verification guide, privacy policy and linked workflows.
const articles: Record<Topic, { terms: string[]; text: string; link: AssistantLink; propertySection?: string }> = {
  about: {
    terms: ["what is rentcheck", "about rentcheck", "how does rentcheck work", "what can i do", "platform"],
    text: "RentCheck helps you research rentals in India using property profiles, rent ranges and tenant experiences. You can save and compare places as you decide where to look.",
    link: { label: "About RentCheck", href: "/" },
  },
  my_reviews: {
    terms: ["my reviews", "my feedback", "manage reviews", "past reviews", "edit my review", "my ratings"],
    text: "Open Your reviews to edit a review, manage its photos or submit tenant verification.",
    link: { label: "Your reviews", href: "/account/reviews" },
  },
  profile: {
    terms: ["update profile", "edit profile", "my account", "my profile", "profile picture", "change name", "account settings"],
    text: "Open Your account to update your public alias or photo. Contact, privacy and notification settings are there too.",
    link: { label: "Your account", href: "/account" },
  },
  claim: {
    terms: ["claim property", "claim my property", "claim a property", "landlord ownership", "prove ownership", "represent a property"],
    text: "Find the property you own or represent and select Claim this property. You can then submit ownership or authorization evidence for private review.",
    link: { label: "Find a property to claim", href: "/claims/new" },
  },
  my_claims: {
    terms: ["my claims", "claim status", "my landlord claim", "claim progress", "manage my claim"],
    text: "Open Your claims to check a decision, supply requested information or edit an approved property profile.",
    link: { label: "Your claims", href: "/claims" },
  },
  review: {
    terms: ["write a review", "review a property", "leave a review", "add a review", "rate property", "post a review"],
    text: "Choose a property you lived in and select Write a review. You can rate the property and share what your stay was like.",
    link: { label: "Find the property you stayed in", href: "/search" },
  },
  verification: {
    terms: ["submit verification", "tenant verification work", "tenant verification request", "verify tenancy", "verify my stay", "upload evidence", "lease verification"],
    text: "Open the review for that stay from Your reviews. In tenant verification, upload redacted evidence such as a lease or utility bill. Your documents are reviewed privately.",
    link: { label: "Your reviews", href: "/account/reviews" },
  },
  badge: {
    terms: ["badge mean", "verified tenant badge", "what is verified", "verified tenant reviews mean"],
    text: "A verified tenant review means RentCheck approved evidence linking the reviewer to that stay. The badge applies to the tenancy.",
    link: { label: "View properties with verified tenant reviews", href: "/search?verification=reviews" },
  },
  women: {
    terms: ["what is the women tenant rating", "what is women tenant rating", "meaning of women rating", "women tenant program", "how does the women"],
    text: "The Women Tenant Rating summarizes the experiences of participating verified women tenants. It reflects their opinions and does not guarantee safety.",
    link: { label: "Explore women tenant ratings", href: "/search?women=reviews" },
  },
  report: {
    terms: ["report incorrect review", "report a review", "report this review", "incorrect review", "flag a review",
      "report a property", "report this property", "report a listing", "report an issue"],
    text: "Open the property’s tenant reviews and choose Report this review below the relevant review. Sign in to send your reason.",
    link: { label: "Find the property's reviews", href: "/search" },
    propertySection: "#experiences",
  },
  photos: {
    terms: ["upload property photographs", "upload photos", "add photos", "property photographs", "upload property pictures", "review photos"],
    text: "Add photos to your own tenancy review from Your reviews. If you manage an approved property claim, open its property page to manage the property photos.",
    link: { label: "Your reviews", href: "/account/reviews" },
  },
  replies: {
    terms: ["landlord responses", "landlord replies", "representative replies", "reply to a review", "manager response"],
    text: "A landlord or representative response appears below the relevant tenant review on the property page. Approved representatives can reply to reviews for their properties.",
    link: { label: "Find the property's reviews", href: "/search" },
    propertySection: "#experiences",
  },
  shortlist: {
    terms: ["saved places", "shortlist", "save a place", "bookmarks", "saved properties"],
    text: "Use Save to shortlist on a property page. Your shortlist collects your saved places and gives you a shortcut to compare them.",
    link: { label: "Your shortlist", href: "/saved" },
  },
  compare: {
    terms: ["compare properties", "compare two", "side by side", "comparison", "compare places", "compare homes"],
    text: "Compare up to three properties side by side. RentCheck selects your saved places first, and you can change the selection.",
    link: { label: "Compare properties", href: "/compare" },
  },
  map: {
    terms: ["view map", "map page", "find the map", "explore neighbourhood", "property location map"],
    text: "On the map you can find properties by name, city or neighbourhood and view their shared or approximate location.",
    link: { label: "Explore the map", href: "/map" },
  },
  privacy: {
    terms: ["privacy", "delete my account", "evidence retention", "delete my data", "keep my data"],
    text: "The privacy policy explains what is public, who can see private evidence, and how account deletion works.",
    link: { label: "Privacy and evidence retention", href: "/privacy" },
  },
  messages: {
    terms: ["my messages", "contact landlord", "message the landlord", "your messages", "landlord contact"],
    text: "Open Your messages to see your conversations. Start from a property’s landlord and contact section when a representative accepts messages.",
    link: { label: "Your messages", href: "/messages" },
  },
};

export function retrieveHelp(message: string) {
  const text = normalize(message);
  const words = new Set(text.split(" "));
  return (Object.entries(articles) as [Topic, typeof articles[Topic]][]).map(([topic, article]) => {
    const score = Math.max(...article.terms.map(term => {
      const normalized = normalize(term);
      const tokens = normalized.split(" ");
      return ` ${text} `.includes(` ${normalized} `) ? 5 + tokens.length : tokens.filter(word => words.has(word) && word.length > 2).length / tokens.length;
    }));
    return { topic, score, excerpt: article.text };
  }).sort((a, b) => b.score - a.score).slice(0, 4);
}

export function helpReply(topic: Topic, page?: string, message = "") {
  const article = articles[topic];
  const property = page?.match(/^\/properties\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(?:\?|$)/i)?.[1];
  if (topic === "report" && /\breport (?:an issue|(?:a|the|this) (?:property|listing))\b/.test(normalize(message))) {
    return {
      text: "Sign in, open the property's profile, and choose Report this property to explain what needs attention.",
      links: [property ? { label: "View property", href: "/properties/" + property } : { label: "Find the property", href: "/search" }],
    };
  }
  let link = article.link;
  if (property && article.propertySection) link = { label: "View tenant reviews", href: `/properties/${property}${article.propertySection}` };
  if (property && topic === "review") link = { label: "Write a review", href: `/reviews/new?property=${property}` };
  if (property && topic === "claim") link = { label: "Claim this property", href: `/claims/new?kind=property&target=${property}` };
  return { text: article.text, links: [link] };
}

export function normalize(text: string) {
  return text.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
