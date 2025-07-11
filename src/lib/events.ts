import { Bool, Field, Int64, PublicKey, Struct, UInt64, UInt8 } from 'o1js';

// =============================================================================
// TOKEN EVENT CLASSES
// =============================================================================

/**
 * Event emitted when the admin is changed.
 */
export class SetAdminEvent extends Struct({
  previousAdmin: PublicKey,
  newAdmin: PublicKey,
}) {}

/**
 * Event emitted when tokens are minted.
 */
export class MintEvent extends Struct({
  recipient: PublicKey,
  amount: UInt64,
}) {}

/**
 * Event emitted when tokens are burned.
 */
export class BurnEvent extends Struct({
  from: PublicKey,
  amount: UInt64,
}) {}

/**
 * Event emitted when tokens are transferred.
 */
export class TransferEvent extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt64,
}) {}

/**
 * Event emitted when a balance change occurs.
 */
export class BalanceChangeEvent extends Struct({
  address: PublicKey,
  amount: Int64,
}) {}

// =============================================================================
// ADMINISTRATIVE EVENT CLASSES
// =============================================================================

/**
 * Event emitted when the contract is initialized.
 */
export class InitializationEvent extends Struct({
  admin: PublicKey,
  decimals: UInt8,
}) {}

/**
 * Event emitted when the verification key is updated.
 */
export class VerificationKeyUpdateEvent extends Struct({
  vKeyHash: Field,
}) {}

/**
 * Event emitted when a side-loaded verification key is updated.
 */
export class SideLoadedVKeyUpdateEvent extends Struct({
  operationKey: Field,
  newVKeyHash: Field,
  newMerkleRoot: Field,
}) {}

/**
 * Event emitted when dynamic proof configuration is updated.
 */
export class DynamicProofConfigUpdateEvent extends Struct({
  operationType: Field, // OperationKeys.Mint, Burn, Transfer, or ApproveBase
  newConfig: Field, // The updated packed configuration
}) {}
