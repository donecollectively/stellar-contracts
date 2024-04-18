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

import { StellarTxnContext, type hasAddlTxns } from "../StellarTxnContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import type { MinimalDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { CapoMinter } from "../minting/CapoMinter.js";

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 * 
 * Unless you have a custom Capo not based on DefaultCapo, you 
 * should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export abstract class CapoTestHelper<
    SC extends Capo<any, MinterBaseMethods & CapoMinter, CDT, CT>,
    CDT extends anyDatumArgs = //prettier-ignore
        SC extends Capo<any, infer iCDT> ? iCDT : anyDatumArgs, //prettier-ignore
    CT extends CapoBaseConfig  =  //prettier-ignore
        SC extends Capo<any, any, any, infer iCT> ? iCT : never //prettier-ignore
> extends StellarTestHelper<SC> {
    async initialize({
        randomSeed = 42,
        config,
    }: { config?: CT; randomSeed?: number } = {}): Promise<SC> {
        // Note: This method diverges from the base class impl, due to type difficulties.
        // Patches welcome.

        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate setup() in test helper"
            );

            return this.strella;
        }
        // console.log("A in capo test helper")

        if (this.strella) {
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
            this.setupPending = undefined;
            this.actors = {};
        }
        if (this.setupPending) {
            return this.setupPending;
        }
        await this.delay(1);
        const actorSetup = this.setupActors();
        await actorSetup
    
        this.randomSeed = randomSeed;
        this.state.mintedCharterToken = undefined;
        this.state.parsedConfig = undefined;

        //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
        //   based on seedUtxo in mkTxnMintCharterToken
        if (!config)
            return (this.strella = await this.initStrella(this.stellarClass));

        //@ts-expect-error either we got too fancy for Typescript, or the other way round
        const strella = await this.initStrella(this.stellarClass, config);

        this.strella = strella;
        const { address, mintingPolicyHash: mph } = strella;

        const { name } = strella.scriptProgram!;
        console.log(
            name,
            address.toBech32().substring(0, 18) + "…",
            "vHash 📜 " +
                strella.validatorHash.hex.substring(0, 12) +
                "…",
            "mph 🏦 " + mph?.hex.substring(0, 12) + "…"
        );
        return strella;
    }
    
    get ready() {
        return !!(this.strella.configIn || this.state.parsedConfig)
    }

    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx() {
        return new StellarTxnContext(this.currentActor);
    }
    
    async bootstrap(args?: Partial<MinimalDefaultCharterDatumArgs>) {
        let strella = this.strella || (await this.initialize());
        if (this.ready) return strella;

        await this.mintCharterToken(args);
        return strella;
    }
    
    abstract mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<any>>
    abstract mintCharterToken(
        args?: Partial<MinimalDefaultCharterDatumArgs<any>>
    ): Promise<
        & hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt" | "settings">
        & hasBootstrappedConfig<CapoBaseConfig>
        & hasAddlTxns<any>
    >
}
