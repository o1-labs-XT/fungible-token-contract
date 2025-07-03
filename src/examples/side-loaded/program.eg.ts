import {
  ZkProgram,
  Field,
  AccountUpdate,
  PublicKey,
  UInt64,
  UInt32,
} from 'o1js';
import { PublicInputs, PublicOutputs, SideloadedProof } from '../../lib/sideloaded.js';

export {
  program,
  ProgramProof,
  SideloadedProof,
  PublicInputs,
  PublicOutputs,
  generateDummyDynamicProof,
  generateDynamicProof,
  program2,
  Program2Proof,
  generateDynamicProof2,
};

const program = ZkProgram({
  name: 'approve-mint',
  publicInput: PublicInputs,
  publicOutput: PublicOutputs,
  methods: {
    approveMint: {
      privateInputs: [],
      async method(publicInputs: PublicInputs) {
        const { tokenId, address } = publicInputs;

        const minaAccountData = AccountUpdate.default(address);
        const tokenIdAccountData = AccountUpdate.default(address, tokenId);

        const minaBalance = minaAccountData.account.balance.get();
        minaBalance.assertGreaterThan(UInt64.from(100 * 1e9));

        const tokenIdBalance = tokenIdAccountData.account.balance.get();
        tokenIdBalance.assertGreaterThanOrEqual(UInt64.from(150));

        const minaNonce = minaAccountData.account.nonce.get();
        minaNonce.assertGreaterThanOrEqual(UInt32.from(2));

        const tokenIdNonce = tokenIdAccountData.account.nonce.get();
        tokenIdNonce.assertGreaterThanOrEqual(UInt32.from(0));

        return {
          publicOutput: new PublicOutputs({
            minaAccountData,
            tokenIdAccountData,
            minaBalance,
            tokenIdBalance,
            minaNonce,
            tokenIdNonce,
          }),
        };
      },
    },
  },
});

class ProgramProof extends ZkProgram.Proof(program) {}

// ---------------------- UTILS ----------------------------

async function generateDynamicProof(tokenId: Field, address: PublicKey) {
  const publicInputs = new PublicInputs({
    tokenId,
    address,
  });

  const proof = (await program.approveMint(publicInputs)).proof;
  const dynamicProof = SideloadedProof.fromProof(proof);

  return dynamicProof;
}

async function generateDummyDynamicProof(tokenId: Field, address: PublicKey) {
  const publicInputs = new PublicInputs({
    tokenId,
    address,
  });
  const publicOutputs = new PublicOutputs({
    minaAccountData: AccountUpdate.dummy(),
    tokenIdAccountData: AccountUpdate.dummy(),
    minaBalance: UInt64.from(0),
    tokenIdBalance: UInt64.from(0),
    minaNonce: UInt32.from(0),
    tokenIdNonce: UInt32.from(0),
  });

  let dummyProof = await program.Proof.dummy(publicInputs, publicOutputs, 0);
  const dynamicDummyProof = SideloadedProof.fromProof(dummyProof);

  return dynamicDummyProof;
}

// ---------------------------------------------------------------------------
const program2 = ZkProgram({
  name: 'approve-mint',
  publicInput: PublicInputs,
  publicOutput: PublicOutputs,
  methods: {
    approveMint2: {
      privateInputs: [],
      async method(publicInputs: PublicInputs) {
        const { tokenId, address } = publicInputs;

        const minaAccountData = AccountUpdate.default(address);
        const tokenIdAccountData = AccountUpdate.default(address, tokenId);

        const minaBalance = minaAccountData.account.balance.get();
        minaBalance.assertGreaterThan(UInt64.from(100 * 1e9));
        // new
        minaBalance.assertLessThanOrEqual(UInt64.from(1000 * 1e9));

        const tokenIdBalance = tokenIdAccountData.account.balance.get();
        tokenIdBalance.assertGreaterThanOrEqual(UInt64.from(150));

        const minaNonce = minaAccountData.account.nonce.get();
        minaNonce.assertGreaterThanOrEqual(UInt32.from(2));

        const tokenIdNonce = tokenIdAccountData.account.nonce.get();
        tokenIdNonce.assertEquals(UInt32.from(0));

        return {
          publicOutput: new PublicOutputs({
            minaAccountData,
            tokenIdAccountData,
            minaBalance,
            tokenIdBalance,
            minaNonce,
            tokenIdNonce,
          }),
        };
      },
    },
  },
});

class Program2Proof extends ZkProgram.Proof(program2) {}

async function generateDynamicProof2(tokenId: Field, address: PublicKey) {
  const publicInputs = new PublicInputs({
    tokenId,
    address,
  });

  const proof2 = (await program2.approveMint2(publicInputs)).proof;
  const dynamicProof = SideloadedProof.fromProof(proof2);

  return dynamicProof;
}
