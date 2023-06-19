import {
    Address,
    Crypto,
    NetworkEmulator,
    NetworkParams,
    Program,
    Tx,
    TxId,
    UplcProgram,
    Wallet,
    WalletEmulator,
} from "@hyperionbt/helios";
import * as helios from "@hyperionbt/helios";

import { promises as fs } from "fs";
import { Vitest, vitest, TestContext } from "vitest";
import {
    StellarConstructorArgs,
    StellarContract,
    lovelaceToAda,
    txAsString,
} from "../lib/StellarContract";

type paramsBase = Record<string, any>;
type contractMap<
    S extends StellarContract<P>, 
    H extends HelperFunctions<S>,  
    P extends paramsBase
> = Record<
    string,
    HeliosTestingContext<S, H, P>
>;
type actorMap = Record<string, WalletEmulator>;

export type HelperFunctions<
    S  extends StellarContract<any>
> = Record<string, (...args:any) => Promise<any>>

type subclassOf<S extends StellarContract<P>, P extends paramsBase> = new (
    args: StellarConstructorArgs<S, P>
) => S & StellarContract<P>;
//     // (withParams(params:any) => S)

export const ADA = 1_000_000n; // lovelace
export interface HeliosTestingContext<
    StellarType extends StellarContract<P>,
    H extends HelperFunctions<StellarType>,
    P extends paramsBase
> {
    stellarClass: subclassOf<StellarContract<P>, P>;
    helios: typeof helios;
    myself?: Wallet;
    network: NetworkEmulator;
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    h: H, // alias for helpers
    helpers: H, 
    delay: typeof delay,
    state: Record<string, any>
    addActor: typeof addActor;
    waitUntil: typeof waitUntil;
    currentSlot: typeof currentSlot;
    actors: actorMap;
    instantiateWithParams: typeof instantiateWithParams<StellarType, H, P>;
    mkRandomBytes: typeof mkRandomBytes;
    //! it has a seed for mkRandomBytes, which must be set by caller
    randomSeed?: number;
    //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
    rand?: () => number;

    //! it manifests some details only after createContract()
    related?: contractMap<StellarType, H, P>;
    strella?: StellarType;
    address?: Address;
    submitTx: typeof submitTx
}

async function delay(ms) { 
    return new Promise((res) => setTimeout(res, ms)) 
}


async function instantiateWithParams<
    StellarType extends StellarContract<P>,
    H extends HelperFunctions<StellarType>,
    P extends paramsBase
>(
    this: HeliosTestingContext<StellarType, H, P>,
    params: P 
): Promise<StellarType> {
    const TargetClass = this.stellarClass;

    const strella = new TargetClass({
        params,
        network: this.network,
        myself: this.myself,
        networkParams: this.networkParams,
        isTest: true,
    });
    //@ts-expect-error - is this type error actually correct?  fixes welcome
    this.strella = strella;
    //@ts-expect-error - is this type error actually correct?  fixes welcome
    return strella;
}

export async function addTestContext<P extends paramsBase, H extends HelperFunctions<any>>(
    context: TestContext,
    stellarClass: subclassOf<StellarContract<P>, P>,
    helpers: H
) {
    const tc = await mkContext(stellarClass, helpers, context);

    Object.assign(context, tc);
}

type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp: typeof slotToTimestamp;
};
function slotToTimestamp(s: bigint) {
    const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
    return new Date(num);
}

// function mkRandom(s: bigint) {
//     const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
//     return new Date(num);
// }

const preProdParams = JSON.parse(
    await fs.readFile("./src/preprod.json", "utf8")
);
// emuParams.liveSlot;

export function mkNetwork(): [NetworkEmulator, enhancedNetworkParams] {
    const theNetwork = new NetworkEmulator();

    const emuParams = theNetwork.initNetworkParams(
        preProdParams
    ) as enhancedNetworkParams;

    emuParams.timeToSlot = function (t) {
        const seconds = BigInt(t / 1000n);
        return seconds;
    };
    emuParams.slotToTimestamp = slotToTimestamp;

    return [theNetwork, emuParams];
}

export async function mkContext<
    S extends StellarContract<P>,
    H extends HelperFunctions<S>,
    P extends paramsBase
>(
    stellarClass: subclassOf<StellarContract<P>, P>,
    helpers: H,
    ctx
): Promise<HeliosTestingContext<S, H, P>> {
    const optimize = false;

    //! it explicitly binds the helper functions' `this` to the context object,
    //   to match the type-hints
    const h : HelperFunctions<S> = Object.fromEntries(
        Object.entries(helpers).map(
            ([name, func]) => [name, func.bind(ctx)] 
        )
    );
    // let address;
    // try {
    //     address = Address.fromValidatorHash(uplc.validatorHash);
    // } catch (e) {
    //     if (e.message !== "unexpected") throw e;

    //     address = Address.fromValidatorHash(uplc.mintingPolicyHash);
    // }
    const [theNetwork, emuParams] = mkNetwork();
    const networkParams = new NetworkParams(preProdParams);

    const context = {
        helios,
        h, // alias
        helpers: h, //formal name
        stellarClass,
        actors: {},
        // address,
        // related,
        network: theNetwork,
        delay,
        liveSlotParams: emuParams,
        networkParams,
        // addRelatedContract,
        addActor,
        waitUntil,
        currentSlot,
        mkRandomBytes,
        instantiateWithParams,
        submitTx,
        state:{},
    };
    const now = new Date();
    context.waitUntil(now);
    //@ts-expect-error - TODO verify whether the warning "could be instantiated with a different subtype" actually is a practical problem
    return context;
}

async function submitTx(
    this: HeliosTestingContext<any, any, any>,    
    tx: Tx,
    force? : "force"
) : Promise<TxId> { 
    const tina = this.actors.tina.address
    const isAlreadyInitialized = !!this.strella && !force
    try {
        await tx.finalize(this.networkParams, tina);
    } catch(e) {
        throw (e)
    }
    if (isAlreadyInitialized) {
        throw new Error(`use the submitTx from the testing-context's 'strella' object instead`)
    }

    console.log("Test helper submitting tx prior to instantiateWithParams():\n "+ txAsString(tx))

    const txId = this.network.submitTx(tx);
    this.network.tick(1n)
    // await this.delay(1000)
    // debugger
    // this.network.dump();
    return txId
}

function mkRandomBytes(
    this: HeliosTestingContext<any, any, any>,
    length: number
): number[] {
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

function addActor(
    this: HeliosTestingContext<any, any, any>,
    roleName: string,
    walletBalance: bigint
) {
    if (this.actors[roleName])
        throw new Error(`duplicate role name '${roleName}'`);
    //! it instantiates a wallet with the indicated balance pre-set
    const a = this.network.createWallet(walletBalance);
    console.log( `+🎭 Actor: ${roleName}: ${
        a.address.toBech32().substring(0,18)
    }… ${
        lovelaceToAda(walletBalance)
    } (🔑#${
        a.address.pubKeyHash.hex.substring(0,8)
    }…)`
    )

    //! it makes collateral for each actor, above and beyond the initial balance,
    //  ... so that the full balance is spendable and the actor can immediately
    //  ... engage in smart-contract interactions.
    
    this.network.tick(BigInt(2));
    this.network.createUtxo(a, 5n * ADA);

    this.actors[roleName] = a;
    return a;
}

function currentSlot(this: HeliosTestingContext<any, any, any>) {
    return this.liveSlotParams.liveSlot;
}

function waitUntil(this: HeliosTestingContext<any, any, any>, time: Date) {
    const targetTimeMillis = BigInt(time.getTime());
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
