# About CapoDAppProvider

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

React component and hook pair that manages the full dApp lifecycle for Stellar Contracts applications — network connection, wallet management, Capo contract initialization, transaction infrastructure, user role discovery, and status communication. Provides both default UI (portal-based) and headless operation modes, with a typed status protocol enabling fully custom presentation.

The essential technologies are **React (class component + hooks), Stellar Contracts (Capo lifecycle), Helios tx-utils (wallet/network types)**. Related technologies include Tailwind CSS, CachedUtxoIndex (IndexedDB UTXO cache), Blockfrost / Ogmios (network clients), CIP-30 wallet standard.


# Background

Cardano dApps built on the Stellar Contracts framework face a complex startup sequence: acquire network parameters, connect a wallet, instantiate and configure a Capo contract, attach minting scripts, set up transaction submission infrastructure, and discover the user's on-chain roles. Each step depends on the prior step, and consumers (UI components) must not attempt to use the Capo until the full sequence completes. The CapoDAppProvider encapsulates this lifecycle into a single React component that exposes readiness state, status messages, and the configured Capo instance through React Context. It also provides default UI elements for status, wallet connection, and transaction batching — rendered into developer-specified portals — while supporting full customization through subclassing, callbacks, or headless operation.



# Design Goals

#### General Approach
Encapsulate the multi-step async initialization into a declarative React component. Consumers receive a fully-ready Capo or nothing — never a partially-initialized instance. Status communication uses a typed protocol rich enough to drive any UI without subclassing.

#### Specific Goals
1. **Lifecycle Encapsulation**: Hide the complexity of network→wallet→capo→roles initialization behind a single component boundary.
2. **Readiness Guarantee**: Consumers never observe a Capo instance that isn't fully initialized with wallet and minting script attached.
3. **Status Protocol**: Provide structured status updates (message, error, progress, guidance, next-action) enabling custom UI without understanding internals.
4. **Flexible Presentation**: Support portal-based default UI, headless mode, and selective renderer overrides for maximum integration flexibility.
5. **Wallet Abstraction**: Unify CIP-30 browser wallets and zero-wallet (derived key) behind a common interface with auto-reconnect.
6. **Transaction Readiness**: Ensure TxBatcher and submitters are configured and available when the Capo is ready.


# Must Read: Special Skills and Know-how

1. **Capo lifecycle, StellarContract setup, and actorContext patterns**: When modifying the initialization sequence or readiness gate → load `reference/essential-stellar-offchain.md`
2. **Wallet types, SimpleWallet, Cip30Wallet, WalletHelper, and TxChainBuilder**: When working with wallet connection, CIP-30 types, or transaction utilities → load `reference/essential-helios-api.md`

# Collaborators



**Expected users:** dApp page components and layout wrappers that need access to a configured Capo instance, wallet state, and transaction infrastructure

# Functional Areas and Key Requirements

### 1. Initialization Lifecycle
The multi-step async boot sequence from component mount through Capo readiness, including ordering guarantees and the readiness gate that prevents premature exposure.

#### Key Requirements:
1. **Deterministic Boot Sequence**: The provider MUST execute initialization in a fixed order: acquire network params → initialize UTXO cache (if enabled) → auto-reconnect wallet (if persisted) → instantiate Capo → connect minting script → attach UTXO cache to Capo → discover user roles. Each step MUST complete before the next begins.
2. **Readiness Gate**: The provider MUST NOT expose the Capo instance to consumers until initialization is fully complete — including wallet attachment and minting script connection. Internal provider code MUST access the raw state directly.
3. **Singleton Enforcement**: Only one CapoDAppProvider instance SHOULD exist at a time. The provider SHOULD warn in development mode if a second instance is created (e.g., during hot-reload).
4. **Unmount Cleanup**: The provider MUST clean up all subscriptions, timers, and cached resources on unmount.

### 2. Wallet Integration
Wallet detection, connection, disconnection, network validation, auto-reconnect persistence, and the zero-wallet (browser-local key derivation) alternative.

#### Key Requirements:
1. **CIP-30 Wallet Connection**: The provider MUST support connecting CIP-30 browser extension wallets, validating their network matches the target, and exposing the connected wallet to the Capo.
2. **Zero-Wallet Support**: The provider MUST support a browser-local 'zero wallet' that generates and caches key material in localStorage for immediate use without a browser extension.
3. **Wallet Auto-Reconnect**: The provider MUST persist the user's wallet selection and automatically reconnect on subsequent page loads.
4. **Wallet Disconnect**: The provider MUST support disconnecting the current wallet, clearing all wallet-related state, and removing the auto-reconnect persistence.
5. **Wallet Network Validation**: The provider MUST reject wallet connections whose network does not match the configured targetNetwork, displaying a clear error to the user.

