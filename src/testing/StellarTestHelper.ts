import {
    DEFAULT_NETWORK_PARAMS,
    type Address,
    type NetworkParams,
    type NetworkParamsHelper,
    type Tx,
    type TxId,
    makeAssets,
    makeValue,
    type ShelleyAddress,
    type PubKeyHash,
} from "@helios-lang/ledger";
import { generateBytes, mulberry32 } from "@helios-lang/crypto";

import { SimpleWallet_stellar as emulatedWallet } from "./StellarNetworkEmulator.js";

export const expectTxnError = {
    expectError: true as const,
} as Partial<SubmitOptions>;

import { StellarContract, findInputsInWallets } from "../StellarContract.js";
import type {
    stellarSubclass,
    ConfigFor,
    StellarFactoryArgs,
    ActorContext,
    NetworkContext,
    SetupDetails,
} from "../StellarContract.js";

import {
    dumpAny,
    lovelaceToAda,
    txAsString,
    utxosAsString,
} from "../diagnostics.js";
import { ADA } from "./types.js";
import type {
    TestHelperState,
    actorMap,
    canHaveRandomSeed,
    canSkipSetup,
    enhancedNetworkParams,
} from "./types.js";
import {
    SimpleWallet_stellar,
    StellarNetworkEmulator,
    type NetworkSnapshot,
} from "./StellarNetworkEmulator.js";
import type { StellarTxnContext, SubmitOptions } from "../StellarTxnContext.js";
import {
    makeRandomBip32PrivateKey,
    makeRootPrivateKey,
    makeTxBuilder,
    type Wallet,
} from "@helios-lang/tx-utils";
import { UtxoHelper } from "../UtxoHelper.js";

/**
 * Base class for test-helpers on generic Stellar contracts
 * @remarks
 *
 * NOTE: DefaultCapoTestHelper is likely to be a better fit for typical testing needs and typical contract-development scenarios.
 * Use this class for specific unit-testing needs not sufficiently served by integration-testing on a Capo.
 * @public
 **/
