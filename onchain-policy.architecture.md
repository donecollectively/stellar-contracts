# On-chain Policy Layer - Architecture

*Helios smart contracts enforcing validation, authorization, and business logic on the Cardano blockchain. Implements a compositional delegation model where policy enforcement flows through parallel chains of custody.*

## Interview Status

- **Phase**: Initial draft (pre-interview)
- **Checkpoint**: not yet reached

> **Parent architecture**: `stellar-contracts.architecture.md` (ARCH-6zc7jksakn: On-chain Policy Layer)
> This document elaborates the on-chain policy layer subsystem, covering script roles, delegation chains, datum structures, and the upgrade mechanism.

---

## The Tension

**Compositional policy enforcement with independent upgradeability**: Business logic must be modular — different concerns enforced by different scripts — yet all scripts must cooperate to validate a single transaction. The delegation model must allow any piece to be upgraded without migrating data or changing the Capo's permanent address. On-chain script size limits and execution budgets constrain how much logic can live in each script.

**Key sub-tensions**:
- **Parallel delegation chains**: Minting and spending enforce different concerns on different triggers, yet both may need to invoke the same data-policy delegate
- **Abstract dispatch**: The Capo and its core delegates must route enforcement to data-policy delegates without knowing concrete data types
- **Upgrade safety**: Replacing a delegate must not require touching existing data UTxOs
- **Escape hatches**: If a delegate has a bug preventing normal upgrades, governance must be able to force-replace it

---

## Components and Concerns

| ARCH-UUT | Name | Location | Summary |
|----------|------|----------|---------|
| ARCH-7m1m9j2p0c | DefaultCapo Script | on-chain | Main spending validator for Capo address — charter integrity, governance gating, spend delegation |
| ARCH-2vnf6vfntz | CapoMinter Script | on-chain | Minting policy for all tokens — charter bootstrap, day-to-day delegation to mint delegate |
| ARCH-0t3ehdj6n1 | BasicDelegate Script | on-chain | Base delegate implementation — CRUD delegation, lifecycle management, manifest operations |
| ARCH-dgjxk27fvq | CapoDelegateHelpers | on-chain (module) | Delegation infrastructure — IsDelegation datum, RelativeDelegateLink, authority verification |
| ARCH-wa2bpmzpaa | CapoHelpers | on-chain (module) | Capo utilities — CapoDatum, manifest parsing, CapoCtx builder |
| ARCH-pf38c8zja6 | CapoMintHelpers | on-chain (module) | Minting utilities — MinterActivity enum, seed-based UUT minting |
| ARCH-15rq874jae | StellarHeliosHelpers | on-chain (module) | General utilities — logging, REQT assertions, value helpers, redeemer extraction |
| ARCH-rax3q3gj6t | TypeMapMetadata | on-chain (module) | Type system metadata — TypeInfo, TypeMap for schema definitions |
| ARCH-604tjm3amb | UnspecializedDelegate | on-chain (module) | Delegate scaffold — template for application-specific delegates with validation hooks |

### Concerns Summary

| Concern | Type | Owner | Dependents |
|---------|------|-------|------------|
| Charter data integrity | artifact | DefaultCapo Script | all on-chain scripts |
| Token minting policy | artifact | CapoMinter Script | BasicDelegate, data-policy delegates |
| Delegate authority tokens (UUTs) | artifact | CapoDelegateHelpers (definition) / CapoMinter (creation) | all delegates |
| IsDelegation datum | artifact | CapoDelegateHelpers | BasicDelegate, DefaultCapo |
| Manifest dispatch table | artifact | CapoHelpers (definition) / DefaultCapo (storage) | BasicDelegate, CapoMinter |
| On-chain logging/diagnostics | resource | StellarHeliosHelpers | all on-chain scripts (debug UPLC only) |

---

### Components

#### ARCH-7m1m9j2p0c: DefaultCapo Script

**Location**: on-chain
**Source**: `src/DefaultCapo.hl`
**Script purpose**: `spending Capo`

