import {
    Address,
    Program,
    Tx,
    UplcProgram,
    TxOutput,
    Value,
    Datum,
    Wallet,
    TxInput,
    DatumHash,
    ByteArray,
    Assets,
    TxId,
    UplcData,
    Signature,
} from "@hyperionbt/helios";

import {
    Activity,
    datum,
    isActivity,
    partialTxn,
    txn,
} from "./StellarContract.js";
import { InlineDatum } from "./HeliosPromotedTypes.js";

import { StellarTxnContext } from "./StellarTxnContext.js";

//@ts-expect-error
import contract from "./DefaultCapo.hl";
import { Capo } from "./Capo.js";
import { DefaultMinter } from "./DefaultMinter.js";
import { RoleMap, strategyValidation, variantMap, VariantMap } from "./delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "./delegation/BasicMintDelegate.js";
import { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import { AddressAuthorityPolicy } from "./authority/AddressAuthorityPolicy.js";

export type DelegateInfo = {
    uut: string,
    strategy: string,
    address: Address[]
}

export type DefaultCharterDatumArgs = {
    govDelegate: DelegateInfo
};

export type HeldAssetsArgs = {
    purposeId?: string;
    purpose?: string;
};

export class DefaultCapo<
    MinterType extends DefaultMinter = DefaultMinter
> extends Capo<MinterType> {
    contractSource() {
        return contract;
    }

    // // @Activity.redeemer
    // updatingCharter() : isActivity {
    //     return this.updatingDefaultCharter()
    // }
    get roles() : RoleMap {
        return {
            govDelegate: variantMap<AuthorityPolicy>({ 
                address: {
                    delegateClass: AddressAuthorityPolicy,
                    scriptParams: {},
                    validateScriptParams(args) : strategyValidation {
                        return undefined
                    }
                }
            }),
            mintDelegate: variantMap<BasicMintDelegate>({ 
                default: {
                    delegateClass: BasicMintDelegate,
                    scriptParams: {},
                    validateScriptParams(args) : strategyValidation {
                        if (args.bad) {
                            //note, this isn't the normal way of validating.
                            //  ... usually it's a good field name whose value is missing or wrong.
                            //  ... still, this conforms to the ErrorMap protocol good enough for testing.
                            return {bad:  [ "must not be provided" ]}
                        }
                        return undefined
                    }
                }
            })
        }
    }

    @datum
    mkDatumCharterToken(args: DefaultCharterDatumArgs): InlineDatum {
        //!!! todo: make it possible to type these datum helpers more strongly

        const {Datum:{CharterToken}, DelegateDetails} = this.configuredContract.types;
        const {uut, strategy, address} = args.govDelegate
        const t = new CharterToken(
            new DelegateDetails(uut, strategy, address)
        );
        return Datum.inline(t._toUplcData());
    }

    //!!! consider making trustee-sigs only need to cover the otherRedeemerData
    //       new this.configuredContract.types.Redeemer.authorizeByCharter(otherRedeemerData, otherSignatures);
    // mkAuthorizeByCharterRedeemer(otherRedeemerData: UplcData, otherSignatures: Signature[]) {

    @txn
    async mkTxnMintCharterToken(
        charterArgs: DefaultCharterDatumArgs,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext | never> {
        console.log(`minting charter from seed ${this.paramsIn.seedTxn.hex.substring(0, 12)}…@${this.paramsIn.seedIndex}`);
        return this.mustGetContractSeedUtxo().then((seedUtxo) => {
            const datum = this.mkDatumCharterToken(charterArgs);

            const outputs = [new TxOutput(this.address, this.tvCharter(), datum)];

            tcx.addInput(seedUtxo).addOutputs(outputs);
            return this.minter!.txnMintingCharter(tcx, this.address);
        });
    }
 
    @Activity.redeemer
    updatingCharter(
        args: DefaultCharterDatumArgs 
    ): isActivity {
        const {DelegateDetails, Redeemer} = this.configuredContract.types
        const t = new Redeemer.updatingCharter(
            args.govDelegate,
            new DelegateDetails(args.govDelegate.strategy, args.govDelegate.address)
        );

        return { redeemer: t._toUplcData() };
    }

    @txn
    async mkTxnUpdateCharter(
        args:  DefaultCharterDatumArgs,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext> {
        return this.txnUpdateCharterUtxo(
            tcx,
            this.updatingCharter(args),
            this.mkDatumCharterToken(args)
        )
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
