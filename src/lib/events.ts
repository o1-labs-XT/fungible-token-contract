import { PublicKey, UInt64, UInt8, Int64, Field, Bool, Struct } from 'o1js';

export class SetAdminEvent extends Struct({
  previousAdmin: PublicKey,
  newAdmin: PublicKey,
}) {}

export class MintEvent extends Struct({
  recipient: PublicKey,
  amount: UInt64,
}) {}

export class BurnEvent extends Struct({
  from: PublicKey,
  amount: UInt64,
}) {}

export class BalanceChangeEvent extends Struct({
  address: PublicKey,
  amount: Int64,
}) {}

export class SideLoadedVKeyUpdateEvent extends Struct({
  operationKey: Field,
  newVKeyHash: Field,
  newMerkleRoot: Field,
}) {}

export class TransferEvent extends Struct({
  from: PublicKey,
  to: PublicKey,
  amount: UInt64,
}) {}

export class InitializationEvent extends Struct({
  admin: PublicKey,
  decimals: UInt8,
}) {}

export class VerificationKeyUpdateEvent extends Struct({
  vKeyHash: Field,
}) {}

export class ConfigStructureUpdateEvent extends Struct({
  updateType: Field, // EventTypes.Config or EventTypes.Params
  category: Field, // OperationKeys.Mint or OperationKeys.Burn
}) {}

export class AmountValueUpdateEvent extends Struct({
  parameterType: Field, // ParameterTypes.FixedAmount, MinAmount, or MaxAmount
  category: Field, // OperationKeys.Mint or OperationKeys.Burn
  oldValue: UInt64,
  newValue: UInt64,
}) {}

export class DynamicProofConfigUpdateEvent extends Struct({
  operationType: Field, // OperationKeys.Mint, Burn, Transfer, or ApproveBase
  newConfig: Field, // The updated packed configuration
}) {}

export class ConfigFlagUpdateEvent extends Struct({
  flagType: Field, // FlagTypes.FixedAmount, RangedAmount, or Unauthorized
  category: Field, // OperationKeys.Mint or OperationKeys.Burn
  oldValue: Bool,
  newValue: Bool,
}) {}
