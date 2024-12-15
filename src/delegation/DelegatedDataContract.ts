import { makeTxOutput, makeValue, type Value } from "@helios-lang/ledger";
import { makeIntData } from "@helios-lang/uplc";

import type {
    FoundDatumUtxo,
    hasCharterRef,
    hasSettingsRef,
    hasUutContext,
} from "../Capo.js";
import type { ReqtsMap } from "../Requirements.js";
import type { StellarTxnContext, hasSeedUtxo } from "../StellarTxnContext.js";
import { ContractBasedDelegate } from "./ContractBasedDelegate.js";
import type { UutName } from "./UutName.js";
import { betterJsonSerializer, dumpAny } from "../diagnostics.js";
import {
    type seedActivityFunc,
    type SeedActivityArg,
    SeedActivity,
    type isActivity,
} from "../ActivityTypes.js";
import type {
    AnyData,
    AnyDataLike,
    ErgoAnyData,
    minimalAnyData,
} from "./UnspecializedDelegate.typeInfo.js";
import { textToBytes, type InlineDatum } from "../HeliosPromotedTypes.js";
import type {
    CapoHeliosBundle,
    CapoHeliosBundleClass,
} from "../CapoHeliosBundle.js";
import type { CapoDelegateBundle } from "./CapoDelegateBundle.js";
import type { SomeDgtDatumReader } from "./GenericDelegateBridge.js";
import type { AnyDataTemplate, minimalData } from "./DelegatedData.js";
import type { Expand } from "../testing/types.js";
import type { IFISNEVER } from "../helios/typeUtils.js";

export const NO_WRAPPER = Symbol(
    "no data-adapter; uses on-chain type directly"
);
export type NoWrapper = {
    [NO_WRAPPER]: true;
};

type OnchainType = {
    placeholder: true;
    id: string;
    type: string;
};

export type DgDataType<
    T extends DelegatedDataContract<any>,
    DATUM extends InstanceType<T["dataBridgeClass"]>["readDatum"] &
        SomeDgtDatumReader = InstanceType<T["dataBridgeClass"]>["readDatum"] &
        SomeDgtDatumReader,
    CSD_struct extends ReturnType<DATUM>["capoStoredData"] & {
        data: AnyDataTemplate<any, any>;
    } = ReturnType<DATUM>["capoStoredData"] & {
        data: AnyDataTemplate<any, any>;
    }
> = ErgoAnyData & CSD_struct["data"];

export type DgDataTypeLike<
    T extends DelegatedDataContract<any>,
    CDCC extends DelegatedDataContract<any> = T extends DelegatedDataContract<
        infer D
    >
        ? D
        : never,
    CSDFP extends Parameters<
        InstanceType<CDCC["dataBridgeClass"]>["DelegateDatum"]["capoStoredData"]
    > = Parameters<
        InstanceType<CDCC["dataBridgeClass"]>["DelegateDatum"]["capoStoredData"]
    >,
    csdLike extends CSDFP extends [{ data: AnyDataTemplate<any, any> }, ...any]
        ? AnyDataTemplate<any, any>
        : never = CSDFP extends [{ data: AnyDataTemplate<any, infer D> }, ...any] ? D : never
> = csdLike;

/**
 * use for new or updated record data, where id and type can 
 * be implied instead of explicitly provided
 */
export type minimalDgDataTypeLike<
    T extends DelegatedDataContract<any>
>  = minimalData<DgDataTypeLike<T>>;

/**
 * @public
 * @deprecated use minimalDgDataTypeLike instead
 */
export type DgDataCreationAttrs<
    T extends DelegatedDataContract<any> // | DelegatedDatumAdapter<any>
> = Omit<DgDataTypeLike<T>, "id" | "type">;
// T extends DelegatedDatumAdapter<infer D>
// ? Omit<D, "id" | "type"> :
// T extends DelegatedDataContract
//     ? ReturnType<T["mkDataWithWrapper"]> extends DelegatedDatumAdapter<
//           infer D
//       >
//         ? Omit<D, "id" | "type">
//         : never
//     : never;

/**
 * @public
 */
