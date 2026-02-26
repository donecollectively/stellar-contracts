## [0.9.5-beta.1] - 2026-02-26

### Application Performance

- New `CachedUtxoIndex`: a Dexie-backed in-browser UTxO cache for Capo
dApps.  Incrementally syncs from the last known block, evicts spent UTxOs,
indexes by wallet address and asset class, and rate-limits Blockfrost calls
with graceful backoff.  - `CapoDappProvider` now shows a network sync rate
gauge during initial sync and Blockfrost rate-limit backoff.  - Startup
performance: deferred Helios script compilation for read-only delegates and
restructured wallet load order.  dApps start faster.

### Reference Documentation and Agent Guidance

- New validity window guide in reference docs: covers `validFor()`,
`txnTime`, `txnEndTime`, `futureDate()`, granularity alignment, and
synchronizing datum timestamps with on-chain `now()`.  Testing guidance
included.  - New codec-utils section in `essential-helios-api.md` documents
`equalsBytes`, `bytesToHex`, `encodeUtf8`, `compareBytes`, and `toBytes`. 
Warning added to offchain docs: `===` silently fails on `number[]` byte
arrays.  - New architecture docs: overall Stellar Contracts stack, on-chain
validator design, and UI component architecture.  Reference docs
deduplicated and cross-linked.  - Bootstrapping and charter lifecycle
content split into dedicated `essential-offchain-bootstrapping.md`.  UI
essentials doc expanded with component structure and Tailwind integration
details.  - `AGENTS.md` updated with detailed reference index and Weaver
guidance.  `CLAUDE.md` refocused on maintainer guidance.  REQT\* helper
discoverability improved in three reference locations.

### Transaction-Building and On-Chain Data Lifecycle

- Fixed: `txnTime` now derived from network block time rather than
wall-clock `now()`.  Eliminates time drift between client and chain for
time-bounded transactions.  - `isActivity` enriched: required `moduleName`,
`activityName`, and `activityData` fields added.  Multi-level enum paths
supported.  Deprecated manual activity constructors removed.  - Transaction
context (`tcx`) added to `beforeCreate`/`beforeUpdate` hook signatures. 
Enables time-aware and transaction-aware hook logic.  - Transaction context
fixes: `txnEndTime` now captured when using `validFor()`, stack traces added
to duplicate-input errors, duplicate spare inputs filtered before
submission.  - `getDgDataController()` API update: optional `readOnly`
replaced by required `onchain` boolean.  All call sites must be updated.

### Testing Environment: On-Disk State Snapshots

- On-Disk State Snapshots for Testing — The test emulator now has a mature
snapshot system that persists blockchain state to disk between test runs. 
Test suites build snapshots incrementally, reuse them across runs, and
recover correctly from partial-cache scenarios — dramatically reducing test
cycle time for suites with expensive setup.  - `@hasNamedSnapshot` now
requires a `builderVersion` field.  Pass `undefined` for no change to the
cache key, or increment to invalidate stale snapshots when a builder's logic
changes.  - Renamed: emulator `futureDate()` is now `travelToFuture()`. 
Update all test call sites.


## Note - Summaries follow

The release notes above were curated with human oversight.

The following details were generated without detailed human oversight and there might be 
some errors or omissions.  See the git commit history for the full details.

## [0.9.4-beta.1] - 2026-01-07

### UI
- **UI / FormManager:** Switched to callback refs for reliable mounting; added off-chain `validate()` support
- **TxBatchViewer:**
  - Improved nested transaction visualization, added "Close Batch" button, and refined cancel button logic/warnings
  - fixed missing Sign/Submit buttons in specific batch states
- **CapoProvider:**
  - Improved hot-reloading support (context separation)
  - fixed token scanning lifecycle, and added "click to copy" for wallet addresses
  - fixed error propagation to UI in special cases of no-utxos-found

### Off-chain
- **Delegated Data:** Added `beforeCreate` (with activity) and `beforeUpdate` (with original/activity) hooks for controllers
- **Math:** Fixed rounding logic for fixed-precision math to handle small floating-point errors
- **Refactoring:** Moved `txnName` to options in `dgData` controller; standardized `recordTypeName` constants
- **FoundDatumUtxo** now has id: string at its root

