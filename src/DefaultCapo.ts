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
    TxInput,
    DatumHash,
    ByteArray,
    Assets,
    TxId,
    UplcData,
    Signature,
    AssetClass,
    ValidatorHash,
    MintingPolicyHash,
} from "@hyperionbt/helios";

import type { Wallet } from "@hyperionbt/helios";

import type { isActivity } from "./StellarContract.js";

import {
    Activity,
    datum,
    partialTxn,
    StellarContract,
    txn,
} from "./StellarContract.js";
import type { InlineDatum } from "./HeliosPromotedTypes.js";

import { StellarTxnContext } from "./StellarTxnContext.js";

//@ts-expect-error
import contract from "./DefaultCapo.hl";
export { contract };
// import contract from "./BaselineCapo.hl";
import { Capo } from "./Capo.js";
import type {
    CapoBaseConfig,
    hasBootstrappedConfig,
    hasUutContext,
    rootCapoConfig,
} from "./Capo.js";
import type { DefaultMinter } from "./minting/DefaultMinter.js";
import {
    delegateRoles,
    defineRole,
    delegateLinkSerializer,
} from "./delegation/RolesAndDelegates.js";
import type {
    ErrorMap,
    RelativeDelegateLink,
    strategyValidation,
} from "./delegation/RolesAndDelegates.js";
import { BasicMintDelegate } from "./minting/BasicMintDelegate.js";
import { AnyAddressAuthorityPolicy } from "./authority/AnyAddressAuthorityPolicy.js";
import { txAsString } from "./diagnostics.js";
import { MultisigAuthorityPolicy } from "./authority/MultisigAuthorityPolicy.js";
import { hasReqts } from "./Requirements.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import { UnspecializedCapo } from "./UnspecializedCapo.js";
import { NoMintDelegation } from "./minting/NoMintDelegation.js";
import { CapoHelpers } from "./CapoHelpers.js";
import { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import { StellarDelegate } from "./delegation/StellarDelegate.js";

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
 * full RelativeDelegateLink structure instead - e.g. with a different `strategy` and
 * `config`; this type wouldn't be involved in that case.
 *
 * @typeParam SC - the type of StellarContract targeted for delegation
 * @public
 **/
export type MinimalDelegateLink<SC extends StellarDelegate<any>> = Required<
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
 * Customizing Datum and Activity
 * 
 * The baseline contract script can have specialized Datum and Activity ("redeemer")
 * definitions by subclassing DefaultCapo with a `get specializedCapo()`.  This
 * should be an imported helios script having `module specializedCapo` at the top.
 * It MUST export Datum and Activity enums, with variants matching those in the provided 
 * baseline/unspecializedCapo module.  
 * 
 * A customized Datum::validateSpend(self, ctx) -\> Bool method
 * should be defined, even if it doesn't put constraints on spending Datum.  
 * If it does choose to add hard constraints, note that this method doesn't
 * have access to the Activity ("redeemer") type.  It's a simple place to express simple
 * constraints on spending a custom Datum that only needs one 'spendingDatum' 
 * activity.  
 * 
 * A customized Activity: allowActivity(self, datum, ctx) -\> Bool method
 * has access to both the redeemer (in self), as well as Datum and the transaction 
 * context.  In this method, use self.switch\{...\} to implement activity-specific
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
    static parseConfig(jsonConfig) {
        const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } = jsonConfig;

        const outputConfig: any = {};
        if (mph) outputConfig.mph = MintingPolicyHash.fromHex(mph.bytes);
        if (rev) outputConfig.rev = BigInt(rev);
        if (seedTxn) outputConfig.seedTxn = TxId.fromHex(seedTxn.bytes);
        if (seedIndex) outputConfig.seedIndex = BigInt(seedIndex);
        if (rootCapoScriptHash)
            outputConfig.rootCapoScriptHash = ValidatorHash.fromHex(
                rootCapoScriptHash.bytes
            );

        return outputConfig;
    }

    /**
     * indicates any specialization of the baseline Capo types
     * @remarks
     *
     * The default implementation is an UnspecialiedCapo, which
     * you can use as a template for your specialized Capo.
     *
     * Every specalization MUST include Datum and Activity ("redeemer") enums,
     * and MAY include additional functions, and methods on Datum / Activity.
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

    /**
     * indicates any specialization of the baseline Capo types
     * @remarks
     *
     * The default implementation is an UnspecialiedCapo, which
     * you can use as a template for your specialized Capo.
     *
     * Every specalization MUST include Datum and  Activity ("redeemer") enums,
     * and MAY include additional functions, and methods on Datum / Activity.
     *
     * The datum enum SHOULD have a validateSpend(self, datum, ctx) method.
     *
     * The activity enum SHOULD have an allowActivity(self, datum, ctx) method.
     *
     * @public
     **/
    get capoHelpers(): HeliosModuleSrc {
        return CapoHelpers;
    }

    importModules(): HeliosModuleSrc[] {
        const parentModules = super.importModules();
        const specializedCapo = this.specializedCapo;
        if (specializedCapo.moduleName !== "specializedCapo") {
            throw new Error(
                `${this.constructor.name}: specializedCapo() module name must be ` +
                    `'specializedCapo', not '${specializedCapo.moduleName}'\n  ... in ${specializedCapo.srcFile}`
            );
        }

        return [specializedCapo, this.capoHelpers, ...parentModules];
    }

    // // @Activity.redeemer
    // updatingCharter() : isActivity {
    //     return this.updatingDefaultCharter()
    // }

    /**
     * Use the `delegateRoles` getter instead
     * @remarks
     *
     * this no-op method is a convenience for Stellar Contracts maintainers
     * and intuitive developers using autocomplete.  Including it enables an entry
     * in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
     * @deprecated but please keep as a kind of redirect
     * @public
     **/
    getDelegateRoles() {
        throw new Error(`use the delegateRoles getter instead`); // for javascript devs
    }

    get delegateRoles() {
        return delegateRoles({
            govAuthority: defineRole("capoGov", AuthorityPolicy, {
                address: {
                    delegateClass: AnyAddressAuthorityPolicy,
                    validateConfig(args): strategyValidation {
                        const { rev, tn, addrHint } = args;

                        const errors: ErrorMap = {};
                        if (!rev) errors.rev = ["required"];
                        if (!tn?.length) errors.tn = ["(token-name) required"];

                        if (!addrHint?.length)
                            errors.addrHint = ["destination address required"];
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
            mintDelegate: defineRole("mintDgt", BasicMintDelegate, {
                default: {
                    delegateClass: BasicMintDelegate,
                    partialConfig: {},
                    validateConfig(args): strategyValidation {
                        return undefined;
                    },
                },
                // undelegated: { ... todo ... }
            }),
        });
    }

    /**
     * Performs a validation of all critical delegate connections
     * @remarks
     *
     * Checks that each delegate connection is correct and that the underlying
     * scripts for those delegates have not been modified in unplanned ways.
     *
     * Every Capo subclass that adds new delegate types SHOULD implement
     * this method, performing any checks needed to verify the scripts underlying
     * those delegate-types.  It should return `Promise.all([ super(), ...myOwnChecks])`.
     * @public
     **/
    async verifyCoreDelegates() {
        const rcsh = this.configIn?.rootCapoScriptHash;
        if (rcsh && !rcsh.eq(this.address.validatorHash!)) {
            console.error(
                `expected: ` +
                    rcsh.hex +
                    `\n  actual: ` +
                    this.address.validatorHash!.hex
            );

            throw new Error(
                `${this.constructor.name}: the leader contract script '${this.scriptProgram?.name}', or one of its dependencies, has been modified`
            );
        }
        this.connectMinter();

        const charter = await this.findCharterDatum();
        const { govAuthorityLink, mintDelegateLink } = charter;

        return Promise.all([
            this.connectDelegateWithLink("govAuthority", govAuthorityLink),
            this.connectDelegateWithLink("mintDelegate", mintDelegateLink),
        ]);
    }

    mkOnchainDelegateLink(dl: RelativeDelegateLink<any>) {
        const { RelativeDelegateLink: hlRelativeDelegateLink } =
            this.onChainTypes;

        let {
            uutName,
            strategyName,
            delegateValidatorHash,
            config,
            // reqdAddress: canRequireAddr,
            // addrHint = [],
        } = dl;
        const OptValidator = Option(ValidatorHash);
        // const needsAddr = new OptAddr(canRequireAddr);

        return new hlRelativeDelegateLink(
            uutName,
            strategyName,
            new OptValidator(delegateValidatorHash)
            // config //!!! todo - support inline config if/when needed
            // needsAddr,
            // addrHint
        );
    }

    @datum
    mkDatumCharterToken(args: CDT): InlineDatum {
        //!!! todo: make it possible to type these datum helpers more strongly
        //  ... at the interface to Helios
        console.log("--> mkDatumCharter", args);
        const { CharterToken: hlCharterToken } = this.onChainDatumType;

        const govAuthority = this.mkOnchainDelegateLink(args.govAuthorityLink);
        const mintDelegate = this.mkOnchainDelegateLink(args.mintDelegateLink);
        const t = new hlCharterToken(govAuthority, mintDelegate);
        return Datum.inline(t._toUplcData());
    }

    async findCharterDatum() {
        return this.mustFindCharterUtxo().then(async (ctUtxo: TxInput) => {
            const charterDatum = await this.readDatum<DefaultCharterDatumArgs>(
                "CharterToken",
                ctUtxo.origOutput.datum as InlineDatum
            );
            if (!charterDatum) throw Error(`invalid charter UTxO datum`);
            return charterDatum;
        });
    }

    async findGovDelegate() {
        const charterDatum = await this.findCharterDatum();
        const capoGovDelegate = await this.connectDelegateWithLink<AuthorityPolicy>(
            "govAuthority",
            charterDatum.govAuthorityLink
        );
        console.log(
            "finding charter's govDelegate via link",
            charterDatum.govAuthorityLink
        );

        return capoGovDelegate
    }

    async txnAddGovAuthority<TCX extends StellarTxnContext<any>>(
        tcx: TCX
    ): Promise<TCX & StellarTxnContext<any>> {
        const capoGovDelegate = await this.findGovDelegate()
        console.log(
            "adding charter's govAuthority",
        );

        return capoGovDelegate.txnGrantAuthority(tcx);
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

    mkFullConfig(
        baseConfig: CapoBaseConfig
    ): CapoBaseConfig & configType & rootCapoConfig {
        const pCfg = this.partialConfig || {};

        const newClass = this.constructor;
        // @ts-expect-error using constructor in this way
        const newCapo = newClass.bootstrapWith({
            setup: this.setup,
            config: { ...baseConfig, ...pCfg },
        });
        return {
            ...baseConfig,
            ...pCfg,
            rootCapoScriptHash: newCapo.compiledScript.validatorHash,
        } as configType & CapoBaseConfig & rootCapoConfig;
    }

    async mkTxnMintingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext<any>,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        seedUtxo?: TxInput | undefined,
        roles?: RM
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
        const tcx = await super.mkTxnMintingUuts(
            initialTcx,
            uutPurposes,
            seedUtxo,
            roles
        );
        const tcx2 = await this.txnMustUseCharterUtxo(tcx, "refInput");
        return this.txnAddMintDelegate(tcx);
    }

    async getMintDelegate() {
        const charterDatum = await this.findCharterDatum();

        return this.connectDelegateWithLink(
            "mintDelegate",
            charterDatum.mintDelegateLink
        );
    }

    async getGovDelegate() {
        const charterDatum = await this.findCharterDatum();

        return this.connectDelegateWithLink(
            "govDelegate",
            charterDatum.govAuthorityLink
        );
    }

    async txnAddMintDelegate<TCX extends StellarTxnContext<any>>(
        tcx: TCX
    ): Promise<TCX> {
        const mintDelegate = await this.getMintDelegate();

        await mintDelegate.txnGrantAuthority(tcx);
        return tcx;
    }

    /**
     * {@inheritdoc Capo.mkTxnMintCharterToken}
     * @public
     **/
    @txn
    //@ts-expect-error - typescript can't seem to understand that
    //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
    async mkTxnMintCharterToken<TCX extends StellarTxnContext<any>>(
        charterDatumArgs: MinimalDefaultCharterDatumArgs<CDT>,
        existingTcx?: TCX
    ): Promise<
        | never
        | (TCX &
              hasUutContext<
                  "govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"
              > &
              hasBootstrappedConfig<CapoBaseConfig & configType>)
    > {
        if (this.configIn)
            throw new Error(
                `this contract suite is already configured and can't be re-chartered`
            );

        type hasBsc = hasBootstrappedConfig<CapoBaseConfig & configType>;
        //@ts-expect-error yet another case of seemingly spurious "could be instantiated with a different subtype" (actual fixes welcome :pray:)
        const initialTcx: TCX & hasBsc =
            existingTcx || (new StellarTxnContext(this.myActor) as hasBsc);

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
            initialTcx.state.bsc = bsc;
            initialTcx.state.bootstrappedConfig = JSON.parse(
                JSON.stringify(bsc, delegateLinkSerializer)
            );
            const fullScriptParams = (this.contractParams =
                this.getContractScriptParams(bsc));
            this.configIn = bsc;

            this.scriptProgram = this.loadProgramScript(fullScriptParams);

            const tcx = await this.minter!.txnWillMintUuts(
                initialTcx,
                ["capoGov", "mintDgt"],
                seedUtxo,
                {
                    govAuthority: "capoGov",
                    mintDelegate: "mintDgt",
                }
            );
            const { capoGov, govAuthority, mintDgt, mintDelegate } =
                tcx.state.uuts;
            {
                if (govAuthority !== capoGov)
                    throw new Error(`assertion can't fail`);
            }

            const govAuthorityLink = await this.txnCreateDelegateLink<
                AuthorityPolicy,
                "govAuthority"
            >(tcx, "govAuthority", charterDatumArgs.govAuthorityLink);

            const mintDelegateLink = await this.txnCreateDelegateLink<
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

            const charterOut = new TxOutput(
                this.address,
                this.tvCharter(),
                datum
            );
            charterOut.correctLovelace(this.networkParams);

            tcx.addInput(seedUtxo);
            tcx.addOutputs([charterOut]);

            console.log(
                " ---------------- CHARTER MINT ---------------------\n",
                txAsString(tcx.tx)
            );
            // debugger

            return this.minter!.txnMintingCharter(tcx, {
                owner: this.address,
                capoGov, // same as govAuthority,
                mintDgt,
            });
        });
    }

    @Activity.redeemer
    updatingCharter(): // args: CDT
    isActivity {
        const { updatingCharter } = this.onChainActivitiesType;
        // let {uut, strategyName, reqdAddress: canRequireAddr, addrHint=[]} = args.govAuthority

        // // const {Option} = this.onChainTypes;
        // debugger
        // const OptAddr = Option(Address);
        // const needsAddr = new OptAddr(canRequireAddr);
        const t = new updatingCharter();
        // args.govDelegate,
        // new hlRelativeDelegateLink(uut, strategyName, needsAddr, addrHint)

        return { redeemer: t._toUplcData() };
    }

    @txn
    async mkTxnUpdateCharter(
        args: CDT,
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor)
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
