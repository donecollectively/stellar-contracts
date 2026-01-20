# zWallet

## MAINTAINERS MUST READ:

> **🛑 COMPLIANCE TRIGGER: READ THIS FIRST**
> Before modifying this requirements document, you MUST read and understand the requirements management guidelines in [skillz/reqm/reqm.SKILL.md](./skillz/reqm/reqm.SKILL.md). This ensures consistent formatting, proper use of requirement IDs, and adherence to project standards.
>
> **hash.notice.reqt-consumer**: ef6a1fc351265553

> NOTE: See [reqm.SKILL.md](./skillz/reqm/reqm.SKILL.md); When managing requirements, you MUST follow the guidelines and conventions in that document, including expression of purpose/intended function as well as the detailed, formal requirements.

## About zWallet

The zWallet (Zero Wallet) is a browser-native Cardano wallet implementation that provides a lightweight, plugin-free alternative to traditional CIP-30 browser extension wallets like Eternl or Nami. It enables developers and users to interact with Cardano dApps without requiring external wallet software installation.

The wallet stores cryptographic key material in browser localStorage and uses the Helios SDK's `SimpleWallet` interface to provide standard wallet operations including address derivation, UTxO management, and transaction signing. It is implemented within the `CapoDappProvider` React component and integrates seamlessly with the Stellar Contracts framework.

**Essential technologies**: `@helios-lang/tx-utils` (BIP32/BIP39 key derivation, SimpleWallet), browser localStorage API, React.

**Related technologies**: Blockfrost API (network client), Hydra (optional L2 support).

## Must Read: Special Skills and Know-how

This section provides directives for proactive-research triggers. People and agents should use these to recognize the triggers for specialized material to be considered highly relevant, and to ensure they are properly primed before proceeding.

1. **Helios Key Management**: When modifying key derivation or wallet creation logic, you MUST first read [reference/essential-helios-api.md](./reference/essential-helios-api.md) to understand the `RootPrivateKey`, `Bip32PrivateKey`, and `makeSimpleWallet` APIs.

2. **BIP32/BIP39 Standards**: When working with entropy, mnemonic phrases, or key derivation paths, you SHOULD review the BIP32 and BIP39 specifications to ensure compliance with hierarchical deterministic wallet standards.

3. **localStorage Security**: When modifying storage format or adding sensitive data, you MUST consider browser security implications including XSS vulnerabilities and the plaintext nature of localStorage.

## Collaborators

- **USED BY zWallet**: `@helios-lang/tx-utils` (`makeBip32PrivateKey`, `makeRootPrivateKey`, `makeSimpleWallet`), `@helios-lang/codec-utils` (`bytesToHex`, `hexToBytes`), browser `localStorage` API.

- **Expected to USE zWallet**: React applications using `CapoDappProvider` that need a quick-start wallet for development or testing, users who prefer not to install browser extension wallets.

- **First-class instances that USE zWallet**: `CapoDappProvider` component (which `EXPECTS REQT/34mp64786n` for fast wallet loading).

## Background

Traditional Cardano wallet integration requires users to install browser extensions (Eternl, Nami, Lace, etc.) that implement the CIP-30 standard. While these wallets provide robust security and features, they create friction for:

1. **Development Workflows**: Developers testing dApps must install and configure external wallets, slowing iteration cycles.

2. **User Onboarding**: New users face a multi-step process before they can interact with a dApp.

3. **Performance**: The original zWallet implementation stored only entropy bytes, requiring expensive BIP39 key derivation (~500ms) on every page load.

4. **Hydra Integration**: Layer 2 solutions like Hydra benefit from lightweight wallets that can be created programmatically without user interaction.

## zWallet Design Goals

### General Approach

- Browser-native wallet using localStorage for persistence
- Zero external dependencies beyond the Helios SDK
- Fast loading through caching of derived key material
- Backward compatibility with existing wallet data
- Structured storage format enabling future extensibility (encryption, multi-account)

### Specific Goals

1. **Instant Loading**: Wallet connection MUST complete in under 50ms for cached wallets, avoiding the 500ms BIP39 derivation penalty on every load.

2. **Backward Compatibility**: Existing wallets stored in the legacy `"zwk"` format MUST continue to work and be automatically migrated to the new format.

3. **Data Integrity**: The storage format MUST preserve the original entropy for backup/recovery purposes while caching derived keys for performance.

4. **Structured Storage**: The storage format MUST use a JSON structure that can be extended for future features (encryption, multiple accounts, metadata).

5. **Standard Compliance**: The wallet MUST produce addresses and signatures compatible with standard Cardano tooling and the CIP-30 interface expectations.

