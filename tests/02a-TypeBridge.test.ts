import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { StellarTxnContext } from "../src/StellarTxnContext.js";
import {
    ADA,
    StellarTestContext,
    addTestContext,
} from "../src/testing/index.js";

import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts.js";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper.js";
import { ConfigFor } from "../src/StellarContract.js";
import { dumpAny } from "../src/diagnostics.js";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate.js";
import { Capo } from "../src/Capo.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings.js";
import { TestHelperState } from "../src/testing/types.js";
// import { RoleDefs } from "../src/RolesAndDelegates";
import { expectTxnError } from "../src/testing/StellarTestHelper.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { expanded, tagOnly } from "../src/helios/HeliosScriptBundle.js";
import { SomeEnum } from "../src/testing/specialMintDelegate/uutMintingMintDelegate.typeInfo.js";

import CapoMinterBundle from "../src/minting/CapoMinter.hlb.js";
import BadSettingsBundle from "./customizing/BadSettings.hlb.js";
import ReqtsConcreteBundle from "../src/reqts/Reqts.concrete.hlb.js";
import StructDatumTesterBundle from "../src/testing/StructDatumTester.hlb.js";
import DelegatedDatumTesterBundle from "../src/testing/DelegatedDatumTester.hlb.js";
import UnspecializedDgtBundle from "../src/delegation/UnspecializedDelegate.hlb.js";
import BundleMintDelegateWithGenericUuts from "../src/testing/specialMintDelegate/uutMintingMintDelegate.hlb.js";
import { decodePubKeyHash, decodeStakingCredential, makeAddress, makePubKey, makePubKeyHash } from "@helios-lang/ledger";


type localTC = StellarTestContext<
    DefaultCapoTestHelper<CapoCanMintGenericUuts>
>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

let helperState: TestHelperState<CapoCanMintGenericUuts> = {
    snapshots: {},
} as any;

