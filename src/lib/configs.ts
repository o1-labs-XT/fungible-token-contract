import { Bool, Field, Struct } from 'o1js';

export {
  DynamicProofConfig,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  OperationKeys,
  MERKLE_HEIGHT,
  MINA_TOKEN_ID,
};

/**
 * `OperationKeys` provides symbolic names for the different token operations
 * that can have associated side-loaded verification keys.
 *
 * This ensures type safety and improves readability when referencing
 * specific operations, for example, in the `VKeyMerkleMap` or when calling
 * methods like `updateSideLoadedVKeyHash`.
 *
 * @property Mint - Operation key for minting tokens (corresponds to Field(1)).
 * @property Burn - Operation key for burning tokens (corresponds to Field(2)).
 * @property Transfer - Operation key for transferring tokens (corresponds to Field(3)).
 * @property ApproveBase - Operation key for approving a forest of account updates (corresponds to Field(4)).
 */
const OperationKeys = {
  Mint: Field(1),
  Burn: Field(2),
  Transfer: Field(3),
  ApproveBase: Field(4),
};

// The native MINA token ID is always 1
const MINA_TOKEN_ID = 1 as const;

/**
 * Height of the Merkle tree used for verification key storage.
 * Used to configure the IndexedMerkleMap for VKeyMerkleMap.
 */
const MERKLE_HEIGHT = 3;

const BIT_SIZES = {
  // Dynamic proof config constants
  DYNAMIC_PROOF_CONFIG: {
    TOTAL_BITS: 28,
    BITS_PER_CONFIG: 7,
    INDICES: {
      MINT: 0,
      BURN: 1,
      TRANSFER: 2,
      UPDATES: 3,
    },
  },
} as const;

/**
 * `DynamicProofConfig` defines the conditions under which a side-loaded proof
 * must be verified.
 *
 * Each instance specifies whether certain checks are enforced and whether specific data captured during proof generation must match their values at verification.
 * This class serves as a base for `mint`, `burn`, `transfer`, and `updates` dynamic proof configurations, each represented by exactly 6 bits within a packed 24-bit Field.
 *
 * @property shouldVerify - Enables or disables verification of side-loaded proofs.
 * @property requireRecipientMatch - Ensures that the recipient address in the proof's public input matches the recipient specified in the token method call.
 * @property requireTokenIdMatch - Ensures token ID consistency between proof generation and verification.
 * @property requireMinaBalanceMatch - Ensures MINA balance consistency between proof generation and verification.
 * @property requireCustomTokenBalanceMatch - Ensures custom token balance consistency between proof generation and verification.
 * @property requireMinaNonceMatch - Ensures MINA account nonce consistency between proof generation and verification.
 * @property requireCustomTokenNonceMatch - Ensures custom token account nonce consistency between proof generation and verification.
 */
