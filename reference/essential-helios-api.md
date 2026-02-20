# Helios off-chain SDK essentials (agent quick-start)

## Context: MUST READ

WARNING: Helios on-chain builtins are often closely aligned to the OFFCHAIN Typescript SDK, but they ARE DIFFERENT.

- Scope: summaries for the Helios JS/TS off-chain SDK docs mirrored under `reference/helios-lang/sdk`; use this as a jumpstart, then open the matching `.html` file for exact signatures.
- Versions present: ledger v0.7.15 (`ledger/index.html`), tx-utils v0.6.21 (`tx-utils/index.html`).
- Doc naming mirrors Docusaurus IDs (e.g., `Address.html`, `makeTx.html`); search those filenames to jump to details.
- Pairs with on-chain language notes in `essential-helios-lang.md` and builtins in `essential-helios-builtins.md`; this file stays focused on off-chain helpers.
    - On-chain types are VERY similar in places, but the off-chain typescript API IS DIFFERENT from the on-chain types.
- Orientation: ledger module gives typed ledger objects + conversions; tx-utils adds clients, wallets, coin selection, and tx builders.

## codec-utils (`@helios-lang/codec-utils`)
Low-level byte/string utilities used throughout the Helios SDK and stellar-contracts. Already a transitive dependency — import directly.

- **Byte comparison**: `equalsBytes(a, b)` — compares two `number[]` or `Uint8Array` values element-by-element. **This is the correct way to compare on-chain byte arrays** (hashes, token names, datum IDs, script hashes). JavaScript `===`/`==` on arrays checks reference identity, not contents, so it will silently return `false` for identical byte values. Typed Helios hash objects (`MintingPolicyHash`, `ValidatorHash`, etc.) provide `.isEqual(other)` which calls `equalsBytes` internally — use that when you have typed hashes, and `equalsBytes` when you have raw `number[]` (e.g., from `UplcProgram.hash()`).
- **Byte/hex conversion**: `bytesToHex(bytes)`, `hexToBytes(hex)`, `isValidHex(str)`.
- **String/byte conversion**: `encodeUtf8(str)` → `number[]`, `decodeUtf8(bytes)` → `string`. Common for token name encoding.
- **Byte ordering**: `compareBytes(a, b)` → `-1 | 0 | 1` (lexicographic).
- **Type coercion**: `toBytes(bytesLike)` normalizes `BytesLike` (hex string, `number[]`, or `Uint8Array`) to `number[]`.

## ledger v0.7.15 (ledger/index.html — https://helios-lang.io/docs/sdk/ledger/)
- Purpose: mainnet ledger primitives—`Address`, `AssetClass`, `DCert`, pools, `TimeRange`, `Tx`, `TxInput`, `TxOutput`, `Value`, etc.
- Era coverage: Byron → Conway (listed on the page).
- Construction helpers: extensive `make*` functions for addresses (Shelley/Byron/staking), scripts (After/Before/All/Any/AtLeast/Sig), hashes (validator/minting/pubkey/staking), redeemers/contexts (spending/minting/staking/rewarding/certifying), datums (inline/hashed), values/assets, tx parts (body/output/input/witnesses/metadata/ids), and network parameter helpers.
- Conversions & validation: `decode*`/`encode*` for addresses, tx parts, metadata, native scripts; `convertUplcDataTo*` and inverse helpers for bridging on-chain data; `isValid*` guards for bech32, hashes, tx ids, CBOR payloads; comparison helpers across ids/hashes/inputs/outputs/assets.
- Parameters & constants: Babbage/Conway cost model and network params (`BABBAGE_*`, `CONWAY_GENESIS_PARAMS`, `DEFAULT_NETWORK_PARAMS`, `DEFAULT_TX_OUTPUT_ENCODING_CONFIG`); time/unit helpers (`TimeRange`, `TimeLike`, `toTime`).
- Errors/types: `UtxoNotFoundError`, `UtxoAlreadySpentError`; strong hash/address types (`ValidatorHash`, `MintingPolicyHash`, `PubKeyHash`, staking creds); `UplcDataConverter` for custom bridging.