### Other
*   **On-chain:** Optimized script sizes by pruning unused syntax trees in non-mint/spend delegates and enabling empirical size optimizations
*   **Testing:** Added `captureRecordId` and `getNamedRecordId` helpers; avoid expensive deep-copies on "expected error, got built-transaction-context"
*   **Test Helper:** Fixed `expectError` to correctly throw exceptions when operations succeed
*   **Docs:** Extensive updates to agent reference material, testing guides, and quickstart info
*   **Dependencies:** Updated Helios dependencies

## [0.9.3-beta.7] - 2025-11-02
 - repairing .d.ts definitions in dist/
 - enhanced hasReqts() protocol and related types
 - removed api-extractor in favor of typedoc
 - (beta.1-7 were checkpoints to here)

## [0.9.3-beta.1] - 2025-10-26

- offchain: Optimized script loading with deferred compilation and just-in-time bundle loading
- offchain: Simplified script bundle API - changed from scriptBundle() to scriptBundleClass pattern with mkScriptBundle() factory
- ui: Improved CapoDappProvider performance by deferring expensive upgrade checks to CharterStatus component
- ui: replaced Next.js-specific "use client" with framework-agnostic useEffect()
- ui: limit the amount of styling provided by the UI import, so downstream apps can easily provide their own styling
- build: Enhanced browser compatibility - removed Node.js-specific dependencies (Buffer, process)
- build: Improved dev experience with syntax-checking of uncompiled scripts
- build: Reorganized temp files to .stellar/ directory

## [0.9.2-beta.3] - 2025-10-10
- ui: adjustments for CharterStatus component
- offchain: changed to use async access to onchain scripts and their pre-compiled bundles
- offchain: deferred loading of compiled scripts
- rollup-plugin: support async pre-compiled bundles for deployment

---

## [0.9.2-beta.2] - 2025-09-24
- rollup-plugin: fixes for Activity type problems in data-bridge generator
- offchain: script compiling improvements
- onchain: CapoCtx security gap fix for creatingDgData
- onchain: CapoCtx delegate activity info improvements
- onchain: multiple dgData activities support
- diagnostics: improved log grouping and diagnostics

---

## [0.9.1-beta.17] - 2025-09-11
- deps: freshen dependency versions (helios packages)
- diagnostics: adjust presentation of byte arrays in diagnostics
- diagnostics: minor type/delegate-roles diagnostic fixes
- onchain: multiple dgData activities support
- onchain: delegate validation improvements

---

## [0.9.1-beta.16] - 2025-09-07
- fix: minor type warnings/errors
- offchain: add actorContext.others wallet references
- offchain: findActorUtxo() supports searchOthers option
- deps: update dependencies

---

## [0.9.1-beta.15] - 2025-09-06
- onchain: fixup orFail() return type consistency

---

## [0.9.1-beta.13] - 2025-08-26
- onchain: add orFail() helper to DgDataDetails
- offchain: reduce tx fee slush amount
- environment: use NEXT_RUNTIME instead of NODE_ENV

---

## [0.9.1-beta.12] - 2025-08-16
- environment shim updates

---

## [0.9.1-beta.11] - 2025-08-10
- fix: dist/ output file name when contract script has digit in name
- docs: minor license updates

---

## [0.9.1-beta.10] - 2025-08-02
- ui: Fine-tune TxBatchViewer component
- ui: Ensure buttons don't appear disabled
- env: add BF_API_KEY to pre-defined environment attributes
- docs: api-extractor: fix windows line-endings

---

## [0.9.1-beta.9] - 2025-07-30
- fix: type-checking errors in downstream projects
- created .d.ts for on-chain types

---

## [0.9.1-beta.8] - 2025-07-26
- ui: Improvements for tx batch viewer
- dApp provider: fix roles
- transaction-context: submitAll() returns the batch instead of true
- types: IntersectedEnum / Ergo types: single-key intersection is non-partial
- onchain: assert refInput for added manifest entry

---

## [0.9.1-beta.7] - 2025-07-26
- ui: tx batch viewer UI improvements
- dApp provider: add ready attribute to state
- TransactionContext: submitAll() returns the batch instead of true
- onchain: assert refInput for added manifest entry
- onchain: IntersectedEnum / Ergo types improvements

