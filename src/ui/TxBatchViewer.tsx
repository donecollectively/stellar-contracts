import type {
    ResolveablePromise,
    TxDescription,
    TxSubmissionTracker,
    StellarTxnContext,
} from "@donecollectively/stellar-contracts"
import {
    BatchSubmitController,
    dumpAny,
} from "@donecollectively/stellar-contracts"
import type { Tx } from "@helios-lang/ledger"
import { decodeTx } from "@helios-lang/ledger"
import * as React from "react"
import {
    ActionButton,
    Highlight,
    Lowlight,
    Softlight,
    DashboardRow,
    DashboardHighlights,
    DashHighlightItem,
} from "./DashboardTemplate.js"

// Shows a master/detail view of the tx batch
// includes a list of txns on the left
// shows the details of the selected txn on the right
// shows a summary of the batch status at the top

export function TxBatchViewer({
    batch,
    initialId,
}: {
    batch: BatchSubmitController
    initialId?: string
}) {
    const [selectedId, setSelectedId] = React.useState<string | undefined>(
        initialId
    )
    const [selectedTx, setSelectedTx] = React.useState<Tx | undefined>()
    const [txMgr, setTxMgr] = React.useState<TxSubmissionTracker | undefined>()
    const [gen, setGen] = React.useState(0)

    const renderNow = React.useMemo(() => () => setGen((g) => g + 1), [])

    React.useEffect(() => {
        if (!selectedId) return
        const tx = batch.$txStates[selectedId]
        if (!tx) return
        setTxMgr(tx)
    }, [selectedId, batch])

    React.useEffect(() => {
        if (!txMgr?.txd.tx) return
        const tx = txMgr.txd.tx
        if (typeof tx === "string") {
            setSelectedTx(decodeTx(tx))
        } else {
            setSelectedTx(tx)
        }
    }, [txMgr])

    React.useEffect(() => {
        batch.$txChanges.on("txAdded", renderNow)
        batch.$txChanges.on("statusUpdate", renderNow)
        return () => {
            batch.$txChanges.off("txAdded", renderNow)
            batch.$txChanges.off("statusUpdate", renderNow)
        }
    }, [batch, renderNow])

    return (
        <div className="border-1 border-(--color-card) flex w-full flex-row gap-2 rounded-md drop-shadow-md">
            <ShowTxList
                batch={batch}
                initialId={initialId}
                renderNow={renderNow}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
            />
            {(() => {
                const indicateSelectedTx = selectedId
                    ? "border-s-4 border-s-brand-orange/20"
                    : ""

                const cardStyle =
                    "bg-(--color-card) text-(--color-card-foreground)"

                if (!selectedId) {
                    return (
                        <div
                            className={`${indicateSelectedTx} ${cardStyle} w-9/12 rounded-md border border-white/10 p-2`}
                        >
                            <Softlight>
                                Select a transaction to view details
                            </Softlight>
                        </div>
                    )
                }

                if (!txMgr) {
                    return (
                        <div
                            className={`${indicateSelectedTx} ${cardStyle} w-9/12 rounded-md border border-white/10 p-2`}
                        >
                            <Softlight>
                                Loading transaction details...
                            </Softlight>
                        </div>
                    )
                }

                return (
                    <div
                        className={`${indicateSelectedTx} z-3 ${cardStyle} w-9/12 rounded-md border border-white/10 p-2`}
                    >
                        <ShowTxDescription txTracker={txMgr} tx={selectedTx} />
                    </div>
                )
            })()}
        </div>
    )
}

function ShowTxList({
    batch,
    initialId,
    renderNow,
    selectedId,
    setSelectedId,
}: {
    batch: BatchSubmitController
    initialId?: string
    renderNow: () => void
    selectedId: string | undefined
    setSelectedId: (id: string | undefined) => void
}) {
    const { $allTxns } = batch
    const byId = {} as Record<string, TxDescription<any, any>>

    return (
        <div className="z-4 flex w-3/12 flex-col gap-0">
            {batch.$allTxns.map((txTracker) => {
                return (
                    <ShowSingleTx
                        key={txTracker.txd.id}
                        {...{ txTracker, selectedId, setSelectedId }}
                    />
                )
            })}
        </div>
    )
}

