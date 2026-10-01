import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, apiError } from "@/lib/api";
import { sendSignedTransaction } from "@/lib/server-chain";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const rejection = guard(request);
  if (rejection) return rejection;
  try {
    const data = z
      .object({
        transaction: z
          .string()
          .min(50)
          .max(2200)
          .regex(/^[A-Za-z0-9+/=]+$/),
      })
      .safeParse(await request.json());
    if (!data.success)
      return NextResponse.json(
        { error: "Invalid signed transaction." },
        { status: 400 },
      );
    return NextResponse.json(
      await sendSignedTransaction(data.data.transaction),
    );
  } catch (error) {
    return apiError(error);
  }
}