### Miscellaneous ledger helpers (URLs under https://helios-lang.io/docs/sdk/ledger/)
- Constructors: `makeAddress`, `makeShelleyAddress`, `makeByronAddress`, `makeStakingAddress`, `makeMintingPolicyHash`, `makeValidatorHash`, `makePubKeyHash`, `makeAssetClass`, `makeAssets`, `makeValue`, `makeTx`, `makeTxBody`, `makeTxOutput`, `makeTxInput`, `makeTxId`, `makeTxOutputId`, `makeTimeRange`, `makeTokenValue`, datum helpers (`makeInlineTxOutputDatum`, `makeHashedTxOutputDatum`), redeemer/context factories (`makeTxSpendingRedeemer`, `makeTxMintingRedeemer`, `makeTxRewardingRedeemer`, `makeTxCertifyingRedeemer`, `makeScriptContextV2`).
- Decoders/encoders: `decode*`/`encode*` for addresses (Byron/Shelley/staking), tx pieces (body/input/output/outputId/metadata/redeemer/witnesses), hashes (datum/minting/pubkey/validator/staking), native scripts, and `decodeValue`/`decodeAssets`/`decodeAssetClass`.
- UPLC/bridging: `convertUplcDataTo*` / `convert*ToUplcData` for addresses, credentials, hashes, asset classes, values, tx parts, time ranges.
- Validation/comparison: `isValid*` guards for bech32 addresses, staking addresses, hashes, tx ids, tx CBOR; `compare*` helpers for asset classes, hashes, staking creds/addresses, inputs, output ids.
- Parameters/constants: `BABBAGE_COST_MODEL_PARAMS_V1/V2`, `BABBAGE_NETWORK_PARAMS`, `BABBAGE_PARAMS`, `CONWAY_GENESIS_PARAMS`, `SHELLEY_GENESIS_PARAMS`, `DEFAULT_CONWAY_PARAMS`, `DEFAULT_NETWORK_PARAMS`, `DEFAULT_TX_OUTPUT_ENCODING_CONFIG`.
- Dummy/test data makers: `makeDummy*` variants for addresses, hashes, tx ids/output ids, pubkeys, signatures, staking addresses/validators, asset classes.

### AssetClass (ledger/AssetClass.html — https://helios-lang.io/docs/sdk/ledger/AssetClass)
- Properties/methods: `isEqual`, `isGreaterThan`, `kind` = "AssetClass"; `mph` minting policy hash; `tokenName` bytes; `toCbor()`, `toFingerprint()`, `toString()`, `toUplcData()`.

### Value (ledger/Value.html — https://helios-lang.io/docs/sdk/ledger/Value)
- Arithmetic & checks: `add`, `subtract`, `multiply`, `assertAllPositive` (throws on negatives).
- Queries: `lovelace` bigint; `assets` (`Assets`); `assetClasses` array.
- Comparison: `isEqual`, `isGreaterOrEqual`, `isGreaterThan`.
- Serialization: `toCbor()`, `toUplcData(isInScriptContext?)` (script-context mode prepends 0-lovelace and sorts tokens to match node evaluation); `dump`, `copy`.
- Tag: `kind` = "Value".

### Tx (ledger/Tx.html — https://helios-lang.io/docs/sdk/ledger/Tx)
- Core parts: `body: TxBody`, `witnesses: TxWitnesses`, `metadata?: TxMetadata`, `hasValidationError` state, `id()` -> `TxId`.
- Size/fee/collateral: `calcSize(forFeeCalculation?)`, `calcMinFee(params)`, `calcMinCollateral(params, recalcMinBaseFee?)`.
- Validation: `validate(params, options?)`, `validateUnsafe(params, options?)`, `validateSignatures()`, `isValid()`, `isValidSlot(slot)`, `isSmart()`, `recover(network)` (fetch UTxOs to fill inputs).
- Signatures: `addSignature(sig, verify?)`, `addSignatures(sigs, verify?)`.
- Metadata helpers: `clearMetadata()`, `dump()`.
- Serialization: `toCbor(forFeeCalculation?)`.

### TxInput (ledger/TxInput.html — https://helios-lang.io/docs/sdk/ledger/TxInput)
- Fields: `id: TxOutputId`, `address: Address`, `value: Value`, `datum?: TxOutputDatum`, `output: TxOutput` (error if not recovered), `kind` = "TxInput".
- Utilities: `copy()`, `dump()`, `isEqual(other)`, `toCbor(full?)` (ledger format omits output unless `full`), `toUplcData()`.
- Recovery: `recover(network.getUtxo)` to load the referenced output from a tx that has been deserialized / fetched from a network index like Blockfrost.

