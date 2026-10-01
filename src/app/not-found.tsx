import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-state">
      <div className="eyebrow muted">WRONG DOOR</div>
      <h1>This room is a mystery.</h1>
      <p>That page doesn’t exist. Your invitation link may be incomplete.</p>
      <Link href="/" className="button primary">
        Back to NOPEEK
      </Link>
    </main>
  );
}
