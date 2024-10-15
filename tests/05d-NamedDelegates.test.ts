import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { CapoMinter } from "../src/minting/CapoMinter";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { ADA, addTestContext } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";

import {
    DelegateConfigNeeded,
    RoleMap,
    RoleInfo,
    VariantStrategy,
    delegateRoles,
    strategyValidation,
    defineRole,
} from "../src/delegation/RolesAndDelegates";
import { StellarTxnContext } from "../src/StellarTxnContext";
import { configBaseWithRev, txn } from "../src/StellarContract";
import { dumpAny, txAsString } from "../src/diagnostics";
import { Address } from "@hyperionbt/helios";
import { MintDelegateWithGenericUuts } from "./specialMintDelegate/MintDelegateWithGenericUuts";
import { ContractBasedDelegate } from "../src/delegation/ContractBasedDelegate";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { expectTxnError } from "../src/testing/StellarTestHelper";
import UnspecializedDelegateBundle from "../src/delegation/UnspecializedDelegate.hlbundle.js"

class NamedDelegateTestCapo extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
    }

    @txn
    async mkTxnCreatingTestNamedDelegate<const P extends string>(purpose: P) {
        const mintDelegate = await this.getMintDelegate();
        const tcx1 = await this.tcxWithSeedUtxo(mintDelegate.mkTcx());
        return this.mkTxnAddingNamedDelegate(
            purpose,
            {
                strategyName: "myDgtV1",
                mintSetup: {                    
                    mintDelegateActivity: mintDelegate.activityCreatingTestNamedDelegate(
                        tcx1, purpose
                    )
                }
            },
            tcx1
        );
    }

    initDelegateRoles() {
        const inherited = super.basicDelegateRoles();
        const { mintDelegate: parentMintDelegate, ...othersInherited } =
            inherited;
        const {
            baseClass,
            uutPurpose,
            variants: pVariants,
        } = parentMintDelegate;
        const mintDelegate = defineRole("mintDgt", MintDelegateWithGenericUuts, {
            // defaultV1: {
            //     delegateClass: BasicMintDelegate,
            //     validateConfig(args) {},
            // },

            canMintGenericUuts: {
                delegateClass: MintDelegateWithGenericUuts,
                validateConfig(args) {
                }
            },
            failsWhenBad: {
                delegateClass: MintDelegateWithGenericUuts,
                validateConfig(args) {
                    //@ts-expect-error
                    if (args.bad) {
                        //note, this isn't the normal way of validating.
                        //  ... usually it's a good field name whose value is missing or wrong.
                        //  ... still, this conforms to the ErrorMap protocol good enough for testing.
                        return { bad: ["must not be provided"] };
                    }
                },
            },
        });

        return delegateRoles({
            ...inherited,
            noDefault: defineRole("noDef", CapoMinter, {}),
            mintDelegate,
            namedDelegate: defineRole("dgt", TestNamedDelegate, {
                myDgtV1: {
                    delegateClass: TestNamedDelegate,
                },
            }),
            
        })// as any; // TODO - update types so this structure fits the expected type
    }
}

export class TestNamedDelegate extends ContractBasedDelegate {
    get delegateName() { return "myNamedDgt" }
    scriptBundle() {
        return this.mkBundleWithCapo(UnspecializedDelegateBundle)
    }
}

type localTC = StellarTestContext<DefaultCapoTestHelper<NamedDelegateTestCapo>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(NamedDelegateTestCapo)
        );
    });

    describe("Named delegates", () => {
        describe("the charter has a namedDelegates data structure for semantic delegate links", () => {
            let capo : NamedDelegateTestCapo
            beforeEach<localTC>(async (context) => {
                const {h, h:{network, actors, delay, state} } = context;
                 capo = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });
            })

            it("has a namedDelegates structure in the charter datum", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;

                const charter = await capo.findCharterDatum();
                expect(charter.namedDelegates).toBeTruthy();
                expect(Object.keys(charter.namedDelegates).length).toBe(0);

                const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");
                expect(tcx.state.namedDelegateMyNamedDgt).toBeTruthy()
                await tcx.submit();
                network.tick(1);

                const charter2 = await capo.findCharterDatum();
                expect(charter2.namedDelegates).toBeTruthy();
                console.log("charter2.namedDelegates", charter2.namedDelegates);
                expect(Object.keys(charter2.namedDelegates).length).toBe(1);
            });

            it("the charter.namedDelegates structure can't be updated without the capoGov- authority uut", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
    
                const addedGovToken = vi
                    .spyOn(capo, "txnAddGovAuthority")
                    .mockImplementation(
                        //@ts-expect-error
                        (tcx) => tcx!
                    );
    
                const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");

                expect(addedGovToken).toHaveBeenCalledTimes(1);
                await expect(tcx.submit(expectTxnError)).rejects.toThrow(
                    /missing.*input .* dgTkn capoGov-/
                );
            })

            it.todo("🟥 TODO: TEST a named delegate can only be added if the minter approves its creation", async (context: localTC) => {

            });
            
            it.todo("🟥 TODO: TEST won't mint the new delegate without the seed-utxo being included in the transaction", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                await h.setActor( "tom" );
                // capo = h.strella
                // const withSeed = await capo.addSeedUtxo(h.mkTcx());
                // console.log(" -- ⚗️🐞⚗️🐞 tom's seed won't be used by tina", dumpAny(withSeed));
                // await h.setActor("tina");
                // capo = h.strella;

                // const mintDelegate = await capo.getMintDelegate();
                // vi.spyOn(mintDelegate, "getSeed").mockImplementation((withSeed) => {
                //     return withSeed.getSeedUtxoDetails();
                // })

                // vi.spyOn(capo, "addSeedUtxo").mockImplementation(
                //     //@ts-expect-error
                //     async tcx => tcx
                // );

                // const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");
                // await expect(capo.submit(tcx)).rejects.toThrow(/seed/);
            })

            it("can reject creation of named delegate with name not fitting the minting delegate rules for the application", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                
                const tcx = await capo.mkTxnCreatingTestNamedDelegate("notMyNamedDgt");
                await expect(tcx.submit(expectTxnError)).rejects.toThrow(/unsupported delegate-creation purpose/);
            })


        });
    });
});
