/** hlbundle imports */
import type { UplcData } from "@helios-lang/uplc";
import type {
    Address,
    AssetClass,
    DatumHash,
    MintingPolicyHash,
    PubKey,
    PubKeyHash,
    ScriptHash,
    SpendingCredential,
    StakingCredential,
    StakingHash,
    StakingValidatorHash,
    TimeRange,
    TxId,
    TxInput,
    TxOutput,
    TxOutputId,
    TxOutputDatum,
    ValidatorHash,
    Value,
} from "@helios-lang/ledger";
import type { Cast } from "@helios-lang/contract-utils";

import {
    HeliosScriptBundle,
    type EnumType,
    type makesActivityEnum,
    type makesEnumData,
    type singleEnumVariant,    
} from "../helios/HeliosScriptBundle.js";
import CapoMinter from "./CapoMinter.hl";
import { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import { CapoDelegateBundle } from "../delegation/CapoDelegateBundle.js";

/** ------------ BEGIN hlbundle imports --------- */
/** if you want to maintain these in a .ts file, you can use the following imports there */
// import type { UplcData } from "@helios-lang/uplc";
// import type {
//     Address,
//     AssetClass,
//     DatumHash,
//     MintingPolicyHash,
//     PubKey,
//     PubKeyHash,
//     ScriptHash,
//     SpendingCredential,
//     StakingCredential,
//     StakingHash,
//     StakingValidatorHash,
//     TimeRange,
//     TxId,
//     TxInput,
//     TxOutput,
//     TxOutputId,
//     TxOutputDatum,
//     ValidatorHash,
//     Value,
// } from "@helios-lang/ledger";
// import type { Cast } from "@helios-lang/contract-utils";
// import type {
//     IntLike,
//     ByteArrayLike,
//  } from "@helios-lang/codec-utils";

// import type {CapoHeliosBundle} from "@donecollectively/stellar-contracts"
// import type {CapoDelegateBundle} from "@donecollectively/stellar-contracts"
// import type {
//     HeliosScriptBundle,
//     mkEnum,
//     type EnumType,
//     type singleEnumVariant,
// } from "@donecollectively/stellar-contracts"

/** ------------ BEGIN hlbundle imports --------- */
/** if you want to maintain these in a .ts file, you can use the following imports there */
// import type { UplcData } from "@helios-lang/uplc";
// import type {
//     Address,
//     AssetClass,
//     DatumHash,
//     MintingPolicyHash,
//     PubKey,
//     PubKeyHash,
//     ScriptHash,
//     SpendingCredential,
//     StakingCredential,
//     StakingHash,
//     StakingValidatorHash,
//     TimeRange,
//     TxId,
//     TxInput,
//     TxOutput,
//     TxOutputId,
//     TxOutputDatum,
//     ValidatorHash,
//     Value,
// } from "@helios-lang/ledger";
// import type { Cast } from "@helios-lang/contract-utils";
// import type { 
//     IntLike,
//     ByteArrayLike,
//  } from "@helios-lang/codec-utils";

// import type {CapoHeliosBundle} from "@donecollectively/stellar-contracts"
// import type {CapoDelegateBundle} from "@donecollectively/stellar-contracts"
// import type {
//     HeliosScriptBundle,
//     mkEnum,
//     type EnumType,
//     type singleEnumVariant,
// } from "@donecollectively/stellar-contracts"

/** ------------ BEGIN hlbundle types ------------ */
export type MinterActivity = EnumType<{module: "CapoMintHelpers", enumName: "MinterActivity"}, {
    mintingCharter: singleEnumVariant<MinterActivity, "mintingCharter",
        "Constr#0", "singletonField", 
        Address, "noSpecialFlags"
    >,
    mintWithDelegateAuthorizing: singleEnumVariant<MinterActivity, "mintWithDelegateAuthorizing",
        "Constr#1", "tagOnly", never, "noSpecialFlags"
    >,
    addingMintInvariant: singleEnumVariant<MinterActivity, "addingMintInvariant",
        "Constr#2", "singletonField", 
        TxOutputId, "isSeededActivity"
    >,
    addingSpendInvariant: singleEnumVariant<MinterActivity, "addingSpendInvariant",
        "Constr#3", "singletonField", 
        TxOutputId, "isSeededActivity"
    >,
    ForcingNewMintDelegate: singleEnumVariant<MinterActivity, "ForcingNewMintDelegate",
        "Constr#4", "singletonField", 
        TxOutputId, "isSeededActivity"
    >,
    CreatingNewSpendDelegate: singleEnumVariant<MinterActivity, "CreatingNewSpendDelegate",
        "Constr#5", 
        "fields", {
            seed: TxOutputId,
            replacingUut: Option<number[]>
        }, "isSeededActivity"
    >
}
>;

export type MinterActivityLike = EnumType<{module: "CapoMintHelpers", enumName: "MinterActivity"}, {
    mintingCharter: singleEnumVariant<MinterActivity, "mintingCharter",
        "Constr#0", "singletonField", 
        Address | string, "noSpecialFlags"
    >,
    mintWithDelegateAuthorizing: singleEnumVariant<MinterActivity, "mintWithDelegateAuthorizing",
        "Constr#1", "tagOnly", never, "noSpecialFlags"
    >,
    addingMintInvariant: singleEnumVariant<MinterActivity, "addingMintInvariant",
        "Constr#2", "singletonField", 
        TxOutputId | string, "isSeededActivity"
    >,
    addingSpendInvariant: singleEnumVariant<MinterActivity, "addingSpendInvariant",
        "Constr#3", "singletonField", 
        TxOutputId | string, "isSeededActivity"
    >,
    ForcingNewMintDelegate: singleEnumVariant<MinterActivity, "ForcingNewMintDelegate",
        "Constr#4", "singletonField", 
        TxOutputId | string, "isSeededActivity"
    >,
    CreatingNewSpendDelegate: singleEnumVariant<MinterActivity, "CreatingNewSpendDelegate",
        "Constr#5", 
        "fields", {
            seed: TxOutputId | string,
            replacingUut: Option<number[]>
        }, "isSeededActivity"
    >
}
>;
/** ------------- hlbundle types END ------------- */

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
export default class CapoMinterBundle extends HeliosScriptBundle {
    capoBundle: CapoHeliosBundle;
    // no datum types in this script
    declare Activity: makesActivityEnum<MinterActivityLike>;

    constructor(capoBundle: CapoHeliosBundle) {
        super();
        this.capoBundle = capoBundle;
    }

    get main() {
        return CapoMinter;
    }

    get modules() {
        return [...this.capoBundle.modules];
    }
}
