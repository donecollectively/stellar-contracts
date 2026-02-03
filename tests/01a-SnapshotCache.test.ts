import {
    describe as descrWithContext,
    expect,
    it as itWithContext,
    beforeEach,
    afterEach,
} from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync, utimesSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
    SnapshotCache,
    type CacheKeyInputs,
    type CachedSnapshot,
    type NetworkSnapshot,
    type ParentSnapName,
} from "../src/testing";

// Simple test context - no blockchain needed
type localTC = { tempDir: string; cache: SnapshotCache };
const it = itWithContext<localTC>;
const fit = it.only;
const describe = descrWithContext<localTC>;

/**
 * Creates a minimal NetworkSnapshot for testing.
 * The snapshotHash must match the last blockHash for integrity checks.
 */
function createMockSnapshot(name: string, blockHashes: string[] = ["genesis", "block1hash"]): NetworkSnapshot {
    return {
        seed: 12345,
        netNumber: 0,
        name,
        slot: 100,
        genesis: [],
        blocks: [],
        allUtxos: {},
        consumedUtxos: new Set(),
        addressUtxos: {},
        blockHashes,
    };
}

/**
 * Creates a CachedSnapshot for testing.
 * Note: snapshotHash must match blockHashes[-1] for integrity verification.
 */
