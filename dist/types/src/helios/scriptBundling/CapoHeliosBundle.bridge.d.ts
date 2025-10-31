import { type Cast } from "@helios-lang/contract-utils";
import type { UplcData } from "@helios-lang/uplc";
import type { IntLike } from "@helios-lang/codec-utils";
import type { AssetClass, MintingPolicyHash, TxOutputId, ValidatorHash } from "@helios-lang/ledger";
import { type InlineTxOutputDatum } from "@helios-lang/ledger";
import type { EnumTypeSchema, StructTypeSchema } from "@helios-lang/type-utils";
import { DataBridge, ContractDataBridge, DataBridgeReaderClass } from "../dataBridge/DataBridge.js";
import { EnumBridge, type JustAnEnum } from "../dataBridge/EnumBridge.js";
import type { tagOnly } from "../HeliosMetaTypes.js";
import { SeedActivity, type hasSeed, type isActivity } from "../../ActivityTypes.js";
export type TimeLike = IntLike;
import type { RelativeDelegateLink, RelativeDelegateLinkLike, ManifestEntryType$DgDataPolicyLike, DelegateRole, ErgoDelegateRole, DelegateRoleLike, ManifestEntryType$DelegateThreadsLike, ManifestEntryType, ErgoManifestEntryType, ManifestEntryTypeLike, CapoManifestEntry, CapoManifestEntryLike, PendingDelegateAction$AddLike, PendingDelegateAction$ReplaceLike, PendingDelegateAction, ErgoPendingDelegateAction, PendingDelegateActionLike, PendingDelegateChange, PendingDelegateChangeLike, ManifestActivity$updatingEntryLike, ManifestActivity$addingEntryLike, ManifestActivity$forkingThreadTokenLike, ManifestActivity$burningThreadTokenLike, ManifestActivity, ErgoManifestActivity, ManifestActivityLike, PendingCharterChange$otherManifestChangeLike, PendingCharterChange, ErgoPendingCharterChange, PendingCharterChangeLike, CapoDatum$Ergo$CharterData, CapoDatum$CharterDataLike, CapoDatum$Ergo$DelegatedData, CapoDatum$DelegatedDataLike, CapoDatum, ErgoCapoDatum, CapoLifecycleActivity$CreatingDelegateLike, CapoLifecycleActivity$forcingNewSpendDelegateLike, CapoLifecycleActivity$forcingNewMintDelegateLike, CapoLifecycleActivity, ErgoCapoLifecycleActivity, CapoLifecycleActivityLike, CapoActivity, ErgoCapoActivity, AnyData, AnyDataLike } from "./CapoHeliosBundle.typeInfo.js";
export type * as types from "./CapoHeliosBundle.typeInfo.js";
/**
 * GENERATED data bridge for **Capo** script (defined in class ***CapoHeliosBundle***)
 * main: **src/DefaultCapo.hl**, project: **stellar-contracts**
 * @remarks
* This class doesn't need to be used directly.  Its methods are available through the ***contract's methods***:
*  - `get mkDatum` - returns the datum-building bridge for the contract's datum type
*  - `get activity` - returns an activity-building bridge for the contract's activity type
*  - `get reader` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
*  - `get onchain` - (advanced) returns a data-encoding bridge for types defined in the contract's script
* The advanced methods are not typically needed - mkDatum and activity should normally provide all the
* type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's `findDelegatedDataUtxos()`
* method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
*
* ##### customizing the bridge class name
* Note that you may override `get dataBridgeName() { return "..." }` to customize the name of this bridge class
* @public
 */
