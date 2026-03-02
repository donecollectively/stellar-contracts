# About Capo

## MAINTAINERS MUST READ:
> **AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY**
>
> This file is generated from the `.reqts.jsonl` source. To make changes:
> 1. Edit the JSONL source file
> 2. Run `node generate-reqts.mjs` to regenerate
>
> **COMPLIANCE TRIGGER**: Before interpreting these requirements, you **MUST** read:
> `reqt-consumer.SKILL.md`
>
> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

The Capo is the 'leader' contract — permanent address and minting policy for a Stellar Contracts dApp suite. It orchestrates chartering, delegate lifecycle (install/upgrade/commit), delegated data management, ref script storage, governance authority, and the auto-setup flow that bootstraps and upgrades delegates on startup.

The essential technologies are **TypeScript, Cardano UPLC, Helios**. Related technologies include StellarTxnContext (addlTxn pattern, TxNotNeededError), DelegatedDataContract (setupCapoPolicy), CapoMinter (fixed minting policy).


# Background

The Capo is the central orchestrator for a Stellar Contracts dApp. It holds the charter token (singleton proof of contract identity), the manifest (mapping delegate roles to on-chain tokens and policy hashes), and the CharterData datum (configuration linking all delegates). Almost all data UTxOs live at the Capo address — delegates can be swapped without data migration.

Key challenges:
1. **Multi-transaction chains**: Delegate installation/upgrade requires coordinated sequences (queue → ref script → commit) that can partially fail.
2. **Upgrade detection**: Comparing on-chain validator hashes against off-chain compiled scripts to determine if a delegate needs replacement.
3. **Governance gating**: All lifecycle operations require governance authority tokens, preventing unauthorized modifications.
4. **Ref script management**: Storing compiled scripts on-chain to reduce transaction fees, with fallback when ref scripts are missing.
5. **Recovery from partial failures**: When any transaction in a chain fails to submit, the system must recover gracefully on next startup.



# Design Goals

#### General Approach
- Central orchestrator with clear delegation boundaries — Capo owns lifecycle, delegates own business logic
- Multi-transaction chains via `includeAddlTxn` pattern for complex operations
- Resilient recovery from partial transaction chain failures
- Governance-gated lifecycle operations

#### Specific Goals
1. **Charter Management**: Bootstrap and maintain the charter token, CharterData, and manifest as the single source of truth for the dApp's on-chain configuration.
2. **Delegate Lifecycle**: Install, upgrade, and retire delegates through a queued-commit pattern that supports atomic manifest updates.
3. **Ref Script Optimization**: Store compiled scripts on-chain to minimize transaction fees, with graceful fallback when ref scripts are missing.
4. **Auto-Setup Resilience**: Automatically detect and recover from partial failures during delegate installation/upgrade.
5. **Data Access**: Provide unified APIs for finding and parsing delegated data UTxOs across all record types.
6. **Governance Enforcement**: Gate all lifecycle operations on governance authority tokens.


# Must Read: Special Skills and Know-how

1. **includeAddlTxn() name uniqueness constraints and TxNotNeededError handling in resolveMultipleTxns()**: When modifying the auto-setup flow or reviewing recovery logic → load `src/StellarTxnContext.ts`
2. **mkTxnInstallPolicyDelegate and mkTxnQueuingDelegateChange — the three-transaction chain, TxNotNeededError paths, AlreadyPendingError**: When working on mkTxnUpgradeIfNeeded or commitPendingChangesIfNeeded → load `src/Capo.ts`
3. **Responsibility breakdown between Capo, mint delegate, spend delegate, and data-policy delegates**: When reviewing which component owns a lifecycle operation → load `reference/essential-capo-lifecycle.md`

# Collaborators

**NEEDS (this module depends on):**
- `MOD-gx26py3e5s`: setupCapoPolicy() is called by Capo's auto-setup loop. DelegatedDataContract owns per-delegate setup logic including ref script backfill detection.; needs REQT-d3zy87w1n5


