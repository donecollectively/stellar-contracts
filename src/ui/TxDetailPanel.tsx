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
import { createPortal } from "react-dom";
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

type TabKey = "transcript" | "structure" | "diagnostics";

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
    // Copy-to-clipboard with floating confirmation
    const [copyToast, setCopyToast] = React.useState<{ x: number; y: number; label: string } | null>(null);
    const copyToClipboard = React.useCallback((text: string, label: string, e: React.MouseEvent) => {
        if (e.shiftKey) return;
        navigator.clipboard.writeText(text);
        setCopyToast({ x: e.clientX, y: e.clientY, label });
        setTimeout(() => setCopyToast(null), 3000);
    }, []);

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
            {/* Floating copy confirmation toast — portaled to body to escape overflow clipping */}
            {copyToast && createPortal(
                <div
                    style={{
                        position: "fixed",
                        left: copyToast.x + 12,
                        top: copyToast.y - 12,
                        zIndex: 9999,
                        pointerEvents: "none",
                        backgroundColor: "rgba(22, 101, 52, 0.92)",
                        color: "#bbf7d0",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                >
                    ✓ {copyToast.label}
                </div>,
                document.body
            )}
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
                                {/* No data fallback */}
                                {!txSubmitters && !transcript && (
                                    <div className="text-sm text-slate-400">
                                        No transcript data available
                                    </div>
                                )}
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
                                        <code className="text-xs">
                                            <pre className="font-formal text-[1.05em]/4 tracking-wide max-h-[80vh] overflow-auto">
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
                                    <details className="mt-2 text-xs">
                                        <summary className="text-slate-400 cursor-pointer">
                                            Unsigned CBOR ({txCborHex.length / 2} bytes)
                                        </summary>
                                        <span
                                            className="break-all text-slate-500 cursor-pointer hover:text-slate-300 transition-colors"
                                            title="Click to copy unsigned CBOR"
                                            onClick={(e) => copyToClipboard(txCborHex, "Copied unsigned CBOR", e)}
                                        >
                                            {txCborHex}
                                        </span>
                                    </details>
                                )}
                            </>
                        )}

                        {/* Diagnostics tab — submission log + signed tx details */}
                        {tab === "diagnostics" && (
                            <>
                                {/* Submission log — the primary diagnostic content */}
                                {submissionLog && submissionLog.length > 0 ? (
                                    <div className="mb-3 max-h-[50vh] overflow-y-auto">
                                        <h4 className="text-sm font-semibold mb-1">Submission Log</h4>
                                        <div className="font-mono text-xs leading-snug">
                                            {submissionLog.map((logEntry, i) => (
                                                <div key={i} className="flex items-baseline gap-2 py-px">
                                                    <span className="text-slate-500 whitespace-nowrap">
                                                        {new Date(logEntry.at).toLocaleTimeString()}
                                                    </span>
                                                    <span className="text-slate-300 whitespace-nowrap">
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
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-400 mb-3">
                                        No submission events recorded
                                    </div>
                                )}

                                {/* Signed tx structure — when live tracker provides networkParams */}
                                {signedTx && txTracker?.setup?.networkParams && (() => {
                                    try {
                                        const dump = dumpAny(signedTx, txTracker.setup.networkParams);
                                        return (
                                            <>
                                                <h4 className="text-sm font-semibold mt-2">Signed Tx Structure</h4>
                                                <h5 className="text-xs text-slate-400">
                                                    {signedTx.id?.()?.toString?.() || "Unknown ID"}
                                                </h5>
                                                <code className="text-xs">
                                                    <pre className="max-h-64 overflow-auto">
                                                        {dump}
                                                    </pre>
                                                </code>
                                            </>
                                        );
                                    } catch (e) {
                                        return (
                                            <div className="text-sm text-slate-400 mt-2">
                                                Could not render signed tx structure: {String(e)}
                                            </div>
                                        );
                                    }
                                })()}

                                {/* CBOR hex — collapsible, click to copy */}
                                {signedTxCborHex && (
                                    <details className="mt-2 text-xs">
                                        <summary className="text-slate-400 cursor-pointer">
                                            Signed CBOR ({signedTxCborHex.length / 2} bytes)
                                        </summary>
                                        <span
                                            className="break-all text-slate-500 cursor-pointer hover:text-slate-300 transition-colors"
                                            title="Click to copy signed CBOR"
                                            onClick={(e) => copyToClipboard(signedTxCborHex, "Copied signed CBOR", e)}
                                        >
                                            {signedTxCborHex}
                                        </span>
                                    </details>
                                )}
                            </>
                        )}

                        {/* Submission log display moved to diagnostics tab */}
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
