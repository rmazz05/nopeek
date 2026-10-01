import { NextResponse } from "next/server";
import { chainReadiness, configuredNetwork } from "@/lib/server-chain";
export async function GET() {
  return NextResponse.json(
    {
      application: "nopeek",
      practice: "ready",
      encryptedRooms: await chainReadiness(),
      network: `solana-${configuredNetwork()}`,
      program: process.env.NOPEEK_PROGRAM_ID ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
