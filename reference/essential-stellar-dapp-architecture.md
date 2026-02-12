# Stellar dApp architecture essentials

## MUST READ: Context and Dependencies

The Stellar Contracts library provides application developers with a multi-tier architecture for building applications that leverage Cardano's decentralized blockchain.  

Application developers can package and deploy a static dApp that executes on-chain transactions with their own business logic and no centralized servers.

Stellar Contracts enables on-chain smart contracts to be upgraded in place, subject to governance approval.  It supports forward- and backward-compatibility for on-chain data.

It supports applications that manage many different kinds of data, and can run on Cardano mainnet or private side-chains.

All activities and datums are defined in Helios code, either in a library file or in an application-specific file. See essential-stellar-onchain.md for more details.  The rollup build process syncs typescript types and generated bridging code to match with the onchain types.

You'll need to be familiar with `reference/essential-cardano.md` and `reference/essential-helios.md`.

## Design Goals
- Modularity/upgradability: delegates (mint/spend/data) are swappable with queued/committed changes.
- Data extensibility: delegated-data layer accepts new types via manifest-linked policies.
- Developer experience: developer-friendly interfaces closely fit to application use-cases.
- Maintainability: easy to understand, maintain, and extend.
- Scalability: able to handle large numbers of records and transactions.
- Easy type-safety: on-chain data definitions are well structured and are sync'd by the Stellar Contracts rollup build process to create off-chain types and data-bridging code.  As a result, data created or fetched by the application is naturally matched with the on-chain definitions, supporting type-safety, autocomplete and "code lens" visibility of the on-chain data types in the editor.
- Observability: The Stellar Contracts library provides diagnostic logging and error reporting support for on-chain and off-chain operations, allowing dApps to debug and monitor their operations.  Even optimized on-chain contracts can be executed with full diagnostics, requirements-tracing and error reporting in the dApp and the browser console, enhancing the developer experience and end-user transparency.
- UI support: The Stellar Contracts library provides UI components supporting app developers in finding, displaying and editing on-chain data, and for connecting users with on-chain transactions.
- End to End Application development support: By working in these layers, UI developers can use the Typescript dAPI to make application behavior work, without being expert at on-chain transaction building or on-chain policy enforcement.  Other contributors can implement details in those other layers.
- lazy/incremental code loading: The Stellar Contracts 's rollup plugin bundles on-chain code, off-chain types and data-bridging code separately, allowing dApps to load less code initially, and to incrementally and transparently have other parts of the code loaded when needed.  UI developers don't need to manage these details - they just use the dAPI's async methods and await their results.
 - application-specific data indexing: dApps can use basic blockchain indexers like Blockfrost to load their essential data, but they can also define more advance indexing strategies to support application-specific data queries and reporting.  Self-sovereign indexing and decentralized data-indexing services are being built to support many different application use-cases of this kind.

## Components (sources)
These are described here from an architectural perspective. For off-chain Typescript APIs, see `reference/essential-stellar-offchain.md` § "Core classes". For on-chain enforcement details, see `reference/essential-stellar-onchain.md`.

- Capo contract: `src/Capo.ts` (treasury/data hub, charter token, manifest).  The typescript class contains methods for creating and evolving the on-chain contracts, finding on-chain utxos, and managing the charter utxo.  Along with the on-chain Capo script enforcing those same safety-critical operations, it is the central point of control for dApp's on-chain operations.  
- CapoMinter: `src/minting/CapoMinter.ts` (fixed policy, defers to mint delegate).  The off-chain class has just a few key methods supporting the Capo lifecycle.  It and the Capo policy defer to the mint/spend delegates for all day-to-day transaction policy enforcement.
- Delegates:
  - Gov authority policy (token-gated admin).  The Capo lifecycle methods are gated on this governance policy token.  Its on-chain logic is upgradable, and can be used to perform any admin/super-user activities.
  - Mint delegate (`ContractBasedDelegate` subclasses) validates minting and data-creation creation use-cases.  Re-delegates to data policies for different types of onchain data when they are created.  Typically provided by the same policy script as the spend delegate.
  - Spend delegate (delegated-data enforcement) validates spending of Capo UTxOs, and is upgradable.  Usually delegates its enforcement to data policies.
  - Data-policy delegates (`DelegatedDataContract` subclasses) per record type.  These are the most common software objects that dApps can interact with.  Offchain, they make transactions for creating and updating on-chain records.  Onchain, they enforce "business logic", access control policies and validation rules for the records.  They may also manage funds, using their on-chain data details to express policies and workflow for funds and data-management.  
    - Each policy implements `DelegateActivity::additionalDelegateValidation(self, priorIsDelegationDatum, capoCtx)`, called once per activity (and once per nested item in `MultipleDelegateActivities`). Use it to handle your policy’s Spending/Minting/Burning/Other variants; DelegateLifecycle and CapoLifecycle can usually return `true` unless you need extra constraints.
        - Not invoked for `CreatingDelegatedData` / `UpdatingDelegatedData` / `DeletingDelegatedData`; those are validated by mint/spend delegates when delegating to data policies.  `MultipleDelegateActivities` also aren't invoked here (only its nested items).
        - Safe default: switch on variants, return `true` for those you don’t need, and enforce only the ones your policy defines.
    - use `capoCtx` helpers (`creatingDgData`, `updatingDgData`, `referencingDgDatum`, etc.) to read data payloads and token/value, and enforce before/after / sub-activity rules.  See `essential-stellar-onchain.md` for more details.

