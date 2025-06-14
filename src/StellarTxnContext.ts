import {
    dumpAny,
    intWithGrouping,
    lovelaceToAda,
    txAsString,
    utxosAsString,
} from "./diagnostics.js";
import type { hasUutContext } from "./CapoTypes.js";
import { UutName } from "./delegation/UutName.js";
import type { ActorContext, SetupInfo } from "./StellarContract.js";
import { delegateLinkSerializer } from "./delegation/jsonSerializers.js";
import type { Cost, UplcData, UplcProgramV2 } from "@helios-lang/uplc";
import { UplcConsoleLogger } from "./UplcConsoleLogger.js";
import type { isActivity, SeedAttrs } from "./ActivityTypes.js";
import {
    type TxBuilder,
    type WalletHelper,
    type Wallet,
    makeTxBuilder,
    makeWalletHelper,
    makeTxChainBuilder,
} from "@helios-lang/tx-utils";
import {
    decodeTx,
    makeAssets,
    makeNetworkParamsHelper,
    makeTx,
    makeTxBody,
    makeTxCertifyingRedeemer,
    makeTxMintingRedeemer,
    makeTxRewardingRedeemer,
    makeTxSpendingRedeemer,
    makeTxWitnesses,
    makeValue,
    type Address,
    type NetworkParams,
    type PubKeyHash,
    type Tx,
    type TxId,
    type TxInput,
    type TxOutput,
} from "@helios-lang/ledger";
import { bytesToHex } from "@helios-lang/codec-utils";
import type { UtxoHelper } from "./UtxoHelper.js";
import type { IF_ISANY } from "./helios/typeUtils.js";
import type { Expand } from "./helios/typeUtils.js";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789abcdefghjkmnpqrstvwxyz", 12);
import { TxNotNeededError } from "./utils.js";

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export type hasSeedUtxo = StellarTxnContext<
    anyState & {
        seedUtxo: TxInput;
    }
>;

export type txBuiltOrSubmitted =
    | "built"
    | "alreadyPresent"
    | "signed"
    | "submitted";
export type resolvedOrBetter = "resolved" | txBuiltOrSubmitted;
/**
 * @public
 */
export type TxDescription<
    T extends StellarTxnContext,
    PROGRESS extends
        | "buildLater!"
        | "resolved"
        | "alreadyPresent"
        | "built"
        | "signed"
        | "submitted",
    TCX extends StellarTxnContext = IF_ISANY<T, StellarTxnContext<anyState>, T>,
    otherProps extends Record<string, unknown> = {}
> = {
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
} & otherProps &
    (PROGRESS extends "alreadyPresent}"
        ? {
              mkTcx: (() => TCX) | (() => Promise<TCX>);
              tcx: TCX & { alreadyPresent: TxNotNeededError };
          }
        : PROGRESS extends resolvedOrBetter
        ? {
              mkTcx?: (() => TCX) | (() => Promise<TCX>) | undefined;
              tcx: TCX;
          }
        : {
              mkTcx: (() => TCX) | (() => Promise<TCX>);
              tcx?: undefined;
          }) &
    (PROGRESS extends txBuiltOrSubmitted
        ? {
              tx: Tx;
              txId?: TxId;
              stats: BuiltTcxStats;
              options: SubmitOptions;
              txCborHex: string;
          }
        : {}) &
    (PROGRESS extends "signed" | "submitted"
        ? {
              txId: TxId;
              txCborHex: string;
              signedTxCborHex: string;
              walletTxId: TxId;
          }
        : {});

/**
 * @public
 */
export type MultiTxnCallback<
    T extends undefined | StellarTxnContext<any> = StellarTxnContext<any>,
    TXINFO extends TxDescription<any, resolvedOrBetter, any> = TxDescription<
        any,
        "resolved"
    >
> =
    | ((txd: TXINFO) => void)
    | ((txd: TXINFO) => Promise<void>)
    | ((txd: TXINFO) => T | false)
    | ((txd: TXINFO) => Promise<T | false>);

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
export type hasAddlTxns<
    TCX extends StellarTxnContext<anyState>,
    existingStateType extends anyState = TCX["state"]
> = StellarTxnContext<
    existingStateType & {
        addlTxns: Record<string, TxDescription<any, "buildLater!">>;
    }
>;

export type otherAddlTxnNames<TCX extends StellarTxnContext<any>> = string &
    TCX extends { state: { addlTxns: infer aTNs } }
    ? keyof aTNs
    : never;

// type combinedAddlTxns<
//     extraTxnName extends string,
//     stateType extends anyState,
//     existingTxns = stateType extends {addlTxns: any} ? stateType["addlTxns"] : never,
//     existingTxnNames extends string = string & keyof existingTxns
// > = {
//     addlTxns: {
//         //prettier-ignore
//         [txnName in (
//             | extraTxnName
//             | existingTxnNames
//         )]: AddlTxInfo<any>
//     }
// } & stateType;

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

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
// export type anyState = emptyState;
export type uutMap = Record<string, unknown>;
export const emptyUuts: uutMap = Object.freeze({});

// type addInputArgs = Parameters<TxBuilder["spend"]>;
type addRefInputArgs = Parameters<TxBuilder["refer"]>;

type RedeemerArg = {
    redeemer?: UplcData;
};

export type TxDescriptionWithError = TxDescription<
    any,
    "built",
    any,
    {
        error: string;
    }
>;

/**
 * @public
 */
export type SubmitOptions = TxPipelineOptions & {
    /**
     * indicates additional signers expected for the transaction
     */
    signers?: Address[];
    addlTxInfo?: Partial<
        Omit<TxDescription<any, "submitted">, "description">
    > & { description: string };
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
    { redeemer: MintUnsafeParams[2] }
];
/**
 * Provides notifications for various stages of transaction submission
 */
type TxPipelineOptions = Expand<
    TxSubmitCallbacks & {
        fixupBeforeSubmit?: MultiTxnCallback;
        whenBuilt?: MultiTxnCallback<any, TxDescription<any, "built">>;
    }
>;

