import {
    describe as descrWithContext,
    describe as vitestDescribe,
    expect,
    it as itWithContext,
    it as vitestIt,
    beforeEach,
    afterEach,
} from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync, utimesSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
    SnapshotCache,
    type CacheKeyInputs,
    type CachedSnapshot,
    type NetworkSnapshot,
    type ParentSnapName,
    addTestContext,
    ADA,
    type StellarTestContext,
} from "../src/testing";
import { DefaultCapoTestHelper } from "../src/testing/DefaultCapoTestHelper.js";
import { CapoTestHelper, SNAP_ACTORS, SNAP_CAPO_INIT, SNAP_DELEGATES, type PreSelectedSeedUtxo } from "../src/testing/CapoTestHelper.js";

// Test context type for Capo-based tests
type CapoTC = StellarTestContext<DefaultCapoTestHelper>;

// Simple test context for SnapshotCache unit tests (no blockchain needed)
type SimpleTC = {
    tempDir: string;
    cache: SnapshotCache;
};

// Typed test functions for Capo-based integration tests (default)
const it = itWithContext<CapoTC>;
const fit = it.only;
const describe = descrWithContext<CapoTC>;

// Typed test functions for SnapshotCache unit tests (no Capo needed)
const describeNoCapo = descrWithContext<SimpleTC>;

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
 *
 * For root snapshots (parentSnapName: "genesis"):
 *   - blockHashes = [genesisBlockHash] (single hash)
 *   - snapshotHash = genesisBlockHash
 *
 * For child snapshots:
 *   - blockHashes = [parentHashes..., incrementalHashes...]
 *   - snapshotHash = last blockHash
 */
function createCachedSnapshot(
    name: string,
    parentSnapName: ParentSnapName = "genesis",
    parentHash: string | null = null
): CachedSnapshot {
    // Root vs child snapshot have different blockHashes structures
    const isRoot = parentSnapName === "genesis";

    // For root: single genesis block hash
    // For child: parent hash + incremental hash
    const blockHashes = isRoot
        ? [`genesis_block_${name}`]  // Root: single hash representing genesis block
        : [parentHash || "parent_block", `block_${name}`];  // Child: parent + incremental

    // snapshotHash MUST match the last blockHash for integrity checks (REQT-1.2.9.3.3)
    const snapshotHash = blockHashes[blockHashes.length - 1];

    return {
        snapshot: createMockSnapshot(name, blockHashes),
        namedRecords: { testRecord: "test-value-123" },
        parentSnapName,
        parentHash,
        snapshotHash,
    };
}

