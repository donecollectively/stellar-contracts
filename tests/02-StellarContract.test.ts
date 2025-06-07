const smoke = process.env.SMOKE || 0;

import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
    assertType,
    expectTypeOf,
} from "vitest";

import { makeValue, Value, Address } from "@helios-lang/ledger";
import { makeTxBuilder } from "@helios-lang/tx-utils";
import {
    CapoWithoutSettings,
    StellarTxnContext,
    textToBytes,
} from "@donecollectively/stellar-contracts";
// import { DefaultMinter } from "../src/DefaultMinter";
// import { BasicMintDelegate } from "../src/delegation/BasicMintDelegate";
import { ADA, addTestContext } from "../src/testing/";
import { StellarTestContext } from "../src/testing/";

import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";

type localTC = StellarTestContext<DefaultCapoTestHelper<CapoWithoutSettings>>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

type smokeTestType = typeof it;
const smokeTest = (smoke ? fit : it) as smokeTestType;

describe("StellarContract", async () => {
    beforeEach<localTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(
            context,
            DefaultCapoTestHelper<CapoWithoutSettings>
        );
    });

    describe("things provided by the base class", () => {
        it("getter: onChainDatumType", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.initialize();
            expect(treasury.onChainDatumType).toBeTruthy();
        });
        it("private getter: onChainActivitiesType", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.initialize();
            const ocat = treasury.onChainActivitiesType;
            expect(ocat).toBeTruthy();
        });
        it("getter: onChainTypes", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.initialize();
            expect(treasury.onChainTypes).toBeTruthy();
        });

        smokeTest("getter: purpose", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.bootstrap();

            expect(treasury.purpose).toBe("spending");
            expect(treasury.minter!.purpose).toBe("minting");
        });
        it("getter: address", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.initialize();
            expect(treasury.address.kind).toBe("Address");
        });
        describe("getter: mintingPolicyHash", () => {
            it("is defined, by delegation to Capo's minting-purposed helper", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.bootstrap();

                expect(t.mph.toHex()).toEqual(t.mintingPolicyHash.toHex());
                expect(t.mph.toHex()).toEqual(
                    t.minter!.mintingPolicyHash.toHex()
                );
                expect(t.minter!.mintingPolicyHash.kind).toBe(
                    "MintingPolicyHash"
                );
                console.log("--- init again with different seed");
                const t2 = await h.initialize({ randomSeed: 43 });
                await h.bootstrap();
                const t1h = t.mph.toHex();
                const t2h = t2.mph.toHex();
                expect(t2h).not.toEqual(t1h);
            });
        });

        describe("getter: identity", () => {
            it("returns a bech32-encoded address for validators", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const treasury = await h.initialize();
                expect(treasury.identity.length).toBe(63);
            });

            it("returns a hex-encoded policy-id for minters", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const treasury = await h.initialize();
                await h.mintCharterToken();
                expect(treasury.minter!.identity.length).toBe(56);
            });
        });

        describe("getter: mph", () => {
            it.todo("works on non-minting leader contracts", async () => {
                //!!! todo: develop Capo subclass
                //!!! todo simple test here
            });
            //!!! more tests as needed
        });

        describe("transaction context: state", () => {
            it("allows keys to be added to the tcx state", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                type FOO = { foo: "bar"; uuts: {} };
                await h.initialize();
                const tcx: StellarTxnContext<FOO> = context.h.mkTcx();
                //! basic type-checks only
                tcx.state.foo = "bar";
                //@ts-expect-error
                tcx.state.bad = "bad";
                //@ts-expect-error
                tcx.state.foo = "bad";
            });
        });

        it.todo(
            "mkValuesEntry() helps make Value objects",
            async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const t = await h.initialize();

                //!!! todo: check involvement in tokenAsValue
            }
        );

        describe("tokenAsValue()", () => {
            it("makes a Value from a token name, using the contract's mph", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t: CapoWithoutSettings = await h.bootstrap();

                const tokenCount = 19n;
                const tokenName = "foo";
                const tv: Value = t.tokenAsValue(tokenName, tokenCount);
                expect(tv.kind).toBe("Value");
                expect(
                    tv.assets.getAssetClassQuantity([
                        t.mph,
                        textToBytes(tokenName),
                    ])
                ).toBe(tokenCount);
            });
        });
    });

    describe("transaction helpers", () => {
        describe("ADA(n)", () => {
            it("returns bigint lovelace for the indicated ADA amount", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();
                expect(t.ADA(42)).toBe(42_000_000n);
            });
            it("accepts integer or bigint, or fractional number", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();

                expect(t.ADA(4n)).toBe(4_000_000n);
                expect(t.ADA(2)).toBe(2_000_000n);
                expect(t.ADA(3.141593)).toBe(3_1415_93n);
            });

            it("returns ONLY integer lovelace even if given a numeric having a very small fractional part", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();

                expect(t.ADA(3.141592653589793238)).toBe(3_1415_93n);
                expect(t.ADA(0.0000001)).toBe(0n);
            });
        });

        describe("finding utxos", () => {
            describe("mustFindActorUtxo", () => {
                it("finds a first matching utxo in the current user's wallet, based on a value predicate function", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t = await h.initialize();

                    const tcx = h.mkTcx();
                    const found = await t.uh.mustFindActorUtxo("biggest", {
                        predicate: (u) => {
                            return (
                                (u.value.lovelace > t.ADA(500) && u) ||
                                undefined
                            );
                        },
                        exceptInTcx: tcx,
                    });
                    // more than 500 ada - actually > 1k with the given setup.
                    expect(found.value.lovelace).toBeGreaterThan(1_000_000_000);
                });

                it("uses hasUtxo underneath", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t = await h.initialize();

                    const tcx = h.mkTcx();
                    let findingInWallet;
                    const hasUtxo = vi
                        .spyOn(t.utxoHelper, "hasUtxo")
                        .mockImplementation(async (_a, _b, { wallet }) => {
                            findingInWallet = wallet;
                            return undefined;
                        });
                    await expect(
                        t.utxoHelper.mustFindActorUtxo("any", {
                            predicate: (x) => x,
                            exceptInTcx: tcx,
                        })
                    ).rejects.toThrow();
                    expect(hasUtxo).toHaveBeenCalled();
                    expect(findingInWallet).toBe(actors.tina);
                });

                it("throws an error if no utxo is matched", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t = await h.initialize();
                    const tcx = h.mkTcx();
                    await expect(
                        t.utxoHelper.mustFindActorUtxo("testSomeThing", {
                            predicate: () => undefined,
                            exceptInTcx: tcx,
                        })
                    ).rejects.toThrow(/testSomeThing.*utxo not found/);
                });

                describe("with tokenPredicate", () => {
                    it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                        const {
                            h,
                            h: { network, actors, delay, state },
                        } = context;
                        await h.initialize();
                        // await delay(1000)

                        const tina = h.wallet;
                        const tinaMoney = await tina.utxos;
                        const firstUtxo = tinaMoney[0];

                        const tx = makeTxBuilder({
                            isMainnet: false,
                        });

                        tx.spendUnsafe(firstUtxo);
                        tx.payUnsafe(tina.address, makeValue(3n * ADA));
                        tx.payUnsafe(tina.address, makeValue(45n * ADA));
                        tx.payUnsafe(tina.address, makeValue(32n * ADA));

                        // console.log("s2")
                        await h.submitTx(
                            await tx.build({
                                changeAddress: tina.address,
                            }),
                            "force"
                        );
                        h.network.tick(1);

                        const capo: CapoWithoutSettings = await h.initialize();
                        const uh = capo.utxoHelper;
                        const tcx = h.mkTcx();
                        const isEnoughT = uh.mkTokenPredicate(makeValue(42000));
                        const u1 = await uh.mustFindActorUtxo(
                            "first with token",
                            { predicate: isEnoughT, exceptInTcx: tcx }
                        );
                        const u1a = await uh.mustFindActorUtxo("t1a", {
                            predicate: isEnoughT,
                        });
                        const u1b = await uh.mustFindActorUtxo("t1b", {
                            predicate: isEnoughT,
                            exceptInTcx: tcx,
                        });

                        expect(uh.toUtxoId(u1a)).toEqual(uh.toUtxoId(u1));
                        expect(uh.toUtxoId(u1b)).toEqual(uh.toUtxoId(u1));

                        tcx.addInput(u1);
                        const u2 = await uh.mustFindActorUtxo(
                            "second with token",
                            {
                                predicate: isEnoughT,
                                exceptInTcx: tcx,
                            }
                        );
                        tcx.addCollateral(u2);
                        const u3 = await uh.mustFindActorUtxo(
                            "third, with token",
                            {
                                predicate: isEnoughT,
                                exceptInTcx: tcx,
                            }
                        );

                        // yes, but it doesn't mean anything; different refs to same details
                        //  will also not be === despite being equivalent.
                        expect(u2 === u1).not.toBeTruthy();
                        expect(u3 === u1).not.toBeTruthy();
                        expect(u3 === u2).not.toBeTruthy();

                        // using the utxo's own eq() logic:
                        expect(u2.isEqual(u1)).not.toBeTruthy();
                        expect(u3.isEqual(u1)).not.toBeTruthy();
                        expect(u3.isEqual(u2)).not.toBeTruthy();

                        // using stringified forms:
                        const t1 = uh.toUtxoId(u1);
                        const t2 = uh.toUtxoId(u2);
                        const t3 = uh.toUtxoId(u3);
                        expect(t2).not.toEqual(t1);
                        expect(t3).not.toEqual(t1);
                        expect(t3).not.toEqual(t2);

                        // console.log({t1, t2, eq: u1.eq(u2), identical: u2 === u1});
                    });
                });
            });
            
            describe("findSufficientActorUtxos()", () => {
                fit("finds a given amount of ada-only utxos, despite not having any single utxo with that amount", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;
                    const t: CapoWithoutSettings = await h.initialize();

                    const uh = t.utxoHelper;
                    const tcx = t.mkTcx();

                    const tina = h.wallet;
                    const tinaMoney = await tina.utxos;
                    const firstUtxo = tinaMoney[0];

                    console.log(" -------------------------- ")

                    const targetAda = 11_002n * 1_000_000n;
                    let steps = 0;
                    // try {
                        console.log("step1")
                        uh.findActorUtxo("not found", (utxo) => utxo.value.lovelace > 42_000_000 ? utxo : undefined)
                        steps++;
                        console.log("step2")
                        const nothing = await uh.findActorUtxo("not found", (utxo) => {
                            console.log("step2.1 - utxo with ", Number(utxo.value.lovelace)/1_000_000, " ada")
                            return ((utxo.value.lovelace > 2n*targetAda) ? utxo : undefined)
                        })
                        expect(nothing).toBeUndefined();
                        // console.log("step2.2 - unexpected: ", weird )
                        // steps++;
                    // } catch (e) {
                    console.log("step3")

                    const f1 = await uh.findSufficientActorUtxos("finds two utxos",  makeValue(targetAda), {
                        wallet: tina
                    })                     
                    console.log("step4")
                    expect(f1.length).toBe(2);
                    await expect(uh.findSufficientActorUtxos("doesn't find larger number", makeValue(2n*targetAda), {
                        wallet: tina
                    })).rejects.toThrow(/Insufficient funds error/);
                });
            });

            describe("with valuePredicate for ada-only", () => {
                it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;
                    // await delay(1000)
                    const t: CapoWithoutSettings = await h.initialize();
                    const uh = t.utxoHelper;
                    const tcx = t.mkTcx();

                    const tina = h.wallet;
                    const tinaMoney = await tina.utxos;
                    const firstUtxo = tinaMoney[0];

                    const tx = makeTxBuilder({
                        isMainnet: false,
                    });

                    tx.spendUnsafe(firstUtxo);
                    tx.payUnsafe(tina.address, makeValue(3n * ADA));
                    tx.payUnsafe(tina.address, makeValue(45n * ADA));
                    tx.payUnsafe(tina.address, makeValue(77n * ADA));

                    // console.log("s2")
                    await h.submitTx(
                        await tx.build({
                            changeAddress: tina.address,
                        }),
                        "force"
                    );
                    h.network.tick(1);

                    const isEnough = uh.mkValuePredicate(42_000n, tcx);
                    const u1 = await uh.mustFindActorUtxo("first", {
                        predicate: isEnough,
                        exceptInTcx: tcx,
                    });
                    const u1a = await uh.mustFindActorUtxo("1a", {
                        predicate: isEnough,
                    });
                    const u1b = await uh.mustFindActorUtxo("1b", {
                        predicate: isEnough,
                        exceptInTcx: tcx,
                    });

                    expect(uh.toUtxoId(u1a)).toEqual(uh.toUtxoId(u1));
                    expect(uh.toUtxoId(u1b)).toEqual(uh.toUtxoId(u1));

                    tcx.addInput(u1);
                    const u2 = await uh.mustFindActorUtxo("second", {
                        predicate: isEnough,
                        exceptInTcx: tcx,
                    });
                    tcx.addCollateral(u2);
                    const u3 = await uh.mustFindActorUtxo("#3with token", {
                        predicate: isEnough,
                        exceptInTcx: tcx,
                    });

                    // yes, but it doesn't mean anything; different refs to same details
                    //  will also not be === despite being equivalent.
                    expect(u2 === u1).not.toBeTruthy();
                    expect(u3 === u1).not.toBeTruthy();
                    expect(u3 === u2).not.toBeTruthy();

                    // using the utxo's own eq() logic:
                    expect(u2.isEqual(u1)).not.toBeTruthy();
                    expect(u3.isEqual(u1)).not.toBeTruthy();
                    expect(u3.isEqual(u2)).not.toBeTruthy();

                    // using stringified forms:
                    const t1 = uh.toUtxoId(u1);
                    const t2 = uh.toUtxoId(u2);
                    const t3 = uh.toUtxoId(u3);
                    expect(t2).not.toEqual(t1);
                    expect(t3).not.toEqual(t1);
                    expect(t3).not.toEqual(t2);

                    // console.log({t1, t2, eq: u1.eq(u2), identical: u2 === u1});
                });
            });
        });

        describe("mustFindMyUtxo", () => {
            it("uses hasUtxo underneath", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();

                const tcx = h.mkTcx();
                let foundAddress;
                const hasUtxo = vi
                    .spyOn(t.utxoHelper, "hasUtxo")
                    .mockImplementation(async (_a, _b, { address }) => {
                        foundAddress = address;
                        return undefined;
                    });
                await expect(
                    t.mustFindMyUtxo("any", {
                        predicate: (x) => x,
                        exceptInTcx: tcx,
                    })
                ).rejects.toThrow();
                expect(hasUtxo).toHaveBeenCalled();
                expect(foundAddress.toBech32()).toEqual(t.address.toString());
            });
        });

        describe("mustFindUtxo", () => {
            it("uses hasUtxo underneath", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();

                h.mkTcx();
                let foundAddress;
                const hasUtxo = vi
                    .spyOn(t.utxoHelper, "hasUtxo")
                    .mockImplementation(async (_a, _b, { address }) => {
                        foundAddress = address;
                        return undefined;
                    });
                await expect(
                    t.utxoHelper.mustFindUtxo("any", {
                        predicate: (x) => x,
                        address: actors.tracy.address,
                    })
                ).rejects.toThrow();
                expect(hasUtxo).toHaveBeenCalled();
                expect(foundAddress.toString()).toEqual(
                    actors.tracy.address.toString()
                );
            });
        });

        describe("TODO: TEST: findAnySpareUtxos()", () => {
            it.todo(
                "finds utxos in the current user's wallet, for use in txn balancing during finalize()"
            );
            it.todo("will only return non-token utxos, if any exist");
            it.todo(
                "ignores token-only utxos, having only the minAda/minUtxo required"
            );
            it.todo(
                "will only include token-bearing utxos if they have at least 2 ADA to spare"
            );
            it.todo("sorts the smallest utxos first");
        });

        describe("submit()", () => {
            it.todo("uses findAnySpareUtxos() to help with txn-balancing");
            it.todo(
                "accepts {signers}, a list of wallets, in arg2, and ensures the tx is expecting their signatures"
            );
            it.todo(
                "implicitly adds the current user's first-used-address, aka primary addr as a signer"
            );
            it.todo(
                "doesn't add current-user to signers if overridden {sign:false} option is provided"
            );
            it.todo(
                "throws a console message and an exception if finalize() fails"
            );
            it.todo("signs the txn with all the indicated {signers}");
            it.todo("finalizes the txn with the indicated signers, if any");
            it.todo("submits the txn to the configured network");
        });
    });

    describe("TODO: TEST: Composing contract constellations", () => {
        it.todo(
            "addScriptWithParams(): instantiates related contracts",
            async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();

                // !!! todo: test it works with a specific example collaborating contract
            }
        );
    });

    describe("TODO: TEST: mkValuePredicate()", () => {
        it.todo(
            "makes a predicate function for filtering any kind of value-bearing data"
        );
        it.todo(
            "requires only a mph/token name, or a Value, to make the predicate function"
        );
        it.todo(
            "returns a predicate that can filter utxos, tx inputs, txoutputs, or assets in a Value"
        );
    });
});

const seconds = 1000; // milliseconds
