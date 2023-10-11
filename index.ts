
declare global {
    interface  ImportAttributes {
        type: "json" | "text"
    }
  }
  
export { heliosRollupLoader } from "./lib/heliosRollupLoader.js";

export {
    assetsAsString,
    txAsString,
    utxoAsString,
    valueAsString,
    utxosAsString,
    txOutputAsString,
    txInputAsString,
    lovelaceToAda,
    errorMapAsString,
} from "./lib/diagnostics.js";

export { 
    Capo,
    variantMap,
 } from "./lib/Capo.js";
export type {
    MintUutRedeemerArgs,
    MintCharterRedeemerArgs,
    uutPurposeMap,
    hasSomeUuts,
    hasAllUuts,
    hasUutContext,
    RoleMap,
    strategyValidation,
} from "./lib/Capo.js";

export type {SeedTxnParams} from "./lib/SeedTxn.js"
export { BasicMintDelegate } from "./lib/delegation/BasicMintDelegate.js";

export {
    StellarContract,
    Activity,
    txn,
    partialTxn,
    datum,
} from "./lib/StellarContract.js";

export { StellarTxnContext } from "./lib/StellarTxnContext.js";
export type {
    stellarSubclass,
    isActivity,
    utxoPredicate,
    anyDatumProps,
    configBase as paramsBase
} from "./lib/StellarContract.js";

export {
    ADA,
    addTestContext,
} from "./lib/testing/types.js";
export type { StellarTestContext } from "./lib/testing/StellarTestContext.js";
export { CapoTestHelper } from "./lib/testing/CapoTestHelper.js";
export { StellarTestHelper } from "./lib/testing/StellarTestHelper.js";

export { DefaultMinter } from "./lib/DefaultMinter.js";
export { DefaultCapo } from "./lib/DefaultCapo.js";
export type { DefaultCharterDatumArgs } from "./lib/DefaultCapo.js";

export type {
    tokenNamesOrValuesEntry,
    InlineDatum,
    valuesEntry,
} from "./lib/HeliosPromotedTypes.js";
// export {
//     // DatumInline,
// } from "./HeliosPromotedTypes.js";
