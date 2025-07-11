import {
  AccountUpdate,
  Bool,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
  UInt8,
  VerificationKey,
} from 'o1js';
import {
  FungibleToken,
  FungibleTokenErrors,
  VKeyMerkleMap,
} from '../FungibleTokenContract.js';
import {
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  OperationKeys,
} from '../lib/configs.js';
import {
  program,
  generateDummyDynamicProof,
  generateDynamicProof,
  generateDynamicProof2,
  SideloadedProof,
  program2,
} from '../examples/side-loaded/program.eg.js';
import { TEST_ERROR_MESSAGES } from './constants.js';

const proofsEnabled = false;

describe('Fungible Token - Mint Tests', () => {
  let tokenAdmin: Mina.TestPublicKey, tokenA: Mina.TestPublicKey;

  let fee: number,
    tokenContract: FungibleToken,
    vKeyMap: VKeyMerkleMap,
    dummyVkey: VerificationKey,
    dummyProof: SideloadedProof,
    programVkey: VerificationKey,
    deployer: Mina.TestPublicKey,
    user1: Mina.TestPublicKey,
    user2: Mina.TestPublicKey;

  beforeAll(async () => {
    if (proofsEnabled) {
      await FungibleToken.compile();
    }

    const localChain = await Mina.LocalBlockchain({
      proofsEnabled,
      enforceTransactionLimits: false,
    });

    Mina.setActiveInstance(localChain);

    [tokenAdmin, tokenA] = Mina.TestPublicKey.random(7);

    [deployer, user1, user2] = localChain.testAccounts;
    tokenContract = new FungibleToken(tokenA);

    vKeyMap = new VKeyMerkleMap();
    dummyVkey = await VerificationKey.dummy();
    dummyProof = await generateDummyDynamicProof(
      tokenContract.deriveTokenId(),
      user1
    );
    programVkey = (await program.compile()).verificationKey;
    fee = 1e8;
  });

  async function testInitializeTx(
    signers: PrivateKey[],
    expectedErrorMessage?: string
  ) {
    try {
      const tx = await Mina.transaction({ sender: deployer, fee }, async () => {
        AccountUpdate.fundNewAccount(deployer);
        await tokenContract.initialize(
          tokenAdmin,
          UInt8.from(9),
          MintDynamicProofConfig.default,
          BurnDynamicProofConfig.default,
          TransferDynamicProofConfig.default,
          UpdatesDynamicProofConfig.default
        );
      });
      await tx.prove();
      await tx.sign(signers).send();

      if (expectedErrorMessage)
        throw new Error('Test should have failed but didnt!');
    } catch (error: unknown) {
      expect((error as Error).message).toContain(expectedErrorMessage);
    }
  }

  async function testMintSideloadDisabledTx(
    user: PublicKey,
    mintAmount: UInt64,
    signers: PrivateKey[],
    expectedErrorMessage?: string,
    numberOfAccounts = 2
  ) {
    try {
      const userBalanceBefore = await tokenContract.getBalanceOf(user);
      const tx = await Mina.transaction({ sender: user, fee }, async () => {
        AccountUpdate.fundNewAccount(user, numberOfAccounts);
        await tokenContract.mint(user, mintAmount);
      });
      await tx.prove();
      await tx.sign(signers).send().wait();

      const userBalanceAfter = await tokenContract.getBalanceOf(user);
      expect(userBalanceAfter).toEqual(userBalanceBefore.add(mintAmount));

      if (expectedErrorMessage)
        throw new Error('Test should have failed but didnt!');
    } catch (error: unknown) {
      expect((error as Error).message).toContain(expectedErrorMessage);
    }
  }

  async function updateSLVkeyHashTx(
    sender: PublicKey,
    vKey: VerificationKey,
    vKeyMap: VKeyMerkleMap,
    operationKey: Field,
    signers: PrivateKey[],
    expectedErrorMessage?: string
  ) {
    try {
      const updateVkeyTx = await Mina.transaction({ sender, fee }, async () => {
        await tokenContract.updateSideLoadedVKeyHash(
          vKey,
          vKeyMap,
          operationKey
        );
      });
      await updateVkeyTx.prove();
      await updateVkeyTx.sign(signers).send().wait();

      if (expectedErrorMessage)
        throw new Error('Test should have failed but didnt!');
    } catch (error: unknown) {
      expect((error as Error).message).toContain(expectedErrorMessage);
    }
  }

  async function testMintSLTx(
    user: PublicKey,
    mintAmount: UInt64,
    signers: PrivateKey[],
    proof?: SideloadedProof,
    vKey?: VerificationKey,
    vKeyMerkleMap?: VKeyMerkleMap,
    expectedErrorMessage?: string
  ) {
    try {
      const userBalanceBefore = await tokenContract.getBalanceOf(user);
      const tx = await Mina.transaction({ sender: user, fee }, async () => {
        await tokenContract.mintWithProof(
          user,
          mintAmount,
          proof ?? dummyProof,
          vKey ?? dummyVkey,
          vKeyMerkleMap ?? vKeyMap
        );
      });
      await tx.prove();
      await tx.sign(signers).send().wait();

      const userBalanceAfter = await tokenContract.getBalanceOf(user);
      expect(userBalanceAfter).toEqual(userBalanceBefore.add(mintAmount));

      if (expectedErrorMessage)
        throw new Error('Test should have failed but didnt!');
    } catch (error: unknown) {
      expect((error as Error).message).toContain(expectedErrorMessage);
    }
  }

  describe('Contract Deployment and Initialization', () => {
    it('should deploy token contract successfully', async () => {
      const tx = await Mina.transaction({ sender: deployer, fee }, async () => {
        AccountUpdate.fundNewAccount(deployer);

        await tokenContract.deploy({
          symbol: 'tokA',
          src: 'https://github.com/o1-labs-XT/fungible-token-contract',
        });
      });

      tx.sign([deployer.key, tokenA.key]);

      await tx.prove();
      await tx.send();
    });

    it('should initialize token contract successfully', async () => {
      await testInitializeTx([deployer.key, tokenA.key]);
    });
  });

  describe('Mint Operations', () => {
    it('should mint tokens successfully', async () => {
      const mintAmount = UInt64.from(200);
      await testMintSideloadDisabledTx(user1, mintAmount, [
        user1.key,
        tokenAdmin.key,
      ]);
    });

    it('should reject minting when not authorized by admin', async () => {
      const mintAmount = UInt64.from(100);
      const expectedErrorMessage =
        TEST_ERROR_MESSAGES.NO_AUTHORIZATION_PROVIDED;
      await testMintSideloadDisabledTx(
        user1,
        mintAmount,
        [user1.key],
        expectedErrorMessage
      );
    });
  });

  describe('Mint Dynamic Proof Config Updates', () => {
    it('should reject mintDynamicProofConfig update when unauthorized by admin', async () => {
      try {
        let mintDynamicProofConfig = MintDynamicProofConfig.default;
        mintDynamicProofConfig.shouldVerify = Bool(true);

        const updateMintDynamicProofConfigTx = await Mina.transaction(
          { sender: user2, fee },
          async () => {
            await tokenContract.updateDynamicProofConfig(
              OperationKeys.Mint,
              mintDynamicProofConfig
            );
          }
        );
        await updateMintDynamicProofConfigTx.prove();
        await updateMintDynamicProofConfigTx.sign([user2.key]).send().wait();
      } catch (error: unknown) {
        const expectedErrorMessage =
          TEST_ERROR_MESSAGES.NO_AUTHORIZATION_PROVIDED;
        expect((error as Error).message).toContain(expectedErrorMessage);
      }
    });

    it('should update mint dynamic proof config: enable side-loaded verification', async () => {
      let mintDynamicProofConfig = MintDynamicProofConfig.default;
      mintDynamicProofConfig.shouldVerify = Bool(true);

      const updateMintDynamicProofConfigTx = await Mina.transaction(
        { sender: user2, fee },
        async () => {
          await tokenContract.updateDynamicProofConfig(
            OperationKeys.Mint,
            mintDynamicProofConfig
          );
        }
      );
      await updateMintDynamicProofConfigTx.prove();
      await updateMintDynamicProofConfigTx
        .sign([user2.key, tokenAdmin.key])
        .send()
        .wait();
    });
  });

  describe('Side-loaded Verification Key Updates', () => {
    it('should reject updating sideloaded verification key hash: unauthorized by admin', async () => {
      const expectedErrorMessage =
        TEST_ERROR_MESSAGES.NO_AUTHORIZATION_PROVIDED;
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        vKeyMap,
        OperationKeys.Mint,
        [user1.key],
        expectedErrorMessage
      );
    });

    it('should reject updating sideloaded verification key hash: invalid operationKey', async () => {
      const expectedErrorMessage = FungibleTokenErrors.invalidOperationKey;
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        vKeyMap,
        Field(13),
        [user1.key, tokenAdmin.key],
        expectedErrorMessage
      );
    });

    it('should reject updating sideloaded verification key hash: non-compliant vKeyMap', async () => {
      let tamperedVKeyMap = vKeyMap.clone();
      tamperedVKeyMap.insert(13n, Field.random());

      const expectedErrorMessage = FungibleTokenErrors.vKeyMapOutOfSync;
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        tamperedVKeyMap,
        OperationKeys.Mint,
        [user1.key, tokenAdmin.key],
        expectedErrorMessage
      );
    });

    it('should reject mint if vKeyHash was never updated', async () => {
      const expectedErrorMessage = FungibleTokenErrors.missingVKeyForOperation;
      const mintAmount = UInt64.from(100);
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dummyProof,
        dummyVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should update the sideloaded verification key hash for minting', async () => {
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        vKeyMap,
        OperationKeys.Mint,
        [user1.key, tokenAdmin.key]
      );
      vKeyMap.set(OperationKeys.Mint, programVkey.hash);
    });
  });

  describe('Side-loaded Mint Operations', () => {
    it('should reject mint with non-compliant vKeyMap', async () => {
      const expectedErrorMessage = FungibleTokenErrors.vKeyMapOutOfSync;
      let tamperedVKeyMap = vKeyMap.clone();
      tamperedVKeyMap.insert(13n, Field.random());
      const mintAmount = UInt64.from(100);
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dummyProof,
        dummyVkey,
        tamperedVKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject mintSideloadDisabled when side-loading is enabled', async () => {
      const expectedErrorMessage =
        FungibleTokenErrors.noPermissionForSideloadDisabledOperation;
      const mintAmount = UInt64.from(100);
      await testMintSideloadDisabledTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        expectedErrorMessage
      );
    });

    it('should reject mint with non-compliant vKey hash', async () => {
      const expectedErrorMessage = FungibleTokenErrors.invalidSideLoadedVKey;
      const mintAmount = UInt64.from(100);
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dummyProof,
        dummyVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    //! only passes when `proofsEnabled=true`
    (!proofsEnabled ? test.skip : it)(
      'should reject mint with invalid proof',
      async () => {
        await program2.compile();
        const mintAmount = UInt64.from(100);
        const invalidProof = await generateDynamicProof2(
          tokenContract.deriveTokenId(),
          user1
        );

        const expectedErrorMessage = TEST_ERROR_MESSAGES.CONSTRAINT_UNSATISFIED;
        await testMintSLTx(
          user1,
          mintAmount,
          [user1.key, tokenAdmin.key],
          invalidProof,
          programVkey,
          vKeyMap,
          expectedErrorMessage
        );
      }
    );

    it('should mint with valid proof', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user1
      );

      const mintAmount = UInt64.from(100);
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap
      );
    });

    it('should reject mint for a non-compliant proof recipient', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user1
      );

      const mintAmount = UInt64.from(100);
      const expectedErrorMessage = FungibleTokenErrors.recipientMismatch;
      await testMintSLTx(
        user2,
        mintAmount,
        [user2.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject mint with invalid proof requireTokenIdMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(Field(1), user1);

      const mintAmount = UInt64.from(100);
      const expectedErrorMessage = FungibleTokenErrors.tokenIdMismatch;
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject mint with invalid proof requireMinaBalanceMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user1
      );

      const sendMinaTx = await Mina.transaction(
        { sender: user1, fee },
        async () => {
          const sendUpdate = AccountUpdate.createSigned(user1);
          sendUpdate.send({
            to: deployer,
            amount: UInt64.from(1e9),
          });
        }
      );
      sendMinaTx.prove();
      sendMinaTx.sign([user1.key]).send().wait();

      const mintAmount = UInt64.from(100);
      const expectedErrorMessage = FungibleTokenErrors.minaBalanceMismatch;
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject mint with invalid proof requireCustomTokenBalanceMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user1
      );

      // mint tokens for user1 to change the custom token balance and test the precondition
      const mintTx = await Mina.transaction(
        { sender: user2, fee },
        async () => {
          await tokenContract.mintWithProof(
            user1,
            UInt64.from(150),
            dynamicProof,
            programVkey,
            vKeyMap
          );
        }
      );
      await mintTx.prove();
      await mintTx.sign([user2.key, tokenAdmin.key]).send().wait();

      const mintAmount = UInt64.from(100);
      const expectedErrorMessage =
        FungibleTokenErrors.customTokenBalanceMismatch;
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject mint with invalid proof requireMinaNonceMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user1
      );

      // user1 pays for tx fees to increase the nonce of his mina account
      // user2 sends the fee amount to user1 to conserve the balance of the mina account
      const sendTx = await Mina.transaction(
        { sender: user1, fee },
        async () => {
          const sendUpdate = AccountUpdate.createSigned(user2);
          sendUpdate.send({
            to: user1,
            amount: fee,
          });
        }
      );

      await sendTx.prove();
      await sendTx.sign([user1.key, user2.key]).send().wait();

      const mintAmount = UInt64.from(100);
      const expectedErrorMessage = FungibleTokenErrors.minaNonceMismatch;
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject mint with invalid proof requireCustomTokenNonceMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user1
      );

      // mint tokens for user1 to increase the nonce of his custom token account
      const mintTx = await Mina.transaction(
        { sender: user2, fee },
        async () => {
          await tokenContract.mintWithProof(
            user1,
            UInt64.from(150),
            dynamicProof,
            programVkey,
            vKeyMap
          );
        }
      );
      await mintTx.prove();
      await mintTx.sign([user2.key, tokenAdmin.key]).send().wait();

      const mintAmount = UInt64.from(100);
      const expectedErrorMessage =
        FungibleTokenErrors.customTokenBalanceMismatch;
      await testMintSLTx(
        user1,
        mintAmount,
        [user1.key, tokenAdmin.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });
  });
});
