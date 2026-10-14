"use client";
import { useState } from "react";
export function ReviewDescription({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = body.length > 480;
  return <section className="review-description" aria-label="Review description"><h4>Experience</h4><p>{long && !expanded ? body.slice(0, 480) + "…" : body}</p>{long && <button type="button" className="review-read-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Read full review"}</button>}</section>;
}
