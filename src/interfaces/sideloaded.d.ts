import {
  PublicKey,
  UInt64,
  AccountUpdate,
  AccountUpdateTree,
  AccountUpdateForest,
  VerificationKey,
} from 'o1js';
import { SideloadedProof } from '../lib/sideloaded.js';
import { VKeyMerkleMap } from '../FungibleTokenContract.js';

/**
 * Side-loaded proof operations interface for advanced token functionality.
 * Use this interface when you need side-loaded proof verification capabilities.
 */
export interface Sideloaded {
  /**
   * Mints tokens to a recipient using a side-loaded proof for validation.
   *
   * @param recipient - Public key of the token recipient
   * @param amount - Amount of tokens to mint
   * @param proof - Side-loaded proof for validation
   * @param vk - Verification key for the side-loaded proof
   * @param vKeyMap - Merkle map of verification keys
   * @returns AccountUpdate for the minting operation
   */
  mintWithProof(
    recipient: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<AccountUpdate>;

  /**
   * Burns tokens from an account using a side-loaded proof for validation.
   *
   * @param from - Public key of the account to burn tokens from
   * @param amount - Amount of tokens to burn
   * @param proof - Side-loaded proof for validation
   * @param vk - Verification key for the side-loaded proof
   * @param vKeyMap - Merkle map of verification keys
   * @returns AccountUpdate for the burning operation
   */
  burnWithProof(
    from: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<AccountUpdate>;

  /**
   * Transfers tokens between accounts using a side-loaded proof for validation.
   *
   * @param from - Public key of the account to transfer tokens from
   * @param to - Public key of the account to transfer tokens to
   * @param amount - Amount of tokens to transfer
   * @param proof - Side-loaded proof for validation
   * @param vk - Verification key for the side-loaded proof
   * @param vKeyMap - Merkle map of verification keys
   */
  transferCustomWithProof(
    from: PublicKey,
    to: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;

  /**
   * Approves a single account update with side-loaded proof verification.
   *
   * @param accountUpdate - The account update to approve
   * @param proof - Side-loaded proof for validation
   * @param vk - Verification key for the side-loaded proof
   * @param vKeyMap - Merkle map of verification keys
   */
  approveAccountUpdateCustomWithProof(
    accountUpdate: AccountUpdate | AccountUpdateTree,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;

  /**
   * Approves multiple account updates with side-loaded proof verification.
   *
   * @param accountUpdates - The account updates to approve
   * @param proof - Side-loaded proof for validation
   * @param vk - Verification key for the side-loaded proof
   * @param vKeyMap - Merkle map of verification keys
   */
  approveAccountUpdatesCustomWithProof(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[],
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;

  /**
   * Approves a forest of account updates with side-loaded proof verification.
   *
   * @param updates - The forest of account updates to approve. Note that the forest size is limited by the base token contract, @see TokenContract.MAX_ACCOUNT_UPDATES The current limit is 9.
   * @param proof - Side-loaded proof for validation
   * @param vk - Verification key for the side-loaded proof
   * @param vKeyMap - Merkle map of verification keys
   */
  approveBaseCustomWithProof(
    updates: AccountUpdateForest,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;
} 