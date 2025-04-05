import { BatchSubmitController } from "@donecollectively/stellar-contracts";
import React from "react";
import { useCapoDappProvider } from "./CapoDappProvider.js";
import { TxBatchViewer } from "./TxBatchViewer.js";

export function TxBatchUI() {
    const provider = useCapoDappProvider();
    const capo = provider?.capo;

    const [currentBatch, setTxBatch] = React.useState<BatchSubmitController>();
    const [initialId, setInitialId] = React.useState<string | undefined>(
        undefined
    );

    React.useEffect(
        function monitorTxBatcher() {
            if (!capo) return;
            const { txBatcher } = capo.setup;

            txBatcher.$notifier.on("rotated", (batch) => {
                console.log("batch rotated", batch);
                const txns = batch.$allTxns;
                if (txns.length) {
                    setInitialId(txns[0].id);
                } else {
                    batch.$txChanges.once("txAdded", (txTracker) => {
                        console.log("tx added", txTracker);
                        const { id } = txTracker;
                        setInitialId(id);
                    });
                }
                setTxBatch(batch);
            });
        },
        [capo, capo?.setup.txBatcher]
    );

    const hasBatch = !!currentBatch && !!currentBatch?.$allTxns.length;

    if (!hasBatch) return null;
    return (
        <div className="z-100 bg-background/66 absolute top-10 right-4 w-[80vw] rounded-lg border border-white/10 backdrop-blur-md">
            <TxBatchViewer batch={currentBatch} {...{ initialId }} />
        </div>
    );
}
