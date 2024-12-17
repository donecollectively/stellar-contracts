import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { isValidUtf8 } from "@helios-lang/codec-utils";
import { makeAddress, makeValidatorHash } from "@helios-lang/ledger";

import { CapoMinter } from "../src/minting/CapoMinter";
import { BasicMintDelegate } from "../src/minting/BasicMintDelegate";
import { ADA, addTestContext } from "../src/testing/types";
import { StellarTestContext } from "../src/testing/StellarTestContext";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";

import {
    DelegateConfigNeeded,
    delegateRoles,
    defineRole,
    delegateConfigValidation,
    DelegateSetup,
} from "../src/delegation/RolesAndDelegates";
import { StellarTxnContext } from "../src/StellarTxnContext";
import { configBaseWithRev } from "../src/StellarContract";
import { txAsString } from "../src/diagnostics";
import { MintDelegateWithGenericUuts } from "../src/testing/specialMintDelegate/MintDelegateWithGenericUuts.js";
import { Capo } from "../src/Capo";
import { CapoWithoutSettings } from "../src/CapoWithoutSettings";
import { expectTxnError } from "../src/testing/StellarTestHelper";

class DelegationTestCapo extends CapoWithoutSettings {
    async getMintDelegate(): Promise<MintDelegateWithGenericUuts> {
        return (await super.getMintDelegate()) as MintDelegateWithGenericUuts;
    }

