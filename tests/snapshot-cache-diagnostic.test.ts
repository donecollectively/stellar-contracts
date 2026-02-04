/**
 * Diagnostic test for SnapshotCache cache key computation bug.
 *
 * Bug: Two snapshots with identical key-inputs.json have different directory hashes.
 * This happens because the cache key includes parentHash, which is the parent's snapshotHash.
 * If the parent's snapshotHash varies between test runs (even though the parent directory is the same),
 * children will have different cache keys.
 */
import { expect, beforeEach } from "vitest";
import {
    CapoForDgDataPolicy_testHelper,
    helperState,
    describe,
    it,
    fit,
    xit,
} from "./CapoForDgDataPolicyTestHelper.js";
import type { TestContext_CapoForDgData } from "./CapoForDgDataPolicyTestHelper.js";
import { SnapshotCache } from "../src/testing/emulator/SnapshotCache.js";
import { CapoCanMintGenericUuts } from "./CapoCanMintGenericUuts.js";
import { existsSync, readFileSync } from "fs";

type localTC = TestContext_CapoForDgData;

/**
 * Read snapshot hashes directly from disk to compare with what's in memory.
 */
function readDiskSnapshotHash(path: string): string | null {
    const snapshotPath = `${path}/snapshot.json`;
    if (!existsSync(snapshotPath)) return null;
    try {
        const content = JSON.parse(readFileSync(snapshotPath, "utf-8"));
        return content.snapshotHash || null;
    } catch {
        return null;
    }
}

describe("SnapshotCache diagnostic", () => {
    // Track hashes across tests for comparison
    const hashLog: Record<string, string[]> = {};

    function logHash(name: string, hash: string) {
        if (!hashLog[name]) hashLog[name] = [];
        if (!hashLog[name].includes(hash)) {
            hashLog[name].push(hash);
            console.log(`  📊 ${name}: ${hash} (variant #${hashLog[name].length})`);
        } else {
            console.log(`  ✅ ${name}: ${hash} (matches existing)`);
        }
    }

    fit("DIAGNOSTIC: Track snapshotHash chain from genesis to installingTestDataPolicy", async (context: localTC) => {
        const { h } = context;
        const snapshotCache = h.snapshotCache;

        // Clear in-memory cache to force disk reads
        console.log("\n=== STEP 1: Clear in-memory cache ===");
        (snapshotCache as any).loadedSnapshots.clear();

        // Check disk state BEFORE any operations
        console.log("\n=== STEP 2: Check disk state BEFORE bootstrap ===");
        const cacheDir = snapshotCache.getCacheDir();
        const actorsDir = `${cacheDir}/bootstrapWithActors-b823a8cf4c38bcfb65039a57601dd119`;
        const capoDir = `${actorsDir}/capoInitialized-999979e0e9de373e1e83da96fe85511b`;

        const diskActorsHash = readDiskSnapshotHash(actorsDir);
        const diskCapoHash = readDiskSnapshotHash(capoDir);

        console.log("  Disk bootstrapWithActors.snapshotHash:", diskActorsHash);
        console.log("  Disk capoInitialized.snapshotHash:", diskCapoHash);

        // Now do bootstrap
        console.log("\n=== STEP 3: Call reusableBootstrap() ===");
        await h.reusableBootstrap();

        // Check memory state AFTER bootstrap
        console.log("\n=== STEP 4: Check memory state AFTER bootstrap ===");
        const memActors = await snapshotCache.find("bootstrapWithActors", h);
        const memCapo = await snapshotCache.find("capoInitialized", h);
        const memDelegates = await snapshotCache.find("enabledDelegatesDeployed", h);

        console.log("  Memory bootstrapWithActors.snapshotHash:", memActors?.snapshotHash);
        console.log("  Memory capoInitialized.snapshotHash:", memCapo?.snapshotHash);
        console.log("  Memory capoInitialized.parentHash:", memCapo?.parentHash);
        console.log("  Memory enabledDelegatesDeployed.snapshotHash:", memDelegates?.snapshotHash);
        console.log("  Memory enabledDelegatesDeployed.parentHash:", memDelegates?.parentHash);

        // Check if disk was updated
        console.log("\n=== STEP 5: Check disk state AFTER bootstrap ===");
        const diskActorsHash2 = readDiskSnapshotHash(actorsDir);
        const diskCapoHash2 = readDiskSnapshotHash(capoDir);

        console.log("  Disk bootstrapWithActors.snapshotHash:", diskActorsHash2);
        console.log("  Disk capoInitialized.snapshotHash:", diskCapoHash2);

        if (diskActorsHash !== diskActorsHash2) {
            console.log("  ⚠️ bootstrapWithActors.snapshotHash CHANGED on disk!");
        }
        if (diskCapoHash !== diskCapoHash2) {
            console.log("  ⚠️ capoInitialized.snapshotHash CHANGED on disk!");
        }

        // Check parent hash chain consistency
        console.log("\n=== STEP 6: Verify parent hash chain ===");
        const actorsHash = memActors?.snapshotHash;
        const capoParentHash = memCapo?.parentHash;
        const capoHash = memCapo?.snapshotHash;
        const delegatesParentHash = memDelegates?.parentHash;

        console.log("  bootstrapWithActors.snapshotHash:", actorsHash);
        console.log("  capoInitialized.parentHash:", capoParentHash);
        console.log("  Match?:", actorsHash === capoParentHash);

        console.log("  capoInitialized.snapshotHash:", capoHash);
        console.log("  enabledDelegatesDeployed.parentHash:", delegatesParentHash);
        console.log("  Match?:", capoHash === delegatesParentHash);

        // Now access installingTestDataPolicy
        console.log("\n=== STEP 7: Access installingTestDataPolicy ===");
        await h.snapToInstallingTestDataPolicy();

        const memInstall = await snapshotCache.find("installingTestDataPolicy", h);
        console.log("  installingTestDataPolicy.path:", memInstall?.path);
        console.log("  installingTestDataPolicy.snapshotHash:", memInstall?.snapshotHash);
        console.log("  installingTestDataPolicy.parentHash:", memInstall?.parentHash);
        console.log("  capoInitialized.snapshotHash:", memCapo?.snapshotHash);
        console.log("  Parent hash match?:", memInstall?.parentHash === memCapo?.snapshotHash);

        // Compute expected cache key
        const expectedKey = snapshotCache.computeKey(
            memInstall?.parentHash || null,
            { bundles: [] }
        );
        console.log("  Expected cacheKey:", expectedKey);
        console.log("  Actual directory:", memInstall?.path?.split("/").pop());

        expect(true).toBe(true);
    });
});
