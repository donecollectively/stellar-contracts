import { Capo, StellarTxnContext } from "@donecollectively/stellar-contracts";
import { VERSION as HELIOS_VERSION } from "@helios-lang/compiler";
import type {
    hasBootstrappedCapoConfig,
    hasUutContext,
    MinimalCharterDataArgs,
    anyState,
    hasAddlTxns,
    SubmitOptions,
    ConfigFor,
    CapoConfig,
    CapoFeatureFlags,
    DelegateSetup,
} from "@donecollectively/stellar-contracts";
import { SnapshotCache, type CacheKeyInputs, type CachedSnapshot, type ParentSnapName, type SnapshotRegistryEntry } from "./emulator/SnapshotCache.js";
import type { BundleCacheKeyInputs } from "../helios/scriptBundling/HeliosScriptBundle.js";
import type { NetworkSnapshot } from "./emulator/StellarNetworkEmulator.js";

import { StellarTestHelper } from "./StellarTestHelper.js";
import { addTestContext, type canHaveRandomSeed, type TestHelperState } from "./types.js";
import type { StellarTestContext } from "./StellarTestContext.js";
import {
    describe as vitestDescribe,
    it as vitestIt,
    beforeEach,
    type TestAPI,
    type SuiteAPI,
} from "vitest";

const ACTORS_ALREADY_MOVED =
    "NONE! all actors were moved from a different network via snapshot";

export const SNAP_ACTORS = "bootstrapWithActors";
export const SNAP_CAPO_INIT = "capoInitialized";
export const SNAP_DELEGATES = "enabledDelegatesDeployed";
// Legacy name for compatibility
export const SNAP_INIT = "initialized";

/**
 * Base type for CapoTestHelper that can be used in callbacks where the exact
 * generic parameters don't matter.
 * @public
 */
export type AnyCapoTestHelper = CapoTestHelper<Capo<any>, Record<string, any>>;

/**
 * Callback type for resolving script dependencies for cache key computation.
 * @public
 */
export type ScriptDependencyResolver = (helper: AnyCapoTestHelper) => Promise<CacheKeyInputs>;

/**
 * Options for the hasNamedSnapshot decorator.
 * @public
 */
