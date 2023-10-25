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

import { DefaultMinter } from "../src/DefaultMinter";
import { BasicMintDelegate } from "../src/delegation/BasicMintDelegate";
import { ADA, addTestContext } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";

import {
    DelegateConfigNeeded,
    RoleMap,
    VariantMap,
    VariantStrategy,
    isRoleMap,
    strategyValidation,
    variantMap,
} from "../src/delegation/RolesAndDelegates";
import { StellarTxnContext } from "../src/StellarTxnContext";
import { configBase } from "../src/StellarContract";
import { txAsString } from "../src/diagnostics";

class DelegationTestCapo extends DefaultCapo {
    get roles() {
        const inherited = super.roles;
        const { mintDelegate, ...othersInherited } = inherited;
        return isRoleMap({
            ...othersInherited,
            noDefault: variantMap<DefaultMinter>({}),
            mintDelegate: variantMap<BasicMintDelegate>({
                ...mintDelegate,
                failsWhenBad: {
                    delegateClass: BasicMintDelegate,
                    validateConfig(args) {
                        if (args.bad) {
                            //note, this isn't the normal way of validating.
                            //  ... usually it's a good field name whose value is missing or wrong.
                            //  ... still, this conforms to the ErrorMap protocol good enough for testing.
                            return { bad: ["must not be provided"] };
                        }
                    },
                },
            }),
        })
    }
}

type localTC = StellarTestContext<DefaultCapoTestHelper<DelegationTestCapo>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

