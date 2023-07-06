import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";
import {
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
import { ValueProps } from "@hyperionbt/helios";
import { seedUtxoParams } from "../lib/Capo";
import { DefaultMinter } from "../src/DefaultMinter";

interface localTC
    extends HeliosTestingContext<SampleTreasury, typeof CCTHelpers, seedUtxoParams> {}

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
        this.myActor = this.actors.tina;
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
                t1.connectMintingScript(t1.getMinterParams()).mintingPolicyHash?.hex
            ).not.toEqual(t2.connectMintingScript(t2.getMinterParams()).mintingPolicyHash?.hex);
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

            describe("mustFindActorUtxo", () => {
                it.todo(
                    "finds utxos in the current user's wallet, based on a value predicate function"
                );
                it.todo("throws an error if no utxo is matched");
                describe("with tokenPredicate", () => {
                    it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                        const {h, network, actors, delay, state, } = context;
                        // await delay(1000)
                        const t : SampleTreasury = await h.setup(); 
                        const tcx = new StellarTxnContext();
                        const isEnoughT = t.mkTokenPredicate(
                            new Value({
                                lovelace: 42000
                            })
                        );
                        const u1 = await t.mustFindActorUtxo("first with token", isEnoughT, tcx);
                        const u1a = await t.mustFindActorUtxo("t1a", isEnoughT);
                        const u1b = await t.mustFindActorUtxo("t1b", isEnoughT, tcx);
    
                        expect(t.toUtxoId(u1a)).toEqual(t.toUtxoId(u1));
                        expect(t.toUtxoId(u1b)).toEqual(t.toUtxoId(u1));
    
                        tcx.addInput(u1);
                        const u2 = await t.mustFindActorUtxo("second with token", isEnoughT, tcx);
                        tcx.addCollateral(u2)
                        const u3 = await t.mustFindActorUtxo("#3with token", isEnoughT, tcx);
                        
                        // yes, but it doesn't mean anything; different refs to same details
                        //  will also not be === despite being equivalent.
                        expect(u2 === u1).not.toBeTruthy() 
                        expect(u3 === u1).not.toBeTruthy() 
                        expect(u3 === u2).not.toBeTruthy() 
    
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
                describe("with valuePredicate for ada-only", () => {
                    it("ignores utxos already in a tcx (inputs/collateral), if provided", async (context: localTC) => {
                        const {h, network, actors, delay, state, } = context;
                        // await delay(1000)
                        const t : SampleTreasury = await h.setup(); 
                        const tcx = new StellarTxnContext();
                        const isEnough = t.mkValuePredicate(42_000n, tcx)
                        const u1 = await t.mustFindActorUtxo("first", isEnough, tcx);
                        const u1a = await t.mustFindActorUtxo("1a", isEnough);
                        const u1b = await t.mustFindActorUtxo("1b", isEnough, tcx);
    
                        expect(t.toUtxoId(u1a)).toEqual(t.toUtxoId(u1));
                        expect(t.toUtxoId(u1b)).toEqual(t.toUtxoId(u1));
    
                        tcx.addInput(u1);
                        const u2 = await t.mustFindActorUtxo("second", isEnough, tcx);
                        tcx.addCollateral(u2)
                        const u3 = await t.mustFindActorUtxo("#3with token", isEnough, tcx);
    
                        // yes, but it doesn't mean anything; different refs to same details
                        //  will also not be === despite being equivalent.
                        expect(u2 === u1).not.toBeTruthy() 
                        expect(u3 === u1).not.toBeTruthy() 
                        expect(u3 === u2).not.toBeTruthy() 
    
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
                it.todo(
                    "finds utxos in a spending-contract's address, based on a value predicate function"
                );
                it.todo("throws an error if no utxo is matched");
            });

            describe("mustFindUtxo", () => {
                it.todo(
                    "finds utxos in a provided address, based on a value predicate function"
                );
                it.todo("throws an error if no utxo is matched");
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

        describe("mkValuePredicate()", () => {
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

    describe("Capo", () => {
        it.todo("provides a default minter");
        it.todo("allows the minter class to be overridden");
        it.todo("uses seed-utxo pattern by default");
    });

    describe("Integration tests: example Capo contract", () => {
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

                    vi.spyOn(treasury, "mustGetContractSeedUtxo").mockImplementation(
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

                    // await delay(1000);
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

        describe("UUTs for contract utility", () => {
            it("can create a UUT and send it anywhere", async (context: localTC) => {
                const {h, network, actors, delay, state, } = context;
                const { tina, tom, tracy } = actors;

                const t : SampleTreasury = await h.setup(); 
                await h.mintCharterToken();
                // await delay(1000);
                
                const tcx = new StellarTxnContext();
                await t.txnAddAuthority(tcx);
                const uut = await t.txnCreatingUUT(tcx, "something")

                tcx.addOutput(new TxOutput(tina.address, uut));
                await t.submit(tcx, {signers: [tom, tina, tracy]});
                network.tick(1n);

                const hasNamedToken = t.mkTokenPredicate(uut);
                const u = await network.getUtxos(tina.address);
                const f = u.find(hasNamedToken);
                expect(f).toBeTruthy();
                expect(f?.origOutput.value.ge(uut)).toBeTruthy();
            });

            it("won't mint extra UUTs", async (context: localTC) => {
                const {h, network, actors, delay, state, } = context;
                const { tina, tom, tracy } = actors;

                const t : SampleTreasury = await h.setup(); 
                await h.mintCharterToken();
                // await delay(1000);
                
                const tcx = new StellarTxnContext();
                await t.txnAddAuthority(tcx);
                const m : DefaultMinter = t.minter!;
                vi.spyOn(m, "mkUUTValuesEntries").mockImplementation(function (f:string) {
                    return [
                        this.mkValuesEntry(f, BigInt(1)),
                        this.mkValuesEntry("something-else", BigInt(1))
                    ]
                })

                const uut = await t.txnCreatingUUT(tcx, "something")

                tcx.addOutput(new TxOutput(tina.address, uut));
                await expect(t.submit(tcx, {signers: [tom, tina, tracy]})).rejects.toThrow(
                    /bad UUT mint/
                );
                network.tick(1n);
            });
        });
        //!!! todo: this (build-txn, check-it, submit-it, check-onchain)
        //   ... might be a pattern worth lifting to a helper
        // await this.txChecker({
        //     async build() : tcx {  ... },
        //     async onChain(utxosByAddr) {
        //          ...
        //     }
        // };

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

                const count = 1n;

                const tcx = await treasury.mkTxnUpdateCharter(
                    [ tina.address, tom.address ],
                    count,
                );

                await treasury.submit(tcx, {signers: [tina, tom]});
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

                const count = 1n;

                const tcx = await treasury.mkTxnUpdateCharter(
                    [tina.address, tom.address ],
                    count,
                );

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


                const count = 1n;

                const tcx = await treasury.mkTxnUpdateCharter(
                    [tina.address, tom.address ],
                    count,
                );

                await treasury.submit(tcx, { signers: [tina, tom, tracy] });
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
