import {
    Address,
    Program,
    Tx,
    UplcProgram,
    TxOutput,
    Value,
    Datum,
    Wallet,
    UTxO,
    DatumHash,
    ByteArray,
    Assets,
    TxId,
    UplcData,
    Signature,
} from "@hyperionbt/helios";

import {
    InlineDatum,
    datum,
    partialTxn,
    txn,
} from "../../lib/StellarContract.js";

import { StellarTxnContext } from "../../lib/StellarTxnContext.js";

//@ts-expect-error
import contract from "./SampleTreasury.hl";
import { Capo } from "../../lib/Capo.js";

export type CharterDatumArgs = {
    trustees: Address[];
    minSigs: number | bigint;
};

export type HeldAssetsArgs = {
    purposeId?: string;
    purpose?: string;
};

export const chTok = Symbol("charterToken");
export type CharterTokenUTxO = {
    [chTok]: UTxO;
};

export class SampleTreasury extends Capo {
    contractSource() {
        return contract;
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


    //!!! consider making trustee-sigs only need to cover the otherRedeemerData
    //       new this.configuredContract.types.Redeemer.authorizeByCharter(otherRedeemerData, otherSignatures);
    // mkAuthorizeByCharterRedeemer(otherRedeemerData: UplcData, otherSignatures: Signature[]) {

    get charterTokenAsValue() {
        return this.minter!.charterTokenAsValue
    }

    @partialTxn  // non-activity partial
    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext,
        newDatum?: InlineDatum
    ): Promise<CharterTokenUTxO | never> {
        const ctVal = this.charterTokenAsValue;
        const predicate = this.mkTokenPredicate(ctVal)
        return this.mustFindMyUtxo(
            "charter", predicate,
            "has it been minted?"
        ).then((ctUtxo: UTxO) => {
            const charterToken = { [chTok]: ctUtxo };
            const datum = newDatum || (ctUtxo.origOutput.datum as InlineDatum);

            this.txnKeepCharterToken(tcx, datum);
            return charterToken;
        });
    }

    modifiedCharterDatum() {}

    @partialTxn  // non-activity partial
    txnKeepCharterToken(tcx: StellarTxnContext, datum: InlineDatum) {
        
        tcx.addOutput(
            new TxOutput(this.address, this.charterTokenAsValue, datum)
        );

        return tcx;
    }

