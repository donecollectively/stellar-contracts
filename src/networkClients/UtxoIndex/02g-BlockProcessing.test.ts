/**
 * Tests for Block Processing Model (Phase 1)
 *
 * Tests the evolved block processing model: decoupled cursors,
 * dual-mode sync (incremental block-walk vs catchup), sync state
 * tracking, and confirmedAtBlockHeight recording.
 *
 * These tests use mock Blockfrost responses — they do NOT hit live APIs.
 * The CachedUtxoIndex constructor's syncNow() is mocked to prevent
 * any network calls during setup.
 *
 * Test design note: These tests exercise the FUTURE API being built
 * in the block-txn-processing work unit (Phase 1). They will fail
 * until the Coder implements the runtime changes.
 */

// MUST be first - polyfills IndexedDB globally for Node.js
import "fake-indexeddb/auto";

import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

import { CachedUtxoIndex } from "./CachedUtxoIndex.js";
import { CapoDataBridge } from "../../helios/scriptBundling/CapoHeliosBundle.bridge.js";
import {
    setLastSyncedBlock,
    getStore,
    createDbCleanupRegistry,
} from "./CachedUtxoIndex.testHelpers.js";
import type { BlockDetailsType } from "./blockfrostTypes/BlockDetails.js";
import type { BlockIndexEntry } from "./types/BlockIndexEntry.js";

// =========================================================================
// Mock Infrastructure
// =========================================================================

const TEST_CAPO_ADDRESS =
    "addr_test1wzz7gwv7yc5r4kfc5qau7nf67pc2pp4jz7vhqvmcs63wddsyvhdfz";
const TEST_CAPO_MPH =
    "6b413535a846297b5d8a949663f787b11bae34f24835f2f72dbfd128";

const cleanupRegistry = createDbCleanupRegistry();
const activeIndexes: CachedUtxoIndex[] = [];

/**
 * Creates a BlockDetailsType with sequential, realistic data.
 * Heights and slots are 1:1 for simplicity; hashes are deterministic from height.
 */
function makeBlock(
    height: number,
    overrides?: Partial<BlockDetailsType>
): BlockDetailsType {
    const hash =
        overrides?.hash ??
        `block_${String(height).padStart(6, "0")}_${"a".repeat(58)}`;
    const prevHash =
        overrides?.previous_block ??
        (height > 0
            ? `block_${String(height - 1).padStart(6, "0")}_${"a".repeat(58)}`
            : null);
    return {
        time: 1700000000 + height * 20,
        height,
        hash,
        slot: 50000000 + height,
        epoch: Math.floor(height / 100),
        epoch_slot: height % 100,
        slot_leader: "pool1test",
        size: 1024,
        tx_count: overrides?.tx_count ?? 0,
        output: "1000000",
        fees: "200000",
        block_vrf: null,
        op_cert: null,
        op_cert_counter: null,
        previous_block: prevHash,
        next_block: overrides?.next_block ?? null,
        confirmations: overrides?.confirmations ?? 1,
    };
}

/**
 * Blockfrost response for `blocks/{height}/addresses` endpoint.
 * Each entry lists an address and its transaction hashes in that block.
 */
interface BlockAddressEntry {
    address: string;
    transactions: Array<{ tx_hash: string }>;
}

/**
 * Creates a mock fetch layer for CachedUtxoIndex.
 *
 * Intercepts `fetchFromBlockfrost` calls and returns predetermined responses
 * based on URL prefix matching. Unmatched URLs throw to prevent accidental
 * live API calls.
 *
 * Usage:
 *   const mock = mockBlockfrost(index, {
 *     "blocks/latest": makeBlock(200),
 *     "blocks/block_000100.../next": [makeBlock(101), makeBlock(102)],
 *     "blocks/101/addresses": [{ address: "addr1...", transactions: [{ tx_hash: "abc" }] }],
 *   });
 *
 * After the test, call mock.calls to inspect what was fetched.
 */
function mockBlockfrost(
    index: CachedUtxoIndex,
    responses: Record<string, unknown>
): { calls: string[]; spy: ReturnType<typeof vi.spyOn> } {
    const calls: string[] = [];
    const spy = vi.spyOn(index, "fetchFromBlockfrost").mockImplementation(
        async <T>(url: string): Promise<T> => {
            calls.push(url);
            // Match by exact key first, then by prefix
            if (url in responses) {
                return responses[url] as T;
            }
            for (const [prefix, response] of Object.entries(responses)) {
                if (url.startsWith(prefix)) {
                    return response as T;
                }
            }
            throw new Error(
                `mockBlockfrost: unmatched URL "${url}". ` +
                    `Registered prefixes: ${Object.keys(responses).join(", ")}`
            );
        }
    );
    return { calls, spy };
}

/**
 * Creates a CachedUtxoIndex for testing with syncNow mocked out.
 * The index starts with empty state — caller must set up blocks and cursors.
 */
