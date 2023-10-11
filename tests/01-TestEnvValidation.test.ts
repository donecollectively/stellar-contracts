import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
} from "@hyperionbt/helios";

import { DefaultCapoTestHelper } from "../lib/testing/DefaultCapoTestHelper";
import { ADA,
    StellarTestContext,
    addTestContext
} from "../lib/testing";
import { insufficientInputError } from "../lib/testing";

type localTC = StellarTestContext<DefaultCapoTestHelper>;
const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Test environment", async () => {
    beforeEach<localTC>(async (context) => {
        // await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("baseline test-env capabilities", () => {
        it("gets expected wallet balances for test-scenario actor", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;

            const tinaMoney = await tina.utxos;
            const tomMoney = await tom.utxos;
            const tracyMoney = await tracy.utxos;
            expect(tinaMoney.length).toBe(2);
            expect(tinaMoney[0].value.assets.nTokenTypes).toBe(0);
            expect(tinaMoney[0].value.assets.isZero).toBeTruthy();
            expect(tinaMoney[1].value.assets.isZero).toBeTruthy();

            expect(tinaMoney[0].value.lovelace).toBe(1100n * ADA);
            expect(tinaMoney[1].value.lovelace).toBe(5n * ADA);

            expect(tomMoney[0].value.lovelace).toBe(120n * ADA);

            expect(tracyMoney[0].value.lovelace).toBe(13n * ADA);
        });

        it("can split utxos", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            h.currentActor = "tom";

            const { tom } = actors;
            const tomMoney = await tom.utxos;
            const firstUtxo = tomMoney[0];

            async function tryWithSlop(margin: bigint) {
                const tx = new Tx();

                tx.addInput(firstUtxo);
                tx.addOutput(new TxOutput(tom.address, new Value(3n * ADA)));
                tx.addOutput(
                    new TxOutput(
                        tom.address,
                        new Value(firstUtxo.value.lovelace - margin)
                    )
                );
                // console.log("s2")
                return h.submitTx(tx, "force");
            }
            console.log(
                "case 1a: should work if finalize doesn't over-estimate fees"
            );
            await expect(tryWithSlop(170000n)).rejects.toThrow(
                insufficientInputError
            );
            //!!! todo: once this ^^^^^^^^^^^^^^ starts passing, the other cases below can be removed
            //    ... in favor of something like this:
            // await tryWithSlop(170000n * ADA);
            "case 1b: should work if finalize doesn't over-estimate fees "

            console.log(
            );
            await expect(tryWithSlop(5n * ADA)).rejects.toThrow(
                insufficientInputError
            );

            console.log(
                "case 2: works if we give it more margin of error in initial fee calc"
            );
            await tryWithSlop(7n * ADA);
            //!!! todo: remove case 1b, case2 after case 1a starts working right.

            const tm2 = await network.getUtxos(tom.address);

            expect(tomMoney.length).not.toEqual(tm2.length);
        });

        it("can wait for future slots", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const waitedSlots = h.waitUntil(
                new Date(new Date().getTime() + 100 * seconds)
            );

            expect(waitedSlots).toBe(100n);
        });

        //     it("can access types in the contract", async (context: localTC) => {
        //         context.randomSeed = 42;
        //         const strella = await context.instantiateWithParams({
        //             nonce: context.mkRandomBytes(16),
        //             initialTrustees: [context.actors.tina.address],
        //         });
        //         const cc = strella.scriptProgram;
        //         const {
        //             types: { Redeemer },
        //         } = cc;

        //         expect(Redeemer?.charterMint).toBeTruthy();
        //     });
    });
})

const seconds = 1000; // milliseconds


