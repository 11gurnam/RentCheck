"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { ActionIcon } from "@/components/ui/action-feedback";
import { CollectionHeading } from "@/components/ui/collection-heading";
import { findClaimProperties } from "./search-actions";
import styles from "./property-search.module.css";

export function ClaimPropertySearch({ initialResult }: {
  initialResult: Awaited<ReturnType<typeof findClaimProperties>>;
}) {
  const [query, setQuery] = useState("");
  const [{ term, result }, setSearch] = useState({ term: "", result: initialResult });
  const [pending, startSearch] = useTransition();
  const searchInput = useRef<HTMLInputElement>(null);
  const count = result.rows.length;

  function search(value: string) {
    const term = value.trim();
    startSearch(async () => {
      const result = await findClaimProperties(term);
      setSearch({ term, result });
    });
  }

  return (
    <>
      <Link className={styles.backLink} href="/claims">
        <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7 7-7-7 7-7" /></svg>
        Back to your claims
      </Link>

      <div className={styles.hero}>
        <CollectionHeading
          kind="claims"
          title="Find a property to claim"
          description="Search by name or address for a property you own or represent."
        >
          <form className={styles.search} role="search" aria-label="Find a property to claim" onSubmit={(event) => {
            event.preventDefault();
            if (!pending) search(query);
          }}>
            <label>
              <span className="sr-only">Property name or address</span>
              <input
                ref={searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={120}
                enterKeyHint="search"
                placeholder="Property name or address"
              />
            </label>
            <button className="button" type="submit" disabled={pending}>
              <ActionIcon name="search" />{pending ? "Searching…" : "Search"}
            </button>
          </form>
        </CollectionHeading>
      </div>

      <section aria-labelledby="claim-search-results">
        <header className={styles.resultsHeader}>
          <h2 id="claim-search-results">{term ? "Search results" : "Properties"}</h2>
          <div className={styles.resultsTools}>
            <p role="status">
              {!result.message && count > 0 && `${count} ${count === 1 ? "property" : "properties"}${term ? " found" : ""}`}
            </p>
            {term && (
              <button type="button" className={styles.clear} disabled={pending} onClick={() => {
                setQuery("");
                search("");
                searchInput.current?.focus();
              }}>Clear search</button>
            )}
          </div>
        </header>

        {result.message ? (
          <p role="alert" className={styles.empty}>{result.message}</p>
        ) : count === 0 ? (
          <div role="status" className={styles.empty}>
            <p><strong>{term ? "No matching properties" : "No properties available"}</strong></p>
            {term && <p>Try another property name or address.</p>}
          </div>
        ) : (
          <ul className={styles.grid} aria-busy={pending}>
            {result.rows.map((property) => (
              <li key={property.id} className={`claim-search-result ${styles.card}`}>
                <h3 id={`claim-property-${property.id}`}>{property.name}</h3>
                {(property.address || property.city) && (
                  <p className={styles.location}>
                    <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2" /></svg>
                    <span>{[property.address, property.city].filter(Boolean).join(" · ")}</span>
                  </p>
                )}
                <div className={styles.cardFooter}>
                  {property.is_demo && <small className={styles.demo}>Demo property</small>}
                  <Link className={`review-action ${styles.claimLink}`} href={`/claims/new?kind=property&target=${property.id}`} aria-describedby={`claim-property-${property.id}`} prefetch={false}>
                    Claim this property
                    <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
