import type { Value } from "@helios-lang/ledger";
import type { isActivity, SeedActivity } from "../ActivityTypes.js";
import type { FoundDatumUtxo } from "../CapoTypes.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import type { StellarTxnContext } from "../StellarTxnContext.js";
import type { AnyDataTemplate, minimalData } from "./DelegatedData.js";
import {
    DelegatedDataContract,
    UpdateActivity,
    type DgDataCreationOptions,
    type DgDataType,
    type DgDataTypeLike,
    type DgDataUpdateOptions,
    type minimalDgDataTypeLike,
} from "./DelegatedDataContract.js";

/**
 * @public
 */
export interface someDataWrapper<wrappedType extends AnyDataTemplate<any, any>> {
    unwrapData(): wrappedType;
};

/**
 * @public
 */
export type WrappedDgDataType<
    WDDC extends WrappedDgDataContract<any, any, any>
> = 
    WDDC extends WrappedDgDataContract<any, any, infer WRAPPER> ? WRAPPER : never;

/**
 * For a delegate-data contract using an off-chain data structure 
 * @remarks
 * ...with additional logic beyond the data itself (e.g. a class with methods 
 * wrapping the underlying data details)
 * @public
 */
export abstract class WrappedDgDataContract<
    T extends AnyDataTemplate<any,any>,
    TLike extends AnyDataTemplate<any,any>,
    WRAPPER extends someDataWrapper<TLike>
> extends DelegatedDataContract<T, TLike> {
    usesWrappedData = true;
    /**
     * Transforms the on-chain data structure into a higher-level
     * application-specific class representation.  That class should
     * provide an unwrapData() method to get back to the on-chain data.
     * @public
     */
    abstract mkDataWrapper(
        d: TLike
    ): WRAPPER;

    mkDgDatum(
        record: TLike | WRAPPER
    ): InlineDatum {
        // console.log({record}, "8888888888888888888888888888888888888")
        const unwrapped: TLike = (record as any).unwrapData?.() || record;

        //@ts-ignore typescript doesn't seem to understand the connection
        //  between the tLike type and the parent class's mkDgDatum type
        return super.mkDgDatum(unwrapped as any);
    }

    /**
     * converts a record from the essential
     * on-chain data structure to a higher-level application-specific
     * class representation.
     * @remarks
     * When a wrapper is used, the results of Capo's findDelegatedDataUtxos() method
     * will include the data: property having the unwrapped data, as well as
     * the dataWrapped property with the unwrapped version of the data.
     */
    wrapData(data: TLike): WRAPPER {
        return this.mkDataWrapper(data)
    }

    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     * @public
     */
    async mkTxnCreateRecord<
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        options: DgDataCreationOptions<
        TLike
        > & {  wrapped?: WRAPPER } 

    ): Promise<TCX> {
        const data : minimalData<TLike> = options.wrapped?.unwrapData() || options.data;
        return super.mkTxnCreateRecord({
            ...options,
            data
        });
    }

    /**
     * builds a txn updating a record of this type in the data store
     * @remarks
     * Use `this.activity.SpendingActivities.*` to access the available
     * types of update offered by the contract.
     */
    async mkTxnUpdateRecord<
        TCX extends StellarTxnContext
    >(
        txnName: string,
        item: FoundDatumUtxo<T, WRAPPER>,
        options: DgDataUpdateOptions<TLike> & { updatedWrapped?: WRAPPER },
        tcx?: TCX
    ): Promise<TCX> {
        const updatedFields  = options.updatedFields
        return super.mkTxnUpdateRecord(txnName, item, {
            ...options,
            updatedFields: {
                ...(options.updatedWrapped?.unwrapData() || {}),
                ...updatedFields,
            },
        }, tcx);
    }

}
