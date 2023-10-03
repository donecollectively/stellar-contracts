import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import { DefaultCapo } from "../lib/DefaultCapo";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../lib/StellarTxnContext";
import {
    ADA,
    StellarTestContext,
    addTestContext,
} from "../lib/testing";
import { DefaultCapoTestHelper } from "../lib/testing/DefaultCapoTestHelper";
// import { RoleDefs } from "../lib/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

const notEnoughSignaturesRegex = /not enough trustees.*have signed/;
const wrongMinSigs = /minSigs can't be more than the size of the trustee-list/;
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
            const seedTxn = await h.mkSeedUtxo().catch((e) => {
                throw e;
            });
            await h.setup({
                seedTxn,
                seedIndex: 0n,
            });

            const unspent = await network.getUtxos(actors.tina.address);
            const empty = unspent.find((x) => {
                return x.txId == seedTxn && BigInt(x.utxoIdx) == 0n;
            });
            expect(empty).toBeFalsy();
        });

        it("makes a different address depending on (txId, outputIndex) parameters of the Minting script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const t1: DefaultCapo = await h.setup();
            const t2: DefaultCapo = await h.setup({
                randomSeed: 43,
                seedIndex: 1n,
            });

            expect(
                t1.connectMintingScript(t1.getMinterParams()).mintingPolicyHash
                    ?.hex
            ).not.toEqual(
                t2.connectMintingScript(t2.getMinterParams()).mintingPolicyHash
                    ?.hex
            );
        });
    });

    describe("has a unique, permanent address", () => {
        it("uses the Minting Policy Hash as the sole parameter for the spending script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            try {
                const t1: DefaultCapo = await h.setup();
                const t2: DefaultCapo = await h.setup({
                    randomSeed: 43,
                    seedIndex: 1n,
                });
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
                    await h.setup();
                    await h.mintCharterToken();
                } catch (e) {
                    throw e;
                }
                state.mintedCharterToken = null;
                return expect(h.mintCharterToken()).rejects.toThrow(
                    "already spent"
                );
            });

            it("doesn't work with a different spent utxo", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                // await context.delay(1000)
                const treasury = await h.setup();

                const wrongUtxo = (await actors.tracy.utxos).at(-1);

                vi.spyOn(
                    treasury,
                    "mustGetContractSeedUtxo"
                ).mockImplementation(
                    //@ts-expect-error this wrong utxo can be undefined or just wrong
                    async () => {
                        return wrongUtxo;
                    }
                );
                await expect(h.mintCharterToken()).rejects.toThrow(
                    "seed utxo required"
                );
            });
        });
    });

    describe("the charter token is always kept in the contract", () => {
        it("builds transactions with the charter token returned to the contract", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            await h.mintCharterToken();
            const treasury = context.strella!;

            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(1);
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
