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

export { UutName } from "./src/delegation/UutName.js";
export { Capo, 
    type CapoBaseConfig,     
    type MinimalDelegateLink
} from "./src/Capo.js";
export type {
    MintUutActivityArgs,
    FoundUut,
    uutPurposeMap,
    hasAllUuts,
    hasUutContext,
    RoleMap,
    strategyValidation,
    hasBootstrappedConfig,
} from "./src/Capo.js";

export { 
    type OffchainSettingsType, 
    type OnchainSettingsType, 
    type SettingsAdapterFor
} from "./src/CapoSettingsTypes.js";

export {
    delegateRoles, defineRole, 
} from "./src/delegation/RolesAndDelegates.js"


export type {
    capoDelegateConfig,

    ErrorMap,
    ConfiguredDelegate,
    RelativeDelegateLink,
    VariantStrategy
} from "./src/delegation/RolesAndDelegates.js"

export type { SeedTxnParams } from "./src/SeedTxn.js";
export { BasicMintDelegate } from "./src/minting/BasicMintDelegate.js";

export {
    StellarContract,
    Activity,
    txn,
    partialTxn,
    datum,
} from "./src/StellarContract.js";

export { StellarDelegate } from "./src/delegation/StellarDelegate.js";
export { ContractBasedDelegate, type NamedDelegateCreationOptions  } from "./src/delegation/ContractBasedDelegate.js";

export { AuthorityPolicy } from "./src/authority/AuthorityPolicy.js";
export { AnyAddressAuthorityPolicy } from "./src/authority/AnyAddressAuthorityPolicy.js";

export { hasReqts, mergesInheritedReqts } from "./src/Requirements.js";
export type { ReqtsMap, RequirementEntry } from "./src/Requirements.js";

export { 
    StellarTxnContext,
    type anyState,
    type SeedAttrs,
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
    ConfigFor
} from "./src/StellarContract.js";

export { DatumAdapter } from "./src/DatumAdapter.js";
export { CapoMinter } from "./src/minting/CapoMinter.js";
export { 
    DefaultCapo, 
    // contract as DefaultCapoContract 
} from "./src/DefaultCapo.js";
export type { 
    DefaultCharterDatumArgs,
} from "./src/DefaultCapo.js";

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

export { helios }
export { mkHeliosModule } from "./src/HeliosModuleSrc.js";
export type { HeliosModuleSrc } from "./src/HeliosModuleSrc.js";
export { heliosRollupLoader } from "./src/heliosRollupLoader.js";
export * from "./src/testing/index.js";