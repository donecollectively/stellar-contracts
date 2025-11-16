import { Capo } from "./Capo.js";
import { ReqtsController } from "./reqts/ReqtsController.js";
/**
 * @internal
 */
export declare class CapoWithoutSettings extends Capo<CapoWithoutSettings> {
    initDelegateRoles(): {
        Reqt: import("./delegation/RolesAndDelegates.js").DelegateSetup<"dgDataPolicy", any, {}>;
        spendDelegate: import("./delegation/RolesAndDelegates.js").DelegateSetup<"spendDgt", import("./delegation/ContractBasedDelegate.js").ContractBasedDelegate, any>;
        govAuthority: import("./delegation/RolesAndDelegates.js").DelegateSetup<"authority", import("./delegation/StellarDelegate.js").StellarDelegate, any>;
        mintDelegate: import("./delegation/RolesAndDelegates.js").DelegateSetup<"mintDgt", import("./minting/BasicMintDelegate.js").BasicMintDelegate, any>;
    };
    reqtsController(): Promise<ReqtsController>;
}
//# sourceMappingURL=CapoWithoutSettings.d.ts.map