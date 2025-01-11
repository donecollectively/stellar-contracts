import { Activity } from "../../StellarContract.js";
import { type hasSeedUtxo } from "../../StellarTxnContext.js";
import { BasicMintDelegate } from "../../minting/BasicMintDelegate.js";
import type { hasSeed } from "../../ActivityTypes.js";

import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlb.js";
import ummdDataBridge from "./uutMintingMintDelegate.bridge.js"

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    dataBridgeClass = ummdDataBridge;
    get delegateName() { return "uutMintingDelegate" }

    scriptBundle() {
        return new uutMintingMintDelegateBundle();
    }
    
}
