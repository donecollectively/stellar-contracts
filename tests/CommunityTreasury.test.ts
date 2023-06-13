import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    vi
} from "vitest";
import { CtParams, CommunityTreasury, CharterDatumArgs } from "../src/CommunityTreasury";

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
import { Tx, TxOutput, Value } from "@hyperionbt/helios";
import { StellarTxnContext, findInputsInWallets, utxosAsString } from "../lib/StellarContract";

// console.log(CommunityTreasury);
interface localTC extends HeliosTestingContext<
    CommunityTreasury, 
    typeof CCTHelpers, 
    CtParams
> {}

const it = itWithContext<localTC>;

const xit = it.skip; //!!! todo: update this when vitest can have skip<HeliosTestingContext>
//!!! until then, we need to use if(0) it(...) : (
// ... or something we make up that's nicer

const describe = descrWithContext<localTC>;

const minAda = 2n * ADA; // minimum needed to send an NFT
type hasHelpers =  HelperFunctions<CommunityTreasury>
const CCTHelpers :  hasHelpers = {
    async mkSeedUtxo(this: localTC, seedIndex = 0) {
        const {actors: {tina}, network, h} = this

        const tx = new Tx();
        const tinaMoney = await tina.utxos;
        console.log("tina has money: \n"+ utxosAsString(tinaMoney))

        tx.addInput(
            await findInputsInWallets(
                new Value(30n * ADA), 
                {wallets: [tina]},
                network
            )
        );

        tx.addOutput(new TxOutput(tina.address, new Value(10n * ADA)));
        tx.addOutput(new TxOutput(tina.address, new Value(10n * ADA)));
        // console.log("s3", new Error("stack").stack)

        const txId = await this.submitTx(tx);

        return txId
    },

    async setup(this: localTC, {
        randomSeed = 42,
        seedTxn,
        seedIndex = 0,
    } = {}) {
        if (this.strella && (this.randomSeed == randomSeed)) return this.strella;

        if (!seedTxn) {            
            seedTxn = await this.h.mkSeedUtxo();
        }
        this.randomSeed = randomSeed;
        this.myself = this.actors.tina;
        return this.instantiateWithParams({
            seedTxn,
            seedIndex,
        });
    },

    async mintCharterToken(this: localTC, args?: CharterDatumArgs) {
        const {delay} = this;
        const { tina, tom, tracy } = this.actors;

        await this.h.setup();
        const treasury = this.strella!
        args = args || {
            trustees: [tina.address, tom.address, tracy.address],
            minSigs: 2
        };
        const tcx = await treasury.txMintCharterToken(args);
        expect(treasury.network).toBe(this.network)
        
        console.log("charter token mint: \n"+ tcx.dump())

        await treasury.submit(tcx)

        this.network.tick(1n);   
        return tcx
    },

    async mkCharterSpendTx(this: localTC) {        
        await this.h.setup();
        const treasury = this.strella!

        return treasury.txCharterAuthorization();
    }

}

