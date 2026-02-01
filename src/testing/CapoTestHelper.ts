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
} from "@donecollectively/stellar-contracts";
import { SnapshotCache, type CacheKeyInputs, type CachedSnapshot } from "./emulator/SnapshotCache.js";
import type { BundleCacheKeyInputs } from "../helios/scriptBundling/HeliosScriptBundle.js";
import type { NetworkSnapshot } from "./emulator/StellarNetworkEmulator.js";

import { StellarTestHelper } from "./StellarTestHelper.js";
import { canHaveRandomSeed, TestHelperState } from "./types.js";

const ACTORS_ALREADY_MOVED =
    "NONE! all actors were moved from a different network via snapshot";

export const SNAP_ACTORS = "actors";
export const SNAP_CAPO_INIT = "capoInitialized";
export const SNAP_DELEGATES = "enabledDelegatesDeployed";
// Legacy names for compatibility
export const SNAP_INIT = "initialized";
export const SNAP_BOOTSTRAP = "bootstrapped";

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
    resolveScriptDependencies?: ScriptDependencyResolver;
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
            await this.setupActorsWithCache();
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
        snap = SNAP_BOOTSTRAP,
        // override = false
    ) {
        let capo;
        const helperState = this.helperState!;
        if (helperState.bootstrapped) {
            // debugger
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
        if (!previousHelper) {
            this.snapshot(SNAP_BOOTSTRAP);
        } else {
            console.log(
                `changing helper from network ${previousHelper.network.id} to ${this.network.id}`,
            );
        }
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
        const { actor: actorName, resolveScriptDependencies } = opts;

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
                await this.reusableBootstrap();

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
     * Sets up actors with disk cache support.
     * If a cached actors snapshot exists, restores from it.
     * Otherwise, creates actors and caches the snapshot.
     * @internal
     */
    async setupActorsWithCache(): Promise<void> {
        console.log("  -- 🎭🎭🎭 actor setup...");

        // Always run setupActors to populate actorSetupInfo
        await this.setupActors();
        this.network.tick(1);

        // Compute cache key based on actor setup info
        const cacheKeyInputs = this.resolveActorsDependencies();
        const cacheKey = this.snapshotCache.computeKey(null, cacheKeyInputs);

        // Check disk cache
        const cached = await this.snapshotCache.find(cacheKey);
        if (cached) {
            console.log(`  -- 🎭 actors snapshot cache HIT (key: ${cacheKey.slice(0, 8)}...)`);
            // Restore network state from cache
            this.network.loadSnapshot(cached.snapshot);
            this.helperState!.snapshots[SNAP_ACTORS] = cached.snapshot;
        } else {
            console.log(`  -- 🎭 actors snapshot cache MISS (key: ${cacheKey.slice(0, 8)}...)`);
            // Create and save snapshot
            const snapshot = this.network.snapshot(SNAP_ACTORS);
            this.helperState!.snapshots[SNAP_ACTORS] = snapshot;

            const cachedSnapshot: CachedSnapshot = {
                snapshot,
                namedRecords: {},
                parentName: null,
                parentHash: null,
                snapshotHash: this.network.lastBlockHash,
            };
            await this.snapshotCache.store(cacheKey, cachedSnapshot);
        }

        await this.setDefaultActor();
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

        // If we have a dependency resolver, try the disk cache
        if (resolveScriptDependencies) {
            const cacheKeyInputs = await resolveScriptDependencies(this);
            const parentHash = this.network.lastBlockHash;
            const cacheKey = this.snapshotCache.computeKey(parentHash, cacheKeyInputs);

            const cached = await this.snapshotCache.find(cacheKey);
            if (cached) {
                console.log(`SnapshotCache: hit for ${snapshotName} (key: ${cacheKey.slice(0, 8)}...)`);
                // Restore from disk cache
                this.network.loadSnapshot(cached.snapshot);
                Object.assign(this.helperState!.namedRecords, cached.namedRecords);
                this.helperState!.snapshots[snapshotName] = cached.snapshot;
                await this.setActor(actorName);
                return this.strella;
            }
            console.log(`SnapshotCache: miss for ${snapshotName} (key: ${cacheKey.slice(0, 8)}...)`);
        }

        // Build the snapshot
        let result;
        try {
            result = await contentBuilder();
            return this.strella;
        } catch (e) {
            throw e;
        } finally {
            if (result) {
                this.snapshot(snapshotName);

                // Store to disk cache if we have a dependency resolver
                if (resolveScriptDependencies) {
                    const cacheKeyInputs = await resolveScriptDependencies(this);
                    const parentHash = this.helperState!.snapshots[SNAP_DELEGATES]?.blockHashes?.slice(-1)[0]
                        || this.helperState!.snapshots[SNAP_BOOTSTRAP]?.blockHashes?.slice(-1)[0]
                        || "genesis";
                    const parentName = this.helperState!.snapshots[SNAP_DELEGATES] ? SNAP_DELEGATES : SNAP_BOOTSTRAP;
                    const cacheKey = this.snapshotCache.computeKey(parentHash, cacheKeyInputs);
                    const snapshot = this.helperState!.snapshots[snapshotName];

                    const cachedSnapshot: CachedSnapshot = {
                        snapshot,
                        namedRecords: { ...this.helperState!.namedRecords },
                        parentName,
                        parentHash,
                        snapshotHash: this.network.lastBlockHash,
                    };

                    await this.snapshotCache.store(cacheKey, cachedSnapshot);
                }
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

        const parentHash = actorsSnapshot.blockHashes?.slice(-1)[0] || "genesis";
        const cacheKeyInputs = await this.resolveCoreCapoDependencies();
        const cacheKey = this.snapshotCache.computeKey(parentHash, cacheKeyInputs);

        const cached = await this.snapshotCache.find(cacheKey);
        if (cached) {
            console.log(`  -- ⚗️ capoInitialized snapshot cache HIT (key: ${cacheKey.slice(0, 8)}...)`);
            this.network.loadSnapshot(cached.snapshot);
            this.helperState!.snapshots[SNAP_CAPO_INIT] = cached.snapshot;
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);
            return true;
        }

        console.log(`  -- ⚗️ capoInitialized snapshot cache MISS (key: ${cacheKey.slice(0, 8)}...)`);
        return false;
    }

    /**
     * Saves capoInitialized snapshot to disk cache.
     * @internal
     */
    private async saveCapoInitializedSnapshot(): Promise<void> {
        const actorsSnapshot = this.helperState!.snapshots[SNAP_ACTORS];
        const parentHash = actorsSnapshot?.blockHashes?.slice(-1)[0] || "genesis";
        const cacheKeyInputs = await this.resolveCoreCapoDependencies();
        const cacheKey = this.snapshotCache.computeKey(parentHash, cacheKeyInputs);

        const snapshot = this.network.snapshot(SNAP_CAPO_INIT);
        this.helperState!.snapshots[SNAP_CAPO_INIT] = snapshot;

        const cachedSnapshot: CachedSnapshot = {
            snapshot,
            namedRecords: { ...this.helperState!.namedRecords },
            parentName: SNAP_ACTORS,
            parentHash,
            snapshotHash: this.network.lastBlockHash,
        };
        await this.snapshotCache.store(cacheKey, cachedSnapshot);
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

        const parentHash = capoInitSnapshot.blockHashes?.slice(-1)[0] || "genesis";
        const cacheKeyInputs = await this.resolveEnabledDelegatesDependencies();
        const cacheKey = this.snapshotCache.computeKey(parentHash, cacheKeyInputs);

        const cached = await this.snapshotCache.find(cacheKey);
        if (cached) {
            console.log(`  -- 🔧 enabledDelegatesDeployed snapshot cache HIT (key: ${cacheKey.slice(0, 8)}...)`);
            this.network.loadSnapshot(cached.snapshot);
            this.helperState!.snapshots[SNAP_DELEGATES] = cached.snapshot;
            Object.assign(this.helperState!.namedRecords, cached.namedRecords);
            return true;
        }

        console.log(`  -- 🔧 enabledDelegatesDeployed snapshot cache MISS (key: ${cacheKey.slice(0, 8)}...)`);
        return false;
    }

    /**
     * Saves enabledDelegatesDeployed snapshot to disk cache.
     * @internal
     */
    private async saveDelegatesDeployedSnapshot(): Promise<void> {
        const capoInitSnapshot = this.helperState!.snapshots[SNAP_CAPO_INIT];
        const parentHash = capoInitSnapshot?.blockHashes?.slice(-1)[0] || "genesis";
        const cacheKeyInputs = await this.resolveEnabledDelegatesDependencies();
        const cacheKey = this.snapshotCache.computeKey(parentHash, cacheKeyInputs);

        const snapshot = this.network.snapshot(SNAP_DELEGATES);
        this.helperState!.snapshots[SNAP_DELEGATES] = snapshot;

        const cachedSnapshot: CachedSnapshot = {
            snapshot,
            namedRecords: { ...this.helperState!.namedRecords },
            parentName: SNAP_CAPO_INIT,
            parentHash,
            snapshotHash: this.network.lastBlockHash,
        };
        await this.snapshotCache.store(cacheKey, cachedSnapshot);
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
     * @public
     */
    async resolveEnabledDelegatesDependencies(): Promise<CacheKeyInputs> {
        const coreInputs = await this.resolveCoreCapoDependencies();
        const bundles = [...coreInputs.bundles];

        // Add bundles for named delegates
        try {
            const namedDelegates = await this.capo.getNamedDelegates();
            for (const delegate of Object.values(namedDelegates)) {
                try {
                    const bundle = await delegate.getBundle();
                    bundles.push(bundle.getCacheKeyInputs());
                } catch (e) {
                    console.warn(`CapoTestHelper: skipping delegate for cache key: ${e}`);
                }
            }
        } catch (e) {
            // No named delegates available
        }

        return {
            bundles,
            extra: coreInputs.extra,
        };
    }
}
