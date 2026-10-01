import { NextResponse } from "next/server";
import { readRoom } from "@/lib/server-chain";
import { apiError } from "@/lib/api";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-z0-9]{1,13}$/.test(id))
    return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
  try {
    return NextResponse.json(await readRoom(id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
