import type { isActivity, SeedActivity } from "../ActivityTypes.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import type { StellarTxnContext } from "../StellarTxnContext.js";
import type { AnyDataTemplate } from "./DelegatedData.js";
import {
    DelegatedDataContract,
    type DgDataCreationOptions,
    type DgDataTypeLike,
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

    async mkDatumDelegatedDataRecord(
        record: DgDataTypeLike<this> | WrappedDgDataType<this>
    ): Promise<InlineDatum> {
        // console.log({record}, "8888888888888888888888888888888888888")
        const unwrapped : DgDataTypeLike<this> = (
            ("unwrapData" in record ? record.unwrapData() : record) 
        );

        return super.mkDatumDelegatedDataRecord(unwrapped);
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

    /**
     * Transforms the on-chain data structure into a higher-level
     * application-specific class representation.  That class should
     * provide an unwrapData() method to get back to the on-chain data.
     */
    abstract mkDataWrapper(
        d: DgDataTypeLike<this>
    ): someDataWrapper<DgDataTypeLike<this>>;

    async mkTxnCreateRecord<
        CAI extends isActivity | SeedActivity<any>,
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        controllerActivity: CAI,
        options: DgDataCreationOptions<
            this,
            DgDataTypeLike<this>,
            WrappedDgDataType<this>
        >
    ): Promise<TCX> {
        return super.mkTxnCreateRecord(controllerActivity, {
            ...options,
            data: options.wrapped?.unwrapData(),
        });
    }
}
