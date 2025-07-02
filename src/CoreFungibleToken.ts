import {
  AccountUpdate,
  AccountUpdateForest,
  AccountUpdateTree,
  Field,
  PublicKey,
  UInt64,
  UInt8,
  VerificationKey,
} from 'o1js';
import { FungibleToken, VKeyMerkleMap } from './FungibleTokenContract.js';
import {
  BurnConfig,
  BurnParams,
  MintConfig,
  MintParams,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
} from './configs.js';

const defaultMintParams = MintParams.create(MintConfig.default, {
  minAmount: UInt64.from(1),
  maxAmount: UInt64.MAXINT(),
});

const defaultBurnParams = BurnParams.create(BurnConfig.default, {
  minAmount: UInt64.from(1),
  maxAmount: UInt64.MAXINT(),
});

export class CoreToken {
  token: FungibleToken;

  constructor(address: PublicKey) {
    this.token = new FungibleToken(address);
  }

  async deploy(options: { symbol: string; src: string }) {
    return await this.token.deploy(options);
  }

  async initialize(admin: PublicKey, decimals: UInt8) {
    return await this.token.initialize(
      admin,
      decimals,
      MintConfig.default,
      defaultMintParams,
      BurnConfig.default,
      defaultBurnParams,
      MintDynamicProofConfig.default,
      BurnDynamicProofConfig.default,
      TransferDynamicProofConfig.default,
      UpdatesDynamicProofConfig.default
    );
  }

  async mint(recipient: PublicKey, amount: UInt64) {
    return await this.token.mint(recipient, amount);
  }

  async burn(from: PublicKey, amount: UInt64) {
    return await this.token.burn(from, amount);
  }

  async transfer(from: PublicKey, to: PublicKey, amount: UInt64) {
    return await this.token.transferCustom(from, to, amount);
  }

  async setAdmin(admin: PublicKey) {
    return await this.token.setAdmin(admin);
  }

  async updateVerificationKey(vk: VerificationKey) {
    return await this.token.updateVerificationKey(vk);
  }

  async updateSideLoadedVKeyHash(
    vKey: VerificationKey,
    vKeyMap: VKeyMerkleMap,
    operationKey: Field
  ) {
    return await this.token.updateSideLoadedVKeyHash(
      vKey,
      vKeyMap,
      operationKey
    );
  }

  // Approval methods
  async approveAccountUpdateCustom(
    accountUpdate: AccountUpdate | AccountUpdateTree
  ) {
    return await this.token.approveAccountUpdateCustom(accountUpdate);
  }

  async approveAccountUpdatesCustom(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[]
  ) {
    return await this.token.approveAccountUpdatesCustom(accountUpdates);
  }

  async approveBaseCustom(updates: AccountUpdateForest) {
    return await this.token.approveBaseCustom(updates);
  }

  async getBalanceOf(address: PublicKey) {
    return await this.token.getBalanceOf(address);
  }

  async getCirculating() {
    return await this.token.getCirculating();
  }

  async getDecimals() {
    return await this.token.getDecimals();
  }
}
