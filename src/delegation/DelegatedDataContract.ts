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

export type DelegatedDatumType<T extends DelegatedDataContract> = ReturnType<
    T["mkDatumAdapter"]
> extends DelegatedDatumAdapter<infer D, any>
    ? D
    : never;

export type DelegatedDatumTypeName<
    T extends DelegatedDataContract,
    TN extends string = T["recordTypeName"]
> = TN;

// DelegatedDataContract provides a base class for utility functions
// to simplify implementation of delegate controllers
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
        DDType extends DelegatedDatumType<THIS> = DelegatedDatumType<THIS>
    >(
        this: THIS,
        record: DDType,
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
        DDType extends DelegatedDatumType<THIS> = DelegatedDatumType<THIS>
    >(
        this: THIS,
        tcx: TCX,
        record: DDType,
        controllerActivity: isActivity,
        extraCreationOptions: ExtraCreationOptions<DDType> = {}
    ): Promise<TCX> {
        const newType = this.recordTypeName as DelegatedDatumTypeName<THIS>;
        const {
            addedUtxoValue: extraCreationValue = new helios.Value(0n),
            beforeSave = (x) => x,
        } = extraCreationOptions;
        console.log(`🏒 creating ${newType}`);

        const tcx2 = await this.txnGrantAuthority(tcx, controllerActivity);

        const uut = tcx.state.uuts[newType];
        const newRecord: DDType = {
            ...record,
            id: uut.toString(),
            ...this.creationDefaultDetails(),
        };
        const newDatum = await this.mkDatumDelegatedDataRecord(
            beforeSave(newRecord)
        );

        return tcx2.addOutput(
            new helios.TxOutput(
                this.capo.address,
                this.mkMinTv(this.capo.mph, uut).add(extraCreationValue),
                newDatum
            )
        ) as TCX & typeof tcx2;
    }

    usesUpdateActivity<
        UA extends updateActivityFunc<any>
        // (...args: [hasRecId, ...any]) => isActivity
    >(a: UA, idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>) {
        return new UpdateActivity(this, a, args);
    }

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
        const tcx1b = await this.tcxWithSeedUtxo(tcx1a);
        const tcx1 = await this.tcxWithSettingsRef(tcx1b);

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
            spendDelegate.activityUpdatingDelegatedData(typeName, id)
        );

        const activity: isActivity =
            controllerActivity instanceof UpdateActivity
                ? controllerActivity.mkRedeemer(id)
                : controllerActivity;

        return this.txnUpdatingRecord(
            tcx2a,
            id,
            activity,
            {
                ...item.datum,
                ...updatedRecord,
            },
            options
        );
    }

    async txnUpdatingRecord<
        THIS extends DelegatedDataContract,
        TCX extends StellarTxnContext &
            hasCharterRef &
            hasSeedUtxo &
            hasSettingsRef
    >(
        this: THIS,
        tcx: TCX,
        id: hasRecId,
        controllerActivity: isActivity,
        record: DelegatedDatumType<THIS>,
        options: ExtraUpdateOptions<DelegatedDatumType<THIS>> = {}
    ): Promise<TCX> {
        const recType = this.recordTypeName as DelegatedDatumTypeName<THIS>;
        console.log(`🏒 updating ${recType}`);

        const tcx2 = await this.txnGrantAuthority(tcx, controllerActivity);
        const { addedUtxoValue = new helios.Value(0n), beforeSave = (x) => x } =
            options;

        return tcx2.addOutput(
            new helios.TxOutput(
                this.capo.address,
                this.mkMinTv(this.capo.mph, id).add(addedUtxoValue),
                await this.mkDatumDelegatedDataRecord(beforeSave(record))
            )
        ) as TCX & typeof tcx2;
    }
}

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

type seedActivityFunc<ARGS extends [...any]> = (
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

    mkRedeemer(thing: hasSeed) {
        // const { txId, idx } = this.host.getSeed(thing);

        return this.factoryFunc.call(this.host, thing, ...this.args);
    }
}

type updateActivityFunc<ARGS extends [...any]> = (
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
