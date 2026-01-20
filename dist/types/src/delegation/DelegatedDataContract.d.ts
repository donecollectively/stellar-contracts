import { type TxInput, type Value } from "@helios-lang/ledger";
import type { CharterData, FoundDatumUtxo, hasCharterRef, hasUutContext } from "../CapoTypes.js";
import type { noInheritedReqts, ReqtsMap } from "../Requirements.js";
import type { StellarTxnContext, hasSeedUtxo } from "../StellarTxnContext.js";
import { ContractBasedDelegate } from "./ContractBasedDelegate.js";
import type { UutName } from "./UutName.js";
import { type seedActivityFunc, type SeedActivityArg, SeedActivity, type isActivity } from "../ActivityTypes.js";
import { type InlineDatum } from "../HeliosPromotedTypes.js";
import type { AnyDataTemplate, minimalData } from "./DelegatedData.js";
import type { DelegatedDataBundle } from "../helios/scriptBundling/DelegatedDataBundle.js";
/**
 * @public
 */
export type DgDataType<T extends DelegatedDataContract<any, any>> = T extends DelegatedDataContract<infer T, infer TLike> ? T : never;
/**
 * @public
 */
export type DgDataTypeLike<T extends DelegatedDataContract<any, any>> = T extends DelegatedDataContract<infer T, infer TLike> ? TLike : never;
/**
 * use for new or updated record data, where id and type can
 * be implied instead of explicitly provided
 * @public
 */
export type minimalDgDataTypeLike<T extends DelegatedDataContract<any, any>> = minimalData<DgDataTypeLike<T>>;
/**
 * @public
 * @deprecated use minimalDgDataTypeLike instead
 */
export type DgDataCreationAttrs<T extends DelegatedDataContract<any, any>> = Omit<DgDataTypeLike<T>, "id" | "type">;
/**
 * @public
 */
export type DelegatedDatumTypeName<T extends DelegatedDataContract<any, any>, TN extends string = T["recordTypeName"]> = TN;
export type DelegatedDatumIdPrefix<T extends DelegatedDataContract<any, any>, TN extends string = T["idPrefix"]> = TN;
/**
 * Context object passed to {@link DelegatedDataContract.beforeCreate | beforeCreate()} callback
 * @public
 */
export type createContext<TLike> = {
    activity: isActivity;
};
/**
 * Context object passed to {@link DelegatedDataContract.beforeUpdate | beforeUpdate()} callback
 * @public
 */
export type updateContext<T> = {
    original: T;
    activity: isActivity;
};
/**
 * DelegatedDataContract provides a base class for utility functions
 * to simplify implementation of delegate controllers.  They are used
 * to manage the creation and updating of records in a delegated data store,
 * where the data is stored in a Capo, and the controller is forced into the
 * transaction by the Capo's delegate policy (or its spend-delegate's).
 *@public
 */
