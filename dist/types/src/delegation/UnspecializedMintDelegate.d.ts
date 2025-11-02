import { type hasSeedUtxo } from "../StellarTxnContext.js";
import { BasicMintDelegate } from "../minting/BasicMintDelegate.js";
import { UnspecializedDelegateBridge } from "./UnspecializedDelegate.bridge.js";
import type { hasSeed } from "../ActivityTypes.js";
import type { ConcreteCapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js";
/**
 * @public
 */
export declare class UnspecializedMintDelegate extends BasicMintDelegate {
    dataBridgeClass: typeof UnspecializedDelegateBridge;
    get delegateName(): string;
    scriptBundleClass(): Promise<ConcreteCapoDelegateBundle>;
    activityMintingUutsAppSpecific(seedFrom: hasSeedUtxo, purposes: string[]): import("../ActivityTypes.js").isActivity;
    activityCreatingTestNamedDelegate(seedFrom: hasSeed, purpose: string): import("../ActivityTypes.js").isActivity;
}
//# sourceMappingURL=UnspecializedMintDelegate.d.ts.map