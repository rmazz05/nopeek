import test from "node:test";
import assert from "node:assert/strict";
import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { validateSponsoredTransaction } from "../src/lib/sponsorship";

function fixture() {
  const sponsor = Keypair.generate(),
    player = Keypair.generate(),
    program = Keypair.generate().publicKey;
  const transaction = new Transaction({
    feePayer: sponsor.publicKey,
    recentBlockhash: "11111111111111111111111111111111",
  }).add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 500000 }),
    new TransactionInstruction({
      programId: program,
      keys: [{ pubkey: player.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from([1]),
    }),
  );
  return { sponsor, player, program, transaction };
}
test("a valid sponsor and player signature authorize a game action", () => {
  const { sponsor, player, program, transaction } = fixture();
  transaction.sign(sponsor, player);
  assert.doesNotThrow(() =>
    validateSponsoredTransaction(
      Transaction.from(transaction.serialize()),
      sponsor.publicKey,
      program,
    ),
  );
});
test("a player cannot change sponsor-approved instructions", () => {
  const { sponsor, player, program, transaction } = fixture();
  transaction.partialSign(sponsor);
  transaction.instructions[1].data = Buffer.from([2]);
  transaction.partialSign(player);
  assert.throws(
    () => validateSponsoredTransaction(transaction, sponsor.publicKey, program),
    /not authorized/,
  );
});
test("a missing player signature is rejected", () => {
  const { sponsor, program, transaction } = fixture();
  transaction.partialSign(sponsor);
  assert.throws(
    () => validateSponsoredTransaction(transaction, sponsor.publicKey, program),
    /not authorized/,
  );
});
test("an otherwise signed transfer cannot use the game relay", () => {
  const { sponsor, player, program, transaction } = fixture();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: sponsor.publicKey,
      toPubkey: player.publicKey,
      lamports: 1,
    }),
  );
  transaction.sign(sponsor, player);
  assert.throws(
    () => validateSponsoredTransaction(transaction, sponsor.publicKey, program),
    /Only NOPEEK/,
  );
});
test("a different fee payer cannot borrow sponsor authorization", () => {
  const { sponsor, player, program, transaction } = fixture();
  transaction.feePayer = player.publicKey;
  transaction.sign(player);
  assert.throws(
    () => validateSponsoredTransaction(transaction, sponsor.publicKey, program),
    /not authorized/,
  );
});
