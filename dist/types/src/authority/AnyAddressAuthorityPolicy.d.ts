import { StellarTxnContext } from "../StellarTxnContext.js";
import { AuthorityPolicy } from "./AuthorityPolicy.js";
import type { isActivity } from "../ActivityTypes.js";
import type { TxInput, Value } from "@helios-lang/ledger";
import type { UtxoSearchScope } from "../UtxoHelper.js";
/**
 * Token-based authority
 * @remarks
 *
 * Transferrable authority using a unique token and no smart-contract.
 *     Network,
    Wallet,

 * @public
 **/
export declare class AnyAddressAuthorityPolicy extends AuthorityPolicy {
    loadBundle(params: any): undefined;
    usesContractScript: false;
    static defaultParams: {
        rev: bigint;
    };
    get delegateValidatorHash(): undefined;
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string, options?: UtxoSearchScope): Promise<TxInput>;
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo: TxInput): Promise<TCX>;
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, utxo: TxInput, redeemer?: isActivity): Promise<TCX>;
    DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, utxo: TxInput): Promise<TCX>;
}
//# sourceMappingURL=AnyAddressAuthorityPolicy.d.ts.map