import type { Source } from "@helios-lang/compiler-utils";

import {
    HeliosScriptBundle,
    placeholderSetupDetails,
} from "./HeliosScriptBundle.js";

import CapoMintHelpers from "../../CapoMintHelpers.hl";
import CapoDelegateHelpers from "../../delegation/CapoDelegateHelpers.hl";
import StellarHeliosHelpers from "../../StellarHeliosHelpers.hl";
import CapoHelpers from "../../CapoHelpers.hl";
import TypeMapMetadata from "../../TypeMapMetadata.hl";
import mainContract from "../../DefaultCapo.hl";

import type { StellarBundleSetupDetails } from "../../StellarContract.js";
import type { AbstractNew } from "../typeUtils.js";
import { parseCapoJSONConfig, parseCapoMinterJSONConfig, type CapoDeployedDetails, type DeployedScriptDetails } from "../../configuration/DeployedScriptConfigs.js";
import type { capoConfigurationDetails } from "../../configuration/DefaultNullCapoDeploymentConfig.js";
import type { PrecompiledProgramJSON } from "../CachedHeliosProgram.js";

export type CapoHeliosBundleClass = AbstractNew<CapoHeliosBundle>;

/**
 * A set of Helios scripts that are used to define a Capo contract.
 * @remarks
 * This class is intended to be extended to provide a specific Capo contract.
 *
 * You can inherit & augment `get sharedModules()` to make additional
 * helios modules available for use in related contract scripts.  Other
 * bundles can include these modules only by naming them in their
 * own `includeFromCapoModules()` method.
 * @public
 */
export class CapoHeliosBundle extends HeliosScriptBundle {
    preConfigured?: typeof capoConfigurationDetails
    precompiledScriptDetails?: CapoDeployedDetails<any> = {capo: undefined};
    scriptParamsSource = "config" as const
    requiresGovAuthority = true;

    get hasAnyVariant() {
        if (this.preConfigured?.capo?.config) return true;
        throw new Error("can we live without configuredUplcParams before accessing program?")
        if (this.configuredUplcParams) return true;

        return false
    }

    parseCapoJSONConfig(config: any) {
        return parseCapoJSONConfig(config);
    }

    parseCapoMinterJSONConfig(config: any) {
        return parseCapoMinterJSONConfig(config);
    }

    init(setupDetails: StellarBundleSetupDetails<any>) {
        const {setup} = setupDetails

        let deployedDetails : DeployedScriptDetails | undefined;
        
        if (this.precompiledScriptDetails?.capo) {
            this.configuredScriptDetails = deployedDetails = this.precompiledScriptDetails.capo
            const {
                config
                // programBundle
            } = deployedDetails;
            this.configuredParams = config
            this._selectedVariant = "capo"
        } else if (setupDetails.deployedDetails) {
            this.configuredScriptDetails = deployedDetails = setupDetails.deployedDetails
        } else if (!this.configuredScriptDetails) {
            
            console.warn(`no script details configured for ${this.constructor.name} (dbpa)`)
        }
        this._didInit = true;
    }

    initProgramDetails() {
        const {configuredScriptDetails} = this;

        const hasParams = configuredScriptDetails?.config || this.setupDetails.params
        const uplcParams = hasParams ? this.paramsToUplc(hasParams) : undefined

        if (hasParams) {
            this.configuredParams = hasParams
            this.configuredUplcParams = uplcParams
        }
    }

    get isPrecompiled() {
        const t = super.isPrecompiled
        // the `preConfigured` entry, built by the stellar rollup bundler,
        // signals that the script is precompiled.  The actual compiled script
        // is loaded separately, but this provide the key signal of its its presence.
        const hasScriptHash = !!this.precompiledScriptDetails?.capo?.scriptHash;
        if (t !== hasScriptHash) {
            debugger
            throw new Error("surprise! this code path is used: isPrecompiled() - precompiledScriptDetails mismatch (dbpa)")
            // ^^ if this never happens, then we don't need this method
        }
        return t
    }

    async loadPrecompiledScript() : Promise<PrecompiledProgramJSON> {
        throw new Error("capo on-chain bundle is not precompiled");
    }

    async loadPrecompiledMinterScript() : Promise<PrecompiledProgramJSON> {
        throw new Error("capo minter on-chain bundle is not precompiled");
    }

    getPreCompiledBundle(variant: string) {
        throw new Error("deprecated")
        if (variant !== "singleton") {
            throw new Error(`Capo bundle: ${this.constructor.name} only singleton variant is supported`);
        }

        //@ts-expect-error
        const {capo} = this.preCompiledScriptDetails
        if (!capo?.scriptHash) {
            debugger
            throw new Error(`Capo bundle: ${this.constructor.name} - not preConfigured or no programBundle configured (debugging breakpoint available)`)
        }
        return capo.programBundle
    }

    get main() {
        return mainContract;
    }

    getPreconfiguredUplcParams(variantName:string) {
        if (!this.preConfigured?.capo?.config) {
            return undefined
        }
        return super.getPreconfiguredUplcParams(variantName)
    }

    get params() {
        
        if (this.configuredParams) {
            return this.configuredParams
        }
    }

    datumTypeName = "CapoDatum";
    capoBundle = this; // ???

    get scriptConfigs() {
        throw new Error(`scriptConfigs - do something else instead`);
    }

    get bridgeClassName(): string {
        if (this.constructor === CapoHeliosBundle) {
            return "CapoDataBridge";
        }

        return (
            this.constructor.name.replace("Helios", "").replace("Bundle", "") +
            "Bridge"
        );
        // throw new Error(`${this.constructor.name} must implement get bridgeClassName`);
    }
    static isCapoBundle = true;

    /**
     * returns only the modules needed for the Capo contract
     * @remarks
     * overrides the base class's logic that references a connected
     * Capo bundle - that policy is not needed here because this IS
     * the Capo bundle.
     */
    getEffectiveModuleList() {
        return this.modules;
    }

    /**
     * indicates a list of modules available for inclusion in Capo-connected scripts
     * @remarks
     * Subclasses can implement this method to provide additional modules
     * shareable to various Capo-connected scripts; those scripts need to
     * include the modules by name in their `includeFromCapoModules()` method.
     *
     * See the
     */
    get sharedModules(): Source[] {
        return [];
    }

    get modules() {
        return [
            CapoMintHelpers,
            CapoDelegateHelpers,
            StellarHeliosHelpers,
            CapoHelpers,
            TypeMapMetadata,
        ];
    }
}
