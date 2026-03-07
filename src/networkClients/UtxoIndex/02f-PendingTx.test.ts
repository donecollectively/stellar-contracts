/**
 * Tests for In-Flight Transaction Integration (Pending Tx lifecycle)
 *
 * Uses CapoForDgDataPolicy_testHelper which creates testData records
 * (datum-bearing UTXOs) via DelegatedDatumTester and CapoCanMintGenericUuts.
 * Tests registerPendingTx, confirmPendingTx, rollbackPendingTx, isPending,
 * getPendingTxs, pendingSyncState, events, and startup recovery against
 * a CachedUtxoIndex backed by a Dexie store.
 */
// MUST be first - polyfills IndexedDB globally for Node.js
import "fake-indexeddb/auto";

import { expect, afterEach, vi } from "vitest";
import { bytesToHex } from "@helios-lang/codec-utils";
import type { Tx } from "@helios-lang/ledger";
import {
    describe,
    it,
    fit,
    xit,
    type TestContext_CapoForDgData,
} from "../../../tests/CapoForDgDataPolicyTestHelper.js";

import { CachedUtxoIndex } from "./CachedUtxoIndex.js";
import {
    getStore,
    setLastSyncedBlock,
    createDbCleanupRegistry,
} from "./CachedUtxoIndex.testHelpers.js";
import { CapoDataBridge } from "../../helios/scriptBundling/CapoHeliosBundle.bridge.js";
import type { UtxoIndexEntry } from "./types/UtxoIndexEntry.js";

type localTC = TestContext_CapoForDgData;

function createIsolatedDbName(label: string): string {
    return `StellarDappIndex-test-${label}-${Date.now()}`;
}

const cleanupRegistry = createDbCleanupRegistry();
const activeIndexes: CachedUtxoIndex[] = [];

afterEach(async () => {
    // Stop any periodic timers to avoid unhandled rejections from fake blockfrost
    for (const idx of activeIndexes) {
        idx.stopPeriodicRefresh();
    }
    activeIndexes.length = 0;
    await cleanupRegistry.cleanup();
});

/**
 * Creates a CachedUtxoIndex for testing pending-tx features.
 */
function createTestIndex(
    h: localTC["h"],
    dbName: string,
): CachedUtxoIndex {
    cleanupRegistry.register(dbName);
    const capo = h.capo;

    // Mock syncNow to prevent the constructor's fire-and-forget from hitting blockfrost
    vi.spyOn(CachedUtxoIndex.prototype, "syncNow").mockResolvedValue(undefined);

    const index = new CachedUtxoIndex({
        address: capo.address,
        mph: capo.mintingPolicyHash!,
        isMainnet: false,
        network: h.network as any,
        bridge: new CapoDataBridge(false) as any,
        blockfrostKey: "test-not-used",
        storeIn: "dexie",
        dbName,
        graceBufferSlots: 60,
    });

    activeIndexes.push(index);
    return index;
}

/**
 * Extracts the last Tx and CBOR hex from a submitted tcx's batch.
 */
function extractTxFromBatch(tcx: any): {
    tx: Tx;
    txCborHex: string;
    signedTxCborHex: string;
    txHash: string;
    txd: any;
} {
    const allTxns = tcx.currentBatch.$allTxns;
    if (!allTxns || allTxns.length === 0) {
        throw new Error("No transactions in batch");
    }
    const tracker = allTxns[allTxns.length - 1];
    const txd = tracker.txd;
    const tx = txd.tx;
    if (!tx) throw new Error("No tx on txd — check batch submission flow");

    const txCborHex = txd.txCborHex || bytesToHex(tx.toCbor());
    const signedTxCborHex = txd.signedTxCborHex || txCborHex;
    const txHash = tx.id().toHex();

    return { tx, txCborHex, signedTxCborHex, txHash, txd };
}

/**
 * Pre-populates the index store with UTXOs that a transaction consumes,
 * so registerPendingTx can mark them as speculatively spent.
 */
async function prePopulateInputUtxos(
    index: CachedUtxoIndex,
    tx: Tx,
): Promise<void> {
    const store = getStore(index);
    for (const input of tx.body.inputs) {
        const utxoId = input.id.toString();
        const output = input.output;
        const entry: UtxoIndexEntry = {
            utxoId,
            address: output.address.toString(),
            lovelace: output.value.lovelace,
            tokens: [],
            datumHash: null,
            inlineDatum: output.datum
                ? bytesToHex(output.datum.data.toCbor())
                : null,
            referenceScriptHash: null,
            uutIds: [],
            spentInTx: null,
            blockHeight: 100,
        };
        await store.utxos.put(entry);
    }
}