**Activities** (from `CapoActivity` enum):
- `spendingDelegatedDatum` — Validates spending of any DelegatedData record at the Capo address; requires spend delegate input, extracts spend delegate's redeemer, validates it matches an `UpdatingDelegatedData` activity for the correct record ID
- `capoLifecycleActivity` — Modern lifecycle operations:
  - `forcingNewMintDelegate` — Escape-hatch mint delegate replacement (govAuthority required)
  - `forcingNewSpendDelegate` — Escape-hatch spend delegate replacement (govAuthority required)
  - Other lifecycle activities delegated to mint/spend delegates
- `retiringRefScript` — Removing reference scripts stored at Capo address
- `usingAuthority` — Generic authorization check via govAuthority
- `updatingCharter` — Charter upgrades (deprecated, being replaced by `capoLifecycleActivity`)

**Delegation pattern**: When a DelegatedData UTxO at the Capo address is spent, DefaultCapo:
1. Requires the spend delegate's UUT as a transaction input (`requiresSpendDelegateInput()`)
2. Extracts the spend delegate's redeemer
3. Validates the redeemer is an `UpdatingDelegatedData` (or `DeletingDelegatedData`) activity matching the record's ID
4. Ensures the spend delegate token is returned to its home address
5. The spend delegate's own validation logic fires independently (it's a separate script being spent)

**Charter validation**: `preventCharterChange()` ensures the charter datum is unchanged when an activity doesn't modify it. `requiresAuthorization()` checks that govAuthority has a valid output.

**Concerns**:
- Owns **charter data integrity** — validates charter datum modifications
- Depends on **spend delegate authority** — requires spend delegate input for data operations
- Depends on **govAuthority** — for lifecycle and escape-hatch operations

---

#### ARCH-2vnf6vfntz: CapoMinter Script

**Location**: on-chain
**Source**: `src/minting/CapoMinter.hl`
**Script purpose**: `minting CapoMinter`

**Activities** (from `MinterActivity` enum):
- `mintingCharter` — One-time bootstrap: mints charter token + initial delegate UUTs (capoGov, mintDgt, spendDgt) using seed UTxO. Validates charter output at Capo address, validates delegate tokens sent to their addresses.
- `mintWithDelegateAuthorizing` — **Day-to-day minting path**: defers entirely to the mint delegate via `requiresMintDelegateApproval(mph)`. This is how data-record UUTs are minted during normal operations.
- `forcingNewMintDelegate` — Escape-hatch: mints new delegate UUT without requiring current mint delegate approval. Only usable by govAuthority. Validates seed matches Capo's activity.
- `CreatingNewSpendDelegate` — Spend delegate creation: supports both fresh creation and replacement. Validates charter approval for new delegate.

**Charter vs day-to-day minting**: Charter minting is a one-time event using the seed UTxO to create the foundational token set. After bootstrap, all minting goes through `mintWithDelegateAuthorizing`, which hands off to the mint delegate — the minter itself does no policy enforcement beyond confirming the delegate is involved.

**Concerns**:
- Owns **token minting policy** — sole authority for creating/burning tokens under this MPH
- Depends on **mint delegate authority** — defers day-to-day decisions
- Depends on **charter data** — reads manifest for delegate verification during bootstrap

---

#### ARCH-0t3ehdj6n1: BasicDelegate Script

**Location**: on-chain
**Source**: `src/delegation/BasicDelegate.hl`
**Script purpose**: `spending BasicDelegate`

**Configuration constants**: `isMintDelegate`, `isSpendDelegate`, `isDgDataPolicy`, `delegateName`, `instance`, `requiresGovAuthority` — set at compile time to specialize the script for its role.

**Activities** (from `DelegateActivity` enum):

**Data operations** (the core CRUD delegation):
- `CreatingDelegatedData` — Creating a new data record: mints UUT using seed, requires data-policy delegate input, validates data output at Capo address, ensures data-policy has a minting activity for the record
- `UpdatingDelegatedData` — Updating an existing record: requires data-policy delegate with spending activity, validates record ID matches
- `DeletingDelegatedData` — Deleting a record: requires both spend (to consume) and mint (to burn) validation, delegates to data-policy

**Capo lifecycle operations** (`CapoLifecycleActivities`):
- `CreatingDelegate` — Create new delegate for application purposes
- `queuePendingChange` — Queue delegate/policy changes in charter's `pendingChanges`
- `commitPendingChanges` — Install queued changes, update manifest
- `updatingManifest` — Update manifest entries

