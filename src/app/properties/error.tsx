"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell account-shell">
      <h1>This profile couldn’t load.</h1>
      <p>Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <p>
        <a href="/search">Return to search</a>
      </p>
    </main>
  );
}
