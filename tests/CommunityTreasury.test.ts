import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
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

    // async charter(this: localTC, trusteeNames = ["tina", "tom"], minSigs = undefined) {
    //     const {delay} = this;
    //     const { tina, tom, tracy } = this.actors;
    //     const trustees = trusteeNames.map((name: string) => {
    //         const trustee = this.actors[name] 
    //         if (!trustee) {
    //             const actorNames = Object.keys(this.actors);
    //             throw new Error(`trustee name ${name} does not map to one of the configured actors in this testing context (${actorNames.join(", ")}`)
    //         }
    //         return trustee.address
    //     });
    //     if (!minSigs) minSigs = trustees.length;

    //     const treasury = this.strella!
    //     const tcx = await treasury.txMintCharterToken({
    //         trustees,
    //         minSigs
    //     });
    //     await treasury.submit(tcx)
    //     this.network.tick(1n);

    //     return tcx
    // }

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
                
            });
        });
    });

    if (0) describe("params", () => {
    //     it("initialTrustees: helps determine the treasury address", async (context: localTC) => {
     //         const { tina, tom, tracy } = context.actors;
    //         context.randomSeed = 42;
    //         const nonce = context.mkRandomBytes(16);

    //         const treasury1 = await context.instantiateWithParams({
    //             nonce,
    //             initialTrustees: [tina.address, tom.address, tracy.address],
    //         });
    //         const addr1 = treasury1.address.toHex();

    //         const treasury2 = await context.instantiateWithParams({
    //             nonce,
    //             initialTrustees: [tina.address, tom.address],
    //         });
    //         const addr2 = treasury2.address.toHex();
    //         expect(treasury1).not.toBe(treasury2);
    //         // console.error({addr1, addr2, nonce})
    //         expect(addr1).not.toEqual(addr2);
    //     });
    // });
    // describe("chartering the treasury", () => {
    //     it("allocates an address for a community treasury", async (context: localTC) => {
    //         const { tina, tom, tracy } = context.actors;
    //         context.randomSeed = 42;
    //         const nonce = context.mkRandomBytes(16);

    //         const treasury = await context.instantiateWithParams({
    //             nonce,
    //             initialTrustees: [tina.address, tom.address, tracy.address],
    //         });
    //         expect(treasury.address).toBeTruthy();

    //         const found = await context.network.getUtxos(treasury.address);
    //         expect(found.length).toBe(0);
    //     });
    //     // await tx.finalize(context.networkParams, input.origOutput.address);
    //     // const [sig] = await tom.signTx(tx)
    //     // tx.addSignature(sig, true);

    //     // await delay(500);
    //     // debugger
    //     // it("creates a 'charter seed' utxo in the treasury contract", async (context: localTC) => {
    //     //     const h : typeof CCTHelpers = context.h;
            
    //     //     const { tina, tom, tracy } = context.actors;
            
    //     //     const treasury = await context.h.setup();
    //     //     const { tx, inputs, outputs } = await h.charterSeed();
            
    //     //     // await context.delay(1500)
    //     //     // debugger
    //     //     const found = await context.network.getUtxos(treasury.address);
    //     //     expect(found.length).toBe(1);
    //     //     const onChainDatum = found[0].origOutput.datum;
    //     //     expect(onChainDatum.hash).toEqual(outputs[0].datum.hash);
    //     // });

    //     describe("minting a unique charter token", () => {
    //         it("determines the minting contract address from the charter seed", async (context: localTC) => {
    //             const h = context.h
    //             const treasury = await h.setup();
    //             console.log("... charter #1")
    //             await h.charterSeed();
    //             console.log("... making minter1")
    //             const minter1 = await treasury.mkMinter();
                
    //             const t2 = await h.setup(43) // a different seed                
    //             console.log("... charter #2")
    //             await h.charterSeed();
    //             console.log("... making minter2")
    //             const minter2 = await t2.mkMinter();
    //             minter2.t()
    //             const s1 = minter1.configuredContract.evalParam("seedTxn").toString()
    //             const s2 = minter2.configuredContract.evalParam("seedTxn").toString()

    //             expect(minter2.identity).not.toEqual(minter1.identity)
    //         });

    //         it.only("mints a singular unique charter token using the charter utxo", async (context: localTC) => {
    //             const h : typeof CCTHelpers = context.h;
                
    //             const { tina, tom, tracy } = context.actors;
                
    //             const treasury = await h.setup();
    //             await h.charterSeed()
    //             const { tx, inputs, outputs } = await h.charter()
                
    //             // await context.delay(1500)

    //             const found = await context.network.getUtxos(treasury.address);
    //             expect(found.length).toBe(1);
    //             const onChainDatum = found[0].origOutput.datum;
    //             expect(onChainDatum.hash).toEqual(outputs[0].datum.hash);
    //         });

    //         it("wont work if the token isn't sent back to the treasury", async () => {
            
    //         });
    //     });

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
