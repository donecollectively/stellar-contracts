/**
 * Storage-agnostic block metadata representation.
 *
 * Contains only the fields needed for sync tracking and lookups.
 * REQT/dzx5harnk4 (Block Entity)
 */
export interface BlockIndexEntry {
    hash: string;
    height: number;
    time: number;
    slot: number;
}
//# sourceMappingURL=BlockIndexEntry.d.ts.map