export type MaybeWrappedDataType<
    T extends DelegatedDataContract<any>,
    RT extends ReturnType<T["mkDataWithWrapper"]> = ReturnType<
        T["mkDataWithWrapper"]
    >
> = RT extends NoWrapper
    ? DgDataType<T>
    : RT extends someDataWrapper<any>
    ? RT
    : never;
// : Exclude<Exclude<RT, NoWrapper>, AnyData>;

export type DelegatedDataWrapper<
    T extends DelegatedDataContract<any>,
    DDT extends DgDataType<T> = DgDataType<T>,
    WDT extends MaybeWrappedDataType<T> = MaybeWrappedDataType<T>
> = DDT extends WDT ? DDT : someDataWrapper<DDT>;

export type someDataWrapper<wrappedType extends AnyData> = {
    unwrapData(): wrappedType;
};

/**
 * @public
 */
export type DelegatedDatumTypeName<
    T extends DelegatedDataContract<any>,
    TN extends string = T["recordTypeName"]
> = TN;

export type DelegatedDatumIdPrefix<
    T extends DelegatedDataContract<any>,
    TN extends string = T["idPrefix"]
> = TN;

/**
 * DelegatedDataContract provides a base class for utility functions
 * to simplify implementation of delegate controllers.  They are used
 * to manage the creation and updating of records in a delegated data store,
 * where the data is stored in a Capo, and the controller is forced into the
 * transaction by the Capo's delegate policy (or its spend-delegate's).
 *@public
 */
export abstract class DelegatedDataContract<
    DDC extends DelegatedDataContract<any>,
