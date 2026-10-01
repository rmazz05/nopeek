import "server-only";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  AnchorProvider,
  BN,
  Program,
  Wallet,
  type Idl,
} from "@anchor-lang/core";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
} from "@arcium-hq/client";
import idl from "./idl.json";
import type { Room, Player, Guess } from "./game";
import { validateSponsoredTransaction } from "./sponsorship";

export function isChainConfigured() {
  return (
    !!process.env.NOPEEK_PROGRAM_ID &&
    !!(process.env.SOLANA_KEYPAIR_PATH || process.env.SOLANA_SPONSOR_SECRET) &&
    idl.instructions.length > 0
  );
}
export function configuredNetwork(): "devnet" | "localnet" {
  return /localhost|127\.0\.0\.1/.test(process.env.SOLANA_RPC_URL ?? "")
    ? "localnet"
    : "devnet";
}
let validatedEndpoint = "";
async function ensureTestNetwork(connection: Connection) {
  if (validatedEndpoint === connection.rpcEndpoint) return;
  if (configuredNetwork() === "localnet" && process.env.VERCEL !== "1") {
    validatedEndpoint = connection.rpcEndpoint;
    return;
  }
  const hash = await connection.getGenesisHash();
  if (hash !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG")
    throw new Error("NOPEEK sponsorship is restricted to Solana devnet.");
  validatedEndpoint = connection.rpcEndpoint;
}
export async function chainReadiness() {
  if (!isChainConfigured()) return "pending-deployment";
  try {
    const { connection, program } = environment();
    await ensureTestNetwork(connection);
    const addresses = [
      program.programId,
      getMXEAccAddress(program.programId),
      getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("seal_room")).readUInt32LE(),
      ),
      getCompDefAccAddress(
        program.programId,
        Buffer.from(getCompDefAccOffset("check_guess")).readUInt32LE(),
      ),
    ];
    const accounts = await connection.getMultipleAccountsInfo(addresses);
    return accounts.every(Boolean) && accounts[0]?.executable
      ? "ready"
      : "pending-deployment";
  } catch {
    return "network-unavailable";
  }
}
export function environment() {
  if (!isChainConfigured())
    throw new Error(
      "Encrypted rooms are being deployed. Solo practice is ready to play; please come back for multiplayer shortly.",
    );
  const connection = new Connection(
    process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com",
    { commitment: "confirmed", disableRetryOnRateLimit: true },
  );
  const raw =
    process.env.SOLANA_SPONSOR_SECRET ??
    readFileSync(process.env.SOLANA_KEYPAIR_PATH!, "utf8");
  const sponsor = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  const provider = new AnchorProvider(connection, new Wallet(sponsor), {
    commitment: "confirmed",
  });
  const program = new Program(
    { ...idl, address: process.env.NOPEEK_PROGRAM_ID! } as Idl,
    provider,
  );
  const cluster = Number(process.env.ARCIUM_CLUSTER_OFFSET ?? 456);
  return { connection, sponsor, provider, program, cluster };
}
export function roomAddress(id: string, programId: PublicKey) {
  const value = new BN(id, 36);
  if (value.bitLength() > 64) throw new Error("Invalid room code.");
  return PublicKey.findProgramAddressSync(
    [Buffer.from("room"), value.toArrayLike(Buffer, "le", 8)],
    programId,
  )[0];
}
export function attemptAddress(
  room: PublicKey,
  player: PublicKey,
  index: number,
  programId: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("attempt"),
      room.toBuffer(),
      player.toBuffer(),
      Buffer.from([index]),
    ],
    programId,
  )[0];
}
function computationAccounts(
  name: string,
  offset: BN,
  programId: PublicKey,
  cluster: number,
) {
  return {
    computationAccount: getComputationAccAddress(cluster, offset),
    clusterAccount: getClusterAccAddress(cluster),
    mxeAccount: getMXEAccAddress(programId),
    mempoolAccount: getMempoolAccAddress(cluster),
    executingPool: getExecutingPoolAccAddress(cluster),
    compDefAccount: getCompDefAccAddress(
      programId,
      Buffer.from(getCompDefAccOffset(name)).readUInt32LE(),
    ),
  };
}
// Anchor accounts are defined by the generated IDL. Keep this dynamic boundary
// here; every externally supplied field is validated before it reaches it.
type ChainRoom = {
  id: BN;
  host: PublicKey;
  title: string;
  createdAt: BN;
  startedAt: BN;
  expiresAt: BN;
  status: number;
  winner: PublicKey;
  playerCount: number;
  players: {
    key: PublicKey;
    name: string;
    attempts: number;
    pending: boolean;
  }[];
  secret: number[][];
};
type ChainAttempt = {
  symbols: number[];
  exact: number;
  misplaced: number;
  status: number;
  queuedAt: BN;
};
async function fetchRoom(program: Program, id: string): Promise<ChainRoom> {
  return await (
    program.account as unknown as {
      room: { fetch: (key: PublicKey) => Promise<ChainRoom> };
    }
  ).room.fetch(roomAddress(id, program.programId));
}
export async function prepareAction(
  action: string,
  playerText: string,
  fields: { id?: string; title?: string; name?: string; symbols?: number[] },
) {
  const { connection, sponsor, program, cluster } = environment();
  await ensureTestNetwork(connection);
  const player = new PublicKey(playerText);
  if (player.equals(sponsor.publicKey))
    throw new Error("Use a separate player identity.");
  const id =
    action === "create"
      ? new BN(randomBytes(8), "le").toString(36)
      : fields.id!;
  const room = roomAddress(id, program.programId);
  const offset = new BN(randomBytes(8), "le");
  let ix;
  if (action === "create")
    ix = await program.methods
      .sealRoom(offset, new BN(id, 36), fields.title)
      .accountsPartial({
        ...computationAccounts("seal_room", offset, program.programId, cluster),
        room,
        payer: sponsor.publicKey,
        actor: player,
      })
      .instruction();
  else if (action === "join")
    ix = await program.methods
      .joinRoom(fields.name)
      .accountsPartial({ room, actor: player })
      .instruction();
  else if (action === "start")
    ix = await program.methods
      .startRoom()
      .accountsPartial({ room, actor: player })
      .instruction();
  else if (action === "finish")
    ix = await program.methods
      .finishRoom()
      .accountsPartial({ room })
      .instruction();
  else {
    const stored = await fetchRoom(program, id);
    const state = stored.players.find((p) => p.key.equals(player));
    if (!state) throw new Error("Join the room first.");
    const index = action === "recover" ? state.attempts - 1 : state.attempts;
    if (index < 0 || index >= 10)
      throw new Error("There are no attempts available.");
    const attempt = attemptAddress(room, player, index, program.programId);
    if (action === "recover")
      ix = await program.methods
        .recoverGuess()
        .accountsPartial({ room, actor: player, attempt })
        .instruction();
    else
      ix = await program.methods
        .checkGuess(offset, index, fields.symbols)
        .accountsPartial({
          ...computationAccounts(
            "check_guess",
            offset,
            program.programId,
            cluster,
          ),
          room,
          attempt,
          payer: sponsor.publicKey,
          actor: player,
        })
        .instruction();
  }
  const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: sponsor.publicKey,
    ...latest,
  }).add(ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }), ix);
  transaction.partialSign(sponsor);
  return {
    id,
    transaction: transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64"),
  };
}
export async function sendSignedTransaction(encoded: string) {
  const { connection, sponsor, program } = environment();
  await ensureTestNetwork(connection);
  const transaction = Transaction.from(Buffer.from(encoded, "base64"));
  validateSponsoredTransaction(
    transaction,
    sponsor.publicKey,
    program.programId,
  );
  // Sponsor signature covers the entire message, preventing inserted transfers.
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false, maxRetries: 3 },
  );
  return { signature };
}
export async function readRoom(id: string): Promise<Room> {
  const { connection, program } = environment();
  const room = roomAddress(id, program.programId);
  const stored = await fetchRoom(program, id);
  const selected = stored.players.slice(0, stored.playerCount);
  const keys: PublicKey[] = [];
  for (const player of selected)
    for (let i = 0; i < player.attempts; i++)
      keys.push(attemptAddress(room, player.key, i, program.programId));
  const infos = keys.length
    ? await connection.getMultipleAccountsInfo(keys)
    : [];
  let cursor = 0;
  const players: Player[] = selected.map((player) => {
    const guesses: Guess[] = [];
    for (let i = 0; i < player.attempts; i++) {
      const info = infos[cursor++];
      if (info) {
        const attempt = program.coder.accounts.decode<ChainAttempt>(
          "attempt",
          info.data,
        );
        guesses.push({
          symbols: attempt.symbols,
          exact: attempt.exact,
          misplaced: attempt.misplaced,
          pending: attempt.status === 0,
          failed: attempt.status === 2,
          queuedAt: attempt.queuedAt.toNumber() * 1000,
        });
      }
    }
    return {
      publicKey: player.key.toBase58(),
      name: player.name,
      guesses,
      joinedAt: stored.createdAt.toNumber() * 1000,
    };
  });
  let status: Room["status"] = [
    "sealing",
    "waiting",
    "playing",
    "won",
    "expired",
    "expired",
  ][stored.status] as Room["status"];
  if (
    status === "playing" &&
    Date.now() > stored.expiresAt.toNumber() * 1000 &&
    !players.some((p) => p.guesses.some((g) => g.pending))
  )
    status = "expired";
  return {
    id,
    title: stored.title,
    host: stored.host.toBase58(),
    status,
    players,
    createdAt: stored.createdAt.toNumber() * 1000,
    startedAt: stored.startedAt.toNumber() * 1000,
    expiresAt: stored.expiresAt.toNumber() * 1000,
    winner: stored.status === 3 ? stored.winner.toBase58() : undefined,
    mode: "arcium",
    network: configuredNetwork(),
    program: program.programId.toBase58(),
    address: room.toBase58(),
    ciphertext: stored.secret.map((bytes) =>
      Buffer.from(bytes).toString("hex"),
    ),
    error:
      stored.status === 5
        ? "The network could not seal this room. Create a new room."
        : undefined,
  };
}
