/**
 * A single entry in the submission event log.
 * Written incrementally by TxSubmitMgr as state transitions occur,
 * persisted to Dexie via appendSubmissionLog().
 *
 * REQT/h5jhpxf9c8 (Submission Log)
 */
export interface SubmissionLogEntry {
    /** Epoch milliseconds when the event occurred */
    at: number;
    /** Event type — e.g. "submit-attempt", "submit-success", "confirmed" */
    event: string;
    /** Submitter name (when event is per-submitter) */
    submitter?: string;
    /** Error message, state info, etc. */
    detail?: string;
}

/**
 * Storage-agnostic pending transaction entry representation.
 *
 * Stores the serializable projection of an in-flight transaction for
 * persistence in IndexedDB. The live TxDescription object is held in-memory
 * only (see CachedUtxoIndex.pendingTxMap).
 *
 * CONSTRAINT: No imports from @helios-lang/* — Helios-free.
 * CONSTRAINT: All fields must be IndexedDB-serializable (no functions, no class instances).
 * CONSTRAINT: BuiltTcxStats is excluded — contains non-serializable Wallet, WalletHelper,
 *             and PubKeyHash objects.
 *
 * REQT/jqz2m497vx (PendingTxEntry Type)
 */
export interface PendingTxEntry {
    /** Transaction hash — primary key */
    txHash: string;
    /** Human-readable description of the transaction */
    description: string;
    /** TxDescription.id — unique identifier for the transaction description */
    id: string;
    /** Parent transaction ID for chained batches */
    parentId?: string;
    /** Position in a chained batch (0 = first tx, 1 = next, etc.) */
    batchDepth: number;
    /**
     * Number of blocks since confirmation.
     * 0 while pending, updated by updateConfirmationDepths after confirmation.
     */
    confirmationBlockDepth: number;
    /** Additional info about the transaction */
    moreInfo?: string;
    /** Transaction builder name (e.g. "mkTxnMintTokens") */
    txName?: string;
    /** Unsigned transaction CBOR hex */
    txCborHex: string;
    /** Signed transaction CBOR hex */
    signedTxCborHex: string;
    /**
     * Deadline slot number — txValidityEnd + graceBuffer.
     * Compared against chain time (last processed block's slot), NOT wallclock time.
     * REQT/c3ytg4rttd (Deadline Calculation)
     */
    deadlineSlot: number;
    /** Lifecycle status of the pending transaction
     * REQT/jqz2m497vx (PendingTxEntry Type) — "rollback-pending" added for two-gate lifecycle
     */
    status: "pending" | "confirmed" | "rollback-pending" | "rolled-back";
    /** Timestamp when the transaction was submitted (epoch ms) */
    submittedAt: number;

    /**
     * Competing confirmed transactions that spent UTxOs claimed by this pending tx.
     * Populated by contention detection in processTransactionForNewUtxos when a
     * confirmed on-chain tx overwrites spentInTx on a UTxO previously claimed by
     * this pending tx.
     *
     * REQT/jqz2m497vx (PendingTxEntry Type) — contestedByTxs field
     * REQT/hhbcnvd9aj (Input Detection) — populated by contention detection
     */
    contestedByTxs?: Array<{ txHash: string; blockHeight: number }>;

    /**
     * Block height at which the transaction was confirmed on-chain.
     * Set by confirmPendingTx when the tx is first discovered in a block.
     * Used by Phase 2 (confirmation depth tracking) to calculate depth.
     * REQT/58b9nzgcbj (Confirm Pending Transaction)
     */
    confirmedAtBlockHeight?: number;

    /**
     * Slot number of the block in which the transaction was confirmed.
     * Set alongside confirmedAtBlockHeight by confirmPendingTx.
     * Provides slot-space reference for deadline/timing diagnostics.
     */
    confirmedAtSlot?: number;

    /**
     * Graduated confidence state based on confirmation depth.
     * Progresses: provisional → likely → confident → certain.
     * Set to "provisional" on first confirmation; advanced by depth tracking.
     * REQT/ddzcp753jr (Confirmation Depth Tracking)
     * REQT/yn45tvmp6k (Confirmation States)
     */
    confirmState?: "provisional" | "likely" | "confident" | "certain";

    // =========================================================================
    // Diagnostic fields — captured at registration/signing for post-reload
    // inspection. All fields are IndexedDB-serializable.
    // =========================================================================

    /**
     * Snapshot of tcx.logger.formattedHistory at registration time.
     * Provides the build transcript for the detail panel's transcript tab
     * when live TxSubmissionTracker objects are unavailable (after page reload).
     * REQT/vdkanffv9e (Diagnostic Fields)
     */
    buildTranscript?: string[];

    /**
     * dumpAny(tx, networkParams) output captured at registration time.
     * Provides human-readable transaction structure for the detail panel's
     * structure tab when live tracker objects are unavailable.
     * REQT/vdkanffv9e (Diagnostic Fields)
     */
    txStructure?: string;

    /**
     * Incremental submission event log written by TxSubmitMgr on each
     * state transition. Survives page reload via Dexie persistence.
     * REQT/h5jhpxf9c8 (Submission Log)
     */
    submissionLog?: SubmissionLogEntry[];
}
