import {
    dumpAny,
    lovelaceToAda,
    txAsString,
    utxosAsString,
} from "./diagnostics.js";
import type { hasUutContext } from "./CapoTypes.js";
import { UutName } from "./delegation/UutName.js";
import type { ActorContext, SetupInfo } from "./StellarContract.js";
import { delegateLinkSerializer } from "./delegation/jsonSerializers.js";
import type { Cost, UplcData } from "@helios-lang/uplc";
import { UplcConsoleLogger } from "./UplcConsoleLogger.js";
import type { isActivity, SeedAttrs } from "./ActivityTypes.js";
import {
    type TxBuilder,
    type WalletHelper,
    type Wallet,
    makeTxBuilder,
    makeWalletHelper,
} from "@helios-lang/tx-utils";
import {
    makeNetworkParamsHelper,
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

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export type hasSeedUtxo = StellarTxnContext<
    anyState & {
        seedUtxo: TxInput;
    }
>;

/**
 * @public
 */
export type TxDescription<T extends StellarTxnContext> = {
    tcx: T | (() => T) | (() => Promise<T>);

    description: string;
    moreInfo: string;
    optional: boolean;
    txName?: string;
};

/**
 * @public
 */
export type MultiTxnCallback =
    | ((futTx: TxDescription<any>) => void)
    | ((futTx: TxDescription<any>) => Promise<void>)
    // | ((futTx: TxDescription<any>) => StellarTxnContext<any>)
    // | ((futTx: TxDescription<any>) => Promise<StellarTxnContext<any>>)
    | ((futTx: TxDescription<any>) => StellarTxnContext<any> | false)
    | ((futTx: TxDescription<any>) => Promise<StellarTxnContext<any> | false>);

/**
 * A transaction context that includes additional transactions in its state for later execution
 * @remarks
 *
 * During the course of creating a transaction, the transaction-building functions for a contract
 * suite may suggest or require further transactions, which may not be executable until after the
 * current transaction is executed.  This type allows the transaction context to include such
 * future transactions in its state, so that they can be executed later.
 *
 * The future transactions can be executed using the {@link StellarTxnContext.submitAddlTxns}
 * helper method.
 * @public
 **/
export type hasAddlTxns<
    TCX extends StellarTxnContext<anyState>,
    existingStateType extends anyState = TCX["state"]
> = StellarTxnContext<
    existingStateType & {
        addlTxns: Record<string, TxDescription<any>>;
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

export type SubmitOptions = {
    /**
     * indicates additional signers expected for the transaction
     */
    signers?: Address[];
    addlTxInfo?: Pick<TxDescription<any>, "description">;
    /**
     * useful most for test environment, so that a txn failure can be me marked
     * as "failing as expected".  Not normally needed for production code.
     */
    expectError?: true;
    /**
     * Called when there is a detected error, before logging.  Probably only needed in test.
     */
    beforeError?: (tx: Tx) => Promise<any> | any;
    beforeValidate?: (tx: Tx) => Promise<any> | any;
    beforeSubmit?: MultiTxnCallback;
    onSubmitted?: MultiTxnCallback;
};

type MintUnsafeParams = Parameters<TxBuilder["mintPolicyTokensUnsafe"]>;
type MintTokensParams = [
    MintUnsafeParams[0],
    MintUnsafeParams[1],
    { redeemer: MintUnsafeParams[2] }
];
type SubmitCallbacks = {
    beforeSubmit?: MultiTxnCallback;
    onSubmitted?: MultiTxnCallback;
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
    inputs: TxInput[] = [];
    collateral?: TxInput;
    outputs: TxOutput[] = [];
    feeLimit?: bigint;
    state: S;
    neededSigners: Address[] = [];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[] = [];
    declare setup: SetupInfo;
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
        Object.defineProperty(this, "setup", {
            enumerable: false,
            value: setup,
        });
        Object.defineProperty(this, "_builtTx", { enumerable: false });

        this.txb = makeTxBuilder({
            isMainnet: this.setup.isMainnet || false,
        });
        // const { uuts = { ...emptyUuts }, ...moreState } = state;
        //@ts-expect-error
        this.state = {
            ...state,
            uuts: state.uuts || { ...emptyUuts },
        };
        this.parentTcx = parentTcx;
    }
    withParent(tcx: StellarTxnContext<any>) {
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
    >(this: TCX, txnName: string, txInfo: TxDescription<any>): RETURNS {
        const thisWithMoreType: RETURNS = this as any;
        if (thisWithMoreType.state.addlTxns?.[txnName]) {
            throw new Error(
                `addlTxns['${txnName}'] already included in this transaction`
            );
        }
        thisWithMoreType.state.addlTxns = {
            ...(thisWithMoreType.state.addlTxns || {}),
            [txnName]: txInfo,
        };
        return thisWithMoreType;
    }

    mintTokens(...args: MintTokensParams): StellarTxnContext<S> {
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
        // const { seedUtxo } = this.state;  // bad api-extractor!
        const seedUtxo = this.state.seedUtxo;
        // const { txId, utxoIdx: seedIndex } = seedUtxo.id; // ugh, api-extractor!
        return { txId: seedUtxo.id.txId, idx: BigInt(seedUtxo.id.index) };
    }

    reservedUtxos(): TxInput[] {
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
        //@ts-expect-error
        this.state[key] = value;
        return this as StellarTxnContext<{ [keyName in K]: V } & anyState> &
            TCX;
    }

    addCollateral(collateral: TxInput) {
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
        const d = new Date(
            Number(
                this.slotToTime(this.timeToSlot(BigInt(new Date().getTime())))
            )
        );
        // time emoji: ⏰
        console.log("⏰⏰setting txnTime to ", d.toString());
        return (this._txnTime = d);
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
        const startMoment = this.txnTime.getTime();
        if (this.txb.validFromTime) {
            this.txb
                .validFromTime(new Date(startMoment))
                .validToTime(new Date(startMoment + durationMs));
        } else {
            this.txb
                //@ts-expect-error
                .validFrom(new Date(startMoment))
                .validTo(new Date(startMoment + durationMs));
        }
        return this;
    }

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
        ...inputArgs: addRefInputArgs
    ) {
        // const [input, ...moreArgs] = inputArgs; // ugh, api-extractor!
        const input = inputArgs[0];
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

        // if (moreArgs.length) {
        //     //@ts-expect-error
        //     this.tx.attachScript(...moreArgs);
        //     return this
        // }

        //@ts-expect-error private field
        const v2sBefore = this.txb.v2Scripts;
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
        if (r && !r.redeemer) {
            console.log("activity without redeemer tag: ", r);
            throw new Error(
                `addInput() redeemer must match the isActivity type {redeemer: ‹activity›}\n`
                // JSON.stringify(r, delegateLinkSerializer)
            );
        }

        //@ts-expect-error probing for pubKeyHash
        if (input.address.pubKeyHash) this.neededSigners.push(input.address);
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
        this.txb.attachUplcProgram(...args);

        return this;
    }

    wasModified() {
        //@ts-expect-error private method
        this.txb.wasModified();
    }

    _builtTx?: Tx | Promise<Tx>;
    get builtTx() {
        if (!this._builtTx) {
            return (this._builtTx = this.build().then(({ tx }) => {
                return (this._builtTx = tx);
            }));
        }
        return this._builtTx;
    }

    async addSignature(wallet: Wallet) {
        const builtTx = await this.builtTx;
        const sig = await wallet.signTx(builtTx);

        builtTx.addSignature(sig[0]);
    }

    async findAnySpareUtxos(): Promise<TxInput[] | never> {
        const mightNeedFees = 3_500_000n; // lovelace this.ADA(3.5);

        const toSortInfo = this.uh.mkUtxoSortInfo(mightNeedFees);
        const notReserved =
            this.utxoNotReserved.bind(this) || ((u: TxInput) => u);

        const uh = this.uh;
        return this.wallet.utxos.then((utxos) => {
            const allSpares = utxos
                .filter(notReserved)
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

    async build(
        this: StellarTxnContext<any>,
        {
            signers = [],
            addlTxInfo = {
                description: this.txnName ? ": " + this.txnName : "",
            },
            beforeValidate,
        }: {
            signers?: Address[];
            addlTxInfo?: Pick<TxDescription<any>, "description">;
            beforeValidate?: (tx: Tx) => Promise<any> | any;
        } = {}
    ): Promise<{
        tx: Tx;
        willSign: PubKeyHash[];
        walletMustSign: boolean;
        wallet: Wallet;
        wHelper: WalletHelper<any>;
        costs: {
            total: Cost;
            [key: string]: Cost;
        };
    }> {
        console.timeStamp?.(`submit() txn ${this.txnName}`);
        console.log("tcx build() @top");

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

            const willSign = [...signers, ...this.neededSigners]
                .map((addr) =>
                    addr.era == "Shelley" &&
                    addr.spendingCredential.kind == "PubKeyHash"
                        ? addr.spendingCredential
                        : undefined
                )
                .filter((pkh) => !!pkh)
                .flat(1) as PubKeyHash[];
            console.timeStamp?.(`submit(): addSIgners()`);
            this.txb.addSigners(...willSign);
            const wHelper = wallet && makeWalletHelper(wallet);

            // determine whether we need to request signing from wallet.
            // may involve adding signers to the txn
            if (wallet && wHelper) {
                for (const a of willSign) {
                    if (!(await wHelper.isOwnAddress(a))) continue;
                    walletMustSign = true;
                    break;
                }
                // no fussing if we already know the wallet must sign.
                if (!walletMustSign) {
                    // if any inputs from the wallet were added as part of finalizing,
                    // add the wallet's signature to the txn
                    const inputs = this.txb.inputs;
                    if (!inputs) throw new Error(`no inputs in txn`);
                    for (const input of inputs) {
                        if (!(await wHelper.isOwnAddress(input.address)))
                            continue;
                        this.neededSigners.push(input.address);
                        walletMustSign = true;

                        //@ts-expect-error on type-probe
                        const pubKeyHash = input.address.pubKeyHash;

                        if (pubKeyHash) {
                            this.txb.addSigners(pubKeyHash);
                        }
                        break;
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
            } = { total: { cpu: 0n, mem: 0n } };
            try {
                // the transaction can fail validation without throwing an error
                tx = await this.txb.buildUnsafe({
                    changeAddress,
                    spareUtxos: spares,
                    networkParams: this.networkParams,
                    logOptions: logger,
                    beforeValidate,
                    modifyExBudget: (txi, purpose, index, costs) => {
                        capturedCosts.total.cpu += costs.cpu;
                        capturedCosts.total.mem += costs.mem;
                        if ("minting" == purpose) purpose = "minting ";
                        capturedCosts[`${purpose} @${1 + index}`] = costs;
                        return costs;
                    },
                });
                this.txb.validToTime;
            } catch (e: any) {
                // buildUnsafe shouldn't throw errors.

                logger.logError(`txn build failed: ${e.message}`);
                if (tx!) logger.logPrint(dumpAny(tx!) as string);

                logger.logError(
                    `  (it shouldn't be possible for buildUnsafe to be throwing errors!)`
                );
                logger.flushError();
                console.warn(
                    "^^^^ txn build failed (debugging breakpoint avaialble)"
                );
                debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
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
                const ctxCbor = scriptContext?.toCbor();
                const cborHex = ctxCbor ? bytesToHex(ctxCbor) : "";
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
        return this.submit(options).then(() => {
            if (this.state.addlTxns) {
                return this.submitAddlTxns();
            }
        });
    }

    /**
     * Submits only the current transaction.  
     * @remarks
     * To also submit additional transactions, use the `submitAll()` method.
     */
    async submit(
        this: StellarTxnContext<any>,
        {
            signers = [],
            addlTxInfo = {
                description: this.txnName ? ": " + this.txnName : "",
            },
            expectError,
            beforeError,
            beforeValidate,
        }: SubmitOptions = {}
    ) {
        const { logger } = this;
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
            addlTxInfo,
            beforeValidate,
        });
        const { description } = addlTxInfo;

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
            if (beforeError) {
                await beforeError(tx);
            }
            logger.logError(`FAILED submitting tx: ${description}`);
            logger.logPrint(errMsg);
            if (expectError) {
                logger.logPrint(
                    `\n\n💣🎉 💣🎉 🎉 🎉 transaction failed (as expected)`
                );
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
            debugger;
            throw new Error(errMsg);
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
        if (walletMustSign) {
            console.timeStamp?.(`submit(): wallet.signTx()`);
            const walletSign = wallet.signTx(tx);
            const sigs = await walletSign.catch((e) => {
                logger.logError("signing via wallet failed: " + e.message);
                logger.logPrint(this.dump(tx));
                logger.flushError();
                return null;
            });
            console.timeStamp?.(`submit(): tx.addSignatures()`);
            if (sigs) {
                //! doesn't need to re-verify a sig it just collected
                //   (sig verification is ~2x the cost of signing)
                tx.addSignatures(sigs, false);
            } else {
                throw new Error(`wallet signing failed`);
            }
        }
        logger.logPrint(`tx transcript: ${description}\n`);
        logger.logPrint(this.dump(tx));
        this.emitCostDetails(tx, costs);
        logger.flush();

        console.timeStamp?.(`submit(): to net/wallet`);
        const promises = [
            //@ts-expect-error on non-standard submitTx() in emulator
            this.setup.network.submitTx(tx, logger).catch((e) => {
                if (
                    "currentSlot" in this.setup.network &&
                    e.message.match(/or slot out of range/)
                ) {
                    this.checkTxValidityDetails(tx);
                }
                console.warn(
                    "⚠️  submitting via helios Network failed: ",
                    e.message
                );
                debugger;
                throw e;
            }),
        ];
        if (wallet) {
            if (!this.setup.isTest) {
                // submit via wallet in addition to the network, may allow for faster confirmation
                promises.push(
                    wallet.submitTx(tx).catch((e) => {
                        console.log(
                            "⚠️  submitting via wallet failed: ",
                            e.message
                        );
                        debugger;
                        throw e;
                    })
                );
            }
        }
        const anySuccess = Promise.any(promises);
        try {
            await anySuccess;
        } catch (e: any) {
            logger.logError(
                `submitting tx failed: ${description}: ${e.message}`
            );
            logger.flushError();
        }
        return anySuccess.then((r) => {
            console.timeStamp?.(`submit(): success`);
            logger.logPrint(`\n\n\n🎉🎉 tx submitted: ${description} 🎉🎉`);

            logger.finish();
            return r;
        });
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
        const txFee = Number(tx.calcMinFee(this.networkParams));
        const cpuFee = Number(total.cpu) * exCpuFeePerUnit;
        const memFee = Number(total.mem) * exMemFeePerUnit;
        const sizeFee = txSize * txFeePerByte;

        const nCpu = Number(total.cpu);
        const nMem = Number(total.mem);

        if (nCpu > oMaxCpu || nMem > oMaxMem || txSize > oMaxSize) {
            logger.logPrint(
                "🔥🔥🔥🔥  THIS TX EXCEEDS default (overridden in test env) limits on network params  🔥🔥🔥🔥\n" +
                    `  -- cpu ${nCpu} = ${
                        (100 * nCpu / oMaxCpu ).toFixed(1)
                    }% of ${oMaxCpu} (patched to ${maxTxExCpu})\n` +
                    `  -- mem ${nMem} = ${
                        (100 * nMem / oMaxMem).toFixed(1)
                    }% of ${oMaxMem} (patched to ${maxTxExMem})\n` +
                    `  -- tx size ${txSize} = ${
                        (100 * txSize / oMaxSize).toFixed(1)
                    }% of ${oMaxSize} (patched to ${maxTxSize})\n`
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
            "costs: " +
                `\n  -- scripting costs` +
                `\n    -- cpu units ${total.cpu}` +
                ` = ${lovelaceToAda(cpuFee)}` +
                ` (${(
                    Number((1000n * total.cpu) / BigInt(oMaxCpu)) / 10
                ).toFixed(1)}% of cpu limit/tx)` +
                `\n    -- memory units ${total.mem}` +
                ` = ${lovelaceToAda(memFee)}` +
                ` (${(
                    Number((1000n * total.mem) / BigInt(oMaxMem)) / 10
                ).toFixed(1)}% of mem limit/tx)` +
                scriptBreakdown +
                `\n  -- tx size ${txSize}` +
                ` (${(Number((1000 * txSize) / oMaxSize) / 10).toFixed(
                    1
                )}% of tx size limit)` +
                ` = ${lovelaceToAda(sizeFee)}` +
                `\n  -- fixed fee = ${lovelaceToAda(txFeeFixed)}` +
                `\n  -- remainder ${lovelaceToAda(
                    txFee - cpuFee - memFee - sizeFee - txFeeFixed
                )} is for refScripts/etc`
        );
    }

    get currentSlot() {
        return makeNetworkParamsHelper(this.networkParams).timeToSlot(
            this.setup.network.now
        );
    }
    private checkTxValidityDetails(tx: Tx) {
        const b = tx.body;
        // const db = tx.dump().body;
        function getAttr(x: string) {
            const qq = tx.body[x];
            if (!qq) {
                throw new Error(`no ${x} in tx.body: `);
            }
            return qq;
        }

        const validFrom = getAttr("firstValidSlot");
        const validTo = getAttr("lastValidSlot");

        // vf = 100,  current = 102, vt = 110  =>   FROM now -2, TO now +8; VALID
        // vf = 100,  current = 98,   vt = 110  =>   FROM now +2, TO now +12; FUTURE
        // vf = 100,  current = 100,  vt = 110  =>  FROM now, TO now +10; VALID
        // vf = 100, current = 120, vt = 110  =>  FROM now -20, TO now -10; PAST
        debugger;
        const { currentSlot } = this;
        const diff1 = validFrom - currentSlot;
        const diff2 = validTo - currentSlot;
        const disp1 =
            diff1 > 0
                ? `NOT VALID for +${diff1}s`
                : `${diff2 > 0 ? "starting" : "was valid"} ${diff1}s ago`;
        const disp2 =
            diff2 > 0
                ? `${diff1 > 0 ? "would be " : ""}VALID until now +${diff2}s`
                : `EXPIRED ${0 - diff2}s ago`;

        console.log(
            `  ⚠️  slot validity issue?\n` +
                `    - validFrom: ${validFrom} - ${disp1}\n` +
                `    - validTo: ${validTo} - ${disp2}\n` +
                `    - current: ${currentSlot}\n`
        );
    }

    /**
     * Executes additional transactions indicated by an existing transaction
     * @remarks
     *
     * During the off-chain txn-creation process, additional transactions may be
     * queued for execution.  This method is used to execute those transactions,
     * along with any chained transactions they may trigger.
     * @param tcx - the prior txn context having the additional txns to execute
     * @param callback - an optional async callback that you can use to notify a user, or to log the results of the additional txns
     * @public
     **/
    async submitAddlTxns(
        this: hasAddlTxns<any, any>,
        callbacks?: {
            beforeSubmit?: MultiTxnCallback;
            onSubmitted?: MultiTxnCallback;
        }
    ) {
        const { addlTxns } = this.state;
        if (!addlTxns) return;

        // return this.submitTxns(Object.values(addlTxns), callback);
        return this.submitTxnChain({
            ...callbacks,
            txns: Object.values(addlTxns),
        });
    }

    /**
     * Submits a list of transactions, without executing any chained/nested txns.
     * @remarks
     * use submitTxnChain() to submit a list of txns with chaining
     */
    async submitTxns(txns: TxDescription<any>[], callbacks?: SubmitCallbacks) {
        for (const [txName, addlTxInfo] of Object.entries(txns) as [
            string,
            TxDescription<any>
        ][]) {
            const { txName, description } = addlTxInfo;
            console.log("  -- before: " + description);
            const tcx = (
                "function" == typeof addlTxInfo.tcx
                    ? await addlTxInfo.tcx()
                    : addlTxInfo.tcx
            ) as StellarTxnContext;
            if ("undefined" == typeof tcx) {
                throw new Error(`no txn provided for addlTx ${txName}`);
            }
            addlTxInfo.tcx = tcx;
            // if (callback) {
            //     console.log("   -- submitTxns: callback", {
            //         txName,
            //         description,
            //         callback,
            //     });
            // }
            const replacementTcx =
                (callbacks?.beforeSubmit &&
                    ((await callbacks.beforeSubmit({
                        ...addlTxInfo,
                        tcx,
                    })) as typeof replacementTcx | boolean)) ||
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
            if (!effectiveTcx) debugger;
            await effectiveTcx.submit({
                addlTxInfo, // just for its description.
            });
            // console.log("   -- submitTxns: <- txn: ", txName, description);
            if (callbacks?.onSubmitted) {
                // console.log("   -- submitTxns: triggering onSubmit callback");
                await callbacks.onSubmitted(addlTxInfo);
                // console.log("   -- submitTxns: onSubmitted callback completed");
            }
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
            txns?: TxDescription<any>[];
        } & SubmitCallbacks = {
            //@ts-expect-error because the type of this context doesn't
            //   guarantee the presence of addlTxns.  But it might be there!
            txns: this.state.addlTxns || [],
        }
    ) {
        //@ts-expect-error on probing for a maybe-undefined entry:
        const addlTxns = this.state.addlTxns;

        const newTxns: TxDescription<any>[] = options.txns || addlTxns || [];
        let chainedTxns: TxDescription<any>[] = [];
        const hookedCallbacks: SubmitCallbacks = {
            // txns,  // see newTxns
            beforeSubmit: (txinfo) => {
                //@ts-expect-error triggering the test-network-emulator's tick
                //   ... in regular execution environment, this is a no-op by default
                this.setup.network.tick?.(1);
                options.beforeSubmit?.(txinfo);
            },
            onSubmitted: (txinfo) => {
                const more: Record<string, TxDescription<any>> = txinfo.tcx
                    ?.state?.addlTxns || {};
                console.log("  ✅ " + txinfo.description);
                const moreTxns = Object.values(more);
                if (moreTxns.length) {
                    chainedTxns.push(...moreTxns);
                    console.log(
                        " + chained txns: \n" +
                            moreTxns
                                .map((t) => `   🟩 ${t.description}\n`)
                                .join("")
                    );
                }
                //@ts-expect-error triggering the test-network-emulator's tick
                //   ... in regular execution environment, this is a no-op by default
                this.setup.network.tick?.(1);
            },
        };

        let chainDepth = 0;
        const isolatedTcx = new StellarTxnContext(this.setup);
        console.log(
            "at d=0: submitting addl txns: \n" +
                newTxns.map((t) => `  🟩 ${t.description}\n`).join("")
        );

        const t = isolatedTcx.submitTxns(newTxns, hookedCallbacks);

        const allPromises = [] as Promise<any>[];
        chainDepth = 1;
        allPromises.push(t);

        await t;
        while (chainedTxns.length) {
            const nextChain: typeof chainedTxns = [];
            chainDepth++;

            for (const { tcx } of chainedTxns) {
                const { addlTxns: nestedAddlTxns } = (tcx.state || {}) as {
                    addlTxns?: Record<string, TxDescription<any>>;
                };
                if (!nestedAddlTxns) continue;
                nextChain.push(...Object.values(nestedAddlTxns));
            }
            console.log(
                " 🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞\n" +
                    `submitting ${chainedTxns.length} transactions at depth ${chainDepth}`
            );
            console.log(
                chainedTxns.map((t) => `  🟩 ${t.description}\n`).join("")
            );
            const t = isolatedTcx.submitTxns(chainedTxns, hookedCallbacks);
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
