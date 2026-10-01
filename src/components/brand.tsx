import Link from "next/link";
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${dark ? "brand-dark" : ""}`}
      aria-label="NOPEEK home"
    >
      <svg
        width="29"
        height="29"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="m6 27 20-22" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3.5" fill="currentColor" />
      </svg>
      <span>
        NOPEEK<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