### TxOutput (ledger/TxOutput.html — https://helios-lang.io/docs/sdk/ledger/TxOutput)
- Fields: `address: Address`, `value: Value`, `datum?: TxOutputDatum`, `refScript` (UPLC program or undefined), `encodingConfig: TxOutputEncodingConfig`, `kind` = "TxOutput".
- Utilities: `calcDeposit(params)` (stake credential deposit), `correctLovelace(params, updater?)` adjusts min ada (optional updater hook), `copy()`, `dump()`, `toCbor()`, `toUplcData()`.

### Address (ledger/Address.html — https://helios-lang.io/docs/sdk/ledger/Address)
- Type alias: `Address<SC extends SpendingCredential = SpendingCredential> = ByronAddress | ShelleyAddress<SC>`.

### TimeRange (ledger/TimeRange.html — https://helios-lang.io/docs/sdk/ledger/TimeRange)
- Properties: `start` and `end` numbers; optional `finiteStart`, `finiteEnd`; inclusion flags `includeStart`, `includeEnd`; `kind` = "TimeRange".
- Methods: `toString()`, `toUplcData(): ConstrData`.

### NetworkParams (ledger/NetworkParams.html — https://helios-lang.io/docs/sdk/ledger/NetworkParams)
- Fee/cost limits: `txFeeFixed`, `txFeePerByte`, `exMemFeePerUnit`, `exCpuFeePerUnit`, `refScriptsFeePerByte`, `maxTxSize`, `maxTxExMem`, `maxTxExCpu`.
- Collateral: `collateralPercentage`, `maxCollateralInputs`, optional `collateralUTXO?: string`.
- Deposits/timing: `stakeAddrDeposit`, `utxoDepositPerByte`, `secondsPerSlot`, `refTipSlot`, `refTipTime`.
- Cost models: `costModelParamsV1`, `costModelParamsV2`, `costModelParamsV3` (number arrays).
## tx-utils v0.6.21 (tx-utils/index.html — https://helios-lang.io/docs/sdk/tx-utils/)
- Purpose: off-chain execution helpers—coin selection, query clients, wallets, tx building/summarizing, Hydra tooling.
- Wallets/keys: `SimpleWallet`/`OfflineWallet` plus JSON-safe helpers; BIP39/BIP32 (`BIP39_DICT_EN`, `makeBip32PrivateKey`, `makeRootPrivateKey`, `makeRandom*`); CIP-30 wallet handles and COSE sign helpers.
- Clients: `CardanoClient` (+ helper/options), `BlockfrostV0Client`, `KoiosV0Client`, `ReadonlyCardanoClient`, `makeReadonlyCardanoMultiClient`, `CardanoTxSubmitter`; resolver helpers for Blockfrost/Koios.
- Tx build/inspect: `TxBuilder` (+ config/final config), `TxChain`/`TxChainBuilder`, `makeTxBuilder`, `makeTxChain`, `makeTxSummary`, `summarizeTx`, `TxSummary`/`TxSummaryJsonSafe`, `ExtendedTxInfo`, `TxBlockInfo`.
- Coin selection: `CoinSelection`, strategies `selectLargestFirst`/`selectSmallestFirst`/`selectSingle`, plus `consolidate`.
- UTxO + refs: ref script registries (`RefScriptRegistry`, cached/readonly variants), `superimposeUtxosOnSummaries`, `maskWallet`, submission errors (`SubmissionExpiryError`, `SubmissionUtxoError`), spent/not-found errors mirrored from ledger.
- Time helpers: `MILLISECOND`/`SECOND`/`MINUTE`/`HOUR`/`DAY`/`WEEK`, default validity offsets (`DEFAULT_TX_VALIDITY_OFFSETS`).
- Hydra: rich message types (`Hydra*Message`, `HydraTx*`, `HydraClient` + options), `HydraRefScript`, `HydraTxOutput`; for head protocol integrations.
- Safety/validation: `assertOfflineWalletJsonSafe`/`expectOfflineWalletJsonSafe`/`isOfflineWalletJsonSafe`; `isTxSummaryJsonSafe`; encode/decode CIP-30 COSE helpers.

