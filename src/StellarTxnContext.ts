import {
    Tx,
    TxOutput,
    TxInput,
    WalletHelper,
    Signature,
    PubKeyHash,
} from "@hyperionbt/helios";
import {
    TxBuilder,
    type Address,
    type NetworkParams,
    type Wallet,
} from "@hyperionbt/helios";

import { dumpAny, txAsString } from "./diagnostics.js";
import type { hasUutContext } from "./Capo.js";
import { UutName, type SeedAttrs } from "./delegation/UutName.js";
import type { ActorContext, SetupDetails, isActivity } from "./StellarContract.js";
import { delegateLinkSerializer } from "./delegation/delegateLinkSerializer.js";
import {
    UtxoHelper
} from "./UtxoHelper.js";
import type { UplcData } from "@helios-lang/uplc";

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export type hasSeedUtxo = StellarTxnContext<
    anyState & {
        seedUtxo: TxInput;
    }
>;

export type TxDescription<T extends StellarTxnContext> = {
    tcx: T | (() => T) | (() => Promise<T>);

    description: string;
    moreInfo: string;
    optional: boolean;
    txName?: string;
};

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
 * The future transactions can be executed using the {@link StellarContract.submitAddlTxns}
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

type addInputArgs = Parameters<TxBuilder["spend"]>;
type addRefInputArgs = Parameters<TxBuilder["addRefInput"]>;
type addRefInputsArgs = Parameters<TxBuilder["addRefInput"]>;