**Expected users:** Downstream dApp subclasses, DelegatedDataContract controllers, CapoDappProvider (UI layer), test infrastructure

# Functional Areas and Key Requirements

### 1. Charter & Identity
Charter token lifecycle, CharterData management, manifest operations, and the Capo's identity (mph, address).

#### Key Requirements:
1. **Charter Token Bootstrap**: The Capo mints a charter token, delegate UUTs (gov, mint, spend), and writes the initial CharterData datum with manifest entries and delegate links. Ref scripts for core delegates are stored as companion transactions.
2. **Charter Data Management**: The Capo provides methods to find the charter UTxO, read its CharterData, and update it within transactions — ensuring the charter token is always returned to the Capo address.
3. **Manifest Operations**: The manifest maps role names and data-type names to on-chain token references. Entries can be added via mkTxnAddManifestEntry, and queried via hasPolicyInManifest.

### 2. Delegate Resolution
Finding, connecting, and configuring delegates — mint, spend, governance, data controllers, and named delegates — from the on-chain manifest.

#### Key Requirements:
1. **Delegate Resolution**: The Capo resolves delegates by reading manifest entries from CharterData, parsing delegate links (config, validator hash, UUT name), and instantiating the appropriate delegate class with compiled script and configuration.
2. **Delegate Link Parsing**: Delegate links encode configuration (including revision numbers) as serialized arrays. The Capo parses these from CharterData and constructs them for new delegate installations.

### 3. Delegate Lifecycle
Installing, upgrading, and retiring delegates through the queued-commit pattern: queue pending change, create ref script, commit pending changes.

#### Key Requirements:
1. **Delegate Installation**: A new delegate is installed via a three-transaction chain: mint a UUT and queue a pending Add change in CharterData, create a ref script for the delegate's compiled script, and commit the pending change to activate it in the manifest.
2. **Commit Pending Changes**: Pending changes queued in CharterData are activated by mkTxnCommittingPendingChanges, which applies the changes to the manifest and clears the pending list.

### 4. Auto-Setup & Upgrade Orchestration
The mkTxnUpgradeIfNeeded() flow that iterates delegate roles, detects needed installations/upgrades, and orchestrates the multi-transaction chains — including recovery from partial failures.

#### Key Requirements:
1. **Auto-Setup Delegate Loop**: On startup, the Capo iterates all registered delegate roles. For each data-policy delegate, it calls setupCapoPolicy() which generates up to three transactions (queue, ref script, commit). A post-loop commitPendingChangesIfNeeded() handles freshly-queued changes.
2. **Pre-Loop Orphaned Commit Recovery**: Before any delegate setup runs, orphaned pending changes from a prior failed run are committed. This prevents AlreadyPendingError from silently skipping delegates whose upgrade was partially completed.

### 5. Ref Script Management
Creating, finding, and attaching reference scripts for on-chain policy execution — including fallback behavior when ref scripts are missing.

#### Key Requirements:
1. **Ref Script Storage**: Compiled delegate scripts are stored as ref scripts in UTxOs at the Capo address, reducing transaction fees for operations that reference those scripts. Creation requires wallet funds to cover the storage deposit.
2. **Ref Script Lookup & Attachment**: When building a transaction that needs a delegate's script, the Capo looks for a matching ref script UTxO. If found, it is added as a reference input. If not found, the script bytes are added directly to the transaction with a warning.

### 6. Governance & Authority
Governance authority token handling, gov delegate resolution, and authority gating for lifecycle operations.

#### Key Requirements:
1. **Governance Authority**: Lifecycle operations require governance authority. The Capo finds the gov delegate, locates the authority token, and adds it as a reference input to authorize the transaction.

### 7. Delegated Data Access
Finding, parsing, and querying delegated data UTxOs across record types — the read path for on-chain records.