**Delegate lifecycle** (`DelegateLifecycleActivities`):
- `ReplacingMe` — Replace this delegate with a new one
- `Retiring` — Burn delegate token, end lifecycle
- `ValidatingSettings` — Validate settings updates

**Batch operations** (`MultipleDelegateActivities`):
- When acting as **MintDgt**: validates batches of `CreatingDelegatedData`, `DeletingDelegatedData`
- When acting as **SpendDgt**: validates batches of `UpdatingDelegatedData`, `DeletingDelegatedData`
- When acting as **DgDataPolicy**: validates batches of `MintingActivities`, `SpendingActivities`, `BurningActivities`

**Re-delegation to data-policy delegates**: When BasicDelegate handles a CRUD operation, it:
1. Extracts the data type from the activity (e.g., `CreatingDelegatedData{seed, "MyDataType"}`)
2. Looks up the data-policy delegate link in the charter manifest for that type
3. Calls `requiresDgDataPolicyInput(dataType)` — ensures the policy delegate's UUT is spent as a transaction input
4. Validates that the data-policy delegate's redeemer contains a corresponding activity (Minting/Spending/Burning)
5. The data-policy delegate's own script validation fires independently, enforcing type-specific business rules

**Concerns**:
- Owns **CRUD enforcement** (at mint/spend delegate level) — orchestrates data operations
- Owns **lifecycle management** — delegate creation, replacement, retirement
- Depends on **data-policy delegate authority** — re-delegates to type-specific policies
- Depends on **charter manifest** — resolves data type → policy mapping

---

#### ARCH-dgjxk27fvq: CapoDelegateHelpers

**Location**: on-chain (module, imported by all delegate scripts)
**Source**: `src/delegation/CapoDelegateHelpers.hl`

**Key types**:

**`RelativeDelegateLink`** struct — Stored in CharterData to reference delegates:
- `uutName` — Unique token name identifying delegate
- `delegateValidatorHash` — Optional (`None` = arms-length/wallet delegate)
- `config` — Arbitrary configuration data
- Key methods: `hasDelegateInput()` (find delegate's UTxO in inputs), `hasValidOutput()` (verify token returned/created), `getRedeemer()` (extract delegate's activity)

**`DelegationDetail`** struct — Links delegate back to Capo:
- `capoAddr`, `mph` (minting policy hash), `tn` (token name)
- Methods: `acAuthorityToken()`, `tvAuthorityToken()`

**`IsDelegation` datum variant** — Stored at delegate's script address with the delegate's UUT:
- Contains `DelegationDetail` linking back to Capo
- Proves this UTxO is the delegate's authority token
- Spending this UTxO triggers the delegate script's validation

**Delegate authority verification protocol**:
1. Find input with delegate's validator hash + matching UUT (`hasDelegateInput()`)
2. Extract redeemer from that input (`getRedeemer()`)
3. Validate redeemer matches expected activity
4. Ensure delegate token returned to same address (`hasValidOutput()`)

**Activity enums**:
- `AbstractDelegateActivitiesEnum` — Generic activity wrapper used by `MultipleDelegateActivities`
- `CapoLifecycleActivity` — Capo-level lifecycle operations
- `DelegateLifecycleActivity` — Delegate self-management
- `DelegateRole` — MintDgt, SpendDgt, DgDataPolicy, etc.

---

#### ARCH-wa2bpmzpaa: CapoHelpers

**Location**: on-chain (module, imported by DefaultCapo and delegates)
**Source**: `src/CapoHelpers.hl`

**Key types**:

**`CapoDatum`** enum — The datum stored at the Capo address:
- `CharterData` — Main charter configuration containing:
  - `spendDelegateLink`, `mintDelegateLink` — Core delegate references
  - `otherNamedDelegates` — Application-specific named delegates
  - `spendInvariants`, `mintInvariants` — Policy constraints
  - `govAuthorityLink` — Governance authority reference
  - `manifest` — `Map[String]CapoManifestEntry` mapping data types to policies
  - `pendingChanges` — Queued upgrades awaiting commitment
- `DelegatedData` — Application data records (abstract envelope — see below)
- `ScriptReference` — Reference scripts for on-chain optimization