type RedeemerArg = {
    redeemer?: UplcData
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
    actorContext: ActorContext<any>;
    neededSigners: Address[] = [];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[] = [];
    networkParams: NetworkParams;
    setup: SetupDetails;
    txb: TxBuilder;
    txnName: string = "";
    withName(name: string) {
        this.txnName = name;
        return this;
    }

    get wallet() {
        return this.setup.actorContext.wallet!
    }

    get uh() {
        return this.setup.uh;
    }

    constructor(
        setup: SetupDetails,
        state: Partial<S> = {},
        parentTcx?: StellarTxnContext<any>
    ) {
        this.actorContext = setup.actorContext;
        this.networkParams = setup.networkParams;
        this.parentTcx = parentTcx;
        this.setup = setup;
        this.txb = new TxBuilder({
            isMainnet: this.setup.isMainnet || false,
        });
        const { uuts = { ...emptyUuts }, ...moreState } = state;
        //@ts-expect-error
        this.state = {
            uuts,
            ...moreState,
        };
    }
    get actorWallet() {
        return this.actorContext.wallet;
    }

    async dump() {
        const { txb } = this;
        return txAsString(
            await txb.build({
                changeAddress: this.actorContext.wallet?.address,
                networkParams: this.networkParams,
            }),
            this.setup.networkParams
        );
    }

    includeAddlTxn<
        TCX extends StellarTxnContext<anyState>,
        RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any>
            ? TCX
            : hasAddlTxns<TCX>
    >(this: TCX, txnName: string, txInfo: TxDescription<any>): RETURNS {
        const thisWithMoreType: RETURNS = this as any;
        thisWithMoreType.state.addlTxns = {
            ...(thisWithMoreType.state.addlTxns || {}),
            [txnName]: txInfo,
        };
        return thisWithMoreType;
    }

    mintTokens(...args: Parameters<TxBuilder["mint"]>): StellarTxnContext<S> {
        if (this.txb.mint) {
            this.txb.mint(...args);
        } else {
            //@ts-expect-error
            this.txb.mintTokens(...args);
        }

        return this;
    }

    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs {
        const { seedUtxo } = this.state;
        const { txId, utxoIdx: seedIndex } = seedUtxo.id;
        return { txId, idx: BigInt(seedIndex) };
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
            idx: BigInt(seedUtxo.id.utxoIdx),
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
     * Use the test helper's `submitTxnWithBlock(txn, otherTime)` or `advanceNetworkTimeForTx()` methods, or args to
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
     * @param {bigint} slot Slot number
     * @returns {bigint} Time in milliseconds since 01/01/1970
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
     * Calculates the slot number associated with a given time. Time is specified as milliseconds since 01/01/1970.
     * @param {bigint} time Milliseconds since 1970
     * @returns {bigint} Slot number
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
     * @remarks if futureDate() has been set on the transaction, that date will be used as the starting point for the validity period
     *
     * @param durationMs the total validity duration for the transaction.  On-chain checks using CapoCtx `now(granularity)` can enforce this duration
     * @param backwardMs a look-back interval allowing the transaction to be included in a very recent slot
     *
     * @returns
     */
    validFor<TCX extends StellarTxnContext<S>>(
        this: TCX,
        durationMs: number
        // backwardMs = 1 * 60 * 1000 // allow it to be up to ~3 blocks / 1 minute old by default
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
        const [input, ...moreArgs] = inputArgs;
        if (this.txRefInputs.find((v) => v.id.isEqual(input.id))) {
            console.warn("suppressing second add of refInput");
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
        //@ts-expect-error private field
        const v3sBefore = this.txb.v3Scripts;
        this.txb.refer(input);
        //@ts-expect-error private field
        const v2sAfter = this.txb.v2Scripts;
        //@ts-expect-error private field
        const v3sAfter = this.txb.v3Scripts;

        // const t2 = this.txb.witnesses.scripts.length;
        // if (t2 > t) {
        if (
            v2sAfter.length > v2sBefore.length ||
            v3sAfter.length > v3sBefore.length
        ) {
            console.log("       --- addRefInput added a script to tx.scripts");
        }

        return this;
    }

    /**
     * @deprecated - use addRefInput() instead.
     */
    addRefInputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        ...args: addRefInputsArgs
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
                `addInput() redeemer must match the isActivity type {redeemer: ‹activity›}\n` +
                    JSON.stringify(r, delegateLinkSerializer)
            );
        }

        if (input.address.pubKeyHash) this.neededSigners.push(input.address);
        this.inputs.push(input);
        if (this.parentTcx) {
            this.parentTcx.childReservedUtxos.push(input);
        }
        try {
            this.txb.spendUnsafe(input, r?.redeemer);
        } catch (e: any) {
            console.log("failed adding input to txn: ", dumpAny(this));

            throw new Error(
                `addInput: ${e.message}` +
                    "\n   ...see partial txn above.  Failed TxInput:\n" +
                    dumpAny(input)
            );
        }

        return this;
    }

    XXXaddInputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        inputs: Parameters<TxBuilder["spend"]>[0] & Array<any>,
        r: RedeemerArg
    ): TCX {
        if (r && !r.redeemer) {
            console.log("activity without redeemer tag: ", r);
            throw new Error(
                `addInputs() redeemer must match the isActivity type {redeemer: ‹activity›}\n` +
                    JSON.stringify(r, delegateLinkSerializer)
            );
        }
        for (const input of inputs) {
            if (input.address.pubKeyHash)
                this.neededSigners.push(input.address);
        }
        this.inputs.push(...inputs);
        if (this.parentTcx) {
            this.parentTcx.childReservedUtxos.push(...inputs);
        }
        this.txb.spend(inputs, r.redeemer);

        return this;
    }

    addOutput<TCX extends StellarTxnContext<S>>(
        this: TCX,
        output: TxOutput
    ): TCX {
        this.outputs.push(output);
        try {
            this.txb.payUnsafe(output);
            //output);
        } catch (e: any) {
            console.log("failed adding output to txn: ", dumpAny(this));
            throw new Error(
                `addOutput: ${e.message}` +
                    "\n   ...see partial txn above.  Failed TxOutput:\n" +
                    dumpAny(output)
            );
        }

        return this;
    }

    addOutputs<TCX extends StellarTxnContext<S>>(
        this: TCX,
        outputs: TxOutput[]
    ): TCX {
        this.outputs.push(...outputs);
        this.txb.payUnsafe(outputs);

        return this;
    }

    attachScript(...args: Parameters<TxBuilder["attachUplcProgram"]>) {
        throw new Error(
            `use addScriptProgram(), increasing the txn size, if you don't have a referenceScript.\n` +
                `Use <capo>.txnAttachScriptOrRefScript() to use a referenceScript when available.`
        );
    }

    addScriptProgram(...args: Parameters<TxBuilder["attachUplcProgram"]>) {
        this.txb.attachUplcProgram(...args);

        return this;
    }
    clearBuiltTx() {
        this._btx = undefined;
    }
    _btx?: Tx | Promise<Tx>;
    get builtTx() {
        if (!this._btx) {
            return (this._btx = this.buildTx().then((tx) => {
                this._btx = tx;
                return tx;
            }));
        }
        return this._btx;
    }

    async buildTx() {
        const { wallet } = this.setup.actorContext;
        const wHelper = wallet && new WalletHelper(wallet);

        return this.txb.build({
            changeAddress:
                ((await wallet?.unusedAddresses) || [])[0] ||
                ((await wallet?.usedAddresses) || [])[0],
            spareUtxos: await this.findAnySpareUtxos(),
            networkParams: this.networkParams,
        });
    }

    async addSignature(wallet: Wallet) {
        const builtTx = (await this.builtTx) as Tx;
        const [sig] = await wallet.signTx(builtTx);

        builtTx.addSignature(sig);
    }

    async findAnySpareUtxos(): Promise<TxInput[] | never> {
        const mightNeedFees = 3_500_000n; // lovelace this.ADA(3.5);

        const toSortInfo = this.uh.mkUtxoSortInfo(mightNeedFees);
        const notReserved =
            this.utxoNotReserved.bind(this) || ((u: TxInput) => u);

        const { uh } = this;
        return this.wallet.utxos.then((utxos) => {
            const allSpares = utxos
                .filter(notReserved)
                .map(toSortInfo)
                .filter(uh.utxoIsSufficient)
                .sort(uh.utxoSortSmallerAndPureADA);

            if (allSpares.reduce(uh.reduceUtxosCountAdaOnly, 0) > 0) {
                return allSpares.filter(uh.utxoIsPureADA).map(uh.sortInfoBackToUtxo);
            }
            return allSpares.map(uh.sortInfoBackToUtxo);
        });
    }

    async findChangeAddr(): Promise<Address> {
        const {
            actorContext: { wallet },
        } = this;
        if (!wallet) {
            throw new Error(
                `⚠️ ${this.constructor.name}: no this.actorContext.wallet; can't get required change address!`
            );
        }
        let unused = (await wallet.unusedAddresses).at(0);
        if (!unused) unused = (await wallet.usedAddresses).at(-1);
        if (!unused)
            throw new Error(
                `⚠️ ${this.constructor.name}: can't find a good change address!`
            );
        return unused;
    }

    async submit(
        this: StellarTxnContext<any>,
        {
            signers = [],
            addlTxInfo = {
                description: this.txnName || "(unnamed)",
            },
        }: {
            signers?: Address[];
            addlTxInfo?: Pick<TxDescription<any>, "description">;
        } = {}
    ) {
        let { txb } = this;
        const {
            actorContext: { wallet },
        } = this;

        let walletMustSign = false;
        let sigs: Signature[] | null = [];
        let tx: Tx;
        if (wallet || signers.length) {
            const changeAddress = await this.findChangeAddr();

            const spares = await this.findAnySpareUtxos();

            const willSign = [...signers, ...this.neededSigners]
                .map((addr) => addr.pubKeyHash)
                .flat(1) as PubKeyHash[];
            txb.addSigners(...willSign);
            const wHelper = wallet && new WalletHelper(wallet);
            // if (false)  { if (wallet && wHelper) {
            //     //@ts-expect-error on internal isSmart()
            //     if (tx.isSmart() && !tcx.collateral) {
            //         let [c] = await wallet.collateral;
            //         if (!c) {
            //             c = await wHelper.pickCollateral(this.ADA(5n));
            //             if (c.value.lovelace > this.ADA(20n))
            //                 throw new Error(
            //                     `The only collateral-eligible utxos in this wallet have more than 20 ADA.  It's recommended to create and maintain collateral values between 2 and 20 ADA (or 5 and 20, for more complex txns)`
            //                 );
            //         }
            //         tcx.addCollateral(c); // adds it also to the tx.
            //     }
            // } }
            // if (sign && this.wallet) {
            //     willSign.push(this.wallet);
            // }

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
                    //@ts-expect-error on internal prop
                    const inputs = txb.inputs as TxInput[];
                    if (!inputs) throw new Error(`no inputs in txn`);
                    for (const input of inputs) {
                        if (!(await wHelper.isOwnAddress(input.address)))
                            continue;
                        this.neededSigners.push(input.address);
                        walletMustSign = true;
                        txb.addSigners(input.address.pubKeyHash!);
                        break;
                    }
                }
            }

            tx = await txb.build({
                changeAddress,
                spareUtxos: spares,
                networkParams: this.networkParams,
            });
            for (const pkh of willSign) {
                if (!pkh) continue;
                if (tx.body.signers.find((s) => pkh.isEqual(s))) continue;
                throw new Error(
                    `incontheeivable! all signers should have been added to the builder above`
                );
                // tx.addSigner(pkh);
            }

            // const feeEstimated = tx.estimateFee(this.networkParams);
            // if (feeEstimated > feeLimit) {
            //     console.log("outrageous fee - adjust tcx.feeLimit to get a different threshold")
            //     throw new Error(`outrageous fee-computation found - check txn setup for correctness`)
            // }
            try {
                tx.validate(this.networkParams);
                // const elapsed = t2 - t1;
                // console.log(
                //     // stopwatch emoji: ⏱
                //     `          :::::::::: ⏱ tx validation time: ${elapsed}ms ⏱`
                // );
                // result: validations for non-trivial txns can take ~800+ ms
                //  - validations with simplify:true, ~250ms - but ...
                //    ... with elided error messages that don't support negative-testing very well
            } catch (e: any) {
                if (
                    e.message.match(
                        /multi:Minting: only dgData activities ok in mintDgt/
                    )
                ) {
                    console.log(
                        `⚠️⚠️⚠️ mint delegate for multiple activities should be given delegated-data activities, not the activities of the delegate`
                    );
                }

                // todo: find a way to run the same scripts again, with tracing retained
                // for client-facing transparency of failures that can be escalated in a meaningful
                // way to users.
                console.log(
                    `FAILED submitting tx: ${addlTxInfo.description}:`,
                    this.dump()
                );
                debugger;
                throw e;
            }
        } else {
            throw new Error("no 'actorContext.wallet'; not making a txn");
        }
        if (walletMustSign) {
            const walletSign = wallet.signTx(txb);
            sigs = await walletSign.catch((e) => {
                console.warn(
                    "signing via wallet failed: " + e.message,
                    this.dump()
                );
                return null;
            });
            //! doesn't need to re-verify a sig it just collected
            //   (sig verification is ~2x the cost of signing)
            if (sigs) {
                tx.addSignatures(sigs, false);
            } else {
                throw new Error(`wallet signing failed`);
            }
        }
        console.log(
            `Submitting tx: ${addlTxInfo.description}: `,
            this.dump()
        );

        const promises = [
            this.setup.network.submitTx(tx).catch((e) => {
                if (
                    "currentSlot" in this.setup.network &&
                    e.message.match(/or slot out of range/)
                ) {
                    const b = tx.body;
                    const db = tx.dump().body;
                    function getAttr(x: string) {
                        return tx.body[x] || db[x];
                    }

                    const validFrom = getAttr("firstValidSlot");
                    const validTo = getAttr("lastValidSlot");

                    // vf = 100,  current = 102, vt = 110  =>   FROM now -2, TO now +8; VALID
                    // vf = 100,  current = 98,   vt = 110  =>   FROM now +2, TO now +12; FUTURE
                    // vf = 100,  current = 100,  vt = 110  =>  FROM now, TO now +10; VALID
                    // vf = 100, current = 120, vt = 110  =>  FROM now -20, TO now -10; PAST

                    const currentSlot = this.setup.network.currentSlot as bigint;
                    const diff1 = validFrom - currentSlot;
                    const diff2 = validTo - currentSlot;
                    const disp1 =
                        diff1 > 0
                            ? `NOT VALID for +${diff1}s`
                            : `${
                                  diff2 > 0 ? "starting" : "was valid"
                              } ${diff1}s ago`;
                    const disp2 =
                        diff2 > 0
                            ? `${
                                  diff1 > 0 ? "would be " : ""
                              }VALID until now +${diff2}s`
                            : `EXPIRED ${0n - diff2}s ago`;

                    console.log(
                        `  ⚠️ slot validity issue?\n` +
                            `    - validFrom: ${validFrom} - ${disp1}\n` +
                            `    - validTo: ${validTo} - ${disp2}\n` +
                            `    - current: ${currentSlot}\n`
                    );
                }
                console.warn(
                    "⚠️⚠️⚠️ submitting via helios Network failed: ",
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
                    wallet.submitTx(txb).catch((e) => {
                        console.log(
                            "⚠️⚠️⚠️ submitting via wallet failed: ",
                            e.message
                        );
                        debugger;
                        throw e;
                    })
                );
            }
        }
        return Promise.any(promises).then((r) => {
            console.log(`   🎉🎉  ^^^ success: ${addlTxInfo.description} 🎉🎉`);
            return r;
        });
    }

    /**
     * Executes additional transactions indicated by an existing transaction
     * @remarks
     *
     * During the off-chain txn-creation process, additional transactions may be
     * queued for execution.  This method is used to execute those transactions.
     * @param tcx - the prior txn context having the additional txns to execute
     * @param callback - an optional async callback that you can use to notify a user, or to log the results of the additional txns
     * @public
     **/
    async submitAddlTxns(
        tcx: hasAddlTxns<any, any>,
        callback?: MultiTxnCallback
    ) {
        const { addlTxns } = tcx.state;
        return this.submitTxns(Object.values(addlTxns), callback);
    }

    async submitTxns(
        txns: TxDescription<any>[],
        callback?: MultiTxnCallback,
        onSubmitted?: MultiTxnCallback
    ) {
        for (const [txName, addlTxInfo] of Object.entries(txns) as [
            string,
            TxDescription<any>
        ][]) {
            const tcx = (
                "function" == typeof addlTxInfo.tcx
                    ? await addlTxInfo.tcx()
                    : addlTxInfo.tcx
            ) as StellarTxnContext;
            const { txName, description } = addlTxInfo;
            // if (callback) {
            //     console.log("   -- submitTxns: callback", {
            //         txName,
            //         description,
            //         callback,
            //     });
            // }
            const replacementTcx =
                (callback &&
                    ((await callback({
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
            const effectiveTcx =
                true === replacementTcx ? this : replacementTcx || this;
            await effectiveTcx.submit({
                addlTxInfo, // just for its description.
            });
            if (onSubmitted) {
                console.log(
                    "   -- submitTxns: triggering onSubmitted callback"
                );
                await onSubmitted(addlTxInfo);
                console.log("   -- submitTxns: onSubmitted callback completed");
            }
        }
    }
    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use attachScript
     **/
    addScript() {}
}