describe("Capo", async () => {
    beforeEach<localTC>(async (context) => {
        // await new Promise(res => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper.forCapoClass(DelegationTestCapo)
        );
    });

    describe("Roles and delegates", () => {
        describe("supports well-typed role declarations and strategy-adding", async () => {
            it("has defined roles", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                //!  temp, unrelated: strips stakey part of cardano address
                // const tt =  new Address("addr1q9g8hpckj8pmhn45v30wkrqfnnkfftamja3y9tcyjrg44cl0wk8n4atdnas8krf94kulzdqsltujm5gzas8rgel2uw0sjk4gt8")
                // const ttt = Address.fromPubKeyHash(tt.pubKeyHash, null, false)
                // console.log("addr of addr1q9g8hpckj8pmhn45v30wkrqfnnkfftamja3y9tcyjrg44cl0wk8n4atdnas8krf94kulzdqsltujm5gzas8rgel2uw0sjk4gt8\n",
                //   "\n    -> ", ttt.toBech32())

                const t = await h.initialize();
                expect(t.roles).toBeTruthy();
                expect(t.roles.mintDelegate).toBeTruthy();
                expect(t.roles.mintDelegate.default).toBeTruthy();
            });
        });
        describe("supports just-in-time strategy-selection using txnCreateDelegateLink()", () => {
            it("txnCreateDelegateLink(tcx, role, delegationSettings) configures a new delegate", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["mintDgt"],
                    undefined,
                    { "mintDelegate": "mintDgt" }
                );
                const mintDelegateLink = t.txnCreateDelegateLink(tcx, "mintDelegate", {
                    strategyName: "default",
                });

                expect(mintDelegateLink.reqdAddress).toBeTruthy()
            });

            it("txnCreateDelegateLink(tcx, role) will use a 'default' delegate strategy", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["mintDgt"],
                    undefined,
                    { "mintDelegate": "mintDgt" }
                );
                const mintDelegateLink = t.txnCreateDelegateLink(tcx, "mintDelegate");
                const mintDelegateLink2 = t.txnCreateDelegateLink(tcx, "mintDelegate", {
                    strategyName: "default",
                });

                expect(mintDelegateLink.reqdAddress!.eq(mintDelegateLink2.reqdAddress!)).toBeTruthy()
            });

            it("If there is no delegate configured (or defaulted) for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["x"],
                    undefined,
                    { "noDefault": "x" }
                );
                
                const problem = () => {
                    const mintDelegateLink = t.txnCreateDelegateLink(tcx, "noDefault");
                };
                expect(problem).toThrow(/no .* delegate for role/);
                expect(problem).toThrow(DelegateConfigNeeded);
            });

            it("If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["mintDgt"],
                    undefined,
                    { "mintDelegate": "mintDgt" }
                );
                expect( () => {
                     t.txnCreateDelegateLink(tcx, "mintDelegate", {strategyName: "badStratName"});
                }).toThrow(/invalid strategyName .*badStratName/);


                const problem = () => {
                    t.txnCreateDelegateLink(tcx, "mintDelegate", {
                        strategyName: "badStratName",
                        config: { bad: true },
                    });
                };
                expect( problem).toThrow(DelegateConfigNeeded);

                try {
                    problem();
                } catch (e) {
                    expect(
                        Array.isArray(e.availableStrategies),
                        "error.availableStrategies should be an array"
                    ).toBeTruthy();
                    debugger;
                    expect(e.availableStrategies).toContain("default");
                    expect(e.availableStrategies).toContain("failsWhenBad");
                }
            });

            it("If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["mintDgt"],
                    undefined,
                    { "mintDelegate": "mintDgt" }
                );
                let config : configBase = { badSomeUnplannedWay: true };
                const getDelegate = () => {
                     t.txnCreateDelegateLink(tcx, "mintDelegate", {strategyName: "failsWhenBad", config})
                };

                expect(getDelegate).not.toThrow(/configuration error/);
                
                config = { bad: true };
                expect(getDelegate).toThrow(/validation errors/);
                expect(getDelegate).toThrow(DelegateConfigNeeded);

                try {
                    getDelegate();
                } catch (e) {
                    expect(e.errors.bad[0]).toMatch(/must not/);
                }
            });

            it("txnCreateDelegateSettings(tcx, role, delegationSettings) returns the delegate link plus a concrete delegate instance", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["mintDgt"],
                    undefined,
                    { "mintDelegate": "mintDgt" }
                );
                const {delegate, reqdAddress} = t.txnCreateConfiguredDelegate(tcx, "mintDelegate" );
                expect(delegate).toBeTruthy();
                expect(delegate.address.eq(reqdAddress!), "addresses should have matched").toBeTruthy()
            });            
        });

        describe("given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings", () => {
            it("txnCreateDelegateLink(tcx, role, partialLink) method returns configured delegate link", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnCreatingUuts(
                    new StellarTxnContext(), 
                    ["mintDgt"],
                    undefined,
                    { "mintDelegate": "mintDgt" }
                );
                const mintDelegateLink = t.txnCreateDelegateLink(tcx, "mintDelegate" );

                console.log(" delegateTxn :::::::::::: ", txAsString(tcx.tx));
                const createdDelegate = await t.connectDelegateWith("mintDelegate", mintDelegateLink)

                expect(
                    createdDelegate.address.toBech32()
                ).toBe(mintDelegateLink.reqdAddress!.toBech32())
            });
        });


        describe("Each role uses a RoleVariants structure which can accept new variants", () => {
            it("RoleVariants has type-parameters indicating the baseline types & interfaces for delegates in that role", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const ok: VariantStrategy<BasicMintDelegate> = {
                    delegateClass: BasicMintDelegate,
                    validateConfig(): strategyValidation {
                        return undefined;
                    },
                };
                expectTypeOf(ok).toMatchTypeOf<
                    VariantStrategy<BasicMintDelegate>
                >;
                const bad = {
                    // delegateClass: SampleMintDelegate,
                    delegateClass: DefaultCapo,
                    validateScriptParams(): strategyValidation {
                        return undefined;
                    },
                };
                assertType<VariantMap<BasicMintDelegate>>({
                    ok,
                    //@ts-expect-error
                    wrong: bad,
                });
            });
            it.todo(
                "variants can augment the definedRoles object without removing or replacing any existing variant",
                async (context: localTC) => {
                    // prettier-ignore
                    const {h, h:{network, actors, delay, state} } = context;
                    const t = await h.initialize();
                    throw new Error(`test not implemented`);
                }
            );
        });
    });
});
