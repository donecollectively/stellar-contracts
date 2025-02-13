import { CapoHeliosBundle } from "../helios/scriptBundling/CapoHeliosBundle.js";
import type { CapoConfig } from "../CapoTypes.js";
import type { RequiredDeployedScriptDetails } from "../configuration/DeployedScriptConfigs.js";
import { CapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js";
import { HeliosScriptBundle } from "../helios/scriptBundling/HeliosScriptBundle.js";

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
 * to the minter for imports
 **/
export class CapoMinterBundle 
extends HeliosScriptBundle.usingCapoBundleClass(CapoHeliosBundle) {
    static needsCapoConfiguration = true
    
    declare capoBundle: CapoHeliosBundle;

    get rev(): bigint {
        return 1n
    }

    get params() {
        const {configuredScriptDetails, configuredParams } = this.capoBundle || {}
        //  
        const noConfig = `${this.constructor.name}: capoMph not found in deployed capo bundle; can't make config yet`;
        if (!configuredScriptDetails) {
            
            if (configuredParams) {                
                console.warn(noConfig);
                debugger
            }
            return undefined
        }
        const capoConfig = (configuredScriptDetails as RequiredDeployedScriptDetails<CapoConfig>).config
        const {
            mph,
            seedTxn,
            seedIndex,
        } = capoConfig
        if (!mph) {
            console.warn(noConfig);
            return undefined
        }

        return {
            rev: this.rev,
            seedTxn,
            seedIndex
        }
    }

    // // no datum types in this script
    // declare Activity: makesUplcActivityEnumData<MinterActivityLike>;

    // constructor(capoBundle: CapoHeliosBundle) {
    //     super();
    //     this.capoBundle = capoBundle;
    // }

    get main() {
        return CapoMinterScript;
    }    

    // automatically-included modules from Capo don't need to be specified
    // get modules() {
    //     return [...this.capoBundle.modules];
    // }
}

export default CapoMinterBundle