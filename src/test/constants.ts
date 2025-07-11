/**
 * Test-specific error messages that are not part of the core token standard.
 * These include framework errors, proof system errors, and test-specific scenarios
 */
export const TEST_ERROR_MESSAGES = {
  // Signature and authorization errors
  INVALID_SIGNATURE_FEE_PAYER:
    'Check signature: Invalid signature on fee payer for key',
  INVALID_SIGNATURE_ACCOUNT_UPDATE:
    'Check signature: Invalid signature on account_update 2',
  NO_AUTHORIZATION_PROVIDED:
    'the required authorization was not provided or is invalid',

  // Constraint and proof system errors
  CONSTRAINT_UNSATISFIED: 'Constraint unsatisfied (unreduced)',
  INVALID_DYNAMIC_PROOF_CONFIG_COUNT:
    'Invalid configuration: Expected exactly 4 dynamic proof configurations',

  // Permission and state errors
  CANNOT_UPDATE_PERMISSIONS_IMPOSSIBLE:
    "Cannot update field 'permissions' because permission for this field is 'Impossible'",
  PAUSED_METHOD: 'The `approveCustom` method is paused!',

  // Admin and key management errors
  NO_ADMIN_KEY: 'Unable to fetch admin contract key',

  // Account nonce mismatch
  MINA_ACCOUNT_NONCE_MISMATCH: 'Mismatch in MINA account nonce!',
} as const;
