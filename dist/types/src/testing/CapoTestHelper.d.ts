import { Capo, StellarTxnContext } from "@donecollectively/stellar-contracts";
import type { hasBootstrappedCapoConfig, hasUutContext, MinimalCharterDataArgs, anyState, hasAddlTxns, SubmitOptions, ConfigFor, CapoConfig, CapoFeatureFlags } from "@donecollectively/stellar-contracts";
import { SnapshotCache, type CacheKeyInputs, type ParentSnapName, type DirLabelResolver } from "./emulator/SnapshotCache.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import { type canHaveRandomSeed, type TestHelperState } from "./types.js";
import type { StellarTestContext } from "./StellarTestContext.js";
import { type TestAPI, type SuiteAPI } from "vitest";
/**
 * Serialized seed UTxO for storage in offchainData.
 * Used to break the chicken-and-egg dependency in disk cache lookup (REQT/84f4k7nb6p).
 * @public
 */
export type PreSelectedSeedUtxo = {
    txId: string;
    utxoIdx: number;
};
export declare const SNAP_ACTORS = "bootstrapWithActors";
export declare const SNAP_CAPO_INIT = "capoInitialized";
export declare const SNAP_DELEGATES = "enabledDelegatesDeployed";
/**
 * Base type for CapoTestHelper that can be used in callbacks where the exact
 * generic parameters don't matter.
 * @public
 */
export type AnyCapoTestHelper = CapoTestHelper<Capo<any>, Record<string, any>>;
/**
 * Callback type for resolving script dependencies for cache key computation.
 * Takes helper as explicit argument for correct lifetime handling (ARCH-8rqhpfy1ym).
 * This ensures the resolver uses the CURRENT helper, not one from registration time.
 * The helper is typed as `unknown` for compatibility with SnapshotCache; implementers
 * should cast to the appropriate helper type (e.g., `helper as CapoTestHelper<any, any>`).
 * @public
 */
export type ScriptDependencyResolver = (helper: unknown) => Promise<CacheKeyInputs>;
/**
 * Options for the hasNamedSnapshot decorator.
 * @public
 */
export type SnapshotDecoratorOptions = {
    actor: string;
    /** Parent snapshot name. Required. Use "genesis" for root snapshots, "bootstrapped" for typical app snapshots. */
    parentSnapName: ParentSnapName;
    /** If true, skip reusableBootstrap() call. Use for snapshots that are part of the bootstrap() flow itself. */
    internal?: boolean;
    resolveScriptDependencies?: ScriptDependencyResolver;
    /** Optional label resolver for human-readable directory names (ARCH-jj5swg0hfk). Default returns empty string. */
    computeDirLabel?: DirLabelResolver;
};
/**
 * Type for the wrapped describe function with .only, .skip, .todo variants
 * @public
 */
export type WrappedDescribe<TC> = {
    (name: string, fn: () => void): void;
    only: (name: string, fn: () => void) => void;
    skip: SuiteAPI["skip"];
    todo: SuiteAPI["todo"];
};
/**
 * Return type for createTestContext
 * @public
 */
export type TestContextFactory<TC> = {
    describe: WrappedDescribe<TC>;
    it: TestAPI<TC>;
    fit: TestAPI<TC>["only"];
    xit: TestAPI<TC>["skip"];
};
/**
 * Config type for createTestContext that matches addTestContext's expected type
 * @internal
 */
type TestContextConfig<SC extends Capo<any>> = SC extends Capo<any, infer FF> ? Partial<{
    featureFlags: FF;
} & ConfigFor<SC>> : Partial<ConfigFor<SC>>;
/**
 * Options for createTestContext
 * @public
 */
