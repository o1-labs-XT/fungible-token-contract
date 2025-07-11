import { describe, it, expect } from '@jest/globals';
import { Bool, Field } from 'o1js';

import {
  MintDynamicProofConfig,
  BurnDynamicProofConfig,
  TransferDynamicProofConfig,
  UpdatesDynamicProofConfig,
  DynamicProofConfig,
} from '../lib/configs.js';
import { TEST_ERROR_MESSAGES } from './constants.js';

describe('Fungible Token - Configuration Tests', () => {
  describe('Dynamic Proof Config Packing Operations', () => {
    it('should reject packing when invalid array length is provided', () => {
      const mintDynamicProofConfig = MintDynamicProofConfig.default;

      expect(() => {
        DynamicProofConfig.packConfigs([]);
      }).toThrow(TEST_ERROR_MESSAGES.INVALID_DYNAMIC_PROOF_CONFIG_COUNT);

      expect(() => {
        DynamicProofConfig.packConfigs([mintDynamicProofConfig]);
      }).toThrow(TEST_ERROR_MESSAGES.INVALID_DYNAMIC_PROOF_CONFIG_COUNT);

      expect(() => {
        DynamicProofConfig.packConfigs([
          mintDynamicProofConfig,
          BurnDynamicProofConfig.default,
        ]);
      }).toThrow(TEST_ERROR_MESSAGES.INVALID_DYNAMIC_PROOF_CONFIG_COUNT);
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
      const invalidConfig = new MintDynamicProofConfig({
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
      const disabledBits = invalidConfig.toBits();
      const enabledBits = enabledConfig.toBits();

      expect(disabledBits.length).toBe(7);
      expect(enabledBits.length).toBe(7);
      expect(disabledBits.every((bit) => bit.toBoolean() === false)).toBe(true);
      expect(enabledBits.every((bit) => bit.toBoolean() === true)).toBe(true);
    });
  });
});
