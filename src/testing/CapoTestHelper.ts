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
 * Uses `this` binding - SnapWrap binds to helper instance at runtime.
 * @public
 */
export type ScriptDependencyResolver = (this: AnyCapoTestHelper) => Promise<CacheKeyInputs>;

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
            resolveScriptDependencies: async () => this.resolveActorsDependencies(),
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

                // Register snapshot with the cache (resolver bound to this helper instance)
                // The resolver uses `this` binding, so we bind it to the current helper instance
                const boundResolver = resolveScriptDependencies
                    ? resolveScriptDependencies.bind(this)
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
        }
        // Set the default actor so decorator's actor check passes
        await this.setDefaultActor();
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
        // Uses `this` binding - SnapWrap binds resolver to helper instance at runtime
        async resolveScriptDependencies() {
            // Ensure actors are set up so we can compute cache key
            if (this.actorSetupInfo.length === 0) {
                await this.setupActors();
                // DON'T tick here - let the decorator handle tick after builder
            }
            return this.resolveActorsDependencies();
        },
    })
    async snapToBootstrapWithActors(): Promise<void> {
        // Decorator calls bootstrapWithActors() and handles caching
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
     * Decorated wrapper for capoInitialized.
     * Uses @hasNamedSnapshot with internal: true since this is part of bootstrap() flow.
     * @public
     */
    @CapoTestHelper.hasNamedSnapshot(SNAP_CAPO_INIT, {
        actor: "default",
        parentSnapName: SNAP_ACTORS,
        internal: true, // Part of bootstrap flow - don't call reusableBootstrap()
        async resolveScriptDependencies() {
            return this.resolveCoreCapoDependencies();
        },
    })
    async snapToCapoInitialized(
        args?: Partial<MinimalCharterDataArgs>,
        options?: SubmitOptions,
    ): Promise<void> {
        // Decorator calls capoInitialized() and handles caching
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
        async resolveScriptDependencies() {
            return this.resolveEnabledDelegatesDependencies();
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
                bootstrapped: false,
                snapshots: {},
                namedRecords: {},
            };
        } else {
            // Ensure required properties exist even in custom/inherited helperState
            if (!this.helperState.snapshots) {
                this.helperState.snapshots = {};
            }
            if (!this.helperState.namedRecords) {
                this.helperState.namedRecords = {};
            }
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
    ): Promise<SC> {
        const startTime = performance.now();

        // Check registry to determine if this is a genesis (actors) snapshot
        const entry = this.snapshotCache["registry"].get(snapshotName);
        const isGenesisSnapshot = entry?.parentSnapName === "genesis";

        // First check in-memory snapshots
        if (this.helperState!.snapshots[snapshotName]) {
            if (isGenesisSnapshot) {
                const t0 = performance.now();
                // For genesis snapshots (actors), just restore network state
                // No capo exists yet, so we can't use restoreFrom()
                this.network.loadSnapshot(this.helperState!.snapshots[snapshotName]);

                // Restore actorSetupInfo from namedRecords if available
                const actorSetupInfoJson = this.helperState!.namedRecords?.["__actorSetupInfo__"];
                console.log(`  [DEBUG] in-memory genesis: actorSetupInfoJson=${actorSetupInfoJson ? "present" : "missing"}, actorSetupInfo.len=${this.actorSetupInfo.length}`);
                if (actorSetupInfoJson && this.actorSetupInfo.length === 0) {
                    this.actorSetupInfo = this.parseActorSetupInfo(actorSetupInfoJson);
                    console.log(`  [DEBUG] parsed actorSetupInfo: ${this.actorSetupInfo.length} actors`);
                }

                // Regenerate actors from PRNG using actorSetupInfo
                console.log(`  [DEBUG] pre-regenerate: actorSetupInfo.len=${this.actorSetupInfo.length}, actors=${Object.keys(this.actors).join(",")}`);
                if (this.actorSetupInfo.length > 0 && Object.keys(this.actors).length === 0) {
                    this.regenerateActorsFromSetupInfo();
                }
                console.log(`  [DEBUG] post-regenerate: actors=${Object.keys(this.actors).join(",")}`);

                // Set actor (might be "default" which calls setDefaultActor)
                if (actorName === "default") {
                    await this.setDefaultActor();
                } else if (this.actors[actorName]) {
                    await this.setActor(actorName);
                }
                const elapsed = (performance.now() - t0).toFixed(1);
                console.log(`  ⚡ in-memory hit (genesis) '${snapshotName}': ${elapsed}ms`);
                return this.strella; // May be undefined for actors, that's OK
            }
            // In-memory hit for non-genesis snapshot
            const t0 = performance.now();
            const capo = await this.restoreFrom(snapshotName);
            if (actorName === "default") {
                await this.setDefaultActor();
            } else {
                await this.setActor(actorName);
            }
            const elapsed = (performance.now() - t0).toFixed(1);
            console.log(`  ⚡ in-memory hit '${snapshotName}': ${elapsed}ms`);
            return capo;
        }

        // Try disk cache using registry-based API
        const diskStart = performance.now();
        const cached = await this.snapshotCache.find(snapshotName);
        if (cached) {
            // Restore from disk cache
            this.network.loadSnapshot(cached.snapshot);
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);
            this.helperState!.snapshots[snapshotName] = cached.snapshot;

            if (isGenesisSnapshot) {
                // Restore actorSetupInfo from namedRecords if available
                const actorSetupInfoJson = cached.namedRecords?.["__actorSetupInfo__"];
                if (actorSetupInfoJson && this.actorSetupInfo.length === 0) {
                    this.actorSetupInfo = this.parseActorSetupInfo(actorSetupInfoJson);
                }

                // Regenerate actors from PRNG using actorSetupInfo
                if (this.actorSetupInfo.length > 0 && Object.keys(this.actors).length === 0) {
                    this.regenerateActorsFromSetupInfo();
                }

                // Set actor
                if (actorName === "default") {
                    await this.setDefaultActor();
                } else if (this.actors[actorName]) {
                    await this.setActor(actorName);
                }
                const elapsed = (performance.now() - diskStart).toFixed(1);
                console.log(`  💾 disk cache hit (genesis) '${snapshotName}': ${elapsed}ms`);
                return this.strella; // May be undefined for actors, that's OK
            }

            // Disk cache hit for non-genesis snapshot
            if (actorName === "default") {
                await this.setDefaultActor();
            } else {
                await this.setActor(actorName);
            }
            const elapsed = (performance.now() - diskStart).toFixed(1);
            console.log(`  💾 disk cache hit '${snapshotName}': ${elapsed}ms`);
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
                this.snapshot(snapshotName);

                // Store to disk cache using registry-based API
                const snapshot = this.helperState!.snapshots[snapshotName];
                const entry = this.snapshotCache["registry"].get(snapshotName);
                const parentSnapName = entry?.parentSnapName || "genesis";
                const parentSnapshot = parentSnapName !== "genesis"
                    ? this.helperState!.snapshots[parentSnapName]
                    : null;
                const parentHash = parentSnapshot?.blockHashes?.slice(-1)[0] || null;

                // For genesis snapshots, store actorSetupInfo for regeneration on cache load
                // Defensive check: namedRecords should be guaranteed by ensureHelperState()
                if (!this.helperState!.namedRecords) {
                    throw new Error(
                        `findOrCreateSnapshot('${snapshotName}'): helperState.namedRecords is undefined. ` +
                        `This should not happen - ensureHelperState() should have initialized it.`
                    );
                }
                const namedRecords = { ...this.helperState!.namedRecords };
                if (parentSnapName === "genesis" && this.actorSetupInfo.length > 0) {
                    // Use replacer to handle BigInt serialization
                    const bigIntReplacer = (_key: string, value: unknown) =>
                        typeof value === "bigint" ? value.toString() : value;
                    const actorSetupJson = JSON.stringify(this.actorSetupInfo, bigIntReplacer);
                    namedRecords["__actorSetupInfo__"] = actorSetupJson;
                    // Also store in helperState for in-memory cache
                    this.helperState!.namedRecords["__actorSetupInfo__"] = actorSetupJson;
                }

                const cachedSnapshot: CachedSnapshot = {
                    snapshot,
                    namedRecords,
                    parentSnapName,
                    parentHash,
                    parentCacheKey: null, // deprecated with hierarchical directories
                    snapshotHash: this.network.lastBlockHash,
                };

                await this.snapshotCache.store(snapshotName, cachedSnapshot);
                const storeElapsed = (performance.now() - storeStart).toFixed(1);
                console.log(`  💾 stored '${snapshotName}' to disk: ${storeElapsed}ms`);
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

        // Mint charter token and create capoInitialized snapshot (handles caching)
        await this.snapToCapoInitialized(args, options);

        // Deploy delegates and create enabledDelegatesDeployed snapshot (handles caching)
        await this.snapToEnabledDelegatesDeployed(args, options);

        return strella;
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
     * Parses actor setup info from JSON, converting BigInt strings back to BigInt.
     * @internal
     */
    private parseActorSetupInfo(json: string): ActorSetupInfo[] {
        const parsed = JSON.parse(json) as Array<{
            name: string;
            initialBalance: string;
            additionalUtxos: string[];
        }>;
        return parsed.map((actor) => ({
            name: actor.name,
            initialBalance: BigInt(actor.initialBalance),
            additionalUtxos: actor.additionalUtxos.map((u) => BigInt(u)),
        }));
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
