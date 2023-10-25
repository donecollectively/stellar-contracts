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
// import contract from "./BaselineCapo.hl";
import { Capo, CapoBaseConfig, hasBootstrappedConfig } from "./Capo.js";
import { DefaultMinter } from "./DefaultMinter.js";
import {
    ErrorMap,
    isRoleMap,
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
import { AnyAddressAuthorityPolicy } from "./authority/AnyAddressAuthorityPolicy.js";
import { DelegateDetailSnapshot } from "./delegation/RolesAndDelegates.js";
import { txAsString } from "./diagnostics.js";
import { MultisigAuthorityPolicy } from "./authority/MultisigAuthorityPolicy.js";
import { hasReqts } from "./Requirements.js";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import { UnspecializedCapo } from "./UnspecializedCapo.js";
import { NoMintDelegation } from "./delegation/NoMintDelegation.js";

/**
 * Schema for Charter Datum, which allows state to be stored in the Leader contract
 * together with it's primary or "charter" utxo.
 * @public
 **/
export type DefaultCharterDatumArgs = {
    govAuthorityLink: RelativeDelegateLink<AuthorityPolicy>;
    mintDelegateLink: RelativeDelegateLink<BasicMintDelegate>;
};

/**
 * Includes key details needed to create a delegate link
 * @remarks
 *
 * Requires a `strategyName` and may include a partial `config` for the targeted SC contract type
 *
 * Because delegates can be of different subtypes, the SC and `config` are typically
 * generic at the type level.  When using the `config` entry for a specific delegate subtype,
 * additional details might be needed (not expected to be the norm).
 *
 * uutName can't be specified in this structure because creating a delegate link
 * should use txnMustGetSeedUtxo() instead, minting a new UUT for the purpose.
 * If you seek to reuse an existing uutName, probably you're modifying an existing
 * full RelativeDelegateLink structure instead - e.g. with a different `strategy`,
 * `config`, and/or `reqdAddress`; this type wouldn't be involved in that case.
 *
 * @typeParam SC - the type of StellarContract targeted for delegation
 * @public
 **/
export type MinimalDelegateLink<SC extends StellarContract<any>> = Required<
    Pick<RelativeDelegateLink<SC>, "strategyName">
> &
    Partial<Omit<RelativeDelegateLink<SC>, "uutName">>;

/**
 * Establishes minimum requirements for creating a charter-datum
 * @remarks
 *
 * requires a baseline configuration for the gov authority and mint delegate.
 *
 * @typeParam DAT - a charter-datum type that may have additional properties in case of advanced extensions to DefaultCapo.
 * @public
 **/
export type MinimalDefaultCharterDatumArgs<
    DAT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs
> = {
    // RemainingMinimalCharterDatumArgs<DAT> & {
    govAuthorityLink: MinimalDelegateLink<AuthorityPolicy>;
    mintDelegateLink?: MinimalDelegateLink<BasicMintDelegate>;
};
//!!! todo enable "other" datum args - (ideally, those other than delegate-link types) to be inlcuded in MDCDA above.
export type RemainingMinimalCharterDatumArgs<
    DAT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs
> = Omit<DAT, "govAuthorityLink" | "mintDelegateLink">;

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
 * Customizing Datum and Redeemer
 * 
 * The baseline contract script can have specialized Datum and Redeemer
 * definitions by subclassing DefaultCapo with a `get specializedCapo()`.  This
 * should be an imported helios script having `module specializedCapo` at the top.
 * It MUST export Datum and Redeemer enums, with variants matching those in the provided 
 * baseline/unspecializedCapo module.  
 * 
 * A customized Datum::validateSpend(self, ctx) -> Bool method
 * should be defined, even if it doesn't put constraints on spending Datum.  
 * If it does choose to add hard constraints, note that this method doesn't
 * have access to the Redeemer.  It's a simple place to express simple
 * constraints on spending a custom Datum that only needs one 'spendingDatum' 
 * activity.  
 * 
 * A customized Redeemer: allowActivity(self, datum, ctx) -> Bool method
 * has access to both the redeemer (in self), as well as Datum and the transaction 
 * context.  In this method, use self.switch{...} to implement activity-specific
 * validations.
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

    /**
     * indicates any specialization of the baseline Capo types
     * @remarks
     * 
     * The default implementation is an UnspecialiedCapo, which
     * you can use as a template for your specialized Capo.
     * 
     * Every specalization MUST include a Datum and a Redeemer,
     * and MAY include additional functions, and methods on Datum / Redeemer.
     * 
     * The datum SHOULD have a validateSpend(self, datum, ctx) method.
     * 
     * The redeemer SHOULD have an allowActivity(self, datum, ctx) method.
     *
     * @public
     **/
    get specializedCapo(): HeliosModuleSrc {
        return UnspecializedCapo;
    }

    importModules(): HeliosModuleSrc[] {
        const parentModules = super.importModules();
        const specializedCapo = this.specializedCapo;
        return [specializedCapo, ...parentModules];
    }

    // // @Activity.redeemer
    // updatingCharter() : isActivity {
    //     return this.updatingDefaultCharter()
    // }
    get roles() {
        return isRoleMap({
            govAuthority: variantMap<AuthorityPolicy>({
                address: {
                    delegateClass: AnyAddressAuthorityPolicy,
                    validateConfig(args): strategyValidation {
                        const { rev, uutID } = args;
                        const errors: ErrorMap = {};
                        if (!rev) errors.rev = ["required"];
                        if (!uutID) errors.uutID = ["required"];
                        if (Object.keys(errors).length > 0) return errors;

                        return undefined;
                    },
                },
                multisig: {
                    delegateClass: MultisigAuthorityPolicy,
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
        });
    }

    extractDelegateLink(dl: RelativeDelegateLink<any>) {
        const { RelativeDelegateLink: hlRelativeDelegateLink } =
            this.scriptProgram!.types;

        let {
            uutName,
            strategyName,
            reqdAddress: canRequireAddr,
            addressesHint = [],
        } = dl;
        const OptAddr = Option(Address);
        const needsAddr = new OptAddr(canRequireAddr);

        return new hlRelativeDelegateLink(
            uutName,
            strategyName,
            needsAddr,
            addressesHint
        );
    }

    @datum
    mkDatumCharterToken(args: CDT): InlineDatum {
        //!!! todo: make it possible to type these datum helpers more strongly
        //  ... at the interface to Helios
        console.log("--> mkDatumCharter", args);
        const {
            Datum: { CharterToken: hlCharterToken },
        } = this.scriptProgram!.types;

        const govAuthority = this.extractDelegateLink(args.govAuthorityLink);
        const mintDelegate = this.extractDelegateLink(args.mintDelegateLink);
        const t = new hlCharterToken(govAuthority, mintDelegate);
        return Datum.inline(t._toUplcData());
    }

    async txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum) {
        //!!! verify both datums are read properly
        const charterDatum = await this.readDatum<DefaultCharterDatumArgs>(
            "CharterToken",
            datum
        );

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

    // getMinterParams() {
    //     const { seedTxn, seedIdx } = this.configIn
    //     return { seedTxn, seedIdx }
    // }

    /**
     * should emit a complete configuration structure that can reconstitute a contract (suite) after its first bootstrap transaction
     * @remarks
     *
     * mkFullConfig is called during a bootstrap transaction.  The default implementation works
     * for subclasses as long as they use CapoBaseConfig for their config type.  Or, if they're
     * instantiated with a partialConfig that augments CapoBaseConfig with concrete details that
     * fulfill their extensions to the config type.
     *
     * If you have a custom mkBootstrapTxn() that uses techniques to explicitly add config
     * properties not provided by your usage of `partialConfig` in the constructor, then you'll
     * need to provide a more specific impl of mkFullConfig().  It's recommended that you
     * call super.mkFullConfig() from your impl.
     * @param baseConfig - receives the BaseConfig properties: mph, seedTxn and seedIndex
     * @public
     **/

    mkFullConfig(baseConfig: CapoBaseConfig): CapoBaseConfig & configType {
        const pCfg = this.partialConfig || {};
        return { ...baseConfig, ...pCfg } as configType & CapoBaseConfig;
    }

    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * detailed remarks
     * @param ‹pName› - descr
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    @txn
    //@ts-expect-error - typescript can't seem to understand that
    //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
    async mkTxnMintCharterToken<TCX extends StellarTxnContext>(
        charterDatumArgs: MinimalDefaultCharterDatumArgs<CDT>,
        existingTcx?: TCX
    ): Promise<
        never | (TCX & hasBootstrappedConfig<CapoBaseConfig & configType>)
    > {
        if (this.configIn)
            throw new Error(
                `this contract suite is already configured and can't be re-chartered`
            );

        type hasBsc = hasBootstrappedConfig<CapoBaseConfig & configType>;
        //@ts-expect-error yet another case of seemingly spurious "could be instantiated with a different subtype" (actual fixes welcome :pray:)
        const initialTcx: TCX & hasBsc =
            existingTcx || (new StellarTxnContext() as hasBsc);

        return this.txnMustGetSeedUtxo(initialTcx, "charter bootstrapping", [
            "charter",
        ]).then(async (seedUtxo) => {
            const { txId: seedTxn, utxoIdx } = seedUtxo.outputId;
            const seedIndex = BigInt(utxoIdx);

            this.connectMintingScript({ seedIndex, seedTxn });

            const { mintingPolicyHash: mph } = this.minter!;
            const rev = this.getCapoRev();
            const bsc = this.mkFullConfig({
                mph,
                rev,
                seedTxn,
                seedIndex,
            });
            initialTcx.state.bootstrappedConfig = bsc;
            const fullScriptParams = (this.contractParams =
                this.getContractScriptParams(bsc));
            this.configIn = bsc;

            this.scriptProgram = this.loadProgramScript(fullScriptParams);

            const tcx = await this.minter!.txnWithUuts(
                initialTcx,
                ["authZor", "mintDgt"],
                seedUtxo,
                {
                    govAuthority: "authZor",
                    mintDelegate: "mintDgt",
                }
            );
            const { authZor, govAuthority } = tcx.state.uuts;
            {
                if (govAuthority !== authZor)
                    throw new Error(`assertion can't fail`);
            }

            const govAuthorityLink = this.txnCreateDelegateLink<
                AuthorityPolicy,
                "govAuthority"
            >(tcx, "govAuthority", charterDatumArgs.govAuthorityLink);
            
            const mintDelegateLink = this.txnCreateDelegateLink<
                BasicMintDelegate,
                "mintDelegate"
            >(tcx, "mintDelegate", charterDatumArgs.mintDelegateLink);
            //@ts-expect-error - typescript can't seem to understand that
            //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
            const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
                ...charterDatumArgs,
                govAuthorityLink,
                mintDelegateLink,
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
                authZor, // same as govAuthority,
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
