import { TxOutputId, type TxId } from "@helios-lang/ledger-babbage";
import type { UplcData } from "@helios-lang/uplc";
import { StellarTxnContext, type hasSeedUtxo } from "./StellarTxnContext.js";
import type { TxOutputIdLike } from "@helios-lang/ledger-babbage/types/tx/TxOutputId.js";

/**
 * @public
 */
export type hasSeed = SeedAttrs | hasSeedUtxo | TxOutputIdLike

/**
 * a type for redeemer/activity-factory functions declared with \@Activity.redeemer
 *
 * @public
 */
export type isActivity = {
    // redeemer: UplcDataValue | UplcData | T;
    redeemer: UplcData;
    details?: string;
};


/**
 * @public
 */
export type SeedAttrs = {
    txId: TxId,
    idx: bigint,
}

export type SeedActivityArgs<
    SA extends seedActivityFunc<any, any>
> = SA extends seedActivityFunc<infer ARGS, any> ? ARGS : never;

/**
 * @public
 */
export type seedActivityFunc<ARGS extends [...any], RV extends isActivity | UplcData> = (
    seed: hasSeed,
    ...args: ARGS
) => RV;

export class SeedActivity<
    FactoryFunc extends seedActivityFunc<any, any>,
    ARGS extends [...any] = FactoryFunc extends seedActivityFunc<infer ARGS, any> ? ARGS : never> {
    args: ARGS;
    constructor(
        private host: { getSeed(x: hasSeed): TxOutputId },
        private factoryFunc,
        args: ARGS
    ) {
        this.args = args;
    }

    mkRedeemer(seedFrom: hasSeed) {
        // const seed = this.host.getSeed(thing);
        return this.factoryFunc.bind(this.host, seedFrom, ...this.args);
    }
}

export type WithImpliedSeedVariant<
    FACTORY_FUNC extends (...args: [ hasSeed, ... ARGS ]) => any,
    ARGS extends [ ... any] = FACTORY_FUNC extends (...args: [ hasSeed, ... infer ARGS ]) => any ? ARGS : never
> = FACTORY_FUNC & {
    withImpliedSeed: (...args: ARGS) => SeedActivity<FACTORY_FUNC, ARGS>
}

export function withImpliedSeedVariant<
    FACTORY_FUNC extends seedActivityFunc<any, any>,
    ARGS extends [...any]
>(
    host: { getSeed(x: hasSeed): TxOutputId },
    factoryFunc: FACTORY_FUNC,
): WithImpliedSeedVariant<FACTORY_FUNC, ARGS> {
    const withImpliedSeed = (...args: ARGS) => {
        const seedActivity = new SeedActivity(host, factoryFunc, args);
        return seedActivity;
    };
    return Object.assign(factoryFunc, { withImpliedSeed });
}

export function getSeed(arg: hasSeed) : TxOutputId{
    if (arg instanceof TxOutputId) return arg
    if (arg instanceof StellarTxnContext) {
        const { txId, idx } = arg.getSeedUtxoDetails();
        return new TxOutputId(txId, idx);
    }
    //@ts-expect-error on this type probe
    if (arg.idx && arg.txId) {
        const attr : SeedAttrs = arg as SeedAttrs;
        return new TxOutputId(attr.txId, attr.idx)
    }
    const txoIdLike = arg as Exclude<typeof arg, SeedAttrs>
    return TxOutputId.new(txoIdLike);
}
