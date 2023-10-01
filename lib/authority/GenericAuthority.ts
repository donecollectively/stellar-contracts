import { Address, Value } from "@hyperionbt/helios"

//@ts-expect-error
import contract from "./MultiSigAuthority.hl"
import { Activity, StellarContract, StellarTxnContext } from "../index.js"
import type { isActivity } from "../index.js"

type RCPolicyArgs = {
    rev: bigint
    // mph: MintingPolicyHash;
    // policyUutName: string;
}

type RegisteredCredDatumProps = {
    credid: string
    trustees
}

export type RCPolicyDelegate<T> = StellarContract<any & T> & {
    txnFreshenCredInfo
    txnMintLIT
    txnRetireCred
}

//! a contract enforcing policy for a registered credential
export class RCPolicy extends StellarContract<RCPolicyArgs> {
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

    // servesDelegationRole(role: string) {
    //     if ("registeredCredPolicy" == role) return true;
    // }
    //
    // static mkDelegateWithArgs(a: RCPolicyArgs) {
    //
    // }
    requirements() {
        return {
            "provides an interface for providing arms-length proof of authority to any other contract": {
                purpose: "to decouple authority administration from its effects",
                details: [
                    "Any contract can create a UUT for use with an authority policy.",
                    "By depositing that UUT to the authority contract, it can delegate completely",
                    "  ... all the implementation details for administration of the authority itself.",
                    "It can then focus on implementing the effects of authority, requiring only ",
                    "  ... that the correct UUT has been spent, to indicate that the authority is granted.",
                    "The authority contract can have its own internal details ",
                    "A subclass of this authority policy may provide additional administrative dynamics."
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
                ], mech: [], requires: []
            },

            "implementations MUST provide an essential interface for transaction-building": {
                purpose: "enabling a strategy-agnostic interface for making transactions using any supported strategy-variant",
                details: [
                    "Subclasses MUST implement the interface methods",
                    "  ... in whatever way is considered appropriate for its use-case.",
                    "An interface method whose requirement is marked with 'MAY/SHOULD' behavior, ",
                    "  ... MUST still implement the method satisfying the interface, ",
                    "  ... but MAY throw an UnsupportedAction error, to indicate that",
                    "  ... the strategy variant has no meaningful action to perform ",
                    "  ... that would serve the method's purpose"
                ], mech: [
                    "txnReceiveAuthorityToken(tcx, tokenName, delegate) MUST create a UTxO depositing the indicated token-name into the delegated destination.",
                    "txnGrantAuthority(tcx, tokenName, delegate) MUST create a TxIn, spending the indicated token-name.  It SHOULD normally deposit it back to its origin with equivalent Datum settings",
                    "txnRetireCred(tcx, tokenName, delegate) SHOULD burn the Uut.  It SHOULD ensure any other UTXOs it may hold do not become inaccessible as a result",
                ], requires: []
            },

        }
    }
}
