import { Address, AssetClass, TxInput, Value } from "@hyperionbt/helios";

import { Activity, StellarContract, StellarTxnContext } from "../index.js";
import type { isActivity } from "../index.js";

type AuthorityPolicyArgs = {
    rev: bigint;
    // mph: MintingPolicyHash;
    // policyUutName: string;
};

type RegisteredCredDatumProps = {
    credid: string;
    trustees;
};

export type RCPolicyDelegate<T> = StellarContract<any & T> & {
    txnFreshenCredInfo;
    txnMintLIT;
    txnRetireCred;
};

//! an interface & base class to enforce policy for authorizing activities
//  ... in service to some other contract.  The other contract is EXPECTED
//  ... to hold a reference to key information for identifying this policy,
//  ... e.g. through a DelegateDetails structure.
export abstract class AuthorityPolicy<
    T extends AuthorityPolicyArgs = AuthorityPolicyArgs
> extends StellarContract<T> {
    static currentRev = 1n;
    static get defaultParams() {
        return { rev: this.currentRev };
    }

    // @Activity.redeemer
    protected x(tokenName: string): isActivity {
        const t =
            new this.configuredContract.types.Redeemer.commissioningNewToken(
                tokenName
            );

        return { redeemer: t._toUplcData() };
    }

    //! allows different strategies for finding the UTxO having the authority token
    //! impls MAY use details seen in the txn context to find the indicated token
    //! impls MUST resolve the indicated token to a specific UTxO
    //  ... or throw an informative error
    abstract mustFindAuthorityToken(tcx, tokenId: AssetClass): Promise<TxInput>;

    //! creates a UTxO depositing the indicated token-name into the delegated destination.
    //! Each implemented subclass can use it's own style to match its strategy & mechanism.
    //! This is used both for the original deposit and for returning the token during a grant-of-authority
    //! impls should normally preserve the datum from an already-present sourceUtxo
    abstract txnReceiveAuthorityToken(
        tcx: StellarTxnContext,
        tokenId: AssetClass,
        delegateAddr: Address,
        sourceUtxo?: TxInput
    ): Promise<StellarTxnContext>;

    //! Adds the indicated token to the txn as an input with apporpriate activity/redeemer
    //! Other contracts needing the authority within a transaction can rely on the presence of this spent authority.
    //! impls can EXPECT the token will be returned via txnReceiveAuthorityToken
    //! a contract-backed impl SHOULD enforce the expected return in its on-chain code
    abstract txnGrantAuthority(
        tcx: StellarTxnContext,
        tokenId: AssetClass,
        sourceUtxo: TxInput,
        delegateAddr: Address
    ): Promise<StellarTxnContext>;

    //! Adds the indicated utxo to the transaction with appropriate activity/redeemer
    //  ... allowing the token to be burned by the minting policy.
    //! When backed by a contract,
    //! ... it should ensure any other UTXOs it may also hold,
    //   ... do not become inaccessible as a result.
    //! When backed by a contract, it should use an activity/redeemer
    //  ... allowing the token to be spent and not returned.
    //! It MAY enforce additional requirements and/or block the action.
    abstract txnRetireCred(
        tcx: StellarTxnContext,
        tokenId: AssetClass,
        sourceUtxo: TxInput,
        delegateAddr: Address
    ): Promise<StellarTxnContext>;

    // static mkDelegateWithArgs(a: RCPolicyArgs) {
    //
    // }
    requirements() {
        return {
            "provides an interface for providing arms-length proof of authority to any other contract":
                {
                    purpose:
                        "to decouple authority administration from its effects",
                    details: [
                        "Any contract can create a UUT for use with an authority policy.",
                        "By depositing that UUT to the authority contract, it can delegate completely",
                        "  ... all the implementation details for administration of the authority itself.",
                        "It can then focus on implementing the effects of authority, requiring only ",
                        "  ... that the correct UUT has been spent, to indicate that the authority is granted.",
                        "The authority contract can have its own internal details ",
                        "A subclass of this authority policy may provide additional administrative dynamics.",
                    ],
                    mech: [],
                    requires: [
                        "implementations SHOULD positively govern spend of the UUT",
                        "implementations MUST provide an essential interface for transaction-building",
                    ],
                },

            "implementations SHOULD positively govern spend of the UUT": {
                purpose: "for sufficient assurance of desirable safeguards",
                details: [
                    "A subclass of the GenericAuthority should take care of guarding the UUT's spend",
                    "  ... in whatever way is considered appropriate for its use-case",
                ],
                mech: [],
                requires: [],
            },

            "implementations MUST provide an essential interface for transaction-building":
                {
                    purpose:
                        "enabling a strategy-agnostic interface for making transactions using any supported strategy-variant",
                    details: [
                        "Subclasses MUST implement the interface methods",
                        "  ... in whatever way is considered appropriate for its use-case.",
                        "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
                        "  ... MUST still implement the method satisfying the interface, ",
                        "  ... but MAY throw an UnsupportedAction error, to indicate that",
                        "  ... the strategy variant has no meaningful action to perform ",
                        "  ... that would serve the method's purpose",
                    ],
                    mech: [],
                    requires: [
                        "requires a txnReceiveAuthorityToken(tcx, tokenId, delegateAddr, original?) ",
                        "requires a mustFindAuthorityToken(tcx, tokenId)",
                        "requires a txnGrantAuthority(tcx, tokenId, delegateAddr)",
                        "requires txnRetireCred(tcx, tokenId, delegateAddr)",
                    ],
                },

            "requires a txnReceiveAuthorityToken(tcx, tokenValue, delegateAddr, original?)":
                {
                    purpose:
                        "to deposit the authority token (back) to the delegated destination",
                    details: [
                        "impls MUST implement txnReceiveAuthorityToken",
                        "Each implemented subclass can use it's own style to match its strategy & mechanism",
                        "This is used both for the original deposit and for returning the token during a grant-of-authority",
                    ],
                    mech: [
                        "impls MUST create a UTxO depositing the indicated token-name into the delegated destination.",
                        "impls should normally preserve the datum from an already-present sourceUtxo",
                    ],
                    requires: [],
                },

            "requires a mustFindAuthorityToken(tcx, tokenId)": {
                purpose: "to locate the given authority token",
                details: [
                    "allows different strategies for finding the UTxO having the authority token",
                    "impls MAY use details seen in the txn context to find the indicated token",
                ],
                mech: [
                    "impls MUST resolve the indicated token to a specific UTxO or throw an informative error",
                ],
            },

            "requires a txnGrantAuthority(tcx, tokenId, sourceUtxo)": {
                purpose: "to use the delegated authority",
                details: [
                    "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
                    "Contracts needing the authority within a transaction can rely on the presence of this spent authority",
                    "Impls can EXPECT the token will be returned via txnReceiveAuthorityToken",
                    "a contract-backed impl SHOULD enforce the expected return in its on-chain code",
                ],
                mech: [
                    "the base AuthorityPolicy MUST call txnReceiveAuthorityToken() with the token's sourceUtxo",
                ],
                requires: [],
            },

            "requires txnRetireCred(tcx, tokenValue, delegateAddr)": {
                purpose: "to allow burning the authority token",
                details: [
                    "Adds the indicated utxo to the transaction with appropriate activity/redeemer",
                    "  ... allowing the token to be burned by the minting policy.",
                    "Impls SHOULD ensure any other UTXOs it may hold do not become inaccessible as a result",
                ],
                mech: [
                    "impls MUST add the token to the txn if it can be retired",
                    "if the token cannot be retired, by appropriate policy, it SHOULD throw an informative error",
                ],
            },
        };
    }
}
