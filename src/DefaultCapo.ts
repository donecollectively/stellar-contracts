import {
    Address,
    AssetClass,
    Assets,
    ByteArray,
    Crypto,
    Datum,
    DatumHash,
    MintingPolicyHash,
    //@ts-expect-error
    Option,
    Program,
    Signature,
    Tx,
    TxId,
    TxInput,
    TxOutput,
    UplcProgram,
    ValidatorHash,
    Value,
    UplcData,
    HInt,
    bytesToHex,
    bytesToText,
    textToBytes,
} from "@hyperionbt/helios";

import type { ScriptHash, Wallet } from "@hyperionbt/helios";

import type { isActivity } from "./StellarContract.js";
import { mkUutValuesEntries, mkValuesEntry } from "./utils.js";

import {
    Activity,
    datum,
    partialTxn,
    StellarContract,
    txn,
} from "./StellarContract.js";
import type { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";

import {
    StellarTxnContext,
    type anyState,
    type hasAddlTxns,
    type hasSeedUtxo,
    type otherAddlTxnNames,
} from "./StellarTxnContext.js";

//@ts-expect-error
import contract from "./DefaultCapo.hl";
export { contract };
// import contract from "./BaselineCapo.hl";
import { Capo } from "./Capo.js";
import type {
    CapoBaseConfig,
    hasBootstrappedConfig,
    hasUutContext,
    hasUutCreator,
    rootCapoConfig,
    UutCreationAttrs,
    UutCreationAttrsWithSeed,
    uutPurposeMap,
} from "./Capo.js";

import type { DatumAdapter } from "./DatumAdapter.js";
import type { OffchainSettingsType, OnchainSettingsType, SettingsAdapterFor } from "./CapoSettingsTypes.js";
import { DefaultSettingsAdapter, type RealNumberSettingsMap } from "./DefaultSettingsAdapter.js";

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
import { dumpAny, txAsString } from "./diagnostics.js";
import { MultisigAuthorityPolicy } from "./authority/MultisigAuthorityPolicy.js";
import { hasReqts } from "./Requirements.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import { UnspecializedCapo } from "./UnspecializedCapo.js";
import { NoMintDelegation } from "./minting/NoMintDelegation.js";
import { CapoHelpers } from "./CapoHelpers.js";
import { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import { StellarDelegate } from "./delegation/StellarDelegate.js";
import { UutName } from "./delegation/UutName.js";
import type { Expand, ExpandRecursively } from "./testing/types.js";

/**
 * Schema for Charter Datum, which allows state to be stored in the Leader contract
 * together with it's primary or "charter" utxo.
 * @public
 **/
export interface DefaultCharterDatumArgs {
    spendDelegateLink: RelativeDelegateLink<StellarDelegate<any>>;
    spendInvariants: RelativeDelegateLink<StellarDelegate<any>>[];
    settingsUut: UutName | number[];
    mintDelegateLink: RelativeDelegateLink<BasicMintDelegate>;
    mintInvariants: RelativeDelegateLink<StellarDelegate<any>>[];
    govAuthorityLink: RelativeDelegateLink<AuthorityPolicy>;
};

// defines a data-transport format that can be serialized to UPLC
// by the helios "off-chain type" for the corresponding on-chain data type
export type OnchainContractSettingsData<
    CAPO_TYPE extends DefaultCapo<any, any, any>
> = {
    data: Array<{ name: string; microInt: bigint }>;
}
export type OnchainSettingsDataTransport<
    CAPO_TYPE extends DefaultCapo<any, any, any>
> = {
    data: CAPO_TYPE extends {
        readSettingsDatum: ( (...args: [infer transportType, ...any]) => any)
    } ? transportType : never;
}


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
    mintDelegateLink: MinimalDelegateLink<BasicMintDelegate>;
    spendDelegateLink: MinimalDelegateLink<StellarDelegate<any>>;
    mintInvariants: MinimalDelegateLink<StellarDelegate<any>>[];
    spendInvariants: MinimalDelegateLink<StellarDelegate<any>>[];
};
//!!! todo enable "other" datum args - (ideally, those other than delegate-link types) to be inlcuded in MDCDA above.
export type RemainingMinimalCharterDatumArgs<
    DAT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs
> = Omit<DAT, "govAuthorityLink" | "mintDelegateLink" | "spendDelegateLink">;

export type HeldAssetsArgs = {
    purposeId?: string;
    purpose?: string;
};

interface RawGenericSettings {
    data:{meaning:number}
}

// class GenericSettingsDetails extends DatumAdapter<RawGenericSettings, GenericSettingsDetails> {
//     meaning: number;
//     datumName = "SettingsData";
//     constructor(raw: RawGenericSettings) {
//         super(raw)
//         this.meaning = raw.data.meaning;
//     }
//     toAppType(raw: RawGenericSettings) {
//         return new GenericSettingsDetails(raw.data)
//     }
//     toOnchainDatum() : Datum {

//     }
// }

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
 * have access to the Activity ("redeemer") type.  It's a simple place that can
 * only express simple constraints on spending ANY utxo from the contract.  
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
        settingsType extends  OffchainSettingsType<any> = RealNumberSettingsMap,
        MinterType extends DefaultMinter = DefaultMinter,
        CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs,
        configType extends CapoBaseConfig = CapoBaseConfig,
    >
    extends Capo<settingsType, MinterType, CDT, configType>
    implements hasUutCreator
{
    contractSource() {
        return contract;
    }
    static parseConfig(rawJsonConfig: any) {
        const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } =
            rawJsonConfig;

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
     * Every specialization MUST include Datum and Activity ("redeemer") enums,
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
     * Every specialization MUST include Datum and  Activity ("redeemer") enums,
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

    @Activity.redeemer
    activityUpdatingCharter(): // args: CDT
    isActivity {
        const updatingCharter = this.mustGetActivity("updatingCharter");
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

    @Activity.redeemer
    activityUpdatingSettings(): // args: CDT
    isActivity {
        const updatingSettings = this.mustGetActivity("updatingSettings");
        const t = new updatingSettings();

        return { redeemer: t._toUplcData() };
    }

    /**
     * USE THE `delegateRoles` GETTER INSTEAD
     * @remarks
     *
     * - this no-op method is a convenience for Stellar Contracts maintainers
     *   and intuitive developers using autocomplete.
     * - Including it enables an entry
     *   in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
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

            spendDelegate: defineRole("spendDgt", StellarDelegate<any>, {
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
        if (rcsh && !rcsh.eq(this.validatorHash!)) {
            console.error(
                `expected: ` +
                    rcsh.hex +
                    `\n  actual: ` +
                    this.validatorHash!.hex
            );

            throw new Error(
                `${this.constructor.name}: the leader contract script '${this.scriptProgram?.name}', or one of its dependencies, has been modified`
            );
        }

        const charter = await this.findCharterDatum();
        const { govAuthorityLink, mintDelegateLink, spendDelegateLink } =
            charter;

        return Promise.all([
            this.connectDelegateWithLink("govAuthority", govAuthorityLink),
            this.connectDelegateWithLink("mintDelegate", mintDelegateLink),
            this.connectDelegateWithLink("spendDelegate", spendDelegateLink),
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
    async mkDatumCharterToken(args: CDT): Promise<Datum> {
        //!!! todo: make it possible to type these datum helpers more strongly
        //  ... at the interface to Helios
        console.log("--> mkDatumCharter", args);
        const { CharterToken: hlCharterToken } = this.onChainDatumType;

        // ugh, we've been here before - weaving back and forth between
        // library essentials and application-layer types makes things hard
        // and complicated.  -> use the spending delegate and separate UTXO
        // for config data, instead of keeping config data in the charter datum.
        const govAuthority = this.mkOnchainDelegateLink(args.govAuthorityLink);
        const mintDelegate = this.mkOnchainDelegateLink(args.mintDelegateLink);
        const spendDelegate = this.mkOnchainDelegateLink(
            args.spendDelegateLink
        );
        const mintInvariants = args.mintInvariants.map((dl) => {
            return this.mkOnchainDelegateLink(dl);
        });
        const spendInvariants = args.spendInvariants.map((dl) => {
            return this.mkOnchainDelegateLink(dl);
        });
        const settingsUutNameBytes = args.settingsUut instanceof UutName ?
            textToBytes(args.settingsUut.name)
            : args.settingsUut;
        const t = new hlCharterToken(
            spendDelegate,
            spendInvariants,
            settingsUutNameBytes,
            mintDelegate,
            mintInvariants,
            govAuthority
        );
        return Datum.inline(t._toUplcData());
    }

    @datum
    mkDatumScriptReference() {
        const { ScriptReference: hlScriptReference } = this.onChainDatumType;

        // this is a simple enum tag, indicating the role of this utxo: holding the script
        // on-chain, so it can be used in later transactions without bloating those txns
        // every time.
        const t = new hlScriptReference();
        return Datum.inline(t._toUplcData());
    }

    // XX@ts-expect-error on the default return type - override this method with
    //    more specific adapter
    initSettingsAdapter() {
        return new DefaultSettingsAdapter(this)
    }

    @datum
    //@ts-expect-error we got too fancy for typescript, it seems.
    mkDatumSettingsData(
        settings: OffchainSettingsType<this>
    ) : Datum{
        const adapter = this.settingsAdapter
        return adapter.toOnchainDatum(settings) as Datum
    }

    async readSettingsDatum(
        parsedDatum: OnchainSettingsType<this>
    ) : Promise<OffchainSettingsType<this>> {
        //@Xts-expect-error - it actually uses the settingsAdapter from a subclass,
        //   but it seems Typescript can't tell how that works, given the way it's declared.
        //   ??? fixes welcome
        return this.settingsAdapter.fromOnchainDatum(parsedDatum)
    }

    //@ts-expect-error - method should be overridden
    mkInitialSettings() : OffchainSettingsType<this> {
        //@ts-expect-error - method should be overridden
        return { meaning: 42 }
    }

    // settingsDataToUplc(config: ContractSettingsData<this>) {
    //     const {RealnumSettingsValueV1} = this.onChainTypes;
    //     return
    //     //  new ListData([
    //         //@ts-expect-error
    //         Object.entries(config).map(([k, v]) => {
    //             debugger
    //             return new ConfigValue(k, BigInt(v) * 1_000_000n)._toUplcData();
    //         })
    //     // ])
    //     // return new MapData([
    //     //     [new ByteArrayData(textToBytes("empty")), new ByteArrayData(
    //     //         textToBytes(config.empty)
    //     //     )],
    //     //     [new ByteArrayData(textToBytes("hi")), new ByteArrayData(
    //     //         textToBytes("there")
    //     //     )]
    //     // ])
    // }

    async findCharterDatum(currentCharterUtxo?: TxInput) {
        if (!currentCharterUtxo) {
            currentCharterUtxo = await this.mustFindCharterUtxo();
        }
        const charterDatum = await this.readDatum<DefaultCharterDatumArgs>(
            "CharterToken",
            currentCharterUtxo.origOutput.datum as InlineDatum
        );
        if (!charterDatum) throw Error(`invalid charter UTxO datum`);
        return charterDatum;
    }

    async findGovDelegate() {
        const charterDatum = await this.findCharterDatum();
        const capoGovDelegate =
            await this.connectDelegateWithLink<AuthorityPolicy>(
                "govAuthority",
                charterDatum.govAuthorityLink
            );
        console.log(
            "finding charter's govDelegate via link",
            charterDatum.govAuthorityLink
        );

        return capoGovDelegate;
    }

    async txnAddGovAuthority<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX> {
        const capoGovDelegate = await this.findGovDelegate();
        console.log("adding charter's govAuthority");

        return capoGovDelegate.txnGrantAuthority(tcx);
    }

    // getMinterParams() {
    //     const { seedTxn, seedIdx } = this.configIn
    //     return { seedTxn, seedIdx }
    // }

    // async txnBurnUuts<
    //     existingTcx extends StellarTxnContext<any>,
    // >(
    //     initialTcx: existingTcx,
    //     uutNames: UutName[],
    // ): Promise<existingTcx> {
    //     const minter = this.connectMinter();
    //     const tcx = await minter.txnBurnUuts(
    //         initialTcx,
    //         uutNames,
    //     );

    //     const tcx2 = await this.txnMustUseCharterUtxo(tcx, "refInput");
    //     return this.txnAddMintDelegate(tcx2);
    // }

    async getMintDelegate() {
        const charterDatum = await this.findCharterDatum();

        return this.connectDelegateWithLink(
            "mintDelegate",
            charterDatum.mintDelegateLink
        );
    }

    async getSpendDelegate() {
        const charterDatum = await this.findCharterDatum();

        return this.connectDelegateWithLink(
            "spendDelegate",
            charterDatum.spendDelegateLink
        );
    }

    async getGovDelegate() {
        const charterDatum = await this.findCharterDatum();

        return this.connectDelegateWithLink(
            "govDelegate",
            charterDatum.govAuthorityLink
        );
    }

    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * The returned transaction context has `state.bootstrappedConfig` for
     * capturing the details for reproducing the contract's settings and on-chain
     * address.
     *
     * @param charterDatumArgs - initial details for the charter datum
     * @param existinTcx - any existing transaction context
     * @typeParam TCX - inferred type of a provided transaction context
     * @public
     **/
    // @txn
    async mkTxnMintCharterToken<
        TCX extends undefined | StellarTxnContext<anyState>,
        TCX2 = TCX extends StellarTxnContext<infer TCXT>
            ? StellarTxnContext<TCXT>
            : {}
    >(
        charterDatumArgs: MinimalDefaultCharterDatumArgs<CDT>,
        existingTcx?: TCX
    ) {
        if (this.configIn)
            throw new Error(
                `this contract suite is already configured and can't be re-chartered`
            );

        type hasBsc = hasBootstrappedConfig<CapoBaseConfig & configType>;
        //@ts-expect-error yet another case of seemingly spurious "could be instantiated with a different subtype" (actual fixes welcome :pray:)
        const initialTcx: TCX2 & hasBsc =
            existingTcx || (new StellarTxnContext(this.myActor) as hasBsc);

        const promise = this.txnMustGetSeedUtxo(
            initialTcx,
            "charter bootstrapping",
            ["charter"]
        ).then(async (seedUtxo) => {
            const { txId: seedTxn, utxoIdx } = seedUtxo.outputId;
            const seedIndex = BigInt(utxoIdx);

            const minter = await this.connectMintingScript({
                seedIndex,
                seedTxn,
            });
            const { mintingPolicyHash: mph } = minter;

            // const rev = this.getCapoRev();
            const csp = this.getContractScriptParams(
                (this.configIn || this.partialConfig) as configType
            );

            const bsc = {
                ...csp,
                mph,
                seedTxn,
                seedIndex,
            } as configType;
            this.loadProgramScript({ ...csp, mph });
            bsc.rootCapoScriptHash = this.compiledScript.validatorHash;

            initialTcx.state.bsc = bsc;
            initialTcx.state.bootstrappedConfig = JSON.parse(
                JSON.stringify(bsc, delegateLinkSerializer)
            );
            const fullScriptParams = (this.contractParams =
                this.getContractScriptParams(bsc));
            this.configIn = bsc;

            this.scriptProgram = this.loadProgramScript(fullScriptParams);

            const uutPurposes = ["capoGov", "mintDgt", "spendDgt", "set"];
            const tcx = await this.txnWillMintUuts(
                initialTcx,
                uutPurposes,
                { usingSeedUtxo: seedUtxo },
                {
                    govAuthority: "capoGov",
                    mintDelegate: "mintDgt",
                    spendDelegate: "spendDgt",
                }
            );
            const { uuts } = tcx.state;
            //     capoGov,
            //     govAuthority, // same
            //     mintDgt, // same as mintDelegate
            //     spendDelegate
            // } = tcx.state.uuts;
            if (uuts.govAuthority !== uuts.capoGov) {
                throw new Error(`assertion can't fail`);
            }

            const govAuthority = await this.txnCreateDelegateLink<
                AuthorityPolicy,
                "govAuthority"
            >(tcx, "govAuthority", charterDatumArgs.govAuthorityLink);

            const mintDelegate = await this.txnCreateDelegateLink<
                BasicMintDelegate,
                "mintDelegate"
            >(tcx, "mintDelegate", charterDatumArgs.mintDelegateLink);

            const spendDelegate = await this.txnCreateDelegateLink<
                StellarDelegate<any>,
                "spendDelegate"
            >(tcx, "spendDelegate", charterDatumArgs.spendDelegateLink);

            //@ts-expect-error - typescript can't seem to understand that
            //    <Type> - govAuthorityLink + govAuthorityLink is <Type> again
            const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
                ...charterDatumArgs,
                settingsUut: uuts.set,
                govAuthorityLink: govAuthority,
                mintDelegateLink: mintDelegate,
                spendDelegateLink: spendDelegate,
            };
            const datum = await this.mkDatumCharterToken(fullCharterArgs);

            const charterOut = new TxOutput(
                this.address,
                this.tvCharter(),
                datum
                // this.compiledScript
            );
            charterOut.correctLovelace(this.networkParams);

            tcx.addInput(seedUtxo);
            tcx.addOutputs([charterOut]);

            // creates an addl txn that stores a refScript in the delegate;
            //   that refScript could be stored somewhere else instead (e.g. the Capo)
            //   but for now it's in the delegate addr.
            const tcx2 = await this.txnMkAddlRefScriptTxn(
                tcx, "mintDelegate", mintDelegate.delegate.compiledScript
            );

            const tcx3 = await this.txnMkAddlRefScriptTxn(
                tcx2,
                "capo",
                this.compiledScript
            );
            const tcx4 = await this.txnMkAddlRefScriptTxn(
                tcx3,
                "minter",
                minter.compiledScript
            );
            console.log(
                " ---------------- CHARTER MINT ---------------------\n",
                txAsString(tcx4.tx, this.networkParams)
            );

            // type Normalize<T> =
            //     T extends (...args: infer A) => infer R ? (...args: Normalize<A>) => Normalize<R>  
            //     : T extends any ? {[K in keyof T]: Normalize<T[K]>} : never

            const config = this.mkInitialSettings()
            const tcx5 = this.txnAddSettingsOutput(tcx4, config)
            
            // debugger

            // mints the charter, along with the capoGov and mintDgt UUTs.
            // TODO: if there are additional UUTs needed for other delegates, include them here.
            const minting = this.minter.txnMintingCharter(tcx5, {
                owner: this.address,
                capoGov: uuts.capoGov, // same as govAuthority,
                mintDelegate: uuts.mintDelegate,
                spendDelegate: uuts.spendDelegate,
                settingsUut: uuts.set,
            });
            return minting;
        });
        return promise;
    }
    
    async findSettingsDatum({
        settingsUtxo, charterUtxo
    }: {
        settingsUtxo? : TxInput, charterUtxo? : TxInput
    } = {}): Promise<settingsType> {
        const foundSettingsUtxo = settingsUtxo || await this.findSettingsUtxo(charterUtxo);
        const data = await this.readDatum(
            this.settingsAdapter,
            foundSettingsUtxo.origOutput.datum as InlineDatum
        );        
        if (!data) throw Error(`missing or invalid settings UTxO datum`);
        return data
    }

    txnAddSettingsOutput<TCX extends StellarTxnContext>(
        tcx: TCX,
        config: OffchainSettingsType<this>
    ): TCX {
        const settingsOut = new TxOutput(
            this.address,
            this.uutsValue(tcx.state.uuts.set),
            this.mkDatumSettingsData(config)
        );
        settingsOut.correctLovelace(this.networkParams);
        return tcx.addOutput(settingsOut);
    }

    /**
     * Creates an additional reference-script-creation txn
     * @remarks
     *
     * Creates a txn for reference-script creation, and
     * adds it to the current transaction context to also be submitted.
     *
     * The reference script is stored in the Capo contract with a special
     * Datum, and it can be used in future transactions to save space and fees.
     *
     * @param tcx - the transaction context
     * @param scriptName - the name of the script, used in the addlTxn's  name
     * @param script - the script to be stored onchain for future reference
     * @public
     **/
    async txnMkAddlRefScriptTxn<
        TCX extends StellarTxnContext<anyState>,
        scriptName extends string,
    >(
        tcx: TCX,
        scriptName: scriptName,
        script: UplcProgram
    ): Promise<
        hasAddlTxns<
            `refScript${Capitalize<scriptName>}` | otherAddlTxnNames<TCX>,
            TCX
        >  // & unwrapped
    > {
        const refScriptUtxo = new TxOutput(
            this.address,
            new Value(this.ADA(0n)),
            this.mkDatumScriptReference(),
            script
        );
        refScriptUtxo.correctLovelace(this.networkParams);
        const nextTcx = new StellarTxnContext(this.myActor).addOutput(
            refScriptUtxo
        );

        const sn = scriptName[0].toUpperCase() + scriptName.slice(1);

        return tcx.includeAddlTxn(`refScript${sn}`, {
            description: `creates on-chain reference script for ${scriptName}`,
            moreInfo: "saves txn fees and txn space in future txns",
            optional: false,
            tcx: nextTcx,
        });
    }

    /**
     * Attach the given script by reference to a transaction
     * @remarks
     *
     * If the given script is found in the Capo's known list of reference scripts,
     * it is used to attach the refScript to the transaction context.  Otherwise,
     * the script's bytes are added directly to the transaction.
     *
     * The script name is expected to be found in the Capo's refScript datum.
     * If a different name is found, a mismatch warning is emitted.
     *
     * If the given program is not found in the Capo's refScript datum, a
     * missing-refScript warning is emitted, and the program is added directly
     * to the transaction.  If this makes the transaction too big, the console
     * warning will be followed by a thrown error during the transaction's
     * wallet-submission sequence.
     * @param program - the UPLC program to attach to the script
     * @public
     **/
    @partialTxn
    async txnAttachScriptOrRefScript<TCX extends StellarTxnContext>(
        tcx: TCX,
        program: UplcProgram = this.compiledScript
    ): Promise<TCX> {
        let expectedVh: string = this.getProgramHash(program);
        const { purpose: expectedPurpose } = program.properties;
        const isCorrectRefScript = (txin: TxInput) => {
            const refScript = txin.origOutput.refScript;
            if (!refScript) return false;
            const { purpose } = refScript.properties || {};
            if (purpose && purpose != expectedPurpose) return false;

            const foundHash = this.getProgramHash(refScript);
            return foundHash == expectedVh;
        };
        if (tcx.txRefInputs.find(isCorrectRefScript)) {
            console.warn("suppressing second add of refScript");
            return tcx;
        }
        const scriptReferences = await this.findScriptReferences();
        // for (const [txin, refScript] of scriptReferences) {
        //     console.log("refScript", dumpAny(txin));
        // }
        
        const matchingScriptRefs = scriptReferences.find(([txin, refScript]) =>
            isCorrectRefScript(txin)
        );
        if (!matchingScriptRefs) {
            console.warn(
                `missing refScript in Capo ${this.address.toBech32()} for expected script hash ${expectedVh}; adding script directly to txn`
            );
            // console.log("------------------- NO REF SCRIPT")
            return tcx.addScriptProgram(program);
        }
        // console.log("------------------- REF SCRIPT")
        return tcx.addRefInput(matchingScriptRefs[0], program);
    }

    private getProgramHash(program: UplcProgram) {
        let hash: string;
        try {
            hash = program.validatorHash.toString();
        } catch (e1: any) {
            try {
                hash = program.mintingPolicyHash.toString();
            } catch (e2: any) {
                try {
                    hash = program.stakingValidatorHash.toString();
                } catch (e3: any) {
                    debugger;
                    throw new Error(
                        `can't get script hash from program:` +
                            `\n  - tried validatorHash: ${e1.message}` +
                            `\n  - tried mintingPolicyHash: ${e2.message}` +
                            `\n  - tried stakingValidatorHash: ${e3.message}`
                    );
                }
            }
        }
        return hash;
    }

    async findScriptReferences() {
        const utxos = await this.network.getUtxos(this.address);
        type TxoWithScriptRefs = [TxInput, any];
        // console.log("finding script refs", utxos);
        const utxosWithDatum = (
            await Promise.all(
                utxos.map((utxo) => {
                    const { datum } = utxo.origOutput;
                    // console.log("datum", datum);
                    if (!datum) return null;
                    return this.readDatum("ScriptReference", datum)
                        .catch(() => {
                            // console.log("failed to parse")
                            return null;
                        })
                        .then((scriptRef) => {
                            if (!scriptRef) return null;
                            // console.log("scriptRef", scriptRef);
                            return [utxo, scriptRef] as TxoWithScriptRefs;
                        });
                })
            )
        ).filter((x) => !!x) as TxoWithScriptRefs[];

        return utxosWithDatum;
    }

    @txn
    async mkTxnUpdateCharter(
        args: CDT,
        activity: isActivity = this.activityUpdatingCharter(),
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor)
    ): Promise<StellarTxnContext> {
        console.log("update charter", { activity });
        return this.txnUpdateCharterUtxo(
            tcx,
            activity,
            await this.mkDatumCharterToken(args)
        );
    }

    async findSettingsUtxo(charterUtxo? : TxInput) {
        const chUtxo = charterUtxo || await this.mustFindCharterUtxo();
        const charterDatum = await this.findCharterDatum(chUtxo);
        const uutName = charterDatum.settingsUut;
        const uutValue = this.uutsValue(
            uutName);

        return await this.mustFindMyUtxo("set-uut", 
            this.mkTokenPredicate(uutValue)
        );
    }

    @txn
    async mkTxnUpdateOnchainSettings<TCX extends StellarTxnContext>(
        data: OffchainSettingsType<this>, 
        settingsUtxo? : TxInput,
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor)
    ): Promise<TCX> {
        // uses the charter ref input
        settingsUtxo = settingsUtxo || await this.findSettingsUtxo();

        console.log("HI")
        const tcx2 = await this.txnAddGovAuthority(tcx);
        const tcx2a = await this.txnMustUseCharterUtxo(tcx2, "refInput");
        const tcx2b = await this.txnAttachScriptOrRefScript(tcx2a);
        const tcx3 = tcx2b.addInput(
            settingsUtxo, 
            this.activityUpdatingSettings()
        ).addOutput(
            new TxOutput(
                this.address, 
                settingsUtxo.origOutput.value, 
                this.mkDatumSettingsData(data)
            )
        );
        return tcx3 as TCX & typeof tcx3
    }

    /**
     * Installs a new Minting delegate to the Capo contract
     * @remarks
     *
     * Updates the policy by which minting under the contract's minting policy is allowed.
     *
     * This supports the evolution of logic for token-minting.
     * Note that updating the minting policy can't modify or interfere with constraints
     * enforced by any existing mintInvariants.
     *
     * Normally, the existing minting delegate is signalled to be Retiring its delegation token,
     * burning it as part of the update transaction and cleaning things up.  The minUtxo from
     * the old delegation UUT will be recycled for use in the new delegate.
     *
     * @param delegateInfo - the new minting delegate's info
     * @param options - allows a forced update, which leaves a dangling delegation token
     *   in the old minting delegate, but allows the new minting delegate to take over without
     *   involving the old delegate in the transaction.
     * @param tcx - any existing transaction context
     * @public
     **/
    @txn
    async mkTxnUpdatingMintDelegate<
        DT extends StellarDelegate,
        thisType extends DefaultCapo<settingsType, MinterType, CDT, configType>
    >(
        this: thisType,
        delegateInfo: MinimalDelegateLink<DT> & {
            strategyName: string &
                keyof thisType["delegateRoles"]["mintDelegate"]["variants"];
        },
        options: {
            forcedUpdate?: true;
        } = {},
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor)
    ): Promise<StellarTxnContext> {
        const currentCharter = await this.mustFindCharterUtxo();
        const currentDatum = await this.findCharterDatum(currentCharter);
        const mintDelegate = await this.getMintDelegate();
        const { minter } = this;
        const tcxWithSeed = await this.addSeedUtxo(tcx);
        const uutOptions: UutCreationAttrs = options.forcedUpdate
            ? {
                  omitMintDelegate: true,
                  minterActivity: minter.activityForcingNewMintDelegate({
                      seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
                      seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
                  }),
              }
            : {
                  usingMintDelegateActivity: mintDelegate.activityReplacingMe({
                      seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
                      seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
                      purpose: "mintDgt",
                  }),
                  additionalMintValues: this.mkValuesBurningDelegateUut(
                      currentDatum.mintDelegateLink
                  ),
                  returnExistingDelegateToScript: false, // so it can be burned without a txn imbalance
              };
        debugger;
        const tcx2 = await this.txnMintingUuts(
            // todo: make sure seed-utxo is selected with enough minUtxo ADA for the new UUT name.
            // const seedUtxo = await this.txnMustGetSeedUtxo(tcx, "mintDgt", ["mintDgt-XxxxXxxxXxxx"]);
            tcxWithSeed,
            ["mintDgt"],
            uutOptions,
            {
                mintDelegate: "mintDgt",
            }
        );
        const newMintDelegate = await this.txnCreateDelegateLink<
            DT,
            "mintDelegate"
        >(tcx2, "mintDelegate", delegateInfo);
        // currentDatum.mintDelegateLink);

        // const spendDelegate = await this.txnCreateDelegateLink<
        //     StellarDelegate<any>,
        //     "spendDelegate"
        // >(tcx, "spendDelegate", charterDatumArgs.spendDelegateLink);

        //@ts-expect-error "could be instantiated with different subtype"
        const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
            ...currentDatum,
            mintDelegateLink: newMintDelegate,
        };
        return this.mkTxnUpdateCharter(
            fullCharterArgs,
            undefined,
            await this.txnAddGovAuthority(tcx2)
        );
        // const datum = await this.mkDatumCharterToken(fullCharterArgs);

        // const charterOut = new TxOutput(
        //     this.address,
        //     this.tvCharter(),
        //     datum
        //     // this.compiledScript
        // );

        // return tcx2.addOutput(charterOut);
    }

    mkValuesBurningDelegateUut(current: RelativeDelegateLink<any>) {
        return [mkValuesEntry(current.uutName, -1n)];
    }

    @txn
    async mkTxnUpdatingSpendDelegate<
        DT extends StellarDelegate,
        thisType extends DefaultCapo<settingsType, MinterType, CDT, configType>
    >(
        this: thisType,
        delegateInfo: MinimalDelegateLink<DT> & {
            strategyName: string &
                keyof thisType["delegateRoles"]["spendDelegate"]["variants"];
        },
        options: {
            forcedUpdate?: true;
        } = {},
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor)
    ): Promise<StellarTxnContext> {
        const currentCharter = await this.mustFindCharterUtxo();
        const currentDatum = await this.findCharterDatum(currentCharter);
        const spendDelegate = await this.getSpendDelegate();
        const tcxWithSeed = await this.addSeedUtxo(tcx);
        const uutOptions: UutCreationAttrs = {
            omitMintDelegate: true,
            minterActivity: this.minter.activityCreatingNewSpendDelegate({
                seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
                seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
                ...(options.forcedUpdate
                    ? {}
                    : {
                          replacingUut: spendDelegate.authorityTokenName,
                      }),
            }),
            ...(options.forcedUpdate
                ? {
                      returnExistingDelegateToScript: false, // so it can be burned without a txn imbalance
                  }
                : {
                      additionalMintValues: this.mkValuesBurningDelegateUut(
                          currentDatum.spendDelegateLink
                      ),
                  }),
        };
        debugger;
        const tcx2 = await this.txnMintingUuts(
            // todo: make sure seed-utxo is selected with enough minUtxo ADA for the new UUT name.
            // const seedUtxo = await this.txnMustGetSeedUtxo(tcx, "mintDgt", ["mintDgt-XxxxXxxxXxxx"]);
            tcxWithSeed,
            ["spendDgt"],
            uutOptions,
            {
                spendDelegate: "spendDgt",
            }
        );
        const newSpendDelegate = await this.txnCreateConfiguredDelegate<
            DT,
            "spendDelegate"
        >(tcx2, "spendDelegate", delegateInfo);
        // currentDatum.mintDelegateLink);

        const tcx2a = options.forcedUpdate
            ? tcx2
            : await spendDelegate.txnGrantAuthority(
                  tcx2,
                  spendDelegate.activityReplacingMe({
                      seedTxn: tcxWithSeed.state.seedUtxo.outputId.txId,
                      seedIndex: tcxWithSeed.state.seedUtxo.outputId.utxoIdx,
                      purpose: "spendDgt",
                  }),
                  false
              );
        const tcx2b = await newSpendDelegate.delegate.txnReceiveAuthorityToken(
            tcx2a,
            newSpendDelegate.delegate.tvAuthorityToken()
        );

        debugger

        //@ts-expect-error "could be instantiated with different subtype"
        const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
            ...currentDatum,
            spendDelegateLink: newSpendDelegate,
        };
        return this.mkTxnUpdateCharter(
            fullCharterArgs,
            undefined,
            await this.txnAddGovAuthority(tcx2b)
        );
    }

    @txn
    async mkTxnAddingMintInvariant<
        DT extends StellarDelegate,
        thisType extends DefaultCapo<settingsType, MinterType, CDT, configType>
    >(
        this: thisType,
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor),
        delegateInfo: MinimalDelegateLink<DT> & {
            strategyName: string &
                keyof thisType["delegateRoles"]["mintDelegate"];
        }
    ): Promise<StellarTxnContext> {
        const currentDatum = await this.findCharterDatum();

        // const seedUtxo = await this.txnMustGetSeedUtxo(tcx, "mintDgt", ["mintDgt-XxxxXxxxXxxx"]);
        const tcx2 = await this.txnMintingUuts(
            await this.addSeedUtxo(tcx),
            ["mintDgt"],
            {},
            {
                mintDelegate: "mintDgt",
            }
        );
        const mintDelegate = await this.txnCreateDelegateLink<
            DT,
            "mintDelegate"
        >(tcx2, "mintDelegate", delegateInfo);
        // currentDatum.mintDelegateLink);

        // const spendDelegate = await this.txnCreateDelegateLink<
        //     StellarDelegate<any>,
        //     "spendDelegate"
        // >(tcx, "spendDelegate", charterDatumArgs.spendDelegateLink);

        //@ts-expect-error "could be instantiated with different subtype"
        const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
            ...currentDatum,
            mintInvariants: [...currentDatum.mintInvariants, mintDelegate],
        };
        const datum = await this.mkDatumCharterToken(fullCharterArgs);

        const charterOut = new TxOutput(
            this.address,
            this.tvCharter(),
            datum
            // this.compiledScript
        );

        return tcx2.addOutput(charterOut);
    }

    @txn
    async mkTxnAddingSpendInvariant<
        DT extends StellarDelegate,
        thisType extends DefaultCapo<settingsType, MinterType, CDT, configType>
    >(
        this: thisType,
        tcx: StellarTxnContext = new StellarTxnContext(this.myActor),
        delegateInfo: MinimalDelegateLink<DT> & {
            strategyName: string &
                keyof thisType["delegateRoles"]["spendDelegate"];
        }
    ) {
        const currentDatum = await this.findCharterDatum();

        // const seedUtxo = await this.txnMustGetSeedUtxo(tcx, "mintDgt", ["mintDgt-XxxxXxxxXxxx"]);
        const tcx2 = await this.txnMintingUuts(
            await this.addSeedUtxo(tcx),
            ["spendDgt"],
            {},
            {
                spendDelegate: "spendDgt",
            }
        );
        const spendDelegate = await this.txnCreateDelegateLink<
            DT,
            "spendDelegate"
        >(tcx2, "spendDelegate", delegateInfo);
        // currentDatum.mintDelegateLink);

        // const spendDelegate = await this.txnCreateDelegateLink<
        //     StellarDelegate<any>,
        //     "spendDelegate"
        // >(tcx, "spendDelegate", charterDatumArgs.spendDelegateLink);

        //@ts-expect-error "could be instantiated with different subtype"
        const fullCharterArgs: DefaultCharterDatumArgs & CDT = {
            ...currentDatum,
            spendInvariants: [...currentDatum.spendInvariants, spendDelegate],
        };
        const datum = await this.mkDatumCharterToken(fullCharterArgs);

        const charterOut = new TxOutput(
            this.address,
            this.tvCharter(),
            datum
            // this.compiledScript
        );

        return tcx2.addOutput(charterOut);
    }

    async findUutSeedUtxo(uutPurposes: string[], tcx: StellarTxnContext<any>) {
        //!!! make it big enough to serve minUtxo for the new UUT(s)
        const uutSeed = this.mkValuePredicate(BigInt(42_000), tcx);
        return this.mustFindActorUtxo(
            `seed-for-uut ${uutPurposes.join("+")}`,
            uutSeed,
            tcx
        );
    }

    /**
     * Adds UUT minting to a transaction
     * @remarks
     *
     * Constructs UUTs with the indicated purposes, and adds them to the contract state.
     * This is a useful generic capability to support any application-specific purpose.
     *
     * The provided transaction context must have a seedUtxo - use {@link DefaultCapo.addSeedUtxo | addSeedUtxo()} to add one
     * from the current user's wallet. The seed utxo is consumed, so it can never be used again; its
     * value will be returned to the user wallet.  All the uuts named in the uutPurposes argument will
     * be minted from the same seedUtxo, and will share the same suffix, because it is derived from the
     * seedUtxo's outputId.
     *
     * This method uses a generic uutMinting activity in the transaction by default, which may
     * fail if the mint delegate has disabled that generic minting.   In this case, add an `options.activity`
     * matching an app-specific activity/redeemer.
     *
     * It's recommended to create custom activities in the minting delegate, to go with your
     * application's use-cases for minting UUTs.  To include the seedUtxo details in the transaction,
     * you can follow the SeedAttrs pattern  seen in {@link DefaultMinter.activityMintingUuts | activityMintingUuts()},
     * using the StellarTxnContext's {@link StellarTxnContext.getSeedAttrs | getSeedAttrs()}
     * method to access the seedUtxo details.
     *
     * The mintingUuts\{...\} activity defined in the on-chain specialized mint delegate demonstrates
     * the inclusion of seedUtxo details in the activity/redeemer type, and the use of those details in
     * its on-chain call to `validateUutMinting()`.
     *
     * If additional mints or burns are needed in the transaction, they can be included in
     * `options.additionalMintValues`.  See {@link mkValuesEntry | mkValuesEntry()} to create
     * these.  In this case, you'll need to provide a `options.activity`, whose on-chain
     * validation should ensure that all-and-only the expected values are minted.
     *
     * The returnExistingDelegate option can be used if needed to prevent a burned delegate
     * token from being returned to the delegate contract's script address, creating an imbalanced txn.
     *
     * @param initialTcx - an existing transaction context
     * @param uutPurposes - a set of purpose-names (prefixes) for the UUTs to be minted
     * @param options - additional options for the minting operation.  In particular, you likely want
     * to provide a custom activity instead of the default uutMinting activity.
     * @param roles - a map of role-names to purpose-names
     * @public
     **/
    @partialTxn
    async txnMintingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext & hasSeedUtxo,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        options: UutCreationAttrs = {},
        //@ts-expect-error
        roles: RM = {} as Record<ROLES, purposes>
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
        const {
            usingSeedUtxo,
            additionalMintValues = [],
            usingMintDelegateActivity,
            omitMintDelegate = false,
            minterActivity,
            returnExistingDelegateToScript = true,
        } = options;
        const mintDelegate = await this.getMintDelegate();
        const { seedUtxo } = initialTcx.state;

        const tcx = await this.txnWillMintUuts(
            initialTcx,
            uutPurposes,
            {
                usingSeedUtxo: seedUtxo,
                // additionalMintValues,
                // existingDelegateReplacementActivity,
            },
            roles
        );

        if (omitMintDelegate) {
            if (usingMintDelegateActivity)
                throw new Error(
                    `omitMintDelegate and usingMintDelegateActivity are mutually exclusive`
                );
            if (!minterActivity) {
                throw new Error(
                    `txnMintingUuts: omitMintDelegate requires a minterActivity to be specified\n` +
                        `  ... this indicates an activity in the MINTER (not the minting delegate), ` +
                        ` ... the minter should be able to honor that activity/redeemer.`
                );
            }

            // directly mint the UUTs, without involving the mint delegate
            const tcx2 = await this.minter.txnMIntingWithoutDelegate(
                tcx,
                [
                    ...mkUutValuesEntries(tcx.state.uuts),
                    ...additionalMintValues,
                ],
                minterActivity
            );
            return tcx2;
        }
        if (additionalMintValues.length && !usingMintDelegateActivity) {
            throw new Error(
                `additionalMintValues requires a custom activity provided by your mint delegate specialization`
            );
        }

        const dgtActivity =
            usingMintDelegateActivity ||
            mintDelegate.activityMintingUuts({
                purposes: uutPurposes,
                ...tcx.getSeedAttrs(),
            });

        // const tcx2 = await mintDelegate.txnGenericMintingUuts(
        //     tcx,
        //     uutPurposes,
        //     mintDelegateActivity
        // );

        const tcx2 = await this.minter.txnMintWithDelegateAuthorizing(
            tcx,
            [...mkUutValuesEntries(tcx.state.uuts), ...additionalMintValues],
            mintDelegate,
            dgtActivity,
            returnExistingDelegateToScript
        );
        console.log(
            "    🐞🐞 @end of txnMintingUuts",
            dumpAny(tcx2, this.networkParams)
        );
        return tcx2;
        // const tcx4 = await mintDelegate.txnMintingUuts(tcx3,
        //     uutPurposes,
        //     seedUtxo,
        //     roles
        // );

        // return this.txnAddMintDelegate(tcx4);
    }

    /**
     * Finds a free seed-utxo from the user wallet, and adds it to the transaction
     * @remarks
     *
     * The seedUtxo will be consumed in the transaction, so it can never be used
     * again; its value will be returned to the user wallet.
     *
     * The seedUtxo is needed for UUT minting, and the transaction is typed with
     * the presence of that seed (found in tcx.state.seedUtxo).
     * @public
     **/
    async addSeedUtxo<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX & hasSeedUtxo> {
        const seedUtxo = await this.findUutSeedUtxo([], tcx);

        const tcx2 = tcx.addInput(seedUtxo) as TCX & hasSeedUtxo;
        tcx2.state.seedUtxo = seedUtxo;
        return tcx2;
    }

    /**
     * Adds UUT types to the transaction context
     * @remarks
     *
     * adds tcx.state.uut entries for each purpose.
     *
     * also adds a second uut entry for each role-name found in the roles map, corresponding to the uut entry for its purpose.
     *
     * NOTE: this method doesn't add a minting instruction to the transaction, so that
     * all the minting/burning needed for the txn can (because it must) be done in one minting instruction.
     *
     * If the uuts being minted are the only minting/burning needed in the transaction, then
     * you can use {@link txnMintingUuts | txnMintingUuts()} instead of this method.
     *
     * @param tcx - the transaction context
     * @param uutPurposes - a list of short names for the UUTs (will be augmented with unique suffixes)
     * @param usingSeedUtxo - the seed utxo to be used for minting the UUTs (consumed in the transaction, and controls the suffixes)
     * @param roles - a map of role-names to purpose-names
     * @typeParam ‹pName› - descr (for generic types)
     * @public
     **/
    @partialTxn
    async txnWillMintUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends string & keyof RM = string & keyof RM
    >(
        tcx: existingTcx,
        uutPurposes: purposes[],
        { usingSeedUtxo }: Pick<UutCreationAttrsWithSeed, "usingSeedUtxo">,
        //@ts-expect-error
        roles: RM = {} as Record<string, purposes>
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
        const { txId, utxoIdx } = usingSeedUtxo.outputId;

        const { blake2b } = Crypto;

        const uutMap: uutPurposeMap<ROLES | purposes> = Object.fromEntries(
            uutPurposes.map((uutPurpose) => {
                const idx = new HInt(utxoIdx).toCbor();
                const txoId = txId.bytes.concat(["@".charCodeAt(0)], idx);
                // console.warn("&&&&&&&& txoId", bytesToHex(txoId));
                const uutName = new UutName(
                    uutPurpose,
                    `${uutPurpose}-${bytesToHex(blake2b(txoId).slice(0, 6))}`
                );
                return [uutPurpose, uutName];
            })
        ) as uutPurposeMap<ROLES | purposes>;
        for (const [role, uutPurpose] of Object.entries(roles)) {
            uutMap[role] = uutMap[uutPurpose as string];
        }

        if (!tcx.state) tcx.state = { uuts: {} };
        tcx.state.uuts = {
            ...tcx.state.uuts,
            ...uutMap,
        };

        return tcx as hasUutContext<ROLES | purposes> & existingTcx;
    }

    requirements() {
        return hasReqts({
            "positively governs all administrative actions": {
                purpose: "to maintain clear control by an abstract entity",
                details: [
                    // descriptive details of the requirement (not the tech):
                    "A governance delegate is defined during contract creation",
                    "The contract's policy for allowing governance actions is abstract, ",
                    "  ... enforced only by a delegation pattern. ",
                    "Thus, the Capo doesn't contain any of the policy details.",
                    "The delegate can be evolved through governance action",
                ],
                mech: [
                    // descriptive details of the chosen mechanisms for implementing the reqts:
                    "uses a 'charter' token specialized for this contract",
                    "the charter token has a govDgt (governance delegate) in its Datum structure",
                    "the gov delegate's token can provide authorization for administrative actions",
                    "the charter Datum is updated when needed to reflect a new gov delegation config",
                ],
                requires: [
                    "has a unique, permanent charter token",
                    "has a unique, permanent treasury address",
                    // "the trustee threshold is enforced on all administrative actions",
                    // "the trustee group can be changed",
                    "the charter token is always kept in the contract",
                    "the charter details can be updated by authority of the capoGov-* token",
                    "can mint other tokens, on the authority of the charter's registered mintDgt- token",
                    "can handle large transactions with reference scripts",
                ],
            },

            "has a singleton minting policy": {
                purpose: "to mint various tokens authorized by the treasury",
                details: [
                    "A chosen minting script is bound deterministically to the contract constellation",
                    "Its inaugural (aka 'initial Charter' or 'Charter Mint') transaction creates a charter token",
                    "The minting script can issue further tokens approved by the Capo's minting delegate",
                    "The minting script does not need to concern itself with details of the delegate's approval",
                ],
                mech: [
                    "has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter",
                    "makes a different address depending on (txId, outputIndex) parameters of the Minting script",
                ],
                requires: [
                    "can mint other tokens, on the authority of the charter's registered mintDgt- token",
                ],
            },

            "the charter details can be updated by authority of the capoGov-* token":
                {
                    purpose:
                        "to support behavioral changes over time by repointing the delegate links",
                    details: [
                        "The Capo's ability to accept charter-configuration changes allows its behavior to evolve. ",
                        "These configuration changes can accept a new minting-delegate configuration ,",
                        " ... or other details of the Charter datum that may be specialized.",
                        "Charter updates are authorized by the gov delegate",
                    ],
                    mech: ["can update details of the datum"],
                    requires: [
                        "can update the minting delegate in the charter settings",
                        "can update the spending delegate in the charter settings",
                        "can add invariant minting delegates to the charter settings",
                        "can add invariant spending delegates to the charter settings",
                    ],
                },
            "can update the minting delegate in the charter settings": {
                purpose: "to evolve the minting policy for the contract",
                details: [
                    "when updating the minting policy delegate, the gov authority is used to authorize the change",
                    "the minting policy is updated in the charter datum",
                    "the old minting policy should be retired when changing policies",
                ],
                impl: "mkTxnUpdatingMintDelegate()",
                mech: [
                    "can install an updated minting delegate",
                    "fails without the capoGov- authority uut",
                    "normally requires the eixsting mint delegate to be involved in the replacement",
                    "can force-replace the mint delegate if needed",
                    "keeps the charter token in the contract address",
                    "uses the new minting delegate after it is installed",
                    "can't use the old minting delegate after it is replaced",
                ],
            },
            "can update the spending delegate in the charter settings": {
                purpose:
                    "to evolve the spending policy for the contract's delegated-datum types",
                details: [
                    "when updating the spending policy delegate, the gov authority is used to authorize the change",
                    "the spending policy is updated in the charter datum",
                    "the old spending policy should be retired when changing policies",
                ],
                mech: [
                    "can install an updated spending delegate",
                    "fails without the capoGov- authority uut",
                    "normally requires the eixsting mint delegate to be involved in the replacement",
                    "can force-replace the mint delegate if needed",
                    "keeps the charter token in the contract address",
                    "uses the new spending delegate after it is installed",
                    "can't use the old spending delegate after it is replaced",
                ],
            },

            "can add invariant spending delegates to the charter settings": {
                purpose:
                    "to arrange permanent spending policies for custom data types",
                details: [
                    "The Capo can add invariant spending policies for custom data types",
                    "These invariants are enforced forever, and can't be changed",
                    "The baseline scripts directly enforce these invariants, so that a delegate-swap actvity can't undermine the invariant",
                ],
                mech: [
                    "TODO: TEST can add an invariant spending delegate for a datum type",
                    "TODO: TEST cannot change any other charter settings when adding an invariant",
                    "TODO: TEST cannot change spend invariants when updating other charter settings",
                    "TODO: TEST new invariants are always enforced",
                    "TODO: TEST can never remove an invariant spending delegate for a datum type",
                ],
            },

            "can add invariant minting delegates to the charter settings": {
                purpose:
                    "to arrange permanent minting policies constraining what can be minted",
                details: [
                    "The Capo can add invariant mint policies",
                    "These invariants are enforced forever, and can't be changed",
                    "The baseline scripts directly enforce these invariants, so that a mint-delegate-swap actvity can't undermine the invariant",
                ],
                mech: [
                    "TODO: TEST can add an invariant mint delegate",
                    "TODO: TEST fails without the capoGov- authority uut",
                    "TODO: TEST cannot change any other charter settings when adding the mint invariant",
                    "TODO: TEST can never remove an mint invariant mint after it is added",
                    "TODO: TEST cannot change mint invariants when updating other charter settings",
                    "TODO: TEST always enforces new mint invariants",
                ],
            },

            "has a unique, permanent treasury address": {
                purpose: "to give continuity for its stakeholders",
                details: [
                    "One-time creation is ensured by UTxO's unique-spendability property",
                    "Determinism is transferred from the charter utxo to the MPH and to the treasury address",
                    "Further software development lifecycle is enabled by evolution of details stored in the Charter datum",
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
                    // "XXX - move to multi-sig Delegate - TODO: fails if minSigs is longer than trustee list",
                    "doesn't work with a different spent utxo",
                ],
                requires: [
                    "has a singleton minting policy",
                    "the charter token is always kept in the contract",
                ],
            },

            "supports an abstract Configuration structure stored in the contact":
                {
                    purpose:
                        "allows configuration details that can evolve to support Capo-related scripts as needed",
                    details: [
                        "The Configuration structure can be stored in the contract, separately from the CharterDatum. ",
                        "It can be updated by the govAuthority, and can be used to store any ",
                        "  ... data needed by the Capo's scripts, such as minting and spending delegates.",
                        "The charter datum references the config uut, and shouldn't ",
                        "  ... ever need to change that reference, since the config data can be updated in place.",
                        "The config can store additional delegates or other key/value data, ",
                        "  ... with keys and data-types being defined by conventions in the Capo's scripts.",
                        "The minting delegate is expected to validate all updates to the configuration data.",
                        "The spending delegate is expected to validate all updates to the configuration data.",
                        "#### Design notes",
                        "When updating delegates, the (unchanged) configuration data can slip out of sync with new expectations, ",
                        "  ... requiring a separate update to the configuration data, bringing it up to the new expectations, ",
                        "  ... it would be nicer to have a way to transactionally update both the delegate and the config, ",
                        "  ... but meanwhile, new delegates should be tested to ensure they can handle the transitional state, ",
                        "  ... and that they'll be able to accept the intended config update. ",
                        "  ... If they can't accept the intended config update, the Capo can temporarily be nonoperational, ",
                        "  ... until new delegates are deployed that can handle the updated config. ",
                        "Delegate updaters can mitigate the window of configuration-mismatch ",
                        "  ... by queuing a config-update txn that immediately follows the delegate update txn, ",
                        "  ... and with off-chain code that checks for the presence of the expected config details; ",
                        "  ... When the expected config details are not present, the off-chain code can show people ",
                        "  ... a 'please wait ...' message indicating that a contract update is in progress ",
                        "  ... during the expected short interval in which the update sequence is executed.",
                    ],
                    impl: "mkTxnUpdateConfig()",
                    mech: [
                        "has a 'SettingsData' datum variant & utxo in the contract",
                        "charter creation requires presence of an empty SettingsData and a CharterDatum reference to that minted UUT",
                        "updatingCharter activity MUST NOT change the set-UUT reference",
                        "can update the settings data with a separate updatingSettings Activity on the Settings",
                        "requires the capoGov- authority uut to update the settings data",
                        "the spending delegate must validate the UpdatingSettings details",
                        "the minting delegate must validate the UpdatingSettings details",
                        "the spending invariant delegates must validate the UpdatingSettings details",
                        "the minting invariant delegates must validate the UpdatingSettings details",
                    ],
                },

                details: [
                ],
                mech: [
                    "adds an entry to the Charter's spendingDelegates list",
                    "won't create a duplicate spendingDelegates entry with the same tag",
                    "mints a spndDgt UUT and sends it to the policy-delegate address",
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

            "can mint other tokens, on the authority of the charter's registered mintDgt- token":
                {
                    purpose:
                        "to simplify the logic of minting, while being sure of minting authority",
                    details: [
                        "the minting policy doesn't have to directly express detailed policy for authorization",
                        "instead, it defers authority to the minting delegate, ",
                        "... which can implement its own policy for minting",
                        "... and by simply requiring that the mintDgt token is being spent.",
                        "The minting delegate decides whether that's to be allowed.",
                    ],
                    mech: [
                        "can build transactions that mint non-'charter' tokens",
                        "requires the charter-token to be spent as proof of authority",
                        "fails if the charter-token is not returned to the treasury",
                        "fails if the charter-token parameters are modified",
                    ],
                },

            "can handle large transactions with reference scripts": {
                purpose:
                    "to support large transactions and reduce per-transaction costs",
                details: [
                    "Each Capo involves the leader contract, a short minting script, ",
                    "  ... and a minting delegate.  Particularly in pre-production, these ",
                    "  ... can easily add up to more than the basic 16kB transaction size limit.",
                    "By creating reference scripts, the size budget overhead for later ",
                    "  ... transactions is reduced, at cost of an initial deposit for each refScript. ",
                    "Very small validators may get away without refScripts, but more complicated ",
                    "  ... transactions will need them.  So creating them is recommended in all cases.",
                ],
                mech: [
                    "creates refScript for minter during charter creation",
                    "creates refScript for capo during charter creation",
                    "creates refScript for mintDgt during charter creation",
                    "finds refScripts in the Capo's utxos",
                    "txnAttachScriptOrRefScript(): uses scriptRefs in txns on request",
                ],
            },

            "XXX - move to multi-sig Delegate - the trustee group can be changed":
                {
                    purpose:
                        "to ensure administrative continuity for the group",
                    details: [
                        "When the needed threshold for administrative modifications is achieved, the Charter Datum can be updated",
                        "This type of administrative action should be explicit and separate from any other administrative activity",
                        "If the CharterToken's Datum is being changed, no other redeemer activities are allowed.",
                        "This requires a separate multi-sig delegate policy (TODO: move out of core reqts",
                    ],
                    mech: [
                        "requires the existing threshold of existing trustees to be met",
                        "requires all of the new trustees to sign the transaction",
                        "does not allow minSigs to exceed the number of trustees",
                    ],
                    requires: [
                        // "the trustee threshold is enforced on all administrative actions",
                    ],
                },

            "XXX - move to multi-sig Delegate - the trustee threshold is enforced on all administrative actions":
                {
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
