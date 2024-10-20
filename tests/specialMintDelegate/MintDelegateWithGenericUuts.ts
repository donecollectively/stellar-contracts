import { Activity, type BundleType, type hasSeed } from "../../src/StellarContract.js";
import { type hasSeedUtxo } from "../../src/StellarTxnContext.js";
import { HeliosScriptBundle } from "../../src/helios/HeliosScriptBundle.js";
import { BasicMintDelegate } from "../../src/minting/BasicMintDelegate.js";
import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlbundle.js";

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    get delegateName() { return "uutMintingDelegate" }

    scriptBundle() {
        return this.mkBundleWithCapo(uutMintingMintDelegateBundle);
    }
    
    @Activity.redeemer
    activityMintingUutsAppSpecific(seedFrom: hasSeedUtxo, purposes: string[]) {
        const seed = this.getSeed(seedFrom);

        return this.mkSeededMintingActivity("mintingUuts", {
            seed,
            purposes, 
        });
    }

    @Activity.redeemer
    activityCreatingTestNamedDelegate(seedFrom: hasSeed, purpose: string) {
        const seed = this.getSeed(seedFrom);
        return this.mkCapoLifecycleActivity("CreatingDelegate", {
            seed,
            purpose,
        });
    }

    // get specializedDelegateModule() {
    //     return uutMintingMintDelegate;
    // }
}