#### Key Requirements:
1. **Delegated Data Query**: The Capo provides findDelegatedDataUtxos() to locate records by type, parsing inline datums through the appropriate data controller. Supports filtering by type name and individual record lookup.

### 8. UUT & Token Operations
Minting UUTs, computing token values, and managing the seed UTxO pattern for deterministic token naming.

#### Key Requirements:
1. **UUT Minting**: UUTs are minted using a seed UTxO for deterministic naming. The Capo provides txnMintingUuts() for multi-purpose minting and txnWillMintUuts() for declaring UUT intent.

### 9. Settings Bootstrap
Bootstrapping the settings delegate, creating the initial settings record, and registering it in the manifest.

#### Key Requirements:
1. **Settings Bootstrap**: If the Capo has a settings delegate role defined, addTxnBootstrappingSettings() creates the delegate if missing, creates an initial settings record using exampleData() or initialSettingsData(), and registers it in the manifest as currentSettings.


# Detailed Requirements

## Area 1: Charter & Identity

### **REQT-1.1.0/nj8dz40cbw**: **COMPLETED**/draft: **Charter Token Bootstrap**
#### Purpose: Governs the initial minting of the charter token, delegate UUTs, and CharterData creation. Applied when reviewing the bootstrap flow, charter creation tests, or the initial deployment sequence.

 - 1.1.1: REQT-1bvvtpy4ej: **COMPLETED**/draft: **Charter Token Singleton** - mkTxnMintCharterToken MUST mint exactly one charter token and store it at the Capo address with an inline CharterData datum containing the initial manifest and delegate links.
 - 1.1.2: REQT-s90v9gvc1y: **COMPLETED**/draft: **Core Delegate UUTs** - Charter bootstrap MUST mint UUTs for governance authority, mint delegate, and spend delegate, storing each at its respective delegate address with an IsDelegation datum.
 - 1.1.3: REQT-x7wdcb2sm2: **COMPLETED**/draft: **Core Ref Scripts** - Charter bootstrap MUST create companion transactions storing ref scripts for the minter, Capo, and mint delegate compiled scripts at the Capo address.

### **REQT-1.2.0/nbbgt4adqn**: **COMPLETED**/draft: **Charter Data Management**
#### Purpose: Governs finding, reading, and updating the charter datum. Applied when reviewing charter mutation flows, or debugging delegate resolution that depends on charter state.

 - 1.2.1: REQT-3sgxnfqwgm: **COMPLETED**/draft: **Find Charter Data** - findCharterData() MUST locate the charter UTxO by token predicate, parse the inline datum, and return the CharterData including manifest and delegate links. MUST support optional mode (returns undefined if not found) and required mode (throws).
 - 1.2.2: REQT-0ca5j5159e: **COMPLETED**/draft: **Charter Update Transaction** - mkTxnUpdateCharter MUST spend the charter UTxO and produce a new output at the Capo address with updated CharterData, preserving the charter token and requiring governance authority.

### **REQT-1.3.0/bjqh0a1tp6**: **COMPLETED**/draft: **Manifest Operations**
#### Purpose: Governs adding entries to and querying the CharterData manifest. Applied when reviewing delegate registration, settings pointer creation, or manifest-driven UTxO lookup.


## Area 2: Delegate Resolution

