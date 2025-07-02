import { AccountUpdate, Mina, PrivateKey, UInt8, UInt64 } from 'o1js';
import { FungibleToken, VKeyMerkleMap } from '../FungibleTokenContract.js';
import { VerificationKey } from 'o1js';
import {
  generateDummyDynamicProof,
  SideloadedProof,
} from '../side-loaded/program.eg.js';
import {
  MintConfig,
  MintParams,
  BurnConfig,
  BurnParams,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
} from '../configs.js';
import { equal } from 'node:assert';
import { CoreToken } from '../CoreToken.js';

const localChain = await Mina.LocalBlockchain({
  proofsEnabled: false,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(localChain);

const fee = 1e8;

const [deployer, owner, admin, alexa, billy] = localChain.testAccounts;
const contract = PrivateKey.randomKeypair();
const token = new CoreToken(contract.publicKey);

console.log('Deploying token contract.');
const deployTx = await Mina.transaction(
  {
    sender: deployer,
    fee,
  },
  async () => {
    AccountUpdate.fundNewAccount(deployer, 2);

    await token.deploy({
      symbol: 'DNB',
      src: 'https://github.com/o1-labs-XT/fungible-token-contract/blob/main/src/FungibleTokenContract.ts',
    });

    await token.initialize(admin, UInt8.from(9));
  }
);

await deployTx.prove();
deployTx.sign([deployer.key, contract.privateKey]);
const deployTxResult = await deployTx.send().then((v) => v.wait());
console.log('Deploy tx result:', deployTxResult.toPretty());
equal(deployTxResult.status, 'included');

const alexaBalanceBeforeMint = (await token.getBalanceOf(alexa)).toBigInt();
console.log('Alexa balance before mint:', alexaBalanceBeforeMint);
equal(alexaBalanceBeforeMint, 0n);

console.log('Minting new tokens to Alexa.');
const vKeyMap = new VKeyMerkleMap();
const dummyVkey = await VerificationKey.dummy();
const dummyProof: SideloadedProof = await generateDummyDynamicProof(
  token.deriveTokenId(),
  alexa
);
const mintTx = await Mina.transaction({ sender: owner, fee }, async () => {
  AccountUpdate.fundNewAccount(owner, 1);
  await token.mint(alexa, UInt64.from(1000));
});
await mintTx.prove();
mintTx.sign([owner.key, admin.key]);
const mintTxResult = await mintTx.send().then((v) => v.wait());
console.log('Mint tx result:', mintTxResult.toPretty());
equal(mintTxResult.status, 'included');

const alexaBalanceAfterMint = (await token.getBalanceOf(alexa)).toBigInt();
console.log('Alexa balance after mint:', alexaBalanceAfterMint);
equal(alexaBalanceAfterMint, 1000n);

const billyBalanceBeforeMint = await token.getBalanceOf(billy);
console.log('Billy balance before mint:', billyBalanceBeforeMint.toBigInt());
equal(alexaBalanceBeforeMint, 0n);

console.log('Transferring tokens from Alexa to Billy');
const transferTx = await Mina.transaction({ sender: alexa, fee }, async () => {
  AccountUpdate.fundNewAccount(alexa, 1);
  await token.transferCustom(alexa, billy, UInt64.from(1000));
});

await transferTx.prove();
transferTx.sign([alexa.key]);

const transferTxResult = await transferTx.send().then((v) => v.wait());
console.log('Transfer tx result:', transferTxResult.toPretty());

const alexaBalanceAfterTransfer = (await token.getBalanceOf(alexa)).toBigInt();
console.log('Alexa balance after transfer:', alexaBalanceAfterTransfer);
equal(alexaBalanceAfterTransfer, 0n);

const billyBalanceAfterTransfer = (await token.getBalanceOf(billy)).toBigInt();
console.log('Billy balance after transfer:', billyBalanceAfterTransfer);
equal(billyBalanceAfterTransfer, UInt64.from(1000).toBigInt());

console.log("Burning Billy's tokens");
const burnTx = await Mina.transaction({ sender: billy, fee }, async () => {
  await token.burn(billy, UInt64.from(1000));
});
await burnTx.prove();
burnTx.sign([billy.key]);
const burnTxResult = await burnTx.send().then((v) => v.wait());
console.log('Burn tx result:', burnTxResult.toPretty());
equal(burnTxResult.status, 'included');

const billyBalanceAfterBurn = (await token.getBalanceOf(billy)).toBigInt();
console.log('Billy balance after burn:', billyBalanceAfterBurn);
equal(
  billyBalanceAfterBurn,
  UInt64.from(1000).toBigInt() - UInt64.from(1000).toBigInt()
);
