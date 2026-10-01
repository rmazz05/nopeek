import { Keypair, Transaction } from "@solana/web3.js";
import { Buffer } from "buffer";
const SESSION_KEY = "nopeek-player-v1";
export function identity(): Keypair {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(stored)));
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }
  const player = Keypair.generate();
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(Array.from(player.secretKey)),
  );
  return player;
}
export async function chainAction(
  action: string,
  fields: Record<string, unknown>,
): Promise<{ id?: string; signature: string }> {
  const player = identity();
  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      player: player.publicKey.toBase58(),
      ...fields,
    }),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? "The network did not accept this action.");
  const tx = Transaction.from(Buffer.from(body.transaction, "base64"));
  if (tx.signatures.some((slot) => slot.publicKey.equals(player.publicKey)))
    tx.partialSign(player);
  const send = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: tx.serialize().toString("base64") }),
  });
  const result = await send.json();
  if (!send.ok)
    throw new Error(result.error ?? "Could not send the transaction.");
  return { id: body.id, signature: result.signature };
}
export async function createRoom(title: string): Promise<string> {
  const result = await chainAction("create", { title });
  if (!result.id) throw new Error("The room was not created.");
  return result.id;
}