function createCachedSnapshot(
    name: string,
    parentSnapName: ParentSnapName = "genesis",
    parentHash: string | null = null
): CachedSnapshot {
    // snapshotHash MUST match the last blockHash for integrity checks (REQT-1.2.9.3.3)
    const blockHashes = ["genesis", `block_${name}`];
    const snapshotHash = blockHashes[blockHashes.length - 1];
    return {
        snapshot: createMockSnapshot(name, blockHashes),
        namedRecords: { testRecord: "test-value-123" },
        parentSnapName,
        parentHash,
        parentCacheKey: null, // deprecated with hierarchical directories
        snapshotHash,
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
            const snapshotName = "test-snapshot";
            const original = createCachedSnapshot(snapshotName);

            // Register snapshot before store (registry-based API)
            cache.register(snapshotName, { parentSnapName: "genesis" });

            await cache.store(snapshotName, original);
            const retrieved = await cache.find(snapshotName);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.snapshot.name).toBe(snapshotName);
            expect(retrieved!.snapshot.seed).toBe(12345);
            expect(retrieved!.snapshot.slot).toBe(100);
            expect(retrieved!.namedRecords.testRecord).toBe("test-value-123");
            expect(retrieved!.parentSnapName).toBe("genesis");
            expect(retrieved!.parentHash).toBeNull();
            // snapshotHash matches blockHashes[-1]
            expect(retrieved!.snapshotHash).toBe(`block_${snapshotName}`);
        });

        it("stores snapshot with parent linkage", async (context: localTC) => {
            const { cache } = context;
            const parentSnapName = "parent-snapshot";
            const childSnapName = "child-snapshot";

            // Create and store parent snapshot first
            cache.register(parentSnapName, { parentSnapName: "genesis" });
            const parentSnapshot = createCachedSnapshot(parentSnapName);
            await cache.store(parentSnapName, parentSnapshot);

            // Create child with parent's hash
            const parentHash = parentSnapshot.snapshotHash;
            cache.register(childSnapName, { parentSnapName: parentSnapName as ParentSnapName });
            const childSnapshot = createCachedSnapshot(childSnapName, parentSnapName as ParentSnapName, parentHash);

            await cache.store(childSnapName, childSnapshot);
            const retrieved = await cache.find(childSnapName);

            expect(retrieved!.parentSnapName).toBe(parentSnapName);
            expect(retrieved!.parentHash).toBe(parentHash);
        });

        it("returns null for non-existent snapshot", async (context: localTC) => {
            const { cache } = context;
            // Note: unregistered snapshots return null (with warning)
            const result = await cache.find("non-existent-snapshot");
            expect(result).toBeNull();
        });

        it("preserves blockHashes in snapshot", async (context: localTC) => {
            const { cache } = context;
            const snapshotName = "blockhash-snapshot";
            const original = createCachedSnapshot(snapshotName);

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, original);
            const retrieved = await cache.find(snapshotName);

            expect(retrieved!.snapshot.blockHashes).toEqual(["genesis", `block_${snapshotName}`]);
        });

        it("preserves snapshot metadata correctly", async (context: localTC) => {
            const { cache } = context;
            const snapshotName = "metadata-snapshot";

            const original = createCachedSnapshot(snapshotName);
            original.namedRecords = { record1: "value1", record2: "value2" };

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, original);
            const retrieved = await cache.find(snapshotName);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.snapshot.name).toBe(snapshotName);
            expect(retrieved!.snapshot.seed).toBe(12345);
            expect(retrieved!.snapshot.slot).toBe(100);
            expect(retrieved!.parentSnapName).toBe("genesis");
            expect(retrieved!.parentHash).toBeNull();
            expect(retrieved!.snapshotHash).toBe(`block_${snapshotName}`);
            expect(retrieved!.namedRecords).toEqual({ record1: "value1", record2: "value2" });
        });
    });

    describe("has", () => {
        it("returns false for unregistered snapshot", async (context: localTC) => {
            const { cache } = context;
            // Unregistered snapshots return false
            expect(await cache.has("does-not-exist")).toBe(false);
        });

        it("returns true after storing", async (context: localTC) => {
            const { cache } = context;
            const snapshotName = "has-test-snapshot";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            expect(await cache.has(snapshotName)).toBe(false);

            await cache.store(snapshotName, createCachedSnapshot(snapshotName));
            expect(await cache.has(snapshotName)).toBe(true);
        });
    });

    describe("delete", () => {
        it("returns false for unregistered snapshot", async (context: localTC) => {
            const { cache } = context;
            expect(await cache.delete("does-not-exist")).toBe(false);
        });

        it("deletes existing cache entry and children (REQT-1.2.9.4)", async (context: localTC) => {
            const { cache } = context;
            const snapshotName = "to-delete";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, createCachedSnapshot(snapshotName));
            expect(await cache.has(snapshotName)).toBe(true);

            const deleted = await cache.delete(snapshotName);
            expect(deleted).toBe(true);
            expect(await cache.has(snapshotName)).toBe(false);

            const result = await cache.find(snapshotName);
            expect(result).toBeNull();
        });
    });

    describe("getCacheDir", () => {
        it("returns correct cache directory path", (context: localTC) => {
            const { cache, tempDir } = context;
            const expected = join(tempDir, ".stellar", "emu");
            expect(cache.getCacheDir()).toBe(expected);
        });

        it("creates cache directory if it does not exist", (context: localTC) => {
            const { cache } = context;
            expect(existsSync(cache.getCacheDir())).toBe(true);
        });
    });

    describe("freshness management (REQT-1.2.7.1)", () => {
        it("touches directory older than 1 day on read", async (context: localTC) => {
            const { cache, tempDir } = context;
            const snapshotName = "freshness";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, createCachedSnapshot(snapshotName));

            // Find the snapshot directory (hierarchical format)
            const cacheDir = cache.getCacheDir();
            const entries = readdirSync(cacheDir);
            const snapshotDir = entries.find(e => e.startsWith(`${snapshotName}-`));
            expect(snapshotDir).toBeDefined();

            const fullDirPath = join(cacheDir, snapshotDir!);
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            utimesSync(fullDirPath, twoDaysAgo, twoDaysAgo);

            const oldStats = statSync(fullDirPath);
            const oldMtime = oldStats.mtimeMs;

            // Read the snapshot (should touch the directory)
            await cache.find(snapshotName);

            const newStats = statSync(fullDirPath);
            const newMtime = newStats.mtimeMs;

            // Directory should have been touched (mtime should be newer)
            expect(newMtime).toBeGreaterThan(oldMtime);
        });

        it("does not touch recent directories", async (context: localTC) => {
            const { cache, tempDir } = context;
            const snapshotName = "recent";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, createCachedSnapshot(snapshotName));

            // Find the snapshot directory
            const cacheDir = cache.getCacheDir();
            const entries = readdirSync(cacheDir);
            const snapshotDir = entries.find(e => e.startsWith(`${snapshotName}-`));
            expect(snapshotDir).toBeDefined();

            const fullDirPath = join(cacheDir, snapshotDir!);
            const beforeStats = statSync(fullDirPath);
            const beforeMtime = beforeStats.mtimeMs;

            // Small delay to ensure any touch would be visible
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Read the snapshot
            await cache.find(snapshotName);

            const afterStats = statSync(fullDirPath);
            const afterMtime = afterStats.mtimeMs;

            // Directory should NOT have been touched (mtime should be the same)
            expect(afterMtime).toBe(beforeMtime);
        });
    });

    describe("hierarchical directory structure (REQT-1.2.9)", () => {
        it("stores snapshots in hierarchical directories", async (context: localTC) => {
            const { cache, tempDir } = context;
            const parentName = "parent-snap";
            const childName = "child-snap";

            // Create parent
            cache.register(parentName, { parentSnapName: "genesis" });
            const parentSnapshot = createCachedSnapshot(parentName);
            await cache.store(parentName, parentSnapshot);

            // Create child
            const parentHash = parentSnapshot.snapshotHash;
            cache.register(childName, { parentSnapName: parentName as ParentSnapName });
            const childSnapshot = createCachedSnapshot(childName, parentName as ParentSnapName, parentHash);
            await cache.store(childName, childSnapshot);

            // Verify hierarchical structure: parent-{key}/child-{key}/snapshot.json
            const cacheDir = cache.getCacheDir();
            const parentDirs = readdirSync(cacheDir);
            const parentDir = parentDirs.find(d => d.startsWith(`${parentName}-`));
            expect(parentDir).toBeDefined();

            const parentPath = join(cacheDir, parentDir!);
            const childDirs = readdirSync(parentPath).filter(f => f !== "snapshot.json");
            const childDir = childDirs.find(d => d.startsWith(`${childName}-`));
            expect(childDir).toBeDefined();

            // Verify snapshot.json exists in child directory
            const childPath = join(parentPath, childDir!);
            expect(existsSync(join(childPath, "snapshot.json"))).toBe(true);
        });

        it("deleting parent removes child directories (subtree deletion)", async (context: localTC) => {
            const { cache, tempDir } = context;
            const parentName = "parent-to-delete";
            const childName = "child-to-delete";

            // Create parent and child
            cache.register(parentName, { parentSnapName: "genesis" });
            const parentSnapshot = createCachedSnapshot(parentName);
            await cache.store(parentName, parentSnapshot);

            cache.register(childName, { parentSnapName: parentName as ParentSnapName });
            const childSnapshot = createCachedSnapshot(childName, parentName as ParentSnapName, parentSnapshot.snapshotHash);
            await cache.store(childName, childSnapshot);

            // Verify both exist
            expect(await cache.has(parentName)).toBe(true);
            expect(await cache.has(childName)).toBe(true);

            // Delete parent (should also delete child)
            const deleted = await cache.delete(parentName);
            expect(deleted).toBe(true);

            // Both should be gone
            expect(await cache.has(parentName)).toBe(false);
            // Child's cache key depends on parent, so find() will fail to resolve parent
            expect(await cache.has(childName)).toBe(false);
        });
    });
});
