import "server-only";
import { createMediaClient } from "@/lib/database/privileged";
import { normalizeDocument } from "./document";
import { z } from "zod";
export const evidenceKinds = ["utility", "internet", "lease", "ownership", "authorization", "other"] as const;
export async function submitEvidenceBundle(user: string, form: FormData, target: { review?: string; property?: string; landlord?: string; demo: boolean }) {
  const files = form.getAll("document");
  const kind = z.enum(evidenceKinds).safeParse(form.get("evidenceKind"));
  if (!kind.success || files.length < 1 || files.length > 3 || files.some(f => !(f instanceof File)))
    return { message: "Choose a document type and one to three supporting documents." };
  const normalized = [];
  try { for (const file of files) normalized.push(await normalizeDocument(file as File)); }
  catch { return { message: "Use readable JPG, PNG, WebP or PDF documents up to 3 MiB each. PDFs must have 1–30 pages and no encryption, scripts, forms or embedded files." }; }
  const media = createMediaClient();
  const paths: string[] = [];
  const documents = [];
  try {
    for (const file of normalized) {
      const id = crypto.randomUUID();
      const path = `${target.review ? "verification" : "claim"}/${id}.${file.extension}`;
      const uploaded = await media.storage.from("rental-documents").upload(path, file.bytes, { contentType: file.mime, upsert: false });
      if (uploaded.error) throw new Error("Private document upload failed. Please try again.");
      paths.push(path); documents.push({ id, extension: file.extension });
    }
    const registered = await media.rpc("register_evidence_bundle", { p_user: user, p_documents: documents, p_kind: kind.data, p_review: target.review ?? null, p_property: target.property ?? null, p_landlord: target.landlord ?? null, p_demo: target.demo, p_consent: true });
    if (registered.error) throw new Error(registered.error.message);
    return { id: registered.data as string };
  } catch (error) {
    if (paths.length) await media.storage.from("rental-documents").remove(paths);
    return { message: error instanceof Error ? error.message : "Could not submit evidence. Please try again." };
  }
}
