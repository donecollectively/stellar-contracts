import type { Source } from "@helios-lang/compiler-utils";

import { HeliosScriptBundle } from "./helios/HeliosScriptBundle.js";

import CapoMintHelpers from "./CapoMintHelpers.hl";
import CapoDelegateHelpers from "./delegation/CapoDelegateHelpers.hl";
import StellarHeliosHelpers from "./StellarHeliosHelpers.hl";
import CapoHelpers from "./CapoHelpers.hl";
import TypeMapMetadata from "./TypeMapMetadata.hl";
import mainContract from "./DefaultCapo.hl";

import type {
    AllDeployedScriptConfigs,
    CapoDeployedDetails,
} from "./configuration/DeployedScriptConfigs.js";
import type { StellarSetupUplc } from "./StellarContract.js";

export type CapoHeliosBundleClass = new () => CapoHeliosBundle;

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
    constructor(setupDetails?: StellarSetupUplc<any>) {
        // if we have deployed details, use that.
        // otherwise, require setupDetails
        super(setupDetails);
        this.deployedScriptDetails =
            this.deployedDetails?.capo ||
            (setupDetails?.deployedDetails ?? undefined);
    }
    get main() {
        return mainContract;
    }

    datumTypeName = "CapoDatum";
    capoBundle = this; // ???

    // todo: make types for these
    // config? : any
    deployedDetails?: CapoDeployedDetails;

    // scriptConfigs? : AllDeployedScriptConfigs
    get scriptConfigs() {
        return this.deployedDetails?.scripts;
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
