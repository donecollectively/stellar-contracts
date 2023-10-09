import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { DefaultCapo } from "../lib/DefaultCapo";

import { StellarTxnContext } from "../lib/StellarTxnContext";
import { DefaultMinter } from "../lib/DefaultMinter";
import { BasicMintDelegate } from "../lib/delegation/BasicMintDelegate";
import { ADA, addTestContext } from "../lib/testing/types";
import { StellarTestContext } from "../lib/testing/StellarTestContext";

import { Capo, hasAllUuts } from "../lib/Capo";
import {
    DelegateConfigNeeded,
    VariantMap,
    VariantStrategy,
    strategyValidation,
    variantMap,
} from "../lib/delegation/RolesAndDelegates";
import { CustomCapoTestHelper } from "./customizing/CustomCapoTestHelper";
import { CustomTreasury } from "./customizing/CustomTreasury";
// import { RoleDefs } from "../lib/RolesAndDelegates";

type localTC = StellarTestContext<CustomCapoTestHelper>;
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
        await addTestContext(context, CustomCapoTestHelper);
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

                const t: CustomTreasury = await h.initialize();
                expect(t.roles).toBeTruthy();
                expect(t.roles.mintDelegate).toBeTruthy();
                expect(t.roles.mintDelegate.default).toBeTruthy();
            });
        });
        describe("supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()", () => {
            it("withDelegates method starts a transaction with delegate settings", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const tcx = t.withDelegates({
                    mintDelegate: {
                        strategyName: "default",
                        addlParams: {},
                    },
                });
                expect(tcx.selectedDelegates.mintDelegate).toBeTruthy();
            });

            it("txnMustGetDelegate(tcx, role) method retrieves a configured delegate", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const tcx = t.withDelegates({
                    mintDelegate: {
                        strategyName: "default",
                        addlParams: {},
                    },
                });
                expect(
                    t.txnMustGetDelegate(tcx, "mintDelegate")
                ).toBeInstanceOf(BasicMintDelegate);
            });
            it("txnMustGetDelegate() will use a 'default' delegate", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const tcx = t.withDelegates({});

                expect(
                    t.txnMustGetDelegate(tcx, "mintDelegate")
                ).toBeInstanceOf(BasicMintDelegate);
            });

            it("If there is no delegate configured (or defaulted) for the needed role, txnMustGetDelegate throws a DelegateConfigNeeded error.", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const tcx = t.withDelegates({});

                const problem = () => {
                    t.txnMustGetDelegate(tcx, "noDefault");
                };
                expect(problem).toThrow(/no .* delegate for role/);
                expect(problem).toThrow(DelegateConfigNeeded);
            });

            it("If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const problem = () => {
                    t.txnMustGetDelegate(tcx, "mintDelegate");
                };

                let tcx = t.withDelegates({
                    mintDelegate: {
                        strategyName: "default",
                        addlParams: { badSomeUnplannedWay: true },
                    },
                });
                expect(problem).toThrow(/configuration error/);

                tcx = t.withDelegates({
                    mintDelegate: {
                        strategyName: "failsWhenBad",
                        addlParams: { bad: true },
                    },
                });

                expect(problem).toThrow(/validation errors/);
                expect(problem).toThrow(DelegateConfigNeeded);

                try {
                    problem();
                } catch (e) {
                    expect(e.errors.bad[0]).toMatch(/must not/);
                }
            });


            it("If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const problem = () => {
                    t.txnMustGetDelegate(tcx, "mintDelegate");
                };

                let tcx = t.withDelegates({
                    mintDelegate: {
                        strategyName: "badStratName",
                        addlParams: { badSomeUnplannedWay: true },
                    },
                });
                expect(problem).toThrow(/invalid strategy name .*badStratName/);

                tcx = t.withDelegates({
                    mintDelegate: {
                        strategyName: "bogusName",
                        addlParams: { bad: true },
                    },
                });

                expect(problem).toThrow(DelegateConfigNeeded);

                try {
                    problem();
                } catch (e) {
                    expect(Array.isArray(e.availableStrategies), "error.availableStrategies should be an array").toBeTruthy()
                    expect(e.availableStrategies).toContain("default");
                    expect(e.availableStrategies).toContain("failsWhenBad");
                }
            });
        });
        
        describe("Each role uses a RoleVariants structure which can accept new variants", () => {
            it("RoleVariants has type-parameters indicating the baseline types & interfaces for delegates in that role", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                const ok: VariantStrategy<BasicMintDelegate> = {
                    delegateClass: BasicMintDelegate,
                    scriptParams: {},
                    validateScriptParams(): strategyValidation {
                        return undefined;
                    },
                };
                expectTypeOf(ok).toMatchTypeOf<
                    VariantStrategy<BasicMintDelegate>
                >;
                const bad = {
                    // delegateClass: SampleMintDelegate,
                    delegateClass: DefaultCapo,
                    scriptParams: {},
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