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

import { DefaultMinter } from "../src/minting/DefaultMinter";
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
import { configBase } from "../src/StellarContract";
import { txAsString } from "../src/diagnostics";
import { Address } from "@hyperionbt/helios";

class DelegationTestCapo extends DefaultCapo {
    get delegateRoles() {
        const inherited = super.delegateRoles;
        const { 
            mintDelegate: parentMintDelegate,
             ...othersInherited 
        } = inherited;
        const {baseClass, uutPurpose, variants: pVariants} = parentMintDelegate
        const mt = defineRole("mintDgt", BasicMintDelegate, {
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
        });
        const mintDelegate : typeof  parentMintDelegate & typeof mt
        = {
            uutPurpose,
            baseClass,
            variants: {
                ... pVariants,
                ... mt.variants
            },
        };
        
        return delegateRoles({
            ...othersInherited,
            noDefault: defineRole("noDef", DefaultMinter, {}),
            mintDelegate
        });
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
                expect(t.delegateRoles).toBeTruthy();
                expect(t.delegateRoles.mintDelegate.variants).toBeTruthy();
                expect(t.delegateRoles.mintDelegate.variants.default).toBeTruthy();
            });
        });
        describe("supports just-in-time strategy-selection using txnCreateDelegateLink()", () => {
            it("txnCreateDelegateLink(tcx, role, delegationSettings) configures a new delegate", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["mintDgt"],
                    undefined,
                    { mintDelegate: "mintDgt" }
                );
                const mintDelegateLink = t.txnCreateDelegateLink(
                    tcx,
                    "mintDelegate",
                    {
                        strategyName: "default",
                    }
                );

                expect((await mintDelegateLink).strategyName).toBeTruthy();
                expect((await mintDelegateLink).uutName).toBeTruthy();
                expect((await mintDelegateLink).config).toBeTruthy();
            });

            it("txnCreateDelegateLink(tcx, role) will use a 'default' delegate strategy", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["mintDgt"],
                    undefined,
                    { mintDelegate: "mintDgt" }
                );
                console.log("multiple 'txnReceiveAuthorityToken' calls are ok/expected here");
                const mintDelegateLink = await t.txnCreateDelegateLink(
                    tcx,
                    "mintDelegate"
                );

                const mintDelegateLink2 = await t.txnCreateDelegateLink(
                    tcx,
                    "mintDelegate",
                    {
                        strategyName: "default",
                    }
                );

                const createdDelegate = await t.connectDelegateWithLink(
                    "mintDelegate",
                    mintDelegateLink
                );
                const createdDelegate2 = await t.connectDelegateWithLink(
                    "mintDelegate",
                    mintDelegateLink2
                );

                expect(
                    createdDelegate.address.eq(
                        createdDelegate2.address!
                    ), "the default and explicitly-selected 'default' delegates should have the same address"
                ).toBeTruthy();
            });

            it("If there is no delegate configured (or defaulted) for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["x"],
                    undefined,
                    { noDefault: "x" }
                );

                const problem =t.txnCreateDelegateLink(
                        tcx,
                        "noDefault"
                    );
                expect(problem).rejects.toThrow(/no .* delegate for role/);
                expect(problem).rejects.toThrow(DelegateConfigNeeded);            });

            it("If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["mintDgt"],
                    undefined,
                    { mintDelegate: "mintDgt" }
                );
                expect(
                    t.txnCreateDelegateLink(tcx, "mintDelegate", {
                        strategyName: "badStratName",
                    })
                ).rejects.toThrow(/invalid strategyName .*badStratName/);

                const problem = t.txnCreateDelegateLink(tcx, "mintDelegate", {
                        strategyName: "badStratName",
                        config: { bad: true },
                    });
                expect(problem).rejects.toThrow(DelegateConfigNeeded);

                try {
                    await problem
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

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["mintDgt"],
                    undefined,
                    { mintDelegate: "mintDgt" }
                );
                let config: configBase = { badSomeUnplannedWay: true };
                const getDelegate = () => {
                    return t.txnCreateDelegateLink(tcx, "mintDelegate", {
                        strategyName: "failsWhenBad",
                        config,
                    });
                };

                expect(getDelegate()).resolves.toBeTruthy()

                config = { bad: true };
                const p = getDelegate()
                expect(p).rejects.toThrow(/validation errors/);
                expect(p).rejects.toThrow(DelegateConfigNeeded);

                try {
                    await getDelegate();
                } catch (e) {
                    expect(e.errors.bad[0]).toMatch(/must not/);
                }
            });

            it("txnCreateDelegateSettings(tcx, role, delegationSettings) returns the delegate link plus a concrete delegate instance", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["mintDgt"],
                    undefined,
                    { mintDelegate: "mintDgt" }
                );
                const { delegate, delegateValidatorHash } = t.txnCreateConfiguredDelegate(
                    tcx,
                    "mintDelegate"
                );
                expect(delegate).toBeTruthy();
                expect(
                    delegate.address.eq(Address.fromHash(delegateValidatorHash!)),
                    "addresses should have matched"
                ).toBeTruthy();
            });
        });

        describe("given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings", () => {
            it("txnCreateDelegateLink(tcx, role, partialLink) method returns configured delegate link", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap();

                const tcx = await t.mkTxnMintingUuts(
                    new StellarTxnContext(h.currentActor),
                    ["mintDgt"],
                    undefined,
                    { mintDelegate: "mintDgt" }
                );
                const mintDelegateLink = await t.txnCreateDelegateLink(
                    tcx,
                    "mintDelegate"
                );

                console.log(" delegateTxn :::::::::::: ", txAsString(tcx.tx));
                const createdDelegate = await t.connectDelegateWithLink(
                    "mintDelegate",
                    mintDelegateLink
                );

                expect(createdDelegate.address.toBech32()).toBeTruthy()
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
                assertType<RoleInfo<BasicMintDelegate, any,any,any>["variants"]>({
                    ok,
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
