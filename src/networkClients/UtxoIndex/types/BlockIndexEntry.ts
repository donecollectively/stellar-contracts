/**
 * Storage-agnostic block metadata representation.
 *
 * Contains only the fields needed for sync tracking and lookups.
 * REQT/dzx5harnk4 (Block Entity)
 * REQT/9gq8rwg9ng (Block Tip & Address Recording) — state field tracks processing progress
 */

// REQT/9gq8rwg9ng: Block processing state — string enum designed to accommodate
// "rolled back" in Phase 3 without a schema migration
export type BlockState = "unprocessed" | "processed" | "rolled back";

export interface BlockIndexEntry {
    hash: string;
    height: number;
    time: number;
    slot: number;
    // REQT/9gq8rwg9ng: Processing state — tracks whether this block's transactions
    // have been processed by the indexer
    state: BlockState;
}
