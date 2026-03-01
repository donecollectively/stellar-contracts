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
            expect(pendingEntry!.deadline).toBeGreaterThan(0);

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

    describe("confirmPendingTx (REQT/58b9nzgcbj)", () => {
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

            await index.confirmPendingTx(txHash);

            // Verify: status changed to confirmed
            const store = getStore(index);
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

            await prePopulateInputUtxos(index, tx);
            await index.registerPendingTx(signedTxCborHex, {
                description: "deadline test",
                id: "test-txd-5",
                depth: 0,
                txCborHex,
            });

            const store = getStore(index);
            const pendingEntry = await store.findPendingTx(txHash);
            const deadline = pendingEntry!.deadline;

            // Before deadline: should remain pending
            await (index as any).checkPendingDeadlines();
            const stillPending = await store.findPendingTx(txHash);
            expect(stillPending!.status).toBe("pending");

            // Advance past deadline
            setLastSyncedBlock(index, 9999, "block9999", deadline + 1);

            let rolledBackEvent: any = null;
            index.events.on("txRolledBack", (ev) => { rolledBackEvent = ev; });

            await (index as any).checkPendingDeadlines();

            // Verify: rolled back
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
});
