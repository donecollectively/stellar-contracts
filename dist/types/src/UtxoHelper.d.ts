import { type BytesLike } from "@helios-lang/codec-utils";
import { type SimpleWallet, type Wallet } from "@helios-lang/tx-utils";
import { type Address, type AssetClass, type Assets, type MintingPolicyHash, type TxInput, type TxOutput, type Value, type NetworkParams } from "@helios-lang/ledger";
import { StellarTxnContext } from "./StellarTxnContext.js";
import { UutName } from "./delegation/UutName.js";
import type { SetupInfo, StellarContract } from "./StellarContract.js";
export type utxoSortInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};
export type canHaveToken = TxInput | TxOutput | Assets;
export type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    predicateValue: Value;
};
/**
 * a function that can filter txInputs for coin-selection
 * @remarks
 *
 * short form: "returns truthy" if the input is matchy for the context
 * @public
 **/
export type utxoPredicate = (((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined)) & {
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
    wallet?: Wallet | SimpleWallet;
    /**
     * suppresses searching in other actor-wallets found in the setup / actorContext:
     */
    searchOthers?: boolean;
    /**
     * extra hint to add to the error message if no utxos are found
     */
    extraErrorHint?: string;
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
export declare class UtxoHelper {
    strella?: StellarContract<any>;
    setup: SetupInfo;
    constructor(setup: SetupInfo, strella?: StellarContract<any>);
    get networkParams(): NetworkParams;
    get wallet(): Wallet;
    get network(): import("@helios-lang/tx-utils").TxChainBuilder | import("@helios-lang/tx-utils").CardanoClient | import("@helios-lang/tx-utils").Emulator;
    /**
     * Filters out utxos having non-ada tokens
     * @internal
     */
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput): TxInput | undefined;
    /**
     * Sorts utxos by size, with pure-ADA utxos preferred over others.
     * @internal
     */
    utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }: utxoSortInfo, { free: free2, minAdaAmount: r2 }: utxoSortInfo): 0 | 1 | -1;
    /**
     * Filters out utxos that are not sufficient to cover the minimum ADA amount established in
     * the utxo sort info in {@link UtxoHelper.mkUtxoSortInfo | mkUtxoSortInfo(min, max?)}.  Use in a filter() call.
     * @internal
     */
    utxoIsSufficient({ sufficient }: utxoSortInfo): boolean;
    /**
     * Filters out utxos that have non-ADA tokens, given a utxo sort info object.  Use in a filter() call.
     * @internal
     */
    utxoIsPureADA({ u }: utxoSortInfo): TxInput | undefined;
    /**
     * transforms utxo sort info back to just the utxo.
     * @internal
     */
    sortInfoBackToUtxo({ u }: utxoSortInfo): TxInput;
    /**
     * Creates a function that creates sort-info details for a utxo, given a minimum ADA amount
     * and an optional maximum ADA amount.
     * @internal
     **/
    mkUtxoSortInfo(min: bigint, max?: bigint): (u: TxInput) => utxoSortInfo;
    /**
     * accumulates the count of utxos, but only if the utxo is ADA-only.  Use in a reduce() call.
     **/
    reduceUtxosCountAdaOnly(c: number, { minAdaAmount }: utxoSortInfo): number;
    hasToken<tokenBearer extends canHaveToken>(something: tokenBearer, value: Value, tokenName?: string, quantity?: bigint): tokenBearer | undefined;
    utxoHasToken(u: TxInput, value: Value, tokenName?: string, quantity?: bigint): false | TxInput;
    inputHasToken(i: TxInput, value: Value, tokenName?: string, quantity?: bigint): false | TxInput;
    assetsHasToken(a: Assets, vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): boolean;
    outputHasToken(o: TxOutput, vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): boolean;
    /**
     * @deprecated - use helios `makeValue()` instead
     */
    mkAssetValue(mph: MintingPolicyHash, tokenName: BytesLike, count?: bigint): any;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    /**
     * creates a filtering function, currently for TxInput-filtering only.
     * with the optional tcx argument, utxo's already reserved
     *  ... in that transaction context will be skipped.
     * @public
     */
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkRefScriptPredicate(expectedScriptHash: number[]): utxoPredicate;
    /**
     * Creates an asset class for the given token name, for the indicated minting policy
     */
    acAuthorityToken(tokenName: string | number[], mph?: MintingPolicyHash): AssetClass;
    /**
     * Creates a Value object representing a token with a minimum lovelace amount
     * making it valid for output in a utxo.
     * @public
     */
    mkMinTv(mph: MintingPolicyHash, tokenName: string | UutName | number[], count?: bigint): Value;
    mkMinAssetValue(mph: MintingPolicyHash, tokenName: BytesLike, count?: bigint): Value;
    tokenAsValue(tokenName: string | number[] | UutName, count?: bigint): Value;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant takes just a token-name / quantity, working only on Capo instances,
     * and seeks a token created by the Capo's minting policy.
     *
     * Choose from one of the other variants to make a more specific token predicate.
     * @public
     */
    mkTokenPredicate(tokenName: UutName | number[] | string, quantity?: bigint): tokenPredicate<any>;
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
    mkTokenPredicate(mph: MintingPolicyHash, tokenName: string, quantity?: bigint): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an AssetClass(policy/token-name) and quantity
     * @public
     */
    mkTokenPredicate(mphAndTokenName: AssetClass, quantity?: bigint): tokenPredicate<any>;
    /**
     * adds the values of the given TxInputs
     */
    totalValue(utxos: TxInput[]): Value;
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
    mkTokenValue(tokenName: string | number[], quantity: bigint, mph: MintingPolicyHash): Value;
    /**
     * Creates a Value having enough lovelace to store the indicated token
     * @deprecated - Use {@link UtxoHelper.mkMinAssetValue | mkMinAssetValue(mph, tokenName, quantity)} instead.
     * @remarks
     * This is equivalent to mkTokenValue() with an extra min-utxo calculation
     * @public
     **/
    mkMinTokenValue(tokenName: string | number[], quantity: bigint, mph: MintingPolicyHash): Value;
    /**
     * finds utxos in the current actor's wallet that have enough ada to cover the given amount
     * @remarks
     * This method is useful for finding ADA utxos that can be used to pay for a transaction.
     *
     * Other methods in the utxo helper are better for finding individual utxos.
     *
     * If the `required` option is true, it throws an error if no sufficient utxos are found.
     * @public
     */
    findSufficientActorUtxos(name: string, amount: Value, options?: UtxoSearchScope, strategy?: CoinSelector | CoinSelector[]): Promise<TxInput[]>;
    /**
     * Locates a utxo in the current actor's wallet that matches the provided token predicate
     * @remarks
     * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
     *
     * In "single" mode, it returns the single matching utxo, or undefined if none are found
     *
     * When the searchOthers option is true, it searches in other wallets from the actor-context
     * if no utxos are matched  in the current actor's wallet.
     * @public
     */
    findActorUtxo<T extends "single" | "multiple" = "single">(name: string, predicate: (u: TxInput) => TxInput | undefined, options?: UtxoSearchScope, mode?: T): any;
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
    hasUtxo<T extends "single" | "multiple" = "single">(semanticName: string, predicate: utxoPredicate, { wallet, exceptInTcx, utxos, required, dumpDetail, searchOthers, }: UtxoSearchScopeWithUtxos, mode?: T): Promise<T extends "single" ? TxInput | undefined : TxInput[] | undefined>;
    mustFindActorUtxo(name: string, options: {
        predicate: (u: TxInput) => TxInput | undefined;
        exceptInTcx?: StellarTxnContext<any>;
        extraErrorHint?: string;
    }): Promise<TxInput>;
    mustFindUtxo(semanticName: string, options: UtxoSearchScope & {
        predicate: utxoPredicate;
    }): Promise<TxInput>;
    utxoSearchError(semanticName: string, searchScope: UtxoSearchScope, extraErrorHint?: string, walletAddresses?: Address | Address[]): string;
    toUtxoId(u: TxInput): string;
}
export {};
//# sourceMappingURL=UtxoHelper.d.ts.map