# Fungible Token Contract

A configurable token contract for Mina, designed for flexibility and compatibility.

## Core Concepts

- **Standard Token Operations**: Mint, burn, transfer, and custom account update support
- **Flexible Configuration**: On-chain state is used to store token configuration, including constants and verification keys
- **Side-loaded Proofs**: Side-loaded proofs can be employed to add complexity to a token implementation without altering the verification key of the entire contract
- **Event Emission**: Events are emitted on state changes for any applications watching the contract to listen for

## Chain State & Contract Structure

### On-Chain State

The `FungibleToken` contract stores:

- `decimals`: Token decimal precision
- `admin`: Administrator public key with special privileges
- `packedDynamicProofConfigs`: Configuration for dynamic proof verification
- `vKeyMapRoot`: Root hash for verification key Merkle map (for side-loaded proofs)

### Deploy Instructions

When deploying a token contract, deploy it with a reference to the token contract implementation, and initialize it with your configuration:

```typescript
await Mina.transaction(
  {
    sender: deployer,
    fee,
  },
  async () => {
    AccountUpdate.fundNewAccount(deployer, 2);
    await token.deploy({
      symbol: 'TKN', // Token symbol
      src: 'https://github.com/o1-labs-XT/fungible-token-contract/blob/main/src/FungibleTokenContract.ts', // Source code reference
    });

    await token.initialize(
      adminPublicKey, // Admin account
      UInt8.from(9), // Decimals (e.g., 9)
      MintDynamicProofConfig.default,
      BurnDynamicProofConfig.default,
      TransferDynamicProofConfig.default,
      UpdatesDynamicProofConfig.default
    );
  }
);
```

### Contract Methods

- `mint/mintWithProof`: Create new tokens
- `burn/burnWithProof`: Destroy tokens
- `transferCustom/transferCustomWithProof`: Transfer tokens between accounts
- `approveBaseCustom/approveBaseCustomWithProof`: Approve custom token account updates
- `updateDynamicProofConfig`: Update the dynamic proof configuration for a specific operation
- `updateSideLoadedVKeyHash`: Update the verification key for side loaded proofs
- `setAdmin`: Change the admin account

### Running Examples

The repository includes several example applications:

```sh
# Build the project
npm run build

# Run the end-to-end example
node build/src/examples/e2e.eg.js

# Run the escrow example
node build/src/examples/escrow.eg.js

# Run the token manager example
node build/src/examples/token-manager.eg.js
```

## Technical Limitations & Best Practices

### Limitations

- **Transaction Size**: Complex operations with multiple account updates may exceed Mina's transaction size limits.  Each method, individually, will fit within the account update limit, but some methods, when combined in a single transaction, will not.
- **Proof Generation**: Side-loaded proofs require the computationally-expensive proving operations to be done before submitting a transaction.  Also, each third party contract using a token with side-loaded proofs will need access to the verification key merkle map.  The token developer must make that map public in order for others to call the contract methods successfully.

## Build and Test

```sh
# Build the project
npm run build

# Run all tests
npm run test

# Run coverage
npm run coverage
```

## License

[Apache-2.0](LICENSE)
