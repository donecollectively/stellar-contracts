import { BatchSubmitController } from "@donecollectively/stellar-contracts";
import React, { useCallback, useEffect } from "react";

import { TxBatchViewer } from "./TxBatchViewer.js";
import { Button } from "./Button.js";
import { useCapoDappProvider } from "./CapoDappProviderContext.js";
import type { SubmissionsStates } from "../networkClients/TxSubmissionTracker.js";

export function TxBatchUI() {
    const provider = useCapoDappProvider();
    const capo = provider?.capo;

    const [currentBatch, setTxBatch] = React.useState<BatchSubmitController>();
    const [initialId, setInitialId] = React.useState<string | undefined>(
        undefined
    );

    const [advancedView, setAdvancedView] = React.useState(false);

    const allTxns = currentBatch?.$allTxns || [];
    const hasError = allTxns.some((t) => t.$state === "failed");
    const allFinished =
        allTxns.length > 0 &&
        allTxns.every(
            (t) => t.$state === "confirmed" || t.$state === "not needed"
        );
    const canClose = hasError || allFinished;

    const status = currentBatch?.$stateShortSummary;
    const label = (status === "confirmed" ? "Confirmed" : status === "failed" ? "Failed" : "Pending");

    const pendingStates: SubmissionsStates[] = [
        "registered", "building", "nested batch", "built", "failed"
    ];
    const noOpStates: SubmissionsStates[] = ["not needed", "nested batch"]
    const unsubmittedTxns = allTxns.filter((t) => {
        console.log("unsubmittedTxn? ", t.$state, pendingStates.includes(t.$state));
        debugger
        return pendingStates.includes(t.$state);
    }).length;

    const committingTxns = allTxns.filter((t) => {
        if (noOpStates.includes(t.$state)) return false;
        if (pendingStates.includes(t.$state)) return false;
        return true;
    }).length;
    const submittingStates: SubmissionsStates[] = [
        "submitting", "confirming"
    ];
    const confirmedStates: SubmissionsStates[] = [
        "confirmed", "mostly confirmed"
    ];
    const submittingTxns = allTxns.filter((t) => {
        return submittingStates.includes(t.$state);
    }).length;
    const confirmedTxns = allTxns.filter((t) => {
        return confirmedStates.includes(t.$state);
    }).length;
    const actualTxCount = unsubmittedTxns + committingTxns;
    const hasMultipleTxns = actualTxCount && actualTxCount > 1;
    const hasInFlightTxns = submittingTxns > 0 || confirmedTxns > 0;
    const submittingLabel = submittingTxns > 0 ? `${submittingTxns} submitting` : "";
    const confirmedLabel = confirmedTxns > 0 ? `${confirmedTxns} confirmed` : "";
    const inFlightLabel = [submittingLabel, confirmedLabel].filter(Boolean).join(", ");
    const cancelLabel = unsubmittedTxns > 0 ? `Cancel ${unsubmittedTxns} unsubmitted txns` : "";
    const cantCancelLabel = `${submittingTxns + confirmedTxns} in-flight txns will not be cancelled`;

    const [needsCancelConfirmation, setNeedsCancelConfirmation] = React.useState(false);
    const [confirmPartialCancel, setConfirmPartialCancel] = React.useState(false);
    useEffect(() => {
        setNeedsCancelConfirmation(!!submittingTxns);
    }, [submittingTxns > 0]);

    const cancelWIthPossibleConfirmation = useCallback(() => {
        if (needsCancelConfirmation && !confirmPartialCancel) {
            // sets the "did-confirm" state
            return setConfirmPartialCancel(true);
        }
        capo?.setup?.txBatcher?.cancel();
        const nonCancelledTxns = hasInFlightTxns ? `; ${unsubmittedTxns + submittingTxns} in-flight txn${unsubmittedTxns + submittingTxns == 1 ? "" : "s"} not cancelled`: "";
        provider?.provider.updateStatus(`cancelled ${unsubmittedTxns} unsubmitted txn${submittingTxns == 1 ? "" : "s"}${nonCancelledTxns}`, {
            developerGuidance: "show status message to user",
        }, "// confirm cancel / partial-cancel")
    }, [provider, provider?.capo, currentBatch, unsubmittedTxns, submittingTxns, hasInFlightTxns, needsCancelConfirmation, confirmPartialCancel]);

    const closeWIthPossibleConfirmation = useCallback(() => {
        if (needsCancelConfirmation && !confirmPartialCancel) {
            // sets the "did-confirm" state
            return setConfirmPartialCancel(true);
        }
        return capo?.setup?.txBatcher?.rotate();
    }, [provider, provider?.capo, needsCancelConfirmation, confirmPartialCancel]);

    const viewSwitcher = (<>
        {needsCancelConfirmation && <div className="p-2 text-center text-sm border border-accent/20 bg-primary text-accent">{cantCancelLabel}</div>}

        <div className="flex flex-row justify-between items-end p-2">
            <div className="flex-grow">
                <h4 className="bg-transparent mt-0 mb-0 font-bold">{hasMultipleTxns ? `${actualTxCount} Txns` : `${label} Txn`}
                    {hasInFlightTxns && <h6 className="text-xs text-gray-500">{inFlightLabel}</h6>}
                </h4>
            </div>
            <div className="flex-shrink-0">
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
                <div className="flex-shrink-0">
                {canClose ? (
                    <Button
                        variant="secondary-sm"
                        className="ml-3 text-emerald-100 hover:bg-red-900"
                        onClick={closeWIthPossibleConfirmation}
                    >❌</Button>
                ) : (
                    <div className="group flex flex-col items-end text-amber-400 overflow-visible">
                        <div className="hidden group-hover:block w-0 h-7 relative">
                            <span
                                data-label="cancel-help-text"
                                className="absolute right-0 top-0 text-xs whitespace-nowrap"
                                aria-hidden="true">
                                {needsCancelConfirmation ? "ONLY ": ""}<span className="font-bold italic">
                                    {unsubmittedTxns} {needsCancelConfirmation ? "UNSUBMITTED" : ""} txn{submittingTxns > 1 ? "s" : ""} will be cancelled
                                </span> 
                            </span>
                        </div>
                        <button
                            aria-label={`Cancel ${unsubmittedTxns} unsubmitted txns`}
                            className="ml-3 p-1 aspect-square group-hover:bg-red-900 border-1 rounded-none border-gray-500"
                            onClick={cancelWIthPossibleConfirmation}
                        >❌</button>
                    </div>
                )}
            </div>
        </div>
    </>
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
        [provider, provider?.capo, capo?.setup.txBatcher]
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
