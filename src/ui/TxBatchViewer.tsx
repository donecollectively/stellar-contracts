import type {
    ResolveablePromise,
    TxDescription,
    TxSubmissionTracker,
    StellarTxnContext,
} from "@donecollectively/stellar-contracts";
import {
    BatchSubmitController,
} from "@donecollectively/stellar-contracts";
import type { Tx } from "@helios-lang/ledger";
import { decodeTx } from "@helios-lang/ledger";
import { TxDetailPanel } from "./TxDetailPanel.js";
import * as React from "react";
import {
    ActionButton,
    Lowlight,
    Softlight,
    DashboardRow,
    DashboardHighlights,
    DashHighlightItem,
} from "./DashboardTemplate.js";
import { Button } from "./Button.js";

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
export function TxBatchViewer({
    batch,
    initialId,
    advancedView,
}: {
    batch: BatchSubmitController;
    initialId?: string;
    advancedView: boolean;
}) {
    const [selectedId, setSelectedId] = React.useState<string | undefined>(
        initialId
    );
    const [selectedTx, setSelectedTx] = React.useState<Tx | undefined>();
    const [txTracker, setTxTracker] = React.useState<TxSubmissionTracker | undefined>(
        initialId ? batch.$txInfo(initialId) : undefined
    );
    const [gen, setGen] = React.useState(0);

    const renderNow = React.useMemo(() => () => setGen((g) => g + 1), []);

    const batchSize = batch.$allTxns.length;
    React.useEffect(() => {
        if (!selectedId) return;
        const txTracker = batch.$txInfo(selectedId);
        if (!txTracker) {
            debugger
            return;
        }
        setTxTracker(txTracker);
    }, [selectedId, batch, batchSize]);

    React.useEffect(() => {
        if (!txTracker?.txd.tx) return;
        const tx = txTracker.txd.tx;
        if (typeof tx === "string") {
            setSelectedTx(decodeTx(tx));
        } else {
            setSelectedTx(tx);
        }
    }, [txTracker, selectedId, gen]);

    React.useEffect(() => {
        batch.$txChanges.on("txAdded", renderNow);
        batch.$txChanges.on("statusUpdate", renderNow);
        return () => {
            batch.$txChanges.off("txAdded", renderNow);
            batch.$txChanges.off("statusUpdate", renderNow);
        };
    }, [batch]);

    console.error("rendering TxBatchViewer", {
        selectedId,
        batch,
        initialId,
        renderNow, 
        advancedView, 
        txTracker, 
        selectedTx,
        batchSize,
        gen        
    });
    const width = advancedView ? "w-9/12" : "";

    return (
        <>
            {/* {selectedId && <div>selectedId: {selectedId}</div>} */}
            <div className="border-1 border-(--color-card) flex w-full flex-row gap-2 rounded-md drop-shadow-md">
                <ShowTxList
                    batch={batch}
                    initialId={initialId}
                    renderNow={renderNow}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    advancedView={advancedView}
                />
                {(() => {
                    const indicateSelectedTx = selectedId
                        ? "border-s-4 border-s-accent/20"
                        : "";

                    const cardStyle =
                        "bg-card text-card-foreground";

                    if (!selectedId) {
                        return (
                            <div
                                className={`${indicateSelectedTx} ${cardStyle} ${width} rounded-md border border-white/10 p-2`}
                            >
                                <Softlight>
                                    Select a transaction to view details
                                </Softlight>
                            </div>
                        );
                    }

                    if (!txTracker) {
                        return (
                            <div
                                className={`${indicateSelectedTx} ${cardStyle} ${width} rounded-md border border-white/10 p-2`}
                            >
                                <Softlight>
                                    Loading transaction details...
                                </Softlight>
                            </div>
                        );
                    }

                    return (
                        <div
                            className={`${indicateSelectedTx} z-3 ${cardStyle} ${width} flex flex-col rounded-md border border-white/10 p-2`}
                        >
                            <ShowTxDescription
                                txTracker={txTracker}
                                tx={selectedTx}
                                advancedView={advancedView}
                            />
                        </div>
                    );
                })()}
            </div>
        </>
    );
}

function ShowTxList({
    batch,
    initialId,
    renderNow,
    selectedId,
    setSelectedId,
    advancedView,
}: {
    batch: BatchSubmitController;
    initialId?: string;
    renderNow: () => void;
    selectedId: string | undefined;
    setSelectedId: (id: string | undefined) => void;
    advancedView: boolean;
}) {
    const { $allTxns } = batch;
    const byId = {} as Record<string, TxDescription<any, any>>;

    const width = advancedView ? "w-3/12" : "w-9/12";

    return (
        <div className={`z-4 flex ${width} flex-grow flex-col gap-0`}>
            {batch.$allTxns.map((txTracker) => {
                return (
                    <ShowSingleTx
                        key={txTracker.txd.id}
                        {...{
                            txTracker,
                            selectedId,
                            setSelectedId,
                            advancedView,
                        }}
                    />
                );
            })}
        </div>
    );
}