**`CapoManifestEntry`** struct — Maps data type names to their policy delegates:
- Contains `DgDataPolicy{delegateLink, idPrefix, refCount}`
- Used for resolving which delegate controls which data type

**`CapoCtx`** — Fluent context builder for policy checks:
- Methods: `withCharterRef()`, `requiresMintDelegateInput()`, `requiresGovAuthority()`
- Provides structured context about what's available in the transaction

**`DelegatedData` (abstract)**: The abstract `capoStoredData` envelope. Contains a `type` field that Capo/delegates probe to look up the correct data-policy delegate in the manifest. The inner data is opaque at this level — only the data-policy delegate deserializes it concretely.

---

#### ARCH-pf38c8zja6: CapoMintHelpers

**Location**: on-chain (module)
**Source**: `src/minting/CapoMintHelpers.hl`

**Key types**:
- `MinterActivity` enum — All minting activities (`mintingCharter`, `mintWithDelegateAuthorizing`, etc.)
- Seed-based UUT generation utilities

---

#### ARCH-15rq874jae: StellarHeliosHelpers

**Location**: on-chain (module)
**Source**: `src/StellarHeliosHelpers.hl`

**Utilities**:
- **Logging**: `logGroupStart()`, `logGroupEnd()`, `logGroup()`, `logGroupUnit()` — Nested log groups with emoji markers. Present in debug UPLC, stripped in optimized UPLC.
- **Requirements tracing**: `REQT()`, `bREQT()` — Self-documenting assertions with requirement IDs. `REQTgroup()` for scoped groups. `TODO()` for marking unfinished work.
- **Value helpers**: `mkTv()` (create Value from MPH + token name), `tvCharter()` (charter token value), `returnsValueToScript()` (check token returned)
- **Redeemer extraction**: `mustFindInputRedeemer()` — Get redeemer for specific input
- **Data wrappers**: `AnyData` struct (generic with id + type), `fromCip68Wrapper()` (CIP-68 extraction)

---

#### ARCH-rax3q3gj6t: TypeMapMetadata

**Location**: on-chain (module)
**Source**: `src/TypeMapMetadata.hl`

**Types**: `TypeInfo` (schema variety + content), `TypeMapRef` (external type reference), `TypeMap` (collection of local types + inherited refs)

**Role**: Allows data-policy delegates to specify their data schemas. Currently a placeholder for future enhancement enabling off-chain validation and UI generation from on-chain schema definitions.

---

#### ARCH-604tjm3amb: UnspecializedDelegate

**Location**: on-chain (module)
**Source**: `src/delegation/UnspecializedDelegate.hl`

**Purpose**: Template/scaffold for application-specific delegates.

**Activity enums** (placeholders):
- `MintingActivity` — Placeholder for app-specific mint validation
- `SpendingActivity` — Placeholder for app-specific spend validation
- `BurningActivity` — Placeholder for app-specific burn validation
- `DelegateActivity` — Full activity enum matching BasicDelegate structure

**Validation hooks**:
- `additionalDelegateValidation()` — Called by BasicDelegate for app-specific validation logic. Default: accepts all generic activities, rejects custom ones.
- `otherDatumValidation()` — For non-IsDelegation datums (rarely used)

**Usage**: Applications copy this module to create specialized delegates. Replace placeholder activity enums with real ones, implement validation in the hooks. BasicDelegate handles all boilerplate (lifecycle, CRUD orchestration, manifest operations).

---

## Interfaces (On-chain Delegation)

| ARCH-UUT | Interface | Mechanism | Direction | Trigger |
|----------|-----------|-----------|-----------|---------|
| ARCH-d4vrgvmrjy | Minting Chain | on-chain script invocation | CapoMinter → Mint Delegate → Data-Policy | Token mint/burn in transaction |
| ARCH-69gf8315vk | Spending Chain | on-chain script invocation | DefaultCapo → Spend Delegate → Data-Policy | UTxO spend at Capo address |
| ARCH-tsy2zp9451 | Data-Policy Re-delegation | on-chain script invocation | Mint/Spend Delegate → Data-Policy Delegate | CRUD operation on typed record |

### ARCH-d4vrgvmrjy: Minting Chain

**Mechanism**: On-chain script invocation via redeemers. Each link in the chain is a separate script triggered by spending/minting within the same transaction.
**Direction**: CapoMinter → Mint Delegate → Data-Policy Delegate
**Trigger**: Any token mint or burn under the Capo's MPH