    @txn
    async mkTxnMintCharterToken(
        { trustees, minSigs }: CharterDatumArgs,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext | never> {
        return this.mustGetContractSeedUtxo().then((seedUtxo) => {
            const v = this.charterTokenAsValue;
            // this.charterTokenDatum
            const datum = this.mkDatumCharterToken({
                trustees,
                minSigs: BigInt(minSigs),
            });

            const outputs = [new TxOutput(this.address, v, datum)];

            // debugger
            tcx.addInput(seedUtxo).addOutputs(outputs);
            return this.minter!.txnMintingCharterToken(
                tcx,
                this.address
            );
        });
    }

    @txn
    async mkTxnUpdateCharter(
        trustees: Address[],
        minSigs: bigint,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext> {
        return this.txnMustUseCharterUtxo(
            tcx,
            this.mkDatumCharterToken({ trustees, minSigs })
        ).then(async (charterToken) => {
            tcx.addInput(
                charterToken[chTok],
                this.updatingCharter({ trustees, minSigs })
            ).attachScript(this.compiledContract);

            return tcx;
        });
    }

    @partialTxn
    async txnAddAuthority(tcx: StellarTxnContext) {
        return this.txnMustUseCharterUtxo(tcx).then(async (charterToken) => {
            return tcx
                .addInput(charterToken[chTok], this.usingAuthority())
                .attachScript(this.compiledContract);
        });
    }

    requirements() {
        return {
            "positively governs all administrative actions": {
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
                    "uses a 'charter' token specialized for this contract",
                    "the charter token has a trustee list in its Datum structure",
                    "the charter token has a threshold setting in its Datum structure",
                    "the charter Datum is updated when needed to reflect new trustees/thresholds",
                ],
                requires: [
                    "has a unique, permanent charter token",
                    "has a unique, permanent treasury address",
                    "the trustee threshold is enforced on all administrative actions",
                    "the trustee group can be changed",
                    "the charter token is always kept in the contract",
                    "can mint other tokens, on the authority of the Charter token",
                ],
            },

            "has a singleton minting policy": {
                purpose: "to mint various tokens authorized by the treasury",
                details: [
                    "A chosen minting script is bound deterministically to the contract constellation",
                    "Its inaugural (aka 'initial Charter' or 'Charter Mint') transaction creates a charter token",
                    "The minting script can issue further tokens approved by Treasury Trustees",
                    "The minting script does not need to concern itself with details of Treasury Trustee approval",
                ],
                mech: [
                    "has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter",
                    "makes a different address depending on (txId, outputIndex) parameters of the Minting script",
                ],
                requires: [],
            },

            "has a unique, permanent treasury address": {
                purpose: "to give continuity for its stakeholders",
                details: [
                    "One-time creation is ensured by UTxO's unique-spendability property",
                    "Determinism is transferred from the charter utxo to the MPH and to the treasury address",
                ],
                mech: [
                    "uses the Minting Policy Hash as the sole parameter for the treasury spending script",
                ],
                requires: ["has a singleton minting policy"],
            },

            "has a unique, permanent charter token": {
                purpose:
                    "to guarantee permanent identity of a token constraining administrative actions",
                details: [
                    "a charter token is uniquely created when bootstrapping the constellation contract",
                    "the charter token can't ever be recreated (it's non-fungible and can't be re-minted)",
                    "the treasury address, minting policy hash, and charter token are all deterministic based on input utxo",
                ],
                impl: "txMintCharterToken()",
                mech: [
                    "creates a unique 'charter' token, with assetId determined from minting-policy-hash+'charter'",
                    "TODO: fails if minSigs is longer than trustee list",
                    "doesn't work with a different spent utxo",
                ],
                requires: [
                    "has a singleton minting policy",
                    "the charter token is always kept in the contract",
                ],
            },

            "the charter token is always kept in the contract": {
                purpose:
                    "so that the treasury contract is always in control of administrative changes",
                details: [
                    "The charter token's spendability' is used as a signal of administrative authority for transactions wanting proof of authority",
                    "... thus, other scripts don't need to express any of the authority policy, but can simply verify the token's presence in the txn",
                    "It shouldn't ever be possible to interfere with its spendability, e.g. by bundling it in an inconvenient way with other assets",
                    "By enforcing that the charter token is always returned to the contract, ",
                    "... it has assurance of continuing ability to govern the next activity using that token",
                    "Note: the charter mint can bind with any contract having suitable assurances, ",
                    "... but we only focus on the case of binding to this treasury contract",
                ],
                mech: [
                    "builds transactions with the charter token returned to the contract",
                    "fails to spend the charter token if it's not returned to the contract",
                    "TODO: keeps the charter token separate from other assets in the contract",
                ],
                requires: [],
            },

            "XXX can mint other tokens, on the authority of the charter token": {
                purpose:
                    "to simplify the logic of minting, while being sure of minting authority",
                details: [
                    "the minting policy doesn't have to directly enforce the trustee-list policy",
                    "instead, it delegates that to the treasury spending script, ",
                    "... and simply requires that the charter token is used for minting anything else",
                ],
                mech: [
                    "can build transactions that mint non-'charter' tokens",
                    "requires the charter-token to be spent as proof of authority",
                    "fails if the charter-token is not returned to the treasury",
                    "fails if the charter-token parameters are modified",
                ],
            },

            "the trustee group can be changed": {
                purpose: "to ensure administrative continuity for the group",
                details: [
                    "When the needed threshold for administrative modifications is achieved, the Charter Datum can be updated",
                    "This type of administrative action should be explicit and separate from any other administrative activity",
                    "If the CharterToken's Datum is being changed, no other redeemer activities are allowed",
                ],
                mech: [
                    "requires the existing threshold of existing trustees to be met",
                    "requires all of the new trustees to sign the transaction",
                    "does not allow minSigs to exceed the number of trustees",
                ],
                requires: [
                    "the trustee threshold is enforced on all administrative actions",
                ],
            },

            "the trustee threshold is enforced on all administrative actions": {
                purpose:
                    "allows progress in case a small fraction of trustees may not be available",
                details: [
                    "A group can indicate how many of the trustees are required to provide their explicit approval",
                    "If a small number of trustees lose their keys, this allows the remaining trustees to directly regroup",
                    "For example, they can replace the trustee list with a new set of trustees and a new approval threshold",
                    "Normal day-to-day administrative activities can also be conducted while a small number of trustees are on vacation or otherwise temporarily unavailable",
                ],
                mech: [
                    "doesn't allow the charterToken to be sent without enough minSigs from the trustee list",
                ],
                requires: [],
            },

            foo: {
                purpose: "",
                details: [],
                mech: [],
                requires: [],
            },
        };
    }
}
