export const FungibleTokenErrors = {
  // Admin & Authorization
  noPermissionToChangeAdmin:
    'Unauthorized: Admin signature required to change admin',
  noPermissionToChangeVerificationKey:
    'Unauthorized: Admin signature required to update verification key',

  // Token Operations
  noPermissionToMint:
    'Unauthorized: Minting not allowed with current configuration',
  noPermissionToBurn:
    'Unauthorized: Burning not allowed with current configuration',
  noPermissionForSideloadDisabledOperation:
    "Can't use the method, side-loading is enabled in config",
  noTransferFromCirculation:
    'Invalid operation: Cannot transfer to/from circulation tracking account',

  // Side-loaded Proof Validation
  vKeyMapOutOfSync:
    'Verification failed: Off-chain verification key map is out of sync with on-chain state',
  invalidOperationKey:
    'Invalid operation key: Must be 1 (Mint), 2 (Burn), 3 (Transfer), or 4 (ApproveBase)',
  invalidSideLoadedVKey:
    'Verification failed: Provided verification key does not match registered hash',
  missingVKeyForOperation:
    'Missing verification key: No key registered for this operation type',
  recipientMismatch:
    'Verification failed: Proof recipient does not match method parameter',
  tokenIdMismatch:
    'Verification failed: Token ID in proof does not match contract token ID',
  incorrectMinaTokenId:
    'Verification failed: Expected native MINA token ID (1)',
  minaBalanceMismatch:
    'Verification failed: MINA balance changed between proof generation and verification',
  customTokenBalanceMismatch:
    'Verification failed: Custom token balance changed between proof generation and verification',
  minaNonceMismatch:
    'Verification failed: MINA account nonce changed between proof generation and verification',
  customTokenNonceMismatch:
    'Verification failed: Custom token account nonce changed between proof generation and verification',

  // Transaction Validation
  flashMinting:
    'Transaction invalid: Flash-minting detected. Ensure AccountUpdates are properly ordered and transaction is balanced',
  unbalancedTransaction:
    'Transaction invalid: Token debits and credits do not balance to zero',
  noPermissionChangeAllowed:
    'Permission denied: Cannot modify access or receive permissions on token accounts',

  // Method Overrides
  useCustomApproveMethod:
    'Method overridden: Use approveBaseCustom() for side-loaded proof support instead of approveBase()',
  useCustomApproveAccountUpdate:
    'Method overridden: Use approveAccountUpdateCustom() for side-loaded proof support instead of approveAccountUpdate()',
  useCustomApproveAccountUpdates:
    'Method overridden: Use approveAccountUpdatesCustom() for side-loaded proof support instead of approveAccountUpdates()',
  useCustomTransferMethod:
    'Method overridden: Use transferCustom() for side-loaded proof support instead of transfer()',
};
