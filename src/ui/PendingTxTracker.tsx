import React, { useEffect, useMemo, useState } from "react";
import { liveQuery } from "dexie";
import type { PendingTxEntry } from "../networkClients/UtxoIndex/types/PendingTxEntry.js";
import { DexieUtxoStore } from "../networkClients/UtxoIndex/DexieUtxoStore.js";

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
const stateDisplay: Record<
    string,
    { symbol: string; color: string; label: string }
> = {
    pending:       { symbol: "◑", color: "#9ca3af", label: "Submitting" },
    provisional:   { symbol: "●", color: "#9ca3af", label: "Confidence: Provisional" },
    likely:        { symbol: "●", color: "oklch(0.86 0.32 149.97 / 0.4)", label: "Confidence: Likely" },
    confident:     { symbol: "●", color: "oklch(0.77 0.33 145.43 / 0.73)", label: "Confidence: High" },
    certain:       { symbol: "●", color: "oklch(0.63 0.22 250.05)", label: "Confidence: Confirmed" },
    "rolled-back": { symbol: "✗", color: "#ef4444", label: "Rolled Back" },
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
export function PendingTxTracker({ dbName }: { dbName?: string } = {}) {
    const store = useMemo(() => new DexieUtxoStore(dbName), [dbName]);
    const [entries, setEntries] = useState<PendingTxEntry[]>([]);

    useEffect(() => {
        const subscription = liveQuery(() =>
            store.pendingTxs.toArray()
        ).subscribe({
            next: (result) => setEntries(result),
            error: (err) => console.error("PendingTxTracker query error:", err),
        });
        return () => subscription.unsubscribe();
    }, [store]);

    // Strict time ordering: oldest first (left), newest last (right)
    const sorted = [...entries].sort((a, b) => a.submittedAt - b.submittedAt);

    if (sorted.length === 0) return null;

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25em",
                fontFamily: "monospace",
                fontSize: "0.85rem",
            }}
        >
            {sorted.map((entry) => (
                <PendingTxDot key={entry.txHash} entry={entry} />
            ))}
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
function PendingTxDot({ entry }: { entry: PendingTxEntry }) {
    const display = getDisplay(entry);
    const hashShort = entry.txHash.slice(0, 8);
    const desc = entry.description || entry.txName || entry.id;
    const age = formatAge(entry.submittedAt);

    const depthInfo =
        entry.status === "confirmed" && entry.confirmationBlockDepth > 0
            ? `\nDepth: ${entry.confirmationBlockDepth} blocks`
            : "";

    const tooltip = `${hashShort}… ${desc}\n${display.label}${depthInfo}\n${age}`;

    return (
        <span
            style={{
                color: display.color,
                fontSize: "1.1em",
                cursor: "default",
                lineHeight: 1,
            }}
            title={tooltip}
        >
            {display.symbol}
        </span>
    );
}
