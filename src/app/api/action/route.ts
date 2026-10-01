import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, apiError } from "@/lib/api";
import { prepareAction } from "@/lib/server-chain";
export const runtime = "nodejs";
const name = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .refine((s) => Buffer.byteLength(s) <= 24);
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    player: z.string().min(32).max(44),
    title: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .refine((s) => Buffer.byteLength(s) <= 32),
  }),
  z.object({
    action: z.literal("join"),
    player: z.string().min(32).max(44),
    id: z.string().regex(/^[a-z0-9]{1,13}$/),
    name,
  }),
  z.object({
    action: z.enum(["start", "finish", "recover"]),
    player: z.string().min(32).max(44),
    id: z.string().regex(/^[a-z0-9]{1,13}$/),
  }),
  z.object({
    action: z.literal("guess"),
    player: z.string().min(32).max(44),
    id: z.string().regex(/^[a-z0-9]{1,13}$/),
    symbols: z.array(z.number().int().min(0).max(5)).length(5),
  }),
]);
export async function POST(request: NextRequest) {
  const rejection = guard(request);
  if (rejection) return rejection;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        {
          error: "Check your room name, player identity, or five-symbol guess.",
        },
        { status: 400 },
      );
    const { action, player, ...fields } = parsed.data;
    if (action === "create") {
      const rejected = guard(request, 4, "create");
      if (rejected) return rejected;
    }
    return NextResponse.json(await prepareAction(action, player, fields));
  } catch (error) {
    return apiError(error);
  }
}