### Miscellaneous tx-utils helpers (URLs under https://helios-lang.io/docs/sdk/tx-utils/)
- Keys: `RootPrivateKey` (`RootPrivateKey.html`), `makeRootPrivateKey(bytes: number[])`, `makeRandomRootPrivateKey()`, `makeRandomBip32PrivateKey()`.
- Wallet factories: `makeRandomSimpleWallet(cardanoClient) -> SimpleWallet`, `makeUnstakedSimpleWallet(cardanoClient) -> SimpleWallet`, `makeCip30Wallet(handle) -> Wallet`.
- Readonly clients/wallets: `ReadonlyCardanoClient` (`ReadonlyCardanoClient.html`), `ReadonlyWallet` (`ReadonlyWallet.html`).
- Types/constants: `AssetClassInfo` (`AssetClassInfo.html`), `BIP39_DICT_EN` (`BIP39_DICT_EN.html`), `NetworkName` (`NetworkName.html`).
- Emulator tools: `Emulator` (`Emulator.html`), `makeEmulator(options?)`, `makeEmulatorGenesisTx(...)`, `makeEmulatorRegularTx(...)`.
- Helper factory: `makeWalletHelper(wallet) -> WalletHelper` (`makeWalletHelper.html`).

### TxBuilder (tx-utils/TxBuilder.html — https://helios-lang.io/docs/sdk/tx-utils/TxBuilder)
- add inputs/outputs and required scripts: `addOutput` (sorts assets; errors on non-positive entries or missing datum to non-native-script validator), `addCollateral`, `addDCert`, `addSigners`, `attachNativeScript`, `attachUplcProgram`, `refer` (reference inputs), `inputs`, `outputs`.
- chaining/control: `apply(fn)` (composes mutations, return unused); `reset` clears builder.
- build vs buildUnsafe: `build` throws validation errors (default `throwBuildPhaseScriptErrors` true; can defer to validate by setting false); tx may still need signatures. `buildUnsafe` always returns a validation-checked tx; script errors thrown if `throwBuildPhaseScriptErrors` is true; otherwise inspect `Tx.hasValidationError`.
- spending: `spendUnsafe`, `spendWithRedeemer`, `spendWithoutRedeemer`, `spendWithLazyRedeemer`; `spendUnsafe` errors if a script UTxO lacks redeemer unless script is known `NativeScript`.
- minting: `mintAssetClassUnsafe` / `mintAssetClassWithRedeemer` / `mintAssetClassWithoutRedeemer` / `mintAssetClassWithLazyRedeemer`; policy-level minting via `mintPolicyTokensUnsafe` (errors if policy reused in same tx, token names must be bytes/hex, redeemer required for non-`NativeScript`), `mintPolicyTokensWithRedeemer`, `mintPolicyTokensWithoutRedeemer`; token-level via `mintTokenValueWithRedeemer`, `mintTokenValueWithoutRedeemer`; `mintedTokens` exposes accumulated `Assets`. Note: a specific minting policy can only be used once per transaction, but you can mint multiple tokens for that policy in that single use. See source docs for overload details.
- payments: `payUnsafe` (optional datum), `payWithDatum`, `payWithoutDatum`.
- metadata/script/datum checks: `setMetadataAttribute`, `setMetadataAttributes`, `hasMetadata`; `hasUplcScripts`; `hasDatum`.
- ref data & sums: `refInputs`; `sumInputAndMintedAssets` (excludes lovelace), `sumOutputAssets` (excludes lovelace), `sumOutputValue`.
- validity window: `validFromSlot`, `validFromTime`, `validToSlot`, `validToTime`.  Prefer time-based validity windows. 
- staking ops: delegation (`delegateUnsafe`, `delegateWithRedeemer`, `delegateWithoutRedeemer`), deregistration (`deregisterUnsafe`, `deregisterWithRedeemer`, `deregisterWithoutRedeemer`), withdrawals (`withdrawUnsafe`, `withdrawWithRedeemer`, `withdrawWithLazyRedeemer`, `withdrawWithoutRedeemer`). See source docs for overload signatures.

