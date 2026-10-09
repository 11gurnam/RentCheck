"use client";
import { useId, useState } from "react";
export function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const group = useId();
  const [preview, setPreview] = useState(0);
  const shown = preview || value;
  const meaning = (rating: number) => rating <= 1 ? "Poor" : rating <= 2 ? "Below average" : rating <= 3 ? "Average" : rating <= 4 ? "Good" : "Excellent";
  return <div className="star-rating-control"><div className="star-rating" role="radiogroup" aria-label={`${label} rating`} onMouseLeave={() => setPreview(0)}>
    {[1,2,3,4,5].map(star => <span className="rating-star" key={star}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="star-outline"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1Z"/></svg>
      <span className="star-fill" style={{width:`${Math.max(0,Math.min(1,shown-star+1))*100}%`}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1Z"/></svg></span>
      {[star-0.5,star].map((rating,i) => <label key={rating} className={`star-hit star-hit-${i}`} onMouseEnter={() => setPreview(rating)} title={`${rating} / 5 · ${meaning(rating)}`}><input type="radio" name={`stars-${group}`} value={rating} checked={value===rating} required aria-label={`${rating} out of 5`} aria-describedby={`${group}-meaning`} onFocus={() => setPreview(rating)} onBlur={() => setPreview(0)} onChange={() => {onChange(rating);setPreview(0);}}/><span className="sr-only">{rating} out of 5</span></label>)}
    </span>)}
  </div><span id={`${group}-meaning`} className="star-rating-value">{shown ? <>{shown} / 5 <span className="star-meaning">{meaning(shown)}</span></> : "Not rated"}</span></div>;
}
