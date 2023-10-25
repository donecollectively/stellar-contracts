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

import { TxOutput } from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { DefaultMinter } from "../src/DefaultMinter";
import { BasicMintDelegate } from "../src/delegation/BasicMintDelegate";
import { ADA, StellarTestContext, addTestContext } from "../src/testing";
import { Capo, hasAllUuts } from "../src/Capo";
import {
    DelegateConfigNeeded,
    UutName,
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
        it("can create a UUT and send it anywhere", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);
            type something = "something";
            const tcx = new StellarTxnContext<hasAllUuts<something>>();
            await t.txnAddAuthority(tcx);
            await t.mkTxnCreatingUuts(tcx, ["something"]);

            const uutVal = t.uutsValue(tcx.state.uuts!);
            tcx.addOutput(new TxOutput(tina.address, uutVal));
            await t.submit(tcx, { signers: [tom, tina, tracy] });
            network.tick(1n);

            const hasNamedToken = t.mkTokenPredicate(uutVal);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uutVal)).toBeTruthy();
        });

        it("can create multiple UUTs", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type fooAndBar = "foo" | "bar";
            const tcx = new StellarTxnContext<hasAllUuts<fooAndBar>>();
            await t.txnAddAuthority(tcx);
            await t.mkTxnCreatingUuts(tcx, ["foo", "bar"]);
            const uuts = t.uutsValue(tcx.state.uuts!);

            tcx.addOutput(new TxOutput(tina.address, uuts));
            await t.submit(tcx, { signers: [tom, tina, tracy] });
            network.tick(1n);

            const hasNamedToken = t.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
        });

        it("fills tcx.state.uuts with purpose-keyed unique token-names", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type fooAndBar = "foo" | "bar";
            const tcx = new StellarTxnContext<hasAllUuts<fooAndBar>>();
            await t.txnAddAuthority(tcx);
            await t.mkTxnCreatingUuts(tcx, ["foo", "bar"]);
            const uuts = t.uutsValue(tcx.state.uuts!);

            //! fills state.uuts with named
            expect(tcx.state.uuts?.foo).toBeTruthy();
            expect(tcx.state.uuts?.bar).toBeTruthy();

            tcx.addOutput(new TxOutput(tina.address, uuts));
            await t.submit(tcx, { signers: [tom, tina, tracy] });
            network.tick(1n);

            const hasNamedToken = t.mkTokenPredicate(uuts);
            const u = await network.getUtxos(tina.address);
            const f = u.find(hasNamedToken);
            expect(f).toBeTruthy();
            expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
        });

        it("won't mint multiple UUTs of the same name", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
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
            const tcx = new StellarTxnContext<hasAllUuts<uniqUutMap>>();
            await t.txnAddAuthority(tcx);

            await t.mkTxnCreatingUuts(tcx, [noMultiples, noMultiples]);

            const uut = t.uutsValue(tcx.state.uuts!);

            tcx.addOutput(new TxOutput(tina.address, uut));
            await expect(
                t.submit(tcx, { signers: [tom, tina, tracy] })
            ).rejects.toThrow(/bad UUT mint/);
            network.tick(1n);

            console.log(
                "------ case 2: directly creating the transaction with >1 tokens"
            );
            const tcx2 = new StellarTxnContext<hasAllUuts<uniqUutMap>>();
            await t.txnAddAuthority(tcx2);

            const spy = vi.spyOn(utils, "mkUutValuesEntries");
            spy.mockImplementation(
                //@ts-expect-error
                function (f: uniqUutMap) {
                    return [
                        utils.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
                    ];
                }
            );

            await t.mkTxnCreatingUuts(tcx2, [noMultiples]);
            const uut2 = t.uutsValue(tcx2.state.uuts!);

            tcx2.addOutput(new TxOutput(tina.address, uut2));
            await expect(
                t.submit(tcx2, { signers: [tom, tina, tracy] })
            ).rejects.toThrow(/bad UUT mint/);
            network.tick(1n);

            console.log(
                "------ case 3: directly creating the transaction with multiple mint entries"
            );
            const tcx3 = new StellarTxnContext<hasAllUuts<uniqUutMap>>();
            await t.txnAddAuthority(tcx3);

            spy.mockImplementation(
                //@ts-expect-error
                function (f: uniqUutMap) {
                    return [
                        this.mkValuesEntry(f["multiple-is-bad"], BigInt(1)),
                        this.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
                    ];
                }
            );

            await t.mkTxnCreatingUuts(tcx3, [noMultiples]);
            const uut3 = t.uutsValue(tcx3.state.uuts!);

            tcx3.addOutput(new TxOutput(tina.address, uut3));
            await expect(
                t.submit(tcx3, { signers: [tom, tina, tracy] })
            ).rejects.toThrow(/UUT purposes not unique/);
            network.tick(1n);
        });

        it("won't mint extra UUTs", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;

            const t: DefaultCapo = await h.initialize();
            await h.mintCharterToken();
            // await delay(1000);

            type hasSomethingUut = { ["something"]: UutName };
            const tcx = new StellarTxnContext<hasAllUuts<"something">>();

            await t.txnAddAuthority(tcx);
            const m: DefaultMinter = t.minter!;

            const spy = vi.spyOn(utils, "mkUutValuesEntries");
            spy.mockImplementation(
                //@ts-expect-error
                function (f: uniqUutMap) {
                    return [
                        this.mkValuesEntry(f["something"], BigInt(1)),
                        this.mkValuesEntry(f["something-else"], BigInt(1)),
                    ];
                }
            );

            await t.mkTxnCreatingUuts(tcx, ["something"]);
            const uut = t.uutsValue(tcx);

            tcx.addOutput(new TxOutput(tina.address, uut));
            await expect(
                t.submit(tcx, { signers: [tom, tina, tracy] })
            ).rejects.toThrow(/bad UUT mint/);
            network.tick(1n);
        });
    });
});
