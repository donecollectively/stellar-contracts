import { type Cast } from "@helios-lang/contract-utils";
import type { UplcData } from "@helios-lang/uplc";
import type { IntLike } from "@helios-lang/codec-utils";
import type { Address, TxOutputId, ValidatorHash } from "@helios-lang/ledger";
import type { EnumTypeSchema, StructTypeSchema } from "@helios-lang/type-utils";
import { DataBridge, ContractDataBridge, DataBridgeReaderClass } from "../helios/dataBridge/DataBridge.js";
import { EnumBridge } from "../helios/dataBridge/EnumBridge.js";
import type { tagOnly } from "../helios/HeliosMetaTypes.js";
import { SeedActivity, type hasSeed, type isActivity } from "../ActivityTypes.js";
/**
 * @public
 */
export type TimeLike = IntLike;
import type { MinterActivity$CreatingNewSpendDelegateLike, MinterActivity, ErgoMinterActivity, RelativeDelegateLink, RelativeDelegateLinkLike } from "./CapoMinter.typeInfo.js";
export type * as types from "./CapoMinter.typeInfo.js";
/**
 * GENERATED data bridge for **CapoMinter** script (defined in class ***CapoMinterBundle***)
 * main: **src/minting/CapoMinter.hl**, project: **stellar-contracts**
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
* Note that you may override `get bridgeClassName() { return "..." }` to customize the name of this bridge class
* @public
 */
export declare class CapoMinterDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    datum: undefined;
    /**
     * generates UplcData for the activity type (***MinterActivity***) for the `CapoMinter` script
     */
    activity: MinterActivityHelper;
    MinterActivity: MinterActivityHelper;
    reader: CapoMinterDataBridgeReader;
    /**
     * accessors for all the types defined in the `CapoMinter` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***MinterActivity*** for the `CapoMinter` script
         */
        MinterActivity: MinterActivityHelper;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `CapoMinter` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
    };
    /**
                * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink, RelativeDelegateLinkLike>;
}
export default CapoMinterDataBridge;
/**
 * @public
 */
export declare class CapoMinterDataBridgeReader extends DataBridgeReaderClass {
    bridge: CapoMinterDataBridge;
    constructor(bridge: CapoMinterDataBridge, isMainnet: boolean);
    /**
        * reads UplcData *known to fit the **MinterActivity*** enum type,
        * for the CapoMinter script.
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
    MinterActivity(d: UplcData): ErgoMinterActivity;
    /**
        * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
        * for the CapoMinter script.
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
}
/**
 * Helper class for generating UplcData for variants of the ***MinterActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
export declare class MinterActivityHelper extends EnumBridge<isActivity> {
    /**
            * @internal
            *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<MinterActivity, Partial<{
        mintingCharter: Address | string;
        mintWithDelegateAuthorizing: tagOnly;
        addingMintInvariant: TxOutputId | string;
        addingSpendInvariant: TxOutputId | string;
        forcingNewMintDelegate: TxOutputId | string;
        CreatingNewSpendDelegate: MinterActivity$CreatingNewSpendDelegateLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.mintingCharter"***
     */
    mintingCharter(owner: Address | string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoMintHelpers::MinterActivity.mintWithDelegateAuthorizing"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get mintWithDelegateAuthorizing(): {
        redeemer: UplcData;
    };
    /**
    * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingMintInvariant"***,
    * given a transaction-context (or direct arg) with a ***seed utxo***
    * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
    *  - to get a transaction context having the seed needed for this argument,
    *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
    * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
    *  - in a context providing an implicit seed utxo, use
    *    the `$seeded$addingMintInvariant}` variant of this activity instead
    *
     */
    addingMintInvariant(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingMintInvariant"***
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$addingMintInvariant`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$addingMintInvariant(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
    * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingSpendInvariant"***,
    * given a transaction-context (or direct arg) with a ***seed utxo***
    * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
    *  - to get a transaction context having the seed needed for this argument,
    *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
    * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
    *  - in a context providing an implicit seed utxo, use
    *    the `$seeded$addingSpendInvariant}` variant of this activity instead
    *
     */
    addingSpendInvariant(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingSpendInvariant"***
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$addingSpendInvariant`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$addingSpendInvariant(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
    * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.forcingNewMintDelegate"***,
    * given a transaction-context (or direct arg) with a ***seed utxo***
    * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
    *  - to get a transaction context having the seed needed for this argument,
    *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
    * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
    *  - in a context providing an implicit seed utxo, use
    *    the `$seeded$forcingNewMintDelegate}` variant of this activity instead
    *
     */
    forcingNewMintDelegate(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.forcingNewMintDelegate"***
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$forcingNewMintDelegate`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$forcingNewMintDelegate(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingNewSpendDelegate(value: hasSeed, fields: {
        replacingUut: number[] | undefined;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    CreatingNewSpendDelegate(fields: MinterActivity$CreatingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        replacingUut: number[] | undefined;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***,
     * @param fields - \{ replacingUut: number[] | undefined \}
     * @remarks
    * ##### Seeded activity
    * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingNewSpendDelegate({ replacingUut })`
      *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingNewSpendDelegate: (fields: {
        replacingUut: number[] | undefined;
    }) => SeedActivity<(value: hasSeed, fields: {
        replacingUut: number[] | undefined;
    }) => isActivity>;
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
export declare const MinterActivitySchema: EnumTypeSchema;
export declare const RelativeDelegateLinkSchema: StructTypeSchema;
//# sourceMappingURL=CapoMinter.bridge.d.ts.map