### **REQT-2.1.0/adm9z34kvh**: **COMPLETED**/draft: **Delegate Resolution**
#### Purpose: Governs how the Capo locates and instantiates delegates from on-chain manifest data. Applied when reviewing delegate lookup, upgrade detection, or debugging delegate connection failures.

 - 2.1.1: REQT-ashc371mgt: **COMPLETED**/draft: **Core Delegate Accessors** - getMintDelegate(), getSpendDelegate(), and findGovDelegate() MUST resolve delegates from CharterData, supporting both on-chain mode (compiles script, detects upgrades) and off-chain mode (read-only, skips compilation).
 - 2.1.2: REQT-swf1e9xqpq: **COMPLETED**/draft: **Data Controller Resolution** - getDgDataController() MUST resolve a data-policy delegate by type name from the manifest, returning the instantiated DelegatedDataContract subclass. MUST support optional mode and on-chain/off-chain modes.
 - 2.1.3: REQT-s62q4hkbcg: **COMPLETED**/draft: **Upgrade Detection** - When resolving a delegate with onchain: true, the Capo MUST compare the current compiled script's validator hash against the on-chain manifest's validator hash. If they differ, the delegate's bundle MUST be marked with previousOnchainScript for upgrade processing.
 - 2.1.4: REQT-vvj49cjpgz: **COMPLETED**/draft: **Upgrade Detection Ref Script Dependency** - When upgrade detection finds a hash mismatch, it MUST locate the existing delegate's ref script via findRefScriptUtxo() to obtain the previous on-chain script. If the ref script is not found, it throws an error, blocking upgrade detection for that delegate.

### **REQT-2.2.0/83x9m13vyc**: **COMPLETED**/draft: **Delegate Link Parsing**
#### Purpose: Governs the serialization and deserialization of delegate links between on-chain and off-chain representations. Applied when reviewing delegate configuration, link serialization, or manifest parsing.


## Area 3: Delegate Lifecycle

### **REQT-3.1.0/amfa8qd25n**: **COMPLETED**/draft: **Delegate Installation**
#### Purpose: Governs the transaction chain for installing a new data-policy delegate into the manifest. Applied when reviewing the install flow, pending change queuing, or the three-transaction chain (queue → ref script → commit).

 - 3.1.1: REQT-bw40aj3me7: **COMPLETED**/draft: **Queue Pending Add** - mkTxnQueuingDelegateChange with action 'Add' MUST mint a UUT for the new delegate, create a temporary delegate link, and update CharterData with a PendingCharterChange containing the Add action, delegate role, and link. MUST throw AlreadyPendingError if a pending change for the same role already exists.
 - 3.1.2: REQT-b611dmqyjx: **COMPLETED**/draft: **Queue Pending Replace** - mkTxnQueuingDelegateChange with action 'Replace' MUST verify that the delegate script has changed (via previousCompiledScript comparison), mint a new UUT, and update CharterData with a PendingCharterChange containing the Replace action and reference to the token being replaced. MUST throw TxNotNeededError if the policy script hash has not changed.
 - 3.1.3: REQT-gcjdqbvcpx: **COMPLETED**/draft: **Companion Ref Script Transaction** - mkTxnQueuingDelegateChange MUST include a companion addlTxn via txnMkAddlRefScriptTxn that stores the new delegate's compiled script at the Capo address. This ref script transaction is part of the same chain as the queue transaction.

### **REQT-3.2.0/835xxfe4s6**: **COMPLETED**/draft: **Commit Pending Changes**
#### Purpose: Governs activating queued pending changes in the manifest. Applied when reviewing the commit flow, manifest mutation, or the final step of the install/upgrade chain.

 - 3.2.1: REQT-3vaf602xqr: **COMPLETED**/draft: **Conditional Commit** - commitPendingChangesIfNeeded() MUST re-read CharterData at execution time (inside the deferred mkTcx) and commit pending changes only if pendingChanges.length > 0. If no pending changes exist, MUST throw TxNotNeededError for clean skip.
 - 3.2.2: REQT-7x24wyv0ny: **COMPLETED**/draft: **AlreadyPendingError Hierarchy** - AlreadyPendingError MUST extend TxNotNeededError so that duplicate pending changes are treated as clean skips by the addlTxn resolution pipeline, not as fatal errors.

## Area 4: Auto-Setup & Upgrade Orchestration

