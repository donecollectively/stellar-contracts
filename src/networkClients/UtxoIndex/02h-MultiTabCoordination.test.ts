/**
 * Tests for Multi-Tab Coordination (Sync Mutex + Write Lock)
 *
 * Tests use dual DexieUtxoStore instances sharing the same database name
 * to simulate multi-tab contention within a single test process.
 * fake-indexeddb provides the IndexedDB polyfill.
 *
 * REQT/3c2s5nryvn (Sync Mutex)
 * REQT/jp1wtj9pfz (Write Lock)
 */

// MUST be first - polyfills IndexedDB globally for Node.js
import "fake-indexeddb/auto";

import { describe, it, expect, afterEach } from "vitest";
import Dexie from "dexie";

import { DexieUtxoStore } from "./DexieUtxoStore.js";

// =========================================================================
// Helpers
// =========================================================================

const dbsToCleanup: string[] = [];

function makeDbName(testName: string): string {
    const name = `test-coordination-${testName}-${Date.now()}`;
    dbsToCleanup.push(name);
    return name;
}

function makeDualStores(testName: string): {
    storeA: DexieUtxoStore;
    storeB: DexieUtxoStore;
} {
    const dbName = makeDbName(testName);
    const storeA = new DexieUtxoStore(dbName);
    const storeB = new DexieUtxoStore(dbName);
    return { storeA, storeB };
}

afterEach(async () => {
    for (const name of dbsToCleanup) {
        try {
            await Dexie.delete(name);
        } catch (_) {
            // ignore cleanup errors
        }
    }
    dbsToCleanup.length = 0;
});

const PID_A = 100;
const PID_B = 200;
const STALENESS_MS = 15_000;

// =========================================================================
// Phase 1: Sync Mutex (REQT/3c2s5nryvn)
// =========================================================================

