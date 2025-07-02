import {
  PublicKey,
  UInt64,
  AccountUpdate,
  AccountUpdateTree,
  AccountUpdateForest,
  VerificationKey,
} from 'o1js';
import { SideloadedProof } from '../side-loaded/program.eg.js';
import { VKeyMerkleMap } from '../FungibleTokenContract.js';

/**
 * Side-loaded proof operations interface for advanced token functionality.
 * Use this interface when you need side-loaded proof verification capabilities.
 */
export interface SideloadedTokenContract {
  /**
   * Mints new tokens with side-loaded proof verification.
   */
  mintWithProof(
    recipient: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<AccountUpdate>;

  /**
   * Burns tokens with side-loaded proof verification.
   */
  burnWithProof(
    from: PublicKey,
    amount: UInt64,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<AccountUpdate>;

  /**
   * Transfers tokens with side-loaded proof verification.
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
   * Approves account updates with side-loaded proof verification.
   */
  approveAccountUpdateCustomWithProof(
    accountUpdate: AccountUpdate | AccountUpdateTree,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;

  /**
   * Approves multiple account updates with side-loaded proof verification.
   */
  approveAccountUpdatesCustomWithProof(
    accountUpdates: (AccountUpdate | AccountUpdateTree)[],
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;

  /**
   * Approves a forest of account updates with side-loaded proof verification.
   */
  approveBaseCustomWithProof(
    updates: AccountUpdateForest,
    proof: SideloadedProof,
    vk: VerificationKey,
    vKeyMap: VKeyMerkleMap
  ): Promise<void>;
}