describe("community treasury manager", async () => {
    beforeEach<localTC>(async (context) => {
        await addTestContext(context, CommunityTreasury, CCTHelpers);
        context.addActor("tina", 1100n * ADA);
        context.addActor("tom", 120n * ADA);
        context.addActor("tracy", 13n * ADA);

    });

    describe("baseline capabilities", () => {
        it("gets expected wallet balances for TRUSTEE roles", async (context: localTC) => {
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
            const {actors: {tom}, network, h} = context
            // await h.setup()
            const tx = new Tx();
            const tomMoney = await tom.utxos;

            tx.addInput(tomMoney[0]);
            tx.addOutput(new TxOutput(tom.address, new Value(3n * ADA)));
            tx.addOutput(new TxOutput(tom.address, new Value(
                tomMoney[0].value.lovelace - (5n * ADA)
            )));
            // console.log("s2")

            await context.submitTx(tx);
            const tm2 = await network.getUtxos(tom.address)

            expect(tomMoney.length).not.toEqual(tm2.length)
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
            const {h, network, actors: {tina}} = context;
            const seedTxn = await h.mkSeedUtxo().catch( e => { throw(e) } )

            const treasury = h.setup({
                seedTxn,
                seedIndex: 0
            });

            const unspent = await network.getUtxos(tina.address);
            const empty = unspent.find((x) => {
                return (
                    x.txId == seedTxn &&
                    BigInt(x.utxoIdx) == 0n
                )
            })
            expect(empty).toBeFalsy()
        });

        it("makes a different address depending on (txId, outputIndex) parameters of the Minting script", async (context: localTC) => {
            const {h, network} = context;

            const t1 : CommunityTreasury = await h.setup();
            const t2 : CommunityTreasury = await h.setup({
                randomSeed: 43,
                seedIndex: 1,
            });

            expect(t1.mkMintingScript().mintingPolicyHash?.hex).
                not.toEqual(t2.mkMintingScript().mintingPolicyHash?.hex)
        });


    });

    describe("has a unique, permanent treasury address", () => {
        it("uses the Minting Policy Hash as the sole parameter for the treasury spending script", async (context: localTC) => {
                const {h, network} = context;
    
                try {
                    const t1 : CommunityTreasury = await h.setup();
                    const t2 : CommunityTreasury = await h.setup({
                        randomSeed: 43,
                        seedIndex: 1,
                    });
                    expect(t1.address.toBech32()).
                        not.toEqual(t2.address.toBech32())
                } catch(e) { throw(e) }
        });    
    });
    describe("has a unique, permanent charter token", () => {
        describe("txMintCharterToken()", () => {
            it("creates a unique 'charter' token, with assetId determined from minting-policy-hash+'charter'", async (context: localTC) => {
                const {h} = context
                // await context.delay(1000)
                try {
                    await h.setup()
                    await h.mintCharterToken()
                } catch(e) { throw(e) }

                return expect(h.mintCharterToken()).rejects.toThrow("already spent")                
            });

            it("doesn't work with a different spent utxo", async (context: localTC) => {
                const {h, actors: {tracy} } = context
                // await context.delay(1000)
                const treasury = await h.setup()

                const wrongUtxo = (await tracy.utxos).at(-1);

                vi.spyOn(treasury, "mustGetSeedUtxo").mockImplementation(() => {return wrongUtxo})

                try {
                    await h.mintCharterToken()
                    expect(false).toBe("minting should have thrown assertion from contract")
                } catch(e) {
                    expect(e.message).not.toMatch("seed utxo required");
                    expect(e.message).toMatch("assert failed")
                    //!!! todo: remove this try/catch when the message is improved,
                    // and use the more explicit rejects... matching below.
                }

                // await expect(h.mintCharterToken()).rejects.toThrowError("seed utxo required")
            });
        });
    });
    describe("the charter token is always kept in the contract", () => {
        it("builds transactions with the charter token returned to the contract", async (context: localTC) => {
            const {h, network, actors, delay, state, } = context;
        
            await h.mintCharterToken()    
            const treasury = context.strella!
            
            const tcx = await h.mkCharterSpendTx();
            expect(tcx.outputs).toHaveLength(1)
            await delay(1000);
            debugger
            expect(tcx.outputs.find((o : TxOutput) => {
                debugger
                return o.value.assets.ge(treasury.charterTokenAsValue.assets);
            })).toBeTruthy()
                });

    });

    if (0)
        it("doesn't let randos issue tokens", async ({
            network,
            actors: { alice, bob },
            address,
        }) => {});

    if (0)
        it("lets the owner issue tokens", async ({
            network,
            actors: { owner },
        }) => {
            // expect(something...).toBe();
        });

    xit("rewards the first 256 buyers with 2.56x bonus credit", async () => {});
});

const seconds = 1000; // milliseconds
