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
  if (files.reduce((size,file)=>size+(file instanceof File?file.size:0),0)>4*1024*1024)
    return { message: "Keep supporting documents under 4 MiB in total. Compress the PDF or select fewer files." };
  const normalized = [];
  try { for (const file of files) normalized.push(await normalizeDocument(file as File)); }
  catch { return { message: "Use readable JPG, PNG, WebP or PDF documents up to 3 MiB each. PDFs must have 1–30 pages and no encryption, scripts, forms or embedded files." }; }
  let media: ReturnType<typeof createMediaClient>;
  try { media = createMediaClient(); }
  catch {
    console.error("Evidence submission failed: private media service is not configured.");
    return { message: "Document uploads are temporarily unavailable. Your files have not been submitted. Please try again later." };
  }
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
    if (registered.error) {
      console.error("Evidence registration failed", { code: registered.error.code });
      const reason=registered.error.message;
      throw new Error(/already|pending|approved/i.test(reason) ? target.review ? "This review already has an active verification request. Open Your reviews to check its status." : "An active claim already exists. Open Your claims to check its status." : /permission|authority|consent/i.test(reason) ? "Check your account access and evidence consent before submitting." : "We couldn’t register your evidence. Check the selected property and try again.");
    }
    return { id: registered.data as string };
  } catch (error) {
    if (paths.length) {
      try { await media.storage.from("rental-documents").remove(paths); }
      catch { console.error("Evidence submission cleanup could not complete."); }
    }
    return { message: error instanceof Error ? error.message : "Could not submit evidence. Please try again." };
  }
}
