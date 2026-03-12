import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { liveQuery } from "dexie";
import type { PendingTxEntry } from "../networkClients/UtxoIndex/types/PendingTxEntry.js";
import { DexieUtxoStore } from "../networkClients/UtxoIndex/DexieUtxoStore.js";
import type { TxBatcher } from "../networkClients/TxBatcher.js";
import { TxDetailPanel } from "./TxDetailPanel.js";

/**
 * Visual mapping from confirmation state to Unicode symbol and color.
 *
 * Uses geometric Unicode shapes (not emoji) so they can be styled with
 * CSS `color`. The progression fills in as confidence grows:
 *
 * | State        | Symbol | Color       | Meaning                              |
 * |--------------|--------|-------------|--------------------------------------|
 * | pending      | ◑      | grey        | Submitted, not yet seen on-chain     |
 * | provisional  | ●      | grey        | Confirmed, shallow depth             |
 * | likely       | ●      | white       | Past provisional depth threshold     |
 * | confident    | ●      | green       | Past confident depth threshold       |
 * | certain      | ●      | dark green  | Past certainty depth threshold       |
 * | rolled-back  | ✗      | red         | Deadline expired, tx rolled back     |
 *
 * @internal
 */
// REQT/4p1fvt8tbr (Symbol Mapping) — rollback-pending added for two-gate lifecycle
const stateDisplay: Record<
    string,
    { symbol: string; color: string; label: string }
> = {
    pending:            { symbol: "◑", color: "#9ca3af", label: "Submitting" },
    provisional:        { symbol: "●", color: "#9ca3af", label: "Confidence: Provisional" },
    likely:             { symbol: "●", color: "oklch(0.86 0.32 149.97 / 0.4)", label: "Confidence: Likely" },
    confident:          { symbol: "●", color: "oklch(0.77 0.33 145.43 / 0.73)", label: "Confidence: High" },
    certain:            { symbol: "●", color: "oklch(0.63 0.22 250.05)", label: "Confidence: Confirmed" },
    "rollback-pending": { symbol: "✗", color: "#9ca3af", label: "Rollback Pending" },
    "rolled-back":      { symbol: "✗", color: "#ef4444", label: "Rolled Back" },
};

/**
 * Resolves the display state for a pending transaction entry.
 *
 * @param entry - The pending transaction entry from the Dexie store.
 * @returns The symbol, color, and label for the entry's current state.
 *
 * @internal
 */
function getDisplay(entry: PendingTxEntry) {
    if (entry.status === "rolled-back") {
        return stateDisplay["rolled-back"];
    }
    // REQT/4p1fvt8tbr (Symbol Mapping) — rollback-pending dispatch
    if (entry.status === "rollback-pending") {
        return stateDisplay["rollback-pending"];
    }
    if (entry.status === "confirmed" && entry.confirmState) {
        return stateDisplay[entry.confirmState] ?? stateDisplay.pending;
    }
    return stateDisplay.pending;
}

/**
 * Compact, reactive pending transaction tracker.
 *
 * Displays each in-flight transaction as a single colored Unicode dot,
 * arranged left-to-right in strict submission-time order (oldest left,
 * newest right). The dots change color as confirmation confidence
 * progresses from grey (submitting) through green (confirmed certain).
 *
 * ## Data source
 *
 * Opens its own {@link DexieUtxoStore} connection to the same IndexedDB
 * database that {@link CachedUtxoIndex} writes to. Dexie handles shared
 * access — the component is fully independent and does not need a store
 * instance threaded through the component tree.
 *
 * The connection is created once via `useMemo` and the `pendingTxs` table
 * is observed via Dexie's `liveQuery`, so the display updates reactively
 * whenever entries are added, confirmed, depth-advanced, or rolled back.
 *
 * ## Visual states
 *
 * - **◑ grey** — Submitting (pending, not yet confirmed on-chain)
 * - **● grey** — Provisional (just confirmed, shallow block depth)
 * - **● white** — Likely (past provisional depth threshold)
 * - **● green** — Confident (past confident depth threshold)
 * - **● dark green** — Confirmed certain (past certainty depth threshold)
 * - **✗ red** — Rolled back (deadline expired before confirmation)
 *
 * Hover over any dot for a tooltip showing the transaction hash prefix,
 * description, confirmation state, block depth, and submission age.
 *
 * ## Empty state
 *
 * Renders nothing (`null`) when there are no pending transaction entries.
 *
 * @example
 * ```tsx
 * // Default database name (matches CachedUtxoIndex default)
 * <PendingTxTracker />
 *
 * // Custom database name (if your CachedUtxoIndex uses a custom dbName)
 * <PendingTxTracker dbName="my-dapp-index" />
 * ```
 *
 * @param props.dbName - Optional Dexie database name. Defaults to the same
 *   default used by {@link DexieUtxoStore} (`"StellarDappIndex-v0.1"`).
 *   Pass a custom name only if your {@link CachedUtxoIndex} was constructed
 *   with a custom `dbName`.
 *
 * @public
 */
