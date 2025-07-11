// =============================================================================
// FUNGIBLE TOKEN ERROR CONSTANTS
// =============================================================================

// Comprehensive error messages for all fungible token operations.
export const FungibleTokenErrors = {
  // =============================================================================
  // ADMIN & AUTHORIZATION ERRORS
  // =============================================================================

  /** Error when trying to change admin without proper authorization */
  noPermissionToChangeAdmin:
    'Unauthorized: Admin signature required to change admin',

  /** Error when trying to update verification key without admin signature */
  noPermissionToChangeVerificationKey:
    'Unauthorized: Admin signature required to update verification key',

  // =============================================================================
  // TOKEN OPERATION ERRORS
  // =============================================================================

  /** Error when minting is not allowed with current configuration */
  noPermissionToMint:
    'Unauthorized: Minting not allowed with current configuration',

  /** Error when burning is not allowed with current configuration */
  noPermissionToBurn:
    'Unauthorized: Burning not allowed with current configuration',

  /** Error when trying to use sideload-disabled method while sideloading is enabled */
  noPermissionForSideloadDisabledOperation:
    "Can't use the method, side-loading is enabled in config",

  /** Error when trying to use sideload-enabled method while sideloading is disabled */
  proofMethodNotAllowed:
    "Can't use proof-based method, side-loading is disabled in config",

  /** Error when trying to transfer to/from circulation tracking account */
  noTransferFromCirculation:
    'Invalid operation: Cannot transfer to/from circulation tracking account',

  // =============================================================================
  // SIDE-LOADED PROOF VALIDATION ERRORS
  // =============================================================================

  /** Error when off-chain verification key map is out of sync */
  vKeyMapOutOfSync:
    'Verification failed: Off-chain verification key map is out of sync with on-chain state',

  /** Error when operation key is not valid */
  invalidOperationKey:
    'Invalid operation key: Must be 1 (Mint), 2 (Burn), 3 (Transfer), or 4 (ApproveBase)',

  /** Error when provided verification key doesn't match registered hash */
  invalidSideLoadedVKey:
    'Verification failed: Provided verification key does not match registered hash',

  /** Error when no verification key is registered for operation */
  missingVKeyForOperation:
    'Missing verification key: No key registered for this operation type',

  /** Error when proof recipient doesn't match method parameter */
  recipientMismatch:
    'Verification failed: Proof recipient does not match method parameter',

  /** Error when token ID in proof doesn't match contract token ID */
  tokenIdMismatch:
    'Verification failed: Token ID in proof does not match contract token ID',

  /** Error when expected MINA token ID is not 1 */
  incorrectMinaTokenId:
    'Verification failed: Expected native MINA token ID (1)',

  /** Error when MINA balance changed between proof generation and verification */
  minaBalanceMismatch:
    'Verification failed: MINA balance changed between proof generation and verification',

  /** Error when custom token balance changed between proof generation and verification */
  customTokenBalanceMismatch:
    'Verification failed: Custom token balance changed between proof generation and verification',

  /** Error when MINA account nonce changed between proof generation and verification */
  minaNonceMismatch:
    'Verification failed: MINA account nonce changed between proof generation and verification',

  /** Error when custom token account nonce changed between proof generation and verification */
  customTokenNonceMismatch:
    'Verification failed: Custom token account nonce changed between proof generation and verification',

  // =============================================================================
  // TRANSACTION VALIDATION ERRORS
  // =============================================================================

  /** Error when flash-minting is detected */
  flashMinting:
    'Transaction invalid: Flash-minting detected. Ensure AccountUpdates are properly ordered and transaction is balanced',

  /** Error when token debits and credits don't balance */
  unbalancedTransaction:
    'Transaction invalid: Token debits and credits do not balance to zero',

  /** Error when trying to modify permissions on token accounts */
  noPermissionChangeAllowed:
    'Permission denied: Cannot modify access or receive permissions on token accounts',

  // =============================================================================
  // METHOD OVERRIDE ERRORS
  // =============================================================================

  /** Error directing users to use custom approve method */
  useCustomApproveMethod:
    'Method overridden: Use approveBaseCustom() for side-loaded proof support instead of approveBase()',

  /** Error directing users to use custom approve account update method */
  useCustomApproveAccountUpdate:
    'Method overridden: Use approveAccountUpdateCustom() for side-loaded proof support instead of approveAccountUpdate()',

  /** Error directing users to use custom approve account updates method */
  useCustomApproveAccountUpdates:
    'Method overridden: Use approveAccountUpdatesCustom() for side-loaded proof support instead of approveAccountUpdates()',

  /** Error directing users to use custom transfer method */
  useCustomTransferMethod:
    'Method overridden: Use transferCustom() for side-loaded proof support instead of transfer()',
};
