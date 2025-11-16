import { BatchSubmitController } from "@donecollectively/stellar-contracts";
import * as React from "react";
/**
 * Shows a master/detail view of the tx batch
 * @remarks
 * Includes a list of txns on the left
 *
 * Shows the details of the selected txn on the right
 *
 * Shows a summary of the batch status at the top
 * @public
 */
export declare function TxBatchViewer({ batch, initialId, advancedView, }: {
    batch: BatchSubmitController;
    initialId?: string;
    advancedView: boolean;
}): React.JSX.Element;
//# sourceMappingURL=TxBatchViewer.d.ts.map