export type SnapshotDecoratorOptions = {
    actor: string;
    /** Parent snapshot name. Defaults to SNAP_DELEGATES if omitted. Use "genesis" for root snapshots. */
    parentSnapName?: ParentSnapName;
    resolveScriptDependencies?: ScriptDependencyResolver;
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
type TestContextConfig<SC extends Capo<any>> = SC extends Capo<any, infer FF>
    ? Partial<{ featureFlags: FF } & ConfigFor<SC>>
    : Partial<ConfigFor<SC>>;

/**
 * Options for createTestContext
 * @public
 */
export type CreateTestContextOptions<
    SC extends Capo<any>,
    SpecialState extends Record<string, any> = Record<string, never>
> = {
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
export abstract class CapoTestHelper<
    SC extends Capo<any>,
    SpecialState extends Record<string, any> = { [key: string]: never },
> extends StellarTestHelper<SC, SpecialState> {
    declare config?: canHaveRandomSeed & SC extends Capo<any, infer FF>
        ? ConfigFor<SC> & CapoConfig<FF>
        : never;
    get capo() {
        return this.strella;
    }
    featureFlags: CapoFeatureFlags | undefined = undefined;

    /** Disk cache for snapshots, enabling fast test restarts */
    snapshotCache: SnapshotCache = new SnapshotCache();

    constructor(
        config?: SC extends Capo<any, infer FF>
            ? ConfigFor<SC> & CapoConfig<FF>
            : ConfigFor<SC>,
        helperState?: TestHelperState<SC, SpecialState>,
    ) {
        if (!config) {
            super(config, helperState);
        } else {
            const { featureFlags, ...otherConfig } = config;
            if (Object.keys(otherConfig).length) {
                super(config as any, helperState);
            } else {
                super(undefined, helperState);
            }
            if (featureFlags) {
                this.featureFlags = featureFlags;
            }
        }

        // Register the actors snapshot (doesn't need capo)
        this.snapshotCache.register(SNAP_ACTORS, {
            parentSnapName: "genesis",
            resolveScriptDependencies: this.resolveActorsDependencies.bind(this),
        });
    }

    /**
     * Registers the capo-dependent snapshots. Called after capo is initialized.
     * @internal
     */
    private registerCapoSnapshots(): void {
        // Only register if not already registered
        if (this.snapshotCache["registry"].has(SNAP_CAPO_INIT)) {
            return;
        }

        this.snapshotCache.register(SNAP_CAPO_INIT, {
            parentSnapName: SNAP_ACTORS as ParentSnapName,
            resolveScriptDependencies: this.resolveCoreCapoDependencies.bind(this),
        });

        this.snapshotCache.register(SNAP_DELEGATES, {
            parentSnapName: SNAP_CAPO_INIT as ParentSnapName,
            resolveScriptDependencies: this.resolveEnabledDelegatesDependencies.bind(this),
        });
    }

    /**
     * Default helperState shared across all instances of this helper class.
     * Subclasses can override this to provide custom default state.
     * @public
     */
    static defaultHelperState: TestHelperState<any, any> = {
        snapshots: {},
        namedRecords: {},
        bootstrapped: false,
    } as any;

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
    static createTestContext<
        TH extends CapoTestHelper<SC, SS>,
        SC extends Capo<any>,
        SS extends Record<string, any> = Record<string, never>,
        TC extends StellarTestContext<TH, SC> = StellarTestContext<TH, SC>
    >(
        this: new (...args: any[]) => TH,
        options?: CreateTestContextOptions<SC, SS>
    ): TestContextFactory<TC> {
        const HelperClass = this;
        const {
            helperState = (HelperClass as any).defaultHelperState,
            config
        } = options ?? {};

        // Track nesting depth to only add beforeEach at top level of each describe tree
        let nestingDepth = 0;

        /**
         * Wraps a vitest describe function to auto-inject beforeEach at top level
         */
        const wrapDescribe = (
            vitestFn: typeof vitestDescribe | typeof vitestDescribe.only
        ) => {
            return (name: string, fn: () => void): void => {
                vitestFn(name, () => {
                    const isTopLevel = nestingDepth === 0;
                    nestingDepth++;

                    if (isTopLevel) {
                        beforeEach<TC>(async (context) => {
                            // Config type is structurally identical to what addTestContext expects,
                            // but TypeScript can't unify conditional types with unresolved generics.
                            // The cast is safe because TestContextConfig<SC> ≡ addTestContext's config type.
                            await addTestContext(
                                context,
                                HelperClass as any,
                                config as Parameters<typeof addTestContext>[2],
                                helperState
                            );
                        });
                    }

                    try {
                        fn();
                    } finally {
                        nestingDepth--;
                    }
                });
            };
        };

        // Create the wrapped describe with all variants
        const describe = wrapDescribe(vitestDescribe) as WrappedDescribe<TC>;
        describe.only = wrapDescribe(vitestDescribe.only);
        describe.skip = vitestDescribe.skip;
        describe.todo = vitestDescribe.todo;

        // Cast it to the correct context type
        const it = vitestIt as TestAPI<TC>;
        const fit = it.only;
        const xit = it.skip;

        return { describe, it, fit, xit };
    }

    async initialize(
        { randomSeed = 42 }: { randomSeed?: number } = {},
        args?: Partial<MinimalCharterDataArgs>,
    ): Promise<SC> {
        // Note: This method diverges from the base class impl, due to type difficulties.
        // Patches welcome.

        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate initialize() in test helper",
            );

            return this.strella;
        }
        // console.log("A in capo test helper")

        if (this.strella) {
            console.log(
                `    -- 🌱🌱🌱 new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...\n` +
                    new Error("stack")
                        .stack!.split("\n")
                        .slice(1)
                        .filter(
                            (line) =>
                                !line.match(/node_modules/) &&
                                !line.match(/node:internal/),
                        )
                        .join("\n"),
            );

            //@ts-expect-error
            this.strella = undefined;
            this.actors = {};
            this.actorSetupInfo = [];
            this._actorName = "";
        }
        await this.delay(1);

        this.randomSeed = randomSeed;

        if (Object.keys(this.actors).length) {
            console.log("Skipping actor setup - already done");
        } else {
            await this.snapToBootstrapWithActors();
        }

        this.state.mintedCharterToken = undefined;
        this.state.parsedConfig = undefined;

        //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
        //   based on seedUtxo in mkTxnMintCharterToken
        if (!this.config) {
            console.log("  -- Capo not yet bootstrapped");
            const ts1 = Date.now();
            const { featureFlags } = this;
            if (featureFlags) {
                this.strella = await this.initStrella(this.stellarClass, {
                    featureFlags,
                } as any);
                //@ts-ignore
                this.strella.featureFlags = this.featureFlags;
            } else {
                this.strella = await this.initStrella(this.stellarClass);
            }

            const ts2 = Date.now();
            console.log(
                // stopwatch emoji: ⏱️
                `  -- ⏱️ initialized Capo: ${ts2 - ts1}ms`,
            );
            // Register capo-dependent snapshots now that capo exists
            this.registerCapoSnapshots();
            console.log("checking delegate scripts...");
            return this.checkDelegateScripts(args).then(() => {
                const ts3 = Date.now();
                console.log(`  -- ⏱️ checked delegate scripts: ${ts3 - ts2}ms`);
                return this.strella;
            });
        }
        // throw new Error(`unreachable pre-bootstrapped capo?`);

        console.log("  -- Capo already bootstrapped");
        const strella = await this.initStrella(this.stellarClass, this.config);

        this.strella = strella;
        const { address, mintingPolicyHash: mph } = strella;

        const { name } = strella.program;
        console.log(
            name,
            address.toString().substring(0, 18) + "…",
            "vHash 📜 " + strella.validatorHash.toHex().substring(0, 12) + "…",
            "mph 🏦 " + mph?.toHex().substring(0, 12) + "…",
        );
        console.log("<- CAPO initialized()");
        return strella;
    }

    async checkDelegateScripts(
        args: Partial<MinimalCharterDataArgs> = {},
    ): Promise<void> {
        throw new Error(
            `doesn't fail, because it's implemented by DefaultCapoTestHelper`,
        );
    }

    get ready() {
        return !!(
            (this.strella.configIn && !this.strella.didDryRun.configIn) ||
            this.state.parsedConfig
        );
    }

    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx<T extends anyState = anyState>(
        txnName?: string,
    ): StellarTxnContext<T> {
        const tcx = new StellarTxnContext(this.strella.setup);
        if (txnName) return tcx.withName(txnName) as any;
        return tcx as any;
    }

    loadSnapshot(snapName: string) {
        const snap = this.helperState!.snapshots[snapName];
        if (!snap) throw new Error(`no snapshot named ${snapName}`);

        this.network.loadSnapshot(snap);
    }

    async reusableBootstrap(
        snap = SNAP_DELEGATES,
    ) {
        let capo;
        const helperState = this.helperState!;
        if (helperState.bootstrapped) {
            console.log("  ---  ⚗️🐞🐞 already bootstrapped");
            if (!helperState.previousHelper) {
                debugger;
                throw new Error(
                    `already bootstrapped, but no previousHelper : ( `,
                );
            }
            capo = await this.restoreFrom(snap);
        } else {
            capo = await this.bootstrap();
            helperState.bootstrappedStrella = capo;
        }
        const { previousHelper } = helperState;
        if (previousHelper) {
            console.log(
                `changing helper from network ${previousHelper.network.id} to ${this.network.id}`,
            );
        }
        // SNAP_DELEGATES is already created in bootstrap() → saveDelegatesDeployedSnapshot()
        helperState.bootstrapped = true;
        helperState.previousHelper = this;

        return capo;
    }

    /**
     * A decorator for test-helper functions that generate named snapshots.
     * @param snapshotName - The name of the snapshot
     * @param options - Either an actor name (string) or an options object with actor and optional resolveScriptDependencies
     */
    static hasNamedSnapshot(
        snapshotName: string,
        options: string | SnapshotDecoratorOptions,
    ) {
        const opts: SnapshotDecoratorOptions = typeof options === "string"
            ? { actor: options }
            : options;
        const { actor: actorName, parentSnapName = SNAP_DELEGATES, resolveScriptDependencies } = opts;

        return function (
            target: any,
            propertyKey: string,
            descriptor: PropertyDescriptor,
        ) {
            const originalMethod = descriptor.value;
            descriptor.value = SnapWrap;

            const [_, WithCapMethodName] =
                propertyKey.match(/^snapTo(.*)/) || [];
            if (!WithCapMethodName) {
                throw new Error(
                    `hasNamedSnapshot(): ${propertyKey}(): expected method name to start with 'snapTo'`,
                );
            }
            const methodName =
                WithCapMethodName[0].toLowerCase() + WithCapMethodName.slice(1);
            const generateSnapshotFunc = target[methodName];
            if (!generateSnapshotFunc) {
                throw new Error(
                    `hasNamedSnapshot(): ${propertyKey}: expected method ${methodName} to exist`,
                );
            }

            console.log(
                "hasNamedSnapshot(): ",
                propertyKey,
                " -> ",
                methodName,
            );

            async function SnapWrap(this: AnyCapoTestHelper, ...args: any[]) {
                // For genesis (root) snapshots, skip bootstrap - we ARE the root
                // Register snapshot with the cache (resolver bound to this helper instance)
                const boundResolver = resolveScriptDependencies
                    ? async () => resolveScriptDependencies(this)
                    : undefined;
                this.snapshotCache.register(snapshotName, {
                    parentSnapName,
                    resolveScriptDependencies: boundResolver,
                });

                return this.findOrCreateSnapshot(
                    snapshotName,
                    actorName,
                    () => {
                        return generateSnapshotFunc
                            .apply(this, ...args)
                            .then((result) => {
                                if (this.actorName !== actorName) {
                                    throw new Error(
                                        `snapshot ${snapshotName}: expected actor '${actorName}', but current actor is '${this.actorName}'`,
                                    );
                                }
                                this.network.tick(1);
                                return result;
                            });
                    },
                    resolveScriptDependencies,
                );
            }
            return descriptor;
        };
    }

    /**
    /**
     * Decorated wrapper for bootstrapWithActors.
     * Uses @hasNamedSnapshot with parentSnapName: "genesis" for root snapshot.
     * @public
     */
    @CapoTestHelper.hasNamedSnapshot(SNAP_ACTORS, {
        actor: "default",
        parentSnapName: "genesis",
        resolveScriptDependencies: async (h) => {
            // Ensure actors are set up so we can compute cache key
            if (h.actorSetupInfo.length === 0) {
                await h.setupActors();
                // DON'T tick here - let the decorator handle tick after builder
            }
        },
    /**
     * Sets up actors with disk cache support.
     * @deprecated Use snapToBootstrapWithActors() instead
     * @internal
     */
    async setupActorsWithCache(): Promise<void> {
        console.log("  -- 🎭🎭🎭 actor setup...");

        // Always run setupActors to populate actorSetupInfo
        await this.setupActors();
        this.network.tick(1);

        // Ensure helperState exists for disk caching
        this.ensureHelperState();

        // Compute cache key based on actor setup info
        const cacheKeyInputs = this.resolveActorsDependencies();
        const cacheKey = this.snapshotCache.computeKey(null, cacheKeyInputs);

        // Check disk cache
        const cached = await this.snapshotCache.find(cacheKey, SNAP_ACTORS);
        if (cached) {
            console.log(`  -- 🎭 actors snapshot cache HIT (key: ${cacheKey.slice(0, 8)}...)`);
            // Restore network state from cache
            this.network.loadSnapshot(cached.snapshot);
            this.helperState.snapshots[SNAP_ACTORS] = cached.snapshot;
        } else {
            console.log(`  -- 🎭 actors snapshot cache MISS (key: ${cacheKey.slice(0, 8)}...)`);
            // Create and save snapshot
            const snapshot = this.network.snapshot(SNAP_ACTORS);
            this.helperState.snapshots[SNAP_ACTORS] = snapshot;

            const cachedSnapshot: CachedSnapshot = {
                snapshot,
                namedRecords: {},
                parentSnapName: "genesis",
                parentHash: null,
                parentCacheKey: null,  // Root snapshot has no parent
                snapshotHash: this.network.lastBlockHash,
            };
            await this.snapshotCache.store(cacheKey, cachedSnapshot, 0);
        }

        await this.setDefaultActor();
    }

    /**
     * Ensures helperState exists, creating a default one if needed.
     * This enables disk caching for test helpers that don't use the @hasNamedSnapshot decorator.
     * @internal
     */
    ensureHelperState(): void {
        if (!this.helperState) {
            //@ts-expect-error - creating minimal helperState without previousHelper
            this.helperState = {
                bootstrapped: false,
                snapshots: {},
                namedRecords: {},
            };
        }
    }

    hasSnapshot(snapshotName: string) {
        return !!this.helperState?.snapshots[snapshotName];
    }

    snapshot(snapshotName: string) {
        if (!this.helperState) {
            throw new Error(`can't snapshot without a helperState`);
        }
        if (this.hasSnapshot(snapshotName)) {
            throw new Error(`snapshot ${snapshotName} already exists`);
        }
        this.helperState.snapshots[snapshotName] =
            this.network.snapshot(snapshotName);
    }

    async findOrCreateSnapshot(
        snapshotName: string,
        actorName: string,
        contentBuilder: () => Promise<StellarTxnContext<any>>,
        resolveScriptDependencies?: ScriptDependencyResolver,
    ): Promise<SC> {
        // First check in-memory snapshots
        if (this.helperState!.snapshots[snapshotName]) {
            const capo = await this.restoreFrom(snapshotName);
            await this.setActor(actorName);
            return capo;
        }

        // Try disk cache using registry-based API
        const cached = await this.snapshotCache.find(snapshotName);
        if (cached) {
            console.log(`SnapshotCache: hit for ${snapshotName}`);
            // Restore from disk cache
            this.network.loadSnapshot(cached.snapshot);
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);
            this.helperState!.snapshots[snapshotName] = cached.snapshot;

            }
            console.log(`SnapshotCache: miss for ${snapshotName} (key: ${cacheKey.slice(0, 8)}...)`);

            await this.setActor(actorName);
            return this.strella;
        }
        console.log(`SnapshotCache: miss for ${snapshotName}`);

        // Build the snapshot
        let succeeded = false;
        try {
            await contentBuilder();
            succeeded = true;
            return this.strella;
        } catch (e) {
            throw e;
        } finally {
            if (succeeded) {
                this.snapshot(snapshotName);

                // Store to disk cache using registry-based API
                const snapshot = this.helperState!.snapshots[snapshotName];
                const entry = this.snapshotCache["registry"].get(snapshotName);
                const parentSnapName = entry?.parentSnapName || "genesis";
                const parentSnapshot = parentSnapName !== "genesis"
                    ? this.helperState!.snapshots[parentSnapName]
                    : null;
                const parentHash = parentSnapshot?.blockHashes?.slice(-1)[0] || null;

                    const parentCacheKey = await this.getSnapshotCacheKey(SNAP_DELEGATES);
                    const parentBlockCount = delegatesSnapshot?.blocks?.length ?? 0;
                // For genesis snapshots, store actorSetupInfo for regeneration on cache load
                const namedRecords = { ...this.helperState!.namedRecords };
                if (parentSnapName === "genesis" && this.actorSetupInfo.length > 0) {

                const cachedSnapshot: CachedSnapshot = {
                    snapshot,
                    namedRecords,
                    parentSnapName,
                    parentHash,
                    parentCacheKey: null, // deprecated with hierarchical directories
                    snapshotHash: this.network.lastBlockHash,
                };

                await this.snapshotCache.store(snapshotName, cachedSnapshot);
            }
        }
    }

    async restoreFrom(snapshotName: string): Promise<SC> {
        const {
            helperState,
            helperState: {
                snapshots,
                previousHelper,
                bootstrappedStrella,
            } = {},
        } = this;
        if (!helperState)
            throw new Error(
                `can't restore from a previous helper without a helperState`,
            );
        if (!bootstrappedStrella)
            throw new Error(
                `can't restore from a previous helper without a bootstrappedStrella`,
            );

        if (!snapshots || !snapshots[snapshotName]) {
            throw new Error(`no snapshot named ${snapshotName} in helperState`);
        }
        if (!previousHelper) {
            throw new Error(`no previousHelper in helperState`);
        }
        const { parsedConfig } = previousHelper.state;

        const {
            networkCtx: oldNetworkEnvelope,
            actorContext: oldActorContext,
            setup: previousSetup,
        } = previousHelper;
        const { network: previousNetwork } = oldNetworkEnvelope;
        const { network: newNet } = this.networkCtx;
        this.initSetup(previousSetup);

        // hacky load of the indicator of already having restored details from the prievous helper
        const otherNet: number = previousHelper.actors[
            ACTORS_ALREADY_MOVED
        ] as unknown as number;
        if (otherNet) {
            if (otherNet !== newNet.id) {
                throw new Error(
                    `actors already moved to network #${otherNet}; can't move to #${newNet.id} now.`,
                );
            }
            console.log("  -- actors are already here");
        } else {
            if (this === previousHelper) {
                console.log(
                    "  -- helper already transferred; loading incremental snapshot",
                );
            } else {
                Object.assign(this.actors, previousHelper.actors);

                // swaps out the previous helper's envelopes for network & actor
                previousHelper.networkCtx = { network: previousNetwork };
                previousHelper.actorContext = {
                    wallet: "previous network retired" as any,
                    others: previousHelper.actorContext.others,
                };

                // uses the old envelope (that the Capo/etc classes used on the old network)
                this.networkCtx = oldNetworkEnvelope;
                this.actorContext = oldActorContext;
                // ... but changes the referenced network
                // ... to reflect the new snapshotted network
                this.networkCtx.network = newNet;

                this.state.mintedCharterToken =
                    previousHelper.state.mintedCharterToken;
                this.state.parsedConfig = parsedConfig;

                //@ts-expect-error
                previousHelper.actors = { [ACTORS_ALREADY_MOVED]: newNet.id };
                console.log(
                    `   -- moving ${
                        Object.keys(this.actors).length
                    } actors from network ${previousNetwork.id} to ${newNet.id}`,
                );
            }
            newNet.loadSnapshot(snapshots[snapshotName]);
        }
        if (!this.actorName) {
            await this.setDefaultActor();
        }
        this.strella = bootstrappedStrella;
        if (!this.strella) {
            await this.initStellarClass(parsedConfig);
        }
        return this.strella;
    }

    async bootstrap(
        args?: Partial<MinimalCharterDataArgs>,
        submitOptions: SubmitOptions = {},
    ) {
        let strella = this.strella || (await this.initialize(undefined, args));
        if (this.bootstrap != CapoTestHelper.prototype.bootstrap) {
            throw new Error(
                `Don't override the test-helper bootstrap().  Instead, provide an implementation of extraBootstrapping()`,
            );
        }
        if (this.ready) {
            console.log(
                "       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap already OK",
            );

            return strella;
        }

        const options = {
            ...submitOptions,
            onSubmitted: () => {
                this.network.tick(1);
            },
        };

        // Try to restore capoInitialized from cache
        const capoInitRestored = await this.tryRestoreCapoInitialized();
        if (!capoInitRestored) {
            // Cache miss - need to mint charter
            await this.mintCharterToken(args, options);
            console.log(
                "       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap with charter",
            );
            this.network.tick(1);

            // Save capoInitialized snapshot
            await this.saveCapoInitializedSnapshot();
        }

        // Try to restore enabledDelegatesDeployed from cache
        const delegatesRestored = await this.tryRestoreDelegatesDeployed();
        if (!delegatesRestored) {
            // Cache miss - need to run extra bootstrapping
            await this.extraBootstrapping(args, options);

            // Save enabledDelegatesDeployed snapshot
            await this.saveDelegatesDeployedSnapshot();
        }

        return strella;
    }

    /**
     * Tries to restore capoInitialized snapshot from disk cache.
     * Returns true if restored, false if cache miss.
     * @internal
     */
    private async tryRestoreCapoInitialized(): Promise<boolean> {
        const actorsSnapshot = this.helperState!.snapshots[SNAP_ACTORS];
        if (!actorsSnapshot) {
            console.log("  -- No actors snapshot to base capoInitialized on");
            return false;
        }

        // Use registry-based find (cache key computed internally)
        const cached = await this.snapshotCache.find(SNAP_CAPO_INIT);
        if (cached) {
            console.log(`  -- ⚗️ capoInitialized snapshot cache HIT`);
            this.network.loadSnapshot(cached.snapshot);
            this.helperState!.snapshots[SNAP_CAPO_INIT] = cached.snapshot;
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);
            return true;
        }

        console.log(`  -- ⚗️ capoInitialized snapshot cache MISS`);
        return false;
    }

    /**
     * Saves capoInitialized snapshot to disk cache.
     * @internal
     */
    private async saveCapoInitializedSnapshot(): Promise<void> {
        const actorsSnapshot = this.helperState!.snapshots[SNAP_ACTORS];
        const parentHash = actorsSnapshot?.blockHashes?.slice(-1)[0] || null;

        const snapshot = this.network.snapshot(SNAP_CAPO_INIT);
        this.helperState!.snapshots[SNAP_CAPO_INIT] = snapshot;

        const cachedSnapshot: CachedSnapshot = {
            snapshot,
            namedRecords: { ...this.helperState!.namedRecords },
            parentSnapName: SNAP_ACTORS,
            parentHash,
            parentCacheKey: null, // deprecated with hierarchical directories
            snapshotHash: this.network.lastBlockHash,
        };
        // Use registry-based store (path computed internally)
        await this.snapshotCache.store(SNAP_CAPO_INIT, cachedSnapshot);
    }

    /**
     * Tries to restore enabledDelegatesDeployed snapshot from disk cache.
     * Returns true if restored, false if cache miss.
     * @internal
     */
    private async tryRestoreDelegatesDeployed(): Promise<boolean> {
        const capoInitSnapshot = this.helperState!.snapshots[SNAP_CAPO_INIT];
        if (!capoInitSnapshot) {
            console.log("  -- No capoInitialized snapshot to base delegates on");
            return false;
        }

        // Use registry-based find (cache key computed internally)
        const cached = await this.snapshotCache.find(SNAP_DELEGATES);
        if (cached) {
            console.log(`  -- 🔧 enabledDelegatesDeployed snapshot cache HIT`);
            this.network.loadSnapshot(cached.snapshot);
            this.helperState!.snapshots[SNAP_DELEGATES] = cached.snapshot;
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);
            return true;
        }

        console.log(`  -- 🔧 enabledDelegatesDeployed snapshot cache MISS`);
        return false;
    }

    /**
     * Saves enabledDelegatesDeployed snapshot to disk cache.
     * @internal
     */
    private async saveDelegatesDeployedSnapshot(): Promise<void> {
        const capoInitSnapshot = this.helperState!.snapshots[SNAP_CAPO_INIT];
        const parentHash = capoInitSnapshot?.blockHashes?.slice(-1)[0] || null;

        const snapshot = this.network.snapshot(SNAP_DELEGATES);
        this.helperState!.snapshots[SNAP_DELEGATES] = snapshot;

        const cachedSnapshot: CachedSnapshot = {
            snapshot,
            namedRecords: { ...this.helperState!.namedRecords },
            parentSnapName: SNAP_CAPO_INIT,
            parentHash,
            parentCacheKey: null, // deprecated with hierarchical directories
            snapshotHash: this.network.lastBlockHash,
        };
        // Use registry-based store (path computed internally)
        await this.snapshotCache.store(SNAP_DELEGATES, cachedSnapshot);
    }

    /**
     * Returns the id of a named record previously stored in the helperState.namedRecords.
     * @remarks
     * Throws an error if the named record is not found.
     */
    getNamedRecordId(recordName: string) {
        const found = this.helperState!.namedRecords[recordName];
        if (!found) throw new Error(`named record: '${recordName}' not found`);
        return found;
    }

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
    async captureRecordId<
        T extends StellarTxnContext<anyState> & hasUutContext<U>,
        const U extends string & keyof T["state"]["uuts"] = "recordId", //as string & keyof T["state"]["uuts"],
    >(
        options: {
            recordName: string;
            submit?: boolean;
            uutName?: U;
            expectError?: true;
        },
        tcxPromise: Promise<T>,
        //   uutName: U  = "recordId" as U// keyof T["state"]["uuts"] = "recordId"
    ) {
        const {
            recordName: name,
            submit = true,
            uutName = "recordId" as U,
            expectError,
        } = options;
        const stack = new Error().stack!.split("\n").slice(2, 3);
        const tcx = await tcxPromise.catch((e: Error) => {
            const lines = (e.stack || "").split("\n");
            const index = lines.findIndex((line: string) =>
                line.match(/captureRecordId/),
            );
            lines.splice(index === -1 ? 0 : index + 1, 0, ...stack);
            e.stack = lines.join("\n");
            throw e;
        });
        const id = tcx.state.uuts[uutName];
        if (!id) {
            console.log("UUTs in tcx:", tcx.state.uuts);
            throw new Error(
                `captureRecordId: no ${uutName.toString()} found in txn context for ${name}`,
            );
        }
        this.helperState!.namedRecords[name] = id.toString();
        if (submit)
            return this.submitTxnWithBlock(tcx, {
                expectError,
            });
        return tcx;
    }

    async extraBootstrapping(
        args?: Partial<MinimalCharterDataArgs>,
        submitOptions: SubmitOptions = {},
    ) {
        const tcx = this.mkTcx("extra bootstrapping").facade();
        const capoUtxos = await this.capo.findCapoUtxos();
        const charterData = await this.capo.findCharterData(undefined, {
            optional: false,
            capoUtxos,
        });
        const tcx2 = await this.capo.mkTxnUpgradeIfNeeded(charterData);
        // const tcx2 = await this.capo.addTxnBootstrappingSettings(tcx, charterData);
        // const tcx3 = await this.capo.mkAdditionalTxnsForCharter(tcx, {
        //     charterData,
        //     capoUtxos
        // })

        await this.submitTxnWithBlock(tcx2, submitOptions);
        return this.strella;
    }

    abstract mkDefaultCharterArgs(): Partial<MinimalCharterDataArgs>;
    abstract mintCharterToken(
        args?: Partial<MinimalCharterDataArgs>,
        submitOptions?: SubmitOptions,
    ): Promise<
        hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> &
            hasBootstrappedCapoConfig &
            hasAddlTxns<any>
    >;

    /**
     * Gets the last block hash from a stored snapshot.
     * @internal
     */
    private getSnapshotBlockHash(snapName: string): string {
        return this.helperState?.snapshots[snapName]?.blockHashes?.slice(-1)[0] ?? "genesis";
    }

    /**
     * Computes the cache key for a built-in snapshot by recomputation.
     * No Map needed—resolvers are deterministic and parent hashes are in helperState.
     * @public
     */
    async getSnapshotCacheKey(snapName: string): Promise<string | null> {
        switch (snapName) {
            case "genesis":
                return null;

            case SNAP_ACTORS:
            case "bootstrapWithActors":
                return this.snapshotCache.computeKey(null, this.resolveActorsDependencies());

            case SNAP_CAPO_INIT:
            case "capoInitialized": {
                const parentHash = this.getSnapshotBlockHash(SNAP_ACTORS);
                return this.snapshotCache.computeKey(parentHash, await this.resolveCoreCapoDependencies());
            }

            case SNAP_DELEGATES:
            case "enabledDelegatesDeployed":
            case "bootstrapped": {
                const parentHash = this.getSnapshotBlockHash(SNAP_CAPO_INIT);
                return this.snapshotCache.computeKey(parentHash, await this.resolveEnabledDelegatesDependencies());
            }

            default:
                // App snapshots build on SNAP_DELEGATES; return its cache key as their parent
                return this.getSnapshotCacheKey(SNAP_DELEGATES);
        }
    }

    /**
     * Resolves cache key inputs for the base actors snapshot.
     * Cache key includes: actor names, order, initial amounts, additional UTxO amounts.
     * @public
     */
    resolveActorsDependencies(): CacheKeyInputs {
        // Convert actor setup info to a deterministic format for hashing
        const actorData = this.actorSetupInfo.map((actor) => ({
            name: actor.name,
            initialBalance: actor.initialBalance.toString(),
            additionalUtxos: actor.additionalUtxos.map((u) => u.toString()),
        }));

        return {
            bundles: [], // No script bundles for actors snapshot
            extra: {
                actors: actorData,
                randomSeed: this.randomSeed,
                heliosVersion: HELIOS_VERSION,
            },
        };
    }

    /**
     * Resolves cache key inputs for core Capo scripts (minter, mint delegate, spend delegate).
     * Used for snapshot cache key computation for the capoInitialized snapshot.
     * @public
     */
    async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
        const capoBundle = await this.capo.getBundle();
        const bundles: BundleCacheKeyInputs[] = [capoBundle.getCacheKeyInputs()];

        // Add core delegate bundles
        try {
            const mintDelegate = await this.capo.getMintDelegate();
            const mintBundle = await mintDelegate.getBundle();
            bundles.push(mintBundle.getCacheKeyInputs());
        } catch (e) {
            console.warn(`CapoTestHelper: skipping mint delegate for cache key: ${e}`);
        }

        try {
            const spendDelegate = await this.capo.getSpendDelegate();
            const spendBundle = await spendDelegate.getBundle();
            bundles.push(spendBundle.getCacheKeyInputs());
        } catch (e) {
            console.warn(`CapoTestHelper: skipping spend delegate for cache key: ${e}`);
        }

        return {
            bundles,
            extra: {
                heliosVersion: HELIOS_VERSION,
            },
        };
    }

    /**
     * Resolves cache key inputs for all enabled delegates.
     * Used for snapshot cache key computation for the enabledDelegatesDeployed snapshot.
     * Includes dgData controllers (filtered by featureFlags) per REQT-1.2.3.2 and REQT-1.2.3.4.
     * @public
     */
    async resolveEnabledDelegatesDependencies(): Promise<CacheKeyInputs> {
        const coreInputs = await this.resolveCoreCapoDependencies();
        const bundles = [...coreInputs.bundles];

        // Iterate delegateRoles for dgData controllers
        const { delegateRoles } = this.capo;

        for (const [roleName, roleSetup] of Object.entries(delegateRoles)) {
            const { delegateType, delegateClass } = roleSetup as DelegateSetup<any, any, any>;

            // Skip core delegates (already in coreInputs from resolveCoreCapoDependencies)
            if (["spendDgt", "mintDgt", "authority"].includes(delegateType)) {
                continue;
            }

            // For dgDataPolicy: check featureEnabled via this.featureFlags
            // (this.capo.featureEnabled has generic constraint keyof featureFlags which
            // resolves to 'never' when featureFlags defaults to {})
            if (delegateType === "dgDataPolicy") {
                if (!this.featureFlags?.[roleName]) {
                    continue;
                }

                // Get bundle from an instantiated delegate
                try {
                    const delegate = await (this.capo as Capo<any>).getDgDataController(
                        roleName as string & keyof Capo<any>["_delegateRoles"],
                        { onchain: false }
                    );
                    if (!delegate) {
                        console.warn(`CapoTestHelper: dgData controller ${roleName} returned undefined`);
                        continue;
                    }
                    const bundle = await delegate.getBundle();
                    bundles.push(bundle.getCacheKeyInputs());
                } catch (e) {
                    console.warn(`CapoTestHelper: skipping dgData controller ${roleName} for cache key: ${e}`);
                }
            }
        }

        return {
            bundles,
            extra: {
                ...coreInputs.extra,
                featureFlags: this.featureFlags || {},
            },
        };
    }
}
