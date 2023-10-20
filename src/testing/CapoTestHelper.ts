import { TxId } from "@hyperionbt/helios";
import { ArgumentsType, expect } from "vitest";
import { Capo, CapoBaseConfig, MinterBaseMethods, anyDatumArgs, hasBootstrappedConfig } from "../Capo.js";
import { SeedTxnParams } from "../SeedTxn.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import { PartialDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { AuthorityPolicy } from "../authority/AuthorityPolicy.js";
import { ConfigFor } from "../StellarContract.js";
import { DefaultMinter } from "../DefaultMinter.js";


export abstract class CapoTestHelper<
    SC extends Capo<
        DefaultMinter & MinterBaseMethods, CDT, CT
    >,
    CDT extends anyDatumArgs = 
        SC extends Capo<DefaultMinter, infer iCDT> ? iCDT : anyDatumArgs,
    CT extends CapoBaseConfig  = 
        SC extends Capo<any, any, infer iCT> ? iCT : never
> extends StellarTestHelper<SC> {
    async initialize({
        randomSeed = 42, config
    }: {config?:  CT, randomSeed?: number; } = {}): Promise<SC> {
        if (this.setupPending) await this.setupPending;
        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate setup() in test helper"
            );

            return this.strella;
        }
        if (this.strella)
            console.log(
                `  ---  new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...\n`+
                new Error("stack").stack!.split("\n").slice(1).filter(
                    line => ( 
                        !line.match(/node_modules/) &&
                        !line.match(/node:internal/)
                    )
                ).join("\n")
            );
        this.randomSeed = randomSeed;
        this.state.mintedCharterToken = undefined
        // console.log(new Error("setup from").stack)
        
        //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
        //   based on seedUtxo in mkTxnMintCharterToken
        if (!config) return this.strella = this.initStrella(this.stellarClass);

        //@ts-expect-error either we got too fancy for Typescript, or the other way round
        const strella = this.initStrella(this.stellarClass, config );
            
        this.strella = strella;
        const { address, mintingPolicyHash: mph } = strella;

        const { name } = strella.scriptProgram!;
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

    async bootstrap(
        args? : CDT
    ) {
        let strella = this.strella || await this.initialize();

        await this.mintCharterToken(args);
        return strella
    }
    abstract mkDefaultCharterArgs() : Partial<CDT>;
    abstract mintCharterToken(args?: CDT): Promise<hasBootstrappedConfig<CT>>
    

}