## Data Storage and Data Flow
The CharterData is the root datum at the Capo address, holding delegate links + manifest.
The minter allows creation of UUTs as approved by Capo, the mint delegate, or the data-policy delegates. These tokens provide conclusive evidence of contract-approved UTxO's (this prevents bogus UTxOs from being accepted as contract-owned).
Almost all data in a Stellar Contract is also stored in UTxOs at the Capo address.  The only other addresses used are those addresses owned by on-chain policy delegates, where the policy-specific UUT is used for triggering policy-enforcement activities.
Because most UTxOs are stored in the Capo, data-policies can be trivially upgraded without affecting any of thousands of its records.  This is a key advantage of the Stellar Contracts architecture.

### Charter Data

- Manifest: map of token references → roles/data policies/settings pointers (`src/CapoHelpers.hl`).  This is the root of the data-flow for the dApp.  It is used to locate the UTxOs for the data-policy delegates, and to locate the settings record.  It is also used to locate the mint/spend delegates, and the gov authority policy.  The Manifest also can point to semantically namedUtxos, such as `currentSettings`. 

- Off-chain SDK: Capo + delegates + txn context for assembly.

## Data/UTxO model
For the actual Helios type definitions (CapoDatum variants, CIP-68 structure, datum alignment), see `reference/essential-stellar-onchain.md` § "Core on-chain types".

- Capo address holds: charter UTxO (inline `CharterData`), delegated-data UTxOs, ref-script UTxOs, settings UTxO, manifest-driven UTxOs.
- Authority tokens (UUTs) prove delegate control of policy to the on-chain Capo script; manifest entries map data-type/role to tokenName (and optional mph). These tokens are held at the delegate's own script address with the DelegateDatum::IsDelegation datum variant (from CapoDelegateHelpers). This IsDelegation datum is the standard delegation datum used for all delegate authority tokens (mint/spend/data-policy/named), and it’s what binds the UUT to the policy script.
     - its IsDelegation details connect that delegate back to the Capo address, its mph, and its token name.  
     - If a policy script is used in multiple dApps, it will have multiple utxo's, with each having a separate UUT (from each dApp) and datum linking back to the Capo address.  
     - See essential-stellar-onchain.md for more details.
- Delegated data: records stored at Capo with per-type controller; IDs derive from idPrefix + UUT naming.
  - AbstractDelegateActivitiesEnum types the delegated-data activities, allowing the mint/spend delegate to generically support any registered data-type, enforcing that right delegate is used but not needing to deal with specifics of their activities.  
    - The generic SpendingActivities, MintingActivities, BurningActivities are defined as abstract Data.
    - The specific SpendingActivities, MintingActivities, BurningActivities must be defined by each specialized delegate, with nested enum variants supporting their own use-cases.
  - The Capo's `DelegatedData` datum variant is the abstract data definition for all delegated-data records, allowing mint/spend delegates to work with arbitrary data so long as it conforms to the essential shape of the `DelegatedData` datum variant.
    - It is aligned to the CIP-68 structure with a 3-field ConstrData (allowing any variant tag), with the first field having an abstract `Map[String]Data` field for the record's data.  This map is EXPECTED to contain "@id" and "tpe" entries to byte-array/string values (@id is the record-id/uut-name; tpe is the record-type matching the data-policy's manifest entry).  Other fields are allowed and expected to be interpreted by the delegate.
    - Every delegated-data record is stored in the Capo, and the mint/spend delegate is responsible for validating the activities and policies of the records.
    - Every specific Datum structure definition for delegated-data policies must conform to the abstract structure, with its own Map entries appropriate for its needs.
  - Data-policy delegates enforce transitions by reading the CIP-68 payload: on updates they read both input and output datums; on mints they inspect the newly created datum. Low-level accessors (`DgDataDetails`) are documented in `essential-stellar-onchain.md` and the internals guide.