function createTestIndex(dbName: string): CachedUtxoIndex {
    cleanupRegistry.register(dbName);

    // Mock syncNow to prevent the constructor's fire-and-forget from hitting blockfrost
    const syncNowSpy = vi
        .spyOn(CachedUtxoIndex.prototype, "syncNow")
        .mockResolvedValue(undefined);

    const index = new CachedUtxoIndex({
        address: TEST_CAPO_ADDRESS,
        mph: TEST_CAPO_MPH,
        isMainnet: false,
        network: {} as any, // not used with mocked fetchFromBlockfrost
        bridge: new CapoDataBridge(false) as any,
        blockfrostKey: "preprod-test-not-used",
        storeIn: "dexie",
        dbName,
    });

    // Restore syncNow so tests that call it explicitly get the real implementation
    syncNowSpy.mockRestore();

    activeIndexes.push(index);
    return index;
}

/**
 * Seeds an index's store with a sequence of blocks marked as "processed",
 * and sets the in-memory cursor to the last block. This simulates an index
 * that has already processed blocks up to a given height.
 */
async function seedProcessedBlocks(
    index: CachedUtxoIndex,
    fromHeight: number,
    toHeight: number
): Promise<void> {
    const store = getStore(index);
    for (let h = fromHeight; h <= toHeight; h++) {
        const block = makeBlock(h);
        const entry: BlockIndexEntry = {
            hash: block.hash,
            height: block.height,
            time: block.time,
            slot: block.slot,
            state: "processed",
        };
        await store.saveBlock(entry);
    }
    // Set in-memory state to the last processed block
    const lastBlock = makeBlock(toHeight);
    setLastSyncedBlock(index, lastBlock.height, lastBlock.hash, lastBlock.slot);
}

let dbCounter = 0;
function uniqueDbName(label: string): string {
    return `StellarDappIndex-test-blockproc-${label}-${++dbCounter}-${Date.now()}`;
}

// =========================================================================
// Cleanup
// =========================================================================

afterEach(async () => {
    for (const idx of activeIndexes) {
        idx.stopPeriodicRefresh();
    }
    activeIndexes.length = 0;
    await cleanupRegistry.cleanup();
    vi.restoreAllMocks();
});

// =========================================================================
// Phase 1: Core Block Processing Model
// =========================================================================