**Flow**:
1. **CapoMinter** receives `mintWithDelegateAuthorizing` activity
2. CapoMinter calls `requiresMintDelegateApproval(mph)` — verifies mint delegate's UUT is spent as input
3. **Mint Delegate** (BasicDelegate with `isMintDelegate: true`) fires independently
4. Mint delegate receives `CreatingDelegatedData` or `DeletingDelegatedData` activity
5. Mint delegate calls `requiresDgDataPolicyInput(dataType)` — verifies data-policy's UUT is spent
6. **Data-Policy Delegate** fires independently, validates business rules via `MintingActivity` or `BurningActivity`

```
[CapoMinter]                    [Mint Delegate]              [Data-Policy Delegate]
   mintWithDelegateAuthorizing → CreatingDelegatedData{seed} → MintingActivity{...}
   ↓ verifies delegate input     ↓ verifies policy input       ↓ validates business rules
   ↓ (hands-off)                 ↓ (hands-off)                 ↓ (independent validation)
```

**Key**: Each script validates independently. "Delegation" means requiring the next script's UUT as an input (which triggers its validation), not calling it directly.

### ARCH-69gf8315vk: Spending Chain

**Mechanism**: On-chain script invocation via redeemers
**Direction**: DefaultCapo → Spend Delegate → Data-Policy Delegate
**Trigger**: Spending a DelegatedData UTxO at the Capo address

**Flow**:
1. **DefaultCapo** receives `spendingDelegatedDatum` activity
2. DefaultCapo calls `requiresSpendDelegateInput()` — verifies spend delegate's UUT is spent
3. DefaultCapo extracts spend delegate's redeemer, validates it's `UpdatingDelegatedData` matching the record ID
4. **Spend Delegate** (BasicDelegate with `isSpendDelegate: true`) fires independently
5. Spend delegate calls `requiresDgDataPolicyInput(dataType)` — verifies data-policy's UUT is spent
6. **Data-Policy Delegate** fires independently, validates business rules via `SpendingActivity`

```
[DefaultCapo]                  [Spend Delegate]               [Data-Policy Delegate]
   spendingDelegatedDatum    → UpdatingDelegatedData{id}     → SpendingActivity{...}
   ↓ verifies delegate input   ↓ verifies policy input         ↓ validates business rules
   ↓ validates record ID       ↓ (hands-off)                   ↓ (independent validation)
```

### ARCH-tsy2zp9451: Data-Policy Re-delegation

**Mechanism**: On-chain manifest lookup + UUT spending
**Direction**: Mint or Spend Delegate → Data-Policy Delegate
**Trigger**: CRUD operation specifying a data type name

**Protocol**:
1. Activity specifies data type: e.g., `CreatingDelegatedData{seed, "MyDataType"}`
2. Delegate looks up manifest: `manifest["MyDataType"]` → `DgDataPolicy{delegateLink, idPrefix, refCount}`
3. Delegate requires policy input: `requiresDgDataPolicyInput("MyDataType")` — ensures policy delegate's UUT is spent as transaction input
4. Delegate validates policy activity: ensures data-policy delegate's redeemer contains corresponding activity (Minting/Spending/Burning)
5. **Data-policy delegate's own script validation fires independently**, enforcing type-specific business rules

**Key**: The mint/spend delegate doesn't know the concrete data type — it only knows the type name string and uses the manifest to find the policy. This is what enables upgrading data-policy delegates independently.

---

## Key Patterns

### ARCH-v4k0gynsa4: UUT Authority Pattern

Every delegate has a **Unique Utility Token** proving its authority:
- Token name derived from seed transaction + purpose string (e.g., `dgPol-a1b2c3d4e5f6`)
- Token stored at delegate's script address with `IsDelegation` datum
- **Spending** the delegate's UTxO (not merely holding the token) triggers the delegate script's validation
- The transaction must return the UUT to the delegate's home address after spending

This pattern means that including a delegate in a transaction is an **opt-in enforcement trigger**: by spending its UUT, you invoke its validation logic. The delegate enforces its rules because the script at its address must approve the spend.

### ARCH-wa54kznfgx: Manifest-Based Dispatch

