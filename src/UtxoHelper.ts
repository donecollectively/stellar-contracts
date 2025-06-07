import { equalsBytes, type BytesLike } from "@helios-lang/codec-utils";
import {
    selectLargestFirst,
    type SimpleWallet,
    type Wallet,
} from "@helios-lang/tx-utils";
import {
    type Address,
    type AssetClass,
    type Assets,
    type MintingPolicyHash,
    type TxInput,
    type TxOutput,
    type Value,
    type NetworkParams,
    makeTxOutput,
    makeValue,
    makeAssetClass,
    makeAddress,
    makeDummyAddress,
    type ScriptHash,
} from "@helios-lang/ledger";

import { StellarTxnContext } from "./StellarTxnContext.js";
// import type { SimpleWallet_stellar } from "./testing/StellarNetworkEmulator.js";
import { dumpAny, utxosAsString } from "./diagnostics.js";
import { UutName } from "./delegation/UutName.js";
import type { SetupInfo, StellarContract } from "./StellarContract.js";
import { textToBytes } from "./HeliosPromotedTypes.js";

export type utxoSortInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

export type canHaveToken = TxInput | TxOutput | Assets;
export type tokenPredicate<tokenBearer extends canHaveToken> = ((
    something: tokenBearer
) => tokenBearer | undefined) & { predicateValue: Value };

/**
 * a function that can filter txInputs for coin-selection
 * @remarks
 *
 * short form: "returns truthy" if the input is matchy for the context
 * @public
 **/
export type utxoPredicate = (
    | ((u: TxInput) => TxInput | undefined)
    | ((u: TxInput) => boolean)
    | ((u: TxInput) => boolean | undefined)
) & {
    predicateValue?: Value;
};

export type UtxoSearchScope = {
    /**
     * provides pre-resolved utxos for the indicated address-or-wallet
     */
    utxos?: TxInput[];
    /**
     * searches in a specific address (e.g. a smart contract address)
     */
    address?: Address;
    /**
     * searches in this wallet rather than the address
     */
    wallet?: Wallet | SimpleWallet; //| SimpleWallet_stellar;
    /**
     * @deprecated - ??? use txBatcher's chainBuilder and includeAddlTxns instead
     * NOTE: if we're only using this to reference our OWN tcx, then
     *   either make that automatic, or retract the deprecation.
     */
    exceptInTcx?: StellarTxnContext;
    /**
     * by default it, only dumps detail if global.utxoDump is set to true
     * @remarks
     * - use "onFail" to log candidate utxos if the search fails
     * - use "always" to log candidate utxos for a single search,
     *   regardless of success or failure
     */
    dumpDetail?: "onFail" | "always";
    // utxos : TxInput[]
};

export type UtxoSearchScopeWithUtxos = UtxoSearchScope & {
    utxos: TxInput[];
    required?: true;
};

type CoinSelector = (utxos: TxInput[], amount: Value) => [TxInput[], TxInput[]];

/**
 * A helper class for managing UTXOs in a Stellar contract
 * @remarks
 * Using the provided setup details, this helper provides methods for finding,
 * filtering and selecting UTXOs for inclusion in transactions, and for creating
 * related values and predicate-functions for matching UTXOs.
 * @public
 */
export class UtxoHelper {
    strella?: StellarContract<any>;
    setup: SetupInfo;

    constructor(setup: SetupInfo, strella?: StellarContract<any>) {
        this.setup = setup;
        // console.log("UtxoHelper created with setup: ", setup);
        if (!setup.uxtoDisplayCache) {
            setup.uxtoDisplayCache = new Map();
        }
        this.strella = strella;
    }

    get networkParams(): NetworkParams {
        return this.setup.networkParams;
    }

    get wallet() {
        return this.setup.actorContext.wallet!;
    }

    get network() {
        return this.setup.chainBuilder || this.setup.network;
    }