class DynamicProofConfig extends Struct({
  shouldVerify: Bool,
  requireRecipientMatch: Bool,
  requireTokenIdMatch: Bool,
  requireMinaBalanceMatch: Bool,
  requireCustomTokenBalanceMatch: Bool,
  requireMinaNonceMatch: Bool,
  requireCustomTokenNonceMatch: Bool,
}) {
  /**
   * Serializes the dynamic proof configuration into an array of 6 `Bool` bits (one per flag).
   * @returns An array of 6 bits representing the configuration flags.
   */
  toBits(): Bool[] {
    return [
      this.shouldVerify,
      this.requireRecipientMatch,
      this.requireTokenIdMatch,
      this.requireMinaBalanceMatch,
      this.requireCustomTokenBalanceMatch,
      this.requireMinaNonceMatch,
      this.requireCustomTokenNonceMatch,
    ];
  }

  /**
   * Unpacks a specific 6-bit segment from a 24-bit packed configuration.
   * @param packedConfigs - The 24-bit packed Field.
   * @param configIndex - Index of the config (0: mint, 1: burn, 2: transfer, 3: updates).
   * @returns A DynamicProofConfig instance.
   */
  static unpack(packedConfigs: Field, configIndex: number) {
    const start = configIndex * BIT_SIZES.DYNAMIC_PROOF_CONFIG.BITS_PER_CONFIG;
    const bits = packedConfigs
      .toBits(BIT_SIZES.DYNAMIC_PROOF_CONFIG.TOTAL_BITS)
      .slice(start, start + BIT_SIZES.DYNAMIC_PROOF_CONFIG.BITS_PER_CONFIG);

    return new this({
      shouldVerify: bits[0],
      requireRecipientMatch: bits[1],
      requireTokenIdMatch: bits[2],
      requireMinaBalanceMatch: bits[3],
      requireCustomTokenBalanceMatch: bits[4],
      requireMinaNonceMatch: bits[5],
      requireCustomTokenNonceMatch: bits[6],
    });
  }

  /**
   * Updates a specific 6-bit segment within a packed 24-bit configuration.
   * @param packedConfigs - The original 24-bit packed Field.
   * @param configIndex - Index of the config to update (0: mint, 1: burn, 2: transfer, 3: updates).
   * @returns Updated 24-bit packed Field.
   */
  updatePackedConfigs(packedConfigs: Field, configIndex: number): Field {
    const bits = packedConfigs.toBits(
      BIT_SIZES.DYNAMIC_PROOF_CONFIG.TOTAL_BITS
    );
    const start = configIndex * BIT_SIZES.DYNAMIC_PROOF_CONFIG.BITS_PER_CONFIG;
    const updatedBits = [
      ...bits.slice(0, start),
      ...this.toBits(),
      ...bits.slice(start + BIT_SIZES.DYNAMIC_PROOF_CONFIG.BITS_PER_CONFIG),
    ];

    return Field.fromBits(updatedBits);
  }

  /**
   * Packs multiple DynamicProofConfig instances into a single 24-bit packed Field.
   * @param configs - Array of exactly four DynamicProofConfig instances [mint, burn, transfer, updates].
   * @returns Packed 24-bit Field.
   */
  static packConfigs(configs: DynamicProofConfig[]): Field {
    if (configs.length !== 4)
      throw new Error(
        'Invalid configuration: Expected exactly 4 dynamic proof configurations'
      );

    const bits = configs.flatMap((config) => config.toBits());
    return Field.fromBits(bits);
  }
}

/**
 * `MintDynamicProofConfig` specializes `DynamicProofConfig` specifically for mint operations.
 *
 * Uses the first 6-bit segment (bits 0–5) of the packed 24-bit field.
 *
 * See {@link DynamicProofConfig} for detailed property explanations and usage.
 */
class MintDynamicProofConfig extends DynamicProofConfig {
  /**
   * The default dynamic proof configuration.
   *
   * By default:
   * - Side-loaded proof verification (shouldVerify) is disabled.
   * - Recipient matching is enforced.
   * - Token ID matching is enforced.
   * - MINA balance matching is enforced.
   * - Custom token balance matching is enforced.
   * - MINA nonce matching is enforced.
   * - Custom token nonce matching is enforced.
   */
  static default = new this({
    shouldVerify: Bool(false),
    requireRecipientMatch: Bool(true),
    requireTokenIdMatch: Bool(true),
    requireMinaBalanceMatch: Bool(true),
    requireCustomTokenBalanceMatch: Bool(true),
    requireMinaNonceMatch: Bool(true),
    requireCustomTokenNonceMatch: Bool(true),
  });

  static unpack(packedConfigs: Field) {
    return super.unpack(packedConfigs, 0);
  }

  updatePackedConfigs(packedConfigs: Field) {
    return super.updatePackedConfigs(packedConfigs, 0);
  }
}

/**
 * `BurnDynamicProofConfig` specializes `DynamicProofConfig` specifically for burn operations.
 *
 * Uses the second 6-bit segment (bits 6–11) of the packed 24-bit field.
 *
 * See {@link DynamicProofConfig} for detailed property explanations and usage.
 */
