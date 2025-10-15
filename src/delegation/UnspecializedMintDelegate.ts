import { Activity } from "../StellarContract.js";
import { type hasSeedUtxo } from "../StellarTxnContext.js";
import { BasicMintDelegate } from "../minting/BasicMintDelegate.js";

import {UnspecializedDelegateBridge} from "./UnspecializedDelegate.bridge.js"
import type { hasSeed } from "../ActivityTypes.js";

/**
 * @public
 */
export class UnspecializedMintDelegate extends BasicMintDelegate {
    dataBridgeClass = UnspecializedDelegateBridge;
    get delegateName() { return "UnspecializedDelegate" }

    async scriptBundle() {
        if (process.env.NODE_ENV === "development") {
            console.warn(
                "mint+spend delegate: using unspecialized delegate bundle\n"+
                "  ... this is good enough for getting started, but you'll need to\n"+
                "  ... specialize this delegate to fit your application's needs. \n"+
                "To do that, you'll add mintDgt and spendDgt entries into \n"+
                "  ... your Capo's delegateRoles() method, typically with\n"+
                "  ... both pointing to a single specialized mint-delegate class."
            );
        }
        const dgtModule = await import("./UnspecializedDelegate.hlb.js");
        return dgtModule.UnspecializedDgtBundle.create({
            setup: this.setup,            
        });
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
        // return this.activity.CapoLifecycleActivities.CreatingDelegate(seedFrom, {purpose});
        const seed = this.getSeed(seedFrom);
        return this.mkCapoLifecycleActivity("CreatingDelegate", {
            seed,
            purpose,
        });
    }
}
