import { BasicMintDelegate } from "@donecollectively/stellar-contracts";

import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlb.js";
import ummdDataBridge from "./uutMintingMintDelegate.bridge.js"

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    dataBridgeClass = ummdDataBridge;
    get delegateName() { return "uutMintingDelegate" }

    async scriptBundle() {
        const bundleModule = await import("./uutMintingMintDelegate.hlb.js");
        return bundleModule.BundleMintDelegateWithGenericUuts.create() as uutMintingMintDelegateBundle
    }
    
}