### CardanoClient (tx-utils/CardanoClient.html — https://helios-lang.io/docs/sdk/tx-utils/CardanoClient)
- Core queries: `getUtxo(id)`, `getUtxos(address)`, optional `getTx(id)`, optional `getUtxosWithAssetClass(address, assetClass)` (filtered UTxOs).
- State checks: `hasUtxo(utxoId)`, `isMainnet()`, `now` number (ms since epoch on mainnet; arbitrary reference for emulator).
- Network data: `parameters` (Promise of `NetworkParams`), `submitTx(tx)` returns `TxId`.

### SimpleWallet (tx-utils/SimpleWallet.html — https://helios-lang.io/docs/sdk/tx-utils/SimpleWallet)
- Identity & keys: `address`, `spendingPubKey`, `spendingPubKeyHash`, `spendingPrivateKey`; staking variants `stakingAddress`, `stakingAddresses`, `stakingPubKey`, `stakingPubKeyHash`.
- Chain access: `cardanoClient`; `isMainnet()` Promise; `utxos` Promise; `collateral` Promise (no collateral defined; lets TxBuilder use regular inputs); `unusedAddresses` (empty list), `usedAddresses` (assumes at least one UTxO at pubkeyhash address).
- Signing: `signTx(tx)`; `signData(addr, data)` returns `{ key: PubKey, signature: Cip30CoseSign1 }` using spending or staking key per address.
- Submit: `submitTx(tx)` returns `TxId`.

### CardanoTxSubmitter (tx-utils/CardanoTxSubmitter.html — https://helios-lang.io/docs/sdk/tx-utils/CardanoTxSubmitter)
- Minimal submitter subset of `CardanoClient`: `isMainnet`, `submitTx`, `getTx`, `hasUtxo`.

### WalletHelper (tx-utils/WalletHelper.html — https://helios-lang.io/docs/sdk/tx-utils/WalletHelper)
- Addresses & network: `allAddresses`, `baseAddress`, `changeAddress`, `unusedAddresses`, `usedAddresses`, `stakingAddresses`, `isMainnet()`, `refUtxo` (first UTxO, useful for distinguishing preview/preprod).
- Balances & UTxOs: `calcBalance()` sums all `utxos`; `utxos` Promise; `collateral` Promise (UTxOs suitable for collateral); `selectCollateral(amount?)` (defaults 2 Ada), `selectUtxo(value)` (single), `selectUtxos(amount, coinSelection?)` (defaults smallest-first; optional `CoinSelection` override), `isOwnAddress(addr)`, `isOwnPubKeyHash(pkh)`.
- Signing/submitting (when underlying wallet is not Readonly): `signTx(tx)`, `signData(addr, data)` returning `{ key, signature: Cip30CoseSign1 }`, `submitTx(tx)`.
- Serialization/offline: `toJsonSafe()`, `toOfflineWallet()`.
- Access: `wallet` returns underlying wallet.

### Wallet (tx-utils/Wallet.html — https://helios-lang.io/docs/sdk/tx-utils/Wallet)
- Queries: `utxos` (all wallet UTxOs), `collateral` (UTxOs suitable as collateral), `unusedAddresses`, `usedAddresses`, `stakingAddresses`.
- Network: `isMainnet()` Promise.
- Signing: `signTx(tx)` returns `Signature[]`; `signData(addr, data)` returns `{ key: PubKey, signature: Cip30CoseSign1 }`.
- Submit: `submitTx(tx)` returns `TxId`.

### makeSimpleWallet (tx-utils/makeSimpleWallet.html — https://helios-lang.io/docs/sdk/tx-utils/makeSimpleWallet)
- Overload 1: `makeSimpleWallet(key: RootPrivateKey, cardanoClient: CardanoClient) -> SimpleWallet`.
- Overload 2: `makeSimpleWallet(spendingPrivateKey: Bip32PrivateKey, stakingPrivateKey?: Bip32PrivateKey, cardanoClient: CardanoClient) -> SimpleWallet`.

### makeOfflineWallet (tx-utils/makeOfflineWallet.html — https://helios-lang.io/docs/sdk/tx-utils/makeOfflineWallet)
- Construct an `OfflineWallet` from props: `isMainnet` boolean plus `unusedAddresses`, `usedAddresses`, `utxos`; optional `collateral`, optional `stakingAddresses`. Each prop accepts strings or typed values (`Address`, `StakingAddress`, `TxInput`).

