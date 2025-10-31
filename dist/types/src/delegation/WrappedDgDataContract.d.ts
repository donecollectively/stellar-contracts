import type { FoundDatumUtxo } from "../CapoTypes.js";
import type { InlineDatum } from "../HeliosPromotedTypes.js";
import type { StellarTxnContext } from "../StellarTxnContext.js";
import type { AnyDataTemplate } from "./DelegatedData.js";
import { DelegatedDataContract, type DgDataCreationOptions, type DgDataUpdateOptions } from "./DelegatedDataContract.js";
/**
 * @public
 */
export interface someDataWrapper<wrappedType extends AnyDataTemplate<any, any>> {
    unwrapData(): wrappedType;
}
/**
 * @public
 */
export type WrappedDgDataType<WDDC extends WrappedDgDataContract<any, any, any>> = WDDC extends WrappedDgDataContract<any, any, infer WRAPPER> ? WRAPPER : never;
/**
 * For a delegate-data contract using an off-chain data structure
 * @remarks
 * ...with additional logic beyond the data itself (e.g. a class with methods
 * wrapping the underlying data details)
 * @public
 */
export declare abstract class WrappedDgDataContract<T extends AnyDataTemplate<any, any>, TLike extends AnyDataTemplate<any, any>, WRAPPER extends someDataWrapper<TLike>> extends DelegatedDataContract<T, TLike> {
    usesWrappedData: boolean;
    /**
     * Transforms the on-chain data structure into a higher-level
     * application-specific class representation.  That class should
     * provide an unwrapData() method to get back to the on-chain data.
     * @public
     */
    abstract mkDataWrapper(d: TLike): WRAPPER;
    mkDgDatum(record: TLike | WRAPPER): InlineDatum;
    /**
     * converts a record from the essential
     * on-chain data structure to a higher-level application-specific
     * class representation.
     * @remarks
     * When a wrapper is used, the results of Capo's findDelegatedDataUtxos() method
     * will include the data: property having the unwrapped data, as well as
     * the dataWrapped property with the unwrapped version of the data.
     */
    wrapData(data: TLike): WRAPPER;
    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     * @public
     */
    mkTxnCreateRecord<TCX extends StellarTxnContext>(options: DgDataCreationOptions<TLike> & {
        wrapped?: WRAPPER;
    }): Promise<TCX>;
    /**
     * builds a txn updating a record of this type in the data store
     * @remarks
     * Use `this.activity.SpendingActivities.*` to access the available
     * types of update offered by the contract.
     */
    mkTxnUpdateRecord<TCX extends StellarTxnContext>(txnName: string, item: FoundDatumUtxo<T, WRAPPER>, options: DgDataUpdateOptions<TLike> & {
        updatedWrapped?: WRAPPER;
    }, tcx?: TCX): Promise<TCX>;
}
//# sourceMappingURL=WrappedDgDataContract.d.ts.map