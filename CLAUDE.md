# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stellar Contracts is a TypeScript library for building sophisticated Cardano smart contracts using the Helios language. It provides a framework for creating upgradeable, multi-contract applications with data management capabilities similar to database applications, while leveraging Cardano's blockchain technology.

## Development Commands

### Build & Development
- `pnpm build` - Full production build (runs rollup, generates types, builds docs)
- `pnpm dev` - Development mode with watch/rebuild on file changes
- `scripts/build` - Direct build script execution

Always use `pnpm`.  Never use `npx` or `pnpx` if a direct `pnpm` command will do.

When types are changed, `pnpm dev` will not regenerate the types; `pnpm build` is needed in that case.

### Testing
- `pnpm test` - Run all tests once
- `pnpm testing` - Run tests in watch mode
- `fit()` instead of `it()` for focusing on a single test
- `pnpm test ‹one-filename›` for running a specific test
- `pnpm testing:debug` - Run tests with debugger attached
- `pnpm smoke:test` - Run smoke tests (tests 02 and 04 only)
- Test files are generally located in `tests/` directory with `.test.ts` extension

### Documentation
- `pnpm docs:build` - Generate TypeScript declarations and documentation
- `pnpm docs:generate` - Generate TypeDoc documentation only

### Node Version
Use `nvm use` to switch to the correct Node.js version (requires Node >= 20)

## Architecture

### Core Concepts

**Capo Contract**: The "leader" contract that provides a permanent address and minting policy for the entire contract suite. It contains:
- **CharterData**: Configuration pointing to all delegate contracts
- **Settings**: Application-specific parameters that can be upgraded
- **Upgradability**: Allows policy updates by changing delegate references without changing the main contract address

**Delegates**: Modular contracts that handle specific responsibilities:
- **Mint Delegate**: Controls token minting policies
- **Spend Delegate**: Controls UTxO spending policies
- **Named Delegates**: Application-specific contracts for custom data types
- **Delegated Data Controllers**: Scripts governing specific record types

**UUT (Unique Utility Token)**: A pattern using unique tokens stored in delegate script addresses to trigger custom policy enforcement.

### Key Source Structure

**On-chain code** (Helios `.hl` files in `src/`):
- `DefaultCapo.hl` - Main Capo contract
- `delegation/BasicDelegate.hl` - Base delegate template
- `delegation/UnspecializedDelegate.hl` - Scaffold for custom delegates
- `delegation/CapoDelegateHelpers.hl` - Shared delegate utilities
- `minting/CapoMinter.hl` - Minting policy logic

**Off-chain TypeScript code**:
- `src/Capo.ts` - Main Capo contract class
- `src/StellarContract.ts` - Base class for all contracts
- `src/StellarTxnContext.ts` - Transaction building context
- `src/delegation/StellarDelegate.ts` - Base class for delegates
- `src/delegation/ContractBasedDelegate.ts` - Base for contract-backed delegates
- `src/helios/dataBridge/DataBridge.ts` - On-chain/off-chain data transformation

**Build tooling**:
- `src/helios/rollupPlugins/` - Custom Rollup plugins for Helios compilation
- `scripts/build` - Main build orchestration script
- `rollup.config.ts` - Rollup bundler configuration
- `vite.config.js` - Vitest test configuration

### Data Flow

1. **Transaction Building**: TypeScript classes build transactions using fluent APIs
2. **Data Bridges**: Transform between TypeScript types and on-chain UPLC data structures
3. **Activities/Redeemers**: Named transactions and the data ("redeemer") needed for them.  Defined in .hl code, exposed through the bridge.  Basic CRUD cases can work with default/generic activities,
4. **Policy Enforcement**: On-chain Helios scripts validate transaction structure and business rules

### Creating New Delegates

See `drafts/creating-a-delegate.md` for detailed guide. Key steps:

1. Create Helios contract (`.hl` file) with data structures and validation logic
2. Create TypeScript class extending `ContractBasedDelegate`
3. Define activities (redeemers) in both on-chain and off-chain code
4. Create data bridge/adapter for datum transformation
5. Register delegate in Capo's `initDelegateRoles()`
6. Implement transaction builders using `@txn` and `@partialTxn` decorators
7. Write comprehensive tests

### Requirements Management

Stellar Contracts includes type-safe requirements tracking via `hasReqts()` and `Requirements.ts` utilities to rigorously document what the dApp needs to accomplish.

## Important Patterns

**Decorators**:
- `@txn` - Full transaction builders (start from scratch)
- `@partialTxn` - Partial transaction builders (augment existing transaction context)
- DEPRECATED: `@Activity.redeemer` - Marks methods that create redeemer values
- DEPRECATED`@datum` - Datum creation methods

**Type Safety**: Heavy use of TypeScript conditional types and branded types to ensure transaction builders have required context (e.g., `hasSeedUtxo`, `hasCharterRef`)

**Testing**: Uses Vitest with emulated blockchain for positive and negative test scenarios. Tests verify both correct behavior and proper failure modes.  Test-specific Capos are used to construct isolated contract-execution environments.

## Build System Notes

- Uses custom Rollup plugins to compile Helios (`.hl`) files during bundling
- Generates multiple package entry points (`stellar-contracts`, `testing`, `ui`, `rollup-plugins`)
- TypeScript configured with `module: "preserve"` and `moduleResolution: "bundler"`
- Build outputs to `dist/` with `.mjs` format and source maps

## Network Configuration

Supports both Cardano testnet and mainnet via network context parameters passed to contract instances.

## MUST LOAD Related skills index

Before you do anything, you MUST ensure you loaded ./skillz/index.md and use
this to load any of the mentioned skills just in time when needed.
