import type { Source } from "@helios-lang/compiler-utils";

import {
    HeliosScriptBundle,
    placeholderSetupDetails,
} from "./HeliosScriptBundle.js";

import CapoMintHelpers from "./CapoMintHelpers.hl";
import CapoDelegateHelpers from "./delegation/CapoDelegateHelpers.hl";
import StellarHeliosHelpers from "./StellarHeliosHelpers.hl";
import CapoHelpers from "./CapoHelpers.hl";
import TypeMapMetadata from "./TypeMapMetadata.hl";
import mainContract from "./DefaultCapo.hl";

import type {
    AllDeployedScriptConfigs,
    CapoDeployedDetails,
    DeployedScriptDetails,
} from "../../configuration/DeployedScriptConfigs.js";
import type { StellarBundleSetupUplc } from "../../StellarContract.js";
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


    get hasAnyVariant() {
        if (this.preConfigured?.capo?.config) return true;
        if (this.configuredParams) return true;
        return false
    }

    init(setupDetails: StellarBundleSetupUplc<any>) {
        super.init(setupDetails);
        // only for Capo bundles, yes?
        this.configuredScriptDetails = setupDetails?.deployedDetails;

        const deployedDetails = ( this.preConfigured?.capo ?? 
            this.configuredScriptDetails )
            
        const hasParams = deployedDetails?.config ??
            setupDetails.params

        if (hasParams) {
            //??? any need to check whether the params need Uplc conversion?
            //    this.paramsToUplc(hasParams)
            this.configuredParams = hasParams
        }
        if (setupDetails.params && !this.preConfigured.isNullDeployment) {
            // anything needed here?
        }        
    }

    get isPrecompiled() {
        return !!this.preConfigured?.capo?.programBundle;
    }

    preConfigured: CapoDeployedDetails<"json"> =
        // | ((...args: any[]) => CapoDeployedDetails<any>)
        { capo: undefined };

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
        throw new Error(`used where?`)
        if (this.configuredParams) {

        }
        }

        const { mph, rev } = deployedDetails?.config || {};
        return { mph, rev };
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
