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
import { DefaultCapo } from "../src/DefaultCapo";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../src/StellarTxnContext";
import { MintingPolicyHash } from "@hyperionbt/helios";
// import { DefaultMinter } from "../src/DefaultMinter";
// import { BasicMintDelegate } from "../src/delegation/BasicMintDelegate";
import { ADA, addTestContext } from "../src/testing/";
import { StellarTestContext } from "../src/testing/";

import { Capo, hasAllUuts } from "../src/Capo";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper";
import { stringToNumberArray } from "../src/utils";
// import { RoleDefs } from "../src/RolesAndDelegates";

type localTC = StellarTestContext<DefaultCapoTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

type smokeTestType = typeof it
const smokeTest = (smoke ? fit : it) as smokeTestType ;

describe("StellarContract", async () => {
    beforeEach<localTC>(async (context) => {
        // await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
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
        it("getter: onChainActivitiesType", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.initialize();
            expect(treasury.onChainActivitiesType).toBeTruthy();
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
            expect(treasury.address).toBeInstanceOf(Address);
        });
        describe("getter: mintingPolicyHash", () => {
            it("is defined, by delegation to Capo's for minting-purposed helper", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.bootstrap();

                expect(() => {
                    t.compiledScript.mintingPolicyHash;
                }).toThrow("unexpected");
                expect(t.mph.hex).toEqual(t.mintingPolicyHash.hex);
                expect(t.mph.hex).toEqual(t.minter!.mintingPolicyHash.hex);
                expect(t.minter!.mintingPolicyHash).toBeInstanceOf(
                    MintingPolicyHash
                );
                console.log("--- init again with different seed");
                const t2 = await h.initialize({ randomSeed: 43 });
                await h.bootstrap();
                const t1h = t.mph.hex;
                const t2h = t2.mph.hex;
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

            it("returns a bech32-encoded thing that's not an address for minters", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const treasury = await h.initialize();
                await h.mintCharterToken();

                expect(treasury.minter!.identity.length).toBe(42);
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
            it("allows keys to be added to the tcx state", async () => {
                type FOO = { foo: "bar" };
                const tcx = new StellarTxnContext<FOO>();
                //! basic type-checks only
                tcx.state.foo = "bar";
                //@ts-expect-error
                tcx.state.bad = "bad";
                //@ts-expect-error
                tcx.state.foo = "bad";
            });
        });

        describe("lower-level helpers", () => {
            it("stringToNumberArray()", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.initialize();
                const a = stringToNumberArray("ABCDE");
                expect(a).toHaveLength(5);
                expect(a[0]).toBe(65);
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

                    const t: DefaultCapo = await h.bootstrap();

                    const tokenCount = 19n;
                    const tokenName = "foo";
                    const tv: Value = t.tokenAsValue(tokenName, tokenCount);

                    expect(tv).toBeInstanceOf(Value);
                    expect(
                        tv.assets.get(t.mph, stringToNumberArray(tokenName))
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

                        const tcx = new StellarTxnContext(h.currentActor);
                        const found = await t.mustFindActorUtxo(
                            "biggest",
                            (u) => {
                                return (
                                    (u.value.lovelace > t.ADA(500) && u) ||
                                    undefined
                                );
                            },
                            tcx
                        );
                        // more than 500 ada - actually > 1k with the given setup.
                        expect(found.value.lovelace).toBeGreaterThan(
                            1_000_000_000
                        );
                    });

                    it("uses hasUtxo underneath", async (context: localTC) => {
                        const {
                            h,
                            h: { network, actors, delay, state },
                        } = context;

                        const t = await h.initialize();

                        const tcx = new StellarTxnContext(h.currentActor);
                        let findingInWallet;
                        const hasUtxo = vi
                            .spyOn(t, "hasUtxo")
                            .mockImplementation(async (_a, _b, { wallet }) => {
                                findingInWallet = wallet;
                                return undefined;
                            });
                        await expect(
                            t.mustFindActorUtxo("any", (x) => x, tcx)
                        ).rejects.toThrow();
                        expect(hasUtxo).toHaveBeenCalled();
                        expect(findingInWallet).toBe(actors.tina)
                    });

                    it("throws an error if no utxo is matched", async (context: localTC) => {
                        const {
                            h,
                            h: { network, actors, delay, state },
                        } = context;

                        const t = await h.initialize();
                        const tcx = new StellarTxnContext(h.currentActor);
                        await expect(
                            t.mustFindActorUtxo(
                                "testSomeThing",
                                () => undefined,
                                tcx
                            )
                        ).rejects.toThrow(/testSomeThing.*utxo not found/);
                    });

                    describe("with tokenPredicate", () => {
                        it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                            const {
                                h,
                                h: { network, actors, delay, state },
                            } = context;
                            // await delay(1000)

                            const tina = h.currentActor;
                            const tinaMoney = await tina.utxos;
                            const firstUtxo = tinaMoney[0];

                            const tx = new Tx();

                            tx.addInput(firstUtxo);
                            tx.addOutput(
                                new TxOutput(tina.address, new Value(3n * ADA))
                            );
                            tx.addOutput(
                                new TxOutput(tina.address, new Value(10n * ADA))
                            );
                            tx.addOutput(
                                new TxOutput(tina.address, new Value(32n * ADA))
                            );
                            // console.log("s2")
                            await h.submitTx(tx, "force");
                            h.network.tick(1n);

                            const t: DefaultCapo = await h.initialize();
                            const tcx = new StellarTxnContext(h.currentActor);
                            const isEnoughT = t.mkTokenPredicate(
                                new Value({
                                    lovelace: 42000,
                                })
                            );
                            const u1 = await t.mustFindActorUtxo(
                                "first with token",
                                isEnoughT,
                                tcx
                            );
                            const u1a = await t.mustFindActorUtxo(
                                "t1a",
                                isEnoughT
                            );
                            const u1b = await t.mustFindActorUtxo(
                                "t1b",
                                isEnoughT,
                                tcx
                            );

                            expect(t.toUtxoId(u1a)).toEqual(t.toUtxoId(u1));
                            expect(t.toUtxoId(u1b)).toEqual(t.toUtxoId(u1));

                            tcx.addInput(u1);
                            const u2 = await t.mustFindActorUtxo(
                                "second with token",
                                isEnoughT,
                                tcx
                            );
                            tcx.addCollateral(u2);
                            const u3 = await t.mustFindActorUtxo(
                                "third, with token",
                                isEnoughT,
                                tcx
                            );

                            // yes, but it doesn't mean anything; different refs to same details
                            //  will also not be === despite being equivalent.
                            expect(u2 === u1).not.toBeTruthy();
                            expect(u3 === u1).not.toBeTruthy();
                            expect(u3 === u2).not.toBeTruthy();

                            // using the utxo's own eq() logic:
                            expect(u2.eq(u1)).not.toBeTruthy();
                            expect(u3.eq(u1)).not.toBeTruthy();
                            expect(u3.eq(u2)).not.toBeTruthy();

                            // using stringified forms:
                            const t1 = t.toUtxoId(u1);
                            const t2 = t.toUtxoId(u2);
                            const t3 = t.toUtxoId(u3);
                            expect(t2).not.toEqual(t1);
                            expect(t3).not.toEqual(t1);
                            expect(t3).not.toEqual(t2);

                            // console.log({t1, t2, eq: u1.eq(u2), identical: u2 === u1});
                        });
                    });
                });
                describe("with valuePredicate for ada-only", () => {
                    it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                        const {
                            h,
                            h: { network, actors, delay, state },
                        } = context;
                        // await delay(1000)
                        const t: DefaultCapo = await h.initialize();
                        const tcx = new StellarTxnContext(h.currentActor);

                        const tina = h.currentActor;
                        const tinaMoney = await tina.utxos;
                        const firstUtxo = tinaMoney[0];

                        const tx = new Tx();

                        tx.addInput(firstUtxo);
                        tx.addOutput(
                            new TxOutput(tina.address, new Value(3n * ADA))
                        );
                        tx.addOutput(
                            new TxOutput(tina.address, new Value(45n * ADA))
                        );
                        tx.addOutput(
                            new TxOutput(tina.address, new Value(77n * ADA))
                        );
                        // console.log("s2")
                        await h.submitTx(tx, "force");
                        h.network.tick(1n);

                        const isEnough = t.mkValuePredicate(42_000n, tcx);
                        const u1 = await t.mustFindActorUtxo(
                            "first",
                            isEnough,
                            tcx
                        );
                        const u1a = await t.mustFindActorUtxo("1a", isEnough);
                        const u1b = await t.mustFindActorUtxo(
                            "1b",
                            isEnough,
                            tcx
                        );

                        expect(t.toUtxoId(u1a)).toEqual(t.toUtxoId(u1));
                        expect(t.toUtxoId(u1b)).toEqual(t.toUtxoId(u1));

                        tcx.addInput(u1);
                        const u2 = await t.mustFindActorUtxo(
                            "second",
                            isEnough,
                            tcx
                        );
                        tcx.addCollateral(u2);
                        const u3 = await t.mustFindActorUtxo(
                            "#3with token",
                            isEnough,
                            tcx
                        );

                        // yes, but it doesn't mean anything; different refs to same details
                        //  will also not be === despite being equivalent.
                        expect(u2 === u1).not.toBeTruthy();
                        expect(u3 === u1).not.toBeTruthy();
                        expect(u3 === u2).not.toBeTruthy();

                        // using the utxo's own eq() logic:
                        expect(u2.eq(u1)).not.toBeTruthy();
                        expect(u3.eq(u1)).not.toBeTruthy();
                        expect(u3.eq(u2)).not.toBeTruthy();

                        // using stringified forms:
                        const t1 = t.toUtxoId(u1);
                        const t2 = t.toUtxoId(u2);
                        const t3 = t.toUtxoId(u3);
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

                    const tcx = new StellarTxnContext(h.currentActor);
                    let foundAddress;
                    const hasUtxo = vi
                        .spyOn(t, "hasUtxo")
                        .mockImplementation(async (_a, _b, { address }) => {
                            foundAddress = address;
                            return undefined;
                        });
                    await expect(
                        t.mustFindMyUtxo("any", (x) => x, tcx)
                    ).rejects.toThrow();
                    expect(hasUtxo).toHaveBeenCalled();
                    expect(foundAddress.toBech32()).toEqual(
                        t.address.toBech32()
                    );
                });
            });

            describe("mustFindUtxo", () => {
                it("uses hasUtxo underneath", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t = await h.initialize();

                    const tcx = new StellarTxnContext(h.currentActor);
                    let foundAddress;
                    const hasUtxo = vi
                        .spyOn(t, "hasUtxo")
                        .mockImplementation(async (_a, _b, { address }) => {
                            foundAddress = address;
                            return undefined;
                        });
                    await expect(
                        t.mustFindUtxo("any", (x) => x, {
                            address: actors.tracy.address,
                        })
                    ).rejects.toThrow();
                    expect(hasUtxo).toHaveBeenCalled();
                    expect(foundAddress.toBech32()).toEqual(
                        actors.tracy.address.toBech32()
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
});

const seconds = 1000; // milliseconds
