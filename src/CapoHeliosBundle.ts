import CapoMintHelpers from "./CapoMintHelpers.hl";
import CapoDelegateHelpers from "./delegation/CapoDelegateHelpers.hl";
import StellarHeliosHelpers from "./StellarHeliosHelpers.hl";
import CapoHelpers from "./CapoHelpers.hl";
import TypeMapMetadata from "./TypeMapMetadata.hl";

import mainContract from "./DefaultCapo.hl";
import { HeliosScriptBundle } from "./helios/HeliosScriptBundle.js";

export type CapoHeliosBundleClass = new () => CapoHeliosBundle;

/**
 * A set of Helios scripts that are used to define a Capo contract.
 * @remarks
 * This class is intended to be extended to provide a specific Capo contract.
 * 
 * You can inherit & augment `get modules()` to make additional modules available
 * for use in related contract scripts.  Other bundles can include these modules only 
 * by naming them in their own `includes` property.
 * @public
 */
export class CapoHeliosBundle extends HeliosScriptBundle {
    get main() {
        return mainContract
    }

    datumTypeName = "CapoDatum"
    capoBundle = this // ???

    get bridgeClassName(): string {
        if (this.constructor === CapoHeliosBundle) {
            return "CapoDataBridge";
        }

        return this.constructor.name.replace("Helios", "").replace("Bundle", "") + "Bridge";
        // throw new Error(`${this.constructor.name} must implement get bridgeClassName`);
    }
    static isCapoBundle = true;

    get modules() {
        return [
            CapoMintHelpers,
            CapoDelegateHelpers,
            StellarHeliosHelpers,
            CapoHelpers,
            TypeMapMetadata
        ];
    }
}

