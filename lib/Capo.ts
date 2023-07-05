import {
    Address,
    Datum,
    MintingPolicyHash,
    TxId,
    UTxO,
    Value,
} from "@hyperionbt/helios";
import { DefaultMinter, SeedTxnParams } from "../src/DefaultMinter.js";
import {
    InlineDatum,
    StellarContract,
    datum,
    paramsBase,
    stellarSubclass,
    valuesEntry,
} from "./StellarContract.js";
import { StellarTxnContext } from "./StellarTxnContext.js";

type minterContract<T extends paramsBase = any> = StellarContract<T>;

export type seedUtxoParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};
// P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never

interface hasUUTCreator {
    txnCreateUUT(tcs: StellarTxnContext, UUTlabel: string): Promise<Value>;
}

export type MintCharterRedeemerArgs = {
    owner: Address;
};
export type MintUUTRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    assetName: string;
};

export interface MinterBaseMethods extends hasUUTCreator {
    get mintingPolicyHash(): MintingPolicyHash;
    txnAddCharterInit(
        tcx: StellarTxnContext,
        owner: Address,
        tVal: valuesEntry
    ): Promise<StellarTxnContext>;
    txnCreateUUT(tcx: StellarTxnContext, uutPurpose: string): Promise<Value>;
}
export class Capo<
        minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends MinterBaseMethods = DefaultMinter, // extends minterContract<PT> = DefaultMinter,
        // PT_ALWAYS_INFERRED extends never = never,
        // //@ts-expect-error PT can specify a different subtype again
        // minterClass = minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter ? stellarSubclass<DefaultMinter, PT> : never,
        // getMinterClassType = minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter ? minterClass : never | minterClass,
        PT extends paramsBase = minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter
            ? SeedTxnParams
            : minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends minterContract<
                  infer minterTypeParamsType
              >
            ? minterTypeParamsType
            : never
    >
    extends StellarContract<PT>
    implements hasUUTCreator
{
    get minterClass(): stellarSubclass<DefaultMinter, seedUtxoParams> {
        return DefaultMinter;
    }

    minter?: minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW;

    async txnCreateUUT(tcx: StellarTxnContext, l: string): Promise<Value> {
        return this.minter!.txnCreateUUT(tcx, l);
    }

    //! it can provide minter-targeted params through getMinterParams()
    getMinterParams() {
        return this.paramsIn;
    }

    getContractParams(params: PT) {
        const { mph } = this;
        // console.log("this treasury uses mph", mph?.hex);

        return {
            mph,
        };
    }

    get mph() {
        const minter = this.connectMintingScript(this.getMinterParams());
        return minter.mintingPolicyHash!;
    }

    connectMintingScript(
        params: PT
    ): minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW {
        if (this.minter) return this.minter;
        const { minterClass } = this;

        const { seedTxn, seedIndex } = this.paramsIn;

        //@ts-expect-error - can't seem to indicate to typescript that minter
        return (this.minter = this.addScriptWithParams(minterClass, params));
    }

    async mustGetContractSeedUtxo(): Promise<UTxO | never> {
        //! given a Capo-based contract instance having a free UTxO to seed its validator address,
        //! prior to initial on-chain creation of contract,
        //! it finds that specific UTxO in the current user's wallet.
        const { seedTxn, seedIndex } = this.paramsIn;

        return this.mustFindActorUtxo(
            "seed",
            (u) => {
                const { txId, utxoIdx } = u;

                if (txId.eq(seedTxn) && BigInt(utxoIdx) == seedIndex) {
                    return u;
                }
            },
            "already spent?"
        );
    }

    @datum
    mkDatumCharterToken({
        trustees,
        minSigs,
    }: {
        trustees: Address[];
        minSigs: bigint;
    }): InlineDatum {
        //!!! todo: make it possible to type these datum helpers more strongly
        const t = new this.configuredContract.types.Datum.CharterToken(
            trustees,
            minSigs
        );
        return Datum.inline(t._toUplcData());
    }

    capoRequirements() {
        return {
            "is a base class for leader/Capo pattern": {
                purpose:
                    "so that smart contract developers can easily start multi-script development",
                details: [],
                mech: [
                    "provides a default minter",
                    "allows the minter class to be overridden",
                    "uses seed-utxo pattern by default",
                ],
            },
        };
    }
}
