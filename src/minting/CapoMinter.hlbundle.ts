import type CapoBundle from "../Capo.hlbundle.js";
import { HeliosScriptBundle } from "../helios/HeliosScriptBundle.js";
import CapoMinter from "./CapoMinter.hl";

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
export default class CapoMinterBundle extends HeliosScriptBundle {
    constructor(public capoBundle: CapoBundle) {
        super();
    }

    get main() {
        return CapoMinter
    }

    get modules() {
        return [...this.capoBundle.modules];
    }
}
