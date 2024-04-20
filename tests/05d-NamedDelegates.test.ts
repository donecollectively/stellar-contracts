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
import { configBase, txn } from "../src/StellarContract";
import { dumpAny, txAsString } from "../src/diagnostics";
import { Address } from "@hyperionbt/helios";
import { MintDelegateWithGenericUuts } from "./specialMintDelegate/MintDelegateWithGenericUuts";
import { StellarDelegate } from "../dist/stellar-contracts";
import { ContractBasedDelegate } from "../src/delegation/ContractBasedDelegate";

class NamedDelegateTestCapo extends DefaultCapo {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
    }

    @txn
    async mkTxnCreatingTestNamedDelegate(purpose: string) {
        const mintDelegate = await this.getMintDelegate();
        const tcx1 = await this.addSeedUtxo(new StellarTxnContext())
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

    get delegateRoles() {
        const inherited = super.delegateRoles;
        const { mintDelegate: parentMintDelegate, ...othersInherited } =
            inherited;
        const {
            baseClass,
            uutPurpose,
            variants: pVariants,
        } = parentMintDelegate;
        const mintDelegate = defineRole("mintDgt", BasicMintDelegate, {
            defaultV1: {
                delegateClass: BasicMintDelegate,
                validateConfig(args) {},

            },

            canMintGenericUuts: {
                delegateClass: MintDelegateWithGenericUuts,
                validateConfig(args) {
                }
            },
            failsWhenBad: {
                delegateClass: MintDelegateWithGenericUuts,
                validateConfig(args) {
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
            namedDelegate: defineRole("dgt", StellarDelegate, {
                myDgtV1: {
                    delegateClass: TestNamedDelegate,
                },
            }),
            
        }) as any; // TODO - update types so this structure fits the expected type
    }
}
export class TestNamedDelegate extends ContractBasedDelegate {
    delegateName = "myNamedDgt"
}


//xxx@ts-expect-error
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
            let capo
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
                await capo.submit(tcx);
                network.tick(1n);

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
                        //xxx@ts-expect-error
                        (tcx) => tcx!
                    );
    
                const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");
                expect(addedGovToken).toHaveBeenCalledTimes(1);
                await expect(capo.submit(tcx)).rejects.toThrow(
                    /missing dgTkn capoGov-/
                );
            })

            it.todo("🟥 TODO: TEST a named delegate can only be added if the minter approves its creation", async (context: localTC) => {

            });
            
            it.todo("🟥 TODO: TEST won't mint the new delegate without the seed-utxo being included in the transaction", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                await h.setActor( "tom" );
                capo = h.strella
                const withSeed = await capo.addSeedUtxo(h.mkTcx());
                console.log(" -- ⚗️🐞⚗️🐞 tom's seed won't be used by tina", dumpAny(withSeed));
                await h.setActor("tina");
                capo = h.strella;

                const mintDelegate = await capo.getMintDelegate();
                vi.spyOn(mintDelegate, "getSeed").mockImplementation(() => {
                    return withSeed.getSeedUtxoDetails();
                })

                vi.spyOn(capo, "addSeedUtxo").mockImplementation(
                    async tcx => tcx
                );

                const tcx = await capo.mkTxnCreatingTestNamedDelegate("myNamedDgt");
                await expect(capo.submit(tcx)).rejects.toThrow(/seed/);
            })

            it("can reject creation of named delegate with name not fitting the minting delegate rules for the application", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                
                const tcx = await capo.mkTxnCreatingTestNamedDelegate("notMyNamedDgt");
                await expect(capo.submit(tcx)).rejects.toThrow(/unsupported delegate-creation purpose/);
            })

        });
    });
});
