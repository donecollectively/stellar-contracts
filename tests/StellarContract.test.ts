import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";
import {
    CtParams,
    SampleTreasury,
    CharterDatumArgs,
    chTok,
} from "../src/examples/SampleTreasury";

// import {
//     Address,
//     Assets,
//     ByteArrayData,
//     ConstrData,
//     Datum,
//     hexToBytes,
//     IntData,
//     ListData,
//     NetworkEmulator,
//     NetworkParams,
//     Program,
//     Tx,
//     TxOutput,
//     Value,
// } from "@hyperionbt/helios";

import {
    ADA,
    HeliosTestingContext,
    HelperFunctions,
    addTestContext,
    mkContext,
} from "./HeliosTestingContext.js";
import {
    Address,
    Datum,
    Signature,
    Tx,
    TxOutput,
    Value,
} from "@hyperionbt/helios";
import {
    canHaveToken,
    findInputsInWallets,
    utxosAsString,
} from "../lib/StellarContract";
import { StellarTxnContext } from "../lib/StellarTxnContext";
import { UTxO } from "@hyperionbt/helios";
import { MintingPolicyHash } from "@hyperionbt/helios";

interface localTC
    extends HeliosTestingContext<SampleTreasury, typeof CCTHelpers, CtParams> {}

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

const minAda = 2n * ADA; // minimum needed to send an NFT
type hasHelpers = HelperFunctions<SampleTreasury>;
const CCTHelpers: hasHelpers = {
    async mkSeedUtxo(this: localTC, seedIndex = 0) {
        const {
            actors: { tina },
            network,
            h,
        } = this;

        const tx = new Tx();
        const tinaMoney = await tina.utxos;
        console.log("tina has money: \n" + utxosAsString(tinaMoney));

        tx.addInput(
            await findInputsInWallets(
                new Value(30n * ADA),
                { wallets: [tina] },
                network
            )
        );

        tx.addOutput(new TxOutput(tina.address, new Value(10n * ADA)));
        tx.addOutput(new TxOutput(tina.address, new Value(10n * ADA)));
        // console.log("s3", new Error("stack").stack)

        const txId = await this.submitTx(tx, "force");

        return txId;
    },

    async setup(
        this: localTC,
        { randomSeed = 42, seedTxn, seedIndex = 0 } = {}
    ) {
        if (this.strella && this.randomSeed == randomSeed) return this.strella;

        if (!seedTxn) {
            seedTxn = await this.h.mkSeedUtxo();
        }
        this.randomSeed = randomSeed;
        this.myself = this.actors.tina;
        const treasury = await this.instantiateWithParams({
            seedTxn,
            seedIndex,
        });
        const { address, mph } = treasury;

        console.log(
            "treasury",
            address.toBech32().substring(0, 18) + "…",
            "vHash 📜 " +
                treasury.compiledContract.validatorHash.hex.substring(0, 12) +
                "…",
            "mph 🏦 " + mph?.hex.substring(0, 12) + "…"
        );

        return treasury;
    },

    async mintCharterToken(
        this: localTC,
        args?: CharterDatumArgs
    ): Promise<StellarTxnContext> {
        const { delay } = this;
        const { tina, tom, tracy } = this.actors;
        if (this.state.mintedCharterToken) {
            console.warn(
                "reusing  minted charter from existing testing-context"
            );
            return this.state.mintedCharterToken;
        }

        await this.h.setup();
        const treasury = this.strella!;
        args = args || {
            trustees: [tina.address, tom.address, tracy.address],
            minSigs: 2,
        };
        const tcx = await treasury.mkTxnMintCharterToken(args);
        expect(treasury.network).toBe(this.network);

        await treasury.submit(tcx);
        console.log("charter token minted");

        this.network.tick(1n);
        return (this.state.mintedCharterToken = tcx);
    },

    async mintNamedToken(
        this: localTC,
        tokenName: string,
        count: bigint,
        destination: Address
    ): Promise<StellarTxnContext> {
        const { delay } = this;
        const { tina, tom, tracy } = this.actors;

        await this.h.mintCharterToken();
        const treasury = this.strella!;

        const tcx = await treasury.mkTxnMintNamedToken(tokenName, count);
        const v = treasury.tokenAsValue(tokenName, count);

        tcx.addOutput(new TxOutput(destination, v));

        console.log("charter token mint: \n" + tcx.dump());

        const submitting = treasury.submit(tcx, {
            signers: [tina, tracy, tom],
        });
        return submitting.then(() => {
            this.network.tick(1n);

            return tcx;
        });
    },

    async mkCharterSpendTx(this: localTC): Promise<StellarTxnContext> {
        await this.h.mintCharterToken();

        const treasury = this.strella!;
        const tcx: StellarTxnContext = new StellarTxnContext();

        return treasury.txnAddAuthority(tcx);
    },

    async updateCharter(
        this: localTC,
        trustees: Address[],
        minSigs: bigint
    ): Promise<StellarTxnContext> {
        await this.h.mintCharterToken();
        const treasury = this.strella!;

        const { signers } = this.state;

        const tcx = await treasury.mkTxnUpdateCharter(trustees, minSigs);
        return treasury.submit(tcx, { signers }).then(() => {
            this.network.tick(1n);
            return tcx;
        });
    },
};

