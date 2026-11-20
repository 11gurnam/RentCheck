import Link from "next/link";
import { ActionIcon } from "@/components/ui/action-feedback";
import { operationMode } from "@/features/operations/data";
import styles from "./evidence-policy.module.css";

export async function EvidencePolicyPanel({ embedded = false }: { embedded?: boolean } = {}) {
  const Heading = embedded ? "h2" : "h1";
  const SectionHeading = embedded ? "h3" : "h2";
  const mode = await operationMode();
  const operator = process.env.OPERATOR_NAME?.trim();
  const contact = process.env.OPERATOR_CONTACT_EMAIL?.trim();
  const sections = [
    {
      id: "privacy-operator",
      title: "Operator and contact",
      content: operator && contact ? (
        <p>Operated by {operator}. For account, evidence or privacy requests, contact <a href={`mailto:${contact}`}>{contact}</a>.</p>
      ) : <p>Operator contact details are unavailable.</p>,
    },
    {
      id: "privacy-public-contributions",
      title: "Public contributions",
      content: (
        <>
          <p>Property/manager facts, review text and ratings, tenancy dates and rent paid, your public alias and uploaded property/review photos are public. Location coordinates become public when recorded.</p>
          <p>Do not publish identity numbers, bank details, contact details or other people’s private information.</p>
        </>
      ),
    },
    {
      id: "privacy-women-tenant-program",
      title: "Women Tenant Recommendation Program",
      content: (
        <>
          <p>Gender and enrollment are optional and stored privately. You choose which reviews to contribute. Only combined scores appear on property pages. Program administrators can inspect de-identified category ratings. Your private notes and identity are kept out of these summaries.</p>
          <p>You can withdraw a contribution from the review editor or leave the program in your private tenant profile.</p>
        </>
      ),
    },
    {
      id: "privacy-private-evidence",
      title: "Private evidence",
      content: (
        <>
          <p>Evidence is accessible only to its owner and trusted administrators. Redact unrelated information before uploading.</p>
          <p>You can download documents until they expire. Expired files are then deleted. Existing files keep the deadline set at upload. Decisions and moderation audit records remain after file expiry.</p>
        </>
      ),
    },
    {
      id: "privacy-account-closure",
      title: "Private contact and account closure",
      content: (
        <>
          <p>Conversations are readable by their participants; administrators can inspect reported messages. Closing either account deletes that conversation.</p>
          <p>Account closure removes the user’s contributions, private evidence and registered media, while published property facts and prior moderation audit remain. Access ends immediately, even if some files take longer to delete.</p>
          <Link className="review-action" href={embedded ? "/account?tab=privacy" : "/account/privacy"} scroll={!embedded}>
            Account deletion controls
          </Link>
        </>
      ),
    },
    {
      id: "privacy-external-providers",
      title: "Backups and external providers",
      content: (
        <>
          <p>Encrypted local backups may retain older information for up to 30 days. If a backup is restored, deletion and expiry requests still apply. Authentication uses Supabase and optional Google.</p>
          <p>OpenStreetMap receives your IP address and map area only when you choose to load its map. Photon receives the address or coordinates when you request an address lookup.</p>
          <p>When AI chat is enabled, its provider processes your questions and the filters from your conversation. Leave personal details and documents out of chat. When you choose to share your location, RentCheck uses an approximate location to find nearby properties.</p>
          <p>Your device location is requested only after you click “Use my location”; a property pin becomes public only if you confirm sharing it. City choices use GeoNames data under CC BY 4.0; they may not include every settlement.</p>
        </>
      ),
    },
  ];

  return (
    <section className={styles.policy} aria-labelledby="evidence-policy-title">
      <header className={styles.hero}>
        <div>
          <Heading id="evidence-policy-title">Privacy and evidence retention.</Heading>
          <p>{mode.accepts_real_data ? "You can add real property details and reviews." : mode.allows_demo_data === false ? "New contributions are currently closed." : "Please use fictional information in this demonstration."}</p>
        </div>
        <p className={styles.retention}>
          <span className={styles.retentionIcon}><ActionIcon name="shield"/></span>
          <span>New evidence expires after <strong>{mode.evidence_retention_days} days</strong></span>
        </p>
      </header>

      <div className={styles.layout}>
        <nav className={styles.contents} aria-labelledby="evidence-policy-contents">
          <p id="evidence-policy-contents">On this page</p>
          <ul>
            {sections.map(({ id, title }) => <li key={id}><a href={`#${id}`}>{title}</a></li>)}
          </ul>
        </nav>
        <div className={styles.body}>
          {sections.map(({ id, title, content }) => (
            <section key={id} id={id} className={styles.topic}>
              <SectionHeading>{title}</SectionHeading>
              {content}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
