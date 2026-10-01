"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="standalone-state">
      <div className="eyebrow muted">A SMALL INTERRUPTION</div>
      <h1>Something got stuck.</h1>
      <p>Your game progress is saved. Try loading the room again.</p>
      <button onClick={reset} className="button primary">
        Try again
      </button>
    </main>
  );
}
