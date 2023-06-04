import {
    Address,
    NetworkEmulator,
    NetworkParams,
    Program,
    UplcProgram,
    WalletEmulator,
} from "@hyperionbt/helios";
import { promises as fs } from "fs";
import { Vitest, vitest, TestContext } from "vitest";

type contractMap = Record<string, HeliosTestingContext>;
type actorMap = Record<string, WalletEmulator>;

export const ADA = 1_000_000n; // lovelace
export interface HeliosTestingContext {
    contract: UplcProgram;
    actors: actorMap;
    related: contractMap;
    address: Address;
    network: NetworkEmulator;
    params: NetworkParams;
    addActor: typeof addActor;
    waitUntil: typeof waitUntil;
    currentSlot: typeof currentSlot;
}

export async function addTestContext(
    context: TestContext,
    ...args: mkContextArgs
) {
    const tc = await mkContext(...args);

    Object.assign(context, tc);
}

type mkContextArgs = [scriptFile: string, related?: contractMap];
type enhancedNetworkParams = NetworkParams & {
        slotToTimestamp: typeof slotToTimestamp
}
function slotToTimestamp(s: bigint) {
    const num = parseInt(BigInt.asIntN(52, s * 1000n).toString());
    return new Date(num);
}

const preProdParams = JSON.parse(await fs.readFile("./src/preprod.json", "utf8"));
// emuParams.liveSlot;

export function mkNetwork() : [NetworkEmulator, enhancedNetworkParams] {
    const theNetwork = new NetworkEmulator();

    const emuParams = theNetwork.initNetworkParams(preProdParams) as enhancedNetworkParams ;

    emuParams.timeToSlot = function (t) {
        const seconds = BigInt(t / 1000n);
        return seconds;
    };
    emuParams.slotToTimestamp = slotToTimestamp;

    return [theNetwork, emuParams];
}

export async function mkContext(
    ...args: mkContextArgs
): Promise<HeliosTestingContext> {
    const [scriptFile, related = {}] = args;

    const script = await fs.readFile(scriptFile, "utf8");
    const optimize = false;

    const contract = Program.new(script).compile(optimize);
    let address;
    try {
        address = Address.fromValidatorHash(contract.validatorHash);
    } catch (e) {
        if (e.message !== "unexpected") throw e;

        address = Address.fromValidatorHash(contract.mintingPolicyHash);
    }
    const [theNetwork, emuParams] = mkNetwork();

    const context = {
        contract,
        actors: {},
        address,
        related,
        network: theNetwork,
        params: emuParams,
        // addRelatedContract,
        addActor,
        waitUntil,
        currentSlot,
    };
    const now = new Date();
    context.waitUntil(now);
    return context;
}

function addActor(
    this: HeliosTestingContext,
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

function currentSlot(this: HeliosTestingContext) {
    return this.params.liveSlot;
}

function waitUntil(this: HeliosTestingContext, time: Date) {
    const targetTimeMillis = BigInt(time.getTime());
    const targetSlot = this.params.timeToSlot(targetTimeMillis);
    const c = this.currentSlot();

    const slotsToWait = targetSlot - c;
    if (slotsToWait < 1) {
        throw new Error(`the indicated time is not in the future`);
    }
    console.warn(`waiting ${slotsToWait} slots -> ${time}`);

    this.network.tick(slotsToWait);
    return slotsToWait;
}
