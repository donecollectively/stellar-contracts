import type { FoundDatumUtxo, hasUutContext } from "../CapoTypes.js";
import type { hasSettingsRef } from "../CapoTypes.js";
import type { StellarTxnContext, hasSeedUtxo } from "../StellarTxnContext.js";
import { DelegatedDataContract } from "../delegation/DelegatedDataContract.js";
import { ReqtsPolicyDataBridge } from "./Reqts.concrete.bridge.js";
import type { ReqtDataLike, ErgoReqtData, ReqtData, minimalReqtData } from "./Reqts.concrete.typeInfo.d.ts";
import type { hasSeed } from "../ActivityTypes.js";
import type { DelegatedDataBundle } from "../helios/scriptBundling/DelegatedDataBundle.js";
export declare class ReqtsController extends DelegatedDataContract<ReqtData, ReqtDataLike> {
    dataBridgeClass: typeof ReqtsPolicyDataBridge;
    get delegateName(): string;
    get idPrefix(): string;
    get recordTypeName(): string;
    exampleData(): minimalReqtData;
    scriptBundleClass(): Promise<typeof DelegatedDataBundle>;
    activityCreatingReqt(seedFrom: hasSeed): import("../ActivityTypes.js").isActivity;
    activityUpdatingReqt(id: any): import("../ActivityTypes.js").isActivity;
    activityCreatingRequirement(seedFrom: hasSeed): import("../ActivityTypes.js").isActivity;
    txnCreatingReqt<TCX extends StellarTxnContext & hasSeedUtxo & hasSettingsRef & hasUutContext<"reqt">>(tcx: TCX, reqt: ReqtDataLike, initialStake: bigint): Promise<TCX>;
    txnUpdateReqt(tcx: hasSettingsRef & hasSeedUtxo, reqtDetails: FoundDatumUtxo<ErgoReqtData>, newDepositIncrement: bigint, // can be positive or negative
    newDatum?: any): Promise<hasSettingsRef & hasSeedUtxo>;
    requirements(): import("../Requirements.js").ReqtsMap<"stores requirements connected to any target object" | "the target object can gradually adopt further requirements as needed", {
        inheriting: "‹empty/base class›";
    }>;
}
//# sourceMappingURL=ReqtsController.d.ts.map