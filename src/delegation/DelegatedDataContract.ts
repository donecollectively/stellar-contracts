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
import type { SomeDgtDatumHelper, SomeDgtDatumReader } from "./GenericDelegateBridge.js";
import type { AnyDataTemplate, minimalData } from "./DelegatedData.js";
import type { Expand } from "../testing/types.js";
import type { IFISNEVER, TypeError } from "../helios/typeUtils.js";
import type { WrappedDgDataType } from "./WrappedDgDataContract.js";

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
    T extends DelegatedDataContract,
    DATUM extends InstanceType<T["dataBridgeClass"]>["readDatum"] &
        SomeDgtDatumReader = InstanceType<T["dataBridgeClass"]>["readDatum"] &
        SomeDgtDatumReader,
    CSD_struct extends Exclude<
        ReturnType<DATUM>["capoStoredData"],
        undefined
    > = Exclude<ReturnType<DATUM>["capoStoredData"], undefined>,
    DTYP extends CSD_struct extends { data: AnyDataTemplate<any, any> }
        ? CSD_struct["data"]
        : never = CSD_struct extends { data: AnyDataTemplate<any, any> }
        ? CSD_struct["data"]
        : never
    // & {
    //     data: AnyDataTemplate<any, any>;
    // }
> = ErgoAnyData & DTYP; // CSD_struct["data"];

export type DgDataTypeLike<
    T extends DelegatedDataContract,
    CSDFP extends Parameters<
        InstanceType<T["dataBridgeClass"]>["DelegateDatum"]["capoStoredData"]
    > = Parameters<
        InstanceType<T["dataBridgeClass"]>["DelegateDatum"]["capoStoredData"]
    >,
    csdLike extends CSDFP extends [{ data: AnyDataTemplate<any, any> }, ...any]
        ? CSDFP extends [{ data: infer specificDT }]
            ? specificDT
            : TypeError<any,any>
        : TypeError<any,any> = CSDFP extends [{ data: AnyDataTemplate<any, any> }, ...any]
        ? CSDFP extends [{ data: infer specificDT }]
            ? specificDT
            : TypeError<"unreachable", {}>
        : TypeError<
            "delegated data contract must define a dataBridgeClass with capoStoredData matching data:AnyDataTemplate",
            { dataBridgeClass: T["dataBridgeClass"] }
        >
> = csdLike;

/**
 * use for new or updated record data, where id and type can
 * be implied instead of explicitly provided
 */
export type minimalDgDataTypeLike<T extends DelegatedDataContract> =
    minimalData<DgDataTypeLike<T>>;

/**
 * @public
 * @deprecated use minimalDgDataTypeLike instead
 */
export type DgDataCreationAttrs<
    T extends DelegatedDataContract // | DelegatedDatumAdapter<any>
> = Omit<DgDataTypeLike<T>, "id" | "type">;

/**
 * @public
 */
export type DelegatedDatumTypeName<
    T extends DelegatedDataContract,
    TN extends string = T["recordTypeName"]
> = TN;

export type DelegatedDatumIdPrefix<
    T extends DelegatedDataContract,
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
export abstract class DelegatedDataContract extends ContractBasedDelegate {
    usesWrappedData?: boolean;
    // dgDatumHelper: SomeDgtDatumHelper<any> = this.dataBridgeClass.prototype.DelegateDatum

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

    mkDgDatum<
        THIS extends DelegatedDataContract
    >(
        this: THIS,
        record: DgDataTypeLike<THIS>
    ): InlineDatum {
        // console.log({record}, "8888888888888888888888888888888888888")

        return this.mkDatum.capoStoredData({
            data: record,
            version: 2n,
            otherDetails: makeIntData(0),
        });
    }

    /**
     * Creates an indirect reference to a seed activity with arguments,
     * using a seed placeholder.
     *
     * @remarks
     * Provide a seed activity function, a placeholder for the seed, any other args
     * for the on-chain activity/redeemer.  The seed-activity function can be any of this
     * contract's `activity.MintingActivities.*` functions.
     *
     * The arguments are passed to the seed activity function, which is expected to return
     * an {@link isActivity} object serializing the `{redeemer}` data as a UplcData object.
     * 
     * ^This was formerly done with {@link ContractBasedDelegate.mkSeededMintingActivity|mkSeededMintingActivity()}
     */
    usesSeedActivity<SA extends seedActivityFunc<any, any>>(
        a: SA,
        seedPlaceholder: "...seed",
        ...args: SeedActivityArg<SA>
    ) {
        throw new Error(`unused up until now, doesn't mean unused!`);
        // console.log("seed activity with function ", a.name, a)
        // return new SeedActivity(this, a, args);
    }

    async mkTxnCreateRecord<
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        options: DgDataCreationOptions<this, any>,
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
            options.activity instanceof SeedActivity
                ? options.activity.mkRedeemer(tcx2)
                : options.activity;

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

    creationDefaultDetails(): Partial<DgDataTypeLike<this>> {
        return {};
    }

