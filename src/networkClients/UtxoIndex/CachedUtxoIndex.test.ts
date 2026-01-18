/**
 * CachedUtxoIndex Unit Tests
 *
 * These tests run against live preprod Blockfrost data using a real Capo instance.
 * Requires BLOCKFROST_API_KEY environment variable to be set to a preprod key.
 */

// MUST be first - polyfills IndexedDB globally for Node.js
import "fake-indexeddb/auto";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Dexie from "dexie";
import { makeBlockfrostV0Client } from "@helios-lang/tx-utils";

import { CachedUtxoIndex } from "./CachedUtxoIndex.js";
import { CapoDataBridge } from "../../helios/scriptBundling/CapoHeliosBundle.bridge.js";

// Test configuration for preprod
const TEST_CAPO_ADDRESS = "addr_test1wzz7gwv7yc5r4kfc5qau7nf67pc2pp4jz7vhqvmcs63wddsyvhdfz";
const TEST_CAPO_MPH = "6b413535a846297b5d8a949663f787b11bae34f24835f2f72dbfd128";
const DATABASE_NAME = "StellarDappIndex-v0.1";

const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY;

/**
 * Clean up the Dexie database before tests
 */
async function cleanupDatabase(): Promise<void> {
    try {
        await Dexie.delete(DATABASE_NAME);
    } catch (e) {
        // Database might not exist, which is fine
    }
}