The charter's `manifest: Map[String]CapoManifestEntry` enables dynamic routing:
- Maps data type name → `DgDataPolicy{delegateLink, idPrefix, refCount}`
- Delegates look up the manifest at validation time to find the correct data-policy
- **Upgradeable**: changing a delegate link in the manifest routes future operations to the new policy without changing any other scripts or migrating data

### ARCH-zsz07w46ac: Abstract capoStoredData Envelope

Two levels of the same datum structure enable abstract dispatch:
- **Abstract** (`CapoDatum::DelegatedData` in CapoHelpers): Capo and core delegates read the `type` field without deserializing the inner data. Used for manifest lookup → data-policy routing.
- **Concrete** (specialized in each `DelegatedDataContract`): The data-policy delegate knows the specific inner type and deserializes it for enforcement.

This is the on-chain mechanism that makes delegation dispatch work for data records — the abstract envelope carries enough information for routing without requiring the router to know concrete types.

### ARCH-jqthewwdcj: Escape Hatch Mechanism

If a delegate has a bug that prevents normal upgrades (e.g., the mint delegate rejects all `commitPendingChanges` activities), governance can bypass it:
- `forcingNewMintDelegate` (CapoMinter + DefaultCapo) — Mints new delegate UUT without current mint delegate's approval
- `forcingNewSpendDelegate` (CapoMinter + DefaultCapo) — Same for spend delegate
- Requires `govAuthority` — only the governance authority can invoke escape hatches
- These activities are handled directly by CapoMinter and DefaultCapo, without involving the (potentially broken) delegate

### Dual UPLC: Optimized vs Debug

Each script is compiled to two UPLC variants:
- **Optimized UPLC** — Logging stripped, used on-chain, determines script addresses and hashes
- **Debug UPLC** — Logging preserved (`logGroup`, `REQT`, etc.), used for off-chain pre-submission validation

The off-chain runtime validates transactions using the debug UPLC before submission, providing granular visibility into exactly what the on-chain validator checks. If validation fails, the debug output shows which requirement assertion failed and where. The optimized version is used for address computation (so addresses are stable regardless of debug instrumentation).

Diagnostics from debug UPLC are bridged to stellog via the UplcStellogAdapter (ARCH-tqb909cyzr in `testLogging.architecture.md`), using dual facilities: `uplc:receipt` (visual summary) + `uplc:detail` (granular trace).

---

## Data Flow

### Workflow: Minting Chain — Creating a Data Record

1. **Off-chain** builds transaction with `CreatingDelegatedData` redeemer for mint delegate
2. Transaction includes: seed UTxO (for UUT name), mint delegate UUT as input, data-policy UUT as input
3. **CapoMinter** validates `mintWithDelegateAuthorizing` → confirms mint delegate UUT is present
4. **Mint Delegate** (BasicDelegate) validates `CreatingDelegatedData`:
   - Mints UUT using seed
   - Requires data-policy delegate input for this data type (manifest lookup)
   - Validates data output at Capo address
5. **Data-Policy Delegate** validates `MintingActivity` → enforces type-specific business rules
6. All three scripts approve → transaction valid

### Workflow: Spending Chain — Updating a Data Record

1. **Off-chain** builds transaction with `UpdatingDelegatedData` redeemer for spend delegate
2. Transaction includes: existing data UTxO from Capo address, spend delegate UUT as input, data-policy UUT as input
3. **DefaultCapo** validates `spendingDelegatedDatum` → confirms spend delegate UUT present, redeemer matches record ID
4. **Spend Delegate** (BasicDelegate) validates `UpdatingDelegatedData`:
   - Requires data-policy delegate input for this data type
   - Validates record ID matches
5. **Data-Policy Delegate** validates `SpendingActivity` → enforces type-specific update rules
6. All three scripts approve → transaction valid

### Workflow: Bootstrap (Charter Minting)

1. **Off-chain** selects seed UTxO (determines permanent Capo identity: MPH, address)
2. **CapoMinter** validates `mintingCharter`:
   - Mints charter token
   - Mints initial UUTs: capoGov, mintDgt, spendDgt (derived from seed)
   - Validates charter output at Capo address with correct `CharterData` datum
   - Validates delegate tokens sent to their script addresses with `IsDelegation` datums
