import type { CharterDataLike } from "./src/CapoTypes.js";
export type { 
    tagOnly,
    EnumTypeMeta, singleEnumVariantMeta, 
} from "./src/helios/HeliosMetaTypes.js";

export { 
    mkDeployedScriptConfigs,
    mkCapoDeploymentJSON,
    parseCapoJSONConfig
} from "./src/configuration/DeployedScriptConfigs.js";

export {
    mkValuesEntry,
    mkUutValuesEntries,
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
    hexToPrintableString,
    dumpAny,
    betterJsonSerializer,
} from "./src/diagnostics.js";
export {uplcDataSerializer} from "./src/delegation/jsonSerializers.js";

export { UutName } from "./src/delegation/UutName.js";
export {
    Capo
} from "./src/Capo.js";
export { CapoWithoutSettings } from "./src/CapoWithoutSettings.js";

export type {
    MintUutActivityArgs,
    CharterData,
    CharterDataLike,
    CharterDataLike as CharterDatumProps,
    FoundDatumUtxo,
    FoundUut,
    uutPurposeMap,
    DelegatedDataPredicate,
    hasAllUuts,
    hasBootstrappedCapoConfig,
    hasCharterRef,
    hasSettingsRef,
    hasUutContext,
    CapoConfig,
    CapoConfig as CapoBaseConfig,
    MinimalDelegateLink,
    dgtStateKey,
    hasNamedDelegate,
    MinimalCharterDataArgs
} from "./src/CapoTypes.js";
export {
    mkDgtStateKey
} from "./src/CapoTypes.js";

export { type utxoPredicate, UtxoHelper } from "./src/UtxoHelper.js";

export {
    delegateRoles,
    defineRole,
} from "./src/delegation/RolesAndDelegates.js";

export type {
    DelegateMap,
    DelegateSetup,
    delegateConfigValidation,
    delegateConfigValidation as strategyValidation,
    capoDelegateConfig,
    ErrorMap,
    ConfiguredDelegate,
    OffchainPartialDelegateLink,
    DelegateConfigDetails,
} from "./src/delegation/RolesAndDelegates.js";

export type { SeedTxnScriptParams } from "./src/SeedTxnScriptParams.js";
export { BasicMintDelegate } from "./src/minting/BasicMintDelegate.js";

export {
    StellarContract,
    Activity,
    txn,
    partialTxn,
    datum,
    findInputsInWallets
} from "./src/StellarContract.js";

export { StellarDelegate } from "./src/delegation/StellarDelegate.js";
export {
    ContractBasedDelegate,
    type NamedPolicyCreationOptions,
} from "./src/delegation/ContractBasedDelegate.js";

export type {
    GenericDelegateBridge,
    GenericDelegateBridgeClass,
    GenericDelegateDatum,
    SomeDgtActivityHelper,
    SomeDgtBridgeReader,
    SomeDgtDatumHelper,
} from "./src/delegation/GenericDelegateBridge.js";

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
    type SubmitOptions,
} from "./src/StellarTxnContext.js";

export {
    type SeedAttrs,
    type isActivity,
    type hasSeed,
    type seedActivityFunc,
    type SeedActivityArg,
    type funcWithImpliedSeed,
    SeedActivity,
    impliedSeedActivityMaker,
    getSeed,
} from "./src/ActivityTypes.js";

export type {
    stellarSubclass,
    anyDatumProps,
    configBaseWithRev as configBase, // as paramsBase,
    StellarSetupDetails as StellarFactoryArgs,
    StellarSetupDetails,
    ActorContext,
    NetworkContext,
    SetupInfo,
    ConfigFor,
} from "./src/StellarContract.js";

export {
    type AnyDataTemplate,
    type hasAnyDataTemplate,
    type minimalData,
} from "./src/delegation/DelegatedData.js";

export {
    type DgDataCreationAttrs,
    type DelegatedDatumTypeName,
    type updateActivityFunc,
    type DgDataType,
    type DgDataTypeLike,
    type minimalDgDataTypeLike,
    type DgDataCreationOptions,
    type DgDataUpdateOptions,    
    DelegatedDataContract,
} from "./src/delegation/DelegatedDataContract.js";

export {
    WrappedDgDataContract,
    type WrappedDgDataType,
} from "./src/delegation/WrappedDgDataContract.js";

export * from "./src/helios/dataBridge/BridgeTypes.js";

export { CapoHeliosBundle } from "./src/CapoHeliosBundle.js";
export {
    ContractDataBridge,
    DataBridge,
    DataBridgeReaderClass,
    ContractDataBridgeWithEnumDatum,
    ContractDataBridgeWithOtherDatum,
    type DataBridgeOptions,
    type callWith,
} from "./src/helios/dataBridge/DataBridge.js";
export type { 
    IntersectedEnum,
    AbstractNew,
    Expand,
    IF,
    IFISNEVER,
    IF_ISANY,
    ISNEVER,
    NEVERIF,
    OR,
 } from "./src/helios/typeUtils.js";
export {
    EnumBridge,
    type JustAnEnum,
    type Nested,
    type NotNested,
} from "./src/helios/dataBridge/EnumBridge.js";

export {
    CapoMinter,
    type BasicMinterParams,
} from "./src/minting/CapoMinter.js";


/**
 * @deprecated - use CharterDataLike instead
 * @internal
 */
export type DefaultCharterDatumArgs = CharterDataLike;
export * from "./src/helios/index.js";
export { CapoDelegateBundle } from "./src/delegation/CapoDelegateBundle.js";
export { HeliosScriptBundle } from "./src/helios/HeliosScriptBundle.js";

export type {
    tokenNamesOrValuesEntry,
    InlineDatum,
    valuesEntry,
} from "./src/HeliosPromotedTypes.js";

export {
    bytesToText,
    textToBytes,
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


// export * from "./src/testing/index.js";

// export type { TestHelperState } from "./src/testing/types.js";
