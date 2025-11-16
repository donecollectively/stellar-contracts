import type { hasUutContext } from "./CapoTypes.js";
import { UutName } from "./delegation/UutName.js";
import type { ActorContext, SetupInfo } from "./StellarContract.js";
import type { Cost, UplcProgramV2 } from "@helios-lang/uplc";
import { UplcConsoleLogger } from "./UplcConsoleLogger.js";
import type { isActivity, SeedAttrs } from "./ActivityTypes.js";
import { type TxBuilder, type WalletHelper, type Wallet } from "@helios-lang/tx-utils";
import { type Address, type NetworkParams, type PubKeyHash, type Tx, type TxId, type TxInput, type TxOutput, type Value } from "@helios-lang/ledger";
import type { UtxoHelper } from "./UtxoHelper.js";
import type { IF_ISANY } from "./helios/typeUtils.js";
import type { Expand } from "./helios/typeUtils.js";
import { TxNotNeededError } from "./utils.js";
/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export type hasSeedUtxo = StellarTxnContext<anyState & {
    seedUtxo: TxInput;
}>;
export type txBuiltOrSubmitted = "built" | "alreadyPresent" | "signed" | "submitted";
export type resolvedOrBetter = "resolved" | txBuiltOrSubmitted;
/**
 * @public
 */
export type TxDescription<T extends StellarTxnContext, PROGRESS extends "buildLater!" | "resolved" | "alreadyPresent" | "built" | "signed" | "submitted", TCX extends StellarTxnContext = IF_ISANY<T, StellarTxnContext<anyState>, T>, otherProps extends Record<string, unknown> = {}> = {
    description: string;
    id: string;
    parentId?: string;
    depth: number;
    moreInfo?: string;
    optional?: boolean;
    txName?: string;
    tcx?: TCX | TxNotNeededError;
    tx?: Tx;
    stats?: BuiltTcxStats;
    txCborHex?: string;
    signedTxCborHex?: string;
} & otherProps & (PROGRESS extends "alreadyPresent}" ? {
    mkTcx: (() => TCX) | (() => Promise<TCX>);
    tcx: TCX & {
        alreadyPresent: TxNotNeededError;
    };
} : PROGRESS extends resolvedOrBetter ? {
    mkTcx?: (() => TCX) | (() => Promise<TCX>) | undefined;
    tcx: TCX;
} : {
    mkTcx: (() => TCX) | (() => Promise<TCX>);
    tcx?: undefined;
}) & (PROGRESS extends txBuiltOrSubmitted ? {
    tx: Tx;
    txId?: TxId;
    stats: BuiltTcxStats;
    options: SubmitOptions;
    txCborHex: string;
} : {}) & (PROGRESS extends "signed" | "submitted" ? {
    txId: TxId;
    txCborHex: string;
    signedTxCborHex: string;
    walletTxId: TxId;
} : {});
/**
 * @public
 */
export type MultiTxnCallback<T extends undefined | StellarTxnContext<any> = StellarTxnContext<any>, TXINFO extends TxDescription<any, resolvedOrBetter, any> = TxDescription<any, "resolved">> = ((txd: TXINFO) => void) | ((txd: TXINFO) => Promise<void>) | ((txd: TXINFO) => T | false) | ((txd: TXINFO) => Promise<T | false>);
/**
 * A transaction context that includes additional transactions in its state for later execution
 * @remarks
 *
 * During the course of creating a transaction, the transaction-building functions for a contract
 * suite may suggest or require further transactions, which may not be executable until after the
 * current transaction is executed.  This type allows the transaction context to include such
 * future transactions in its state, so that they can be executed later.
 *
 * The future transactions can be executed using the {@link StellarTxnContext.queueAddlTxns}
 * helper method.
 * @public
 **/
export type hasAddlTxns<TCX extends StellarTxnContext<anyState>, existingStateType extends anyState = TCX["state"]> = StellarTxnContext<existingStateType & {
    addlTxns: Record<string, TxDescription<any, "buildLater!">>;
}>;
export type otherAddlTxnNames<TCX extends StellarTxnContext<any>> = string & TCX extends {
    state: {
        addlTxns: infer aTNs;
    };
} ? keyof aTNs : never;
/**
 * A base state for a transaction context
 * @public
 **/
export interface anyState {
    uuts: uutMap;
}
/**
 * A base state for a transaction context
 * @public
 **/
