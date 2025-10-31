import type { ConfigFor, stellarSubclass, CharterDataLike, MinimalCharterDataArgs, SubmitOptions, CapoConfig } from "@donecollectively/stellar-contracts";
import { Capo, StellarTxnContext, CapoWithoutSettings } from "@donecollectively/stellar-contracts";
import type { DefaultCapoTestHelperClass, TestHelperState } from "./types.js";
import { CapoTestHelper } from "./CapoTestHelper.js";
/**
 * Test helper for classes extending Capo
 * @remarks
 *
 * Arranges an test environment with predefined actor-names having various amounts of ADA in their (emulated) wallets,
 * and default helpers for setting up test scenarios.  Provides a simplified framework for testing Stellar contracts extending
 * the Capo class.
 *
 * To use it, you MUST extend DefaultCapoTestHelper<YourStellarCapoClass>.
 *
 * You MUST also implement a getter  for stellarClass, returning the specific class for YourStellarCapoClass
 *
 * You SHOULD also implement a setupActors method to arrange named actors for your test scenarios.
 * It's recommended to identify general roles of different people who will interact with the contract, and create
 * one or more actor names for each role, where the actor names start with the same letter as the role-names.
 * For example, a set of Trustees in a contract might have actor names tina, tracy and tom, while
 * unprivileged Public users might have actor names like pablo and peter.  setupActors() also
 * should pre-assign some ADA funds to each actor: e.g. `this.addActor(‹actorName›, 142n * ADA)`
 *
 * @typeParam DC - the specific Capo subclass under test
 * @public
 **/
export declare class DefaultCapoTestHelper<CAPO extends Capo<any> = CapoWithoutSettings, SpecialState extends Record<string, any> = {
    [key: string]: never;
}> extends CapoTestHelper<CAPO, SpecialState> {
    /**
     * Creates a prepared test helper for a given Capo class, with boilerplate built-in
     *
     * @remarks
     *
     * You may wish to provide an overridden setupActors() method, to arrange actor
     * names that fit your project's user-roles / profiles.
     *
     * You may also wish to add methods that satisfy some of your application's key
     * use-cases in simple predefined ways, so that your automated tests can re-use
     * the logic and syntax instead of repeating them in multiple test-cases.
     *
     * @param s - your Capo subclass
     * @typeParam CAPO - no need to specify it; it's inferred from your parameter
     * @public
     **/
    static forCapoClass<CAPO extends Capo<any>, SpecialState extends Record<string, any> = {}>(s: stellarSubclass<CAPO>, specialState?: SpecialState): DefaultCapoTestHelperClass<CAPO, SpecialState>;
    get stellarClass(): stellarSubclass<CAPO>;
    _start: number;
    constructor(config?: CAPO extends Capo<any, infer FF> ? ConfigFor<CAPO> & CapoConfig<FF> : ConfigFor<CAPO>, helperState?: TestHelperState<CAPO, SpecialState>);
    ts(...args: any[]): void;
    requiresActorRole(roleName: string, firstLetter: string): void;
    get relativeTs(): string;
    setupActors(): Promise<void>;
    setDefaultActor(): Promise<void>;
    mkCharterSpendTx(): Promise<StellarTxnContext>;
    checkDelegateScripts(args?: Partial<MinimalCharterDataArgs>): Promise<void>;
    mkDefaultCharterArgs(): MinimalCharterDataArgs;
    mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<import("@donecollectively/stellar-contracts").hasBootstrappedCapoConfig & import("@donecollectively/stellar-contracts").hasAddlTxns<import("@donecollectively/stellar-contracts").hasBootstrappedCapoConfig> & StellarTxnContext<import("@donecollectively/stellar-contracts").charterDataState> & import("@donecollectively/stellar-contracts").hasUutContext<"govAuthority" | "mintDelegate" | "capoGov" | "mintDgt" | "setting"> & import("@donecollectively/stellar-contracts").hasUutContext<"spendDelegate" | "govAuthority" | "mintDelegate" | "capoGov" | "mintDgt" | "spendDgt"> & import("@donecollectively/stellar-contracts").hasSeedUtxo>;
    updateCharter(args: CharterDataLike, submitSettings?: SubmitOptions): Promise<StellarTxnContext>;
}
//# sourceMappingURL=DefaultCapoTestHelper.d.ts.map