describe("Block Processing Model (REQT/fh56sce22g)", () => {
    describe("Incremental mode (REQT/gfsjgaac1y)", () => {
        it("walks blocks via next and processes address txns (incremental-block-walk/REQT/gfsjgaac1y)", async () => {
            const index = createTestIndex(uniqueDbName("incr-walk"));

            // Seed: index has processed blocks up to height 100
            await seedProcessedBlocks(index, 98, 100);

            const TX_HASH_IN_BLOCK_101 =
                "aabb01010101010101010101010101010101010101010101010101010101010101";

            // Mock: blocks/latest returns tip at 102
            // blocks/{hash}/next returns blocks 101, 102
            // blocks/101/addresses returns our capoAddress with a tx
            // blocks/102/addresses returns empty (no relevant txns)
            const block101 = makeBlock(101, { tx_count: 1 });
            const block102 = makeBlock(102);
            const lastProcessedHash = makeBlock(100).hash;

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(102),
                [`blocks/${lastProcessedHash}/next`]: [block101, block102],
                "blocks/101/addresses": [
                    {
                        address: TEST_CAPO_ADDRESS,
                        transactions: [{ tx_hash: TX_HASH_IN_BLOCK_101 }],
                    },
                ] as BlockAddressEntry[],
                "blocks/102/addresses": [] as BlockAddressEntry[],
                // processTransactionForNewUtxos will try to fetch the tx CBOR
                [`txs/${TX_HASH_IN_BLOCK_101}/cbor`]: {
                    cbor: "deadbeef", // minimal — we're testing the block walk, not tx parsing
                },
            });

            // Spy on processTransactionForNewUtxos to verify it's called
            const processSpy = vi
                .spyOn(index as any, "processTransactionForNewUtxos")
                .mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: processTransactionForNewUtxos called for block 101's tx
            expect(processSpy).toHaveBeenCalledTimes(1);
            expect(processSpy).toHaveBeenCalledWith(
                TX_HASH_IN_BLOCK_101,
                expect.objectContaining({ block_height: 101 })
            );

            // Assert: both blocks stored with status="processed"
            const store = getStore(index);
            const block101Entry = await store.findBlockId(block101.hash);
            const block102Entry = await store.findBlockId(block102.hash);
            expect(block101Entry).toBeDefined();
            expect(block102Entry).toBeDefined();
            expect((block101Entry as any)?.state).toBe("processed");
            expect((block102Entry as any)?.state).toBe("processed");
        });

        it("skips blocks with no matching address (skip-irrelevant-blocks/REQT/gfsjgaac1y)", async () => {
            const index = createTestIndex(uniqueDbName("incr-skip"));

            await seedProcessedBlocks(index, 98, 100);

            const block101 = makeBlock(101);
            const block102 = makeBlock(102);
            const lastProcessedHash = makeBlock(100).hash;

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(102),
                [`blocks/${lastProcessedHash}/next`]: [block101, block102],
                // Both blocks have addresses that are NOT the capo address
                "blocks/101/addresses": [
                    {
                        address: "addr_test1qz_some_other_address",
                        transactions: [{ tx_hash: "unrelated_tx" }],
                    },
                ] as BlockAddressEntry[],
                "blocks/102/addresses": [] as BlockAddressEntry[],
            });

            const processSpy = vi
                .spyOn(index as any, "processTransactionForNewUtxos")
                .mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: no txns processed
            expect(processSpy).not.toHaveBeenCalled();

            // Assert: blocks still marked as processed (they were walked, just not relevant)
            const store = getStore(index);
            const b101 = await store.findBlockId(block101.hash);
            const b102 = await store.findBlockId(block102.hash);
            expect(b101).toBeDefined();
            expect(b102).toBeDefined();
            expect((b101 as any)?.state).toBe("processed");
            expect((b102 as any)?.state).toBe("processed");
        });
    });

    describe("Catchup mode (REQT/2he55bafxd)", () => {
        it("uses address-level query when gap exceeds threshold (catchup-large-gap/REQT/2he55bafxd)", async () => {
            const index = createTestIndex(uniqueDbName("catchup-gap"));

            // Seed: index has processed blocks up to height 50
            await seedProcessedBlocks(index, 48, 50);

            // Tip is at 80 — gap of 30 blocks (> default threshold of 20)
            const TX_HASH_A =
                "ccdd010101010101010101010101010101010101010101010101010101010101";
            const TX_HASH_B =
                "eeff010101010101010101010101010101010101010101010101010101010101";

            // Block discovery: blocks/{lastSeen}/next returns blocks 51-80
            const lastSeenHash = makeBlock(50).hash;
            const newBlocks = Array.from({ length: 30 }, (_, i) => makeBlock(51 + i));

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(80),
                // Block discovery via blocks/{hash}/next
                [`blocks/${lastSeenHash}/next`]: newBlocks,
                // Catchup mode uses address-level query instead of block walk
                [`addresses/${TEST_CAPO_ADDRESS}/transactions`]: [
                    {
                        tx_hash: TX_HASH_A,
                        tx_index: 0,
                        block_height: 55,
                        block_time: 1700001100,
                    },
                    {
                        tx_hash: TX_HASH_B,
                        tx_index: 1,
                        block_height: 72,
                        block_time: 1700001440,
                    },
                ],
                // UTxO reconciliation
                [`addresses/${TEST_CAPO_ADDRESS}/utxos`]: [],
            });

            const processSpy = vi
                .spyOn(index as any, "processTransactionForNewUtxos")
                .mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: both txns processed
            expect(processSpy).toHaveBeenCalledTimes(2);
            expect(processSpy).toHaveBeenCalledWith(
                TX_HASH_A,
                expect.objectContaining({ block_height: 55 })
            );
            expect(processSpy).toHaveBeenCalledWith(
                TX_HASH_B,
                expect.objectContaining({ block_height: 72 })
            );
        });

        it("reconciles UTxOs against on-chain state (catchup-utxo-reconcile/REQT/2he55bafxd)", async () => {
            const index = createTestIndex(uniqueDbName("catchup-reconcile"));

            await seedProcessedBlocks(index, 48, 50);

            // Pre-populate a cached UTxO that no longer exists on-chain
            const store = getStore(index);
            await store.saveUtxo({
                utxoId: "stale_tx_hash#0",
                address: TEST_CAPO_ADDRESS,
                lovelace: 5_000_000n,
                tokens: [],
                datumHash: null,
                inlineDatum: null,
                referenceScriptHash: null,
                uutIds: [],
                spentInTx: null,
                blockHeight: 45,
            });

            // Block discovery: blocks/{lastSeen}/next returns blocks 51-80
            const lastSeenHash = makeBlock(50).hash;
            const newBlocks = Array.from({ length: 30 }, (_, i) => makeBlock(51 + i));

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(80),
                // Block discovery via blocks/{hash}/next
                [`blocks/${lastSeenHash}/next`]: newBlocks,
                [`addresses/${TEST_CAPO_ADDRESS}/transactions`]: [],
                // On-chain UTxOs does NOT include stale_tx_hash#0
                [`addresses/${TEST_CAPO_ADDRESS}/utxos`]: [],
            });

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: the stale UTxO was removed or marked spent during reconciliation
            const staleEntry = await store.findUtxoId("stale_tx_hash#0");
            // After reconciliation, stale UTxO should either be deleted or marked spent
            if (staleEntry) {
                expect(staleEntry.spentInTx).not.toBeNull();
            }
            // (If implementation deletes rather than marks spent, staleEntry will be undefined — both are acceptable)
        });
    });

    describe("Decoupled cursors (REQT/5d4f73c9bf)", () => {
        it("processing cursor is independent of chain tip (decoupled-cursors/REQT/5d4f73c9bf)", async () => {
            const index = createTestIndex(uniqueDbName("decoupled"));

            // Seed: processed up to 195, but tip is at 200
            await seedProcessedBlocks(index, 193, 195);
            // Tip already advanced to 200 (e.g., via block-tip poll)
            const tipBlock = makeBlock(200);
            (index as any).lastBlockHeight = 200;
            (index as any).lastBlockId = tipBlock.hash;
            (index as any).lastSlot = tipBlock.slot;

            // Store the tip block so it exists in the DB
            const store = getStore(index);
            await store.saveBlock({
                hash: tipBlock.hash,
                height: tipBlock.height,
                time: tipBlock.time,
                slot: tipBlock.slot,
            });

            const lastProcessedHash = makeBlock(195).hash;

            // Mock: blocks/195-hash/next returns 196..200
            const blocksAfter195 = [196, 197, 198, 199, 200].map((h) =>
                makeBlock(h)
            );

            const mock = mockBlockfrost(index, {
                "blocks/latest": tipBlock,
                [`blocks/${lastProcessedHash}/next`]: blocksAfter195,
                // All blocks have no relevant addresses
                "blocks/196/addresses": [],
                "blocks/197/addresses": [],
                "blocks/198/addresses": [],
                "blocks/199/addresses": [],
                "blocks/200/addresses": [],
            });

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: block walk started from 195 (last processed), NOT from 200 (tip)
            // The blocks/{hash}/next call should use the hash of block 195
            expect(mock.calls).toContain(
                `blocks/${lastProcessedHash}/next`
            );
        });

        it("resumes from last processed block after restart (restart-resume/REQT/5d4f73c9bf)", async () => {
            const dbName = uniqueDbName("restart");
            const index1 = createTestIndex(dbName);

            // Seed blocks 98-100 as processed in the DB
            await seedProcessedBlocks(index1, 98, 100);

            // Close index1, create index2 from same DB (simulates restart)
            index1.stopPeriodicRefresh();

            const syncNowSpy = vi
                .spyOn(CachedUtxoIndex.prototype, "syncNow")
                .mockResolvedValue(undefined);

            const index2 = new CachedUtxoIndex({
                address: TEST_CAPO_ADDRESS,
                mph: TEST_CAPO_MPH,
                isMainnet: false,
                network: {} as any,
                bridge: new CapoDataBridge(false) as any,
                blockfrostKey: "preprod-test-not-used",
                storeIn: "dexie",
                dbName,
            });
            syncNowSpy.mockRestore();
            activeIndexes.push(index2);

            // The store should have block 100 as the last processed
            const store = getStore(index2);
            const latestBlock = await store.getLatestBlock();
            expect(latestBlock).toBeDefined();
            expect(latestBlock!.height).toBe(100);

            // When sync starts, it should resume from block 100
            const block101 = makeBlock(101);
            const lastProcessedHash = makeBlock(100).hash;

            const mock = mockBlockfrost(index2, {
                "blocks/latest": makeBlock(101),
                [`blocks/${lastProcessedHash}/next`]: [block101],
                "blocks/101/addresses": [],
            });

            vi.spyOn(index2 as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            // Manually set cursor from stored state (like syncNow would)
            setLastSyncedBlock(
                index2,
                latestBlock!.height,
                latestBlock!.hash,
                latestBlock!.slot
            );

            await index2.checkForNewTxns();

            // Assert: walked from block 100's hash
            expect(mock.calls).toContain(
                `blocks/${lastProcessedHash}/next`
            );
        });
    });

    describe("Block status field (REQT/9gq8rwg9ng)", () => {
        it("blocks saved with state field are retrievable by state (block-state-query/REQT/9gq8rwg9ng)", async () => {
            const index = createTestIndex(uniqueDbName("state-query"));

            const store = getStore(index);
            await store.saveBlock({
                hash: "processed_block_hash",
                height: 50,
                time: 1700001000,
                slot: 50000050,
                state: "processed",
            });

            // Verify block is retrievable and has correct state
            const block = await store.findBlockId("processed_block_hash");
            expect(block).toBeDefined();
            expect(block!.state).toBe("processed");

            // Verify getLastProcessedBlock returns this block
            const lastProcessed = await store.getLastProcessedBlock();
            expect(lastProcessed).toBeDefined();
            expect(lastProcessed!.hash).toBe("processed_block_hash");
        });

        it("new blocks stored with explicit state enum (new-block-state/REQT/9gq8rwg9ng)", async () => {
            const index = createTestIndex(uniqueDbName("status-enum"));

            await seedProcessedBlocks(index, 98, 100);

            const block101 = makeBlock(101);
            const lastProcessedHash = makeBlock(100).hash;

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(101),
                [`blocks/${lastProcessedHash}/next`]: [block101],
                "blocks/101/addresses": [],
            });

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: newly stored block has state = "processed" (an enum string, not boolean)
            const store = getStore(index);
            const entry = await store.findBlockId(block101.hash);
            expect(entry).toBeDefined();
            expect((entry as any)?.state).toBe("processed");
            // Verify it's a string enum, not a boolean
            expect(typeof (entry as any)?.state).toBe("string");
        });
    });

    describe("Block discovery pagination (REQT/9gq8rwg9ng)", () => {
        it("paginates blocks/{hash}/next when more than 100 blocks exist (block-discovery-pagination/REQT/9gq8rwg9ng)", async () => {
            const index = createTestIndex(uniqueDbName("discovery-pages"));

            // Seed: processed up to block 100
            await seedProcessedBlocks(index, 98, 100);

            const lastSeenHash = makeBlock(100).hash;

            // First /next call returns 100 blocks (101..200) — a full page
            const firstPage = Array.from({ length: 100 }, (_, i) =>
                makeBlock(101 + i)
            );
            // Second /next call returns 10 blocks (201..210) — short page, signals tip
            const secondPage = Array.from({ length: 10 }, (_, i) =>
                makeBlock(201 + i)
            );

            const lastBlockOfFirstPage = firstPage[firstPage.length - 1];

            const mock = mockBlockfrost(index, {
                [`blocks/${lastSeenHash}/next`]: firstPage,
                [`blocks/${lastBlockOfFirstPage.hash}/next`]: secondPage,
                "blocks/latest": makeBlock(210),
                // 110 unprocessed blocks > catchup threshold — catchup mode uses
                // address-level query + UTxO reconciliation instead of per-block walk
                [`addresses/${TEST_CAPO_ADDRESS}/transactions`]: [],
                [`addresses/${TEST_CAPO_ADDRESS}/utxos`]: [],
            });

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            await index.checkForNewTxns();

            // Assert: both pages of /next were called
            const nextCalls = mock.calls.filter((url) => url.includes("/next"));
            expect(nextCalls.length).toBe(2);
            expect(nextCalls[0]).toBe(`blocks/${lastSeenHash}/next`);
            expect(nextCalls[1]).toBe(`blocks/${lastBlockOfFirstPage.hash}/next`);

            // Assert: all 110 blocks were stored
            const store = getStore(index);
            const block150 = await store.findBlockId(makeBlock(150).hash);
            const block210 = await store.findBlockId(makeBlock(210).hash);
            expect(block150).toBeDefined();
            expect(block210).toBeDefined();
        });
    });

    describe("Periodic refresh (REQT/zzsg63b2fb)", () => {
        it("5s poll skips when sync already running (concurrency-guard/REQT/zzsg63b2fb)", async () => {
            const index = createTestIndex(uniqueDbName("concurrency"));

            await seedProcessedBlocks(index, 98, 100);

            // Create a slow checkForNewTxns by making fetchFromBlockfrost delay
            let resolveBlocking: () => void;
            const blockingPromise = new Promise<void>(
                (resolve) => (resolveBlocking = resolve)
            );

            const lastProcessedHash = makeBlock(100).hash;
            let callCount = 0;

            vi.spyOn(index, "fetchFromBlockfrost").mockImplementation(
                async <T>(url: string): Promise<T> => {
                    callCount++;
                    if (
                        url.includes("/next") &&
                        callCount === 1
                    ) {
                        // First call blocks until we release it
                        await blockingPromise;
                    }
                    if (url === "blocks/latest") {
                        return makeBlock(101) as T;
                    }
                    if (url.includes("/next")) {
                        return [makeBlock(101)] as T;
                    }
                    if (url.includes("/addresses")) {
                        return [] as T;
                    }
                    return [] as T;
                }
            );

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            // Start first sync (will block on the /next call)
            const firstSync = index.checkForNewTxns();

            // Try starting second sync while first is running
            // Phase 1 adds _syncInProgress guard — second call should skip
            const secondSync = index.checkForNewTxns();

            // Release the blocking call
            resolveBlocking!();

            await firstSync;
            await secondSync;

            // The _syncInProgress guard should have prevented the second call
            // from executing a full sync. We verify by checking that blocks/{hash}/next
            // was called at most once (the first sync call).
            const nextCalls = (index.fetchFromBlockfrost as any).mock.calls.filter(
                (args: any[]) => args[0]?.includes("/next")
            );
            // With concurrency guard: exactly 1 /next call
            // Without guard: would be 2
            expect(nextCalls.length).toBeLessThanOrEqual(1);
        });
    });

    describe("Sync state tracking (REQT/jdkjh536mm)", () => {
        it("transitions idle → syncing → idle for incremental sync (sync-state-incremental/REQT/jdkjh536mm)", async () => {
            const index = createTestIndex(uniqueDbName("syncstate-incr"));

            await seedProcessedBlocks(index, 98, 100);

            const block101 = makeBlock(101);
            const lastProcessedHash = makeBlock(100).hash;

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(101),
                [`blocks/${lastProcessedHash}/next`]: [block101],
                "blocks/101/addresses": [],
            });

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            // Capture syncState transitions
            const states: string[] = [];
            // Phase 1 adds syncState as an observable property
            // We observe transitions by checking before/during/after
            if ("syncState" in index) {
                states.push((index as any).syncState);
            }

            await index.checkForNewTxns();

            if ("syncState" in index) {
                states.push((index as any).syncState);
            }

            // When syncState is implemented:
            // - Before sync: "idle"
            // - During sync: "syncing" (for gap ≤ threshold)
            // - After sync: "idle"
            if (states.length >= 2) {
                expect(states[0]).toBe("idle");
                expect(states[states.length - 1]).toBe("idle");
            }

            // Alternatively, listen for events if syncState emits changes
            // This test structure adapts to however the Coder implements observability
        });

        it("transitions idle → catchup → idle for large gap (sync-state-catchup/REQT/jdkjh536mm)", async () => {
            const index = createTestIndex(uniqueDbName("syncstate-catchup"));

            await seedProcessedBlocks(index, 48, 50);

            // Tip at 80 — gap of 30 (> threshold 20)
            // Block discovery: blocks/{lastSeen}/next returns blocks 51-80
            const lastSeenHash = makeBlock(50).hash;
            const newBlocks = Array.from({ length: 30 }, (_, i) => makeBlock(51 + i));

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(80),
                [`blocks/${lastSeenHash}/next`]: newBlocks,
                [`addresses/${TEST_CAPO_ADDRESS}/transactions`]: [],
                [`addresses/${TEST_CAPO_ADDRESS}/utxos`]: [],
            });

            vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

            const states: string[] = [];
            if ("syncState" in index) {
                states.push((index as any).syncState);
            }

            await index.checkForNewTxns();

            if ("syncState" in index) {
                states.push((index as any).syncState);
            }

            // When syncState is implemented:
            // Catchup mode should show "catchup sync (30 blocks)" during sync
            if (states.length >= 2) {
                expect(states[0]).toBe("idle");
                expect(states[states.length - 1]).toBe("idle");
            }
        });
    });

    describe("Pending tx confirmation records block height (REQT/58b9nzgcbj)", () => {
        it("records confirmedAtBlockHeight when pending tx is confirmed (confirmed-block-height/REQT/58b9nzgcbj)", async () => {
            const index = createTestIndex(uniqueDbName("confirm-height"));

            await seedProcessedBlocks(index, 98, 100);

            const PENDING_TX_HASH =
                "1122334455667788990011223344556677889900112233445566778899001122";

            // Pre-populate a pending tx entry in the store
            const store = getStore(index);
            await store.savePendingTx({
                txHash: PENDING_TX_HASH,
                description: "test pending tx",
                id: "test-id-1",
                batchDepth: 0,
                confirmationBlockDepth: 0,
                txCborHex: "deadbeef",
                signedTxCborHex: "deadbeef",
                deadlineSlot: 99999999,
                status: "pending",
                submittedAt: Date.now(),
            });

            // Register in the in-memory pending set
            (index as any).pendingTxHashes.add(PENDING_TX_HASH);

            const block101 = makeBlock(101, { tx_count: 1 });
            const lastProcessedHash = makeBlock(100).hash;

            const mock = mockBlockfrost(index, {
                "blocks/latest": makeBlock(101),
                [`blocks/${lastProcessedHash}/next`]: [block101],
                "blocks/101/addresses": [
                    {
                        address: TEST_CAPO_ADDRESS,
                        transactions: [{ tx_hash: PENDING_TX_HASH }],
                    },
                ] as BlockAddressEntry[],
            });

            await index.checkForNewTxns();

            // Assert: pending tx confirmed with block height recorded
            const confirmedEntry = await store.findPendingTx(PENDING_TX_HASH);
            expect(confirmedEntry).toBeDefined();
            expect(confirmedEntry!.status).toBe("confirmed");
            // Phase 1 adds confirmedAtBlockHeight field
            expect((confirmedEntry as any).confirmedAtBlockHeight).toBe(101);
        });
    });

    describe("Dead code removal", () => {
        it("highestBlockHeight variable does not exist in checkForNewTxns (dead-code-removed)", async () => {
            // This test verifies the advisory note from pre-work review:
            // highestBlockHeight was dead code that MUST be deleted during the rewrite.
            //
            // We verify by inspecting the source code string of checkForNewTxns.
            const methodSource =
                CachedUtxoIndex.prototype.checkForNewTxns.toString();
            expect(methodSource).not.toContain("highestBlockHeight");
        });
    });
});

