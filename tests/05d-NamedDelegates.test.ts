import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import {
    Capo,
    StellarTxnContext,
    ContractBasedDelegate,
    CapoHeliosBundle,
    CapoWithoutSettings,
    type ConfigFor,
    TxDescription,
    parseCapoJSONConfig,
    delegateRoles,
    defineRole,
    txn,
    UnspecializedDgtBundle,
    UnspecializedDelegateBridge
} from "@donecollectively/stellar-contracts";

import { ADA, addTestContext } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts";
import { expectTxnError } from "../src/testing/StellarTestHelper";

export class MyAppCapo extends CapoHeliosBundle {
    get modules() {
        return [
            ...super.modules,
            // additional custom .hl module imports here
        ];
    }
}

class NamedDelegateTestCapo extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
    }

    scriptBundle() {
        return new CapoHeliosBundle();
    }
    
    @txn
    async mkTxnCreatingTestNamedDelegate<const P extends string>(purpose: P) {
        const mintDelegate = await this.getMintDelegate();
        const tcx1 = await this.tcxWithSeedUtxo(mintDelegate.mkTcx());
        return this.mkTxnAddingNamedDelegate(
            purpose,
            {
                config: {},                
                mintSetup: {                    
                    mintDelegateActivity: mintDelegate.activity.CapoLifecycleActivities.CreatingDelegate(tcx1, {purpose})
                }
            },
            tcx1
        );
    }

    initDelegateRoles() {
        const inherited = super.initDelegateRoles();
        const { mintDelegate: parentMintDelegate, ...othersInherited } =
            inherited;
        const {
            config,
            delegateClass,
            delegateType,
            uutPurpose,
        } = parentMintDelegate;
        const mintDelegate = defineRole("mintDgt", MintDelegateWithGenericUuts, {
            // defaultV1: {
            //     delegateClass: BasicMintDelegate,
            //     validateConfig(args) {},
            // },

            delegateClass: MintDelegateWithGenericUuts,
            validateConfig(args) {
            }
        })
        const failsWhenBad = defineRole("mintDgt", MintDelegateWithGenericUuts, {
            validateConfig(args) {
                //@ts-expect-error
                if (args.bad) {
                    //note, this isn't the normal way of validating.
                    //  ... usually it's a good field name whose value is missing or wrong.
                    //  ... still, this conforms to the ErrorMap protocol good enough for testing.
                    return { bad: ["must not be provided"] };
                }
            },
        })

        return delegateRoles({
            ...inherited,
            // noDefault: defineRole("", CapoMinter, {}),
            mintDelegate,
            failsWhenBad,
            myNamedDgt: defineRole("other", TestNamedDelegate, {
                partialConfig: {
                    rev: 1n,
                    isMintDelegate: false,
                    isSpendDelegate: false,
                }
            })
            
        })// as any; // TODO - update types so this structure fits the expected type
    }
}

export class TestNamedDelegate extends ContractBasedDelegate {
    get delegateName() { return "myNamedDgt" }
    dataBridgeClass = UnspecializedDelegateBridge
    scriptBundle() {
        //todo: change this to use a different bundle class
        return UnspecializedDgtBundle.create()
    }
}

type localTC = StellarTestContext<DefaultCapoTestHelper<NamedDelegateTestCapo>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can hgave skip<HeliosTestingContext>
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

    describe("Named delegates: not supported for now", () => {
        describe("Named delegates was an earlier feature that may never be needed since DgDataContract became available", () =>{
            it.skip("not supported for now", async (context: localTC) => {})
        })
        describe.skip("the charter has a namedDelegates data structure for semantic delegate links", () => {
            let capo : NamedDelegateTestCapo
            beforeEach<localTC>(async (context) => {
                const {h, h:{network, actors, delay, state} } = context;
                 capo = await h.bootstrap({
                    mintDelegateLink: {
                        config: {}
                    }
                });
            })

            it("has a namedDelegates structure in the charter datum", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;

                const charter = await capo.findCharterData();
                expect(charter.otherNamedDelegates).toBeTruthy();
                expect(Object.keys(charter.otherNamedDelegates).length).toBe(0);

                const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");
                expect(tcx.state.namedDelegateMyNamedDgt).toBeTruthy()
                await h.submitTxnWithBlock(tcx)
                network.tick(1);

                const charter2 = await capo.findCharterData();
                expect(charter2.otherNamedDelegates).toBeTruthy();
                console.log("charter2.namedDelegates", charter2.otherNamedDelegates);
                expect(charter2.otherNamedDelegates.size).toBe(1);
            });

            it("the charter.otherNamedDelegates structure can't be updated without the capoGov- authority uut", async (context: localTC) => {
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
                await expect(tcx.submitAll(expectTxnError)).rejects.toThrow(
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
                // const withSeed = await capo.tcxWithSeedUtxo(h.mkTcx());
                // console.log(" -- ⚗️🐞⚗️🐞 tom's seed won't be used by tina", dumpAny(withSeed));
                // await h.setActor("tina");
                // capo = h.strella;

                // const mintDelegate = await capo.getMintDelegate();
                // vi.spyOn(mintDelegate, "getSeed").mockImplementation((withSeed) => {
                //     return withSeed.getSeedUtxoDetails();
                // })

                // vi.spyOn(capo, "tcxWithSeedUtxo").mockImplementation(
                //     //@ts-expect-error
                //     async tcx => tcx
                // );

                // const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");
                // await expect(capo.submit(tcx)).rejects.toThrow(/seed/);
            })

        });
    });
});
