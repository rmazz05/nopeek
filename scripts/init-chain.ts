import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getArciumProgram,
  getCompDefAccAddress,
  getCompDefAccOffset,
  getLookupTableAddress,
  getMXEAccAddress,
  uploadCircuit,
} from "@arcium-hq/client";
import { chainContext, projectRoot } from "./chain-context";

export async function initializeCircuits() {
  const { payer, connection, provider, program } = chainContext();
  const mxeAccount = getMXEAccAddress(program.programId);
  const mxe =
    await getArciumProgram(provider).account.mxeAccount.fetch(mxeAccount);
  const addressLookupTable = getLookupTableAddress(
    program.programId,
    mxe.lutOffsetSlot,
  );
  for (const [name, method] of [
    ["seal_room", "initSealRoomCompDef"],
    ["check_guess", "initCheckGuessCompDef"],
  ]) {
    const compDefAccount = getCompDefAccAddress(
      program.programId,
      Buffer.from(getCompDefAccOffset(name)).readUInt32LE(),
    );
    if (!(await connection.getAccountInfo(compDefAccount))) {
      const signature = await program.methods[method]()
        .accountsPartial({
          payer: payer.publicKey,
          mxeAccount,
          compDefAccount,
          addressLookupTable,
        })
        .rpc();
      console.log(`${name} definition: ${signature}`);
    }
    const signatures = await uploadCircuit(
      provider,
      name,
      program.programId,
      readFileSync(resolve(projectRoot, `chain/build/${name}.arcis`)),
      true,
      4,
    );
    console.log(
      `${name} ready (${signatures.length} upload/finalize transactions)`,
    );
  }
}
if (process.argv[1]?.endsWith("init-chain.ts"))
  initializeCircuits().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
