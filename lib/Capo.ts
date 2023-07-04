import { Address, Datum, TxId, UTxO } from "@hyperionbt/helios";
import { DefaultMinter, SeedTxnParams } from "../src/DefaultMinter.js";
import { InlineDatum, StellarContract, datum, paramsBase, stellarSubclass } from "./StellarContract.js";

type minterContract<
    T extends paramsBase=any
> = StellarContract<T>;

export type seedUtxoParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};
// P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never

export class Capo<
    minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter = DefaultMinter, // extends minterContract<PT> = DefaultMinter,

    // PT_ALWAYS_INFERRED extends never = never,
    // //@ts-expect-error PT can specify a different subtype again
    // minterClass = minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter ? stellarSubclass<DefaultMinter, PT> : never,
    // getMinterClassType = minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter ? minterClass : never | minterClass,
    PT extends paramsBase = (
        minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends DefaultMinter ? SeedTxnParams :
        minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW extends minterContract<
            infer minterTypeParamsType
        > ? minterTypeParamsType 
        : never
    ),
> extends StellarContract<PT> {
    get minterClass() : stellarSubclass<DefaultMinter, seedUtxoParams> {
        return  DefaultMinter;
    }

    minter? : minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW

    //! it can provide minter-targeted params through getMinterParams()
    getMinterParams() {
        return this.paramsIn
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

    connectMintingScript(params: PT): minterType__ONLY_DefaultMinter_SUPPORTED_FOR_NOW {
        if (this.minter) return this.minter;
        const {minterClass} = this;

        const { seedTxn, seedIndex } = this.paramsIn;

        //@ts-expect-error - can't seem to indicate to typescript that minter
        return (this.minter = this.addScriptWithParams(minterClass, params));
    }

    async mustGetSeedUtxo(): Promise<UTxO | never> {
        // const [address] = await this.myActor.usedAddresses;
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

}