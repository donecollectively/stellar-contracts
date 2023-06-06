import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
} from "vitest";
import { CommunityTreasury } from "../src/CommunityTreasury"

// import {
//     Address,
//     Assets,
//     ByteArrayData,
//     ConstrData,
//     Datum,
//     hexToBytes,
//     IntData,
//     ListData,
//     NetworkEmulator,
//     NetworkParams,
//     Program,
//     Tx,
//     TxOutput,
//     Value,
// } from "@hyperionbt/helios";

import {
    ADA,
    HeliosTestingContext,
    addTestContext,
    mkContext,
} from "./HeliosTestingContext.js";

console.log(CommunityTreasury)
type localTC = HeliosTestingContext<CommunityTreasury>
const it = itWithContext<localTC>;

const xit = it.skip //!!! todo: update this when vitest can have skip<HeliosTestingContext>
        //!!! until then, we need to use if(0) it(...) : (
        // ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

const minAda = 2n * ADA; // minimum needed to send an NFT

describe("community treasury manager", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, CommunityTreasury);

        context.addActor("tina", 1300n * ADA);
        context.addActor("tom", 130n * ADA);
        context.addActor("tracy", 13n * ADA);
        // context.addActor("bob", 11n * ADA)
    });

    describe("baseline capabilities", () => {
        it("gets expected wallet balances", async (context: localTC) => {
            const {
                network,
                params,
                actors: { tina },
                address,
            } = context;
            const aliceUtxos = await network.getUtxos(tina.address);
            const tinaMoney = await tina.utxos;
            expect(tinaMoney.length).toBe(2);
            expect(tinaMoney[0].value.assets.nTokenTypes).toBe(0);
            expect(tinaMoney[0].value.assets.isZero).toBeTruthy();
            expect(tinaMoney[1].value.assets.isZero).toBeTruthy();
    
            expect(tinaMoney[0].value.lovelace).toBe(1300n * ADA);
            expect(tinaMoney[1].value.lovelace).toBe(5n * ADA);
        });

        it("can wait for future slots", async (context: localTC) => {
            const {
                // actors: { alice, bob },
            } = context;

            const waitedSlots = context.waitUntil(
                new Date(new Date().getTime() + 100 * seconds)
            );

            expect(waitedSlots).toBeGreaterThan(90);
            expect(waitedSlots).toBeLessThan(100);    
        });

        it("can access types in the contract", async(context: localTC) => {
            const strella = context.instantiateWithParams({})
            const cc = strella.configuredContract
            const {types: {Redeemer}} = cc
            console.log({Redeemer});
            debugger
        });
    });
    describe("params", () => {
        it("nonce helps determine the treasury address", async () => {
            throw new Error(`todo`)
        });
        it("trustees helps determine the treasury address", async () => {
            throw new Error(`todo`)        
        });
    });
    describe("chartering the treasury", () => {
        it("allocates an address for a community treasury using params", async (context: localTC) => {
            const {tina, tom, tracy} = context.actors;
            context.randomSeed = 42;
            const nonce = context.mkRandomBytes(16);

            const treasury = context.instantiateWithParams({
                nonce,
                trustees: [ tina.address, tom.address, tracy.address ]
            })

        });
        it("initializes the treasury contract with a trustee list", async () => {
            throw new Error(`todo`)

        });
        it("creates an initial 'charter utxo' in the treasury contract", async () => {
            throw new Error(`todo`)
        
        });
        it("allocates a unique address for the community coin-factory (minting contract) based on the charter utxo", async () => {
            throw new Error(`todo`)
        
        });
        it("mints a singular unique charter token using the charter utxo", async () => {
            throw new Error(`todo`)
            
        });
    });

    it("has expected setup", async (context: localTC) => {
        // console.log(aliceMoney[1]?.value.dump())
        // .dump().lovelace).toBe('5000000')
    });

    if (0) it("doesn't let randos issue tokens", async ({
        network,
        actors: { alice, bob },
        address,
    }) => {

    });

    if (0) it("lets the owner issue tokens", async ({
        network,
        actors: { owner },
    }) => {
        // expect(something...).toBe();
    });

    xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {
        
    });

});

const seconds = 1000; // milliseconds