describeNoCapo("SnapshotCache", () => {
    let tempDir: string;
    let cache: SnapshotCache;

    beforeEach<SimpleTC>((context) => {
        // Create a unique temp directory for each test
        tempDir = join(tmpdir(), `snapshot-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(tempDir, { recursive: true });
        cache = new SnapshotCache(tempDir);
        context.tempDir = tempDir;
        context.cache = cache;
    });

    afterEach<SimpleTC>((context) => {
        // Clean up temp directory
        if (existsSync(context.tempDir)) {
            rmSync(context.tempDir, { recursive: true, force: true });
        }
    });

    vitestDescribe("computeKey", () => {
        vitestIt("generates deterministic hash from inputs", (context: SimpleTC) => {
            const { cache } = context;
            const inputs: CacheKeyInputs = {
                bundles: [
                    { name: "TestBundle", sourceHash: "abc123", params: {} },
                ],
            };

            const key1 = cache.computeKey(null, inputs);
            const key2 = cache.computeKey(null, inputs);

            expect(key1).toBe(key2);
            expect(key1.length).toBe(6); // Last 6 chars of bech32 hash (ARCH-14zt4f9rtg)
            expect(/^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/.test(key1)).toBe(true); // Valid bech32 chars
        });

        vitestIt("produces different keys for different parent hashes", (context: SimpleTC) => {
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

        vitestIt("produces different keys for different bundle source hashes", (context: SimpleTC) => {
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

        vitestIt("produces different keys for different params", (context: SimpleTC) => {
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

        vitestIt("includes extra field in key computation", (context: SimpleTC) => {
            const { cache } = context;

            const inputs1: CacheKeyInputs = {
                bundles: [],
                extra: { heliosVersion: "0.17.0", builderVersion: undefined },
            };
            const inputs2: CacheKeyInputs = {
                bundles: [],
                extra: { heliosVersion: "0.18.0", builderVersion: undefined },
            };

            const key1 = cache.computeKey(null, inputs1);
            const key2 = cache.computeKey(null, inputs2);

            expect(key1).not.toBe(key2);
        });
    });

    vitestDescribe("store and find", () => {
        vitestIt("stores and retrieves snapshot correctly", async (context: SimpleTC) => {
            const { cache } = context;
            const snapshotName = "test-snapshot";
            const original = createCachedSnapshot(snapshotName);

            // Register snapshot before store (registry-based API)
            cache.register(snapshotName, { parentSnapName: "genesis" });

            await cache.store(snapshotName, original, null as any);
            const retrieved = await cache.find(snapshotName, null as any);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.snapshot.name).toBe(snapshotName);
            expect(retrieved!.snapshot.seed).toBe(12345);
            expect(retrieved!.snapshot.slot).toBe(100);
            expect(retrieved!.namedRecords.testRecord).toBe("test-value-123");
            expect(retrieved!.parentSnapName).toBe("genesis");
            expect(retrieved!.parentHash).toBeNull();
            // For root snapshots, snapshotHash = genesis block hash (single hash)
            expect(retrieved!.snapshotHash).toBe(`genesis_block_${snapshotName}`);
        });

        vitestIt("stores snapshot with parent linkage", async (context: SimpleTC) => {
            const { cache } = context;
            const parentSnapName = "parent-snapshot";
            const childSnapName = "child-snapshot";

            // Create and store parent snapshot first
            cache.register(parentSnapName, { parentSnapName: "genesis" });
            const parentSnapshot = createCachedSnapshot(parentSnapName);
            await cache.store(parentSnapName, parentSnapshot, null as any);

            // Create child with parent's hash
            const parentHash = parentSnapshot.snapshotHash;
            cache.register(childSnapName, { parentSnapName: parentSnapName as ParentSnapName });
            const childSnapshot = createCachedSnapshot(childSnapName, parentSnapName as ParentSnapName, parentHash);

            await cache.store(childSnapName, childSnapshot, null as any);
            const retrieved = await cache.find(childSnapName, null as any);

            expect(retrieved!.parentSnapName).toBe(parentSnapName);
            expect(retrieved!.parentHash).toBe(parentHash);
        });

        vitestIt("returns null for non-existent snapshot", async (context: SimpleTC) => {
            const { cache } = context;
            // Note: unregistered snapshots return null (with warning)
            const result = await cache.find("non-existent-snapshot", null as any);
            expect(result).toBeNull();
        });

        vitestIt("preserves blockHashes in snapshot", async (context: SimpleTC) => {
            const { cache } = context;
            const snapshotName = "blockhash-snapshot";
            const original = createCachedSnapshot(snapshotName);

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, original, null as any);
            const retrieved = await cache.find(snapshotName, null as any);

            // Root snapshot has single genesis block hash
            expect(retrieved!.snapshot.blockHashes).toEqual([`genesis_block_${snapshotName}`]);
        });

        vitestIt("preserves snapshot metadata correctly", async (context: SimpleTC) => {
            const { cache } = context;
            const snapshotName = "metadata-snapshot";

            const original = createCachedSnapshot(snapshotName);
            original.namedRecords = { record1: "value1", record2: "value2" };

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, original, null as any);
            const retrieved = await cache.find(snapshotName, null as any);

            expect(retrieved).not.toBeNull();
            expect(retrieved!.snapshot.name).toBe(snapshotName);
            expect(retrieved!.snapshot.seed).toBe(12345);
            expect(retrieved!.snapshot.slot).toBe(100);
            expect(retrieved!.parentSnapName).toBe("genesis");
            expect(retrieved!.parentHash).toBeNull();
            // Root snapshot: snapshotHash = genesis block hash
            expect(retrieved!.snapshotHash).toBe(`genesis_block_${snapshotName}`);
            expect(retrieved!.namedRecords).toEqual({ record1: "value1", record2: "value2" });
        });
    });

    vitestDescribe("has", () => {
        vitestIt("returns false for unregistered snapshot", async (context: SimpleTC) => {
            const { cache } = context;
            // Unregistered snapshots return false
            expect(await cache.has("does-not-exist", null as any)).toBe(false);
        });

        vitestIt("returns true after storing", async (context: SimpleTC) => {
            const { cache } = context;
            const snapshotName = "has-test-snapshot";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            expect(await cache.has(snapshotName, null as any)).toBe(false);

            await cache.store(snapshotName, createCachedSnapshot(snapshotName), null as any);
            expect(await cache.has(snapshotName, null as any)).toBe(true);
        });
    });

    vitestDescribe("delete", () => {
        vitestIt("returns false for unregistered snapshot", async (context: SimpleTC) => {
            const { cache } = context;
            expect(await cache.delete("does-not-exist", null as any)).toBe(false);
        });

        vitestIt("deletes existing cache entry and children (REQT-1.2.9.4)", async (context: SimpleTC) => {
            const { cache } = context;
            const snapshotName = "to-delete";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, createCachedSnapshot(snapshotName), null as any);
            expect(await cache.has(snapshotName, null as any)).toBe(true);

            const deleted = await cache.delete(snapshotName, null as any);
            expect(deleted).toBe(true);
            expect(await cache.has(snapshotName, null as any)).toBe(false);

            const result = await cache.find(snapshotName, null as any);
            expect(result).toBeNull();
        });
    });

    vitestDescribe("getCacheDir", () => {
        vitestIt("returns correct cache directory path", (context: SimpleTC) => {
            const { cache, tempDir } = context;
            const expected = join(tempDir, ".stellar", "emu");
            expect(cache.getCacheDir()).toBe(expected);
        });

        vitestIt("creates cache directory if it does not exist", (context: SimpleTC) => {
            const { cache } = context;
            expect(existsSync(cache.getCacheDir())).toBe(true);
        });
    });

    vitestDescribe("freshness management (REQT-1.2.7.1)", () => {
        vitestIt("touches directory older than 1 day on read", async (context: SimpleTC) => {
            const { cache, tempDir } = context;
            const snapshotName = "freshness";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, createCachedSnapshot(snapshotName), null as any);

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

            // Clear in-memory cache to force disk read
            // (touch only happens when reading FROM disk, not from memory)
            (cache as any).loadedSnapshots.clear();

            // Read the snapshot (should touch the directory)
            await cache.find(snapshotName, null as any);

            const newStats = statSync(fullDirPath);
            const newMtime = newStats.mtimeMs;

            // Directory should have been touched (mtime should be newer)
            expect(newMtime).toBeGreaterThan(oldMtime);
        });

        vitestIt("does not touch recent directories", async (context: SimpleTC) => {
            const { cache, tempDir } = context;
            const snapshotName = "recent";

            cache.register(snapshotName, { parentSnapName: "genesis" });
            await cache.store(snapshotName, createCachedSnapshot(snapshotName), null as any);

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
            await cache.find(snapshotName, null as any);

            const afterStats = statSync(fullDirPath);
            const afterMtime = afterStats.mtimeMs;

            // Directory should NOT have been touched (mtime should be the same)
            expect(afterMtime).toBe(beforeMtime);
        });
    });

    vitestDescribe("hierarchical directory structure (REQT-1.2.9)", () => {
        vitestIt("stores snapshots in hierarchical directories", async (context: SimpleTC) => {
            const { cache, tempDir } = context;
            const parentName = "parent-snap";
            const childName = "child-snap";

            // Create parent
            cache.register(parentName, { parentSnapName: "genesis" });
            const parentSnapshot = createCachedSnapshot(parentName);
            await cache.store(parentName, parentSnapshot, null as any);

            // Create child
            const parentHash = parentSnapshot.snapshotHash;
            cache.register(childName, { parentSnapName: parentName as ParentSnapName });
            const childSnapshot = createCachedSnapshot(childName, parentName as ParentSnapName, parentHash);
            await cache.store(childName, childSnapshot, null as any);

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

        vitestIt("deleting parent removes child directories (subtree deletion)", async (context: SimpleTC) => {
            const { cache, tempDir } = context;
            const parentName = "parent-to-delete";
            const childName = "child-to-delete";

            // Create parent and child
            cache.register(parentName, { parentSnapName: "genesis" });
            const parentSnapshot = createCachedSnapshot(parentName);
            await cache.store(parentName, parentSnapshot, null as any);

            cache.register(childName, { parentSnapName: parentName as ParentSnapName });
            const childSnapshot = createCachedSnapshot(childName, parentName as ParentSnapName, parentSnapshot.snapshotHash);
            await cache.store(childName, childSnapshot, null as any);

            // Verify both exist
            expect(await cache.has(parentName, null as any)).toBe(true);
            expect(await cache.has(childName, null as any)).toBe(true);

            // Delete parent (should also delete child)
            const deleted = await cache.delete(parentName, null as any);
            expect(deleted).toBe(true);

            // Both should be gone
            expect(await cache.has(parentName, null as any)).toBe(false);
            // Child's cache key depends on parent, so find() will fail to resolve parent
            expect(await cache.has(childName, null as any)).toBe(false);
        });
    });
});

// Egg/Chicken Pattern Tests (REQT-3.6)
// These tests use actual Capo test helpers to verify the egg/chicken pattern works correctly

describe("Egg/Chicken Pattern for Disk Cache (REQT-3.6)", () => {
    beforeEach<CapoTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("Pre-selected Seed UTxO (REQT-3.6.1)", () => {
        it("stores targetSeedUtxo in actors snapshot offchainData", async ({ h }: CapoTC) => {

            // Bootstrap actors only (not full bootstrap to isolate the test)
            await h.snapToBootstrapWithActors();

            // Find the actors snapshot
            const actorsSnap = await h.snapshotCache.find(SNAP_ACTORS, h);
            expect(actorsSnap).not.toBeNull();

            // Verify targetSeedUtxo is stored in offchainData
            const targetSeedUtxo = actorsSnap!.offchainData?.targetSeedUtxo as PreSelectedSeedUtxo | undefined;
            expect(targetSeedUtxo).toBeDefined();
            expect(targetSeedUtxo!.txId).toBeDefined();
            expect(typeof targetSeedUtxo!.txId).toBe("string");
            expect(targetSeedUtxo!.utxoIdx).toBeDefined();
            expect(typeof targetSeedUtxo!.utxoIdx).toBe("number");
        });

        it("pre-selected seed UTxO is accessible via getPreSelectedSeedUtxo()", async ({ h }: CapoTC) => {

            await h.snapToBootstrapWithActors();

            const seedUtxo = h.getPreSelectedSeedUtxo();
            expect(seedUtxo).toBeDefined();
            expect(seedUtxo!.txId).toBeDefined();
            expect(seedUtxo!.utxoIdx).toBeGreaterThanOrEqual(0);
        });
    });

    describe("Capo Config Storage (REQT-3.6.4)", () => {
        it("stores capoConfig in capoInitialized snapshot offchainData", async ({ h }: CapoTC) => {

            // Full bootstrap to create capoInitialized snapshot
            await h.reusableBootstrap();

            // Find the capoInitialized snapshot
            const capoSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            expect(capoSnap).not.toBeNull();

            // Verify capoConfig is stored in offchainData
            const capoConfig = capoSnap!.offchainData?.capoConfig as Record<string, any> | undefined;
            expect(capoConfig).toBeDefined();
            expect(capoConfig!.mph).toBeDefined();
            expect(capoConfig!.seedTxn).toBeDefined();
            expect(capoConfig!.seedIndex).toBeDefined();
            expect(capoConfig!.rootCapoScriptHash).toBeDefined();
        });
    });

    describe("Egg-Compatible Resolvers (REQT-3.6.2, REQT-3.6.3)", () => {
        it("resolvers work without chartered Capo (using egg)", async ({ h }: CapoTC) => {

            // Only set up actors (creates egg for cache key computation)
            await h.snapToBootstrapWithActors();

            // At this point, no Capo is chartered yet (may be undefined or egg)
            // The resolvers should still be able to compute cache keys

            // Verify actors dependencies resolve
            const actorsDeps = h.resolveActorsDependencies();
            expect(actorsDeps.bundles).toEqual([]);
            expect(actorsDeps.extra?.actors).toBeDefined();
            expect(actorsDeps.extra?.randomSeed).toBe(42);

            // Now try to resolve core Capo dependencies (will create egg if needed)
            const coreDeps = await h.resolveCoreCapoDependencies();
            expect(coreDeps.bundles.length).toBeGreaterThan(0);
            expect(coreDeps.bundles[0].sourceHash).toBeDefined();
            // The first bundle should have seedUtxo in params (identity param)
            expect(coreDeps.bundles[0].params.seedUtxo).toBeDefined();
        });

        it("sourceHash is computed without configuredParams", async ({ h }: CapoTC) => {

            await h.snapToBootstrapWithActors();

            // Resolve core dependencies - this should use computeSourceHash() not getCacheKeyInputs()
            const coreDeps = await h.resolveCoreCapoDependencies();

            // Verify we got source hashes (not derived params like mph)
            for (const bundle of coreDeps.bundles) {
                expect(bundle.sourceHash).toBeDefined();
                expect(bundle.sourceHash.length).toBeGreaterThan(0);
                // Params should NOT contain mph (derived value) - only seedUtxo for first bundle
            }
        });
    });

    describe("Capo Reconstruction Decision Tree (REQT-3.6.5)", () => {
        it("creates chartered Capo on fresh bootstrap", async ({ h }: CapoTC) => {

            const capo = await h.reusableBootstrap();

            expect(capo).toBeDefined();
            expect(capo.mintingPolicyHash).toBeDefined();
            expect(h.helperState?.bootstrappedStrella).toBe(capo);
        });

        it("reuses Capo on subsequent bootstrap (same process)", async ({ h }: CapoTC) => {

            // First bootstrap
            const capo1 = await h.reusableBootstrap();
            const mph1 = capo1.mintingPolicyHash?.toHex();

            // Second bootstrap in same process should reuse via restoreFrom
            const capo2 = await h.reusableBootstrap();
            const mph2 = capo2.mintingPolicyHash?.toHex();

            // Same mph means same Capo identity
            expect(mph1).toBe(mph2);
        });
    });
});

// Cache Key Consistency Tests - verify find() and store() compute the same cache key
// Bug: Constructor registers bootstrapWithActors resolver WITHOUT setupActors() guard,
// so find() computes cache key with actorCount=0, while store() (after build) sees actorCount=6.

describe("Cache Key Consistency (bootstrapWithActors resolver)", () => {
    beforeEach<CapoTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    it("registered resolver populates actors before computing cache key", async ({ h }: CapoTC) => {
        // The snapshotCache registry should have a resolver for bootstrapWithActors
        const entry = (h.snapshotCache as any).registry.get(SNAP_ACTORS);
        expect(entry).toBeDefined();
        expect(entry.resolveScriptDependencies).toBeDefined();

        // Simulate the state find() sees: fresh helper, no actors yet
        h.actorSetupInfo = [];

        // Call the resolver exactly as find() does
        const inputs = await entry.resolveScriptDependencies(h);

        // The resolver MUST have called setupActors() to populate the actor list.
        // If it didn't, actorCount=0 and find() computes a different cache key than store().
        expect(inputs.extra.actors.length).toBeGreaterThan(0);
    });

    it("find() and store() would compute the same cache key", async ({ h }: CapoTC) => {
        const entry = (h.snapshotCache as any).registry.get(SNAP_ACTORS);
        expect(entry).toBeDefined();

        // Simulate find() path: no actors yet
        h.actorSetupInfo = [];
        const findInputs = await entry.resolveScriptDependencies(h);
        const findKey = h.snapshotCache.computeKey(null, findInputs);

        // Simulate store() path: actors have been created by the builder
        // (setupActors was already called above if resolver is correct,
        //  but if not, call it now to simulate what the builder does)
        if (h.actorSetupInfo.length === 0) {
            await h.setupActors();
        }
        const storeInputs = await entry.resolveScriptDependencies(h);
        const storeKey = h.snapshotCache.computeKey(null, storeInputs);

        // Both keys MUST match — otherwise cache is permanently broken
        expect(findKey).toBe(storeKey);
    });
});

// Incremental Storage Tests - verify correct transaction counts at each snapshot level
// These tests verify that:
// 1. Root snapshot (actors) stores all genesis transactions
// 2. Child snapshots store ONLY incremental blocks (not parent blocks)
// 3. Loaded snapshots have accumulated state from parent chain

describe("Incremental Snapshot Storage (REQT-1.2.5)", () => {
    beforeEach<CapoTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, DefaultCapoTestHelper);
    });

    describe("Actors snapshot (root)", () => {
        it("has genesis transactions in the genesis array", async ({ h }: CapoTC) => {
            await h.snapToBootstrapWithActors();

            const actorsSnap = await h.snapshotCache.find(SNAP_ACTORS, h);
            expect(actorsSnap).not.toBeNull();

            // Root snapshot should have genesis transactions
            const genesisCount = actorsSnap!.snapshot.genesis.length;
            expect(genesisCount).toBeGreaterThan(0);
            console.log(`  Actors snapshot: ${genesisCount} genesis transactions`);
        });

        it("stored file has blocks=[] but preserves blockHashes for chain integrity", async ({ h }: CapoTC) => {
            await h.snapToBootstrapWithActors();

            const actorsSnap = await h.snapshotCache.find(SNAP_ACTORS, h);
            expect(actorsSnap).not.toBeNull();

            // Read the raw stored file
            const snapshotPath = actorsSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            // Root snapshot: blocks=[] (not stored), but blockHashes preserved for snapshotHash
            expect(fileContent.snapshot.blocks.length).toBe(0);
            expect(fileContent.snapshot.blockHashes.length).toBeGreaterThan(0); // Genesis block hash preserved
            console.log(`  Actors stored: genesis=${fileContent.snapshot.genesis.length}, blocks=${fileContent.snapshot.blocks.length}, blockHashes=${fileContent.snapshot.blockHashes.length}`);
        });

        it("stored file has parentBlockCount=0", async ({ h }: CapoTC) => {
            await h.snapToBootstrapWithActors();

            const actorsSnap = await h.snapshotCache.find(SNAP_ACTORS, h);
            expect(actorsSnap).not.toBeNull();

            // Read the raw stored file to verify parentBlockCount
            const snapshotPath = actorsSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            expect(fileContent.parentBlockCount).toBe(0);
            expect(fileContent.parentSnapName).toBe("genesis");
        });
    });

    describe("CapoInitialized snapshot (child of actors)", () => {
        beforeEach<CapoTC>(async (context) => {
            await context.h.reusableBootstrap();
        })
        it("loaded snapshot has accumulated genesis from parent", async ({ h }: CapoTC) => {

            const capoSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            expect(capoSnap).not.toBeNull();

            // Loaded snapshot should have genesis transactions (inherited from parent)
            const genesisCount = capoSnap!.snapshot.genesis.length;
            expect(genesisCount).toBeGreaterThan(0);
            console.log(`  CapoInit loaded: ${genesisCount} genesis transactions (inherited)`);
        });

        it("loaded snapshot has parent block + incremental blocks", async ({ h }: CapoTC) => {

            const capoSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            expect(capoSnap).not.toBeNull();

            // Read the stored file to get stored block count
            const snapshotPath = capoSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            const loadedBlockCount = capoSnap!.snapshot.blocks.length;
            const storedIncrementalCount = fileContent.snapshot.blocks.length;

            // Stored = incremental blocks only (charter minting creates multiple blocks)
            // Loaded = parent's genesis block (1) + incremental blocks
            // Incremental = loaded - 1 (parent has 1 genesis block)
            expect(storedIncrementalCount).toBe(loadedBlockCount - 1);
            expect(storedIncrementalCount).toBeGreaterThan(0);

            console.log(`  CapoInit loaded: ${loadedBlockCount} blocks (stored incremental: ${storedIncrementalCount})`);
        });

        it("stored file has ONLY incremental blocks (not parent blocks)", async ({ h }: CapoTC) => {

            const capoSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            expect(capoSnap).not.toBeNull();

            // Read the raw stored file
            const snapshotPath = capoSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            const storedBlockCount = fileContent.snapshot.blocks.length;
            const loadedBlockCount = capoSnap!.snapshot.blocks.length;

            // Stored = incremental only (charter minting creates multiple blocks)
            // Loaded = parent genesis block (1) + incremental
            expect(storedBlockCount).toBe(loadedBlockCount - 1);
            expect(storedBlockCount).toBeGreaterThan(0);

            console.log(`  CapoInit stored: ${storedBlockCount} incremental, loaded: ${loadedBlockCount} total`);
        });

        it("stored file should have EMPTY genesis array (inherited from parent)", async ({ h }: CapoTC) => {

            const capoSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            expect(capoSnap).not.toBeNull();

            // Read the raw stored file
            const snapshotPath = capoSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            // Child snapshots should NOT store genesis (they inherit from parent)
            const storedGenesisCount = fileContent.snapshot.genesis.length;
            expect(storedGenesisCount).toBe(0);

            console.log(`  CapoInit stored: ${storedGenesisCount} genesis (should be 0)`);
        });

        it("first stored block should NOT contain genesis transactions", async ({ h }: CapoTC) => {

            const capoSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            expect(capoSnap).not.toBeNull();

            // Read the raw stored file
            const snapshotPath = capoSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            // If there are stored blocks, the first one should NOT be the genesis block
            if (fileContent.snapshot.blocks.length > 0) {
                const firstBlock = fileContent.snapshot.blocks[0];
                const hasGenesisType = firstBlock.some((tx: any) => tx.type === "genesis");
                expect(hasGenesisType).toBe(false);

                console.log(`  CapoInit stored first block: ${firstBlock.length} txs, hasGenesis: ${hasGenesisType}`);
            }
        });
    });

    describe("EnabledDelegatesDeployed snapshot (child of capoInit)", () => {
        beforeEach<CapoTC>(async (context) => {
            await context.h.reusableBootstrap();
        })
        it("stored file has ONLY incremental blocks", async ({ h }: CapoTC) => {

            const delegatesSnap = await h.snapshotCache.find(SNAP_DELEGATES, h);
            expect(delegatesSnap).not.toBeNull();

            // Read the raw stored file
            const snapshotPath = delegatesSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            const storedBlockCount = fileContent.snapshot.blocks.length;
            const loadedBlockCount = delegatesSnap!.snapshot.blocks.length;

            // Get parent (capoInit) block count to verify incremental storage
            const capoInitSnap = await h.snapshotCache.find(SNAP_CAPO_INIT, h);
            const parentBlockCount = capoInitSnap!.snapshot.blocks.length;

            // Loaded = parent blocks + incremental delegate blocks
            // Stored = only incremental (loaded - parent)
            expect(loadedBlockCount).toBeGreaterThanOrEqual(parentBlockCount);
            expect(storedBlockCount).toBe(loadedBlockCount - parentBlockCount);

            console.log(`  Delegates stored: ${storedBlockCount} incremental blocks, loaded: ${loadedBlockCount} total (parent: ${parentBlockCount})`);
        });

        it("stored file should have EMPTY genesis array", async ({ h }: CapoTC) => {

            const delegatesSnap = await h.snapshotCache.find(SNAP_DELEGATES, h);
            expect(delegatesSnap).not.toBeNull();

            // Read the raw stored file
            const snapshotPath = delegatesSnap!.path;
            expect(snapshotPath).toBeDefined();
            const fileContent = JSON.parse(readFileSync(join(snapshotPath!, "snapshot.json"), "utf-8"));

            // Child snapshots should NOT store genesis
            expect(fileContent.snapshot.genesis.length).toBe(0);
        });
    });

    describe("UTxO accumulation correctness", () => {
        beforeEach<CapoTC>(async (context) => {
            await context.h.reusableBootstrap();
        });

        it("loaded child has all parent UTxOs plus new ones", async ({ h }: CapoTC) => {

            const actorsSnap = await h.snapshotCache.find(SNAP_ACTORS, h);
            const delegatesSnap = await h.snapshotCache.find(SNAP_DELEGATES, h);
            expect(actorsSnap).not.toBeNull();
            expect(delegatesSnap).not.toBeNull();

            const parentUtxoCount = Object.keys(actorsSnap!.snapshot.allUtxos).length;
            const childUtxoCount = Object.keys(delegatesSnap!.snapshot.allUtxos).length;

            // Child should have different UTxO count (some consumed, some created)
            // The exact relationship depends on the transactions, but child should have UTxOs
            expect(childUtxoCount).toBeGreaterThan(0);

            console.log(`  Actors UTxOs: ${parentUtxoCount}, Delegates UTxOs: ${childUtxoCount}`);
        });

        it("addressUtxos arrays should not have duplicates", async ({ h }: CapoTC) => {

            const delegatesSnap = await h.snapshotCache.find(SNAP_DELEGATES, h);
            expect(delegatesSnap).not.toBeNull();

            // Check for duplicate UTxOs in addressUtxos
            for (const [addr, utxos] of Object.entries(delegatesSnap!.snapshot.addressUtxos)) {
                const ids = utxos.map(u => u.id.toString());
                const uniqueIds = new Set(ids);

                if (ids.length !== uniqueIds.size) {
                    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
                    console.log(`  DUPLICATE UTxOs at ${addr.slice(0, 20)}...: ${duplicates.join(", ")}`);
                }

                expect(ids.length).toBe(uniqueIds.size);
            }
        });
    });
});

// --- Regression test for partial-cache actor setup (C-1, REQT/j9b8pr7yck) ---

/**
 * Test helper that adds a snapshot with actor: "tracy" (not the default "tina").
 * The builder deliberately does NOT call setActor() — it relies on the
 * pre-build actor setup (a) in the contentBuilder lambda.
 */
class PartialCacheTestHelper extends DefaultCapoTestHelper {
    /** Records which actor was active when the builder ran */
    builderEntryActor: string | undefined;

    @CapoTestHelper.hasNamedSnapshot({
        actor: "tracy",
        parentSnapName: "bootstrapped",
        builderVersion: undefined,
    })
    async snapToActorVerification() {
        return this.actorVerification();
    }

    async actorVerification() {
        // Record the actor at entry — NO defensive setActor() call
        this.builderEntryActor = this.actorName;
        // Trivial operation so the snapshot captures something
        this.network.tick(1);
        return this.strella;
    }
}

type PartialCacheTC = StellarTestContext<PartialCacheTestHelper>;
const describePartialCache = descrWithContext<PartialCacheTC>;
const itPartialCache = itWithContext<PartialCacheTC>;

describePartialCache("Pre-build actor setup on partial-cache rebuild (REQT/j9b8pr7yck)", () => {
    beforeEach<PartialCacheTC>(async (context) => {
        await new Promise((res) => setTimeout(res, 10));
        await addTestContext(context, PartialCacheTestHelper);
    });

    itPartialCache("builder sees declared actor when parent is cached but child is not", async ({ h }: PartialCacheTC) => {
        // Step 1: Warm up full chain including the test snapshot
        await h.snapToActorVerification();

        // Step 2: Find the child's disk cache path
        const snap = await h.snapshotCache.find("actorVerification", h);
        expect(snap).not.toBeNull();
        expect(snap!.path).toBeDefined();
        const childCachePath = snap!.path!;
        expect(existsSync(childCachePath)).toBe(true);

        // Step 3: Delete child's disk cache only (parent chain stays on disk)
        rmSync(childCachePath, { recursive: true });
        expect(existsSync(childCachePath)).toBe(false);

        // Step 4: Clear in-memory snapshot cache (forces disk lookups)
        (h.snapshotCache as any).loadedSnapshots.clear();

        // Step 5: Set a different actor to create observable stale state
        await h.setActor("tom");
        h.builderEntryActor = undefined;

        // Step 6: Load the snapshot again — parent hits disk, child misses → triggers build
        await h.snapToActorVerification();

        // Step 7: Verify the builder saw the declared actor ("tracy"), not the stale one ("tom")
        // REQT/j9b8pr7yck: pre-build actor setup must fire before the builder
        expect(h.builderEntryActor).toBe("tracy");
    });
});
