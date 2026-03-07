/**
 * Shared transaction detail panel for both live and persisted data sources.
 *
 * Used by:
 * - TxBatchViewer (live TxSubmissionTracker during active submission)
 * - PendingTxTracker (persisted PendingTxEntry after page reload)
 *
 * REQT/y8rnvqmgza (TxDetailPanel Component)
 * @public
 */
import type {
    TxSubmissionTracker,
    StellarTxnContext,
} from "@donecollectively/stellar-contracts";
import { dumpAny } from "@donecollectively/stellar-contracts";
import type { Tx } from "@helios-lang/ledger";
import { decodeTx } from "@helios-lang/ledger";
import type {
    PendingTxEntry,
    SubmissionLogEntry,
} from "../networkClients/UtxoIndex/types/PendingTxEntry.js";
import * as React from "react";
import {
    Highlight,
    Lowlight,
    Softlight,
} from "./DashboardTemplate.js";

// REQT/y8rnvqmgza (TxDetailPanel Component) — dual data source props
export interface TxDetailPanelProps {
    /** Live tracker (available during active session) */
    txTracker?: TxSubmissionTracker;
    /** Unsigned tx object (available during active session) */
    tx?: Tx;
    /** Persisted entry (available after reload from Dexie) */
    entry?: PendingTxEntry;
    /** Show full tabbed view (true) or compact summary (false) */
    advancedView: boolean;
    /** Called when user requests closing the panel */
    onClose?: () => void;
}

type TabKey = "transcript" | "structure" | "diagnostics" | "submissionLog";

/**
 * Renders transaction detail with tabs: transcript, structure, diagnostics, submission log.
 *
 * Data resolution priority:
 * - Live tracker data preferred when available (fresher)
 * - Falls back to persisted PendingTxEntry fields after reload
 *
 * REQT/y8rnvqmgza (TxDetailPanel Component)
 */
