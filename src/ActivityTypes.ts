import type { TxId, TxOutputId } from "@helios-lang/ledger-babbage";
import type { UplcData } from "@helios-lang/uplc";
import type { hasSeedUtxo } from "./StellarTxnContext.js";

/**
 * @public
 */
export type hasSeed = SeedAttrs | hasSeedUtxo;


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
    SA extends seedActivityFunc<any>
> = SA extends seedActivityFunc<infer ARGS> ? ARGS : never;

/**
 * @public
 */
export type seedActivityFunc<ARGS extends [...any]> = (
    seed: hasSeed,
    ...args: ARGS
) => isActivity;

export class SeedActivity<
    FactoryFunc extends seedActivityFunc<any>,
    ARGS extends [...any] = FactoryFunc extends seedActivityFunc<infer ARGS> ? ARGS : never> {
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
    T extends (...args: [ hasSeed, ... ARGS ]) => isActivity,
    ARGS extends [ ... any] = T extends (...args: [ hasSeed, ... infer ARGS ]) => isActivity ? ARGS : never
> = T & {
    withImpliedSeed: (...args: ARGS) => SeedActivity<T, ARGS>
}

export function withImpliedSeed<
    FactoryFunc extends seedActivityFunc<any>,
    ARGS extends [...any]
>(
    host: { getSeed(x: hasSeed): TxOutputId },
    factoryFunc: FactoryFunc,
    ...args: ARGS
): WithImpliedSeedVariant<FactoryFunc, ARGS> {
    const seedActivity = new SeedActivity(host, factoryFunc, args);
    const withImpliedSeed = (...args: ARGS) => seedActivity;
    return Object.assign(factoryFunc, { withImpliedSeed });
}

