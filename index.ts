export { mkHeliosModule } from "./src/helios/HeliosModuleSrc.js";
export type { HeliosModuleSrc } from "./src/helios/HeliosModuleSrc.js";
export { heliosRollupLoader } from "./src/helios/heliosRollupLoader.js";
export {
    mkValuesEntry,
    mkUutValuesEntries,
    stringToNumberArray,
    realDiv,
    debugMath,
    realMul,
    toFixedReal,
} from "./src/utils.js";
export {
    displayTokenName,
    stringToPrintableString,
    assetsAsString,
    txAsString,
    utxoAsString,
    valueAsString,
    utxosAsString,
    policyIdAsString,
    txOutputAsString,
    txInputAsString,
    lovelaceToAda,
    errorMapAsString,
    addrAsString,
    byteArrayAsString,
    txidAsString,
    txOutputIdAsString,
    byteArrayListAsString,
    datumSummary,
    datumExpanded,
    hexToPrintableString,
    dumpAny,
    betterJsonSerializer,
} from "./src/diagnostics.js";

export { UutName, type SeedAttrs } from "./src/delegation/UutName.js";
export {
    Capo,
    type CapoConfig as CapoBaseConfig,
    type MinimalDelegateLink,
} from "./src/Capo.js";

export { CapoWithoutSettings } from "./src/CapoWithoutSettings.js";

export type {
    MintUutActivityArgs,
    CharterDatumProps,
    FoundDatumUtxo,
    FoundUut,
    uutPurposeMap,
    DelegatedDataPredicate,
    hasAllUuts,
    hasBootstrappedCapoConfig as hasBootstrappedConfig,
    hasCharterRef,
    hasSettingsRef,
    hasUutContext,
} from "./src/Capo.js";

export { type utxoPredicate, UtxoHelper } from "./src/UtxoHelper.js";

export { SettingsAdapter } from "./src/CapoSettingsTypes.js";
export type {
    ParsedSettings,
    WrappedSettingsAdapterBridge,
    // CapoOffchainSettingsType,
    // CapoOnchainSettingsType,
    // CapoSettingsAdapterFor,
    DatumAdapterOffchainType,
} from "./src/CapoSettingsTypes.js";

export {
    delegateRoles,
    defineRole,
} from "./src/delegation/RolesAndDelegates.js";

export type {
    RoleMap,
    RoleInfo,
    strategyValidation,
    capoDelegateConfig,
    ErrorMap,
    ConfiguredDelegate,
    RelativeDelegateLink,
    VariantStrategy,
} from "./src/delegation/RolesAndDelegates.js";

export type { SeedTxnScriptParams } from "./src/SeedTxnScriptParams.js";
export { BasicMintDelegate } from "./src/minting/BasicMintDelegate.js";

export {
    StellarContract,
    Activity,
    txn,
    partialTxn,
    datum,
} from "./src/StellarContract.js";

export { StellarDelegate } from "./src/delegation/StellarDelegate.js";
export {
    ContractBasedDelegate,
    type NamedDelegateCreationOptions,
} from "./src/delegation/ContractBasedDelegate.js";

export { AuthorityPolicy } from "./src/authority/AuthorityPolicy.js";
export { AnyAddressAuthorityPolicy } from "./src/authority/AnyAddressAuthorityPolicy.js";

export { hasReqts, mergesInheritedReqts } from "./src/Requirements.js";
export type { ReqtsMap, RequirementEntry } from "./src/Requirements.js";

export {
    StellarTxnContext,
    type anyState,
    type hasSeedUtxo,
    type hasAddlTxns,
    type TxDescription,
    type MultiTxnCallback,
} from "./src/StellarTxnContext.js";

export type {
    stellarSubclass,
    isActivity,
    anyDatumProps,
    configBaseWithRev as configBase, // as paramsBase,
    StellarFactoryArgs,
    hasSeed,
    ConfigFor,
} from "./src/StellarContract.js";

export { DatumAdapter } from "./src/DatumAdapter.js";
export type {
    BigIntRecord,
    Numeric,
    RawBytes,
    Optional,
    OnchainEnum,
    OnchainEnum2,
    adapterParsedOnchainData,
    offchainDatumType,
    inferOffchainNumericType,
} from "./src/DatumAdapter.js";

export {
    DelegatedDatumAdapter,
    type AnyDataTemplate,
    type hasAnyDataTemplate,
} from "./src/delegation/DelegatedDatumAdapter.js";

export {
    type DgDataCreationAttrs,
    type DelegatedDatumType,
    type DelegatedDatumTypeName,
    type updateActivityFunc,
    type seedActivityFunc,
    DelegatedDataContract,
} from "./src/delegation/DelegatedDataContract.js";

export { CapoHeliosBundle } from "./src/CapoHeliosBundle.js";

export {
    CapoMinter,
    type BasicMinterParams,
} from "./src/minting/CapoMinter.js";

import type { CharterDatumProps } from "./src/Capo.js";

/**
 * @deprecated - use CharterDatumProps instead
 * @internal
 */
export type DefaultCharterDatumArgs = CharterDatumProps;
export * from "./src/helios/index.js";
export { CapoDelegateBundle } from "./src/delegation/CapoDelegateBundle.js";
export { HeliosScriptBundle } from "./src/helios/HeliosScriptBundle.js";

export type {
    tokenNamesOrValuesEntry,
    InlineDatum,
    valuesEntry,
    Datum,
    Tx,
    TxInput,
    Address,
    TxOutput,
    ValidatorHash,
    Value,
    StakingValidatorHash,
    StakeAddress,
    Wallet,
    WalletHelper,
    Network,
} from "./src/HeliosPromotedTypes.js";

// export {
//     Datum,
//     Tx,
//     TxInput,
//     Address,
//     TxOutput,
//     ValidatorHash,
//     Value,
//     StakingValidatorHash,
//     StakeAddress,
// } from "./src/HeliosPromotedTypes.js";
import * as helios from "@hyperionbt/helios";

export {
    StellarNetworkEmulator,
    type NetworkSnapshot,
} from "./src/testing/StellarNetworkEmulator.js";

export { helios };
export * from "./src/testing/index.js";

export type { TestHelperState } from "./src/testing/types.js";