export abstract class StellarTestHelper<SC extends StellarContract<any>> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC>;
    config?: ConfigFor<SC> & canHaveRandomSeed;
    defaultActor?: string;
    strella!: SC;
    actors: actorMap;
    optimize = false;
    netPHelper: NetworkParamsHelper;
    networkCtx: NetworkContext<StellarNetworkEmulator>;
    protected _actorName!: string;

    get actorName() {
        return this._actorName;
    }

    get network() {
        return this.networkCtx.network;
    }

    /**
     * Gets the current actor wallet
     *
     * @public
     **/
    get wallet(): emulatedWallet {
        const { wallet } = this.actorContext;
        if (!wallet) {
            throw new Error(`no current actor; use setActor(actorName) first`);
        }
        return wallet;
    }

    actorContext: ActorContext<emulatedWallet> = {
        wallet: undefined,
    };

    async setActor(actorName: string) {
        const thisActor = this.actors[actorName];
        if (!thisActor)
            throw new Error(
                `setCurrentActor: network #${this.network.id}: invalid actor name '${actorName}'\n   ... try one of: \n  - ` +
                    Object.keys(this.actors).join(",\n  - ")
            );
        if (this._actorName) {
            if (actorName == this._actorName) {
                if (this.actorContext.wallet !== thisActor) {
                    throw new Error(
                        `actor / wallet mismatch: ${this._actorName} ${dumpAny(
                            this.actorContext.wallet?.address
                        )} vs ${actorName} ${dumpAny(thisActor.address)}`
                    );
                }
                // quiet idempotent call.
                return;
            }
            console.log(
                `\n🎭 -> 🎭 changing actor from 🎭 ${
                    this._actorName
                } to  🎭 ${actorName} ${dumpAny(thisActor.address)}`
            );
        } else {
            console.log(
                `\n🎭🎭 initial actor ${actorName} ${dumpAny(
                    thisActor.address
                )}`
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
    async setupActors() {
        console.warn(
            `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`
        );
        this.addActor("hiro", 1863n * ADA);
    }
    setDefaultActor() {
        return this.setActor("hiro");
    }

    helperState?: TestHelperState<SC>;
    constructor(
        config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup,
        helperState?: TestHelperState<SC>
    ) {
        this.state = {};
        if (!helperState) {
            console.warn(
                // warning emoji: "⚠️"
                // info emoji: "ℹ️"
                `⚠️ ⚠️ ⚠️ Note: this test helper doesn't have a helperState, so it won't be able to use test-chain snapshots
ℹ️ ℹ️ ℹ️ ... to add helper state, follow this pattern:

    // in your test helper:

    @CapoTestHelper.hasNamedSnapshot("yourSnapshot", "tina")
    snapTo‹YourSnapshot›() {
        // never called
    }
    async ‹yourSnapshot›() {
        this.setActor("tina");

        // ... your good sequence of transaction(s) here
        const tcx = this.capo.mkTxn‹...›(...)
        return this.submitTxnWithBlock(tcx);
    }

    // in your test setup:

    type localTC = StellarTestContext<YourCapo>;
    let helperState: TestHelperState<YourCapo> = {
        snapshots: {},
    } as any;

    beforeEach<localTC>(async (context) => {
        await addTestContext(context,YourCapoTestHelper,
        undefined,
        helperState
    )}                

    // in your tests:
    
    describe("your thing", async () => {
        it("your test", async (context: localTC) => {
            await context.h.snapTo‹yourSnapshot›()
        });
        it("your other test", async (context: localTC) => { 
            // this one will use the snapshot generated earlier
            await context.h.snapTo‹yourSnapshot›()
        });
    })

... happy (and snappy) testing!`
            );
        }
        this.helperState = helperState;
        const { skipSetup, ...cfg } = config || {};
        if (Object.keys(cfg).length) {
            console.log(
                "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
                config
            );

            this.config = config;
        }

        const [theNetwork, netParamsHelper] = this.mkNetwork(
            this.fixupParams(DEFAULT_NETWORK_PARAMS())
        );
        this.netPHelper = netParamsHelper;
        this.networkCtx = {
            network: theNetwork,
        };

        this.randomSeed = config?.randomSeed || 42;
        this.actors = {};
        const now = new Date();
        this.waitUntil(now);
        if (skipSetup) {
            throw new Error(`obsolete skipSetup: just don't call initialze()`);
            return;
        }
        console.log(" + StellarTestHelper");
        //xx@ts-expect-error - can serve no-params case or params case
        // this.setupPending = this.initialize();
    }

    fixupParams(preProdParams: NetworkParams): NetworkParams {
        //@ts-expect-error on our synthetic property
        if (true || preProdParams.isFixedUp) return preProdParams;

        const txSize = preProdParams.maxTxSize;
        const maxTxSize = Math.floor(txSize * 3.5);
        console.log(
            "test env: 🔧🔧🔧 fixup max tx size",
            txSize,
            " -> 🔧",
            maxTxSize
        );
        preProdParams.maxTxSize = maxTxSize;

        const mem = preProdParams.maxTxExMem;
        const maxMem = Math.floor(mem * 5.5);
        console.log("test env: 🔧🔧🔧 fixup max memory", mem, " -> 🔧", maxMem);
        preProdParams.maxTxExMem = maxMem;

        const cpu = preProdParams.maxTxExCpu;
        const maxCpu = Math.floor(cpu * 2.1);
        console.log("test env: 🔧🔧🔧 fixup max cpu", cpu, " -> 🔧", maxCpu);
        preProdParams.maxTxExCpu = maxCpu;

        //@ts-expect-error on our synthetic property
        preProdParams.isFixedUp = true;
        return preProdParams;
    }

    async submitTxnWithBlock(
        tcx: StellarTxnContext | Promise<StellarTxnContext>,
        options: SubmitOptions & {
            futureDate?: Date;
        } = {}
    ) {
        const t = await tcx;
        await this.advanceNetworkTimeForTx(t, options.futureDate);

        return t.submit(options).then(() => {
            this.network.tick(1);
            return tcx;
        });
    }

    async advanceNetworkTimeForTx(tcx: StellarTxnContext, futureDate?: Date) {
        const { txb: txb } = tcx;

        // determines the validity range of the transaction
        const tx = await tcx.builtTx;

        const txBody = tx.body;
        function txnAttr(x: string) {
            return txBody[x];
        }
        function withPositiveSign(x: number | bigint) {
            return x < 0 ? `${x}` : `+${x}`;
        }

        const validFrom = txnAttr("firstValidSlot");
        const validTo = txnAttr("lastValidSlot");

        let targetTime: number = futureDate?.getTime() || Date.now();
        let targetSlot = this.netPHelper.timeToSlot(BigInt(targetTime));

        tcx.logger.logPrint(
            "\n  ⚗️ 🐞ℹ️  advanceNetworkTimeForTx: " + (tcx.txnName || "")
        );
        if (futureDate) {
            debugger;
            tcx.logger.logPrint(
                `\n    ---- ⚗️ 🐞🐞 explicit futureDate ${futureDate.toISOString()} -> slot ${targetSlot}`
            );
        }
        const { currentSlot } = this.network;
        const { netPHelper: nph } = this;
        const nowSlot = nph.timeToSlot(BigInt(Date.now()));
        const slotDiff = targetSlot - currentSlot;

        const validInPast = validTo && nowSlot > validTo;
        const validInFuture = validFrom && nowSlot < validFrom;
        tcx.logger.logPrint(
            `\n    ---- ⚗️ 🐞🐞 advanceNetworkTimeForTx: tx valid ${
                validFrom || "anytime"
            } -> ${validTo || "anytime"}`
        );
        const currentToNowDiff = withPositiveSign(nowSlot - currentSlot);
        const currentToTargetDiff = withPositiveSign(slotDiff);
        let effectiveNetworkSlot = targetSlot;
        function showEffectiveNetworkSlotTIme() {
            tcx.logger.logPrint(
                `\n    ⚗️ 🐞ℹ️  with now=network slot ${effectiveNetworkSlot}: ${nph.slotToTime(
                    effectiveNetworkSlot
                )}\n` +
                    `           tx valid ${
                        validFrom
                            ? withPositiveSign(effectiveNetworkSlot - validFrom)
                            : "anytime"
                    } -> ${
                        validTo
                            ? withPositiveSign(effectiveNetworkSlot - validTo)
                            : "anytime"
                    } from now`
            );
        }
        tcx.logger.logPrint(
            `\n    ---- ⚗️ 🐞🐞 current slot ${currentSlot} ${currentToNowDiff} = now slot ${nowSlot} \n` +
                `                    current ${currentToTargetDiff} = targetSlot ${targetSlot}`
        );
        if (validInPast || validInFuture) {
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
                    }s`
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
                    }; no futureDate specified; not interfering with network time`
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
                    `\n    ------ ⚗️ 🐞🐞🐞🐞🐞🐞🐞🐞can't go back in time ${slotDiff}s (current slot ${this.network.currentSlot}, target ${targetSlot})`
                );
                throw new Error(
                    `explicit futureDate ${futureDate} is in the past; can't go back ${slotDiff}s`
                );
            }
            tcx.logger.logPrint(
                `\n   -- ⚗️ 🐞🐞🐞🐞⚗️  NOT ADVANCING: the network is already ahead of the current time by ${
                    0 - slotDiff
                }s ⚗️ 🐞🐞🐞🐞⚗️`
            );
            tcx.logger.flush();
            return;
        }
        if (this.network.currentSlot < targetSlot) {
            effectiveNetworkSlot = targetSlot;
            tcx.logger.logPrint(
                `\n    ⚗️ 🐞ℹ️  advanceNetworkTimeForTx ${withPositiveSign(
                    slotDiff
                )} slots`
            );
            showEffectiveNetworkSlotTIme();
            this.network.tick(slotDiff);
        } else {
            effectiveNetworkSlot = currentSlot;
            showEffectiveNetworkSlotTIme();
        }
        tcx.logger.flush();
    }

    async initialize({
        randomSeed = 42,
    }: { randomSeed?: number } = {}): Promise<SC> {
        console.log("STINIT");
        debugger;

        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate initialize() in test helper"
            );
            return this.strella;
        }
        if (this.strella) {
            console.warn(
                ".... warning: new test helper setup with new seed...."
            );
            this.rand = undefined;
            this.randomSeed = randomSeed;
            this.actors = {};
        } else {
            console.log(
                "???????????????????????? Test helper initializing without this.strella"
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

    async initStrella(
        TargetClass: stellarSubclass<SC>,
        config?: ConfigFor<SC>
    ) {
        const setup: SetupDetails = {
            network: this.network,
            actorContext: this.actorContext,
            networkParams: this.networkParams,
            uh: undefined as any,
            isTest: true,
            optimize: this.optimize,
        };
        setup.uh = new UtxoHelper(setup);

        let cfg: StellarFactoryArgs<ConfigFor<SC>> = {
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
                (setup.actorContext.wallet as any).address.toBech32()
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

    delay(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     */
    createWallet(lovelace = 0n, assets = makeAssets([])): SimpleWallet_stellar {
        const wallet = SimpleWallet_stellar.fromRootPrivateKey(
            makeRootPrivateKey(generateBytes(this.network.mulberry32, 32)),
            // the test helper is a network context, because it has a 'network'.  Ducky-typed as networkCtx
            this
        );

        new SimpleWallet_stellar(
            this.networkCtx, // the test helper is a network context, because it has a 'network'.  Ducky-typed as networkCtx
            makeRandomBip32PrivateKey(this.network.mulberry32)
        );

        this.network.createUtxo(wallet, lovelace, assets);

        return wallet;
    }

    async mkSeedUtxo(seedIndex: bigint = 0n) {
        const { wallet } = this;
        const { network } = this;

        const txb = makeTxBuilder({
            isMainnet: network.isMainnet(),
        });
        const actorMoney = await wallet.utxos;
        console.log(
            `${this._actorName} has money: \n` + utxosAsString(actorMoney)
        );

        txb.spendWithoutRedeemer(
            await findInputsInWallets(
                makeValue(30n * ADA),
                { wallets: [wallet] },
                network
            )
        );

        txb.payUnsafe(wallet.address, makeValue(10n * ADA));
        txb.payUnsafe(wallet.address, makeValue(10n * ADA));
        let si = 2;
        for (; si < seedIndex; si++) {
            txb.payUnsafe(wallet.address, makeValue(10n * ADA));
        }
        const txId = await this.submitTx(
            await txb.build({
                changeAddress: wallet.address,
                networkParams: this.networkParams,
            }),
            "force"
        );

        return txId;
    }

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
                `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`
            );
        }

        console.log(
            `Test helper ${force || ""} submitting tx${
                (force && "") || " prior to instantiateWithParams()"
            }:\n` + txAsString(tx, this.networkParams)
            // new Error(`at stack`).stack
        );

        try {
            const txId = await this.network.submitTx(tx);
            console.log(
                "test helper submitted direct txn:" +
                    txAsString(tx, this.networkParams)
            );
            this.network.tick(1);
            // await this.delay(1000)
            // debugger
            // this.network.dump();
            return txId;
        } catch (e: any) {
            console.error(
                `submit failed: ${e.message}\n  ... in tx ${txAsString(tx)}`
            );
            throw e;
        }
    }

    mkRandomBytes(length: number): number[] {
        if (!this.randomSeed)
            throw new Error(
                `test must set context.randomSeed for deterministic randomness in tests`
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
    addActor(
        roleName: string,
        walletBalance: bigint,
        ...moreUtxos: bigint[]
    ): Wallet {
        if (this.actors[roleName])
            throw new Error(`duplicate role name '${roleName}'`);
        //! it instantiates a wallet with the indicated balance pre-set
        // console.log(new Error(`add actor ${roleName}`).stack);
        const a = this.createWallet(walletBalance);
        const addr = a.address.toString();
        console.log(
            `+🎭 Actor: ${roleName}: ${addr.slice(0, 12)}…${addr.slice(
                -4
            )} ${lovelaceToAda(walletBalance)} (🔑#${(
                a.address as ShelleyAddress
            ).spendingCredential
                ?.toHex()
                .substring(0, 8)}…)`
        );

        //! it makes collateral for each actor, above and beyond the initial balance,
        //  ... so that the full balance is spendable and the actor can immediately
        //  ... engage in smart-contract interactions.
        this.network.tick(2);
        const five = 5n * ADA;
        if (0 == moreUtxos.length) moreUtxos = [five, five, five];
        for (const moreLovelace of moreUtxos) {
            if (moreLovelace > 0n) {
                this.network.createUtxo(a, moreLovelace);
            }
        }
        this.network.tick(1);

        this.actors[roleName] = a;
        return a;
    }

    //todo use this for enabling prettier diagnostics with clear labels for
    //  -- actor addresses -> names
    //  -- script addresses -> names
    addrRegistry: Record<string, string> = {};

    get networkParams(): NetworkParams {
        return this.netPHelper.params;
    }

    mkNetwork(
        params: NetworkParams
    ): [StellarNetworkEmulator, NetworkParamsHelper] {
        const theNetwork = new StellarNetworkEmulator(undefined, { params });
        const emuParams = theNetwork.initHelper();

        // debugger
        //@xxxts-expect-error
        // emuParams.timeToSlot = function (t) {
        //     const seconds = BigInt(t / 1000n);
        //     return seconds;
        // };
        // emuParams.slotToTimestamp = this.slotToTimestamp;

        return [theNetwork, emuParams];
    }

    slotToTime(s: bigint) {
        return this.netPHelper.slotToTime(s);

        const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
        return new Date(num);
    }

    currentSlot() {
        return this.network.currentSlot;
    }

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