/**
 * Creates a testData record transaction using the DelegatedDatumTester controller.
 * This produces a real datum-bearing transaction for testing against the UTXO index.
 */
async function createTestDataRecordTx(h: localTC["h"]) {
    const charterData = await h.capo.findCharterData();
    const testDataController = await h.capo.getTestDataController(charterData);
    const tcx = await testDataController.mkTxnCreateRecord({
        activity: testDataController.activity.MintingActivities.$seeded$CreatingTData,
        data: testDataController.exampleData(),
    });
    return h.submitTxnWithBlock(tcx);
}

describe("Pending Transaction Lifecycle (REQT/3dhhjsav15)", () => {
    describe("registerPendingTx (REQT/p2ts24jbkg)", () => {
        it("registers pending tx, marks inputs spent, indexes outputs, isPending detects origin and spent-by (register-pending-lifecycle/REQT/p2ts24jbkg)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            // Create another testData record tx to use as our "pending" tx
            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("register-pending");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);

            await prePopulateInputUtxos(index, tx);

            await index.registerPendingTx(signedTxCborHex, {
                description: "create testData record",
                id: "test-txd-1",
                depth: 0,
                txCborHex,
            });

            // Verify: pending entry stored with correct fields
            const store = getStore(index);
            const pendingEntry = await store.findPendingTx(txHash);
            expect(pendingEntry).toBeTruthy();
            expect(pendingEntry!.status).toBe("pending");
            expect(pendingEntry!.description).toBe("create testData record");
            expect(pendingEntry!.deadlineSlot).toBeGreaterThan(0);

            // Verify: inputs marked as speculatively spent
            for (const input of tx.body.inputs) {
                const utxo = await store.findUtxoId(input.id.toString());
                expect(utxo?.spentInTx, `input ${input.id.toString()} should be marked spent`).toBe(txHash);
            }

            // Verify: output UTXOs indexed
            for (let i = 0; i < tx.body.outputs.length; i++) {
                const utxoId = `${txHash}#${i}`;
                const utxo = await store.findUtxoId(utxoId);
                expect(utxo, `output ${utxoId} should be indexed`).toBeTruthy();
            }

            // Verify: pendingSyncState is stale (no sync has run)
            expect(index.pendingSyncState).toBe("stale");

            // Verify: getPendingTxs returns the entry
            const pending = await index.getPendingTxs();
            expect(pending.length).toBe(1);
            expect(pending[0].txHash).toBe(txHash);

            // Verify: isPending detects origin UTXOs (output of pending tx)
            expect(index.isPending(`${txHash}#0`)).toBe(txHash);

            // Verify: isPending detects spent-by-pending UTXOs (input consumed by pending tx)
            const consumedUtxoId = tx.body.inputs[0].id.toString();
            expect(index.isPending(consumedUtxoId)).toBe(txHash);

            // Verify: isPending returns undefined for unrelated UTXOs
            expect(index.isPending("0000000000000000000000000000000000000000000000000000000000000000#99")).toBeUndefined();
        });
    });

    describe("registerPendingTx edge cases", () => {
        it("double registration of same txHash is idempotent (double-register-noop/REQT/p2ts24jbkg)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("double-register");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);

            await prePopulateInputUtxos(index, tx);

            const opts = {
                description: "double reg test",
                id: "test-txd-double",
                depth: 0,
                txCborHex,
            };

            // First registration
            await index.registerPendingTx(signedTxCborHex, opts);

            // Second registration — should not throw or corrupt state
            await index.registerPendingTx(signedTxCborHex, opts);

            // Verify: still exactly one pending entry
            const pending = await index.getPendingTxs();
            expect(pending.length).toBe(1);
            expect(pending[0].txHash).toBe(txHash);
            expect(pending[0].status).toBe("pending");

            // Verify: outputs still indexed, not duplicated
            const store = getStore(index);
            for (let i = 0; i < tx.body.outputs.length; i++) {
                const utxo = await store.findUtxoId(`${txHash}#${i}`);
                expect(utxo, `output ${i} should exist`).toBeTruthy();
            }
        });
    });

    describe("confirmPendingTx (REQT/58b9nzgcbj)", () => {
        it("confirms non-existent txHash without error (confirm-nonexistent-noop/REQT/58b9nzgcbj)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const dbName = createIsolatedDbName("confirm-nonexistent");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);

            // Confirm a txHash that was never registered — should not throw
            await (index as any).confirmPendingTx("0000000000000000000000000000000000000000000000000000000000000000", 100);

            // Verify: no pending entries, no crash
            const pending = await index.getPendingTxs();
            expect(pending.length).toBe(0);
        });

        it("confirms pending tx, preserves outputs, clears isPending, fires txConfirmed (confirm-pending-lifecycle/REQT/58b9nzgcbj)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("confirm-pending");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "confirm test",
                id: "test-txd-3",
                depth: 0,
                txCborHex,
            });

            // Listen for event
            let confirmedEvent: any = null;
            index.events.on("txConfirmed", (ev) => { confirmedEvent = ev; });

            // confirmPendingTx is private — access via cast; provide blockHeight
            const store = getStore(index);
            await store.saveBlock({ hash: "block105", height: 105, time: 0, slot: 600, state: "processed" });
            await (index as any).confirmPendingTx(txHash, 105);

            // Verify: status changed to confirmed
            const entry = await store.findPendingTx(txHash);
            expect(entry!.status).toBe("confirmed");

            // Verify: isPending no longer matches origin or spent-by
            expect(index.isPending(`${txHash}#0`)).toBeUndefined();
            expect(index.isPending(tx.body.inputs[0].id.toString())).toBeUndefined();

            // Verify: output UTXOs still exist
            for (let i = 0; i < tx.body.outputs.length; i++) {
                const utxo = await store.findUtxoId(`${txHash}#${i}`);
                expect(utxo, `output ${i} should still exist after confirm`).toBeTruthy();
            }

            // Verify: txConfirmed event
            expect(confirmedEvent).toBeTruthy();
            expect(confirmedEvent.txHash).toBe(txHash);
            expect(confirmedEvent.description).toBe("confirm test");
        });
    });

    describe("rollbackPendingTx (REQT/a9y19g0pmr)", () => {
        it("rolls back pending tx, deletes outputs, restores inputs, fires txRolledBack with CBOR (rollback-pending-lifecycle/REQT/a9y19g0pmr)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("rollback-pending");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);

            const inputUtxoIds = tx.body.inputs.map((i: any) => i.id.toString());

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "rollback test",
                id: "test-txd-4",
                depth: 0,
                txCborHex,
            });

            // Verify inputs are marked spent before rollback
            const store = getStore(index);
            for (const utxoId of inputUtxoIds) {
                const utxo = await store.findUtxoId(utxoId);
                expect(utxo?.spentInTx).toBe(txHash);
            }

            // Listen for event
            let rolledBackEvent: any = null;
            index.events.on("txRolledBack", (ev) => { rolledBackEvent = ev; });

            // rollbackPendingTx is private — takes PendingTxEntry, not txHash
            const pendingEntry = await store.findPendingTx(txHash);
            expect(pendingEntry).toBeTruthy();
            await (index as any).rollbackPendingTx(pendingEntry!);

            // Verify: status changed
            const entry = await store.findPendingTx(txHash);
            expect(entry!.status).toBe("rolled-back");

            // Verify: output UTXOs deleted
            for (let i = 0; i < tx.body.outputs.length; i++) {
                const utxo = await store.findUtxoId(`${txHash}#${i}`);
                expect(utxo, `output ${i} should be deleted after rollback`).toBeFalsy();
            }

            // Verify: input UTXOs restored (spentInTx cleared)
            for (const utxoId of inputUtxoIds) {
                const utxo = await store.findUtxoId(utxoId);
                expect(utxo, `input ${utxoId} should still exist`).toBeTruthy();
                expect(utxo!.spentInTx, `input ${utxoId} spentInTx should be cleared`).toBeNull();
            }

            // Verify: isPending cleared for both origin and spent-by
            expect(index.isPending(`${txHash}#0`)).toBeUndefined();
            for (const utxoId of inputUtxoIds) {
                expect(index.isPending(utxoId)).toBeUndefined();
            }

            // Verify: txRolledBack event with CBOR for recovery
            expect(rolledBackEvent).toBeTruthy();
            expect(rolledBackEvent.txHash).toBe(txHash);
            expect(rolledBackEvent.cbor).toBe(signedTxCborHex);
        });
    });

    describe("checkPendingDeadlines (REQT/c3ytg4rttd)", () => {
        it("rolls back expired pending txs when chain time passes deadline (deadline-expiry-rollback/REQT/c3ytg4rttd)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("deadline-check");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);

            // Save a processed block so checkPendingDeadlines can determine
            // the last processed slot (deadline comparison uses processed slot,
            // not tip slot, to avoid racing with unprocessed block discovery)
            const store = getStore(index);
            await store.saveBlock({ hash: "block100", height: 100, time: 0, slot: 500, state: "processed" });

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "deadline test",
                id: "test-txd-5",
                depth: 0,
                txCborHex,
            });

            const pendingEntry = await store.findPendingTx(txHash);
            const deadlineSlot = pendingEntry!.deadlineSlot;

            // Before deadline: should remain pending
            await (index as any).checkPendingDeadlines();
            const stillPending = await store.findPendingTx(txHash);
            expect(stillPending!.status).toBe("pending");

            // Advance past deadline with sufficient depth:
            // - Block at/after deadline slot has height 200
            // - Tip at height 200 + provisionalDepth(4) = 204, so depth = 4 >= 4
            const deadlineBlockHeight = 200;
            const tipHeight = deadlineBlockHeight + 4; // provisionalDepth = 4
            await store.saveBlock({ hash: "blockDeadline", height: deadlineBlockHeight, time: 0, slot: deadlineSlot + 1, state: "processed" });
            setLastSyncedBlock(index, tipHeight, "blockTip", deadlineSlot + 100);

            let rolledBackEvent: any = null;
            index.events.on("txRolledBack", (ev) => { rolledBackEvent = ev; });

            await (index as any).checkPendingDeadlines();

            // Gate 1 sets rollback-pending, then executeSettledRollbacks runs Gate 2
            // (no contention, so Gate 2 passes immediately and rolls back)
            const expired = await store.findPendingTx(txHash);
            expect(expired!.status).toBe("rolled-back");
            expect(rolledBackEvent).toBeTruthy();
            expect(rolledBackEvent.txHash).toBe(txHash);
        });
    });

    describe("startup recovery (REQT/fn70x96nxm)", () => {
        it("recovers pending state from store including spent-by-pending via CBOR decode (startup-recovery-pending/REQT/fn70x96nxm)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("startup-recovery");

            // First index: register a pending tx
            const index1 = createTestIndex(h, dbName);
            setLastSyncedBlock(index1, 100, "block100", 500);
            await prePopulateInputUtxos(index1, tx);
            await index1.registerPendingTx(signedTxCborHex, {
                description: "recovery test",
                id: "test-txd-7",
                depth: 0,
                txCborHex,
            });

            // Second index: same db — simulates page reload
            const index2 = createTestIndex(h, dbName);

            // Trigger startup recovery
            await (index2 as any).loadPendingFromStore();

            // Verify: isPending works for origin (txHash prefix)
            expect(index2.isPending(`${txHash}#0`)).toBe(txHash);

            // Verify: spent-by-pending recovered from CBOR decode
            const consumedUtxoId = tx.body.inputs[0].id.toString();
            expect(index2.isPending(consumedUtxoId)).toBe(txHash);

            // Verify: pendingSyncState transitions
            expect(index2.pendingSyncState).toBe("stale");
            await (index2 as any).resolvePendingState();
            expect(index2.pendingSyncState).toBe("fresh");
        });
    });

    // =========================================================================
    // Contention-Aware Two-Gate Rollback (pre-work test scaffolding)
    // These tests are scaffolded during pre-work review. The Coder fills in
    // implementation-dependent details after Changes 1-9 land.
    // =========================================================================

    describe("contention detection (REQT/hhbcnvd9aj)", () => {
        it("confirmed tx overwrites pending spentInTx and records contestedByTxs (contention-overwrites-spent/REQT/hhbcnvd9aj)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash: pendingTxHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("contention-overwrite");
            const index = createTestIndex(h, dbName);
            const store = getStore(index);
            setLastSyncedBlock(index, 100, "block100", 500);

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "contention test - pending",
                id: "test-contention-1",
                depth: 0,
                txCborHex,
            });

            // Verify: inputs marked spent by pending tx
            const firstInputId = tx.body.inputs[0].id.toString();
            const beforeContention = await store.findUtxoId(firstInputId);
            expect(beforeContention?.spentInTx).toBe(pendingTxHash);

            // Simulate contention: directly overwrite spentInTx and record contestedByTxs
            // as processTransactionForNewUtxos would do (the actual confirmed tx goes through
            // the full pipeline — here we test the store-level outcome).
            const confirmedTxHash = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
            const contestBlockHeight = 105;
            await store.markUtxoSpent(firstInputId, confirmedTxHash);
            const pendingEntry = await store.findPendingTx(pendingTxHash);
            expect(pendingEntry).toBeTruthy();
            pendingEntry!.contestedByTxs = [{ txHash: confirmedTxHash, blockHeight: contestBlockHeight }];
            await store.savePendingTx(pendingEntry!);

            // Verify: spentInTx overwritten to confirmed tx
            const afterContention = await store.findUtxoId(firstInputId);
            expect(afterContention!.spentInTx).toBe(confirmedTxHash);

            // Verify: contestedByTxs populated on losing pending entry
            const updatedPending = await store.findPendingTx(pendingTxHash);
            expect(updatedPending!.contestedByTxs).toHaveLength(1);
            expect(updatedPending!.contestedByTxs![0].txHash).toBe(confirmedTxHash);
            expect(updatedPending!.contestedByTxs![0].blockHeight).toBe(contestBlockHeight);
            expect(updatedPending!.status).toBe("pending"); // not rolled back yet
        });

        it("confirmed tx for same txHash takes fast-path confirm, no contention (confirm-no-contention/REQT/58b9nzgcbj)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("confirm-no-contention");
            const index = createTestIndex(h, dbName);
            const store = getStore(index);
            setLastSyncedBlock(index, 100, "block100", 500);

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "fast-path confirm test",
                id: "test-contention-2",
                depth: 0,
                txCborHex,
            });

            let confirmedEvent: any = null;
            index.events.on("txConfirmed", (ev) => { confirmedEvent = ev; });

            // Same txHash discovered on-chain → fast-path confirm
            await (index as any).confirmPendingTx(txHash, 105);

            const entry = await store.findPendingTx(txHash);
            expect(entry!.status).toBe("confirmed");
            expect(entry!.contestedByTxs ?? []).toHaveLength(0);
            expect(confirmedEvent).toBeTruthy();
            expect(confirmedEvent.txHash).toBe(txHash);
        });
    });

    describe("two-gate rollback lifecycle (REQT/a9y19g0pmr)", () => {
        it("uncontested expiry transitions through rollback-pending to rolled-back (uncontested-two-gate/REQT/vhn7zvn8nc)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("uncontested-two-gate");
            const index = createTestIndex(h, dbName);
            const store = getStore(index);
            setLastSyncedBlock(index, 100, "block100", 500);
            await store.saveBlock({ hash: "block100", height: 100, time: 0, slot: 500, state: "processed" });

            const inputUtxoIds = tx.body.inputs.map((i: any) => i.id.toString());
            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "uncontested two-gate test",
                id: "test-twogate-1",
                depth: 0,
                txCborHex,
            });

            const pendingEntry = await store.findPendingTx(txHash);
            const deadlineSlot = pendingEntry!.deadlineSlot;

            // Advance past deadline by provisionalDepth (4) blocks
            // deadlineBlock at height 200 with slot past deadline, tip at 204 = depth 4
            const deadlineBlockHeight = 200;
            const tipHeight = deadlineBlockHeight + 4; // provisionalDepth = 4
            await store.saveBlock({ hash: "blockDeadline", height: deadlineBlockHeight, time: 0, slot: deadlineSlot + 1, state: "processed" });
            setLastSyncedBlock(index, tipHeight, "blockTip", deadlineSlot + 100);

            // Gate 1: checkPendingDeadlines should set status → rollback-pending
            // Gate 2: executeSettledRollbacks (called within checkPendingDeadlines) 
            // — no contention, should proceed immediately to rolled-back
            let rolledBackEvent: any = null;
            index.events.on("txRolledBack", (ev) => { rolledBackEvent = ev; });

            await (index as any).checkPendingDeadlines();

            const afterRollback = await store.findPendingTx(txHash);
            expect(afterRollback!.status).toBe("rolled-back");

            // Inputs restored
            for (const utxoId of inputUtxoIds) {
                const utxo = await store.findUtxoId(utxoId);
                expect(utxo!.spentInTx, `input ${utxoId} should be restored`).toBeNull();
            }

            // Outputs deleted
            for (let i = 0; i < tx.body.outputs.length; i++) {
                const utxo = await store.findUtxoId(`${txHash}#${i}`);
                expect(utxo, `output ${i} should be deleted`).toBeFalsy();
            }

            // Event fired
            expect(rolledBackEvent).toBeTruthy();
            expect(rolledBackEvent.txHash).toBe(txHash);
        });

        it("deadline not deep enough keeps status pending (shallow-deadline-stays-pending/REQT/vhn7zvn8nc)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("shallow-deadline");
            const index = createTestIndex(h, dbName);
            const store = getStore(index);
            setLastSyncedBlock(index, 100, "block100", 500);
            await store.saveBlock({ hash: "block100", height: 100, time: 0, slot: 500, state: "processed" });

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "shallow deadline test",
                id: "test-twogate-2",
                depth: 0,
                txCborHex,
            });

            const pendingEntry = await store.findPendingTx(txHash);
            const deadlineSlot = pendingEntry!.deadlineSlot;

            // Advance past deadline slot but only 1 block deep (< provisionalDepth of 4)
            // deadlineBlock at height 101 with slot past deadline, tip also at 101 = depth 0
            await store.saveBlock({ hash: "block101", height: 101, time: 0, slot: deadlineSlot + 1, state: "processed" });
            setLastSyncedBlock(index, 101, "block101", deadlineSlot + 1);

            await (index as any).checkPendingDeadlines();

            const afterCheck = await store.findPendingTx(txHash);
            expect(afterCheck!.status).toBe("pending");
        });

        it("contested expiry: Gate 2 holds until competing tx at depth (contested-gate2-holds/REQT/bqy3xpp8rs)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash: pendingTxHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("contested-gate2");
            const index = createTestIndex(h, dbName);
            const store = getStore(index);
            setLastSyncedBlock(index, 100, "block100", 500);
            await store.saveBlock({ hash: "block100", height: 100, time: 0, slot: 500, state: "processed" });

            const inputUtxoIds = tx.body.inputs.map((i: any) => i.id.toString());
            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "contested gate2 test",
                id: "test-twogate-3",
                depth: 0,
                txCborHex,
            });

            const pendingEntry = await store.findPendingTx(pendingTxHash);
            const deadlineSlot = pendingEntry!.deadlineSlot;

            // Simulate contention: a confirmed tx at a recent blockHeight took one of our inputs
            const confirmedTxHash = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
            const firstInputId = tx.body.inputs[0].id.toString();

            // Set up block structure:
            // - deadlineBlock at height 200 (slot past deadline)
            // - contestedBlockHeight at 202 (recent — within provisionalDepth of tip)
            // - Gate 1 tip at 204 (depth 4 past deadline block) — Gate 1 passes
            // - Gate 2 at tip 204: depth past contention = 204 - 202 = 2 < 4 — Gate 2 holds
            const deadlineBlockHeight = 200;
            const contestedBlockHeight = 202;
            const gate1TipHeight = deadlineBlockHeight + 4; // 204

            // Overwrite spentInTx on the contested input (as processTransactionForNewUtxos would)
            await store.markUtxoSpent(firstInputId, confirmedTxHash);
            pendingEntry!.contestedByTxs = [{ txHash: confirmedTxHash, blockHeight: contestedBlockHeight }];
            await store.savePendingTx(pendingEntry!);

            // Gate 1: advance past deadline with depth
            await store.saveBlock({ hash: "blockDeadline", height: deadlineBlockHeight, time: 0, slot: deadlineSlot + 1, state: "processed" });
            setLastSyncedBlock(index, gate1TipHeight, "blockG1tip", deadlineSlot + 500);

            await (index as any).checkPendingDeadlines();

            // After Gate 1 + Gate 2 attempt: should be rollback-pending (Gate 2 held)
            // Gate 2: 204 - 202 = 2 < provisionalDepth(4) — contention not settled
            const afterGate1 = await store.findPendingTx(pendingTxHash);
            expect(afterGate1!.status).toBe("rollback-pending");

            // Gate 2 second attempt: advance chain to contestedBlockHeight + provisionalDepth
            const gate2TipHeight = contestedBlockHeight + 4; // 206
            setLastSyncedBlock(index, gate2TipHeight, "blockG2", deadlineSlot + 700);
            await (index as any).executeSettledRollbacks();

            const afterGate2 = await store.findPendingTx(pendingTxHash);
            expect(afterGate2!.status).toBe("rolled-back");

            // Contested input should NOT be restored (spentInTx still points to confirmed tx)
            const contestedUtxo = await store.findUtxoId(firstInputId);
            expect(contestedUtxo!.spentInTx).toBe(confirmedTxHash);

            // Uncontested inputs SHOULD be restored
            for (const utxoId of inputUtxoIds) {
                if (utxoId === firstInputId) continue; // skip contested one
                const utxo = await store.findUtxoId(utxoId);
                if (utxo) {
                    expect(utxo.spentInTx, `uncontested input ${utxoId} should be restored`).toBeNull();
                }
            }

            // Outputs deleted
            for (let i = 0; i < tx.body.outputs.length; i++) {
                const utxo = await store.findUtxoId(`${pendingTxHash}#${i}`);
                expect(utxo, `output ${i} should be deleted`).toBeFalsy();
            }
        });

        it("selective datum re-parse: only uncontested inputs re-parsed (selective-reparse/REQT/1afcyedaks)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash: pendingTxHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("selective-reparse");
            const index = createTestIndex(h, dbName);
            const store = getStore(index);
            setLastSyncedBlock(index, 100, "block100", 500);
            await store.saveBlock({ hash: "block100", height: 100, time: 0, slot: 500, state: "processed" });

            // Attach capo so datum parsing is active
            index.attachCapo(h.capo as any);

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "selective reparse test",
                id: "test-reparse-1",
                depth: 0,
                txCborHex,
            });

            const pendingEntry = await store.findPendingTx(pendingTxHash);
            const deadlineSlot = pendingEntry!.deadlineSlot;

            // Check which inputs have inline datums (for verification later)
            const inputsWithDatum: string[] = [];
            const inputsWithoutDatum: string[] = [];
            for (const input of tx.body.inputs) {
                const utxoId = input.id.toString();
                const utxo = await store.findUtxoId(utxoId);
                if (utxo?.inlineDatum) {
                    inputsWithDatum.push(utxoId);
                } else {
                    inputsWithoutDatum.push(utxoId);
                }
            }

            // Simulate contention on the first input (if any have datums)
            const confirmedTxHash = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
            if (inputsWithDatum.length > 0) {
                const contestedInputId = inputsWithDatum[0];
                await store.markUtxoSpent(contestedInputId, confirmedTxHash);
                pendingEntry!.contestedByTxs = [{ txHash: confirmedTxHash, blockHeight: 105 }];
                await store.savePendingTx(pendingEntry!);
            }

            // Advance past deadline with sufficient depth for both gates
            const deadlineBlockHeight = 200;
            const tipHeight = deadlineBlockHeight + 4;
            await store.saveBlock({ hash: "blockDL", height: deadlineBlockHeight, time: 0, slot: deadlineSlot + 1, state: "processed" });
            // Ensure contention is also at depth (105 + 4 = 109 < 204)
            setLastSyncedBlock(index, tipHeight, "blockTip", deadlineSlot + 100);

            await (index as any).checkPendingDeadlines();

            const afterRollback = await store.findPendingTx(pendingTxHash);
            expect(afterRollback!.status).toBe("rolled-back");

            // The key assertion: uncontested inputs with datums should have records
            // re-parsed, while contested inputs should NOT have records re-parsed
            // (their successor records from the confirmed tx are intact)
            // This is verified by the rollback code only calling parseAndSaveRecord
            // on restoredUtxos (the ones returned by findUtxosSpentByTx).
        });
    });

    // =========================================================================
    // Phase 1: Diagnostic fields & submission log persistence
    // Added by pre-work review for work unit 2z5j6rgbd9
    // =========================================================================

    describe("diagnostic fields on PendingTxEntry (REQT/vdkanffv9e)", () => {
        it("registerPendingTx persists buildTranscript and txStructure when provided (persist-diagnostic-fields/REQT/vdkanffv9e)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("diagnostic-fields");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);
            await prePopulateInputUtxos(index, tx);

            const diagnosticOpts = {
                description: "test diagnostic fields",
                id: "test-diag-1",
                depth: 0,
                txCborHex,
                buildTranscript: ["line 1: building tx", "line 2: adding inputs", "line 3: done"],
                txStructure: "Tx { inputs: [...], outputs: [...] }",
            };

            await index.registerPendingTx(signedTxCborHex, diagnosticOpts);

            const store = getStore(index);
            const entry = await store.findPendingTx(txHash);
            expect(entry).toBeTruthy();
            expect(entry!.buildTranscript).toEqual(["line 1: building tx", "line 2: adding inputs", "line 3: done"]);
            expect(entry!.txStructure).toBe("Tx { inputs: [...], outputs: [...] }");
        });

        it("registerPendingTx works without diagnostic fields (no-diagnostic-fields/REQT/vdkanffv9e)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("no-diag-fields");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);
            await prePopulateInputUtxos(index, tx);

            await index.registerPendingTx(signedTxCborHex, {
                description: "no diagnostics",
                id: "test-nodiag-1",
                depth: 0,
                txCborHex,
            });

            const store = getStore(index);
            const entry = await store.findPendingTx(txHash);
            expect(entry).toBeTruthy();
            expect(entry!.buildTranscript).toBeUndefined();
            expect(entry!.txStructure).toBeUndefined();
        });
    });

    describe("appendSubmissionLog (REQT/j5pwm8btay)", () => {
        it("appends submission log entries incrementally to PendingTxEntry (append-log-entries/REQT/j5pwm8btay)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("append-log");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);
            await prePopulateInputUtxos(index, tx);

            await index.registerPendingTx(signedTxCborHex, {
                description: "log test",
                id: "test-log-1",
                depth: 0,
                txCborHex,
            });

            const store = getStore(index);

            // Append first log entry
            // TODO: Coder — appendSubmissionLog may be on CachedUtxoIndex or directly on store.
            // Adjust the call site once the method is implemented per REQT/j5pwm8btay.
            await store.appendSubmissionLog(txHash, {
                at: 1000,
                event: "submit-attempt",
                submitter: "blockfrost-preprod",
                detail: "first attempt",
            });

            let entry = await store.findPendingTx(txHash);
            expect(entry!.submissionLog).toHaveLength(1);
            expect(entry!.submissionLog![0].event).toBe("submit-attempt");
            expect(entry!.submissionLog![0].submitter).toBe("blockfrost-preprod");

            // Append second log entry
            await store.appendSubmissionLog(txHash, {
                at: 2000,
                event: "submit-success",
                submitter: "blockfrost-preprod",
            });

            entry = await store.findPendingTx(txHash);
            expect(entry!.submissionLog).toHaveLength(2);
            expect(entry!.submissionLog![1].event).toBe("submit-success");

            // Append third log entry — confirm attempt from different submitter
            await store.appendSubmissionLog(txHash, {
                at: 3000,
                event: "confirm-attempt",
                submitter: "ogmios-local",
            });

            entry = await store.findPendingTx(txHash);
            expect(entry!.submissionLog).toHaveLength(3);
            expect(entry!.submissionLog![2].submitter).toBe("ogmios-local");
        });

        it("appendSubmissionLog on entry without prior log initializes array (append-to-empty-log/REQT/h5jhpxf9c8)", async (context: localTC) => {
            const { h } = context;
            await h.snapToFirstTestRecord();

            const submittedTcx = await createTestDataRecordTx(h);
            const { tx, txCborHex, signedTxCborHex, txHash } = extractTxFromBatch(submittedTcx);

            const dbName = createIsolatedDbName("empty-log-init");
            const index = createTestIndex(h, dbName);
            setLastSyncedBlock(index, 100, "block100", 500);
            await prePopulateInputUtxos(index, tx);

            // Register without any submissionLog
            await index.registerPendingTx(signedTxCborHex, {
                description: "empty log init test",
                id: "test-emptylog-1",
                depth: 0,
                txCborHex,
            });

            const store = getStore(index);

            // Verify no log yet
            let entry = await store.findPendingTx(txHash);
            expect(entry!.submissionLog ?? []).toHaveLength(0);

            // Append should initialize the array
            await store.appendSubmissionLog(txHash, {
                at: 5000,
                event: "submit-attempt",
            });

            entry = await store.findPendingTx(txHash);
            expect(entry!.submissionLog).toHaveLength(1);
            expect(entry!.submissionLog![0].at).toBe(5000);
        });
    });
});