## The Development Plan

We will start simple with essential requirements and develop incrementally to achieve key results, a bit at a time. Implementer should focus exclusively on achieving one incremental result at a time.

BACKLOGGED items SHOULD be considered in the structural design, but implementation MUST focus entirely on IN-PROGRESS requirements. COMPLETED requirements that are working MUST be retained in working order. NEXT requirements are those that can be implemented and work, based on having their dependencies already working or sufficiently stubbed.

Any "TBD" items MUST be changed to "FUTURE" instead.

## Functional Areas and Key Requirements

### 1. Storage Format

#### Functional Requirements:

1. **Structured Data**:
   - MUST store wallet data as a JSON object in localStorage
   - MUST include entropy for backup/recovery
   - MUST include derived key bytes for fast loading
   - SHOULD include address and public key for quick reference

2. **Key Management**:
   - MUST store `spendingKey` bytes (derived `Bip32PrivateKey`)
   - MUST store `stakingKey` bytes (derived `Bip32PrivateKey`)
   - MUST use `makeBip32PrivateKey()` for instant key reconstruction

### 2. Migration and Compatibility

#### Functional Requirements:

1. **Legacy Support**:
   - MUST detect existing `"zwk"` localStorage key (legacy format)
   - MUST migrate legacy wallets to new format on first load
   - MUST preserve the same wallet address after migration

2. **Format Detection**:
   - MUST check for new `"zWallet"` key first
   - MUST fall back to legacy key if new format not found
   - MUST handle corrupted or invalid stored data gracefully

### 3. Wallet Creation

#### Functional Requirements:

1. **New Wallet Flow**:
   - MUST generate cryptographically secure entropy using `makeRandomRootPrivateKey()`
   - MUST derive spending and staking keys using standard BIP44 paths
   - MUST save complete wallet data to new storage format

2. **Wallet Loading**:
   - MUST use cached `Bip32PrivateKey` bytes when available (fast path)
   - MUST use `makeSimpleWallet(spendingKey, stakingKey, client)` overload
   - MUST avoid `makeRootPrivateKey()` on cached wallet loads

---

# Requirements

## Component: zWallet Storage

### REQT-1.0/34mp64786n: COMPLETED: **Storage Format**

#### Purpose: Establishes the canonical localStorage data structure for zWallet persistence. Read these requirements when reviewing wallet data handling, debugging storage issues, or planning storage-related changes. Ensures consistent, extensible data format across all wallet operations.

 - **REQT-1.0.1**/27sj63wcb8: COMPLETED: **Storage Key** - MUST use `"zWallet"` as the localStorage key for the new structured format.
 - **REQT-1.0.2**/jat4960pc5: COMPLETED: **JSON Structure** - MUST store wallet data as a JSON object with the following fields:
   - `entropy`: hex-encoded original entropy bytes for backup/recovery
   - `spendingKey`: hex-encoded `Bip32PrivateKey.bytes` for spending operations
   - `stakingKey`: hex-encoded `Bip32PrivateKey.bytes` for staking operations
   - `pubKey`: hex-encoded public key bytes
   - `address`: bech32-encoded wallet address
 - **REQT-1.0.3**/44gyep870d: COMPLETED: **Hex Encoding** - MUST use `bytesToHex()` and `hexToBytes()` from `@helios-lang/codec-utils` for byte array serialization.

### REQT-1.1/bc1cqwgycr: COMPLETED: **Fast Loading Path**

#### Purpose: Governs the performance-critical wallet loading flow. Read these requirements when investigating load-time issues, reviewing the cache strategy, or modifying wallet initialization. Ensures sub-50ms wallet connection for cached wallets.

 - **REQT-1.1.1**/6df39ysvxr: COMPLETED: **Key Reconstruction** - MUST use `makeBip32PrivateKey(bytes)` to reconstruct `Bip32PrivateKey` objects from cached bytes, bypassing expensive BIP39 derivation.
 - **REQT-1.1.2**/4rppsk59az: COMPLETED: **SimpleWallet Creation** - MUST use the `makeSimpleWallet(spendingKey, stakingKey, networkClient)` overload that accepts `Bip32PrivateKey` directly.
 - **REQT-1.1.3**/6w575z6eyf: COMPLETED: **Cache Validation** - MUST verify that stored data contains both `spendingKey` and `stakingKey` before using the fast path; otherwise fall back to derivation.

## Component: zWallet Migration

### REQT-2.0/bbgzj65a1s: COMPLETED: **Legacy Format Support**

