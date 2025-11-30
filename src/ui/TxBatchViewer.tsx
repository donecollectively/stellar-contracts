import type {
    ResolveablePromise,
    TxDescription,
    TxSubmissionTracker,
    StellarTxnContext,
} from "@donecollectively/stellar-contracts";
import {
    BatchSubmitController,
    dumpAny,
} from "@donecollectively/stellar-contracts";
import type { Tx } from "@helios-lang/ledger";
import { decodeTx } from "@helios-lang/ledger";
import * as React from "react";
import {
    ActionButton,
    Highlight,
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
        batch.$txStates[initialId]
    );
    const [gen, setGen] = React.useState(0);

    const renderNow = React.useMemo(() => () => setGen((g) => g + 1), []);

    const batchSize = batch.$allTxns.length;
    React.useEffect(() => {
        if (!selectedId) return;
        const txTracker = batch.$txStates[selectedId];
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
    }, [txTracker]);

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
            {selectedId && <div>selectedId: {selectedId}</div>}
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

function ShowTxDescription({
    txTracker,
    tx,
    advancedView,
}: {
    txTracker: TxSubmissionTracker;
    tx?: Tx;
    advancedView: boolean;
}) {
    const { $state, txSubmitters, id, txd } = txTracker;
    const { tcx, txCborHex, signedTxCborHex } = txd;

    // Add tab state management
    const availableTabs = {
        transcript: true,
        structure: true,
        diagnostics: true,
    };
    const [tab, setTab] =
        React.useState<keyof typeof availableTabs>("transcript");

    // Add state for signed transaction
    const [signedTx, setSignedTx] = React.useState<Tx | undefined>();

    // Decode signed transaction when available
    React.useEffect(() => {
        if (!signedTxCborHex) return;

        try {
            const decodedTx = decodeTx(signedTxCborHex);
            setSignedTx(decodedTx);
        } catch (e) {
            console.error("Failed to decode signed transaction:", e);
        }
    }, [signedTxCborHex]);

    return (
        <div className="flex flex-col gap-2 ">
            <div className="flex flex-col justify-between">
                {/* Sign & Submit button */}
                <div className="basis-1/9">
                    {tx && txTracker && tcx && !tcx.isFacade && $state != "confirmed" && (
                        <ActionButton
                            className="mt-2 self-start"
                            onClick={() => txTracker.$signAndSubmit?.()}
                        >
                            Sign&nbsp;&amp;&nbsp;Submit
                        </ActionButton>
                    )}
                    {!!tx && <div>tx ok</div> || <div>no tx</div>}
                    {!!txTracker && <div>txTracker ok</div> || <div>no txTracker</div>}
                    {!!tcx && <div>tcx ok</div> || <div>no tcx</div>}
                    {!tcx?.isFacade && <div>not a facade</div> || <div>is a facade</div>}
                    {$state != "confirmed" && <div>state '{$state}'' not confirmed</div> || <div>confirmed</div>}
                </div>
                {advancedView && (
                    <>
                        <div className="ml-4 flex-grow self-start">
                            <Highlight className="text-xl">
                                {txd.txName || txd.description}
                            </Highlight>
                            {txd.txName && txd.description && (
                                <div className="text-md display-inline ml-4 opacity-50">
                                    {txd.description}
                                </div>
                            )}
                            {txd.moreInfo && (
                                <div className="text-brand-orange/66 ml-8 text-sm italic">
                                    {txd.moreInfo}
                                </div>
                            )}
                        </div>
                    </>
                )}
                {advancedView && (
                    <div id="tab-selector" className="mt-1 z-10 -mb-1">
                        {Object.keys(availableTabs).map((key) => {
                            const isSelected = key === tab;
                            const selectedTabClass = isSelected
                                ? "mt-0 pt-0 pb-1 rounded-t-md bg-card border-x-1 border-t-3 border-border/80"
                                : "-mt-1 pt-1 pb-0 border-1 rounded-t-md bg-secondary/20 border-border/40";
                            return (
                                <button
                                    key={key}
                                    className={`${selectedTabClass} ml-1 px-2 text-sm text-card-foreground border-b-0 rounded-b-none`}
                                    onClick={() =>
                                        setTab(
                                            key as keyof typeof availableTabs
                                        )
                                    }
                                >
                                    {key}
                                </button>
                            );
                        })}
                        <Lowlight className="float-right">{$state}</Lowlight>
                    </div>
                )}

                {/* Tab content */}
                {advancedView && (
                    <div className="z-9 bg-card border-t border-white/20 pt-1">
                        {/* Transcript tab */}
                        {tab === "transcript" && (
                            <>
                                <div className="flex flex-col gap-1">
                                    {Object.entries(txSubmitters).map(
                                        ([key, submitter]) => (
                                            <div
                                                key={key}
                                                className="flex flex-row justify-between rounded-md border border-white/10 p-2"
                                            >
                                                <div className="w-1/3">
                                                    <h4 className="text-sm font-semibold">
                                                        {key}
                                                    </h4>
                                                </div>
                                                <div className="w-2/3">
                                                    <Lowlight>{`${submitter.$$statusSummary.status} - ${submitter.$$statusSummary.currentActivity}`}</Lowlight>
                                                    <div className="text-xs">
                                                        <pre>
                                                            {JSON.stringify(
                                                                submitter.$$statusSummary,
                                                                null,
                                                                2
                                                            )}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>

                                {tcx?.logger?.formattedHistory && (
                                    <code>
                                        <pre className="mt-4 max-h-[90vh] overflow-auto bg-neutral-200 text-xs text-black">
                                            {tcx.logger.formattedHistory?.map(
                                                (line1) =>
                                                    line1
                                                        ?.split("\n")
                                                        .map((line2) => {
                                                            let prefix:
                                                                | React.ReactNode
                                                                | string = (
                                                                    <></>
                                                                ),
                                                                rest:
                                                                    | React.ReactNode
                                                                    | string = (
                                                                        <></>
                                                                    );
                                                            /*.replaceAll("", "<span className=font-formal")*/
                                                            [prefix, rest] =
                                                                line2.split(
                                                                    "❗",
                                                                    2
                                                                );
                                                            if (rest) {
                                                                let size = "";
                                                                if (
                                                                    (
                                                                        rest as string
                                                                    ).match(
                                                                        /^\s+\.\.\./
                                                                    )
                                                                ) {
                                                                    rest = (
                                                                        rest as string
                                                                    ).replace(
                                                                        /^\s+\.\.\.\s+/,
                                                                        "…"
                                                                    );
                                                                    size =
                                                                        "text-[1.35em] -ml-2";
                                                                }
                                                                rest = (
                                                                    <span
                                                                        className={`text-[1.6em] font-formal -ml-5 font-bold`}
                                                                    >
                                                                        ❗
                                                                        <span
                                                                            className={`${size}`}
                                                                        >
                                                                            {
                                                                                rest
                                                                            }
                                                                        </span>
                                                                    </span>
                                                                );
                                                            } else {
                                                                prefix = (
                                                                    <span className="text-gray-600">
                                                                        {prefix}
                                                                    </span>
                                                                );
                                                            }
                                                            return (
                                                                <>
                                                                    {prefix}{" "}
                                                                    {rest}
                                                                    <br />{" "}
                                                                </>
                                                            );
                                                        })
                                            )}
                                        </pre>
                                    </code>
                                )}
                            </>
                        )}

                        {/* Structure tab */}
                        {tab === "structure" && tx && (
                            <>
                                <h4 className="text-sm">
                                    Unsigned Tx:{" "}
                                    {tx.id?.()?.toString?.() || "Unknown ID"}
                                </h4>

                                <code className="text-sm">
                                    <pre className="font-formal text-[1.30em]/4.5 tracking-wide max-h-[80vh] overflow-auto">
                                        {dumpAny(
                                            tx,
                                            txTracker.setup.networkParams
                                        )}
                                    </pre>
                                    {txCborHex && (
                                        <div className="mt-2 text-xs">
                                            CBOR Hex:{" "}
                                            <span className="break-all">
                                                {txCborHex}
                                            </span>
                                        </div>
                                    )}
                                </code>
                            </>
                        )}

                        {/* Diagnostics tab */}
                        {tab === "diagnostics" && (
                            <>
                                {signedTx ? (
                                    <>
                                        <h3>Signed Tx</h3>
                                        <h4>
                                            {signedTx.id?.()?.toString?.() ||
                                                "Unknown ID"}
                                        </h4>

                                        <code className="text-xs">
                                            <pre className="max-h-64 overflow-auto">
                                                {dumpAny(
                                                    signedTx,
                                                    txTracker.setup
                                                        .networkParams
                                                )}
                                            </pre>
                                            {signedTxCborHex ? (
                                                <div className="mt-2">
                                                    CBOR Hex:{" "}
                                                    <span className="break-all">
                                                        {signedTxCborHex.length /
                                                            2}{" "}
                                                        bytes: <br />
                                                        {signedTxCborHex}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div>‹not yet signed›</div>
                                            )}
                                        </code>
                                    </>
                                ) : (
                                    <div>Not yet signed</div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Nested Transactions section (shown in all tabs) */}
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
        </div>
    );
}
