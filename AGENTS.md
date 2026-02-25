# AGENTS.md — Stellar Contracts Reference for AI Agents

This document provides the essential context any AI agent needs to work with
the Stellar Contracts library — whether building a downstream dApp or assisting
with library maintenance.

For deeper internals (source structure, architecture docs, delegate authoring),
see `AGENTS-internals.md`.

## Project Overview

Stellar Contracts is a TypeScript library for building sophisticated **Cardano**
smart contracts using the **Helios** on-chain language. It provides a framework
for creating upgradeable, multi-contract applications with data management
capabilities similar to database applications, while leveraging Cardano's
UTxO-based blockchain technology.

### Name Disambiguation

"Stellar" is a project name. This has no relation to the Stellar blockchain,
Soroban, or Horizon.

## Reference Directory Index

The `reference/` directory contains curated knowledge files. Load these as
needed based on the task at hand — you do NOT need to read all of them upfront.

### Essential Guides

| File | Covers |
|------|--------|
| `reference/essential-cardano.md` | Cardano UTxO model, validators, transaction structure, on-chain vs off-chain roles |
| `reference/essential-helios-lang.md` | Helios language features: functional, expression-oriented, immutable, no side effects, type system |
| `reference/essential-helios-builtins.md` | Helios on-chain built-in types (Address, Credential, Value, etc.) and their methods |
| `reference/essential-helios-api.md` | Helios off-chain JavaScript/TypeScript SDK for ledger primitives and transaction utilities |
| `reference/essential-stellar-dapp-architecture.md` | High-level design: modularity, delegates, data policies, governance patterns |
| `reference/essential-stellar-dapp-kickstart.md` | Step-by-step guide for creating a Stellar dApp skeleton, chartering, and deploying |
| `reference/essential-capo-lifecycle.md` | Mint/spend delegate responsibility distribution, charter data lifecycle, upgradability |
| `reference/essential-stellar-onchain.md` | On-chain Capo leader contract, delegates, datum structures, validation patterns |
| `reference/essential-stellar-onchain-diagnostics.md` | REQT/logging helpers and on-chain diagnostics for requirements tracking in Helios |
| `reference/essential-stellar-offchain.md` | Core off-chain TypeScript classes (Capo, StellarContract, StellarDelegate), transaction construction |
| `reference/essential-stellar-data-policy.md` | Authoring data-policy delegates (Helios scripts) for record create/update/delete validation |
| `reference/essential-stellar-internals.md` | Low-level helper behavior, mint/spend delegate implementation details, data-policy collaboration |
| `reference/essential-stellar-testing.md` | Testing off-chain classes and on-chain policy scripts using Vitest and emulated blockchain |
| `reference/essential-stellar-testing-snapshots.md` | Snapshot caching system that speeds up tests by persisting blockchain states |
| `reference/essential-stellar-ui.md` | UI integration patterns (stub — minimal content) |

### Which to Load When

- **Building a new dApp**: Start with `essential-stellar-dapp-kickstart.md`, then `essential-stellar-dapp-architecture.md`
- **Writing on-chain logic**: `essential-helios-lang.md` + `essential-helios-builtins.md` + `essential-stellar-onchain.md`
- **Writing off-chain TypeScript**: `essential-stellar-offchain.md` + `essential-helios-api.md`
- **Creating a data delegate**: `essential-stellar-data-policy.md` + `essential-stellar-internals.md`
- **Writing tests**: `essential-stellar-testing.md` + `essential-stellar-testing-snapshots.md`
- **Understanding Cardano fundamentals**: `essential-cardano.md`
- **Expressing on-chain requirements**: `essential-stellar-onchain-diagnostics.md` — REQT* variant selection for traceable invariant enforcement
- **Debugging on-chain failures**: `essential-stellar-onchain-diagnostics.md`

### Boilerplate Templates

- `reference/boilerplate/testHelper.ts` — Template for creating test helper classes
- `reference/boilerplate/testing/basic-offchain.test.ts` — Example basic off-chain transaction test
- `reference/boilerplate/testing/policy-flow.test.ts` — Example on-chain policy validation test

### Archived Helios Docs

