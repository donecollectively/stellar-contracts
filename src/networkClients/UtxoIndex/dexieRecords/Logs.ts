import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import type { LogEntry } from "../types/LogEntry.js";

/**
 * Dexie entity class for log storage.
 *
 * REQT/cj6nm0mpm1 (Log Entity)
 */
export class indexerLogs
    extends Entity<DexieUtxoStore>
    implements LogEntry
{
    logId!: string;
    pid!: number;
    time!: number;
    location!: string;
    message!: string;
}
