/**
 * CachedUtxoIndex Unit Tests
 *
 * These tests run against live preprod Blockfrost data using a real Capo instance.
 * Requires BLOCKFROST_API_KEY environment variable to be set to a preprod key.
 *
 * Efficiency: Read-only query tests share a single synced index to minimize
 * Blockfrost API calls. Tests requiring isolation can create separate databases
 * which are automatically registered for cleanup.
 */

// MUST be first - polyfills IndexedDB globally for Node.js
import "fake-indexeddb/auto";

import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    afterEach,
    vi,
    beforeEach,
} from "vitest";
import Dexie from "dexie";
import { makeBlockfrostV0Client } from "@helios-lang/tx-utils";

import {
    makeAddress,
    makeDummyAddress,
    makeTxId,
    makeTxInput,
    makeTxOutput,
    makeTxOutputId,
    makeAssetClass,
    makeValue,
} from "@helios-lang/ledger";
import type { TxInput } from "@helios-lang/ledger";
import { CachedUtxoIndex } from "./CachedUtxoIndex.js";
import { CapoDataBridge } from "../../helios/scriptBundling/CapoHeliosBundle.bridge.js";
import {
    setLastSyncedBlock,
    getStore,
    closeStore,
    createDbCleanupRegistry,
    getAllBlocks,
    getAllTxs,
    copyIndexData,
    copyIndexDataUpToBlock,
    deleteUtxo,
    deleteTx,
    deleteUtxos,
    getUtxosFromTx,
    findBlockForTx,
    findRecentTxAndBlock,
    findUtxoWithReferenceScript,
    findCharterMintBlock,
    createPartialSyncIndex,
    createFirstBlockOnlyIndex,
} from "./CachedUtxoIndex.testHelpers.js";

// Test configuration for preprod
const TEST_CAPO_ADDRESS =
    "addr_test1wzz7gwv7yc5r4kfc5qau7nf67pc2pp4jz7vhqvmcs63wddsyvhdfz";
const TEST_CAPO_MPH =
    "6b413535a846297b5d8a949663f787b11bae34f24835f2f72dbfd128";
const SHARED_DB_NAME = "StellarDappIndex-test-shared";

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY;

// Registry of isolated indexes to clean up after each test
// Maps dbName -> index (for closing Dexie connections before deletion)
const isolatedIndexRegistry: Map<string, CachedUtxoIndex | undefined> =
    new Map();

/**
 * Creates a unique database name for isolated tests and registers it for cleanup.
 */
function createIsolatedDbName(testName?: string): string {
    const suffix = testName ? `-${testName}` : "";
    const dbName = `StellarDappIndex-test${suffix}-${Date.now()}`;
    isolatedIndexRegistry.set(dbName, undefined);
    return dbName;
}

/**
 * Registers an index for cleanup. Call after creating the index.
 */
function registerIsolatedIndex(dbName: string, index: CachedUtxoIndex): void {
    isolatedIndexRegistry.set(dbName, index);
}

