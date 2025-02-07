import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import { makeTxOutput, TxOutput } from "@helios-lang/ledger";
import {
    Capo,
    StellarTxnContext,
    parseCapoJSONConfig,
    CapoWithoutSettings,
    type ConfigFor,
    TxDescription
} from "@donecollectively/stellar-contracts";

import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { expectTxnError } from "../src/testing/StellarTestHelper";
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
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("has a singleton minting policy", () => {
        it("has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter", async (context: localTC) => {
            // context.initHelper({ skipSetup: true });
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            await h.bootstrap();

            const config: ConfigFor<CapoWithoutSettings> = h.state.config;
            expect(config).toBeTruthy();
            const { mph, seedIndex, seedTxn } = config;

            const unspent = await network.getUtxos(actors.tina.address);
            const empty = unspent.find((x) => {
                return (
                    x.id.txId == seedTxn &&
                    BigInt(x.id.index) == BigInt(seedIndex)
                );
            });
            expect(empty).toBeFalsy();
        });

        it("makes a different address depending on (txId, outputIndex) parameters of the Minting script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const t1: Capo<any> = await h.bootstrap();
            const t2: Capo<any> = await h.initialize({
                randomSeed: 43,
            });
            await h.bootstrap();

            expect(t1.mph.toHex()).not.toEqual(t2.mph.toHex());
        });
    });

    describe("has a unique, permanent address", () => {
        it("uses the Minting Policy Hash as the sole parameter for the spending script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            try {
                const t1: Capo<any> = await h.bootstrap();
                console.log(
                    "t1 addr                                      ",
                    t1.address
                );
                debugger;
                const t2: Capo<any> = await h.initialize({
                    randomSeed: 43,
                });
                await h.bootstrap();
                expect(t1.address.toString()).not.toEqual(
                    t2.address.toString()
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
                const minting = h.mintCharterToken();
                // await minting
                return expect(minting).rejects.toThrow("already configured");
            });
            it("creates a dgTkn UUT for the govAuthority delegate, sent to user wallet", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                debugger;
                const treasury = await h.bootstrap();
                const tcx = await h.mintCharterToken();

                const { capoGov } = tcx.state.uuts;
                expect(
                    tcx.outputs.find((o: TxOutput) => {
                        return (
                            o.value.isGreaterOrEqual(
                                treasury.tokenAsValue(capoGov)
                            ) && o.address.isEqual(h.wallet.address)
                        );
                    })
                ).toBeTruthy();
            });

            it("creates a mintDgt UUT and deposits it in the mintDelegate contract", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const capo = await h.bootstrap();
                const tcx = await h.mintCharterToken();
                const { mintDgt } = tcx.state.uuts;

                const datum = await capo.findCharterData();
                const mintDelegate = await capo.connectDelegateWithOnchainRDLink(
                    "mintDelegate",
                    datum.mintDelegateLink
                );

                expect(
                    tcx.outputs.find((o: TxOutput) => {
                        return (
                            o.value.isGreaterOrEqual(
                                capo.tokenAsValue(mintDgt)
                            ) && o.address.isEqual(mintDelegate.address)
                        );
                    }),
                    "should find the mintDgt token"
                ).toBeTruthy();
                // test t3m2n4d
                // has the mint-delegate script ready to use as a referenceScript
                debugger;
                const findingRefScript = capo.mustFindMyUtxo(
                    "mint delegate refScript",
                    (utxo) => {
                        return (
                            utxo.output.refScript?.toString() ==
                            mintDelegate.compiledScript.toString()
                        );
                    }
                );
                await findingRefScript;
                await expect(findingRefScript).resolves.toBeTruthy();
            });

            it("includes the mintDgt script so it can be used as a referenceScript", async (context: localTC) => {
                // tested with t3m2n4d
            });
        });
    });

    describe("the charter token is always kept in the contract", () => {
        it("fails to use the charter token without the capoGov token", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const capo = await h.initialize();
            vi.spyOn(capo, "txnAddGovAuthority").mockImplementation((async (
                tcx
            ) => {
                return tcx;
            }) as any);
            console.log(
                "------ mkCharterSpend (mocked out txnAddGovAuthority)"
            );
            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(1);

            console.log("------ submit charterSpend");
            await expect(
                tcx.submit({
                    expectError: true,
                    signers: [actors.tracy.address, actors.tom.address],
                })
            ).rejects.toThrow(/missing .* capoGov/);
        });

        it("builds transactions with the charter token returned to the contract", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(2);

            const treasury = context.strella;
            const hasCharterToken = treasury.uh.mkTokenPredicate(
                treasury.tvCharter()
            );
            expect(
                tcx.outputs.find((o: TxOutput) => {
                    return (
                        hasCharterToken(o) &&
                        o.address.toString() == treasury.address.toString()
                    );
                })
            ).toBeTruthy();

            console.log("------ submit charterSpend");
            await tcx.submit({
                signers: [actors.tracy.address, actors.tom.address],
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
            tcx.addOutput(makeTxOutput(bogusPlace, treasury.tvCharter()));

            const submitting = tcx.submit({
                expectError: true,
                signers: [actors.tracy.address, actors.tom.address],
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
                    makeTxOutput(treasury.address, treasury.tvCharter())
                );

                await expect(tcx.submit(expectTxnError)).rejects.toThrow(
                    /charter token must be standalone/
                );
            }
        );
    });

    describe("the charter details can be updated by authority of the capoGov-* token", () => {
        it(" updates details of the datum", async (context: localTC) => {
            // tested with kc983ndk
            // and other cases with new mint/spend delegates
        });
    });

    describe("can handle large transactions with reference scripts", () => {
        it("creates refScript for minter during charter creation", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const tcx: Awaited<ReturnType<typeof h.mintCharterToken>> =
                h.state.mintedCharterToken;
            const minter = strella.minter;
            // console.log("             ---------- ", mintDelegate.compiledScript.toString());
            const refScriptTxD : TxDescription<any, "submitted"> = tcx.state.addlTxns.refScriptMinter as any 
            expect(
                refScriptTxD.tcx.outputs.find((txo) => {
                    return (
                        txo.refScript?.toString() ==
                        minter.compiledScript.toString()
                    );
                })
            ).toBeTruthy();
        });

        it("creates refScript for capo during charter creation", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const tcx: Awaited<ReturnType<typeof h.mintCharterToken>> =
                h.state.mintedCharterToken;

            const refScriptTxD : TxDescription<any, "submitted"> = tcx.state.addlTxns.refScriptCapo as any 

            expect(
                refScriptTxD.tcx.outputs.find((txo) => {
                    return (
                        txo.refScript?.toString() ==
                        strella.compiledScript.toString()
                    );
                })
            ).toBeTruthy();
        });

        it("creates refScript for mintDgt during charter creation", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const tcx: Awaited<ReturnType<typeof h.mintCharterToken>> =
                h.state.mintedCharterToken;
            const mintDelegate = await strella.getMintDelegate();

            const refScriptTxD : TxDescription<any, "submitted"> = tcx.state.addlTxns.refScriptMintDelegate as any 

            expect(
                refScriptTxD.tcx.outputs.find(
                    (txo) => {
                        return (
                            txo.refScript?.toString() ==
                            mintDelegate.compiledScript.toString()
                        );
                    }
                )
            ).toBeTruthy();
        });

        it("finds refScripts in the Capo's utxos", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const refScripts = await strella.findScriptReferences();
            expect(refScripts.length).toBe(3);
        });

        it("txnAttachScriptOrRefScript(): uses scriptRefs in txns on request", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const tcx = strella.mkTcx();
            const tcx2 = await strella.txnAttachScriptOrRefScript(tcx);
            expect(
                tcx2.txRefInputs[0].output.refScript?.toString()
            ).toEqual(strella.compiledScript.toString());

            const tcx3 = await strella.txnAttachScriptOrRefScript(
                tcx,
                strella.minter.compiledScript
            );
            expect(
                tcx3.txRefInputs[1].output.refScript?.toString()
            ).toEqual(strella.minter.compiledScript.toString());
                
            const tx = await tcx3.builtTx
            expect(tx.witnesses.v2RefScripts.length).toBe(2);
        });
    });
});

xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