### 3. Status Protocol
The typed CapoDappStatus structure and update mechanism that communicates lifecycle progress, errors, guidance, and suggested actions to consumers.

#### Key Requirements:
1. **Structured Status Updates**: The provider MUST emit structured status updates containing message, error flag, progress indicators, developer guidance, and optional next-action triggers — sufficient for any UI to present appropriate feedback.
2. **Status Callbacks**: The provider MUST support callback props for status changes, user info changes, wallet changes, context changes, and network readiness.
3. **Auto-Clearing Messages**: Status messages with a clearAfter duration MUST be automatically cleared after the specified time, and consumers SHOULD expect the empty-message update.

### 4. UI and Presentation
Portal-based default rendering, headless mode, and the override points (renderPersistentMessage, renderNotification, renderErrorStatus, renderWalletInfo, renderRoleInfo) for custom presentation.

#### Key Requirements:
1. **Portal-Based Rendering**: The provider's default UI elements (status, user details, transaction batch) MUST render into named DOM portals, with fallback behavior when portals are not present.
2. **Headless Mode**: When uiPortals is set to 'headless', the provider MUST render only the Context wrapper and children — no status, wallet, or transaction UI.
3. **Overridable Renderers**: The provider MUST expose overridable render methods for each UI section: persistent messages, transient notifications, error display, wallet info, role tags, action buttons, and progress bars.

### 5. Consumer Hook
The useCapoDappProvider hook that provides type-safe access to the Capo instance and provider from React Context.

#### Key Requirements:
1. **Type-Safe Context Hook**: The useCapoDappProvider hook MUST provide type-safe access to the Capo instance, provider, and mount state — returning null when used outside a provider.

### 6. Transaction Infrastructure
TxBatcher setup, named submitter registration (blockfrost, ogmios), signing strategy attachment, and bootstrap (charter) transaction flow.

#### Key Requirements:
1. **TxBatcher and Submitter Setup**: The provider MUST configure a TxBatcher with named submitters and a signing strategy derived from the connected wallet, making it available in provider state for transaction-building consumers.
2. **Bootstrap Charter Flow**: The provider MUST support an administrative bootstrap flow that creates the charter transaction for an un-configured Capo, with status updates guiding the admin through the multi-step process.
3. **User Role Discovery**: After the Capo is ready and a wallet is connected, the provider MUST scan the wallet for authority tokens and expose detected roles (member, admin) in user info state.


# Detailed Requirements

## Area 1: Initialization Lifecycle

### **REQT-1.1.0/33gv0bvvw5**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Deterministic Boot Sequence**
#### Purpose: Ensures the initialization steps execute in the correct order and that no step is skipped or doubled. Applied when diagnosing startup failures, reviewing mount/unmount behavior, or verifying that hot-reload doesn't corrupt state.

 - 1.1.1: REQT-zep0htt3gx: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Acquire Network Parameters** - The provider MUST acquire network parameters from the Blockfrost client as the first initialization step, before any wallet or Capo operations.
 - 1.1.2: REQT-bnzftwza2k: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Initialize UTXO Cache** - If UTXO caching is enabled (useCachedIndex !== false), the provider MUST initialize a CachedUtxoIndex from the bundle's precompiled config before wallet connection, so the wallet can use the cache as its network backend.
 - 1.1.3: REQT-d5pjezgfya: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Auto-Reconnect Wallet** - If a wallet selection is persisted in localStorage, the provider MUST automatically initiate wallet connection before Capo instantiation.
 - 1.1.4: REQT-trmmssmgp4: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Instantiate Capo** - The provider MUST instantiate the Capo via capoClass.createWith() with the configured setup (network, networkParams, txBatcher, actorContext).
 - 1.1.5: REQT-e7ytgeap5y: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Connect Minting Script** - After Capo instantiation, the provider MUST connect the minting script via capo.connectMintingScript() using the bundle's configured script details.
 - 1.1.6: REQT-eva4h257cp: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Attach UTXO Cache to Capo** - After Capo instantiation and minting script connection, the provider MUST attach the CachedUtxoIndex to the Capo (if enabled), replacing its network client with the caching layer.
 - 1.1.7: REQT-fyp1vhrfth: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Discover User Roles** - After the Capo is fully initialized and a wallet is connected, the provider MUST scan for authority tokens to discover the user's roles (member, admin).
 - 1.1.8: REQT-fc16p6fghz: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Re-Entrancy Suppression** - Re-entrant initialization calls (e.g., from React strict-mode double-mount in development) MUST be suppressed. The provider MUST track a pending initialization promise and return it on re-entry rather than starting a second sequence.