if (!BLOCKFROST_API_KEY) {
    // Single failing test when API key is not provided
    describe("CachedUtxoIndex", () => {
        it("requires BLOCKFROST_API_KEY environment variable", () => {
            expect.fail(
                "BLOCKFROST_API_KEY environment variable is not set.\n" +
                    "To run these tests, set BLOCKFROST_API_KEY to a valid preprod Blockfrost API key:\n" +
                    "  BLOCKFROST_API_KEY=preprodXXXXXXXX pnpm test CachedUtxoIndex",
            );
        });
    });
} else {
    // Full test suite when API key is available
    describe("CachedUtxoIndex", () => {
        // Shared resources for read-only tests
        let sharedIndex: CachedUtxoIndex;
        let network: ReturnType<typeof makeBlockfrostV0Client>;
        let bridge: CapoDataBridge;

        // Reusable config for creating isolated indexes
        let baseConfig: {
            address: string;
            mph: string;
            isMainnet: boolean;
            network: ReturnType<typeof makeBlockfrostV0Client>;
            bridge: CapoDataBridge;
            blockfrostKey: string;
            storeIn: "dexie";
        };

        // Setup shared resources once for the entire suite
        beforeAll(async () => {
            // Create network client for preprod
            network = makeBlockfrostV0Client("preprod", BLOCKFROST_API_KEY);

            // Create bridge for charter datum decoding
            bridge = new CapoDataBridge(false); // false = not mainnet

            // Initialize reusable config
            baseConfig = {
                address: TEST_CAPO_ADDRESS,
                mph: TEST_CAPO_MPH,
                isMainnet: false,
                network,
                bridge,
                blockfrostKey: BLOCKFROST_API_KEY,
                storeIn: "dexie",
            };

            // Create and sync the shared index ONCE
            sharedIndex = new CachedUtxoIndex({
                address: TEST_CAPO_ADDRESS,
                mph: TEST_CAPO_MPH,
                isMainnet: false,
                network,
                bridge,
                blockfrostKey: BLOCKFROST_API_KEY,
                storeIn: "dexie",
                dbName: SHARED_DB_NAME,
            });

            // Wait for sync to complete
            await sharedIndex.syncNow();
        });

        // Clean up isolated test databases after each test
        afterEach(async () => {
            
            for (const [dbName, index] of isolatedIndexRegistry) {
                try {
                    // Close Dexie connection first to avoid "Another connection wants to delete" warnings
                    if (index) {
                        closeStore(index);
                    }
                    await Dexie.delete(dbName);
                } catch (e) {
                    // Database might not exist, which is fine
                }
            }
            isolatedIndexRegistry.clear();
        });

        afterAll(async () => {
            
            // Stop periodic refresh if running
            if (sharedIndex?.isPeriodicRefreshActive) {
                sharedIndex.stopPeriodicRefresh();
            }
            // Close shared index connection before deleting
            if (sharedIndex) {
                closeStore(sharedIndex);
            }
            // Clean up shared database
            try {
                await Dexie.delete(SHARED_DB_NAME);
            } catch (e) {
                // Database might not exist
            }
        });

        describe("Initialization (isolated)", () => {
            it("should initialize with correct address and mph", async () => {
                const dbName = createIsolatedDbName("init-props");
                const index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                    dbName,
                });

                // Verify properties are correctly set
                expect(index.capoAddress).toBe(TEST_CAPO_ADDRESS);
                expect(index.capoMph).toBe(TEST_CAPO_MPH);
                expect(index.isMainnet()).toBe(false);
            });

            it("should set correct blockfrost base URL for preprod key", async () => {
                const dbName = createIsolatedDbName("init-url");
                const index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                    dbName,
                });

                // The blockfrostBaseUrl should be set for preprod
                expect(index.blockfrostBaseUrl).toBe(
                    "https://cardano-preprod.blockfrost.io",
                );
            });
        });

        describe("Sync and Block Tracking (uses shared index)", () => {
            it("should populate block tracking fields after syncNow completes", async () => {
                // Block tracking fields should be populated from shared sync
                expect(sharedIndex.lastBlockHeight).toBeGreaterThan(0);
                expect(sharedIndex.lastBlockId).toBeTruthy();
                expect(sharedIndex.lastBlockId.length).toBe(64); // Block hash is 64 hex chars
                expect(sharedIndex.lastBlockSlot).toBeGreaterThan(0);
            });

            it("returns wall-clock milliseconds matching CardanoClient contract (now-wall-clock-ms/REQT/gz9a5b8qv)", async () => {
                const before = Date.now();
                const now = sharedIndex.now;
                const after = Date.now();

                // Must be in millisecond range (~1.7T), not slot range (~142M)
                expect(now).toBeGreaterThan(1_000_000_000_000);

                // Must track wall clock
                expect(now).toBeGreaterThanOrEqual(before);
                expect(now).toBeLessThanOrEqual(after);

                // Regression: must NOT equal the block slot (the old broken behavior)
                expect(now).not.toBe(sharedIndex.lastBlockSlot);
            });
        });

        describe("UTXO Queries (uses shared index)", () => {
            it("should find UTXOs by address", async () => {
                const utxos =
                    await sharedIndex.findUtxosByAddress(TEST_CAPO_ADDRESS);

                // The Capo address should have at least the charter UTXO
                expect(utxos.length).toBeGreaterThan(0);

                // Each UTXO should have proper structure
                for (const utxo of utxos) {
                    expect(utxo.utxoId).toBeTruthy();
                    expect(utxo.address).toBe(TEST_CAPO_ADDRESS);
                    expect(typeof utxo.lovelace).toBe("bigint");
                    expect(Array.isArray(utxo.tokens)).toBe(true);
                }
            });

            it("should find UTXOs by asset (capo mph)", async () => {
                const utxos = await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH);

                // Should find at least the charter token
                expect(utxos.length).toBeGreaterThan(0);

                // Each UTXO should have tokens with the capo mph
                for (const utxo of utxos) {
                    const hasCapoToken = utxo.tokens.some(
                        (t) => t.policyId === TEST_CAPO_MPH,
                    );
                    expect(hasCapoToken).toBe(true);
                }
            });

            it("should return all indexed UTXOs with getAllUtxos", async () => {
                const allUtxos = await sharedIndex.getAllUtxos();

                // Should have indexed at least the capo UTXOs
                expect(allUtxos.length).toBeGreaterThan(0);

                // Verify each entry has required fields
                for (const utxo of allUtxos) {
                    expect(utxo.utxoId).toBeTruthy();
                    expect(utxo.address).toBeTruthy();
                    expect(typeof utxo.lovelace).toBe("bigint");
                }
            });

            it("should support pagination in getAllUtxos", async () => {
                const allUtxos = await sharedIndex.getAllUtxos();

                if (allUtxos.length >= 2) {
                    // Test limit
                    const limited = await sharedIndex.getAllUtxos({ limit: 1 });
                    expect(limited.length).toBe(1);

                    // Test offset
                    const offset = await sharedIndex.getAllUtxos({
                        offset: 1,
                        limit: 1,
                    });
                    expect(offset.length).toBe(1);
                    expect(offset[0].utxoId).not.toBe(limited[0].utxoId);
                }
            });
        });

        describe("UUT Lookups (uses shared index)", () => {
            it("should find delegate UUTs after sync", async () => {
                // After sync, delegate UUTs should be cataloged
                // UUT names follow pattern: {purpose}-{12 hex chars}
                // We can check for common delegate types

                // Get all UTXOs and look for any with uutIds
                const allUtxos = await sharedIndex.getAllUtxos();
                const utxosWithUuts = allUtxos.filter(
                    (u) => u.uutIds && u.uutIds.length > 0,
                );

                // A working Capo should have at least some delegate UUTs indexed
                // (mint delegate, spend delegate, etc.)
                expect(utxosWithUuts.length).toBeGreaterThan(0);

                // Each UUT ID should match the expected pattern
                const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
                for (const utxo of utxosWithUuts) {
                    for (const uutId of utxo.uutIds) {
                        expect(uutId).toMatch(uutPattern);
                    }
                }
            });

            it("should find UTXO by specific UUT ID", async () => {
                // First, find a UUT ID from the indexed data
                const allUtxos = await sharedIndex.getAllUtxos();
                const utxoWithUut = allUtxos.find(
                    (u) => u.uutIds && u.uutIds.length > 0,
                );

                if (utxoWithUut && utxoWithUut.uutIds.length > 0) {
                    const uutId = utxoWithUut.uutIds[0];

                    // Look up the UTXO by UUT ID
                    const found = await sharedIndex.findUtxoByUUT(uutId);

                    expect(found).toBeTruthy();
                    expect(found!.utxoId).toBe(utxoWithUut.utxoId);
                    expect(found!.uutIds).toContain(uutId);
                }
            });
        });

        describe("Periodic Refresh (isolated)", () => {
            it("should start and stop periodic refresh", async () => {
                const dbName = createIsolatedDbName("periodic-refresh");
                const index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                    dbName,
                });

                // Initially should not be active
                expect(index.isPeriodicRefreshActive).toBe(false);

                // Start periodic refresh
                index.startPeriodicRefresh();
                expect(index.isPeriodicRefreshActive).toBe(true);

                // Starting again should be idempotent
                index.startPeriodicRefresh();
                expect(index.isPeriodicRefreshActive).toBe(true);

                // Stop periodic refresh
                index.stopPeriodicRefresh();
                expect(index.isPeriodicRefreshActive).toBe(false);

                // Stopping again should be idempotent
                index.stopPeriodicRefresh();
                expect(index.isPeriodicRefreshActive).toBe(false);
            });
        });

        describe("ReadonlyCardanoClient Interface (uses shared index)", () => {
            it("should provide network parameters via parameters property", async () => {
                const params = await sharedIndex.parameters;

                // Network params should have expected properties
                expect(params).toBeTruthy();
                // The params object structure depends on Helios, but it should exist
            });

            it("should check UTXO existence with hasUtxo", async () => {
                // Get a known UTXO
                const allUtxos = await sharedIndex.getAllUtxos();
                expect(allUtxos.length).toBeGreaterThan(0);

                const knownUtxo = allUtxos[0];
                const [txHash, indexStr] = knownUtxo.utxoId.split("#");

                // Import TxOutputId maker
                                const txId = makeTxId(txHash);
                const utxoId = makeTxOutputId(txId, parseInt(indexStr, 10));

                const exists = await sharedIndex.hasUtxo(utxoId);
                expect(exists).toBe(true);
            });
        });

        // ============================================================
        // Plan B Tests: Functions Used During Sync, Testable Post-Sync
        // ============================================================

        describe("findOrFetchTxDetails (uses shared index)", () => {
            it("should return tx from cache without network call", async () => {
                
                // Get a txId that was cached during sync
                const cachedTxs = await getAllTxs(sharedIndex);
                expect(cachedTxs.length).toBeGreaterThan(0);
                const txId = cachedTxs[0].txid;

                // Spy on fetchFromBlockfrost to verify no network call
                const fetchSpy = vi.spyOn(sharedIndex, "fetchFromBlockfrost");

                const tx = await sharedIndex.findOrFetchTxDetails(txId);

                expect(tx).toBeTruthy();
                expect(tx.id().toHex()).toBe(txId);
                expect(fetchSpy).not.toHaveBeenCalled();

                fetchSpy.mockRestore();
            });

            it("should fetch from network on cache miss and cache result", async () => {
                                const cleanupRegistry = createDbCleanupRegistry();

                // Create isolated index WITHOUT copying tx data
                const dbName = createIsolatedDbName("tx-cache-miss");
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                // Get a txId from shared index that is NOT in isolated index
                const utxos = await sharedIndex.getAllUtxos();
                const txId = utxos[0].utxoId.split("#")[0];

                // Verify not in isolated cache
                const isolatedStore = getStore(isolatedIndex);
                const beforeFetch = await isolatedStore.findTxId(txId);
                expect(beforeFetch).toBeUndefined();

                // Fetch - should hit network
                const tx = await isolatedIndex.findOrFetchTxDetails(txId);
                expect(tx).toBeTruthy();
                expect(tx.id().toHex()).toBe(txId);

                // Verify now cached
                const afterFetch = await isolatedStore.findTxId(txId);
                expect(afterFetch).toBeTruthy();
                expect(afterFetch!.txid).toBe(txId);

                await cleanupRegistry.cleanup();
            });

            it("should use cache on second call", async () => {
                                const cleanupRegistry = createDbCleanupRegistry();

                const dbName = createIsolatedDbName("tx-second-call");
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                const utxos = await sharedIndex.getAllUtxos();
                const txId = utxos[0].utxoId.split("#")[0];

                // First call - fetches from network
                await isolatedIndex.findOrFetchTxDetails(txId);

                // Spy for second call
                const fetchSpy = vi.spyOn(isolatedIndex, "fetchFromBlockfrost");

                // Second call - should use cache
                const tx2 = await isolatedIndex.findOrFetchTxDetails(txId);
                expect(tx2.id().toHex()).toBe(txId);
                expect(fetchSpy).not.toHaveBeenCalled();

                fetchSpy.mockRestore();
                await cleanupRegistry.cleanup();
            });
        });

        describe("findOrFetchBlockHeight (uses shared index)", () => {
            it("should return height from cache for lastBlockId", async () => {
                const blockId = sharedIndex.lastBlockId;
                const expectedHeight = sharedIndex.lastBlockHeight;

                // Spy to verify no network call
                const fetchSpy = vi.spyOn(sharedIndex, "fetchFromBlockfrost");

                const height =
                    await sharedIndex.findOrFetchBlockHeight(blockId);

                expect(height).toBe(expectedHeight);
                expect(fetchSpy).not.toHaveBeenCalled();

                fetchSpy.mockRestore();
            });

            it("should fetch and cache uncached block", async () => {
                                const cleanupRegistry = createDbCleanupRegistry();

                const dbName = createIsolatedDbName("block-cache-miss");
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                // Use a block from shared index that isn't in isolated
                const blocks = await getAllBlocks(sharedIndex);
                expect(blocks.length).toBeGreaterThan(0);
                const testBlock = blocks[0];

                // Verify not in isolated cache
                const isolatedStore = getStore(isolatedIndex);
                const beforeFetch = await isolatedStore.findBlockId(
                    testBlock.hash,
                );
                expect(beforeFetch).toBeUndefined();

                // Fetch - should hit network and cache
                const height = await isolatedIndex.findOrFetchBlockHeight(
                    testBlock.hash,
                );
                expect(height).toBe(testBlock.height);

                // Verify now cached
                const afterFetch = await isolatedStore.findBlockId(
                    testBlock.hash,
                );
                expect(afterFetch).toBeTruthy();
                expect(afterFetch!.height).toBe(testBlock.height);

                await cleanupRegistry.cleanup();
            });
        });

        describe("fetchAndStoreLatestBlock (isolated)", () => {
            it("should update state fields after fetching", async () => {
                                const cleanupRegistry = createDbCleanupRegistry();

                const dbName = createIsolatedDbName("latest-block-state");
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                // Initially zero (fresh index, no sync)
                expect(isolatedIndex.lastBlockHeight).toBe(0);
                expect(isolatedIndex.lastBlockId).toBe("");
                expect(isolatedIndex.lastBlockSlot).toBe(0);

                const result = await isolatedIndex.fetchAndStoreLatestBlock();

                // State should be updated
                expect(isolatedIndex.lastBlockHeight).toBeGreaterThan(0);
                expect(isolatedIndex.lastBlockId.length).toBe(64);
                expect(isolatedIndex.lastBlockSlot).toBeGreaterThan(0);

                // Return value should match state
                expect(result.height).toBe(isolatedIndex.lastBlockHeight);
                expect(result.hash).toBe(isolatedIndex.lastBlockId);
                expect(result.slot).toBe(isolatedIndex.lastBlockSlot);

                await cleanupRegistry.cleanup();
            });

            it("should store block in database", async () => {
                                const cleanupRegistry = createDbCleanupRegistry();

                const dbName = createIsolatedDbName("latest-block-store");
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                const result = await isolatedIndex.fetchAndStoreLatestBlock();

                // Verify block was stored
                const store = getStore(isolatedIndex);
                const storedBlock = await store.findBlockId(result.hash);

                expect(storedBlock).toBeTruthy();
                expect(storedBlock!.height).toBe(result.height);
                expect(storedBlock!.slot).toBe(result.slot);
                expect(storedBlock!.time).toBe(result.time);

                await cleanupRegistry.cleanup();
            });
        });

        describe("Data Conversion Verification (uses shared index)", () => {
            it("should have correct UTXO structure in indexed data", async () => {
                const utxos = await sharedIndex.getAllUtxos();
                expect(utxos.length).toBeGreaterThan(0);

                for (const utxo of utxos) {
                    // Required fields
                    expect(utxo.utxoId).toBeTruthy();
                    expect(utxo.utxoId).toMatch(/^[0-9a-f]{64}#\d+$/);
                    expect(utxo.address).toBeTruthy();
                    expect(typeof utxo.lovelace).toBe("bigint");
                    expect(Array.isArray(utxo.tokens)).toBe(true);
                    expect(Array.isArray(utxo.uutIds)).toBe(true);

                    // Optional fields have correct types if present
                    if (utxo.datumHash) {
                        expect(typeof utxo.datumHash).toBe("string");
                        expect(utxo.datumHash.length).toBe(64);
                    }
                    if (utxo.inlineDatum) {
                        expect(typeof utxo.inlineDatum).toBe("string");
                    }
                }
            });

            it("should have correct token structure", async () => {
                const utxos = await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH);
                expect(utxos.length).toBeGreaterThan(0);

                for (const utxo of utxos) {
                    for (const token of utxo.tokens) {
                        expect(typeof token.policyId).toBe("string");
                        expect(token.policyId.length).toBe(56); // MPH is 28 bytes = 56 hex
                        expect(typeof token.tokenName).toBe("string");
                        expect(typeof token.quantity).toBe("bigint");
                        expect(token.quantity).toBeGreaterThan(0n);
                    }
                }
            });

            it("should preserve UUT IDs with correct format", async () => {
                const utxos = await sharedIndex.getAllUtxos();
                const utxosWithUuts = utxos.filter((u) => u.uutIds.length > 0);

                // Should have at least delegate UUTs
                expect(utxosWithUuts.length).toBeGreaterThan(0);

                const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
                for (const utxo of utxosWithUuts) {
                    for (const uutId of utxo.uutIds) {
                        expect(uutId).toMatch(uutPattern);
                    }
                }
            });

            it("should have correct block structure in indexed data", async () => {
                                const blocks = await getAllBlocks(sharedIndex);

                expect(blocks.length).toBeGreaterThan(0);

                for (const block of blocks) {
                    // BlockIndexEntry fields: hash, height, time, slot
                    expect(block.hash).toBeTruthy();
                    expect(block.hash.length).toBe(64);
                    expect(typeof block.height).toBe("number");
                    expect(block.height).toBeGreaterThan(0);
                    expect(typeof block.slot).toBe("number");
                    expect(block.slot).toBeGreaterThan(0);
                    expect(typeof block.time).toBe("number");
                }
            });

            it("should have txs indexed for UTXOs", async () => {
                                const txs = await getAllTxs(sharedIndex);

                expect(txs.length).toBeGreaterThan(0);

                // Each tx should have cbor
                for (const tx of txs) {
                    expect(tx.txid).toBeTruthy();
                    expect(tx.txid.length).toBe(64);
                    expect(tx.cbor).toBeTruthy();
                }

                // Verify there's at least one tx that created a UTXO
                const utxos = await sharedIndex.getAllUtxos();
                const txIdsFromUtxos = new Set(
                    utxos.map((u) => u.utxoId.split("#")[0]),
                );
                const indexedTxIds = new Set(txs.map((t) => t.txid));

                // At least some UTXO-creating txs should be indexed
                const overlap = [...txIdsFromUtxos].filter((id) =>
                    indexedTxIds.has(id),
                );
                expect(overlap.length).toBeGreaterThan(0);
            });
        });

        describe("Store Query Edge Cases (uses shared index)", () => {
            it("should filter by tokenName in findUtxosByAsset", async () => {
                // Find UTXOs with capo MPH and "charter" tokenName
                // "charter" in hex = 63686172746572
                const charterUtxos = await sharedIndex.findUtxosByAsset(
                    TEST_CAPO_MPH,
                    "63686172746572",
                );

                // Should find exactly one charter UTXO
                expect(charterUtxos.length).toBe(1);

                // All UTXOs with capo MPH (any token name)
                const allCapoUtxos =
                    await sharedIndex.findUtxosByAsset(TEST_CAPO_MPH);

                // Should have at least the charter plus delegate tokens
                expect(allCapoUtxos.length).toBeGreaterThanOrEqual(
                    charterUtxos.length,
                );
            });

            it("should return undefined for non-existent UUT", async () => {
                const fakeUut = "fake-000000000000";
                const result = await sharedIndex.findUtxoByUUT(fakeUut);
                expect(result).toBeUndefined();
            });

            it("should return empty array for large offset in getAllUtxos", async () => {
                const result = await sharedIndex.getAllUtxos({
                    offset: 999999,
                });
                expect(result).toEqual([]);
            });

            it("should paginate findUtxosByAddress correctly", async () => {
                const page1 = await sharedIndex.findUtxosByAddress(
                    TEST_CAPO_ADDRESS,
                    { limit: 2, offset: 0 },
                );
                const page2 = await sharedIndex.findUtxosByAddress(
                    TEST_CAPO_ADDRESS,
                    { limit: 2, offset: 2 },
                );

                // Pages shouldn't overlap
                const page1Ids = new Set(page1.map((u) => u.utxoId));
                for (const utxo of page2) {
                    expect(page1Ids.has(utxo.utxoId)).toBe(false);
                }

                // Combined should equal fetching more
                const combined = await sharedIndex.findUtxosByAddress(
                    TEST_CAPO_ADDRESS,
                    { limit: 4, offset: 0 },
                );
                expect(combined.length).toBe(page1.length + page2.length);
            });
        });

        describe("Cache Miss Scenarios (isolated)", () => {
            let cleanupRegistry: Awaited<
                ReturnType<
                    typeof import("./CachedUtxoIndex.testHelpers.js").createDbCleanupRegistry
                >
            >;

            beforeEach(async () => {
                                cleanupRegistry = createDbCleanupRegistry();
            });

            afterEach(async () => {
                await cleanupRegistry.cleanup();
            });

            it("should demonstrate tx cache miss then hit pattern", async () => {
                const dbName = createIsolatedDbName();
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });
                await isolatedIndex.syncNow();

                // Get a known txId from UTXOs
                const utxos = await isolatedIndex.getAllUtxos();
                expect(utxos.length).toBeGreaterThan(0);
                const txId = utxos[0].utxoId.split("#")[0];

                // Spy on the network to see if it's called
                const fetchSpy = vi.spyOn(network, "getUtxo");

                // First call - should be a cache hit (tx was indexed during sync)
                const tx1 = await isolatedIndex.findOrFetchTxDetails(txId);
                expect(tx1).toBeTruthy();

                // Should NOT have called network - it was in cache
                expect(fetchSpy).not.toHaveBeenCalled();

                // Now query for a tx that's definitely not in our index
                // (using a different but valid-format txId)
                const fakeTxId = "0".repeat(64);
                try {
                    await isolatedIndex.findOrFetchTxDetails(fakeTxId);
                } catch {
                    // Expected - fake tx won't exist
                }

                // Second call for same valid tx - still cache hit
                const tx2 = await isolatedIndex.findOrFetchTxDetails(txId);
                expect(tx2).toBeTruthy();
                expect(tx2!.id().isEqual(tx1.id())).toBe(true);

                fetchSpy.mockRestore();
            });

            it("should demonstrate block cache miss then hit pattern", async () => {
                const dbName = createIsolatedDbName();
                cleanupRegistry.register(dbName);

                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });
                await isolatedIndex.syncNow();

                // Get a known block from indexed blocks
                                const blocks = await getAllBlocks(isolatedIndex);
                expect(blocks.length).toBeGreaterThan(0);
                const knownBlock = blocks[0];

                // Query by hash - should be cache hit
                // findOrFetchBlockHeight takes blockId (hash) and returns height
                const height1 = await isolatedIndex.findOrFetchBlockHeight(
                    knownBlock.hash,
                );
                expect(height1).toBe(knownBlock.height);

                // Query again - still cache hit, same result
                const height2 = await isolatedIndex.findOrFetchBlockHeight(
                    knownBlock.hash,
                );
                expect(height2).toBe(height1);
            });

            it("should work with partial data via copyIndexDataUpToBlock", async () => {
                
                // First create a fully synced index
                const fullDbName = createIsolatedDbName();
                cleanupRegistry.register(fullDbName);

                const fullIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName: fullDbName,
                });
                await fullIndex.syncNow();

                // Get block info to use as cutoff
                const allBlocks = await getAllBlocks(fullIndex);
                expect(allBlocks.length).toBeGreaterThan(0);

                // Sort by height to get the highest block as cutoff
                allBlocks.sort((a, b) => a.height - b.height);
                const cutoffBlock = allBlocks[allBlocks.length - 1]; // highest block

                // Create a new isolated index
                const partialDbName = createIsolatedDbName();
                cleanupRegistry.register(partialDbName);

                const partialIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName: partialDbName,
                });

                // Copy data up to cutoff block (source, target, maxHeight)
                await copyIndexDataUpToBlock(
                    fullIndex,
                    partialIndex,
                    cutoffBlock.height,
                );

                // Partial index should have data
                const partialBlocks = await getAllBlocks(partialIndex);

                // Should have at least some data (may equal full if only 1 block)
                expect(partialBlocks.length).toBeGreaterThanOrEqual(1);
                expect(partialBlocks.length).toBeLessThanOrEqual(
                    allBlocks.length,
                );

                // All blocks should be <= cutoff height
                for (const block of partialBlocks) {
                    expect(block.height).toBeLessThanOrEqual(
                        cutoffBlock.height,
                    );
                }
            });
        });

        // ============================================================
        // Plan A Tests: Post-Sync Operations
        // ============================================================

        describe("checkForNewTxns (uses shared index)", () => {
            it("should return cleanly when no new transactions exist", async () => {
                // After sync, calling checkForNewTxns should find nothing new
                await expect(
                    sharedIndex.checkForNewTxns(),
                ).resolves.toBeUndefined();
            });

            it("should gracefully skip when no processed blocks exist (no-processed-skip)", async () => {
                
                // Create isolated index and wait for sync to complete
                const dbName = createIsolatedDbName("check-zero-height");
                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });
                await isolatedIndex.syncNow();

                // Force lastBlockHeight to 0 to simulate unsynced state
                setLastSyncedBlock(isolatedIndex, 0, "", 0);

                // With decoupled cursors, checkForNewTxns gracefully skips
                // when there are no processed blocks (logs and returns)
                await expect(isolatedIndex.checkForNewTxns()).resolves.toBeUndefined();
            });

            it("should load transactions when syncing from an earlier block", async () => {
                
                // Find the charter mint block (earliest relevant block)
                const charterMint = await findCharterMintBlock(
                    sharedIndex,
                    BLOCKFROST_API_KEY,
                );

                // Create isolated index and sync it
                const dbName = createIsolatedDbName("incremental-sync");
                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                    syncPageSize: 10, // Small page size to limit API calls
                    maxSyncPages: 1,
                });
                await isolatedIndex.syncNow();

                // Record tx count after initial sync
                const txCountAfterSync = (await getAllTxs(isolatedIndex))
                    .length;

                // Set lastBlockHeight back to charter mint block to simulate "catching up"
                setLastSyncedBlock(
                    isolatedIndex,
                    charterMint.blockHeight,
                    "",
                    0,
                );

                // Call checkForNewTxns - should find transactions after charter mint
                await isolatedIndex.checkForNewTxns();

                // Should have loaded some transactions (up to page limit)
                const txCountAfterCheck = (await getAllTxs(isolatedIndex))
                    .length;
                expect(txCountAfterCheck).toBeGreaterThanOrEqual(
                    txCountAfterSync,
                );
            });

            it("should honor page size limits during syncing", async () => {
                
                // Find the charter mint block
                const charterMint = await findCharterMintBlock(
                    sharedIndex,
                    BLOCKFROST_API_KEY,
                );

                // Create isolated index with small page size and single page limit
                const dbName = createIsolatedDbName("page-limit");
                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                    syncPageSize: 3,
                    maxSyncPages: 1,
                });
                await isolatedIndex.syncNow();

                // Get initial tx count
                const txCountBefore = (await getAllTxs(isolatedIndex)).length;

                // Set back to charter mint to force re-sync
                setLastSyncedBlock(
                    isolatedIndex,
                    charterMint.blockHeight,
                    "",
                    0,
                );

                // Sync with limited pages
                await isolatedIndex.checkForNewTxns();

                // Count should increase by at most syncPageSize (3)
                const txCountAfter = (await getAllTxs(isolatedIndex)).length;
                const newTxCount = txCountAfter - txCountBefore;

                // With maxSyncPages=1 and syncPageSize=3, we should get at most 3 new txs
                expect(newTxCount).toBeLessThanOrEqual(3);
            });

            it("should fetch multiple pages when allowed", async () => {
                
                // Find the charter mint block
                const charterMint = await findCharterMintBlock(
                    sharedIndex,
                    BLOCKFROST_API_KEY,
                );

                // Create index with small page size but allow multiple pages
                const dbName = createIsolatedDbName("multi-page");
                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                    syncPageSize: 2,
                    maxSyncPages: 1,
                });
                await isolatedIndex.syncNow();

                // First sync with 1 page
                setLastSyncedBlock(
                    isolatedIndex,
                    charterMint.blockHeight,
                    "",
                    0,
                );
                await isolatedIndex.checkForNewTxns();
                const txCountAfterOnePage = (await getAllTxs(isolatedIndex))
                    .length;

                // Now allow more pages and sync again
                isolatedIndex.maxSyncPages = 3;
                setLastSyncedBlock(
                    isolatedIndex,
                    charterMint.blockHeight,
                    "",
                    0,
                );
                await isolatedIndex.checkForNewTxns();
                const txCountAfterThreePages = (await getAllTxs(isolatedIndex))
                    .length;

                // Should have fetched more transactions with more pages allowed
                expect(txCountAfterThreePages).toBeGreaterThanOrEqual(
                    txCountAfterOnePage,
                );
            });
        });

        describe("getTx (uses shared index)", () => {
            it("should return cached transaction without network call", async () => {
                // Get a txHash from a known UTXO
                const utxos = await sharedIndex.getAllUtxos();
                const txHash = utxos[0].utxoId.split("#")[0];
                
                // Spy on fetchFromBlockfrost to verify no network call
                const fetchSpy = vi.spyOn(sharedIndex, "fetchFromBlockfrost");

                const tx = await sharedIndex.getTx(makeTxId(txHash));

                expect(tx).toBeTruthy();
                expect(tx.id().toHex()).toBe(txHash);
                // Cache hit - should NOT have called fetchFromBlockfrost
                expect(fetchSpy).not.toHaveBeenCalled();

                fetchSpy.mockRestore();
            });

            it("should fetch from network on cache miss", async () => {
                
                // Get a txHash from shared index
                const utxos = await sharedIndex.getAllUtxos();
                const txHash = utxos[0].utxoId.split("#")[0];
                
                // Create isolated index without copying data
                const dbName = createIsolatedDbName("getTx-miss");
                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                // Verify tx is NOT in isolated cache
                const store = getStore(isolatedIndex);
                const beforeFetch = await store.findTxId(txHash);
                expect(beforeFetch).toBeUndefined();

                // Spy on fetchFromBlockfrost
                const fetchSpy = vi.spyOn(isolatedIndex, "fetchFromBlockfrost");

                const tx = await isolatedIndex.getTx(makeTxId(txHash));

                expect(tx).toBeTruthy();
                expect(tx.id().toHex()).toBe(txHash);
                // Cache miss - SHOULD have called fetchFromBlockfrost
                expect(fetchSpy).toHaveBeenCalled();

                fetchSpy.mockRestore();
            });
        });

        describe("getUtxo (uses shared index)", () => {
            it("should return TxInput for cached UTXO", async () => {
                // Get a known UTXO from indexed data
                const entries = await sharedIndex.getAllUtxos();
                const [txHash, idx] = entries[0].utxoId.split("#");
                
                const utxoId = makeTxOutputId(makeTxId(txHash), parseInt(idx));
                const txInput = await sharedIndex.getUtxo(utxoId);

                expect(txInput).toBeTruthy();
                expect(txInput.id.toString()).toBe(entries[0].utxoId);
                // Verify it has value data
                expect(txInput.value.lovelace).toBeGreaterThan(0n);
            });
        });

        describe("getUtxos (uses shared index)", () => {
            it("should return TxInput array for capo address", async () => {
                                const addr = makeAddress(TEST_CAPO_ADDRESS);

                const txInputs = await sharedIndex.getUtxos(addr);

                expect(txInputs.length).toBeGreaterThan(0);
                expect(txInputs[0].address.toString()).toBe(TEST_CAPO_ADDRESS);
            });
        });

        describe("getUtxosWithAssetClass (uses shared index)", () => {
            it("should find UTXOs with charter token", async () => {
                                const addr = makeAddress(TEST_CAPO_ADDRESS);
                // "charter" in hex = 63686172746572
                const charterAsset = makeAssetClass(
                    `${TEST_CAPO_MPH}.63686172746572`,
                );

                const txInputs = await sharedIndex.getUtxosWithAssetClass(
                    addr,
                    charterAsset,
                );

                // Should find exactly one charter UTXO
                expect(txInputs.length).toBe(1);
                // Verify it has the charter token by checking value is >= 1 of that asset
                const minAssetValue = makeValue(
                    charterAsset.mph,
                    charterAsset.tokenName,
                    1n,
                );
                expect(txInputs[0].value.isGreaterOrEqual(minAssetValue)).toBe(
                    true,
                );
            });
        });

        describe("fetchBlockDetails (uses shared index)", () => {
            it("should fetch block by hash", async () => {
                const blockHash = sharedIndex.lastBlockId;
                const details = await sharedIndex.fetchBlockDetails(blockHash);

                expect(details.hash).toBe(blockHash);
                expect(details.height).toBe(sharedIndex.lastBlockHeight);
            });
        });

        describe("fetchTxDetails (uses shared index)", () => {
            it("should fetch and decode transaction", async () => {
                // Get a known txId from UTXOs
                const utxos = await sharedIndex.getAllUtxos();
                const txId = utxos[0].utxoId.split("#")[0];

                const tx = await sharedIndex.fetchTxDetails(txId);

                expect(tx).toBeTruthy();
                expect(tx.id().toHex()).toBe(txId);
            });
        });

        describe("restoreTxInputs (isolated)", () => {
            it("should restore TxInputs with address and value from cached UTXOs", async () => {
                
                // Create an isolated index
                const dbName = createIsolatedDbName("restore-inputs");
                const isolatedIndex = new CachedUtxoIndex({
                    ...baseConfig,
                    dbName,
                });

                // Get a real transaction to test with
                const utxos = await sharedIndex.getAllUtxos();
                const txHash = utxos[0].utxoId.split("#")[0];
                const tx = await isolatedIndex.fetchTxDetails(txHash);

                expect(tx.body.inputs.length).toBeGreaterThan(0);

                // For each input in the tx, manually add a fake UTXO entry to the cache.
                // This simulates having the inputs cached before they were spent.
                const store = getStore(isolatedIndex);
                const testLovelace = 5_000_000n;

                for (const input of tx.body.inputs) {
                    const inputId = input.id.toString();
                    await store.utxos.put({
                        utxoId: inputId,
                        address: TEST_CAPO_ADDRESS,
                        lovelace: testLovelace,
                        tokens: [],
                        datumHash: null,
                        inlineDatum: null,
                        referenceScriptHash: null,
                        uutIds: [],
                    });
                }

                // Now restore the inputs - should find them in our manually populated cache
                const restoredInputs = await isolatedIndex.restoreTxInputs(tx);

                // Should have same number of inputs
                expect(restoredInputs.length).toBe(tx.body.inputs.length);

                // Each restored input should have the address and value we put in
                for (const input of restoredInputs) {
                    expect(input.address).toBeTruthy();
                    expect(input.address.toString()).toBe(TEST_CAPO_ADDRESS);
                    expect(input.value).toBeTruthy();
                    expect(input.value.lovelace).toBe(testLovelace);
                }
            });
        });

        describe("fetchAndCacheScript (uses shared index)", () => {
            it("should fetch and cache a valid script", async () => {
                
                // Find a UTXO with a reference script hash
                const utxoWithScript =
                    await findUtxoWithReferenceScript(sharedIndex);

                if (!utxoWithScript) {
                    // No UTXOs with reference scripts in test data - skip test
                    console.log(
                        "No UTXOs with reference scripts found - skipping test",
                    );
                    return;
                }

                const scriptHash = utxoWithScript.referenceScriptHash!;

                // Fetch the script
                const script =
                    await sharedIndex.fetchAndCacheScript(scriptHash);

                expect(script).toBeTruthy();

                // Verify it was cached
                const store = getStore(sharedIndex);
                const cached = await store.findScript(scriptHash);
                expect(cached).toBeTruthy();
                expect(cached!.scriptHash).toBe(scriptHash);
                expect(cached!.cbor).toBeTruthy();
            });

            it("should return cached script on second call without network fetch", async () => {
                
                const utxoWithScript =
                    await findUtxoWithReferenceScript(sharedIndex);

                if (!utxoWithScript) {
                    console.log(
                        "No UTXOs with reference scripts found - skipping test",
                    );
                    return;
                }

                const scriptHash = utxoWithScript.referenceScriptHash!;

                // First call - may or may not hit cache depending on previous tests
                await sharedIndex.fetchAndCacheScript(scriptHash);

                // Spy on fetchFromBlockfrost for second call
                const fetchSpy = vi.spyOn(sharedIndex, "fetchFromBlockfrost");

                // Second call - should use cache
                const script2 =
                    await sharedIndex.fetchAndCacheScript(scriptHash);

                expect(script2).toBeTruthy();
                // Should NOT have called fetchFromBlockfrost (cache hit)
                expect(fetchSpy).not.toHaveBeenCalled();

                fetchSpy.mockRestore();
            });

            it("should throw error for non-existent script hash", async () => {
                // Use a fake but valid-format script hash (64 hex chars)
                const fakeScriptHash = "0".repeat(56);

                await expect(
                    sharedIndex.fetchAndCacheScript(fakeScriptHash),
                ).rejects.toThrow();
            });
        });
    });
}

