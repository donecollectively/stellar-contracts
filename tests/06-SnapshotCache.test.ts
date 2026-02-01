import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    afterEach,
} from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync, utimesSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
    SnapshotCache,
    type CacheKeyInputs,
    type CachedSnapshot,
    type NetworkSnapshot,
} from "../src/testing";

// Simple test context - no blockchain needed
type localTC = { tempDir: string; cache: SnapshotCache };
const it = itWithContext<localTC>;
const fit = it.only;
const describe = descrWithContext<localTC>;

/**
 * Creates a minimal NetworkSnapshot for testing.
 */
function createMockSnapshot(name: string): NetworkSnapshot {
    return {
        seed: 12345,
        netNumber: 0,
        name,
        slot: 100,
        genesis: [],
        blocks: [],
        allUtxos: new Map(),
        consumedUtxos: new Set(),
        addressUtxos: new Map(),
        blockHashes: ["genesis", "block1hash"],
    };
}

/**
 * Creates a CachedSnapshot for testing.
 */
function createCachedSnapshot(name: string, parentName: string | null = null): CachedSnapshot {
    return {
        snapshot: createMockSnapshot(name),
        namedRecords: { testRecord: "test-value-123" },
        parentName,
        parentHash: parentName ? "parent-hash-abc" : null,
        snapshotHash: `hash-${name}`,
    };
}

