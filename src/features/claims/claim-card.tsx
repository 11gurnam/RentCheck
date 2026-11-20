"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ActionIcon, StatusBadge } from "@/components/ui/action-feedback";
import { EvidenceLinks } from "@/features/privacy/evidence-upload";
import type { Claim } from "./data";

const claimDate = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function subscribeToHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function ClaimCard({ claim, editor, informationForm }: {
  claim: Claim;
  editor: ReactNode;
  informationForm: ReactNode;
}) {
  const id = `claim-${claim.id}`;
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => "");
  const [selection, setSelection] = useState<{ hash: string; panel: "details" | "documents" | null }>();
  const panel = selection?.hash === hash ? selection.panel : hash === `#${id}` ? "details" : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const approved = claim.status === "approved";
  const needsInformation = claim.stage === "awaiting_information";
  const statusLabel = needsInformation ? "Action needed" : claim.stage === "under_review" ? "Under review" : claim.status === "pending" ? "Awaiting review" : claim.status.replaceAll("_", " ");
  const profileHref = claim.property_id ? `/properties/${claim.property_id}` : `/landlords/${claim.landlord_id}`;

  useEffect(() => {
    if (!menuOpen) return;
    function closeOutside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  function openFromMenu(nextPanel: "details" | "documents") {
    setSelection({ hash, panel: nextPanel });
    setMenuOpen(false);
    menuTrigger.current?.focus();
  }

  return (
    <section id={id} className="dashboard-card claim-card" aria-labelledby={`${id}-title`}>
      <header className="claim-card-heading">
        <div className="claim-identity">
          <small className="claim-kind">
            {claim.is_demo ? "Demonstration claim" : claim.property_id ? "Property claim" : "Landlord profile claim"}
          </small>
          <h2 id={`${id}-title`}>
            <button
              className="claim-title-toggle"
              type="button"
              aria-expanded={panel === "details"}
              aria-controls={`${id}-details`}
              onClick={() => setSelection({ hash, panel: panel === "details" ? null : "details" })}
            >
              {claim.name}
              <svg className="action-icon claim-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </h2>
          {claim.address && (
            <p className="claim-address">
              <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></svg>
              <span className="sr-only">Property address </span>{claim.address}
            </p>
          )}
        </div>
        <StatusBadge status={needsInformation ? "pending" : claim.status}>{statusLabel}</StatusBadge>
        <div
          className="claim-menu"
          ref={menu}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && menuOpen) {
              event.preventDefault();
              setMenuOpen(false);
              menuTrigger.current?.focus();
            }
          }}
        >
          <button
            ref={menuTrigger}
            className="claim-menu-trigger"
            type="button"
            aria-label={`Actions for ${claim.name}`}
            aria-expanded={menuOpen}
            aria-controls={`${id}-actions`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.75" /><circle cx="12" cy="12" r="1.75" /><circle cx="19" cy="12" r="1.75" /></svg>
          </button>
          <div className="claim-menu-actions" id={`${id}-actions`} hidden={!menuOpen}>
            {(editor || informationForm) && (
              <button type="button" onClick={() => openFromMenu("details")}>
                <ActionIcon name="edit" />{editor ? "Edit details" : "Provide requested information"}
              </button>
            )}
            <Link href={profileHref} onClick={() => setMenuOpen(false)}>
              <ActionIcon name="search" />{claim.property_id ? "View property" : "View landlord profile"}
            </Link>
            <button type="button" aria-controls={`${id}-documents`} onClick={() => openFromMenu("documents")}>
              <ActionIcon name="shield" />View supporting documents
            </button>
            {claim.property_id && (
              <Link href="/account/contact" onClick={() => setMenuOpen(false)}><ActionIcon name="edit" />Contact settings</Link>
            )}
          </div>
        </div>
      </header>

      <dl className="claim-milestones">
        <div>
          <dt>Claimed on</dt>
          <dd>{claim.created_at ? <time dateTime={claim.created_at}>{claimDate.format(new Date(claim.created_at))}</time> : "Date unavailable"}</dd>
        </div>
        {(claim.decided_at || approved) && (
          <div>
            <dt>{approved ? "Approved on" : "Decided on"}</dt>
            <dd>{claim.decided_at ? <time dateTime={claim.decided_at}>{claimDate.format(new Date(claim.decided_at))}</time> : "Date unavailable"}</dd>
          </div>
        )}
      </dl>

      <div className="claim-expanded" id={`${id}-details`} hidden={panel !== "details"}>
        {panel === "details" && <>
          {approved && claim.property_id && <p className="verified-response-label">{claim.is_demo ? "Demonstration Landlord" : "Verified Landlord"} · this property only</p>}
          {claim.reason && <div className="claim-review-update"><strong>Review update</strong><p>{claim.reason}</p></div>}
          {editor ? <section className="claim-editor"><h3>Edit {claim.property_id ? "property" : "landlord"} details</h3>{editor}</section> : (
            <>
              {informationForm && <section className="claim-editor"><h3>Provide requested information</h3><p>Submit a complete updated set of supporting documents. Previous documents stay private until they expire.</p>{informationForm}</section>}
              <SupportingDocuments documents={claim.documents} />
            </>
          )}
        </>}
      </div>
      <div className="claim-expanded" id={`${id}-documents`} hidden={panel !== "documents"}>
        {panel === "documents" && (
          <div className="claim-document-panel">
            <SupportingDocuments documents={claim.documents} />
            <button type="button" className="claim-menu-trigger" aria-label="Close supporting documents" onClick={() => {
              setSelection({ hash, panel: null });
              menuTrigger.current?.focus();
            }}><ActionIcon name="close" /></button>
          </div>
        )}
      </div>
    </section>
  );
}

function SupportingDocuments({ documents }: { documents: Claim["documents"] }) {
  return (
    <section className="claim-documents">
      <h3><ActionIcon name="shield" />Private supporting documents</h3>
      <p>Visible only to you and authorized reviewers.</p>
      {documents?.length ? <EvidenceLinks documents={documents} /> : <p>No supporting documents available.</p>}
    </section>
  );
}
