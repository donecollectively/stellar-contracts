import { BatchSubmitController } from "@donecollectively/stellar-contracts";
import React from "react";

import { TxBatchViewer } from "./TxBatchViewer.js";
import { Button } from "./Button.js";
import { useCapoDappProvider } from "./CapoDappProviderContext.js";

export function TxBatchUI() {
    const provider = useCapoDappProvider();
    const capo = provider?.capo;

    const [currentBatch, setTxBatch] = React.useState<BatchSubmitController>();
    const [initialId, setInitialId] = React.useState<string | undefined>(
        undefined
    );

    const [advancedView, setAdvancedView] = React.useState(false);

    const batchSize = currentBatch?.$allTxns.length;

    const allTxns = currentBatch?.$allTxns || [];
    const hasError = allTxns.some((t) => t.$state === "failed");
    const allFinished =
        allTxns.length > 0 &&
        allTxns.every(
            (t) => t.$state === "confirmed" || t.$state === "not needed"
        );
    const canClose = hasError || allFinished;

    const viewSwitcher = (
        <div className="flex flex-row justify-between p-2">
            <div>
                <h3 className="bg-transparent mt-0 mb-2">Pending Txns</h3>
                {batchSize && batchSize > 1 && <>{batchSize} txns in batch</>}
            </div>
            <div>
                {canClose && (
                    <Button
                        variant="secondary-sm"
                        className="ml-3 bg-emerald-900 border-emerald-500/50 text-emerald-100 hover:bg-emerald-800"
                        onClick={() => {
                            capo?.setup?.txBatcher?.rotate();
                        }}
                    >
                        Close Batch
                    </Button>
                )}
                <Button
                    variant="secondary-sm"
                    className="ml-3 cursor-pointer"
                    onClick={() => {
                        setAdvancedView(!advancedView);
                    }}
                    aria-label="toggle detail view of transaction batch"
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

    const width = advancedView ? "w-[80vw]" : "w-[3in]";
    if (!hasBatch) return null;
    return (
        <div
            className={`bg-background/66 right-4 ${width} flex flex-col rounded-lg border border-white/10 backdrop-blur-md`}
        >
            {viewSwitcher}
            <TxBatchViewer
                batch={currentBatch}
                {...{ initialId, advancedView }}
            />
        </div>
    );
}
