import {
  PublicKey,
  UInt8,
  UInt64,
  Field,
  AccountUpdate,
  AccountUpdateTree,
  AccountUpdateForest,
  DeployArgs,
} from 'o1js';
import {
  MintConfig,
  MintParams,
  BurnConfig,
  BurnParams,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
} from '../lib/configs.js';

/**
 * Deployment properties for the fungible token contract.
 */
export interface FungibleTokenDeployProps extends Exclude<DeployArgs, undefined> {
  /** The token symbol. */
  symbol: string;
  /** A source code reference, which is placed within the `zkappUri` of the contract account.
   * Typically a link to a file on github. */
  src: string;
}

/**
 * Core token operations interface for standard fungible token functionality.
 * Use this interface for basic token operations, lifecycle management, and queries.
 */
export interface Core {
  /**
   * Deploys the fungible token contract with specified properties.
   *
   * @param props - Deployment properties including symbol and source reference
   */
  deploy(props: FungibleTokenDeployProps): Promise<void>;

  /**
   * Initializes the token contract with configuration parameters.
   * This method can only be called once when the contract is first deployed.
   *
   * @param admin - Public key of the contract administrator
   * @param decimals - Number of decimal places for the token
   * @param mintConfig - Configuration for minting operations
   * @param mintParams - Parameters for minting operations
   * @param burnConfig - Configuration for burning operations
   * @param burnParams - Parameters for burning operations
   * @param mintDynamicProofConfig - Dynamic proof configuration for minting
   * @param burnDynamicProofConfig - Dynamic proof configuration for burning
   * @param transferDynamicProofConfig - Dynamic proof configuration for transfers
   * @param updatesDynamicProofConfig - Dynamic proof configuration for updates
   */
  initialize(
    admin: PublicKey,
    decimals: UInt8,
    mintConfig: MintConfig,
    mintParams: MintParams,
    burnConfig: BurnConfig,
    burnParams: BurnParams,
    mintDynamicProofConfig: MintDynamicProofConfig,
    burnDynamicProofConfig: BurnDynamicProofConfig,
    transferDynamicProofConfig: TransferDynamicProofConfig,
    updatesDynamicProofConfig: UpdatesDynamicProofConfig
  ): Promise<void>;

  /**
   * Mints tokens to a recipient without requiring side-loaded proof verification.
   * This function can only be used when dynamic proof verification is disabled in the mint configuration.
   *
   * @param recipient - The public key of the account to receive the minted tokens
   * @param amount - The amount of tokens to mint
   * @returns The account update for the mint operation
   * @throws {Error} If dynamic proof verification is enabled in the mint configuration
   * @throws {Error} If the recipient is the circulation account
   * @throws {Error} If the minting operation is not authorized
   */
  mint(recipient: PublicKey, amount: UInt64): Promise<AccountUpdate>;

  /**
   * Burns tokens from an account without requiring side-loaded proof verification.
   * This function can only be used when dynamic proof verification is disabled in the burn configuration.
   *
   * @param from - The public key of the account to burn tokens from
   * @param amount - The amount of tokens to burn
   * @returns The account update for the burn operation
   * @throws {Error} If dynamic proof verification is enabled in the burn configuration
   * @throws {Error} If the from account is the circulation account
   * @throws {Error} If the burning operation is not authorized
   */
  burn(from: PublicKey, amount: UInt64): Promise<AccountUpdate>;

  /**
   * Transfers tokens between accounts without requiring side-loaded proof verification.
   * This function can only be used when dynamic proof verification is disabled in the transfer configuration.
   *
   * @param from - The public key of the account to transfer tokens from
   * @param to - The public key of the account to transfer tokens to
   * @param amount - The amount of tokens to transfer
   * @throws {Error} If dynamic proof verification is enabled in the transfer configuration
   * @throws {Error} If either the from or to account is the circulation account
   */
  transferCustom(from: PublicKey, to: PublicKey, amount: UInt64): Promise<void>;

  /**
   * Approves a single account update without requiring side-loaded proof verification.
   * This function can only be used when dynamic proof verification is disabled in the updates configuration.
   *
   * @param accountUpdate - The account update to approve
   * @throws {Error} If dynamic proof verification is enabled in the updates configuration
   * @throws {Error} If the update involves the circulation account
   * @throws {Error} If the update would result in flash minting
   * @throws {Error} If the update would result in an unbalanced transaction
   */
  approveAccountUpdateCustom(
    accountUpdate: AccountUpdate | AccountUpdateTree
  ): Promise<void>;

  /**
   * Approves multiple account updates without requiring side-loaded proof verification.
   * This function can only be used when dynamic proof verification is disabled in the updates configuration.
   *
   * @param accountUpdates - The account updates to approve
   * @throws {Error} If dynamic proof verification is enabled in the updates configuration
   * @throws {Error} If any update involves the circulation account
   * @throws {Error} If the updates would result in flash minting
   * @throws {Error} If the updates would result in an unbalanced transaction
   */
  approveAccountUpdatesCustom(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[]
  ): Promise<void>;

  /**
   * Approves a forest of account updates without requiring side-loaded proof verification.
   * This function can only be used when dynamic proof verification is disabled in the updates configuration.
   *
   * @param updates - The forest of account updates to approve
   * @throws {Error} If dynamic proof verification is enabled in the updates configuration
   * @throws {Error} If any update involves the circulation account
   * @throws {Error} If the updates would result in flash minting
   * @throws {Error} If the updates would result in an unbalanced transaction
   */
  approveBaseCustom(updates: AccountUpdateForest): Promise<void>;

  /**
   * Gets the balance of tokens for a specific address.
   *
   * @param address - The public key of the account to check the balance for
   * @returns The token balance for the specified address
   */
  getBalanceOf(address: PublicKey): Promise<UInt64>;

  /**
   * Gets the current circulating supply.
   * This does take into account currently unreduced actions.
   *
   * @returns The current circulating supply of tokens
   */
  getCirculating(): Promise<UInt64>;

  /**
   * Gets the number of decimal places for the token.
   *
   * @returns The number of decimal places configured for this token
   */
  getDecimals(): Promise<UInt8>;

  /**
   * Gets the current admin of the token contract.
   *
   * @returns The public key of the current admin
   */
  getAdmin(): Promise<PublicKey>;

  /**
   * Gets the token ID for this contract.
   *
   * @returns The unique token ID derived for this contract
   */
  deriveTokenId(): Field;

  /**
   * Retrieves all current token configurations in packed form.
   * Caller can unpack off-chain using respective unpack methods.
   *
   * @returns Field array: [packedAmountConfigs, packedMintParams, packedBurnParams, packedDynamicProofConfigs]
   */
  getAllConfigs(): Promise<Field[]>;
} 