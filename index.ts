export {
    mkValuesEntry,
    mkUutValuesEntries,
    stringToNumberArray,
} from "./src/utils.js";
export {
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
    datumAsString,
    hexToPrintableString,
    dumpAny,
} from "./src/diagnostics.js";

export { UutName, type SeedAttrs } from "./src/delegation/UutName.js";
export {
    Capo,
    type CapoBaseConfig,
    type MinimalDelegateLink,
} from "./src/Capo.js";

export { CapoWithoutSettings } from "./src/CapoWithoutSettings.js";

export type {
    MintUutActivityArgs,
    FoundUut,
    uutPurposeMap,
    hasAllUuts,
    hasUutContext,
    hasBootstrappedConfig,
    hasCharterRef,
} from "./src/Capo.js";

export type {
    OffchainSettingsType,
    OnchainSettingsType,
    SettingsAdapterFor,
    OffchainType,
} from "./src/CapoSettingsTypes.js";

export {
    delegateRoles,
    defineRole,
} from "./src/delegation/RolesAndDelegates.js";

export type {
    RoleMap,
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
    utxoPredicate,
    anyDatumProps,
    configBase as paramsBase,
    StellarFactoryArgs,
    hasSeed,
    ConfigFor,
} from "./src/StellarContract.js";

export { 
    DatumAdapter, 
    type BigIntRecord,
    type Numeric,
    type inferOffchainType,
    type inferOffchainNumericType,
    type UplcFor,
} from "./src/DatumAdapter.js";

export { 
    DelegatedDatumAdapter,
    type AnyDataTemplate,
} from "./src/DelegatedDatumAdapter.js";

export { CapoMinter } from "./src/minting/CapoMinter.js";
export type { CharterDatumProps, hasSettingsRef } from "./src/Capo.js";

import type { CharterDatumProps } from "./src/Capo.js";

/**
 * @deprecated - use CharterDatumProps instead
 */
export type DefaultCharterDatumArgs = CharterDatumProps;

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

export { helios };
export { mkHeliosModule } from "./src/HeliosModuleSrc.js";
export type { HeliosModuleSrc } from "./src/HeliosModuleSrc.js";
export { heliosRollupLoader } from "./src/heliosRollupLoader.js";
export * from "./src/testing/index.js";
