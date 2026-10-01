import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AnchorProvider, Program, Wallet, type Idl } from "@anchor-lang/core";
import { Connection, Keypair } from "@solana/web3.js";
import idl from "../src/lib/idl.json";

export const projectRoot = resolve(import.meta.dirname, "..");
export function chainContext() {
  const keyPath =
    process.env.ANCHOR_WALLET ??
    process.env.SOLANA_KEYPAIR_PATH ??
    resolve(projectRoot, ".keys/sponsor.json");
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(keyPath, "utf8"))),
  );
  const url =
    process.env.ANCHOR_PROVIDER_URL ??
    process.env.SOLANA_RPC_URL ??
    "https://api.devnet.solana.com";
  const connection = new Connection(url, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  });
  const provider = new AnchorProvider(connection, new Wallet(payer), {
    commitment: "confirmed",
  });
  const program = new Program(idl as Idl, provider);
  const cluster = Number(
    process.env.ARCIUM_CLUSTER_OFFSET ??
      (url.includes("127.0.0.1") || url.includes("localhost") ? 0 : 456),
  );
  return { payer, connection, provider, program, cluster };
}