export type CreateTestContextOptions<SC extends Capo<any>, SpecialState extends Record<string, any> = Record<string, never>> = {
    /** Optional pre-existing helperState for snapshot sharing */
    helperState?: TestHelperState<SC, SpecialState>;
    /** Optional config to pass to the helper */
    config?: TestContextConfig<SC>;
};
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
    /**
     * Pre-selected seed UTxO for breaking chicken-and-egg dependency (REQT/84f4k7nb6p).
     * Selected during bootstrapWithActors and stored in actors snapshot offchainData.
     */
    preSelectedSeedUtxo: PreSelectedSeedUtxo | undefined;
    /** Disk cache for snapshots, shared via helperState for cross-test reuse */
    snapshotCache: SnapshotCache;
    constructor(config?: SC extends Capo<any, infer FF> ? ConfigFor<SC> & CapoConfig<FF> : ConfigFor<SC>, helperState?: TestHelperState<SC, SpecialState>);
    /**
     * Registers the capo-dependent snapshots. Called after capo is initialized.
     * @internal
     */
    private registerCapoSnapshots;
    /**
     * Default helperState shared across all instances of this helper class.
     * Subclasses can override this to provide custom default state.
     * @public
     */
    static defaultHelperState: TestHelperState<any, any>;
    /**
     * Creates pre-wired describe/it functions that automatically inject this test helper.
     *
     * @remarks
     * This eliminates the need for boilerplate beforeEach setup in every test file.
     * The returned describe/it functions automatically set up the test context with
     * this helper class.
     *
     * @example
     * ```typescript
     * // In your test helper file:
     * export const { describe, it } = MyCapoTestHelper.createTestContext();
     *
     * // In your test files:
     * import { describe, it } from "../MyCapoTestHelper.js";
     *
     * describe("My Tests", () => {
     *     it("works", async ({ h }) => {
     *         await h.reusableBootstrap();
     *         // h is already wired up
     *     });
     * });
     * ```
     *
     * @param options - Optional configuration including helperState and config
     * @returns An object with describe, it, fit, and xit functions
     * @public
     */
    static createTestContext<TH extends CapoTestHelper<SC, SS>, SC extends Capo<any>, SS extends Record<string, any> = Record<string, never>, TC extends StellarTestContext<TH, SC> = StellarTestContext<TH, SC>>(this: new (...args: any[]) => TH, options?: CreateTestContextOptions<SC, SS>): TestContextFactory<TC>;
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
    /**
     * Reuses existing bootstrap or creates fresh one.
     * Implements REQT/trjb6qtjt6 (Snapshot Orchestration).
     */
    reusableBootstrap(snap?: string): Promise<any>;
    /**
     * Static registry of snapshot metadata, populated at class definition time.
     * Maps snapshot name → registration metadata including the snap* method reference.
     * @internal
     */
    static _snapshotRegistrations: Map<string, {
        parentSnapName: ParentSnapName;
        resolveScriptDependencies?: ScriptDependencyResolver;
        computeDirLabel?: DirLabelResolver;
        actor: string;
        internal?: boolean;
        snapMethod?: (...args: any[]) => Promise<any>;
    }>;
    /**
     * A decorator for test-helper functions that generate named snapshots.
     * Snapshot name is derived from method name: snapToFoo → "foo".
     * Implements REQT/7hcqed9mvn (Built-in Snapshot Registration).
     * @param options - Options object with actor, parentSnapName, and optional resolveScriptDependencies
     */
    static hasNamedSnapshot(options: SnapshotDecoratorOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
    /**
     * Copies all snapshot registrations from the class hierarchy to the snapshotCache.
     * Called once per helper instance to ensure all metadata is available.
     * @internal
     */
    private _registrationsCopied;
    ensureSnapshotRegistrations(): void;
    /**
     * Determines whether a new Capo should be created based on current state vs loaded config.
     * Implements the Capo reconstruction decision tree (REQT/vz0fc3s057).
     *
     * Returns true (create new) when:
     * - a) No Capo exists at all
     * - a) Capo exists but is unconfigured (egg)
     * - b) Capo exists but has different mph than loaded config
     *
     * Returns false (hot-swap) when:
     * - c) Capo exists and has same mph as loaded config
     *
     * @internal
     */
    private shouldCreateNewCapo;
    /**
     * Gets the pre-selected seed UTxO from the actors snapshot's offchainData.
     * Used by resolvers for cache key computation (REQT/mvf88mnsez).
     * @internal
     */
    getPreSelectedSeedUtxo(): PreSelectedSeedUtxo | undefined;
    /**
     * Pre-selects a seed UTxO from the default actor's wallet (REQT/84f4k7nb6p).
     * Must be called after setDefaultActor() so wallet is available.
     * @internal
     */
    preSelectSeedUtxo(): Promise<void>;
    /**
     * Creates test actors for the emulator.
     * Idempotent: only runs if actors haven't been set up yet.
     * Called by snapToBootstrapWithActors via @hasNamedSnapshot decorator.
     * @internal
     */
    bootstrapWithActors(): Promise<void>;
    /**
     * Decorated wrapper for bootstrapWithActors.
     * Uses @hasNamedSnapshot with parentSnapName: "genesis" for root snapshot.
     * @public
     */
    snapToBootstrapWithActors(): Promise<void>;
    /**
     * Decorated wrapper for capoInitialized.
     * Uses @hasNamedSnapshot with internal: true since this is part of bootstrap() flow.
     * @public
     */
    snapToCapoInitialized(args?: Partial<MinimalCharterDataArgs>, options?: SubmitOptions): Promise<void>;
    /**
     * Mints the charter token and initializes the Capo.
     * Called by snapToCapoInitialized via @hasNamedSnapshot decorator.
     * @internal
     */
    capoInitialized(args?: Partial<MinimalCharterDataArgs>, options?: SubmitOptions): Promise<void>;
    /**
     * Deploys enabled delegates after Capo initialization.
     * Called by snapToEnabledDelegatesDeployed via @hasNamedSnapshot decorator.
     * @internal
     */
    enabledDelegatesDeployed(args?: Partial<MinimalCharterDataArgs>, options?: SubmitOptions): Promise<void>;
    /**
     * Decorated wrapper for enabledDelegatesDeployed.
     * Uses @hasNamedSnapshot with internal: true since this is part of bootstrap() flow.
     * @public
     */
    snapToEnabledDelegatesDeployed(args?: Partial<MinimalCharterDataArgs>, options?: SubmitOptions): Promise<void>;
    /**
     * Ensures helperState exists, creating a default one if needed.
     * This enables disk caching for test helpers that don't use the @hasNamedSnapshot decorator.
     * @internal
     */
    ensureHelperState(): void;
    /**
     * Builds offchainData for a snapshot being stored.
     * Also populates helperState.offchainData for in-memory cache access.
     * @internal
     */
    private buildOffchainData;
    /**
     * Logs diagnostic comparison between stored and current Capo state.
     * Essential for debugging address mismatches and UTxO loading issues.
     * @internal
     */
    private logSnapshotRestoreDiagnostics;
    /**
     * Handles Capo reconstruction when loading a non-genesis snapshot.
     * Implements the decision tree from REQT/vz0fc3s057.
     * @internal
     */
    private handleCapoReconstruction;
    /**
     * Loads a cached snapshot into the emulator and sets up helper state.
     * This is called for BOTH cache hits AND freshly-built snapshots.
     * @internal
     */
    private loadCachedSnapshot;
    /**
     * Resolves snapshot name aliases.
     * "bootstrapped" is a symbolic alias for "enabledDelegatesDeployed".
     * @internal
     */
    private resolveSnapshotAlias;
    /**
     * Ensures a snapshot is in cache (memory or disk), building recursively if needed.
     * This is the single chokepoint for snapshot resolution.
     * @internal
     */
    private ensureSnapshotCached;
    /**
     * Finds or creates a snapshot, using the single chokepoint pattern (ARCH-7jcyqx1mg8).
     * 1. ensureSnapshotCached() handles recursive parent resolution and caching
     * 2. loadCachedSnapshot() provides uniform loading for both cache hits and freshly-built
     * Implements REQT/sjer71jjmb (Reuse existing or create new snapshot).
     */
    findOrCreateSnapshot(snapshotName: string, actorName: string, contentBuilder: () => Promise<StellarTxnContext<any>>): Promise<SC>;
    /**
     * Restores helper state from a named snapshot.
     * Implements REQT/7n8ws6gabc (Actor Wallet Transfer).
     */
    restoreFrom(snapshotName: string): Promise<SC>;
    bootstrap(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<SC>;
    /**
     * Returns the id of a named record previously stored in the helperState.namedRecords.
     * @remarks
     * Throws an error if the named record is not found.
     */
    getNamedRecordId(recordName: string): string;
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
    abstract mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<(hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & hasBootstrappedCapoConfig & hasAddlTxns<any>) | undefined>;
    /**
     * Resolves cache key inputs for the base actors snapshot.
     * @public
     */
    resolveActorsDependencies(): CacheKeyInputs;
    /**
     * Ensures an egg (unconfigured Capo) exists for cache key computation (REQT/dynnc9bq1v).
     * Creates one via initStrella() if this.strella is undefined or unconfigured.
     * @internal
     */
    private ensureEggForCacheKey;
    /**
     * Resolves cache key inputs for core Capo scripts (minter, mint delegate, spend delegate).
     * Used for snapshot cache key computation for the capoInitialized snapshot.
     * Implements REQT/p19q6ak0xj (Bundle Dependency Hashing).
     * @public
     */
    resolveCoreCapoDependencies(): Promise<CacheKeyInputs>;
    /**
     * Resolves cache key inputs for all enabled delegates.
     * Used for snapshot cache key computation for the enabledDelegatesDeployed snapshot.
     * Includes dgData controllers (filtered by featureFlags) per REQT/venhawwjrz and REQT/3r1d1ntx6e.
     * Uses computeSourceHash() to work with egg Capo (REQT/mvf88mnsez, REQT/mexwd3p8mr).
     * @public
     */
    resolveEnabledDelegatesDependencies(): Promise<CacheKeyInputs>;
}
export {};
//# sourceMappingURL=CapoTestHelper.d.ts.map