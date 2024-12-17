import type { UplcData } from "@helios-lang/uplc";
import { StellarTxnContext, type hasSeedUtxo } from "./StellarTxnContext.js";
import type { IFISNEVER, TypeError } from "./helios/typeUtils.js";
import { makeTxOutputId, type TxId, type TxOutputId, type TxOutputIdLike } from "@helios-lang/ledger";

/**
 * @public
 */
export type hasSeed = SeedAttrs | hasSeedUtxo | TxOutputIdLike;

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
    txId: TxId;
    idx: bigint;
};

/**
 * @public
 */
export type seedActivityFunc<
    ARGS extends [...any] | never,
    RV extends isActivity | UplcData | TypeError<any>
> = IFISNEVER<ARGS,
    (seed: hasSeed) => RV,
    (seed: hasSeed, ...args: ARGS) => RV
>

type seedFunc<
    F extends ((seed: hasSeed, arg: any) => any ) | ( (seed: hasSeed) => any ),
    ARG extends (
        F extends (seed: hasSeed) => any ? never :
        F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never
    ) = 
        F extends (seed: hasSeed) => any ? never :
        F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never,
    RV extends ReturnType<F> = ReturnType<F>
> = IFISNEVER<ARG, 
    seedActivityFunc<never, RV>,
    seedActivityFunc<[ARG], RV>
>


type NeedsSingleArgError =
    TypeError<"expected at most one arg for seeded activity func">;

/**
 * @private
 */
export type SeedActivityArg<
    SA extends seedFunc<any, any>
    // ARG extends SA extends seedActivityFunc<[infer ARG, ... infer badArgs], any> ?
    // [any] extends badArgs ?
    //     TypeError<"expected at most one arg for seeded activity func"> :
    // ARG : never =
> = SA extends seedFunc<SA, infer ARG, infer RV> ? ARG : never;
    // ? [...any] extends badArgs
    //     ? NeedsSingleArgError
    //     // : IFISNEVER<ARG, never, ARG>
    //     : [any] extends [ARG] ? ARG : never
    // : never;
// > = ARG;

function noArgsFunc(seed: hasSeed) : isActivity{
    return { redeemer: "no-args" as any };
}
type NOARGS_func = typeof noArgsFunc;
type noArgsArg = SeedActivityArg<typeof noArgsFunc>
const tt : IFISNEVER<SeedActivityArg<typeof noArgsFunc>, true, false> = true;

/**
 * @public
 */
export class SeedActivity<
    FactoryFunc extends seedActivityFunc<any, any>,
> {
    arg: SeedActivityArg<FactoryFunc>;
    constructor(
        private host: { getSeed(x: hasSeed): TxOutputId },
        private factoryFunc : FactoryFunc,
        arg: SeedActivityArg<FactoryFunc>
    ) {
        // console.log("+ seed activity" + new Error("").stack);
        this.arg = arg;
    }

    mkRedeemer(seedFrom: hasSeed) {
        // const seed = this.host.getSeed(thing);
        return this.factoryFunc.call(this.host, seedFrom, this.arg);
    }
}

//prettier-ignore
export type funcWithImpliedSeed<
    // FACTORY_FUNC extends (...args: [ hasSeed, ... ARGS ]) => any,
    // ARGS extends [ ... any] =
    //         FACTORY_FUNC extends (...args: [ hasSeed, ... infer iArgs ]) => any ?
    //         [ any ] extends iArgs ? never : iArgs : never
    // > = [ any ] extends ARGS ?
    // (...args: ARGS) => unknown & SeedActivity<FACTORY_FUNC, ARGS>
    FACTORY_FUNC extends seedActivityFunc<any, any>,
    // ARG extends SeedActivityArg<FACTORY_FUNC> = 
    //     SeedActivityArg<FACTORY_FUNC> //extends SeedActivityArg<any, iArg> ? iArg : never,

    // seedActivityFunc<[infer iArg, ... infer oArgs], any> ?
    // [ any ] extends oArgs ? seedActivityFunc<
    //     any, TypeError<"expected at most one arg for seeded activity func"
    //     > :
    // [ any ] extends iArg ? iArg : never : never
> = IFISNEVER<
    SeedActivityArg<FACTORY_FUNC>,
    () => SeedActivity<FACTORY_FUNC>,
    SeedActivityArg<FACTORY_FUNC> extends NeedsSingleArgError
        ? never
        : (fields: SeedActivityArg<FACTORY_FUNC>) => SeedActivity<FACTORY_FUNC>
>;

const x: [any] extends [] ? true : false = false;

//prettier-ignore
export function impliedSeedActivityMaker<
    FACTORY_FUNC extends seedActivityFunc<any, any>,
    IMPLIED_SEED_FUNC extends funcWithImpliedSeed<FACTORY_FUNC> = 
        funcWithImpliedSeed<FACTORY_FUNC>,
    ARG extends SeedActivityArg<FACTORY_FUNC> = 
        SeedActivityArg<FACTORY_FUNC>
    // IMPLIED_SEED_FUNC extends funcWithImpliedSeed<infer iFunc, any> ? iFunc : never,
    // ISV  extends
    //     funcWithImpliedSeed<any, infer iArgs> ? iArgs : never
>(
    host: { getSeed(x: hasSeed): TxOutputId },
    factoryFunc: FACTORY_FUNC,
// ): WithImpliedSeedVariant<FACTORY_FUNC, ARGS> {
): IMPLIED_SEED_FUNC {
    const makesActivityWithImplicitSeedAndArgs = ( (arg: ARG) => {
        const seedActivity = new SeedActivity<FACTORY_FUNC>(host, factoryFunc, arg);
        return seedActivity;
    }) as IMPLIED_SEED_FUNC
    return makesActivityWithImplicitSeedAndArgs
}

export function getSeed(arg: hasSeed | TxOutputId ): TxOutputId {
    //@ts-expect-error on this type probe
    if (arg.kind == "TxOutputId") return arg;

    if (arg instanceof StellarTxnContext) {
        const { txId, idx } = arg.getSeedUtxoDetails();
        return makeTxOutputId(txId, idx);
    }
    //@ts-expect-error on this type probe
    if (arg.idx && arg.txId) {
        const attr: SeedAttrs = arg as SeedAttrs;
        return makeTxOutputId(attr.txId, attr.idx);
    }
    const txoIdLike = arg as Exclude<typeof arg, SeedAttrs>;
    return makeTxOutputId(txoIdLike);
}
