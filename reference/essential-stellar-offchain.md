# Stellar off-chain essentials

## Core classes
- `Capo` (extends StellarContract): orchestrates charter mint/update, delegates, manifest, delegated data, ref scripts.
- `CapoMinter`: fixed minting policy script; mints charter token + UUTs; defers policy to mint delegate except forced admin paths.
- `ContractBasedDelegate`: base for script-backed delegates (mint/spend/data/named). Provides bundle wiring, activity/datum accessors, authority token helpers.
- `DelegatedDataContract<T>`: base for data-policy controllers; wraps create/update flows for records stored at Capo; exposes `recordTypeName`, `idPrefix`, `exampleData`, activities for create/update.
- `StellarTxnContext`: tx builder + typed state (seedUtxo, uuts, charterRef, settingsRef, addlTxns). Provides a facade for the underlying Helios TxBuilder, and a typed state container for the transaction context.

## Token + authority model
- Policy: Capo mph (from minter). Charter token (`charter`) proves contract identity; various UUTs prove authority per role (gov/mint/spend/named/data-policy).
- UUT naming: `<purpose>-<seedHash6>` derived from seed UTxO; managed via `txnWillMintUuts`/`txnMintingUuts`.
- Manifest entries (in CharterData) point to delegate/data-policy tokens.  Each delegate class (DelegatedDataContract/ ContractBasedDelegate/StellarDelegate subclass or even AnyAddressAuthorityPolicy) can locate and include these UUTs in its txn as needed via txnGrantAuthority().  
    - Internally, DelegateMustFindAuthorityToken and DelegateAddsAuthorityToken and txnReceiveAuthorityToken handle the UTxO discovery and inclusion,  forming the protocol for authority token handling.
    - The authority token is always returned to the Capo address.

## Key flows
- Charter bootstrap: `mkTxnMintCharterToken` builds seed→charter mint tx + ref scripts (Capo, minter, mint delegate); sets CharterData with delegate links and manifest (one-time setup per Capo deployment).
- Charter update: `txnUpdateCharterUtxo`/`mkTxnUpdateCharter` spend charter with `updatingCharter` activity, keep charter token, update links/manifest/pendingChanges.  Typically used internally by more common use cases such as installing/updating data policies or settings data.
- Delegate install/replace:
  - Mint/spend delegate: `mkTxnUpdatingMintDelegate` / `mkTxnUpdatingSpendDelegate` (normal or forced), burns old UUT unless forced, updates CharterData link.
  - Data policy/named delegate: `mkTxnAddingNamedDelegate`, `mkTxnQueuingDelegateChange` + `mkTxnCommittingPendingChanges` (queue/commit pattern for manifest DgDataPolicy entries).  DEPRECATED; use DelegatedDataContract subclasses instead. 
- Delegated data:
  - Controller (DelegatedDataContract) provides `txnCreatingRecord` / `txnUpdatingRecord` wrappers using delegate activities; Capo helpers locate UTxOs via manifest/id.  These methods are typically called by the controller's own activities, but can also be called directly by the application layer for more complex use cases.
  - Settings: treated the same as any delegated data-type, plus the manifest `currentSettings` pointing to settings controller.
- Ref scripts: `mkTxnMkAddlRefScriptTxn` stores ref scripts at Capo; `txnAttachScriptOrRefScript` prefers ref, falls back to inline script.

## Helpers & patterns
- `txcWithSeedUtxo` / `txnMustGetSeedUtxo`: select seed input for UUT minting.
- `uutsValue`, `mkUutValuesEntries`: construct Value for delegate tokens.
- `findCharterData`, `findSettingsInfo`, `findDelegatedDataUtxos`: fetch current datum/records.
- `txnAddGovAuthority`, `txnMustUseSpendDelegate`: add delegate authority tokens/redeemers.
- `mkOnchainRelativeDelegateLink` / `extractDelegateLinkDetails`: encode delegate link from configured delegate.
- Pending changes: queue delegate installs in CharterData `pendingChanges`, then `commitPendingChangesIfNeeded` to activate.
- Addl txns: `includeAddlTxn` lets flows emit companion txns (e.g., ref-script creation, charter state transitions, or anything else) executed after the main tx is submitted.  Transactions are submitted in batch, with in-app UI supporting people to view and submit the batch.

## Activities (off-chain handles)
- Capo exposes `activity` (via bridge) for `usingAuthority`, `updatingCharter`, delegate lifecycle helpers.  Use of these activities are typically taken care of by other methods in the Capo calss.
- Minter exposes `activityMintingCharter`, `mintWithDelegateAuthorizing`, `addingMintInvariant`, `addingSpendInvariant`, force replacements.
- DelegatedDataContract exposes `activityCreatingRecord`/`UpdatingRecord` per controller (e.g., ReqtsController), and each controller class may have other activities for creating or updating its records for specific use-cases.  `mkTxn*` methods in the controller class commonly are used for triggering these activities, while providing purpose-specific interface ("dAPI") that applications can trigger in the equivalent user-facing scenarios.  The basic mkTxnCreateRecord() and mkTxnUpdateRecord() methods can also be fed with specific activity objects when their basic `DgDataCreationOptions<TLike>` are good for the use-case at hand.

