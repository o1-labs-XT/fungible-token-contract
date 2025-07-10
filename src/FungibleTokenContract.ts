import {
  AccountUpdate,
  AccountUpdateForest,
  assert,
  Bool,
  DeployArgs,
  Field,
  Int64,
  method,
  Permissions,
  Provable,
  PublicKey,
  State,
  state,
  Struct,
  TokenContract,
  Types,
  UInt64,
  UInt8,
  VerificationKey,
  Experimental,
  AccountUpdateTree,
} from 'o1js';
import {
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  DynamicProofConfig,
  OperationKeys,
  MERKLE_HEIGHT,
  MINA_TOKEN_ID,
} from './lib/configs.js';
import { SideloadedProof } from './lib/sideloaded.js';
import { FungibleTokenErrors } from './lib/errors.js';
import {
  SetAdminEvent,
  MintEvent,
  BurnEvent,
  TransferEvent,
  BalanceChangeEvent,
  InitializationEvent,
  VerificationKeyUpdateEvent,
  SideLoadedVKeyUpdateEvent,
  DynamicProofConfigUpdateEvent,
} from './lib/events.js';
import {
  Admin,
  Sideloaded,
  Core,
  FungibleTokenDeployProps,
} from './interfaces/index.js';

// =============================================================================
// EXPORTS
// =============================================================================

export {
  FungibleToken,
  VKeyMerkleMap,
  // Re-export all events from events.js
  SetAdminEvent,
  MintEvent,
  BurnEvent,
  TransferEvent,
  BalanceChangeEvent,
  InitializationEvent,
  VerificationKeyUpdateEvent,
  SideLoadedVKeyUpdateEvent,
  DynamicProofConfigUpdateEvent,
  // Re-export errors from errors.js
  FungibleTokenErrors,
};

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

const { IndexedMerkleMap } = Experimental;

/**
 * Merkle map for storing side-loaded verification key hashes.
 * Maps operation keys to their corresponding verification key hashes.
 */
class VKeyMerkleMap extends IndexedMerkleMap(MERKLE_HEIGHT) {}

// =============================================================================
// MAIN CONTRACT CLASS
// =============================================================================

class FungibleToken extends TokenContract implements Admin, Sideloaded, Core {
  // =============================================================================
  // STATE & EVENTS
  // =============================================================================

  @state(UInt8) decimals = State<UInt8>();
  @state(PublicKey) admin = State<PublicKey>();
  @state(Field) packedDynamicProofConfigs = State<Field>();
  @state(Field) vKeyMapRoot = State<Field>(); // The side-loaded verification key hash.

  /** Event definitions for the contract */
  readonly events = {
    SetAdmin: SetAdminEvent,
    Mint: MintEvent,
    Burn: BurnEvent,
    Transfer: TransferEvent,
    BalanceChange: BalanceChangeEvent,
    SideLoadedVKeyUpdate: SideLoadedVKeyUpdateEvent,
    Initialization: InitializationEvent,
    VerificationKeyUpdate: VerificationKeyUpdateEvent,
    DynamicProofConfigUpdate: DynamicProofConfigUpdateEvent,
  };

  // =============================================================================
  // INITIALIZATION & DEPLOYMENT
  // =============================================================================