### makeTxBuilder (tx-utils/makeTxBuilder.html — https://helios-lang.io/docs/sdk/tx-utils/makeTxBuilder)
- Factory: `makeTxBuilder(config: TxBuilderConfig) -> TxBuilder`.

### Bip32PrivateKey (tx-utils/Bip32PrivateKey.html — https://helios-lang.io/docs/sdk/tx-utils/Bip32PrivateKey)
- Properties/methods: `bytes` raw key bytes; `derive(i)` child key; `derivePath(path: number[])` multi-step derivation; `derivePubKey()` to `PubKey`; `sign(message: number[])` returns `Signature`.

### makeBip32PrivateKey (tx-utils/makeBip32PrivateKey.html — https://helios-lang.io/docs/sdk/tx-utils/makeBip32PrivateKey)
- Factory: `makeBip32PrivateKey(bytes: number[]) -> Bip32PrivateKey`.

### makeBip32PrivateKeyWithBip39Entropy (tx-utils/makeBip32PrivateKeyWithBip39Entropy.html — https://helios-lang.io/docs/sdk/tx-utils/makeBip32PrivateKeyWithBip39Entropy)
- Factory: `makeBip32PrivateKeyWithBip39Entropy(entropy: number[], force: boolean) -> Bip32PrivateKey`.

### makeBlockfrostV0Client (tx-utils/makeBlockfrostV0Client.html — https://helios-lang.io/docs/sdk/tx-utils/makeBlockfrostV0Client)
- Factory: `makeBlockfrostV0Client(networkName: NetworkName, projectId: string) -> BlockfrostV0Client`.

### makeCardanoClientHelper (tx-utils/makeCardanoClientHelper.html — https://helios-lang.io/docs/sdk/tx-utils/makeCardanoClientHelper)
- Factory: `makeCardanoClientHelper<C extends ReadonlyCardanoClient>(client: C, options: CardanoClientHelperOptions) -> CardanoClientHelper<C>`.

### CardanoClientHelperOptions (tx-utils/CardanoClientHelperOptions.html — https://helios-lang.io/docs/sdk/tx-utils/CardanoClientHelperOptions)
- Optional hook: `onSelectUtxoFail?(address: Address, value: Value) => Promise<void>` to handle coin-selection failure.

### BlockfrostV0Client (tx-utils/BlockfrostV0Client.html — https://helios-lang.io/docs/sdk/tx-utils/BlockfrostV0Client)
- Queries: `getUtxo(id)`, `getUtxos(address)` (oldest first), `getUtxosWithAssetClass(address, assetClass)`, `getAddressesWithAssetClass(assetClass)` returning `{ address, quantity }`, `getAddressTxs(address)` returning `TxBlockInfo[]`.
- Tx fetch: `getTx(id)` (Conway+ only), `getTxInfo(txId)` all eras.
- Presence checks: `hasUtxo(utxoId)`, `hasTx(txId)`.
- Network/info: `networkName`, `isMainnet()`, `now` number, `parameters` Promise (two API calls), `latestEpoch` Promise, `projectId` string.
- Submit: `submitTx(tx)` returns `TxId`.
- Utility: `dumpMempool()` logs live Blockfrost mempool to console.

### CardanoClientHelper (tx-utils/CardanoClientHelper.html — https://helios-lang.io/docs/sdk/tx-utils/CardanoClientHelper)
- Wraps a `ReadonlyCardanoClient`: `client`, `options`, `networkName` via `client`.
- Balance/UTxO: `calcBalance(address) -> Value`; `getUtxo(id, addr?)`; `getUtxos(address)`; `getUtxosWithAssetClass(address, assetClass)`.
- Selection: `selectUtxo(address, value)` for specific tokens (invokes `onSelectUtxoFail` on miss); `selectUtxos(address, value, coinSelection?)` defaults to `selectSmallestFirst`.
- Checks: `hasUtxo(id)`, `isMainnet()`, `now` number, `parameters` Promise.
- Submit passthrough: `submitTx(tx)` only when underlying client is a `CardanoClient` (not readonly).
