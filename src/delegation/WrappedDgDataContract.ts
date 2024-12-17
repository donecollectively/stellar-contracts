import type { Value } from "@helios-lang/ledger";
import type { isActivity, SeedActivity } from "../ActivityTypes.js";
import type { FoundDatumUtxo } from "../Capo.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import type { StellarTxnContext } from "../StellarTxnContext.js";
import type { AnyDataTemplate } from "./DelegatedData.js";
import {
    DelegatedDataContract,
    UpdateActivity,
    type DgDataCreationOptions,
    type DgDataType,
    type DgDataTypeLike,
    type DgDataUpdateOptions,
    type minimalDgDataTypeLike,
} from "./DelegatedDataContract.js";

export type someDataWrapper<wrappedType extends AnyDataTemplate<any, any>> = {
    unwrapData(): wrappedType;
};

/**
 * @public
 */
export type WrappedDgDataType<
    WDDC extends WrappedDgDataContract<any, any, any>
> = 
    WDDC extends WrappedDgDataContract<any, any, infer WRAPPER> ? WRAPPER : never;

export abstract class WrappedDgDataContract<
    T extends AnyDataTemplate<any,any>,
    tLike extends AnyDataTemplate<any,any>,
    WRAPPER extends someDataWrapper<tLike>
> extends DelegatedDataContract<T, tLike> {
    usesWrappedData = true;
    /**
     * Transforms the on-chain data structure into a higher-level
     * application-specific class representation.  That class should
     * provide an unwrapData() method to get back to the on-chain data.
     */
    abstract mkDataWrapper(
        d: tLike
    ): WRAPPER;

    mkDgDatum(
        record: tLike | WRAPPER
    ): InlineDatum {
        // console.log({record}, "8888888888888888888888888888888888888")
        const unwrapped: tLike = (record as any).unwrapData?.() || record;

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
    wrapData(data: tLike): WRAPPER {
        return this.mkDataWrapper(data)
    }

    async mkTxnCreateRecord<
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        options: DgDataCreationOptions<
            this
        > & {  wrapped?: WRAPPER } 

    ): Promise<TCX> {
        //@ts-expect-error "could be instantiated with a different subtype...""
        const data : tLike = options.wrapped?.unwrapData() || options.data;
        return super.mkTxnCreateRecord({
            ...options,
            data
        });
    }

    async mkTxnUpdateRecord<
        TCX extends StellarTxnContext
    >(
        txnName: string,
        item: FoundDatumUtxo<T, WRAPPER>,
        options: DgDataUpdateOptions<this> & { updatedWrapped?: WRAPPER },
        tcx?: TCX
    ): Promise<TCX> {
        return super.mkTxnUpdateRecord(txnName, item, {
            ...options,
            updatedFields: {
                ...(options.updatedWrapped?.unwrapData() || {}),
                ...(options.updatedFields || {}),
            },
        });
    }

}
