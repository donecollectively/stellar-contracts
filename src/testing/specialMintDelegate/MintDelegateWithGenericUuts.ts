import { BasicMintDelegate } from "@donecollectively/stellar-contracts";

import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlb.js";
import ummdDataBridge from "./uutMintingMintDelegate.bridge.js"

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    dataBridgeClass = ummdDataBridge;
    get delegateName() { return "uutMintingDelegate" }

    scriptBundle() {
        return uutMintingMintDelegateBundle.create();
    }
    
}
