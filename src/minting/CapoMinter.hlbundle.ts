import type { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import { HeliosScriptBundle } from "../helios/HeliosScriptBundle.js";

import CapoMinterScript from "./CapoMinter.hl";

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
export default class CapoMinterBundle extends HeliosScriptBundle {
    capoBundle: CapoHeliosBundle;
    
    // // no datum types in this script
    // declare Activity: makesUplcActivityEnumData<MinterActivityLike>;

    constructor(capoBundle: CapoHeliosBundle) {
        super();
        this.capoBundle = capoBundle;
    }

    get main() {
        return CapoMinterScript;
    }

    get modules() {
        return [...this.capoBundle.modules];
    }
}
