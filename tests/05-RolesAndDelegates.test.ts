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
import { configBase } from "../src/StellarContract";
import { txAsString } from "../src/diagnostics";
import { Address } from "@hyperionbt/helios";
import { MintDelegateWithGenericUuts } from "./specialMintDelegate/MintDelegateWithGenericUuts";

class DelegationTestCapo extends DefaultCapo {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
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
        await new Promise((res) => setTimeout(res, 10));
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
                expect(
                    t.delegateRoles.mintDelegate.variants.defaultV1
                ).toBeTruthy();
            });
        });

        describe("supports just-in-time strategy-selection using txnCreateDelegateLink()", () => {
            it("txnCreateDelegateLink(tcx, role, delegationSettings) configures a new delegate", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();

                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const tcx1b = await t.txnMintingUuts(
                    await t.addSeedUtxo(h.mkTcx()),
                    ["mintDgt"],
                    {
                        // just give it **something**:
                        // this isn't really relevant to the test's purpose:
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(tcx1a, [
                                "mintDgt",
                            ]),
                    },
                    { mintDelegate: "mintDgt" }
                );
                const mintDelegateLink = t.txnCreateDelegateLink(
                    tcx1b,
                    "mintDelegate",
                    {
                        strategyName: "defaultV1",
                    }
                );

                expect((await mintDelegateLink).strategyName).toBeTruthy();
                expect((await mintDelegateLink).uutName).toBeTruthy();
                expect((await mintDelegateLink).config).toBeTruthy();
            });

            it.skip("XXXX not wanted anymore: txnCreateDelegateLink(tcx, role) will use a default delegate strategy", async (context: localTC) => {});

            it("If there is no delegate configured for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();
                const purpose = ["x"];
                const tcx1a = await t.addSeedUtxo(h.mkTcx());

                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose,
                    {
                        // just give it **something**:
                        // this isn't really relevant to the test's purpose:
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    },
                    { noDefault: "x" }
                );

                const problem = t.txnCreateDelegateLink(tcx1b, "noDefault");
                expect(problem).rejects.toThrow(/no .* delegate for role/);
                expect(problem).rejects.toThrow(DelegateConfigNeeded);
            });

            it("If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();
                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["mintDgt"];
                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose,
                    {
                        // just give it **something**:
                        // this isn't really relevant to the test's purpose:
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    },
                    { mintDelegate: "mintDgt" }
                );

                expect(
                    t.txnCreateDelegateLink(tcx1b, "mintDelegate", {
                        strategyName: "badStratName",
                    })
                ).rejects.toThrow(/invalid strategyName .*badStratName/);

                const problem = t.txnCreateDelegateLink(tcx1b, "mintDelegate", {
                    strategyName: "badStratName",
                    config: { bad: true },
                });
                expect(problem).rejects.toThrow(DelegateConfigNeeded);

                try {
                    await problem;
                } catch (e) {
                    expect(
                        Array.isArray(e.availableStrategies),
                        "error.availableStrategies should be an array"
                    ).toBeTruthy();
                    debugger;
                    expect(e.availableStrategies).toContain("defaultV1");
                    expect(e.availableStrategies).toContain("failsWhenBad");
                }
            });

            it("If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();
                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["mintDgt"];
                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose,
                    {
                        // just give it **something**:
                        // this isn't really relevant to the test's purpose:
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    },
                    { mintDelegate: "mintDgt" }
                );
                let config: configBase = { rev: 1n, badSomeUnplannedWay: true };
                const getDelegate = () => {
                    return t.txnCreateDelegateLink(tcx1b, "mintDelegate", {
                        strategyName: "failsWhenBad",
                        config,
                    });
                };

                expect(getDelegate()).resolves.toBeTruthy();

                config = { rev: 1n, bad: true };
                const p = getDelegate();
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
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();
                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["mintDgt"];

                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose,
                    {
                        // just give it **something**:
                        // this isn't really relevant to the test's purpose:
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    },
                    { mintDelegate: "mintDgt" }
                );

                const { delegate, delegateValidatorHash } =
                    await t.txnCreateConfiguredDelegate(tcx1b, "mintDelegate", {
                        strategyName: "defaultV1",
                    });
                expect(delegate).toBeTruthy();
                expect(delegateValidatorHash).toBeTruthy();
                expect(
                    delegate.address.eq(
                        Address.fromHash(delegateValidatorHash!)
                    ),
                    "addresses should have matched"
                ).toBeTruthy();
            });
        });

        describe("given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings", () => {
            it("txnCreateDelegateLink(tcx, role, partialLink) method returns configured delegate link", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });
                const capo = h.strella;

                const mintDelegate = await capo.getMintDelegate();

                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["mintDgt"];
                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose,
                    {
                        // just give it **something**:
                        // this isn't really relevant to the test's purpose:
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    },
                    { mintDelegate: "mintDgt" }
                );
                const mintDelegateLink = await t.txnCreateDelegateLink(
                    tcx1b,
                    "mintDelegate",
                    { strategyName: "defaultV1" }
                );

                console.log(
                    " delegateTxn :::::::::::: ",
                    txAsString(tcx1b.tx, t.networkParams)
                );
                const createdDelegate = await t.connectDelegateWithLink(
                    "mintDelegate",
                    mintDelegateLink
                );

                expect(createdDelegate.address.toBech32()).toBeTruthy();
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
                assertType<
                    RoleInfo<BasicMintDelegate, any, any, any>["variants"]
                >({
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
        describe("the mint delegate token is used for enforcing minting policy", () => {
            it("builds minting txns that include the mintDgt and reference script", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;

                // initial mint-delegate creation creates an on-chain reference script:
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();

                const tcx2a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["anything"];
                const tcx2b = await t.txnMintingUuts(tcx2a, purpose, {
                    mintDelegateActivity:
                        mintDelegate.activityMintingUutsAppSpecific(
                            tcx2a,
                            purpose
                        ),
                });

                const spentDgtToken = tcx2b.inputs.find(
                    mintDelegate.mkAuthorityTokenPredicate()
                );
                const returnedToken = tcx2b.outputs.find(
                    mintDelegate.mkAuthorityTokenPredicate()
                );
                expect(spentDgtToken).toBeTruthy();
                expect(returnedToken).toBeTruthy();
                await expect(t.submit(tcx2b)).resolves.toBeTruthy();

                // uses the reference script in the minting txn:
                expect(
                    tcx2b.txRefInputs.find(
                        (i) =>
                            i.origOutput.refScript?.serialize() ==
                            mintDelegate.compiledScript.serialize()
                    )
                ).toBeTruthy();
            });

            it.todo(
                "can spend the ReferenceScript utxo and recover its minUtxo",
                async (context: localTC) => {
                    // ... when the mintDgt token is retired, the ReferenceScript is also retired
                    // the ReferenceScript spend (Retiring) requires the mintDgt token to be spent
                    // ... the mintDgt token spend (Retiring) requires
                    //   - must get govAuthz from the Capo (ref: charter token + govAuthz token)
                    //   - must spend ReferenceScript datum (not back into the mint-delegate
                    //   - must burn the mintDgt token?  or just as good possibly: put it into a replacement delegate script
                }
            );

            it("won't mint in a txn not including the mintDgt", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }                
                });

                const mintDelegate = await t.getMintDelegate();
                vi.spyOn(mintDelegate, "txnGrantAuthority").mockImplementation(
                    async (tcx) => tcx
                );

                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["anything"];
                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose, 
                    {
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    }
                );
                await expect(t.submit(tcx1b)).rejects.toThrow(
                    /missing .*mintDgt/
                );
            });

            it("requires that the mintDgt datum is unmodified", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        strategyName: "canMintGenericUuts",
                    }
                });

                const mintDelegate = await t.getMintDelegate();
                const spy = vi
                    .spyOn(mintDelegate, "mkDelegationDatum")
                    .mockImplementation((...args) => {
                        const [dd, s] = args;
                        const { capoAddr, mph, tn } = mintDelegate.configIn!;
                        const badValue = tn[4] + 1;
                        tn[4] = badValue;
                        return mintDelegate.mkDatumIsDelegation({
                            capoAddr,
                            mph,
                            tn,
                        });
                    });
                const tcx1a = await t.addSeedUtxo(h.mkTcx());
                const purpose = ["anything"];
                const tcx1b = await t.txnMintingUuts(
                    tcx1a,
                    purpose, 
                    {
                        mintDelegateActivity:
                            mintDelegate.activityMintingUutsAppSpecific(
                                tcx1a,
                                purpose
                            ),
                    }
                );
                expect(spy).toHaveBeenCalled();
                console.log(
                    "------ submitting bogus txn with modified delegate datum"
                );
                await expect(t.submit(tcx1b)).rejects.toThrow(
                    // /delegation datum must not be modified/
                    /modified dgtDtm/
                );
            });
        });
    });
});
