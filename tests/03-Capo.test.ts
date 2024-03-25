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
    bytesToText,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { ConfigFor } from "../src/StellarContract";
import { dumpAny } from "../src/diagnostics";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
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
            it("creates an authZor UUT for the govAuthority delegate, sent to user wallet", async (context: localTC) => {
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
                            o.value.ge(treasury.tokenAsValue(capoGov)) &&
                            o.address.eq(h.currentActor.address)
                        );
                    })
                ).toBeTruthy();
            });

            it("creates a mintDgt UUT and deposits it in the mintDelegate contract", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const treasury = await h.bootstrap();
                const tcx = await h.mintCharterToken();
                const { mintDgt } = tcx.state.uuts;

                const datum = await treasury.findCharterDatum();
                const mintDelegate = await treasury.connectDelegateWithLink(
                    "mintDelegate",
                    datum.mintDelegateLink
                );

                expect(
                    tcx.outputs.find((o: TxOutput) => {
                        return (
                            o.value.ge(treasury.tokenAsValue(mintDgt)) &&
                            o.address.eq(mintDelegate.address)
                        );
                    }),
                    "should find the mintDgt token"
                ).toBeTruthy();
                // test t3m2n4d
                // has the mint-delegate script ready to use as a referenceScript
                debugger;
                const findingRefScript = mintDelegate.mustFindMyUtxo(
                    "mint delegate refScript",
                    (utxo) => {
                        return (
                            utxo.origOutput.refScript?.serialize() ==
                            mintDelegate.compiledScript.serialize()
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

    describe("the mint delegate token is used for enforcing minting policy", () => {
        it("builds minting txns that include the mintDgt and reference script", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            // initial mint-delegate creation creates an on-chain reference script:
            const t = await h.bootstrap();

            const tcx = new StellarTxnContext<any>();
            const tcx2 = await t.txnMintingUuts(await t.addSeedUtxo(tcx), [
                "anything",
            ]);

            const mintDelegate = await t.getMintDelegate();
            const spentDgtToken = tcx2.inputs.find(
                mintDelegate.mkAuthorityTokenPredicate()
            );
            const returnedToken = tcx2.outputs.find(
                mintDelegate.mkAuthorityTokenPredicate()
            );
            expect(spentDgtToken).toBeTruthy();
            expect(returnedToken).toBeTruthy();
            await expect(t.submit(tcx2)).resolves.toBeTruthy();

            // uses the reference script in the minting txn:
            expect(
                tcx2.txRefInputs.find(
                    (i) =>
                        i.origOutput.refScript?.serialize() ==
                        mintDelegate.compiledScript.serialize()
                )
            ).toBeTruthy();
        });

        it.todo(
            "can spend the ReferenceScript utxo and recover its minUtxo",
            async (context: localTC) => {
                // ... when the mintDgt token is retired, the ReferenceScript is also retired
                // the ReferenceScript spend (Retiring) requires the mintDgt token to be spent
                // ... the mintDgt token spend (Retiring) requires
                //   - must get govAuthz from the Capo (ref: charter token + govAuthz token)
                //   - must spend ReferenceScript datum (not back into the mint-delegate
                //   - must burn the mintDgt token?  or just as good possibly: put it into a replacement delegate script
            }
        );

        it("won't mint in a txn not including the mintDgt", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            const t = await h.bootstrap();

            const mintDelegate = await t.getMintDelegate();
            vi.spyOn(mintDelegate, "txnGrantAuthority").mockImplementation(
                async (tcx) => tcx
            );

            const tcx = await t.txnMintingUuts(
                await t.addSeedUtxo(new StellarTxnContext<any>()),
                ["anything"]
            );
            await expect(t.submit(tcx)).rejects.toThrow(/missing .*mintDgt/);
        });

        it("requires that the mintDgt datum is unmodified", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            const t = await h.bootstrap();

            const mintDelegate = await t.getMintDelegate();
            const spy = vi
                .spyOn(mintDelegate, "mkDelegationDatum")
                .mockImplementation((...args) => {
                    const [dd, s] = args;
                    const { capoAddr, mph, tn } = mintDelegate.configIn!;
                    return mintDelegate.mkDatumIsDelegation(
                        { capoAddr, mph, tn },
                        "bad change"
                    );
                });
            const tcx = await t.txnMintingUuts(
                await t.addSeedUtxo(new StellarTxnContext<any>()),
                ["anything"]
            );
            expect(spy).toHaveBeenCalled();
            console.log(
                "------ submitting bogus txn with modified delegate datum"
            );
            await expect(t.submit(tcx)).rejects.toThrow(
                // /delegation datum must not be modified/
                /modified dgtDtm/
            );
        });
    });

    describe("the charter token is always kept in the contract", () => {
        it("fails to use the charter token without the capoGov token", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const capo = await h.initialize();
            vi.spyOn(capo, "txnAddGovAuthority").mockImplementation(
                async (tcx) => {
                    return tcx;
                }
            );
            console.log(
                "------ mkCharterSpend (mocked out txnAddGovAuthority)"
            );
            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(1);

            console.log("------ submit charterSpend");
            await expect(
                capo.submit(tcx, {
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
            tcx.addOutput(new TxOutput(bogusPlace, treasury.tvCharter()));

            const submitting = treasury.submit(tcx, {
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
                    new TxOutput(treasury.address, treasury.tvCharter())
                );

                await expect(treasury.submit(tcx)).rejects.toThrow(
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

    describe("can update the minting delegate in the charter settings", () => {
        // kc983ndk
        it("can install an updated minting delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();

            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
                {}
            );
            await capo.submit(tcx);
            network.tick(1n);

            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.mintDelegateLink.uutName).not.toEqual(
                originalDatum.mintDelegateLink.uutName
            );
        });

        it("fails without the capoGov- authority uut", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const addedGovToken = vi
                .spyOn(capo, "txnAddGovAuthority")
                .mockImplementation(
                    //@ts-expect-error
                    (tcx) => tcx!
                );
            console.log(
                " ------- case 1: with mint delegate involved in the replacement"
            );
            const tcx1 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
                {}
            );
            expect(addedGovToken).toHaveBeenCalledTimes(1);
            await expect(capo.submit(tcx1)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );

            console.log(" ------- case 2: forced replacement of mint delegate");
            const tcx2 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
                {
                    forcedUpdate: true,
                }
            );
            expect(addedGovToken).toHaveBeenCalledTimes(2);
            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );
        });

        it("can force-replace the mint delegate if needed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();
            const oldMintDelegate = await capo.getMintDelegate();
            const oldPredicate = oldMintDelegate.mkAuthorityTokenPredicate();

            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
                {
                    forcedUpdate: true,
                }
            );
            await capo.submit(tcx);
            network.tick(1n);
            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.mintDelegateLink.uutName).not.toEqual(
                originalDatum.mintDelegateLink.uutName
            );

            const stillExists = await oldMintDelegate.mustFindMyUtxo("old delegate UUT",
                oldPredicate
            );
            expect(stillExists).toBeTruthy();
            const newDelegate = await capo.getMintDelegate();
            const newPredicate = newDelegate.mkAuthorityTokenPredicate();
            const newExists = await newDelegate.mustFindMyUtxo("new delegate UUT",
                newPredicate
            );
            expect(newExists).toBeTruthy();
            expect(stillExists.outputId.eq(newExists.outputId)).toBeFalsy();
        });

        it("normally requires the existing minting delegate to be involved in the replacement", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const md = await capo.getMintDelegate();
            console.log("  ----------- mocking mint delegate's txnGrantAuthority()");
            const didGrantMockedAuthority = vi.spyOn(md, "txnGrantAuthority").mockImplementation(
                async (tcx) => tcx
            );
            const didntBurnBecauseMocked = vi.spyOn(capo, "mkValuesBurningDelegateUut").mockImplementation(
                 () => []
            );
            const tcx2 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
            );
            expect(didGrantMockedAuthority).toHaveBeenCalledTimes(1);
            expect(didntBurnBecauseMocked).toHaveBeenCalledTimes(1);

            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing dgTkn mintDgt-/
            );
        });

        it("uses the new minting delegate after it is installed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const md = await capo.getMintDelegate();
            const oldPredicate = md.mkAuthorityTokenPredicate();
            console.log(
                " ------- case 1: with mint delegate involved in the replacement"
            );
            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
            );
            await capo.submit(tcx);
            network.tick(1n);
            console.log("    ---- minting with the new delegate");
            const tcx1 = await capo.txnMintingUuts(
                await capo.addSeedUtxo(new StellarTxnContext<any>()),
                ["anything"]
            );

            console.log(" ------------------------------------------------------------------\n", dumpAny(tcx1));
            expect(tcx1.outputs.find(oldPredicate)).toBeFalsy();
            const newerPredicate = (await capo.getMintDelegate()).mkAuthorityTokenPredicate();
            expect(tcx1.outputs.find(newerPredicate)).toBeTruthy();
            await expect(capo.submit(tcx1)).resolves.toBeTruthy();
            network.tick(1n);

            console.log(" ------- case 2: forced replacement of mint delegate");
            const tcx2 = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
                {
                    forcedUpdate: true,
                }                
            );
            await capo.submit(tcx2);
            network.tick(1n);
            const tcx2a = await capo.txnMintingUuts(
                await capo.addSeedUtxo(new StellarTxnContext<any>()),
                ["anything2"]
            );
            expect(tcx2a.outputs.find(oldPredicate)).toBeFalsy();
            expect(tcx2a.outputs.find(newerPredicate)).toBeFalsy();
            const newestPredicate = (await capo.getMintDelegate()).mkAuthorityTokenPredicate();
            expect(tcx2a.outputs.find(newestPredicate)).toBeTruthy();
        });

        it("can't use the old minting delegate after it is replaced", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const oldMintDelegate = await capo.getMintDelegate();
            const oldPredicate = oldMintDelegate.mkAuthorityTokenPredicate();

            // NO CASE 1 - there's no delegate UUT remaining to spend
            //  if the old delegate is replaced.
            //   console.log( " ------- case 1: with mint delegate involved in the replacement");
            console.log(" ------- case 2: forced replacement of mint delegate");
            const tcx = await capo.mkTxnUpdatingMintDelegate(
                {
                    strategyName: "default",
                },
                {
                    forcedUpdate: true,
                }
            );
            await capo.submit(tcx);
            network.tick(1n);

            vi.spyOn(capo, "getMintDelegate").mockImplementation(async () => {
                return oldMintDelegate;
            });
            const tcx2 = await capo.txnMintingUuts(
                await capo.addSeedUtxo(new StellarTxnContext<any>()),
                ["anything"]
            );
            expect(tcx2.outputs.find(oldPredicate)).toBeTruthy();

            await expect(capo.submit(tcx2)).rejects.toThrow(/missing .*mintDgt/);
        });
    });

    describe("can update the spending delegate in the charter settings", () => {
        it("can install an updated spending delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();

            const tcx = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "default",
                },
                {}
            );
            await capo.submit(tcx);
            network.tick(1n);

            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.spendDelegateLink.uutName).not.toEqual(
                originalDatum.spendDelegateLink.uutName
            );
        });

        it("fails without the capoGov- authority uut", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();
            const addedGovToken = vi
                .spyOn(capo, "txnAddGovAuthority")
                .mockImplementation(
                    //@ts-expect-error
                    (tcx) => tcx!
                );
            console.log(
                " ------- case 1: with spend delegate involved in the replacement"
            );
            const tcx1 = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "default",
                },
                {}
            );
            expect(addedGovToken).toHaveBeenCalledTimes(1);
            await expect(capo.submit(tcx1)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );

            console.log(" ------- case 2: forced replacement of spend delegate");
            const tcx2 = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "default",
                },
                {
                    forcedUpdate: true,
                }
            );
            expect(addedGovToken).toHaveBeenCalledTimes(2);
            await expect(capo.submit(tcx2)).rejects.toThrow(
                /missing dgTkn capoGov-/
            );        
        });

        it("can force-replace the spending delegate if needed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
                        
            const capo = await h.bootstrap();
            const originalDatum = await capo.findCharterDatum();
            const oldSpendDelegate = await capo.getSpendDelegate();
            const oldPredicate = oldSpendDelegate.mkAuthorityTokenPredicate();

            const tcx = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "default",
                },
                {
                    forcedUpdate: true,
                }
            );
            await capo.submit(tcx);
            network.tick(1n);
            const updatedDatum = await capo.findCharterDatum();
            expect(updatedDatum.spendDelegateLink.uutName).not.toEqual(
                originalDatum.spendDelegateLink.uutName
            );

            const stillExists = await oldSpendDelegate.mustFindMyUtxo("old delegate UUT",
                oldPredicate
            );
            expect(stillExists).toBeTruthy();
            const newDelegate = await capo.getSpendDelegate();
            const newPredicate = newDelegate.mkAuthorityTokenPredicate();
            const newExists = await newDelegate.mustFindMyUtxo("new delegate UUT",
                newPredicate
            );
            expect(newExists).toBeTruthy();
            expect(stillExists.outputId.eq(newExists.outputId)).toBeFalsy();            
        });
        
        it("normally requires the existing spending delegate to be involved in the replacement", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;
            
            const capo = await h.bootstrap();

            const sd = await capo.getSpendDelegate();
            console.log("  ----------- mocking spend delegate's txnGrantAuthority()");
            const didGrantMockedAuthority = vi.spyOn(sd, "txnGrantAuthority").mockImplementation(
                async (tcx) => tcx
            );
            const didntBurnBecauseMocked = vi.spyOn(capo, "mkValuesBurningDelegateUut").mockImplementation(
                 () => []
            );
            const tcx2 = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "default",
                },
            );
            expect(didGrantMockedAuthority).toHaveBeenCalledTimes(1);
            expect(didntBurnBecauseMocked).toHaveBeenCalledTimes(1);

            const submission = capo.submit(tcx2);
            await expect(submission).rejects.toThrow(
                /* \X matches any char including line breaks */
                new RegExp(`expected: ${bytesToText(sd.authorityTokenName)} -1`)
            );
            await expect(submission).rejects.toThrow(
                /\X*mismatch in UUT mint/
            );
        });

        it.todo("TODO uses the new spending delegate after it is installed", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const capo = await h.bootstrap();

            const sd = await capo.getSpendDelegate();
            const oldPredicate = sd.mkAuthorityTokenPredicate();
            console.log(
                " ------- case 1: with spend delegate involved in the replacement"
            );
            const tcx = await capo.mkTxnUpdatingSpendDelegate(
                {
                    strategyName: "default",
                },
            );
            await capo.submit(tcx);
            network.tick(1n);
            console.log("    ---- spending with the new delegate");

            // TODO: Make a different txn type for delegated-spend (config record?)
            const tcx1 = await capo.txnSpendingUuts(
                await capo.addSeedUtxo(new StellarTxnContext<any>()),
                ["anything"]
            );

            console.log(" ------------------------------------------------------------------\n", dumpAny(tcx1));
            expect(tcx1.outputs.find(oldPredicate)).toBeFalsy();
            const newerPredicate = (await capo.getSpendDelegate()).mkAuthorityTokenPredicate();
            expect(tcx1.outputs.find(newerPredicate)).toBeTruthy();
            await expect(capo.submit(tcx1)).resolves.toBeTruthy();            
        });

        it.todo("TODO: can't use the old spending delegate after it is replaced", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            // const strella =
            await h.bootstrap();
        });
    });

    // describe("can add invariant minting delegates to the charter settings", () => {
    //     it("can add a minting invariant", async (context: localTC) => {
    //         // prettier-ignore
    //         const {h, h:{network, actors, delay, state} } = context;
    //           // const strella =
    //         await h.bootstrap();
    //     });
    //
    //     it("fails without the capoGov- authority uut", async (context: localTC) => {
    //         // prettier-ignore
    //         const {h, h:{network, actors, delay, state} } = context;
    //           // const strella =
    //         await h.bootstrap();
    //     });
    //
    //     it("cannot change mint invariants when updating other charter settings", async (context: localTC) => {
    //         // prettier-ignore
    //         const {h, h:{network, actors, delay, state} } = context;
    //           // const strella =
    //         await h.bootstrap();
    //     })
    //     it("can never remove a mint invariants after it is added", async (context: localTC) => {
    //         // prettier-ignore
    //         const {h, h:{network, actors, delay, state} } = context;
    //           // const strella =
    //         await h.bootstrap();
    //     });
    //     it("always enforces new mint invariants after they are added", async (context: localTC) => {
    //         // prettier-ignore
    //         const {h, h:{network, actors, delay, state} } = context;
    //           // const strella =
    //         await h.bootstrap();
    //     });
    // });

    describe("can handle large transactions with reference scripts", () => {
        it("creates refScript for minter during charter creation", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const tcx: Awaited<ReturnType<typeof h.mintCharterToken>> =
                h.state.mintedCharterToken;
            const minter = strella.minter;
            // console.log("             ---------- ", mintDelegate.compiledScript.toString());
            expect(
                tcx.state.addlTxns.refScriptMinter.tcx.outputs.find((txo) => {
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

            expect(
                tcx.state.addlTxns.refScriptCapo.tcx.outputs.find((txo) => {
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
            // console.log("             ---------- ", mintDelegate.compiledScript.toString());
            expect(
                tcx.state.addlTxns.refScriptMintDelegate.tcx.outputs.find(
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
            expect(refScripts.length).toBe(2);
        });

        it("txnAttachScriptOrRefScript(): uses scriptRefs in txns on request", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const tcx = new StellarTxnContext<any>();
            const tcx2 = await strella.txnAttachScriptOrRefScript(tcx);
            expect(
                tcx2.txRefInputs[0].origOutput.refScript?.validatorHash.eq(
                    strella.compiledScript.validatorHash
                )
            ).toBeTruthy();
            const tcx3 = await strella.txnAttachScriptOrRefScript(
                tcx,
                strella.minter.compiledScript
            );
            expect(
                tcx3.txRefInputs[1].origOutput.refScript?.mintingPolicyHash.eq(
                    strella.minter.compiledScript.mintingPolicyHash
                )
            ).toBeTruthy();
            expect(tcx3.tx.dump().witnesses.refScripts.length).toBe(2);
        });
    });
});

xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
