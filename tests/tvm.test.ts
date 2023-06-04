import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    expectTypeOf,
    beforeEach,
    vi,
} from "vitest";
import { promises as fs } from "fs";
import {
    Address,
    Assets,
    ByteArrayData,
    ConstrData,
    Datum,
    hexToBytes,
    IntData,
    ListData,
    NetworkEmulator,
    NetworkParams,
    Program,
    Tx,
    TxOutput,
    Value,
} from "@hyperionbt/helios";

import {
    ADA,
    HeliosTestingContext,
    addTestContext,
    mkContext,
} from "./HeliosTestingContext.js";

const it = itWithContext<HeliosTestingContext>;
const xit = it.skip;
const describe = descrWithContext<HeliosTestingContext>;

const minAda = 2n * ADA; // minimum needed to send an NFT

describe("token vending machine", async () => {
    beforeEach<HeliosTestingContext>(async (context) => {
        await addTestContext(context, "./src/tvm.hl");

        context.addActor("issuer", 42n * ADA);
        context.addActor("alice", 13n * ADA);
        // context.addActor("bob", 11n * ADA)
    });

    it("has expected setup", async (context: HeliosTestingContext) => {
        const {
            network,
            params,
            actors: { alice, bob },
            address,
        } = context;
        const aliceUtxos = await network.getUtxos(alice.address);
        const aliceMoney = await alice.utxos;
        expect(aliceMoney.length).toBe(2);
        expect(aliceMoney[0].value.assets.nTokenTypes).toBe(0);
        expect(aliceMoney[0].value.assets.isZero).toBeTruthy();
        expect(aliceMoney[1].value.assets.isZero).toBeTruthy();

        expect(aliceMoney[0].value.lovelace).toBe(13n * ADA);
        expect(aliceMoney[1].value.lovelace).toBe(5n * ADA);

        const waitedSlots = context.waitUntil(
            new Date(new Date().getTime() + 100 * seconds)
        );
        expect(waitedSlots).toBeGreaterThan(90);
        expect(waitedSlots).toBeLessThan(100);
        // console.log(aliceMoney[1]?.value.dump())
        // .dump().lovelace).toBe('5000000')
    });


});

const seconds = 1000; // milliseconds
