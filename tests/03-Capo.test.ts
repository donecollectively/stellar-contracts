import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import { DefaultCapo } from "../src/DefaultCapo";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { ConfigFor } from "../src/StellarContract";
// import { RoleDefs } from "../src/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        // await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("has a singleton minting policy", () => {
        it("has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter", async (context: localTC) => {
            context.initHelper({ skipSetup: true });
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.bootstrap();

            const config: ConfigFor<DefaultCapo> = h.state.config;
            expect(config).toBeTruthy();
            const { mph, seedIndex, seedTxn } = config;

            const unspent = await network.getUtxos(actors.tina.address);
            const empty = unspent.find((x) => {
                return (
                    x.outputId.txId == seedTxn &&
                    BigInt(x.outputId.utxoIdx) == BigInt(seedIndex)
                );
            });
            expect(empty).toBeFalsy();
        });

        it("makes a different address depending on (txId, outputIndex) parameters of the Minting script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const t1: DefaultCapo = await h.bootstrap();
            const t2: DefaultCapo = await h.initialize({
                randomSeed: 43,
            });
            await h.bootstrap();

            expect(t1.mph.hex).not.toEqual(t2.mph.hex);
        });
    });

    describe("has a unique, permanent address", () => {
        it("uses the Minting Policy Hash as the sole parameter for the spending script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            try {
                const t1: DefaultCapo = await h.bootstrap();
                console.log(
                    "t1 addr                                      ",
                    t1.address
                );
                debugger;
                const t2: DefaultCapo = await h.initialize({
                    randomSeed: 43,
                });
                await h.bootstrap();
                expect(t1.address.toBech32()).not.toEqual(
                    t2.address.toBech32()
                );
            } catch (e) {
                throw e;
            }
        });
    });

    describe("has a unique, permanent charter token", () => {
        describe("mkTxnMintCharterToken()", () => {
            it("creates a unique 'charter' token, with assetId determined from minting-policy-hash+'charter'", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                // await context.delay(1000)
                try {
                    await h.initialize();
                    await h.mintCharterToken();
                } catch (e) {
                    throw e;
                }
                state.mintedCharterToken = null;
                return expect(h.mintCharterToken()).rejects.toThrow(
                    "already configured"
                );
            });
        });
    });

    describe("the charter token is always kept in the contract", () => {
        it("fails to use the charter token without the authZor token", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.initialize();
            vi.spyOn(treasury, "txnAddCharterAuthz").mockImplementation(
                async (tcx, datum) => {
                    return tcx;
                }
            );
            console.log(
                "------ mkCharterSpend (mocked out txnAddCharterAuthz)"
            );
            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(1);

            console.log("------ submit charterSpend");
            await expect(
                treasury.submit(tcx, {
                    signers: [actors.tracy, actors.tom],
                })
            ).rejects.toThrow(/missing .* authZor/);
        });
        it("builds transactions with the charter token returned to the contract", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(1);

            const treasury = context.strella!;
            const hasCharterToken = treasury.mkTokenPredicate(
                treasury.tvCharter()
            );
            expect(
                tcx.outputs.find((o: TxOutput) => {
                    return (
                        hasCharterToken(o) &&
                        o.address.toBech32() == treasury.address.toBech32()
                    );
                })
            ).toBeTruthy();

            console.log("------ submit charterSpend");
            await treasury.submit(tcx, {
                signers: [actors.tracy, actors.tom],
            });
            const u = await network.getUtxos(treasury.address);
            expect(u.find(hasCharterToken)).toBeTruthy();
        });

        it("fails to spend the charter token if it's not returned to the contract", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            await h.mintCharterToken();

            const treasury = context.strella!;
            vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                (tcx) => tcx!
            );

            const tcx: StellarTxnContext = await h.mkCharterSpendTx();
            const bogusPlace = (await actors.tina.usedAddresses)[0];
            tcx.addOutput(new TxOutput(bogusPlace, treasury.tvCharter()));

            const submitting = treasury.submit(tcx, {
                signers: [actors.tracy, actors.tom],
            });
            await expect(submitting).rejects.toThrow(
                /charter token must be returned/
            );
        });
        it.todo("can include the charter-token as a reference-input");

        it.todo(
            "keeps the charter token separate from other assets in the contract",
            async (context: localTC) => {
                //!!! implement this test after making a recipe for minting a different coin
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                await h.mintCharterToken();
                const treasury = context.strella!;
                vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                    (tcx) => tcx!
                );

                // await delay(1000);
                const tcx: StellarTxnContext = await h.mkCharterSpendTx();
                tcx.addOutput(
                    new TxOutput(treasury.address, treasury.tvCharter())
                );

                await expect(treasury.submit(tcx)).rejects.toThrow(
                    /charter token must be standalone/
                );
            }
        );
    });
});

xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
