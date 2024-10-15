import {CapoHeliosBundle} from "../CapoHeliosBundle.js";
import { HeliosScriptBundle } from "../helios/HeliosScriptBundle.js";
import CapoMinter from "./CapoMinter.hl";

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
export default class CapoMinterBundle extends HeliosScriptBundle {
    constructor(capoBundle) { // : CapoHeliosBundle) {
        super();
        this.capoBundle = capoBundle;
    }

    get main() {
        return CapoMinter
    }

    get modules() {
        return [...this.capoBundle.modules];
    }
}
