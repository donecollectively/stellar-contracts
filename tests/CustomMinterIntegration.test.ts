import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi,
} from "vitest";
import {
    CharterDatumArgs,
    chTok,
} from "../src/examples/SampleTreasury";
import {CustomTreasury} from "../src/examples/CustomTreasury";

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

interface localTC
    extends HeliosTestingContext<CustomTreasury, typeof CCTHelpers, seedUtxoParams> {}

const it = itWithContext<localTC>;
const fit = it.only;
const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

const minAda = 2n * ADA; // minimum needed to send an NFT
type hasHelpers = HelperFunctions<CustomTreasury>;
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

describe("StellarContract", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, CustomTreasury, CCTHelpers);

        context.addActor("tracy", 13n * ADA);
        context.addActor("tina", 1100n * ADA);
        context.addActor("tom", 120n * ADA);
    });

    describe("Integration tests: custom Capo, custom minter", () => {

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
    });
});

const seconds = 1000; // milliseconds
