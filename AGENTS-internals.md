# AGENTS-internals.md — Stellar Contracts Deep Reference

This file extends `AGENTS.md` with deeper details about the library's source
structure, architecture documentation, data flow, and delegate authoring.
Load this when you need to work on internals or create new delegates.

## Data Flow

1. **Transaction Building**: TypeScript classes build transactions using fluent APIs
2. **Data Bridges**: Transform between TypeScript types and on-chain UPLC data structures
3. **Activities/Redeemers**: Named transactions and the data ("redeemer") needed for them.
   Defined in `.hl` code, exposed through the bridge. Basic CRUD cases can work with
   default/generic activities.
4. **Policy Enforcement**: On-chain Helios scripts validate transaction structure and business rules

## Key Source Structure

**On-chain code** (Helios `.hl` files in `src/`):
- `DefaultCapo.hl` — Main Capo contract
- `delegation/BasicDelegate.hl` — Base delegate template
- `delegation/UnspecializedDelegate.hl` — Scaffold for custom delegates
- `delegation/CapoDelegateHelpers.hl` — Shared delegate utilities
- `minting/CapoMinter.hl` — Minting policy logic

**Off-chain TypeScript code**:
- `src/Capo.ts` — Main Capo contract class
- `src/StellarContract.ts` — Base class for all contracts
- `src/StellarTxnContext.ts` — Transaction building context
- `src/delegation/StellarDelegate.ts` — Base class for delegates
- `src/delegation/ContractBasedDelegate.ts` — Base for contract-backed delegates
- `src/helios/dataBridge/DataBridge.ts` — On-chain/off-chain data transformation

## Discovering Architecture & Requirements Docs

Architecture docs, requirements docs, and structured records are co-located
with the source code they describe:

| What | Glob pattern | Format |
|------|-------------|--------|
| Architecture docs | `**/*.architecture.md`, `**/*.ARCHITECTURE.md` | Prose + decisions |
| Architecture records | `**/*-architecture.jsonl` | Structured JSONL, one record per line |
| Requirements docs | `**/*.reqts.md` | Tracked requirements with IDs |
| Guides | `drafts/*.md` | How-to documents |

### Key Architecture Documents

- **System-level**: `stellar-contracts.architecture.md` (root)
- **Emulator**: `src/testing/emulator/Emulator.ARCHITECTURE.md`
- **UtxoIndex**: `src/networkClients/UtxoIndex/utxoIndex.ARCHITECTURE.md`
- **StellarTxnContext**: `StellarTxnContext.architecture.md` (root)
- **Stellog (logging)**: `src/loggers/stellog.architecture.md`
- **Test Logging**: `src/loggers/testLogging.architecture.md`
- **Off-chain Runtime**: `src/offchainRuntime.ARCHITECTURE.md`
- **Dapp UI**: `dapp-ui.architecture.md` (root)

Architecture JSONL records use `ARCH-*` identifiers.
Requirements use `REQM-UUT` identifiers.

## Creating New Delegates

See `drafts/creating-a-delegate.md` for the detailed guide. Key steps:

1. Create Helios contract (`.hl` file) with data structures and validation logic
2. Create TypeScript class extending `ContractBasedDelegate`
3. Define activities (redeemers) in both on-chain and off-chain code
4. Create data bridge/adapter for datum transformation
5. Register delegate in Capo's `initDelegateRoles()`
6. Implement transaction builders using `@txn` and `@partialTxn` decorators
7. Write comprehensive tests
