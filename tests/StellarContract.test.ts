import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";
import { SampleTreasury } from "../src/examples/SampleTreasury";

import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    TxInput,
    Value,
} from "@hyperionbt/helios";

import { StellarTxnContext } from "../lib/StellarTxnContext";
import { MintingPolicyHash } from "@hyperionbt/helios";
import { DefaultMinter } from "../src/DefaultMinter";
import {
    ADA,
    StellarCapoTestHelper,
    StellarTestContext,
    addTestContext,
} from "../lib/StellarTestHelper";
import { hasUUTs } from "../lib/Capo";

type localTC = StellarTestContext<SampleTreasuryTestHelper>;

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

class SampleTreasuryTestHelper extends StellarCapoTestHelper<SampleTreasury> {
    get stellarClass() {
        return SampleTreasury;
    }
    setupActors() {
        this.addActor("tina", 1100n * ADA);
        this.addActor("tracy", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "tina";
    }

    async mkCharterSpendTx(): Promise<StellarTxnContext> {
        await this.mintCharterToken();

        const treasury = this.strella!;
        const tcx: StellarTxnContext = new StellarTxnContext();

        return treasury.txnAddAuthority(tcx);
    }

    async updateCharter(
        trustees: Address[],
        minSigs: bigint
    ): Promise<StellarTxnContext> {
        await this.mintCharterToken();
        const treasury = this.strella!;

        const { signers } = this.state;

        const tcx = await treasury.mkTxnUpdateCharter(trustees, minSigs);
        return treasury.submit(tcx, { signers }).then(() => {
            this.network.tick(1n);
            return tcx;
        });
    }
}

const notEnoughSignaturesRegex = /not enough trustees.*have signed/;
const wrongMinSigs = /minSigs can't be more than the size of the trustee-list/;
describe("StellarContract", async () => {
    beforeEach<localTC>(async (context) => {
        // await new Promise(res => setTimeout(res, 10));
        await addTestContext(context, SampleTreasuryTestHelper);
    });

    describe("baseline test-env capabilities", () => {
        it("gets expected wallet balances for test-scenario actor", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const { tina, tom, tracy } = actors;

            const tinaMoney = await tina.utxos;
            const tomMoney = await tom.utxos;
            const tracyMoney = await tracy.utxos;
            expect(tinaMoney.length).toBe(2);
            expect(tinaMoney[0].value.assets.nTokenTypes).toBe(0);
            expect(tinaMoney[0].value.assets.isZero).toBeTruthy();
            expect(tinaMoney[1].value.assets.isZero).toBeTruthy();

            expect(tinaMoney[0].value.lovelace).toBe(1100n * ADA);
            expect(tinaMoney[1].value.lovelace).toBe(5n * ADA);

            expect(tomMoney[0].value.lovelace).toBe(120n * ADA);

            expect(tracyMoney[0].value.lovelace).toBe(13n * ADA);
        });

        it("can split utxos", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            h.currentActor = "tom";

            const { tom } = actors;
            const tomMoney = await tom.utxos;
            const firstUtxo = tomMoney[0];

            async function tryWithSlop(margin: bigint) {
                const tx = new Tx();

                tx.addInput(firstUtxo);
                tx.addOutput(new TxOutput(tom.address, new Value(3n * ADA)));
                tx.addOutput(
                    new TxOutput(
                        tom.address,
                        new Value(firstUtxo.value.lovelace - margin)
                    )
                );
                // console.log("s2")
                return h.submitTx(tx, "force");
            }
            console.log("case 1a: should work if finalize doesn't over-estimate fees")
            await expect(tryWithSlop(170000n)).rejects.toThrow(/doesn't have enough inputs to cover the outputs/);
            //!!! todo: once this ^^^^^^^^^^^^^^ starts passing, the other cases below can be removed
            //    ... in favor of something like this: 
            // await tryWithSlop(170000n * ADA);

            console.log("case 1b: should work if finalize doesn't over-estimate fees ")
            await expect(tryWithSlop(5n * ADA)).rejects.toThrow(/doesn't have enough inputs to cover the outputs/);

            console.log("case 2: works if we give it more margin of error in initial fee calc")
            await tryWithSlop(7n * ADA);
            //!!! todo: remove case 1b, case2 after case 1a starts working right.



            const tm2 = await network.getUtxos(tom.address);

            expect(tomMoney.length).not.toEqual(tm2.length);
        });

        it("can wait for future slots", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const waitedSlots = h.waitUntil(
                new Date(new Date().getTime() + 100 * seconds)
            );

            expect(waitedSlots).toBe(100n);
        });

        //     it("can access types in the contract", async (context: localTC) => {
        //         context.randomSeed = 42;
        //         const strella = await context.instantiateWithParams({
        //             nonce: context.mkRandomBytes(16),
        //             initialTrustees: [context.actors.tina.address],
        //         });
        //         const cc = strella.configuredContract;
        //         const {
        //             types: { Redeemer },
        //         } = cc;

        //         expect(Redeemer?.charterMint).toBeTruthy();
        //     });
    });

    describe("has a singleton minting policy", () => {
        it("has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter", async (context: localTC) => {
            context.initHelper({ skipSetup: true });
            const {
                h,
                h: { network, actors, delay, state },
            } = context;
            const seedTxn = await h.mkSeedUtxo().catch((e) => {
                throw e;
            });
            await h.setup({
                seedTxn,
                seedIndex: 0n,
            });

            const unspent = await network.getUtxos(actors.tina.address);
            const empty = unspent.find((x) => {
                return x.txId == seedTxn && BigInt(x.utxoIdx) == 0n;
            });
            expect(empty).toBeFalsy();
        });

        it("makes a different address depending on (txId, outputIndex) parameters of the Minting script", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const t1: SampleTreasury = await h.setup();
            const t2: SampleTreasury = await h.setup({
                randomSeed: 43,
                seedIndex: 1n,
            });

            expect(
                t1.connectMintingScript(t1.getMinterParams()).mintingPolicyHash
                    ?.hex
            ).not.toEqual(
                t2.connectMintingScript(t2.getMinterParams()).mintingPolicyHash
                    ?.hex
            );
        });
    });

