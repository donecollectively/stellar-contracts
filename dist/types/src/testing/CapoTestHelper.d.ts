import { Capo, StellarTxnContext } from "@donecollectively/stellar-contracts";
import type { hasBootstrappedCapoConfig, hasUutContext, MinimalCharterDataArgs, anyState, hasAddlTxns, SubmitOptions, ConfigFor, CapoConfig, CapoFeatureFlags } from "@donecollectively/stellar-contracts";
import { StellarTestHelper } from "./StellarTestHelper.js";
import { canHaveRandomSeed, TestHelperState } from "./types.js";
export declare const SNAP_INIT = "initialized";
export declare const SNAP_BOOTSTRAP = "bootstrapped";
/**
 * Base class for test helpers for Capo contracts
 * @remarks
 *
 * You should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export declare abstract class CapoTestHelper<SC extends Capo<any>, SpecialState extends Record<string, any> = {
    [key: string]: never;
}> extends StellarTestHelper<SC, SpecialState> {
    config?: canHaveRandomSeed & SC extends Capo<any, infer FF> ? ConfigFor<SC> & CapoConfig<FF> : never;
    get capo(): SC;
    featureFlags: CapoFeatureFlags | undefined;
    constructor(config?: SC extends Capo<any, infer FF> ? ConfigFor<SC> & CapoConfig<FF> : ConfigFor<SC>, helperState?: TestHelperState<SC, SpecialState>);
    initialize({ randomSeed }?: {
        randomSeed?: number;
    }, args?: Partial<MinimalCharterDataArgs>): Promise<SC>;
    checkDelegateScripts(args?: Partial<MinimalCharterDataArgs>): Promise<void>;
    get ready(): boolean;
    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx<T extends anyState = anyState>(txnName?: string): StellarTxnContext<T>;
    loadSnapshot(snapName: string): void;
    reusableBootstrap(snap?: string): Promise<any>;
    static hasNamedSnapshot(snapshotName: string, actorName: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
    hasSnapshot(snapshotName: string): boolean;
    snapshot(snapshotName: string): void;
    findOrCreateSnapshot(snapshotName: string, actorName: string, contentBuilder: () => Promise<StellarTxnContext<any>>): Promise<SC>;
    restoreFrom(snapshotName: string): Promise<SC>;
    bootstrap(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<SC>;
    /**
     * Returns the id of a named record previously stored in the helperState.namedRecords.
     * @remarks
     * Throws an error if the named record is not found.
     */
    getNamedRecordId(recordName: string): any;
    /**
     * Waits for a tx to be built, and captures the record id indicated in the transaction context
     * @remarks
     * The captured id is stored in the helperState, using the indicated recordName.
     *
     * Returns the transaction-context object resolved from arg2.
     *
     * Without a uutName option, the "recordId" UUT name is expected in the txn context.
     * If you receive a type error on the tcxPromise argument, use the uutName option to
     * set the expectation for a UUT name actually found in the transaction context.
     *
     * Optionally submits the txn. In this case, if the expectError option is set, an error will be
     * thrown if the txn ***succeeds***.  This combines well with `await expect(promise).rejects.toThrow()`.
     *
     * Resolves after all the above are done.
     */
    captureRecordId<T extends StellarTxnContext<anyState> & hasUutContext<U>, const U extends string & keyof T["state"]["uuts"] = "recordId">(options: {
        recordName: string;
        submit?: boolean;
        uutName?: U;
        expectError?: true;
    }, tcxPromise: Promise<T>): Promise<T>;
    extraBootstrapping(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<SC>;
    abstract mkDefaultCharterArgs(): Partial<MinimalCharterDataArgs>;
    abstract mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & hasBootstrappedCapoConfig & hasAddlTxns<any>>;
}
//# sourceMappingURL=CapoTestHelper.d.ts.map