---

## [0.9.1-beta.6] - 2025-06-18
- testing: allow additional test helperState attributes
- onchain: support cctx.referencingDgData()
- deps: update helios tx-utils dependency for hydra updates

---

## [0.9.1-beta.5] - 2025-06-17
- onchain: support cctx.referencingDgData() to require txInputRef
- deps: update helios dependencies

---

## [0.9.1-beta.4] - 2025-05-28
- onchain: Adjust error message about missing manifest entry

---

## [0.9.0-beta.11] - 2025-04-09
- deps: version bump with peer dependencies

---

## [0.9.0-beta.10] - 2025-03-30
- deps: update helios dependencies

---

## [0.9.0-beta.7] - 2025-03-25
- test improvements

---

## [0.9.0-beta.5] - 2025-03-21
- build: configuration updates

---

## [0.9.0-beta.4] - 2025-03-20
- build: developed beta-tagging conventions

---

## 0.9.0-beta.1 - beta.3
- not released

---

## Internal alpha versions (0.8.4 - 0.9.0)

### **Core Architecture Improvements**
- Updated to use Helios 0.17.x transaction builder
- Updated to use Helios' 0.17.x type-safe data conversion helpers
- Restructured Capo architecture for multi-delegation and lifecycle management
- Refactored from StellarDelegate to ContractBasedDelegate to capture the most essential pattern of treating typed onchain data like database records
- Eliminated onchain "DefaultCapo" and "specialized capo" concepts; moved all their considerations into upgradeable delegate scripts.
- Implemented structured settings management with onchain validation
- Added delegate upgrade capabilities and charter-manifest data-strucuture for pending changes

### **Delegated Data System**
- Implemented CIP-68 compliant datum adapters with activity protocols
- Created seed-based activity linking for transaction relationships
- Added findRecords() and exampleData() patterns for all DgDataControllers
- Developed dgDataPolicy lifecycle for managing onchain data

### **Type Generation & Data Bridges**
- Developed complete TypeScript type generation from Helios modules
- Built data bridge generators with enum variant support
- Implemented single-field enum unwrapping and nested variant types
- Created datum adapter system for offchain data management
- Removed deprecated "manually-defined activities" in favor of auto-generated helpers

### **Transaction Building Enhancements**
- Enhanced StellarTxnContext for strongly-typed transaction-building
- Implemented transaction chaining with reserved UTxOs and promises
- Added reference script support throughout transaction building
- Built submitTxns() and submitAll() for complex transaction chains
- Added batch submission controller for persistent multi-txn workflows

### **UI & React Integration**
- Created Capo dApp Provider for React dApps with state management
- Created UI components organizing multi-transaction sequences for review and submission
- Implemented transaction transparency with requirement verification
- Added transaction progress tracking and submission state machines
- Reusable UI components for delegate management and charter visualization

### **Rollup Plugin & Build System**
- Developed custom Rollup plugin for Helios script bundling at compile time
- Implemented pre-compiled script bundles for deployment
- Created separate platform bundles (browser vs Node.js environments)
- Added watch mode for instant syntax feedback during development
- Built smoke tests integrated with incremental builds
- Moved Helios to peer dependencies for better version control

### **Testing & Emulation Infrastructure**
- Created Stellar advance network emulator, adapted from Helios' basic version
- Implemented snapshot testing with save/load capabilities - makes typical test runs much faster
- Added actor context management for multi-wallet scenarios
- Enhanced diagnostics with comprehensive transaction details
- Added submitTxnWithBlock() for reliable chain advancement in tests
- Implemented configurable memory and optimization for test environment

### **On-Chain Improvements**
- Refined RelativeDelegateLink data structure for consistent delegate relationship management
- Implemented CapoCtx helper object for fundamental onchain validation patterns
- Created Requirements (REQTS) module for tracking validation throughout scripts
- Added comprehensive activity/redeemer protocols for delegates
- Enhanced security checks including double-spend protection and UTxO validation

### **Diagnostics & Transparency**
- Created console-based transaction viewer with diagnostic details
- Created script execution tracing with requirement verification
- Added stack trace extraction and formatting for Helios failures

