import { ComputeBudgetProgram, PublicKey, Transaction } from "@solana/web3.js";

export function validateSponsoredTransaction(
  transaction: Transaction,
  sponsor: PublicKey,
  gameProgram: PublicKey,
) {
  if (!transaction.feePayer?.equals(sponsor) || !transaction.verifySignatures())
    throw new Error("This transaction is not authorized.");
  if (
    transaction.instructions.length !== 2 ||
    !transaction.instructions[0].programId.equals(
      ComputeBudgetProgram.programId,
    ) ||
    !transaction.instructions[1].programId.equals(gameProgram)
  )
    throw new Error("Only NOPEEK game actions can be sponsored.");
}
