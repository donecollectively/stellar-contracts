import * as helios from "@hyperionbt/helios";
import type {
    FoundDatumUtxo,
    hasCharterRef,
    hasSettingsRef,
    hasUutContext,
} from "../Capo.js";
import type { DelegatedDatumAdapter } from "../DelegatedDatumAdapter.js";
import type { ReqtsMap } from "../Requirements.js";
import type { hasSeed, isActivity } from "../StellarContract.js";
import type { StellarTxnContext, hasSeedUtxo } from "../StellarTxnContext.js";
import { ContractBasedDelegate } from "./ContractBasedDelegate.js";
import type { UutName } from "./UutName.js";
import type { BasicMintDelegate } from "../minting/BasicMintDelegate.js";
import { betterJsonSerializer, dumpAny } from "../diagnostics.js";

/**
 * @public
 */
export type DelegatedDatumType<T extends DelegatedDataContract> = ReturnType<
    T["mkDatumAdapter"]
> extends DelegatedDatumAdapter<infer D, any>
    ? D
    : never;

/**
 * @public
 */
export type DelegatedDatumTypeName<
    T extends DelegatedDataContract,
    TN extends string = T["recordTypeName"]
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
    abstract get recordTypeName(): string;
    get delegateName() {
        return `${this.recordTypeName}Ctrl`;
    }
    // abstract get capo(): Capo<any>;
    abstract requirements(): ReqtsMap<any, any> | ReqtsMap<any, never>;

    async findRecord(id: string | UutName) {
        return this.capo
            .findDelegatedDataUtxos({
                type: this.recordTypeName,
                id,
            })
            .then(this.capo.singleItem);
    }
    abstract mkDatumAdapter(): DelegatedDatumAdapter<any, any>;

    async mkDatumDelegatedDataRecord<THIS extends DelegatedDataContract>(
        this: THIS,
        record: DelegatedDatumType<THIS>
    ): Promise<helios.Datum> {
        const adapter = this.mkDatumAdapter();

        return adapter.toOnchainDatum(record);
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
    usesSeedActivity<SA extends seedActivityFunc<any>>(
        a: SA,
        seedPlaceholder: "...seed",
        ...args: SeedActivityArgs<SA>
    ) {
        return new SeedActivity(this, a, args);
    }

    async mkTxnCreateRecord<
        THIS extends DelegatedDataContract,
        CAI extends isActivity | SeedActivity<any>,
        TCX extends StellarTxnContext,
        DDType extends DelegatedDatumType<THIS> = DelegatedDatumType<THIS>,
        minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        this: THIS,
        record: minDDType,
        controllerActivity: CAI,
        extraCreationOptions?: ExtraCreationOptions<DDType>,
        tcx?: TCX
    ): Promise<TCX> {
        // ... it does the setup for the creation activity,
        //   so that the actual "creation" part of the transaction will be ready to go

        tcx = tcx || (this.mkTcx(`create ${this.recordTypeName}`) as TCX);
        // all the reference data that can be needed by the creation policy
        const tcx1a = await this.tcxWithCharterRef(tcx);
        const tcx1b = await this.tcxWithSeedUtxo(tcx1a);
        const tcx1c = await this.tcxWithSettingsRef(tcx1b);
        const { capo } = this;
        const mintDelegate = await capo.getMintDelegate();

        // mints the UUT needed to create the record, which triggers the mint delegate
        // to enforce the data delegate creation policy
        const tcx2 = await capo.txnMintingUuts(tcx1c, [this.recordTypeName], {
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
            record,
            activity,
            extraCreationOptions
        );
    }

    creationDefaultDetails(): Partial<DelegatedDatumType<this>> {
        return {};
    }

    async txnCreatingRecord<
        THIS extends DelegatedDataContract,
        TCX extends StellarTxnContext &
            hasCharterRef &
            hasSeedUtxo &
            hasSettingsRef &
            hasUutContext<DelegatedDatumTypeName<THIS>>,
        DDType extends DelegatedDatumType<THIS> = DelegatedDatumType<THIS>,
        minDDType extends DgDataCreationAttrs<THIS> = DgDataCreationAttrs<THIS>
    >(
        this: THIS,
        tcx: TCX,
        record: minDDType,
        controllerActivity: isActivity,
        extraCreationOptions: ExtraCreationOptions<DDType> = {}
    ): Promise<TCX> {
        const newType = this.recordTypeName as DelegatedDatumTypeName<THIS>;
        const {
            addedUtxoValue: extraCreationValue = new helios.Value(0n),
            beforeSave = (x) => x,
        } = extraCreationOptions;
        console.log(
            `🏒 creating ${newType} ->`,
            JSON.parse(JSON.stringify(record, betterJsonSerializer, 2))
        );

        const tcx2 = await this.txnGrantAuthority(tcx, controllerActivity);

        const uut = tcx.state.uuts[newType];
        const newRecord: DDType = {
            ...(record as unknown as DDType),
            id: uut.toString(),
            type: newType,
            ...this.creationDefaultDetails(),
        };
        const newDatum = await this.mkDatumDelegatedDataRecord(
            beforeSave(newRecord)
        );

        return tcx2.addOutput(
            new helios.TxOutput(
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
    >(a: UA, idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>) {
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
        THIS extends DelegatedDataContract,
        CAI extends isActivity | UpdateActivity<any>,
        TCX extends StellarTxnContext
    >(
        this: THIS,
        txnName: string,
        item: FoundDatumUtxo<DelegatedDatumType<THIS>>,
        controllerActivity: CAI,
        updatedRecord: Partial<DelegatedDatumType<THIS>>,
        options?: ExtraUpdateOptions<DelegatedDatumType<THIS>>,
        tcx?: TCX
    ): Promise<TCX> {
        tcx = tcx || (this.mkTcx(txnName) as TCX);
        const { capo } = this;
        const mintDelegate = await capo.getMintDelegate();
        const tcx1a = await this.tcxWithCharterRef(tcx);
        const tcx1 = await this.tcxWithSettingsRef(tcx1a);

        // tell Capo to spend the DD record
        const tcx2 = await capo.txnAttachScriptOrRefScript(
            tcx1.addInput(item.utxo, capo.activitySpendingDelegatedDatum()),
            capo.compiledScript
        );
        const { id } = item.datum;
        // tell the spend delegate to allow the spend,
        // ... by authority of the delegated-data controller
        const spendDelegate = (await capo.getSpendDelegate(
            tcx2.state.charterDatum
        )) as BasicMintDelegate;
        const typeName = this.recordTypeName;
        const tcx2a = await spendDelegate.txnGrantAuthority(
            tcx2,
            spendDelegate.activityUpdatingDelegatedData(id)
        );

        const activity: isActivity =
            controllerActivity instanceof UpdateActivity
                ? controllerActivity.mkRedeemer(id)
                : controllerActivity;

        const recordWithUpdates = {
            ...item.datum,
            ...updatedRecord,
        };

        return this.txnUpdatingRecord(
            tcx2a,
            id,
            item,
            activity,
            recordWithUpdates,
            options
        );
    }

    async txnUpdatingRecord<
        THIS extends DelegatedDataContract,
        TCX extends StellarTxnContext &
            hasCharterRef &
            // hasSeedUtxo &
            hasSettingsRef
    >(
        this: THIS,
        tcx: TCX,
        id: hasRecId,
        item: FoundDatumUtxo<DelegatedDatumType<THIS>>,
        controllerActivity: isActivity,
        record: DelegatedDatumType<THIS>,
        options: ExtraUpdateOptions<DelegatedDatumType<THIS>> = {}
    ): Promise<TCX> {
        const recType = this.recordTypeName as DelegatedDatumTypeName<THIS>;
        console.log(
            `🏒 updating ${recType} ->`,
            JSON.parse(JSON.stringify(record, betterJsonSerializer, 2))
        );

        const tcx2 = await this.txnGrantAuthority(tcx, controllerActivity);
        const { addedUtxoValue = new helios.Value(0n), beforeSave = (x) => x } =
            options;
        console.log(
            "    -- prev value in dgData utxo:",
            dumpAny(item.utxo.value)
        );
        console.log(
            "    -- addedUtxoValue in dgData utxo:",
            dumpAny(addedUtxoValue)
        );
        return tcx2.addOutput(
            new helios.TxOutput(
                this.capo.address,
                item.utxo.value
                    // .add(this.mkMinTv(this.capo.mph, id))
                    .add(addedUtxoValue),

                await this.mkDatumDelegatedDataRecord(beforeSave(record))
            )
        ) as TCX & typeof tcx2;
    }
}

/**
 * @public
 */
export type DgDataCreationAttrs<
    T extends DelegatedDataContract | DelegatedDatumAdapter<any, any>
> = T extends DelegatedDatumAdapter<infer D, any>
    ? Omit<D, "id" | "type">
    : T extends DelegatedDataContract
    ? ReturnType<T["mkDatumAdapter"]> extends DelegatedDatumAdapter<
          infer D,
          any
      >
        ? Omit<D, "id" | "type">
        : never
    : never;

type SeedActivityArgs<SA extends seedActivityFunc<any>> =
    SA extends seedActivityFunc<infer ARGS> ? ARGS : never;

/**
 * @public
 */
export type seedActivityFunc<ARGS extends [...any]> = (
    seed: hasSeed,
    ...args: ARGS
) => isActivity;

class SeedActivity<
    FactoryFunc extends seedActivityFunc<any>,
    ARGS extends [...any] = FactoryFunc extends seedActivityFunc<infer ARGS>
        ? ARGS
        : never
> {
    args: ARGS;
    constructor(
        private host: ContractBasedDelegate<any>,
        private factoryFunc,
        args: ARGS
    ) {
        this.args = args;
    }

    mkRedeemer(seedFrom: hasSeed) {
        // const seed = this.host.getSeed(thing);

        return this.factoryFunc.call(this.host, seedFrom, ...this.args);
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

type hasRecId = string | UutName;
type ExtraCreationOptions<T extends DelegatedDatumType<any>> = {
    addedUtxoValue?: helios.Value;
    beforeSave?(x: T): T;
};

type ExtraUpdateOptions<T extends DelegatedDatumType<any>> = {
    addedUtxoValue?: helios.Value;
    beforeSave?(x: T): T;
};
