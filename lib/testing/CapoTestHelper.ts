import { TxId } from "@hyperionbt/helios";
import { expect } from "vitest";
import { Capo, anyDatumArgs } from "../Capo.js";
import { SeedTxnParams } from "../SeedTxn.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import { PartialDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { AuthorityPolicy } from "../authority/AuthorityPolicy.js";
import { selectDelegate } from "../delegation/RolesAndDelegates.js";


export abstract class CapoTestHelper<
    SC extends Capo<any>,
    CDT extends anyDatumArgs = 
        SC extends Capo<any, infer iCDT> ? iCDT : 
        anyDatumArgs
    > extends StellarTestHelper<SC, SeedTxnParams> {
    async initialize({
        randomSeed = 42, seedTxn, seedIndex = 0n,
    }: { seedTxn?: TxId; seedIndex?: bigint; randomSeed?: number; } = {}): Promise<SC> {
        if (this.setupPending) await this.setupPending;
        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate setup() in test helper"
            );

            return this.strella;
        }
        if (this.strella)
            console.warn(
                ".... warning: new test helper setup with new seed...."
            );
        this.randomSeed = randomSeed;
        // console.log(new Error("setup from").stack)
        if (!seedTxn) {
            seedTxn = await this.mkSeedUtxo(seedIndex);
        }
        const strella = this.initStrella(this.stellarClass, {
            seedTxn,
            seedIndex,
        });
        this.strella = strella;
        const { address, mintingPolicyHash: mph } = strella;

        const { name } = strella.scriptProgram;
        console.log(
            name,
            address.toBech32().substring(0, 18) + "…",
            "vHash 📜 " +
            strella.compiledScript.validatorHash.hex.substring(0, 12) +
            "…",
            "mph 🏦 " + mph?.hex.substring(0, 12) + "…"
        );
        return strella;
    }

    abstract mkDefaultCharterArgs() : Partial<CDT>;
    
    async mintCharterToken(args?: CDT): Promise<StellarTxnContext> {
        const { delay } = this;
        const { tina, tom, tracy } = this.actors;
        
        if (this.state.mintedCharterToken) {
            console.warn(
                "reusing minted charter from existing testing-context"
            );
            return this.state.mintedCharterToken;
        }

        await this.initialize();
        const script = this.strella!;
        const goodArgs: Partial<CDT> = args || this.mkDefaultCharterArgs();
        
        // debugger

        const tcx = await script.mkTxnMintCharterToken(goodArgs, script.withDelegates({
            govAuthority: selectDelegate<AuthorityPolicy>({
                strategyName: "address",
                config: {

                }
            })
        }));
        expect(script.network).toBe(this.network);

        await script.submit(tcx);
        console.log("charter token minted");

        this.network.tick(1n);
        return (this.state.mintedCharterToken = tcx);
    }

}
