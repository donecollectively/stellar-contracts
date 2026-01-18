/**
 * Storage-agnostic type definitions for UtxoIndex.
 *
 * These types decouple the storage layer from Helios and Blockfrost types.
 * CONSTRAINT: No imports from @helios-lang/* or blockfrostTypes/*.
 */

export type { UtxoIndexEntry } from "./UtxoIndexEntry.js";
export type { BlockIndexEntry } from "./BlockIndexEntry.js";
export type { TxIndexEntry } from "./TxIndexEntry.js";
export type { ScriptIndexEntry } from "./ScriptIndexEntry.js";
export type { LogEntry } from "./LogEntry.js";
