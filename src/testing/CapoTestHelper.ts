import {
    Capo,
} from "../Capo.js";
import type {
    CapoBaseConfig,
    CharterDatumProps,
    MinimalCharterDatumArgs,
    MinterBaseMethods,
    anyDatumArgs,
    hasBootstrappedConfig,
    hasUutContext,
} from "../Capo.js";

import { StellarTxnContext, type hasAddlTxns } from "../StellarTxnContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import { CapoMinter } from "../minting/CapoMinter.js";

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 * 
 * You should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export abstract class CapoTestHelper<
    SC extends Capo<any>,
> extends StellarTestHelper<SC> {
    async initialize({
        randomSeed = 42,
    }: {randomSeed?: number } = {}): Promise<SC> {
        // Note: This method diverges from the base class impl, due to type difficulties.
        // Patches welcome.

        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate initialize() in test helper"
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
            //@ts-expect-error
            this.strella = undefined
            this.actors = {}
        }
        await this.delay(1);
            this.randomSeed = randomSeed;

            if (!Object.keys(this.actors).length) {
                const actorSetup = this.setupActors();
                await actorSetup
            }
        
            debugger
            this.state.mintedCharterToken = undefined;
            this.state.parsedConfig = undefined;

            //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
            //   based on seedUtxo in mkTxnMintCharterToken
            if (!this.config) {
                return (this.strella = await this.initStrella(this.stellarClass))
            }
            const strella = await this.initStrella(this.stellarClass, this.config);

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
            console.log("CAPO TH INIT7")
            debugger

            return strella
    }
    
    get ready() {
        return !!(this.strella.configIn || this.state.parsedConfig)
    }

    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx() {
        return new StellarTxnContext(this.actorContext);
    }
    
    async bootstrap(args?: Partial<MinimalCharterDatumArgs>) {
        let strella = this.strella || (await this.initialize());
        if (this.bootstrap != CapoTestHelper.prototype.bootstrap) {
            throw new Error(`Don't override the test-helper bootstrap().  Instead, provide an implementation of extraBootstrapping()`)
        }
        if (this.ready) {
            console.log("       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap")

            return strella;
        }

        await this.mintCharterToken(args);
        console.log("       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap")
        await this.extraBootstrapping(args)
        return strella;
    }

    async extraBootstrapping(args?: Partial<MinimalCharterDatumArgs>) {
        return this.strella;
    }
    
    abstract mkDefaultCharterArgs(): Partial<MinimalCharterDatumArgs>
    abstract mintCharterToken(
        args?: Partial<MinimalCharterDatumArgs>
    ): Promise<
        & hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt" | "settings">
        & hasBootstrappedConfig<CapoBaseConfig>
        & hasAddlTxns<any>
    >
}