    initDelegateRoles() {
        const inherited = super.initDelegateRoles();
        const { mintDelegate: parentMintDelegate, ...othersInherited } =
            inherited;
        const { uutPurpose, config, delegateClass, delegateType } =
            parentMintDelegate;
        const mintDelegate = defineRole(
            "mintDgt",
            MintDelegateWithGenericUuts,
            {
                validateConfig(args) {},
            }
        );
        const failsWhenBad = defineRole(
            "mintDgt",
            MintDelegateWithGenericUuts,
            {
                validateConfig(args) {
                    //@ts-expect-error
                    if (args.bad) {
                        //note, this isn't the normal way of validating.
                        //  ... usually it's a good field name whose value is missing or wrong.
                        //  ... still, this conforms to the ErrorMap protocol good enough for testing.
                        return { bad: ["must not be provided"] };
                    }
                },
            }
        );

        return delegateRoles({
            ...inherited,
            // noDefault: defineRole("noDef", CapoMinter, {}),
            mintDelegate,
            failsWhenBad,
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
        describe("supports well-typed role declarations", async () => {
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
                expect(t.delegateRoles.mintDelegate).toBeTruthy();
                expect(t.delegateRoles.failsWhenBad).toBeTruthy();
            });
        });

        describe("supports just-in-time configuration using txnCreateDelegateLink()", () => {
            it("txnCreateDelegateLink(tcx, role, delegationSettings) configures a new delegate", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();

                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());
                const tcx1b = await t.txnMintingUuts(
                    await t.tcxWithSeedUtxo(h.mkTcx()),
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
                const mintDelegateLink = t.txnCreateOffchainDelegateLink(
                    tcx1b,
                    "mintDelegate",
                    {
                        uutName: tcx1b.state.uuts.mintDgt.name,
                        config: {},
                    }
                );

                expect((await mintDelegateLink).uutName).toBeTruthy();
                expect((await mintDelegateLink).config).toBeTruthy();
            });

            it.skip("XXXX not wanted anymore: txnCreateDelegateLink(tcx, role) will use a default delegate strategy", async (context: localTC) => {});

            it("If there is no delegate configured for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();
                const purpose = ["x"];
                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());

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
                    {
                        noDefault: "x",
                        badName: "x",
                    }
                );

                // todo: Ideally, this strategy name would be a type error.
                const problem = t.txnCreateOffchainDelegateLink(
                    tcx1b,
                    "badName",
                    {
                        uutName: tcx1b.state.uuts.noDefault.name,
                        config: {},
                    }
                );
                expect(problem).rejects.toThrow(DelegateConfigNeeded);
                expect(problem).rejects.toThrow(/invalid dgt role requested/);
            });

            it("If the selected delegate role doesn't match a role in the delegate-map, the DelegateConfigNeeded error offers suggested role-names", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();
                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());
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
                    {
                        failsWhenBad: "mintDgt",
                        "invalid-role": "mintDgt",
                    }
                );
                debugger;

                const problem = t
                    .txnCreateOffchainDelegateLink(tcx1b, "invalid-role", {
                        config: {},
                    })
                    .then(() => {
                        return "should not have resolved";
                    });
                expect(problem).rejects.toThrow(DelegateConfigNeeded);
                expect(problem).rejects.toThrow(/invalid dgt role requested/);

                try {
                    await problem;
                } catch (e) {
                    debugger;
                    expect(
                        Array.isArray(e.availableDgtNames),
                        "error.availableDgtNames should be an array"
                    ).toBeTruthy();
                    debugger;
                    expect(e.availableDgtNames).toContain("mintDelegate");
                    expect(e.availableDgtNames).toContain("failsWhenBad");
                }
            });

            it("If the delegate has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();
                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());
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
                    {
                        mintDelegate: "mintDgt",
                        failsWhenBad: "mintDgt",
                    }
                );
                let config: configBaseWithRev & Record<string, any> = {
                    rev: 1n,
                };
                let dgtRole = "mintDelegate";
                const getDelegate = () => {
                    return t
                        .txnCreateOffchainDelegateLink(tcx1b, dgtRole, {
                            uutName: tcx1b.state.uuts.mintDgt.name,
                            config,
                        })
                        .then(() => {
                            return "getDelegate did resolve";
                        });
                };
                await expect(getDelegate()).resolves.toBeTruthy();
                console.log("---------------------------------");

                dgtRole = "failsWhenBad";
                config = { rev: 1n, bad: true };
                const p2 = getDelegate();

                await expect(p2).rejects.toThrow(/validation errors/);
                await expect(p2).rejects.toThrow(DelegateConfigNeeded);
                console.log("---------------------------------");

                try {
                    await getDelegate();
                } catch (e) {
                    expect(e.errors.bad[0]).toMatch(/must not/);
                }
                console.log("---------------------------------");

                // the params-setting function now only warns on unknown parameter-names:
                // dgtRole = "failsWhenBad";
                // config = { rev: 1n, badSomeUnplannedWay: true };
                // const p1 = getDelegate();
                // await expect(p1).rejects.toThrow(/invalid param/);
            });

            it("txnCreateDelegateSettings(tcx, role, delegationSettings) returns the delegate link plus a concrete delegate instance", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();
                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());
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
                        config: {},
                    });
                expect(delegate).toBeTruthy();
                expect(delegateValidatorHash).toBeTruthy();
                expect(
                    delegate.address.isEqual(
                        makeAddress(
                            false,
                            makeValidatorHash(delegateValidatorHash!)
                        )
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
                        config: {},
                    },
                });
                const capo = h.strella;

                const mintDelegate = await capo.getMintDelegate();

                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());
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
                const mintDelegateLink = await t.txnCreateOffchainDelegateLink(
                    tcx1b,
                    "mintDelegate",
                    {
                        uutName: tcx1b.state.uuts.mintDgt.name,
                        config: {},
                    }
                );

                // console.log(
                //     " delegateTxn :::::::::::: ",
                //     txAsString(tcx1b.tx, t.networkParams)
                // );

                const createdDelegate =
                    await t.connectDelegateWithOnchainRDLink(
                        "mintDelegate",
                        t.mkOnchainRelativeDelegateLink(mintDelegateLink)
                    );

                expect(createdDelegate.address.toString()).toBeTruthy();
            });
        });

        describe("Each delegate's UUT has a capoAddr pointing back to the capo, for positive connectivity", () => {
            it("expects the minter to fail creating the mint delegate without the expected capoAddr", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const t = await h.initialize();

                throw new Error(`test not implemented`);
            });
            });
        });
        describe("the mint delegate token is used for enforcing minting policy", () => {
            it("builds minting txns that include the mintDgt and reference script", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;

                // initial mint-delegate creation creates an on-chain reference script:
                const t = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();

                const tcx2a = await t.tcxWithSeedUtxo(h.mkTcx());
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
                await expect(tcx2b.submit()).resolves.toBeTruthy();

                // uses the reference script in the minting txn:
                expect(
                    tcx2b.txRefInputs.find(
                        (i) =>
                            i.output.refScript?.toString() ==
                            mintDelegate.compiledScript.toString()
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
                        config: {},
                    },
                });

                const mintDelegate = await t.getMintDelegate();
                vi.spyOn(mintDelegate, "txnGrantAuthority").mockImplementation(
                    async (tcx) => tcx
                );

                const tcx1a = await t.tcxWithSeedUtxo(h.mkTcx());
                const purpose = ["anything"];
                const tcx1b = await t.txnMintingUuts(tcx1a, purpose, {
                    mintDelegateActivity:
                        mintDelegate.activityMintingUutsAppSpecific(
                            tcx1a,
                            purpose
                        ),
                });
                await expect(tcx1b.submit(expectTxnError)).rejects.toThrow(
                    /missing .*mintDgt/
                );
            });

            it("requires that the mintDgt datum is unmodified", async (context: localTC) => {
                // prettier-ignore
                const {h, h:{network, actors, delay, state} } = context;
                const capo = await h.bootstrap({
                    mintDelegateLink: {
                        config: {},
                    },
                });

                const mintDelegate = await capo.getMintDelegate();
                const spy = vi
                    .spyOn(mintDelegate, "mkDelegationDatum")
                    .mockImplementation((...args) => {
                        // const [dd, s] = args;
                        const { capoAddr, mph, tn } = mintDelegate.configIn!;
                        const tn2 = [...tn];
                        // replace the start of the token name
                        // with bytes spelling "BOGUS!".
                        tn2[0] = 66; // "B"
                        tn2[1] = 79; // "O"
                        tn2[2] = 71; // "G"
                        tn2[3] = 85; // "U"
                        tn2[4] = 83; // "S"
                        tn2[5] = 33; // "!"

                        return mintDelegate.mkDatumIsDelegation({
                            capoAddr,
                            mph,
                            tn: tn2,
                        });
                    });
                const tcx1a = await capo.tcxWithSeedUtxo(h.mkTcx());
                const purpose = ["anything"];
                const tcx1b = await capo.txnMintingUuts(tcx1a, purpose, {
                    mintDelegateActivity:
                        mintDelegate.activityMintingUutsAppSpecific(
                            tcx1a,
                            purpose
                        ),
                });
                expect(spy).toHaveBeenCalled();
                console.log(
                    "------ submitting bogus txn with modified delegate datum"
                );
                const submitting = tcx1b.submit(expectTxnError);
                // await submitting
                await expect(submitting).rejects.toThrow(
                    // /delegation datum must not be modified/
                    /modified dgtDtm/
                );
            });
        });
    });
});
