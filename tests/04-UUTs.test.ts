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

import { DefaultCapo } from "../src/DefaultCapo";

import { Tx, TxOutput, Value } from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { DefaultMinter } from "../src/minting/DefaultMinter";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { Capo, hasAllUuts } from "../src/Capo";
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
// import { RoleDefs } from "../src/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;
const wrongMinSigs = /minSigs can't be more than the size of the trustee-list/;
const notEnoughSignaturesRegex = /not enough trustees.*have signed/;

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

    describe("UUTs for contract utility", () => {
        it("won't create a UUT without the minting delegate's involvement", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);
            type testSomeThing = "testSomeThing";

            const tcx1 = new StellarTxnContext(
                h.currentActor
            );
            {
                const mintDgt = await t.getMintDelegate();
                vi.spyOn(mintDgt, "txnGrantAuthority").mockImplementation(
                    async (tcx) => tcx
                );
            }
            const tcx1a = await t.txnGenericUutMinting(tcx1, [ "testSomeThing"]);

            const uutVal = t.uutsValue(tcx1a.state.uuts!);
            tcx1a.addOutput(new TxOutput(tina.address, uutVal));
            await expect(
                t.submit(tcx1a, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/missing.*delegat.*mintDgt/);
        });

        it("works when the seed utxo has a large utxoIdx", async (context: localTC) => {
            // prettier-ignore
            const {h, h:{network, actors, delay, state} } = context;

            const tcx = new StellarTxnContext(h.currentActor);

            const strella = await h.bootstrap();
            const tx = new Tx();
            const utxos = await h.currentActor.utxos;
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
            tcx.addOutput(new TxOutput(h.currentActor.address, tinyValue));
            tcx.addOutput(
                new TxOutput(h.currentActor.address, collateralValue)
            );
            tcx.addOutput(
                new TxOutput(h.currentActor.address, collateralValue)
            );
            await strella.submit(tcx);
            network.tick(1n);
            console.log("-------------- minting UUT from high-index txo");

            type testSomeThing = "testSomeThing";
            const tcx2 = new StellarTxnContext(
                h.currentActor
            );

            const tcx2a = await strella.txnGenericUutMinting(tcx2, [ "testSomeThing"]);
            await strella.submit(tcx2a);
            network.tick(1n);
        });

        it("requires the charter to be used as reference input", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.bootstrap();

            type testSomeThing = "testSomeThing";
            const tcx1 = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            {
                await t.txnMustUseCharterUtxo(tcx1, t.activityUsingAuthority());
                const spy = vi
                    .spyOn(t, "txnMustUseCharterUtxo")
                    .mockImplementation(async (tcx: any, isRef: any) => {
                        expect(isRef).toBe("refInput");
                        return tcx;
                    });

                await t.txnAddGovAuthorityTokenRef(tcx1);
                expect(spy).toHaveBeenCalled();
            }
            const tcx1a = await t.txnGenericUutMinting(tcx1, [ "testSomeThing"]);

            const uutVal = t.uutsValue(tcx1a.state.uuts!);
            tcx1a.addOutput(new TxOutput(tina.address, uutVal));
            await expect(
                t.submit(tcx1a, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/Missing charter in required ref_inputs/);
        });

        it("fails when the mint-delegate authZor isn't returned", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);
            type testSomeThing = "testSomeThing";
            const tcx1 = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            // const tcx2 = await t.txnAddCharterAuthorityTokenRef(tcx);
            const mintDelegate = await t.getMintDelegate();
            vi.spyOn(
                mintDelegate,
                "txnReceiveAuthorityToken"
            ).mockImplementation(async (tcx) => tcx);
            const tcx1a = await t.txnGenericUutMinting(tcx1, [ "testSomeThing"]);

            const uutVal = t.uutsValue(tcx1a.state.uuts!);
            tcx1a.addOutput(new TxOutput(tina.address, uutVal));
            await expect(
                t.submit(tcx1a, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/missing.*delegat/);
        });

        it("can create a UUT and send it anywhere", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);
            type testSomeThing = "testSomeThing";
            const tcx1 = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            const tcx1a = await t.txnGenericUutMinting(tcx1, [ "testSomeThing"]);

            const uutVal = t.uutsValue(tcx1a.state.uuts!);
            tcx1a.addOutput(new TxOutput(tina.address, uutVal));
            await t.submit(tcx1a, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            const hasNamedToken = t.mkTokenPredicate(uutVal);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uutVal)).toBeTruthy();
        });

        it("can create multiple UUTs", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type fooAndBar = "foo" | "bar";
            const tcx1 = new StellarTxnContext<hasAllUuts<fooAndBar>>(
                h.currentActor
            );
            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const tcx1a = await t.txnGenericUutMinting(tcx1, [ "foo", "bar"]);
            const uuts = t.uutsValue(tcx1a.state.uuts!);

            tcx1a.addOutput(new TxOutput(tina.address, uuts));
            await t.submit(tcx1a, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            const hasNamedToken = t.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
        });

        it("fills tcx.state.uuts with purpose-keyed unique token-names", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type fooAndBar = "foo" | "bar";
            const tcx1 = new StellarTxnContext<hasAllUuts<fooAndBar>>(
                h.currentActor
            );
            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const tcx1a = await t.txnGenericUutMinting(tcx1, [ "foo", "bar"]);

            const uuts = t.uutsValue(tcx1a.state.uuts!);

            //! fills state.uuts with named
            expect(tcx1a.state.uuts?.foo).toBeTruthy();
            expect(tcx1a.state.uuts?.bar).toBeTruthy();

            tcx1a.addOutput(new TxOutput(tina.address, uuts));
            await t.submit(tcx1a, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            const hasNamedToken = t.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
        });

        it("won't mint multiple UUTs of the same name", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            const m: DefaultMinter = t.minter!;

            await h.mintCharterToken();
            // await delay(1000);

            const noMultiples = "multiple-is-bad";
            type uniqUutMap = typeof noMultiples;
            console.log(
                "-------- case 1: using the txn-helper in unsupported way"
            );
            const tcx1 = new StellarTxnContext<hasAllUuts<uniqUutMap>>(
                h.currentActor
            );
            // await t.txnAddCharterAuthorityTokenRef(tcx);

            const tcx1a = await t.txnGenericUutMinting(tcx1, [noMultiples, noMultiples]);

            const uut = t.uutsValue(tcx1a.state.uuts!);

            tcx1a.addOutput(new TxOutput(tina.address, uut));
            await expect(
                t.submit(tcx1a, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/mismatch in UUT mint/);
            network.tick(1n);

            console.log(
                "------ case 2: directly creating the transaction with >1 tokens"
            );
            const tcx2 = new StellarTxnContext<hasAllUuts<uniqUutMap>>(
                h.currentActor
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

            const tcx2a = await t.txnGenericUutMinting(tcx2, [noMultiples]);

            const uut2 = t.uutsValue(tcx2a.state.uuts!);

            tcx2a.addOutput(new TxOutput(tina.address, uut2));
            await expect(
                t.submit(tcx2a, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/mismatch in UUT mint/);
            network.tick(1n);

            console.log(
                "------ case 3: directly creating the transaction with multiple mint entries"
            );
            const tcx3 = new StellarTxnContext<hasAllUuts<uniqUutMap>>(
                h.currentActor
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

            const tcx3a = await t.txnGenericUutMinting(tcx3, [noMultiples]);

            const uut3 = t.uutsValue(tcx3a.state.uuts!);

            tcx3.addOutput(new TxOutput(tina.address, uut3));
            await expect(
                t.submit(tcx3, {
                    signers: [tom.address, tina.address, tracy.address],
                })
            ).rejects.toThrow(/UUT duplicate purpose/);
            network.tick(1n);
        });

        it("won't mint extra UUTs", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type hasSomethingUut = { ["testSomeThing"]: UutName };
            const tcx = new StellarTxnContext<hasAllUuts<"testSomeThing">>();

            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const m: DefaultMinter = t.minter!;

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

            const tcx2 = await t.txnGenericUutMinting(tcx, ["testSomeThing"]);
            const uut = t.uutsValue(tcx2);

            tcx2.addOutput(new TxOutput(tina.address, uut));
            await expect(
                t.submit(tcx2, {
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

            const t: DefaultCapo = await h.initialize();

            await h.mintCharterToken();
            const tcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            // await t.txnAddCharterAuthorityTokenRef(tcx);
            const tcx2 = await t.txnGenericUutMinting(tcx, ["testSomeThing"]);

            const uutVal = t.uutsValue(tcx2.state.uuts!);
            tcx2.addOutput(new TxOutput(tina.address, uutVal));
            await t.submit(tcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            network.tick(1n);

            return tcx2;
        }

        it("can't burn a UUT without the minting delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const tcx = await setup(context);
            const t: DefaultCapo = await h.initialize();

            const { testSomeThing } = tcx.state.uuts;

            const uutUtxo = await t.findActorUtxo(
                "theUut",
                t.mkTokenPredicate(t.mph, testSomeThing.name)
            );
            expect(uutUtxo).toBeTruthy();
            console.log("---- test will fail to burn a UUT with no delegate");

            const burnTcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            await burnTcx.addInput(uutUtxo!);

            const mintDgt = await t.getMintDelegate();
            let mock: SpyInstance = vi
                .spyOn(mintDgt, "txnGrantAuthority")
                .mockImplementation(async (tcx) => tcx);

            const bTcx2 = await t.txnBurnUuts(burnTcx, [testSomeThing]);
            expect(mock).toHaveBeenCalled();
            const submitting = t.submit(bTcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            await expect(submitting).rejects.toThrow(
                /missing.*delegat.*mintDgt/
            );
        });

        it("can burn a UUT, if approved by the minting delegate", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            debugger
            const tcx = await setup(context);

            const { testSomeThing: tst } = tcx.state.uuts;

            const uutUtxo = await t.findActorUtxo(
                "theUut",
                t.mkTokenPredicate(t.mph, tst.name)
            );
            expect(uutUtxo).toBeTruthy();
            console.log("---- test will burn a UUT  with delegate approval");

            const burnTcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            burnTcx.addInput(uutUtxo!);

            const bTcx2 = await t.txnBurnUuts(burnTcx, [tst]);
            const submitting = t.submit(bTcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            await expect(submitting).resolves.toBeTruthy();
        });

        it("burns only the UUTs identified in the Activity/redeemer", async (context: localTC) => {
            // prettier-ignore
            const {h, h: { network, actors, delay, state }} = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            const tcx = await setup(context);
            const tcx2 = await setup(context);
            const { testSomeThing: tst } = tcx.state.uuts;
            const { testSomeThing: tst2 } = tcx2.state.uuts;

            const uutUtxo = await t.findActorUtxo(
                "theUut",
                t.mkTokenPredicate(t.mph, tst.name)
            );
            expect(uutUtxo).toBeTruthy();
            console.log("---- test will burn a UUT  with delegate approval");

            const uutUtxo2 = await t.findActorUtxo(
                "theUut",
                t.mkTokenPredicate(t.mph, tst2.name)
            );
            expect(uutUtxo).toBeTruthy();
            const burnTcx = new StellarTxnContext<hasAllUuts<testSomeThing>>(
                h.currentActor
            );
            burnTcx.addInput(uutUtxo!);
            burnTcx.addInput(uutUtxo2!);

            const minter = t.minter!;
            const activityBurningUuts = minter.activityBurningUuts.bind(minter);
            vi.spyOn(minter, "activityBurningUuts")
                .mockImplementation((tn1, tn2) => activityBurningUuts(tn1));

            const bTcx2 = await t.txnBurnUuts(burnTcx, [tst, tst2]);
            
            const submitting = t.submit(bTcx2, {
                signers: [tom.address, tina.address, tracy.address],
            });
            await expect(submitting).rejects.toThrow(
                /mismatch in UUT burn/
            );

        });
    });
});
