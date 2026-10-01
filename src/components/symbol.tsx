export function Symbol({ value, size = 24 }: { value: number; size?: number }) {
  const shared = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {value === 0 && <circle cx="16" cy="16" r="10" {...shared} />}
      {value === 1 && <path d="M16 4 28 16 16 28 4 16Z" {...shared} />}
      {value === 2 && <path d="m16 5 12 22H4Z" {...shared} />}
      {value === 3 && (
        <rect x="6" y="6" width="20" height="20" rx="2" {...shared} />
      )}
      {value === 4 && (
        <path d="m16 3 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" {...shared} />
      )}
      {value === 5 && <path d="M8 8 24 24M24 8 8 24" {...shared} />}
    </svg>
  );
}