export function TxDetailPanel({
    txTracker,
    tx,
    entry,
    advancedView,
    onClose,
}: TxDetailPanelProps) {
    // Resolve data from live tracker or persisted entry
    const description = txTracker?.txd?.description ?? entry?.description ?? "";
    const txName = txTracker?.txd?.txName ?? entry?.txName;
    const moreInfo = txTracker?.txd?.moreInfo;
    const state = txTracker?.$state ?? entry?.status ?? "unknown";
    const txSubmitters = txTracker?.txSubmitters;
    const tcx = txTracker?.txd?.tcx;
    const txCborHex = txTracker?.txd?.txCborHex ?? entry?.txCborHex;
    const signedTxCborHex = txTracker?.txd?.signedTxCborHex ?? entry?.signedTxCborHex;

    // REQT/46ttdvnkmp (Capture Build Transcript) — live transcript preferred, persisted fallback
    const transcript: string[] | undefined =
        tcx?.logger?.formattedHistory ?? entry?.buildTranscript;

    // REQT/vdkanffv9e (Diagnostic Fields) — live structure preferred, persisted fallback
    const txStructure: string | undefined =
        (tx && txTracker?.setup?.networkParams)
            ? dumpAny(tx, txTracker.setup.networkParams)
            : entry?.txStructure;

    // REQT/h5jhpxf9c8 (Submission Log) — persisted log (updated incrementally via Dexie)
    const submissionLog: SubmissionLogEntry[] | undefined = entry?.submissionLog;

    // Determine available tabs
    const availableTabs: TabKey[] = [
        "transcript",
        "structure",
        "diagnostics",
        ...(submissionLog && submissionLog.length > 0 ? ["submissionLog" as TabKey] : []),
    ];
    const [tab, setTab] = React.useState<TabKey>("transcript");

    // Decode signed transaction for diagnostics tab
    const [signedTx, setSignedTx] = React.useState<Tx | undefined>();
    React.useEffect(() => {
        if (!signedTxCborHex) return;
        try {
            setSignedTx(decodeTx(signedTxCborHex));
        } catch (e) {
            console.error("Failed to decode signed transaction:", e);
        }
    }, [signedTxCborHex]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col justify-between">
                {/* Header: description + state */}
                {advancedView && (
                    <>
                        <div className="ml-4 flex-grow self-start">
                            <div className="flex items-center justify-between">
                                <Highlight className="text-xl">
                                    {txName || description}
                                </Highlight>
                                {onClose && (
                                    <button
                                        onClick={onClose}
                                        className="text-slate-400 hover:text-slate-200
                                               w-6 h-6 text-sm flex items-center justify-center rounded-full
                                               hover:bg-slate-700/50 transition-colors"
                                        aria-label="Close detail panel"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                            {txName && description && (
                                <div className="text-md display-inline ml-4 opacity-50">
                                    {description}
                                </div>
                            )}
                            {moreInfo && (
                                <div className="text-brand-orange/66 ml-8 text-sm italic">
                                    {moreInfo}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Tab selector */}
                {advancedView && (
                    <div id="tab-selector" className="mt-1 z-10 -mb-1">
                        {availableTabs.map((key) => {
                            const isSelected = key === tab;
                            const selectedTabClass = isSelected
                                ? "mt-0 pt-0 pb-1 rounded-t-md bg-card border-x-1 border-t-3 border-border/80"
                                : "-mt-1 pt-1 pb-0 border-1 rounded-t-md bg-secondary/20 border-border/40";
                            const label = key === "submissionLog" ? "submission log" : key;
                            return (
                                <button
                                    key={key}
                                    className={`${selectedTabClass} ml-1 px-2 text-sm text-card-foreground border-b-0 rounded-b-none`}
                                    onClick={() => setTab(key)}
                                >
                                    {label}
                                </button>
                            );
                        })}
                        <Lowlight className="float-right">{state}</Lowlight>
                    </div>
                )}

                {/* Tab content */}
                {advancedView && (
                    <div className="z-9 bg-card border-t border-white/20 pt-1">
                        {/* Transcript tab */}
                        {tab === "transcript" && (
                            <>
                                {/* Live submitter status (only when live tracker available) */}
                                {txSubmitters && (
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
                                )}

                                {/* Build transcript */}
                                {transcript && (
                                    <code>
                                        <pre className="mt-4 max-h-[90vh] overflow-auto bg-neutral-200 text-xs text-black">
                                            {transcript.map(
                                                (line1, lineIndex) =>
                                                    line1
                                                        ?.split("\n")
                                                        .map((line2, lineIndex2) => {
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
                                                                        "text-[1.35em] -ml-2 -mt-2";
                                                                }
                                                                rest = (
                                                                    <span
                                                                        className={`text-[1.6em] font-formal -ml-5 font-bold -mt-2`}
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
                                                                    <span className="text-gray-400">
                                                                        {prefix}
                                                                    </span>
                                                                );
                                                            }
                                                            return (
                                                                <React.Fragment key={`${lineIndex}-${lineIndex2}`}>
                                                                    {" "}{prefix}{" "}
                                                                    {rest}
                                                                    <br />
                                                                </React.Fragment>
                                                            );
                                                        })
                                            )}
                                        </pre>
                                    </code>
                                )}
                            </>
                        )}

                        {/* Structure tab */}
                        {tab === "structure" && (
                            <>
                                {txStructure ? (
                                    <>
                                        <h4 className="text-sm">
                                            Transaction Structure
                                        </h4>
                                        <code className="text-sm">
                                            <pre className="font-formal text-[1.30em]/4.5 tracking-wide max-h-[80vh] overflow-auto">
                                                {txStructure}
                                            </pre>
                                        </code>
                                    </>
                                ) : (
                                    <div className="text-sm text-slate-400">
                                        No structure data available
                                    </div>
                                )}
                                {txCborHex && (
                                    <div className="mt-2 text-xs">
                                        CBOR Hex:{" "}
                                        <span className="break-all">
                                            {txCborHex}
                                        </span>
                                    </div>
                                )}
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
                                                    txTracker?.setup?.networkParams
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

                        {/* Submission Log tab */}
                        {/* REQT/h5jhpxf9c8 (Submission Log) — timestamped event display */}
                        {tab === "submissionLog" && submissionLog && (
                            <div className="flex flex-col gap-1">
                                {submissionLog.map((logEntry, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-row items-baseline gap-2 rounded-md border border-white/10 px-2 py-1 text-xs"
                                    >
                                        <span className="text-slate-500 font-mono whitespace-nowrap">
                                            {new Date(logEntry.at).toLocaleTimeString()}
                                        </span>
                                        <span className="text-slate-300 font-semibold whitespace-nowrap">
                                            {logEntry.submitter}
                                        </span>
                                        <span className="text-slate-200">
                                            {logEntry.event}
                                        </span>
                                        {logEntry.detail && (
                                            <span className="text-slate-400 truncate" title={logEntry.detail}>
                                                {logEntry.detail}
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {submissionLog.length === 0 && (
                                    <div className="text-sm text-slate-400">
                                        No submission events recorded yet
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Entry metadata (for persisted entries without live tracker) */}
                {advancedView && !txTracker && entry && (
                    <div className="mt-2 text-xs text-slate-400">
                        <div>Hash: {entry.txHash}</div>
                        <div>Submitted: {new Date(entry.submittedAt).toLocaleString()}</div>
                        {entry.confirmedAtBlockHeight != null && (
                            <div>Confirmed at block: {entry.confirmedAtBlockHeight} (depth: {entry.confirmationBlockDepth})</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