### **Transaction Submission & Robustness**
- Implemented dual submission strategy (wallet + network)
- Built batch transaction submission with status tracking for dApp UIs
- Added transaction validity period management
- Improved robustness to invalid transactions and double-spend scenarios

### **Developer Experience**
- Added hot reload/watch mode for rapid development iteration of onchain scripts
- Improved diagnostic output and error messages throughout
- Created comprehensive TSDoc annotations
- Added type-safe Requirements management
- Exposed generated types for downstream projects

---

## [0.8.4] - 2023-11-30
- Use only one wallet-indicated collateral for filtering available utxos
- if wallet-based or network-based submit fails, issue warning to console
- Add support for choosing mainnet with network mismatch checking
- export helios Network type
- Transaction: improve method of finding change-address
- transaction submit: succeeds if (network OR wallet) submit succeeds
- validFrom(): extend backward 3 minutes from time.now() by default
- readDatum flow: correctly parse Option[String] data
- adjusted explicit 'optimize' option for helios simplify
- fixed edge case in delegate's "grant-authority" path
- diagnostics: show more size info

---

## [0.8.1] - 2023-11-18
- Small refinements in Helios code and helper functions
- fixup diagnostics
- Updated BasicMintDelegate protocol for specialization
- Reduce diagnostic expressions and resulting txn fees
- enable capo's root config to be validated with application layer
- Adjusted npm testing script for parallelism
- real-world wallet support with WalletHelper
- Fine-tuning minting delegate functionality
- Capo can be configured from JSON-serialized config details
- Updated names for DX
- export Helios types to support downstream projects

---
# Previous Development History

## Fall 2023

### Core Infrastructure Maturation
- Real-world wallet support integration with multiple address management
- Transaction submission improvements: dual submission strategy (wallet + network), validity interval management
- Configuration serialization: Capo can be configured from JSON-serialized config details
- Test environment enhancements: actor context management, snapshot testing capabilities
- Delegation system refinement with roles, delegates, and authority policies
- Off-chain helper improvements: readDatum flow improvements, Option[String] data parsing
- Utxo management improvements including smallest-first sorting, coin selection optimizations
- License and documentation updates for Cardano Community Source license

### Development Tooling
- Added smoke test infrastructure
- Adjusted npm testing scripts for parallel test execution
- API extractor integration for type rollup documentation
- Improved diagnostic output throughout transaction building
- Type safety improvements with strongly-typed delegation system

## Summer 2023

### Capo Architecture Development
- Created foundational Capo class with charter token system
- Implemented minting and treasury contract patterns
- Added activity/redeemer decorators for enforcing naming conventions
- Developed test helper infrastructure with Vitest integration
- Implemented StellarContract base class with facade pattern
- Added decorated transaction building methods (@Activity.partialTxn, etc.)

### Delegation & Authority System
- Introduced roles, delegates and strategies foundation
- Developed authority delegation patterns
- Added support for partial script params and required hints in role maps
- Implemented UUT (Unspendable Utility Token) system
- Created delegate setup and lifecycle management
- Developed readDatum<T>() type-safe datum parsing

### Transaction Building
- Enhanced StellarTxnContext with state management
- Implemented transaction chaining with reserved UTxOs
- Added helper methods: totalValue(), txnKeepValue(), outputSentToDatum()
- Developed transaction building decorators for clarity and consistency
- Added support for minting multiple tokens from single policy

### Testing & Emulation
- Created test helper classes with strongly-typed contexts
- Implemented network emulator for testing
- Added submit() helper to stellar contract facade
- Developed actor management for multi-wallet scenarios
- Created diagnostic utilities for transaction analysis

### Build & Tooling
- Rollup bundling experiments for Helios
- Enhanced code organization and module structure
- Type system refinement throughout codebase
- Added benchmarking capabilities for compilation and validation
- Updated to Helios 0.14.x and 0.15.x compatibility

## Spring 2023

### Initial Foundation
- Early experimentation with bundled contract and transaction builder modules
- Rollup loader development for Helios
- Basic charter token and treasury patterns
- Starting point for structured contract development on Cardano with Helios