3. No delegation occurs — this is the one-time foundational operation

### Workflow: Delegate Upgrade

1. **Off-chain** queues pending change via `queuePendingChange` activity on current delegate
2. **CapoMinter** mints new delegate UUT
3. **Off-chain** commits changes via `commitPendingChanges` activity:
   - Burns old delegate UUT (via mint delegate)
   - Updates manifest entries (via spend delegate)
   - Activates new delegate link in charter
4. **Existing data UTxOs are untouched** — next operation on them uses the new delegate

---

## Collaboration Summary

**Uses** (external):
- `@helios-lang/compiler` — Helios → UPLC compilation
- `@helios-lang/uplc` — UPLC execution for off-chain validation
- Cardano node — on-chain script execution

**Used by** (within stellar-contracts):
- **Build Tooling** (ARCH-cza3q9qn8z) — compiles `.hl` files, generates bridges and bundles
- **Script Bundle System** (ARCH-b75126b13n) — manages compiled scripts and hash resolution
- **Data Bridge System** (ARCH-0z6spstb0j) — generated from on-chain type definitions
- **StellarContract** (ARCH-wn7spd6z56) — base class provides script access
- **Delegate System** (ARCH-tk43zgem2r) — off-chain counterpart orchestrating delegate operations
- **Testing Infrastructure** (ARCH-kv7d1dp56c) — validates transactions via emulator using debug UPLC

**Helios source files**:

| File | Script/Module | Purpose |
|------|---------------|---------|
| `src/DefaultCapo.hl` | `spending Capo` | Main spending validator |
| `src/minting/CapoMinter.hl` | `minting CapoMinter` | Minting policy |
| `src/minting/CapoMintHelpers.hl` | module | Minting utilities |
| `src/delegation/BasicDelegate.hl` | `spending BasicDelegate` | Delegate base implementation |
| `src/delegation/CapoDelegateHelpers.hl` | module | Delegation infrastructure |
| `src/delegation/UnspecializedDelegate.hl` | module | Delegate template/scaffold |
| `src/CapoHelpers.hl` | module | Capo utilities |
| `src/StellarHeliosHelpers.hl` | module | General utilities |
| `src/TypeMapMetadata.hl` | module | Type metadata |
| `src/PriceValidator.hl` | (validator) | Price validation logic |

---

## Open Questions

- [ ] **Withdraw-zero delegation mechanism** (backlog): Shift from spending delegate UUT to staking validator pattern. Requires multi-purpose script declarations (`spending` + `staking`) and main-function dispatch. Enables policy enforcement without spending the delegate token. See `reference/essential-stellar-onchain.md`.
- [ ] **MultipleDelegateActivities batching**: How does the batching mechanism interact with the per-record validation when multiple records of different types are created/updated in a single transaction?
- [ ] **PriceValidator.hl**: Is this a framework component or an application-specific extension?
- [ ] Should the two parallel delegation chains be formalized with their own deep-interview treatment?
- [ ] How does the `pendingChanges` queue in CharterData interact with the commit mechanism — what prevents partial commits?

---

## Discovery Notes

### Initial Draft Findings (pre-interview)

**Script interaction model**: On-chain "delegation" is not direct function calls — it's the pattern of requiring another script's UUT as a transaction input, which triggers that script's independent validation. Each script in the chain validates its own concerns. The "chain" is a coincidence of multiple scripts all validating the same transaction, each ensuring its invariants hold.

**Mint delegate and spend delegate are often the same script** but compiled with different configuration constants (`isMintDelegate: true` vs `isSpendDelegate: true`). They are triggered in different contexts: the mint delegate by token mint/burn events, the spend delegate by UTxO spending at the Capo address. They are parallel chains, never sequential between each other.

**Application-specific delegates** are created by copying `UnspecializedDelegate.hl` and implementing the validation hooks. BasicDelegate handles all boilerplate; the specialized module only needs to define its activity enums and validation logic. This is the extension point for downstream dApps.

**Deployment-specific compilation**: Capo and minter scripts are parameterized by deployment config (MPH, seed UTxO). Data-policy and mint/spend delegate scripts are deployment-agnostic. All scripts produce dual UPLC (optimized for on-chain, debug for off-chain validation).
