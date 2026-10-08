export function EvidenceChecklist() {
  return <fieldset><legend>Manual evidence review checklist</legend><label><input name="identity" type="checkbox" /> Evidence matches the applicant</label><label><input name="property" type="checkbox" /> Evidence matches this property or profile</label><label><input name="period_or_authority" type="checkbox" /> Tenancy period or representative authority is supported</label><p>All three checks are required for real-evidence approval. Inspect the document first; these checks record manual review, not independent identity certification.</p></fieldset>;
}
