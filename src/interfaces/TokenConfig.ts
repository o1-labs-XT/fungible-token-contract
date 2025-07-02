import { PublicKey, UInt8, UInt64, Field } from 'o1js';

/**
 * Configuration query interface for reading token settings.
 * Use this interface when you need to inspect token configuration.
 */
export interface TokenConfig {
  /**
   * Get the token ID for this contract.
   */
  deriveTokenId(): Field;

  /**
   * Retrieves all current token configurations in packed form.
   * Returns: [packedAmountConfigs, packedMintParams, packedBurnParams, packedDynamicProofConfigs]
   */
  getAllConfigs(): Promise<Field[]>;
}