### **REQT-1.2.0/w475q7ahbm**: **IMPLEMENTED/NEEDS VERIFICATION**/consented: **Readiness Gate**
#### Purpose: Prevents consumer components from observing a partially-initialized Capo instance. Applied when reviewing the capo accessor, the hook's return value, or diagnosing race conditions where consumers see a wallet-less capo.

 - 1.2.1: REQT-fbxxqtz6rd: **IMPLEMENTED/NEEDS VERIFICATION**/consented: **No Consumer Changes Required** - The readiness gate MUST resolve the premature-capo race for all consumers without requiring changes to consumer components. Components that check `if (!capo)` MUST naturally remain in their loading state until the Capo is truly ready.
 - 1.2.2: REQT-hdckrer5gq: **IMPLEMENTED/NEEDS VERIFICATION**/consented: **Bootstrap Path Exemption** - When the Capo is not yet configured/chartered (bootstrap scenario), the provider's internal bootstrap methods MUST still access the raw Capo instance. The readiness gate MUST NOT block administrative bootstrap flows.

### **REQT-1.3.0/mtv0dw4j7n**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Singleton Enforcement**
#### Purpose: Prevents conflicting state from multiple provider instances. Applied when reviewing component architecture or diagnosing state corruption.

 - 1.3.1: REQT-0xe8qzxa1h: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Duplicate Instantiation Warning** - The provider SHOULD warn in the console when a second instance is created in development mode (e.g., during hot-reload).
 - 1.3.2: REQT-1zt3xbz334: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **No Hard Crash on Duplicate** - Duplicate instantiation SHOULD NOT crash the application, allowing hot-reload cycles to proceed without errors.

### **REQT-1.4.0/esrk1ghs89**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Unmount Cleanup**
#### Purpose: Prevents resource leaks and stale event handlers after the provider unmounts. Applied when reviewing component lifecycle or diagnosing memory leaks.

 - 1.4.1: REQT-h0dtqp9tzp: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Stop UTXO Index Refresh** - On unmount, the provider MUST stop the CachedUtxoIndex periodic refresh and remove all event listeners from the index.
 - 1.4.2: REQT-jspm71q65w: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Suppress Post-Unmount Mutations** - After unmount, the provider MUST suppress any pending state updates to prevent React warnings and stale state mutations.

## Area 2: Wallet Integration

### **REQT-2.1.0/tnzh1zxfcp**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **CIP-30 Wallet Connection**
#### Purpose: Governs the standard browser-wallet integration path. Applied when reviewing wallet connection flow, debugging wallet errors, or adding support for new wallet providers.

 - 2.1.1: REQT-36bgdbk9zr: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Wallet Availability Check** - The provider MUST check wallet availability via window.cardano[name] before attempting connection, and report a clear error with guidance when the wallet extension is not activated.
 - 2.1.2: REQT-zv15egke2s: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Enable and Connect** - The provider MUST call enable() on the CIP-30 wallet extension to obtain a full wallet handle for subsequent operations.
 - 2.1.3: REQT-kk3rmrz1sn: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Network Match Validation** - The provider MUST validate that the connected wallet's reported network ID matches the provider's targetNetwork prop before proceeding with Capo initialization.
 - 2.1.4: REQT-txakxs69e1: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Network Mismatch Error Reporting** - When the wallet's network does not match targetNetwork, the provider MUST set an error status identifying both the expected and actual networks, with developer guidance on resolution.
 - 2.1.5: REQT-abqqghew5z: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Connection Retry with Backoff** - The provider MUST retry wallet connection with exponential backoff (up to 5 retries) when the wallet extension reports it is not ready (e.g., 'no account set' during auto-connect).
 - 2.1.6: REQT-5bk3f8g6a7: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Supported Wallets Restriction** - The provider MUST accept a supportedWallets prop to restrict which wallet names are offered for connection. Unsupported wallet selections MUST be rejected with an error.

