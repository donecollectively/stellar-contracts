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

import {
    parseCapoJSONConfig,
    parseCapoMinterJSONConfig,
    type AllDeployedScriptConfigs,
    type CapoDeployedDetails,
    type DeployedScriptDetails,
} from "../../configuration/DeployedScriptConfigs.js";
import type { StellarBundleSetupDetails } from "../../StellarContract.js";
import type { AbstractNew } from "../typeUtils.js";

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
    configuredScriptDetails?: DeployedScriptDetails;
    static isPreconfigured = false;
    preConfigured: CapoDeployedDetails<any> = {capo: undefined};
    scriptParamsSource = "config" as const

    get hasAnyVariant() {
        if (this.preConfigured?.capo?.config) return true;
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
        let deployedDetails : DeployedScriptDetails | undefined;
        
        if (this.preConfigured.capo) {
            this.configuredScriptDetails = deployedDetails = this.preConfigured.capo
            const {
                config, programBundle, scriptHash
            } = deployedDetails;
            if (!programBundle) throw new Error(`${this.constructor.name} missing deployedDetails.programBundle`);
            if (!scriptHash) throw new Error(`${this.constructor.name}: missing deployedDetails.scriptHash`);

            this.preCompiled = { singleton: { scriptHash, programBundle, config } };
        } else if (setupDetails.deployedDetails) {
            this.configuredScriptDetails = deployedDetails = setupDetails.deployedDetails
        } else if (!this.configuredScriptDetails) {
            
            console.warn(`no script details configured for ${this.constructor.name} (dbpa)`)
        }

        const hasParams = deployedDetails?.config || setupDetails.params
        const uplcParams = hasParams ? this.paramsToUplc(hasParams) : undefined

        if (hasParams) {
            this.configuredParams = hasParams
            this.configuredUplcParams = uplcParams
        }
        this._didInit = true;
    }

    get isPrecompiled() {
        return !!this.preConfigured?.capo?.programBundle;
    }


    getPreCompiledBundle(variant: string) {
        if (variant !== "singleton") {
            throw new Error(`Capo bundle: ${this.constructor.name} only singleton variant is supported`);
        }

        const {capo} = this.preConfigured
        if (!capo?.programBundle) {
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
