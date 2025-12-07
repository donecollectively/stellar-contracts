# Stellar off-chain essentials

## Core classes
- `Capo` (extends StellarContract): orchestrates charter mint/update, delegates, manifest, delegated data, ref scripts.  `src/Capo.ts`.
- `CapoMinter`: fixed minting policy script; mints charter token + UUTs; defers policy to mint delegate except forced admin paths.  `src/minting/CapoMinter.ts`.
- `ContractBasedDelegate`: base for script-backed delegate controllers (mint/spend/data/named). Provides bundle wiring, activity/datum accessors, authority token helpers.  `src/delegation/ContractBasedDelegate.ts`.
- `DelegatedDataContract<T>`: base for data-policy controllers; wraps create/update flows for records stored at Capo; exposes `recordTypeName`, `idPrefix`, `exampleData`, activities for create/update.  `src/delegation/DelegatedDataContract.ts`.
- `StellarTxnContext`: tx builder + typed state (seedUtxo, uuts, charterRef, settingsRef, addlTxns). Provides a facade for the underlying Helios TxBuilder, and a typed state container for the transaction context.  `src/StellarTxnContext.ts`.


## Token + authority model
- Policy: Capo mph (from minter). Charter token (`charter`) proves contract identity; various UUTs prove authority per role (gov/mint/spend/named/data-policy).
- UUT naming: `<purpose>-<seedHash6>` derived from seed UTxO; managed via `txnWillMintUuts`/`txnMintingUuts`.
- Manifest entries (in CharterData) point to delegate/data-policy tokens.  Each delegate class (DelegatedDataContract/ ContractBasedDelegate/StellarDelegate subclass or even AnyAddressAuthorityPolicy) can locate and include these UUTs in its txn as needed via txnGrantAuthority().  
    - Internally, DelegateMustFindAuthorityToken and DelegateAddsAuthorityToken and txnReceiveAuthorityToken handle the UTxO discovery and inclusion,  forming the protocol for authority token handling.
    - The authority token is always returned to the Capo address.

## Key transaction flows (day-to-day operations)
- Capo:
 - 
  - `get mph`: Returns the minting policy hash for the Capo.  This is used by the CapoProvider to display the minting policy hash in the UI.
  - `delegateRoles`: Defines the delegate roles for the dApp.  Every dApp should define its own delegate roles, and typically will use the basicDelegateRoles() helper to access the default mint/spend/gov delegates.
  - `findDelegatedDataUtxos`: Capo's helper method for finding delegated data UTxOs via manifest/id.  It can be used by the controller classes to locate the UTxOs for their records.
  - `findScriptReferences`: Capo's helper method for finding ref scripts via validator hash.  It is used by the controller classes to locate the ref scripts for their records.
  - `findCapoUtxos`: Capo's helper method for finding all UTxOs at the Capo address, including the charter and other utxos.
   - `getDgDataController`: Capo's helper method for finding the delegated data controller for a given typeName.  It is used by the controller classes, other infrastructure components, and application code to locate the controller for their records.
   - `getMintDelegate`: Capo's helper method for finding the mint delegate.  Uncommonly needed by application code.
   - `txnAddGovAuthority`: Adds the gov authority token to a transaction, using the gov delegate activity to authorize the addition.  SHOULD be used when performing any admin/super-user activities.
   - `findSettingsInfo`: Finds the current settings info for the Capo, including the current settings record and the underlying `data` and possible application-layer `dataWrapped` object.  Not every dApp has to have settings, but an dApp can, with its own data structure for the settings.


- Delegated data controllers:
  - `mkTxnCreateRecord`: Creates a new record at the Capo, using the spend delegate activity to authorize the creation.  Implemented by the base class DelegatedDataContract.  
     - Specific subclasses may define more specific mkTxn* methods for creating their records for specific use-cases.
     - The basic mkTxnCreateRecord() and mkTxnUpdateRecord() methods can also be fed with specific activity objects when their basic `DgDataCreationOptions<TLike>` are good for the use-case at hand.
  - `mkTxnUpdateRecord`: Updates an existing record at the Capo, using the spend delegate activity to authorize the update.  Implemented by the base class DelegatedDataContract.  
     - Specific subclasses may define more specific mkTxn* methods for updating their records for specific use-cases.
     - The basic mkTxnUpdateRecord() method can also be fed with specific activity objects when its basic `DgDataUpdateOptions<TLike>` are good for the use-case at hand.

  - Controllers provide basic mkTxnCreateRecord() and mkTxnUpdateRecord() methods that SHOULD be used by application-specific transaction-building functions that provide developer-friendly interfaces closely fit to application use-cases.

## Key flows (uncommon lifecycle activities)
- Charter bootstrap: `mkTxnMintCharterToken` builds seed→charter mint tx + ref scripts (Capo, minter, mint delegate); sets CharterData with delegate links/manifest (one-time per Capo).  The CapoProvider provides UI with a button to trigger this flow.  dApps need to capture the deployment details, store them in their code repository, and build their dAPI package to get pre-compiled minter, Capo and mint/spend delegates.  This package is then used by their UI to create and validate transaction before submitting them onchain.
    - `mkAdditionalTxnsForCharter`: Capo's hook for adding dApp-specific additional transactions to the charter creation process.  It is called during the creation of the charter transaction.  The provided transaction context has state.charterData in case it's needed.  This method should use {@link StellarTxnContext.includeAddlTxn} to add transactions to the context.  No-op by default.
- Charter update: `txnUpdateCharterUtxo`/`mkTxnUpdateCharter` spends charter with `updatingCharter`, returns charter token to Capo address, updates links/manifest/pendingChanges (used by admin flows like delegate install/settings/policy changes).  `mkTxnUpgradeIfNeeded` is used by the CharterStatus component to check for needed upgrades and trigger the upgrade transactions.

- Delegate install/replace:
  - Mint/spend delegate: `mkTxnUpdatingMintDelegate` / `mkTxnUpdatingSpendDelegate` (normal or forced), burns old UUT unless forced, updates CharterData link.
  - `mkTxnAddingMintInvariant` and `mkTxnAddingSpendInvariant` are not yet well supported, but are planned for future releases.
  - Data policy/named delegate: `mkTxnAddingNamedDelegate`, `mkTxnQueuingDelegateChange` + `mkTxnCommittingPendingChanges` (queue/commit pattern for manifest DgDataPolicy entries).  DEPRECATED; use DelegatedDataContract subclasses instead. 
  - DelegatedDataContract: 
      - `setupCapoPolicy` - triggered automatically by the upgrade sequence, it 
     -Capo's `mkTxnInstallingPolicyDelegate`, `mkTxnAddManifestEntry`, `mkTxnQueuingDelegateChange`, `mkTxnCommittingPendingChanges` are used to install/update/queue/commit data-policy delegates.  

  - commitPendingChangesIfNeeded
- Delegated data:
  - Settings: delegated-data type referenced by manifest `currentSettings`.
- Ref scripts: `mkTxnMkAddlRefScriptTxn` stores ref scripts at Capo; `txnAttachScriptOrRefScript` prefers ref, falls back to using inline (but this will usually fail due to transaction size limits).

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

## Data Management Lifecycle

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