export declare class CapoDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (CapoDatum)***
     * for this contract script.
     */
    datum: CapoDatumHelper;
    /**
     * this is the specific type of datum for the `Capo` script
     */
    CapoDatum: CapoDatumHelper;
    readDatum: (d: UplcData) => ErgoCapoDatum;
    /**
     * generates UplcData for the activity type (***CapoActivity***) for the `Capo` script
     */
    activity: CapoActivityHelper;
    CapoActivity: CapoActivityHelper;
    reader: CapoDataBridgeReader;
    /**
     * accessors for all the types defined in the `Capo` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `Capo` script
         */
        DelegateRole: DelegateRoleHelper;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `Capo` script
         */
        ManifestEntryType: ManifestEntryTypeHelper;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `Capo` script
         */
        PendingDelegateAction: PendingDelegateActionHelper;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `Capo` script
         */
        ManifestActivity: ManifestActivityHelper;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `Capo` script
         */
        PendingCharterChange: PendingCharterChangeHelper;
        /**
         * generates UplcData for the enum type ***CapoDatum*** for the `Capo` script
         */
        CapoDatum: CapoDatumHelper;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `Capo` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper;
        /**
         * generates UplcData for the enum type ***CapoActivity*** for the `Capo` script
         */
        CapoActivity: CapoActivityHelper;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `Capo` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `Capo` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike | {
            entryType: ManifestEntryTypeLike;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `Capo` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike | {
            action: PendingDelegateActionLike;
            role: DelegateRoleLike;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `Capo` script
         */
        AnyData: (fields: AnyDataLike | {
            id: number[];
            type: string;
        }) => UplcData;
    };
    /**
                * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink, RelativeDelegateLinkLike>;
    /**
                * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry, CapoManifestEntryLike>;
    /**
                * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange, PendingDelegateChangeLike>;
    /**
                * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData, AnyDataLike>;
}
export default CapoDataBridge;
export declare class CapoDataBridgeReader extends DataBridgeReaderClass {
    bridge: CapoDataBridge;
    constructor(bridge: CapoDataBridge, isMainnet: boolean);
    /**
        * reads UplcData *known to fit the **DelegateRole*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    DelegateRole(d: UplcData): ErgoDelegateRole;
    /**
        * reads UplcData *known to fit the **ManifestEntryType*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType;
    /**
        * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction;
    /**
        * reads UplcData *known to fit the **ManifestActivity*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    ManifestActivity(d: UplcData): ErgoManifestActivity;
    /**
        * reads UplcData *known to fit the **PendingCharterChange*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange;
    datum: (d: UplcData) => Partial<{
        CharterData: CapoDatum$Ergo$CharterData;
        ScriptReference: tagOnly;
        DelegatedData: CapoDatum$Ergo$DelegatedData;
    }>;
    /**
        * reads UplcData *known to fit the **CapoDatum*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    CapoDatum(d: UplcData): ErgoCapoDatum;
    /**
        * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity;
    /**
        * reads UplcData *known to fit the **CapoActivity*** enum type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the enum type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    CapoActivity(d: UplcData): ErgoCapoActivity;
    /**
        * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink;
    /**
        * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    CapoManifestEntry(d: UplcData): CapoManifestEntry;
    /**
        * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    PendingDelegateChange(d: UplcData): PendingDelegateChange;
    /**
        * reads UplcData *known to fit the **AnyData*** struct type,
        * for the Capo script.
        * #### Standard WARNING
        *
        * This is a low-level data-reader for use in ***advanced development scenarios***.
        *
        * Used correctly with data that matches the type, this reader
        * returns strongly-typed data - your code using these types will be safe.
        *
        * On the other hand, reading non-matching data will not give you a valid result.
        * It may throw an error, or it may throw no error, but return a value that
        * causes some error later on in your code, when you try to use it.
        */
    AnyData(d: UplcData): AnyData;
}
/**
 * Helper class for generating UplcData for the struct ***RelativeDelegateLink*** type.
 * @public
 */
