"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell account-shell">
      <h1>This manager profile couldn’t load.</h1>
      <button className="button" onClick={reset}>
        Try again
      </button>
      <p>
        <a href="/search">Return to search</a>
      </p>
    </main>
  );
}