> extends ContractBasedDelegate 
{
    usesWrappedData?: boolean;

    abstract get recordTypeName(): string;
    abstract get idPrefix(): string;
    /**
     * Provides a customized label for the delegate, used in place of
     * a generic script name ("BasicDelegate").  DelegatedDataContract
     * provides a default name with the record type name and "Pol" suffix.
     *
     * Affects the on-chain logging for the policy and the compiled script
     * output in the script-cache on-disk or in browser's storage.
     */
    get delegateName() {
        return `${this.recordTypeName}Pol`;
    }

    // abstract get capo(): Capo<any>;
    abstract requirements(): ReqtsMap<any, any> | ReqtsMap<any, never>;

    // async findRecord(id: string | UutName) {
    //     return this.capo
    //         .findDelegatedDataUtxos({
    //             type: this.recordTypeName,
    //             id,
    //         })
    //         .then(this.capo.singleItem);
    // }

    get abstractBundleClass(): undefined | typeof CapoDelegateBundle {
        return undefined;
    }

    scriptBundle() {
        if (this.abstractBundleClass) {
            throw new Error(
                `${this.constructor.name}: this pluggable delegate requires a bit of setup that doesn't seem to be done yet.\n` +
                    `First, ensure you have derived a subclass for the controller, with a scriptBundle() method.\n` +
                    `\nThat method should \`return new YourConcreteBundle()\`\n` +
                    `\n  ... where YourConcreteBundle is a subclass of CapoDelegateBundle that you've created.\n` +
                    `\nA concrete bundle class should be defined in \`${this.delegateName}.concrete.hlbundle.js\`\n` +
                    `  ... in the same directory as your derived controller class:\n\n` +
                    `    import {YourAppCapo} from "./YourAppCapo.js";\n` +
                    `    import {${this.abstractBundleClass.name}} from ...\n` +
                    `    export default class YourConcreteBundle extends ${this.abstractBundleClass.name}} {\n` +
                    `        // ... \n` +
                    `    }\n`
            );
        }
        
        throw new Error(
            `${this.constructor.name}: missing required implementation of abstractBundleClass()\n` +
                `\nDefined in a \`*.hlbundle.js\` file, it should have at minimum:\n` +
                `    import {YourAppCapo} from "./YourAppCapo.js";\n\n` +
                `    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";\n\n` +
                `    export default class SomeDelegateBundle extends CapoHeliosBundle {\n` +
                `        get specializedDelegateModule() { return SomeSpecializedDelegate; }\n` +
                `    }\n\n` +
                `We'll generate types for that .js file, based on the types in your Helios sources.\n` +
                `\nWhen your delegated-data controller is used within your Capo, your bundle will\n` +
                `have access via import {...} to any helios modules provided by that Capo. `
        );

        return null as unknown as CapoDelegateBundle;
    }

    /**
     * base class method for converting a record from the essential
     * on-chain data structure to a higher-level application-specific
     * class representation.
     * @remarks
     * #### You don't need to implement this method
     * Application developers should NOT need to override this method.
     * Instead, they should optionally implement {@link DelegatedDataContract.mkDataWithWrapper|mkDataWithWrapper()}.
     *
     * No extra wrapper is used unless that method is provided.
     * ## Called automatically
     * When a wrapper is used, the results of Capo's findDelegatedDataUtxos() method
     * will include the data: property having the wrapped data, as well as
     * the datumParsed property with the unwrapped version of the data.
     */
    wrapData(data: DgDataType<DDC>): MaybeWrappedDataType<DDC> {
        if (false == this.usesWrappedData) {
            return data as MaybeWrappedDataType<DDC>;
        }
        if (true == this.usesWrappedData) {
            return this.mkDataWithWrapper(data) as MaybeWrappedDataType<DDC>;
        }
        const maybeWrapped = this.mkDataWithWrapper(data);
        if (maybeWrapped[NO_WRAPPER]) {
            this.usesWrappedData = false;
            return data as MaybeWrappedDataType<DDC>;
        }
        this.usesWrappedData = true;
        return maybeWrapped as MaybeWrappedDataType<DDC>;
    }

    /**
     * Optional method specifying a class that is used at application runtime
     * for business logic on a record.  If not implemented, the record is
     * returned from the on-chain store as a plain object, and updates are
     * performed based on the plain object.
     */
    mkDataWithWrapper(d: DgDataType<DDC>): someDataWrapper<any> | NoWrapper {
        return {
            [NO_WRAPPER]: true,
        };
    }

    unwrapData(
        d: Exclude<DelegatedDataWrapper<DDC>, AnyData>
    ): DgDataType<DDC> {
        if ("undefined" == typeof this.usesWrappedData) {
            // invoke wrapData once with the (typed, delegate-specific sample data )
            // to populate the "uses adapter" flag
            try {
                this.wrapData({} as any);
            } catch (e) {
                console.warn(
                    `inferring usesWrappedData: wrapData() failed to wrap an empty object, \n ...which probably means it caused error in a wrap implementation.  \nAssuming Yes, it uses a wrapper.  Call wrapData() before unwrapData() to avoid this warning.`
                );
                this.usesWrappedData = true;
            }
        }
        if (false == this.usesWrappedData) {
            return d as DgDataType<DDC>;
        }
        if (true == this.usesWrappedData) {
            return d.unwrapData() as DgDataType<DDC>;
        }
        throw new Error(`incontheieieieievible!`);
    }

    async mkDatumDelegatedDataRecord(
        this: DDC,
        record: Exclude<MaybeWrappedDataType<DDC>, AnyData>
    ): Promise<InlineDatum> {
        // console.log({record}, "8888888888888888888888888888888888888")
        return this.mkDatum.capoStoredData({
            data: this.unwrapData(
                //x@ts-expect-error because we can't seem to express strongly enough
                // for TS's needs that only real data-wrappers will be passed to this method
                record
            ),
            version: 2n,
            otherDetails: makeIntData(0),
        });

        // const adapter = this.unwrapData(record);
        // let data = record
        // throw new Error(`implement on-chain path for DgData`)
        // if (adapter) {
        // data = record.toOnchain()
        // }
    }

    /**
     * Creates an indirect reference to a seed activity with arguments,
     * using a seed placeholder.
     *
     * @remarks
     * Provide a seed activity function, a placeholder for the seed, any other args
     * for the on-chain activity/redeemer.
     *
     * The arguments are passed to the seed activity function, which is expected to return
     * an {@link isActivity} object serializing the `{redeemer}` data as a UplcData object.
     * Normally that's done with {@link ContractBasedDelegate.mkSeededMintingActivity|mkSeededMintingActivity()}
     */
    usesSeedActivity<SA extends seedActivityFunc<any, any>>(
        a: SA,
        seedPlaceholder: "...seed",
        ...args: SeedActivityArg<SA>
    ) {
        throw new Error(`unused`);
        // console.log("seed activity with function ", a.name, a)
        // return new SeedActivity(this, a, args);
    }

    async mkTxnCreateRecord<
        CAI extends isActivity | SeedActivity<any>,
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        this: DDC,
        // record: minDDType,
        controllerActivity: CAI,
        options: CreationOptions<DDC>,
        tcx?: TCX
    ): Promise<TCX> {
        // ... it does the setup for the creation activity,
        //   so that the actual "creation" part of the transaction will be ready to go

        tcx = tcx || (this.mkTcx(`create ${this.recordTypeName}`) as TCX);
        // all the reference data that can be needed by the creation policy
        const tcx1a = await this.tcxWithCharterRef(tcx);
        const tcx1b = await this.tcxWithSeedUtxo(tcx1a);
        const tcx1c = tcx1b;
        // const tcx1c = await this.tcxWithSettingsRef(tcx1b);
        const { capo } = this;
        const mintDelegate = await capo.getMintDelegate();

        // mints the UUT needed to create the record, which triggers the mint delegate
        // to enforce the data delegate creation policy
        const tcx2 = await capo.txnMintingUuts(tcx1c, [this.idPrefix], {
            mintDelegateActivity: mintDelegate.activityCreatingDelegatedData(
                tcx1c,
                this.recordTypeName
            ),
        });

        const activity: isActivity =
            controllerActivity instanceof SeedActivity
                ? controllerActivity.mkRedeemer(tcx2)
                : controllerActivity;

        // ... now the transaction has what it needs to trigger the creation policy
        // ... and be approved by it creation policy.
        // this method is the only part of the process that is actually triggering the
        // delegate policy that checks the creation.
        return this.txnCreatingRecord(
            tcx2,
            // record,
            activity,
            options
        ).then((tcx3) => tcx3);
    }

    creationDefaultDetails(): Partial<MaybeWrappedDataType<DDC>> {
        return {};
    }

    async txnCreatingRecord<
        TCX extends StellarTxnContext &
            hasCharterRef &
            hasSeedUtxo &
            // hasSettingsRef &
            hasUutContext<DelegatedDatumIdPrefix<DDC>>,
        WDT extends MaybeWrappedDataType<DDC> = MaybeWrappedDataType<DDC>,
        RDTL extends DgDataTypeLike<DDC> = DgDataTypeLike<DDC>,
        RDT extends DgDataType<DDC> = DgDataType<DDC>,
    >(
        this: DDC,
        tcx: TCX,
        // record: minDDType,
        controllerActivity: isActivity,
        options: CreationOptions<DDC>
    ): Promise<TCX> {
        const newType = this.recordTypeName as DelegatedDatumTypeName<DDC>;
        const idPrefix = this.idPrefix as DelegatedDatumIdPrefix<DDC>;

        const {
            addedUtxoValue: extraCreationValue = makeValue(0n),
            beforeSave = (x) => x,
            data: typedData,
            wrappedData,
        } = options;

        const tcx2 = await this.txnGrantAuthority(tcx, controllerActivity);

        const uut = tcx.state.uuts[idPrefix];
        let newRecord: RDTL = typedData as any;
        if (wrappedData) {
            newRecord = this.unwrapData(newRecord as any) as RDTL;
        }

        const fullRecord = {
            id: textToBytes(uut.toString()),
            type: newType,
            ...newRecord,
            ...this.creationDefaultDetails(),
        } as RDTL;
        const newDatum = this.mkDatum.capoStoredData({
            // data: new Map(Object.entries(beforeSave(fullRecord) as any)),
            data: beforeSave(fullRecord) as any,

            version: 2n,
            otherDetails: makeIntData(0),
        });
        console.log(
            `🏒 creating ${newType} ->`,
            JSON.parse(JSON.stringify(fullRecord, betterJsonSerializer, 2))
        );

        return tcx2.addOutput(
            makeTxOutput(
                this.capo.address,
                this.uh.mkMinTv(this.capo.mph, uut).add(extraCreationValue),
                newDatum
            )
        ) as TCX & typeof tcx2;
    }

    /**
     * Creates an indirect reference to an an update activity with arguments,
     * using a record-id placeholder.
     *
     * @remarks
     * Provide an update activity function, a placeholder for the record-id, any other args
     * for the on-chain activity/redeemer.
     *
     * This approach is similar to the creation-time {@link DelegatedDataContract.usesSeedActivity|usesSeedActivity()} method,
     * with a "...recId" placeholder instead of a "...seed" placeholder.
     *
     * The arguments are passed to the update activity function, which is expected to return
     * an {@link isActivity} object serializing the `{redeemer}` data as a UplcData object.
     * Normally that's done with {@link ContractBasedDelegate.mkSpendingActivity | mkSpendingActivity()}.
     */
    usesUpdateActivity<
        UA extends updateActivityFunc<any>
        // (...args: [hasRecId, ...any]) => isActivity
    >(this: DDC, a: UA, idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>) {
        return new UpdateActivity(this, a, args);
    }

    /**
     * Creates a transaction for updating a record in the delegated data store
     *
     * @remarks
     * Provide a transaction name, an existing item, and a controller activity to trigger.
     * The activity MUST either be an activity triggering one of the controller's SpendingActivity variants,
     * or the result of calling {@link DelegatedDataContract.usesUpdateActivity | usesUpdateActivity()}.
     *   **or TODO support a multi-activity**
     *
     * The updatedRecord only needs to contain the fields that are being updated.
     */
    async mkTxnUpdateRecord<
        CAI extends isActivity | UpdateActivity<any>,
        TCX extends StellarTxnContext
    >(
        this: DDC,
        txnName: string,
        item: FoundDatumUtxo<DgDataType<DDC>, MaybeWrappedDataType<DDC>>,
        options: WrappedDgDataUpdateOptions<
            DDC,
            CAI,
            MaybeWrappedDataType<DDC>,
            DgDataTypeLike<DDC>
        >,
        tcx?: TCX
    ): Promise<TCX> {
        tcx = tcx || (this.mkTcx(txnName) as TCX);
        const { capo } = this;
        const mintDelegate = await capo.getMintDelegate();
        const /* tcx1a*/ tcx1 = await this.tcxWithCharterRef(tcx);
        // const tcx1 = await this.tcxWithSettingsRef(tcx1a);

        const {
            activity,
            addedUtxoValue,
            beforeSave,
            updatedPartial,
            updatedRecord,
        } = options;
        // tell Capo to spend the DD record
        const tcx2 = await capo.txnAttachScriptOrRefScript(
            tcx1.addInput(item.utxo, capo.activitySpendingDelegatedDatum()),
            capo.compiledScript
        );
        const existingTypedData = this.newReadDatum(item.datum.data);
        const { id } = existingTypedData;

        // tell the spend delegate to allow the spend,
        // ... by authority of the delegated-data controller
        const spendDelegate = await capo.getSpendDelegate(
            tcx2.state.charterData
        );
        const typeName = this.recordTypeName;
        const tcx2a = await spendDelegate.txnGrantAuthority(
            tcx2,
            spendDelegate.activityUpdatingDelegatedData(id)
        );

        const materializedActivity: isActivity =
            activity instanceof UpdateActivity
                ? activity.mkRedeemer(id)
                : activity;

        let recordWithUpdates: DgDataType<DDC> = {} as any;
        if (updatedPartial) {
            recordWithUpdates = {
                ...existingTypedData,
                ...updatedPartial,
            };
        } else if (updatedRecord) {
            recordWithUpdates = this.unwrapData(updatedRecord as any);
        } else {
            throw new Error(
                `mkTxnUpdateRecord: must provide either updatedRecord or updatedPartial`
            );
        }

        return this.txnUpdatingRecord(tcx2a, id, item, {
            activity: materializedActivity,
            updatedRecord: recordWithUpdates,
            addedUtxoValue,
            beforeSave,
        });
    }

    async txnUpdatingRecord<
        // THIS extends DelegatedDataContract<DDC>,
        TCX extends StellarTxnContext & hasCharterRef
        // hasSeedUtxo &
        // hasSettingsRef
    >(
        this: DDC,
        tcx: TCX,
        id: hasRecId,
        item: FoundDatumUtxo<DgDataType<DDC>, MaybeWrappedDataType<DDC>>,
        // controllerActivity: isActivity,
        // record: WrappedDataType<THIS>,
        options: DgDataUpdateOptions<DDC, any, DgDataType<DDC>>
    ): Promise<TCX> {
        const recType = this.recordTypeName as DelegatedDatumTypeName<DDC>;

        const {
            addedUtxoValue = makeValue(0),
            beforeSave = (x) => x,
            activity,
            updatedRecord,
        } = options;
        console.log(
            `🏒 updating ${recType} ->`,
            JSON.parse(JSON.stringify(updatedRecord, betterJsonSerializer, 2))
        );

        const tcx2 = await this.txnGrantAuthority(tcx, activity);
        console.log(
            "    -- prev value in dgData utxo:",
            dumpAny(item.utxo.value)
        );
        console.log(
            "    -- addedUtxoValue in dgData utxo:",
            dumpAny(addedUtxoValue)
        );
        return tcx2.addOutput(
            makeTxOutput(
                this.capo.address,
                item.utxo.value
                    // .add(this.mkMinTv(this.capo.mph, id))
                    .add(addedUtxoValue),
                this.mkDatum.capoStoredData({
                    data: beforeSave(updatedRecord),
                    version: 2n,
                    otherDetails: makeIntData(0),
                })

                // this.mkDatumDelegatedDataRecord(beforeSave(record))
            )
        ) as TCX & typeof tcx2;
    }
}

