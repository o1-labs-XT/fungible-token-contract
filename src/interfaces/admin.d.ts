import { PublicKey, VerificationKey, Field } from 'o1js';
import { VKeyMerkleMap } from '../FungibleTokenContract.js';
import { DynamicProofConfig } from '../lib/configs.js';

/**
 * Administrative operations interface for token management.
 * Use this interface when you need admin-only functionality.
 */
export interface Admin {
  /**
   * Sets a new administrator for the contract.
   * Requires signature from the current admin.
   *
   * @param admin - Public key of the new administrator
   */
  setAdmin(admin: PublicKey): Promise<void>;

  /**
   * Updates the contract's verification key.
   * This will only work after a hardfork that increments the transaction version,
   * the permission will be treated as `signature`.
   *
   * @param vk - The new verification key to set
   */
  updateVerificationKey(vk: VerificationKey): Promise<void>;

  /**
   * Updates the side-loaded verification key hash in the Merkle map for a specific token operation.
   *
   * This method allows the admin to register or update a verification key used for validating
   * side-loaded proofs corresponding to a given operation. It verifies that the provided
   * `operationKey` is valid before updating the Merkle map and account verification key.
   *
   * Supported `operationKey` values:
   * - `1`: Mint
   * - `2`: Burn
   * - `3`: Transfer
   * - `4`: ApproveBase
   *
   * @param vKey - The `VerificationKey` to associate with the given operation.
   * @param vKeyMap - A `VKeyMerkleMap` containing all operation-to-vKey mappings.
   * @param operationKey - A `Field` representing the token operation type.
   *
   * @throws If the `operationKey` is not one of the supported values.
   */
  updateSideLoadedVKeyHash(
    vKey: VerificationKey,
    vKeyMap: VKeyMerkleMap,
    operationKey: Field
  ): Promise<void>;

  /**
   * Updates the dynamic proof configuration for a specific operation type.
   *
   * @param operationType - The operation type to update (Mint, Burn, Transfer, or ApproveBase)
   * @param config - The new dynamic proof configuration to apply
   * @throws {Error} If the operation type is invalid
   */
  updateDynamicProofConfig(
    operationType: Field,
    config: DynamicProofConfig
  ): Promise<void>;
}