describe("Sync Mutex (REQT/3c2s5nryvn)", () => {
    // --- Mutex Acquisition (REQT/f3w3hkjt4t) ---

    it("acquires mutex when absent (mutex-acquire-absent/REQT/f3w3hkjt4t)", async () => {
        const { storeA } = makeDualStores("acquire-absent");
        const acquired = await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        expect(acquired).toBe(true);

        // Verify mutex row exists with correct pid
        const raw = await storeA.getMetadata("syncMutex");
        expect(raw).toBeDefined();
        const mutex = JSON.parse(raw!);
        expect(mutex.pid).toBe(PID_A);
        expect(mutex.timestamp).toBeGreaterThan(0);
    });

    it("fails to acquire when another tab holds a fresh mutex (mutex-acquire-contention/REQT/f3w3hkjt4t)", async () => {
        const { storeA, storeB } = makeDualStores("acquire-contention");

        const acqA = await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        expect(acqA).toBe(true);

        // B tries to acquire — should fail (A's mutex is fresh)
        const acqB = await storeB.tryAcquireSyncMutex(PID_B, STALENESS_MS);
        expect(acqB).toBe(false);

        // Verify A still owns it
        const raw = await storeA.getMetadata("syncMutex");
        const mutex = JSON.parse(raw!);
        expect(mutex.pid).toBe(PID_A);
    });

    it("concurrent acquisition yields exactly one winner (mutex-cas-atomicity/REQT/f3w3hkjt4t)", async () => {
        const { storeA, storeB } = makeDualStores("cas-race");

        // Both attempt acquisition simultaneously
        const [resultA, resultB] = await Promise.all([
            storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS),
            storeB.tryAcquireSyncMutex(PID_B, STALENESS_MS),
        ]);

        // Exactly one must succeed (XOR)
        expect(resultA !== resultB).toBe(true);

        // Mutex row has exactly one pid
        const raw = await storeA.getMetadata("syncMutex");
        const mutex = JSON.parse(raw!);
        const winnerPid = resultA ? PID_A : PID_B;
        expect(mutex.pid).toBe(winnerPid);
    });

    it("re-acquires own mutex (freshens) (mutex-reacquire-own/REQT/f3w3hkjt4t)", async () => {
        const { storeA } = makeDualStores("reacquire-own");

        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        const rawBefore = await storeA.getMetadata("syncMutex");
        const tsBefore = JSON.parse(rawBefore!).timestamp;

        // Small delay so timestamp advances
        await new Promise((r) => setTimeout(r, 5));

        // Re-acquire with same pid — should succeed and freshen
        const reacquired = await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        expect(reacquired).toBe(true);

        const rawAfter = await storeA.getMetadata("syncMutex");
        const tsAfter = JSON.parse(rawAfter!).timestamp;
        expect(tsAfter).toBeGreaterThan(tsBefore);
    });

    it("takes over stale mutex (mutex-stale-takeover/REQT/f3w3hkjt4t)", async () => {
        const { storeA, storeB } = makeDualStores("stale-takeover");

        // A acquires
        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);

        // Simulate staleness: write mutex with a past timestamp
        const staleTimestamp = Date.now() - STALENESS_MS - 1000;
        await storeA.setMetadata(
            "syncMutex",
            JSON.stringify({ pid: PID_A, timestamp: staleTimestamp })
        );

        // B detects staleness and takes over
        const acqB = await storeB.tryAcquireSyncMutex(PID_B, STALENESS_MS);
        expect(acqB).toBe(true);

        const raw = await storeB.getMetadata("syncMutex");
        const mutex = JSON.parse(raw!);
        expect(mutex.pid).toBe(PID_B);
    });

    // --- Mutex Freshening (REQT/ekyatca2kq) ---

    it("freshens timestamp when owning (mutex-freshen/REQT/ekyatca2kq)", async () => {
        const { storeA } = makeDualStores("freshen");

        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        const rawBefore = await storeA.getMetadata("syncMutex");
        const tsBefore = JSON.parse(rawBefore!).timestamp;

        await new Promise((r) => setTimeout(r, 5));

        const freshened = await storeA.freshenSyncMutex(PID_A);
        expect(freshened).toBe(true);

        const rawAfter = await storeA.getMetadata("syncMutex");
        const tsAfter = JSON.parse(rawAfter!).timestamp;
        expect(tsAfter).toBeGreaterThan(tsBefore);
    });

    it("freshen fails when not owning (mutex-freshen-not-owner/REQT/ekyatca2kq)", async () => {
        const { storeA, storeB } = makeDualStores("freshen-not-owner");

        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);

        // B tries to freshen — should fail
        const freshened = await storeB.freshenSyncMutex(PID_B);
        expect(freshened).toBe(false);

        // A's mutex unchanged
        const raw = await storeA.getMetadata("syncMutex");
        expect(JSON.parse(raw!).pid).toBe(PID_A);
    });

    it("freshen fails when no mutex exists (mutex-freshen-absent/REQT/ekyatca2kq)", async () => {
        const { storeA } = makeDualStores("freshen-absent");
        const freshened = await storeA.freshenSyncMutex(PID_A);
        expect(freshened).toBe(false);
    });

    // --- Graceful Release (REQT/e0rzdrc7ts) ---

    it("releases mutex when owning (graceful-release/REQT/e0rzdrc7ts)", async () => {
        const { storeA } = makeDualStores("graceful-release");

        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        const released = await storeA.releaseSyncMutex(PID_A);
        expect(released).toBe(true);

        // Verify row is gone
        const raw = await storeA.getMetadata("syncMutex");
        expect(raw).toBeUndefined();
    });

    it("release fails when not owning (release-not-owner/REQT/e0rzdrc7ts)", async () => {
        const { storeA, storeB } = makeDualStores("release-not-owner");

        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        const released = await storeB.releaseSyncMutex(PID_B);
        expect(released).toBe(false);

        // A's mutex still present
        const raw = await storeA.getMetadata("syncMutex");
        expect(raw).toBeDefined();
    });

    it("other tab acquires immediately after graceful release (fast-handoff/REQT/e0rzdrc7ts)", async () => {
        const { storeA, storeB } = makeDualStores("fast-handoff");

        await storeA.tryAcquireSyncMutex(PID_A, STALENESS_MS);
        await storeA.releaseSyncMutex(PID_A);

        // B acquires immediately — no staleness wait needed
        const acqB = await storeB.tryAcquireSyncMutex(PID_B, STALENESS_MS);
        expect(acqB).toBe(true);

        const raw = await storeB.getMetadata("syncMutex");
        expect(JSON.parse(raw!).pid).toBe(PID_B);
    });

    it("release returns false when no mutex exists (release-absent/REQT/e0rzdrc7ts)", async () => {
        const { storeA } = makeDualStores("release-absent");
        const released = await storeA.releaseSyncMutex(PID_A);
        expect(released).toBe(false);
    });

    it("does not take over mutex that is well within staleness window (mutex-boundary-fresh/REQT/f3w3hkjt4t)", async () => {
        const { storeA, storeB } = makeDualStores("boundary-fresh");

        // Write mutex with timestamp safely inside the staleness window.
        // Use half the staleness threshold to avoid timing races between
        // test setup and the CAS read inside tryAcquireSyncMutex.
        const recentTimestamp = Date.now() - Math.floor(STALENESS_MS / 2);
        await storeA.setMetadata(
            "syncMutex",
            JSON.stringify({ pid: PID_A, timestamp: recentTimestamp })
        );

        // B should fail — mutex is fresh (well within threshold)
        const acqB = await storeB.tryAcquireSyncMutex(PID_B, STALENESS_MS);
        expect(acqB).toBe(false);

        // A still owns it
        const mutex = JSON.parse((await storeA.getMetadata("syncMutex"))!);
        expect(mutex.pid).toBe(PID_A);
    });
});

