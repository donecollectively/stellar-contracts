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
    WalletEmulator
} from "@hyperionbt/helios";
import {
    StellarContract,
    findInputsInWallets,
    paramsBase,
    stellarSubclass
} from "../StellarContract.js";
import {
    lovelaceToAda, txAsString,
    utxosAsString
} from "../diagnostics.js";
import { actorMap, ADA, canHaveRandomSeed, canSkipSetup, preProdParams, enhancedNetworkParams } from "./types.js";


export abstract class StellarTestHelper<
    SC extends StellarContract<any>,
    P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never
> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC, any>;
    params?: P;
    defaultActor?: string;
    strella!: SC;
    actors: actorMap;
    optimize = false;
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    network: NetworkEmulator;
    private actorName: string;

    //@ts-ignore type mismatch in getter/setter until ts v5
    get currentActor(): WalletEmulator {
        return this.actors[this.actorName];
    }
    set currentActor(actorName: string) {
        const thisActor = this.actors[actorName];
        if (!thisActor)
            throw new Error(
                `setCurrentActor: invalid actor name '${actorName}'`
            );
        if (this.strella) this.strella.myActor = thisActor;
        this.actorName = actorName;
    }

    address?: Address;

    setupPending?: Promise<any>;
    setupActors() {
        console.warn(
            `using 'hiro' as default actor because ${this.constructor.name} doesn't define setupActors()`
        );
        this.addActor("hiro", 1863n * ADA);
        this.currentActor = "hiro";
    }

    constructor(params?: P & canHaveRandomSeed & canSkipSetup) {
        this.state = {};
        if (params) this.params = params;

        const [theNetwork, emuParams] = this.mkNetwork();
        this.liveSlotParams = emuParams;
        this.network = theNetwork;
        this.networkParams = new NetworkParams(preProdParams);

        this.actors = {};
        this.actorName = ""; //only to make typescript happy
        this.setupActors();
        if (!this.actorName)
            throw new Error(
                `${this.constructor.name} doesn't set currentActor in setupActors()`
            );
        const now = new Date();
        this.waitUntil(now);
        if (params?.skipSetup) {
            console.log("test helper skipping setup");
            return;
        }

        //@ts-expect-error - can serve no-params case or params case
        this.setupPending = this.setup(params).then((p) => {
            return p;
        });
    }

    async setup(params: P & canHaveRandomSeed) {
        const { randomSeed, ...p } = params;
        if (this.setupPending) await this.setupPending;
        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate setup() in test helper"
            );
            return this.strella;
        }
        if (this.strella) {
            console.warn(
                ".... warning: new test helper setup with new seed...."
            );
            this.rand = undefined;
            this.randomSeed = randomSeed;
        }

        return this.initStellarClass();
    }

    initStellarClass() {
        const TargetClass = this.stellarClass;

        const strella = this.initStrella(TargetClass, this.params);

        this.strella = strella;
        this.address = strella.address;
        return strella;
    }

    initStrella(TargetClass: stellarSubclass<any, any>, params: any) {
        return new TargetClass({
            params,
            network: this.network,
            myActor: this.currentActor,
            networkParams: this.networkParams,
            isTest: true,
        });
    }

    //! it has a seed for mkRandomBytes, which must be set by caller
    randomSeed?: number;
    //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
    rand?: () => number;

    delay(ms) {
        return new Promise((res) => setTimeout(res, ms));
    }

    async mkSeedUtxo(seedIndex: bigint = 0n) {
        const { currentActor } = this;
        const { network } = this;

        const tx = new Tx();
        const actorMoney = await currentActor.utxos;
        console.log(
            `${this.actorName} has money: \n` + utxosAsString(actorMoney)
        );

        tx.addInput(
            await findInputsInWallets(
                new helios.Value(30n * ADA),
                { wallets: [currentActor] },
                network
            )
        );

        tx.addOutput(new TxOutput(currentActor.address, new Value(10n * ADA)));
        tx.addOutput(new TxOutput(currentActor.address, new Value(10n * ADA)));
        let si = 2;
        for (; si < seedIndex; si++) {
            tx.addOutput(
                new TxOutput(currentActor.address, new Value(10n * ADA))
            );
        }
        const txId = await this.submitTx(tx, "force");

        return txId;
    }

    async submitTx(tx: Tx, force?: "force"): Promise<TxId> {
        const sendChangeToCurrentActor = this.currentActor.address;
        const isAlreadyInitialized = !!this.strella;
        try {
            await tx.finalize(this.networkParams, sendChangeToCurrentActor);
        } catch (e: any) {
            throw new Error(e.message + "\nin tx: " + txAsString(tx) + "\nprofile: " + tx.profileReport
            );
        }
        if (isAlreadyInitialized && !force) {
            throw new Error(
                `helper is already initialized; use the submitTx from the testing-context's 'strella' object instead`
            );
        }

        console.log(
            `Test helper ${force || ""} submitting tx${force && "" || " prior to instantiateWithParams()"}:\n` +
            txAsString(tx)
            // new Error(`at stack`).stack
        );

        try {
            const txId = await this.network.submitTx(tx);
            console.log("test helper submitted direct txn:" + txAsString(tx));
            this.network.tick(1n);
            // await this.delay(1000)
            // debugger
            // this.network.dump();
            return txId;
        } catch (e: any) {
            console.error(`submit failed: ${e.message}\n  ... in tx ${txAsString(tx)}`);
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

    addActor(roleName: string, walletBalance: bigint) {
        if (this.actors[roleName])
            throw new Error(`duplicate role name '${roleName}'`);
        //! it instantiates a wallet with the indicated balance pre-set
        const a = this.network.createWallet(walletBalance);
        console.log(
            `+🎭 Actor: ${roleName}: ${a.address
                .toBech32()
                .substring(0, 18)}… ${lovelaceToAda(
                    walletBalance
                )} (🔑#${a.address.pubKeyHash.hex.substring(0, 8)}…)`
        );

        //! it makes collateral for each actor, above and beyond the initial balance,
        //  ... so that the full balance is spendable and the actor can immediately
        //  ... engage in smart-contract interactions.
        this.network.tick(BigInt(2));
        this.network.createUtxo(a, 5n * ADA);
        this.network.tick(BigInt(1));

        this.actors[roleName] = a;
        return a;
    }

    mkNetwork(): [NetworkEmulator, enhancedNetworkParams] {
        const theNetwork = new NetworkEmulator();

        const emuParams = theNetwork.initNetworkParams({
            ...preProdParams,
            raw: { ...preProdParams },
        }) as enhancedNetworkParams;

        //@ts-expect-error
        emuParams.timeToSlot = function (t) {
            const seconds = BigInt(t / 1000n);
            return seconds;
        };
        emuParams.slotToTimestamp = this.slotToTimestamp;

        return [theNetwork, emuParams];
    }

    slotToTimestamp(s: bigint) {
        const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
        return new Date(num);
    }

    currentSlot() {
        return this.liveSlotParams.liveSlot;
    }

    waitUntil(time: Date) {
        const targetTimeMillis = BigInt(time.getTime());
        //@ts-expect-error
        const targetSlot = this.liveSlotParams.timeToSlot(targetTimeMillis);
        const c = this.currentSlot();

        const slotsToWait = targetSlot - c;
        if (slotsToWait < 1) {
            throw new Error(`the indicated time is not in the future`);
        }
        // console.warn(`waiting ${slotsToWait} slots -> ${time}`);
        this.network.tick(slotsToWait);
        return slotsToWait;
    }
}