#### Purpose: Guarantees backward compatibility with existing zWallet installations. Read these requirements when troubleshooting migration issues, reviewing legacy data handling, or planning deprecation of old formats. Ensures no user loses wallet access due to format changes.

 - **REQT-2.0.1**/dq67zpdkws: COMPLETED: **Legacy Detection** - MUST check for `"zwk"` localStorage key when `"zWallet"` key is not present or invalid.
 - **REQT-2.0.2**/v79dgjrmkt: COMPLETED: **Entropy Preservation** - MUST use the entropy from `"zwk"` to derive the same wallet keys, ensuring address continuity.
 - **REQT-2.0.3**/h90f9m56at: COMPLETED: **Automatic Migration** - MUST automatically save migrated wallet data to the new `"zWallet"` format after successful derivation.

### REQT-2.1/kvegtqnajj: COMPLETED: **Error Handling**

#### Purpose: Establishes resilient error recovery for wallet data operations. Read these requirements when debugging wallet load failures, reviewing exception handling, or adding new storage fields. Ensures wallet remains functional even with corrupted or partial data.

 - **REQT-2.1.1**/at3z4pw26r: COMPLETED: **Parse Errors** - MUST catch JSON parse errors and treat corrupted `"zWallet"` data as absent, triggering migration or creation flow.
 - **REQT-2.1.2**/brjspdkqh7: COMPLETED: **Incomplete Data** - MUST detect missing required fields (`spendingKey`, `stakingKey`) and fall back to derivation from entropy.

## Component: zWallet Creation

### REQT-3.0/74rfz5b7d4: COMPLETED: **New Wallet Generation**

#### Purpose: Governs secure creation of new zWallet instances. Read these requirements when reviewing entropy generation, auditing key derivation security, or modifying the new-wallet flow. Ensures cryptographically secure wallet creation with immediate persistence.

 - **REQT-3.0.1**/h2904cantc: COMPLETED: **Entropy Generation** - MUST use `makeRandomRootPrivateKey().entropy` for cryptographically secure random entropy.
 - **REQT-3.0.2**/d5cpdcvkxh: COMPLETED: **Key Derivation** - MUST use `makeRootPrivateKey(entropy)` followed by `deriveSpendingKey()` and `deriveStakingKey()` with default parameters (account 0, index 0).
 - **REQT-3.0.3**/0ndjs1fttn: COMPLETED: **Immediate Caching** - MUST save complete wallet data to `"zWallet"` immediately after creation, before returning the wallet instance.

---

## Files

1. `./src/ui/CapoDappProvider.tsx` - Main implementation of zWallet within the `connectWallet()` method

## Implementation Log

Meta-requirements: maintainers MUST NOT modify past details in the implementation log (e.g. in response to architectural changes). Instead, future changes should be appended to the implementation log to show the progression of the implementation and architecture.

### Phase 1: Initial Implementation (Historical)

- Implemented basic zWallet using `"zwk"` localStorage key
- Stored only entropy bytes, requiring derivation on every load
- Used `makeRootPrivateKey(entropy)` → `makeSimpleWallet(rootKey, client)` flow
- Load time: ~500ms due to BIP39 key derivation

### Phase 2: Performance Optimization (Completed - January 2026)

- Introduced new `"zWallet"` structured storage format
- Added caching of derived `Bip32PrivateKey` bytes for spending and staking keys
- Implemented fast path using `makeBip32PrivateKey(bytes)` → `makeSimpleWallet(spendingKey, stakingKey, client)`
- Added automatic migration from legacy `"zwk"` format
- Load time for cached wallets: <50ms

#### Next Recommendations

The zWallet performance optimization is complete. Future enhancements to consider:

1. **Encryption**: Add optional passphrase encryption for stored key material (see `zwallet-encrypt` branch WIP)
2. **Multi-Account**: Support multiple account indices within a single wallet
3. **Mnemonic Export**: Provide UI for users to export/backup their mnemonic phrase

---

# Release Management Plan

## v1 (Current)

- **Goal**: Fast-loading zWallet with backward compatibility
- **Criteria**:
    - Cached wallet loads in <50ms per REQT/bc1cqwgycr (Fast Loading Path)
    - Legacy `"zwk"` wallets migrate automatically per REQT/bbgzj65a1s (Legacy Format Support)
    - Structured JSON storage format per REQT/34mp64786n (Storage Format)

## v2 (Planned)

- **Goal**: Secure encrypted storage
- **Criteria**:
    - Optional passphrase encryption for key material
    - Secure key derivation for encryption (PBKDF2 or Argon2)
    - Graceful handling of incorrect passphrase
