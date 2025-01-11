import { CapoHeliosBundle } from "../CapoHeliosBundle.js";
import { CapoDelegateBundle } from "../delegation/CapoDelegateBundle.js";
import { HeliosScriptBundle } from "../helios/HeliosScriptBundle.js";

import CapoMinterScript from "./CapoMinter.hl";


// this class expresses a "has dependences from the Capo" semantic,
// ... not because it expects any dynamic code dependencies from an
// ... application-specific Capo, but rather by simple convention of playing
// ... in the pattern of "Capo provides dependency code".
//
// It can safely get its code dependencies from the normal, unspecialized 
// Capo bundle

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
export default class CapoMinterBundle extends 
HeliosScriptBundle.usingCapoBundleClass(CapoHeliosBundle) {
    declare capoBundle: CapoHeliosBundle;
    
    // // no datum types in this script
    // declare Activity: makesUplcActivityEnumData<MinterActivityLike>;

    // constructor(capoBundle: CapoHeliosBundle) {
    //     super();
    //     this.capoBundle = capoBundle;
    // }

    get main() {
        return CapoMinterScript;
    }

    get modules() {
        return [...this.capoBundle.modules];
    }
}
