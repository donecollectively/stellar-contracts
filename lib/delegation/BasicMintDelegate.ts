import {
    Address,
    Value,
} from "@hyperionbt/helios";


//@ts-expect-error
import contract from "./BasicMintDelegate.hl";
import { Activity, StellarContract, isActivity } from "../StellarContract.js";
import { StellarTxnContext } from "../StellarTxnContext.js";

type MintDelegateArgs = {
    rev: bigint
    // mph: MintingPolicyHash;
    // policyUutName: string;
}

//!!! TODO: include adapter(s) for Datum, which has the same essential shape
type MintDelegateDatumProps = {
    tokenName: string,
    maxMintSize: bigint
}

export type MintDelegate<T> = StellarContract<any & T> & {
    txnCreateTokenPolicy
}

export class BasicMintDelegate extends StellarContract<MintDelegateArgs> {
    static currentRev = 1n;
    static get defaultParams() {
        return { rev: this.currentRev }
    }
    contractSource() {
        return contract;
    }

    // @Activity.redeemer
    protected x(tokenName: string): isActivity {
        const t = new this.configuredContract.types.Redeemer.commissioningNewToken(
            tokenName
        );

        return { redeemer: t._toUplcData() };
    }

    @Activity.partialTxn
    async txnCreatingTokenPolicy(
        tcx: StellarTxnContext,
        tokenName: string
    ): Promise<StellarTxnContext> {

        return tcx;
    }

    servesDelegationRole(role: string) {
        if ("mintingPolicy" == role) return true;
    }

    static mkDelegateWithArgs(a: MintDelegateArgs) {

    }
}
    