/**
 * @public
 */
export type updateActivityFunc<ARGS extends [...any]> = (
    recId: hasRecId,
    ...args: ARGS
) => isActivity;

type UpdateActivityArgs<
    UA extends updateActivityFunc<any> //  (...args: [hasRecId, ...any]) => isActivity
> = UA extends updateActivityFunc<infer ARGS> ? ARGS : never;

class UpdateActivity<
    FactoryFunc extends updateActivityFunc<any>,
    ARGS extends [...any] = FactoryFunc extends updateActivityFunc<infer ARGS>
        ? ARGS
        : never
> {
    args: ARGS;
    constructor(
        private host: DelegatedDataContract<any>,
        private factoryFunc: updateActivityFunc<any>,
        args: ARGS
    ) {
        this.args = args;
    }

    mkRedeemer(recId: hasRecId) {
        return this.factoryFunc.call(this.host, recId, ...this.args);
    }
}

type hasRecId = string | number[] | UutName;
type CreationOptions<
    DGDC extends DelegatedDataContract<any>,
    WDT extends MaybeWrappedDataType<DGDC> = MaybeWrappedDataType<DGDC>,
    DT extends DgDataTypeLike<DGDC> = DgDataTypeLike<DGDC>
> = {
    addedUtxoValue?: Value;
    wrappedData?: WDT;
    data?: DT;
    beforeSave?(x: DT): DT;
};

type WrappedDgDataUpdateOptions<
    DGDC extends DelegatedDataContract<any>,
    CAI extends isActivity | UpdateActivity<any>,
    WDT extends MaybeWrappedDataType<DGDC> = MaybeWrappedDataType<DGDC>,
    DT extends DgDataTypeLike<DGDC> = DgDataTypeLike<DGDC>
> = {
    activity: CAI;
    updatedRecord?: WDT;
    updatedPartial?: Partial<DT>;

    addedUtxoValue?: Value;
    beforeSave?(x: DT): DT;
};

type DgDataUpdateOptions<
    DGDC extends DelegatedDataContract<any>,
    CAI extends isActivity | UpdateActivity<any>,
    DT extends DgDataType<DGDC> = DgDataType<DGDC>
> = {
    activity: CAI;
    updatedRecord: DT;

    addedUtxoValue?: Value;
    beforeSave?(x: DT): DT;
};