## Software Development Lifecycle / On-Chain Policy evolution
- Bootstrap: choose seed UTxO → minter mints charter + delegate UUTs → writes CharterData → stores ref scripts.
- Delegate-creation and policy installation: queue DgDataPolicy manifest entry (pending change) → commit → manifest points to new controller token, stored in the policy's on-chain address.  Ref script is created for the new policy.
- Delegate upgrade: mint new UUT, burn/retire old.  queue pending change into Charter structure, to update CharterData links; commit the pending change to activate the new delegate.  Ref script is created for the new policy.  The old ref script can be spent and not recreated, or can be kept for backward-compatibility.
- Settings: delegated-data record referenced via manifest `currentSettings`; settings controller validates updates.  dApps using settings can access the settings record onchain when needed, via the namedUtxo `currentSettings` in the CharterData's manifest.

## Transaction patterns
- Reference vs spend: charter often referenced (and not spent); spent only when mutating CharterData for Capo/policy-lifecycle activities.
- Collaborative Authority: The charter-token/Charter data have links to all the current delegate policies (via policy hash AND uutName).  These delegate policies collaborate to form a positive chain of custody for responsible enforcement of application rules.
- Addl txns: ref-script creation, delegate install, pending-change commit can be separate txns queued in context.

## Flows (high level)
- Mint charter: CapoMinter `mintingCharter` + delegate UUTs; Capo keeps charter, sets links, stores refs.
- Mint/burn tokens: via mint delegate (`mintWithDelegateAuthorizing`); invariants/force paths bypass mint delegate with Capo authority.
- Create delegated record: data controller mint activity; spend delegate allows creation; manifest ties idPrefix/tokenName.
- Update delegated record: spend delegate activity + controller update activity; ensures correct id/token/policies.
- Delete delegated data record: mint delegate + data-policy delegate validate burn/spend of record UTxO/UUT.
- Install/replace data policy: queue pending change (new controller link, idPrefix); commit to manifest; optional burn old token; add ref script for new policy.

### Responsibilities:
Lifecycle responsibilities are divided between mint delegate, spend delegate, and the Capo itself — see `reference/essential-capo-lifecycle.md` for the full breakdown.

## Key Conventions

Delegate uuts (of all kinds) are dgPol-xxxxYYYYzzzz form, all listed in the CharterData.  Data-policy UUTs are ‹idPrefix›-xxxxYYYYzzzz form, with their UTxO having CIP-68 format, with "tpe" and "@id" entries, where tpe matches the data-policy's manifest entry type and the DataController's `get recordTypeName() {...}`.

Application-specific Capo needs to define its `get delegateRoles()`.  It can provide a feature-flags map to enable/disable data-types and other policies.  `defaultFeatureFlags()` can be defined, or runtime feature flags can be provided to the Capo constructor, typically via the the CpaoDappProvider's normal setup incantation.

Offchain data controller classes must define a little bit of basic boilerplate, including `get recordTypeName()`,  `get idPrefix()`, `get delegateName()`, `async scriptBundleClass()`, `exampleData()`.  `scriptBundleClass()` is used by the dAppProvider to load the off-chain code for the data controller.  `exampleData()` is used by the dAppProvider to display a default data example in the UI and (for now) to provide default data for new records.

dApps define a simple React component extending the CapoDappProvider, rendering that component in their app layout.  

Application-specific Capo can import/reuse data-policies from other packages.  Doesn't normally need to customize the mint/spend delegates.  Can include/enable reused delegated-data policies, and define their own; enable them with feature flags, and use them in the application.  Developers use the CharterStatus page to deploy new or updated data-policies.

## Cross-links
- On-chain details: `reference/essential-stellar-onchain.md`
- Off-chain flows: `reference/essential-stellar-offchain.md`
- Helios off-chain SDK: `reference/essential-helios-api.md`
- UI support: `reference/essential-stellar-ui.md`
- Bootstrapping & lifecycle: `reference/essential-offchain-bootstrapping.md`
- Kickstart steps: `reference/essential-stellar-dapp-kickstart.md`