### **REQT-2.2.0/rqs9v2g4jw**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Zero-Wallet Support**
#### Purpose: Provides a wallet-free development and testing path. Applied when reviewing the zero-wallet flow or debugging key derivation.

 - 2.2.1: REQT-vb7tkkxk8s: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Key Generation** - On first use, the zero-wallet MUST generate a random root private key to serve as the wallet's entropy source.
 - 2.2.2: REQT-d7sqb62pkc: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Key Derivation** - The zero-wallet MUST derive separate spending and staking Bip32 private keys from the root key for use in wallet construction.
 - 2.2.3: REQT-a3g1yxeb07: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Key Caching** - The zero-wallet MUST cache derived key bytes (spending key, staking key, public key, address) in localStorage for fast subsequent loads, avoiding repeated expensive key derivation.
 - 2.2.4: REQT-t8t4nxdcxs: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Legacy Format Migration** - The zero-wallet MUST transparently migrate from any legacy storage format (entropy-only) to the current cached-key format without user intervention or data loss.
 - 2.2.5: REQT-ms9x8yqew9: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **SimpleWallet Creation** - The zero-wallet MUST create a SimpleWallet instance backed by the derived spending and staking keys, ready for use as a standard Wallet in the provider.
 - 2.2.6: REQT-7gxst382ct: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Network Backend Selection** - The zero-wallet's SimpleWallet MUST use the CachedUtxoIndex (if enabled) or Blockfrost client as its network backend. When Hydra is configured, it MUST use a Hydra client instead.

### **REQT-2.3.0/fqe43a8nn5**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Wallet Auto-Reconnect**
#### Purpose: Enables seamless return visits without manual wallet selection. Applied when reviewing the localStorage persistence or diagnosing auto-connect failures.

 - 2.3.1: REQT-1n4jh2a6jg: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Persist Wallet Selection** - The provider MUST store the selected wallet name in localStorage (key: capoAutoConnectWalletName) when a wallet is successfully connected.
 - 2.3.2: REQT-0ctt8wb02d: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Auto-Connect on Mount** - On mount, the provider MUST check for a persisted wallet selection in localStorage and automatically initiate wallet connection if found.
 - 2.3.3: REQT-6ckc1k8vt4: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Clear Persistence on Disconnect** - Disconnecting a wallet MUST clear the persisted wallet selection from localStorage, preventing auto-reconnect on the next page load.

### **REQT-2.4.0/hm0vfdjmbe**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Wallet Disconnect**
#### Purpose: Ensures clean wallet removal without stale state. Applied when reviewing the disconnect flow or verifying state cleanup.

 - 2.4.1: REQT-qk5mhsjrma: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Clear Wallet State** - On disconnect, the provider MUST clear wallet, walletAddress, and walletHandle from userInfo state.
 - 2.4.2: REQT-5g33zx4aqw: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Disconnect Status Update** - On disconnect, the provider MUST emit a status update reflecting the disconnection so consumers can respond to the wallet-removed state.

### **REQT-2.5.0/79wznbjdr0**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Wallet Network Validation**
#### Purpose: Prevents silent operation on the wrong Cardano network. Applied when reviewing error handling or diagnosing network mismatch scenarios.

 - 2.5.1: REQT-gm3avtstdr: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Identify Both Networks in Error** - When a network mismatch is detected, the error message MUST identify both the expected network (from targetNetwork prop) and the actual network (from the wallet), so the user knows what to change.
 - 2.5.2: REQT-9ayp9nn3hj: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Block Initialization on Mismatch** - When a network mismatch is detected, the provider MUST NOT proceed with Capo initialization. The provider MUST remain in an error state until the user resolves the network conflict.

## Area 3: Status Protocol