describe("SnapshotCache", () => {
    let tempDir: string;
    let cache: SnapshotCache;

    beforeEach<localTC>((context) => {
        // Create a unique temp directory for each test
        tempDir = join(tmpdir(), `snapshot-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(tempDir, { recursive: true });
        cache = new SnapshotCache(tempDir);
        context.tempDir = tempDir;
        context.cache = cache;
    });

    afterEach<localTC>((context) => {
        // Clean up temp directory
        if (existsSync(context.tempDir)) {
            rmSync(context.tempDir, { recursive: true, force: true });
        }
    });

    describe("computeKey", () => {
        it("generates deterministic hash from inputs", (context: localTC) => {
            const { cache } = context;
            const inputs: CacheKeyInputs = {
                bundles: [
                    { name: "TestBundle", sourceHash: "abc123", params: {} },
                ],
            };

            const key1 = cache.computeKey(null, inputs);
            const key2 = cache.computeKey(null, inputs);

            expect(key1).toBe(key2);
            expect(key1.length).toBe(32); // First 32 chars of hex hash
            expect(/^[0-9a-f]+$/.test(key1)).toBe(true); // Valid hex
        });

        it("produces different keys for different parent hashes", (context: localTC) => {
            const { cache } = context;
            const inputs: CacheKeyInputs = {
                bundles: [{ name: "Bundle", sourceHash: "xyz", params: {} }],
            };

            const key1 = cache.computeKey(null, inputs);
            const key2 = cache.computeKey("parent-hash-1", inputs);
            const key3 = cache.computeKey("parent-hash-2", inputs);

            expect(key1).not.toBe(key2);
            expect(key2).not.toBe(key3);
            expect(key1).not.toBe(key3);
        });

        it("produces different keys for different bundle source hashes", (context: localTC) => {
            const { cache } = context;

            const inputs1: CacheKeyInputs = {
                bundles: [{ name: "Bundle", sourceHash: "hash-v1", params: {} }],
            };
            const inputs2: CacheKeyInputs = {
                bundles: [{ name: "Bundle", sourceHash: "hash-v2", params: {} }],
            };

            const key1 = cache.computeKey(null, inputs1);
            const key2 = cache.computeKey(null, inputs2);

            expect(key1).not.toBe(key2);
        });

        it("produces different keys for different params", (context: localTC) => {
            const { cache } = context;

            const inputs1: CacheKeyInputs = {
                bundles: [{ name: "Bundle", sourceHash: "same", params: { foo: 1 } }],
            };
            const inputs2: CacheKeyInputs = {
                bundles: [{ name: "Bundle", sourceHash: "same", params: { foo: 2 } }],
            };

            const key1 = cache.computeKey(null, inputs1);
            const key2 = cache.computeKey(null, inputs2);

            expect(key1).not.toBe(key2);
        });

        it("includes extra field in key computation", (context: localTC) => {
            const { cache } = context;

            const inputs1: CacheKeyInputs = {
                bundles: [],
                extra: { heliosVersion: "0.17.0" },
            };
            const inputs2: CacheKeyInputs = {
                bundles: [],
                extra: { heliosVersion: "0.18.0" },
            };

            const key1 = cache.computeKey(null, inputs1);
            const key2 = cache.computeKey(null, inputs2);

            expect(key1).not.toBe(key2);
        });
    });

    describe("store and find", () => {
        it("stores and retrieves snapshot correctly", async (context: localTC) => {
            const { cache } = context;
            const cacheKey = "test-cache-key-001";
            const original = createCachedSnapshot("test-snapshot");

            await cache.store(cacheKey, original);
            const retrieved = await cache.find(cacheKey);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.snapshot.name).toBe("test-snapshot");
            expect(retrieved!.snapshot.seed).toBe(12345);
            expect(retrieved!.snapshot.slot).toBe(100);
            expect(retrieved!.namedRecords.testRecord).toBe("test-value-123");
            expect(retrieved!.parentName).toBeNull();
            expect(retrieved!.parentHash).toBeNull();
            expect(retrieved!.snapshotHash).toBe("hash-test-snapshot");
        });

        it("stores snapshot with parent linkage", async (context: localTC) => {
            const { cache } = context;
            const cacheKey = "child-snapshot-key";
            const original = createCachedSnapshot("child-snapshot", "parent-snapshot");

            await cache.store(cacheKey, original);
            const retrieved = await cache.find(cacheKey);

            expect(retrieved!.parentName).toBe("parent-snapshot");
            expect(retrieved!.parentHash).toBe("parent-hash-abc");
        });

        it("returns null for non-existent key", async (context: localTC) => {
            const { cache } = context;
            const result = await cache.find("non-existent-key");
            expect(result).toBeNull();
        });

        it("preserves blockHashes in snapshot", async (context: localTC) => {
            const { cache } = context;
            const cacheKey = "blockhash-test";
            const original = createCachedSnapshot("blockhash-snapshot");

            await cache.store(cacheKey, original);
            const retrieved = await cache.find(cacheKey);

            expect(retrieved!.snapshot.blockHashes).toEqual(["genesis", "block1hash"]);
        });

        it("preserves snapshot metadata correctly", async (context: localTC) => {
            const { cache } = context;
            const cacheKey = "metadata-test";

            const original = createCachedSnapshot("metadata-snapshot", "parent-snapshot");
            original.namedRecords = { record1: "value1", record2: "value2" };

            await cache.store(cacheKey, original);
            const retrieved = await cache.find(cacheKey);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.snapshot.name).toBe("metadata-snapshot");
            expect(retrieved!.snapshot.seed).toBe(12345);
            expect(retrieved!.snapshot.slot).toBe(100);
            expect(retrieved!.parentName).toBe("parent-snapshot");
            expect(retrieved!.parentHash).toBe("parent-hash-abc");
            expect(retrieved!.snapshotHash).toBe("hash-metadata-snapshot");
            expect(retrieved!.namedRecords).toEqual({ record1: "value1", record2: "value2" });
        });
    });

    describe("has", () => {
        it("returns false for non-existent key", (context: localTC) => {
            const { cache } = context;
            expect(cache.has("does-not-exist")).toBe(false);
        });

        it("returns true after storing", async (context: localTC) => {
            const { cache } = context;
            const cacheKey = "has-test-key";

            expect(cache.has(cacheKey)).toBe(false);
            await cache.store(cacheKey, createCachedSnapshot("test"));
            expect(cache.has(cacheKey)).toBe(true);
        });
    });

    describe("delete", () => {
        it("returns false for non-existent key", (context: localTC) => {
            const { cache } = context;
            expect(cache.delete("does-not-exist")).toBe(false);
        });

        it("deletes existing cache entry", async (context: localTC) => {
            const { cache } = context;
            const cacheKey = "delete-test-key";

            await cache.store(cacheKey, createCachedSnapshot("to-delete"));
            expect(cache.has(cacheKey)).toBe(true);

            const deleted = cache.delete(cacheKey);
            expect(deleted).toBe(true);
            expect(cache.has(cacheKey)).toBe(false);

            const result = await cache.find(cacheKey);
            expect(result).toBeNull();
        });
    });

    describe("getCacheDir", () => {
        it("returns correct cache directory path", (context: localTC) => {
            const { cache, tempDir } = context;
            const expected = join(tempDir, ".stellar", "emulator");
            expect(cache.getCacheDir()).toBe(expected);
        });

        it("creates cache directory if it does not exist", (context: localTC) => {
            const { cache } = context;
            expect(existsSync(cache.getCacheDir())).toBe(true);
        });
    });

    describe("freshness management", () => {
        it("touches file older than 1 day on read", async (context: localTC) => {
            const { cache, tempDir } = context;
            const cacheKey = "freshness-test";

            // Store a snapshot
            await cache.store(cacheKey, createCachedSnapshot("freshness"));

            // Get the cache file path and set its mtime to 2 days ago
            const cachePath = join(tempDir, ".stellar", "emulator", `${cacheKey}.json`);
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            utimesSync(cachePath, twoDaysAgo, twoDaysAgo);

            const oldStats = statSync(cachePath);
            const oldMtime = oldStats.mtimeMs;

            // Read the snapshot (should touch the file)
            await cache.find(cacheKey);

            const newStats = statSync(cachePath);
            const newMtime = newStats.mtimeMs;

            // File should have been touched (mtime should be newer)
            expect(newMtime).toBeGreaterThan(oldMtime);
        });

        it("does not touch recent files", async (context: localTC) => {
            const { cache, tempDir } = context;
            const cacheKey = "recent-file-test";

            // Store a snapshot (will have current mtime)
            await cache.store(cacheKey, createCachedSnapshot("recent"));

            const cachePath = join(tempDir, ".stellar", "emulator", `${cacheKey}.json`);
            const beforeStats = statSync(cachePath);
            const beforeMtime = beforeStats.mtimeMs;

            // Small delay to ensure any touch would be visible
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Read the snapshot
            await cache.find(cacheKey);

            const afterStats = statSync(cachePath);
            const afterMtime = afterStats.mtimeMs;

            // File should NOT have been touched (mtime should be the same)
            expect(afterMtime).toBe(beforeMtime);
        });
    });
});