const ShowSingleTx = (props: {
    txTracker: TxSubmissionTracker
    selectedId?: string
    setSelectedId: (id: string | undefined) => void
}) => {
    const { txTracker, selectedId, setSelectedId } = props
    const { $state, txSubmitters, txd } = txTracker
    let {
        id,
        txName,
        description,
        tcx,
        tx,
        moreInfo,
        depth = 0,
        parentId,
    } = txd
    if (!txName) {
        txName = description
        description = ""
    }
    const submitterStates = Object.values(txSubmitters)
        .map((s) => s.$$statusSummary)
        .join(", ")

    const isCurrent = id == selectedId
    const countNested = txd.tcx?.addlTxns
        ? Object.keys(txd.tcx.addlTxns).length
        : 0

    // Calculate depth for indentation
    const XindentClass = ["pl-0", "pl-2", "pl-4", "pl-6", "pl-8", "pl-10"][
        depth
    ]

    const indentClass = [
        "border-s-0",
        "border-s-6",
        "border-s-12",
        "border-s-18",
        "border-s-24",
    ][depth]

    const innerMarginClass = ["ml-0", "ml-1", "ml-3", "ml-5", "ml-7", "ml-9"][
        depth
    ]
    const outerMarginClass = depth ? "ml-2" : "ml-0"

    // Visual indicator for nested transactions
    const nestedIndicator = depth
        ? `${indentClass} border-(--color-accent-foreground)/30`
        : ""

    // <Softlight>{submitterStates}</Softlight>
    // {countNested > 0 && (
    //     <Lowlight>
    //         {countNested} nested txns
    //     </Lowlight>
    // )}
    const indicateSelectedTx = isCurrent
        ? "text-bold rounded-md border-e-0 -mr-5 pe-6 z-3"
        : "cursor-pointer opacity-55"

    return (
        <div
            key={id}
            onClick={isCurrent ? undefined : () => setSelectedId(id)}
            className={`${outerMarginClass}`}
            // className={`${indentClass}`}
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
                                <div className="ml-2 opacity-50">
                                    {submitterStates}
                                </div>
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
    )
}

function ShowTxDescription({
    txTracker,
    tx,
}: {
    txTracker: TxSubmissionTracker
    tx?: Tx
}) {
    const { $state, txSubmitters, id, txd } = txTracker
    const { tcx, txCborHex, signedTxCborHex } = txd

    // Add tab state management
    const availableTabs = {
        transcript: true,
        structure: true,
        diagnostics: true,
    }
    const [tab, setTab] =
        React.useState<keyof typeof availableTabs>("transcript")

    // Add state for signed transaction
    const [signedTx, setSignedTx] = React.useState<Tx | undefined>()

    // Decode signed transaction when available
    React.useEffect(() => {
        if (!signedTxCborHex) return

        try {
            const decodedTx = decodeTx(signedTxCborHex)
            setSignedTx(decodedTx)
        } catch (e) {
            console.error("Failed to decode signed transaction:", e)
        }
    }, [signedTxCborHex])

    return (
        <div className="flex flex-col gap-2 ">
            <div className="flex flex-row justify-between">
                {/* Sign & Submit button */}
                <div className="basis-1/9">
                    {tx && txTracker && tcx && !tcx.isFacade && (
                        <ActionButton
                            className="mt-2 self-start"
                            onClick={() => txTracker.$signAndSubmit?.()}
                        >
                            Sign &amp; Submit
                        </ActionButton>
                    )}
                </div>
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
                <div>
                    <Lowlight className="float-right">{$state}</Lowlight>
                    <br />
                    <div id="tab-selector">
                        {Object.keys(availableTabs).map((key) => {
                            const isSelected = key === tab
                            const selectedTabClass = isSelected
                                ? "rounded-t-md bg-(--color-card) text-(--color-card-foreground) border-x-1 border-t-3 border-(--color-border)/50"
                                : " rounded-t-md bg-(--color-secondary)/70 text-(--color-secondary-foreground)"
                            return (
                                <button
                                    key={key}
                                    className={`${selectedTabClass} ml-1 px-2 py-1 text-sm`}
                                    onClick={() =>
                                        setTab(
                                            key as keyof typeof availableTabs
                                        )
                                    }
                                >
                                    {key}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Tab content */}
            <div className="-mt-2 border-t border-white/10 pt-1">
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
                                    {tcx.logger.formattedHistory}
                                </pre>
                            </code>
                        )}
                    </>
                )}

                {/* Structure tab */}
                {tab === "structure" && tx && (
                    <>
                        <h3>Unsigned Tx</h3>
                        <h4>{tx.id?.()?.toString?.() || "Unknown ID"}</h4>

                        <code className="text-xs">
                            <pre className="max-h-64 overflow-auto">
                                {dumpAny(tx)}
                            </pre>
                            {txCborHex && (
                                <div className="mt-2">
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
                                        {dumpAny(signedTx)}
                                    </pre>
                                    {signedTxCborHex ? (
                                        <div className="mt-2">
                                            CBOR Hex:{" "}
                                            <span className="break-all">
                                                {signedTxCborHex.length / 2}{" "}
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

            {/* Nested Transactions section (shown in all tabs) */}
            {txd.tcx?.addlTxns && Object.keys(txd.tcx.addlTxns).length > 0 && (
                <div className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-4">
                    <Softlight>Nested Transactions:</Softlight>
                    {Object.entries(txd.tcx.addlTxns).map(([key, tx]) => (
                        <div
                            key={key}
                            className="flex flex-row justify-between"
                        >
                            <Lowlight>{key}</Lowlight>
                            <Lowlight>{tx.id}</Lowlight>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