## Basic tx building patterns
### Typical tx build (general pattern)
1) Start `StellarTxnContext`. ‹capo›.`mkTcx()` or ‹delegate›.`mkTcx()` or ‹data-controller›.`mkTcx()`
2) `tcxWithSeedUtxo` if minting UUTs.
3) Ensure refs: `tcxWithCharterRef`, `tcxWithSettingsRef` (when needed).
4) Add authority tokens: 
  4a. `txnAddGovAuthority` (only for admin/super-user activities)
  4b. internal calls typically take care of `mintDelegate.txnGrantAuthority`, `spendDelegate.txnGrantAuthority`, data-controller `txnGrantAuthority`.
5) Add inputs/outputs (charter, data UTxOs) with appropriate redeemers.
6) Add mints/burns via minter (`txnMintingUuts` or `txnMintWithDelegateAuthorizing`).
7) Attach scripts via ref or inline.
8) Include addl txns (ref scripts, policy install) as needed.

### Transaction-Building for delegated data records
1) Start `StellarTxnContext`. ‹data-controller›.`mkTcx()`
2. ‹data-controller›.`mkTxnCreateRecord()` or ‹data-controller›.`mkTxnUpdateRecord()`
3. Submit the txn:
```typescript
            // optional: pre-register the transaction with the batcher to ensure it appears in the UI
            // immediately, even while it's being built.
            const txBatcher = this.capo.setup.txBatcher;
            await txBatcher.current.$addTxns([
                {
                    description: txnDescription,
                    tcx: tcx,
                    id: tcx.id,
                    depth: 0,
                    moreInfo: "Saving record...",
                },
            ]);

            // essential: build and queue the transaction with the batcher.  This ensures that any chained transactions triggered by the main tx are also queued for submission.
            await tcx.buildAndQueueAll({
                onSubmitted: (txd) => {
                    this.provider?.updateStatus?.(
                        `The update will take a few moments before it's confirmed`,
                        {
                            developerGuidance: "display the message so user can have patience",
                            clearAfter: 3000,
                        },
                        "// user: be patient"
                    );
                    
                },
            });
```
Note that the UI-provided form manager does this sequence itself, so application developers may often be able to meet their needs without needing to implement this pattern directly.

## UI Support
- The `CapoDAppProvider` component provides a React context for the Capo instance, and a portal for the tx batch UI.
- The `TxBatchUI` component provides a UI for interacting with a batch of transactions, with support for viewing the status of each transaction, submitting transactions, and observing the resuting transaction confirmations.  Its advanced view shows more details about each transaction, including the detailed logs of each script policy, its executed requirements and diagnostic outputs.
- The `CapoDappProvider` component also provides portals for the Capo status UI, which shows the current status of the Capo, including the current network, the current address, and the current balance. 
    - dApp developers should provide divs in their layout for these portals (txBatchUI, capoStatus, capoUserDetails), or use the `uiPortals=` prop to map those names to the ids of the portals in their layout. 
    - dApp developers may also take full control of the presentation, with multiple options.  With uiPortals="headless", they can take full control of the UI elements for status, and SHOULD respond to state updates observed in the provider to display relevant information to the user.   They may instead override the default renderers in their subclass, while using ui portals to let the provider manage the placement of the resulting UI elements in their layout.
    - Each application should create their  own subclass of CapoDappProvider, and render <TheirCapoProvider>...</TheirCapoProvider> in their layout, passing their own Capo as the `capoClass` prop (along with other key details).  There is a React signals pattern for subscribing to updates from the provider, easily wired up with the other props.  TODO: add that pattern into the library to make it reusable.
- The provider's default renderers are styled with tailwind classes that reference the application's branding colors.  Application developers should customize their theme colors with css variables and they will need to add tailwind to their project.  They should ensure their tailwind processes the library's css variables and styles.
- The `useCapoDappProvider()` hook gives access to the Capo instance and the provider from anywhere in the application.  
- The `CharterStatus` component provides a dashboard-style screen showing the current status of the Capo, including the current network, the current address, and the current balance.  It also shows the current charter data, including the current charter token, the current charter links, and the current charter manifest.  When loaded, it checks for any on-chain policies needing upgrades, and displays a button to trigger the upgrade transactions.
- There is also a headless `FormManager` component, with related helper classes and UI components for displaying and managing forms for creating and updating delegated data records.  

## Cross-links
- On-chain basics: `reference/essential-stellar-onchain.md`
- Capo helper details: `reference/essential-capo-helpers.md`
- Architecture view: `reference/essential-stellar-dapp-architecture.md`
- Kickstart guide: `reference/essential-stellar-dapp-kickstart.md`

