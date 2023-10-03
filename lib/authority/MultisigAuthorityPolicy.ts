import { Address, AssetClass, TxInput, Value } from "@hyperionbt/helios"

//@ts-expect-error
import contract from "./MultisigAuthorityPolicy.hl"
import { Activity, isActivity, StellarContract } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";

type RCPolicyArgs = {
    rev: bigint
    // mph: MintingPolicyHash;
    // policyUutName: string;
}

//! a contract enforcing policy for a registered credential
export class MultisigAuthorityPolicy extends StellarContract<RCPolicyArgs> {
    static currentRev = 1n
    static get defaultParams() {
        return { rev: this.currentRev }
    }
    contractSource() {
        return contract
    }

    // @Activity.redeemer
    protected x(tokenName: string): isActivity {
        const t =
            new this.configuredContract.types.Redeemer.commissioningNewToken(
                tokenName
            )

        return { redeemer: t._toUplcData() }
    }

    @Activity.partialTxn
    async txnFreshenCredInfo(
        tcx: StellarTxnContext,
        tokenName: string
    ): Promise<StellarTxnContext> {
        return tcx
    }

    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    async mustFindAuthorityToken(tcx, tokenId: AssetClass) : Promise<TxInput> {

    }

    async txnReceiveAuthorityToken(
        tcx : StellarTxnContext, 
        tokenId: AssetClass, 
        delegateAddr: Address,
        sourceUtxo?: TxInput,
    ) : Promise<StellarTxnContext> {
        throw new Error(`implementation TODO`)
        return tcx;
    }

    //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
    async txnGrantAuthority(        
        tcx : StellarTxnContext, 
        tokenId: AssetClass, 
        sourceUtxo: TxInput,
        delegateAddr: Address,
    ): Promise<StellarTxnContext> {

        return tcx;
    }

    //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
    //  ... allowing the token to be burned by the minting policy.
    async txnRetireCred(
        tcx : StellarTxnContext, 
        tokenId: AssetClass, 
        delegateAddr: Address,
    ): Promise<StellarTxnContext> {

        return tcx;
    }

    requirements() {
        return {
            "provides arms-length proof of authority to any other contract": {
                purpose: "to decouple authority administration from its effects",
                details: [
                    "See GenericAuthority for more background on authority delegation.",
                    "This policy uses a trustee list and minSigs threshold to provide multisig-based authority",
                ],
                mech: [],
                requires: [
                    "positively governs spend of the UUT",
                    "the trustee threshold is required to spend its UUT",
                    "the trustee group can be changed",
                ],
            },
            "positively governs spend of the UUT": {
                purpose: "to maintain clear control by a trustee group",
                details: [
                    // descriptive details of the requirement (not the tech):
                    "a trustee group is defined during contract creation",
                    "the trustee list's signatures provide consent",
                    "the trustee group can evolve by consent of the trustee group",
                    "a threshold set of the trustee group can give consent for the whole group",
                ],
                mech: [
                    // descriptive details of the chosen mechanisms for implementing the reqts:
                    "the UUT has a trustee list in its Datum structure",
                    "the UUT has a threshold setting in its Datum structure",
                    "the Settings datum is updated when needed to reflect new trustees/thresholds",
                ],
                requires: [
                    "TODO: has a unique authority UUT",
                    "TODO: the trustee threshold is required to spend its UUT",
                    "TODO: the trustee group can be changed",
                ],
            },
            "the trustee threshold is required to spend its UUT": {
                purpose:
                    "allows progress in case a small fraction of trustees may not be available",
                details: [
                    "A group can indicate how many of the trustees are required to provide their explicit approval",
                    "If a small number of trustees lose their keys, this allows the remaining trustees to directly regroup",
                    "For example, they can replace the trustee list with a new set of trustees and a new approval threshold",
                    "Normal day-to-day administrative activities can also be conducted while a small number of trustees are on vacation or otherwise temporarily unavailable",
                ],
                mech: [
                    "TODO: doesn't allow the UUT to be spent without enough minSigs from the trustee list",
                ],
                requires: [],
            },

            "the trustee group can be changed": {
                purpose: "to ensure administrative continuity for the group",
                details: [
                    "When the needed threshold for administrative modifications is achieved, the Settings datum can be updated",
                    "When changing trustees, it should guard against mistakes in the new trustee list, ",
                    "  ... by validating signatures of the new trustees",
                    "  ... and by validating new minSigs"
                ],
                mech: [
                    "TODO: trustee list can be changed if the signature threshold is met",
                    "TODO: the new trustees must sign any change of trustees",
                    "TODO: does not allow minSigs to exceed the number of trustees",
                ],
                requires: [],
            },

        }
    }
}
