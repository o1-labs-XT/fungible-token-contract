import {
  DynamicProof,
  Field,
  PublicKey,
  Struct,
  AccountUpdate,
  UInt64,
  UInt32,
} from 'o1js';

export { PublicInputs, PublicOutputs, SideloadedProof };

/**
 * Standard public inputs for side-loaded proofs.
 * Defines the expected input structure for validation.
 */
class PublicInputs extends Struct({
  tokenId: Field,
  address: PublicKey,
}) {}

/**
 * Standard public outputs for side-loaded proofs.
 * Defines the expected output structure containing account data and balances.
 */
class PublicOutputs extends Struct({
  minaAccountData: AccountUpdate,
  tokenIdAccountData: AccountUpdate,
  minaBalance: UInt64,
  tokenIdBalance: UInt64,
  minaNonce: UInt32,
  tokenIdNonce: UInt32,
}) {}

/**
 * Standard side-loaded proof class for dynamic proof verification.
 * This defines the interface that all side-loaded proofs must implement.
 */
class SideloadedProof extends DynamicProof<PublicInputs, PublicOutputs> {
  static publicInputType = PublicInputs;
  static publicOutputType = PublicOutputs;
  static maxProofsVerified = 0 as const;
} 