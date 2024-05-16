const smoke = process.env.SMOKE || 0;

import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
    SpyInstance,
} from "vitest";

import { Tx, TxOutput, Value } from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { CapoMinter } from "../src/minting/CapoMinter";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { hasAllUuts } from "../src/Capo";
import type { UutName } from "../src/delegation/UutName";
import {
    DelegateConfigNeeded,
    RoleInfo,
    VariantStrategy,
    strategyValidation,
    defineRole,
} from "../src/delegation/RolesAndDelegates";

import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import * as utils from "../src/utils";
import { MintDelegateWithGenericUuts } from "./specialMintDelegate/MintDelegateWithGenericUuts";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";


class CapoCanMintGenericUuts extends CapoWithoutSettings {

    async getMintDelegate() : Promise<MintDelegateWithGenericUuts>{
        return await super.getMintDelegate() as MintDelegateWithGenericUuts;
    }

    initDelegateRoles() {
        const inherited = super.initDelegateRoles();
        return {
            ... inherited,
            mintDelegate:   defineRole("mintDgt", MintDelegateWithGenericUuts, {
                defaultV1: {
                    delegateClass: MintDelegateWithGenericUuts,
                    partialConfig: {},
                    validateConfig(args): strategyValidation {
                        return undefined;
                    },
                },                
            })                
        }
    }
}