### **REQT-3.1.0/fxme59f7gj**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Structured Status Updates**
#### Purpose: Enables consumer UIs to present rich, contextual feedback without understanding provider internals. Applied when building custom status displays, reviewing the status protocol, or diagnosing missing user feedback.

 - 3.1.1: REQT-059pgch6k9: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Developer Guidance Field** - The developerGuidance field MUST NOT be displayed in the user-facing UI. It provides hints to developers about how to handle the current state. Consumers MAY display it in development environments.
 - 3.1.2: REQT-g56zhabz4h: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Message and Error Fields** - Each status update MUST include a message (string|undefined) and isError (boolean) indicating whether the current state represents an error condition requiring user attention.
 - 3.1.3: REQT-zwdnwgt6qk: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Ready Flag** - Each status update MUST include a ready boolean indicating whether the provider has completed full initialization (Capo connected, wallet attached, roles discovered).
 - 3.1.4: REQT-7wv18ht8mm: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Display Hint Fields** - Each status update MUST include keepOnscreen (boolean) and clearAfter (milliseconds) as display hints, allowing consumers to determine whether to persist or auto-dismiss the message.
 - 3.1.5: REQT-g7arkcxtsy: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Progress Indicators** - Each status update MUST support progressBar (boolean|string label) and progressPercent (number) fields for activity indication. Activities without numeric progress SHOULD omit progressPercent.
 - 3.1.6: REQT-gb5bsrptpk: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **User Guidance and Developer Guidance** - Each status update MUST support moreInstructions (user-facing guidance) and developerGuidance (developer hints — MUST NOT be displayed in production UI). Consumers MAY display developerGuidance in development environments.
 - 3.1.7: REQT-dzqdagykmn: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Next Action Trigger** - Each status update MAY include a nextAction with key, label, and trigger function. When present, consumers SHOULD display a button invoking the trigger to guide the user through recovery or next steps.
 - 3.1.8: REQT-av0g24ryrz: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Stale Field Auto-Clear** - The updateStatus method MUST automatically clear nextAction and isError when they are not explicitly set in a new status update, preventing stale error or action state from persisting.

### **REQT-3.2.0/9eg0scy23g**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Status Callbacks**
#### Purpose: Enables React state-driven UIs to track provider state changes without subclassing. Applied when building custom UI integrations or reviewing the callback contract.

 - 3.2.1: REQT-r7weaffnfj: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **onStatusChange Callback** - The provider MUST invoke the onStatusChange prop whenever the status object changes, after state is committed via componentDidUpdate.
 - 3.2.2: REQT-0dgemv053g: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **onUserInfo Callback** - The provider MUST invoke the onUserInfo prop whenever userInfo changes (roles, wallet, address), after state is committed.
 - 3.2.3: REQT-1a29db7vm4: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **onWalletChange Callback** - The provider MUST invoke the onWalletChange prop when the wallet is connected or disconnected, after state is committed.
 - 3.2.4: REQT-ht458gmr6y: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **onContextChange Callback** - The provider MUST invoke the onContextChange prop when the Capo instance changes, passing the provider itself so consumers can access the updated capo.
 - 3.2.5: REQT-cr6dmwhq98: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **onNetwork Callback** - The provider MUST invoke the onNetwork prop when the network client (BlockfrostV0Client) is ready, before Capo initialization begins.

### **REQT-3.3.0/ytcwb91zzd**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Auto-Clearing Messages**
#### Purpose: Prevents stale transient messages from lingering. Applied when reviewing message lifecycle or implementing custom notification systems.

 - 3.3.1: REQT-8m8cyktw20: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Scheduled Clear** - When clearAfter is set, the provider MUST schedule a status clear after the specified milliseconds.
 - 3.3.2: REQT-9hkrae8ehg: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Stale Clear Guard** - The scheduled clear MUST only fire if the current message still matches the original message, preventing newer messages from being cleared by an older timer.
 - 3.3.3: REQT-k1r3s63mac: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Toast Library Compatibility** - Consumers using toast-style notification libraries MAY pass clearAfter to their own timer system and ignore the subsequent empty-message status update from the provider.

## Area 4: UI and Presentation

### **REQT-4.1.0/rhk7fcp71q**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Portal-Based Rendering**
#### Purpose: Enables the provider's default UI to appear in developer-controlled DOM locations. Applied when integrating the provider into a layout or diagnosing missing UI elements.

 - 4.1.1: REQT-28wqzdd4f7: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Named Portal Targets** - The provider MUST render status, user details, and transaction batch UI into DOM elements identified by the uiPortals prop, or into default IDs (capoStatus, capoUserDetails, txBatchUI) when uiPortals is not set.
 - 4.1.2: REQT-brn64phhqa: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Portal Retry Logic** - When explicit portal IDs are configured, the provider MUST retry finding the portal DOM elements (up to 10 times) with the configured portalDelay, accommodating deferred DOM rendering.
 - 4.1.3: REQT-j9zzgehakv: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Fallback Portal Placeholders** - When using default portal IDs and the expected DOM elements are not found, the provider MUST create fallback placeholder portals and log warnings to the console.

