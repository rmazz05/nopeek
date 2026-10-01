import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BN } from "@anchor-lang/core";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import {
  awaitComputationFinalization,
  getClusterAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getComputationAccAddress,
  getExecutingPoolAccAddress,
  getMXEAccAddress,
  getMXEPublicKey,
  getMempoolAccAddress,
} from "@arcium-hq/client";
import { scoreGuess } from "../src/lib/game";
import { chainContext, projectRoot } from "./chain-context";
import { initializeCircuits } from "./init-chain";

async function main() {
  const { payer, provider, program, cluster } = chainContext();
  await initializeCircuits();
  let keysReady = false;
  for (let retry = 0; retry < 180; retry++) {
    if (await getMXEPublicKey(provider, program.programId).catch(() => null)) {
      keysReady = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(keysReady, "Arcium cluster completed MXE key generation");
  const host = Keypair.generate(),
    guest = Keypair.generate(),
    outsider = Keypair.generate();
  const id = new BN(randomBytes(8), "le");
  const room = PublicKey.findProgramAddressSync(
    [Buffer.from("room"), id.toArrayLike(Buffer, "le", 8)],
    program.programId,
  )[0];
  const shared = (name: string, offset: BN) => ({
    payer: payer.publicKey,
    room,
    computationAccount: getComputationAccAddress(cluster, offset),
    clusterAccount: getClusterAccAddress(cluster),
    mxeAccount: getMXEAccAddress(program.programId),
    mempoolAccount: getMempoolAccAddress(cluster),
    executingPool: getExecutingPoolAccAddress(cluster),
    compDefAccount: getCompDefAccAddress(
      program.programId,
      Buffer.from(getCompDefAccOffset(name)).readUInt32LE(),
    ),
  });
  const accounts = program.account as any;
  const fetchRoom = () => accounts.room.fetch(room);
  const evidence: { action: string; signature: string }[] = [];
  const sealOffset = new BN(randomBytes(8), "le");
  const sealSignature = await program.methods
    .sealRoom(sealOffset, id, "Integration suspects")
    .accountsPartial({
      ...shared("seal_room", sealOffset),
      actor: host.publicKey,
    })
    .signers([host])
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
    ])
    .rpc();
  evidence.push({ action: "seal_room", signature: sealSignature });
  console.log(`Room ${id.toString(36)} created: ${sealSignature}`);
  evidence.push({
    action: "seal_callback",
    signature: await awaitComputationFinalization(
      provider,
      sealOffset,
      program.programId,
      "confirmed",
      180000,
    ),
  });
  const sealed = await fetchRoom();
  assert.equal(sealed.status, 1, "MPC seal callback opens the lobby");
  assert.equal(sealed.secret.length, 5);
  assert.ok(
    sealed.secret.every(
      (c: number[]) => c.length === 32 && c.some((byte) => byte !== 0),
    ),
    "Only encrypted 32-byte symbols are stored",
  );
  const ciphertext = JSON.stringify(sealed.secret);
  const joinSignature = await program.methods
    .joinRoom("Guest")
    .accountsPartial({ room, actor: guest.publicKey })
    .signers([guest])
    .rpc();
  evidence.push({ action: "join", signature: joinSignature });
  await assert.rejects(
    program.methods
      .startRoom()
      .accountsPartial({ room, actor: guest.publicKey })
      .signers([guest])
      .rpc(),
    "Only the host starts the race",
  );
  evidence.push({
    action: "start",
    signature: await program.methods
      .startRoom()
      .accountsPartial({ room, actor: host.publicKey })
      .signers([host])
      .rpc(),
  });
  await assert.rejects(
    program.methods
      .joinRoom("Late")
      .accountsPartial({ room, actor: outsider.publicKey })
      .signers([outsider])
      .rpc(),
    "Roster locks when the round starts",
  );
  const attemptAddress = (player: PublicKey, index: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("attempt"),
        room.toBuffer(),
        player.toBuffer(),
        Buffer.from([index]),
      ],
      program.programId,
    )[0];
  const rejectGuess = (actor: Keypair, symbols: number[]) => {
    const offset = new BN(randomBytes(8), "le");
    return program.methods
      .checkGuess(offset, 0, symbols)
      .accountsPartial({
        ...shared("check_guess", offset),
        actor: actor.publicKey,
        attempt: attemptAddress(actor.publicKey, 0),
      })
      .signers([actor])
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
      ])
      .rpc();
  };
  await assert.rejects(
    rejectGuess(outsider, [0, 0, 1, 1, 2]),
    "Nonplayers cannot query the secret",
  );
  await assert.rejects(
    rejectGuess(host, [6, 0, 1, 1, 2]),
    "Out-of-range symbols rejected on chain",
  );
  let possible = Array.from({ length: 6 ** 5 }, (_, n) =>
    Array.from({ length: 5 }, () => {
      const s = n % 6;
      n = Math.floor(n / 6);
      return s;
    }),
  );
  let guess = [0, 0, 1, 1, 2];
  for (let index = 0; index < 10; index++) {
    const offset = new BN(randomBytes(8), "le"),
      attempt = attemptAddress(host.publicKey, index);
    evidence.push({
      action: `guess_${index}`,
      signature: await program.methods
        .checkGuess(offset, index, guess)
        .accountsPartial({
          ...shared("check_guess", offset),
          actor: host.publicKey,
          attempt,
        })
        .signers([host])
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
        ])
        .rpc(),
    });
    evidence.push({
      action: `guess_${index}_callback`,
      signature: await awaitComputationFinalization(
        provider,
        offset,
        program.programId,
        "confirmed",
        180000,
      ),
    });
    const result = await accounts.attempt.fetch(attempt);
    assert.equal(result.status, 1, "MPC callback succeeded");
    console.log(
      `Attempt ${index + 1}: ${guess.join("")} → ${result.exact} exact, ${result.misplaced} elsewhere`,
    );
    assert.equal(
      JSON.stringify((await fetchRoom()).secret),
      ciphertext,
      "The encrypted secret remains unchanged",
    );
    possible = possible.filter((code) => {
      const feedback = scoreGuess(code, guess);
      return (
        feedback.exact === result.exact &&
        feedback.misplaced === result.misplaced
      );
    });
    assert.ok(
      possible.length > 0,
      "All MPC feedback is consistent with one fixed secret",
    );
    if (result.exact === 5) break;
    // Sample candidate guesses and minimize the largest possible feedback bucket.
    let best = possible[0],
      bestWorst = Infinity;
    for (const candidate of possible
      .filter(
        (_, i) => i % Math.max(1, Math.floor(possible.length / 100)) === 0,
      )
      .slice(0, 150)) {
      const buckets = new Map<string, number>();
      for (const code of possible) {
        const f = scoreGuess(code, candidate),
          key = `${f.exact},${f.misplaced}`;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      const worst = Math.max(...buckets.values());
      if (worst < bestWorst) {
        bestWorst = worst;
        best = candidate;
      }
    }
    guess = best;
  }
  const finished = await fetchRoom();
  assert.equal(finished.status, 3, "Verified MPC feedback decides the winner");
  assert.ok(finished.winner.equals(host.publicKey));
  const out = resolve(projectRoot, "docs");
  mkdirSync(out, { recursive: true });
  writeFileSync(
    resolve(out, "chain-verification.json"),
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        rpc: provider.connection.rpcEndpoint,
        clusterOffset: cluster,
        programId: program.programId.toBase58(),
        roomId: id.toString(36),
        roomAddress: room.toBase58(),
        attempts: finished.players[0].attempts,
        checks: [
          "MPC secret generation",
          "Ciphertext-only room account",
          "Host authorization",
          "Locked roster",
          "Nonplayer rejection",
          "Symbol validation",
          "MPC feedback consistency",
          "Immutable ciphertext",
          "Verified winner",
        ],
        transactions: evidence,
      },
      null,
      2,
    ),
  );
  console.log("NOPEEK chain integration verified.");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