// REQT/y8rnvqmgza (TxDetailPanel Component) — txBatcher prop for live tracker lookup on drill-down
export function PendingTxTracker({ dbName, txBatcher, pid }: { dbName?: string; txBatcher?: TxBatcher; pid?: number } = {}) {
    const store = useMemo(() => new DexieUtxoStore(dbName), [dbName]);
    const [entries, setEntries] = useState<PendingTxEntry[]>([]);
    // REQT/3r5g35smyn (Click to Open Detail) — selected entry for detail panel
    const [selectedTxHash, setSelectedTxHash] = useState<string | null>(null);
    const [zoomed, setZoomed] = useState(false);
    const [copyToast, setCopyToast] = useState<{ x: number; y: number; label: string } | null>(null);
    const copyToClipboard = React.useCallback((text: string, label: string, e: React.MouseEvent) => {
        if (e.shiftKey) return;
        navigator.clipboard.writeText(text);
        setCopyToast({ x: e.clientX, y: e.clientY, label });
        setTimeout(() => setCopyToast(null), 3000);
    }, []);
    const dotsRef = React.useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = React.useState<{ top: number; right: number } | null>(null);

    // Compute panel anchor position from dots container
    React.useEffect(() => {
        if (dotsRef.current && selectedTxHash) {
            const rect = dotsRef.current.getBoundingClientRect();
            setPanelPos({
                top: rect.bottom + 4,
                right: window.innerWidth - rect.right,
            });
        }
    }, [selectedTxHash]);

    // Sync mutex indicator — read syncMutex metadata to show which tab owns sync
    const [syncOwnerPid, setSyncOwnerPid] = useState<number | null>(null);
    useEffect(() => {
        const subscription = liveQuery(() =>
            store.metadata.get("syncMutex")
        ).subscribe({
            next: (entry) => {
                if (entry?.value) {
                    try {
                        const parsed = JSON.parse(entry.value);
                        setSyncOwnerPid(parsed.pid ?? null);
                    } catch { setSyncOwnerPid(null); }
                } else {
                    setSyncOwnerPid(null);
                }
            },
            error: () => setSyncOwnerPid(null),
        });
        return () => subscription.unsubscribe();
    }, [store]);

    useEffect(() => {
        const subscription = liveQuery(() =>
            store.pendingTxs.toArray()
        ).subscribe({
            next: (result) => setEntries(result),
            error: (err) => console.error("PendingTxTracker query error:", err),
        });
        return () => subscription.unsubscribe();
    }, [store]);

    // Strict time ordering: oldest first (left), newest last (right).
    // Omit rolled-back entries older than 18 hours — they are no longer
    // actionable and would otherwise persist in the display forever.
    // Re-evaluate periodically so rolled-back entries age out even
    // when no Dexie updates are triggering re-renders.
    const ROLLED_BACK_MAX_AGE_MS = 18 * 60 * 60 * 1000;
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);

    const sorted = [...entries]
        .filter((e) => {
            if (e.status !== "rolled-back") return true;
            return now - e.submittedAt < ROLLED_BACK_MAX_AGE_MS;
        })
        .sort((a, b) => a.submittedAt - b.submittedAt);

    if (sorted.length === 0) return null;

    // REQT/3r5g35smyn (Click to Open Detail) — resolve selected entry and optional live tracker
    const selectedEntry = selectedTxHash
        ? sorted.find((e) => e.txHash === selectedTxHash)
        : undefined;
    const selectedTracker = selectedTxHash && txBatcher
        ? txBatcher.findTracker(selectedTxHash)
        : undefined;

    return (
        <div style={{ position: "relative" }}>
            <div
                ref={dotsRef}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25em",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                }}
            >
                {sorted.map((entry) => (
                    <PendingTxDot
                        key={entry.txHash}
                        entry={entry}
                        isSelected={entry.txHash === selectedTxHash}
                        onClick={() =>
                            setSelectedTxHash(
                                entry.txHash === selectedTxHash ? null : entry.txHash
                            )
                        }
                    />
                ))}
                {/* Sync mutex owner indicator — shown when this tab holds the sync lock */}
                {pid !== undefined && syncOwnerPid === pid && (
                    <span
                        title="Syncing with the network"
                        style={{
                            fontSize: "0.75em",
                            marginLeft: "0.15em",
                            cursor: "pointer",
                        }}
                    >
                        💪
                    </span>
                )}
            </div>

            {/* REQT/3r5g35smyn (Click to Open Detail) — portaled to escape stacking contexts */}
            {selectedEntry && panelPos && createPortal(
                <div
                    style={zoomed ? {
                        position: "fixed",
                        top: panelPos.top,
                        left: 0,
                        zIndex: 9999,
                        width: "100vw",
                        height: `calc(100vh - ${panelPos.top}px)`,
                    } : {
                        position: "fixed",
                        top: panelPos.top,
                        right: panelPos.right,
                        zIndex: 9999,
                        width: "min(80vw, 600px)",
                        maxHeight: `calc(100vh - ${panelPos.top}px)`,
                    }}
                    className="rounded-md border border-slate-700/50 bg-slate-900/95 backdrop-blur-sm shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Header — double-click to zoom */}
                    <div
                        className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/50 cursor-default select-none"
                        onDoubleClick={() => setZoomed(z => !z)}
                    >
                        <span className="text-xs text-slate-400">
                            <span
                                className="font-mono cursor-pointer hover:text-slate-200"
                                title={`Click to copy: ${selectedEntry.txHash}`}
                                onClick={(e) => copyToClipboard(selectedEntry.txHash, "Copied tx hash", e)}
                            >
                                {selectedEntry.txHash.slice(0, 8)}…
                            </span>
                            {" "}{selectedEntry.description || selectedEntry.txName || ""}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setZoomed(z => !z)}
                                className="text-slate-400 hover:text-slate-200 w-6 h-6 text-sm
                                           flex items-center justify-center rounded-full
                                           hover:bg-slate-700/50 transition-colors"
                                aria-label={zoomed ? "Restore" : "Expand full-screen"}
                                title={zoomed ? "Restore" : "Expand full-screen"}
                            >
                                ⛶
                            </button>
                            <button
                                onClick={() => { setSelectedTxHash(null); setZoomed(false); }}
                                className="text-slate-400 hover:text-slate-200 w-6 h-6 text-xs
                                           flex items-center justify-center rounded-full
                                           hover:bg-slate-700/50 transition-colors"
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-3">
                        <TxDetailPanel
                            txTracker={selectedTracker}
                            tx={selectedTracker?.txd?.tx}
                            entry={selectedEntry}
                            advancedView={true}

                        />
                    </div>
                </div>,
                document.body
            )}
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
        </div>
    );
}

