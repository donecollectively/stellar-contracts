import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { liveQuery } from "dexie";
import { DexieUtxoStore } from "../networkClients/UtxoIndex/DexieUtxoStore.js";
import type { LogEntry, LogLevel } from "../networkClients/UtxoIndex/types/LogEntry.js";

// ─── Style constants ────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<LogLevel, string> = {
    info:  "#60a5fa", // blue-400
    debug: "#9ca3af", // gray-400
    warn:  "#fbbf24", // amber-400
    error: "#f87171", // red-400
};

const LEVEL_LABELS: Record<LogLevel, string> = {
    info:  "INFO",
    debug: "DEBUG",
    warn:  "WARN",
    error: "ERROR",
};

// Well-known log code prefixes → human-readable group labels
const CODE_GROUP_LABELS: Record<string, string> = {
    pt1: "Register Pending Tx",
    pt2: "Register: Index",
    pt3: "Register: Complete",
    pt4: "Confirm Pending Tx",
    pt5: "Rollback Pending Tx",
    pt6: "Deadline Check",
    pt7: "Startup Recovery",
    si:  "Incremental Sync",
    sc:  "Catchup Sync",
    wa:  "Wallet Address",
    ac:  "Attach Capo",
    cu:  "Catalog UUTs",
    pr:  "Periodic Refresh",
    rc:  "Reconciliation",
    cd:  "Confirmation Depth",
    fn:  "Fetch Blocks",
    bk:  "Block Fetch",
    sp:  "Input Processing",
    ct:  "Contention Detection",
    ch:  "Charter",
};