const notEnoughSignaturesRegex = /not enough trustees.*have signed/;
const wrongMinSigs = /minSigs can't be more than the size of the trustee-list/;
describe("StellarContract", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, SampleTreasury, CCTHelpers);

        context.addActor("tracy", 13n * ADA);
        context.addActor("tina", 1100n * ADA);
        context.addActor("tom", 120n * ADA);
    });

    describe("baseline test-env capabilities", () => {
        it("gets expected wallet balances for test-scenario actor", async (context: localTC) => {
            const {
                network,
                networkParams: params,
                actors: { tina, tom, tracy },
                address,
            } = context;
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
                actors: { tom },
                network,
                h,
            } = context;
            // await h.setup()
            const tx = new Tx();
            const tomMoney = await tom.utxos;

            tx.addInput(tomMoney[0]);
            tx.addOutput(new TxOutput(tom.address, new Value(3n * ADA)));
            tx.addOutput(
                new TxOutput(
                    tom.address,
                    new Value(tomMoney[0].value.lovelace - 5n * ADA)
                )
            );
            // console.log("s2")

            await context.submitTx(tx);
            const tm2 = await network.getUtxos(tom.address);

            expect(tomMoney.length).not.toEqual(tm2.length);
        });

        it("can wait for future slots", async (context: localTC) => {
            const {
                // actors: { alice, bob },
            } = context;

            const waitedSlots = context.waitUntil(
                new Date(new Date().getTime() + 100 * seconds)
            );

            expect(waitedSlots).toBeGreaterThan(90);
            expect(waitedSlots).toBeLessThan(100);
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
            const {
                h,
                network,
                actors: { tina },
            } = context;
            const seedTxn = await h.mkSeedUtxo().catch((e) => {
                throw e;
            });

            const treasury = h.setup({
                seedTxn,
                seedIndex: 0,
            });

            const unspent = await network.getUtxos(tina.address);
            const empty = unspent.find((x) => {
                return x.txId == seedTxn && BigInt(x.utxoIdx) == 0n;
            });
            expect(empty).toBeFalsy();
        });

        it("makes a different address depending on (txId, outputIndex) parameters of the Minting script", async (context: localTC) => {
            const { h, network } = context;

            const t1: SampleTreasury = await h.setup();
            const t2: SampleTreasury = await h.setup({
                randomSeed: 43,
                seedIndex: 1,
            });

            expect(
                t1.connectMintingScript().mintingPolicyHash?.hex
            ).not.toEqual(t2.connectMintingScript().mintingPolicyHash?.hex);
        });
    });

    describe("things provided by the base class", () => {
        it("getter: datumType", async (context: localTC) => {
            const { h, network, actors, delay, state } = context;

            const treasury = await h.setup();
            expect(treasury.datumType).toBeTruthy();
        });
        it("getter: purpose", async (context: localTC) => {
            const { h, network, actors, delay, state } = context;

            const treasury = await h.setup();

            expect(treasury.purpose).toBe("spending");
            expect(treasury.minter.purpose).toBe("minting");
        });
        it("getter: address", async (context: localTC) => {
            const { h, network, actors, delay, state } = context;

            const treasury = await h.setup();
            expect(treasury.address).toBeInstanceOf(Address);
        });
        describe("getter: mintingPolicyHash", () => {
            it("is defined, but only for minting-purposed scripts", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                const t = await h.setup();
                expect(t.mintingPolicyHash).toBeUndefined();
                expect(t.minter.mintingPolicyHash).toBeInstanceOf(
                    MintingPolicyHash
                );
            });
        });
        describe("getter: identity", () => {
            it("returns a bech32-encoded address for validators", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                const treasury = await h.setup();
                expect(treasury.identity.length).toBe(63);
            });

            it("returns a bech32-encoded thing that's not an address for minters", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                const treasury = await h.setup();
                expect(treasury.minter.identity.length).toBe(42);
            });
        });
        describe("getter: mph", () => {
            it.todo("works on non-minting leader contracts", async () => {
                //!!! todo: develop Capo subclass
                //!!! todo simple test here
            });
            //!!! more tests as needed
        });

        describe("lower-level helpers", () => {
            it("stringToNumberArray()", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                const t = await h.setup();
                const a = t.stringToNumberArray("ABCDE");
                expect(a).toHaveLength(5);
                expect(a[0]).toBe(65);
            });

            it.todo(
                "mkValuesEntry() helps make Value objects",
                async (context: localTC) => {
                    const { h, network, actors, delay, state } = context;
                    const t = await h.setup();

                    //!!! todo: check involvement in tokenAsValue
                }
            );

            describe("tokenAsValue()", () => {
                it("makes a Value from a token name, using the contract's mph", async (context: localTC) => {
                    const { h, network, actors, delay, state } = context;

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
                it.todo("returns bigint lovelace for the indicated ADA amount");
                it.todo("accepts integer or bigint, or fractional number");
                it.todo(
                    "returns ONLY integer lovelace even if given a numeric having a very small fractional part"
                );
                it.todo("multiplies by 1_000_000");
            });

            describe("findInputsInWallets", () => {
                it("can use more tests", async () => {
                    //!!! todo: bounty: develop tests to better describe & cover this function.
                });

                it("can find ADA needed for a transaction", async (context: localTC) => {
                    const { h, network, actors, delay, state } = context;
                    const { tina } = actors;

                    const treasury = await h.setup();

                    const utxo = await treasury.findInputsInWallets(
                        new Value(30n * ADA),
                        { wallets: [tina] },
                        network
                    );

                    expect(utxo).toBeInstanceOf(UTxO);
                });
            });

            describe("mustFindActorUtxo", () => {
                it.todo(
                    "finds utxos in the current user's wallet, based on a value predicate function"
                );
                it.todo("throw an error if no utxo is matched");
            });

            describe("mustFindMyUtxo", () => {
                it.todo(
                    "finds utxos in a spending-contract's address, based on a value predicate function"
                );
                it.todo("throw an error if no utxo is matched");
            });

            describe("mustFindUtxo", () => {
                it.todo(
                    "finds utxos in a provided address, based on a value predicate function"
                );
                it.todo("throw an error if no utxo is matched");
            });

            describe("hasUtxo", () => {
                it.todo(
                    "finds any utxos in a provided address, based on a value predicate function"
                );
                it.todo("returns an empty list of no utxos are found");
            });

            describe("hasMyUtxo", () => {
                it.todo(
                    "finds any utxos in the spending-contract's address using hasUtxo()"
                );
                it.todo("returns an empty list of no utxos are found");
            });

            describe("findAnySpareUtxos()", () => {
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
                    "doesn't add current-user to signers if overridden {sign=false} option is provided"
                );
                it.todo(
                    "throws a console message and an exception if finalize() fails"
                );
                it.todo("signs the txn with all the indicated {signers}");
                it.todo("finalizes the txn with the indicated signers, if any");
                it.todo("submits the txn to the configured network");
            });
        });

        describe("Composing contract constellations", () => {
            it.todo(
                "addScriptWithParams(): instantiates related contracts",
                async (context: localTC) => {
                    const { h, network, actors, delay, state } = context;

                    const t = await h.setup();

                    // !!! todo: test it works with a specific example collaborating contract
                }
            );
            it.todo(
                "??? make a decorator for related-contract factory-functions?"
            );
        });

        describe("mkTokenPredicate()", () => {
            it.todo(
                "makes a predicate function for filtering any kind of token-bearing data"
            );
            it.todo(
                "requires only a mph/token name, or a Value, to make the predicate function"
            );
            it.todo(
                "returns a predicate that can filter utxos, tx inputs, txoutputs, or assets in a Value"
            );
        });
    });

    describe("Capo", () => {
        it.todo("is a base class for 'leader'/Capo pattern");
        it.todo("provides a default minter");
        it.todo("allows the minter class to be overridden");
        it.todo("uses seed-utxo pattern by default");
        it.todo("can use a second type-parameter for a dfferent type of params");
    });

    describe("Integration tests: example subclass", () => {
        describe("has a unique, permanent address", () => {
            it("uses the Minting Policy Hash as the sole parameter for the spending script", async (context: localTC) => {
                const { h, network } = context;

                try {
                    const t1: SampleTreasury = await h.setup();
                    const t2: SampleTreasury = await h.setup({
                        randomSeed: 43,
                        seedIndex: 1,
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
                    const { h } = context;
                    // await context.delay(1000)
                    try {
                        await h.setup();
                        await h.mintCharterToken();
                    } catch (e) {
                        throw e;
                    }
                    context.state.mintedCharterToken = null;
                    return expect(h.mintCharterToken()).rejects.toThrow(
                        "already spent"
                    );
                });

                it("doesn't work with a different spent utxo", async (context: localTC) => {
                    const {
                        h,
                        actors: { tracy },
                    } = context;
                    // await context.delay(1000)
                    const treasury = await h.setup();

                    const wrongUtxo = (await tracy.utxos).at(-1);

                    vi.spyOn(treasury, "mustGetSeedUtxo").mockImplementation(
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
                const { h, network, actors, delay, state } = context;

                await h.mintCharterToken();
                const treasury = context.strella!;

                const tcx = await h.mkCharterSpendTx();
                expect(tcx.outputs).toHaveLength(1);
                const hasCharterToken = treasury.mkTokenPredicate(
                    treasury.charterTokenAsValue
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
                const { h, network, actors, delay, state } = context;

                await h.mintCharterToken();

                const treasury = context.strella!;
                vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                    (tcx) => tcx!
                );

                const tcx: StellarTxnContext = await h.mkCharterSpendTx();
                const bogusPlace = (await actors.tina.usedAddresses)[0];
                tcx.addOutput(
                    new TxOutput(bogusPlace, treasury.charterTokenAsValue)
                );

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
                    const { h, network, actors, delay, state } = context;

                    await h.mintCharterToken();
                    const treasury = context.strella!;
                    vi.spyOn(
                        treasury,
                        "txnKeepCharterToken"
                    ).mockImplementation((tcx) => tcx!);

                    await delay(1000);
                    const tcx: StellarTxnContext = await h.mkCharterSpendTx();
                    tcx.addOutput(
                        new TxOutput(
                            treasury.address,
                            treasury.charterTokenAsValue
                        )
                    );

                    await expect(treasury.submit(tcx)).rejects.toThrow(
                        /charter token must be standalone/
                    );
                }
            );
        });

        //!!! todo: this (build-txn, check-it, submit-it, check-onchain)
        //   ... might be a pattern worth lifting to a helper
        // await this.txChecker({
        //     async build() : tcx {  ... },
        //     async onChain(utxosByAddr) {
        //          ...
        //     }
        // };

        describe("can mint other tokens, on the authority of the charter token", () => {
            it("can build transactions that mint non-'charter' tokens", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                await h.setup();
                const treasury = context.strella!;

                const tokenName = "fooToken";
                const hasNamedToken = treasury.mkTokenPredicate(
                    treasury.mph,
                    tokenName,
                    42n
                );
                const mintedBefore = await network.getUtxos(treasury.address);
                expect(mintedBefore.filter(hasNamedToken)).toHaveLength(0);

                const tcx: StellarTxnContext = await h.mintNamedToken(
                    tokenName,
                    42n,
                    actors.tom.address
                );
                const theTokenValue = hasNamedToken.value;
                expect(hasNamedToken(tcx.tx.body.minted)).toBeTruthy();

                const u = await network.getUtxos(actors.tom.address);
                const f = u.find(hasNamedToken);
                expect(f).toBeTruthy();
                expect(f?.origOutput.value.ge(theTokenValue)).toBeTruthy();
            });

            it.skip("requires the charter-token to be spent as proof of authority", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                await h.setup();
                const treasury = context.strella!;

                const tokenName = "fooToken";
                const hasNamedToken = treasury.mkTokenPredicate(
                    treasury.mph,
                    tokenName,
                    42n
                );
                const mintedBefore = await network.getUtxos(treasury.address);
                expect(mintedBefore.filter(hasNamedToken)).toHaveLength(0);

                // NOTE: this mocks the return-token-to-contract function,
                //   which doesn't satisfy the purpose of the test
                // vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                //     (tcx) => tcx!
                // );

                // NOTE: this satisfies the purpose of the test by mocking the addition
                //    of the charter-token, but doesn't actually trigger any functionality
                //    in the contract, because it takes actually spending the charter token
                //    to trigger the validator to do anything in the first place.
                // vi.spyOn(treasury, "mustAddCharterAuthorization").mockImplementation(
                //     (tcx) => tcx!
                // );

                //!!! todo: the only way to actually make a real negative test here
                //  ... involves separating the responsibility for validating "mint named token"
                //  ... from the responsibility for checking that the authority-token can be spent
                //  ... then, we could make the "mint named token" validator run a transaction-check
                //  ... which would fail in the expected way:

                expect(
                    h.mintNamedToken(tokenName, 42n, actors.tom.address)
                ).rejects.toThrow(
                    /missing required charter token authorization/
                );
            });

            it("fails if the charter-token is not returned to the treasury", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;

                await h.setup();
                const treasury = context.strella!;

                const tokenName = "fooToken";
                const hasNamedToken = treasury.mkTokenPredicate(
                    treasury.mph,
                    tokenName,
                    42n
                );
                const mintedBefore = await network.getUtxos(treasury.address);
                expect(mintedBefore.filter(hasNamedToken)).toHaveLength(0);

                vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                    (tcx: StellarTxnContext, x: any) => {
                        tcx.addOutput(
                            new TxOutput(
                                actors.tracy.address,
                                treasury.charterTokenAsValue
                            )
                        );

                        return tcx;
                    }
                );

                expect(
                    h.mintNamedToken(tokenName, 42n, actors.tom.address)
                ).rejects.toThrow(
                    /charter token must be returned to the contract/
                );
            });
            it("fails if the charter-token changes the charter parameters", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                const { tina, tom, tracy } = actors;

                await h.setup();
                const treasury = context.strella!;
                const tokenName = "fooToken";

                let targetTrustees = [tom.address, tracy.address, tina.address];
                let targetMinSigs = 97n;
                vi.spyOn(treasury, "txnKeepCharterToken").mockImplementation(
                    (tcx: StellarTxnContext, x: any) => {
                        tcx.addOutput(
                            new TxOutput(
                                treasury.address,
                                treasury.charterTokenAsValue,
                                treasury.mkDatumCharterToken({
                                    trustees: targetTrustees,
                                    minSigs: targetMinSigs,
                                })
                            )
                        );

                        return tcx;
                    }
                );

                const invalidUpdate = /invalid update to charter settings/;
                await expect(
                    h.mintNamedToken(tokenName, 42n, actors.tom.address)
                ).rejects.toThrow(invalidUpdate);

                targetMinSigs = 2n; // restores original good minSigs
                await expect(
                    h.mintNamedToken(tokenName, 42n, actors.tom.address)
                ).rejects.toThrow(invalidUpdate);

                targetMinSigs = 43n; // bad minSigs
                targetTrustees = [tina.address, tom.address, tracy.address]; // good (= original) trustee list
                await expect(
                    h.mintNamedToken(tokenName, 42n, actors.tom.address)
                ).rejects.toThrow(invalidUpdate);

                //! restores original settings including the right order; should pass.
                targetMinSigs = 2n;
                targetTrustees = [tina.address, tom.address, tracy.address];
                expect(
                    h.mintNamedToken(tokenName, 42n, actors.tom.address)
                ).resolves.toBeTruthy();
            });
        });

        describe("the trustee threshold is enforced on all administrative actions", () => {
            it("works with a minSigs=1 if one person signs", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                const { tina, tom, tracy } = actors;
                await h.setup();
                // await delay(1000);
                const treasury = context.strella!;

                await h.mintCharterToken({
                    trustees: [tina.address, tom.address, tracy.address],
                    minSigs: 1,
                });

                const tokenName = "fooToken";
                const count = 1n;
                const newTokenValue = treasury.tokenAsValue(tokenName, count);
                const tcx = await treasury.mkTxnMintNamedToken(
                    tokenName,
                    count
                );

                tcx.addOutput(new TxOutput(tracy.address, newTokenValue));
                // console.warn(tcx.dump())
                // const sigs = await tom.signTx(tcx.tx)
                // tcx.tx.addSignatures(sigs)
                // console.warn("--------", tom.address.toBech32(), tcx.dump())

                await treasury.submit(tcx);
                await network.tick(1n);
                const balance = await network.getUtxos(tracy.address);

                expect(
                    balance.find(treasury.mkTokenPredicate(newTokenValue))
                ).toBeTruthy();
            });

            it("breaks with a minSigs=2 and only one person signs", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                const { tina, tom, tracy } = actors;
                await h.setup();
                const treasury = context.strella!;

                await h.mintCharterToken({
                    trustees: [tina.address, tom.address, tracy.address],
                    minSigs: 2,
                });

                const tokenName = "fooToken";
                const count = 1n;
                const newTokenValue = treasury.tokenAsValue(tokenName, count);
                const tcx = await treasury.mkTxnMintNamedToken(
                    tokenName,
                    count
                );
                tcx.addOutput(new TxOutput(tracy.address, newTokenValue));

                await expect(treasury.submit(tcx)).rejects.toThrow(
                    notEnoughSignaturesRegex
                );
            });
            it("works with a minSigs=2 and three people sign", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                const { tina, tom, tracy } = actors;
                await h.setup();
                const treasury = context.strella!;

                await h.mintCharterToken({
                    trustees: [tina.address, tom.address, tracy.address],
                    minSigs: 2,
                });

                const tokenName = "fooToken";
                const count = 1n;
                const newTokenValue = treasury.tokenAsValue(tokenName, count);
                const tcx = await treasury.mkTxnMintNamedToken(
                    tokenName,
                    count
                );
                tcx.addOutput(new TxOutput(tracy.address, newTokenValue));

                await treasury.submit(tcx, { signers: [tina, tom, tracy] });
                network.tick(1n);

                const balance = await network.getUtxos(tracy.address);

                expect(
                    balance.find(treasury.mkTokenPredicate(newTokenValue))
                ).toBeTruthy();
            });
        });

        describe("the trustee group can be changed", () => {
            it("requires the existing threshold of existing trustees to be met", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                state.signers = [actors.tina];

                await expect(
                    h.updateCharter([actors.tina.address], 1)
                ).rejects.toThrow(notEnoughSignaturesRegex);
            });

            it("requires all of the new trustees to sign the transaction", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                state.signers = [actors.tina, actors.tom];

                await expect(
                    h.updateCharter([actors.tracy.address], 1)
                ).rejects.toThrow(/all the new trustees must sign/);

                state.signers = [actors.tina, actors.tom, actors.tracy];
                return h.updateCharter([actors.tracy.address], 1);
            });

            it("does not allow minSigs to exceed the number of trustees", async (context: localTC) => {
                const { h, network, actors, delay, state } = context;
                state.signers = [actors.tina, actors.tracy];

                await expect(
                    h.updateCharter([actors.tracy.address], 2)
                ).rejects.toThrow(wrongMinSigs);
            });
        });

        xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
    });
});

const seconds = 1000; // milliseconds