/**
 * Formats a millisecond timestamp as a human-readable relative age string.
 *
 * @param submittedAt - Epoch milliseconds when the transaction was submitted.
 * @returns A string like `"12s ago"`, `"3m ago"`, `"2h ago"`, or `"1d ago"`.
 *
 * @internal
 */
function formatAge(submittedAt: number): string {
    const seconds = Math.floor((Date.now() - submittedAt) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * A single transaction indicator dot with a hover tooltip.
 *
 * Renders one Unicode symbol colored to reflect the transaction's
 * current confirmation state. The native `title` attribute provides
 * a tooltip with transaction details on hover.
 *
 * @param props.entry - The {@link PendingTxEntry} to display.
 *
 * @internal
 */
function PendingTxDot({ entry, onClick, isSelected }: { entry: PendingTxEntry; onClick?: () => void; isSelected?: boolean }) {
    const display = getDisplay(entry);
    const hashShort = entry.txHash.slice(0, 8);
    const desc = entry.description || entry.txName || entry.id;
    const age = formatAge(entry.submittedAt);

    const chainInfo = entry.confirmedAtBlockHeight != null
        ? `\n    Block: ${entry.confirmedAtBlockHeight}` +
          (entry.confirmationBlockDepth > 0 ? `  •  Depth: ${entry.confirmationBlockDepth}` : "")
        : "";

    const tooltip = `${hashShort}… ${desc}${chainInfo}\n${age}  •  ${display.label}`;

    return (
        <span
            style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: onClick ? "pointer" : "default",
                lineHeight: 1,
            }}
            title={tooltip}
            onClick={onClick}
        >
            <span style={{ color: display.color, fontSize: "1.1em" }}>
                {display.symbol}
            </span>
            {/* Selection indicator — fixed height so layout doesn't shift */}
            <span style={{
                fontSize: "0.65em",
                lineHeight: 0,
                height: 0,
                marginTop: "0.2em",
                color: display.color,
                visibility: isSelected ? "visible" : "hidden",
            }}>
                ▼
            </span>
        </span>
    );
}