// =========================================================================
// Wallet Address UTXO Reconciliation Tests
// No Blockfrost API key required — uses mocked network
// =========================================================================

/** A valid testnet wallet address for test use */
const WALLET_ADDR = makeDummyAddress(false, 42).toBech32();

/**
 * Creates a mock TxInput with a given txHash, output index, and lovelace amount.
 * Uses WALLET_ADDR so the UTxO's address matches the registered wallet.
 */
function mockTxInput(txHash: string, outputIndex: number, lovelace: bigint): TxInput {
    const addr = makeAddress(WALLET_ADDR);
    const txId = makeTxId(txHash);
    const outputId = makeTxOutputId(txId, outputIndex);
    const output = makeTxOutput(addr, makeValue(lovelace));
    return makeTxInput(outputId, output);
}

/** Distinct 64-char hex tx hashes for test UTxOs */
const TX1 = "aa".repeat(32);
const TX2 = "bb".repeat(32);
const TX3 = "cc".repeat(32);

describe("Wallet Address UTXO Reconciliation (REQT/ygvc43wg0x)", () => {
    let index: CachedUtxoIndex;
    let dbName: string;

    beforeEach(async () => {
        dbName = createIsolatedDbName("wallet-reconcile");
        // Create index with a mock network
        const mockNetwork = {
            getUtxos: vi.fn().mockResolvedValue([]),
            getUtxo: vi.fn(),
            hasUtxo: vi.fn(),
            isMainnet: () => false,
            get now() { return 0; },
            get parameters() { return Promise.resolve({}); },
        };
        // Spy on syncNow BEFORE construction via prototype so the
        // constructor's this.syncNow() call is intercepted
        vi.spyOn(CachedUtxoIndex.prototype, "syncNow").mockResolvedValue(undefined);
        index = new CachedUtxoIndex({
            address: TEST_CAPO_ADDRESS,
            mph: TEST_CAPO_MPH,
            isMainnet: false,
            network: mockNetwork as any,
            bridge: CapoDataBridge,
            blockfrostKey: "preprod_fake_key_for_wallet_tests",
            dbName,
        });
        // Resolve syncReady so queries don't block
        (index as any).syncReadyResolve?.();
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await closeStore(index);
        await Dexie.delete(dbName);
    });

    it("marks stale UTxOs as spent after wallet re-sync (stale-eviction/REQT/ygvc43wg0x)", async () => {
        // Setup: mock network returns 3 UTxOs on first call
        const utxo1 = mockTxInput(TX1, 0, 200_000_000n);
        const utxo2 = mockTxInput(TX2, 0, 300_000_000n);
        const utxo3 = mockTxInput(TX3, 0, 150_000_000n);
        const networkSpy = vi.spyOn(index["network"], "getUtxos");
        networkSpy.mockResolvedValueOnce([utxo1, utxo2, utxo3]);

        // Act: register wallet — caches 3 UTxOs
        await index.addWalletAddress(WALLET_ADDR);

        // Verify: 3 UTxOs cached
        const store = getStore(index);
        const cached = await store.findUtxosByAddress(WALLET_ADDR);
        expect(cached).toHaveLength(3);

        // Setup: mock network returns only utxo1 on re-sync (utxo2, utxo3 spent)
        networkSpy.mockResolvedValueOnce([utxo1]);
        // Force staleness so syncWalletAddressIfStale triggers
        await store.saveWalletAddress({
            address: WALLET_ADDR,
            lastBlockHeight: 0,
            lastSyncTime: 0,
        });

        // Act: getUtxos triggers syncWalletAddressIfStale
        const result = await index.getUtxos(makeAddress(WALLET_ADDR));

        // Assert: only utxo1 returned
        expect(result).toHaveLength(1);

        // Verify: stale UTxOs removed from cache
        const staleEntry = await store.findUtxoId(`${TX2}#0`);
        // stale entry should either be gone or have spentInTx set
        if (staleEntry) {
            expect(staleEntry.spentInTx).toBeTruthy();
        }
    });

    it("handles wallet with zero on-chain UTxOs (zero-utxos/REQT/06b01nyf51)", async () => {
        const networkSpy = vi.spyOn(index["network"], "getUtxos");
        // First sync: 2 UTxOs
        const utxo1 = mockTxInput(TX1, 0, 200_000_000n);
        const utxo2 = mockTxInput(TX2, 0, 300_000_000n);
        networkSpy.mockResolvedValueOnce([utxo1, utxo2]);
        await index.addWalletAddress(WALLET_ADDR);

        // Re-sync: zero UTxOs
        networkSpy.mockResolvedValueOnce([]);
        const store = getStore(index);
        await store.saveWalletAddress({
            address: WALLET_ADDR,
            lastBlockHeight: 0,
            lastSyncTime: 0,
        });

        const result = await index.getUtxos(makeAddress(WALLET_ADDR));
        expect(result).toHaveLength(0);
    });

    it("stale sync after registration removes spent UTxOs (stale-after-register/REQT/06b01nyf51)", async () => {
        const networkSpy = vi.spyOn(index["network"], "getUtxos");

        // Register with 3 UTxOs
        networkSpy.mockResolvedValueOnce([
            mockTxInput(TX1, 0, 200_000_000n),
            mockTxInput(TX2, 0, 300_000_000n),
            mockTxInput(TX3, 0, 150_000_000n),
        ]);
        await index.addWalletAddress(WALLET_ADDR);

        const store = getStore(index);
        let cached = await store.findUtxosByAddress(WALLET_ADDR);
        expect(cached).toHaveLength(3);

        // Force staleness, then getUtxos with only 1 remaining
        await store.saveWalletAddress({
            address: WALLET_ADDR,
            lastBlockHeight: 0,
            lastSyncTime: 0,
        });
        networkSpy.mockResolvedValueOnce([
            mockTxInput(TX1, 0, 200_000_000n),
        ]);

        const result = await index.getUtxos(makeAddress(WALLET_ADDR));
        expect(result).toHaveLength(1);

        // Verify stale entries removed
        cached = await store.findUtxosByAddress(WALLET_ADDR);
        expect(cached).toHaveLength(1);
    });
});