class BurnDynamicProofConfig extends DynamicProofConfig {
  /**
   * The default dynamic proof configuration.
   *
   * By default:
   * - Side-loaded proof verification (shouldVerify) is disabled.
   * - Recipient matching is enforced.
   * - Token ID matching is enforced.
   * - MINA balance matching is enforced.
   * - Custom token balance matching is enforced.
   * - MINA nonce matching is enforced.
   * - Custom token nonce matching is not enforced.
   */
  static default = new this({
    shouldVerify: Bool(false),
    requireRecipientMatch: Bool(true),
    requireTokenIdMatch: Bool(true),
    requireMinaBalanceMatch: Bool(true),
    requireCustomTokenBalanceMatch: Bool(true),
    requireMinaNonceMatch: Bool(true),
    requireCustomTokenNonceMatch: Bool(false),
  });

  static unpack(packedConfigs: Field) {
    return super.unpack(packedConfigs, 1);
  }

  updatePackedConfigs(packedConfigs: Field) {
    return super.updatePackedConfigs(packedConfigs, 1);
  }
}

/**
 * `TransferDynamicProofConfig` specializes `DynamicProofConfig` specifically for transfer operations.
 *
 * Uses the third 6-bit segment (bits 12–17) of the packed 24-bit field.
 *
 * See {@link DynamicProofConfig} for detailed property explanations and usage.
 */
class TransferDynamicProofConfig extends DynamicProofConfig {
  /**
   * The default dynamic proof configuration.
   *
   * By default:
   * - Side-loaded proof verification (shouldVerify) is disabled.
   * - Recipient matching is enforced.
   * - Token ID matching is enforced.
   * - MINA balance matching is enforced.
   * - Custom token balance matching is enforced.
   * - MINA nonce matching is enforced.
   * - Custom token nonce matching is not enforced.
   */
  static default = new this({
    shouldVerify: Bool(false),
    requireRecipientMatch: Bool(true),
    requireTokenIdMatch: Bool(true),
    requireMinaBalanceMatch: Bool(true),
    requireCustomTokenBalanceMatch: Bool(true),
    requireMinaNonceMatch: Bool(true),
    requireCustomTokenNonceMatch: Bool(false),
  });

  static unpack(packedConfigs: Field) {
    return super.unpack(packedConfigs, 2);
  }

  updatePackedConfigs(packedConfigs: Field) {
    return super.updatePackedConfigs(packedConfigs, 2);
  }
}

/**
 * `UpdatesDynamicProofConfig` specializes `DynamicProofConfig` specifically for approveUpdates operations.
 *
 * Uses the fourth 6-bit segment (bits 18–23) of the packed 24-bit field.
 *
 * See {@link DynamicProofConfig} for detailed property explanations and usage.
 */
class UpdatesDynamicProofConfig extends DynamicProofConfig {
  /**
   * The default dynamic proof configuration.
   *
   * By default:
   * - Side-loaded proof verification (shouldVerify) is disabled.
   * - Recipient matching is not enforced.
   * - Token ID matching is not enforced.
   * - MINA balance matching is not enforced.
   * - Custom token balance matching is not enforced.
   * - MINA nonce matching is not enforced.
   * - Custom token nonce matching is not enforced.
   */
  static default = new this({
    shouldVerify: Bool(false),
    requireRecipientMatch: Bool(false),
    requireTokenIdMatch: Bool(false),
    requireMinaBalanceMatch: Bool(false),
    requireCustomTokenBalanceMatch: Bool(false),
    requireMinaNonceMatch: Bool(false),
    requireCustomTokenNonceMatch: Bool(false),
  });

  static unpack(packedConfigs: Field) {
    return super.unpack(packedConfigs, 3);
  }

  updatePackedConfigs(packedConfigs: Field) {
    return super.updatePackedConfigs(packedConfigs, 3);
  }
}
