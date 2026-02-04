import { Capo, StellarTxnContext, parseCapoJSONConfig } from "@donecollectively/stellar-contracts";
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
import { SnapshotCache, type CacheKeyInputs, type CachedSnapshot, type ParentSnapName } from "./emulator/SnapshotCache.js";
import type { BundleCacheKeyInputs } from "../helios/scriptBundling/HeliosScriptBundle.js";

import { StellarTestHelper, type ActorSetupInfo } from "./StellarTestHelper.js";
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

/**
 * Serialized seed UTxO for storage in offchainData.
 * Used to break the chicken-and-egg dependency in disk cache lookup (REQT-3.6.1).
 * @public
 */
export type PreSelectedSeedUtxo = {
    txId: string;
    utxoIdx: number;
};

export const SNAP_ACTORS = "bootstrapWithActors";
export const SNAP_CAPO_INIT = "capoInitialized";
export const SNAP_DELEGATES = "enabledDelegatesDeployed";

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

    /**
     * Pre-selected seed UTxO for breaking chicken-and-egg dependency (REQT-3.6.1).
     * Selected during bootstrapWithActors and stored in actors snapshot offchainData.
     */
    preSelectedSeedUtxo: PreSelectedSeedUtxo | undefined = undefined;

    /** Disk cache for snapshots, shared via helperState for cross-test reuse */
    snapshotCache!: SnapshotCache;

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

        // Use shared SnapshotCache from helperState, or create new one (ARCH-1d82vckcae)
        if (this.helperState?.snapCache) {
            this.snapshotCache = this.helperState.snapCache;
        } else {
            this.snapshotCache = new SnapshotCache();
            if (this.helperState) {
                this.helperState.snapCache = this.snapshotCache;
            }
        }

        // Register the actors snapshot (doesn't need capo)
        // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym) - no binding
        this.snapshotCache.register(SNAP_ACTORS, {
            parentSnapName: "genesis",
            resolveScriptDependencies: async (helper) => (helper as this).resolveActorsDependencies(),
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

        // Resolvers take helper as explicit argument (ARCH-8rqhpfy1ym) - no binding
        this.snapshotCache.register(SNAP_CAPO_INIT, {
            parentSnapName: SNAP_ACTORS as ParentSnapName,
            resolveScriptDependencies: async (helper) => (helper as this).resolveCoreCapoDependencies(),
        });

        this.snapshotCache.register(SNAP_DELEGATES, {
            parentSnapName: SNAP_CAPO_INIT as ParentSnapName,
            resolveScriptDependencies: async (helper) => (helper as this).resolveEnabledDelegatesDependencies(),
        });
    }

    /**
     * Default helperState shared across all instances of this helper class.
     * Subclasses can override this to provide custom default state.
     * @public
     */
    static defaultHelperState: TestHelperState<any, any> = {
        namedRecords: {},
        snapCache: new SnapshotCache(),
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

        // Track if beforeEach has been registered for this createTestContext instance
        let beforeEachRegistered = false;

        /**
         * Wraps a vitest describe function to auto-inject beforeEach at top level
         */
        const wrapDescribe = (
            vitestFn: typeof vitestDescribe | typeof vitestDescribe.only
        ) => {
            return (name: string, fn: () => void): void => {
                vitestFn(name, () => {
                    if (!beforeEachRegistered) {
                        beforeEachRegistered = true;
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

                    fn();
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
            // Clear actor context to force fresh setup
            this.actorContext = { others: {} };
            // Clear cached state to force fresh build with new seed
            if (this.helperState) {
                this.helperState.offchainData = {};
                this.helperState.bootstrappedStrella = undefined;
                this.helperState.previousHelper = undefined as any;
            }
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

    async reusableBootstrap(
        snap = SNAP_DELEGATES,
    ) {
        let capo;
        const helperState = this.helperState!;
        const { bootstrappedStrella, previousHelper } = helperState;

        // If we're the same helper as previousHelper, we're in a nested call
        // (e.g., from a @hasNamedSnapshot decorator during snapshot building).
        // Just return the existing capo without restoring.
        if (previousHelper === this && bootstrappedStrella) {
            console.log("  ---  ⚗️🐞🐞 nested call - returning existing capo");
            return bootstrappedStrella;
        }

        // Check if we can restore from a prior bootstrap
        // Requires: prior Capo exists AND snapshot exists in cache
        const cached = bootstrappedStrella && previousHelper
            ? await this.snapshotCache.find(snap, this)
            : null;

        if (cached && bootstrappedStrella && previousHelper) {
            // Already bootstrapped in a prior call - restore from snapshot
            console.log("  ---  ⚗️🐞🐞 already bootstrapped");
            console.log(
                `changing helper from network ${previousHelper.network.id} to ${this.network.id}`,
            );
            capo = await this.restoreFrom(snap);
        } else {
            // Fresh bootstrap (no prior Capo, or snapshot not found)
            capo = await this.bootstrap();
            helperState.bootstrappedStrella = capo;
            // Store parsedConfig for cross-instance Capo reconstruction (REQT-3.5/vmq8qmv218)
            helperState.parsedConfig = this.state.parsedConfig;
        }

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
        options: SnapshotDecoratorOptions,
    ) {
        const { actor: actorName, parentSnapName, internal, resolveScriptDependencies } = options;
        if (!parentSnapName) {
            throw new Error(
                `hasNamedSnapshot('${snapshotName}'): parentSnapName is required. ` +
                `Use 'bootstrapped' for typical app snapshots, or 'genesis' for root snapshots.`
            );
        }

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
                if (parentSnapName === "genesis") {
                    this.ensureHelperState();
                } else if (internal) {
                    // Internal snapshots are part of bootstrap() flow - don't call reusableBootstrap()
                    // to avoid infinite loop (bootstrap → snapTo* → reusableBootstrap → bootstrap)
                    this.ensureHelperState();
                } else {
                    await this.reusableBootstrap();
                }

                // Register snapshot with the cache
                // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym) - no binding needed
                this.snapshotCache.register(snapshotName, {
                    parentSnapName,
                    resolveScriptDependencies,
                });

                return this.findOrCreateSnapshot(
                    snapshotName,
                    actorName,
                    () => {
                        return generateSnapshotFunc
                            .apply(this, args)
                            .then((result: any) => {
                                // "default" means accept whatever setDefaultActor() set (just verify one is set)
                                if (actorName === "default") {
                                    if (!this.actorName) {
                                        throw new Error(
                                            `snapshot ${snapshotName}: expected default actor to be set, but no actor is set`,
                                        );
                                    }
                                } else if (this.actorName !== actorName) {
                                    throw new Error(
                                        `snapshot ${snapshotName}: expected actor '${actorName}', but current actor is '${this.actorName}'`,
                                    );
                                }
                                this.network.tick(1);
                                return result;
                            });
                    },
                );
            }
            return descriptor;
        };
    }

    /**
     * Determines whether a new Capo should be created based on current state vs loaded config.
     * Implements the Capo reconstruction decision tree (REQT-3.6.5/vz0fc3s057).
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
    private shouldCreateNewCapo(loadedConfig: CapoConfig | undefined): boolean {
        // Case a): No Capo at all
        if (!this.strella) {
            console.log(`  [shouldCreateNewCapo] No Capo → create new`);
            return true;
        }

        // Case a): Unconfigured egg (no mph)
        if (!this.strella.configIn?.mph) {
            console.log(`  [shouldCreateNewCapo] Egg (no mph) → create new`);
            return true;
        }

        // If no loaded config, can't compare - keep existing
        if (!loadedConfig?.mph) {
            console.log(`  [shouldCreateNewCapo] No loaded config → keep existing`);
            return false;
        }

        // Compare identity: different mph means different Capo
        const currentMph = this.strella.mintingPolicyHash?.toHex();
        const loadedMph = loadedConfig.mph.toHex();

        if (currentMph !== loadedMph) {
            console.log(`  [shouldCreateNewCapo] Different mph (${currentMph?.slice(0, 12)} vs ${loadedMph.slice(0, 12)}) → create new`);
            return true;
        }

        // Case c): Same chartered Capo
        console.log(`  [shouldCreateNewCapo] Same mph → hot-swap`);
        return false;
    }

    /**
     * Gets the pre-selected seed UTxO from the actors snapshot's offchainData.
     * Used by resolvers for cache key computation (REQT-3.6.2).
     * @internal
     */
    getPreSelectedSeedUtxo(): PreSelectedSeedUtxo | undefined {
        // First check if we have it in memory (set during bootstrapWithActors)
        if (this.preSelectedSeedUtxo) {
            return this.preSelectedSeedUtxo;
        }

        // Otherwise, try to get it from the actors snapshot's offchainData
        const actorsOffchainData = this.helperState?.offchainData?.[SNAP_ACTORS];
        if (actorsOffchainData?.targetSeedUtxo) {
            return actorsOffchainData.targetSeedUtxo as PreSelectedSeedUtxo;
        }

        return undefined;
    }

    /**
     * Pre-selects a seed UTxO from the default actor's wallet (REQT-3.6.1).
     * Must be called after setDefaultActor() so wallet is available.
     * @internal
     */
    async preSelectSeedUtxo(): Promise<void> {
        if (!this.wallet) {
            throw new Error(`preSelectSeedUtxo: no wallet - call setDefaultActor() first`);
        }

        const utxos = await this.wallet.utxos;
        if (utxos.length === 0) {
            throw new Error(`preSelectSeedUtxo: default actor has no UTxOs`);
        }

        // Select the last UTxO (any will work - tx will make change when consumed)
        const seedUtxo = utxos[utxos.length - 1];
        this.preSelectedSeedUtxo = {
            txId: seedUtxo.id.txId.toString(),
            utxoIdx: seedUtxo.id.index,
        };

        console.log(`  -- Pre-selected seed UTxO: ${this.preSelectedSeedUtxo.txId.slice(0, 12)}...#${this.preSelectedSeedUtxo.utxoIdx}`);
    }

    /**
     * Creates test actors for the emulator.
     * Idempotent: only runs if actors haven't been set up yet.
     * Called by snapToBootstrapWithActors via @hasNamedSnapshot decorator.
     * @internal
     */
    async bootstrapWithActors(): Promise<void> {
        // Only run if actors haven't been set up yet
        // (resolver may have already called setupActors to get actorSetupInfo)
        if (this.actorSetupInfo.length === 0) {
            await this.setupActors();
        } else {
            // Resolver already created actors silently - log them now for visibility on cache miss
            this.logActorDetails();
        }
        // Set the default actor so decorator's actor check passes
        await this.setDefaultActor();

        // Commit actor UTxOs to a block so they're visible for seed UTxO selection
        // (setupActors creates UTxOs in mempool via network.createUtxo)
        this.network.tick(1);

        // Pre-select seed UTxO for cache key computation (REQT-3.6.1)
        await this.preSelectSeedUtxo();

        // tick happens in decorator wrapper after this returns
    }

    /**
     * Decorated wrapper for bootstrapWithActors.
     * Uses @hasNamedSnapshot with parentSnapName: "genesis" for root snapshot.
     * @public
     */
    @CapoTestHelper.hasNamedSnapshot(SNAP_ACTORS, {
        actor: "default",
        parentSnapName: "genesis",
        // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym)
        async resolveScriptDependencies(helper) {
            const h = helper as CapoTestHelper<any, any>;
            // Ensure actors are set up so we can compute cache key
            // Use silent mode since this is just for cache key computation,
            // not the actual snapshot build (logging would be noisy on cache hits)
            if (h.actorSetupInfo.length === 0) {
                h._silentActorSetup = true;
                try {
                    await h.setupActors();
                } finally {
                    h._silentActorSetup = false;
                }
                // DON'T tick here - let the decorator handle tick after builder
            }
            return h.resolveActorsDependencies();
        },
    })
    async snapToBootstrapWithActors(): Promise<void> {
        // Decorator calls bootstrapWithActors() and handles caching
    }


    /**
     * Decorated wrapper for capoInitialized.
     * Uses @hasNamedSnapshot with internal: true since this is part of bootstrap() flow.
     * @public
     */
    @CapoTestHelper.hasNamedSnapshot(SNAP_CAPO_INIT, {
        actor: "default",
        parentSnapName: SNAP_ACTORS,
        internal: true, // Part of bootstrap flow - don't call reusableBootstrap()
        // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym)
        async resolveScriptDependencies(helper) {
            return (helper as CapoTestHelper<any, any>).resolveCoreCapoDependencies();
        },
    })
    async snapToCapoInitialized(
        args?: Partial<MinimalCharterDataArgs>,
        options?: SubmitOptions,
    ): Promise<void> {
        // Decorator calls capoInitialized() and handles caching
    }
    /**
     * Mints the charter token and initializes the Capo.
     * Called by snapToCapoInitialized via @hasNamedSnapshot decorator.
     * @internal
     */
    async capoInitialized(
        args?: Partial<MinimalCharterDataArgs>,
        options?: SubmitOptions,
    ): Promise<void> {
        await this.mintCharterToken(args, options);
        console.log(
            "       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap with charter",
        );
        // tick happens in decorator wrapper after this returns
    }

    /**
     * Deploys enabled delegates after Capo initialization.
     * Called by snapToEnabledDelegatesDeployed via @hasNamedSnapshot decorator.
     * @internal
     */
    async enabledDelegatesDeployed(
        args?: Partial<MinimalCharterDataArgs>,
        options?: SubmitOptions,
    ): Promise<void> {
        await this.extraBootstrapping(args, options);
        console.log(
            "       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Delegates deployed",
        );
        // tick happens in decorator wrapper after this returns
    }

    /**
     * Decorated wrapper for enabledDelegatesDeployed.
     * Uses @hasNamedSnapshot with internal: true since this is part of bootstrap() flow.
     * @public
     */
    @CapoTestHelper.hasNamedSnapshot(SNAP_DELEGATES, {
        actor: "default",
        parentSnapName: SNAP_CAPO_INIT,
        internal: true, // Part of bootstrap flow - don't call reusableBootstrap()
        // Resolver takes helper as explicit argument (ARCH-8rqhpfy1ym)
        async resolveScriptDependencies(helper) {
            return (helper as CapoTestHelper<any, any>).resolveEnabledDelegatesDependencies();
        },
    })
    async snapToEnabledDelegatesDeployed(
        args?: Partial<MinimalCharterDataArgs>,
        options?: SubmitOptions,
    ): Promise<void> {
        // Decorator calls enabledDelegatesDeployed() and handles caching
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
                namedRecords: {},
            };
        } else {
            // Ensure required properties exist even in custom/inherited helperState
            if (!this.helperState.namedRecords) {
                this.helperState.namedRecords = {};
            }
        }
    }

    async findOrCreateSnapshot(
        snapshotName: string,
        actorName: string,
        contentBuilder: () => Promise<StellarTxnContext<any>>,
    ): Promise<SC> {
        const startTime = performance.now();

        // Check registry to determine if this is a genesis (actors) snapshot
        const entry = this.snapshotCache["registry"].get(snapshotName);
        const isGenesisSnapshot = entry?.parentSnapName === "genesis";

        // Try cache using registry-based API (snapshotCache.loadedSnapshots uses composite keys for proper isolation)
        const cacheStart = performance.now();
        const cached = await this.snapshotCache.find(snapshotName, this);
        if (cached) {
            // Restore from cache (may be in-memory via loadedSnapshots or from disk)
            this.network.loadSnapshot(cached.snapshot);
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);

            // Store offchainData in helperState for in-memory cache (REQT-3.4/n93h9y5s85)
            if (cached.offchainData) {
                if (!this.helperState!.offchainData) {
                    this.helperState!.offchainData = {};
                }
                this.helperState!.offchainData[snapshotName] = cached.offchainData;
            }

            if (isGenesisSnapshot) {
                // Restore actors from stored keys (REQT-3.4.2/avwkcrnwqp, REQT-3.4.4/3rexpys2q3)
                if (Object.keys(this.actors).length === 0) {
                    const actorWallets = cached.offchainData?.actorWallets as Record<string, { spendingKey: string; stakingKey?: string }> | undefined;
                    if (actorWallets) {
                        this.restoreActorsFromStoredKeys({ actorWallets });
                    } else {
                        console.warn(`  ⚠️ No stored actor keys in disk cache for '${snapshotName}' - cache may need rebuild`);
                    }
                }

                // Restore pre-selected seed UTxO from offchainData (REQT-3.6.1)
                if (!this.preSelectedSeedUtxo && cached.offchainData?.targetSeedUtxo) {
                    this.preSelectedSeedUtxo = cached.offchainData.targetSeedUtxo as PreSelectedSeedUtxo;
                    console.log(`  -- Restored pre-selected seed UTxO from cache: ${this.preSelectedSeedUtxo.txId.slice(0, 12)}...#${this.preSelectedSeedUtxo.utxoIdx}`);
                }

                // Set actor
                if (actorName === "default") {
                    await this.setDefaultActor();
                } else if (this.actors[actorName]) {
                    await this.setActor(actorName);
                }
                const elapsed = (performance.now() - cacheStart).toFixed(1);
                console.log(`  ⚡ cache hit (genesis) '${snapshotName}': ${elapsed}ms`);
                return this.strella; // May be undefined for actors, that's OK
            }

            // Disk cache hit for non-genesis snapshot
            // Implement Capo reconstruction decision tree (REQT-3.6.5/vz0fc3s057)
            const { bootstrappedStrella, previousHelper } = this.helperState!;
            const loadedRawConfig = cached.offchainData?.capoConfig as Record<string, any> | undefined;
            const loadedConfig = loadedRawConfig ? parseCapoJSONConfig(loadedRawConfig as any) : undefined;

            // Decision tree: should we create a new Capo?
            const shouldCreateNew = this.shouldCreateNewCapo(loadedConfig);

            if (shouldCreateNew) {
                // Cases a) and b): Create new Capo with loaded config
                console.log(`  -- Creating new Capo from loaded config (shouldCreateNew=${shouldCreateNew})`);
                const config = loadedConfig || this.helperState!.parsedConfig;
                if (config) {
                    // Store parsed config for subsequent operations
                    this.helperState!.parsedConfig = config;
                    this.state.parsedConfig = config;
                    this.state.rawConfig = loadedRawConfig;
                    await this.initStellarClass(config);
                } else {
                    await this.initStellarClass();  // uses this.config default
                }
                // Set up helperState for subsequent operations
                this.helperState!.bootstrappedStrella = this.strella;
                this.helperState!.previousHelper = this as any;
            } else if (bootstrappedStrella && previousHelper) {
                // Case c): Same chartered Capo - hot-swap network via restoreFrom()
                console.log(`  -- Hot-swapping network for existing Capo`);
                await this.restoreFrom(snapshotName);
            } else {
                // Fallback: we have a matching Capo but no previousHelper
                // This shouldn't happen normally, but handle gracefully
                console.log(`  -- Using existing Capo (no previousHelper)`);
                this.helperState!.bootstrappedStrella = this.strella;
                this.helperState!.previousHelper = this as any;
            }

            if (actorName === "default") {
                await this.setDefaultActor();
            } else {
                await this.setActor(actorName);
            }

            // Diagnostic: compare stored snapshot state with current Capo state
            const storedDiag = cached.offchainData?._diag as {
                capoAddr?: string;
                validatorHash?: string;
                utxoCountAtCapoAddr?: number;
                addressUtxoKeys?: string[];
            } | undefined;
            if (storedDiag) {
                const currentCapoAddr = this.strella?.address?.toString();
                const currentValidatorHash = this.strella?.validatorHash!.toHex();
                const currentUtxoCount = currentCapoAddr
                    ? (this.network as any)._addressUtxos[currentCapoAddr]?.length || 0
                    : 0;
                const currentAddressKeys = Object.keys((this.network as any)._addressUtxos);

                console.log(`  [DIAG] Snapshot restore comparison for '${snapshotName}':`);
                console.log(`    storedCapoAddr:   ${storedDiag.capoAddr}`);
                console.log(`    currentCapoAddr:  ${currentCapoAddr}`);
                console.log(`    addrMatch: ${storedDiag.capoAddr === currentCapoAddr}`);
                console.log(`    storedValidatorHash:  ${storedDiag.validatorHash}`);
                console.log(`    currentValidatorHash: ${currentValidatorHash}`);
                console.log(`    vhMatch: ${storedDiag.validatorHash === currentValidatorHash}`);
                console.log(`    storedUtxoCount:  ${storedDiag.utxoCountAtCapoAddr}`);
                console.log(`    currentUtxoCount: ${currentUtxoCount}`);
                console.log(`    storedAddressKeys (${storedDiag.addressUtxoKeys?.length}): ${storedDiag.addressUtxoKeys?.slice(0, 5).join(', ')}${(storedDiag.addressUtxoKeys?.length || 0) > 5 ? '...' : ''}`);
                console.log(`    currentAddressKeys (${currentAddressKeys.length}): ${currentAddressKeys.slice(0, 5).join(', ')}${currentAddressKeys.length > 5 ? '...' : ''}`);

                if (storedDiag.capoAddr !== currentCapoAddr) {
                    console.warn(`    ⚠️ ADDRESS MISMATCH - this is likely the bug!`);
                }
                if (currentUtxoCount === 0 && (storedDiag.utxoCountAtCapoAddr || 0) > 0) {
                    console.warn(`    ⚠️ UTxO COUNT DROPPED TO ZERO - snapshot may not have loaded correctly`);
                }
            }

            const elapsed = (performance.now() - cacheStart).toFixed(1);
            console.log(`  ⚡ cache hit '${snapshotName}': ${elapsed}ms`);
            return this.strella;
        }
        console.log(`  📦 cache miss '${snapshotName}' - building...`);

        // Build the snapshot
        const buildStart = performance.now();
        let succeeded = false;
        try {
            await contentBuilder();
            succeeded = true;
            const buildElapsed = (performance.now() - buildStart).toFixed(1);
            console.log(`  🐢 built '${snapshotName}': ${buildElapsed}ms`);
            return this.strella;
        } catch (e) {
            throw e;
        } finally {
            if (succeeded) {
                const storeStart = performance.now();

                // Capture network snapshot and store to cache
                const snapshot = this.network.snapshot(snapshotName);
                const entry = this.snapshotCache["registry"].get(snapshotName);
                const parentSnapName = entry?.parentSnapName || "genesis";

                // Get parent hash from snapshotCache (already loaded during parent resolution)
                const parentCached = parentSnapName !== "genesis"
                    ? await this.snapshotCache.find(parentSnapName, this)
                    : null;
                const parentHash = parentCached?.snapshotHash || null;

                // For genesis snapshots, store actorSetupInfo for regeneration on cache load
                // Defensive check: namedRecords should be guaranteed by ensureHelperState()
                if (!this.helperState!.namedRecords) {
                    throw new Error(
                        `findOrCreateSnapshot('${snapshotName}'): helperState.namedRecords is undefined. ` +
                        `This should not happen - ensureHelperState() should have initialized it.`
                    );
                }
                const namedRecords = { ...this.helperState!.namedRecords };
                let offchainData: Record<string, unknown> | undefined;

                if (parentSnapName === "genesis" && Object.keys(this.actors).length > 0) {
                    // Store actor wallet keys in offchainData (REQT-3.4.1/1p346cabct)
                    // Replaces __actorSetupInfo__ hack (REQT-3.4.4/3rexpys2q3)
                    offchainData = {
                        ...this.getActorWalletKeys(),
                        // Store pre-selected seed UTxO for cache key computation (REQT-3.6.1)
                        targetSeedUtxo: this.preSelectedSeedUtxo,
                    };

                    // Initialize helperState.offchainData if needed and store for in-memory cache
                    if (!this.helperState!.offchainData) {
                        this.helperState!.offchainData = {};
                    }
                    this.helperState!.offchainData[snapshotName] = offchainData;
                } else if (this.state?.rawConfig) {
                    // Store rawConfig in offchainData for non-genesis snapshots (REQT-3.5/vmq8qmv218)
                    // This enables cross-process Capo reconstruction from disk cache
                    const capoAddr = this.strella?.address?.toString();
                    const validatorHash = this.strella?.validatorHash!.toHex();
                    const utxoCountAtCapoAddr = capoAddr
                        ? (this.network as any)._addressUtxos[capoAddr]?.length || 0
                        : 0;

                    offchainData = {
                        capoConfig: this.state.rawConfig,
                        // Diagnostics for debugging snapshot restore issues
                        _diag: {
                            capoAddr,
                            validatorHash,
                            utxoCountAtCapoAddr,
                            addressUtxoKeys: Object.keys((this.network as any)._addressUtxos),
                        }
                    };

                    // Initialize helperState.offchainData if needed and store for in-memory cache
                    if (!this.helperState!.offchainData) {
                        this.helperState!.offchainData = {};
                    }
                    this.helperState!.offchainData[snapshotName] = offchainData;
                }

                const cachedSnapshot: CachedSnapshot = {
                    snapshot,
                    namedRecords,
                    parentSnapName,
                    parentHash,
                    parentCacheKey: null, // deprecated with hierarchical directories
                    snapshotHash: this.network.lastBlockHash,
                    offchainData,
                };

                await this.snapshotCache.store(snapshotName, cachedSnapshot, this);
                const storeElapsed = (performance.now() - storeStart).toFixed(1);
                console.log(`  💾 stored '${snapshotName}' to disk: ${storeElapsed}ms`);
            }
        }
    }

    async restoreFrom(snapshotName: string): Promise<SC> {
        const {
            helperState,
            helperState: {
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

        // Get snapshot from cache (uses proper composite key)
        const cached = await this.snapshotCache.find(snapshotName, this);
        if (!cached) {
            throw new Error(`no snapshot named ${snapshotName} in snapshotCache`);
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

        // Check if this is the same helper restoring to a different snapshot
        console.log(`  [DEBUG restoreFrom] this===previousHelper: ${this === previousHelper}`);
        console.log(`  [DEBUG restoreFrom] this._actorName: "${this._actorName}"`);
        console.log(`  [DEBUG restoreFrom] this.actorContext.wallet: ${this.actorContext.wallet?.address?.toString().slice(0, 20) || 'undefined'}`);
        console.log(`  [DEBUG restoreFrom] oldActorContext.wallet: ${(oldActorContext as any).wallet?.address?.toString().slice(0, 20) || (oldActorContext as any).wallet || 'undefined'}`);
        console.log(`  [DEBUG restoreFrom] Object.keys(this.actors): ${Object.keys(this.actors).join(', ')}`);
        console.log(`  [DEBUG restoreFrom] Object.keys(previousHelper.actors): ${Object.keys(previousHelper.actors).join(', ')}`);

        // Check if this helper already has valid actors (not just the marker)
        const thisHasRealActors = Object.keys(this.actors).some(k => k !== ACTORS_ALREADY_MOVED);
        const previousHasRealActors = Object.keys(previousHelper.actors).some(k => k !== ACTORS_ALREADY_MOVED);

        if (this === previousHelper || thisHasRealActors) {
            console.log(
                `  -- ${this === previousHelper ? 'same helper' : 'actors already present'} - loading snapshot only`,
            );
            console.log(`  [DEBUG restoreFrom] BEFORE: this.networkCtx.network.id=${(this.networkCtx.network as any).id}, newNet.id=${(newNet as any).id}`);
            console.log(`  [DEBUG restoreFrom] BEFORE: bootstrappedStrella?.setup?.network?.id=${(bootstrappedStrella as any)?.setup?.network?.id}`);
            // Actors are already in this.actors - just load the snapshot
            newNet.loadSnapshot(cached.snapshot);
            // Ensure helper's networkCtx points to the correct network
            if (this.networkCtx.network !== newNet) {
                console.log(`  [DEBUG restoreFrom] Swapping this.networkCtx.network from ${(this.networkCtx.network as any).id} to ${(newNet as any).id}`);
                this.networkCtx.network = newNet;
            }
            // Also ensure the Capo's setup.network points to the correct network
            if (bootstrappedStrella?.setup?.network !== newNet) {
                console.log(`  [DEBUG restoreFrom] Swapping bootstrappedStrella.setup.network from ${(bootstrappedStrella as any)?.setup?.network?.id} to ${(newNet as any).id}`);
                (bootstrappedStrella as any).setup.network = newNet;
            }
            console.log(`  [DEBUG restoreFrom] AFTER: this.networkCtx.network.id=${(this.networkCtx.network as any).id}`);
            console.log(`  [DEBUG restoreFrom] AFTER: bootstrappedStrella?.setup?.network?.id=${(bootstrappedStrella as any)?.setup?.network?.id}`);
        } else if (!previousHasRealActors) {
            // previousHelper was already retired - can't transfer from it
            throw new Error(
                `restoreFrom('${snapshotName}'): previousHelper has no actors to transfer (already retired). ` +
                `This usually means helperState is stale from a previous test.`
            );
        } else {
            // Different helper instance with no actors - transfer from previousHelper
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

            newNet.loadSnapshot(cached.snapshot);
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

        // Mint charter token and create capoInitialized snapshot (handles caching)
        await this.snapToCapoInitialized(args, options);

        // Deploy delegates and create enabledDelegatesDeployed snapshot (handles caching)
        await this.snapToEnabledDelegatesDeployed(args, options);

        // Return the updated strella (snapshot restore may have replaced it with configured one)
        return this.strella;
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

        console.log(`[DEBUG resolveActorsDependencies] randomSeed=${this.randomSeed}, actorCount=${actorData.length}`);

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
     * Ensures an egg (unconfigured Capo) exists for cache key computation (REQT-3.6.6).
     * Creates one via initStrella() if this.strella is undefined or unconfigured.
     * @internal
     */
    private async ensureEggForCacheKey(): Promise<void> {
        // Check if we have a Capo (egg or chartered)
        if (this.strella) {
            return; // Already have a Capo (may be egg or chartered)
        }

        // Create an egg (unconfigured Capo) for cache key computation
        console.log(`  -- Creating egg (unconfigured Capo) for cache key computation`);
        const { featureFlags } = this;
        if (featureFlags) {
            this.strella = await this.initStrella(this.stellarClass, {
                featureFlags,
            } as any);
        } else {
            this.strella = await this.initStrella(this.stellarClass);
        }
    }

    /**
     * Resolves cache key inputs for core Capo scripts (minter, mint delegate, spend delegate).
     * Used for snapshot cache key computation for the capoInitialized snapshot.
     * Uses computeSourceHash() instead of getCacheKeyInputs() to work with egg Capo (REQT-3.6.2, REQT-3.6.3).
     * @public
     */
    async resolveCoreCapoDependencies(): Promise<CacheKeyInputs> {
        // Ensure we have a Capo (egg or chartered) for bundle access (REQT-3.6.6)
        await this.ensureEggForCacheKey();

        // Get pre-selected seed UTxO from actors snapshot (REQT-3.6.2)
        const seedUtxo = this.getPreSelectedSeedUtxo();

        const capoBundle = await this.capo.getBundle();
        const capoBundleClass = capoBundle.constructor as any;

        const bundles: BundleCacheKeyInputs[] = [{
            name: capoBundle.moduleName || capoBundle.constructor.name,
            sourceHash: capoBundle.computeSourceHash(), // Works without config! (REQT-3.6.3)
            params: { seedUtxo }, // Identity params only, NOT derived values like mph
        }];

        // Add delegate bundles using egg-compatible approach (REQT-3.6.2):
        // Get bundle classes directly from delegateRoles, not via getMintDelegate()/getSpendDelegate()
        // which require the charter to exist.
        const { delegateRoles } = this.capo;

        // Mint delegate bundle
        if (delegateRoles.mintDelegate) {
            const mintDelegateClass = delegateRoles.mintDelegate.delegateClass as any;
            const mintBundleClass = await mintDelegateClass.scriptBundleClass();
            const boundMintBundleClass = mintBundleClass.usingCapoBundleClass(capoBundleClass);
            const mintBundle = new boundMintBundleClass();
            bundles.push({
                name: mintBundle.moduleName || mintBundle.constructor.name,
                sourceHash: mintBundle.computeSourceHash(),
                params: {},
            });
        }

        // Spend delegate bundle
        if (delegateRoles.spendDelegate) {
            const spendDelegateClass = delegateRoles.spendDelegate.delegateClass as any;
            const spendBundleClass = await spendDelegateClass.scriptBundleClass();
            const boundSpendBundleClass = spendBundleClass.usingCapoBundleClass(capoBundleClass);
            const spendBundle = new boundSpendBundleClass();
            bundles.push({
                name: spendBundle.moduleName || spendBundle.constructor.name,
                sourceHash: spendBundle.computeSourceHash(),
                params: {},
            });
        }

        return {
            bundles,
            extra: {
                // heliosVersion is in genesis (actors) snapshot only - no need to repeat here
                // heliosVersion: HELIOS_VERSION,
            },
        };
    }

    /**
     * Resolves cache key inputs for all enabled delegates.
     * Used for snapshot cache key computation for the enabledDelegatesDeployed snapshot.
     * Includes dgData controllers (filtered by featureFlags) per REQT-1.2.3.2 and REQT-1.2.3.4.
     * Uses computeSourceHash() to work with egg Capo (REQT-3.6.2, REQT-3.6.3).
     * @public
     */
    async resolveEnabledDelegatesDependencies(): Promise<CacheKeyInputs> {
        const coreInputs = await this.resolveCoreCapoDependencies();
        const bundles = [...coreInputs.bundles];

        // Get Capo bundle class for binding delegate bundles (egg-compatible)
        const capoBundle = await this.capo.getBundle();
        const capoBundleClass = capoBundle.constructor as any;

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

                // Get bundle class directly from delegateClass (egg-compatible, REQT-3.6.2)
                // This avoids getDgDataController() which may require charter data
                const dgDelegateClass = delegateClass as any;
                const dgBundleClass = await dgDelegateClass.scriptBundleClass();
                const boundDgBundleClass = dgBundleClass.usingCapoBundleClass(capoBundleClass);
                const dgBundle = new boundDgBundleClass();
                bundles.push({
                    name: dgBundle.moduleName || dgBundle.constructor.name,
                    sourceHash: dgBundle.computeSourceHash(),
                    params: {},
                });
            }
        }

        return {
            bundles,
            extra: {
                // heliosVersion is in genesis (actors) snapshot only - no need to repeat here
                // ...coreInputs.extra,
                featureFlags: this.featureFlags || {},
            },
        };
    }
}