export type uutMap = Record<string, unknown>;
export declare const emptyUuts: uutMap;
type addRefInputArgs = Parameters<TxBuilder["refer"]>;
export type TxDescriptionWithError = TxDescription<any, "built", any, {
    error: string;
}>;
/**
 * @public
 */
export type SubmitOptions = TxPipelineOptions & {
    /**
     * indicates additional signers expected for the transaction
     */
    signers?: Address[];
    addlTxInfo?: Partial<Omit<TxDescription<any, "submitted">, "description">> & {
        description: string;
    };
    paramsOverride?: Partial<NetworkParams>;
    /**
     * useful most for test environment, so that a txn failure can be me marked
     * as "failing as expected".  Not normally needed for production code.
     */
    expectError?: true;
    /**
     * Called when there is a detected error, before logging.  Probably only needed in test.
     */
    beforeError?: MultiTxnCallback<any, TxDescriptionWithError>;
    /**
     * Passed into the Helios TxBuilder's build()/buildUnsafe()
     */
    beforeValidate?: (tx: Tx) => MultiTxnCallback<any>;
};
type MintUnsafeParams = Parameters<TxBuilder["mintPolicyTokensUnsafe"]>;
type MintTokensParams = [
    MintUnsafeParams[0],
    MintUnsafeParams[1],
    {
        redeemer: MintUnsafeParams[2];
    }
];
/**
 * Provides notifications for various stages of transaction submission
 * @public
 */
type TxPipelineOptions = Expand<TxSubmitCallbacks & {
    fixupBeforeSubmit?: MultiTxnCallback;
    whenBuilt?: MultiTxnCallback<any, TxDescription<any, "built">>;
}>;
export type TxSubmitCallbacks = {
    onSubmitError?: MultiTxnCallback<any, TxDescription<any, "built", any, {
        error: string;
    }>>;
    onSubmitted?: MultiTxnCallback<any, TxDescription<any, "submitted">>;
};
type BuiltTcx = {
    tx: Tx;
} & BuiltTcxStats;
type BuiltTcxStats = {
    willSign: PubKeyHash[];
    walletMustSign: boolean;
    wallet: Wallet;
    wHelper: WalletHelper<any>;
    costs: {
        total: Cost;
        [key: string]: Cost;
    };
};
export type FacadeTxnContext<S extends anyState = anyState> = hasAddlTxns<StellarTxnContext<S>> & {
    isFacade: true;
};
/**
 * Transaction-building context for Stellar Contract transactions
 * @remarks
 *
 * Uses same essential facade as Helios Tx.
 *
 * Adds a transaction-state container with strong typing of its contents,
 * enabling transaction-building code to use type-sensitive auto-complete
 * and allowing Stellar Contracts library code to require transaction contexts
 * having known states.
 *
 * Retains reflection capabilities to allow utxo-finding utilities to exclude
 * utxo's already included in the contract.
 *
 * @typeParam S - type of the context's `state` prop
 * @public
 **/