if (!BLOCKFROST_API_KEY) {
    // Single failing test when API key is not provided
    describe("CachedUtxoIndex", () => {
        it("requires BLOCKFROST_API_KEY environment variable", () => {
            expect.fail(
                "BLOCKFROST_API_KEY environment variable is not set.\n" +
                "To run these tests, set BLOCKFROST_API_KEY to a valid preprod Blockfrost API key:\n" +
                "  BLOCKFROST_API_KEY=preprodXXXXXXXX pnpm test CachedUtxoIndex"
            );
        });
    });
} else {
    // Full test suite when API key is available
    describe("CachedUtxoIndex", () => {
        let index: CachedUtxoIndex;
        let network: ReturnType<typeof makeBlockfrostV0Client>;
        let bridge: CapoDataBridge;

        beforeAll(async () => {
            // Clean up any existing database
            await cleanupDatabase();

            // Create network client for preprod
            network = makeBlockfrostV0Client("preprod", BLOCKFROST_API_KEY);

            // Create bridge for charter datum decoding
            bridge = new CapoDataBridge(false); // false = not mainnet
        });

        afterAll(async () => {
            // Stop periodic refresh if running
            if (index?.isPeriodicRefreshActive) {
                index.stopPeriodicRefresh();
            }
            // Clean up database
            await cleanupDatabase();
        });

        beforeEach(async () => {
            // Ensure clean state for each test
            await cleanupDatabase();
        });

        describe("Initialization", () => {
            it("should initialize with correct address and mph", async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                // Verify properties are correctly set
                expect(index.capoAddress).toBe(TEST_CAPO_ADDRESS);
                expect(index.capoMph).toBe(TEST_CAPO_MPH);
                expect(index.isMainnet()).toBe(false);
            });

            it("should set correct blockfrost base URL for preprod key", async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                // The blockfrostBaseUrl should be set for preprod
                expect(index.blockfrostBaseUrl).toBe("https://cardano-preprod.blockfrost.io");
            });
        });

        describe("Sync and Block Tracking", () => {
            it("should populate block tracking fields after syncNow completes", async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                // Wait for initial sync to complete
                // syncNow is called in constructor, but it's async so we need to wait
                // We'll call it again explicitly to ensure it completes
                await index.syncNow();

                // Block tracking fields should be populated
                expect(index.lastBlockHeight).toBeGreaterThan(0);
                expect(index.lastBlockId).toBeTruthy();
                expect(index.lastBlockId.length).toBe(64); // Block hash is 64 hex chars
                expect(index.lastSlot).toBeGreaterThan(0);
            });

            it("should have 'now' property reflect lastSlot value", async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                await index.syncNow();

                // 'now' should equal lastSlot (ReadonlyCardanoClient interface)
                expect(index.now).toBe(index.lastSlot);
                expect(index.now).toBeGreaterThan(0);
            });
        });

        describe("UTXO Queries", () => {
            beforeEach(async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                // Wait for sync to complete
                await index.syncNow();
            });

            it("should find UTXOs by address", async () => {
                const utxos = await index.findUtxosByAddress(TEST_CAPO_ADDRESS);

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
                const utxos = await index.findUtxosByAsset(TEST_CAPO_MPH);

                // Should find at least the charter token
                expect(utxos.length).toBeGreaterThan(0);

                // Each UTXO should have tokens with the capo mph
                for (const utxo of utxos) {
                    const hasCapoToken = utxo.tokens.some(
                        (t) => t.policyId === TEST_CAPO_MPH
                    );
                    expect(hasCapoToken).toBe(true);
                }
            });

            it("should return all indexed UTXOs with getAllUtxos", async () => {
                const allUtxos = await index.getAllUtxos();

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
                const allUtxos = await index.getAllUtxos();

                if (allUtxos.length >= 2) {
                    // Test limit
                    const limited = await index.getAllUtxos({ limit: 1 });
                    expect(limited.length).toBe(1);

                    // Test offset
                    const offset = await index.getAllUtxos({ offset: 1, limit: 1 });
                    expect(offset.length).toBe(1);
                    expect(offset[0].utxoId).not.toBe(limited[0].utxoId);
                }
            });
        });

        describe("UUT Lookups", () => {
            beforeEach(async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                await index.syncNow();
            });

            it("should find delegate UUTs after sync", async () => {
                // After sync, delegate UUTs should be cataloged
                // UUT names follow pattern: {purpose}-{12 hex chars}
                // We can check for common delegate types

                // Get all UTXOs and look for any with uutIds
                const allUtxos = await index.getAllUtxos();
                const utxosWithUuts = allUtxos.filter(
                    (u) => u.uutIds && u.uutIds.length > 0
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
                const allUtxos = await index.getAllUtxos();
                const utxoWithUut = allUtxos.find(
                    (u) => u.uutIds && u.uutIds.length > 0
                );

                if (utxoWithUut && utxoWithUut.uutIds.length > 0) {
                    const uutId = utxoWithUut.uutIds[0];

                    // Look up the UTXO by UUT ID
                    const found = await index.findUtxoByUUT(uutId);

                    expect(found).toBeTruthy();
                    expect(found!.utxoId).toBe(utxoWithUut.utxoId);
                    expect(found!.uutIds).toContain(uutId);
                }
            });
        });

        describe("Periodic Refresh", () => {
            it("should start and stop periodic refresh", async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
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

        describe("ReadonlyCardanoClient Interface", () => {
            beforeEach(async () => {
                index = new CachedUtxoIndex({
                    address: TEST_CAPO_ADDRESS,
                    mph: TEST_CAPO_MPH,
                    isMainnet: false,
                    network,
                    bridge,
                    blockfrostKey: BLOCKFROST_API_KEY,
                    storeIn: "dexie",
                });

                await index.syncNow();
            });

            it("should provide network parameters via parameters property", async () => {
                const params = await index.parameters;

                // Network params should have expected properties
                expect(params).toBeTruthy();
                // The params object structure depends on Helios, but it should exist
            });

            it("should check UTXO existence with hasUtxo", async () => {
                // Get a known UTXO
                const allUtxos = await index.getAllUtxos();
                expect(allUtxos.length).toBeGreaterThan(0);

                const knownUtxo = allUtxos[0];
                const [txHash, indexStr] = knownUtxo.utxoId.split("#");

                // Import TxOutputId maker
                const { makeTxOutputId, makeTxId } = await import("@helios-lang/ledger");
                const txId = makeTxId(txHash);
                const utxoId = makeTxOutputId(txId, parseInt(indexStr, 10));

                const exists = await index.hasUtxo(utxoId);
                expect(exists).toBe(true);
            });
        });
    });
}
