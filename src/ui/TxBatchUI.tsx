import { BatchSubmitController } from "@donecollectively/stellar-contracts";
import React from "react";
import { useCapoDappProvider } from "./CapoDappProvider.js";
import { TxBatchViewer } from "./TxBatchViewer.js";
import { Button } from "./Button.js";

export function TxBatchUI() {
    const provider = useCapoDappProvider();
    const capo = provider?.capo;

    const [currentBatch, setTxBatch] = React.useState<BatchSubmitController>();
    const [initialId, setInitialId] = React.useState<string | undefined>(
        undefined
    );

    const [advancedView, setAdvancedView] = React.useState(false);

    const batchSize = currentBatch?.$allTxns.length;
    const viewSwitcher = (
        <div className="flex flex-row justify-between p-2">
            <div>
                <h3 className="bg-transparent mt-0 mb-2">Pending Txns</h3>
                {batchSize && batchSize > 1 && <>{batchSize} txns in batch</>}
            </div>
            <div>
                <Button variant="secondary-sm"
                    className="ml-3"
                    onClick={() => {
                        setAdvancedView(!advancedView);
                    }}
                >
                    {advancedView ? "Hide details" : "Show details"}
                </Button>
            </div>
        </div>
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

    const width = advancedView ? "w-[80vw]" : "";
    if (!hasBatch) return null;
    return (
        <div
            className={`z-100 bg-background/66 absolute top-10 right-4 ${width} flex flex-col rounded-lg border border-white/10 backdrop-blur-md`}
        >
            {viewSwitcher}
            <TxBatchViewer
                batch={currentBatch}
                {...{ initialId, advancedView }}
            />
        </div>
    );
}