describe("Type Bridge", async () => {
    // special-case for this test, in which we don't want to reset everything in between tests
    let capo: CapoCanMintGenericUuts;
    let mintDelegate: MintDelegateWithGenericUuts;
    let mkDatum: MintDelegateWithGenericUuts["mkDatum"];
    let offchain: MintDelegateWithGenericUuts["reader"];
    let offchain2: MintDelegateWithGenericUuts["offchain"];
    let onchain: MintDelegateWithGenericUuts["onchain"];
    let readDatum: MintDelegateWithGenericUuts["newReadDatum"];
    let activity: MintDelegateWithGenericUuts["activity"];
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        if (capo) {
            return;
        }
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(CapoCanMintGenericUuts),
            undefined,
            helperState
        );
        const { h } = context;
        await h.reusableBootstrap();
        capo = h.strella!;
        mintDelegate = await capo.getMintDelegate();
        mkDatum = mintDelegate.mkDatum;
        // bridgeFrom = mintDelegate.bridgeFrom;
        onchain = mintDelegate.onchain;
        offchain = mintDelegate.offchain;
        readDatum = mintDelegate.newReadDatum;
        activity = mintDelegate.activity;
    });

    describe("provides a .bridge proxy for all named types in the contract script", () => {
        it("creates a bridge for the standalone SampleStruct defined in the minting delegate", async () => {
            const bridged = onchain.types.SampleStruct({
                a: 1,
                b: new Map(),
                c: [true],
                d: undefined,
            });
            const result = onchain.reader.SampleStruct(bridged);
            expect(result.a).toBe(1n);
            expect(result.c).toStrictEqual([true]);

            // expect(result.data).toEqual(bridged.rawData); // or at least be similar...
        });

        describe("for the standalone SomeEnum defined in the minting delegate", () => {
            it("bridges a simple single-field variant", async () => {
                const bridged = onchain.types.SomeEnum.justAnInt(1);
                const result = offchain.SomeEnum(bridged);

                expect(result).toStrictEqual({ justAnInt: 1n });
            });

            it("bridges a structured single-field value variant without intervening field-name", async () => {
                const bridged = onchain.types.SomeEnum.oneNestedStruct({
                    a: 1,
                    b: new Map(),
                    c: [true],
                    d: undefined,
                });
                const result = offchain.SomeEnum(bridged);
                // expect(result.type).toBe("SomeEnum");
                // expect(result.variant).toBe("oneNestedStruct");
                expect(result).toStrictEqual({
                    oneNestedStruct: {
                        a: 1n,
                        b: new Map(),
                        c: [true],
                        d: undefined,
                    },
                });
            });

            it("bridges a structured multi-field value variant using the defined field names", async () => {
                const bridged = onchain.types.SomeEnum.hasNestedFields({
                    m: {
                        a: 1,
                        b: new Map(),
                        c: [true],
                        d: undefined,
                    },
                    n: 42,
                });
                const result = offchain.SomeEnum(bridged);
                // expect(result.variant).toBe("hasNestedFields");
                expect(result).toStrictEqual({
                    hasNestedFields: {
                        m: {
                            a: 1n,
                            b: new Map(),
                            c: [true],
                            d: undefined,
                        },
                        n: 42n,
                    },
                });
            });

            it("bridges a simple tag-only variant", async () => {
                const bridged = onchain.types.SomeEnum.justATag;
                const result = offchain.SomeEnum(bridged);
                expect(result.justATag).toStrictEqual({});
            });
        });
        it(
            "TODO: allows creating a data type having a Map to a custom data-type",
            () => {},
            { todo: true }
        );
        it(
            "TODO: allows creating a data type having a List of a custom data-type",
            () => {},
            { todo: true }
        );
    });

    describe("provides a mkDatum proxy for creating Datums for the contract script", () => {
        describe("when the datum is not an Enum", () => {
            it(
                "TODO: TEST: test with single data element and struct cases",
                () => {},
                { todo: true }
            );
        });

        describe("when a datum variant has only a tag", () => {
            it("creates a valid datum using the tag", async () => {
                const { mkDatum } = mintDelegate;

                const txo_datum = mkDatum.TagOnlyDatum;
                const datum = txo_datum.data
                expect(datum.
                    rawData.TagOnlyDatum).toStrictEqual({});
                //@ts-expect-error tags aren't on every UplcData
                expect(datum.tag).toBeDefined();
                expect(datum.dataPath).toEqual(
                    "uutMintingDelegate::DelegateDatum.TagOnlyDatum"
                );
                const result = offchain.DelegateDatum(datum);
                const result2 = readDatum(datum);
                expect(result).toEqual({ TagOnlyDatum: {} });
                expect(result2).toEqual({ TagOnlyDatum: {} });
                // expect(result.variant).toBe("TagOnlyDatum");
            });
        });

        describe("when a datum enum variant has a single field: ", () => {
            describe("L1: just a data element", () => {
                it("creates a valid datum using the single field", async () => {
                    const { mkDatum } = mintDelegate;
                    const datum = mkDatum.SingleDataElement("hello world");
                    // expect(datum.type).toBe("SingleDataElement");
                    const backToJS = readDatum(datum.data);

                    expect(backToJS).toStrictEqual({
                        SingleDataElement: "hello world",
                    });
                });
            });

            describe("L1: a struct", () => {
                it("creates a valid datum using the fields of the nested struct (no intervening single-field-name", async () => {
                    // use variant "SingleNestedStruct"
                    const bridged = mkDatum.SingleNestedStruct({
                        a: 42,
                        b: new Map([["life", [42, 42, 42]]]),
                        c: [true],
                        d: undefined,
                    });
                    const backToJS = readDatum(bridged.data);
                    expect(backToJS).toStrictEqual({
                        SingleNestedStruct: { 
                            a: 42n,
                            b: new Map([["life", [42, 42, 42]]]),
                            c: [true],
                            d: undefined,
                        },
                    });
                });
            });

            describe("L1: nested enum", () => {
                describe("... L2: with just a tag", () => {
                    it("creates a valid datum using the tag", async () => {
                        const { mkDatum } = mintDelegate;
                        const datum = mkDatum.HasNestedEnum.justATag;

                        const backToJS = readDatum(datum);

                        expect(backToJS).toStrictEqual({
                            HasNestedEnum: { justATag: {} },
                        });
                    });
                });

                describe("... L2: with a single nested field", () => {
                    it("creates a valid datum using a chain of nested enum variant names", async () => {
                        const { mkDatum } = mintDelegate;
                        debugger
                        const datum = mkDatum.HasNestedEnum.justAnInt(42);

                        expect(datum.dataPath).toBe(
                            "uutMintingDelegate::DelegateDatum.HasNestedEnum"
                        );
                        const result = readDatum(datum);
                        expect(result).toStrictEqual({
                            HasNestedEnum: {
                                justAnInt: 42n,
                            },
                        });
                        const result2 = offchain.DelegateDatum(datum) as any;
                        expect(result2).toEqual(result);
                        const result3 = mintDelegate.reader.DelegateDatum(
                            datum
                        ) as any;
                        expect(result3).toStrictEqual(result);
                    });
                });
                describe("... L2: with a single-field nested struct", () => {
                    it("creates a valid datum using a chain of nested enum variant names and the fields", async () => {
                        const { mkDatum } = mintDelegate;
                        const datum = mkDatum.HasNestedEnum.oneNestedStruct({
                            a: 1,
                            b: new Map(),
                            c: [true],
                            d: undefined,
                        });
                        const result = offchain.DelegateDatum(datum);

                        //!!! must not be 'any':
                        const result2 = readDatum(datum);

                        expect(result).toStrictEqual({
                            HasNestedEnum: {
                                oneNestedStruct: {
                                    a: 1n,
                                    b: new Map(),
                                    c: [true],
                                    d: undefined,
                                },
                            },
                        });
                    });
                });
                describe("... L2: with a multi-field variant", () => {
                    //HasNestedEnum.hasNestedFields
                    it("creates a valid datum using chained variant names and the fields of the nested struct", async () => {
                        const { mkDatum } = mintDelegate;
                        const datum = mkDatum.HasNestedEnum.hasNestedFields({
                            m: {
                                a: 1,
                                b: new Map(),
                                c: [true],
                                d: undefined,
                            },
                            n: 42,
                        });
                        // expect(datum.type).toBe("SampleDatum");
                        expect(readDatum(datum)).toEqual({
                            HasNestedEnum: {
                                hasNestedFields: {
                                    m: {
                                        a: 1n,
                                        b: new Map(),
                                        c: [true],
                                        d: undefined,
                                    },
                                    n: 42n,
                                },
                            },
                        });
                    });
                });
                describe("... L2: TODO: with a multi-field variant and a recursive Enum", () => {
                    it(
                        "TODO: make it work with multi-field variant and recursive Enum",
                        () => {},
                        { todo: true }
                    );
                });
            });
        });
        describe("when a datum variant has L1: multiple fields", () => {
            it("creates a valid datum using the fields", async () => {
                const { mkDatum } = mintDelegate;
                const datum = mkDatum.MultiFieldNestedThings({
                    nestedStruct: {
                        a: 1,
                        b: new Map(),
                        c: [true],
                        d: undefined,
                    },
                    // nestedEnum: bridgeTo.SampleStruct({ a: 1 }),  // wrong
                    nestedEnumMaybe: undefined, // ok
                    // nestedEnum: bridgeTo.SomeEnum.justAnInt(42) // right
                });
                // expect(datum.type).toBe("SampleDatum");
                const result2 = readDatum(datum.data); // !!!!
                const result = offchain.DelegateDatum(datum.data);
                expect(result.MultiFieldNestedThings).toEqual({
                    nestedStruct: {
                        // nested: {
                        a: 1n,
                        b: new Map(),
                        c: [true],
                        d: undefined,
                        // },
                    },
                    nestedEnumMaybe: undefined,
                });
            });

            it("creates a valid datum using with nested optional enum data", () => {
                const { mkDatum } = mintDelegate;
                const datum = mkDatum.MultiFieldNestedThings({
                    nestedStruct: {
                        a: 1,
                        b: new Map(),
                        c: [true],
                        d: undefined,
                    },
                    nestedEnumMaybe: {
                        oneNestedStruct: {
                            a: 2,
                            b: new Map([["life", [42, 42, 42]]]),
                            c: [true, false, true],
                            d: undefined,
                        },
                    },
                });

                const result = offchain.DelegateDatum(datum.data);
                expect(
                    result.MultiFieldNestedThings!.nestedEnumMaybe!
                ).toStrictEqual({
                    oneNestedStruct: {
                        // nested: {
                        a: 2n,
                        b: new Map([["life", [42, 42, 42]]]),
                        c: [true, false, true],
                        d: undefined,
                    },
                    // },
                });
            });
        });
    });
    // describe("provides a readDatum proxy for reading Datums from the contract script", () => {});
    // describe("provides an activity proxy for the 'redeemer' type(s) defined in the contract script", () => {});
});
