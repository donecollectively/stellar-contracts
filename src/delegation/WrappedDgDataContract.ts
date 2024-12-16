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
} from "./DelegatedDataContract.js";

export type someDataWrapper<wrappedType extends AnyDataTemplate<any, any>> = {
    unwrapData(): wrappedType;
};

/**
 * @public
 */
export type WrappedDgDataType<
    T extends DelegatedDataContract | WrappedDgDataContract,
    WRAPPED extends T extends WrappedDgDataContract
        ? ReturnType<T["mkDataWrapper"]>
        : never = T extends WrappedDgDataContract
        ? ReturnType<T["mkDataWrapper"]>
        : never
> = WRAPPED;

export abstract class WrappedDgDataContract extends DelegatedDataContract {
    usesWrappedData = true;
    /**
     * Transforms the on-chain data structure into a higher-level
     * application-specific class representation.  That class should
     * provide an unwrapData() method to get back to the on-chain data.
     */
    abstract mkDataWrapper(
        d: DgDataTypeLike<this>
    ): someDataWrapper<DgDataTypeLike<this>>;


    mkDgDatum(
        record: DgDataTypeLike<this> | WrappedDgDataType<this>
    ): InlineDatum {
        // console.log({record}, "8888888888888888888888888888888888888")
        const unwrapped: DgDataTypeLike<this> =
            "unwrapData" in record ? record.unwrapData() : record;

        return super.mkDgDatum(unwrapped);
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
    wrapData(data: DgDataTypeLike<this>): WrappedDgDataType<this> {
        return this.mkDataWrapper(data) as any;
    }


    async mkTxnCreateRecord<
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        options: DgDataCreationOptions<
            this
        >
    ): Promise<TCX> {
        return super.mkTxnCreateRecord({
            ...options,
            data: options.wrapped?.unwrapData(),
        });
    }

    async mkTxnUpdateRecord<
        CAI extends isActivity | UpdateActivity<any>,
        TCX extends StellarTxnContext
    >(
        txnName: string,
        item: FoundDatumUtxo<DgDataType<this>, WrappedDgDataType<this>>,
        options: DgDataUpdateOptions<this, CAI>,
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
