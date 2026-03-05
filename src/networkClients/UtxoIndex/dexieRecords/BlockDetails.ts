import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import type { BlockIndexEntry, BlockState } from "../types/BlockIndexEntry.js";

/**
 * Dexie entity class for block storage.
 * Implements the storage-agnostic BlockIndexEntry interface.
 *
 * REQT/dzx5harnk4 (Block Entity)
 * REQT/9gq8rwg9ng (Block Tip & Address Recording) — state field
 */
export class dexieBlockDetails
    extends Entity<DexieUtxoStore>
    implements BlockIndexEntry
{
    hash!: string;
    height!: number;
    time!: number;
    slot!: number;
    // REQT/9gq8rwg9ng: Block processing state
    state!: BlockState;
}