export type TxSubmitCallbacks = {
    onSubmitError?: MultiTxnCallback<
        any,
        TxDescription<any, "built", any, { error: string }>
    >;
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

export type FacadeTxnContext<S extends anyState = anyState> = hasAddlTxns<
    StellarTxnContext<S>
> & {
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
export class StellarTxnContext<S extends anyState = anyState> {
    id: string = nanoid(5);
    inputs: TxInput[] = [];
    collateral?: TxInput;
    outputs: TxOutput[] = [];
    feeLimit?: bigint;
    state: S;
    allNeededWitnesses: (Address | PubKeyHash)[] = [];
    otherPartySigners: PubKeyHash[] = [];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[] = [];
    parentId: string = "";
    alreadyPresent: TxNotNeededError | undefined = undefined;
    depth = 0;
    declare setup: SetupInfo;
    // submitOptions?: SubmitOptions
    txb: TxBuilder;
    txnName: string = "";
    withName(name: string) {
        this.txnName = name;
        return this;
    }

    get wallet() {
        return this.setup.actorContext.wallet!;
    }

    get uh(): UtxoHelper {
        return this.setup.uh!;
    }

    get networkParams(): NetworkParams {
        return this.setup.networkParams;
    }

    get actorContext(): ActorContext<any> {
        return this.setup.actorContext;
    }
    /**
     * Provides a lightweight, NOT complete, serialization for presenting the transaction context
     * @remarks
     * Serves rendering of the transaction context in vitest
     * @internal
     */
    toJSON() {
        return {
            kind: "StellarTxnContext",
            state: !!this.state
                ? `{${Object.keys(this.state).join(", ")}}`
                : undefined,
            inputs: `[${this.inputs.length} inputs]`,
            outputs: `[${this.outputs.length} outputs]`,
            isBuilt: !!this._builtTx,
            hasParent: !!this.parentTcx,
            //@ts-expect-error
            addlTxns: this.state.addlTxns
                ? [
                      //@ts-expect-error
                      ...Object.keys(this.state.addlTxns || {}),
                  ]
                : undefined,
        };
    }

    logger = new UplcConsoleLogger();
    constructor(
        setup: SetupInfo,
        state: Partial<S> = {},
        parentTcx?: StellarTxnContext<any>
    ) {
        if (parentTcx) {
            console.warn(
                "Deprecated use of 'parentTcx' - use includeAddlTxn() instead" +
                    "\n  ... setup.txBatcher.current holds an in-progress utxo set for all 'parent' transactions"
            );
            throw new Error(`parentTcx used where? `);
        }
        Object.defineProperty(this, "setup", {
            enumerable: false,
            value: setup,
        });
        Object.defineProperty(this, "_builtTx", {
            enumerable: false,
            writable: true,
        });

        const isMainnet = setup.isMainnet;
        this.isFacade = undefined;

        if ("undefined" == typeof isMainnet) {
            throw new Error(
                "StellarTxnContext: setup.isMainnet must be defined"
            );
        }
        this.txb = makeTxBuilder({
            isMainnet,
        });
        // const { uuts = { ...emptyUuts }, ...moreState } = state;
        //@ts-expect-error
        this.state = {
            ...state,
            uuts: state.uuts || { ...emptyUuts },
        };

        const currentBatch = this.currentBatch;
        const hasOpenBatch = currentBatch?.isOpen;
        if (!currentBatch || currentBatch.isConfirmationComplete) {
            this.setup.txBatcher.rotate(this.setup.chainBuilder);
        }

        if (!this.setup.isTest && !this.setup.chainBuilder) {
            if (currentBatch.chainBuilder) {
                // backfills the chainbuilder from the one auto-populated
                // during `get TxBatcher.current()`
                this.setup.chainBuilder = currentBatch.chainBuilder;
            } else {
                this.setup.chainBuilder = makeTxChainBuilder(
                    this.setup.network
                );
            }
        }

        if (parentTcx) {
            debugger;
            throw new Error(`parentTcx used where? `);
        }
        this.parentTcx = parentTcx;
    }

    isFacade: true | false | undefined;
    facade(this: StellarTxnContext): hasAddlTxns<this> & { isFacade: true } {
        if (this.isFacade === false)
            throw new Error(`this tcx already has txn material`);
        if (this.parentTcx)
            throw new Error(`no parentTcx allowed for tcx facade`);

        const t: hasAddlTxns<this> = this as any;
        t.state.addlTxns = t.state.addlTxns || {};
        t.isFacade = true;
        return this as any;
    }
    noFacade(situation: string) {
        if (this.isFacade)
            throw new Error(
                `${situation}: ${
                    this.txnName || "this tcx"
                } is a facade for nested multi-tx`
            );
        this.isFacade = false;
    }

    withParent(tcx: StellarTxnContext<any>) {
        this.noFacade("withParent");
        this.parentTcx = tcx;
        return this;
    }

    get actorWallet() {
        return this.actorContext.wallet;
    }

    dump(tx?: Tx): string;
    dump(): Promise<string>;
    dump(tx?: Tx): string | Promise<string> {
        const t = tx || this.builtTx;
        if (t instanceof Promise) {
            return t.then((tx) => {
                return txAsString(tx, this.setup.networkParams);
            });
        }
        return txAsString(t, this.setup.networkParams);
    }

    includeAddlTxn<
        TCX extends StellarTxnContext<anyState>,
        RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any>
            ? TCX
            : hasAddlTxns<TCX>
    >(
        this: TCX,
        txnName: string,
        txInfoIn: Omit<
            TxDescription<any, "buildLater!">,
            "id" | "depth" | "parentId"
        > & {
            id?: string;
        }
    ): RETURNS {
        const txInfo: TxDescription<any, "buildLater!"> = {
            ...(txInfoIn as any),
        };
        if (!txInfo.id)
            txInfo.id =
                //@ts-expect-error - the tcx is never there,
                // but including the fallback assignment here for
                // consistency about the policy of syncing to it.
                txInfo.tcx?.id || nanoid(5);

        txInfo.parentId = this.id;

        txInfo.depth = (this.depth || 0) + 1;
        const thisWithMoreType: RETURNS = this as any;
        if ("undefined" == typeof this.isFacade) {
            throw new Error(
                `to include additional txns on a tcx with no txn details, call facade() first.\n` +
                    `   ... otherwise, add txn details first or set isFacade to false`
            );
        }
        // if (thisWithMoreType.state.addlTxns?.[txnName]) {
        //     debugger
        //     throw new Error(
        //         `addlTxns['${txnName}'] already included in this transaction:\n` +
        //             Object.keys(thisWithMoreType.state.addlTxns).map(
        //                 (k) => ` • ${k}`
        //             ).join("\n")
        //     );
        // }
        thisWithMoreType.state.addlTxns = {
            ...(thisWithMoreType.state.addlTxns || {}),
            [txInfo.id]: txInfo,
        };
        return thisWithMoreType;
    }

    /**
     * @public
     */
    get addlTxns(): Record<string, TxDescription<any, "buildLater!">> {
        //@ts-expect-error
        return this.state.addlTxns || {};
    }

    mintTokens(...args: MintTokensParams): StellarTxnContext<S> {
        this.noFacade("mintTokens");
        const [policy, tokens, r = { redeemer: undefined }] = args;
        const { redeemer } = r;
        if (this.txb.mintPolicyTokensUnsafe) {
            this.txb.mintPolicyTokensUnsafe(policy, tokens, redeemer);
        } else {
            //@ts-expect-error
            this.txb.mintTokens(policy, tokens, redeemer);
        }

        return this;
    }

    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs {
        this.noFacade("getSeedAttrs");
        // const { seedUtxo } = this.state;  // bad api-extractor!
        const seedUtxo = this.state.seedUtxo;
        // const { txId, utxoIdx: seedIndex } = seedUtxo.id; // ugh, api-extractor!
        return { txId: seedUtxo.id.txId, idx: BigInt(seedUtxo.id.index) };
    }

    reservedUtxos(): TxInput[] {
        this.noFacade("reservedUtxos");
        return this.parentTcx
            ? this.parentTcx.reservedUtxos()
            : ([
                  ...this.inputs,
                  this.collateral,
                  ...this.childReservedUtxos,
              ].filter((x) => !!x) as TxInput[]);
    }

    utxoNotReserved(u: TxInput): TxInput | undefined {
        if (this.collateral?.isEqual(u)) return undefined;
        if (this.inputs.find((i) => i.isEqual(u))) return undefined;
        return u;
    }

    addUut<T extends string, TCX extends StellarTxnContext>(
        this: TCX,
        //!!! todo: type this more strongly by adding strong typing to the UutName itself?
        uutName: UutName,
        ...names: T[]
    ): hasUutContext<T> & TCX {
        this.noFacade("addUut");
        this.state.uuts = this.state.uuts || {};

        for (const name of names) {
            this.state.uuts[name] = uutName;
        }

        return this as hasUutContext<T> & TCX;
    }

    addState<TCX extends StellarTxnContext, K extends string, V>(
        this: TCX,
        key: K,
        value: V
    ): StellarTxnContext<{ [keyName in K]: V } & anyState> & TCX {
        this.noFacade("addState");
        //@ts-expect-error
        this.state[key] = value;
        return this as StellarTxnContext<{ [keyName in K]: V } & anyState> &
            TCX;
    }

    addCollateral(collateral: TxInput) {
        this.noFacade("addCollateral");
        console.warn("explicit addCollateral() should be unnecessary unless a babel payer is covering it")
        
        if (!collateral.value.assets.isZero()) {
            throw new Error(
                `invalid attempt to add non-pure-ADA utxo as collateral`
            );
        }
        this.collateral = collateral;

        this.txb.addCollateral(collateral);
        return this;
    }
    getSeedUtxoDetails(this: hasSeedUtxo): SeedAttrs {
        this.noFacade("getSeedUtxoDetails");
        const seedUtxo = this.state.seedUtxo;
        return {
            txId: seedUtxo.id.txId,
            idx: BigInt(seedUtxo.id.index),
        };
    }

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
    futureDate<TCX extends StellarTxnContext<S>>(this: TCX, date: Date) {
        this.noFacade("futureDate");
        if (this._txnTime) {
            throw new Error(
                "txnTime already set; cannot set futureDate() after txnTime"
            );
        }

        const d = new Date(
            Number(this.slotToTime(this.timeToSlot(BigInt(date.getTime()))))
        );
        // time emoji: ⏰
        console.log("  ⏰⏰ setting txnTime to ", d.toString());
        this._txnTime = d;
        return this;
    }

    assertNumber(obj, msg = "expected a number") {
        if (obj === undefined || obj === null) {
            throw new Error(msg);
        } else if (typeof obj == "number") {
            return obj;
        } else {
            throw new Error(msg);
        }
    }

    /**
     * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
     * @param slot - Slot number
     */
    slotToTime(slot: bigint): bigint {
        let secondsPerSlot = this.assertNumber(
            this.networkParams.secondsPerSlot
        );

        let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
        let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));

        let slotDiff = slot - lastSlot;

        return lastTime + slotDiff * BigInt(secondsPerSlot * 1000);
    }

    /**
     * Calculates the slot number associated with a given time.
     * @param time - Milliseconds since 1970
     */
    timeToSlot(time: bigint): bigint {
        let secondsPerSlot = this.assertNumber(
            this.networkParams.secondsPerSlot
        );

        let lastSlot = BigInt(this.assertNumber(this.networkParams.refTipSlot));
        let lastTime = BigInt(this.assertNumber(this.networkParams.refTipTime));

        let timeDiff = time - lastTime;

        return (
            lastSlot +
            BigInt(Math.round(Number(timeDiff) / (1000 * secondsPerSlot)))
        );
    }

    /**
     * Identifies the time at which the current transaction is expected to be executed.
     * Use this attribute in any transaction-building code that sets date/time values
     * for the transaction.
     * Honors any futureDate() setting or uses the current time if none has been set.
     */
    get txnTime() {
        if (this._txnTime) return this._txnTime;
        const now = Date.now();
        const recent = now - 180_000;
        const d = new Date(
            Number(this.slotToTime(this.timeToSlot(BigInt(recent))))
        );
        // time emoji: ⏰
        console.log("⏰⏰setting txnTime to ", d.toString());
        return (this._txnTime = d);
    }

    _txnEndTime?: Date;
    get txnEndTime() {
        if (this._txnEndTime) return this._txnEndTime;
        throw new Error("call [optional: futureDate() and] validFor(durationMs) before fetching the txnEndTime")
    }
        
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
    validFor<TCX extends StellarTxnContext<S>>(
        this: TCX,
        durationMs: number
    ): TCX {
        this.noFacade("validFor");
        const startMoment = this.txnTime.getTime();

        this._validityPeriodSet = true;
        this.txb
            .validFromTime(new Date(startMoment))
            .validToTime(new Date(startMoment + durationMs));

        return this;
    }
    _validityPeriodSet = false;
    txRefInputs: TxInput[] = [];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        input: TxInput<any>,
        refScript?: UplcProgramV2
    ) {
        this.noFacade("addRefInput");
        if (!input) throw new Error(`missing required input for addRefInput()`);

        if (this.txRefInputs.find((v) => v.id.isEqual(input.id))) {
            console.warn("suppressing second add of refInput");
            return this;
        }
        if (this.inputs.find((v) => v.id.isEqual(input.id))) {
            console.warn(
                "suppressing add of refInput that is already an input"
            );
            return this;
        }
        this.txRefInputs.push(input);

        //@ts-expect-error private field
        const v2sBefore = this.txb.v2Scripts;
        if (refScript) {
            //@ts-expect-error on private method
            this.txb.addV2RefScript(refScript);
        }

        this.txb.refer(input);
        //@ts-expect-error private field
        const v2sAfter = this.txb.v2Scripts;

        // const t2 = this.txb.witnesses.scripts.length;
        // if (t2 > t) {
        if (v2sAfter.length > v2sBefore.length) {
            console.log("       --- addRefInput added a script to tx.scripts");
        }

        return this;
    }

    /**
     * @deprecated - use addRefInput() instead.
     */
    addRefInputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...args: addRefInputArgs
    ) {
        throw new Error(`deprecated`);
    }

    addInput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        input: TxInput,
        r?: isActivity
    ): TCX {
        this.noFacade("addInput");
        if (r && !r.redeemer) {
            console.log("activity without redeemer tag: ", r);
            throw new Error(
                `addInput() redeemer must match the isActivity type {redeemer: ‹activity›}\n`
                // JSON.stringify(r, delegateLinkSerializer)
            );
        }

        //@ts-expect-error probing for pubKeyHash
        if (input.address.pubKeyHash)
            this.allNeededWitnesses.push(input.address);
        this.inputs.push(input);
        if (this.parentTcx) {
            this.parentTcx.childReservedUtxos.push(input);
        }
        try {
            this.txb.spendUnsafe(input, r?.redeemer);
        } catch (e: any) {
            // console.log("failed adding input to txn: ", dumpAny(this));
            debugger;
            throw new Error(
                `addInput: ${e.message}` +
                    "\n   ...TODO: dump partial txn from txb above.  Failed TxInput:\n" +
                    dumpAny(input)
            );
        }

        return this;
    }

    addOutput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        output: TxOutput
    ): TCX {
        this.noFacade("addOutput");
        try {
            this.txb.addOutput(output);
            this.outputs.push(output);
        } catch (e: any) {
            console.log(
                "Error adding output to txn: \n" +
                    "  | inputs:\n  | " +
                    utxosAsString(this.inputs, "\n  | ") +
                    "\n  | " +
                    (dumpAny(this.outputs) as string)
                        .split("\n")
                        .join("\n  |   ") +
                    "\n... in context of partial tx above: failed adding output: \n  |  ",
                dumpAny(output),
                "\n" + e.message,
                "\n   (see thrown stack trace below)"
            );
            e.message =
                `addOutput: ${e.message}` + "\n   ...see logged details above";
            throw e;
        }

        return this;
    }

    attachScript(...args: Parameters<TxBuilder["attachUplcProgram"]>) {
        throw new Error(
            `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.\n` +
                `Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
        );
    }

    /**
     * Adds a UPLC program to the transaction context, increasing the transaction size.
     * @remarks
     * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
     * when available. That method uses a fallback approach adding the script to the
     * transaction if needed.
     */
    addScriptProgram(...args: Parameters<TxBuilder["attachUplcProgram"]>) {
        this.noFacade("addScriptProgram");
        this.txb.attachUplcProgram(...args);

        return this;
    }

    wasModified() {
        //@ts-expect-error private method
        this.txb.wasModified();
    }

    _builtTx?: Tx | Promise<Tx>;
    get builtTx() {
        this.noFacade("builtTx");
        if (!this._builtTx) {
            throw new Error(`can't go building the tx willy-nilly`);
            return (this._builtTx = this.build().then(({ tx }) => {
                return (this._builtTx = tx);
            }));
        }
        return this._builtTx;
    }

    async addSignature(wallet: Wallet) {
        this.noFacade("addSignature");
        const builtTx = await this.builtTx;
        const sig = await wallet.signTx(builtTx);

        builtTx.addSignature(sig[0]);
    }

    async findAnySpareUtxos(): Promise<TxInput[] | never> {
        this.noFacade("findAnySpareUtxos");
        const mightNeedFees = 3_500_000n; // lovelace this.ADA(3.5);

        const toSortInfo = this.uh.mkUtxoSortInfo(mightNeedFees);
        const notReserved =
            this.utxoNotReserved.bind(this) || ((u: TxInput) => u);

        const uh = this.uh;
        return uh
            .findActorUtxo(
                "spares for tx balancing",
                notReserved,
                {
                    wallet: this.wallet,
                    dumpDetail: "onFail",
                },
                "multiple"
            )
            .then(async (utxos) => {
                if (!utxos) {
                    throw new Error(
                        `no utxos found for spares for tx balancing.  We can ask the user to send a series of 10, 11, 12, ... ADA to themselves or do it automatically`
                    );
                }

                const allSpares = utxos
                    .map(toSortInfo)
                    .filter(uh.utxoIsSufficient)
                    .sort(uh.utxoSortSmallerAndPureADA);

                if (allSpares.reduce(uh.reduceUtxosCountAdaOnly, 0) > 0) {
                    return allSpares
                        .filter(uh.utxoIsPureADA)
                        .map(uh.sortInfoBackToUtxo);
                }
                return allSpares.map(uh.sortInfoBackToUtxo);
            });
    }

    async findChangeAddr(): Promise<Address> {
        this.noFacade("findChangeAddr");
        // const {
        //     actorContext: { wallet },
        // } = this; // ugh, api-extractor!
        const wallet = this.actorContext.wallet;
        if (!wallet) {
            throw new Error(
                `⚠️  ${this.constructor.name}: no this.actorContext.wallet; can't get required change address!`
            );
        }
        let unused = (await wallet.unusedAddresses).at(0);
        if (!unused) unused = (await wallet.usedAddresses).at(-1);
        if (!unused)
            throw new Error(
                `⚠️  ${this.constructor.name}: can't find a good change address!`
            );
        return unused;
    }

    /**
     * Adds required signers to the transaction context
     * @remarks
     * Before a transaction can be submitted, signatures from each of its signers must be included.
     * 
     * Any inputs from the wallet are automatically added as signers, so addSigners() is not needed
     * for those.
     */
    async addSigners(...signers: PubKeyHash[]) {
        this.noFacade("addSigners");
        
        this.allNeededWitnesses.push(...signers);
    }

    async build(
        this: StellarTxnContext<any>,
        {
            signers = [],
            addlTxInfo = {
                description: this.txnName ? ": " + this.txnName : "",
            },
            beforeValidate,
            paramsOverride,
            expectError,
        }: {
            signers?: Address[];
            addlTxInfo?: Pick<TxDescription<any, "buildLater!">, "description">;
            beforeValidate?: (tx: Tx) => Promise<any> | any;
            paramsOverride?: Partial<NetworkParams>;
            expectError?: boolean;
        } = {}
    ): Promise<BuiltTcx> {
        this.noFacade("build");
        console.timeStamp?.(`submit() txn ${this.txnName}`);
        console.log("tcx build() @top");

        if (!this._validityPeriodSet) {
            this.validFor(12 * 60 * 1000); // 12 minutes
            // this.validFor(12 * 60 * 1000 * 60 * 24); // 12 days
        }
        let { description } = addlTxInfo;
        if (description && !description.match(/^:/)) {
            description = ": " + description;
        }
        const {
            actorContext: { wallet },
        } = this;

        let walletMustSign = false;
        let tx: Tx;

        const logger = this.logger;
        if (wallet || signers.length) {
            console.timeStamp?.(`submit(): findChangeAddr()`);
            const changeAddress = await this.findChangeAddr();

            console.timeStamp?.(`submit(): findAnySpareUtxos()`);
            const spares = await this.findAnySpareUtxos();

            const willSign = [...signers, ...this.allNeededWitnesses]
                .map((addrOrPkh) => {
                    if (addrOrPkh.kind == "PubKeyHash") {
                        return addrOrPkh;
                    } else if (addrOrPkh.kind == "Address") {
                        if (addrOrPkh.era == "Shelley") {
                            return addrOrPkh.spendingCredential.kind == "PubKeyHash"
                                ? addrOrPkh.spendingCredential
                                : undefined;
                        } else {
                            return undefined;
                        }
                    } else {
                        return undefined;
                    }
                })
                .filter((pkh) => !!pkh)
                .flat(1) as PubKeyHash[];
            console.timeStamp?.(`submit(): addSIgners()`);
            this.txb.addSigners(...willSign);
            const wHelper = wallet && makeWalletHelper(wallet);
            const othersMustSign: PubKeyHash[] = [];
            // determine whether we need to request signing from wallet.
            // may involve adding signers to the txn
            if (wallet && wHelper) {
                for (const a of willSign) {
                    if (await wHelper.isOwnAddress(a)) {
                        walletMustSign = true;
                    } else {
                        othersMustSign.push(a);
                    }
                }
                this.otherPartySigners = othersMustSign;
                // if any inputs from the wallet were added as part of finalizing,
                // add the wallet's signature to the txn
                const inputs = this.txb.inputs;
                if (!inputs) throw new Error(`no inputs in txn`);
                for (const input of inputs) {
                    if (!(await wHelper.isOwnAddress(input.address))) continue;
                    this.allNeededWitnesses.push(input.address);
                    walletMustSign = true;

                    //@ts-expect-error on type-probe
                    const pubKeyHash = input.address.pubKeyHash;

                    if (pubKeyHash) {
                        this.txb.addSigners(pubKeyHash);
                    } else {
                        //!!! todo: deal with "native-script" by traversing its
                        //  struct and seeking the pubKeyHashes (or? other witnesses)
                        //  that may be needed for signing.  That, or include the
                        //  native-script information alongside the otherPartySigners,
                        //  maybe as otherPartyScriptSigners or something.  The
                        //  batch-submit-controller could take over the responsibility
                        //  for finding signatures satisfactory for those.
                    }
                }
            } else {
                console.warn(
                    "txn build: no wallet/helper available for txn signining (debugging breakpoint available)"
                );
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
            }
            let capturedCosts: {
                total: Cost;
                [key: string]: Cost;
            } = {
                total: { cpu: 0n, mem: 0n },
                slush: { cpu: 0n, mem: 0n },
            };

            const inputValues = this.inputs
                .map((i) => i.value.assets)
                .reduce((a, b) => a.add(b), makeAssets());
            const outputValues = this.outputs
                .map((o) => o.value.assets)
                .reduce((a, b) => a.add(b), makeAssets());
            const mintValues = this.txb.mintedTokens;
            const netTxAssets = inputValues
                .add(mintValues)
                .subtract(outputValues);
            if (!netTxAssets.isZero()) {
                console.log(
                    "tx imbalance=" + dumpAny(netTxAssets, this.networkParams)
                );
            }
            try {
                // the transaction can fail validation without throwing an error
                tx = await this.txb.buildUnsafe({
                    changeAddress,
                    spareUtxos: spares,
                    networkParams: {
                        ...this.networkParams,
                        ...paramsOverride,
                    },
                    logOptions: logger,
                    beforeValidate,
                    modifyExBudget: (txi, purpose, index, costs) => {
                        capturedCosts[`${purpose} @${1 + index}`] = {
                            ...costs,
                        };

                        // todo: use Ogmios API to just get the exact costs
                        //   ... and report here when there is a diff.
                        // Meanwhile, add a small amount (0.05 ADA) of padding
                        //   ... to the computed costs, per involved script

                        // temp? - + ~0.06 ada = 1.2x 0.05
                        // const cpuSlush = 0n // BigInt(350_000_000n); // ~25k lovelace
                        // const memSlush = 0n // BigInt(430_000n); // ~25k lovelace

                        // without this, we **sometimes** get problems having enough
                        // exBudget to cover the way the haskell node computes the
                        // per-script execution costs.  Prevents "out of budget" errors
                        // during script execution:
                        const cpuSlush = BigInt(350_000_000n); // ~25k lovelace
                        const memSlush = BigInt(430_000n); // ~25k lovelace

                        //... but doesn't suffice to just add per-script slush:
                        // this approach leads to escalating "expected/actual fee" messaging
                        // const cpuSlush = BigInt( 350_000_000n * 13n / 10n); // ~25k lovelace/0.025 ADA
                        // const memSlush = BigInt(430_000n * 13n / 10n); // ~25k lovelace/0.025 ADA

                        capturedCosts.slush.cpu += cpuSlush;
                        capturedCosts.slush.mem += memSlush;
                        costs.cpu += cpuSlush;
                        costs.mem += memSlush;

                        capturedCosts.total.cpu += costs.cpu;
                        capturedCosts.total.mem += costs.mem;
                        if ("minting" == purpose) purpose = "minting ";
                        return costs;
                    },
                });
                this._builtTx = tx;

                this.txb.validToTime;

                //!!! todo: come back to this later.  Blockfrost's endpoint for this
                // seems to have some issues.  Ogmios itself seems to be fine.
                //
                // //@ts-expect-error on type-probe
                // if (this.setup.network.evalTx) {
                //     const partialTx = undoFeesFrom(tx)
                //     console.log(bytesToHex(partialTx.toCbor()))
                //     //@ts-expect-error on type-probe
                //     const evalResult = await this.setup.network.evalTx(
                //         partialTx
                //     );
                //     debugger
                // }
            } catch (e: any) {
                // buildUnsafe shouldn't throw errors.

                e.message +=
                    "; txn build failed (debugging breakpoint available)\n" +
                    (netTxAssets.isZero()
                        ? ""
                        : "tx imbalance=" +
                          dumpAny(netTxAssets, this.networkParams)) +
                    `  inputs: ${dumpAny(this.inputs)}\n` +
                    `  outputs: ${dumpAny(this.outputs)}\n` +
                    `  mint: ${dumpAny(this.txb.mintedTokens)}\n` +
                    `  refInputs: ${dumpAny(this.txRefInputs)}\n`;

                logger.logError(`txn build failed: ${e.message}`);
                if (tx!) logger.logPrint(dumpAny(tx!) as string);

                logger.logError(
                    `  (it shouldn't be possible for buildUnsafe to be throwing errors!)`
                );
                logger.flushError();

                throw e;
            }

            if (tx.hasValidationError) {
                const e = tx.hasValidationError;

                //@ts-expect-error accessing the stack of something that might be a string instead
                let heliosStack = e.stack?.split("\n") || undefined;
                // locate the first TxImpl line in the stack trace.
                // include it but remove remaining trace lines.
                // heliosStack = heliosStack?.slice(
                //     0, heliosStack.findIndex(l => l.match(/TxImpl/)) + 2
                // ) || ""
                // locate any lines like "<helios>@at <anonymous>, [mkTv=<fn>, tvCharter=<fn>, mustFindInputRedeemer=<fn>, fromCip68Wrapper=<fn>, RelativeDelegateLink::tvAuthorityToken=<fn>, RelativeDelegateLink::acAuthorityToken=<fn>, RelativeDelegateLink::validatesUpdatedSettings=<fn>, RelativeDelegateLink::hasDelegateInput=<fn>, RelativeDelegateLink::hasValidOutput=<fn>, DelegateInput::genericDelegateActivity=<fn>], src/CapoHelpers.hl:761:9:0"
                // and transform it to a multi-line, indented function trace with the
                // square-bracketed items indented to indicate the scope of the function they're provided to
                heliosStack = heliosStack?.map((line: string) => {
                    if (line.match(/<helios>@at/)) {
                        line = line
                            .replace(
                                /<helios>@at /,
                                "   ... in helios function "
                            )
                            .replace(
                                /, \[(.*)\],/,
                                (_, bracketed) => ``
                                // ` with scope [\n        ${
                                //     bracketed.replace(/, /g, ",\n        ")
                                // }\n      ]`
                            );
                    }
                    return line;
                });
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
                const scriptContext =
                    "string" == typeof e ? undefined : e.scriptContext;
                logger.logError(
                    `tx validation failure: \n  ❌ ${
                        //@ts-expect-error
                        tx.hasValidationError.message || tx.hasValidationError
                    }\n` + (heliosStack?.join("\n") || "")
                );
                logger.flush();
                // TODO: notify the currentBatch and let it reveal the script-context
                // and tx-cbor.  KEEP THE console LOGGING for now ALSO.

                const ctxCbor = scriptContext?.toCbor();
                const cborHex = ctxCbor ? bytesToHex(ctxCbor) : "";
                if (!expectError) {
                    console.log(
                        cborHex
                            ? "------------------- failed ScriptContext as cbor-hex -------------------\n" +
                                  cborHex +
                                  "\n"
                            : "",
                        "------------------- failed tx as cbor-hex -------------------\n" +
                            bytesToHex(tx.toCbor()),
                        "\n------------------^ failed tx details ^------------------\n" +
                            "(debugging breakpoint available)"
                    );
                }
            }

            // tx.body.fee = tx.body.fee + BigInt(250_000n); // 25k lovelace
            return {
                tx,
                willSign,
                walletMustSign,
                wallet,
                wHelper,
                costs: capturedCosts,
            };
        } else {
            throw new Error("no 'actorContext.wallet'; can't make  a txn");
        }
    }
    log(...msgs: string[]) {
        if (msgs.length > 1) {
            debugger;
            throw new Error(`no multi-arg log() calls`);
        }
        this.logger.logPrint(msgs[0]);
        return this;
    }
    flush() {
        this.logger.flush();
        return this;
    }
    finish() {
        this.logger.finish();
        return this;
    }

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
    async submitAll(this: StellarTxnContext<any>, options: SubmitOptions = {}) {
        const currentBatch = this.currentBatch;
        const hasOpenBatch = currentBatch?.isOpen;
        // if (hasOpenBatch) {
        //     console.warn(
        //         `⚠️  submitAll(): detected overlapping txn batches... \n` +
        //             `  ... that MIGHT be a developer error on our part.\n` +
        //             `  ... or, you might need to add your transaction to an existing batch \n` +
        //             `      (use otherTcx.includeAddlTxn(...))\n` +
        //             `  ... or, you might need to ensure you're waiting for an existing batch \n` +
        //             `      to finish (monitor setup.txBatcher.current for batch:confirmed)\n` +
        //             `\nFinally, you might have an advanced use-case for building multiple \n` +
        //             `independent batches of transactions that don't need tx chaining between them. \n\n` +
        //             `Please be welcome to log an issue with the project's support desk, \n` +
        //             `... and we'll see what we can do to help.`
        //         );
        //     throw new Error(`can't submitAll() with an existing open tx batch (wait for the existing batch to finish first`);
        // }

        //!!! remove because it's already done in the constructor?
        // debugger
        // if (!currentBatch || currentBatch.isConfirmationComplete) {
        //     this.setup.txBatcher.rotate(this.setup.chainBuilder);
        // }

        // if (!this.setup.isTest && !this.setup.chainBuilder) {
        //     if (currentBatch.chainBuilder) {
        //         // backfills the chainbuilder from the one auto-populated
        //         // during `get TxBatcher.current()`
        //         this.setup.chainBuilder = currentBatch.chainBuilder;
        //     } else {
        //         this.setup.chainBuilder = makeTxChainBuilder(
        //             this.setup.network
        //         );
        //     }
        // }
        //!!! ^^^ remove?

        return this.buildAndQueueAll(options).then(() => {
            return true;
            //            return currentBatch.$signAndSubmitAll().then(() => true);
        });
    }

    /**
     * augments a transaction context with a type indicator
     * that it has additional transactions to be submitted.
     * @public
     * @remarks
     * The optional argument can also be used to include additional
     * transactions to be chained after the current transaction.
     */
    withAddlTxns<TCX extends StellarTxnContext<anyState>>(
        this: TCX,
        addlTxns: Record<string, TxDescription<any, "buildLater!">> = {}
    ): hasAddlTxns<TCX> {
        //@ts-expect-error
        this.state.addlTxns = this.state.addlTxns || {};

        for (const [name, txn] of Object.entries(addlTxns)) {
            this.includeAddlTxn(name, txn);
        }
        return this as any;
    }

    async buildAndQueueAll(
        this: StellarTxnContext<any>,
        options: SubmitOptions = {}
    ) {
        const {
            addlTxInfo = {
                description: this.txnName
                    ? ": " + this.txnName
                    : "‹unnamed tx›",
                id: this.id,
                tcx: this,
            },
            ...generalSubmitOptions
        } = options;
        if (options.paramsOverride) {
            console.warn(
                "⚠️  paramsOverride can be useful for extreme cases \n" +
                    "of troubleshooting tx execution by submitting an oversized tx \n" +
                    "with unoptimized contract scripts having diagnostic print/trace calls\n" +
                    "to a custom preprod node having overloaded network params, thus allowing \n" +
                    "such a transaction to be evaluated end-to-end by the Haskell evaluator using \n" +
                    "the cardano-node's script-budgeting mini-protocol.\n\n" +
                    "This will cause problems for regular transactions (such as requiring very large collateral)" +
                    "Be sure to remove any params override if you're not dealing with \n" +
                    "one of those very special situations. \n"
            );
            debugger;
        }

        if (this.isFacade == false) {
            return this.buildAndQueue({
                ...generalSubmitOptions,
                addlTxInfo,
            }).then(() => {
                if (this.state.addlTxns) {
                    // this gives early registration of nested txns from top-level txns
                    console.log(
                        `🎄⛄🎁 ${this.id}   -- B&QA - registering addl txns`
                    );
                    return this.queueAddlTxns(options).then(() => {
                        return true;
                    });

                    // .then((x) => {
                    //     return this.currentBatch.$signAndSubmitAll()
                    //     // this.setup.chainBuilder = undefined;
                    //     // return x;
                    // });
                }
            });
        } else if (this.state.addlTxns) {
            if (this.isFacade) {
                this.currentBatch.$txInfo(this.id)?.transition("isFacade");
            }

            // this gives early registration of nested txns from top-level txns
            console.log(
                `🎄⛄🎁 ${this.id}   -- B&QA - registering txns in facade`
            );
            return this.queueAddlTxns(generalSubmitOptions).then(() => {
                return true;
            });
        }
        console.warn(`⚠️  submitAll(): no txns to queue/submit`, this);
        throw new Error(
            `unreachable? -- nothing to do for submitting this tcx`
        );
    }

    get currentBatch() {
        return this.setup.txBatcher.current;
    }

    /**
     * Submits only the current transaction.
     * @remarks
     * To also submit additional transactions, use the `submitAll()` method.
     */
    async buildAndQueue(
        this: StellarTxnContext<any>,
        submitOptions: SubmitOptions = {}
    ) {
        let {
            signers = [],
            addlTxInfo,
            paramsOverride,
            expectError,
            beforeError,
            beforeValidate,
            whenBuilt,
            fixupBeforeSubmit,
            onSubmitError,
            onSubmitted,
        } = submitOptions;

        // console.log("buildAndQueue with setup", this.setup);
        this.noFacade("submit");
        if (!addlTxInfo) {
            debugger;
            throw new Error(`expecting addlTxInfo to be passed`);
            addlTxInfo = {
                description: this.txnName
                    ? ": " + this.txnName
                    : "‹unnamed tx›",
                id: nanoid(5),
                tcx: this,
            };
        }
        const {
            logger,
            setup: { network },
        } = this;
        const {
            tx,
            willSign,
            walletMustSign,
            wallet,
            wHelper,
            costs = {
                total: { cpu: 0n, mem: 0n },
            },
        } = await this.build({
            signers,
            paramsOverride,
            addlTxInfo,
            beforeValidate,
            expectError,
        });
        let { description, id } = addlTxInfo;
        if (!id) {
            id = addlTxInfo.id = this.id;
        }
        const addlTxInfo2: TxDescription<any, "buildLater!"> = {
            ...addlTxInfo,
        } as any;

        const txStats = {
            costs: costs,
            wallet: wallet,
            walletMustSign,
            wHelper,
            willSign,
        };
        const errMsg =
            tx.hasValidationError && tx.hasValidationError.toString();
        if (errMsg) {
            // console.log(`submit(): FAILED tx.validate(): ${errMsg}`);
            // console.profileEnd?.("tx.validate()");
            // @ts-ignore
            // if (console.profileEnd) {
            //     debugger;
            // }

            logger.logPrint(`⚠️  txn validation failed: ${errMsg}\n`);
            logger.logPrint(this.dump(tx));
            this.emitCostDetails(tx, costs);
            logger.flush();
            logger.logError(`FAILED submitting tx: ${description}`);
            logger.logPrint(errMsg);
            if (expectError) {
                logger.logPrint(
                    `\n\n💣🎉 💣🎉 🎉 🎉 transaction failed (as expected)`
                );
            }

            const txErrorDescription: TxDescriptionWithError = {
                ...addlTxInfo2,
                tcx: this,
                error: errMsg,
                tx,
                stats: txStats,
                options: submitOptions,
                txCborHex: bytesToHex(tx.toCbor()),
            };
            this.currentBatch.txError(txErrorDescription);

            let errorHandled;
            if (beforeError) {
                errorHandled = await beforeError(txErrorDescription);
            }
            logger.flushError();
            if (
                errMsg.match(
                    /multi:Minting: only dgData activities ok in mintDgt/
                )
            ) {
                console.log(
                    `⚠️  mint delegate for multiple activities should be given delegated-data activities, not the activities of the delegate`
                );
            }
            if (!errorHandled) {
                debugger;
                throw new Error(errMsg);
            }
        }
        // const elapsed = t2 - t1;
        // console.log(
        //     // stopwatch emoji: ⏱
        //     `          :::::::::: ⏱ tx validation time: ${elapsed}ms ⏱`
        // );
        // result: validations for non-trivial txns can take ~800+ ms
        //  - validations with simplify:true, ~250ms - but ...`
        //    ... with elided error messages that don't support negative-testing very well
        for (const pkh of willSign) {
            if (!pkh) continue;
            if (tx.body.signers.find((s) => pkh.isEqual(s))) continue;
            throw new Error(
                `incontheeivable! all signers should have been added to the builder above`
            );
        }

        const txDescr: TxDescription<any, "built"> = {
            ...addlTxInfo2,
            tcx: this,
            tx,
            txId: tx.id(),
            options: submitOptions,
            stats: txStats,
            txCborHex: bytesToHex(tx.toCbor()),
        };
        const { currentBatch } = this;
        const txState = currentBatch.$txStates[id];

        logger.logPrint(`tx transcript: ${description}\n`);
        logger.logPrint(this.dump(tx));
        this.emitCostDetails(tx, costs);
        logger.flush();

        // hands off wallet signing & tx-completion to the batcher.
        console.timeStamp?.(`tx: add to current-tx-batch`);
        currentBatch.$addTxns(txDescr);
        this.setup.chainBuilder?.with(txDescr.tx);
        await whenBuilt?.(txDescr);
    }
    emitCostDetails(tx: Tx, costs: { total: Cost; [key: string]: Cost }) {
        const { logger } = this;
        const {
            maxTxExCpu,
            maxTxExMem,
            maxTxSize,
            //@ts-expect-error on our synthetic attributes
            origMaxTxSize = maxTxSize,
            //@ts-expect-error on our synthetic attributes
            origMaxTxExMem = maxTxExMem,
            //@ts-expect-error on our synthetic attributes
            origMaxTxExCpu = maxTxExCpu,
            exCpuFeePerUnit,
            exMemFeePerUnit,
            txFeePerByte,
            txFeeFixed,
        } = this.networkParams;
        const oMaxSize: number = origMaxTxSize;
        const oMaxMem: number = origMaxTxExMem;
        const oMaxCpu: number = origMaxTxExCpu;

        const { total, ...otherCosts } = costs;
        const txSize = tx.calcSize();
        const txFeeCalc = Number(tx.calcMinFee(this.networkParams));
        const txFee = tx.body.fee;

        const cpuFee = BigInt((Number(total.cpu) * exCpuFeePerUnit).toFixed(0));
        const memFee = BigInt((Number(total.mem) * exMemFeePerUnit).toFixed(0));
        const sizeFee = BigInt(txSize * txFeePerByte);
        const nCpu = Number(total.cpu);
        const nMem = Number(total.mem);
        let refScriptSize = 0;
        for (const anyInput of [...tx.body.inputs, ...tx.body.refInputs]) {
            const refScript = anyInput.output.refScript;
            if (refScript) {
                const scriptSize = refScript.toCbor().length;
                refScriptSize += scriptSize;
            }
        }
        let multiplier = 1.0;
        let refScriptsFee = 0n;
        let refScriptsFeePerByte = this.networkParams.refScriptsFeePerByte;
        let refScriptCostDetails: string[] = [];
        const tierSize = 25600;
        let alreadyConsumed = 0;
        for (
            let tier = 0;
            tier * tierSize < refScriptSize;
            tier += 1, multiplier *= 1.2
        ) {
            const topOfThisTier = (1 + tier) * tierSize;
            const consumedThisTier = Math.min(
                tierSize,
                refScriptSize - alreadyConsumed
            );
            alreadyConsumed += consumedThisTier;
            const feeThisTier = Math.round(
                consumedThisTier * multiplier * refScriptsFeePerByte
            );
            refScriptsFee += BigInt(feeThisTier);
            refScriptCostDetails.push(
                `\n      -- refScript tier${
                    1 + tier
                } (${consumedThisTier} × ${multiplier}) ×${refScriptsFeePerByte} = ${lovelaceToAda(
                    feeThisTier
                )}`
            );
        }

        // for (let i = 0; i < refScriptSize; i += 25600, multiplier *= 1.2) {
        //     const chunkSize = Math.min(25600, refScriptSize - i)
        //     const feeThisChunk = chunkSize * multiplier * refScriptsFeePerByte
        //     refScriptsFee += BigInt(feeThisChunk)
        //     refScriptCostDetails.push(
        //         `\n      -- refScript tier${i} (${chunkSize} bytes) × ${multiplier} = ${lovelaceToAda(feeThisChunk)}`
        //     )
        // }
        const fixedTxFeeBigInt = BigInt(txFeeFixed);

        const remainderUnaccounted =
            txFee -
            cpuFee -
            memFee -
            sizeFee -
            fixedTxFeeBigInt -
            refScriptsFee;

        if (nCpu > oMaxCpu || nMem > oMaxMem || txSize > oMaxSize) {
            logger.logPrint(
                "🔥🔥🔥🔥  THIS TX EXCEEDS default (overridden in test env) limits on network params  🔥🔥🔥🔥\n" +
                    `  -- cpu ${intWithGrouping(nCpu)} = ${(
                        (100 * nCpu) /
                        oMaxCpu
                    ).toFixed(1)}% of ${intWithGrouping(
                        oMaxCpu
                    )} (patched to ${intWithGrouping(maxTxExCpu)})\n` +
                    `  -- mem ${nMem} = ${((100 * nMem) / oMaxMem).toFixed(
                        1
                    )}% of ${intWithGrouping(
                        oMaxMem
                    )} (patched to ${intWithGrouping(maxTxExMem)})\n` +
                    `  -- tx size ${intWithGrouping(txSize)} = ${(
                        (100 * txSize) /
                        oMaxSize
                    ).toFixed(1)}% of ${intWithGrouping(
                        oMaxSize
                    )} (patched to ${intWithGrouping(maxTxSize)})\n`
            );
        }
        const scriptBreakdown =
            Object.keys(otherCosts).length > 0
                ? `\n    -- per script (with % blame for actual costs):` +
                  Object.entries(otherCosts)
                      .map(
                          ([key, { cpu, mem }]) =>
                              `\n      -- ${key}: cpu ${lovelaceToAda(
                                  Number(cpu) * exCpuFeePerUnit
                              )} = ${(
                                  (Number(cpu) / Number(total.cpu)) *
                                  100
                              ).toFixed(1)}%, mem ${lovelaceToAda(
                                  Number(mem) * exMemFeePerUnit
                              )} = ${(
                                  (Number(mem) / Number(total.mem)) *
                                  100
                              ).toFixed(1)}%`
                      )
                      .join("")
                : "";

        logger.logPrint(
            `costs: ${lovelaceToAda(txFee)}` +
                `\n  -- fixed fee = ${lovelaceToAda(txFeeFixed)}` +
                `\n  -- tx size fee = ${lovelaceToAda(sizeFee)}` +
                ` (${intWithGrouping(txSize)} bytes = ${(
                    Number((1000 * txSize) / oMaxSize) / 10
                ).toFixed(1)}% of tx size limit)` +
                `\n  -- refScripts fee = ${lovelaceToAda(refScriptsFee)}` +
                refScriptCostDetails.join("") +
                `\n  -- scripting costs` +
                `\n    -- cpu units ${intWithGrouping(total.cpu)}` +
                ` = ${lovelaceToAda(cpuFee)}` +
                ` (${(
                    Number((1000n * total.cpu) / BigInt(oMaxCpu)) / 10
                ).toFixed(1)}% of cpu limit/tx)` +
                `\n    -- memory units ${intWithGrouping(total.mem)}` +
                ` = ${lovelaceToAda(memFee)}` +
                ` (${(
                    Number((1000n * total.mem) / BigInt(oMaxMem)) / 10
                ).toFixed(1)}% of mem limit/tx)` +
                scriptBreakdown +
                `\n  -- remainder ${lovelaceToAda(
                    remainderUnaccounted
                )} unaccounted-for`
        );
    }

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
    async queueAddlTxns(
        this: hasAddlTxns<any>,
        pipelineOptions?: TxPipelineOptions
    ) {
        const { addlTxns } = this.state;
        if (!addlTxns) return;

        // return this.submitTxns(Object.values(addlTxns), callback);
        return this.submitTxnChain({
            ...pipelineOptions,
            txns: Object.values(addlTxns),
        });
    }

    /**
     * Resolves a list of tx descriptions to full tcx's, without handing any of their
     * any chained/nested txns.
     * @remarks
     * if submitEach is provided, each txn will be submitted as it is resolved.
     * If submitEach is not provided, then the network must be capable of tx-chaining
     * use submitTxnChain() to submit a list of txns with chaining
     */
    async resolveMultipleTxns(
        txns: TxDescription<any, "buildLater!">[],
        pipelineOptions?: TxPipelineOptions
    ) {
        //         as [
        //         string,
        //         TxDescription<any, "buildLater!">
        //     ][]

        for (const [txName, addlTxInfo] of Object.entries(txns)) {
            const { id } = addlTxInfo;
            let txTracker = this.currentBatch.$txInfo(id);
            if (!txTracker) {
                this.currentBatch.$addTxns(addlTxInfo);
                txTracker = this.currentBatch.$txInfo(id);
            }
        }
        /* yield to allow rendering */
        await new Promise((res) => setTimeout(res, 5));

        for (const [txName, addlTxInfo] of Object.entries(txns)) {
            const { id, depth, parentId } = addlTxInfo;
            let txTracker = this.currentBatch.$txInfo(id);

            txTracker.$transition("building");
            /* yield to allow rendering */
            await new Promise((res) => setTimeout(res, 5));

            // IS resolving.  WILL BE resolved
            const txInfoResolved: TxDescription<any, "resolved"> =
                addlTxInfo as any;
            const { txName, description } = txInfoResolved;
            let alreadyPresent: TxNotNeededError | undefined = undefined;
            console.log("  -- before: " + description);
            const tcx = (
                "function" == typeof addlTxInfo.mkTcx
                    ? await (async () => {
                          console.log(
                              "  creating TCX just in time for: " + description
                          );

                          const tcx = await addlTxInfo.mkTcx();
                          tcx.parentId = parentId || "";
                          tcx.depth = depth;
                          if (id) {
                              this.currentBatch.changeTxId(id, tcx.id);
                              txInfoResolved.id = tcx.id;
                          } else {
                              addlTxInfo.id = tcx.id;
                              console.warn(
                                  `expected id to be set on addlTxInfo; falling back to JIT-generated id in new tcx`
                              );
                          }
                          return tcx;
                      })().catch((e) => {
                          if (e instanceof TxNotNeededError) {
                              alreadyPresent = e;
                              const tcx = new StellarTxnContext(
                                  this.setup
                              ).withName(
                                  `addlTxInfo already present: ${description}`
                              );
                              tcx.alreadyPresent = alreadyPresent;
                              return tcx;
                          }
                          throw e;
                      })
                    : (() => {
                          console.log(
                              "  ---------------- warning!!!! addlTxInfo is already built!"
                          );
                          debugger;
                          throw new Error(" unreachable - right?");
                          return addlTxInfo.tcx;
                      })()
            ) as StellarTxnContext;
            if ("undefined" == typeof tcx) {
                throw new Error(
                    `no txn provided for addlTx ${txName || description}`
                );
            }
            txInfoResolved.tcx = tcx;
            if (tcx.alreadyPresent) {
                console.log(
                    "  -- tx effects are already present; skipping: " +
                        txName || description
                );
                this.currentBatch.$addTxns(txInfoResolved);
                continue;
            }

            const replacementTcx =
                (pipelineOptions?.fixupBeforeSubmit &&
                    ((await pipelineOptions.fixupBeforeSubmit(
                        txInfoResolved
                    )) as typeof replacementTcx | boolean)) ||
                tcx;
            if (false === replacementTcx) {
                console.log("callback cancelled txn: ", txName);
                continue;
            }
            if (replacementTcx !== true && replacementTcx !== tcx) {
                console.log(
                    `callback replaced txn ${txName} with a different txn: `,
                    dumpAny(replacementTcx)
                );
            }

            // if the callback returns true or void, we execute the txn as already resolved.
            // if it returns an alternative txn, we use that instead.
            const effectiveTcx: StellarTxnContext =
                true === replacementTcx ? tcx : replacementTcx || tcx;
            // console.log("   -- submitTxns: -> txn: ", txName, description);
            // console.log("   ----> effective tx", effectiveTcx);

            txInfoResolved.tcx = effectiveTcx;

            //!!! was just buildAndQueue, but that was executing
            // in "breadth-first" order (good for registration)
            //    (i.e. in consecutive layers of discovered txns)
            // ... instead of executing depth-first (good for tx-chaining).
            // We want all txns to be registered as soon as they're
            //   known to be a tx to be made.  But for each such tx,
            //   we want its chained txns to be executed BEFORE moving on
            //   to build any of those other registered txns.

            // //@ts-expect-error
            // if (this.setup.stopped) return;
            // if (description == "+ on-chain refScript: minter") {
            //     //@ts-expect-error
            //     this.setup.stopped = true
            //     break
            // }
            await effectiveTcx.buildAndQueueAll({
                ...pipelineOptions,
                addlTxInfo: txInfoResolved,
            });
            // console.log("   -- submitTxns: <- txn: ", txName, description);
            // m oved into submit()
            // if (callbacks?.onSubmitted) {
            // console.log("   -- submitTxns: triggering onSubmit callback");
            // await callbacks.onSubmitted(txInfoResolved);
            // console.log("   -- submitTxns: onSubmitted callback completed");
            // }
        }
    }

    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
     **/
    addScript() {}

    async submitTxnChain(
        options: {
            txns?: TxDescription<any, "buildLater!">[];
        } & TxPipelineOptions = {
            //@ts-expect-error because the type of this context doesn't
            //   guarantee the presence of addlTxns.  But it might be there!
            txns: this.state.addlTxns || [],
        }
    ) {
        //@ts-expect-error on probing for a maybe-undefined entry:
        const addlTxns = this.state.addlTxns;

        const { txns, onSubmitError } = options;
        const newTxns: TxDescription<any, "buildLater!">[] =
            txns || addlTxns || [];
        let chainedTxns: TxDescription<any, "buildLater!">[] = [];

        const txChainSubmitOptions: TxPipelineOptions = {
            onSubmitError,
            // txns,  // see newTxns
            fixupBeforeSubmit: (txinfo) => {
                //   ... in regular execution environment, this is a no-op by default
                options.fixupBeforeSubmit?.(txinfo);
            },
            whenBuilt: async (txinfo) => {
                const { id: parentId, tx } = txinfo;
                const stackedPromise = options.whenBuilt?.(txinfo);
                const more: Record<string, TxDescription<any, "buildLater!">> =
                    //@ts-expect-error on optional prop
                    txinfo.tcx.state.addlTxns || {};
                console.log("  ✅ " + txinfo.description);
                const moreTxns = Object.values(more);

                for (const nested of moreTxns) {
                    nested.parentId = parentId;
                }
                console.log(
                    `🎄⛄🎁 ${parentId}   -- registering nested txns ASAP`
                );
                this.currentBatch.$addTxns(moreTxns);

                /* yield to allow rendering */
                await new Promise((res) => setTimeout(res, 5));

                // if (moreTxns.length) {
                //     // gathers the next layer of txns to be resolved & built
                //     chainedTxns.push(...moreTxns);
                //     console.log(
                //         " + chained txns: \n" +
                //             moreTxns
                //                 .map((t) => `   🟩 ${t.description}\n`)
                //                 .join("")
                //     );
                // }
                return stackedPromise;
            },
            onSubmitted: (txinfo) => {
                //@ts-expect-error triggering the test-network-emulator's tick
                //   ... in regular execution environment, this is a no-op by default
                this.setup.network.tick?.(1);
            },
        };
        let chainDepth = 0;
        const isolatedTcx = new StellarTxnContext(this.setup);
        console.log("🐝😾🐻🦀");
        isolatedTcx.id = this.id;
        console.log(
            "at d=0: submitting addl txns: \n" +
                newTxns.map((t) => `  🟩 ${t.description}\n`).join("")
        );

        const t = isolatedTcx.resolveMultipleTxns(
            newTxns,
            txChainSubmitOptions
        );

        const allPromises = [] as Promise<any>[];
        chainDepth = 0;
        allPromises.push(t);

        await t;
        return;
        while (chainedTxns.length) {
            const nextChain: typeof chainedTxns = [];
            chainDepth++;

            for (const { tcx } of chainedTxns) {
                // if (tcx.state) {
                //     debugger
                // } else {
                //     const { addlTxns: nestedAddlTxns } = (tcx.state || {}) as {
                //         addlTxns?: Record<
                //             string,
                //             TxDescription<any, "buildLater!">
                //         >;
                //     };
                //     if (!nestedAddlTxns) continue;
                //     nextChain.push(...Object.values(nestedAddlTxns));
                // }
            }
            console.log(
                ` 🐞🐞🐞🐞 submitting ${chainedTxns.length} transactions at depth ${chainDepth}`
            );
            console.log(
                chainedTxns.map((t) => `  🟩 ${t.description}\n`).join("")
            );
            const thisBatch = chainedTxns;
            chainedTxns = [];

            const isolatedTcx = new StellarTxnContext(this.setup);
            isolatedTcx.id = this.id;

            const t = isolatedTcx.resolveMultipleTxns(
                thisBatch,
                txChainSubmitOptions
            );
            allPromises.push(t);
            await t;
            console.log(
                "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nSubmitted transactions at depth " +
                    chainDepth
            );
            chainedTxns = nextChain;
        }
        return Promise.all(allPromises);
    }
}