type localTC = StellarTestContext<DefaultCapoTestHelper<CapoCanMintGenericUuts>>;
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
        await new Promise(res => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(CapoCanMintGenericUuts)
        );
    });

    describe("UUTs for contract utility", () => {
        it.todo("🟥 TEST: doesn't mint a uut without spending the seed utxo");

        smokeTest("won't create a UUT without the minting delegate's involvement", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);
            type testSomeThing = "testSomeThing";

            const mintDelegate = await capo.getMintDelegate();
            {
                vi.spyOn(mintDelegate, "txnGrantAuthority").mockImplementation(
                    async (tcx) => tcx
                );
            }

            const tcx1a = await capo.addSeedUtxo(h.mkTcx());
            const purposes = ["testSomeThing"];
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1a, purposes) }
            );

            const uutVal = capo.uutsValue(tcx1b.state.uuts!);
            tcx1b.addOutput(new TxOutput(tina.address, uutVal));
            await expect(
                capo.submit(tcx1b, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/missing.*mintDgt/);
        });

        it("works when the seed utxo has a large utxoIdx", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const tcx = h.mkTcx();

            const strella = await h.bootstrap();
            const tx = new Tx();
            const utxos = await h.wallet.utxos;
            let totalHeld: Value = new Value(0n * ADA);
            for (const u of utxos) {
                tcx.addInput(u);
                totalHeld = totalHeld.add(u.value);
            }
            const tinyValue = new Value(1n * ADA);
            const collateralValue = new Value(5n * ADA);
            for (let i = 0; i < 44; i++) {
                tcx.addOutput(new TxOutput(actors.tracy.address, tinyValue));
            }
            //! when the current actor has only outputs with high txo-index:
            tcx.addOutput(new TxOutput(h.wallet.address, tinyValue));
            tcx.addOutput(
                new TxOutput(h.wallet.address, collateralValue)
            );
            tcx.addOutput(
                new TxOutput(h.wallet.address, collateralValue)
            );
            await strella.submit(tcx);
            network.tick(1n);
            console.log("-------------- minting UUT from high-index txo");

            type testSomeThing = "testSomeThing";

            const mintDelegate = await strella.getMintDelegate();
            const purposes = ["testSomeThing"];
            const tcx2a = await strella.addSeedUtxo(h.mkTcx());
            const tcx2b = await strella.txnMintingUuts(
                tcx2a,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx2a, purposes) }
            );
            await strella.submit(tcx2b);
            network.tick(1n);
        });

        it("requires the charter to be used as reference input", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.bootstrap();

            type testSomeThing = "testSomeThing";
            const tcx1 = h.mkTcx();
            {
                await capo.txnMustUseCharterUtxo(tcx1, capo.activityUsingAuthority());
                const spy = vi
                    .spyOn(capo, "txnAddCharterRef")
                    .mockImplementation(async (tcx: any) => {
                        return tcx;
                    });

                await capo.txnAddGovAuthorityTokenRef(tcx1);
                expect(spy).toHaveBeenCalled();
            }
            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.addSeedUtxo(tcx1);
            const purposes = ["testSomeThing"];
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1a, purposes) }
            );

            const uutVal = capo.uutsValue(tcx1b.state.uuts!);
            tcx1b.addOutput(new TxOutput(tina.address, uutVal));
            await expect(
                capo.submit(tcx1b, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/Missing charter in required ref_inputs/);
        });

        smokeTest("fails when the mint-delegate dgTkn isn't returned", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);
            type testSomeThing = "testSomeThing";

            // const tcx2 = await t.txnAddCharterAuthorityTokenRef(tcx);
            const mintDelegate = await capo.getMintDelegate();
            const mock = vi
                .spyOn(mintDelegate, "txnReceiveAuthorityToken")
                .mockImplementation(async (tcx) => tcx);

            const purposes = ["testSomeThing"];
            const tcx1a = await capo.addSeedUtxo(h.mkTcx());
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1a, purposes) }
            );

            expect(mock).toHaveBeenCalled();

            const uutVal = capo.uutsValue(tcx1b.state.uuts!);
            tcx1b.addOutput(new TxOutput(tina.address, uutVal));
            await expect(
                capo.submit(tcx1b, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/dgTkn not returned/);
        });

        it("can create a UUT and send it anywhere", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.addSeedUtxo(h.mkTcx());
            const purposes = ["testSomeThing"];
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1a, purposes) }
            );

            const uutVal = capo.uutsValue(tcx1a.state.uuts!);
            tcx1a.addOutput(new TxOutput(tina.address, uutVal));
            await capo.submit(tcx1a, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            const hasNamedToken = capo.mkTokenPredicate(uutVal);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uutVal)).toBeTruthy();
        });

        it("can create multiple UUTs", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();

            await h.mintCharterToken();

            type fooAndBar = "foo" | "bar";
            const tcx1 = new StellarTxnContext<hasAllUuts<fooAndBar>>(
                h.actorContext
            );

            const mintDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.addSeedUtxo(h.mkTcx());
            const purposes = ["foo", "bar"];
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1a, purposes) }
            );

            // await delay(4000);
            const uuts = capo.uutsValue(tcx1b.state.uuts!);

            tcx1b.addOutput(new TxOutput(tina.address, uuts));
            await capo.submit(tcx1b, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            const hasNamedToken = capo.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
        });

        it("fills tcx.state.uuts with purpose-keyed unique token-names", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            const mintingDelegate = await capo.getMintDelegate();
            const tcx1a = await capo.addSeedUtxo(h.mkTcx());
            const purposes = ["foo", "bar"];
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes,
                { mintDelegateActivity: mintingDelegate.activityMintingUutsAppSpecific(tcx1a, purposes) }
            );

            const uuts = capo.uutsValue(tcx1b.state.uuts!);

            //! fills state.uuts with named
            expect(tcx1b.state.uuts?.foo).toBeTruthy();
            expect(tcx1b.state.uuts?.bar).toBeTruthy();

            tcx1b.addOutput(new TxOutput(tina.address, uuts));
            await capo.submit(tcx1b, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            const hasNamedToken = capo.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
        });

        it("won't mint multiple UUTs of the same name", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            const m: CapoMinter = capo.minter!;

            await h.mintCharterToken();
            // await delay(1000);

            const noMultiples = "multiple-is-bad";
            type uniqUutMap = typeof noMultiples;

            const mintDelegate  = await capo.getMintDelegate() 

            console.log(
                "-------- case 1: using the txn-helper in unsupported way"
            );            
            const purposes1 = [noMultiples, noMultiples];
            const tcx1a = await capo.addSeedUtxo(h.mkTcx());
            const tcx1b = await capo.txnMintingUuts(
                tcx1a,
                purposes1,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx1a, purposes1) }
            );

            const uut = capo.uutsValue(tcx1b.state.uuts!);

            tcx1b.addOutput(new TxOutput(tina.address, uut));
            await expect(
                capo.submit(tcx1b, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/mismatch in UUT mint/);
            network.tick(1n);

            console.log(
                "------ case 2: directly creating the transaction with >1 tokens"
            );
            const tcx2 = new StellarTxnContext<hasAllUuts<uniqUutMap>>(
                h.actorContext
            );
            // await t.txnAddCharterAuthorityTokenRef(tcx2);

            const spy = vi.spyOn(utils, "mkUutValuesEntries");
            spy.mockImplementation(
                //@ts-expect-error
                function (f: uniqUutMap) {
                    return [
                        utils.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
                    ];
                }
            );

            const purposes2 = [noMultiples];
            const tcx2a = await capo.addSeedUtxo(h.mkTcx());
            const tcx2b = await capo.txnMintingUuts(
                tcx2a,
                purposes2,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx2a, purposes2) }
            );

            const uut2 = capo.uutsValue(tcx2b.state.uuts!);

            tcx2b.addOutput(new TxOutput(tina.address, uut2));
            await expect(
                capo.submit(tcx2b, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/mismatch in UUT mint/);
            network.tick(1n);

            console.log(
                "------ case 3: directly creating the transaction with multiple mint entries"
            );
            // await t.txnAddCharterAuthorityTokenRef(tcx3);

            spy.mockImplementation(
                //@ts-expect-error
                function (f: uniqUutMap) {
                    return [
                        this.mkValuesEntry(f["multiple-is-bad"], BigInt(1)),
                        this.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
                    ];
                }
            );

            const purposes = [noMultiples];
            const tcx3 = await capo.addSeedUtxo(h.mkTcx());
            const tcx3a = await capo.txnMintingUuts(
                tcx3,
                purposes,
                { mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx3, purposes) }
            );

            const uut3 = capo.uutsValue(tcx3a.state.uuts!);

            tcx3a.addOutput(new TxOutput(tina.address, uut3));
            await expect(
                capo.submit(tcx3a, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/UUT duplicate purpose/);
            network.tick(1n);
        });

        it("won't mint extra UUTs", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type hasSomethingUut = { ["testSomeThing"]: UutName };

            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const m: CapoMinter = capo.minter!;

            const spy = vi.spyOn(utils, "mkUutValuesEntries");
            spy.mockImplementation(
                //@ts-expect-error
                function (f: uniqUutMap) {
                    return [
                        this.mkValuesEntry(f["testSomeThing"], BigInt(1)),
                        this.mkValuesEntry(f["something-else"], BigInt(1)),
                    ];
                }
            );

            const mintDelegate  = await capo.getMintDelegate() 
            const tcx = await capo.addSeedUtxo(h.mkTcx());
            const purposes = ["testSomeThing"];
            const tcx2 = await capo.txnMintingUuts(
                tcx,
                purposes, {
                    // minterActivity: capo.activityUsingAuthority(),
                    // usingMintDelegateActivity: capo.activityUsingAuthority(),
                    mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx, purposes)
                }
            );
            const uut = capo.uutsValue(tcx2);

            tcx2.addOutput(new TxOutput(tina.address, uut));
            await expect(
                capo.submit(tcx2, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/mismatch in UUT mint/);
            network.tick(1n);
        });
    });

    // todo: Move these to a custom minter test that actually has a burning use-case.
    describe.skip("burning UUTs", () => {
        type testSomeThing = "testSomeThing";

        async function setup(context: localTC) {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();

            await h.mintCharterToken();
            const mintDelegate = await capo.getMintDelegate();
            const tcx = await capo.addSeedUtxo(h.mkTcx());

            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const tcx2 = await capo.txnMintingUuts(
                tcx,
                ["testSomeThing"],
                { 
                    mintDelegateActivity: mintDelegate.activityMintingUutsAppSpecific(tcx, ["testSomeThing"]) 
                }
            );

            const uutVal = capo.uutsValue(tcx2.state.uuts!);
            tcx2.addOutput(new TxOutput(tina.address, uutVal));
            await capo.submit(tcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            return tcx2;
        }

        it("🟥 can't burn a UUT without the minting delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const tcx = await setup(context);
            const capo = await h.initialize();

            const { testSomeThing } = tcx.state.uuts;

            const uutUtxo = await capo.findActorUtxo(
                "theUut",
                capo.mkTokenPredicate(capo.mph, testSomeThing.name)
            );
            expect(uutUtxo).toBeTruthy();
            console.log("---- test will fail to burn a UUT with no delegate");

            const burnTcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.actorContext
            );
            await burnTcx.addInput(uutUtxo!);

            const mintDgt = await capo.getMintDelegate();
            let mock: SpyInstance = vi
                .spyOn(mintDgt, "txnGrantAuthority")
                .mockImplementation(async (tcx) => tcx);

            const bTcx2 = await capo.txnBurnUuts(burnTcx, [testSomeThing]);
            expect(mock).toHaveBeenCalled();
            const submitting = capo.submit(bTcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            await expect(submitting).rejects.toThrow(
                /missing.*delegat.*mintDgt/
            );
        });

        it("🟥 can burn a UUT, if approved by the minting delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            debugger
            const tcx = await setup(context);

            const { testSomeThing: tst } = tcx.state.uuts;

            const uutUtxo = await capo.findActorUtxo(
                "theUut",
                capo.mkTokenPredicate(capo.mph, tst.name)
            );
            expect(uutUtxo).toBeTruthy();
            console.log("---- test will burn a UUT  with delegate approval");

            const burnTcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.actorContext
            );
            burnTcx.addInput(uutUtxo!);

            const bTcx2 = await capo.txnBurnUuts(burnTcx, [tst]);
            const submitting = capo.submit(bTcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            await expect(submitting).resolves.toBeTruthy();
        });

        it("🟥 burns only the UUTs identified in the Activity/redeemer", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const capo = await h.initialize();
            const tcx = await setup(context);
            const tcx2 = await setup(context);
            const { testSomeThing: tst } = tcx.state.uuts;
            const { testSomeThing: tst2 } = tcx2.state.uuts;

            const uutUtxo = await capo.findActorUtxo(
                "theUut",
                capo.mkTokenPredicate(capo.mph, tst.name)
            );
            expect(uutUtxo).toBeTruthy();
            console.log("---- test will burn a UUT  with delegate approval");

            const uutUtxo2 = await capo.findActorUtxo(
                "theUut",
                capo.mkTokenPredicate(capo.mph, tst2.name)
            );
            expect(uutUtxo).toBeTruthy();
            const burnTcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.actorContext
            );
            burnTcx.addInput(uutUtxo!);
            burnTcx.addInput(uutUtxo2!);

            const minter = capo.minter!;
            const activityBurningUuts = minter.activityBurningUuts.bind(minter);
            vi.spyOn(minter, "activityBurningUuts").mockImplementation(
                (tn1, tn2) => activityBurningUuts(tn1)
            );

            const bTcx2 = await capo.txnBurnUuts(burnTcx, [tst, tst2]);

            const submitting = capo.submit(bTcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            await expect(submitting).rejects.toThrow(/mismatch in UUT burn/);
        });
    });
});