export declare class StellarTxnContext<S extends anyState = anyState> {
    kind: "StellarTxnContext";
    id: string;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    allNeededWitnesses: (Address | PubKeyHash)[];
    otherPartySigners: PubKeyHash[];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[];
    parentId: string;
    alreadyPresent: TxNotNeededError | undefined;
    depth: number;
    setup: SetupInfo;
    txb: TxBuilder;
    txnName: string;
    withName(name: string): this;
    get wallet(): Wallet;
    get uh(): UtxoHelper;
    get networkParams(): NetworkParams;
    get actorContext(): ActorContext<any>;
    /**
     * Provides a lightweight, NOT complete, serialization for presenting the transaction context
     * @remarks
     * Serves rendering of the transaction context in vitest
     * @internal
     */
    toJSON(): {
        kind: string;
        state: string | undefined;
        inputs: string;
        outputs: string;
        isBuilt: boolean;
        hasParent: boolean;
        addlTxns: string[] | undefined;
    };
    logger: UplcConsoleLogger;
    constructor(setup: SetupInfo, state?: Partial<S>, parentTcx?: StellarTxnContext<any>);
    isFacade: true | false | undefined;
    facade(this: StellarTxnContext): hasAddlTxns<this> & {
        isFacade: true;
    };
    noFacade(situation: string): void;
    withParent(tcx: StellarTxnContext<any>): this;
    get actorWallet(): any;
    dump(tx?: Tx): string;
    dump(): Promise<string>;
    includeAddlTxn<TCX extends StellarTxnContext<anyState>, RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any> ? TCX : hasAddlTxns<TCX>>(this: TCX, txnName: string, txInfoIn: Omit<TxDescription<any, "buildLater!">, "id" | "depth" | "parentId"> & {
        id?: string;
    }): RETURNS;
    /**
     * @public
     */
    get addlTxns(): Record<string, TxDescription<any, "buildLater!">>;
    mintTokens(...args: MintTokensParams): StellarTxnContext<S>;
    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs;
    reservedUtxos(): TxInput[];
    utxoNotReserved(u: TxInput): TxInput | undefined;
    addUut<T extends string, TCX extends StellarTxnContext>(this: TCX, uutName: UutName, ...names: T[]): hasUutContext<T> & TCX;
    addState<TCX extends StellarTxnContext, K extends string, V>(this: TCX, key: K, value: V): StellarTxnContext<{
        [keyName in K]: V;
    } & anyState> & TCX;
    addCollateral(collateral: TxInput): this;
    getSeedUtxoDetails(this: hasSeedUtxo): SeedAttrs;
    _txnTime?: Date;
    /**
     * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
     *
     * @remarks Returns the txn context.
     * Throws an error if the transaction already has a txnTime set.
     *
     * This method does not itself set the txn's validity interval.  You MUST combine it with
     * a call to validFor(), to set the txn's validity period.  The resulting transaction will
     * be valid from the moment set here until the end of the validity period set by validFor().
     *
     * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
     * during test scenarios to verify time-sensitive behaviors.
     *
     * In the test environment, the network wil normally be advanced to this date
     * before executing the transaction, unless a different execution time is indicated.
     * Use the test helper's `submitTxnWithBlock(txn, {futureDate})` or `advanceNetworkTimeForTx()` methods, or args to
     * use-case-specific functions that those methods.
     */
    futureDate<TCX extends StellarTxnContext<S>>(this: TCX, date: Date): TCX;
    assertNumber(obj: any, msg?: string): number;
    /**
     * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
     * @param slot - Slot number
     */
    slotToTime(slot: bigint): bigint;
    /**
     * Calculates the slot number associated with a given time.
     * @param time - Milliseconds since 1970
     */
    timeToSlot(time: bigint): bigint;
    /**
     * Identifies the time at which the current transaction is expected to be executed.
     * Use this attribute in any transaction-building code that sets date/time values
     * for the transaction.
     * Honors any futureDate() setting or uses the current time if none has been set.
     */
    get txnTime(): Date;
    _txnEndTime?: Date;
    get txnEndTime(): Date;
    /**
      * Sets an on-chain validity period for the transaction, in miilliseconds
      *
      * @remarks if futureDate() has been set on the transaction, that
      * date will be used as the starting point for the validity period.
      *
      * Returns the transaction context for chaining.
      *
      * @param durationMs - the total validity duration for the transaction.  On-chain
      *  checks using CapoCtx `now(granularity)` can enforce this duration
      */
    validFor<TCX extends StellarTxnContext<S>>(this: TCX, durationMs: number): TCX;
    _validityPeriodSet: boolean;
    txRefInputs: TxInput[];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(this: TCX, input: TxInput<any>, refScript?: UplcProgramV2): TCX;
    /**
     * @deprecated - use addRefInput() instead.
     */
    addRefInputs<TCX extends StellarTxnContext<S>>(this: TCX, ...args: addRefInputArgs): void;
    addInput<TCX extends StellarTxnContext<S>>(this: TCX, input: TxInput, r?: isActivity): TCX;
    addOutput<TCX extends StellarTxnContext<S>>(this: TCX, output: TxOutput): TCX;
    attachScript(...args: Parameters<TxBuilder["attachUplcProgram"]>): void;
    /**
     * Adds a UPLC program to the transaction context, increasing the transaction size.
     * @remarks
     * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
     * when available. That method uses a fallback approach adding the script to the
     * transaction if needed.
     */
    addScriptProgram(...args: Parameters<TxBuilder["attachUplcProgram"]>): this;
    wasModified(): void;
    _builtTx?: Tx | Promise<Tx>;
    get builtTx(): Tx | Promise<Tx>;
    addSignature(wallet: Wallet): Promise<void>;
    hasAuthorityToken(authorityValue: Value): boolean;
    findAnySpareUtxos(): Promise<TxInput[] | never>;
    findChangeAddr(): Promise<Address>;
    /**
     * Adds required signers to the transaction context
     * @remarks
     * Before a transaction can be submitted, signatures from each of its signers must be included.
     *
     * Any inputs from the wallet are automatically added as signers, so addSigners() is not needed
     * for those.
     */
    addSigners(...signers: PubKeyHash[]): Promise<void>;
    build(this: StellarTxnContext<any>, { signers, addlTxInfo, beforeValidate, paramsOverride, expectError, }?: {
        signers?: Address[];
        addlTxInfo?: Pick<TxDescription<any, "buildLater!">, "description">;
        beforeValidate?: (tx: Tx) => Promise<any> | any;
        paramsOverride?: Partial<NetworkParams>;
        expectError?: boolean;
    }): Promise<BuiltTcx>;
    log(...msgs: string[]): this;
    flush(): this;
    finish(): this;
    /**
     * Submits the current transaction and any additional transactions in the context.
     * @remarks
     * To submit only the current transaction, use the `submit()` method.
     *
     * Uses the TxBatcher to create a new batch of transactions.  This new batch
     * overlays a TxChainBuilder on the current network-client, using that facade
     * to provide utxos for chained transactions in the batch.
     *
     * The signers array can be used to add additional signers to the transaction, and
     * is passed through to the submit() for the current txn only; it is not used for
     * any additional transactions.
     *
     * The beforeSubmit, onSubmitted callbacks are used for each additional transaction.
     *
     * beforeSubmit can be used to notify the user of the transaction about to be submitted,
     * and can also be used to add additional signers to the transaction or otherwise modify
     * it (by returning the modified transaction).
     *
     * onSubmitted can be used to notify the user that the transaction has been submitted,
     * or for logging or any other post-submission processing.
     */
    submitAll(this: StellarTxnContext<any>, options?: SubmitOptions): Promise<import("./networkClients/BatchSubmitController.js").BatchSubmitController>;
    /**
     * augments a transaction context with a type indicator
     * that it has additional transactions to be submitted.
     * @public
     * @remarks
     * The optional argument can also be used to include additional
     * transactions to be chained after the current transaction.
     */
    withAddlTxns<TCX extends StellarTxnContext<anyState>>(this: TCX, addlTxns?: Record<string, TxDescription<any, "buildLater!">>): hasAddlTxns<TCX>;
    buildAndQueueAll(this: StellarTxnContext<any>, options?: SubmitOptions): Promise<import("./networkClients/BatchSubmitController.js").BatchSubmitController>;
    get currentBatch(): import("./networkClients/BatchSubmitController.js").BatchSubmitController;
    /**
     * Submits only the current transaction.
     * @remarks
     * To also submit additional transactions, use the `submitAll()` method.
     */
    buildAndQueue(this: StellarTxnContext<any>, submitOptions?: SubmitOptions): Promise<void>;
    emitCostDetails(tx: Tx, costs: {
        total: Cost;
        [key: string]: Cost;
    }): void;
    /**
     * Executes additional transactions indicated by an existing transaction
     * @remarks
     *
     * During the off-chain txn-creation process, additional transactions may be
     * queued for execution.  This method is used to register those transactions,
     * along with any chained transactions THEY may trigger.
     *
     * The TxBatcher and batch-controller classes handle wallet-signing
     * and submission of the transactions for execution.
     * @public
     **/
    queueAddlTxns(this: hasAddlTxns<any>, pipelineOptions?: TxPipelineOptions): Promise<any[] | undefined>;
    /**
     * Resolves a list of tx descriptions to full tcx's, without handing any of their
     * any chained/nested txns.
     * @remarks
     * if submitEach is provided, each txn will be submitted as it is resolved.
     * If submitEach is not provided, then the network must be capable of tx-chaining
     * use submitTxnChain() to submit a list of txns with chaining
     */
    resolveMultipleTxns(txns: TxDescription<any, "buildLater!">[], pipelineOptions?: TxPipelineOptions): Promise<void>;
    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
     **/
    addScript(): void;
    submitTxnChain(options?: {
        txns?: TxDescription<any, "buildLater!">[];
    } & TxPipelineOptions): Promise<any[] | undefined>;
}
export {};
//# sourceMappingURL=StellarTxnContext.d.ts.map