### **REQT-4.1.0/4pmxqnt6yc**: **COMPLETED**/draft: **Auto-Setup Delegate Loop**
#### Purpose: Governs the mkTxnUpgradeIfNeeded() orchestration that iterates delegate roles and generates installation/upgrade transactions. Applied when reviewing startup behavior, delegate registration, or the auto-setup flow.

 - 4.1.1: REQT-z1h6ptsaqw: **COMPLETED**/draft: **Delegate Role Iteration** - mkTxnUpgradeIfNeeded() MUST iterate all entries in delegateRoles. For each entry whose delegateClass has isDgDataPolicy set, it MUST instantiate the controller and call setupCapoPolicy() to register the delegate's installation/upgrade addlTxn.
 - 4.1.2: REQT-g9qgfrpz5z: **COMPLETED**/draft: **Non-DgDataPolicy Skip** - Delegate roles whose delegateClass does not have isDgDataPolicy MUST be skipped with a warning. Only data-policy delegates participate in the auto-setup loop.
 - 4.1.3: REQT-et6q2edgvw: **COMPLETED**/draft: **Record Type Name Validation** - The auto-setup loop MUST verify that each delegate's recordTypeName matches the key used in delegateRoles. A mismatch MUST throw an error with guidance to use the recordTypeName in the delegateRoles map.
 - 4.1.4: REQT-e4nyva4xpa: **COMPLETED**/draft: **Post-Loop Commit** - After the auto-setup delegate loop completes, mkTxnUpgradeIfNeeded() MUST call commitPendingChangesIfNeeded() to commit any pending changes queued during the current run.
 - 4.1.5: REQT-kzvqhka099: **COMPLETED**/draft: **Settings Bootstrap Integration** - mkTxnUpgradeIfNeeded() MUST call addTxnBootstrappingSettings() before the auto-setup loop to ensure the settings delegate and initial settings record are created if missing.

### **REQT-4.2.0/nw1q658egr**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Pre-Loop Orphaned Commit Recovery**
#### Purpose: Governs recovery from orphaned pending manifest changes before the auto-setup loop runs. Applied when reviewing the startup resilience path, or when debugging delegates that fail to install because a prior pending change blocks them.

 - 4.2.1: REQT-2zg7em3xd1: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Pre-Loop Commit Call** - mkTxnUpgradeIfNeeded() MUST call commitPendingChangesIfNeeded() (or equivalent) BEFORE entering the auto-setup delegate loop. This clears any orphaned pending changes from a previous failed run before new delegate setup begins.
 - 4.2.2: REQT-5z56hybrdw: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Clean Skip** - When no orphaned pending changes exist, the pre-loop commit MUST produce a TxNotNeededError and be cleanly skipped by the addlTxn resolution pipeline.
 - 4.2.3: REQT-0crhes9x8a: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Distinct AddlTxn Name** - The pre-loop commit MUST use a different addlTxn name than the post-loop commitPendingChangesIfNeeded() call (which uses 'commit pending charter changes'). This satisfies includeAddlTxn()'s name uniqueness constraint and allows both commits to coexist in the same transaction context.

## Area 5: Ref Script Management

### **REQT-5.1.0/kwnvj3y8r4**: **COMPLETED**/draft: **Ref Script Storage**
#### Purpose: Governs creating and storing reference scripts on-chain at the Capo address. Applied when reviewing ref script creation during charter bootstrap or delegate installation, or when debugging missing ref scripts.

 - 5.1.1: REQT-37nkngfr0g: **COMPLETED**/draft: **Ref Script Creation** - mkRefScriptTxn() MUST create a TxOutput at the Capo address containing the compiled script as a reference script, with a ScriptReference datum, and correct lovelace for the output size. MUST find wallet funds to cover the deposit.