function getCodeGroup(logId: string): string | undefined {
    // logId format: "code-nanoid", extract the code prefix
    const code = logId.split("-")[0];
    // Try 3-char then 2-char prefix match
    const p3 = code.slice(0, 3);
    if (CODE_GROUP_LABELS[p3]) return CODE_GROUP_LABELS[p3];
    const p2 = code.slice(0, 2);
    if (CODE_GROUP_LABELS[p2]) return CODE_GROUP_LABELS[p2];
    return undefined;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reactive log viewer for CachedUtxoIndex.
 *
 * Shows all log entries from the IndexedDB store with:
 * - **Level filtering**: toggle info/debug/warn/error visibility
 * - **Parent-child grouping**: top-level operations (info) can be expanded
 *   to reveal their sub-step details (debug)
 * - **Auto-tail**: scrolls to bottom on new entries (toggleable)
 *
 * Opens its own DexieUtxoStore connection (same pattern as PendingTxTracker).
 *
 * @param props.dbName - Optional Dexie database name. Defaults to DexieUtxoStore default.
 * @param props.maxEntries - Maximum entries to display. Defaults to 500.
 */
export function IndexerLogViewer({
    dbName,
    maxEntries = 10_000,
    initialLevels = ["info", "warn", "error"],
    inline = false,
}: {
    dbName?: string;
    maxEntries?: number;
    /** Which log levels are visible on mount. Defaults to warn + error. */
    initialLevels?: LogLevel[];
    /** Compact chrome-free mode. Shows a minimal tail of recent entries
     *  with an expand button to switch to the full panel view. */
    inline?: boolean;
} = {}) {
    const store = useMemo(() => new DexieUtxoStore(dbName), [dbName]);
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [visibleLevels, setVisibleLevels] = useState<Set<LogLevel>>(
        () => new Set<LogLevel>(initialLevels),
    );
    const [expandedParents, setExpandedParents] = useState<Set<string>>(() => new Set());
    const [autoTail, setAutoTail] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [filter, setFilter] = useState("");

    // When inline and not expanded, show the compact view
    const showFull = !inline || expanded;

    // Live query all logs — load all entries, sort by time, keep tail.
    // No pid filter: the viewer is a passive observer that opens its own DexieUtxoStore
    // connection (which gets a fresh pid), so filtering by pid would show nothing.
    useEffect(() => {
        const subscription = liveQuery(async () => {
            const all = await store.logs.toArray();
            all.sort((a, b) => a.time - b.time);
            if (maxEntries > 0 && all.length > maxEntries) {
                return all.slice(-maxEntries);
            }
            return all;
        }).subscribe({
            next: (result) => setEntries(result as LogEntry[]),
            error: (err) => console.error("IndexerLogViewer query error:", err),
        });
        return () => subscription.unsubscribe();
    }, [store, maxEntries]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (autoTail && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [entries, autoTail]);

    // Build parent-child index
    const { roots, childrenMap } = useMemo(() => {
        const childrenMap = new Map<string, LogEntry[]>();
        const roots: LogEntry[] = [];

        for (const entry of entries) {
            if (entry.parentLogId) {
                const siblings = childrenMap.get(entry.parentLogId) || [];
                siblings.push(entry);
                childrenMap.set(entry.parentLogId, siblings);
            } else {
                roots.push(entry);
            }
        }
        return { roots, childrenMap };
    }, [entries]);

    const toggleLevel = useCallback((level: LogLevel) => {
        setVisibleLevels((prev) => {
            const next = new Set(prev);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    }, []);

    const toggleExpand = useCallback((logId: string) => {
        setExpandedParents((prev) => {
            const next = new Set(prev);
            if (next.has(logId)) {
                next.delete(logId);
            } else {
                next.add(logId);
            }
            return next;
        });
    }, []);

    const expandAll = useCallback(() => {
        setExpandedParents(new Set(roots.map((r) => r.logId)));
    }, [roots]);

    const collapseAll = useCallback(() => {
        setExpandedParents(new Set());
    }, []);

    // Filter entries by text
    const filterLower = filter.toLowerCase();
    const matchesFilter = useCallback(
        (entry: LogEntry) => {
            if (!filterLower) return true;
            return (
                entry.message.toLowerCase().includes(filterLower) ||
                entry.logId.toLowerCase().includes(filterLower)
            );
        },
        [filterLower],
    );

    // Build visible entries list.
    //
    // Level filter is strict: only entries matching selected levels appear.
    // Child entries whose parent isn't visible are promoted to root level.
    //
    // Hierarchy is driven by expand/collapse on a specific entry:
    // when expanded, ALL children of that entry are shown regardless of
    // level filter — the user asked to see the detail.
    const visibleEntries = useMemo(() => {
        const result: Array<{ entry: LogEntry; depth: number; hasChildren: boolean }> = [];

        // Set of visible root logIds for quick parent lookup
        const visibleRootIds = new Set<string>();

        // Pass 1: collect roots that pass level + text filter
        for (const root of roots) {
            if (!visibleLevels.has(root.level || "info")) continue;
            if (!matchesFilter(root)) continue;
            visibleRootIds.add(root.logId);
        }

        // Pass 2: promote orphaned children — children that pass the level
        // filter but whose parent isn't visible become root-level entries
        for (const [parentId, children] of childrenMap) {
            if (visibleRootIds.has(parentId)) continue; // parent is visible, handled below
            for (const child of children) {
                if (!visibleLevels.has(child.level || "info")) continue;
                if (!matchesFilter(child)) continue;
                result.push({ entry: child, depth: 0, hasChildren: false });
            }
        }

        // Pass 3: visible roots + their children (when expanded)
        for (const root of roots) {
            if (!visibleRootIds.has(root.logId)) continue;
            const children = childrenMap.get(root.logId) || [];
            const isExpanded = expandedParents.has(root.logId);

            result.push({
                entry: root,
                depth: 0,
                hasChildren: children.length > 0,
            });

            // When expanded, show ALL children — user asked for detail
            if (isExpanded) {
                for (const child of children) {
                    if (!matchesFilter(child)) continue;
                    result.push({ entry: child, depth: 1, hasChildren: false });
                }
            }
        }

        // Sort by time to interleave promoted orphans correctly
        result.sort((a, b) => a.entry.time - b.entry.time);

        return result;
    }, [roots, childrenMap, expandedParents, visibleLevels, matchesFilter]);

    // ── Inline compact view ────────────────────────────────────────────
    // Shows the last few matching entries as a minimal tail, no chrome.
    // Click to expand into the full panel.
    if (!showFull) {
        const INLINE_TAIL = 4;
        const tail = visibleEntries.slice(-INLINE_TAIL);
        const warnCount = entries.filter((e) => (e.level || "info") === "warn").length;
        const errorCount = entries.filter((e) => (e.level || "info") === "error").length;

        return (
            <div
                style={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    fontSize: "0.75rem",
                    color: "#e5e7eb",
                    backgroundColor: "#111827",
                    borderRadius: "0.375rem",
                    overflow: "hidden",
                    cursor: "pointer",
                }}
                onClick={() => setExpanded(true)}
                title="Click to expand log viewer"
            >
                {tail.length === 0 ? (
                    <div style={{ padding: "0.35rem 0.6rem", color: "#6b7280" }}>
                        No log entries
                    </div>
                ) : (
                    tail.map(({ entry }) => {
                        const level = entry.level || "info";
                        return (
                            <div
                                key={entry.logId}
                                style={{
                                    display: "flex",
                                    gap: "0.4rem",
                                    padding: "0.1rem 0.6rem",
                                    alignItems: "baseline",
                                }}
                            >
                                <span style={{ color: LEVEL_COLORS[level], fontSize: "0.6rem", fontWeight: 700, width: "2.5rem", flexShrink: 0 }}>
                                    {LEVEL_LABELS[level]}
                                </span>
                                <span style={{
                                    color: level === "error" ? "#fca5a5" : level === "warn" ? "#fde68a" : "#d1d5db",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    flex: 1,
                                }}>
                                    {entry.message}
                                </span>
                            </div>
                        );
                    })
                )}
                {/* Summary bar */}
                <div style={{
                    display: "flex",
                    gap: "0.6rem",
                    padding: "0.2rem 0.6rem",
                    borderTop: "1px solid #1f2937",
                    fontSize: "0.65rem",
                    color: "#6b7280",
                    alignItems: "center",
                }}>
                    {errorCount > 0 && <span style={{ color: LEVEL_COLORS.error }}>{errorCount} error{errorCount !== 1 ? "s" : ""}</span>}
                    {warnCount > 0 && <span style={{ color: LEVEL_COLORS.warn }}>{warnCount} warn{warnCount !== 1 ? "s" : ""}</span>}
                    <span style={{ flex: 1 }} />
                    <span>{entries.length} entries ▸</span>
                </div>
            </div>
        );
    }

    // ── Full panel view ─────────────────────────────────────────────────
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: "0.8rem",
                color: "#e5e7eb",
                backgroundColor: "#111827",
                borderRadius: "0.5rem",
                overflow: "hidden",
            }}
        >
            {/* Toolbar */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    borderBottom: "1px solid #374151",
                    backgroundColor: "#1f2937",
                    flexWrap: "wrap",
                }}
            >
                <span style={{ fontWeight: 600, fontSize: "0.85rem", marginRight: "0.5rem" }}>
                    Indexer Log
                </span>

                {/* Level toggles */}
                {(["info", "debug", "warn", "error"] as LogLevel[]).map((level) => (
                    <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        style={{
                            padding: "0.15rem 0.5rem",
                            borderRadius: "0.25rem",
                            border: "1px solid",
                            borderColor: visibleLevels.has(level)
                                ? LEVEL_COLORS[level]
                                : "#4b5563",
                            backgroundColor: visibleLevels.has(level)
                                ? `${LEVEL_COLORS[level]}22`
                                : "transparent",
                            color: visibleLevels.has(level)
                                ? LEVEL_COLORS[level]
                                : "#6b7280",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            fontFamily: "inherit",
                        }}
                    >
                        {LEVEL_LABELS[level]}
                    </button>
                ))}

                <div style={{ flex: 1 }} />

                {/* Expand/Collapse */}
                <button onClick={expandAll} style={toolBtnStyle} title="Expand all">
                    ▼
                </button>
                <button onClick={collapseAll} style={toolBtnStyle} title="Collapse all">
                    ▶
                </button>

                {/* Auto-tail toggle */}
                <button
                    onClick={() => setAutoTail(!autoTail)}
                    style={{
                        ...toolBtnStyle,
                        color: autoTail ? "#34d399" : "#6b7280",
                        borderColor: autoTail ? "#34d399" : "#4b5563",
                    }}
                    title={autoTail ? "Auto-scroll ON" : "Auto-scroll OFF"}
                >
                    ⬇
                </button>

                {/* Text filter */}
                <input
                    type="text"
                    placeholder="Filter…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        border: "1px solid #4b5563",
                        backgroundColor: "#111827",
                        color: "#e5e7eb",
                        fontSize: "0.75rem",
                        fontFamily: "inherit",
                        width: "12rem",
                    }}
                />

                <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                    {visibleEntries.length}/{entries.length}
                </span>

                {/* Collapse back to inline (only when inline prop is set) */}
                {inline && (
                    <button
                        onClick={() => setExpanded(false)}
                        style={{
                            ...toolBtnStyle,
                            fontSize: "0.7rem",
                        }}
                        title="Collapse to inline view"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Log entries */}
            <div
                ref={scrollRef}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "0.25rem 0",
                }}
            >
                {visibleEntries.length === 0 && (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "#6b7280",
                        }}
                    >
                        {entries.length === 0
                            ? "No log entries yet"
                            : "No entries match current filters"}
                    </div>
                )}
                {visibleEntries.map(({ entry, depth, hasChildren }) => (
                    <LogRow
                        key={entry.logId}
                        entry={entry}
                        depth={depth}
                        hasChildren={hasChildren}
                        isExpanded={expandedParents.has(entry.logId)}
                        onToggle={() => toggleExpand(entry.logId)}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const toolBtnStyle: React.CSSProperties = {
    padding: "0.15rem 0.4rem",
    borderRadius: "0.25rem",
    border: "1px solid #4b5563",
    backgroundColor: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontFamily: "inherit",
};

function LogRow({
    entry,
    depth,
    hasChildren,
    isExpanded,
    onToggle,
}: {
    entry: LogEntry;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const level = entry.level || "info";
    const levelColor = LEVEL_COLORS[level];
    const code = entry.logId.split("-")[0];
    const groupLabel = getCodeGroup(entry.logId);
    const time = new Date(entry.time);
    const timeStr = time.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const msStr = String(time.getMilliseconds()).padStart(3, "0");

    return (
        <div
            onClick={hasChildren ? onToggle : undefined}
            style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.5rem",
                padding: "0.15rem 0.75rem",
                paddingLeft: `${0.75 + depth * 1.25}rem`,
                cursor: hasChildren ? "pointer" : "default",
                backgroundColor: depth === 0 && level === "info"
                    ? "#1e293b"
                    : "transparent",
                borderLeft: depth > 0
                    ? `2px solid ${levelColor}33`
                    : "2px solid transparent",
            }}
            title={entry.location}
        >
            {/* Expand indicator */}
            <span
                style={{
                    width: "0.8rem",
                    fontSize: "0.65rem",
                    color: "#6b7280",
                    flexShrink: 0,
                    textAlign: "center",
                }}
            >
                {hasChildren ? (isExpanded ? "▼" : "▶") : depth > 0 ? "·" : ""}
            </span>

            {/* Timestamp */}
            <span
                style={{
                    color: "#6b7280",
                    flexShrink: 0,
                    fontSize: "0.7rem",
                }}
            >
                {timeStr}.{msStr}
            </span>

            {/* Level badge */}
            <span
                style={{
                    color: levelColor,
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    flexShrink: 0,
                    width: "3rem",
                }}
            >
                {LEVEL_LABELS[level]}
            </span>

            {/* Code tag */}
            <span
                style={{
                    color: "#818cf8",
                    fontWeight: 500,
                    flexShrink: 0,
                    fontSize: "0.7rem",
                    width: "3.5rem",
                }}
                title={groupLabel || code}
            >
                {code}
            </span>

            {/* Group label (info only) */}
            {depth === 0 && groupLabel && (
                <span
                    style={{
                        color: "#94a3b8",
                        fontSize: "0.7rem",
                        flexShrink: 0,
                        fontWeight: 600,
                    }}
                >
                    [{groupLabel}]
                </span>
            )}

            {/* Message */}
            <span
                style={{
                    color: level === "error"
                        ? "#fca5a5"
                        : level === "warn"
                        ? "#fde68a"
                        : depth > 0
                        ? "#d1d5db"
                        : "#f3f4f6",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                }}
            >
                {entry.message}
            </span>
        </div>
    );
}
