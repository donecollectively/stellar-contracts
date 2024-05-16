import * as helios from "@hyperionbt/helios";
import {
    Address,
    Crypto,
    NetworkEmulator,
    NetworkParams,
    Tx,
    TxId,
    TxOutput,
    Value,
    SimpleWallet as WalletEmulator,
} from "@hyperionbt/helios";
import type { Wallet } from "@hyperionbt/helios";

import { StellarContract, findInputsInWallets } from "../StellarContract.js";
import type {
    stellarSubclass,
    ConfigFor,
    StellarFactoryArgs,
    ActorContext,
} from "../StellarContract.js";

import {
    dumpAny,
    lovelaceToAda,
    txAsString,
    utxosAsString,
} from "../diagnostics.js";
import { ADA, preProdParams } from "./types.js";
import type {
    TestHelperState,
    actorMap,
    canHaveRandomSeed,
    canSkipSetup,
    enhancedNetworkParams,
} from "./types.js";
import { StellarNetworkEmulator, type NetworkSnapshot } from "./StellarNetworkEmulator.js";

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
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    network: StellarNetworkEmulator;
    private _actorName!: string;

    get actorName() {
        return this._actorName;
    }
    /**
     * Gets the current actor wallet
     *
     * @public
     **/
    get wallet(): WalletEmulator {
        const {wallet} = this.actorContext;
        if (!wallet) {
            throw new Error(`no current actor; use setActor(actorName) firsgt`);
        }
        return wallet
    }

    actorContext: ActorContext<WalletEmulator> = {
        wallet: undefined
    }

    async setActor(actorName: string) {
        const thisActor = this.actors[actorName];
        if (!thisActor)
            throw new Error(
                `setCurrentActor: invalid actor name '${actorName}'`
            );
        if (this._actorName) {
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
        return this.setActor("hiro");
    }

    snapshot() {
        return this.network.snapshot();
    }

    loadSnapshot(snap: NetworkSnapshot) {
        this.network.loadSnapshot(snap);
    }
    helperState?: TestHelperState<SC>;
    constructor(
        config?: ConfigFor<SC>& canHaveRandomSeed & canSkipSetup,
        helperState?: TestHelperState<SC>
    ) {
        
        this.state = {};
        if (!helperState) debugger
        this.helperState = helperState;
        //@ts-expect-error temporarily 
        const {skipSetup, ...cfg} = config || {};
        if (Object.keys(cfg).length) {
            console.log(
                "XXXXXXXXXXXXXXXXXXXXXXXXXX test helper with config",
                config
            );

            this.config = config;
        }

        const [theNetwork, emuParams] = this.mkNetwork();
        this.liveSlotParams = emuParams;
        this.network = theNetwork;
        this.networkParams = new NetworkParams(this.fixupParams(preProdParams));

        this.randomSeed = config?.randomSeed || 42;
        this.actors = {};
        const now = new Date();
        this.waitUntil(now);
        if (skipSetup) {
            throw new Error(`obsolete skipSetup: just don't call initialze()`);
            return;
        }

        //xx@ts-expect-error - can serve no-params case or params case
        // this.setupPending = this.initialize();
    }
    fixupParams(preProdParams) {
        preProdParams.latestParams.maxTxSize *= 1.5
        return preProdParams;
    }

    async initialize({
        randomSeed = 42,
    }: {randomSeed?: number } = {}): Promise<SC> {

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
        await this.delay(1);
        this._actorName = ""; //only to make typescript happy
        if (!Object.keys(this.actors).length) {
            const actorSetup = this.setupActors();
            await actorSetup
        }
        
        return this.initStellarClass()
    }

    restoreFrom(snapshotName: string) : SC {
        const {helperState, helperState:{snapshots, previousHelper, bootstrappedStrella}={}} = this;
        if (!helperState) throw new Error(`can't restore from a previous helper without a helperState`);
        if (!bootstrappedStrella) throw new Error(`can't restore from a previous helper without a bootstrappedStrella`);

        if (!snapshots || !snapshots[snapshotName]) {
            throw new Error(`no snapshot named ${snapshotName} in helperState`);
        }
        if (!previousHelper) {
            throw new Error(`no previousHelper in helperState`);
        }
        const {parsedConfig} = previousHelper.state;
        this.initStellarClass(parsedConfig);
        // this.strella = bootstrappedStrella;

        this.state.mintedCharterToken = previousHelper.state.mintedCharterToken;
        this.state.parsedConfig = parsedConfig;
        this.actors = previousHelper.actors;

        this.network.loadSnapshot(snapshots[snapshotName]);

        return this.strella
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
        const setup = {
            network: this.network,
            actorContext: this.actorContext,
            networkParams: this.networkParams,
            isTest: true,
            optimize: this.optimize,
        };

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
                setup.actorContext.wallet.address.toBech32()
            );
        } else {
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

    async mkSeedUtxo(seedIndex: bigint = 0n) {
        const {wallet} = this;
        const { network } = this;

        const tx = new Tx();
        const actorMoney = await wallet.utxos;
        console.log(
            `${this._actorName} has money: \n` + utxosAsString(actorMoney)
        );

        tx.addInput(
            await findInputsInWallets(
                new helios.Value(30n * ADA),
                { wallets: [wallet] },
                network
            )
        );

        tx.addOutput(new TxOutput(wallet.address, new Value(10n * ADA)));
        tx.addOutput(new TxOutput(wallet.address, new Value(10n * ADA)));
        let si = 2;
        for (; si < seedIndex; si++) {
            tx.addOutput(
                new TxOutput(wallet.address, new Value(10n * ADA))
            );
        }
        const txId = await this.submitTx(tx, "force");

        return txId;
    }

    async submitTx(tx: Tx, force?: "force"): Promise<TxId> {
        const sendChangeToCurrentActor = this.wallet?.address;
        const isAlreadyInitialized = !!this.strella;
        try {
            await tx.finalize(this.networkParams, sendChangeToCurrentActor);
        } catch (e: any) {
            throw new Error(
                e.message +
                    "\nin tx: " +
                    txAsString(tx, this.networkParams) +
                    "\nprofile: " +
                    tx.profileReport
            );
        }
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
            this.network.tick(1n);
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
        if (!this.rand) this.rand = Crypto.rand(this.randomSeed);

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
        const a = this.network.createWallet(walletBalance);
        const addr = a.address.toBech32();
        console.log(
            `+🎭 Actor: ${roleName}: ${addr.slice(0, 12)}…${addr.slice(
                -4
            )} ${lovelaceToAda(
                walletBalance
            )} (🔑#${a.address.pubKeyHash?.hex.substring(0, 8)}…)`
        );

        //! it makes collateral for each actor, above and beyond the initial balance,
        //  ... so that the full balance is spendable and the actor can immediately
        //  ... engage in smart-contract interactions.
        this.network.tick(BigInt(2));
        const five = 5n * ADA;
        if (0 == moreUtxos.length) moreUtxos = [five, five, five];
        for (const moreLovelace of moreUtxos) {
            if (moreLovelace > 0n) {
                this.network.createUtxo(a, moreLovelace);
            }
        }
        this.network.tick(BigInt(1));

        this.actors[roleName] = a;
        return a;
    }

    mkNetwork(): [StellarNetworkEmulator, enhancedNetworkParams] {
        const theNetwork = new StellarNetworkEmulator();

        //@xxx ts-expect-error with missing methods
        const emuParams = theNetwork.initNetworkParams({
            ...preProdParams,
            raw: { ...preProdParams },
        }) as enhancedNetworkParams;

        // debugger
        //@xxxts-expect-error
        // emuParams.timeToSlot = function (t) {
        //     const seconds = BigInt(t / 1000n);
        //     return seconds;
        // };
        // emuParams.slotToTimestamp = this.slotToTimestamp;

        return [theNetwork, emuParams];
    }

    slotToTimestamp(s: bigint) {
        return this.networkParams.slotToTime(s);

        const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
        return new Date(num);
    }

    currentSlot() {
        return this.liveSlotParams.liveSlot;
    }

    waitUntil(time: Date) {
        const targetTimeMillis = BigInt(time.getTime());
        // debugger
        const targetSlot = this.networkParams.timeToSlot(targetTimeMillis);
        const c = this.currentSlot();

        const slotsToWait = targetSlot - (c || 0n);
        if (slotsToWait < 1) {
            throw new Error(`the indicated time is not in the future`);
        }
        // console.warn(`waiting ${slotsToWait} slots -> ${time}`);
        this.network.tick(slotsToWait);
        return slotsToWait;
    }
}
