import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";
import * as helios from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext.js";
import {
    ADA,
    StellarTestContext,
    addTestContext,
} from "../src/testing/index.js";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper.js";
import { BundleType, ConfigFor } from "../src/StellarContract.js";
import { dumpAny } from "../src/diagnostics.js";
import { DelegationDetail } from "../src/delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate.js";
import { Capo } from "../src/Capo.js";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings.js";
import { TestHelperState } from "../src/testing/types.js";
// import { RoleDefs } from "../src/RolesAndDelegates";
import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts.js";
import { expectTxnError } from "../src/testing/StellarTestHelper.js";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";

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
    let bridgeFrom: MintDelegateWithGenericUuts["bridgeFrom"];
    let bridgeTo: MintDelegateWithGenericUuts["bridgeTo"];
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
        bridgeFrom = mintDelegate.bridgeFrom;
        bridgeTo = mintDelegate.bridgeTo;
        readDatum = mintDelegate.newReadDatum;
        activity = mintDelegate.activity;
    });

    describe("provides a .bridge proxy for all named types in the contract script", () => {
        it("creates a bridge for the standalone SampleStruct defined in the minting delegate", async () => {
            const bridged = bridgeTo.sampleStruct({
                // should auto-complete here
            });
            const result = bridgeFrom(bridged);
            expect(result.type).toBe("SampleStruct");

            expect(result.data).toEqual(bridged.rawData); // or at least be similar...
        });

        describe("for the standalone SomeEnum defined in the minting delegate", () => {
            it("bridges a simple single-field variant", async () => {
                const bridged = bridgeTo.SomeEnum.justAnInt(1);
                const result = bridgeFrom(bridged);
                expect(result.type).toBe("SomeEnum");
                expect(result.variant).toBe("justAnInt");
                expect(result.data).toBe(1n);
            });

            it("bridges a structured single-field value variant without intervening field-name", async () => {
                const bridged = bridgeTo.SomeEnum.oneNestedStruct({
                    a: 1,
                    b: new Map(),
                    c: [true],
                    d: undefined,
                });
                const result = bridgeFrom(bridged);
                expect(result.type).toBe("SomeEnum");
                expect(result.variant).toBe("oneNestedStruct");
                expect(result.data).toEqual({ someField: 1n });
            });

            it("bridges a structured multi-field value variant using the defined field names", async () => {
                const bridged = bridgeTo.SomeEnum.hasNestedFields({
                    m: {
                        a: 1,
                        b: new Map(),
                        c: [true],
                        d: undefined,
                    },
                    n: 42,
                });
                const result = bridgeFrom(bridged);
                expect(result.type).toBe("SomeEnum");
                expect(result.variant).toBe("hasNestedFields");
                expect(result.data).toEqual({ m: { someField: 1n }, n: 42n });
            });

            it("bridges a simple tag-only variant", async () => {
                const bridged = bridgeTo.SomeEnum.justATag;
                const result = bridgeFrom.SomeEnum(bridged);
                console.log({ result });
                expect(result.type).toBe("SomeEnum");
                expect(result.variant).toBe("justATag");
            });
        });
        it("TODO: allows creating a data type having a Map to a custom data-type", () => {}, {todo: true})
        it("TODO: allows creating a data type having a List of a custom data-type", () => {}, {todo: true})
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
            fit("creates a valid datum using the tag", async () => {
                const { mkDatum } = mintDelegate;
                const datum = mkDatum.ScriptReference;
                expect(datum.variantName).toBe("ScriptReference");
                expect(datum.enumId.enumName).toBe("DelegateDatum");
                expect(datum.type).toBe("DelegateDatum");
                expect(datum.constrIndex).toBe(1);
                const result = readDatum(datum.uplcData);
                expect(result.variant).toBe("ScriptReference");
            });
        });

        describe("when a datum enum variant has a single field: ", () => {
            describe("L1: just a data element", () => {
                it("creates a valid datum using the single field", async () => {
                    const { mkDatum } = mintDelegate;
                    const datum = mkDatum.SingleDataElement("hello world");
                    expect(datum.type).toBe("SingleDataElement");
                    expect(datum.data).toBe("hello world");
                });
            });

            describe("L1: a struct", () => {
                it("creates a valid datum using the fields of the nested struct (no intervening single-field-name", async () => {
                    // use variant "SingleNestedStruct"
                    const bridged = mkDatum.SingleNestedStruct({
                        a: 42,
                        b: new Map([ 
                         [   "life", [ 42, 42, 42 ] ],
                        ]),
                        c: [true],
                        d: undefined,
                    });
                    expect(bridged.type).toBe("SingleNestedStruct");
                });
            });

            describe("L1: nested enum", () => {
                describe("... L2: with just a tag", () => {
                    it("creates a valid datum using the tag", async () => {
                        const { mkDatum } = mintDelegate;
                        const datum = mkDatum.HasNestedEnum.justATag;
                        expect(datum.type).toBe("SampleDatum");
                        expect(datum.data).toEqual({});
                    });
                })

                describe("... L2: with a single nested field", () => {
                    it("creates a valid datum using a chain of nested enum variant names", async () => {
                        const { mkDatum } = mintDelegate;
                        type t = BundleType<typeof mintDelegate>;
                        const datum = mkDatum.HasNestedEnum.justAnInt(42);
                        expect(datum.type).toBe("SampleDatum");
                        expect(datum.data).toEqual({
                            nested: { someField: 1n },
                        });
                        const result = mintDelegate.readDatum(
                            datum.uplcData
                        ) as any;
                        const result2 = mintDelegate.bridgeFrom.DelegateDatum(
                            datum.uplcData
                        ) as any;
                        expect(result).toEqual(result2);
                    });
                });
                describe("... L2: with a single-field nested struct" , () => {
                    it("creates a valid datum using a chain of nested enum variant names and the fields" , async () => {
                        const { mkDatum } = mintDelegate;
                        const datum = mkDatum.HasNestedEnum.oneNestedStruct({
                            a: 1,
                            b: new Map(),
                            c: [true],
                            d: undefined,
                        });
                        expect(datum.type).toBe("SampleDatum");
                        expect(datum.data).toEqual({a: 1n});
                    })
                })
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
                        expect(datum.type).toBe("SampleDatum");
                        expect(datum.data).toEqual({
                            nested: { someField: 1n },
                            n: 42n,
                        });
                    });
                });
                describe("... L2: TODO: with a multi-field variant and a recursive Enum", () => {
                    it("TODO: make it work with multi-field variant and recursive Enum", () => {}, { todo: true });
                })

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
                    nestedEnum: undefined,  // ok
                    // nestedEnum: bridgeTo.SomeEnum.justAnInt(42) // right
                });
                expect(datum.type).toBe("SampleDatum");
                expect(datum.data).toEqual({
                    nested: { someField: 1n },
                    n: 42n,
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
                    nestedEnum: bridgeTo.SomeEnum.oneNestedStruct({
                        a: 2, 
                        b: new Map([["life", 42]]),
                        c: [true, false, true],
                        d: undefined,
                    })
                });
                expect(datum.type).toBe("SampleDatum");
                expect(datum.data).toEqual({
                    nested: { someField: 1n },
                    n: undefined,
                });
            })
        })
    });
    describe("provides a readDatum proxy for reading Datums from the contract script", () => {});
    describe("provides an activity proxy for the 'redeemer' type(s) defined in the contract script", () => {});
});