    async txnCreatingRecord<
        TCX extends StellarTxnContext &
            hasCharterRef &
            hasSeedUtxo &
            // hasSettingsRef &
            hasUutContext<DelegatedDatumIdPrefix<this>>,
        RDTL extends DgDataTypeLike<this> = DgDataTypeLike<this>,
    >(
        tcx: TCX,
        // record: minDDType,
        controllerActivity: isActivity,
        options: DgDataCreationOptions<this, any>
    ): Promise<TCX> {
        const newType = this.recordTypeName as DelegatedDatumTypeName<this>;
        const idPrefix = this.idPrefix as DelegatedDatumIdPrefix<this>;

        const {
            addedUtxoValue: extraCreationValue = makeValue(0n),
            data: typedData,
        } = options;

        const tcx2 = await this.txnGrantAuthority(tcx, controllerActivity);

        const uut = tcx.state.uuts[idPrefix];
        let newRecord: RDTL = typedData as any;

        const defaults = this.creationDefaultDetails() || {};
        const fullRecord = {
            id: textToBytes(uut.toString()),
            type: newType,
            ...defaults,
            ...newRecord,
        } as RDTL;

        const newDatum = this.mkDatum.capoStoredData({
            // data: new Map(Object.entries(beforeSave(fullRecord) as any)),
            data: fullRecord,
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
     * for the on-chain activity/redeemer.  The update-activity function can be any of this
     * contract's `activity.SpendingActivities.*` functions.
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
    >(
        a: UA,
        _idPlaceholder: "...recId",
        ...args: UpdateActivityArgs<UA>
    ) {
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
        txnName: string,
        item: FoundDatumUtxo<DgDataType<this>, any>,
        options: DgDataUpdateOptions<this, CAI>,
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
            // beforeSave = (x) => x,
            updatedFields,
        } = options;
        // tell Capo to spend the DD record
        const tcx2 = await capo.txnAttachScriptOrRefScript(
            tcx1.addInput(item.utxo, capo.activitySpendingDelegatedDatum()),
            capo.compiledScript
        );
        const existingTypedData = item.data as DgDataType<this>;
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

        let recordWithUpdates: DgDataTypeLike<this> = {
                ...(existingTypedData as any),
                ...updatedFields,
            };

        // const patchedRecord = beforeSave(recordWithUpdates);

        return this.txnUpdatingRecord(tcx2a, id, item, {
            activity: materializedActivity,
            addedUtxoValue,
            updatedFields: (recordWithUpdates as any),
        });
    }

    async txnUpdatingRecord<
        TCX extends StellarTxnContext & hasCharterRef
        // hasSeedUtxo &
        // hasSettingsRef
    >(
        tcx: TCX,
        id: hasRecId,
        item: FoundDatumUtxo<DgDataType<this>, any>,
        // controllerActivity: isActivity,
        // record: WrappedDataType<THIS>,
        options: CoreDgDataUpdateOptions<this, any>
    ): Promise<TCX> {
        const recType = this.recordTypeName as DelegatedDatumTypeName<this>;

        const {
            addedUtxoValue = makeValue(0),
            // beforeSave = (x) => x,
            activity,
            updatedFields: updatedRecord,
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
                    data: updatedRecord,
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

export class UpdateActivity<
    FactoryFunc extends updateActivityFunc<any>,
    ARGS extends [...any] = FactoryFunc extends updateActivityFunc<infer ARGS>
        ? ARGS
        : never
> {
    args: ARGS;
    constructor(
        private host: DelegatedDataContract,
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
export type DgDataCreationOptions<
    DGDC extends DelegatedDataContract,
    DTL extends minimalDgDataTypeLike<DGDC> = minimalDgDataTypeLike<DGDC>,
    WDT extends WrappedDgDataType<DGDC> = WrappedDgDataType<DGDC>,
> = {
    activity: isActivity | SeedActivity<any>;
    wrapped?: WDT;
    data: IFISNEVER<WDT, DTL, undefined | DTL>;
    // beforeSave?(x: DT): DT;

    addedUtxoValue?: Value;
};

export type DgDataUpdateOptions<
    DGDC extends DelegatedDataContract,
    CAI extends isActivity | UpdateActivity<any>,
    DTL extends DgDataTypeLike<DGDC> = DgDataTypeLike<DGDC>,
    WRAPPED extends never | WrappedDgDataType<DGDC> = WrappedDgDataType<DGDC>,
> = {
    activity: CAI;
    updatedFields?: DTL;
    updatedWrapped: WRAPPED;

    addedUtxoValue?: Value;
    // beforeSave?(x: DTL): DTL;
};

// omits type-wrapper and requires all fields for data-type-like
export type CoreDgDataUpdateOptions<
    DGDC extends DelegatedDataContract,
    CAI extends isActivity | UpdateActivity<any>,
    DTL extends DgDataTypeLike<DGDC> = DgDataTypeLike<DGDC>
> = {
    activity: CAI;
    updatedFields: DTL;
    addedUtxoValue?: Value;
    // beforeSave?(x: DTL): DTL;
};