### **REQT-5.2.0/x4as7anba1**: **COMPLETED**/draft: **Ref Script Lookup & Attachment**
#### Purpose: Governs finding ref scripts on-chain and attaching them (or falling back to direct script inclusion) in transactions. Applied when reviewing transaction building for any operation that uses a delegate's script.

 - 5.2.1: REQT-w2ddzx2bx0: **COMPLETED**/draft: **Ref Script Fallback** - txnAttachScriptOrRefScript() MUST look up the script by validator hash in the Capo's UTxOs. If found, MUST add the UTxO as a reference input. If not found, MUST log a warning and add the script bytes directly to the transaction.

## Area 6: Governance & Authority

### **REQT-6.1.0/3szd05dwyt**: **COMPLETED**/draft: **Governance Authority**
#### Purpose: Governs how governance authority tokens are resolved and added to transactions. Applied when reviewing any lifecycle operation that requires admin privileges, or debugging authorization failures.

 - 6.1.1: REQT-nrq90xkghg: **COMPLETED**/draft: **Gov Authority Token Ref** - txnAddGovAuthority() MUST resolve the governance delegate, find the authority token, and add it as a reference input to the transaction. MUST support both charterRef-based and seed-based authority flows.

## Area 7: Delegated Data Access

### **REQT-7.1.0/6ndqdmw077**: **COMPLETED**/draft: **Delegated Data Query**
#### Purpose: Governs finding and parsing delegated data UTxOs across record types. Applied when reviewing data access patterns, record lookup, or debugging data visibility issues.

 - 7.1.1: REQT-ksbgv2fn4y: **COMPLETED**/draft: **Find Delegated Data UTxOs** - findDelegatedDataUtxos() MUST locate UTxOs at the Capo address matching the specified record type, parse their inline datums via the appropriate data controller, and return FoundDatumUtxo results with typed data.

## Area 8: UUT & Token Operations

### **REQT-8.1.0/hw5nzjhs82**: **COMPLETED**/draft: **UUT Minting**
#### Purpose: Governs the minting of Unique Utility Tokens via the seed UTxO pattern. Applied when reviewing token creation, delegate installation, or record creation flows.

 - 8.1.1: REQT-28avqbv3ga: **COMPLETED**/draft: **Seed UTxO Pattern** - txnMintingUuts() MUST use a seed UTxO to derive deterministic UUT names. The seed UTxO MUST be consumed in the minting transaction. Multiple UUTs with different purposes MAY be minted from the same seed.

## Area 9: Settings Bootstrap

### **REQT-9.1.0/zcr2nkvfay**: **COMPLETED**/draft: **Settings Bootstrap**
#### Purpose: Governs the automatic creation of the settings delegate, initial settings record, and manifest registration. Applied when reviewing the bootstrap flow or debugging settings-related startup failures.

 - 9.1.1: REQT-9gb4w6tcx1: **COMPLETED**/draft: **Settings Delegate Creation** - addTxnBootstrappingSettings() MUST check if the settings delegate exists in the manifest. If missing, MUST queue an addlTxn to install it via mkTxnInstallPolicyDelegate, followed by commitPendingChangesIfNeeded.
 - 9.1.2: REQT-nj2vnwmh5c: **COMPLETED**/draft: **Initial Settings Record** - If no currentSettings manifest entry exists, addTxnBootstrappingSettings() MUST queue addlTxns to create the initial settings record (via the settings controller's mkTxnCreateRecord) and register it in the manifest via mkTxnAddManifestEntry.


# Files

- `./Capo.ts` - Main Capo class — charter lifecycle, delegate resolution, auto-setup orchestration, ref script management, governance, delegated data access, UUT minting.
- `./utils.ts` - TxNotNeededError, AlreadyPendingError class definitions.

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.

### Version 1.0

 - **added**: Initial requirements document covering 9 functional areas and 30 requirements. Focused on the auto-setup and delegate lifecycle surface, with coverage of charter management, delegate resolution, delegate lifecycle, auto-setup orchestration, ref script management, governance, delegated data access, UUT operations, and settings bootstrap. Origin: work unit 20260301.delegate-setup-backfill.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
