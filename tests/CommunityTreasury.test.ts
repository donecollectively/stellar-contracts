import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
} from "vitest";
import { CCTParams, CommunityTreasury } from "../src/CommunityTreasury";

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
import { Tx } from "@hyperionbt/helios";

// console.log(CommunityTreasury);
type localTC = HeliosTestingContext<CommunityTreasury, CCTParams>;
const it = itWithContext<localTC>;

const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
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

        context.setupFunc(async function (this: localTC) {
            this.randomSeed = 42;
            return this.instantiateWithParams({
                nonce: this.mkRandomBytes(16),
                initialTrustees: [
                    this.actors.tina.address,
                    this.actors.tom.address,
                    this.actors.tracy.address,
                ],
            });
        });
    });

    describe("baseline capabilities", () => {
        it("gets expected wallet balances", async (context: localTC) => {
            const {
                network,
                networkParams: params,
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

        it("can access types in the contract", async (context: localTC) => {
            context.randomSeed = 42;
            const strella = await context.instantiateWithParams({
                nonce: context.mkRandomBytes(16),
                initialTrustees: [context.actors.tina.address],
            });
            const cc = strella.configuredContract;
            const {
                types: { Redeemer },
            } = cc;
            // console.log({ Redeemer });
            expect( Redeemer?.charterMint ).toBeTruthy()
        });
    });
    describe("params", () => {
        it("nonce: helps determine the treasury address", async (context: localTC) => {
            const { tina, tom, tracy } = context.actors;
            context.randomSeed = 42;

            const nonce1 = context.mkRandomBytes(16);
            const initialTrustees = [tina.address, tom.address, tracy.address];

            const treasury1 = await context.instantiateWithParams({
                nonce: nonce1,
                initialTrustees,
            });
            const addr1 = treasury1.address.toHex();

            context.randomSeed = 43;
            const nonce2 = context.mkRandomBytes(16);
            const treasury2 = await context.instantiateWithParams({
                nonce: nonce2,
                initialTrustees,
            });
            const addr2 = treasury2.address.toHex();
            expect(treasury1).not.toBe(treasury2);
            // console.error({addr1, addr2, nonce1, nonce2})
            expect(addr1).not.toEqual(addr2);
        });
        it("initialTrustees: helps determine the treasury address", async (context: localTC) => {
            const { tina, tom, tracy } = context.actors;
            context.randomSeed = 42;
            const nonce = context.mkRandomBytes(16);

            const treasury1 = await context.instantiateWithParams({
                nonce,
                initialTrustees: [tina.address, tom.address, tracy.address],
            });
            const addr1 = treasury1.address.toHex();

            const treasury2 = await context.instantiateWithParams({
                nonce,
                initialTrustees: [tina.address, tom.address],
            });
            const addr2 = treasury2.address.toHex();
            expect(treasury1).not.toBe(treasury2);
            // console.error({addr1, addr2, nonce})
            expect(addr1).not.toEqual(addr2);
        });
    });
    describe("chartering the treasury", () => {
        it(
            "allocates an address for a community treasury",
            async (context: localTC) => {
                const { tina, tom, tracy } = context.actors;
                context.randomSeed = 42;
                const nonce = context.mkRandomBytes(16);

                const treasury = await context.instantiateWithParams({
                    nonce,
                    initialTrustees: [tina.address, tom.address, tracy.address],
                });
                // console.log(treasury.address.toHex());
                expect(treasury.address).toBeTruthy();

                const found = await context.network.getUtxos(treasury.address)
                expect(found.length).toBe(0);
            }
        );
        it("creates an initial 'charter utxo' in the treasury contract", async (context: localTC) => {
            const {delay} = context;
            const { tina, tom, tracy } = context.actors;

            const treasury = await context.setup!();
            const {tx, input, output} = await treasury.buildCharterUtxo(
                new Tx(), [ tina, tom, tracy ]
            );

            // console.warn("network params", context.networkParams)
            await tx.finalize(context.networkParams, input.origOutput.address);

            context.network.submitTx(tx)
            context.network.tick(1n);
            const found = await context.network.getUtxos(treasury.address)
            expect(found.length).toBe(1);
            const d =  found[0].origOutput.datum
            expect(d.hash).toEqual(output.datum.hash)
        });
        it.todo(
            "allocates a unique address for the community coin-factory (minting contract) based on the charter utxo",
            async () => {
                throw new Error(`todo`);
            }
        );
        it.todo(
            "mints a singular unique charter token using the charter utxo",
            async () => {
                throw new Error(`todo`);
            }
        );
    });

    it("has expected setup", async (context: localTC) => {
        // console.log(aliceMoney[1]?.value.dump())
        // .dump().lovelace).toBe('5000000')
    });

    if (0)
        it("doesn't let randos issue tokens", async ({
            network,
            actors: { alice, bob },
            address,
        }) => {});

    if (0)
        it("lets the owner issue tokens", async ({
            network,
            actors: { owner },
        }) => {
            // expect(something...).toBe();
        });

    xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
});

const seconds = 1000; // milliseconds