  async deploy(props: FungibleTokenDeployProps) {
    await super.deploy(props);
    this.account.zkappUri.set(props.src);
    this.account.tokenSymbol.set(props.symbol);

    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proof(),
    });
  }

  @method
  async initialize(
    admin: PublicKey,
    decimals: UInt8,
    mintDynamicProofConfig: MintDynamicProofConfig,
    burnDynamicProofConfig: BurnDynamicProofConfig,
    transferDynamicProofConfig: TransferDynamicProofConfig,
    updatesDynamicProofConfig: UpdatesDynamicProofConfig
  ) {
    this.account.provedState.requireEquals(Bool(false));

    this.admin.set(admin);
    this.decimals.set(decimals);

    this.packedDynamicProofConfigs.set(
      MintDynamicProofConfig.packConfigs([
        mintDynamicProofConfig,
        burnDynamicProofConfig,
        transferDynamicProofConfig,
        updatesDynamicProofConfig,
      ])
    );

    const emptyVKeyMap = new VKeyMerkleMap();
    this.vKeyMapRoot.set(emptyVKeyMap.root);

    const accountUpdate = AccountUpdate.createSigned(
      this.address,
      this.deriveTokenId()
    );

    let permissions = Permissions.default();
    // This is necessary in order to allow token holders to burn.
    permissions.send = Permissions.none();
    permissions.setPermissions = Permissions.impossible();
    accountUpdate.account.permissions.set(permissions);

    this.emitEvent(
      'Initialization',
      new InitializationEvent({ admin, decimals })
    );
  }

  // =============================================================================
  // ADMIN OPERATIONS
  // =============================================================================

  /**
   * Ensures admin signature is required when condition is true.
   *
   * @param condition - Whether to require admin signature
   * @returns AccountUpdate for the admin signature
   */
  private async ensureAdminSignature(condition: Bool) {
    const admin = this.admin.getAndRequireEquals();
    const accountUpdate = AccountUpdate.createIf(condition, admin);
    accountUpdate.requireSignature();

    return accountUpdate;
  }

  @method
  async updateVerificationKey(vk: VerificationKey) {
    const canChangeVerificationKey = await this.canChangeVerificationKey(vk);
    canChangeVerificationKey.assertTrue(
      FungibleTokenErrors.noPermissionToChangeVerificationKey
    );
    this.account.verificationKey.set(vk);

    this.emitEvent(
      'VerificationKeyUpdate',
      new VerificationKeyUpdateEvent({ vKeyHash: vk.hash })
    );
  }

  @method
  async updateSideLoadedVKeyHash(
    vKey: VerificationKey,
    vKeyMap: VKeyMerkleMap,
    operationKey: Field
  ) {
    await this.ensureAdminSignature(Bool(true));
    const currentRoot = this.vKeyMapRoot.getAndRequireEquals();
    currentRoot.assertEquals(
      vKeyMap.root,
      FungibleTokenErrors.vKeyMapOutOfSync
    );

    const isValidOperationKey = operationKey
      .equals(OperationKeys.Mint)
      .or(operationKey.equals(OperationKeys.Burn))
      .or(operationKey.equals(OperationKeys.Transfer))
      .or(operationKey.equals(OperationKeys.ApproveBase));

    isValidOperationKey.assertTrue(FungibleTokenErrors.invalidOperationKey);

    const newVKeyHash = vKey.hash;
    vKeyMap = vKeyMap.clone();
    vKeyMap.set(operationKey, newVKeyHash);
    const newMerkleRoot = vKeyMap.root;

    this.vKeyMapRoot.set(newMerkleRoot);

    this.emitEvent(
      'SideLoadedVKeyUpdate',
      new SideLoadedVKeyUpdateEvent({
        operationKey,
        newVKeyHash,
        newMerkleRoot,
      })
    );
  }

  @method
  async setAdmin(admin: PublicKey) {
    const previousAdmin = this.admin.getAndRequireEquals();
    const canChangeAdmin = await this.canChangeAdmin(admin);
    canChangeAdmin.assertTrue(FungibleTokenErrors.noPermissionToChangeAdmin);

    this.admin.set(admin);
    this.emitEvent(
      'SetAdmin',
      new SetAdminEvent({
        previousAdmin,
        newAdmin: admin,
      })
    );
  }

  // =============================================================================
  // TOKEN OPERATIONS - MINTING
  // =============================================================================

  @method.returns(AccountUpdate)
  async mintWithProof(
    recipient: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey, // Provide the full verification key since only the hash is stored.
    vKeyMap: VKeyMerkleMap
  ): Promise<AccountUpdate> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const mintDynamicProofConfig = MintDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );

    await this.verifySideLoadedProof(
      proof,
      vk,
      recipient,
      mintDynamicProofConfig,
      vKeyMap,
      OperationKeys.Mint
    );

    return await this.#internalMint(recipient, amount);
  }

  @method.returns(AccountUpdate)
  async mint(recipient: PublicKey, amount: UInt64): Promise<AccountUpdate> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const mintDynamicProofConfig = MintDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );
    mintDynamicProofConfig.shouldVerify.assertFalse(
      FungibleTokenErrors.noPermissionForSideloadDisabledOperation
    );

    return await this.#internalMint(recipient, amount);
  }

  /**
   * Internal mint implementation shared by both mint() and mintWithProof().
   * Contains the core minting logic without proof verification.
   * Always requires admin signature for minting.
   */
  async #internalMint(
    recipient: PublicKey,
    amount: UInt64
  ): Promise<AccountUpdate> {
    await this.ensureAdminSignature(Bool(true));

    const accountUpdate = this.internal.mint({ address: recipient, amount });
    accountUpdate.body.useFullCommitment = Bool(true);

    recipient
      .equals(this.address)
      .assertFalse(FungibleTokenErrors.noTransferFromCirculation);

    this.approve(accountUpdate);

    this.emitEvent('Mint', new MintEvent({ recipient, amount }));

    const circulationUpdate = AccountUpdate.create(
      this.address,
      this.deriveTokenId()
    );

    circulationUpdate.balanceChange = Int64.fromUnsigned(amount);

    return accountUpdate;
  }

  // =============================================================================
  // TOKEN OPERATIONS - BURNING
  // =============================================================================

  @method.returns(AccountUpdate)
  async burnWithProof(
    from: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<AccountUpdate> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const burnDynamicProofConfig = BurnDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );

    await this.verifySideLoadedProof(
      proof,
      vk,
      from,
      burnDynamicProofConfig,
      vKeyMap,
      OperationKeys.Burn
    );

    return await this.#internalBurn(from, amount);
  }

  @method.returns(AccountUpdate)
  async burn(from: PublicKey, amount: UInt64): Promise<AccountUpdate> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const burnDynamicProofConfig = BurnDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );
    burnDynamicProofConfig.shouldVerify.assertFalse(
      FungibleTokenErrors.noPermissionForSideloadDisabledOperation
    );

    return await this.#internalBurn(from, amount);
  }

  /**
   * Internal burn implementation shared by both burn() and burnWithProof().
   * Contains the core burning logic without proof verification.
   */
  async #internalBurn(from: PublicKey, amount: UInt64): Promise<AccountUpdate> {
    const accountUpdate = this.internal.burn({ address: from, amount });
    accountUpdate.body.useFullCommitment = Bool(true);

    const circulationUpdate = AccountUpdate.create(
      this.address,
      this.deriveTokenId()
    );
    from
      .equals(this.address)
      .assertFalse(FungibleTokenErrors.noTransferFromCirculation);
    circulationUpdate.balanceChange = Int64.fromUnsigned(amount).neg();
    this.emitEvent('Burn', new BurnEvent({ from, amount }));

    return accountUpdate;
  }

  // =============================================================================
  // TOKEN OPERATIONS - TRANSFERS
  // =============================================================================

  /**
   * Standard transfer method - intentionally throws an error to guide users
   * to use transferCustom() or transferCustomWithProof() instead.
   */
  override async transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    throw Error(FungibleTokenErrors.useCustomTransferMethod);
  }

  @method
  async transferCustomWithProof(
    from: PublicKey,
    to: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ) {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const transferDynamicProofConfig = TransferDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );

    await this.verifySideLoadedProof(
      proof,
      vk,
      from,
      transferDynamicProofConfig,
      vKeyMap,
      OperationKeys.Transfer
    );

    this.internalTransfer(from, to, amount);
  }

  @method
  async transferCustom(from: PublicKey, to: PublicKey, amount: UInt64) {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const transferDynamicProofConfig = TransferDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );
    transferDynamicProofConfig.shouldVerify.assertFalse(
      FungibleTokenErrors.noPermissionForSideloadDisabledOperation
    );

    this.internalTransfer(from, to, amount);
  }

  /**
   * Internal transfer implementation shared by both transferCustom() and transferCustomWithProof().
   * Contains the core transfer logic without proof verification.
   */
  private internalTransfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    from
      .equals(this.address)
      .assertFalse(FungibleTokenErrors.noTransferFromCirculation);
    to.equals(this.address).assertFalse(
      FungibleTokenErrors.noTransferFromCirculation
    );
    const accountUpdate = this.internal.send({ from, to, amount });
    accountUpdate.body.useFullCommitment = Bool(true);

    this.emitEvent('Transfer', new TransferEvent({ from, to, amount }));
  }

  private checkPermissionsUpdate(update: AccountUpdate) {
    let permissions = update.update.permissions;

    let { access, receive } = permissions.value;
    let accessIsNone = Provable.equal(
      Types.AuthRequired,
      access,
      Permissions.none()
    );
    let receiveIsNone = Provable.equal(
      Types.AuthRequired,
      receive,
      Permissions.none()
    );
    let updateAllowed = accessIsNone.and(receiveIsNone);

    assert(
      updateAllowed.or(permissions.isSome.not()),
      FungibleTokenErrors.noPermissionChangeAllowed
    );
  }

  // =============================================================================
  // APPROVAL METHODS
  // =============================================================================

  /**
   * Standard approveBase method - intentionally throws an error to guide users
   * to use approveBaseCustom() or approveBaseCustomWithProof() instead.
   */
  async approveBase(forest: AccountUpdateForest): Promise<void> {
    throw new Error(FungibleTokenErrors.useCustomApproveMethod);
  }

  /**
   * Standard approveAccountUpdate method - intentionally throws an error to guide users
   * to use approveAccountUpdateCustom() or approveAccountUpdateCustomWithProof() instead.
   */
  override async approveAccountUpdate(
    accountUpdate: AccountUpdate | AccountUpdateTree
  ) {
    throw new Error(FungibleTokenErrors.useCustomApproveAccountUpdate);
  }

  /**
   * Standard approveAccountUpdates method - intentionally throws an error to guide users
   * to use approveAccountUpdatesCustom() or approveAccountUpdatesCustomWithProof() instead.
   */
  override async approveAccountUpdates(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[]
  ) {
    throw new Error(FungibleTokenErrors.useCustomApproveAccountUpdates);
  }

  @method
  async approveBaseCustomWithProof(
    updates: AccountUpdateForest,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const updatesDynamicProofConfig = UpdatesDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );

    await this.verifySideLoadedProof(
      proof,
      vk,
      PublicKey.empty(),
      updatesDynamicProofConfig,
      vKeyMap,
      OperationKeys.ApproveBase
    );

    this.internalApproveBase(updates);
  }

  async approveAccountUpdateCustom(
    accountUpdate: AccountUpdate | AccountUpdateTree
  ) {
    let forest = toForest([accountUpdate]);
    await this.approveBaseCustom(forest);
  }

  async approveAccountUpdatesCustom(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[]
  ) {
    let forest = toForest(accountUpdates);
    await this.approveBaseCustom(forest);
  }

  async approveBaseCustom(updates: AccountUpdateForest): Promise<void> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();
    const updatesDynamicProofConfig = UpdatesDynamicProofConfig.unpack(
      packedDynamicProofConfigs
    );
    updatesDynamicProofConfig.shouldVerify.assertFalse(
      FungibleTokenErrors.noPermissionForSideloadDisabledOperation
    );

    this.internalApproveBase(updates);
  }

  /**
   * Internal approve base implementation shared by both approveBaseCustom() and approveBaseCustomWithProof().
   * Contains the core approval logic without proof verification.
   */
  private internalApproveBase(updates: AccountUpdateForest): void {
    let totalBalance = Int64.from(0);
    this.forEachUpdate(updates, (update, usesToken) => {
      // Make sure that the account permissions are not changed
      this.checkPermissionsUpdate(update);
      update.body.useFullCommitment = Provable.if(
        usesToken,
        Bool(true),
        update.body.useFullCommitment
      );
      this.emitEventIf(
        usesToken,
        'BalanceChange',
        new BalanceChangeEvent({
          address: update.publicKey,
          amount: update.balanceChange,
        })
      );
      // Don't allow transfers to/from the account that's tracking circulation
      update.publicKey
        .equals(this.address)
        .and(usesToken)
        .assertFalse(FungibleTokenErrors.noTransferFromCirculation);

      totalBalance = Provable.if(
        usesToken,
        totalBalance.add(update.balanceChange),
        totalBalance
      );
      totalBalance.isPositive().assertFalse(FungibleTokenErrors.flashMinting);
    });
    totalBalance.assertEquals(
      Int64.zero,
      FungibleTokenErrors.unbalancedTransaction
    );
  }

  async approveAccountUpdateCustomWithProof(
    accountUpdate: AccountUpdate | AccountUpdateTree,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ) {
    let forest = toForest([accountUpdate]);
    await this.approveBaseCustomWithProof(forest, proof, vk, vKeyMap);
  }

  async approveAccountUpdatesCustomWithProof(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[],
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ) {
    let forest = toForest(accountUpdates);
    await this.approveBaseCustomWithProof(forest, proof, vk, vKeyMap);
  }

  @method.returns(UInt64)
  async getBalanceOf(address: PublicKey): Promise<UInt64> {
    const account = AccountUpdate.create(address, this.deriveTokenId()).account;
    const balance = account.balance.get();
    account.balance.requireEquals(balance);
    return balance;
  }

  async getCirculating(): Promise<UInt64> {
    let circulating = await this.getBalanceOf(this.address);
    return circulating;
  }

  @method.returns(UInt8)
  async getDecimals(): Promise<UInt8> {
    return this.decimals.getAndRequireEquals();
  }

  @method.returns(PublicKey)
  async getAdmin(): Promise<PublicKey> {
    return this.admin.getAndRequireEquals();
  }

  /**
   * Retrieves all current token configurations in packed form.
   * Caller can unpack off-chain using respective unpack methods.
   * @returns Field array: [packedDynamicProofConfigs]
   */
  async getAllConfigs(): Promise<Field[]> {
    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();

    return [packedDynamicProofConfigs];
  }

  @method
  async updateDynamicProofConfig(
    operationType: Field,
    config: DynamicProofConfig
  ) {
    this.ensureAdminSignature(Bool(true));

    const isMint = operationType.equals(OperationKeys.Mint);
    const isBurn = operationType.equals(OperationKeys.Burn);
    const isTransfer = operationType.equals(OperationKeys.Transfer);
    const isApproveBase = operationType.equals(OperationKeys.ApproveBase);

    // Ensure operationType is valid
    isMint
      .or(isBurn)
      .or(isTransfer)
      .or(isApproveBase)
      .assertTrue(
        'Invalid operation type: must be Mint, Burn, Transfer, or ApproveBase'
      );

    const packedDynamicProofConfigs =
      this.packedDynamicProofConfigs.getAndRequireEquals();

    // Update the packed configs based on operation type
    // Each config occupies 7 bits: Mint(0-6), Burn(7-13), Transfer(14-20), ApproveBase(21-27)
    const allBits = packedDynamicProofConfigs.toBits(28);
    const configBits = config.toBits();

    // Create updated configurations for each operation type
    const mintUpdatedField = Field.fromBits([
      ...configBits,
      ...allBits.slice(7, 28),
    ]);
    const burnUpdatedField = Field.fromBits([
      ...allBits.slice(0, 7),
      ...configBits,
      ...allBits.slice(14, 28),
    ]);
    const transferUpdatedField = Field.fromBits([
      ...allBits.slice(0, 14),
      ...configBits,
      ...allBits.slice(21, 28),
    ]);
    const approveUpdatedField = Field.fromBits([
      ...allBits.slice(0, 21),
      ...configBits,
    ]);

    const newPackedConfig = Provable.switch(
      [isMint, isBurn, isTransfer, isApproveBase],
      Field,
      [
        mintUpdatedField,
        burnUpdatedField,
        transferUpdatedField,
        approveUpdatedField,
      ]
    );
    this.packedDynamicProofConfigs.set(newPackedConfig);

    this.emitEvent(
      'DynamicProofConfigUpdate',
      new DynamicProofConfigUpdateEvent({
        operationType,
        newConfig: newPackedConfig,
      })
    );
  }

  //! A config can be added to enforce additional conditions when updating the verification key.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async canChangeVerificationKey(_vk: VerificationKey): Promise<Bool> {
    await this.ensureAdminSignature(Bool(true));
    return Bool(true);
  }

  //! A config can be added to enforce additional conditions when updating the admin public key.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async canChangeAdmin(_admin: PublicKey) {
    await this.ensureAdminSignature(Bool(true));
    return Bool(true);
  }

  private async verifySideLoadedProof(
    proof: SideloadedProof,
    vk: VerificationKey,
    recipient: PublicKey,
    dynamicProofConfig: DynamicProofConfig,
    vKeyMap: VKeyMerkleMap,
    operationKey: Field
  ) {
    const {
      shouldVerify,
      requireRecipientMatch,
      requireTokenIdMatch,
      requireMinaBalanceMatch,
      requireCustomTokenBalanceMatch,
      requireMinaNonceMatch,
      requireCustomTokenNonceMatch,
    } = dynamicProofConfig;

    const vkeyMapRoot = this.vKeyMapRoot.getAndRequireEquals();
    const isRootCompliant = Provable.if(
      shouldVerify,
      vkeyMapRoot.equals(vKeyMap.root),
      Bool(true)
    );
    isRootCompliant.assertTrue(FungibleTokenErrors.vKeyMapOutOfSync);

    const operationVKeyHashOption = vKeyMap.getOption(operationKey);
    const vKeyHashIsSome = Provable.if(
      shouldVerify,
      operationVKeyHashOption.isSome,
      Bool(true)
    );
    vKeyHashIsSome.assertTrue(FungibleTokenErrors.missingVKeyForOperation);

    // Ensure the provided side-loaded verification key hash matches the stored on-chain state.
    //! This is the same as the isSome check but is given a value here to ignore an error when `shouldVerify` is false.
    const operationVKeyHash = operationVKeyHashOption.orElse(0n);
    const isVKeyValid = Provable.if(
      shouldVerify,
      vk.hash.equals(operationVKeyHash),
      Bool(true)
    );
    isVKeyValid.assertTrue(FungibleTokenErrors.invalidSideLoadedVKey);

    const { address } = proof.publicInput;

    // Check that the address in the proof corresponds to the recipient passed by the provable method.
    const isRecipientValid = Provable.if(
      shouldVerify,
      address.equals(recipient).or(requireRecipientMatch.not()),
      Bool(true)
    );
    isRecipientValid.assertTrue(FungibleTokenErrors.recipientMismatch);

    const {
      minaAccountData,
      tokenIdAccountData,
      minaBalance,
      tokenIdBalance,
      minaNonce,
      tokenIdNonce,
    } = proof.publicOutput;

    // Verify that the tokenId provided in the public input matches the tokenId in the public output,
    // unless token ID matching is not enforced.
    Provable.if(
      shouldVerify,
      tokenIdAccountData.tokenId
        .equals(this.deriveTokenId())
        .or(requireTokenIdMatch.not()),
      Bool(true)
    ).assertTrue(FungibleTokenErrors.tokenIdMismatch);

    // Ensure the MINA account data uses native MINA.
    Provable.if(
      shouldVerify,
      minaAccountData.tokenId.equals(MINA_TOKEN_ID),
      Bool(true)
    ).assertTrue(FungibleTokenErrors.incorrectMinaTokenId);

    // Verify that the MINA balance captured during proof generation matches the current on-chain balance at verification.
    // unless balance matching is not enforced.
    Provable.if(
      shouldVerify,
      minaAccountData.account.balance
        .get()
        .equals(minaBalance)
        .or(requireMinaBalanceMatch.not()),
      Bool(true)
    ).assertTrue(FungibleTokenErrors.minaBalanceMismatch);

    // Verify that the CUSTOM TOKEN balance captured during proof generation matches the current on-chain balance at verification.
    // unless balance matching is not enforced.
    Provable.if(
      shouldVerify,
      tokenIdAccountData.account.balance
        .get()
        .equals(tokenIdBalance)
        .or(requireCustomTokenBalanceMatch.not()),
      Bool(true)
    ).assertTrue(FungibleTokenErrors.customTokenBalanceMismatch);

    // Verify that the MINA account nonce captured during proof generation matches the nonce at verification.
    // unless nonce matching is not enforced.
    Provable.if(
      shouldVerify,
      minaAccountData.account.nonce
        .get()
        .equals(minaNonce)
        .or(requireMinaNonceMatch.not()),
      Bool(true)
    ).assertTrue(FungibleTokenErrors.minaNonceMismatch);

    // Verify that the CUSTOM TOKEN nonce captured during proof generation matches the nonce at verification.
    // unless nonce matching is not enforced.
    Provable.if(
      shouldVerify,
      tokenIdAccountData.account.nonce
        .get()
        .equals(tokenIdNonce)
        .or(requireCustomTokenNonceMatch.not()),
      Bool(true)
    ).assertTrue(FungibleTokenErrors.customTokenNonceMismatch);

    // Conditionally verify the provided side-loaded proof.
    proof.verifyIf(vk, shouldVerify);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// copied from: https://github.com/o1-labs/o1js/blob/6ebbc23710f6de023fea6d83dc93c5a914c571f2/src/lib/mina/token/token-contract.ts#L189
function toForest(
  updates: (AccountUpdate | AccountUpdateTree)[]
): AccountUpdateForest {
  let trees = updates.map((a) =>
    a instanceof AccountUpdate ? a.extractTree() : a
  );
  return AccountUpdateForest.fromReverse(trees);
}
