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
    /** Depth in the batch chain */
    depth: number;
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
     * Compared against chain time (last synced block's slot), NOT wallclock time.
     * REQT/c3ytg4rttd (Deadline Calculation)
     */
    deadline: number;
    /** Lifecycle status of the pending transaction */
    status: "pending" | "confirmed" | "rolled-back";
    /** Timestamp when the transaction was submitted (epoch ms) */
    submittedAt: number;
}
