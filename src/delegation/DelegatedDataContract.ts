import { makeTxOutput, makeValue, type Value } from "@helios-lang/ledger";
import { makeIntData } from "@helios-lang/uplc";

import type {
    FoundDatumUtxo,
    hasCharterRef,
    hasUutContext,
} from "../CapoTypes.js";
import type { hasSettingsRef } from "../CapoTypes.js";
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
import type { AnyDataTemplate, minimalData } from "./DelegatedData.js";
import { uplcDataSerializer } from "./jsonSerializers.js";

/**
 * @public
 */
export type DgDataType<T extends DelegatedDataContract<any, any>> =
    T extends DelegatedDataContract<infer T, infer TLike> ? T : never;

/**
 * @public
 */
export type DgDataTypeLike<T extends DelegatedDataContract<any, any>> =
    T extends DelegatedDataContract<infer T, infer TLike> ? TLike : never;

/**
 * use for new or updated record data, where id and type can
 * be implied instead of explicitly provided
 * @public
 */
export type minimalDgDataTypeLike<T extends DelegatedDataContract<any, any>> =
    minimalData<DgDataTypeLike<T>>;

/**
 * @public
 * @deprecated use minimalDgDataTypeLike instead
 */
export type DgDataCreationAttrs<
    T extends DelegatedDataContract<any, any> // | DelegatedDatumAdapter<any>
> = Omit<DgDataTypeLike<T>, "id" | "type">;

/**
 * @public
 */
export type DelegatedDatumTypeName<
    T extends DelegatedDataContract<any, any>,
    TN extends string = T["recordTypeName"]
> = TN;

export type DelegatedDatumIdPrefix<
    T extends DelegatedDataContract<any, any>,
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
    T extends AnyDataTemplate<any, any>,
    TLike extends AnyDataTemplate<any, any>
