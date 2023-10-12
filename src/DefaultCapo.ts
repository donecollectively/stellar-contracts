import {
    Address,
    Program,
    Tx,
    UplcProgram,
    TxOutput,
    Value,
    //@ts-expect-error
    Option,
    Datum,
    Wallet,
    TxInput,
    DatumHash,
    ByteArray,
    Assets,
    TxId,
    UplcData,
    Signature,
    AssetClass,
} from "@hyperionbt/helios";

import {
    Activity,
    configBase,
    ConfigFor,
    datum,
    isActivity,
    partialTxn,
    StellarContract,
    txn,
} from "./StellarContract.js";
import { InlineDatum } from "./HeliosPromotedTypes.js";

import { StellarTxnContext } from "./StellarTxnContext.js";

//@ts-expect-error
import contract from "./DefaultCapo.hl";
import { Capo, CapoBaseConfig, hasSelectedDelegates } from "./Capo.js";
import { DefaultMinter } from "./DefaultMinter.js";
import {
    ErrorMap,
    PARAM_IMPLIED,
    RelativeDelegateLink,
    RoleMap,
    strategyValidation,
    variantMap,
    VariantMap,
} from "./delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "./delegation/BasicMintDelegate.js";
import {
    AuthorityPolicy,
    AuthorityPolicySettings,
} from "./authority/AuthorityPolicy.js";
import { AddressAuthorityPolicy } from "./authority/AddressAuthorityPolicy.js";
import { DelegateDetailSnapshot } from "./delegation/RolesAndDelegates.js";
import { txAsString } from "./diagnostics.js";
import { MultisigAuthorityPolicy } from "./authority/MultisigAuthorityPolicy.js";
import { hasReqts } from "./Requirements.js";

/**
 * Schema for Charter Datum, which allows state to be stored in the Leader contract
 * together with it's primary or "charter" utxo.
 *
 * @typeParam CT - allows type-safe partial-`config`uration details for the charter's authority-delegate
 *    to be to be stored within the datum.
 **/
export type DefaultCharterDatumArgs<CT extends configBase = CapoBaseConfig> = {
    govAuthorityLink: RelativeDelegateLink<CT>;
};

export type PartialDefaultCharterDatumArgs<
    T extends DefaultCharterDatumArgs<any> = DefaultCharterDatumArgs,
    CT extends configBase = T extends DefaultCharterDatumArgs<infer iCT>
        ? iCT
        : never
> = Partial<Omit<T, "govAuthorityLink">> & {
    govAuthorityLink: Required<Pick<RelativeDelegateLink<CT>, "strategyName">> &
        Partial<RelativeDelegateLink<CT>>;
    // Partial<Omit<T["govAuthorityLink"], "strategyName">>
};

export type HeldAssetsArgs = {
    purposeId?: string;
    purpose?: string;
};

/**
 * Base class for leader contracts, with predefined roles for delegating governance authority and minting policies
 * @remarks
 * 
 *  * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract 
 * scripts.  Subclasses of Capo can use these capabilities in custom ways for strong flexibility.

 * Subclass and customize DefaultCapo's type-parameters if you need to customize further.
 * 
 * Any Capo contract can (and must) define roles() to establish collaborating scripts; these are used for 
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain) 
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * DefaultCapo provides roles for govAuthority and mintDelegate, and methods to facilitate 
 * the lifecycle of charter creation & update. 
 * 
 * **Example: Multisig authority delegation** - a Capo contract would get much more complicated if it 
 * contained multisig logic.  Instead, the governance authority for the Capo can be delegated to a 
 * standalone multi-sig contract, which can contain all (and only) the multi-sig logic.  Separating the 
 * responsibilities makes each part simpler, easing the process of ensuring each part is doing its job 
 * perfectly :pray:
 * 
 * A Capo subclass can decorate an existing entry from `super.roles()` with additional strategy entries, or can add 
 * extra roles useful in the operation of its application.
 * 
 * The Capo base class provides utilities for creating and using UUT's, or **unique utility tokens**, 
 * which are non-fungible assets that can form a positive linkage between the Capo (which should 
 * normally retain a reference to that UUT) and any delegate; that delegate is most commonly another 
 * contract script also referenced within the roles() definition, with a selected strategy.  
 * 
 * Architecturally, UUTs provide a simple and unique handle for the Capo to use as a  **required transaction element** 
 * in key operational activities (like updating the charter details); so that the delegate holding the UUT is entrusted to
 * approved the UUT's inclusion in a transaction, with all the policy-enforcement implicated on the other end of the 
 * delegation.
 * 
 * 
 * See the {@link Capo | Capo base class} and {@link StellarContract} for addition context.
 * @public
 */

export class DefaultCapo<
    MinterType extends DefaultMinter = DefaultMinter,
    CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs,
    configType extends CapoBaseConfig = CapoBaseConfig
