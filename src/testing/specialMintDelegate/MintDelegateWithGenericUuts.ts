import {
    BasicMintDelegate,
    type ConcreteCapoDelegateBundle,
} from "@donecollectively/stellar-contracts";

import uutMintingMintDelegateBundle from "./uutMintingMintDelegate.hlb.js";
import ummdDataBridge from "./uutMintingMintDelegate.bridge.js";

export class MintDelegateWithGenericUuts extends BasicMintDelegate {
    dataBridgeClass = ummdDataBridge;
    get delegateName() {
        return "uutMintingDelegate";
    }

    async scriptBundleClass(): Promise<ConcreteCapoDelegateBundle> {
        const bundleModule = await import("./uutMintingMintDelegate.hlb.js");

        return bundleModule.BundleMintDelegateWithGenericUuts as any;
    }
}
