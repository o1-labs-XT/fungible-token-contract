import { PublicKey, VerificationKey, Field, Bool, UInt64 } from 'o1js';
import { VKeyMerkleMap } from '../FungibleTokenContract.js';
import {
  DynamicProofConfig,
  MintConfig,
  BurnConfig,
  MintParams,
  BurnParams,
} from '../lib/configs.js';

/**
 * Administrative operations interface for token management.
 * Use this interface when you need admin-only functionality.
 */
export interface TokenAdmin {
  /**
   * Updates a side-loaded verification key hash for a specific operation.
   */
  updateSideLoadedVKeyHash(
    vKey: VerificationKey,
    vKeyMap: VKeyMerkleMap,
    operationKey: Field
  ): Promise<void>;

  /**
   * Updates the dynamic proof configuration for a specific operation type.
   */
  updateDynamicProofConfig(
    operationType: Field,
    config: DynamicProofConfig
  ): Promise<void>;

  /**
   * Updates the mint configuration.
   */
  updateMintConfig(mintConfig: MintConfig): Promise<void>;

  /**
   * Updates the burn configuration.
   */
  updateBurnConfig(burnConfig: BurnConfig): Promise<void>;

  /**
   * Updates the mint parameters.
   */
  updateMintParams(mintParams: MintParams): Promise<void>;

  /**
   * Updates the burn parameters.
   */
  updateBurnParams(burnParams: BurnParams): Promise<void>;

  /**
   * Updates a configuration flag for mint or burn operations.
   */
  updateConfigFlag(
    operationType: Field,
    flagType: Field,
    value: Bool
  ): Promise<void>;

  /**
   * Updates amount parameters for mint or burn operations.
   */
  updateAmountParameter(
    operationType: Field,
    parameterType: Field,
    value: UInt64
  ): Promise<void>;
}