`reference/archive/helios-lang/` contains offline copies of Helios language and SDK
documentation in HTML format, organized under `lang/`, `lang/builtins/`, and `sdk/`.

## Core Concepts

### Capo Contract
The "leader" contract that provides a permanent address and minting policy
for the entire contract suite. It contains:
- **CharterData**: Configuration pointing to all delegate contracts
- **Settings**: Application-specific parameters that can be upgraded
- **Upgradability**: Allows policy updates by changing delegate references
  without changing the main contract address

### Delegates
Modular contracts that handle specific responsibilities:
- **Mint Delegate**: Controls token minting policies
- **Spend Delegate**: Controls UTxO spending policies
- **Named Delegates**: Application-specific contracts for custom data types
- **Delegated Data Controllers**: Scripts governing specific record types

### UUT (Unique Utility Token)
A pattern using unique tokens stored in delegate script addresses to trigger
custom policy enforcement.

### StellarContract
The unifying base class — every contract "has an on-chain policy script."

## Key Architectural Patterns

- **Dual Ownership Model**: On-chain artifacts have both runtime ownership (which code
  instance manages them) and policy ownership (which validator script controls them).
- **Two Parallel Delegation Chains**: Minting chain and spending chain operate in
  parallel, never sequentially.
- **Hot-Swap Envelope Pattern**: Network, actor, and logger contexts use shared reference
  wrappers. Consumers MUST NOT cache the inner value — always read through the wrapper.
- **Records at Capo Address**: Data records live at the Capo address, not at delegate
  addresses. Delegates can be swapped without data migration.
- **Transaction Naming**: `mkTxn*` creates a new `StellarTxnContext` (tcx); `txn*`
  requires an existing tcx and MUST NOT create one.

## Important Patterns

**Decorators**:
- `@txn` — Full transaction builders (start from scratch)
- `@partialTxn` — Partial transaction builders (augment existing transaction context)
- DEPRECATED: `@Activity.redeemer`, `@datum`

**Type Safety**: Heavy use of TypeScript conditional types and branded types to
ensure transaction builders have required context (e.g., `hasSeedUtxo`, `hasCharterRef`).

**Script Bundle as Language Abstraction**: Helios coupling is to platform libs,
not strictly the language itself.

## Requirements Management

Type-safe requirements tracking via `hasReqts()` and `Requirements.ts`.
Requirements docs (`*.reqts.md`) use REQM-UUT identifiers and track status
(PENDING, IN PROGRESS, COMPLETED).

## Testing Concepts

Tests use Vitest with an emulated blockchain for both positive and negative
scenarios. Tests verify correct behavior **and** proper failure modes.

- Test-specific Capos construct isolated contract-execution environments
- Most tests are full integration with emulated chain and take non-trivial time
- `fit()` focuses on a single test; `pnpm test ‹filename›` runs one file
- `pnpm test ‹filename› -t "unique string"` runs a specific test case

### Test execution rules

- **NEVER run tests in parallel.** Run ONE test process at a time. The emulated
  chain is stateful and concurrent runs will interfere with each other.
- **NEVER pipe build or test output through `| head` or `| tail` directly** —
  this creates unnecessary overhead and can mask errors.
- **Always redirect output to a file**, then inspect that file separately:
  ```bash
  pnpm test ‹filename› > /tmp/test-output.log 2>&1
  # or use tee to see output live AND capture it:
  pnpm test ‹filename› 2>&1 | tee /tmp/test-output.log
  ```
  Then use `head`, `tail`, `grep`, or your editor to inspect the output file.
- **Prefer running a specific test case** over an entire file whenever possible:
  ```bash
  pnpm test ‹filename› -t "unique string from test name"
  ```

## Network Configuration

Supports both Cardano testnet and mainnet via network context parameters passed
to contract instances.

## Weaver Host Repository

This repository uses [Weaver](./.weaver/README.md) for multi-tree management — independent branches linked in a single git repo via content-free merge commits.

**Before doing any work**, load and study the [Weaver Host Repo skill](./.weaver/host-repo.SKILL.md). It governs how you interact with the multi-tree structure: when to sync, how `.proj/` works, and how to access assets.