// /**
//  * Given a fully built transaction, returns a new transaction with the fees removed
//  * @remarks
//  * The result is suitable for submission to Ogmios' tx-evaluation endpoint
//  * that uses Haskell's CEK interpreter to give us the costs for the transaction.
//  *
//  * TODO: use this to cross-check Helios' CEK budgeting and ensure we
//  * make a txn that will be accepted by the network
//  */
// export function undoFeesFrom(
//     t: Tx,
//     { isValid: validity = true }: { isValid?: boolean } = {}
// ): Tx {
//     const tb = t.body;
//     const pTxB = makeTxBody({
//         dcerts: tb.dcerts,
//         fee: BigInt(0),
//         minted: tb.minted,
//         refInputs: tb.refInputs,
//         inputs: tb.inputs,
//         outputs: tb.outputs,
//         signers: tb.signers,
//         withdrawals: tb.withdrawals,
//         collateral: tb.collateral,
//         collateralReturn: tb.collateralReturn,
//         firstValidSlot: tb.firstValidSlot,
//         lastValidSlot: tb.lastValidSlot,
//         metadataHash: tb.metadataHash,
//         scriptDataHash: tb.scriptDataHash,
//         totalCollateral: tb.totalCollateral,
//     });

//     const txW = makeTxWitnesses({
//         ...t.witnesses,
//         redeemers: t.witnesses.redeemers.map((r) => {
//             switch (r.kind) {
//                 case "TxCertifyingRedeemer":
//                     return makeTxCertifyingRedeemer(r.dcertIndex, r.data);
//                 case "TxMintingRedeemer":
//                     return makeTxMintingRedeemer(r.policyIndex, r.data);
//                 case "TxSpendingRedeemer":
//                     return makeTxSpendingRedeemer(r.inputIndex, r.data);
//                 case "TxRewardingRedeemer":
//                     return makeTxRewardingRedeemer(r.withdrawalIndex, r.data);
//             }
//         }),
//     });
//     return makeTx(pTxB, txW, validity, t.metadata);
// }