    describe("things provided by the base class", () => {
        it("getter: datumType", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.setup();
            expect(treasury.datumType).toBeTruthy();
        });
        it("getter: purpose", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.setup();

            expect(treasury.purpose).toBe("spending");
            expect(treasury.minter!.purpose).toBe("minting");
        });
        it("getter: address", async (context: localTC) => {
            const {
                h,
                h: { network, actors, delay, state },
            } = context;

            const treasury = await h.setup();
            expect(treasury.address).toBeInstanceOf(Address);
        });
        describe("getter: mintingPolicyHash", () => {
            it("is defined, by delegation to Capo's for minting-purposed helper", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const t = await h.setup();

                expect(() => {
                    t.compiledContract.mintingPolicyHash;
                }).toThrow("unexpected");
                expect(t.mph.hex).toEqual(t.mintingPolicyHash.hex);
                expect(t.mph.hex).toEqual(t.minter!.mintingPolicyHash.hex);
                expect(t.minter!.mintingPolicyHash).toBeInstanceOf(
                    MintingPolicyHash
                );
                const t2 = await h.setup({ randomSeed: 43 });
                expect(t2.mph.hex).not.toEqual(t.mph.hex);
            });
        });

        describe("getter: identity", () => {
            it("returns a bech32-encoded address for validators", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const treasury = await h.setup();
                expect(treasury.identity.length).toBe(63);
            });

            it("returns a bech32-encoded thing that's not an address for minters", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                const treasury = await h.setup();
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

                const t = await h.setup();
                const a = t.stringToNumberArray("ABCDE");
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
                    const t = await h.setup();

                    //!!! todo: check involvement in tokenAsValue
                }
            );

            describe("tokenAsValue()", () => {
                it("makes a Value from a token name, using the contract's mph", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t: SampleTreasury = await h.setup();

                    const tokenCount = 19n;
                    const tokenName = "foo";
                    const tv: Value = t.tokenAsValue(tokenName, tokenCount);

                    expect(tv).toBeInstanceOf(Value);
                    expect(
                        tv.assets.get(t.mph, t.stringToNumberArray(tokenName))
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

                    const t = await h.setup();
                    expect(t.ADA(42)).toBe(42_000_000n);
                });
                it("accepts integer or bigint, or fractional number", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t = await h.setup();

                    expect(t.ADA(4n)).toBe(4_000_000n);
                    expect(t.ADA(2)).toBe(2_000_000n);
                    expect(t.ADA(3.141593)).toBe(3_1415_93n);
                });

                it("returns ONLY integer lovelace even if given a numeric having a very small fractional part", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    const t = await h.setup();

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

                        const t = await h.setup();

                        const tcx = new StellarTxnContext();
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

                        const t = await h.setup();

                        const tcx = new StellarTxnContext();
                        let foundAddress;
                        const hasUtxo = vi
                            .spyOn(t, "hasUtxo")
                            .mockImplementation(async (_a, _b, { address }) => {
                                foundAddress = address;
                                return undefined;
                            });
                        await expect(
                            t.mustFindActorUtxo("any", (x) => x, tcx)
                        ).rejects.toThrow();
                        expect(hasUtxo).toHaveBeenCalled();
                        expect(foundAddress.toBech32()).toEqual(
                            actors.tina.address.toBech32()
                        );
                    });

                    it("throws an error if no utxo is matched", async (context: localTC) => {
                        const {
                            h,
                            h: { network, actors, delay, state },
                        } = context;

                        const t = await h.setup();
                        const tcx = new StellarTxnContext();
                        await expect(
                            t.mustFindActorUtxo(
                                "something",
                                () => undefined,
                                tcx
                            )
                        ).rejects.toThrow(/something.*utxo not found/);
                    });

                    describe("with tokenPredicate", () => {
                        it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                            const {
                                h,
                                h: { network, actors, delay, state },
                            } = context;
                            // await delay(1000)
                            const t: SampleTreasury = await h.setup();
                            const tcx = new StellarTxnContext();
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
                                "#3with token",
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
                        const t: SampleTreasury = await h.setup();
                        const tcx = new StellarTxnContext();
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

                    const t = await h.setup();

                    const tcx = new StellarTxnContext();
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

                    const t = await h.setup();

                    const tcx = new StellarTxnContext();
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

                    const t = await h.setup();

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

    describe("Integration tests: example Capo contract", () => {
        describe("has a unique, permanent address", () => {
            it("uses the Minting Policy Hash as the sole parameter for the spending script", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                try {
                    const t1: SampleTreasury = await h.setup();
                    const t2: SampleTreasury = await h.setup({
                        randomSeed: 43,
                        seedIndex: 1n,
                    });
                    expect(t1.address.toBech32()).not.toEqual(
                        t2.address.toBech32()
                    );
                } catch (e) {
                    throw e;
                }
            });
        });
        describe("has a unique, permanent charter token", () => {
            describe("mkTxnMintCharterToken()", () => {
                it("creates a unique 'charter' token, with assetId determined from minting-policy-hash+'charter'", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;
                    // await context.delay(1000)
                    try {
                        await h.setup();
                        await h.mintCharterToken();
                    } catch (e) {
                        throw e;
                    }
                    state.mintedCharterToken = null;
                    return expect(h.mintCharterToken()).rejects.toThrow(
                        "already spent"
                    );
                });

                it("doesn't work with a different spent utxo", async (context: localTC) => {
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;
                    // await context.delay(1000)
                    const treasury = await h.setup();

                    const wrongUtxo = (await actors.tracy.utxos).at(-1);

                    vi.spyOn(
                        treasury,
                        "mustGetContractSeedUtxo"
                    ).mockImplementation(
                        //@ts-expect-error this wrong utxo can be undefined or just wrong
                        async () => {
                            return wrongUtxo;
                        }
                    );
                    await expect(h.mintCharterToken()).rejects.toThrow(
                        "seed utxo required"
                    );
                });
            });
        });

        describe("the charter token is always kept in the contract", () => {
            it("builds transactions with the charter token returned to the contract", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                await h.mintCharterToken();
                const treasury = context.strella!;

                const tcx = await h.mkCharterSpendTx();
                expect(tcx.outputs).toHaveLength(1);
                const hasCharterToken = treasury.mkTokenPredicate(
                    treasury.tvCharter()
                );
                expect(
                    tcx.outputs.find((o: TxOutput) => {
                        return (
                            hasCharterToken(o) &&
                            o.address.toBech32() == treasury.address.toBech32()
                        );
                    })
                ).toBeTruthy();

                await treasury.submit(tcx, {
                    signers: [actors.tracy, actors.tom],
                });
                const u = await network.getUtxos(treasury.address);
                expect(u.find(hasCharterToken)).toBeTruthy();
            });

            it("fails to spend the charter token if it's not returned to the contract", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;

                await h.mintCharterToken();

                const treasury = context.strella!;
                vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                    (tcx) => tcx!
                );

                const tcx: StellarTxnContext = await h.mkCharterSpendTx();
                const bogusPlace = (await actors.tina.usedAddresses)[0];
                tcx.addOutput(new TxOutput(bogusPlace, treasury.tvCharter()));

                const submitting = treasury.submit(tcx, {
                    signers: [actors.tracy, actors.tom],
                });
                await expect(submitting).rejects.toThrow(
                    /charter token must be returned/
                );
            });

            it.todo(
                "keeps the charter token separate from other assets in the contract",
                async (context: localTC) => {
                    //!!! implement this test after making a recipe for minting a different coin
                    const {
                        h,
                        h: { network, actors, delay, state },
                    } = context;

                    await h.mintCharterToken();
                    const treasury = context.strella!;
                    vi.spyOn(
                        treasury,
                        "txnKeepCharterToken"
                    ).mockImplementation((tcx) => tcx!);

                    // await delay(1000);
                    const tcx: StellarTxnContext = await h.mkCharterSpendTx();
                    tcx.addOutput(
                        new TxOutput(treasury.address, treasury.tvCharter())
                    );

                    await expect(treasury.submit(tcx)).rejects.toThrow(
                        /charter token must be standalone/
                    );
                }
            );
        });

        describe("UUTs for contract utility", () => {
            it("can create a UUT and send it anywhere", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;

                const t: SampleTreasury = await h.setup();
                await h.mintCharterToken();
                // await delay(1000);
                type something = { something: string };
                const tcx = new StellarTxnContext<hasUUTs<something>>();
                await t.txnAddAuthority(tcx);
                await t.txnCreatingUUTs(tcx, ["something"]);

                const uutVal = t.uutsValue(tcx.state.uuts!);
                tcx.addOutput(new TxOutput(tina.address, uutVal));
                await t.submit(tcx, { signers: [tom, tina, tracy] });
                network.tick(1n);

                const hasNamedToken = t.mkTokenPredicate(uutVal);
                const u = await network.getUtxos(tina.address);
                const f = u.find(hasNamedToken);
                expect(f).toBeTruthy();
                expect(f?.origOutput.value.ge(uutVal)).toBeTruthy();
            });

            it("can create multiple UUTs", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;

                const t: SampleTreasury = await h.setup();
                await h.mintCharterToken();
                // await delay(1000);

                type hasFooBar = { foo: string; bar: string };
                const tcx = new StellarTxnContext<hasUUTs<hasFooBar>>();
                await t.txnAddAuthority(tcx);
                await t.txnCreatingUUTs(tcx, ["foo", "bar"]);
                const uuts = t.uutsValue(tcx.state.uuts!);

                tcx.addOutput(new TxOutput(tina.address, uuts));
                await t.submit(tcx, { signers: [tom, tina, tracy] });
                network.tick(1n);

                const hasNamedToken = t.mkTokenPredicate(uuts);
                const u = await network.getUtxos(tina.address);
                const f = u.find(hasNamedToken);
                expect(f).toBeTruthy();
                expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
            });

            it("fills tcx.state.uuts with purpose-keyed unique token-names", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;

                const t: SampleTreasury = await h.setup();
                await h.mintCharterToken();
                // await delay(1000);

                type hasFooBar = { foo: string; bar: string };
                const tcx = new StellarTxnContext<hasUUTs<hasFooBar>>();
                await t.txnAddAuthority(tcx);
                await t.txnCreatingUUTs(tcx, ["foo", "bar"]);
                const uuts = t.uutsValue(tcx.state.uuts!);

                //! fills state.uuts with named
                expect(tcx.state.uuts?.foo).toBeTruthy();
                expect(tcx.state.uuts?.bar).toBeTruthy();

                tcx.addOutput(new TxOutput(tina.address, uuts));
                await t.submit(tcx, { signers: [tom, tina, tracy] });
                network.tick(1n);

                const hasNamedToken = t.mkTokenPredicate(uuts);
                const u = await network.getUtxos(tina.address);
                const f = u.find(hasNamedToken);
                expect(f).toBeTruthy();
                expect(f?.origOutput.value.ge(uuts)).toBeTruthy();
            });

            it("won't mint multiple UUTs of the same name", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;

                const t: SampleTreasury = await h.setup();
                const m: DefaultMinter = t.minter!;

                await h.mintCharterToken();
                // await delay(1000);

                const noMultiples = "multiple-is-bad";
                type uniqUutMap = { ["multiple-is-bad"]: string };
                console.log(
                    "-------- case 1: using the txn-helper in unsupported way"
                );
                const tcx = new StellarTxnContext<hasUUTs<uniqUutMap>>();
                await t.txnAddAuthority(tcx);

                await t.txnCreatingUUTs(tcx, [noMultiples, noMultiples]);

                const uut = t.uutsValue(tcx.state.uuts!);

                tcx.addOutput(new TxOutput(tina.address, uut));
                await expect(
                    t.submit(tcx, { signers: [tom, tina, tracy] })
                ).rejects.toThrow(/bad UUT mint/);
                network.tick(1n);

                console.log(
                    "------ case 2: directly creating the transaction with >1 tokens"
                );
                const tcx2 = new StellarTxnContext<hasUUTs<uniqUutMap>>();
                await t.txnAddAuthority(tcx2);

                const spy = vi.spyOn(m, "mkUUTValuesEntries");
                spy.mockImplementation(
                    //@ts-expect-error
                    function (f: uniqUutMap) {
                        return [
                            this.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
                        ];
                    }
                );

                await t.txnCreatingUUTs(tcx2, [noMultiples]);
                const uut2 = t.uutsValue(tcx2.state.uuts!);

                tcx2.addOutput(new TxOutput(tina.address, uut2));
                await expect(
                    t.submit(tcx2, { signers: [tom, tina, tracy] })
                ).rejects.toThrow(/bad UUT mint/);
                network.tick(1n);

                console.log(
                    "------ case 3: directly creating the transaction with multiple mint entries"
                );
                const tcx3 = new StellarTxnContext<hasUUTs<uniqUutMap>>();
                await t.txnAddAuthority(tcx3);

                spy.mockImplementation(
                    //@ts-expect-error
                    function (f: uniqUutMap) {
                        return [
                            this.mkValuesEntry(f["multiple-is-bad"], BigInt(1)),
                            this.mkValuesEntry(f["multiple-is-bad"], BigInt(2)),
                        ];
                    }
                );

                await t.txnCreatingUUTs(tcx3, [noMultiples]);
                const uut3 = t.uutsValue(tcx3.state.uuts!);

                tcx3.addOutput(new TxOutput(tina.address, uut3));
                await expect(
                    t.submit(tcx3, { signers: [tom, tina, tracy] })
                ).rejects.toThrow(/UUT purposes not unique/);
                network.tick(1n);
            });

            it("won't mint extra UUTs", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;

                const t: SampleTreasury = await h.setup();
                await h.mintCharterToken();
                // await delay(1000);

                type hasSomethingUut = { ["something"]: string };
                const tcx = new StellarTxnContext<hasUUTs<hasSomethingUut>>();

                await t.txnAddAuthority(tcx);
                const m: DefaultMinter = t.minter!;
                vi.spyOn(m, "mkUUTValuesEntries").mockImplementation(
                    //@ts-expect-error
                    function (f: uniqUutMap) {
                        return [
                            this.mkValuesEntry(f["something"], BigInt(1)),
                            this.mkValuesEntry(f["something-else"], BigInt(1)),
                        ];
                    }
                );

                await t.txnCreatingUUTs(tcx, ["something"]);
                const uut = t.uutsValue(tcx);

                tcx.addOutput(new TxOutput(tina.address, uut));
                await expect(
                    t.submit(tcx, { signers: [tom, tina, tracy] })
                ).rejects.toThrow(/bad UUT mint/);
                network.tick(1n);
            });
        });

        describe("the trustee threshold is enforced on all administrative actions", () => {
            it("works with a minSigs=1 if one person signs", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;
                await h.setup();
                // await delay(1000);
                const treasury = context.strella!;

                await h.mintCharterToken({
                    trustees: [tina.address, tom.address, tracy.address],
                    minSigs: 1,
                });

                const count = 1n;

                const tcx = await treasury.mkTxnUpdateCharter(
                    [tina.address, tom.address],
                    count
                );

                await treasury.submit(tcx, { signers: [tina, tom] });
            });

            it("breaks with a minSigs=2 and only one person signs", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;
                await h.setup();
                const treasury = context.strella!;

                await h.mintCharterToken({
                    trustees: [tina.address, tom.address, tracy.address],
                    minSigs: 2,
                });

                const count = 1n;

                const tcx = await treasury.mkTxnUpdateCharter(
                    [tina.address, tom.address],
                    count
                );

                await expect(treasury.submit(tcx)).rejects.toThrow(
                    notEnoughSignaturesRegex
                );
            });
            it("works with a minSigs=2 and three people sign", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                const { tina, tom, tracy } = actors;
                await h.setup();
                const treasury = context.strella!;

                await h.mintCharterToken({
                    trustees: [tina.address, tom.address, tracy.address],
                    minSigs: 2,
                });

                const count = 1n;

                const tcx = await treasury.mkTxnUpdateCharter(
                    [tina.address, tom.address],
                    count
                );

                await treasury.submit(tcx, { signers: [tina, tom, tracy] });
            });
        });

        describe("the trustee group can be changed", () => {
            it("requires the existing threshold of existing trustees to be met", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                state.signers = [actors.tina];

                await expect(
                    h.updateCharter([actors.tina.address], 1n)
                ).rejects.toThrow(notEnoughSignaturesRegex);
            });

            it("requires all of the new trustees to sign the transaction", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                state.signers = [actors.tina, actors.tom];

                await expect(
                    h.updateCharter([actors.tracy.address], 1n)
                ).rejects.toThrow(/all the new trustees must sign/);

                state.signers = [actors.tina, actors.tom, actors.tracy];
                return h.updateCharter([actors.tracy.address], 1n);
            });

            it("does not allow minSigs to exceed the number of trustees", async (context: localTC) => {
                const {
                    h,
                    h: { network, actors, delay, state },
                } = context;
                state.signers = [actors.tina, actors.tracy];

                await expect(
                    h.updateCharter([actors.tracy.address], 2n)
                ).rejects.toThrow(wrongMinSigs);
            });
        });

        xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
    });
});

const seconds = 1000; // milliseconds
