import {
    DEFAULT_NETWORK_PARAMS,
    type Address,
    type NetworkParams,
    type NetworkParamsHelper,
    type Tx,
    type TxId,
    makeAssets,
    type ShelleyAddress,
    type TxBody,
} from "@helios-lang/ledger";
import { generateBytes, mulberry32 } from "@helios-lang/crypto";

import {
    SimpleWallet_stellar as emulatedWallet,
    SimpleWallet_stellar,
    StellarNetworkEmulator,
} from "./emulator/StellarNetworkEmulator.js";

import {
    StellarContract,
    dumpAny,
    lovelaceToAda,
    txAsString,
    UtxoHelper,
    TxBatcher,
    GenericSigner,
    environment,
} from "@donecollectively/stellar-contracts";
import type {
    stellarSubclass,
    ConfigFor,
    StellarSetupDetails,
    ActorContext,
    NetworkContext,
    SetupInfo,
    StellarTxnContext,
    SubmitOptions,
} from "@donecollectively/stellar-contracts";

import { ADA } from "./types.js";

/**
 * Records the setup info for an actor, used for snapshot cache key computation.
 * @public
 */
export type ActorSetupInfo = {
    name: string;
    initialBalance: bigint;
    additionalUtxos: bigint[];
};

/**
 * Stored wallet keys for fast actor restoration. REQT/n93h9y5s85
 * @public
 */
export type StoredActorWalletKeys = {
    /** Hex-encoded spending private key bytes */
    spendingKey: string;
    /** Hex-encoded staking private key bytes (optional) */
    stakingKey?: string;
};

/**
 * Map of actor names to stored wallet keys for offchainData.
 * @public
 */
export type ActorWalletsOffchainData = {
    actorWallets: Record<string, StoredActorWalletKeys>;
};
import type {
    TestHelperState,
    actorMap,
    canHaveRandomSeed,
    canSkipSetup,
} from "./types.js";
import { makeRootPrivateKey, makeBip32PrivateKey, type Wallet } from "@helios-lang/tx-utils";
import { bytesToHex, hexToBytes } from "@helios-lang/codec-utils";

/**
 * @public
 */
export const expectTxnError = {
    expectError: true as const,
} as Partial<SubmitOptions>;

/**
 * @public
 */
export type TestHelperSubmitOptions = SubmitOptions & {
    futureDate?: Date;
};

/**
 * Base class for test-helpers on generic Stellar contracts
 * @remarks
 *
 * NOTE: DefaultCapoTestHelper is likely to be a better fit for typical testing needs and typical contract-development scenarios.
 * Use this class for specific unit-testing needs not sufficiently served by integration-testing on a Capo.
 * @public
 **/
export abstract class StellarTestHelper<
    SC extends StellarContract<any>,
    SpecialState extends Record<string, any> = {},
> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC>;
    config?: ConfigFor<SC> & canHaveRandomSeed;
    defaultActor?: string;
    strella!: SC;
    actors: actorMap;
    /** Records actor setup info for cache key computation */
    actorSetupInfo: ActorSetupInfo[] = [];
    optimize = false;
    netPHelper: NetworkParamsHelper;
    networkCtx: NetworkContext<StellarNetworkEmulator>;
    protected _actorName!: string;

    /**
     * @public
     */
    get actorName() {
        return this._actorName;
    }

    /**
     * @public
     */
    get network() {
        return this.networkCtx.network;
    }

    /**
     * Gets the current actor wallet
     *
     * @public
     **/
    get wallet(): emulatedWallet {
        const wallet: emulatedWallet | undefined = this.actorContext.wallet;
        if (!wallet) {
            throw new Error(`no current actor; use setActor(actorName) first`);
        }
        return wallet as emulatedWallet;
    }

    /**
     * Shared actorContext envelope - singleton across all helpers via helperState (REQT/ch01gxgm4g).
     * All helpers and the Capo share this same object so setActor() updates are visible everywhere.
     * Update contents (actorContext.wallet, actorContext.others) - never replace the envelope.
     * @public
     */
    get actorContext(): ActorContext<emulatedWallet> {
        return this.helperState.actorContext as ActorContext<emulatedWallet>;
    }
    set actorContext(_value: ActorContext<emulatedWallet>) {
        throw new Error(
            "actorContext is a shared singleton envelope (REQT/ch01gxgm4g). " +
            "Update its contents (actorContext.wallet, actorContext.others) instead of replacing it."
        );
    }

    /**
     * @public
     */
    async setActor(actorName: string) {
        const thisActor = this.actors[actorName];
        if (!thisActor)
            throw new Error(
                `setCurrentActor: network #${this.network.id}: invalid actor name '${actorName}'\n   ... try one of: \n  - ` +
                    Object.keys(this.actors).join(",\n  - "),
            );
        if (this._actorName) {
            if (actorName == this._actorName) {
                if (this.actorContext.wallet !== thisActor) {
                    throw new Error(
                        `actor / wallet mismatch: ${this._actorName} ${dumpAny(
                            this.actorContext.wallet?.address,
                        )} vs ${actorName} ${dumpAny(thisActor.address)}`,
                    );
                }
                // quiet idempotent call.
                return;
            }
            console.log(
                `\n🎭 -> 🎭 changing actor from 🎭 ${
                    this._actorName
                } to  🎭 ${actorName} ${dumpAny(thisActor.address)}`,
            );
        } else {
            console.log(
                `\n🎭🎭 initial actor ${actorName} ${dumpAny(
                    thisActor.address,
                )}`,
            );
        }
        this._actorName = actorName;
        this.actorContext.wallet = thisActor;

        // if (this.strella) {
        //     this.strella = await this.initStellarClass(
        //         this.state.parsedConfig || this.config
        //     );
        // }
    }

    address?: Address;

    setupPending?: Promise<any>;
    /**
     * @public
     */
    async setupActors() {
        console.warn(
            `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`,
        );
        this.addActor("hiro", 1863n * ADA);
    }
    /**
     * @public
     */
    setDefaultActor() {
        return this.setActor("hiro");
    }

    /**
     * Helper state for named records and bootstrap tracking.
     * Always initialized from the class's static defaultHelperState.
     */
    helperState: TestHelperState<SC, SpecialState>;

    /**
     * Default helperState shared across all instances of this helper class.
     * Subclasses can override this to provide custom default state.
     * @public
     */
    static defaultHelperState: TestHelperState<any, any> = {
        namedRecords: {},
        actorContext: { others: {}, wallet: undefined },
    } as any;

    constructor(
        config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup,
        helperState?: TestHelperState<SC, SpecialState>,
    ) {
        this.state = {};
        // Use class-level default helperState if none provided
        this.helperState = helperState ??
            (this.constructor as typeof StellarTestHelper).defaultHelperState;
        // Ensure critical fields exist (test files commonly use `as any` casts
        // that omit required fields like actorContext)
        if (!this.helperState.actorContext) {
            this.helperState.actorContext = { others: {}, wallet: undefined };
        }
        if (!this.helperState.namedRecords) {
            this.helperState.namedRecords = {};
        }
        const cfg = config || {};
        if (Object.keys(cfg).length) {
            console.log(
                "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
                config,
            );

            this.config = config;
        }

        this.randomSeed = config?.randomSeed || 42;

        const t = this.mkNetwork(this.fixupParams(DEFAULT_NETWORK_PARAMS()));
        const theNetwork: StellarNetworkEmulator = t[0];
        const netParamsHelper: NetworkParamsHelper = t[1];

        this.netPHelper = netParamsHelper;
        this.networkCtx = {
            network: theNetwork,
        };
        this.actors = {};
        this.actorSetupInfo = [];
        const now = new Date();
        this.waitUntil(now);

        console.log(" + StellarTestHelper");
        //xx@ts-expect-error - can serve no-params case or params case
        // this.setupPending = this.initialize();
    }

    /**
     * Adjusts network params for test environment flexibility.
     * Implements REQT/6rdjgebzyx (Network Parameter Fixups).
     * @public
     */
    fixupParams(preProdParams: NetworkParams): NetworkParams {
        //@ts-expect-error on our synthetic property
        if (preProdParams.isFixedUp) return preProdParams;

        // When OPTIMIZE=1, compiled scripts are much smaller and cheaper —
        // the generous fixups for unoptimized scripts aren't needed.
        if (environment.OPTIMIZE) {
            console.log("test env: ⚡ OPTIMIZE=1 — skipping network param fixups (optimized scripts fit within standard limits)");
            //@ts-expect-error on our synthetic property
            preProdParams.isFixedUp = true;
            return preProdParams;
        }

        // REQT/pejg3twvpv (Increased maxTxSize)
        const origMaxTxSize = preProdParams.maxTxSize;
        //@ts-expect-error on our synthetic property
        preProdParams.origMaxTxSize = origMaxTxSize;
        const maxTxSize = Math.floor(origMaxTxSize * 6.5);
        console.log(
            "test env: 🔧🔧🔧 fixup max tx size",
            origMaxTxSize,
            " -> 🔧",
            maxTxSize,
        );
        preProdParams.maxTxSize = maxTxSize;

        // REQT/qq84z25jk7 (Increased maxTxExMem)
        const origMaxMem = preProdParams.maxTxExMem;
        //@ts-expect-error on our synthetic property
        preProdParams.origMaxTxExMem = origMaxMem;
        const maxMem = Math.floor(origMaxMem * 9);
        console.log(
            "test env: 🔧🔧🔧 fixup max memory",
            origMaxMem,
            " -> 🔧",
            maxMem,
        );
        preProdParams.maxTxExMem = maxMem;

        // REQT/3286vdzwyk (Increased maxTxExCpu)
        const origMaxCpu = preProdParams.maxTxExCpu;
        //@ts-expect-error on our synthetic property
        preProdParams.origMaxTxExCpu = origMaxCpu;
        const maxCpu = Math.floor(origMaxCpu * 3.4);
        console.log(
            "test env: 🔧🔧🔧 fixup max cpu",
            origMaxCpu,
            " -> 🔧",
            maxCpu,
        );
        preProdParams.maxTxExCpu = maxCpu;

        // REQT/8ahvzanppd (Decreased refScriptsFeePerByte)
        const origRefScriptsFeePerByte = preProdParams.refScriptsFeePerByte;
        //@ts-expect-error on our synthetic property
        preProdParams.origRefScriptsFeePerByte = origRefScriptsFeePerByte;
        const refScriptsFeePerByte = Math.floor(origRefScriptsFeePerByte / 4);
        console.log(
            "test env: 🔧🔧🔧 fixup refScripts fee per byte",
            origRefScriptsFeePerByte,
            " -> 🔧",
            refScriptsFeePerByte,
        );
        preProdParams.refScriptsFeePerByte = refScriptsFeePerByte;

        //@ts-expect-error on our synthetic property
        preProdParams.isFixedUp = true;
        return preProdParams;
    }

    /**
     * Submits a transaction and advances the network block
     * @public
     * @param TCX - The type of transaction context state, must extend anyState
     */
    async submitTxnWithBlock<TCX extends StellarTxnContext>(
        tcx: TCX | Promise<TCX>,
        options: TestHelperSubmitOptions = {},
    ): Promise<TCX> {
        const t = await tcx;
        await this.advanceNetworkTimeForTx(t, options.futureDate);

        return t.buildAndQueueAll(options).then(() => {
            this.network.tick(1);
            if (options.expectError) {
                throw new Error(
                    "txn ^^^ should have failed but it succeeded instead",
                );
            }
            return tcx;
        });
    }

    /**
     * @public
     */
    async advanceNetworkTimeForTx(tcx: StellarTxnContext, futureDate?: Date) {
        // determines the validity range of the transaction

        let txBody: TxBody | undefined = undefined;
        let validFrom = 0,
            validTo = 0;
        let targetTime: number = futureDate?.getTime() || Date.now();
        let targetSlot = this.netPHelper.timeToSlot(BigInt(targetTime));
        const nph = this.netPHelper;

        if (tcx.isFacade && !futureDate) {
            console.log("not advancing network time for facade tx");
            return;
        } else if (!tcx.isFacade) {
            //XX@ts-expect-error on internal prop
            // if (!tcx.txb.validTo) {
            //     debugger
            //     // just to verify what it looks like
            //     tcx.txb.validFromSlot(targetSlot)
            //     tcx.txb.validToTime(Date.now())
            //     debugger
            // }

            validFrom = (() => {
                //@ts-expect-error on internal prop
                const { slot, timestamp } = tcx.txb.validFrom?.left || {};
                if (slot) return slot;
                if (!timestamp) return undefined;
                return nph.timeToSlot(BigInt(timestamp));
            })();
            validTo = (() => {
                //@ts-expect-error on internal prop
                const { slot, timestamp } = tcx.txb.validFrom?.left || {};
                if (slot) return slot;
                if (!timestamp) return undefined;
                return nph.timeToSlot(BigInt(timestamp));
            })();
        }

        const currentSlot = this.network.currentSlot;
        const nowSlot = nph.timeToSlot(BigInt(Date.now()));
        const slotDiff = targetSlot - currentSlot;

        const validInPast = validTo && nowSlot > validTo;
        const validInFuture = validFrom && nowSlot < validFrom;
        tcx.logger.logPrint(
            `\n    ---- ⚗️ 🐞🐞 advanceNetworkTimeForTx: tx valid ${
                validFrom || "anytime"
            } -> ${validTo || "anytime"}`,
        );
        function withPositiveSign(x: number | bigint) {
            return x < 0 ? `${x}` : `+${x}`;
        }
        const currentToNowDiff = withPositiveSign(nowSlot - currentSlot);
        const currentToTargetDiff = withPositiveSign(slotDiff);
        let effectiveNetworkSlot = targetSlot;
        function showEffectiveNetworkSlotTIme() {
            tcx.logger.logPrint(
                `\n    ⚗️ 🐞ℹ️  with now=network slot ${effectiveNetworkSlot}: ${nph.slotToTime(
                    effectiveNetworkSlot,
                )}\n` +
                    `           tx valid ${
                        validFrom
                            ? withPositiveSign(effectiveNetworkSlot - validFrom)
                            : "anytime"
                    } -> ${
                        validTo
                            ? withPositiveSign(effectiveNetworkSlot - validTo)
                            : "anytime"
                    } from now`,
            );
        }

        if (validInPast || validInFuture) {
            tcx.logger.logPrint(
                "\n  ⚗️ 🐞ℹ️  advanceNetworkTimeForTx: " + (tcx.txnName || ""),
            );
            if (futureDate) {
                debugger;
                tcx.logger.logPrint(
                    `\n    ---- ⚗️ 🐞🐞 explicit futureDate ${futureDate.toISOString()} -> slot ${targetSlot}`,
                );
            }

            tcx.logger.logPrint(
                `\n    ---- ⚗️ 🐞🐞 current slot ${currentSlot} ${currentToNowDiff} = now slot ${nowSlot} \n` +
                    `                    current ${currentToTargetDiff} = targetSlot ${targetSlot}`,
            );
            if (futureDate) {
                // ":info:ℹ️"
                // ":test: ⚗️"
                // ":debug: 🐞 "
                // info emoji with i in a blue square: "ℹ️"
                tcx.logger.logPrint(
                    `\n    ---- ⚗️ 🐞ℹ️  txnTime ${
                        validInPast
                            ? "already in the past"
                            : validInFuture
                              ? "not yet valid"
                              : "‹??incontheevable??›"
                    }; advancing to explicit futureDate @now + ${
                        targetSlot - nowSlot
                    }s`,
                );
            } else {
                // test an old txn by constructing it with a date less than Date.now()
                tcx.logger.logPrint(
                    `\n    -- ⚗️ 🐞 txnTime ${
                        validInPast
                            ? "already in the past"
                            : validInFuture
                              ? "not yet valid"
                              : "‹??incontheevable??›"
                    }; no futureDate specified; not interfering with network time`,
                );
                effectiveNetworkSlot = nowSlot;
                showEffectiveNetworkSlotTIme();
                tcx.logger.flush();

                return;
            }
        }

        if (slotDiff < 0) {
            effectiveNetworkSlot = nowSlot;
            showEffectiveNetworkSlotTIme();
            if (futureDate) {
                tcx.logger.logPrint(
                    `\n    ------ ⚗️ 🐞🐞🐞🐞🐞🐞🐞🐞can't go back in time ${slotDiff}s (current slot ${this.network.currentSlot}, target ${targetSlot})`,
                );
                throw new Error(
                    `explicit futureDate ${futureDate} is in the past; can't go back ${slotDiff}s`,
                );
            }
            tcx.logger.logPrint(
                `\n   -- ⚗️ 🐞🐞🐞🐞⚗️  NOT ADVANCING: the network is already ahead of the current time by ${
                    0 - slotDiff
                }s ⚗️ 🐞🐞🐞🐞⚗️`,
            );
            tcx.logger.flush();
            return;
        }
        if (this.network.currentSlot < targetSlot) {
            effectiveNetworkSlot = targetSlot;
            tcx.logger.logPrint(
                `\n    ⚗️ 🐞ℹ️  advanceNetworkTimeForTx ${withPositiveSign(
                    slotDiff,
                )} slots`,
            );
            showEffectiveNetworkSlotTIme();
            this.network.tick(slotDiff);
        } else {
            effectiveNetworkSlot = currentSlot;
            showEffectiveNetworkSlotTIme();
        }
        tcx.logger.flush();
    }

    /**
     * @public
     */
    async initialize({
        randomSeed = 42,
    }: { randomSeed?: number } = {}): Promise<SC> {
        console.log("STINIT");
        debugger;

        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate initialize() in test helper",
            );
            return this.strella;
        }
        if (this.strella) {
            console.warn(
                ".... warning: new test helper setup with new seed....",
            );
            this.rand = undefined;
            this.randomSeed = randomSeed;
            this.actors = {};
            this.actorSetupInfo = [];
        } else {
            console.log(
                "???????????????????????? Test helper initializing without this.strella",
            );
        }
        console.log("STINIT2");
        await this.delay(1);
        this._actorName = ""; //only to make typescript happy
        if (!Object.keys(this.actors).length) {
            const actorSetup = this.setupActors();
            await actorSetup;
            this.setDefaultActor();
        }
        console.log("STINIT3");

        return this.initStellarClass();
    }

    /**
     * @public
     */
    async initStellarClass(config = this.config) {
        const TargetClass = this.stellarClass;

        const strella = await this.initStrella(TargetClass, config);

        this.strella = strella;
        this.address = strella.address;
        return strella;
    }

    //!!! reconnect tests to tcx-based config-capture
    // onInstanceCreated: async (config: ConfigFor<SC>) => {
    //     this.config = config
    //     return {
    //         evidence: this,
    //         id: "empheral",
    //         scope: "unit test"
    //     }
    // }

    setup!: SetupInfo;
    initSetup(setup: SetupInfo = undefined as any) {
        setup =
            setup ||
            ({
                actorContext: this.actorContext,
                networkParams: this.networkParams,
                uh: undefined as any,
                isTest: true,
                isMainnet: false,
                optimize: process.env.OPTIMIZE ? true : this.optimize,
            } as any);

        const getNetwork = () => {
            return this.network;
        };
        const getActor = () => {
            return this.actorContext.wallet!;
        };

        Object.defineProperty(setup, "network", {
            get: getNetwork,
            configurable: true,
        });
        ((setup.txBatcher = new TxBatcher({
            setup,
            submitters: {
                get emulator() {
                    return getNetwork();
                },
            },
            get signingStrategy() {
                return new GenericSigner(getActor());
            },
        })),
            (setup.txBatcher.setup = setup));
        setup.uh = new UtxoHelper(setup);

        return (this.setup = setup);
    }

    /**
     * @public
     */
    async initStrella(
        TargetClass: stellarSubclass<SC>,
        config?: ConfigFor<SC>,
    ) {
        const envOptimize = process.env.OPTIMIZE;
        // console.warn(`using env OPTIMIZE=${envOptimize}`)

        const setup = this.initSetup();

        let cfg: StellarSetupDetails<ConfigFor<SC>> = {
            setup,
            config: config!,
        };

        if (!config)
            cfg = {
                setup,
                partialConfig: {},
            };
        if (setup.actorContext.wallet) {
            console.log(
                "+strella init with actor addr",
                (setup.actorContext.wallet as any).address.toBech32(),
            );
        } else {
            debugger;
            console.log("+strella init without actor");
        }
        return TargetClass.createWith(cfg);
    }

    //! it has a seed for mkRandomBytes, which must be set by caller
    randomSeed?: number;
    //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
    rand?: () => number;

    /**
     * @public
     */
    delay(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     * @public
     */
    createWallet(lovelace = 0n, assets = makeAssets([])): emulatedWallet {
        const wallet = emulatedWallet.fromRootPrivateKey(
            makeRootPrivateKey(generateBytes(this.network.mulberry32, 32)),
            this.networkCtx,
        );

        this.network.createUtxo(wallet, lovelace, assets);

        return wallet;
    }

    /**
     * Extracts wallet private keys from current actors for storage in offchainData.
     * Returns data suitable for storing in CachedSnapshot.offchainData. REQT/1p346cabct
     * @public
     */
    getActorWalletKeys(): ActorWalletsOffchainData {
        const actorWallets: Record<string, StoredActorWalletKeys> = {};

        for (const [name, wallet] of Object.entries(this.actors)) {
            const w = wallet as emulatedWallet;
            actorWallets[name] = {
                spendingKey: bytesToHex(w.spendingPrivateKey.bytes),
                stakingKey: w.stakingPrivateKey ? bytesToHex(w.stakingPrivateKey.bytes) : undefined,
            };
        }

        return { actorWallets };
    }

    /**
     * Restores actor wallets from stored private keys (fast path).
     * Replaces PRNG-based regeneration. REQT/avwkcrnwqp, REQT/ncbfwtyr8h
     * @param storedData - The offchainData containing actorWallets
     * @internal
     */
    restoreActorsFromStoredKeys(storedData: ActorWalletsOffchainData): void {
        // Skip if actors already exist
        if (Object.keys(this.actors).length > 0) {
            console.log(`  -- Skipping actor restoration: actors already exist (${Object.keys(this.actors).length})`);
            return;
        }

        const { actorWallets } = storedData;
        if (!actorWallets || Object.keys(actorWallets).length === 0) {
            console.log(`  -- No stored actor wallets to restore`);
            return;
        }

        console.log(`  -- Restoring ${Object.keys(actorWallets).length} actors from stored keys...`);

        for (const [name, keys] of Object.entries(actorWallets)) {
            const spendingKey = makeBip32PrivateKey(hexToBytes(keys.spendingKey));
            const stakingKey = keys.stakingKey
                ? makeBip32PrivateKey(hexToBytes(keys.stakingKey))
                : undefined;

            const wallet = new emulatedWallet(this.networkCtx, spendingKey, stakingKey);

            this.actors[name] = wallet;
            this.actorContext.others[name] = wallet;
            console.log(`    + Restored actor: ${name}`);
        }
    }

    /**
     * @public
     */
    async submitTx(tx: Tx, force?: "force"): Promise<TxId> {
        const sendChangeToCurrentActor = this.wallet?.address;
        const isAlreadyInitialized = !!this.strella;
        // try {
        //     await tx.finalize(this.networkParams, sendChangeToCurrentActor);
        // } catch (e: any) {
        //     throw new Error(
        //         e.message +
        //             "\nin tx: " +
        //             txAsString(tx, this.networkParams) +
        //             // "\nprofile: " +
        //             // tx.profileReport
        //     );
        // }
        if (isAlreadyInitialized && !force) {
            throw new Error(
                `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`,
            );
        }

        console.log(
            `Test helper ${force || ""} submitting tx${
                (force && "") || " prior to instantiateWithParams()"
            }:\n` + txAsString(tx, this.networkParams),
            // new Error(`at stack`).stack
        );

        try {
            const txId = await this.network.submitTx(tx);
            console.log(
                "test helper submitted direct txn:" +
                    txAsString(tx, this.networkParams),
            );
            this.network.tick(1);
            // await this.delay(1000)
            // debugger
            // this.network.dump();
            return txId;
        } catch (e: any) {
            console.error(
                `submit failed: ${e.message}\n  ... in tx ${txAsString(tx)}`,
            );
            throw e;
        }
    }

    /**
     * @public
     */
    mkRandomBytes(length: number): number[] {
        if (!this.randomSeed)
            throw new Error(
                `test must set context.randomSeed for deterministic randomness in tests`,
            );
        if (!this.rand) this.rand = mulberry32(this.randomSeed);

        const bytes: number[] = [];
        for (let i = 0; i < length; i++) {
            bytes.push(Math.floor(this.rand() * 256));
        }
        return bytes;
    }

    /**
     * creates a new Actor in the transaction context with initial funds, returning a Wallet object
     * @remarks
     *
     * Given an actor name ("marcie") or role name ("marketer"), and a number
     * of indicated lovelace, creates and returns a wallet having the indicated starting balance.
     *
     * By default, three additional, separate 5-ADA utxos are created, to ensure sufficient Collateral and
     * small-change are existing, making typical transaction scenarios work easily.  If you want to include
     * other utxo's instead you can supply their lovelace sizes.
     *
     * To suppress creation of additional utxos, use `0n` for arg3.
     *
     * You may wish to import {@link ADA} = 1_000_000n from the testing/ module, and
     * multiply smaller integers by that constant.
     *
     * @param roleName - an actor name or role-name for this wallet
     * @param walletBalance - initial wallet balance
     * @param moreUtxos - additional utxos to include
     *
     * @example
     *     this.addActor("cheapo", 14n * ADA, 0n);  //  14 ADA and no additional utxos
     *     this.addActor("flexible", 14n * ADA);  //  14 ADA + default 15 ADA in 3 additional utxos
     *     this.addActor("moneyBags", 42_000_000n * ADA, 5n, 4n);  //  many ADA and two collaterals
     *
     *     //  3O ADA in 6 separate utxos:
     *     this.addActor("smallChange", 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA);
     *
     * @public
     **/
    /** When true, suppresses actor creation logging (used during cache key computation) */
    protected _silentActorSetup = false;

    addActor(
        roleName: string,
        walletBalance: bigint,
        ...moreUtxos: bigint[]
    ): Wallet {
        if (this.actors[roleName])
            throw new Error(`duplicate role name '${roleName}'`);

        // Record actor setup info for cache key computation
        this.actorSetupInfo.push({
            name: roleName,
            initialBalance: walletBalance,
            additionalUtxos: [...moreUtxos],
        });

        //! it instantiates a wallet with the indicated balance pre-set
        // console.log(new Error(`add actor ${roleName}`).stack);
        const a = this.createWallet(walletBalance);
        if (!this._silentActorSetup) {
            this.logActor(roleName, a, walletBalance);
        }

        this.actorContext.others[roleName] = a;

        //! it makes collateral for each actor, above and beyond the initial balance,
        //  ... so that the full balance is spendable and the actor can immediately
        //  ... engage in smart-contract interactions.
        // this.network.tick(2);
        const five = 5n * ADA;
        if (0 == moreUtxos.length) moreUtxos = [five, five, five];
        for (const moreLovelace of moreUtxos) {
            if (moreLovelace > 0n) {
                this.network.createUtxo(a, moreLovelace);
            }
        }
        // this.network.tick(1);

        this.actors[roleName] = a;
        return a;
    }

    /**
     * Logs detailed info for a single actor.
     * @internal
     */
    private logActor(name: string, wallet: SimpleWallet_stellar, balance: bigint): void {
        const addr = wallet.address.toString();
        console.log(
            `+🎭 Actor: ${name}: ${addr.slice(0, 12)}…${addr.slice(
                -4,
            )} ${lovelaceToAda(balance)} (🔑#${(
                wallet.address as ShelleyAddress
            ).spendingCredential
                ?.toHex()
                .substring(0, 8)}…)`,
        );
    }

    /**
     * Logs detailed actor information. Used when actors were created silently
     * during cache key computation but we want to show them on cache miss.
     * @internal
     */
    logActorDetails(): void {
        for (const info of this.actorSetupInfo) {
            const actor = this.actors[info.name];
            if (actor) {
                this.logActor(info.name, actor, info.initialBalance);
            }
        }
    }

    //todo use this for enabling prettier diagnostics with clear labels for
    //  -- actor addresses -> names
    //  -- script addresses -> names
    addrRegistry: Record<string, string> = {};

    /**
     * @public
     */
    get networkParams(): NetworkParams {
        return this.netPHelper.params;
    }

    /**
     * @public
     */
    mkNetwork(
        params: NetworkParams,
    ): [StellarNetworkEmulator, NetworkParamsHelper] {
        const theNetwork = new StellarNetworkEmulator(this.randomSeed, { params });
        const emuParams = theNetwork.initHelper();

        // const wrappedNetwork = makeTxChainBuilder(theNetwork);
        // debugger
        //@xxxts-expect-error
        // emuParams.timeToSlot = function (t) {
        //     const seconds = BigInt(t / 1000n);
        //     return seconds;
        // };
        // emuParams.slotToTimestamp = this.slotToTimestamp;

        return [theNetwork, emuParams];
    }

    /**
     * @public
     */
    slotToTime(s: bigint) {
        return this.netPHelper.slotToTime(s);

        const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
        return new Date(num);
    }

    /**
     * @public
     */
    currentSlot() {
        return this.network.currentSlot;
    }

    /**
     * @public
     */
    waitUntil(time: Date) {
        const targetTimeMillis = BigInt(time.getTime());
        // debugger
        const targetSlot = this.netPHelper.timeToSlot(targetTimeMillis);
        const c = this.currentSlot();

        const slotsToWait = targetSlot - (c || 0);
        if (slotsToWait < 1) {
            throw new Error(`the indicated time is not in the future`);
        }
        // console.warn(`waiting ${slotsToWait} slots -> ${time}`);
        this.network.tick(slotsToWait);
        return slotsToWait;
    }
}
