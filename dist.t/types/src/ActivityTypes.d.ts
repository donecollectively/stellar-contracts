import type { UplcData } from "@helios-lang/uplc";
import { type hasSeedUtxo } from "./StellarTxnContext.js";
import type { IFISNEVER, TypeError } from "./helios/typeUtils.js";
import { type TxId, type TxOutputId, type TxOutputIdLike } from "@helios-lang/ledger";
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
export type seedActivityFunc<ARGS extends [...any] | never, RV extends isActivity | UplcData | TypeError<any>> = IFISNEVER<ARGS, (seed: hasSeed) => RV, (seed: hasSeed, ...args: ARGS) => RV>;
type seedFunc<F extends ((seed: hasSeed, arg: any) => any) | ((seed: hasSeed) => any), ARG extends (F extends (seed: hasSeed) => any ? never : F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never) = F extends (seed: hasSeed) => any ? never : F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never, RV extends ReturnType<F> = ReturnType<F>> = IFISNEVER<ARG, seedActivityFunc<never, RV>, seedActivityFunc<[ARG], RV>>;
type NeedsSingleArgError = TypeError<"expected at most one arg for seeded activity func">;
/**
 * @internal
 */
export type SeedActivityArg<SA extends seedFunc<any, any>> = SA extends seedFunc<SA, infer ARG, infer RV> ? ARG : never;
/**
 * @public
 */
export declare class SeedActivity<FactoryFunc extends seedActivityFunc<any, any>> {
    private host;
    private factoryFunc;
    arg: SeedActivityArg<FactoryFunc>;
    constructor(host: {
        getSeed(x: hasSeed): TxOutputId;
    }, factoryFunc: FactoryFunc, arg: SeedActivityArg<FactoryFunc>);
    mkRedeemer(seedFrom: hasSeed): any;
}
/**
 * @internal
 */
export type funcWithImpliedSeed<FACTORY_FUNC extends seedActivityFunc<any, any>> = IFISNEVER<SeedActivityArg<FACTORY_FUNC>, () => SeedActivity<FACTORY_FUNC>, SeedActivityArg<FACTORY_FUNC> extends NeedsSingleArgError ? never : (fields: SeedActivityArg<FACTORY_FUNC>) => SeedActivity<FACTORY_FUNC>>;
/**
 * @internal
 */
export declare function impliedSeedActivityMaker<FACTORY_FUNC extends seedActivityFunc<any, any>, IMPLIED_SEED_FUNC extends funcWithImpliedSeed<FACTORY_FUNC> = funcWithImpliedSeed<FACTORY_FUNC>, ARG extends SeedActivityArg<FACTORY_FUNC> = SeedActivityArg<FACTORY_FUNC>>(host: {
    getSeed(x: hasSeed): TxOutputId;
}, factoryFunc: FACTORY_FUNC): IMPLIED_SEED_FUNC;
/**
 * extracts a tx output id from a "has-seed" type of object, for use in
 * on-chain uniqueness assurances
 * @public
 */
export declare function getSeed(arg: hasSeed | TxOutputId): TxOutputId;
export {};
//# sourceMappingURL=ActivityTypes.d.ts.map