### **REQT-4.2.0/ptwpqyr807**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Headless Mode**
#### Purpose: Enables fully custom UIs that receive only data, no DOM output from the provider. Applied when building custom layouts or non-visual integrations.

 - 4.2.1: REQT-7kt6m50h44: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Context-Only Rendering** - In headless mode, the provider MUST render only the CapoDappProviderContext.Provider wrapping the children. No InPortal elements, status messages, wallet UI, transaction batch UI, or rate meter gauge MUST be rendered.
 - 4.2.2: REQT-zw550xb9rc: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Callbacks-Only Communication** - In headless mode, all status communication MUST occur exclusively through callback props (onStatusChange, onUserInfo, onWalletChange, onContextChange). The provider MUST NOT produce any DOM-based status output.

### **REQT-4.3.0/zgz9cpkhwt**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Overridable Renderers**
#### Purpose: Enables selective customization of individual UI pieces without replacing the entire rendering. Applied when reviewing the customization API or subclassing the provider.

 - 4.3.1: REQT-r5h1f46teq: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Persistent Message Renderer** - renderPersistentMessage() MUST be overridable by subclasses. It renders status messages flagged with keepOnscreen. The default MUST display the message, moreInstructions, and the next-action button (via renderNextAction).
 - 4.3.2: REQT-gvp0rzhxf8: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Notification Renderer** - renderNotification() MUST be overridable by subclasses. It renders transient status messages (with clearAfter). By default it delegates to renderPersistentMessage(), so overriding only the persistent renderer affects both.
 - 4.3.3: REQT-az8khbd52q: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Error Status Renderer** - renderErrorStatus() MUST be overridable by subclasses. It renders error messages with visual error indication and SHOULD include a role='alert' attribute for accessibility.
 - 4.3.4: REQT-24s5e3xfpn: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Wallet Info Renderer** - renderWalletInfo() MUST be overridable by subclasses. It renders the wallet connection UI — wallet selector, connect button, connected address, network name, and disconnect control.
 - 4.3.5: REQT-x2wt9xc5sc: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Role Info and Role Tag Renderers** - renderRoleInfo() and renderRoleTag(role) MUST be independently overridable by subclasses. renderRoleInfo() renders the list of detected roles; renderRoleTag() renders each individual role chip.
 - 4.3.6: REQT-cx2kgx6gcd: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Action Button Renderer** - renderActionButton() MUST be overridable by subclasses. It renders the next-action button presented in status messages when a nextAction trigger is provided.
 - 4.3.7: REQT-me3dq6j7jx: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Progress Bar Renderer** - renderProgressBar() MUST be overridable by subclasses. It renders the progress indicator with optional label and percentage.
 - 4.3.8: REQT-k5fp8yxdw5: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Override Without Replacing render()** - Each overridable render method MUST be called from the main render() flow, so subclass overrides take effect without needing to replace the entire render() method.

## Area 5: Consumer Hook

### **REQT-5.1.0/kczbtvaxnj**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Type-Safe Context Hook**
#### Purpose: Provides the primary consumer API for accessing the Capo and provider. Applied when reviewing consumer integration patterns or diagnosing null-reference errors in consumer components.

 - 5.1.1: REQT-gmwjf143fz: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Hook Tracks Provider Capo Reference** - The hook MUST track the provider's capo property and update its own capo state when the provider's capo changes. This ensures consumers see the gated capo value and respond to the undefined→defined transition when initialization completes.
 - 5.1.2: REQT-anr86q0x42: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Null Outside Provider** - The hook MUST return null when used outside a CapoDappProviderContext (no provider ancestor). It MUST NOT throw an error.
 - 5.1.3: REQT-9m125paq0d: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Typed Capo Access** - The hook MUST accept a type parameter C extending Capo, providing typed access to the capo instance's methods and properties.
 - 5.1.4: REQT-ejnevyxn4j: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Return Shape** - The hook MUST return {capo, provider, isMounted} where capo reflects the provider's gated accessor (undefined until ready), provider is the CapoDAppProvider instance, and isMounted tracks the hook's mount state.
 - 5.1.5: REQT-z8zk3jxna7: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Deferred Readiness Polling** - The hook MUST poll every 2 seconds while the capo is not connected or the wallet is missing, ensuring it detects deferred readiness without relying solely on re-render triggers.

## Area 6: Transaction Infrastructure