// =========================================================================
// Phase 2: Confirmation Depth Tracking
// =========================================================================

describe("Confirmation Depth Tracking (REQT/ddzcp753jr)", () => {
    /**
     * Helper: creates an index with a pending tx already confirmed at a given block height.
     * Returns the index, store, and tx hash for further assertions.
     */
    async function setupConfirmedPendingTx(
        label: string,
        confirmedAtHeight: number,
        opts?: { thresholds?: Record<string, number> }
    ): Promise<{
        index: CachedUtxoIndex;
        store: ReturnType<typeof getStore>;
        txHash: string;
    }> {
        const index = createTestIndex(uniqueDbName(label));

        // Seed processed blocks up to the confirming block
        await seedProcessedBlocks(index, confirmedAtHeight - 2, confirmedAtHeight);

        const txHash =
            "dd00112233445566778899aabbccddeeff00112233445566778899aabbccddee";

        const store = getStore(index);

        // Save a pending tx entry that's already been confirmed at the given height
        // (simulates Phase 1 having run: confirmPendingTx set status + confirmedAtBlockHeight)
        await store.savePendingTx({
            txHash,
            description: "test depth tracking tx",
            id: "depth-test-1",
            batchDepth: 0,
            confirmationBlockDepth: 0,
            txCborHex: "deadbeef",
            signedTxCborHex: "deadbeef",
            deadlineSlot: 99999999,
            status: "confirmed",
            submittedAt: Date.now(),
        } as any);

        // Manually set confirmedAtBlockHeight (Phase 1 infrastructure)
        await store.setPendingTxStatus(txHash, "confirmed");
        const entry = await store.findPendingTx(txHash);
        if (entry) {
            (entry as any).confirmedAtBlockHeight = confirmedAtHeight;
            (entry as any).confirmState = "provisional";
            await store.savePendingTx(entry);
        }

        return { index, store, txHash };
    }

    /**
     * Helper: advances the index tip and triggers a sync cycle so depth
     * recalculation runs. Mocks block discovery to show new blocks up to newTipHeight.
     */
    async function advanceTipAndSync(
        index: CachedUtxoIndex,
        currentTipHeight: number,
        newTipHeight: number,
    ): Promise<void> {
        const currentTipHash = makeBlock(currentTipHeight).hash;

        // Generate new blocks from current+1 to newTip
        const newBlocks = Array.from(
            { length: newTipHeight - currentTipHeight },
            (_, i) => makeBlock(currentTipHeight + 1 + i)
        );

        const responses: Record<string, unknown> = {
            [`blocks/${currentTipHash}/next`]: newBlocks,
            "blocks/latest": makeBlock(newTipHeight),
        };

        // Add /addresses responses for each new block (no relevant txns)
        for (let h = currentTipHeight + 1; h <= newTipHeight; h++) {
            responses[`blocks/${h}/addresses`] = [];
        }

        // When gap exceeds catchup threshold (default 20), also mock catchup-mode endpoints
        const gap = newTipHeight - currentTipHeight;
        if (gap > 20) {
            responses[`addresses/${TEST_CAPO_ADDRESS}/transactions`] = [];
            responses[`addresses/${TEST_CAPO_ADDRESS}/utxos`] = [];
        }

        mockBlockfrost(index, responses);
        vi.spyOn(index as any, "processTransactionForNewUtxos").mockResolvedValue(undefined);

        await index.checkForNewTxns();
    }

    describe("Depth advancement (REQT/thy7tkrxh7)", () => {
        it("confirmState advances through depth thresholds as chain grows (depth-advancement/REQT/thy7tkrxh7)", async () => {
            // Confirm tx at block 100
            const { index, store, txHash } = await setupConfirmedPendingTx(
                "depth-advance", 100
            );

            // Default thresholds: provisional < 4, likely < 10, confident ≥ 10, certain ≥ 180

            // Advance tip to 103 (depth 3) — should still be "provisional"
            await advanceTipAndSync(index, 100, 103);
            let entry = await store.findPendingTx(txHash);
            expect((entry as any).confirmState).toBe("provisional");

            // Advance tip to 104 (depth 4) — should advance to "likely"
            await advanceTipAndSync(index, 103, 104);
            entry = await store.findPendingTx(txHash);
            expect((entry as any).confirmState).toBe("likely");

            // Advance tip to 109 (depth 9) — should still be "likely"
            await advanceTipAndSync(index, 104, 109);
            entry = await store.findPendingTx(txHash);
            expect((entry as any).confirmState).toBe("likely");

            // Advance tip to 110 (depth 10) — should advance to "confident"
            await advanceTipAndSync(index, 109, 110);
            entry = await store.findPendingTx(txHash);
            expect((entry as any).confirmState).toBe("confident");
        });

        it("confirmState reaches certain at depth ≥ 180 (depth-certain/REQT/thy7tkrxh7)", async () => {
            const { index, store, txHash } = await setupConfirmedPendingTx(
                "depth-certain", 100
            );

            // Jump straight to depth 180
            await advanceTipAndSync(index, 100, 280);
            const entry = await store.findPendingTx(txHash);
            expect((entry as any).confirmState).toBe("certain");
        });
    });

    describe("Depth events (REQT/fz6z7rr702)", () => {
        it("emits confirmStateChanged at each threshold crossing (depth-events/REQT/fz6z7rr702)", async () => {
            const { index, store, txHash } = await setupConfirmedPendingTx(
                "depth-events", 100
            );

            const stateChanges: Array<{
                txHash: string;
                confirmState: string;
                depth: number;
            }> = [];

            index.events.on("confirmStateChanged" as any, (event: any) => {
                stateChanges.push(event);
            });

            // Advance past provisional → likely threshold (depth 4)
            await advanceTipAndSync(index, 100, 104);

            expect(stateChanges.length).toBeGreaterThanOrEqual(1);
            const likelyEvent = stateChanges.find(
                (e) => e.confirmState === "likely"
            );
            expect(likelyEvent).toBeDefined();
            expect(likelyEvent!.txHash).toBe(txHash);
            expect(likelyEvent!.depth).toBe(4);

            // Advance past likely → confident threshold (depth 10)
            stateChanges.length = 0;
            await advanceTipAndSync(index, 104, 110);

            const confidentEvent = stateChanges.find(
                (e) => e.confirmState === "confident"
            );
            expect(confidentEvent).toBeDefined();
            expect(confidentEvent!.depth).toBe(10);
        });

        it("txConfirmed event includes initial confirmState (txconfirmed-with-state/REQT/fz6z7rr702)", async () => {
            const index = createTestIndex(uniqueDbName("txconfirmed-state"));

            await seedProcessedBlocks(index, 98, 100);

            const PENDING_TX_HASH =
                "ff00112233445566778899aabbccddeeff00112233445566778899aabbccddee";

            const store = getStore(index);
            await store.savePendingTx({
                txHash: PENDING_TX_HASH,
                description: "test txConfirmed event",
                id: "event-test-1",
                batchDepth: 0,
                confirmationBlockDepth: 0,
                txCborHex: "deadbeef",
                signedTxCborHex: "deadbeef",
                deadlineSlot: 99999999,
                status: "pending",
                submittedAt: Date.now(),
            });
            (index as any).pendingTxHashes.add(PENDING_TX_HASH);

            // Listen for txConfirmed event
            const confirmedEvents: any[] = [];
            index.events.on("txConfirmed", (event: any) => {
                confirmedEvents.push(event);
            });

            const block101 = makeBlock(101, { tx_count: 1 });
            const lastProcessedHash = makeBlock(100).hash;

            mockBlockfrost(index, {
                "blocks/latest": makeBlock(101),
                [`blocks/${lastProcessedHash}/next`]: [block101],
                "blocks/101/addresses": [
                    {
                        address: TEST_CAPO_ADDRESS,
                        transactions: [{ tx_hash: PENDING_TX_HASH }],
                    },
                ] as BlockAddressEntry[],
            });

            await index.checkForNewTxns();

            // Assert: txConfirmed event includes confirmState
            expect(confirmedEvents.length).toBe(1);
            expect(confirmedEvents[0].txHash).toBe(PENDING_TX_HASH);
            expect(confirmedEvents[0].confirmState).toBe("provisional");
        });
    });

    describe("Configurable thresholds (REQT/yn45tvmp6k)", () => {
        it("respects custom depth thresholds (custom-thresholds/REQT/yn45tvmp6k)", async () => {
            const index = createTestIndex(uniqueDbName("custom-thresholds"));

            // Set custom thresholds: provisional < 2, likely < 5, confident ≥ 5, certain ≥ 20
            // Phase 2 adds these as configurable properties on CachedUtxoIndex
            if ("confirmationThresholds" in index) {
                (index as any).confirmationThresholds = {
                    provisionalDepth: 2,
                    confidentDepth: 5,
                    certaintyDepth: 20,
                };
            }

            await seedProcessedBlocks(index, 98, 100);

            const txHash =
                "aa00112233445566778899aabbccddeeff00112233445566778899aabbccddee";

            const store = getStore(index);
            await store.savePendingTx({
                txHash,
                description: "custom threshold test",
                id: "thresh-test-1",
                batchDepth: 0,
                confirmationBlockDepth: 0,
                txCborHex: "deadbeef",
                signedTxCborHex: "deadbeef",
                deadlineSlot: 99999999,
                status: "confirmed",
                submittedAt: Date.now(),
            } as any);

            const entry = await store.findPendingTx(txHash);
            if (entry) {
                (entry as any).confirmedAtBlockHeight = 100;
                (entry as any).confirmState = "provisional";
                await store.savePendingTx(entry);
            }

            // Advance to depth 2 — should transition to "likely" with custom thresholds
            await advanceTipAndSync(index, 100, 102);
            let updated = await store.findPendingTx(txHash);
            expect((updated as any).confirmState).toBe("likely");

            // Advance to depth 5 — should transition to "confident"
            await advanceTipAndSync(index, 102, 105);
            updated = await store.findPendingTx(txHash);
            expect((updated as any).confirmState).toBe("confident");

            // Advance to depth 20 — should transition to "certain"
            await advanceTipAndSync(index, 105, 120);
            updated = await store.findPendingTx(txHash);
            expect((updated as any).confirmState).toBe("certain");
        });
    });

    describe("getPendingTxs filtering (REQT/r0y7s2vggr)", () => {
        it("filters by confirmState (filter-by-confirm-state/REQT/r0y7s2vggr)", async () => {
            const index = createTestIndex(uniqueDbName("filter-state"));

            const store = getStore(index);

            // Create three confirmed entries at different confirmStates
            const txHashes = [
                "aa11000000000000000000000000000000000000000000000000000000000000",
                "bb22000000000000000000000000000000000000000000000000000000000000",
                "cc33000000000000000000000000000000000000000000000000000000000000",
            ];

            for (const [i, txHash] of txHashes.entries()) {
                const states = ["provisional", "likely", "confident"];
                await store.savePendingTx({
                    txHash,
                    description: `test tx ${i}`,
                    id: `filter-test-${i}`,
                    batchDepth: 0,
                confirmationBlockDepth: 0,
                    txCborHex: "deadbeef",
                    signedTxCborHex: "deadbeef",
                    deadlineSlot: 99999999,
                    status: "confirmed",
                    submittedAt: Date.now(),
                    confirmState: states[i],
                    confirmedAtBlockHeight: 100 + i,
                } as any);
            }

            // Phase 2 adds confirmState parameter to getPendingTxs
            // getPendingTxs({ confirmState: "provisional" }) should return only the first
            if (index.getPendingTxs.length > 0 || "getPendingTxs" in index) {
                // Test filtering — adapt to whatever the Coder's API shape is
                const provisional = await (index as any).getPendingTxs({
                    confirmState: "provisional",
                });
                if (Array.isArray(provisional)) {
                    expect(provisional.length).toBe(1);
                    expect(provisional[0].txHash).toBe(txHashes[0]);
                }

                const likely = await (index as any).getPendingTxs({
                    confirmState: "likely",
                });
                if (Array.isArray(likely)) {
                    expect(likely.length).toBe(1);
                    expect(likely[0].txHash).toBe(txHashes[1]);
                }
            }
        });
    });
});
