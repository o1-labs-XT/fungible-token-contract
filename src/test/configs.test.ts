import { describe, it, expect, beforeAll } from '@jest/globals';
import { Bool, Field, UInt64 } from 'o1js';

import {
  MintConfig,
  BurnConfig,
  MintParams,
  BurnParams,
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  DynamicProofConfig,
  ConfigErrors,
} from '../lib/configs.js';

describe('Fungible Token - Configuration Tests', () => {
  describe('Config Packing Operations', () => {
    it('should reject packing when invalid array length is provided', () => {
      const mintConfig = MintConfig.default;

      // Test with empty array
      expect(() => {
        MintConfig.packConfigs([] as any);
      }).toThrow(ConfigErrors.invalidAmountConfigCount);

      // Test with single config
      expect(() => {
        MintConfig.packConfigs([mintConfig] as any);
      }).toThrow(ConfigErrors.invalidAmountConfigCount);

      // Test with too many configs
      expect(() => {
        MintConfig.packConfigs([
          mintConfig,
          BurnConfig.default,
          mintConfig,
        ] as any);
      }).toThrow(ConfigErrors.invalidAmountConfigCount);
    });

    it('should pack valid array of 2 configs successfully', () => {
      const mintConfig = MintConfig.default;
      const burnConfig = BurnConfig.default;

      const packed = MintConfig.packConfigs([mintConfig, burnConfig]);
      expect(packed).toBeInstanceOf(Field);
    });
  });

  describe('Mint Config Validation - Fixed Amount Mode', () => {
    it('should reject mint params when fixedAmount is missing for fixed config', () => {
      const fixedMintConfig = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(true),
        rangedAmount: Bool(false),
      });

      expect(() => {
        MintParams.create(fixedMintConfig, {});
      }).toThrow(ConfigErrors.invalidMintConfigData);

      expect(() => {
        MintParams.create(fixedMintConfig, { minAmount: UInt64.from(100) });
      }).toThrow(ConfigErrors.invalidMintConfigData);
    });

    it('should reject mint params when ranged params provided for fixed config', () => {
      const fixedMintConfig = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(true),
        rangedAmount: Bool(false),
      });

      expect(() => {
        MintParams.create(fixedMintConfig, {
          fixedAmount: UInt64.from(100),
          minAmount: UInt64.from(50),
        });
      }).toThrow(ConfigErrors.invalidMintConfigData);

      expect(() => {
        MintParams.create(fixedMintConfig, {
          fixedAmount: UInt64.from(100),
          maxAmount: UInt64.from(200),
        });
      }).toThrow(ConfigErrors.invalidMintConfigData);

      expect(() => {
        MintParams.create(fixedMintConfig, {
          fixedAmount: UInt64.from(100),
          minAmount: UInt64.from(50),
          maxAmount: UInt64.from(200),
        });
      }).toThrow(ConfigErrors.invalidMintConfigData);
    });
  });

  describe('Mint Config Validation - Ranged Amount Mode', () => {
    it('should reject mint params when ranged params are missing for ranged config', () => {
      const rangedMintConfig = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(false),
        rangedAmount: Bool(true),
      });

      expect(() => {
        MintParams.create(rangedMintConfig, {});
      }).toThrow(ConfigErrors.invalidMintConfigData);

      expect(() => {
        MintParams.create(rangedMintConfig, { minAmount: UInt64.from(50) });
      }).toThrow(ConfigErrors.invalidMintConfigData);

      expect(() => {
        MintParams.create(rangedMintConfig, { maxAmount: UInt64.from(200) });
      }).toThrow(ConfigErrors.invalidMintConfigData);
    });

    it('should reject mint params when fixedAmount provided for ranged config', () => {
      const rangedMintConfig = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(false),
        rangedAmount: Bool(true),
      });

      expect(() => {
        MintParams.create(rangedMintConfig, {
          fixedAmount: UInt64.from(100),
          minAmount: UInt64.from(50),
          maxAmount: UInt64.from(200),
        });
      }).toThrow(ConfigErrors.invalidMintConfigData);
    });

    it('should create mint params successfully for valid configurations', () => {
      // Valid fixed config
      const fixedMintConfig = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(true),
        rangedAmount: Bool(false),
      });

      const fixedParams = MintParams.create(fixedMintConfig, {
        fixedAmount: UInt64.from(100),
      });
      expect(fixedParams.fixedAmount.toBigInt()).toBe(100n);

      // Valid ranged config
      const rangedMintConfig = MintConfig.default;
      const rangedParams = MintParams.create(rangedMintConfig, {
        minAmount: UInt64.from(50),
        maxAmount: UInt64.from(200),
      });
      expect(rangedParams.minAmount.toBigInt()).toBe(50n);
      expect(rangedParams.maxAmount.toBigInt()).toBe(200n);
    });
  });

  describe('Burn Config Validation - Fixed Amount Mode', () => {
    it('should reject burn params when fixedAmount is missing for fixed config', () => {
      const fixedBurnConfig = new BurnConfig({
        unauthorized: Bool(true),
        fixedAmount: Bool(true),
        rangedAmount: Bool(false),
      });

      expect(() => {
        BurnParams.create(fixedBurnConfig, {});
      }).toThrow(ConfigErrors.invalidBurnConfigData);
    });

    it('should reject burn params when ranged params provided for fixed config', () => {
      const fixedBurnConfig = new BurnConfig({
        unauthorized: Bool(true),
        fixedAmount: Bool(true),
        rangedAmount: Bool(false),
      });

      expect(() => {
        BurnParams.create(fixedBurnConfig, {
          fixedAmount: UInt64.from(100),
          minAmount: UInt64.from(50),
          maxAmount: UInt64.from(200),
        });
      }).toThrow(ConfigErrors.invalidBurnConfigData);
    });
  });

  describe('Burn Config Validation - Ranged Amount Mode', () => {
    it('should reject burn params when ranged params are missing for ranged config', () => {
      const rangedBurnConfig = BurnConfig.default;

      expect(() => {
        BurnParams.create(rangedBurnConfig, {});
      }).toThrow(ConfigErrors.invalidBurnConfigData);
    });

    it('should reject burn params when fixedAmount provided for ranged config', () => {
      const rangedBurnConfig = BurnConfig.default;

      expect(() => {
        BurnParams.create(rangedBurnConfig, {
          fixedAmount: UInt64.from(100),
          minAmount: UInt64.from(50),
          maxAmount: UInt64.from(200),
        });
      }).toThrow(ConfigErrors.invalidBurnConfigData);
    });
  });

  describe('Dynamic Proof Config Packing Operations', () => {
    it('should reject packing when invalid array length is provided', () => {
      const mintConfig = MintDynamicProofConfig.default;

      expect(() => {
        DynamicProofConfig.packConfigs([]);
      }).toThrow(ConfigErrors.invalidDynamicProofConfigCount);

      expect(() => {
        DynamicProofConfig.packConfigs([mintConfig]);
      }).toThrow(ConfigErrors.invalidDynamicProofConfigCount);

      expect(() => {
        DynamicProofConfig.packConfigs([
          mintConfig,
          BurnDynamicProofConfig.default,
        ]);
      }).toThrow(ConfigErrors.invalidDynamicProofConfigCount);
    });

    it('should pack valid array of 4 configs successfully', () => {
      const configs = [
        MintDynamicProofConfig.default,
        BurnDynamicProofConfig.default,
        TransferDynamicProofConfig.default,
        UpdatesDynamicProofConfig.default,
      ];

      const packed = DynamicProofConfig.packConfigs(configs);
      expect(packed).toBeInstanceOf(Field);
    });
  });

  describe('Dynamic Proof Config Updates', () => {
    it('should update packed configs successfully for base DynamicProofConfig', () => {
      const customConfig = new DynamicProofConfig({
        shouldVerify: Bool(true),
        requireRecipientMatch: Bool(false),
        requireTokenIdMatch: Bool(true),
        requireMinaBalanceMatch: Bool(false),
        requireCustomTokenBalanceMatch: Bool(true),
        requireMinaNonceMatch: Bool(false),
        requireCustomTokenNonceMatch: Bool(true),
      });

      const initialConfigs = [
        MintDynamicProofConfig.default,
        BurnDynamicProofConfig.default,
        TransferDynamicProofConfig.default,
        UpdatesDynamicProofConfig.default,
      ];
      const initialPacked = DynamicProofConfig.packConfigs(initialConfigs);

      // Test updating each config index
      for (let i = 0; i < 4; i++) {
        const updated = customConfig.updatePackedConfigs(initialPacked, i);
        expect(updated).toBeInstanceOf(Field);
        expect(updated.toString()).not.toBe(initialPacked.toString());

        const unpacked = DynamicProofConfig.unpack(updated, i);
        expect(unpacked.shouldVerify.toBoolean()).toBe(true);
        expect(unpacked.requireRecipientMatch.toBoolean()).toBe(false);
        expect(unpacked.requireTokenIdMatch.toBoolean()).toBe(true);
      }
    });

    it('should update packed configs successfully for each DynamicProofConfig subclass', () => {
      const customMintConfig = new MintDynamicProofConfig({
        shouldVerify: Bool(true),
        requireRecipientMatch: Bool(false),
        requireTokenIdMatch: Bool(true),
        requireMinaBalanceMatch: Bool(false),
        requireCustomTokenBalanceMatch: Bool(true),
        requireMinaNonceMatch: Bool(false),
        requireCustomTokenNonceMatch: Bool(true),
      });

      const initialPacked = DynamicProofConfig.packConfigs([
        MintDynamicProofConfig.default,
        BurnDynamicProofConfig.default,
        TransferDynamicProofConfig.default,
        UpdatesDynamicProofConfig.default,
      ]);

      const updatedByMint = customMintConfig.updatePackedConfigs(initialPacked);
      expect(updatedByMint).toBeInstanceOf(Field);

      const customBurnConfig = new BurnDynamicProofConfig({
        shouldVerify: Bool(true),
        requireRecipientMatch: Bool(false),
        requireTokenIdMatch: Bool(true),
        requireMinaBalanceMatch: Bool(false),
        requireCustomTokenBalanceMatch: Bool(true),
        requireMinaNonceMatch: Bool(false),
        requireCustomTokenNonceMatch: Bool(true),
      });

      const updatedByBurn = customBurnConfig.updatePackedConfigs(initialPacked);
      expect(updatedByBurn).toBeInstanceOf(Field);

      const customTransferConfig = new TransferDynamicProofConfig({
        shouldVerify: Bool(true),
        requireRecipientMatch: Bool(false),
        requireTokenIdMatch: Bool(true),
        requireMinaBalanceMatch: Bool(false),
        requireCustomTokenBalanceMatch: Bool(true),
        requireMinaNonceMatch: Bool(false),
        requireCustomTokenNonceMatch: Bool(true),
      });

      const updatedByTransfer =
        customTransferConfig.updatePackedConfigs(initialPacked);
      expect(updatedByTransfer).toBeInstanceOf(Field);

      const customUpdatesConfig = new UpdatesDynamicProofConfig({
        shouldVerify: Bool(true),
        requireRecipientMatch: Bool(false),
        requireTokenIdMatch: Bool(true),
        requireMinaBalanceMatch: Bool(false),
        requireCustomTokenBalanceMatch: Bool(true),
        requireMinaNonceMatch: Bool(false),
        requireCustomTokenNonceMatch: Bool(true),
      });

      const updatedByUpdates =
        customUpdatesConfig.updatePackedConfigs(initialPacked);
      expect(updatedByUpdates).toBeInstanceOf(Field);

      // All updates should produce different results
      const results = [
        updatedByMint,
        updatedByBurn,
        updatedByTransfer,
        updatedByUpdates,
      ];
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          expect(results[i].toString()).not.toBe(results[j].toString());
        }
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle edge cases for config validation', () => {
      // Test configs with both fixed and ranged disabled (should fail validation)
      const invalidConfig = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(false),
        rangedAmount: Bool(false),
      });

      expect(() => {
        invalidConfig.validate();
      }).toThrow(ConfigErrors.invalidConfigValidation);

      // Test configs with both fixed and ranged enabled (should fail validation)
      const invalidConfig2 = new MintConfig({
        unauthorized: Bool(false),
        fixedAmount: Bool(true),
        rangedAmount: Bool(true),
      });

      expect(() => {
        invalidConfig2.validate();
      }).toThrow(ConfigErrors.invalidConfigValidation);
    });

    it('should handle complex DynamicProofConfig scenarios', () => {
      // Test with all verification disabled
      const disabledConfig = new MintDynamicProofConfig({
        shouldVerify: Bool(false),
        requireRecipientMatch: Bool(false),
        requireTokenIdMatch: Bool(false),
        requireMinaBalanceMatch: Bool(false),
        requireCustomTokenBalanceMatch: Bool(false),
        requireMinaNonceMatch: Bool(false),
        requireCustomTokenNonceMatch: Bool(false),
      });

      // Test with all verification enabled
      const enabledConfig = new MintDynamicProofConfig({
        shouldVerify: Bool(true),
        requireRecipientMatch: Bool(true),
        requireTokenIdMatch: Bool(true),
        requireMinaBalanceMatch: Bool(true),
        requireCustomTokenBalanceMatch: Bool(true),
        requireMinaNonceMatch: Bool(true),
        requireCustomTokenNonceMatch: Bool(true),
      });

      // Both should serialize and deserialize correctly
      const disabledBits = disabledConfig.toBits();
      const enabledBits = enabledConfig.toBits();

      expect(disabledBits.length).toBe(7);
      expect(enabledBits.length).toBe(7);
      expect(disabledBits.every((bit) => bit.toBoolean() === false)).toBe(true);
      expect(enabledBits.every((bit) => bit.toBoolean() === true)).toBe(true);
    });
  });
});