### **REQT-6.1.0/p46sgkm4jf**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **TxBatcher and Submitter Setup**
#### Purpose: Ensures transaction infrastructure is ready when consumers need to build and submit transactions. Applied when reviewing transaction readiness or diagnosing submission failures.

 - 6.1.1: REQT-bvx4nf7ff1: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Blockfrost Submitter** - The TxBatcher MUST always include a blockfrost submitter backed by the provider's BlockfrostV0Client.
 - 6.1.2: REQT-8py4avh9bs: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Custom and Ogmios Submitters** - The TxBatcher MUST include any submitters from the otherSubmitters prop and MUST create OgmiosTxSubmitter instances for each entry in the ogmiosConnections prop.
 - 6.1.3: REQT-5ddy5dg068: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Submitter Name Conflict Detection** - Submitter names MUST NOT conflict. The provider MUST throw an error if an ogmios submitter name collides with an existing submitter.
 - 6.1.4: REQT-wrbhqvmg6j: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Wallet-Derived Signing Strategy** - When a wallet is connected, the TxBatcher MUST be configured with a GenericSigner signing strategy backed by that wallet. When no wallet is connected, the TxBatcher MUST be created without a signing strategy.
 - 6.1.5: REQT-6jmem7d6bp: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **TxBatcher in State and Setup** - The TxBatcher instance MUST be stored in provider state and attached to the Capo's setup object, making it available to transaction-building consumers.

### **REQT-6.2.0/x8bhdjqt1g**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Bootstrap Charter Flow**
#### Purpose: Enables first-time Capo deployment. Applied when reviewing the admin bootstrap experience or diagnosing charter creation failures.

 - 6.2.1: REQT-4ja2cy6ct1: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Setup Capo Action Offer** - When the Capo is not yet configured/chartered, the provider MUST offer a 'Setup Capo' next-action button to initiate the bootstrap flow.
 - 6.2.2: REQT-kg3kxc2c91: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Ensure Wallet Before Charter** - The bootstrap flow MUST ensure a wallet is connected before attempting to create the charter transaction.
 - 6.2.3: REQT-32ysrr9n51: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Charter Transaction Creation** - The bootstrap flow MUST create the charter transaction via capo.mkTxnMintCharterToken with default charter arguments derived from the connected wallet.
 - 6.2.4: REQT-gmd9qrp470: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Guided Submission with Signing** - The bootstrap flow MUST submit the charter transaction with progress updates and wallet-signing prompts, providing status messages and moreInstructions at each step.
 - 6.2.5: REQT-ge5dv9013p: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Dev-Mode Config Persistence** - In development mode, the bootstrap flow MUST persist the bootstrapped config to localStorage for automatic use on the next page load.
 - 6.2.6: REQT-e89gg8p4ph: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Production Deploy Instructions** - In production mode, the bootstrap flow MUST instruct the developer to deploy the config from the console output into their dApp code.
 - 6.2.7: REQT-vz3egde6ht: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Bootstrap Error Recovery** - The bootstrap flow MUST report errors with a 'Retry' next-action option, allowing the user to attempt the charter transaction again.

### **REQT-6.3.0/5hctx65f2m**: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **User Role Discovery**
#### Purpose: Enables role-based feature gating in consumer components. Applied when reviewing role detection or diagnosing missing role tags.

 - 6.3.1: REQT-wazpzppsfp: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Trigger After Capo Ready** - Role discovery (checkWalletTokens) MUST be called only after the Capo is fully initialized and a wallet is connected.
 - 6.3.2: REQT-eaqr531dan: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Member and Admin Detection** - The provider MUST scan for member info (via capo.findMemberInfo) and admin authority (via capo.findActorUut('capoGov')) to determine the user's roles.
 - 6.3.3: REQT-ebhnzjzpr7: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Roles in User Info** - Detected roles MUST be stored in userInfo.roles and exposed through the context, enabling consumer components to gate features by role.
 - 6.3.4: REQT-xnc1t7x56y: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Ready Flag After Roles** - The ready flag in status MUST be set to true after role discovery completes, signaling to consumers that the provider is fully initialized.


# Files

- `src/ui/CapoDappProvider.tsx` - Main CapoDAppProvider class component — lifecycle management, wallet connection, Capo initialization, status updates, and default UI rendering.
- `src/ui/CapoDappProviderContext.ts` - React Context definition and useCapoDappProvider hook for type-safe consumer access.

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
