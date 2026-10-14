"use client";
import { useEffect, useState } from "react";
export function LandlordPreview({
  property,
  start,
  onAvailable,
}: {
  property: string;
  start: string;
  onAvailable: (available: boolean) => void;
}) {
  const [message, setMessage] = useState(
    "Enter your tenancy start date to see which landlord receives your rating.",
  );
  useEffect(() => {
    const controller = new AbortController();
    onAvailable(false);
    if (!start) {
      return () => controller.abort();
    }
    fetch(
      "/api/review-attribution?" + new URLSearchParams({ property, start }),
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(({ landlord }) => {
        setMessage(
          landlord
            ? "Your landlord rating will go to: " +
                landlord.name +
                ". Check that this matches your tenancy."
            : "No landlord is recorded for this start date. Leave the landlord rating unanswered; an administrator can correct the history.",
        );
        onAvailable(!!landlord);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage(
            "Could not confirm the landlord. Try entering the date again before rating management.",
          );
          onAvailable(false);
        }
      });
    return () => controller.abort();
  }, [property, start, onAvailable]);
  return (
    <p role="status" className="field-hint">
      {start
        ? message
        : "Enter your tenancy start date to see which landlord receives your rating."}
    </p>
  );
}