export declare abstract class DelegatedDataContract<T extends AnyDataTemplate<any, any>, TLike extends AnyDataTemplate<any, any>> extends ContractBasedDelegate {
    static isDgDataPolicy: boolean;
    static isMintDelegate: boolean;
    usesWrappedData?: boolean;
    dgDatumHelper: any;
    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * This getter is derived from the contract-bundle's `requiresGovAuthority` property.
     *
     * This is a convenience for the controller, and should be used along with
     * the appropriate on-chain policy to require the gov token's presence.
     *
     * @see {@link scriptBundleClass | scriptBundleClass()} in the controller, and
     * {@link DelegatedDataBundle#requiresGovAuthority | requiresGovAuthority} in
     * the bundle.
     *
     * @public
     */
    get needsGovAuthority(): boolean;
    abstract get recordTypeName(): string;
    abstract get idPrefix(): string;
    abstract exampleData(): minimalData<TLike>;
    /**
     * Provides a customized label for the delegate, used in place of
     * a generic script name ("BasicDelegate").  DelegatedDataContract
     * provides a default name with the record type name and "Pol" suffix.
     *
     * Affects the on-chain logging for the policy and the compiled script
     * output in the script-cache on-disk or in browser's storage.
     */
    get delegateName(): string;
    abstract requirements(): ReqtsMap<any, any> | ReqtsMap<any, noInheritedReqts>;
    static get abstractBundleClass(): undefined | typeof DelegatedDataBundle;
    static scriptBundleClass(): Promise<typeof DelegatedDataBundle>;
    /**
     * Finds records of this delegate's type, optionally by ID.
     * @remarks
     * Returns a record list when no ID is provided, or a single record when an ID is provided.
     */
    findRecords<THIS extends DelegatedDataContract<any, any>>(this: THIS): Promise<FoundDatumUtxo<T, TLike>[]>;
    /**
     * Finds one record of this delegate's type by id
     * @remarks
     * Returns a record list when no ID is provided, or a single record when an ID is provided.
     */
    findRecords<THIS extends DelegatedDataContract<any, any>, ID extends undefined | string | UutName | number[]>(this: THIS, options: {
        id: ID;
    }): Promise<FoundDatumUtxo<T, TLike>>;
    mkDgDatum<THIS extends DelegatedDataContract<any, any>>(this: THIS, record: TLike): InlineDatum;
    /**
     * Intuition hook redirecting to activity.MintingActivities.$seeded$...
     * @remarks
     * @deprecated use activites.MintingActivites.$seeded$* accessors/methods instead.
     */
    usesSeedActivity<SA extends seedActivityFunc<any, any>>(a: SA, seedPlaceholder: "...seed", ...args: SeedActivityArg<SA>): void;
    /**
     * Validates a record of this type
     * @remarks
     * The default validation returns true, indicating that the record is valid.
     *
     * dApp developers should override this method to provide validation logic in support of the application's business rules.
     *
     * The FormManager will use this method to validate the record when fields are changed, providing interactive feedback to the user.
     *
     * @returns true if the record is valid, or a record of paths to error messages for each invalid path.
     */
    validate(record: TLike, context?: "create" | "update"): Record<string, string> | true;
    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     *
     * If `tcx` and `options.txnName` aren't provided, the transaction name
     * `create ${recordId}` is used by default.
     */
    mkTxnCreateRecord<THIS extends DelegatedDataContract<any, any>, TCX extends StellarTxnContext>(this: THIS, options: DgDataCreationOptions<TLike>, tcx?: TCX): Promise<hasUutContext<THIS["idPrefix"] | "recordId"> & TCX & hasCharterRef & hasSeedUtxo & hasUutContext<"recordId" | (string extends THIS["idPrefix"] ? "‹idPrefix (hint: declare with 'idPrefix = \"...\" as const')›" : THIS["idPrefix"])>>;
    creationDefaultDetails(): Partial<TLike>;
    /**
     * Hook method called before creating a record, allowing the delegate to augment or normalize the record data.
     *
     * @param record - The record being created (TLike - off-chain type)
     * @param context - Context object containing the activity being triggered
     * @returns The augmented/normalized record to be saved (TLike - off-chain type)
     *
     * @remarks
     * The delegate MAY provide a {@link beforeCreate | beforeCreate()} method to augment the record before it is created.
     * This is called after merging defaults, id, and type, but before saving.
     *
     * Typically these fixups are required to conform the submitted record to the on-chain
     * policy's enforced requirements.
     *

     * Implementers MUST return a patched record containing any modifications needed
     */
    beforeCreate(record: TLike, context: createContext<TLike>): TLike;
    /**
     * Hook method called before updating a record, allowing the delegate to augment or normalize the record data.
     *
     * @param existingRecord - The original record before updates (T - on-chain type)
     * @param record - The merged record containing existing data plus updates (TLike - off-chain type)
     * @param context - Context object containing the original record and the activity being triggered
     * @returns The augmented/normalized record to be saved (TLike - off-chain type)
     *
     * @remarks
     * The delegate MAY provide a {@link beforeUpdate | beforeUpdate()} method to augment the record before it is updated.
     * This is called after merging the existing record with the updated fields, but before saving.
     *
     * Typically these fixups are required to conform the submitted record to the on-chain
     * policy's enforced requirements.
     *
     * Implementers MUST return a patched record containing any modifications needed
     */
    beforeUpdate(record: TLike, context: updateContext<T>): TLike;
    /**
     * core transaction-building method creating a record of this delegate's type in the on-chain data store
     * @remarks
     *
     * The options can include special-cased record-creation activities, targeting one of the policy's on-chain MintingActivities other than the default {@link DelegatedDataContract.activity.MintingActivities.$seeded$CreatingRecord | $seeded$CreatingRecord}.
     *
     * The delegate MAY provide a {@link beforeCreate | beforeCreate()} method to augment the record before it is created.
     *
     * The transaction context is augmented by adding the authority token enforcing the on-chain data-creation policy for this delegate.
     *
     * Includes the Capo's govAuthority if the contract's script bundle indicates the need for
     * it (see {@link DelegatedDataBundle#requiresGovAuthority | requiresGovAuthority}) in the script bundle class.
     *
     * @param tcx - the transaction context to be augmented
     * @param options - the options for the creation
     * @returns the augmented transaction context
     */
    txnCreatingRecord<THIS extends DelegatedDataContract<any, any>, TCX extends StellarTxnContext & hasCharterRef & hasSeedUtxo & hasUutContext<"recordId">>(this: THIS, tcx: TCX, options: CoreDgDataCreationOptions<TLike>): Promise<TCX & hasUutContext<"recordId" | (string extends DelegatedDatumIdPrefix<THIS> ? "‹idPrefix (hint: declare with 'idPrefix = \"...\" as const')›" : DelegatedDatumIdPrefix<THIS>)>>;
    /** @ignore */
    /**
     * @deprecated use activity.SpendingActivities.* instead.
     */
    usesUpdateActivity<UA extends updateActivityFunc<any>>(a: UA, _idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>): UpdateActivity<UA, UpdateActivityArgs<UA>>;
    /**
     * Creates a transaction for updating a record in the delegated data store
     *
     * @remarks
     * Provide an existing item, and options including a controller activity to trigger.
     *
     * If provided, the `activity` option MUST be an activity triggering one of the
     * controller's SpendingActivity variants or **TODO document & support a multi-activity**.
     *
     * If the `tcx` and `options.txnName` aren't provided, the transaction name
     * `update ${item.id}` is used by default.
     *
     * The updatedRecord only needs to contain the fields that are being updated.
     *
     * The delegate MAY provide a {@link beforeUpdate | beforeUpdate()} method
     * that will be called implicitly, to augment or fixup the record before it is updated.
     */
    mkTxnUpdateRecord<TCX extends StellarTxnContext>(this: DelegatedDataContract<any, any>, item: FoundDatumUtxo<T, any>, options: DgDataUpdateOptions<TLike>, tcx?: TCX): Promise<TCX>;
    txnUpdatingRecord<TCX extends StellarTxnContext & hasCharterRef>(tcx: TCX, id: hasRecId, item: FoundDatumUtxo<T, any>, options: CoreDgDataUpdateOptions<TLike>): Promise<TCX>;
    getReturnAddress(): import("@helios-lang/ledger").Address;
    returnUpdatedRecord<TCX extends StellarTxnContext & hasCharterRef>(tcx: TCX, returnedValue: Value, updatedRecord: TLike): TCX;
    moreInfo(): string;
    /**
     * Generates any needed transactions for updating the Capo manifest
     * to install or (todo: support for update) the policy for this delegate.
     * @remarks
     * The default implementation checks for the presence of the delegate policy
     * in the Capo's manifest, and if not found, creates a transaction to install it.
     *
     * The data-controller class's recordTypeName and idPrefix are used to
     * initialize the Capo's registry of data-controllers.  You may also implement
     * a moreInfo() method to provide more on-screen context about the
     * data-controller's role for administrators and/or end-users; the moreInfo
     * will be displayed in the Capo's on-screen policy-management (administrative)
     * interface, and you may also display it elsewhere in your application.
     *
     * To add any other transactions that may be needed for the delegate to operate
     * effectively, override this method, call `super(...args)`, and then add your
     * additional transactions using tcx.includeAddlTxn(...).  In that case, be sure to
     * perform any needed queries for ***fresh state of the on-chain data***, such as
     * for settings or the Capo's fresh charter data, INSIDE your mkTcx() function.
     */
    setupCapoPolicy(tcx: StellarTxnContext, typeName: string, options: {
        charterData: CharterData;
        capoUtxos: TxInput[];
    }): Promise<undefined>;
}
/**
 * @public
 */
export type updateActivityFunc<ARGS extends [...any]> = (recId: hasRecId, ...args: ARGS) => isActivity;
type UpdateActivityArgs<UA extends updateActivityFunc<any>> = UA extends updateActivityFunc<infer ARGS> ? ARGS : never;
export declare class UpdateActivity<FactoryFunc extends updateActivityFunc<any>, ARGS extends [...any] = FactoryFunc extends updateActivityFunc<infer ARGS> ? ARGS : never> {
    args: ARGS;
    host: DelegatedDataContract<any, any>;
    factoryFunc: FactoryFunc;
    constructor(host: DelegatedDataContract<any, any>, factoryFunc: FactoryFunc, args: ARGS);
    mkRedeemer(recId: hasRecId): isActivity;
}
type hasRecId = string | number[] | UutName;
/**
 * @public
 */
export type DgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    data: minimalData<TLike>;
    activity?: isActivity | SeedActivity<any>;
    addedUtxoValue?: Value;
    txnName?: string;
};
export type CoreDgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    data: minimalData<TLike>;
    addedUtxoValue?: Value;
};
/**
 * @public
 */
export type DgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity | UpdateActivity<any>;
    txnName?: string;
    updatedFields: Partial<minimalData<TLike>>;
    addedUtxoValue?: Value;
};
export type CoreDgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    updatedFields: minimalData<TLike>;
    addedUtxoValue?: Value;
};
export {};
//# sourceMappingURL=DelegatedDataContract.d.ts.map