export declare class RelativeDelegateLinkHelper extends DataBridge {
    isCallable: boolean;
    /**
             * @internal
             * uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<RelativeDelegateLink, RelativeDelegateLinkLike>;
}
/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class DelegateRoleHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}
/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class ManifestEntryTypeHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike | {
        policyLink: RelativeDelegateLinkLike;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike | {
        role: DelegateRoleLike;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}
/**
 * Helper class for generating UplcData for the struct ***CapoManifestEntry*** type.
 * @public
 */
export declare class CapoManifestEntryHelper extends DataBridge {
    isCallable: boolean;
    /**
             * @internal
             * uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoManifestEntry, CapoManifestEntryLike>;
}
/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class PendingDelegateActionHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction, Partial<{
        Add: PendingDelegateAction$AddLike;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}
/**
 * Helper class for generating UplcData for the struct ***PendingDelegateChange*** type.
 * @public
 */
export declare class PendingDelegateChangeHelper extends DataBridge {
    isCallable: boolean;
    /**
             * @internal
             * uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateChange, PendingDelegateChangeLike>;
}
/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class ManifestActivityHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike;
        addingEntry: ManifestActivity$addingEntryLike;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
        burningThreadToken: ManifestActivity$burningThreadTokenLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}
/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class PendingCharterChangeHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange, Partial<{
        delegateChange: PendingDelegateChangeLike;
        otherManifestChange: PendingCharterChange$otherManifestChangeLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike | {
        action: PendingDelegateActionLike;
        role: DelegateRoleLike;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***PendingCharterChange$otherManifestChangeLike*** is the same as the expanded field-types.
     */
    otherManifestChange(fields: PendingCharterChange$otherManifestChangeLike | {
        activity: ManifestActivityLike;
        remainingDelegateValidations: Array<DelegateRoleLike>;
    }): UplcData;
}
/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***CapoDatum*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class CapoDatumHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoDatum, Partial<{
        CharterData: CapoDatum$CharterDataLike;
        ScriptReference: tagOnly;
        DelegatedData: CapoDatum$DelegatedDataLike;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.CharterData"***
     * @remarks - ***CapoDatum$CharterDataLike*** is the same as the expanded field-types.
     */
    CharterData(fields: CapoDatum$CharterDataLike | {
        spendDelegateLink: RelativeDelegateLinkLike;
        spendInvariants: Array<RelativeDelegateLinkLike>;
        otherNamedDelegates: Map<string, RelativeDelegateLinkLike>;
        mintDelegateLink: RelativeDelegateLinkLike;
        mintInvariants: Array<RelativeDelegateLinkLike>;
        govAuthorityLink: RelativeDelegateLinkLike;
        manifest: Map<string, CapoManifestEntryLike>;
        pendingChanges: Array<PendingCharterChangeLike>;
    }): InlineTxOutputDatum;
    /**
     * (property getter): InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.ScriptReference"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get ScriptReference(): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.DelegatedData"***
     * @remarks - ***CapoDatum$DelegatedDataLike*** is the same as the expanded field-types.
     */
    DelegatedData(fields: CapoDatum$DelegatedDataLike | {
        data: Map<string, UplcData>;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}
/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class DelegateRoleHelperNested extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
    * @remarks
    * #### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
    * @remarks
    * #### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}
/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class ManifestActivityHelperNested extends EnumBridge<isActivity> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike;
        addingEntry: ManifestActivity$addingEntryLike;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
        burningThreadToken: ManifestActivity$burningThreadTokenLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
    * @remarks
    * #### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}
/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class CapoLifecycleActivityHelper extends EnumBridge<JustAnEnum> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
        updatingManifest: ManifestActivityLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): DelegateRoleHelperNested;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested;
}
/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class ActivityDelegateRoleHelperNested extends EnumBridge<isActivity> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
    * @remarks
    * #### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
    * @remarks
    * #### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}
/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class CapoLifecycleActivityHelperNested extends EnumBridge<isActivity> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
        updatingManifest: ManifestActivityLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
    * ##### Nested activity:
    * this is connected to a nested-activity wrapper, so the details are piped through
    * the parent's uplc-encoder, producing a single uplc object with
    * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested;
}
/**
 * Helper class for generating UplcData for variants of the ***CapoActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class CapoActivityHelper extends EnumBridge<isActivity> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoActivity, Partial<{
        capoLifecycleActivity: CapoLifecycleActivityLike;
        usingAuthority: tagOnly;
        retiringRefScript: tagOnly;
        addingSpendInvariant: tagOnly;
        spendingDelegatedDatum: tagOnly;
        updatingCharter: tagOnly;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***CapoActivity:capoLifecycleActivity***.
     */
    get capoLifecycleActivity(): CapoLifecycleActivityHelperNested;
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.usingAuthority"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get usingAuthority(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.retiringRefScript"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get retiringRefScript(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.addingSpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get addingSpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.spendingDelegatedDatum"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get spendingDelegatedDatum(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.updatingCharter"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#5***
     */
    get updatingCharter(): {
        redeemer: UplcData;
    };
}
/**
 * Helper class for generating UplcData for the struct ***AnyData*** type.
 * @public
 */
export declare class AnyDataHelper extends DataBridge {
    isCallable: boolean;
    /**
             * @internal
             * uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<AnyData, AnyDataLike>;
}
export declare const RelativeDelegateLinkSchema: StructTypeSchema;
export declare const DelegateRoleSchema: EnumTypeSchema;
export declare const ManifestEntryTypeSchema: EnumTypeSchema;
export declare const CapoManifestEntrySchema: StructTypeSchema;
export declare const PendingDelegateActionSchema: EnumTypeSchema;
export declare const PendingDelegateChangeSchema: StructTypeSchema;
export declare const ManifestActivitySchema: EnumTypeSchema;
export declare const PendingCharterChangeSchema: EnumTypeSchema;
export declare const CapoDatumSchema: EnumTypeSchema;
export declare const CapoLifecycleActivitySchema: EnumTypeSchema;
export declare const CapoActivitySchema: EnumTypeSchema;
export declare const AnyDataSchema: StructTypeSchema;
//# sourceMappingURL=CapoHeliosBundle.bridge.d.ts.map