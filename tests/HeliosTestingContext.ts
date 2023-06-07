import {
    Address,
    NetworkEmulator,
    NetworkParams,
    Program,
    UplcProgram,
    WalletEmulator,
} from "@hyperionbt/helios";
import * as helios from "@hyperionbt/helios";

import { promises as fs } from "fs";
import { Vitest, vitest, TestContext } from "vitest";
import {
    StellarConstructorArgs,
    StellarContract,
} from "../lib/StellarContract";

type paramsBase = Record<string, any>;
type contractMap<S extends StellarContract<P>, P extends paramsBase> = Record<
    string,
    HeliosTestingContext<S, P>
>;
type actorMap = Record<string, WalletEmulator>;

type subclassOf<S extends StellarContract<P>, P extends paramsBase> = new (
    args: StellarConstructorArgs<P>
) => S & StellarContract<P>;
//     // (withParams(params:any) => S)

export const ADA = 1_000_000n; // lovelace
export interface HeliosTestingContext<
    StellarType extends StellarContract<P>,
    P extends paramsBase
> {
    stellarClass: subclassOf<StellarContract<P>, P>;
    helios: typeof helios;
    network: NetworkEmulator;
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    delay: typeof delay,
    addActor: typeof addActor;
    waitUntil: typeof waitUntil;
    currentSlot: typeof currentSlot;
    actors: actorMap;
    // contract: UplcProgram;
    instantiateWithParams: typeof instantiateWithParams<StellarType, P>;
    setupFunc: typeof setupFunc;
    //! it has an optional no-args setup() function, 
    //  ... which instantiates the contract using params arranged by that func.
    //  ...  setupFunc(func) is used to assign it.

    setup?: () => Promise<StellarType>
    mkRandomBytes: typeof mkRandomBytes;
    //! it has a seed for mkRandomBytes, which must be set by caller
    randomSeed?: number;
    //! it makes a rand() function based on the randomSeed after first call to mkRandomBytes
    rand?: () => number;

    //! it manifests some details only after createContract()
    related?: contractMap<StellarType, P>;
    strella?: StellarType;
    address?: Address;
}

async function delay(ms) { 
    return new Promise((res) => setTimeout(res, ms)) 
}

async function instantiateWithParams<
    StellarType extends StellarContract<P>,
    P extends paramsBase
>(
    this: HeliosTestingContext<StellarType, P>,
    params: P //!!! todo: make this fit params that work with the helios contract
): Promise<StellarType> {
    const TargetClass = this.stellarClass;

    const strella = new TargetClass({
        params,
        network: this.network,
        networkParams: this.networkParams,
        isTest: true,
    });
    //@ts-expect-error - is this type error actually correct?  fixes welcome
    this.strella = strella;
    //@ts-expect-error - is this type error actually correct?  fixes welcome
    return strella;
}
function setupFunc<
    P extends paramsBase
>(func : () => Promise<StellarContract<P>>) : void {
    this.setup = func;
}

export async function addTestContext<P extends paramsBase>(
    context: TestContext,
    stellarClass: subclassOf<StellarContract<P>, P>
) {
    const tc = await mkContext(stellarClass);

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
    P extends paramsBase
>(
    stellarClass: subclassOf<StellarContract<P>, P>
): Promise<HeliosTestingContext<S, P>> {
    const optimize = false;

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
        stellarClass,
        actors: {},
        // address,
        // related,
        network: theNetwork,
        delay,
        liveSlotParams: emuParams,
        networkParams,
        // addRelatedContract,
        setupFunc,
        addActor,
        waitUntil,
        currentSlot,
        mkRandomBytes,
        instantiateWithParams,
    };
    const now = new Date();
    context.waitUntil(now);
    return context;
}
function mkRandomBytes(
    this: HeliosTestingContext<any, any>,
    length: number
): number[] {
    if (!this.randomSeed)
        throw new Error(
            `test must set context.randomSeed for deterministic randomness in tests`
        );
    if (!this.rand) this.rand = helios.Crypto.rand(this.randomSeed);

    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
        bytes.push(Math.floor(this.rand() * 256));
    }
    return bytes;
}

function addActor(
    this: HeliosTestingContext<any, any>,
    roleName: string,
    walletBalance: bigint
) {
    if (this.actors[roleName])
        throw new Error(`duplicate role name '${roleName}'`);

    //! it instantiates a wallet with the indicated balance pre-set
    const a = this.network.createWallet(walletBalance);

    //! it makes collateral for each actor, above and beyond the initial balance,
    //  ... so that the full balance is spendable and the actor can immediately
    //  ... engage in smart-contract interactions.
    this.network.createUtxo(a, 5n * ADA);

    this.network.tick(BigInt(2));

    this.actors[roleName] = a;
    return a;
}

function currentSlot(this: HeliosTestingContext<any, any>) {
    return this.liveSlotParams.liveSlot;
}

function waitUntil(this: HeliosTestingContext<any, any>, time: Date) {
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