> extends ContractBasedDelegate {
    usesWrappedData?: boolean;
    dgDatumHelper = this.dataBridgeClass?.prototype.DelegateDatum;

    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * This is a convenience for the controller, and should be used along with
     * the appropriate on-chain policy to require the gov token's presence.
     */
    needsGovAuthority = false;
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
                    `\nA concrete bundle class should be defined in \`${this.delegateName}.concrete.hlb.ts\`\n` +
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
                `\nDefined in a \`*.hlb.ts\` file, it should have at minimum:\n` +
                `    import {YourAppCapo} from "./YourAppCapo.js";\n\n` +
                `    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";\n\n` +
                `    export default class SomeDelegateBundle extends CapoHeliosBundle {\n` +
                `        get specializedDelegateModule() { return SomeSpecializedDelegate; }\n` +
                `    }\n\n` +
                `We'll generate types in a .typeInfo.ts file, based on the types in your Helios sources,\n` +
                `  ... and a .bridge.ts file having data-conversion classes for your on-chain types.`+
                `\nWhen your delegated-data controller is used within your Capo, your bundle will\n` +
                `have access via import {...} to any helios modules provided by that Capo's .hlb.ts. `
        );

        return null as unknown as CapoDelegateBundle;
    }

    /**
     * Finds records of this delegate's type, optionally by ID.
     * @remarks
     * Returns a record list when no ID is provided, or a single record when an ID is provided.
     */
    async findRecords<
        THIS extends DelegatedDataContract<any, any>,
        ID extends undefined | string | UutName | number[]
    >(
        this: THIS,
        options: {
            id?: T;
            // TODO: support single/predicate/query options by passing them through
            // single : boolean
            // predicate: ...
            // query
        } = {}
    ): Promise<
        ID extends undefined
            ? FoundDatumUtxo<T, TLike>[]
            : FoundDatumUtxo<T, TLike>
    > {
        const result = await this.capo.findDelegatedDataUtxos({
            type: this.recordTypeName,
            // single, // todo: support single in the options
            // predicate
        });
        if (options.id == undefined) {
            // this is the typed-array case.  We could get more explicit
            // about casting the result type, but that's already provided by the
            // definition of ***this function's*** return type.
            return result as any;
        }
        // the caller will already know whether the expected type is an array above,
        // or a  single item below.
        return this.capo.singleItem(result) as any;
    }

    mkDgDatum<THIS extends DelegatedDataContract<any, any>>(
        this: THIS,
        record: TLike
    ): InlineDatum {
        // console.log({record}, "8888888888888888888888888888888888888")

        return this.mkDatum.capoStoredData({
            data: record,
            version: 2n,
            otherDetails: makeIntData(0),
        });
    }

    /**
     * Intuition hook redirecting to activity.MintingActivities.$seeded$...
     * @remarks
     * @deprecated use activites.MintingActivites.$seeded$* accessors/methods instead.
     */
    usesSeedActivity<SA extends seedActivityFunc<any, any>>(
        a: SA,
        seedPlaceholder: "...seed",
        ...args: SeedActivityArg<SA>
    ) {
        throw new Error(
            `make an implied-seed activity with this.activity.MintingActivites.$seeded$*`
        );
        // console.log("seed activity with function ", a.name, a)
        // return new SeedActivity(this, a, args);
    }

    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     */
    async mkTxnCreateRecord<
        TCX extends StellarTxnContext
        // DDType extends MaybeWrappedDataType<THIS> = MaybeWrappedDataType<THIS>,
        // minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(options: DgDataCreationOptions<TLike>, tcx?: TCX): Promise<TCX> {
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

        const dataType = this.recordTypeName;
        // mints the UUT needed to create the record, which triggers the mint delegate
        // to enforce the data delegate creation policy
        const tcx2 = await capo.txnMintingUuts(tcx1c, [this.idPrefix], {
            mintDelegateActivity: mintDelegate.activity.CreatingDelegatedData(
                tcx1c,
                { dataType }
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
        return this.txnCreatingRecord(tcx2, {
            ...options,
            activity,
        }).then((tcx3) => tcx3);
    }

    creationDefaultDetails(): Partial<TLike> {
        return {};
    }

    async txnCreatingRecord<
        TCX extends StellarTxnContext &
            hasCharterRef &
            hasSeedUtxo &
            // hasSettingsRef &
            hasUutContext<DelegatedDatumIdPrefix<this>>
    >(
        tcx: TCX,
        // record: minDDType,
        options: CoreDgDataCreationOptions<TLike>
    ): Promise<TCX> {
        const newType = this.recordTypeName as DelegatedDatumTypeName<this>;
        const idPrefix = this.idPrefix as DelegatedDatumIdPrefix<this>;

        const {
            addedUtxoValue: extraCreationValue = makeValue(0n),
            data: typedData,
            activity,
        } = options;

        const tcx2 = await this.txnGrantAuthority(tcx, activity);

        const uut = tcx.state.uuts[idPrefix];
        let newRecord: DgDataTypeLike<this> = typedData as any;

        const defaults = this.creationDefaultDetails() || {};
        const fullRecord = {
            id: textToBytes(uut.toString()),
            type: newType,
            ...defaults,
            ...newRecord,
        } as DgDataTypeLike<this>;

        const newDatum = this.mkDatum.capoStoredData({
            // data: new Map(Object.entries(beforeSave(fullRecord) as any)),
            data: fullRecord,
            version: 2n,
            otherDetails: makeIntData(0),
        });
        console.log(
            `🏒 creating ${newType} -> `+
            uplcDataSerializer(newType, fullRecord, 1)

        );
        let tcx3 = tcx2;
        if (this.needsGovAuthority) {
            tcx3 = await this.capo.txnAddGovAuthority(tcx2);
        }

        return tcx3.addOutput(
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
    >(a: UA, _idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>) {
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
    async mkTxnUpdateRecord<TCX extends StellarTxnContext>(
        this: DelegatedDataContract<any, any>,
        txnName: string,
        item: FoundDatumUtxo<T, any>,
        options: DgDataUpdateOptions<TLike>,
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
            tcx1,
            capo.compiledScript
        );
        const tcx2a = tcx2.addInput(
            item.utxo,
            capo.activitySpendingDelegatedDatum()
        );
        const existingTypedData = item.data as DgDataType<this>;
        let recId: string | number[] = existingTypedData.id;
        if (!Array.isArray(recId)) {
            recId = textToBytes(recId);
        }
        // tell the spend delegate to allow the spend,
        // ... by authority of the delegated-data controller
        const spendDelegate = await capo.getSpendDelegate(
            tcx2a.state.charterData
        );
        const dataType = this.recordTypeName;
        const tcx2b = await spendDelegate.txnGrantAuthority(
            tcx2a,
            spendDelegate.activity.UpdatingDelegatedData({
                dataType,
                recId,
            })
        );

        const materializedActivity: isActivity =
            activity instanceof UpdateActivity
                ? activity.mkRedeemer(recId)
                : activity;

        let recordWithUpdates: DgDataTypeLike<this> = {
            ...(existingTypedData as any),
            ...updatedFields,
        };

        // const patchedRecord = beforeSave(recordWithUpdates);


        let tcx2c = tcx2b;
        if (this.needsGovAuthority) {
            tcx2c = await this.capo.txnAddGovAuthority(tcx2b);
        }

        return this.txnUpdatingRecord(tcx2b, recId, item, {
            activity: materializedActivity,
            addedUtxoValue,
            updatedFields: recordWithUpdates as any,
        });
    }

    async txnUpdatingRecord<
        TCX extends StellarTxnContext & hasCharterRef
        // hasSeedUtxo &
        // hasSettingsRef
    >(
        tcx: TCX,
        id: hasRecId,
        item: FoundDatumUtxo<T, any>,
        // controllerActivity: isActivity,
        // record: WrappedDataType<THIS>,
        options: CoreDgDataUpdateOptions<TLike>
    ): Promise<TCX> {
        const recType = this.recordTypeName as DelegatedDatumTypeName<this>;

        const {
            addedUtxoValue = makeValue(0),
            // beforeSave = (x) => x,
            activity,
            updatedFields: updatedRecord,
        } = options;

        const fullUpdatedRecord: TLike = {
            ...(item.data as TLike),
            ...updatedRecord,
        }

        console.log(
            `🏒 updating ${recType} ->`,
            uplcDataSerializer(recType,
                JSON.parse(JSON.stringify(updatedRecord, betterJsonSerializer, 2)),
                1
            )
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
        return this.returnUpdatedRecord(
            tcx, 
            item.utxo.value.add(addedUtxoValue), // .add(this.mkMinTv(this.capo.mph, id))
            fullUpdatedRecord
        );
    }
    getReturnAddress() {
        return this.capo.address;
    }
    returnUpdatedRecord<
        TCX extends StellarTxnContext & hasCharterRef
    >(tcx: TCX, returnedValue: Value, updatedRecord: TLike): TCX {
        return tcx.addOutput(
            makeTxOutput(
                this.getReturnAddress(),
                returnedValue,
                this.mkDatum.capoStoredData({
                    data: updatedRecord,
                    version: 2n,
                    otherDetails: makeIntData(0),
                })

                // this.mkDatumDelegatedDataRecord(beforeSave(record))
            )
        )
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
        private host: DelegatedDataContract<any, any>,
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

/**
 * @public
 */
export type DgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity | SeedActivity<any>;
    data: minimalData<TLike>;
    // beforeSave?(x: DT): DT;

    addedUtxoValue?: Value;
};

export type CoreDgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> =
    {
        activity: isActivity;
        data: minimalData<TLike>;
        // beforeSave?(x: DT): DT;

        addedUtxoValue?: Value;
    };

/**
 * @public
 */
export type DgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity | UpdateActivity<any>;
    updatedFields: Partial<minimalData<TLike>>;

    addedUtxoValue?: Value;
    // beforeSave?(x: DTL): DTL;
};

// omits type-wrapper and requires all fields for data-type-like
export type CoreDgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    updatedFields: minimalData<TLike>;

    addedUtxoValue?: Value;
    // beforeSave?(x: DTL): DTL;
};
