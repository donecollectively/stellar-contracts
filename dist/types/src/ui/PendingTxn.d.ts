import type { TxDescription } from "@donecollectively/stellar-contracts";
import { TxSubmitMgr } from "@donecollectively/stellar-contracts";
import * as React from "react";
/**
 * @public
 */
export type PendingTxn = {
    txd: TxDescription<any, any>;
    statusSummary: string;
    mgr?: TxSubmitMgr;
};
/**
 * @deprecated - the CharterStatus component is now preferred
 * @public
 */
export declare function ShowPendingTxns({ pendingTxns, }: {
    pendingTxns: Map<string, PendingTxn>;
}): React.JSX.Element | null;
//# sourceMappingURL=PendingTxn.d.ts.map