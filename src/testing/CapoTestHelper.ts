import {
    Capo,
} from "../Capo.js";
import type {
    CapoBaseConfig,
    MinterBaseMethods,
    anyDatumArgs,
    hasBootstrappedConfig,
    hasUutContext,
} from "../Capo.js";

import { StellarTxnContext } from "../StellarTxnContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import type { MinimalDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { DefaultMinter } from "../minting/DefaultMinter.js";

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 * 
 * Unless you have a custom Capo not based on DefaultCapo, you 
 * should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export abstract class CapoTestHelper<
    SC extends Capo<DefaultMinter & MinterBaseMethods, CDT, CT>,
    CDT extends anyDatumArgs = //prettier-ignore
        SC extends Capo<DefaultMinter, infer iCDT> ? iCDT : anyDatumArgs, //prettier-ignore
    CT extends CapoBaseConfig  =  //prettier-ignore
        SC extends Capo<any, any, infer iCT> ? iCT : never //prettier-ignore
> extends StellarTestHelper<SC> {
    async initialize({
        randomSeed = 42,
        config,
    }: { config?: CT; randomSeed?: number } = {}): Promise<SC> {
        if (this.setupPending) await this.setupPending;
        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate setup() in test helper"
            );

            return this.strella;
        }
        if (this.strella)
            console.log(
                `  ---  new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...\n` +
                    new Error("stack")
                        .stack!.split("\n")
                        .slice(1)
                        .filter(
                            (line) =>
                                !line.match(/node_modules/) &&
                                !line.match(/node:internal/)
                        )
                        .join("\n")
            );
        this.randomSeed = randomSeed;
        this.state.mintedCharterToken = undefined;
        // console.log(new Error("setup from").stack)

        //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
        //   based on seedUtxo in mkTxnMintCharterToken
        if (!config)
            return (this.strella = this.initStrella(this.stellarClass));

        //@ts-expect-error either we got too fancy for Typescript, or the other way round
        const strella = this.initStrella(this.stellarClass, config);

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

    async bootstrap(args?: MinimalDefaultCharterDatumArgs) {
        let strella = this.strella || (await this.initialize());

        await this.mintCharterToken(args);
        return strella;
    }
    
    abstract mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<any>>
    abstract mintCharterToken(
        args?: MinimalDefaultCharterDatumArgs<any>
    ): Promise<
        & StellarTxnContext<any> 
        & hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt">
        & hasBootstrappedConfig<CapoBaseConfig>
    >
}