    /**
     * Filters out utxos having non-ada tokens
     * @internal
     */
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput) {
        const toSortInfo = this.mkUtxoSortInfo(value.lovelace);

        const found = [u]
            .map(toSortInfo)
            .filter(this.utxoIsSufficient)
            .filter(this.utxoIsPureADA)
            .map(this.sortInfoBackToUtxo)
            .at(0);

        return found;
    }

    /**
     * Sorts utxos by size, with pure-ADA utxos preferred over others.
     * @internal
     */
    utxoSortSmallerAndPureADA(
        { free: free1, minAdaAmount: r1 }: utxoSortInfo,
        { free: free2, minAdaAmount: r2 }: utxoSortInfo
    ) {
        {
            //! primary: treats pure-ada utxos as always better
            if (!r1 && r2) {
                return -1;
            }
            if (r1 && !r2) {
                return 1; //
            }
        }
        //! secondary: smaller utxos are more preferred than larger ones
        if (free2 > free1) return -1;
        if (free2 < free1) return 1;
        return 0;
    }

    /**
     * Filters out utxos that are not sufficient to cover the minimum ADA amount established in
     * the utxo sort info in {@link UtxoHelper.mkUtxoSortInfo | mkUtxoSortInfo(min, max?)}.  Use in a filter() call.
     * @internal
     */
    utxoIsSufficient({ sufficient }: utxoSortInfo) {
        return !!sufficient;
    }

    /**
     * Filters out utxos that have non-ADA tokens, given a utxo sort info object.  Use in a filter() call.
     * @internal
     */
    utxoIsPureADA({ u }: utxoSortInfo) {
        return u.value.assets.isZero() ? u : undefined;
    }

    /**
     * transforms utxo sort info back to just the utxo.
     * @internal
     */
    sortInfoBackToUtxo({ u }: utxoSortInfo) {
        return u;
    }

    /**
     * Creates a function that creates sort-info details for a utxo, given a minimum ADA amount
     * and an optional maximum ADA amount.
     * @internal
     **/
    mkUtxoSortInfo(min: bigint, max?: bigint) {
        return (u: TxInput): utxoSortInfo => {
            const minAdaAmount = u.value.assets.isZero()
                ? BigInt(0)
                : (() => {
                      const dummy = makeTxOutput(
                          u.output.address,
                          makeValue(0, u.output.value.assets)
                      );
                      dummy.correctLovelace(this.networkParams);
                      return dummy.value.lovelace;
                  })();
            const free = u.value.lovelace - minAdaAmount;
            const sufficient = free > min && (max ? free < max : true);
            const t = { u, sufficient, free, minAdaAmount };
            // console.log(t, utxoAsString(u))
            return t;
        };
    }
    /**
     * accumulates the count of utxos, but only if the utxo is ADA-only.  Use in a reduce() call.
     **/
    reduceUtxosCountAdaOnly(c: number, { minAdaAmount }: utxoSortInfo): number {
        return c + (minAdaAmount ? 0 : 1);
    }

    hasToken<tokenBearer extends canHaveToken>(
        something: tokenBearer,
        value: Value,
        tokenName?: string,
        quantity?: bigint
    ): tokenBearer | undefined {
        if (something.kind == "TxOutput")
            return (
                (this.outputHasToken(
                    something as TxOutput,
                    value,
                    tokenName,
                    quantity
                ) &&
                    something) ||
                undefined
            );

        if (something.kind == "TxInput")
            return (
                (this.utxoHasToken(
                    something as TxInput,
                    value,
                    tokenName,
                    quantity
                ) &&
                    something) ||
                undefined
            );

        if (something.kind == "Assets")
            return (
                (this.assetsHasToken(
                    something as Assets,
                    value,
                    tokenName,
                    quantity
                ) &&
                    something) ||
                undefined
            );

        throw new Error("unexpected");
        // //!!! todo: more explicit match for TxInput, which seems to be a type but not an 'instanceof'-testable thing.
        // return (
        //     (this.inputHasToken(something, value, tokenName, quantity) &&
        //         something) ||
        //     undefined
        // );
    }

    utxoHasToken(
        u: TxInput,
        value: Value,
        tokenName?: string,
        quantity?: bigint
    ) {
        return this.outputHasToken(u.output, value, tokenName, quantity) && u;
    }

    inputHasToken(
        i: TxInput,
        value: Value,
        tokenName?: string,
        quantity?: bigint
    ) {
        return this.outputHasToken(i.output, value, tokenName, quantity) && i;
    }

    assetsHasToken(
        a: Assets,
        vOrMph: Value | MintingPolicyHash,
        tokenName?: string,
        quantity?: bigint
    ) {
        const v =
            vOrMph.kind == "MintingPolicyHash"
                ? this.mkAssetValue(vOrMph, tokenName!, quantity!)
                : vOrMph;

        return a.isGreaterOrEqual(v.assets);
    }

    outputHasToken(
        o: TxOutput,
        vOrMph: Value | MintingPolicyHash,
        tokenName?: string,
        quantity?: bigint
    ) {
        const isValue = vOrMph.kind == "Value";
        if (!isValue) {
            if (!tokenName || !quantity) {
                throw new Error(
                    `missing required tokenName/quantity (or use a Value in arg2`
                );
            }
        }

        const v = isValue ? vOrMph : makeValue(vOrMph, tokenName!, quantity!);

        return o.value.isGreaterOrEqual(v);
    }

    /**
     * @deprecated - use helios `makeValue()` instead
     */
    mkAssetValue(
        mph: MintingPolicyHash,
        tokenName: BytesLike,
        count: bigint = 1n
    ) {
        // const TL  = [ tokenName, count ] as [ ByteArrayLike, bigint ];
        // const oneAssetLike = [ mph, [
        //     TL
        //  ] ] as [ MintingPolicyHash, [ ByteArrayLike, bigint ][] ];
        //  const v1 = new Value(undefined, [
        //     oneAssetLike
        // ]);
        // const v2 = new Value(undefined, [
        //     [ mph, [ TL ] ]
        // ]);
        const v = makeValue(
            mph,
            tokenName,
            count
            // ...other mph / token-map pairs
        );
        return v;
    }

    findSmallestUnusedUtxo(
        lovelace: bigint,
        utxos: TxInput[],
        tcx?: StellarTxnContext
    ): TxInput | undefined {
        const value = makeValue(lovelace);
        const toSortInfo = this.mkUtxoSortInfo(value.lovelace);

        const found = utxos
            .map(toSortInfo)
            .filter(this.utxoIsPureADA)
            .filter(this.utxoIsSufficient)
            .filter((uInfo: utxoSortInfo) => {
                if (!tcx) return true;
                return !!tcx?.utxoNotReserved(uInfo.u);
            })
            .sort(this.utxoSortSmallerAndPureADA)
            .map(this.sortInfoBackToUtxo);
        console.log("smallest utxos: ", utxosAsString(found));
        const chosen = found.at(0);

        return chosen;
    }

    /**
     * creates a filtering function, currently for TxInput-filtering only.
     * with the optional tcx argument, utxo's already reserved
     *  ... in that transaction context will be skipped.
     * @public
     */
    mkValuePredicate(
        lovelace: bigint,
        tcx?: StellarTxnContext
    ): tokenPredicate<TxInput> {
        const value = makeValue(lovelace);
        const predicate = _adaPredicate.bind(this, tcx) as tokenPredicate<any>;
        predicate.predicateValue = value;
        return predicate;

        function _adaPredicate(
            this: UtxoHelper,
            tcx: StellarTxnContext | undefined,
            utxo: TxInput
        ): TxInput | undefined {
            return this.hasOnlyAda(value, tcx, utxo);
        }
    }

    mkRefScriptPredicate(expectedScriptHash: number[]): utxoPredicate {
        return (txin: TxInput) => {
            const refScript = txin.output.refScript;
            if (!refScript) return false;

            const foundHash = refScript.hash();
            return equalsBytes(foundHash, expectedScriptHash);
        };
    }

    /**
     * Creates an asset class for the given token name, for the indicated minting policy
     */
    acAuthorityToken(
        tokenName: string | number[],
        mph?: MintingPolicyHash
    ): AssetClass {
        let ourMph = mph;
        if (!ourMph) {
            if (!this.strella) {
                throw new Error(
                    `no contract available for resolving minting policy hash; provide to acAuthorityToken or use a UtxoHelper having a strella prop`
                );
            }
            ourMph = this.strella.mintingPolicyHash;
        }
        if (!ourMph) {
            throw new Error(`no minting policy hash available`);
        }
        return makeAssetClass(ourMph, tokenName);
    }

    /**
     * Creates a Value object representing a token with a minimum lovelace amount
     * making it valid for output in a utxo.
     * @public
     */
    mkMinTv(
        mph: MintingPolicyHash,
        tokenName: string | UutName | number[],
        count: bigint = 1n
    ) {
        const tnBytes = Array.isArray(tokenName)
            ? tokenName
            : textToBytes(tokenName.toString());

        return this.mkMinAssetValue(mph, tnBytes, count);
    }

    mkMinAssetValue(
        mph: MintingPolicyHash,
        tokenName: BytesLike,
        count: bigint = 1n
    ) {
        const v = makeValue(mph, tokenName, count);
        // uses a dummy address so it can be used even during bootstrap
        const dummyAddr = makeDummyAddress(false);
        const txo = makeTxOutput(dummyAddr, v);
        txo.correctLovelace(this.networkParams);
        return txo.value;
    }

    tokenAsValue(
        tokenName: string | number[] | UutName,
        count: bigint = 1n
    ): Value {
        throw new Error(`only implemented by Capo`);
    }

    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant takes just a token-name / quantity, working only on Capo instances,
     * and seeks a token created by the Capo's minting policy.
     *
     * Choose from one of the other variants to make a more specific token predicate.
     * @public
     */
    mkTokenPredicate(
        tokenName: UutName | number[] | string,
        quantity?: bigint
    ): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses a Value for filtering - each matched item must have the ENTIRE value.
     * @public
     */
    mkTokenPredicate(val: Value): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an explicit combination of policy/token-name/quantity
     * @public
     */
    mkTokenPredicate(
        mph: MintingPolicyHash,
        tokenName: string,
        quantity?: bigint
    ): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an AssetClass(policy/token-name) and quantity
     * @public
     */
    mkTokenPredicate(
        mphAndTokenName: AssetClass,
        quantity?: bigint
    ): tokenPredicate<any>;
    mkTokenPredicate(
        specifier:
            | Value
            | MintingPolicyHash
            | AssetClass
            | UutName
            | number[]
            | string,
        quantOrTokenName?: string | bigint,
        quantity?: bigint
    ): tokenPredicate<any> {
        let v: Value;
        let mph: MintingPolicyHash;
        let tokenName: string;
        //!!! todo: support (AssetClass, quantity) input form
        if (!specifier)
            throw new Error(
                `missing required Value or MintingPolicyHash or UutName (or uut-name as byte-array) in arg1`
            );
        const predicate = _tokenPredicate.bind(this) as tokenPredicate<any>;

        //@ts-expect-error
        const isValue = specifier.kind == "Value";

        const isTokenNameOnly =
            "string" === typeof specifier ||
            (Array.isArray(specifier) && "number" === typeof specifier[0]);
        const isUut = specifier instanceof UutName;
        if (isValue) {
            const v = specifier as Value;
            // v = predicate.value = specifier;
            const t = _tokenPredicate.bind(this, v) as tokenPredicate<any>;
            t.predicateValue = v;
            return t;
        } else if (isUut || isTokenNameOnly) {
            const tn = specifier as UutName | number[] | string;
            const quant = quantOrTokenName ? BigInt(quantOrTokenName) : 1n;
            //@ts-expect-error
            const mph = this.strella.mph;
            if (!mph) {
                throw new Error(
                    `this helper doesn't have a capo contract to resolve minting policy hash; specify the mph explicitly`
                );
            }
            const tnBytes = isUut
                ? textToBytes(tn.toString())
                : Array.isArray(tn)
                ? tn
                : textToBytes(tn as string);
            const tv = makeValue(
                mph,
                tnBytes,
                quant // quantity if any
            );
            const t = _tokenPredicate.bind(this, tv) as tokenPredicate<any>;
            t.predicateValue = tv;
            return t;
            //@ts-expect-error
        } else if (specifier.kind == "MintingPolicyHash") {
            mph = specifier as MintingPolicyHash;
            if ("string" !== typeof quantOrTokenName)
                throw new Error(
                    `with minting policy hash, token-name must be a string (or ByteArray support is TODO)`
                );
            tokenName = quantOrTokenName;
            quantity = quantity || 1n;

            // v = predicate.value = this.mkTokenValue(tokenName, quantity, mph);
            // return predicate;
            const tv = this.mkAssetValue(mph, tokenName, quantity);

            const t = _tokenPredicate.bind(this, tv) as tokenPredicate<any>;
            t.predicateValue = tv;
            return t;
            //@ts-expect-error
        } else if (specifier.kind == "AssetClass") {
            const s = specifier as AssetClass;
            mph = s.mph;
            if (!quantOrTokenName) quantOrTokenName = 1n;
            if ("bigint" !== typeof quantOrTokenName)
                throw new Error(
                    `with AssetClass, the second arg must be a bigint like 3n, or omitted`
                );
            quantity = quantOrTokenName;

            // v = predicate.value = new Value(0n, [[specifier, quantity]]);
            // return predicate;
            const tv = makeValue(0n, [[mph, [[s.tokenName, quantity]]]]);
            const t = _tokenPredicate.bind(this, tv) as tokenPredicate<any>;
            t.predicateValue = tv;
            return t;
        } else {
            throw new Error(
                `wrong token specifier (need Value, MPH+tokenName, or AssetClass`
            );
        }

        function _tokenPredicate<tokenBearer extends canHaveToken>(
            this: UtxoHelper,
            v: Value,
            something: tokenBearer
        ): tokenBearer | undefined {
            return this.hasToken(something, v);
        }
    }

    /**
     * adds the values of the given TxInputs
     */
    totalValue(utxos: TxInput[]): Value {
        return utxos.reduce((v: Value, u: TxInput) => {
            return v.add(u.value);
        }, makeValue(0n));
    }

    /**
     * Creates a Value object representing a token with the given name and quantity
     * @deprecated - Use `helios' makeValue()` instead.
     * @remarks
     * This method doesn't include any lovelace in the Value object.
     * use mkMinAssetValue() to include the minimum lovelace for storing that token in its own utxo
     * @param tokenName - the name of the token
     * @param quantity - the quantity of the token
     * @param mph - the minting policy hash of the token
     * @public
     **/
    mkTokenValue(
        tokenName: string | number[],
        quantity: bigint,
        mph: MintingPolicyHash
    ): Value {
        return makeValue(mph, tokenName, quantity);
    }

    /**
     * Creates a Value having enough lovelace to store the indicated token
     * @deprecated - Use {@link UtxoHelper.mkMinAssetValue | mkMinAssetValue(mph, tokenName, quantity)} instead.
     * @remarks
     * This is equivalent to mkTokenValue() with an extra min-utxo calculation
     * @public
     **/
    mkMinTokenValue(
        tokenName: string | number[],
        quantity: bigint,
        mph: MintingPolicyHash
    ) {
        return this.mkMinAssetValue(mph, tokenName, quantity);
    }

    /**
     * finds utxos in the current actor's wallet that have enough ada to cover the given amount
     * @remarks
     * This method is useful for finding ADA utxos that can be used to pay for a transaction.
     * 
     * Other methods in the utxo helper are better for finding individual utxos.
     * @public
     */
    async findSufficientActorUtxos(
        name: string,
        amount: Value,
        options: UtxoSearchScope = {},
        strategy: CoinSelector | CoinSelector[] = [
            selectLargestFirst({ allowSelectingUninvolvedAssets: false }),
            selectLargestFirst({ allowSelectingUninvolvedAssets: true }),
        ]
    ) : Promise<TxInput[]> {
        const wallet = options.wallet ?? this.wallet;

        const utxos = await wallet.utxos;
        const filtered = options.exceptInTcx
            ? utxos.filter(
                  options.exceptInTcx.utxoNotReserved.bind(options.exceptInTcx)
              )
            : utxos;

        if (!Array.isArray(strategy)) {
            strategy = [strategy];
        }
        for (const s of strategy) {
            const [selected, others] = s(filtered, amount);
            if (selected.length > 0) {
                return selected;
            }
        }
        throw new Error(
            `no sufficient utxos found using any of ${strategy.length} strategies`
        );
    }
    /**
     * Locates a utxo in the current actor's wallet that matches the provided token predicate
     * @remarks
     * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
     * @public
     */
    async findActorUtxo<T extends "single" | "multiple" = "single">(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        options: UtxoSearchScope = {},
        mode: T = "single" as T
    ) {
        const wallet = options.wallet ?? this.wallet;

        // doesn't go through the wallet's interface - uses the network client instead,
        // so that txChainBuilder can take into account the UTxO's already being spent in the tx-chain.
        const addrs = (await wallet?.usedAddresses) ?? [];
        const utxos: TxInput[] = [];
        for (const addr of addrs.flat(1)) {
            if (!addr) continue;
            const addrUtxos = await this.network.getUtxos(addr);
            utxos.push(...addrUtxos);
        }

        return this.hasUtxo(
            name,
            predicate,
            {
                ...options,
                wallet,
                utxos,
            },
            mode
        );
    }

    /**
     * Try finding a utxo matching a predicate
     * @remarks
     * Filters the provided list of utxos to find the first one that matches the predicate.
     *
     * Skips any utxos that are already being spent in the provided transaction context.
     * Skips any utxos that are marked as collateral in the wallet.
     *
     * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
     * @public
     **/
    async hasUtxo<T extends "single" | "multiple" = "single">(
        semanticName: string,
        predicate: utxoPredicate,
        {
            // address,
            wallet,
            exceptInTcx,
            utxos,
            required,
            dumpDetail,
        }: UtxoSearchScopeWithUtxos,
        mode: T = "single" as T
    ): Promise<
        T extends "single" ? TxInput | undefined : TxInput[] | undefined
    > {
        let notCollateral = await (async () => {
            let nc = utxos;
            try {
                const collateral = ((wallet
                    ? "handle" in wallet
                        ? await (wallet as any).handle.collateral
                        : "collateral" in wallet
                        ? wallet.collateral
                        : undefined
                    : undefined) ?? [])[0];
                nc = utxos.filter((u) => !collateral?.isEqual(u));
            } catch {
                // ignore
            }
            return nc;
        })();

        const filtered = exceptInTcx
            ? utxos.filter(exceptInTcx.utxoNotReserved.bind(exceptInTcx))
            : notCollateral;

        const foundMultiple = filtered.filter(predicate);
        const foundOne = foundMultiple[0];

        const joiner = "\n   🔎  ";
        const detail = // true ||
            dumpDetail == "always" ||
            globalThis.utxoDump ||
            (!foundOne && dumpDetail == "onFail")
                ? "\n  from set: " + joiner + utxosAsString(filtered, joiner)
                : `(${filtered.length} candidates; show with globalThis.utxoDump or \`dumpDetail\` option)`;
        console.log(
            `  🔎 finding '${semanticName}' utxo${
                exceptInTcx ? " (not already being spent in txn)" : ""
                // } from set:\n    🔎 ${detail}`
            } ${detail}`
            // ...(exceptInTcx && filterUtxos?.length
            //     ? [
            //           "\n  ... after filtering out:\n ",
            //           utxosAsString(exceptInTcx.reservedUtxos(), "\n  "),
            //       ]
            //     : [])
        );

        if (foundOne) {
            const multiInfo =
                mode == "multiple"
                    ? ` ${foundMultiple.length} matches; first: `
                    : "";
            console.log(
                "   🎈found" +
                    multiInfo +
                    utxosAsString(
                        [foundOne],
                        undefined,
                        this.setup.uxtoDisplayCache
                    )
            );
        } else {
            if (exceptInTcx) {
                const alreadyInTcx = exceptInTcx.inputs.find(predicate);
                if (alreadyInTcx) {
                    console.log(
                        `\n  um... value ${dumpAny(
                            predicate.predicateValue
                        )} not found. \n` +
                            `     ${dumpAny(alreadyInTcx)}\n` +
                            `  FYI, it seems this ^^ current txn input already has the target value. \n` +
                            "    NOTE: You may want to adjust your dAPI to create an explicit fail-if-already-present semantic\n" +
                            "    ... or, alternatively, to allow this token to authenticate multiple transaction elements\n" +
                            "    ... by using explicitly idempotent 'addOrReuse' semantics, with details stored in tcx.state\n\n  ... go with care, and ask the community for help if you're unsure\n  )" +
                            (required
                                ? "\nBTW, here is that txn as of this time: " +
                                  (await alreadyInTcx.dump()) +
                                  "\n\n 👁️   👁️ 👁️ ^^^^^^^ More details about the utxo search failure above ^^^^^^^ 👁️ 👁️   👁️"
                                : "")
                    );
                    return undefined as any;
                }
            }
        }
        if (mode == "multiple") {
            if (!foundMultiple.length) {
                return undefined as any;
            }
            return foundMultiple as any;
        }

        return foundOne as any;
    }

    async mustFindActorUtxo(
        name: string,
        options: {
            predicate: (u: TxInput) => TxInput | undefined;
            exceptInTcx?: StellarTxnContext<any>;
            extraErrorHint?: string;
        }
    ): Promise<TxInput> {
        const wallet = this.wallet;

        return this.mustFindUtxo(name, {
            ...options,
            wallet,
        });
    }

    async mustFindUtxo(
        semanticName: string,
        options: UtxoSearchScope & {
            predicate: utxoPredicate;
            extraErrorHint?: string;
        }
    ): Promise<TxInput> {
        // workaround for a failure in api-extractor to make this a separate assignment??
        const {
            predicate,
            extraErrorHint = "",
            wallet,
            address,
            exceptInTcx,
        } = options;
        // const { address, exceptInTcx } = searchScope;

        const addrs = (await wallet?.usedAddresses) ?? [address];
        const utxos: TxInput[] = [];
        for (const addr of addrs.flat(1)) {
            if (!addr) continue;
            const addrUtxos = await this.network.getUtxos(addr);
            utxos.push(...addrUtxos);
        }

        const found = await this.hasUtxo(semanticName, predicate, {
            address,
            wallet,
            exceptInTcx,
            utxos,
            required: true,
        });
        if (!found) {
            const walletAddr = wallet
                ? //@ts-ignore - sorry typescript, address sometimes is present on a SimpleWallet in test environment
                  wallet.address || (await wallet.usedAddresses)
                : undefined;
            if (!globalThis.utxoDump) {
                console.log(
                    // warning emoji: "⚠️"
                    " ⚠️ find failed in candidate utxos (debugging breakpoint available)\n",
                    semanticName,
                    dumpAny(utxos)
                );
            }
            debugger;
            // Debuggering?  YOU ARE AWESOME!
            // need to see more? dig in here:
            const addrString = address?.toString();
            const utxos2 = address
                ? await this.network.getUtxos(address)
                : await wallet!.utxos;
            console.log(
                addrString,
                wallet,
                addrs.map((a) => a?.toString())
            );
            for (const u of utxos2) {
                predicate(u);
            }
            throw new Error(
                this.utxoSearchError(
                    semanticName,
                    options,
                    extraErrorHint,
                    walletAddr
                )
            );
        }

        return found;
    }

    utxoSearchError(
        semanticName: string,
        searchScope: UtxoSearchScope,
        extraErrorHint?: string,
        walletAddresses?: Address | Address[]
    ): string {
        const where = searchScope.address
            ? `\n -- searched in address ${searchScope.address.toString()}`
            : ``;
        const wAddrs: Address[] = Array.isArray(walletAddresses)
            ? walletAddresses
            : walletAddresses
            ? [walletAddresses]
            : [];
        let more = wAddrs.length
            ? wAddrs.map((x) => dumpAny(x) + ` = ${x.toString()}`).join("\n")
            : "";
        if (wAddrs.length > 1) {
            more = "\n  ... wallet addrs:\n";
        } else {
            more = wAddrs.length ? `\n  ... in wallet addr: ${more}` : "";
        }
        if (extraErrorHint) more += "\n";

        return `${
            this.constructor.name
        }: '${semanticName}' utxo not found ${more}  ... ${
            extraErrorHint || "sorry, no extra clues available"
        }${where}\n  ... see more details in log`;
    }

    toUtxoId(u: TxInput) {
        return `${u.id.txId.toHex()}@${u.id.index}`;
    }
}