const ShowSingleTx = (props: {
    txTracker: TxSubmissionTracker;
    selectedId?: string;
    setSelectedId: (id: string | undefined) => void;
    advancedView: boolean;
}) => {
    const { txTracker, selectedId, setSelectedId, advancedView } = props;
    const { $state, txSubmitters, txd } = txTracker;
    let {
        id,
        txName,
        description,
        tcx,
        tx,
        moreInfo,
        depth = 0,
        parentId,
    } = txd;
    if (!txName) {
        txName = description;
        description = "";
    }
    const submitterStates = Object.values(txSubmitters)
        .map((s) => s.$$statusSummary)
        .join(", ");

    const isCurrent = id == selectedId;
    const countNested = txd.tcx?.addlTxns
        ? Object.keys(txd.tcx.addlTxns).length
        : 0;

    // Calculate depth for indentation
    const XindentClass = ["pl-0", "pl-2", "pl-4", "pl-6", "pl-8", "pl-10"][
        depth
    ];

    const indentClass = [
        "border-s-0",
        "border-s-6",
        "border-s-12",
        "border-s-18",
        "border-s-24",
    ][depth];

    const innerMarginClass = ["ml-0", "ml-1", "ml-3", "ml-5", "ml-7", "ml-9"][
        depth
    ];
    const outerMarginClass = depth ? "ml-2" : "ml-0";

    // Visual indicator for nested transactions
    const nestedIndicator = depth
        ? `${indentClass} border-accent/30`
        : "";

    // <Softlight>{submitterStates}</Softlight>
    // {countNested > 0 && (
    //     <Lowlight>
    //         {countNested} nested txns
    //     </Lowlight>
    // )}
    const indicateSelectedTx = isCurrent
        ? "text-bold rounded-md border-e-0 -mr-5 pe-6 z-3"
        : "cursor-pointer opacity-55";

    return (
        <div
            key={id}
            onClick={isCurrent ? undefined : () => setSelectedId(id)}
            className={`${outerMarginClass}`}
        >
            <div className={`${nestedIndicator} pl-2`}>
                <div
                    key={id}
                    title={txd.txName || txd.description}
                    // button={isCurrent ? undefined : "Select"}
                    className={`${innerMarginClass} bg-(--color-card) text-(--color-card-foreground) flex min-h-[0.66in] flex-row rounded-md border border-white/10 p-2 text-sm ${indicateSelectedTx}`}
                >
                    <div className={`w-8/12`}>
                        {txName ? (
                            <>
                                <b>{txName}</b>
                                <br />
                                <div className="ml-2 opacity-50">
                                    {description}
                                </div>
                                {/* <div className="ml-2 opacity-50">
                                    {submitterStates}
                                </div> */}
                            </>
                        ) : (
                            description
                        )}
                    </div>

                    <div className={`w-1/12 text-right`}>
                        {$state == "building" && (
                            <>
                                <svg
                                    aria-hidden="true"
                                    className="h-5 w-5 animate-spin fill-blue-600 text-gray-200 dark:text-gray-600"
                                    viewBox="0 0 100 101"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                        fill="currentFill"
                                    />
                                </svg>
                                <span className="sr-only">Loading...</span>
                            </>
                        )}
                    </div>
                    <div className={`w-3/12 text-right`}>
                        {$state}
                        <br />
                        {!!countNested ? <>+{countNested} nested</> : ""}
                    </div>
                </div>
            </div>
        </div>
    );
};

// REQT/y8rnvqmgza (TxDetailPanel Component) — thin wrapper adding batch-specific Sign & Submit button
function ShowTxDescription({
    txTracker,
    tx,
    advancedView,
}: {
    txTracker: TxSubmissionTracker;
    tx?: Tx;
    advancedView: boolean;
}) {
    const { $state, txd } = txTracker;
    const { tcx } = txd;
    const debugSubmitButton = false;

    return (
        <div className="flex flex-col gap-2">
            {/* Sign & Submit button — batch-specific, not in shared TxDetailPanel */}
            <div className="basis-1/9">
                {tx && txTracker && tcx && !tcx.isFacade && $state != "confirmed" && (
                    <ActionButton
                        className="mt-2 self-start"
                        onClick={() => txTracker.$signAndSubmit?.()}
                    >
                        Sign&nbsp;&amp;&nbsp;Submit
                    </ActionButton>
                ) || (debugSubmitButton && <div className="text-xs">
                    {!!tx && <div>✅ tx ok</div> || <div>❌  no tx</div>}
                    {!!txTracker && <div>✅ txTracker ok</div> || <div>❌ no txTracker</div>}
                    {!!tcx && <div>✅ tcx ok</div> || <div>❌ no tcx</div>}
                    {!tcx?.isFacade && <div>✅ not a facade</div> || <div>❌ is a facade</div>}
                    {$state != "confirmed" && <div>✅ state '{$state}' not confirmed</div> || <div>❌ confirmed</div>}
                </div>)}
            </div>

            <TxDetailPanel
                txTracker={txTracker}
                tx={tx}
                advancedView={advancedView}
            />

            {/* Nested Transactions section — batch-specific */}
            {advancedView &&
                txd.tcx?.addlTxns &&
                Object.keys(txd.tcx.addlTxns).length > 0 && (
                    <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
                        <Softlight>Nested Transactions:</Softlight>
                        {Object.entries(txd.tcx.addlTxns).map(
                            ([key, tx]) => (
                                <div
                                    key={key}
                                    className="flex flex-row justify-between"
                                >
                                    <Lowlight>{key}</Lowlight>
                                    <Lowlight>{tx.id}</Lowlight>
                                </div>
                            )
                        )}
                    </div>
                )}
        </div>
    );
}
