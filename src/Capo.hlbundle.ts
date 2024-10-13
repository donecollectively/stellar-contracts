import CapoMintHelpers from "./CapoMintHelpers.hl";
import CapoDelegateHelpers from "./delegation/CapoDelegateHelpers.hl";
import StellarHeliosHelpers from "./StellarHeliosHelpers.hl";
import CapoHelpers from "./CapoHelpers.hl";
import TypeMapMetadata from "./TypeMapMetadata.hl";
import { PriceValidator } from "./PriceValidator.js";

import BasicDelegate from "./delegation/BasicDelegate.hl";

import mainContract from "./DefaultCapo.hl";
import { HeliosScriptBundle } from "./helios/HeliosScriptBundle.js";

export default class CapoBundle extends HeliosScriptBundle {
    main = mainContract;

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

