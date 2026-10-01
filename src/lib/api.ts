import { NextRequest, NextResponse } from "next/server";
const requests = new Map<string, { count: number; until: number }>();
export function guard(request: NextRequest, limit = 24) {
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).host !== request.headers.get("host"))
      return NextResponse.json(
        { error: "Request origin not allowed." },
        { status: 403 },
      );
  } catch {
    return NextResponse.json(
      { error: "Request origin not allowed." },
      { status: 403 },
    );
  }
  const key = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  let state = requests.get(key);
  if (!state || state.until < now) {
    state = { count: 0, until: now + 60000 };
    requests.set(key, state);
  }
  state.count++;
  if (requests.size > 2000)
    for (const [key, value] of requests)
      if (value.until < now) requests.delete(key);
  if (state.count > limit)
    return NextResponse.json(
      { error: "A few too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
}
export function apiError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "The request could not be completed.";
  const safe = message.includes("429")
    ? "The public Solana RPC is busy. Wait a moment, then retry."
    : message.includes("Account does not exist")
      ? "This room does not exist. Check your invitation link."
      : message.includes("fetch failed")
        ? "Could not reach the Solana network. Please retry."
        : message;
  // Avoid returning RPC URLs or local credential file paths in server errors.
  return NextResponse.json(
    {
      error: safe
        .replace(/https?:\/\/[^\s]+/g, "[network endpoint]")
        .replace(/\/Users\/[^\s]+/g, "[local path]")
        .slice(0, 300),
    },
    { status: 503 },
  );
}