> extends Capo<MinterType, CDT, configType> {
    contractSource() {
        return contract;
    }

    // // @Activity.redeemer
    // updatingCharter() : isActivity {
    //     return this.updatingDefaultCharter()
    // }
    get roles(): RoleMap {
        return {
            govAuthority: variantMap<AuthorityPolicy>({
                address: {
                    delegateClass: AddressAuthorityPolicy,
                    partialConfig: {
                        uut: PARAM_IMPLIED,
                    },
                    validateConfig(args): strategyValidation {
                        const { rev, uut } = args;
                        const errors: ErrorMap = {};
                        if (!rev) errors.rev = ["required"];
                        if (!uut) errors.uut = ["required"];
                        if (Object.keys(errors).length > 0) return errors;

                        return undefined;
                    },
                },
                multisig: {
                    delegateClass: MultisigAuthorityPolicy,
                    partialConfig: {
                        uut: PARAM_IMPLIED,
                    },
                    validateConfig(args): strategyValidation {
                        const { rev, uut } = args;
                        const errors: ErrorMap = {};
                        if (!rev) errors.rev = ["required"];
                        if (!uut) errors.uut = ["required"];
                        if (Object.keys(errors).length > 0) return errors;

                        return undefined;
                    },
                },
            }),
            mintDelegate: variantMap<BasicMintDelegate>({
                default: {
                    delegateClass: BasicMintDelegate,
                    partialConfig: {},
                    validateConfig(args): strategyValidation {
                        return undefined;
                    },
                },
            }),
        };
    }

    @datum
    mkDatumCharterToken(args: CDT): InlineDatum {
        //!!! todo: make it possible to type these datum helpers more strongly

        console.log("--> mkDatumCharter", args);
        const {
            Datum: { CharterToken: hlCharterToken },
            RelativeDelegateLink: hlRelativeDelegateLink,
        } = this.scriptProgram!.types;
        let {
            uutName,
            strategyName,
            reqdAddress: canRequireAddr,
            addressesHint = [],
        } = args.govAuthorityLink;

        const OptAddr = Option(Address);
        const needsAddr = new OptAddr(canRequireAddr);

        const t = new hlCharterToken(
            new hlRelativeDelegateLink(
                uutName,
                strategyName,
                needsAddr,
                addressesHint
            )
        );
        return Datum.inline(t._toUplcData());
    }

    async txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum) {
        const charterDatum = await this.readDatum<
            DefaultCharterDatumArgs<AuthorityPolicySettings>
        >("CharterToken", datum);

        console.log("add charter authz", charterDatum);
        const { strategyName, uutName, addressesHint, reqdAddress } =
            charterDatum.govAuthorityLink;
        debugger;
        const authZor = await this.connectDelegateWith<AuthorityPolicy>(
            "govAuthority",
            charterDatum.govAuthorityLink
        );
        const authZorUtxo = await authZor.txnMustFindAuthorityToken(tcx);
        authZor.txnGrantAuthority(tcx, authZorUtxo);
        return tcx;
    }

    @txn
    //@ts-expect-error - typescript can't seem to understand that
    //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
    async mkTxnMintCharterToken(
        charterDatumArgs: PartialDefaultCharterDatumArgs<CDT>,
        existingTcx?: hasSelectedDelegates
    ): Promise<StellarTxnContext | never> {
        console.log(
            `minting charter from seed ${this.configIn.seedTxn.hex.substring(
                0,
                12
            )}…@${this.configIn.seedIndex}`
        );
        const { strategyName } = charterDatumArgs.govAuthorityLink;

        const initialTcx = existingTcx || this.withDelegates({});
        return this.mustGetContractSeedUtxo().then(async (seedUtxo) => {
            const tcx = await this.minter!.txnWithUuts(
                initialTcx,
                ["authZor"],
                seedUtxo,
                "govAuthority"
            );

            // console.log("-> B", txAsString(tcx.tx));
            const { authZor } = tcx.state.uuts;
            const delegateParams = this.txnGetSelectedDelegateConfig(
                tcx,
                "govAuthority"
            );

            // debugger
            const govAuthorityConfig = this.txnMustConfigureSelectedDelegate<
                AuthorityPolicy,
                "govAuthority"
            >(tcx, "govAuthority" as const);

            const govAuthorityLink = {
                strategyName,
                uutName: authZor.name,
            };
            //@ts-expect-error - typescript can't seem to understand that
            //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
            const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
                ...charterDatumArgs,
                govAuthorityLink,
            };
            const datum = this.mkDatumCharterToken(fullCharterArgs);

            const output = new TxOutput(this.address, this.tvCharter(), datum);
            output.correctLovelace(this.networkParams);

            tcx.addInput(seedUtxo);
            tcx.addOutputs([output]);

            console.log(
                " ---------------- CHARTER MINT ---------------------\n",
                txAsString(tcx.tx)
            );
            // debugger

            return this.minter!.txnMintingCharter(tcx, {
                owner: this.address,
                authZor,
            });
        });
    }

    @Activity.redeemer
    updatingCharter(): // args: CDT
    isActivity {
        const { RelativeDelegateLink: hlRelativeDelegateLink, Redeemer } =
            this.scriptProgram!.types;
        // let {uut, strategyName, reqdAddress: canRequireAddr, addressesHint=[]} = args.govAuthority

        // // const {Option} = this.scriptProgram.types;
        // debugger
        // const OptAddr = Option(Address);
        // const needsAddr = new OptAddr(canRequireAddr);

        const t = new Redeemer.updatingCharter();
        // args.govDelegate,
        // new hlRelativeDelegateLink(uut, strategyName, needsAddr, addressesHint)

        return { redeemer: t._toUplcData() };
    }

    @txn
    async mkTxnUpdateCharter(
        args: CDT,
        tcx: StellarTxnContext = new StellarTxnContext()
    ): Promise<StellarTxnContext> {
        return this.txnUpdateCharterUtxo(
            tcx,
            this.updatingCharter(),
            this.mkDatumCharterToken(args)
        );
    }

    requirements() {
        return hasReqts({
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
                impl: "txnMintCharterToken()",
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

            "can mint other tokens, on the authority of the Charter token": {
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
        });
    }
}
