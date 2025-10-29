const smoke = process.env.SMOKE || 0;

import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import { makeTxOutput, makeValue } from "@helios-lang/ledger";
import { Value } from "@helios-lang/ledger";

import { 
    CapoMinter, 
    UutName ,
    hasAllUuts, mkValuesEntry, uutPurposeMap
} from "@donecollectively/stellar-contracts";
import * as utils from "../src/utils";

import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";


type localTC = StellarTestContext<
    DefaultCapoTestHelper<CapoCanMintGenericUuts>
>;
const wrongMinSigs = /minSigs can't be more than the size of the trustee-list/;
const notEnoughSignaturesRegex = /not enough trustees.*have signed/;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;
type smokeTestType = typeof it;
const smokeTest = (smoke ? fit : it) as smokeTestType;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(CapoCanMintGenericUuts)
        );
    });

    describe("UUTs for contract utility", () => {
        it.todo("🟥 TEST: doesn't mint a uut without spending the seed utxo");

        smokeTest(
            "won't create a UUT without the minting delegate's involvement",
            async (context: localTC) => {
                // prettier-ignore
                const {h, h: { network, actors, delay, state }} = context;
                const capo = await h.initialize();
                const { tina, tom, tracy } = actors;

                await h.mintCharterToken();
                // await delay(1000);
                type testSomeThing = "testSomeThing";

                const mintDelegate = await capo.getMintDelegate();
                {
                    vi.spyOn(
                        mintDelegate,
                        "txnGrantAuthority"
                    ).mockImplementation(async (tcx) => tcx);
                }

                const tcx1a = await capo.tcxWithSeedUtxo(h.mkTcx());
                const purposes = ["testSomeThing"];
                const tcx1b = await capo.txnMintingUuts(tcx1a, purposes, {
                    mintDelegateActivity:
                    mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {purposes}),
                });

                const uutVal = capo.uutsValue(tcx1b.state.uuts!);
                tcx1b.addOutput(makeTxOutput(tina.address, uutVal));
                await expect(
                    tcx1b.submitAll({
                        signers: [tom.address, tina.address, tracy.address],
                        expectError: true,
                    })
                ).rejects.toThrow(/missing.*mintDgt/);
            }
        );

        it("works when the seed utxo has a large utxoIdx", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const strella = await h.bootstrap();
            const utxos = await h.wallet.utxos;
            const tcx = h.mkTcx().withName("creates a high-indexed utxo");
            let totalHeld: Value = makeValue(0n * ADA);

            // no need to add a bunch of inputs; the wallet will find "spares" to serve the needed value
            //xxx for (const u of utxos) {
            //xxx     tcx.addInput(u);
            //xxx     totalHeld = totalHeld.add(u.value);
            //xxx }
            
            const tinyValue = 1n * ADA;
            const collateralValue = 5n * ADA;
            for (let i = 0; i < 44; i++) {
                tcx.addOutput(makeTxOutput(actors.tracy.address, 1n * ADA));
            }
            //! when the current actor has only outputs with high txo-index:
            tcx.addOutput(makeTxOutput(h.wallet.address, tinyValue));
            tcx.addOutput(makeTxOutput(h.wallet.address, collateralValue));
            tcx.addOutput(makeTxOutput(h.wallet.address, collateralValue));
            await tcx.submitAll();
            network.tick(1);
            console.log("-------------- minting UUT from high-index txo");

            type testSomeThing = "testSomeThing";

            const mintDelegate = await strella.getMintDelegate();
            const purposes = ["testSomeThing"];
            const tcx2a = await strella.tcxWithSeedUtxo(
                h.mkTcx().withName("minting UUT from high-index txo")
            );
            const tcx2b = await strella.txnMintingUuts(tcx2a, purposes, {
                mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx2a, {purposes}),
            });
            return tcx2b.submitAll();
        });

        it("requires the charter to be used as reference input", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.bootstrap();
            const { tina, tom, tracy } = actors;

            type testSomeThing = "testSomeThing";
            const tcx1 = h.mkTcx();
            const spy = vi
                .spyOn(capo, "tcxWithCharterRef")
                .mockImplementation(async (tcx: any) => {
                    return tcx;
                });

            {
                const charter = await capo.mustFindCharterUtxo();
                const program = (await capo.asyncCompiledScript())!;

                tcx1.addScriptProgram(program);
                tcx1.addInput(charter, capo.activityUsingAuthority());
                const datum = charter.datum;
                if (!datum) throw new Error("missing datum");
                capo.txnKeepCharterToken(tcx1, datum);

                await capo.txnAddGovAuthorityTokenRef(tcx1);
                expect(spy).toHaveBeenCalled();
            }
            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.tcxWithSeedUtxo(tcx1);
            const purposes = ["testSomeThing"];
            const tcx1b = await capo.txnMintingUuts(tcx1a, purposes, {
                mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {purposes}),
            });

            const uutVal = capo.uutsValue(tcx1b.state.uuts!);
            tcx1b.addOutput(makeTxOutput(tina.address, uutVal));
            await expect(
                tcx1.submitAll({
                    signers: [tom.address, tina.address, tracy.address],
                    expectError: true,
                })
            ).rejects.toThrow(/(Missing charter in required ref_inputs|charter is from inputs!)/);
        });

        smokeTest(
            "fails when the mint-delegate dgTkn isn't returned",
            async (context: localTC) => {
                // prettier-ignore
                const {h, h: { network, actors, delay, state }} = context;
                const capo = await h.initialize();
                const { tina, tom, tracy } = actors;

                await h.mintCharterToken();
                // await delay(1000);
                type testSomeThing = "testSomeThing";

                // const tcx2 = await t.txnAddCharterAuthorityTokenRef(tcx);
                const mintDelegate = await capo.getMintDelegate();
                const mock = vi
                    .spyOn(mintDelegate, "txnReceiveAuthorityToken")
                    .mockImplementation(async (tcx) => tcx);

                const purposes = ["testSomeThing"];
                const tcx1a = await capo.tcxWithSeedUtxo(h.mkTcx());
                const tcx1b = await capo.txnMintingUuts(tcx1a, purposes, {
                    mintDelegateActivity:
                    mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {purposes}),
                });

                expect(mock).toHaveBeenCalled();

                const uutVal = capo.uutsValue(tcx1b.state.uuts!);
                tcx1b.addOutput(makeTxOutput(tina.address, uutVal));
                await expect(
                    tcx1b.submitAll({
                        signers: [tom.address, tina.address, tracy.address],
                        expectError: true,
                    })
                ).rejects.toThrow(/dgTkn not returned/);
            }
        );

        it("can create a UUT and send it anywhere", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.initialize();
            const { tina, tom, tracy } = actors;

            await h.mintCharterToken();
            // await delay(1000);

            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["testSomeThing"];
            const tcx1b = await capo.txnMintingUuts(tcx1a, purposes, {
                mintDelegateActivity:
                    mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {
                        purposes,
                    }),
            });

            const uutVal = capo.uutsValue(tcx1b.state.uuts!);
            tcx1a.addOutput(makeTxOutput(tina.address, uutVal));
            await tcx1a.submitAll({
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1);

            const hasNamedToken = capo.uh.mkTokenPredicate(uutVal);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.output.value.isGreaterOrEqual(uutVal)).toBeTruthy();
        });

        it("can create multiple UUTs", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.initialize();
            const { tina, tom, tracy } = actors;

            await h.mintCharterToken();

            type fooAndBar = "foo" | "bar";
            const tcx1 = h.mkTcx<hasAllUuts<fooAndBar>>();

            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.tcxWithSeedUtxo(tcx1);
            const purposes = ["bar", "foo"];
            const tcx1b = await capo.txnMintingUuts(tcx1a, purposes, {
                mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {purposes}),
            });

            // await delay(4000);
            const uuts = capo.uutsValue(tcx1b.state.uuts!);

            tcx1b.addOutput(makeTxOutput(tina.address, uuts));
            await tcx1b.submitAll({
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1);

            const hasNamedToken = capo.uh.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.output.value.isGreaterOrEqual(uuts)).toBeTruthy();
        });

        it("fills tcx.state.uuts with purpose-keyed unique token-names", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.initialize();
            const { tina, tom, tracy } = actors;

            await h.mintCharterToken();
            // await delay(1000);

            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.tcxWithSeedUtxo(h.mkTcx());

            const purposes = ["bar", "foo"];
            const tcx1b = await capo.txnMintingUuts(tcx1a, purposes, {
                mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {purposes}),
            });

            const uuts = capo.uutsValue(tcx1b.state.uuts!);

            //! fills state.uuts with named
            expect(tcx1b.state.uuts?.foo).toBeTruthy();
            expect(tcx1b.state.uuts?.bar).toBeTruthy();

            tcx1b.addOutput(makeTxOutput(tina.address, uuts));
            await tcx1b.submitAll({
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1);

            const hasNamedToken = capo.uh.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.output.value.isGreaterOrEqual(uuts)).toBeTruthy();
        });

        it("won't mint multiple UUTs of the same name", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.initialize();
            const { tina, tom, tracy } = actors;

            const m: CapoMinter = capo.minter!;

            await h.mintCharterToken();
            // await delay(1000);

            const noMultiples = "multiple-is-bad";
            type uniqUutMap = typeof noMultiples;

            const mintDelegate = await capo.getMintDelegate();

            if (true) {
                console.log(
                    "-------- case 1: using the txn-helper to indicate duplicate 'purpose' inputs"
                );
                const purposes1 = [noMultiples, noMultiples];
                const tcx1a = await capo.tcxWithSeedUtxo(h.mkTcx());
                const tcx1b = await capo.txnMintingUuts(tcx1a, purposes1, {
                    mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx1a, {purposes: purposes1}),
                });

                const uut = capo.uutsValue(tcx1b.state.uuts!);

                tcx1b.addOutput(makeTxOutput(tina.address, uut));
                await expect(
                    tcx1b.submitAll({
                        signers: [tom.address, tina.address, tracy.address],
                        expectError: true,
                    })
                ).rejects.toThrow(/mismatch in UUT mint/);
                network.tick(1);
            }
            const spy = vi.spyOn(capo, "mkUutValuesEntries");
            if (true) {
                console.log(
                    "------ case 2: directly creating the transaction with >1 tokens in mint"
                );
                const tcx2 = h.mkTcx<hasAllUuts<uniqUutMap>>();
                // await t.txnAddCharterAuthorityTokenRef(tcx2);

                spy.mockImplementation(
                    //@ts-expect-error
                    function (f: uniqUutMap) {
                        return [
                            mkValuesEntry(
                                f["multiple-is-bad"],
                                BigInt(2)
                            ),
                        ];
                    }
                );

                const purposes2 = [noMultiples];
                const tcx2a = await capo.tcxWithSeedUtxo(tcx2);
                const tcx2b = await capo.txnMintingUuts(tcx2a, purposes2, {
                    mintDelegateActivity:
                    mintDelegate.activity.MintingActivities.mintingUuts(tcx2a, {purposes: purposes2}),
                });

                const uut2 = capo.uutsValue(tcx2b.state.uuts!);

                tcx2b.addOutput(makeTxOutput(tina.address, uut2));
                await expect(
                    tcx2b.submitAll({
                        signers: [tom.address, tina.address, tracy.address],
                        expectError: true,
                    })
                ).rejects.toThrow(/mismatch in UUT mint/);
                network.tick(1);
            }
            // console.log(
            //     "------ case 3: directly creating the transaction with multiple mint entries"
            // );
            // // await t.txnAddCharterAuthorityTokenRef(tcx3);

            // // !!! invalid minting structure; ledger should reject this out of hand, due
            // // ... to having multiple entries for the same token-name.
            // spy.mockImplementation(
            //     //@ts-expect-error
            //     function (f: uniqUutMap) {
            //         return [
            //             this.mkValuesEntry(f["multiple-is-bad"], BigInt(1)),
            //             this.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
            //         ];
            //     }
            // );
 
            // const purposes = [noMultiples];
            // const tcx3 = await capo.tcxWithSeedUtxo(h.mkTcx());
            // const tcx3a = await capo.txnMintingUuts(tcx3, purposes, {
            //     mintDelegateActivity:
            //       mintDelegate.activity.MintingActivities.mintingUuts(tcx3, {purposes}),
            // });

            // const uut3 = capo.uutsValue(tcx3a.state.uuts!);

            // tcx3a.addOutput(makeTxOutput(tina.address, uut3));
            // await expect(
            //     tcx3a.submitAll({
            //         signers: [tom.address, tina.address, tracy.address],
            //         expectError: true,
            //     })
            // ).rejects.toThrow(/UUT duplicate purpose/);
            // network.tick(1);
        });

        it("won't mint extra UUTs", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.initialize();
            const { tina, tom, tracy } = actors;

            await h.mintCharterToken();
            // await delay(1000);

            type hasSomethingUut = { ["testSomeThing"]: UutName };

            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const m: CapoMinter = capo.minter!;

            const spy = vi.spyOn(capo, "mkUutValuesEntries");
            spy.mockImplementation(
                function (f) {
                    return [
                        mkValuesEntry(f["testSomeThing"].name, BigInt(1)),
                        mkValuesEntry("something-else", BigInt(1)),
                    ];
                }
            );

            const mintDelegate = await capo.getMintDelegate();
            const tcx = await capo.tcxWithSeedUtxo(h.mkTcx());
            const purposes = ["testSomeThing"];
            const tcx2 = await capo.txnMintingUuts(tcx, purposes, {
                // minterActivity: capo.activityUsingAuthority(),
                // usingMintDelegateActivity: capo.activityUsingAuthority(),
                mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx, {purposes}),
            });
            const uut = capo.uutsValue(tcx2);

            tcx2.addOutput(makeTxOutput(tina.address, uut));
            expect(spy).toHaveBeenCalled();
            await expect(
                tcx2.submitAll({
                    signers: [tom.address, tina.address, tracy.address],
                    expectError: true,
                })
            ).rejects.toThrow(/mismatch in UUT mint/);
            network.tick(1);
        });
    });

    // todo: Move these to a custom minter test that actually has a burning use-case.
    describe.skip("burning UUTs", () => {
        type testSomeThing = "testSomeThing";

        async function setup(context: localTC) {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const capo = await h.initialize();
            const { tina, tom, tracy } = actors;

            await h.mintCharterToken();
            const mintDelegate = await capo.getMintDelegate();
            const tcx = await capo.tcxWithSeedUtxo(h.mkTcx());

            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const tcx2 = await capo.txnMintingUuts(tcx, ["testSomeThing"], {
                mintDelegateActivity:
                mintDelegate.activity.MintingActivities.mintingUuts(tcx, {purposes: ["testSomeThing"]}),
            });

            const uutVal = capo.uutsValue(tcx2.state.uuts!);
            tcx2.addOutput(makeTxOutput(tina.address, uutVal));
            await tcx2.submitAll({
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1);

            return tcx2;
        }

        it.skip("Out of scope: can't burn a UUT without the minting delegate", async (context: localTC) => {
            // generic UUT burning isn't provided by the library
            // retiring an old delegate UUT can be a specfic case when such a burn
            // would be relevant, and validated with regard to that specific case.

            // other application-specific cases for UUT burning should likewise
            // be validated in the context of the specific application, by activities
            // on the minting delegate, or possibly by delegating that verification
            // to another application-specific delegate (for example, a "delete" activity
            // on a delegated-datum controller).

            // prettier-ignore
            // const {h, h: { network, actors, delay, state }} = context;
            // const capo = await h.initialize();
            // const { tina, tom, tracy } = actors;

            // const tcx = await setup(context);

            // const { testSomeThing } = tcx.state.uuts;

            // const uutUtxo = await capo.uh.findActorUtxo(
            //     "theUut",
            //     capo.uh.mkTokenPredicate(capo.mph, testSomeThing.name)
            // );
            // expect(uutUtxo).toBeTruthy();
            // console.log("---- test will fail to burn a UUT with no delegate");

            // const burnTcx = h.mkTcx<hasAllUuts<testSomeThing>>()
            // await burnTcx.addInput(uutUtxo!);

            // const mintDgt = await capo.getMintDelegate();
            // let mock = vi
            //     .spyOn(mintDgt, "txnGrantAuthority")
            //     .mockImplementation(async (tcx) => tcx);

            // const bTcx2 = await capo.txnBurnUuts(burnTcx, [testSomeThing]);
            // expect(mock).toHaveBeenCalled();
            // const submitting = capo.submit(bTcx2, {
            //     signers: [tom.address, tina.address, tracy.address],
            // });
            // await expect(submitting).rejects.toThrow(
            //     /missing.*delegat.*mintDgt/
            // );
        });

        it.skip("Out of scope: can burn a UUT, if approved by the minting delegate", async (context: localTC) => {
            // prettier-ignore
            // const {h, h: { network, actors, delay, state }} = context;
            // const capo = await h.initialize();
            // const { tina, tom, tracy } = actors;

            // const tcx = await setup(context);

            // const { testSomeThing: tst } = tcx.state.uuts;

            // const uutUtxo = await capo.uh.findActorUtxo(
            //     "theUut",
            //     capo.uh.mkTokenPredicate(capo.mph, tst.name)
            // );
            // expect(uutUtxo).toBeTruthy();
            // console.log("---- test will burn a UUT  with delegate approval");

            // const burnTcx = h.mkTcx<hasAllUuts<testSomeThing>>();
            // burnTcx.addInput(uutUtxo!);

            // const bTcx2 = await capo.txnBurnUuts(burnTcx, [tst]);
            // const submitting = capo.submit(bTcx2, {
            //     signers: [tom.address, tina.address, tracy.address],
            // });
            // await expect(submitting).resolves.toBeTruthy();
        });

        it.skip("Out of scope: burns only the UUTs identified in the Activity/redeemer", async (context: localTC) => {
            // prettier-ignore
            // const {h, h: { network, actors, delay, state }} = context;
            // const capo = await h.initialize();
            // const { tina, tom, tracy } = actors;

            // const tcx = await setup(context);
            // const tcx2 = await setup(context);
            // const { testSomeThing: tst } = tcx.state.uuts;
            // const { testSomeThing: tst2 } = tcx2.state.uuts;

            // const uutUtxo = await capo.uh.findActorUtxo(
            //     "theUut",
            //     capo.uh.mkTokenPredicate(capo.mph, tst.name)
            // );
            // expect(uutUtxo).toBeTruthy();
            // console.log("---- test will burn a UUT  with delegate approval");

            // const uutUtxo2 = await capo.uh.findActorUtxo(
            //     "theUut",
            //     capo.uh.mkTokenPredicate(capo.mph, tst2.name)
            // );
            // expect(uutUtxo).toBeTruthy();
            // const burnTcx = h.mkTcx<hasAllUuts<testSomeThing>>();
            // burnTcx.addInput(uutUtxo!);
            // burnTcx.addInput(uutUtxo2!);

            // const minter = capo.minter!;
            // const activityBurningUuts = minter.activityBurningUuts.bind(minter);
            // vi.spyOn(minter, "activityBurningUuts").mockImplementation(
            //     (tn1, tn2) => activityBurningUuts(tn1)
            // );

            // const bTcx2 = await capo.txnBurnUuts(burnTcx, [tst, tst2]);

            // const submitting = capo.submit(bTcx2, {
            //     signers: [tom.address, tina.address, tracy.address],
            // });
            // await expect(submitting).rejects.toThrow(/mismatch in UUT burn/);
        });
    });
});