// =========================================================================
// Phase 2: Write Lock (REQT/jp1wtj9pfz)
// =========================================================================

describe("Write Lock (REQT/jp1wtj9pfz)", () => {
    // --- Basic Lifecycle (REQT/jb5dhgsyfq) ---

    it("acquires and releases lock around callback (lock-lifecycle/REQT/jb5dhgsyfq)", async () => {
        const { storeA, storeB } = makeDualStores("lock-lifecycle");

        // Verify lock is acquired before callback runs by checking from
        // storeB (separate connection) after acquireWriteLock but before
        // the Dexie transaction. We use the private methods directly to
        // observe the lock row between acquisition and callback execution.
        await (storeA as any).acquireWriteLock(PID_A, "test-op");

        // Lock row should now be visible to storeB
        const rawDuring = await storeB.getMetadata("writeLock");
        expect(rawDuring).toBeDefined();
        const lockDuring = JSON.parse(rawDuring!);
        expect(lockDuring.pid).toBe(PID_A);
        expect(lockDuring.activityName).toBe("test-op");

        // Release and verify cleanup
        await (storeA as any).releaseWriteLock(PID_A);
        const rawAfter = await storeA.getMetadata("writeLock");
        expect(rawAfter).toBeUndefined();
    });

    it("withWriteLock runs callback and returns result (lock-callback/REQT/jb5dhgsyfq)", async () => {
        const { storeA } = makeDualStores("lock-callback");

        const result = await storeA.withWriteLock(
            PID_A,
            "test-op",
            ["utxos"],
            async () => "done"
        );
        expect(result).toBe("done");

        // Lock released after callback completes
        const rawAfter = await storeA.getMetadata("writeLock");
        expect(rawAfter).toBeUndefined();
    });

    it("releases lock on callback error (lock-error-release/REQT/jb5dhgsyfq)", async () => {
        const { storeA } = makeDualStores("lock-error");

        await expect(
            storeA.withWriteLock(PID_A, "failing-op", ["utxos"], async () => {
                throw new Error("boom");
            })
        ).rejects.toThrow("boom");

        // Lock must be released despite error
        const raw = await storeA.getMetadata("writeLock");
        expect(raw).toBeUndefined();
    });

    it("returns complex callback result (lock-return-value/REQT/4tsvn6259v)", async () => {
        const { storeA } = makeDualStores("lock-return");

        const result = await storeA.withWriteLock(
            PID_A,
            "compute",
            ["utxos"],
            async () => {
                // Perform a real Dexie write and return a result
                await storeA.saveUtxo({
                    utxoId: "result#0",
                    txHash: "result",
                    outputIndex: 0,
                    address: "addr_test1_result",
                    lovelace: "5000000",
                    blockHeight: 1,
                } as any);
                return { answer: 42 };
            }
        );

        expect(result).toEqual({ answer: 42 });
        // Verify the write persisted (not rolled back)
        const utxo = await storeA.findUtxoId("result#0");
        expect(utxo).toBeDefined();
    });

    // --- Contention (REQT/jb5dhgsyfq) ---

    it("second caller waits and acquires after first releases (lock-contention/REQT/jb5dhgsyfq)", async () => {
        const { storeA, storeB } = makeDualStores("contention");
        const order: string[] = [];

        // A acquires lock and does real Dexie work (no setTimeout — Dexie
        // transactions commit when the microtask queue drains, so setTimeout
        // causes PrematureCommitError)
        const p1 = storeA.withWriteLock(
            PID_A,
            "op-A",
            ["utxos"],
            async () => {
                order.push("A-start");
                // Do multiple Dexie writes to hold the lock for a meaningful duration
                for (let i = 0; i < 20; i++) {
                    await storeA.saveUtxo({
                        utxoId: `contention-a#${i}`,
                        txHash: "contention-a",
                        outputIndex: i,
                        address: "addr_test1_a",
                        lovelace: "1000000",
                        blockHeight: 1,
                    } as any);
                }
                order.push("A-end");
            }
        );

        // B attempts lock concurrently — should wait for A
        const p2 = storeB.withWriteLock(
            PID_B,
            "op-B",
            ["utxos"],
            async () => {
                order.push("B-start");
                order.push("B-end");
            }
        );

        await Promise.all([p1, p2]);
        expect(order).toEqual(["A-start", "A-end", "B-start", "B-end"]);
    });

    // --- Stale Lock Breaking (REQT/jb5dhgsyfq) ---

    it("breaks stale lock after 1s timeout (stale-lock-break/REQT/jb5dhgsyfq)", async () => {
        const { storeA, storeB } = makeDualStores("stale-break");

        // Simulate a crashed tab: write a stale lock row directly
        const staleTimestamp = Date.now() - 2000; // 2s ago, well past 1s threshold
        await storeA.setMetadata(
            "writeLock",
            JSON.stringify({
                pid: 999,
                activityName: "crashed-op",
                timestamp: staleTimestamp,
            })
        );

        // B attempts lock — should break stale and acquire
        let callbackRan = false;
        await storeB.withWriteLock(PID_B, "recovery", ["utxos"], async () => {
            callbackRan = true;
        });

        expect(callbackRan).toBe(true);
        // Lock released after callback
        const raw = await storeB.getMetadata("writeLock");
        expect(raw).toBeUndefined();
    });

    // --- Dexie Transaction Atomicity (REQT/r7t394zt2x) ---

    it("Dexie transaction rolls back all writes on error (dexie-atomicity/REQT/r7t394zt2x)", async () => {
        const { storeA } = makeDualStores("dexie-atomicity");

        // Write an initial UTXO outside the lock
        await storeA.saveUtxo({
            utxoId: "aaa#0",
            txHash: "aaa",
            outputIndex: 0,
            address: "addr_test1_initial",
            lovelace: "1000000",
            blockHeight: 1,
        } as any);

        // Attempt a locked write that throws mid-way
        await expect(
            storeA.withWriteLock(
                PID_A,
                "partial-write",
                ["utxos"],
                async () => {
                    await storeA.saveUtxo({
                        utxoId: "bbb#0",
                        txHash: "bbb",
                        outputIndex: 0,
                        address: "addr_test1_partial",
                        lovelace: "2000000",
                        blockHeight: 2,
                    } as any);
                    throw new Error("mid-write crash");
                }
            )
        ).rejects.toThrow("mid-write crash");

        // The second UTXO should NOT exist (Dexie transaction rolled back)
        const partial = await storeA.findUtxoId("bbb#0");
        expect(partial).toBeUndefined();

        // The first UTXO should still exist (unaffected)
        const initial = await storeA.findUtxoId("aaa#0");
        expect(initial).toBeDefined();
        expect(initial!.address).toBe("addr_test1_initial");
    });

    // --- Re-entrant from same pid (REQT/jb5dhgsyfq) ---

    it("re-entrant lock from same pid succeeds (lock-reentrant/REQT/jb5dhgsyfq)", async () => {
        const { storeA } = makeDualStores("reentrant");

        // Note: Dexie doesn't support nested transactions on different table sets,
        // but the metadata-row protocol should handle re-entrant acquisition from same pid.
        // This tests the lock acquisition logic, not nested Dexie transactions.
        await (storeA as any).acquireWriteLock(PID_A, "outer");

        // Verify lock row exists with outer activity
        const rawOuter = await storeA.getMetadata("writeLock");
        expect(rawOuter).toBeDefined();
        const lockOuter = JSON.parse(rawOuter!);
        expect(lockOuter.pid).toBe(PID_A);
        expect(lockOuter.activityName).toBe("outer");

        // Re-acquire with same pid — should succeed and update activity
        await (storeA as any).acquireWriteLock(PID_A, "inner");

        const rawInner = await storeA.getMetadata("writeLock");
        expect(rawInner).toBeDefined();
        const lockInner = JSON.parse(rawInner!);
        expect(lockInner.pid).toBe(PID_A);
        expect(lockInner.activityName).toBe("inner");

        // Clean up
        await (storeA as any).releaseWriteLock(PID_A);
        const rawAfter = await storeA.getMetadata("writeLock");
        expect(rawAfter).toBeUndefined();
    });

    // --- Metadata interface (getMetadata/setMetadata) ---

    it("getMetadata returns undefined for missing key", async () => {
        const { storeA } = makeDualStores("meta-missing");
        const val = await storeA.getMetadata("nonexistent");
        expect(val).toBeUndefined();
    });

    it("setMetadata writes and getMetadata reads back", async () => {
        const { storeA } = makeDualStores("meta-roundtrip");
        await storeA.setMetadata("testKey", "testValue");
        const val = await storeA.getMetadata("testKey");
        expect(val).toBe("testValue");
    });

    it("setMetadata overwrites existing value", async () => {
        const { storeA } = makeDualStores("meta-overwrite");
        await storeA.setMetadata("key1", "first");
        await storeA.setMetadata("key1", "second");
        const val = await storeA.getMetadata("key1");
        expect(val).toBe("second");
    });

    it("metadata visible across store instances sharing same DB", async () => {
        const { storeA, storeB } = makeDualStores("meta-cross-tab");
        await storeA.setMetadata("shared", "hello");
        const val = await storeB.getMetadata("shared");
        expect(val).toBe("hello");
    });

    // --- Error paths ---

    it("rejects unknown table name (unknown-table/REQT/4tsvn6259v)", async () => {
        const { storeA } = makeDualStores("unknown-table");

        await expect(
            storeA.withWriteLock(PID_A, "bad-tables", ["nonExistentTable"], async () => {
                return "should not reach";
            })
        ).rejects.toThrow(/withWriteLock: unknown table/);
    });
});
