"use server";
import { createHash } from "node:crypto";
import { requireUser } from "@/lib/auth/session";
import { analyseReview, type LanguageCheck } from "./language-ai";
const cache = new Map<string, { result: LanguageCheck; expires: number }>();
const limits = new Map<string, { count: number; expires: number }>();
export async function checkReviewLanguage(text: string): Promise<LanguageCheck> {
  const user = await requireUser("/account/reviews");
  if (typeof text !== "string" || text.length > 5000 || text.trim().length < 10) throw new Error("Enter a comment between 10 and 5000 characters.");
  const now = Date.now();
  for (const [key, item] of cache) if (item.expires < now) cache.delete(key);
  for (const [key, item] of limits) if (item.expires < now) limits.delete(key);
  const key = createHash("sha256").update(user.id + text).digest("hex");
  const previous = cache.get(key);
  if (previous) return previous.result;
  const limit = limits.get(user.id) ?? { count: 0, expires: now + 60000 };
  if (limit.count >= 20) return { original: text, suggestion: text, changed: false, manualEdit: true, flagged: true, source: "local", notice: "Too many checks. Wait a minute and try again." };
  limits.set(user.id, { ...limit, count: limit.count + 1 });
  const result = await analyseReview(text);
  if (!result.notice) {
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { result, expires: now + 300000 });
  }
  return result;
}
