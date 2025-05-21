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
import { FungibleToken, VKeyMerkleMap } from '../NewTokenStandard.js';
import {
  MintConfig,
  MintParams,
  BurnConfig,
  BurnParams,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  OperationKeys,
} from '../configs.js';
import {
  program,
  generateDummyDynamicProof,
  generateDynamicProof,
  generateDynamicProof2,
  SideloadedProof,
  program2,
} from '../side-loaded/program.eg.js';

const proofsEnabled = true;

describe('New Token Standard Transfer Tests', () => {
  let tokenAdmin: Mina.TestPublicKey, tokenA: Mina.TestPublicKey;

  let fee: number,
    tokenContract: FungibleToken,
    mintParams: MintParams,
    burnParams: BurnParams,
    vKeyMap: VKeyMerkleMap,
    dummyVkey: VerificationKey,
    dummyProof: SideloadedProof,
    programVkey: VerificationKey,
    deployer: Mina.TestPublicKey,
    user1: Mina.TestPublicKey,
    user2: Mina.TestPublicKey,
    user3: Mina.TestPublicKey;

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

    [deployer, user1, user2, user3] = localChain.testAccounts;
    tokenContract = new FungibleToken(tokenA);

    mintParams = new MintParams({
      fixedAmount: UInt64.from(200),
      minAmount: UInt64.from(0),
      maxAmount: UInt64.from(1000),
    });

    burnParams = new BurnParams({
      fixedAmount: UInt64.from(100),
      minAmount: UInt64.from(50),
      maxAmount: UInt64.from(500),
    });

    vKeyMap = new VKeyMerkleMap();
    dummyVkey = await VerificationKey.dummy();
    dummyProof = await generateDummyDynamicProof(
      tokenContract.deriveTokenId(),
      user1
    );
    programVkey = (await program.compile()).verificationKey;
    fee = 1e8;
  });

  async function testTransferTx(
    sender: PublicKey,
    receiver: PublicKey,
    transferAmount: UInt64,
    signers: PrivateKey[],
    expectedErrorMessage?: string,
    numberOfAccounts = 1
  ) {
    try {
      const senderBalanceBefore = await tokenContract.getBalanceOf(sender);
      const receiverBalanceBefore = await tokenContract.getBalanceOf(receiver);
      const tx = await Mina.transaction({ sender, fee }, async () => {
        AccountUpdate.fundNewAccount(sender, numberOfAccounts);
        await tokenContract.transferCustom(
          sender,
          receiver,
          transferAmount,
          dummyProof,
          dummyVkey,
          vKeyMap
        );
      });
      await tx.prove();
      await tx.sign(signers).send().wait();

      const senderBalanceAfter = await tokenContract.getBalanceOf(sender);
      const receiverBalanceAfter = await tokenContract.getBalanceOf(receiver);
      expect(senderBalanceAfter).toEqual(
        senderBalanceBefore.sub(transferAmount)
      );
      expect(receiverBalanceAfter).toEqual(
        receiverBalanceBefore.add(transferAmount)
      );

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

  async function testTransferSLTx(
    sender: PublicKey,
    receiver: PublicKey,
    transferAmount: UInt64,
    signers: PrivateKey[],
    proof?: SideloadedProof,
    vKey?: VerificationKey,
    vKeyMerkleMap?: VKeyMerkleMap,
    expectedErrorMessage?: string
  ) {
    try {
      const senderBalanceBefore = await tokenContract.getBalanceOf(sender);
      const receiverBalanceBefore = await tokenContract.getBalanceOf(receiver);
      const tx = await Mina.transaction({ sender: sender, fee }, async () => {
        await tokenContract.transferCustom(
          sender,
          receiver,
          transferAmount,
          proof ?? dummyProof,
          vKey ?? dummyVkey,
          vKeyMerkleMap ?? vKeyMap
        );
      });
      await tx.prove();
      await tx.sign(signers).send().wait();

      const senderBalanceAfter = await tokenContract.getBalanceOf(sender);
      const receiverBalanceAfter = await tokenContract.getBalanceOf(receiver);
      expect(senderBalanceAfter).toEqual(
        senderBalanceBefore.sub(transferAmount)
      );
      expect(receiverBalanceAfter).toEqual(
        receiverBalanceBefore.add(transferAmount)
      );

      if (expectedErrorMessage)
        throw new Error('Test should have failed but didnt!');
    } catch (error: unknown) {
      expect((error as Error).message).toContain(expectedErrorMessage);
    }
  }

  describe('Deploy & initialize', () => {
    it('should deploy tokenA contract', async () => {
      const tx = await Mina.transaction({ sender: deployer, fee }, async () => {
        AccountUpdate.fundNewAccount(deployer);

        await tokenContract.deploy({
          symbol: 'tokA',
          src: 'https://github.com/o1-labs-XT/fungible-token-standard',
        });
      });

      tx.sign([deployer.key, tokenA.key]);

      await tx.prove();
      await tx.send();
    });

    it('should initialize tokenA contract', async () => {
      const tx = await Mina.transaction({ sender: deployer, fee }, async () => {
        AccountUpdate.fundNewAccount(deployer);
        await tokenContract.initialize(
          tokenAdmin,
          UInt8.from(9),
          MintConfig.default,
          mintParams,
          BurnConfig.default,
          burnParams,
          MintDynamicProofConfig.default,
          BurnDynamicProofConfig.default,
          TransferDynamicProofConfig.default,
          UpdatesDynamicProofConfig.default
        );
      });
      await tx.prove();
      await tx.sign([deployer.key, tokenA.key]).send();
    });

    it('should mint for user1 and user2', async () => {
      const mintAmount = UInt64.from(1000);
      const tx = await Mina.transaction({ sender: user1, fee }, async () => {
        AccountUpdate.fundNewAccount(user1, 3);
        await tokenContract.mint(
          user1,
          mintAmount,
          dummyProof,
          dummyVkey,
          vKeyMap
        );

        await tokenContract.mint(
          user2,
          mintAmount,
          dummyProof,
          dummyVkey,
          vKeyMap
        );
      });
      await tx.prove();
      await tx.sign([user1.key, tokenAdmin.key]).send().wait();
    });
  });

  // SLV = Side-Loaded Verification
  describe('Transfer: SLV disabled', () => {
    it('should do a transfer from user2 to user3', async () => {
      const transferAmount = UInt64.from(100);
      await testTransferTx(user2, user3, transferAmount, [user2.key]);
    });

    it('should reject a transaction not signed by the token holder', async () => {
      const transferAmount = UInt64.from(100);
      const expectedErrorMessage =
        'Check signature: Invalid signature on fee payer for key';
      await testTransferTx(
        user1,
        user3,
        transferAmount,
        [user3.key],
        expectedErrorMessage
      );
    });

    it("Should prevent transfers from account that's tracking circulation", async () => {
      const transferAmount = UInt64.from(100);
      const expectedErrorMessage =
        "Can't transfer to/from the circulation account";
      await testTransferTx(
        tokenA,
        user3,
        transferAmount,
        [user3.key],
        expectedErrorMessage
      );
    });

    it("Should prevent transfers to account that's tracking circulation", async () => {
      const transferAmount = UInt64.from(100);
      const expectedErrorMessage =
        "Can't transfer to/from the circulation account";
      await testTransferTx(
        user1,
        tokenA,
        transferAmount,
        [user3.key],
        expectedErrorMessage
      );
    });
  });

  describe('Update Transfer Dynamic Proof Config', () => {
    it('should reject transferDynamicProofConfig update when unauthorized by the admin', async () => {
      try {
        let transferDynamicProofConfig = TransferDynamicProofConfig.default;
        transferDynamicProofConfig.shouldVerify = Bool(true);

        const updateTransferDynamicProofConfigTx = await Mina.transaction(
          { sender: user2, fee },
          async () => {
            await tokenContract.updateTransferDynamicProofConfig(
              transferDynamicProofConfig
            );
          }
        );
        await updateTransferDynamicProofConfigTx.prove();
        await updateTransferDynamicProofConfigTx
          .sign([user2.key])
          .send()
          .wait();
      } catch (error: unknown) {
        const expectedErrorMessage =
          'the required authorization was not provided or is invalid';
        expect((error as Error).message).toContain(expectedErrorMessage);
      }
    });

    it('update transfer dynamic proof config: enable side-loaded verification', async () => {
      let transferDynamicProofConfig = TransferDynamicProofConfig.default;
      transferDynamicProofConfig.shouldVerify = Bool(true);

      const updateTransferDynamicProofConfigTx = await Mina.transaction(
        { sender: user2, fee },
        async () => {
          await tokenContract.updateTransferDynamicProofConfig(
            transferDynamicProofConfig
          );
        }
      );
      await updateTransferDynamicProofConfigTx.prove();
      await updateTransferDynamicProofConfigTx
        .sign([user2.key, tokenAdmin.key])
        .send()
        .wait();
    });
  });

  describe('Update Side-loaded vKey Hash', () => {
    it('should reject updating side-loaded vKey hash: unauthorized by the admin', async () => {
      const expectedErrorMessage =
        'the required authorization was not provided or is invalid.';
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        vKeyMap,
        OperationKeys.Transfer,
        [user1.key],
        expectedErrorMessage
      );
    });

    it('should reject updating side-loaded vKey hash: invalid operationKey', async () => {
      const expectedErrorMessage = 'Please enter a valid operation key!';
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        vKeyMap,
        Field(13),
        [user1.key, tokenAdmin.key],
        expectedErrorMessage
      );
    });

    it('should reject updating side-loaded vKey hash: non-compliant vKeyMap', async () => {
      let tamperedVKeyMap = vKeyMap.clone();
      tamperedVKeyMap.insert(13n, Field.random());

      const expectedErrorMessage =
        'Off-chain side-loaded vKey Merkle Map is out of sync!';
      await updateSLVkeyHashTx(
        user1,
        programVkey,
        tamperedVKeyMap,
        OperationKeys.Transfer,
        [user1.key, tokenAdmin.key],
        expectedErrorMessage
      );
    });

    it('should reject transfer if vKeyHash was never updated', async () => {
      const expectedErrorMessage =
        'Verification key hash is missing for this operation. Please make sure to register it before verifying a side-loaded proof when `shouldVerify` is enabled in the config.';

      await testTransferSLTx(
        user2,
        user3,
        UInt64.from(150),
        [user2.key],
        dummyProof,
        dummyVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should update the side-loaded vKey hash for transfers', async () => {
      await updateSLVkeyHashTx(user1, programVkey, vKeyMap, OperationKeys.Transfer, [
        user1.key,
        tokenAdmin.key,
      ]);
      vKeyMap.set(OperationKeys.Transfer, programVkey.hash);
      expect(tokenContract.vKeyMapRoot.get()).toEqual(vKeyMap.root);
    });
  });

  describe('Transfer: SLV enabled', () => {
    it('should reject transfer given a non-compliant vKeyMap', async () => {
      let tamperedVKeyMap = vKeyMap.clone();
      tamperedVKeyMap.insert(6n, Field.random());

      const expectedErrorMessage =
        'Off-chain side-loaded vKey Merkle Map is out of sync!';

      await testTransferSLTx(
        user2,
        user3,
        UInt64.from(50),
        [user2.key],
        dummyProof,
        dummyVkey,
        tamperedVKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject transfer given a non-compliant vKey hash', async () => {
      const expectedErrorMessage = 'Invalid side-loaded verification key!';

      await testTransferSLTx(
        user2,
        user1,
        UInt64.from(150),
        [user2.key],
        dummyProof,
        dummyVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    //! only passes when `proofsEnabled=true`
    (!proofsEnabled ? test.skip : it)(
      'should reject transfer given an invalid proof',
      async () => {
        await program2.compile();
        const transferAmount = UInt64.from(150);
        const invalidProof = await generateDynamicProof2(
          tokenContract.deriveTokenId(),
          user1
        );

        const expectedErrorMessage = 'Constraint unsatisfied (unreduced)';
        await testTransferSLTx(
          user1,
          deployer,
          transferAmount,
          [user1.key],
          invalidProof,
          programVkey,
          vKeyMap,
          expectedErrorMessage
        );
      }
    );

    it('should transfer given a valid proof', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user2
      );

      const transferAmount = UInt64.from(150);
      await testTransferSLTx(
        user2,
        user1,
        transferAmount,
        [user2.key],
        dynamicProof,
        programVkey,
        vKeyMap
      );
    });

    it('should reject transfer for a non-compliant proof recipient', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user2
      );

      const transferAmount = UInt64.from(150);
      const expectedErrorMessage = 'Recipient mismatch in side-loaded proof!';
      await testTransferSLTx(
        user1,
        user3,
        transferAmount,
        [user1.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject transfer given an invalid proof requireTokenIdMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(Field(1), user1);

      const transferAmount = UInt64.from(150);
      const expectedErrorMessage = 'Token ID mismatch between input and output';
      await testTransferSLTx(
        user1,
        user3,
        transferAmount,
        [user1.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject transfer given an invalid proof requireMinaBalanceMatch precondition', async () => {
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

      const transferAmount = UInt64.from(150);
      const expectedErrorMessage = 'Mismatch in MINA account balance.';
      await testTransferSLTx(
        user1,
        user3,
        transferAmount,
        [user1.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject transfer given an invalid proof requireCustomTokenBalanceMatch precondition', async () => {
      const dynamicProof = await generateDynamicProof(
        tokenContract.deriveTokenId(),
        user2
      );

      // user1 pays for tx fees to not get a "mina account balance mismatch" error
      // we burn tokens for user2 to change the custom token balance and test the precondition
      const burnTx = await Mina.transaction(
        { sender: user1, fee },
        async () => {
          await tokenContract.burn(
            user2,
            UInt64.from(150),
            dynamicProof,
            programVkey,
            vKeyMap
          );
        }
      );
      await burnTx.prove();
      await burnTx.sign([user1.key, user2.key]).send().wait();

      const transferAmount = UInt64.from(150);
      const expectedErrorMessage =
        'Custom token balance inconsistency detected!';
      await testTransferSLTx(
        user2,
        user3,
        transferAmount,
        [user2.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });

    it('should reject transfer given an invalid proof requireMinaNonceMatch precondition', async () => {
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

      const transferAmount = UInt64.from(150);
      const expectedErrorMessage = 'Mismatch in MINA account nonce!';
      await testTransferSLTx(
        user1,
        user3,
        transferAmount,
        [user1.key],
        dynamicProof,
        programVkey,
        vKeyMap,
        expectedErrorMessage
      );
    });
  });
});
