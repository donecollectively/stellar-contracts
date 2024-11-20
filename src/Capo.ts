import {
    Address,
    Assets,
    Datum,
    IntData,
    MintingPolicyHash,
    TxId,
    TxOutput,
    TxInput,
    Value,
    ValidatorHash,
    Crypto,
    bytesToText,
    bytesToHex,
    textToBytes,
} from "@hyperionbt/helios";
import {
    equalsBytes,
    type ByteArrayLike,
    type IntLike,
} from "@helios-lang/codec-utils";

import type { HeliosModuleSrc } from "./helios/HeliosModuleSrc.js";
import { CapoHeliosBundle } from "./CapoHeliosBundle.js";
import { CapoMinter } from "./minting/CapoMinter.js";
import {
    Activity,
    StellarContract,
    datum,
    txn,
    partialTxn,
} from "./StellarContract.js";

import type {
    StellarFactoryArgs,
    isActivity,
    configBaseWithRev,
    stellarSubclass,
    ConfigFor,
    anyDatumProps,
    anyUplcProgram,
    UplcRecord,
} from "./StellarContract.js";
import type { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import {
    type uutMap,
    StellarTxnContext,
    type hasAddlTxns,
    type hasSeedUtxo,
    type anyState,
} from "./StellarTxnContext.js";

import {
    DelegateConfigNeeded,
    delegateRoles,
    defineRole,
} from "./delegation/RolesAndDelegates.js";
import {
    delegateLinkSerializer,
    uplcDataSerializer,
} from "./delegation/jsonSerializers.js";

import { UutName } from "./delegation/UutName.js";
import type {
    ConfiguredDelegate,
    ErrorMap,
    DelegateConfigDetails,
    OffchainPartialDelegateLink,
    DelegateSetup,
    DelegationDetail,
    delegateConfigValidation,
    capoDelegateConfig,
    SelectedDelegate,
} from "./delegation/RolesAndDelegates.js";

import type { SeedTxnScriptParams } from "./SeedTxnScriptParams.js";

// import CapoMintHelpers from "./CapoMintHelpers.hl"
// import CapoDelegateHelpers from "./delegation/CapoDelegateHelpers.hl";
// import StellarHeliosHelpers from "./StellarHeliosHelpers.hl";
// import contract from "./DefaultCapo.hl";
// export { contract };

import { errorMapAsString } from "./diagnostics.js";
import { hasReqts } from "./Requirements.js";

import {
    mkUutValuesEntries,
    mkValuesEntry,
    stringToNumberArray,
} from "./utils.js";
import { StellarDelegate } from "./delegation/StellarDelegate.js";

import {
    type DatumAdapterAppType,
    // type CapoOnchainSettingsType,
    // type CapoOffchainSettingsType,
    // type CapoSettingsAdapterFor,
    type DatumAdapterOffchainType,
    type hasSettingsType,
} from "./CapoSettingsTypes.js";

import { TxOutputId, type ScriptHash, type Wallet } from "@hyperionbt/helios";

import { BasicMintDelegate } from "./minting/BasicMintDelegate.js";
import { AnyAddressAuthorityPolicy } from "./authority/AnyAddressAuthorityPolicy.js";
import { dumpAny, txAsString, utxosAsString } from "./diagnostics.js";
// import { MultisigAuthorityPolicy } from "./authority/MultisigAuthorityPolicy.js";
import CapoHelpers from "./CapoHelpers.hl";
import { type NamedPolicyCreationOptions } from "./delegation/ContractBasedDelegate.js";

/**
 * Includes key details needed to create a delegate link
 * @remarks
 *
 * uutName can't be specified in this structure because creating a delegate link
 * should use txnMustGetSeedUtxo() instead, minting a new UUT for the purpose.
 * If you seek to reuse an existing uutName, probably you're modifying an existing
 * full RelativeDelegateLink structure instead - e.g. with a different `strategy` and
 * `config`; this type wouldn't be involved in that case.
 *
 * @public
 **/
export type MinimalDelegateLink = Partial<OffchainPartialDelegateLink>;
//     Omit<RelativeDelegateLinkLike, "uutName">
// >;

// const spendDelegate = await this.txnCreateOffchainDelegateLink(
//     spendDelegateLink: this.mkOnchainRelativeDelegateLink(govAuthority),

/**
 * Delegate updates can, in an "escape hatch" scenario, be forced by sole authority
 * of the Capo's govAuthority.  While the normal path of update involves the existing
 * mint/spend delegate's involvement, a forced update can be used to bypass that route.
 * This provides that signal.
 */
export type MinimalDelegateUpdateLink = Omit<
    OffchainPartialDelegateLink,
    "uutName"
> & {
    forcedUpdate?: true;
};

/**
 * represents a UUT found in a user-wallet, for use in authorizing a transaction
 * @public
 */
export type FoundUut = { utxo: TxInput; uut: UutName };

/**
 * strongly-typed map of purpose-names to Uut objects
 *
 * @public
 */
export type uutPurposeMap<unionPurpose extends string> = {
    [purpose in unionPurpose]: UutName;
};

// export type hasSomeUuts<uutEntries extends string> = {
//     uuts: Partial<uutPurposeMap<uutEntries>>;
// };

/**
 * used for transaction-context state having specific uut-purposes
 *
 * @public
 */
export type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
};

type useRawMinterSetup = Omit<NormalDelegateSetup, "mintDelegateActivity"> & {
    omitMintDelegate: true; // it's a little like "are you sure?"
    specialMinterActivity: isActivity;
    mintDelegateActivity?: undefined;
};

export type DelegateSetupWithoutMintDelegate = {
    withoutMintDelegate: useRawMinterSetup;
};

export type NormalDelegateSetup = {
    usingSeedUtxo?: TxInput | undefined;
    additionalMintValues?: valuesEntry[];
    skipDelegateReturn?: true;
    mintDelegateActivity: isActivity;
    // withoutMintDelegate: never
};

export type toQueuePendingDgtChange =
    CapoLifecycleActivity$queuePendingDgtChangeLike;
type pendingActionRemoveDgt = Pick<toQueuePendingDgtChange["action"], "Remove">;

export type toQueueDgtRemoval = Omit<toQueuePendingDgtChange, "action"> & {
    action: pendingActionRemoveDgt;
};
export type toQueueSeededDgtChange = Omit<toQueuePendingDgtChange, "action"> & {
    action: Omit<toQueuePendingDgtChange["action"], "Remove">;
};

/**
 * Pre-parsed results of finding and matching contract-held UTxOs
 * with datum details.
 * @public
 */

export type FoundDatumUtxo<
    DelegatedDatumType extends AnyDataTemplate<any, any>
> = {
    utxo: TxInput;
    datum: DelegatedDatumType;
};

export type UutCreationAttrsWithSeed = {
    usingSeedUtxo: TxInput;
};

/**
 * the uut-factory interface
 *
 * @public
 */
export interface hasUutCreator {
    txnWillMintUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        uutArgs: UutCreationAttrsWithSeed,
        roles?: RM
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx>;

    txnMintingUuts<
        const purposes extends string,
        existingTcx extends StellarTxnContext & hasSeedUtxo,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        uutArgs: NormalDelegateSetup | DelegateSetupWithoutMintDelegate,
        roles?: RM
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx>;

    // txnBurnUuts<
    //     existingTcx extends StellarTxnContext<any>,
    // >(
    //     initialTcx: existingTcx,
    //     uutNames: UutName[],
    // ): Promise<existingTcx>;
}

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
export type MintUutActivityArgs = {
    seed: TxOutputId;
    purposes: string[];
};
/**
 * A txn context having specifically-purposed UUTs in its state
 * @public
 */
export type hasUutContext<uutEntries extends string> = StellarTxnContext<
    hasAllUuts<uutEntries>
>;

/**
 * charter-minting interface
 *
 * @public
 */
export interface MinterBaseMethods {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharter<TCX extends StellarTxnContext>(
        tcx: TCX,
        charterMintArgs: {
            owner: Address;
            capoGov: UutName;
        },
        tVal: valuesEntry
    ): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
        delegate: BasicMintDelegate,
        redeemer: isActivity
    ): Promise<TCX>;
}

export type anyDatumArgs = Record<string, any>;

export type rootCapoConfig = {
    rootCapoScriptHash?: ValidatorHash;
};

/**
 * Configuration details for a Capo
 * @public
 */
export type CapoConfig = configBaseWithRev &
    rootCapoConfig &
    SeedTxnScriptParams & {
        mph: MintingPolicyHash;
        rev: bigint;
        bootstrapping?: true;
    };

/**
 * StellarTransactionContext exposing a bootstrapped Capo configuration
 * @remarks
 *
 * During first-time setup of a Capo contract, its manifest configuration details
 * should be captured for reproducibility, and this type allows the bootstrap
 * transaction to expose that configuration.
 *
 * {@link Capo.mkTxnMintCharterToken | mkTxnMintCharterToken()} returns a transaction context
 * of this type, with `state.bootstrappedConfig`;
 * @public
 **/
export type hasBootstrappedCapoConfig = StellarTxnContext<{
    bsc: CapoConfig;
    uuts: uutMap;
    bootstrappedConfig: any;
}>;

type PreconfiguredDelegate<T extends StellarDelegate> = Omit<
    ConfiguredDelegate<T>,
    "delegate" | "delegateValidatorHash"
>;

export type basicDelegateMap<
    anyOtherRoles extends {
        [k: string]: DelegateSetup<any, StellarDelegate, any>;
    } = {},
    defaultRoles = {
        govAuthority: DelegateSetup<"authority", StellarDelegate, any>;
        mintDelegate: DelegateSetup<"mintDgt", BasicMintDelegate, any>;
        spendDelegate: DelegateSetup<"spendDgt", ContractBasedDelegate, any>;
        // namedDelegate: RoleInfo<any, "namedDgt", StellarDelegate>;
    }
> = {
    [k in
        | keyof anyOtherRoles
        | keyof defaultRoles]: k extends keyof anyOtherRoles
        ? anyOtherRoles[k]
        : k extends keyof defaultRoles
        ? defaultRoles[k]
        : never;
};

/**
 * @public
 */
export type hasCharterRef = StellarTxnContext<
    anyState & {
        charterRef: TxInput;
        charterData: CharterData;
    }
>;

export type hasSpendDelegate = StellarTxnContext<
    anyState & {
        spendDelegate: ContractBasedDelegate;
    }
>;

export type hasGovAuthority = StellarTxnContext<
    anyState & {
        govAuthority: AuthorityPolicy;
    }
>;

import UncustomCapoSettings from "./UncustomCapoSettings.hl";
import { ContractBasedDelegate } from "./delegation/ContractBasedDelegate.js";
import { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import type {
    AnyDataTemplate,
    DelegatedDatumAdapter,
    hasAnyDataTemplate,
} from "./delegation/DelegatedDatumAdapter.js";
import { Cast } from "@helios-lang/contract-utils";
import type { UplcData, UplcProgramV2, UplcProgramV3 } from "@helios-lang/uplc";
import { TxOutputDatum } from "@helios-lang/ledger-babbage";
import type { tokenPredicate } from "./UtxoHelper.js";
import type { HeliosScriptBundle } from "./helios/HeliosScriptBundle.js";
import BasicDelegateScript from "./delegation/BasicDelegate.hl";
import CapoDataBridge, {
    type types as CapoTypes,
} from "./CapoHeliosBundle.bridge.js";
import type {
    findActivityType,
    mustFindActivityType,
    mustFindConcreteContractBridgeType,
    mustFindDatumType,
    mustFindReadDatumType,
} from "./helios/dataBridge/BridgeTypeUtils.js";
import type {
    CapoDatum$CharterDataLike,
    CapoDatum$Ergo$CharterData,
    CapoDatumLike,
    ErgoCapoDatum,
    ErgoRelativeDelegateLink,
    RelativeDelegateLinkLike,
    RelativeDelegateLink,
    ManifestEntryType$DgDataPolicyLike,
    CapoLifecycleActivity$queuePendingDgtChangeLike,
    PendingDelegateActionLike,
} from "./CapoHeliosBundle.typeInfo.js";
import type { IntersectedEnum } from "./helios/typeUtils.js";
import type { SomeDgtActivityHelper } from "./delegation/GenericDelegateBridge.js";
import type { PendingDelegateAction$AddLike } from "./delegation/UnspecializedDelegate.typeInfo.js";

export type CapoDatum = ErgoCapoDatum;
export type CharterData = CapoDatum$Ergo$CharterData;
export type CharterDataLike = CapoDatum$CharterDataLike;

/**
 * Schema for initial setup of Charter Datum - state stored in the Leader contract
 * together with its primary or "charter" utxo.  Converted from this convenient form
 * to the on-chain form during mkTxnMintCharterToken().
 * @public
 **/
export interface MinimalCharterDataArgs extends configBaseWithRev {
    spendDelegateLink: OffchainPartialDelegateLink;
    spendInvariants: OffchainPartialDelegateLink[];
    otherNamedDelegates: Map<string, OffchainPartialDelegateLink>;
    // | Record<string, OffchainPartialDelegateLink>;
    mintDelegateLink: OffchainPartialDelegateLink;
    mintInvariants: OffchainPartialDelegateLink[];
    govAuthorityLink: OffchainPartialDelegateLink;
    manifest: Map<string, OffchainPartialDelegateLink>;
    // typeMapUut: UutName | number[];
}

/**
 * Establishes minimum requirements for creating a charter-datum
 * @remarks
 *
 * requires a baseline configuration for the gov authority and mint delegate.
 *
 * @public
 **/
export type newMinimalCharterDataArgs_maybeUnneeded = {
    govAuthorityLink: MinimalDelegateLink;
    mintDelegateLink: MinimalDelegateLink;
    spendDelegateLink: MinimalDelegateLink;
    mintInvariants: MinimalDelegateLink[];
    spendInvariants: MinimalDelegateLink[];
};

export type RemainingMinimalCharterDataArgs = Omit<
    CharterDataLike,
    "govAuthorityLink" | "mintDelegateLink" | "spendDelegateLink"
>;

export type HeldAssetsArgs = {
    purposeId?: string;
    purpose?: string;
};

/**
 * A transaction context flagged as containing a settings-utxo reference
 * @public
 */
export type hasSettingsRef = StellarTxnContext<
    anyState & { settingsRef: TxInput }
>;
export function mkDgtStateKey<
    const N extends string,
    const PREFIX extends string = "dgPoi"
>(n: N, p: PREFIX = "dgPol" as PREFIX) {
    return `${p}${n.slice(0, 1).toUpperCase()}${n.slice(1)}` as dgtStateKey<
        N,
        PREFIX
    >;
}

export type dgtStateKey<
    N extends string,
    PREFIX extends string = "dgPol"
> = `${PREFIX}${Capitalize<N>}`;

export type hasNamedDelegate<
    DT extends StellarDelegate,
    N extends string,
    PREFIX extends string = "namedDelegate"
> = StellarTxnContext<
    anyState & {
        [k in dgtStateKey<N, PREFIX>]: ConfiguredDelegate<DT> &
            ErgoRelativeDelegateLink;
    }
>;

export type hasDelegateMap<
    C extends Capo<any>,
    SpecificCapo = C extends Capo<infer S>
        ? S extends unknown
            ? never
            : S
        : never
> = {
    initDelegateRoles(): basicDelegateMap<any>;
    _delegateRoles: SpecificCapo extends never
        ? null
        : basicDelegateMap & ReturnType<C["initDelegateRoles"]>;
    get delegateRoles(): SpecificCapo extends never
        ? null
        : basicDelegateMap<any> & ReturnType<C["initDelegateRoles"]>;
};

/**
 * Base class for leader contracts, with predefined roles for delegating governance authority and minting policies
 * @remarks
 *
 * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract
 * scripts.  Capo contract can use these capabilities in custom ways for strong flexibility.
 *
 * Any Capo contract can define delegateRoles() to establish customc ollaborating scripts; these are used for
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain)
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * Capo provides roles for govAuthority and mintDelegate, and methods to facilitate
 * the lifecycle of charter creation & update.   To add custom roles, override initDelegateRoles(), extending the returned
 * roles from super.initDelegateRoles().  Advanced versions of the govAuthority, mintDelegate and spendDelegate roles
 * can created by extending specific role types found in the base initDelegateRoles() method.
 *
 * The delegation pattern uses UUTs, which are non-fungible / unique utility tokens.
 *
 * Architecturally, UUTs provide a simple and unique handle for the Capo to use as a  **required transaction element**
 * in key operational activities (like updating the charter details); so that the delegate holding the UUT is entrusted to
 * approved the UUT's inclusion in a transaction, with all the policy-enforcement implicated on the other end of the
 * delegation.
 *
 * The Capo class provides utilities for creating and using UUT's, or **unique utility tokens**,
 * which are non-fungible assets that can form a positive linkage between the Capo (which should
 * normally retain a reference to that UUT) and any delegate; that delegate is most commonly another
 * contract script also referenced within the roles() definition, with a selected strategy.
 *
 *  * **Example: Multisig authority delegation** - a Capo contract would get much more complicated if it
 * contained multisig logic.  Instead, the governance authority for the Capo can be delegated to a
 * standalone multi-sig contract, which can contain all (and only) the multi-sig logic.  Separating the
 * responsibilities makes each part simpler, easing the process of ensuring each part is doing its job
 * perfectly :pray:
 *
 * @public
 */

type AnyAnyOfcourse = any extends any ? "yes" : "no";
// this type looks useless.  Its result is interesting, though.
//  ... it's matchiness for "yes" | "no" means ANYTHING could happen
type AnyThingUselessEither = any extends "something" ? "yes" : "no";
type ThingAnyYes = "something" extends any ? "yes" : "no";
type AnyUnkYes = any extends unknown ? "yes" : "no";
type UnkAnyYes = unknown extends any ? "yes" : "no";

type UnkStrNo = unknown extends string ? "yes" : "no";
type UnkUnkYes = unknown extends unknown ? "yes" : "no";

type StrUnkYes = string extends unknown ? "yes" : "no";
type StrAnyYes = string extends any ? "yes" : "no";
type UnkConstStringNo = unknown extends "MyCONST STRING" ? "yes" : "no";
type UnkFooNo = unknown extends { foo: string } ? "yes" : "no";
type ConstStringUnkYES = "MyCONST STRING" extends unknown ? "yes" : "no";
type FooUnkYES = { foo: string } extends unknown ? "yes" : "no";

/**
 * @public
 */
export type DelegatedDataPredicate<
    DATUM_TYPE extends anyDatumProps & AnyDataTemplate<any, any>
> = (utxo: TxInput, data: DATUM_TYPE) => boolean;

/**
 * Base class for a "leader" contract that supports custom settings,
 * multiple data types that can evolve over time, support for the software
 * development lifecycle with evolving policies, and a flexible delegation
 * system for managing the contract's roles.
 * @public
 */
export abstract class Capo<
    SELF extends Capo<any>
> extends StellarContract<CapoConfig> {
    // implements hasSettingsType<SELF>
    //, hasRoleMap<SELF>
    static currentRev: bigint = 1n;
    dataBridgeClass = CapoDataBridge;

    get onchain(): mustFindConcreteContractBridgeType<this> {
        return this.getOnchainBridge() as any;
    }

    get offchain(): mustFindConcreteContractBridgeType<this>["reader"] {
        return super.offchain as any;
    }

    get reader(): mustFindConcreteContractBridgeType<this>["reader"] {
        return super.offchain as any;
    }

    get activity(): mustFindActivityType<Capo<any>> {
        const bridge = this.onchain;
        return bridge.activity as any;
    }

    get mkDatum(): mustFindDatumType<Capo<any>> {
        return this.onchain.datum;
    }

    get newReadDatum(): mustFindReadDatumType<Capo<any>> {
        // & ( (d: UplcData) => CapoDatumLike ) {
        const bridge = this.getOnchainBridge();
        //x@ts-expect-error probing for presence
        const { readDatum } = bridge;
        if (!readDatum) {
            throw new Error(
                `${
                    (this as any).constructor.name
                }: this contract script doesn't use datum`
            );
        }

        return readDatum as (x: UplcData) => CapoDatumLike as any;
    }

    verifyConfigs(): Promise<any> {
        return this.verifyCoreDelegates();
    }

    get isConfigured(): Promise<boolean> {
        if (!this.configIn) return Promise.resolve(false);
        // if (this._verifyingConfigs) return this._verifyingConfigs;
        return Promise.resolve(true);
    }

    scriptBundle(): CapoHeliosBundle {
        throw new Error(
            `${this.constructor.name}: each Capo must provide a scriptBundle() method.\n` +
                `It should return an instance of a class defined in a *.hlbundle.js file.  At minimum:\n\n` +
                `    export default class MyCapoBundle extends CapoHeliosBundle {\n` +
                `       // get modules() {  // optional\n` +
                `       //     return [\n` +
                `       //         ...super.modules,\n` +
                `       //         // additional custom .hl module imports here\n` +
                `       //     ];\n` +
                `       // }\n` +
                `    }\n\n` +
                `We'll generate types for that .js file, based on the types in your Helios sources.\n` +
                `Your scriptBundle() method can \`return new MyCapoBundle();\``
        );
        // return new CapoBundle();
    }

    /**
     * Reveals any bootstrapping details that may be present during initial creation
     * of the Capo contract, for use during and immediately after charter-creation.
     *
     * @public
     **/
    bootstrapping?: {
        [key in
            | "govAuthority"
            | "mintDelegate"
            | "spendDelegate"]: ConfiguredDelegate<any>;
    };

    abstract initDelegatedDatumWrappers(): Promise<
        Record<string, DelegatedDatumAdapter<any>>
    >;

    static parseConfig(rawJsonConfig: {
        mph: { bytes: string };
        rev: bigint;
        seedTxn?: { bytes: string };
        seedIndex: bigint;
        rootCapoScriptHash: { bytes: string };
    }) {
        const { mph, rev, seedTxn, seedIndex, rootCapoScriptHash } =
            rawJsonConfig;

        const outputConfig: any = {};
        if (mph) outputConfig.mph = new MintingPolicyHash(mph.bytes);

        if (rev) outputConfig.rev = BigInt(rev);
        if (seedTxn) outputConfig.seedTxn = new TxId(seedTxn.bytes);
        if (seedIndex) outputConfig.seedIndex = BigInt(seedIndex);
        if (rootCapoScriptHash)
            outputConfig.rootCapoScriptHash = new ValidatorHash(
                rootCapoScriptHash.bytes
            );

        return outputConfig;
    }

    // get customCapoSettingsModule(): HeliosModuleSrc {
    //     return UncustomCapoSettings;
    // }

    get scriptDatumName() {
        return "CapoDatum";
    }
    get scriptActivitiesName() {
        return "CapoActivity";
    }

    static get defaultParams() {
        const params = {
            rev: this.currentRev,
        };
        return params;
    }

    /**
     * extracts from the input configuration the key details needed to construct/reconstruct the on-chain contract address
     * @remarks
     *
     * extracts the details that are key to parameterizing the Capo / leader's on-chain contract script
     * @public
     **/
    getContractScriptParamsUplc(
        config: CapoConfig
    ): UplcRecord<
        configBaseWithRev & Pick<CapoConfig, "seedTxn" | "seedIndex" | "mph">
    > {
        if (
            this.configIn &&
            config.mph &&
            this.minter &&
            !config.mph.isEqual(this.mph)
        )
            throw new Error(`mph mismatch`);
        const { mph } = config;
        const rev = (this.constructor as typeof Capo).currentRev;
        // console.log("this treasury uses mph", mph?.hex);

        const params = {
            mph,
            rev,
        }; //as configType;

        return this.paramsToUplc(params) as any;
    }

    async init(args: StellarFactoryArgs<CapoConfig>) {
        await super.init(args);

        const {
            scriptDatumName: onChainDatumName,
            scriptActivitiesName: onChainActivitiesName,
        } = this;

        const { CharterData } = this.onChainDatumType.typeMembers;

        const updatingCharter = this.activity.updatingCharter;
        // this.mustGetActivity("updatingCharter");
        const usingAuthority = this.activity.usingAuthority;
        // this.mustGetActivity("usingAuthority");

        if (!CharterData)
            throw new Error(
                `datum type ${onChainDatumName} must have a 'CharterData' variant`
            );
        if (!updatingCharter)
            throw new Error(
                `activities type ${onChainActivitiesName} must have a 'updatingCharter' variant`
            );
        if (!usingAuthority)
            throw new Error(
                `activities type${onChainActivitiesName} must have a 'usingAuthority' variant`
            );

        if (this.configIn && !this.configIn.bootstrapping) {
            const { seedTxn, seedIndex } = this.configIn;
            await this.connectMintingScript({
                seedTxn,
                seedIndex,
            });

            //@ts-expect-error - trust the subclass's initDelegateRoles() to be type-matchy
            this._delegateRoles = this.initDelegateRoles();

            await this.verifyConfigs();
            // this._verifyingConfigs = this.verifyConfigs().then((r) => {
            //     this._verifyingConfigs = undefined;
            //     return r;
            // });
        } else {
            //@ts-expect-error - trust the subclass's initDelegateRoles() to be type-matchy
            this._delegateRoles = this.initDelegateRoles();

            // this.connectMintingScript(this.getMinterParams());
        }

        //@ts-expect-error - trust the subclass's initDelegatedDatumAdapters() to be type-matchy
        //   ... based on other abstract methods defined below
        this.datumAdapters = await this.initDelegatedDatumWrappers();

        return this;
    }

    static bootstrapWith(args: StellarFactoryArgs<CapoConfig>) {
        const { setup, config } = args;
        const Class = this;
        //@ts-expect-error this is just Javascript.  Sorry, typescript!
        return new Class({ setup, config: { ...config, bootstrapping: true } });
    }

    /**
     * Creates any additional transactions needed during charter creation
     * @remarks
     *
     * This method is a hook for subclasses to add extra transactions during the
     * charter creation process.  It is called during the creation of the charter transaction.
     *
     * The Capo has a {@link Capo.bootstrapping|`bootstrapping`} property that can be referenced as needed
     * during extra transaction creation.
     *
     * This method should use {@link StellarTxnContext.includeAddlTxn} to add transactions
     * to the context.
     *
     * @public
     **/
    async mkAdditionalTxnsForCharter<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX> {
        return tcx;
    }

    // async readSettingsDatum<THIS extends Capo<any>>(
    //     this: THIS,
    //     parsedDatum: adapterParsedOnchainData<
    //         CapoOnchainSettingsType<THIS>,
    //         "SettingsData"
    //     >
    // ): Promise<CapoOffchainSettingsType<THIS>> {
    //     type t = CapoOnchainSettingsType<THIS>;
    //     return this.settingsAdapter.fromOnchainDatum(parsedDatum);
    // }

    get minterClass(): stellarSubclass<CapoMinter> {
        return CapoMinter;
    }

    minter!: CapoMinter;
    // @partialTxn
    // txnWillMintUuts<
    //     const purposes extends string,
    //     existingTcx extends StellarTxnContext,
    //     const RM extends Record<ROLES, purposes>,
    //     const ROLES extends keyof RM & string = string & keyof RM
    // >(
    //     initialTcx: existingTcx,
    //     uutPurposes: purposes[],
    //     seedUtxo: TxInput,
    //     //@ts-expect-error
    //     roles: RM = {} as Record<string, purposes>
    // ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
    //     const minter = this.connectMinter()
    //     return this.txnWillMintUuts(
    //         initialTcx,
    //         uutPurposes,
    //         seedUtxo,
    //         roles
    //     );
    // }

    // P extends paramsBase = SC extends StellarContract<infer P> ? P : never

    /**
     * returns a value representing the provided UUT(s)
     * @remarks
     *
     * The inputs can be of a few forms - see the overload variants
     * @param uutMap - a set of UUTs, all of which will be represented in the returned value
     * @param tcx - a transaction context, whose `state.uuts` will be processed as in the `uutMap` variant
     * @param uutName - a UutName object representinga single UUT
     * @public
     **/
    uutsValue(uutMap: uutPurposeMap<any>): Value;
    /**
     * from all the uuts in the transaction context
     **/
    uutsValue(tcx: hasUutContext<any>): Value;
    /**
     * from a single uut name or byte array
     */
    uutsValue(uutName: UutName | number[]): Value;
    uutsValue(
        x: UutName | number[] | uutPurposeMap<any> | hasUutContext<any>
    ): Value {
        let uutMap =
            x instanceof StellarTxnContext
                ? x.state.uuts!
                : x instanceof UutName
                ? { single: x }
                : Array.isArray(x)
                ? { single: new UutName("some-uut", x) }
                : x;
        const vEntries = mkUutValuesEntries(uutMap);

        return new Value(
            undefined,
            new Assets([[this.mintingPolicyHash!, vEntries]])
        );
    }

    @Activity.redeemer
    activityUsingAuthority(): isActivity {
        return {
            redeemer: this.activityVariantToUplc("usingAuthority", {}),
        };
    }

    tvCharter() {
        return this.minter.tvCharter();
    }

    get charterTokenAsValue() {
        console.warn(
            "deprecated get charterTokenAsValue; use tvCharter() instead"
        );
        return this.tvCharter();
    }

    // importModules(): HeliosModuleSrc[] {
    //     // const { customCapoSettingsModule } = this;

    //     console.log( {
    //         CapoDelegateHelpers,
    //         CapoMintHelpers
    //     });
    //     return [
    //         // customCapoSettingsModule,
    //         this.capoHelpers,
    //         TypeMapMetadata,
    //         PriceValidator,
    //         StellarHeliosHelpers,
    //         CapoDelegateHelpers,
    //         CapoMintHelpers,
    //     ];
    // }

    get charterTokenPredicate(): tokenPredicate<any> {
        const predicate = this.uh.mkTokenPredicate(this.tvCharter());

        return predicate;
    }

    //! forms a Value with minUtxo included
    tokenAsValue(tokenName: string | number[] | UutName, count: bigint = 1n) {
        const { mph } = this;

        // const tn = tokenName.toString();
        return this.uh.mkMinTv(mph, tokenName, count);
    }

    async mustFindCharterUtxo() {
        const predicate = this.uh.mkTokenPredicate(this.tvCharter());

        return this.mustFindMyUtxo("charter", predicate, "has it been minted?");
    }

    //     /**
    //  * Finds a free seed-utxo from the user wallet, and adds it to the transaction
    //  * @remarks
    //  *
    //  * Accepts a transaction context that may already have a seed.  Returns a typed
    //  * tcx with hasSeedUtxo type.
    //  *
    //  * The seedUtxo will be consumed in the transaction, so it can never be used
    //  * again; its value will be returned to the user wallet.
    //  *
    //  * The seedUtxo is needed for UUT minting, and the transaction is typed with
    //  * the presence of that seed (found in tcx.state.seedUtxo).
    //  *
    //  * If a seedUtxo is already present in the transaction context, no additional seedUtxo
    //  * will be added.
    //  *
    //  * If a seedUtxo is provided as an argument, that utxo must already be present
    //  * in the transaction inputs; the state will be updated to reference it.
    //  *
    //  * @public
    //  *
    //  **/
    //     async tcxWithSeedUtxo<TCX extends StellarTxnContext>(
    //         tcx: TCX = new StellarTxnContext(this.actorContext) as TCX,
    //         seedUtxo?: TxInput
    //     ): Promise<TCX & hasSeedUtxo> {

    /**
     * @deprecated - use tcxWithCharterRef() instead
     */
    async txnAddCharterRef<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX & hasCharterRef> {
        return this.tcxWithCharterRef(tcx);
    }

    /**
     * Ensures the transaction context has a reference to the charter token
     * @remarks
     *
     * Accepts a transaction context that may already have a charter reference.  Returns a typed
     * tcx with hasCharterRef type.
     *
     * The transaction is typed with the presence of the charter reference (found in tcx.state.charterRef).
     *
     * If the charter reference is already present in the transaction context, the transaction will not be modified.
     */
    async tcxWithCharterRef<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX & hasCharterRef> {
        if (
            //@ts-expect-error on type-probe:
            tcx.state.charterRef
        )
            return tcx as TCX & hasCharterRef;
        const ctUtxo = await this.mustFindCharterUtxo();
        tcx.addRefInput(ctUtxo);

        const charterData = await this.findCharterData(ctUtxo);

        const tcx2 = tcx as TCX & hasCharterRef;
        tcx2.state.charterRef = ctUtxo;
        tcx2.state.charterData = charterData;
        return tcx2.addRefInput(ctUtxo);
    }

    /**
     * finds and spends the Capo's charter utxo, typically for updating
     * its CharterData datum.
     */
    async txnMustUseCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer: isActivity,
        newCharterData?: CharterDataLike
    ): Promise<TCX>;

    /**
     * @deprecated - use {@link Capo.tcxWithCharterRef |tcxWithCharterRef(tcx)} instead
     */
    async txnMustUseCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        useReferenceInput: "refInput" | true
    ): Promise<TCX>;

    @partialTxn // non-activity partial
    async txnMustUseCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemerOrRefInput: isActivity | "refInput" | true,
        newCharterData?: CharterData
    ): Promise<TCX> {
        return this.mustFindCharterUtxo().then(async (ctUtxo: TxInput) => {
            // await this.txnAddCharterAuthz(
            //     tcx,
            //     ctUtxo.output.datum as InlineDatum
            // );

            if (
                true === redeemerOrRefInput ||
                "refInput" === redeemerOrRefInput
            ) {
                throw new Error(`use tcxWithCharterRef(tcx) instead`);

                // using reference-input has been requested
                if (newCharterData)
                    throw new Error(
                        `when using reference input for charter, arg3 must be omitted`
                    );
                tcx.addRefInput(ctUtxo);
            }
            // caller requested to **spend** the charter token with a speciic activity / redeemer
            const redeemer = redeemerOrRefInput;
            const tcx2 = await this.txnAttachScriptOrRefScript(
                tcx,
                this.compiledScript
            );
            tcx2.addInput(ctUtxo, redeemer);
            const datum = newCharterData
                ? this.mkDatum.CharterData(newCharterData)
                : (ctUtxo.output.datum as InlineDatum);

            return this.txnKeepCharterToken(tcx2, datum);
        });
    }

    @partialTxn // non-activity partial
    async txnUpdateCharterUtxo<TCX extends StellarTxnContext>(
        tcx: TCX,
        redeemer: isActivity,
        newDatum: CharterDataLike
    ): Promise<StellarTxnContext | never> {
        // this helper function is very simple.  Why have it?
        //   -> its 3rd arg is required,
        //   -> and its name gives a more specific meaning.
        return this.txnMustUseCharterUtxo(tcx, redeemer, newDatum);
    }

    @partialTxn // non-activity partial
    txnKeepCharterToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        datum: InlineDatum
    ): TCX {
        const txo = new TxOutput(this.address, this.tvCharter(), datum);
        txo.correctLovelace(this.networkParams);
        tcx.addOutput(txo);

        return tcx;
    }

    /**
     * adds the charter-token, along with its gov-authority UUT, to a transaction context
     * @remarks
     *
     * Uses txnAddGovAuthority() to locate the govAuthority delegate and txnGrantAuthority() to
     * add its authority token to a transaction.
     *
     * The charter-token is included as a reference input.
     *
     * @param tcx - the transaction context
     * @public
     **/
    //!!! todo: If the Capo's mintDelegate is using the (TODO) "undelegated" strategy, this method can be used (?)
    // ... to approve token-minting by the authority of the gov authZor
    @partialTxn
    async txnAddGovAuthorityTokenRef<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX> {
        const tcx2 = await this.tcxWithCharterRef(tcx);

        const tcx3 = await this.txnAddGovAuthority(tcx2);
        return tcx3;
    }

    async txnMustUseSpendDelegate<TCX extends hasCharterRef>(
        tcx: TCX,
        spendDelegate: ContractBasedDelegate,
        activity: isActivity
    ): Promise<TCX & hasSpendDelegate> {
        // const charterData = tcx.state.charterData;

        const tcx2 = tcx as TCX & hasSpendDelegate;
        tcx2.state.spendDelegate = spendDelegate;
        return spendDelegate.txnGrantAuthority(tcx2, activity);
    }

    /**
     * provides minter-targeted params extracted from the input configuration
     * @remarks
     *
     * extracts the seed-txn details that are key to parameterizing the minter contract
     * @public
     **/
    getMinterParams() {
        const { seedTxn, seedIndex } = this.configIn!;
        return { seedTxn, seedIndex };
    }
    // getCapoRev() {
    //     return 1n;
    // }

    get mph() {
        return this.minter.mintingPolicyHash!;
    }

    get mintingPolicyHash() {
        return this.mph;
    }

    async findActorUut(
        uutPrefix: string,
        mph: MintingPolicyHash = this.mph
    ): Promise<FoundUut | undefined> {
        const foundUtxo = await this.uh.findActorUtxo(
            `uut ${uutPrefix}-`,
            (utxo) => {
                if (getMatchingTokenName(utxo, mph)) {
                    return utxo;
                }
            }
        );
        if (!foundUtxo) return undefined;

        return {
            utxo: foundUtxo,
            uut: new UutName(uutPrefix, getMatchingTokenName(foundUtxo, mph)),
        };

        function getMatchingTokenName(utxo: TxInput, mph: MintingPolicyHash) {
            const tokenNamesExisting = utxo.value.assets
                .getPolicyTokenNames(mph)
                .map((x) => bytesToText(x));

            const tokenNames = tokenNamesExisting.filter((x) => {
                // console.info("   - found token name: "+x);
                return !!x.startsWith(`${uutPrefix}-`);
            });

            return tokenNames[0];
        }
    }

    /**
     * parses details in a delegate-link
     * @deprecated - use an adapter for CharterData instead?
     */
    offchainLink<
        T extends
            | MinimalDelegateLink
            | OffchainPartialDelegateLink
            | RelativeDelegateLinkLike
    >(link: T): T {
        if ("string" == typeof link.config) {
            throw new Error(`wrong type`);
        }
        if (Array.isArray(link.config)) {
            link = {
                ...link,
                config: JSON.parse(bytesToText(link.config)),
            };
        }
        const { config } = link;
        //@ts-expect-error on this unknown prop
        if (config.rev) config.rev = BigInt(config.rev);
        // console.log(" config = ", config );
        // debugger
        return link;
    }

    parseDgtConfig(
        inLink: // | MinimalDelegateLink
        ErgoRelativeDelegateLink | RelativeDelegateLinkLike
    ): Partial<capoDelegateConfig> {
        if ("string" == typeof inLink.config) {
            throw new Error(`wrong type`);
        }
        if (!Array.isArray(inLink.config)) {
            throw new Error(`expected serialized JSON as bytearray`);
        }
        const config = JSON.parse(bytesToText(inLink.config));
        if (config.rev) config.rev = BigInt(config.rev);

        console.log("    ---- parsed config from RelDgtLink = ", config);
        // debugger
        return config;
    }

    serializeDgtConfig(config: Partial<capoDelegateConfig>): number[] {
        return textToBytes(JSON.stringify(config, delegateLinkSerializer));
    }

    /**
     * @deprecated - use the bridge type directly, and parseDgtConfig iff we ever need that.
     */
    parseDelegateLinksInCharter(charterData: CharterData) {
        // spendDelegateLink: RelativeDelegateLink<ContractBasedDelegate<capoDelegateConfig>>;
        // spendInvariants: RelativeDelegateLink<ContractBasedDelegate<capoDelegateConfig>>[];
        // namedDelegates: Record<string, RelativeDelegateLink<StellarDelegate<capoDelegateConfig>>>;
        // mintDelegateLink: RelativeDelegateLink<BasicMintDelegate>;
        // mintInvariants: RelativeDelegateLink<ContractBasedDelegate<capoDelegateConfig>>[];
        // govAuthorityLink: RelativeDelegateLink<AuthorityPolicy>;

        const { otherNamedDelegates: nDgts, manifest } = charterData;
        const namedDgtEntries =
            nDgts instanceof Map ? [...nDgts.entries()] : Object.entries(nDgts);

        // const withParsedOffchainLinks: CharterDataLike = {
        //     ...charterData,
        //     spendDelegateLink: this.offchainLink(
        //         charterData.spendDelegateLink
        //     ),
        //     spendInvariants: charterData.spendInvariants.map(
        //         this.offchainLink
        //     ),
        //     mintDelegateLink: this.offchainLink(charterData.mintDelegateLink),
        //     mintInvariants: charterData.mintInvariants.map(this.offchainLink),
        //     govAuthorityLink: this.offchainLink(charterData.govAuthorityLink),
        //     otherNamedDelegates: new Map(
        //         namedDgtEntries.map(([k, v]) => [k, this.offchainLink(v)])
        //     ),
        //     manifest: new Map(
        //         [...manifest.entries()].map(([k, v]) => {
        //             if (v.DgDataPolicy) {
        //                 const { policyLink, refCount } = v.DgDataPolicy;
        //                 return [
        //                     k,
        //                     {
        //                         DgDataPolicy: {
        //                             policyLink: this.offchainLink(policyLink),
        //                             refCount,
        //                         },
        //                     },
        //                 ];
        //             }
        //             return [k, v]
        //         })
        //     ),
        // };
        // return withParsedOffchainLinks;
    }

    async findCharterData(currentCharterUtxo?: TxInput): Promise<CharterData> {
        // const ts1 = Date.now();
        // if (globalThis.__profile__) {
        //     debugger
        //     console.profile("findCharterData");
        // }
        if (!currentCharterUtxo) {
            currentCharterUtxo = await this.mustFindCharterUtxo();
        }
        // console.log(" -- charter utxo ❌❌❌❌❌❌❌❌❌❌", dumpAny(currentCharterUtxo));
        const charterData = this.newReadDatum(
            currentCharterUtxo.output.datum!.data
        ).CharterData!;
        if (!charterData) throw Error(`invalid charter UTxO datum`);
        return charterData;
        // if (globalThis.__profile__) {
        //     console.profileEnd("findCharterData")
        // }
        // const ts2 = Date.now();
        // console.log(`  ⏱️ findCharterData took ${ts2 - ts1}ms`);
        // return this.parseDelegateLinksInCharter(charterData);
    }

    // async findSettingsUtxo(
    //     charterRefOrInputOrProps?: hasCharterRef | TxInput | CharterDataProps
    // ) {
    //     const chUtxo =
    //         charterRefOrInputOrProps || (await this.mustFindCharterUtxo());
    //     const charterData =
    //         charterRefOrInputOrProps instanceof StellarTxnContext
    //             ? charterRefOrInputOrProps.state.charterData
    //             : !charterRefOrInputOrProps ||
    //               charterRefOrInputOrProps instanceof TxInput
    //             ? await this.findCharterData(chUtxo as TxInput)
    //             : charterRefOrInputOrProps;
    //     const uutName = charterData.settingsUut;

    //     const uutValue = this.uutsValue(uutName);

    //     return await this.mustFindMyUtxo(
    //         "settings uut",
    //         this.uh.mkTokenPredicate(uutValue)
    //     );
    // }

    async connectMintingScript(
        params: SeedTxnScriptParams
    ): Promise<CapoMinter> {
        if (this.minter)
            throw new Error(`just use this.minter when it's already present`);
        const { minterClass } = this;
        const { seedTxn, seedIndex } = params;
        const { mph: expectedMph, rev } = this.configIn || {
            mph: undefined,
            ...(this.constructor as typeof Capo).defaultParams,
        };

        const minter = await this.addStrellaWithConfig(minterClass, {
            rev,
            seedTxn,
            seedIndex,
            capo: this,
        });

        if (expectedMph && !minter.mintingPolicyHash?.isEqual(expectedMph)) {
            throw new Error(
                `This minter script with this seed-utxo doesn't produce the required  minting policy hash\n` +
                    "expected: " +
                    expectedMph.toHex() +
                    "\nactual: " +
                    minter.mintingPolicyHash?.toHex()
            );
        } else if (!expectedMph) {
            console.log(`${this.constructor.name}: seeding new minting policy`);
        }
        minter.mustHaveActivity("mintingCharter");

        //@ts-ignore-error - can't seem to indicate to typescript that minter's type can be relied on to be enough
        return (this.minter = minter);
    }

    /**
     * Finds a sufficient-sized utxo for seeding one or more named tokens
     * @remarks
     *
     * For allocating a charter token (/its minter), one or more UUTs, or other token name(s)
     * to be minted, this function calculates the size of minUtxo needed for all the needed tokens,
     * assuming they'll each be stored in separate utxos.  It then finds and returns a UTxO from the
     * current actor's wallet.  The utxo is NOT implicitly added to the transaction (use tcx.addInput() to add it).
     *
     * When the transaction context already has some utxo's being consumed, they're not
     * eligible for selection.
     *
     * If the transaction doesn't store the new tokens in separate utxos, any spare lovelace
     * are returned as change in the transaction.
     *
     * @param tcx - transaction context
     * @param purpose - a descriptive purpose used during utxo-finding in case of problems
     * @param tokenNames - the token names to be seeded.
     * @public
     **/
    async txnMustGetSeedUtxo(
        tcx: StellarTxnContext,
        purpose: string,
        tokenNames: string[]
    ): Promise<TxInput | never> {
        //! given a Capo-based contract instance having a free TxInput to seed its validator address,
        //! prior to initial on-chain creation of contract,
        //! it finds that specific TxInput in the current user's wallet.

        const fakeMph = new MintingPolicyHash([]);

        const totalMinUtxoValue = tokenNames.reduce(
            addTokenValue.bind(this),
            new Value(0n)
        );
        //! accumulates min-utxos for each stringy token-name in a reduce()
        function addTokenValue(
            this: Capo<any>,
            accumulator: Value,
            tn: string
        ): Value {
            const vMin = this.uh.mkMinTv(fakeMph, tn);
            return accumulator.add(vMin);
        }

        const uutSeed = this.uh.mkValuePredicate(
            totalMinUtxoValue.lovelace,
            tcx
        );
        const seedUtxo = await this.uh
            .mustFindActorUtxo(purpose, uutSeed, tcx)
            .catch((x) => {
                throw x;
            });

        const { txId: seedTxn, utxoIdx } = seedUtxo.id;
        const seedIndex = BigInt(utxoIdx);
        const count =
            tokenNames.length > 1 ? `${tokenNames.length} uuts for ` : "";
        const hex = seedTxn.toHex();
        console.log(
            `Seed tx for ${count}${purpose}: ${hex.slice(0, 8)}…${hex.slice(
                -4
            )}#${seedIndex}`
        );
        return seedUtxo;
    }

    /**
     * Creates a new delegate link, given a delegation role and and strategy-selection details
     * @param tcx - A transaction-context having state.uuts[roleName] matching the roleName
     * @param roleLabel - the role of the delegate, matched with the `delegateRoles()` of `this`
     * @param delegateInfo - partial detail of the delegation with any
     *     details required by the particular role.  Its delegate type may be a subclass of the type
     *     indicated by the `roleName`.
     * @remarks
     *
     * Combines partal and implied configuration settings, validating the resulting configuration.
     *
     * It expects the transaction-context to have a UUT whose name (or a UUT roleName) matching
     * the indicated `roleName`.  Use {@link Capo.txnWillMintUuts|txnWillMintUuts()} or {@link Capo.txnMintingUuts|txnMintingUuts()} to construct
     * a transaction having that and a compliant txn-type.
     *
     * The resulting delegate-linking details can be used with this.mkRelativeDelegateLink() to
     * encode it as an on-chain RelativeLinkLink in the Capo's charter.
     *
     * The delegate-link is by default a contract-based delegate.  If that's not what you want,
     * you can the type-parameters to override it to a more general StellarDelegate type (NOTE: if you
     * find you're needing to specify a more specific contract-based delegate type, please let us know, as
     * our expectation is that the general type for a contract-based delegate should already provide all the
     * necessary type information for all kinds of contract-based delegate subclasses).
     *
     * To get a full DelegateSettings object, use txnCreateDelegateSettings() instead.
     *
     * @public
     *
     * @reqt throws DelegateConfigNeeded with an `errors` entry
     *   ... if there are any problems in validating the net configuration settings.
     * @reqt EXPECTS the `tcx` to be minting a UUT for the delegation,
     *   ... whose UutName can be found in `tcx.state.uuts[roleName]`
     * @reqt combines base settings from the selected delegate class's `defaultParams`
     *   ... adding the delegateRoles()[roleName] configuration for the selected roleName,
     *   ... along with any explicit `config` from the provided `delegateInfo`
     *   ... and automatically applies a `uut` setting.
     *   ... The later properties in this sequence take precedence.
     **/
    async txnCreateOffchainDelegateLink<
        RoLabel extends string & keyof this["delegateRoles"],
        DT extends StellarDelegate = ContractBasedDelegate
    >(
        tcx: hasUutContext<RoLabel>,
        roleLabel: RoLabel,
        delegateInfo: OffchainPartialDelegateLink
    ): Promise<ConfiguredDelegate<DT> & Required<OffchainPartialDelegateLink>> {
        const configured = await this.txnCreateConfiguredDelegate(
            tcx,
            roleLabel,
            delegateInfo
        );
        await configured.delegate.txnReceiveAuthorityToken(
            tcx,
            this.uh.mkMinTv(this.mph, tcx.state.uuts[roleLabel])
        );

        const delegateLink = this.extractDelegateLinkDetails(configured);
        const cacheKey = JSON.stringify(
            delegateLink,
            delegateLinkSerializer
            // 4 // indent 4 spaces
        );
        console.log("offchainDgtLink cache key", roleLabel, cacheKey);
        this.#_delegateCache[roleLabel] = this.#_delegateCache[roleLabel] || {};
        this.#_delegateCache[roleLabel][cacheKey] = configured;
        //@ts-expect-error "could be instantiated with a different type" - TS2352
        return configured as ConfiguredDelegate<DT>;
    }

    /**
     * extracts the key details for creating an on-chain delegate link, given a setup-phase
     * configuration for that delegate.
     */
    mkOnchainRelativeDelegateLink<CT extends ConfiguredDelegate<any>>(
        configured: CT
    ): RelativeDelegateLinkLike {
        const {
            uutName,
            // strategyName,
            delegateValidatorHash,
            config = {},
        } = configured;
        if (!uutName) {
            throw new Error(`missing required uutName for delegate link`);
        }
        console.warn(
            "  -- mkOnchainRelativeDelegateLink: encoding with JSON-ified config",
            config
        );
        return {
            uutName,
            // strategyName,
            delegateValidatorHash,
            config: this.serializeDgtConfig(config),
        };
    }

    /**
     * extracts the key details of a delegate link, given a delegate configuration.
     * @remarks
     * This is valid only during the setup phase of creating a delegate, and does not encode the config entry.
     *
     * use mkRelativeDelegateLink() to encode the config entry, and use this.parseDgtConfig() to decode it.
     */
    extractDelegateLinkDetails<
        CT extends ConfiguredDelegate<DT> | OffchainPartialDelegateLink,
        DT extends StellarDelegate | never = CT extends ConfiguredDelegate<
            infer D
        >
            ? D
            : never
    >(
        configured: CT
    ): CT extends ConfiguredDelegate<any>
        ? CT & OffchainPartialDelegateLink
        : OffchainPartialDelegateLink {
        const {
            uutName,
            // strategyName,
            delegateValidatorHash,
            config = {},
        } = configured;

        return {
            uutName,
            // strategyName,
            delegateValidatorHash,
            config: config,
        } as any;
        // note, the output type is simply based on the input type
    }

    // mkDelegateLink(
    //     dl: OffchainPartialDelegateLink
    // ) {
    //     const { RelativeDelegateLink: hlRelativeDelegateLink } =
    //         this.onChainTypes;

    //     let {
    //         uutName,
    //         // strategyName,
    //         delegateValidatorHash,
    //         config,
    //         // reqdAddress: canRequireAddr,
    //         // addrHint = [],
    //     } = dl;

    //     const delegateLink : RelativeDelegateLinkLike ={
    //         // this.typeToUplc(hlRelativeDelegateLink, {
    //         uutName,
    //         // strategyName,
    //         delegateValidatorHash,
    //         config: textToBytes(JSON.stringify(config, delegateLinkSerializer)), //, 4)
    //     };
    // }

    /**
     * Generates and returns a complete set of delegate settings, given a delegation role and strategy-selection details.
     * @remarks
     *
     * Maps the indicated delegation role to specific UUT details from the provided transaction-context
     * to provide the resulting settings.  The transaction context isn't modified.
     *
     * Behaves exactly like (and provides the core implementation of) {@link Capo.txnCreateOffchainDelegateLink | txnCreateDelegateLink()},
     * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
     *
     * ### Overriding the Delegate Type
     * The configuration is typed for a contract-based delegate by default.  If you need a more general
     * StellarDelegate type (for AuthorityPolicy, for example), you can override the type-parameters (if you are finding
     * that you need to specify a more specific contract-based delegate type, please let us know, as our expectation is that
     * the general type for a contract-based delegate should already provide all the necessary type information for all kinds of
     * contract-based delegate subclasses).
     *
     * See txnCreateDelegateLink for further details.
     * @public
     **/
    async txnCreateConfiguredDelegate<
        RN extends string & keyof this["delegateRoles"],
        DT extends StellarDelegate = ContractBasedDelegate
    >(
        tcx: hasUutContext<RN>,
        roleName: RN,
        delegateInfo: OffchainPartialDelegateLink
    ): Promise<ConfiguredDelegate<DT>> {
        const {
            // strategyName,
            config: explicitConfig = {},
        } = delegateInfo;

        const { delegateRoles } = this;
        const uut = tcx.state.uuts[roleName];
        if (!uut) {
            console.warn(
                `missing required UUT for role '${roleName}' in transaction context:`,
                tcx.state.uuts
            );
            throw new Error(
                `missing required UUT for role '${roleName}' (see logged details)`
            );
        }
        const impliedDelegationDetails = this.mkImpliedDelegationDetails(uut);

        const selectedDgt =
            delegateRoles[roleName] as this["delegateRoles"][RN] //prettier-ignore
        // if (!foundStrategies) {
        //     throw new Error(`no delegateRoles entry for role '${roleName}'`);
        // }
        // const selectedStrategy = foundStrategies.variants[
        //     strategyName
        // ] as DelegateSelection<StellarDelegate>;
        if (!selectedDgt) {
            let msg = `invalid dgt role requested: '${roleName}'`;
            // if (strategyName == "default") {
            //     msg = `no selected or default delegate for role '${roleName}'.  Specify strategyName`;
            // }
            debugger;
            const e = new DelegateConfigNeeded(msg, {
                errorRole: roleName,
                availableDgtNames: Object.keys(delegateRoles),
            });
            throw e;
        }
        const {
            delegateClass,
            config: { validateConfig, partialConfig: paramsFromRole = {} },
        } = selectedDgt;
        const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;

        const configForOnchainRelativeDelegateLink = {
            ...defaultParamsFromDelegateClass,
            ...(paramsFromRole || {}),
            ...explicitConfig,
        };
        const fullCapoDgtConfig: ConfigFor<StellarDelegate> = {
            ...configForOnchainRelativeDelegateLink,
            ...impliedDelegationDetails,
            capo: this,
        } /*as unknown*/ as ConfigFor<StellarDelegate>;

        //! it validates the net configuration so it can return a working config.
        const errors: ErrorMap | undefined =
            (validateConfig && validateConfig(fullCapoDgtConfig)) || undefined;
        if (errors) {
            throw new DelegateConfigNeeded(
                `validation errors in delegateInfo.config for ${roleName}:\n` +
                    errorMapAsString(errors),
                { errors }
            );
        }

        // console.log({fullCapoDgtConfig});

        let delegateSettings: PreconfiguredDelegate<DT> = {} as any;
        let delegate: DT = undefined as any;
        try {
            delegateSettings = {
                ...delegateInfo,
                roleName,
                //@ts-expect-error "could be instantiated with a different type" - TS2352
                //  ... typescript doesn't see the connection between the input settings and this variable
                delegateClass: delegateClass as DT,
                uutName: uut.name,
                fullCapoDgtConfig,
                config: configForOnchainRelativeDelegateLink,
            };
            delegate = await this.mustGetDelegate<DT>(delegateSettings);
        } catch (e:any) {
            console.log("error: unable to create delegate: ", e.stack);
            debugger
            this.mustGetDelegate<DT>(delegateSettings).catch((sameErrorIgnored) => undefined);

            e.message = `${e.message} (see logged details and/or debugging breakpoint)`
            throw e
        }

        // const reqdAddress = delegate.delegateReqdAddress();
        // if (reqdAddress) {
        //     delegateSettings.reqdAddress = reqdAddress;
        // } else {
        //     const addrHint = delegate.delegateAddrHint();
        //     if (addrHint) {
        //         delegateSettings.addrHint = addrHint;
        //     }
        // }

        const { uutName } = delegateSettings;
        if (!uutName) {
            throw new Error(`missing required uutName in delegateSettings`);
        }
        const { delegateValidatorHash } = delegate;
        const pcd: ConfiguredDelegate<DT> & { uutName: string } = {
            ...delegateSettings,
            config: configForOnchainRelativeDelegateLink,
            uutName,

            delegateValidatorHash,
            delegate,
        };
        return pcd;
    }

    mkImpliedDelegationDetails(uut: UutName): DelegationDetail {
        return {
            capoAddr: this.address,
            mph: this.mph,
            tn: stringToNumberArray(uut.name),
        };
    }

    #_delegateCache: {
        [roleName: string]: {
            [delegateLink: string]: {
                // strategyName: string;
                delegate: StellarDelegate;
            };
        };
    } = {};

    // get connectDelegate()
    async connectDelegateWithOnchainRDLink<
        RN extends string & keyof this["delegateRoles"],
        DT extends StellarDelegate = ContractBasedDelegate // StellarDelegate
    >(
        roleLabel: RN,
        //!!! OK: using Ergo because the links are from charterData
        delegateLink: RelativeDelegateLinkLike // | OffchainRelativeDelegateLink |
    ): Promise<DT> {
        const role = this.delegateRoles[roleLabel] as DelegateSetup<
            any,
            DT,
            any
        >;

        //!!! work on type-safety with roleName + available roles
        const onchainDgtLink = this.reader.RelativeDelegateLink(
            this.onchain.types.RelativeDelegateLink(delegateLink)
        );
        const selectedDgt = role.delegateClass;

        const cache = this.#_delegateCache;
        const cacheKey = JSON.stringify(
            onchainDgtLink,
            // this.parseDgtConfig(delegateLink),
            delegateLinkSerializer
        );

        if (!cache[roleLabel]) cache[roleLabel] = {};
        const roleCache = cache[roleLabel];
        console.log(
            "connectDgtWithOnchainRDLink cache key",
            roleLabel,
            cacheKey
        );
        const cachedRole = roleCache[cacheKey];
        if (cachedRole) {
            const {
                // strategyName,
                delegate,
            } = cachedRole;
            console.log(`  ✅ 💁 ${roleLabel} - from cache `);
            return delegate as DT;
        }
        console.log(`   🔎delegate 💁 ${roleLabel}`);
        // console.log(`   ----- delegate '${roleName}' cache key `, cacheKey);

        const {
            // strategyName,
            uutName,
            delegateValidatorHash: expectedDvh,
            // addrHint,  //moved to config
            // reqdAddress,  // removed
            config: configBytesFromLink,
        } = onchainDgtLink;

        // as ConfiguredDelegate<StellarDelegate>;
        // variants[
        //     strategyName
        /* ]as unknown */ if (!selectedDgt) {
            throw new Error(
                `no selected dgt for role '${roleLabel}'\n` +
                    `link details: ${this.showDelegateLink(delegateLink)}`
            );
        }
        const {
            delegateClass,
            config: { partialConfig: dgtMapSettings },
        } = role;
        const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
        const impliedDelegationDetails = this.mkImpliedDelegationDetails(
            new UutName(roleLabel, uutName)
        );

        const effectiveConfig = {
            ...defaultParamsFromDelegateClass,
            ...dgtMapSettings,
        };

        if ((effectiveConfig.rev as bigint | string) === "1") {
            debugger;
        }

        const serializedCfg1 = JSON.stringify(
            effectiveConfig,
            delegateLinkSerializer,
            4
        );
        const parsedConfigFromLink = this.parseDgtConfig(delegateLink);
        const serializedCfg2 = JSON.stringify(
            parsedConfigFromLink,
            delegateLinkSerializer,
            4
        );
        if (serializedCfg1 !== serializedCfg2) {
            console.warn(
                `mismatched or modified delegate configuration for role '${roleLabel}'\n` +
                    `  ...expected: ${serializedCfg1}\n` +
                    `  ...got: ${serializedCfg2}`
            );
        }

        //@xxxts-expect-error because this stack of generically partial
        //  ... config elements isn't recognized as adding up to a full config type.
        // NOTE: THIS GETS AN EXISTING DELEGATE, and includes baseline config details.
        // See also the create-delegate code path in txnCreateConfiguredDelegate(), which
        // ... which also includes baseline config details.  IF YOU'RE ADDING STUFF HERE,
        // ... consider that it might also be needed there.
        const fullCapoDgtConfig: ConfigFor<StellarDelegate> = {
            ...effectiveConfig,
            ...parsedConfigFromLink,
            ...impliedDelegationDetails,
            capo: this,
        };
        //configured delegate:
        // delegateClass: stellarSubclass<DT>;
        //!  //  delegate: DT // omitted in "pre-configured";
        // roleName: string;
        // config: ConfigFor<DT>;
        //... from relativeDelegateLink:
        //      uutName: string;
        //      strategyName: string;
        //      config: Partial<ConfigFor<T>>;
        //      reqdAddress?: Address;
        //      addrHint?: Address[];

        const delegate = await this.mustGetDelegate({
            delegateClass,
            fullCapoDgtConfig,
            roleName: roleLabel,
            uutName,
            // strategyName,
            config: parsedConfigFromLink,
            // reqdAddress,
            // addrHint,
        });

        const dvh = delegate.delegateValidatorHash!;

        if (expectedDvh && dvh && !expectedDvh.isEqual(dvh)) {
            throw new Error(
                `${
                    this.constructor.name
                }: ${roleLabel}: mismatched or modified delegate: expected validator ${expectedDvh?.toHex()}, got ${dvh.toHex()}`
            );
        }
        console.log(
            `   ✅ 💁 ${roleLabel}  (now cached) ` // +Debug info: +` @ key = ${cacheKey}`
        );
        roleCache[cacheKey] = {
            delegate,
            // strategyName,
        };
        return delegate as DT;
    }

    private showDelegateLink(delegateLink: RelativeDelegateLinkLike) {
        return JSON.stringify(delegateLink, null, 2);
    }

    async mustGetDelegate<T extends StellarDelegate>(
        configuredDelegate: PreconfiguredDelegate<T>
    ): Promise<T> {
        const { delegateClass, fullCapoDgtConfig: config } = configuredDelegate;
        try {
            // delegate
            const configured = await this.addStrellaWithConfig(
                delegateClass,
                config as any
            );
            return configured as T;
        } catch (e: any) {
            const t = e.message.match(/invalid parameter name '([^']+)'$/);

            const [_, badParamName] = t || [];
            if (badParamName) {
                throw new DelegateConfigNeeded(
                    "configuration error while parameterizing contract script",
                    { errors: { [badParamName]: e.message } }
                );
            }
            throw e;
        }
    }

    tvForDelegate(dgtLink: ErgoRelativeDelegateLink) {
        return this.tokenAsValue(dgtLink.uutName);
    }

    mkDelegatePredicate(dgtLink: ErgoRelativeDelegateLink) {
        return this.uh.mkTokenPredicate(this.tvForDelegate(dgtLink));
    }

    get capoHelpers(): HeliosModuleSrc {
        return CapoHelpers;
    }

    @Activity.redeemer
    activityUpdatingCharter(): isActivity {
        return {
            redeemer: this.activityVariantToUplc("updatingCharter", {}),
        };
    }

    @Activity.redeemer
    activitySpendingDelegatedDatum() {
        return {
            redeemer: this.activityVariantToUplc("spendingDelegatedDatum", {}),
        };
    }

    // @Activity.redeemer
    // activityUpdatingSettings(): isActivity {
    //     return {
    //         redeemer: this.activityVariantToUplc("updatingSettings", {}),
    //     };
    // }

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
        return this._delegateRoles;
    }

    _delegateRoles!: basicDelegateMap<any> &
        ReturnType<this["initDelegateRoles"]>;
    abstract initDelegateRoles(): // THISTYPE extends Capo<any>, //<
    // myDelegateRoles extends basicRoleMap
    //        >(
    // this: THISTYPE
    basicDelegateMap<any>; // & myDelegateRoles;

    addressAuthorityConfig(): DelegateConfigDetails<AuthorityPolicy> {
        return {
            validateConfig(args): delegateConfigValidation {
                const { rev, tn, addrHint } = args;

                const errors: ErrorMap = {};
                if (!rev) errors.rev = ["required"];
                if (!tn?.length) errors.tn = ["(token-name) required"];

                if (!addrHint?.length)
                    errors.addrHint = ["destination address required"];
                if (Object.keys(errors).length > 0) return errors;

                return undefined;
            },
        };
    }

    basicDelegateRoles(): basicDelegateMap {
        const myRoles = delegateRoles({
            govAuthority: defineRole(
                "authority",
                AnyAddressAuthorityPolicy,
                this.addressAuthorityConfig(),
                "capoGov"
                // multisig: {
                //     delegateClass: MultisigAuthorityPolicy,
                //     validateConfig(args): strategyValidation {
                //         const { rev, uut } = args;
                //         const errors: ErrorMap = {};
                //         if (!rev) errors.rev = ["required"];
                //         if (!uut) errors.uut = ["required"];
                //         if (Object.keys(errors).length > 0) return errors;

                //         return undefined;
                //     },
                // },
            ),
            mintDelegate: defineRole("mintDgt", BasicMintDelegate, {
                partialConfig: {},
                validateConfig(args): delegateConfigValidation {
                    return undefined;
                },
            }),

            spendDelegate: defineRole("spendDgt", BasicMintDelegate, {
                partialConfig: {},
                validateConfig(args): delegateConfigValidation {
                    return undefined;
                },
            }),
            // otherNamedDelegates: none by default
            //     namedDelegate: defineRole("namedDgt",
            //         //@ts-expect-error assigning abstract class where it prefers a concrete class
            //         StellarDelegate,
            //         {
            //             // no named delegates by default
            //         }
            //     ),
        });
        return myRoles;
        //as ROLEMAP
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
        if (rcsh && !rcsh.isEqual(this.validatorHash!)) {
            console.error(
                `expected: ` +
                    rcsh.toHex() +
                    `\n  actual: ` +
                    this.validatorHash!.toHex()
            );

            throw new Error(
                `${this.constructor.name}: the leader contract script '${this.program.name}', or one of its dependencies, has been modified`
            );
        }

        const charter = await this.findCharterData();
        const { govAuthorityLink, mintDelegateLink, spendDelegateLink } =
            charter;

        return Promise.all([
            this.connectDelegateWithOnchainRDLink<
                "mintDelegate",
                BasicMintDelegate
            >("mintDelegate", mintDelegateLink),
            this.connectDelegateWithOnchainRDLink<
                "govAuthority",
                AuthorityPolicy
            >("govAuthority", govAuthorityLink),
            this.connectDelegateWithOnchainRDLink<
                "spendDelegate",
                ContractBasedDelegate
            >("spendDelegate", spendDelegateLink),
        ]);
    }

    // /**
    //  * @deprecated - use this.mkDatum.CharterData({...}) instead
    //  */
    // @datum
    // async mkDatumCharterData(args: CharterDataLike): Promise<Datum> {
    //     throw new Error(`obsolete`);

    //     return this.inlineDatum("CharterData", {
    //         govAuthorityLink: this.mkDelegateLink(args.govAuthorityLink),
    //         mintDelegateLink: this.mkDelegateLink(args.mintDelegateLink),
    //         mintInvariants: args.mintInvariants.map((dl) => {
    //             return this.mkDelegateLink(dl);
    //         }),
    //         spendDelegateLink: this.mkDelegateLink(args.spendDelegateLink),
    //         spendInvariants: args.spendInvariants.map((dl) => {
    //             return this.mkDelegateLink(dl);
    //         }),
    //         // settingsUut: this.mkSettingsUutName(args.settingsUut),
    //         otherNamedDelegates: new Map<string, any>(
    //             Object.entries(args.otherNamedDelegates).map(([k, v]) => {
    //                 return [k, this.mkDelegateLink(v)];
    //             })
    //         ),
    //         manifest: new Map(
    //             [...args.manifest.entries()].map(([k, v]) => {
    //                 if (v.DgDataPolicy) {
    //                     const { policyLink, refCount } = v.DgDataPolicy;
    //                     return [
    //                         k,
    //                         {
    //                             DgDataPolicy: {
    //                                 policyLink: this.mkDelegateLink(policyLink),
    //                                 refCount,
    //                             },
    //                         },
    //                     ];
    //                 }
    //                 return [k, v];
    //             })
    //         ),
    //         // typeMapUut: this.mkSettingsUutName(args.typeMapUut),
    //     });
    // }

    // mkSettingsUutName(settingsUut: UutName | number[]) {
    //     return settingsUut instanceof UutName
    //         ? textToBytes(settingsUut.name)
    //         : settingsUut;
    // }

    @datum
    mkDatumScriptReference() {
        return this.inlineDatum("ScriptReference", {});
    }

    datumAdapters!: Record<string, DelegatedDatumAdapter<any>> &
        Awaited<ReturnType<this["initDelegatedDatumWrappers"]>>;

    // @datum
    // async mkDatumSettingsData<THISTYPE extends Capo<any>>(
    //     this: THISTYPE,
    //     settings: CapoOffchainSettingsType<THISTYPE>
    // ): Promise<TxOutputDatum> {
    //     const adapter = this.settingsAdapter;

    //     return adapter.toOnchainDatum(settings) as any;
    // }

    async findGovDelegate(charterData?: CharterData) {
        const chD = charterData || (await this.findCharterData());

        const capoGovDelegate = await this.connectDelegateWithOnchainRDLink(
            "govAuthority",
            chD.govAuthorityLink
        );
        console.log(
            "finding charter's govDelegate via link",
            chD.govAuthorityLink
        );

        return capoGovDelegate;
    }

    async txnAddGovAuthority<TCX extends StellarTxnContext>(
        tcx: TCX
    ): Promise<TCX & hasGovAuthority> {
        const charterDataMaybe =
            "charterData" in tcx.state
                ? (tcx.state.charterData as CharterData)
                : undefined;
        //@ts-expect-error on this type-probe
        if (tcx.state.govAuthority) {
            return tcx as TCX & hasGovAuthority;
        }
        const capoGovDelegate = await this.findGovDelegate(charterDataMaybe);
        console.log("adding charter's govAuthority");

        // !!! TODO: add a type to the TCX, indicating presence of the govAuthority UUT
        const tcx2 = (await capoGovDelegate.txnGrantAuthority(tcx)) as TCX &
            hasGovAuthority;
        tcx2.state.govAuthority = capoGovDelegate;
        return tcx2;
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

    //     const tcx2 = await this.txnAddCharterRef(tcx);
    //     return this.txnAddMintDelegate(tcx2);
    // }

    // async getMintDelegate<
    //     THIS extends Capo<any>,
    //     MDT extends BasicMintDelegate & THIS["delegateRoles"]["mintDgt"] extends RoleInfo<any, any, infer DT> ? DT : never
    // >() : Promise<MDT>{
    async getMintDelegate(
        // <
        //     T extends BasicMintDelegate=BasicMintDelegate
        // >(
        charterData?: Option<CharterData>
    ): Promise<BasicMintDelegate> {
        if (!this.configIn) {
            throw new Error(`what now?`);
        }
        //!!! needs to work also during bootstrapping.
        const chD = charterData || (await this.findCharterData());

        return this.connectDelegateWithOnchainRDLink<
            "mintDelegate",
            BasicMintDelegate
        >("mintDelegate", chD.mintDelegateLink);
    }

    async getSpendDelegate(charterData?: Option<CharterData>) {
        const chD = charterData || (await this.findCharterData());
        // if (!charterData) {
        //     charterData = await this.findCharterData();
        // }

        return this.connectDelegateWithOnchainRDLink<
            "spendDelegate",
            BasicMintDelegate
        >("spendDelegate", chD.spendDelegateLink);
    }

    /**
     * Finds the delegated-data controller for a given typeName.
     * @remarks
     * REQUIRES that the Capo manifest contains an installed DgDataPolicy
     * and that the off-chain Capo delegateMap provides an off-chain controller
     * for that typeName.
     */
    async getDgDataController(typeName: string, charterData?: CharterData) {
        const chD = charterData || (await this.findCharterData());
        const foundME = chD.manifest.get(typeName);
        if (!foundME) {
            throw new Error(`no manifest entry found with link to installed ${typeName}`);
        }
        if (foundME?.entryType.DgDataPolicy) {
            return this.connectDelegateWithOnchainRDLink<
                typeof typeName,
                ContractBasedDelegate
            >(typeName, foundME.entryType.DgDataPolicy.policyLink);
        } else {
            const actualEntryType = Object.keys(foundME.entryType)[0];
            throw new Error(
                `invalid data-controller name '${typeName}' is invalid as a data-controller name; \n"+
                "  ... manifest entry has type '${actualEntryType}', not DgDataPolicy!`
            );
        }
        // return this.connectDelegateWithLink("dgDataPolicy", dgDataPolicy);
    }

    /**
     * @deprecated - use getOtherNamedDelegate() or getDgDataController() instead
     */
    getNamedDelegate() {
    }
    /**
     * Finds a contract's named delegate, given the expected delegateName.
     * @remarks
     * @public
     **/
    async getOtherNamedDelegate(
        delegateName: string,
        charterData?: CharterData
    ): Promise<ContractBasedDelegate> {
        const chD = charterData || (await this.findCharterData());

        const foundDelegateLink = chD.otherNamedDelegates.get(delegateName);
        if (!foundDelegateLink) {
            throw new Error(
                `${this.constructor.name}: no namedDelegate found: ${delegateName}`
            );
        }
        return this.connectDelegateWithOnchainRDLink<
            typeof delegateName,
            ContractBasedDelegate
        >(delegateName, foundDelegateLink);
    }

    async getNamedDelegates(charterData?: CharterData) {
        const chD = charterData || (await this.findCharterData());
        const namedDelegates = chD.otherNamedDelegates;

        const allNamedDelegates = [...namedDelegates.entries()].map(
            async ([otherDgtName, v]) => {
                return [
                    otherDgtName,
                    await this.connectDelegateWithOnchainRDLink<
                        typeof otherDgtName,
                        ContractBasedDelegate
                    >(otherDgtName, v),
                ] as [string, ContractBasedDelegate];
            }
        );

        const done = await Promise.all(allNamedDelegates);
        return Object.fromEntries(done);
    }

    async getGovDelegate(charterData?: CharterData) {
        throw new Error("unused");
    }

    /**
     * helper for test environment, allowing an abortive initial charter-creation, without
     * most of the costs, but enabling named-delegate scripts to be compiled/validated
     * much earlier in the test lifecycle.  The real charter process can then continue without
     * duplicating any of the dry-run setup costs.
     */
    didDryRun: {
        minter: CapoMinter;
        seedUtxo: TxInput;
        configIn: CapoConfig;
        args: MinimalCharterDataArgs;
    } = {} as any;

    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * The returned transaction context has `state.bootstrappedConfig` for
     * capturing the details for reproducing the contract's settings and on-chain
     * address.
     *
     * @param charterDataArgs - initial details for the charter datum
     * @param existinTcx - any existing transaction context
     * @typeParam TCX - inferred type of a provided transaction context
     * @public
     **/
    // @txn
    async mkTxnMintCharterToken<
        TCX extends undefined | StellarTxnContext<anyState>,
        TCX2 extends StellarTxnContext<anyState> = hasBootstrappedCapoConfig &
            (TCX extends StellarTxnContext<infer TCXT>
                ? StellarTxnContext<TCXT>
                : unknown),
        TCX3 = TCX2 &
            hasAddlTxns<TCX2> &
            hasUutContext<
                | "govAuthority"
                | "capoGov"
                | "mintDelegate"
                | "mintDgt"
                | "setting"
            >
    >(
        charterDataArgs: MinimalCharterDataArgs,
        existingTcx?: TCX,
        dryRun?: "DRY_RUN"
    ) {
        const dry: typeof this.didDryRun =
            this.didDryRun || ({} as unknown as typeof this.didDryRun);
        const didHaveDryRun = !!dry.minter;
        if (didHaveDryRun) {
            console.log(
                `🔁 resuming charter setup after partial setup in dry-run`
            );

            if (
                JSON.stringify(dry.args, delegateLinkSerializer) !==
                JSON.stringify(charterDataArgs, delegateLinkSerializer)
            ) {
                throw new Error(`dry-run args mismatch`);
            }
            if (
                JSON.stringify(dry.configIn, delegateLinkSerializer) !==
                JSON.stringify(this.configIn, delegateLinkSerializer)
            ) {
                throw new Error(`dry-run config mismatch`);
            }
            // if (this.didDryRun) {
            //     this.minter = undefined as any
            //     this.configIn = undefined
            // }
        } else if (this.configIn) {
            throw new Error(
                `this contract suite is already configured and can't be re-chartered`
            );
        }
        if (dryRun) {
            console.log(`  🏃 dry-run mode for charter setup`);
        }
        type hasBsc = hasBootstrappedCapoConfig;
        //@ts-expect-error yet another case of seemingly spurious "could be instantiated with a different subtype" (actual fixes welcome :pray:)
        const initialTcx: TCX2 & hasBsc =
            existingTcx || (this.mkTcx("mint charter token") as hasBsc);

        const tcxWithSeed = !!dry.seedUtxo
            ? await this.tcxWithSeedUtxo(
                  initialTcx.addInput(dry.seedUtxo),
                  dry.seedUtxo
              )
            : await this.tcxWithSeedUtxo(initialTcx);

        const seedUtxo = tcxWithSeed.state.seedUtxo;
        const { txId: seedTxn, utxoIdx } = seedUtxo.id;
        const seedIndex = BigInt(utxoIdx);

        const minter =
            dry.minter ||
            (await this.connectMintingScript({
                seedIndex,
                seedTxn,
            }));

        const { mintingPolicyHash: mph } = minter;
        if (!didHaveDryRun) {
            const csp = //this.getContractScriptParamsUplc(
                this.partialConfig as CapoConfig;

            const bsc = {
                ...csp,
                mph,
                seedTxn,
                seedIndex,
            }; // as configType;
            // this.scriptProgram = this.loadProgramScript({ ...csp, mph });
            this.contractParams = this.getContractScriptParamsUplc(bsc);
            const fullScriptParams = (this.contractParams =
                this.contractParams);

            // this.scriptProgram = this.loadProgramScript();
            await this.compileWithScriptParams();
            bsc.rootCapoScriptHash = new ValidatorHash(
                this.compiledScript.hash()
            );

            this.configIn = bsc;
        }
        tcxWithSeed.state.bsc = this.configIn!;
        tcxWithSeed.state.bootstrappedConfig = JSON.parse(
            JSON.stringify(this.configIn, delegateLinkSerializer)
        );

        const uutPurposes = [
            "capoGov" as const,
            "mintDgt" as const,
            "spendDgt" as const,
            // "set" as const,
        ];
        const tcx = await this.txnWillMintUuts(
            tcxWithSeed,
            uutPurposes,
            { usingSeedUtxo: seedUtxo },
            {
                govAuthority: "capoGov",
                mintDelegate: "mintDgt",
                spendDelegate: "spendDgt",
                // settings: "set",
            }
        );
        const { uuts } = tcx.state;

        if (uuts.govAuthority !== uuts.capoGov) {
            throw new Error(`assertion can't fail`);
        }

        if (dryRun) {
            // this.configIn = undefined;
            this.didDryRun = {
                minter,
                seedUtxo,
                configIn: this.configIn!,
                args: charterDataArgs,
            };
            console.log(`  🏃  dry-run charter setup done`);

            return tcx as TCX3 & Awaited<typeof tcx>;
        } else {
            this.didDryRun = {} as any;
        }

        const govAuthority = await this.txnCreateOffchainDelegateLink(
            tcx,
            "govAuthority",
            charterDataArgs.govAuthorityLink
        );

        const mintDelegate = await this.txnCreateOffchainDelegateLink(
            tcx,
            "mintDelegate",
            charterDataArgs.mintDelegateLink
        );

        const spendDelegate = await this.txnCreateOffchainDelegateLink(
            tcx,
            "spendDelegate",
            charterDataArgs.spendDelegateLink
        );

        this.bootstrapping = {
            govAuthority,
            mintDelegate,
            spendDelegate,
        };
        const charterOut = new TxOutput(
            this.address,
            this.tvCharter(),
            this.onchain.datum?.CharterData({
                govAuthorityLink:
                    this.mkOnchainRelativeDelegateLink(govAuthority),
                spendDelegateLink:
                    this.mkOnchainRelativeDelegateLink(spendDelegate),
                mintDelegateLink:
                    this.mkOnchainRelativeDelegateLink(mintDelegate),

                // empty items during charter setup:
                otherNamedDelegates: new Map(),
                manifest: new Map(),
                spendInvariants: [],
                mintInvariants: [],
                pendingDgtChanges: [],
            })
            // this.compiledScript
        );
        charterOut.correctLovelace(this.networkParams);

        // tcx.addInput(seedUtxo);
        tcx.addOutputs([charterOut]);

        // mints the charter, along with the capoGov and mintDgt UUTs.
        // TODO: if there are additional UUTs needed for other delegates, include them here.
        const tcxWithCharterMint = await this.minter.txnMintingCharter(tcx, {
            owner: this.address,
            capoGov: uuts.capoGov, // same as govAuthority,
            mintDelegate: uuts.mintDelegate,
            spendDelegate: uuts.spendDelegate,
            // settingsUut: uuts.set,
        });

        // const settings =
        //     (await this.mkInitialSettings()) as unknown as CapoOffchainSettingsType<this>;
        // const tcxWithSettings = await this.txnAddSettingsOutput(
        //     tcxWithMint,
        //     settings
        // );

        // creates an addl txn that stores a refScript in the delegate;
        //   that refScript could be stored somewhere else instead (e.g. the Capo)
        //   but for now it's in the delegate addr.
        const tcx2 = await this.txnMkAddlRefScriptTxn(
            tcxWithCharterMint,
            "mintDelegate",
            mintDelegate.delegate.compiledScript
        );
        const tcx3 = await this.txnMkAddlRefScriptTxn(
            tcxWithCharterMint,
            "capo",
            this.compiledScript
        );
        const tcx4 = await this.txnMkAddlRefScriptTxn(
            tcxWithCharterMint,
            "minter",
            minter.compiledScript
        );
        const tcx4a = await this.mkAdditionalTxnsForCharter(tcxWithCharterMint);
        if (!tcx4a)
            throw new Error(
                `${this.constructor.name}: mkAdditionalTxnsForCharter() must return a txn context`
            );

        console.log(
            " --------------------- CHARTER MINT ---------------------\n"
            // txAsString(tcx4.tx, this.networkParams)
        );

        // type Normalize<T> =
        //     T extends (...args: infer A) => infer R ? (...args: Normalize<A>) => Normalize<R>
        //     : T extends any ? {[K in keyof T]: Normalize<T[K]>} : never

        return tcxWithCharterMint as TCX3 & Awaited<typeof tcxWithCharterMint>;
    }

    // async findSettingsDatum<thisType extends Capo<any>>(
    //     this: thisType,
    //     {
    //         settingsUtxo,
    //         tcx,
    //         charterUtxo,
    //     }: {
    //         settingsUtxo?: TxInput;
    //         tcx?: hasCharterRef;
    //         charterUtxo?: TxInput;
    //     } = {}
    // ): Promise<CapoOffchainSettingsType<thisType>> {
    //     const foundSettingsUtxo =
    //         settingsUtxo || (await this.findSettingsUtxo(tcx || charterUtxo));

    //     const data = (await this.readDatum(
    //         this.settingsAdapter,
    //         foundSettingsUtxo.output.datum as InlineDatum,
    //         "ignoreOtherTypes"
    //     )) as CapoOffchainSettingsType<thisType>;

    //     if (!data) throw Error(`missing or invalid settings UTxO datum`);
    //     return data;
    // }

    // async txnAddSettingsOutput<
    //     TCX extends StellarTxnContext<hasAllUuts<"set">>
    // >(tcx: TCX, settings: CapoOffchainSettingsType<this>): Promise<TCX> {
    //     const settingsDatum = await this.mkDatumSettingsData(
    //         {
    //             id: tcx.state.uuts.set.name,
    //             ... (settings as any),
    //         });

    //     const settingsOut = new TxOutput(
    //         this.address,
    //         this.uutsValue(tcx.state.uuts.set),
    //         settingsDatum
    //     );
    //     settingsOut.correctLovelace(this.networkParams);
    //     return tcx.addOutput(settingsOut);
    // }

    // /**
    //  * @deprecated - use tcxWithSettingsRef() instead
    //  */
    // async addSettingsRef<TCX extends StellarTxnContext>(
    //     tcx: TCX
    // ): Promise<TCX & hasSettingsRef> {
    //     return this.tcxWithSettingsRef(tcx);
    // }
    // /**
    //  * ensures that the transaction context has a reference to the settings UTXO
    //  * @public
    //  * @remarks
    //  *
    //  * Accepts a transaction context, and ensures that it has a reference to the
    //  * settings UTXO.  If the transaction context already has a settings reference,
    //  * it is returned as-is.  Otherwise, the settings UTXO is found and added to
    //  * the transaction context.
    //  */
    // async tcxWithSettingsRef<TCX extends StellarTxnContext>(
    //     tcx: TCX
    // ): Promise<TCX & hasSettingsRef> {
    //     if (
    //         //@ts-expect-error on type-probe:
    //         tcx.state.settingsRef
    //     )
    //         return tcx as TCX & hasSettingsRef;

    //     const settingsUtxo = await this.findSettingsUtxo(
    //         //@ts-expect-error it's ok if it's not there
    //         tcx.state.charterData
    //     );
    //     const tcx2 = tcx.addRefInput(settingsUtxo) as TCX & hasSettingsRef;
    //     tcx2.state.settingsRef = settingsUtxo;

    //     return tcx2;
    // }

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
        RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any>
            ? TCX
            : hasAddlTxns<TCX>
    >(tcx: TCX, scriptName: string, script: anyUplcProgram): Promise<RETURNS> {
        const refScriptUtxo = new TxOutput(
            this.address,
            new Value(this.ADA(0n)),
            this.mkDatumScriptReference(),
            script
        );
        refScriptUtxo.correctLovelace(this.networkParams);
        const nextTcx = this.mkTcx().addOutput(refScriptUtxo);

        const sn = scriptName[0].toUpperCase() + scriptName.slice(1);

        return tcx.includeAddlTxn(`refScript${sn}`, {
            description: `creates on-chain reference script for ${scriptName}`,
            moreInfo: "saves txn fees and txn space in future txns",
            optional: false,
            tcx: nextTcx,
        }) as RETURNS;
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
        program: anyUplcProgram = this.compiledScript,
        useRefScript = true
    ): Promise<TCX> {
        let expectedVh = program.hash();
        const isCorrectRefScript = (txin: TxInput) => {
            const refScript = txin.output.refScript;
            if (!refScript) return false;

            const foundHash = refScript.hash();
            return equalsBytes(foundHash, expectedVh);
        };
        if (tcx.txRefInputs.find(isCorrectRefScript)) {
            console.warn("suppressing second add of refScript");
            return tcx;
        }
        const scriptReferences = useRefScript
            ? await this.findScriptReferences()
            : [];
        // for (const [txin, refScript] of scriptReferences) {
        //     console.log("refScript", dumpAny(txin));
        // }

        const matchingScriptRefs = scriptReferences.find(([txin, refScript]) =>
            isCorrectRefScript(txin)
        );
        if (!matchingScriptRefs) {
            console.warn(
                `⚠️  missing refScript in Capo ${this.address.toBech32()} \n  ... for expected script hash ${bytesToHex(
                    expectedVh
                )}; adding script directly to txn`
            );
            // console.log("------------------- NO REF SCRIPT")
            return tcx.addScriptProgram(program);
        }
        // console.log("------------------- REF SCRIPT")
        return tcx.addRefInput(matchingScriptRefs[0]);
    }

    async findScriptReferences() {
        const utxos = await this.network.getUtxos(this.address);
        type TxoWithScriptRefs = [TxInput, any];
        // console.log("finding script refs", utxos);
        const utxosWithDatum = (
            await Promise.all(
                utxos.map((utxo) => {
                    const { datum } = utxo.output;
                    // console.log("datum", datum);
                    if (!datum) return null;
                    return this.readDatum(
                        "ScriptReference",
                        datum,
                        "ignoreOtherTypes"
                    )
                        .catch(() => {
                            // console.log("we don't care about utxos that aren't of the ScriptReference type")
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
    async mkTxnUpdateCharter<TCX extends StellarTxnContext>(
        args: CharterDataLike,
        activity: isActivity = this.activityUpdatingCharter(),
        tcx: TCX = this.mkTcx() as TCX
    ): Promise<StellarTxnContext> {
        console.log("update charter", { activity });
        return this.txnUpdateCharterUtxo(tcx, activity, args);
    }

    // @txn
    // async mkTxnUpdateOnchainSettings<TCX extends StellarTxnContext>(
    //     data: CapoOffchainSettingsType<this>,
    //     settingsUtxo?: TxInput,
    //     tcx: StellarTxnContext = new StellarTxnContext(this.setup)
    // ): Promise<TCX> {
    //     // uses the charter ref input
    //     settingsUtxo = settingsUtxo || (await this.findSettingsUtxo());
    //     const spendingDelegate = await this.getSpendDelegate();
    //     const mintDelegate = await this.getMintDelegate();

    //     const tcx2 = await this.txnAddGovAuthority(tcx);
    //     const tcx2a = await this.txnAddCharterRef(tcx2);
    //     const tcx2b = await this.txnAttachScriptOrRefScript(tcx2a);
    //     const tcx2c = await spendingDelegate.txnGrantAuthority(
    //         tcx2b,
    //         spendingDelegate.activityValidatingSettings()
    //     );

    //     // console.log("   🐞🐞🐞🐞🐞🐞🐞🐞")
    //     const tcx2d = await mintDelegate.txnGrantAuthority(
    //         tcx2c,
    //         mintDelegate.activityValidatingSettings()
    //     );

    //     const { charterData } = tcx2d.state;
    //     const namedDelegates = charterData.namedDelegates;

    //     let tcx3: typeof tcx2d = tcx2d;
    //     for (const [delegateName, delegate] of Object.entries(
    //         await this.getNamedDelegates()
    //     )) {
    //         tcx3 = await this.txnAddNamedDelegateAuthority(
    //             tcx3,
    //             delegateName,
    //             delegate,
    //             delegate.activityValidatingSettings()
    //         );
    //     }

    //     const settingsDatum = await this.mkDatumSettingsData(data);
    //     const tcx4 = tcx3
    //         .addInput(settingsUtxo, this.activityUpdatingSettings())
    //         .addOutput(
    //             new TxOutput(
    //                 this.address,
    //                 settingsUtxo.output.value,
    //                 settingsDatum
    //             )
    //         );
    //     return tcx4 as TCX & typeof tcx3;
    // }

    @partialTxn
    async txnAddNamedDelegateAuthority<TCX extends StellarTxnContext>(
        tcx: TCX,
        delegateName: string,
        delegate: ContractBasedDelegate,
        activity: isActivity
    ): Promise<TCX> {
        return delegate.txnGrantAuthority(tcx, activity);
    }

    /**
     * Returns a single item from a list, throwing an error if it has multiple items
     *
     */
    singleItem<T>(xs: Array<T>): T {
        const [first, ...excess] = xs;
        if (excess.length) {
            throw new Error("expected single item, got " + excess.length);
        }
        return first;
    }

    /**
     * Queries a chain-index to find utxos having a specific type of delegated datum
     * @remarks
     * Optionally filters records by `id`, `type` and/or `predicate`
     *
     * The `predicate` function, if provided, can implement any logic suitable for a specific case of data-finding.
     */
    async findDelegatedDataUtxos<
        const T extends undefined | (string & keyof this["delegateRoles"]),
        // prettier-ignore
        ADAPTER_TYPE extends DelegatedDatumAdapter<any> | undefined
                = T extends keyof this["datumAdapters"]
                ? this["datumAdapters"][T]
                : undefined,
        DATUM_TYPE extends anyDatumProps &
            AnyDataTemplate<T extends undefined ? any : T, any> = any
        // &DatumAdapterAppType<ADAPTER_TYPE> = DatumAdapterAppType<ADAPTER_TYPE>
    >({
        type,
        id,
        predicate,
        query,
    }: {
        type?: T;
        id?: string | UutName;
        predicate?: DelegatedDataPredicate<DATUM_TYPE>;
        query?: never; // todo
    }): Promise<FoundDatumUtxo<DATUM_TYPE>[]> {
        if (!type && !predicate && !id) {
            throw new Error("Must provide either type, predicate or id");
        }
        if (id && predicate) {
            throw new Error("Cannot provide both id and predicate");
        }
        if (id) {
            predicate = (utxo, data) => data.id == id.toString();
        }
        // console.log("\n\n\n\n\n\n\n\n\n======= findDelegatedDataUtxos =======\n\n\n\n\n\n\n\n\n");
        // console.log({ type, types: Object.keys(this.datumAdapters)})
        const hasType = !!type;
        if ("undefined" !== typeof type) {
            const hasAdapterForIt = this.datumAdapters?.[type];
            if (!this.datumAdapters || (!!type && !hasAdapterForIt)) {
                const updated = await this.initDelegatedDatumWrappers();
                console.log(Object.keys(this.datumAdapters));
                if (!(type in updated) && !this.datumAdapters) {
                    throw new Error(
                        `${this.constructor.name}: no datumAdapter for expected type '${type}' even after re-init.  Check your initDelegatedDatumAdapters()`
                    );
                }
                this.datumAdapters = updated as any;
            }
        }
        // console.log("findDelegatedDataUtxos", type, predicate);
        const utxos = await this.network.getUtxos(this.address);

        // console.log("utxos", dumpAny(utxos));
        const utxosWithDatum = (
            await Promise.all(
                utxos.map((utxo) => {
                    const { datum } = utxo.output;
                    // console.log("datum", datum);
                    if (!datum) return null;

                    if (
                        "undefined" !== typeof type &&
                        !this.datumAdapters[type]
                    ) {
                        console.log(
                            ` ⚠️  WARNING: no adapter for type ${type}; skipping readDatum()`
                        );
                        return null;
                    }
                    const adapter =
                        type &&
                        (this.datumAdapters[type] as unknown as ADAPTER_TYPE);

                    return this.readDatum(
                        // adapter
                        //     ? this.readDatum(adapter, datum, "ignoreOtherTypes") :
                        "DelegatedData",
                        datum,
                        "ignoreOtherTypes"
                    ).then(
                        mkFoundDatum.bind(
                            this,
                            utxo
                        ) as any /* allows the error callback to fit the signature */,
                        (e) => {
                            debugger;
                            console.log("wtf1", e, utxo.output.datum);
                            return null; // we don't care about Datums other than DelegatedData:
                        }
                    );
                })
            )
        )
            // filter corrects any possible nulls
            .filter((x) => !!x) as FoundDatumUtxo<DATUM_TYPE>[];
        console.log(type, `findDelegatedData: `, utxosWithDatum.length);
        return utxosWithDatum;

        function mkFoundDatum(utxo: TxInput, datum: DATUM_TYPE) {
            // console.log("hi mkFoundDatum", datum);
            if (!datum) {
                // console.log("  -- skipped 1 mismatch (non-DelegatedDatum)");
                return null;
            }

            if (!datum.id || !datum.type) {
                console.log(
                    `⚠️  WARNING: missing required 'id' or 'type' field in this delegated datum.  Is the adapter retaining them?\n`,
                    dumpAny(utxo),
                    datum
                );
                debugger;
                return null;
            }
            if (type && datum.type != type) {
                // console.log(`  -- skipped ${datum.type}; need ${type})`);
                return null;
            }
            if (predicate && !predicate(utxo, datum)) {
                // console.log("  -- skipped due to predicate");
                return null;
            }
            // console.log("-- matched: ", datum);
            return {
                utxo,
                datum,
            } as FoundDatumUtxo<DATUM_TYPE>;
        }
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
        THIS extends Capo<any>,
        TCX extends hasSeedUtxo = hasSeedUtxo
    >(
        this: THIS,
        delegateInfo: MinimalDelegateUpdateLink,
        tcx: TCX = new StellarTxnContext(this.setup) as TCX
    ) {
        const currentCharter = await this.mustFindCharterUtxo();
        const currentDatum = await this.findCharterData(currentCharter);
        const mintDelegate = await this.getMintDelegate();
        const { minter } = this;
        const tcxWithSeed = await this.tcxWithSeedUtxo(tcx);
        const uutOptions:
            | NormalDelegateSetup
            | DelegateSetupWithoutMintDelegate = delegateInfo.forcedUpdate
            ? ({
                  withoutMintDelegate: {
                      omitMintDelegate: true,
                      specialMinterActivity:
                          minter.activityForcingNewMintDelegate(tcxWithSeed),
                  },
              } as DelegateSetupWithoutMintDelegate)
            : ({
                  mintDelegateActivity: mintDelegate.activityReplacingMe({
                      seed: tcxWithSeed.state.seedUtxo.id,
                      purpose: "mintDgt",
                  }),
                  additionalMintValues: this.mkValuesBurningDelegateUut(
                      currentDatum.mintDelegateLink
                  ),
                  skipDelegateReturn: true, // so it can be burned without a txn imbalance
              } as NormalDelegateSetup);

        const tcx2 = await this.txnMintingUuts(
            // todo: make sure seed-utxo is selected with enough minUtxo ADA for the new UUT name.
            tcxWithSeed,
            ["mintDgt"],
            uutOptions,
            {
                mintDelegate: "mintDgt",
            }
        );
        console.warn("updating mint delegate with info", delegateInfo);

        const newMintDelegate = await this.txnCreateOffchainDelegateLink(
            tcx2,
            "mintDelegate",
            // !!! not tested:
            {
                ...delegateInfo,
                uutName: tcx2.state.uuts.mintDgt.name,
            }
        );
        // currentDatum.mintDelegateLink);

        // const spendDelegate = await this.txnCreateDelegateLink<
        //     StellarDelegate<any>,
        //     "spendDelegate"
        // >(tcx, "spendDelegate", charterDataArgs.spendDelegateLink);

        //@xxxts-expect-error "could be instantiated with different subtype"
        const fullCharterArgs: CharterDataLike = {
            ...currentDatum,
            mintDelegateLink:
                this.mkOnchainRelativeDelegateLink(newMintDelegate),
        };
        const capoActivity = delegateInfo.forcedUpdate
            ? this.activity.capoLifecycleActivity.forcingNewMintDelegate(tcx2, {
                  purpose: "mintDgt",
              })
            : undefined; //use default activity if not forcing

        const tcx3 = (await this.mkTxnUpdateCharter(
            fullCharterArgs,
            capoActivity,
            await this.txnAddGovAuthority(tcx2)
        )) as TCX & typeof tcx2;
        return tcx3;
        // const datum = await this.mkDatumCharterData(fullCharterArgs);

        // const charterOut = new TxOutput(
        //     this.address,
        //     this.tvCharter(),
        //     datum
        //     // this.compiledScript
        // );

        // return tcx2.addOutput(charterOut);
    }

    mkValuesBurningDelegateUut(current: ErgoRelativeDelegateLink) {
        return [mkValuesEntry(current.uutName, -1n)];
    }

    @txn
    async mkTxnUpdatingSpendDelegate<
        THIS extends Capo<any>,
        TCX extends hasSeedUtxo = hasSeedUtxo
    >(
        this: THIS,
        delegateInfo: MinimalDelegateUpdateLink,
        tcx: TCX = new StellarTxnContext(this.setup) as TCX
    ): Promise<TCX> {
        const currentCharter = await this.mustFindCharterUtxo();
        const currentDatum = await this.findCharterData(currentCharter);
        const spendDelegate = await this.getSpendDelegate(currentDatum);
        const tcxWithSeed = await this.tcxWithSeedUtxo(tcx);

        const uutOptions: DelegateSetupWithoutMintDelegate = {
            withoutMintDelegate: {
                omitMintDelegate: true,
                specialMinterActivity:
                    this.minter.activity.CreatingNewSpendDelegate(tcxWithSeed, {
                        replacingUut: delegateInfo.forcedUpdate
                            ? undefined
                            : // minter will enforce the Burn of this token name
                              spendDelegate.authorityTokenName,
                    }),
                additionalMintValues: delegateInfo.forcedUpdate
                    ? undefined
                    : this.mkValuesBurningDelegateUut(
                          currentDatum.spendDelegateLink
                      ),
                // the minter won't require the old delegate to be burned,
                //  ... so it can be burned without a txn imbalance:
                skipDelegateReturn: delegateInfo.forcedUpdate,
            },
        };
        const tcx2 = await this.txnMintingUuts(
            // todo: make sure seed-utxo is selected with enough minUtxo ADA for the new UUT name.
            tcxWithSeed,
            ["spendDgt"],
            uutOptions,
            {
                spendDelegate: "spendDgt",
            }
        );
        const newSpendDelegate = await this.txnCreateConfiguredDelegate(
            tcx2,
            "spendDelegate",
            delegateInfo
        );
        // currentDatum.mintDelegateLink);

        const tcx2a = delegateInfo.forcedUpdate
            ? tcx2
            : await spendDelegate.txnGrantAuthority(
                  tcx2,
                  spendDelegate.activityReplacingMe({
                      seed: tcxWithSeed.state.seedUtxo.id,
                      purpose: "spendDgt",
                  }),
                  "skipDelegateReturn"
              );
        const tcx2b = await newSpendDelegate.delegate.txnReceiveAuthorityToken(
            tcx2a,
            newSpendDelegate.delegate.tvAuthorityToken()
        );

        //@xts-expect-error "could be instantiated with different subtype"
        const fullCharterArgs: CharterDataLike = {
            ...currentDatum,
            spendDelegateLink:
                this.mkOnchainRelativeDelegateLink(newSpendDelegate),
        };

        const capoActivity = delegateInfo.forcedUpdate
            ? this.activity.capoLifecycleActivity.forcingNewSpendDelegate(
                  tcx2,
                  { purpose: "spendDgt" }
              )
            : undefined; //use default activity if not forcing
        return this.mkTxnUpdateCharter(
            fullCharterArgs,
            capoActivity,
            await this.txnAddGovAuthority(tcx2b)
        ) as Promise<TCX>;
    }

    @txn
    async mkTxnAddingMintInvariant<
        THIS extends Capo<any>,
        TCX extends hasSeedUtxo = hasSeedUtxo
    >(
        this: THIS,
        delegateInfo: OffchainPartialDelegateLink,
        tcx: TCX = new StellarTxnContext(this.setup) as TCX
    ): Promise<StellarTxnContext> {
        const currentDatum = await this.findCharterData();

        // const spendDelegate = await this.txnCreateOffchainDelegateLink(
        //     spendDelegateLink: this.mkOnchainRelativeDelegateLink(govAuthority),

        throw new Error(`test me!`);
        // const tcxWithSeed = await this.tcxWithSeedUtxo(tcx);
        // const tcx2 = await this.txnMintingUuts(
        //     tcxWithSeed,
        //     ["mintDgt"],
        //     {
        //         withoutMintDelegate: {
        //             omitMintDelegate: true,
        //             specialMinterActivity:
        //                 this.minter.activityAddingMintInvariant(tcxWithSeed),
        //         },
        //     },
        //     {
        //         // role/uut mappings
        //         mintDelegate: "mintDgt",
        //     }
        // );
        // const mintDelegate = await this.txnCreateOffchainDelegateLink(
        //     tcx2,
        //     "mintDelegate",
        //     {
        //         ...delegateInfo,
        //         uutName: tcx2.state.uuts.mintDgt.name,
        //         // !!! not tested:
        //         config: { ...(delegateInfo.config || {}), ...this.configIn },
        //     }
        // );
        // // currentDatum.mintDelegateLink);

        // // const spendDelegate = await this.txnCreateDelegateLink<
        // //     StellarDelegate<any>,
        // //     "spendDelegate"
        // // >(tcx, "spendDelegate", charterDataArgs.spendDelegateLink);

        // //x@ts-expect-error "could be instantiated with different subtype"
        // const fullCharterArgs: CharterDataProps = {
        //     ...currentDatum,
        //     mintInvariants: [...currentDatum.mintInvariants, mintDelegate],
        // };
        // const datum = await this.mkDatumCharterData(fullCharterArgs);

        // const charterOut = new TxOutput(
        //     this.address,
        //     this.tvCharter(),
        //     datum
        //     // this.compiledScript
        // );

        // return tcx2.addOutput(charterOut);
    }

    // How can someone be holding interest in a project?
    //      ignorant  // never seen, or not investigated
    //      Watching for updates
    //      Bought in / privy to more info
    //      Contributing:
    //          - note, no-conflict-of-interest assertion wanted, even though
    //          - it may not be very much enforceable

    @txn
    async mkTxnAddingSpendInvariant<
        THIS extends Capo<any>,
        const SN extends string &
            keyof THIS["delegateRoles"]["spendDelegate"]["variants"],
        TCX extends hasSeedUtxo = hasSeedUtxo
    >(
        this: THIS,
        delegateInfo: OffchainPartialDelegateLink,
        tcx: TCX = new StellarTxnContext(this.setup) as TCX
    ) {
        const currentDatum = await this.findCharterData();
        throw new Error(`test me!`);

        const tcxWithSeed = await this.tcxWithSeedUtxo(tcx);
        const tcx2 = await this.txnMintingUuts(
            tcxWithSeed,
            ["spendDgt"],
            {
                withoutMintDelegate: {
                    omitMintDelegate: true,
                    specialMinterActivity:
                        this.minter.activityAddingSpendInvariant(tcxWithSeed),
                },
            },
            {
                // role/uut map
                spendDelegate: "spendDgt",
            }
        );
        const anotherSpendInvariant = await this.txnCreateOffchainDelegateLink(
            tcx2,
            "spendDelegate",
            delegateInfo
        );
        // currentDatum.mintDelegateLink);

        // const spendDelegate = await this.txnCreateDelegateLink<
        //     StellarDelegate<any>,
        //     "spendDelegate"
        // >(tcx, "spendDelegate", charterDataArgs.spendDelegateLink);

        const datum = this.mkDatum.CharterData({
            ...currentDatum,
            spendInvariants: [
                ...currentDatum.spendInvariants,
                this.mkOnchainRelativeDelegateLink(anotherSpendInvariant),
            ],
        });

        const charterOut = new TxOutput(
            this.address,
            this.tvCharter(),
            datum
            // this.compiledScript
        );

        return tcx2.addOutput(charterOut);
    }

    /**
     * Adds or replaces a named delegate in the Capo contract
     * @remarks
     *
     * Registers a new delegate, keyed by its name.  The delegate may
     * replace another
     *
     * Other contract scripts can reference named delegates through the
     * contract's charter, requiring their presence in a transaction - thus
     * delegating some portion of validation responsibility to the other script
     *
     * @param delegateName - the key that will be used in the on-chain data structures and in dependent contracts.
     *  @param options - configuration for the delegate
     * @public
     **/
    async mkTxnAddingNamedDelegate<
        DT extends StellarDelegate,
        thisType extends Capo<any>,
        const delegateName extends string,
        TCX extends hasSeedUtxo = hasSeedUtxo
    >(
        this: thisType,
        delegateName: delegateName,
        options: OffchainPartialDelegateLink &
            NamedPolicyCreationOptions<thisType, DT>,
        tcx: TCX = this.mkTcx() as TCX
    ): Promise<
        hasAddlTxns<TCX & hasSeedUtxo & hasNamedDelegate<DT, delegateName>>
    > {
        const currentCharter = await this.findCharterData();
        console.log(
            "------------------ TODO SUPPORT OPTIONS.forcedUpdate ----------------"
        );
        const uutPurpose = options.uutName || delegateName;
        if (uutPurpose.length > 13) {
            throw new Error(
                `uutName ${uutPurpose} can be max 13 chars \n` +
                    `   ... adjust this separately from the delegateName with options.uutName`
            );
        }
        const mintDelegate = await this.getMintDelegate(currentCharter);

        // TODO improve type of txn with uut purpose more specific than just generic string
        console.log("  -- 🐞🐞adding named delegate with options", options);

        const tcx1 =
            tcx.state.seedUtxo === undefined
                ? await this.tcxWithSeedUtxo()
                : tcx;

        const tcx2 = await this.txnMintingUuts(
            tcx1,
            [uutPurpose],
            options.mintSetup,
            {
                // role / uut map
                [delegateName]: uutPurpose,
            }
        );

        const newNamedDelegate = await this.txnCreateOffchainDelegateLink(
            tcx2,
            delegateName,
            options
        );

        const tcx4 = await this.mkTxnUpdateCharter(
            {
                ...currentCharter,
                otherNamedDelegates: new Map<string, RelativeDelegateLinkLike>([
                    ...currentCharter.otherNamedDelegates.entries(),
                    [
                        delegateName,
                        this.mkOnchainRelativeDelegateLink(newNamedDelegate),
                    ],
                ]),
            },
            undefined,
            await this.txnAddGovAuthority(tcx2)
        );

        // as hasAddlTxns<
        //     TCX & hasSeedUtxo & hasNamedDelegate<DT, delegateName>
        // >;

        const DelegateName =
            delegateName[0].toUpperCase() + delegateName.slice(1);
        const bigDelegateName = `namedDelegate${DelegateName}`;
        tcx4.state[bigDelegateName] = newNamedDelegate;

        const tcx5 = await this.txnMkAddlRefScriptTxn(
            tcx4 as typeof tcx4 & TCX & hasNamedDelegate<DT, delegateName>,
            bigDelegateName,
            newNamedDelegate.delegate.compiledScript
        );

        return tcx5;
        //  as hasAddlTxns<
        //     TCX & hasSeedUtxo & hasNamedDelegate<DT, delegateName>
        // >;
    }

    /**
     * Helper for installing a named policy delegate
     * @remarks
     *
     * Creates a transaction for adding a delegate-data-policy to the Capo.
     * TODO: support also updating an existing delegate to a new policy script.
     *
     * The role name mentioned must be defined in the Capo's delegateRoles.
     */
    @txn
    async mkTxnInstallingPolicyDelegate<
        const RoLabel extends string & keyof this["delegateRoles"],
        THIS extends Capo<any>,
    >(this: THIS, dgtRole: RoLabel,
        charter? : CapoDatum$Ergo$CharterData
    ) {
        // const mintDelegate = await this.getMintDelegate(charter);
        // console.log("   --mintDgt", mintDelegate.constructor.name);
        // const spendDelegate = await this.getSpendDelegate(charter);
        // console.log("   --spendDgt", spendDelegate.constructor.name);

        const tcx1 = await this.tcxWithSeedUtxo(this.mkTcx());
        return this.mkTxnQueuingDelegateChange("Add", dgtRole, undefined, tcx1);
    }

    // async mkTxnQueuingDelegateRemoval<
    //     THIS extends Capo<any>,
    //     TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>
    // >(this: THIS, pendingChange: toQueueDgtRemoval, tcx = this.mkTcx()) {
    //     const currentCharter = await this.findCharterData();
    //     const mintDelegate = await this.getMintDelegate(currentCharter);
    //     const spendDelegate = await this.getSpendDelegate(currentCharter);
    //     const tcx1 = await spendDelegate.txnGrantAuthority(
    //         tcx,
    //         spendDelegate.activity.capoLifecycleActivity.queuePendingDgtChange(
    //             pendingChange
    //         )
    //     );
    //     const tcx2 = await this.mkTxnUpdateCharter(
    //         {
    //             ...currentCharter,
    //             pendingDgtChanges: [
    //                 pendingChange,
    //                 ...currentCharter.pendingDgtChanges,
    //             ],
    //         },
    //         this.activity.capoLifecycleActivity.queuePendingDgtChange(
    //             pendingChange
    //         ),
    //         tcx1
    //     );
    //     return tcx2;
    // }

    async mkTxnQueuingDelegateChange<
        DT extends StellarDelegate,
        THIS extends Capo<any>,
        const RoLabel extends string & keyof this["delegateRoles"],
        OPTIONS extends OffchainPartialDelegateLink,
        TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>
    >(
        this: THIS,
        change: "Add" | "Replace",
        policyName: RoLabel,
        options: OPTIONS = { config: {} } as OPTIONS, // & NamedPolicyCreationOptions<THIS, DT>,
        tcx: TCX = this.mkTcx() as TCX
    ) {
        const purpose: string = options.uutName || "dgPol";
        if (purpose.length > 13) {
            throw new Error(
                `delegate-purpose ${purpose} can be max 13 chars for a UUT-name.  \n` +
                    `   ... adjust this separately from the policyName with options.uutName`
            );
        }
        // const newDgPolicy = await this.txnCreateOffchainDelegateLink(
        //     tcx,
        //     policyName,
        //     options
        // );

        const currentCharter = await this.findCharterData();
        const mintDgt = await this.getMintDelegate(currentCharter);
        const mintDgtActivity = mintDgt.activity as SomeDgtActivityHelper;
        const spendDgt = await this.getSpendDelegate(currentCharter);
        const spendDgtActivity = spendDgt.activity as SomeDgtActivityHelper;
        
        // const dgtActivity = this.onchain.types.PendingDelegateAction
        const tcx1 =
            //@ts-expect-error on checking for possible seedUtxo presence
            tcx.state.seedUtxo === undefined
                ? await this.tcxWithSeedUtxo()
                : (tcx as TCX & hasSeedUtxo);

        const tempDataPolicyLink =
            await this.tempMkDelegateLinkForQueuingDgtChange(
                tcx1.state.seedUtxo,
                mintDgtActivity,
                purpose,
                policyName,
                options
            );
        const tempOCDPLink =
            this.mkOnchainRelativeDelegateLink(tempDataPolicyLink);

        const addDetails: PendingDelegateAction$AddLike = {
            seed: tcx1.state.seedUtxo.id,
            purpose,
            // delegateValidatorHash: tempOCDPLink.delegateValidatorHash,
            // config: tempOCDPLink.config,
        };
        const policyNameBytes = textToBytes(policyName);
        const replacesDgtME = [...currentCharter.manifest.values()].find(
            (m) => {
                !!m.entryType.DgDataPolicy && m.tokenName == policyNameBytes;
            }
        );
        const acReplacesDgt = replacesDgtME?.tokenName;
        if (acReplacesDgt) {
            if ("Add" === change) {
                throw new Error(
                    `Cannot add a policy with the same name as an existing one: ${policyName} (use Replace activity)`
                );
            }
            throw new Error(`TODO: delegate-replacement support (test needed)`);
        } else {
            if ("Replace" === change) {
                throw new Error(
                    `Cannot replace a policy that doesn't exist: ${policyName} (use Add activity)`
                );
            }
        }

        const dgtAction: PendingDelegateActionLike =
            change === "Add"
                ? {
                      Add: addDetails,
                  }
                : {
                      Replace: {
                          ...addDetails,
                          replacesDgt:
                              this.uh.acAuthorityToken(policyNameBytes),
                      },
                  };

        const pendingDgtChange = {
            action: dgtAction,
            role: { DgDataPolicy: {} },
            name: policyName,
            dgtLink: tempOCDPLink,
        };
        const tcx2 = await this.txnMintingUuts(
            tcx1,
            [purpose],
            {
                usingSeedUtxo: tcx1.state.seedUtxo,
                mintDelegateActivity:
                    mintDgtActivity.CapoLifecycleActivities.queuePendingDgtChange(
                        pendingDgtChange
                    ),
            },
            {
                // role / uut map
                dgDataPolicy: purpose,
                [policyName]: purpose,
            }
        );
        const delegateLink = this.mkOnchainRelativeDelegateLink(
            await this.txnCreateOffchainDelegateLink(tcx2, policyName, options)
        );
        const tcx3 = await spendDgt.txnGrantAuthority(
            tcx2,
            spendDgtActivity.CapoLifecycleActivities.queuePendingDgtChange(
                pendingDgtChange
            )
        );
        const tcx4 = await this.mkTxnUpdateCharter(
            {
                ...currentCharter,
                pendingDgtChanges: [
                    pendingDgtChange,
                    ...currentCharter.pendingDgtChanges,
                ],
            },
            this.activity.capoLifecycleActivity.queuePendingDgtChange(
                pendingDgtChange
            ),
            await this.txnAddGovAuthority(tcx3)
        );
        const stateKey = mkDgtStateKey<RoLabel>(policyName);
        //@ts-expect-error "could be instantiated with different subtype"
        const tcx5 : TCX & hasNamedDelegate<DT, RoLabel, "dgData"> = tcx4; 
        // this type doesn't resolve because of abstract DT ^
        //  tcx5.state[stateKey] = delegateLink;

        const tcx6 = await this.txnMkAddlRefScriptTxn(
            tcx5,
            stateKey,
            tempDataPolicyLink.delegate.compiledScript
        );
        return tcx6 as typeof tcx6 & hasUutContext<"dgDataPolicy" | RoLabel>;
    }
    async tempMkDelegateLinkForQueuingDgtChange(
        seedUtxo: TxInput,
        mintDgtActivity: SomeDgtActivityHelper,
        purpose: string,
        policyName: string,
        options: OffchainPartialDelegateLink
    ) {
        // todo: revisit formation of this Add object with full details
        // when the cross-dependencies are more easily resolved
        // e.g. with Helios deferred redeemer (x: TxInfo) => UplcData
        // ^ that may let us do create the delegate activity without any temp context.

        const ttcx1 = await this.tcxWithSeedUtxo(this.mkTcx(), seedUtxo);
        const ttcx2 = await this.txnMintingUuts(
            ttcx1,
            [purpose],
            {
                usingSeedUtxo: seedUtxo,
                mintDelegateActivity:
                    mintDgtActivity.CapoLifecycleActivities.queuePendingDgtChange(
                        {
                            action: {
                                Add: {
                                    seed: ttcx1.state.seedUtxo.id,
                                    purpose,
                                    // --------------- 8-] vvvv --------------------
                                    // mocked details, good enough for getting UUT info for the delegate-link below:
                                    // delegateValidatorHash: null, // options.delegateValidatorHash,
                                    // config: [], //options.config
                                    // --------------- 8-] ^^^^ --------------------
                                },
                            },
                            role: { DgDataPolicy: {} },
                            name: policyName,
                            // dgtLink: null,
                        }
                    ),
            },
            {
                // role / uut map
                [policyName]: purpose,
            }
        );
        return this.txnCreateOffchainDelegateLink(ttcx2, policyName, options);
    }
    async mkTxnCommittingPendingDgtChanges<TCX extends StellarTxnContext>(
        tcx: TCX = this.mkTcx() as TCX
    ) {
        const currentCharter = await this.findCharterData();
        const mintDgt = await this.getMintDelegate(currentCharter);
        const spendDgt = await this.getSpendDelegate(currentCharter);
        const pendingChanges = currentCharter.pendingDgtChanges;
        const tcx1a = await spendDgt.txnGrantAuthority(
            tcx,
            spendDgt.activity.CapoLifecycleActivities.commitPendingDgtChanges
        );
        const tcx1b = await mintDgt.txnGrantAuthority(
            tcx1a,
            mintDgt.activity.CapoLifecycleActivities.commitPendingDgtChanges
        );
        const tcx1c = await this.txnAddGovAuthority(tcx1b);
        
        const currentManifest = currentCharter.manifest;
        const updatedManifest = new Map(currentManifest);
        for (const pendingChange of pendingChanges) {
            const { action: thisAction, role, name, dgtLink } = pendingChange;
            if (!role.DgDataPolicy) {
                throw new Error(
                    `only DgDataPolicy changes are currently supported here`
                );
            }
            if (!name) {
                console.log("missing name in ", { pendingChange });
                throw new Error(`missing expected 'name' in pendingChange`);
            }
            if (!dgtLink) {
                throw new Error(`missing expected 'dgtLink' in pendingChange`);
            }
            const { uutName } = dgtLink;
            if (thisAction.Add) {
                const { purpose, seed } = thisAction.Add!; // , delegateValidatorHash, config } =
                const ttcx = this.mkTcx();
                if (currentManifest.get(name)) {
                    throw new Error(`can't Add conflicting name to manifest`);
                }
            } else {
                if (!thisAction.Replace) {
                    throw new Error(
                        `only Add and Replace actions are supported here`
                    );
                }
                if (!currentManifest.get(name)) {
                    throw new Error(
                        `can't Replace non-existent name '${name}' in manifest`
                    );
                }
            }
            updatedManifest.set(name, {
                tokenName: textToBytes(uutName),
                mph: null,
                entryType: {
                    DgDataPolicy: {
                        policyLink: dgtLink,
                        refCount: 1n,
                    },
                },
            });
        }
        const tcx2 = await this.mkTxnUpdateCharter(
            {
                ...currentCharter,
                manifest: updatedManifest,
                pendingDgtChanges: [],
            },
            this.activity.capoLifecycleActivity.commitPendingDgtChanges,
            tcx1c
        );

        return tcx2;
    }

    /**
     * Adds UUT minting to a transaction
     * @remarks
     *
     * Constructs UUTs with the indicated purposes, and adds them to the contract state.
     * This is a useful generic capability to support any application-specific purpose.
     *
     * The provided transaction context must have a seedUtxo - use {@link Capo.tcxWithSeedUtxo | tcxWithSeedUtxo()} to add one
     * from the current user's wallet. The seed utxo is consumed, so it can never be used again; its
     * value will be returned to the user wallet.  All the uuts named in the uutPurposes argument will
     * be minted from the same seedUtxo, and will share the same suffix, because it is derived from the
     * seedUtxo's outputId.
     *
     * Many cases of UUT minting are covered by the delegation pattern, where this method
     * is used implicitly.
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
        existingTcx extends hasSeedUtxo,
        const RM extends Record<ROLES, purposes>,
        const ROLES extends keyof RM & string = string & keyof RM
    >(
        initialTcx: existingTcx,
        uutPurposes: purposes[],
        options: NormalDelegateSetup | DelegateSetupWithoutMintDelegate,
        //x@ts-expect-error
        roles: RM = {} as RM // Record<ROLES, purposes>
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
        const {
            usingSeedUtxo,
            additionalMintValues = [],
            omitMintDelegate = false,
            mintDelegateActivity,
            specialMinterActivity,
            skipDelegateReturn,
        } =
            //@ts-expect-error accessing the intersection type
            options.withoutMintDelegate || options;

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
            if (mintDelegateActivity)
                throw new Error(
                    `omitMintDelegate and usingMintDelegateActivity are mutually exclusive`
                );
            if (!specialMinterActivity) {
                throw new Error(
                    `txnMintingUuts: omitMintDelegate requires a specialMinterActivity to be specified\n` +
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
                specialMinterActivity
            );
            return tcx2;
        }
        if (additionalMintValues.length && !mintDelegateActivity) {
            throw new Error(
                `additionalMintValues requires a custom activity provided by your mint delegate specialization`
            );
        }

        if (!mintDelegateActivity) {
            throw new Error(
                `txnMintingUuts: options.mintDelegateActivity is required; ` +
                    `  ... it should indicate an application-specific use-case for which ` +
                    `the mint delegate validates the exact needed UUTs to be minted`
            );
        }

        const tcx2 = await this.minter.txnMintWithDelegateAuthorizing(
            tcx,
            [...mkUutValuesEntries(tcx.state.uuts), ...additionalMintValues],
            mintDelegate,
            mintDelegateActivity,
            skipDelegateReturn
        );
        // console.log(
        //     "    🐞🐞 @end of txnMintingUuts",
        //     await tcx2.dump()
        // );
        return tcx2;
        // const tcx4 = await mintDelegate.txnMintingUuts(tcx3,
        //     uutPurposes,
        //     seedUtxo,
        //     roles
        // );

        // return this.txnAddMintDelegate(tcx4);
    }

    /**
     * @deprecated use tcxWithSeedUtxo() instead
     * @remarks adds a seed utxo to a transaction-context,
     */
    async addSeedUtxo<TCX extends StellarTxnContext>(
        tcx: TCX = new StellarTxnContext(this.setup) as TCX,
        seedUtxo?: TxInput
    ): Promise<TCX & hasSeedUtxo> {
        return this.tcxWithSeedUtxo(tcx, seedUtxo);
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
     * you can use {@link Capo.txnMintingUuts | txnMintingUuts()} instead of this method.
     *
     * @param tcx - the transaction context
     * @param uutPurposes - a list of short names for the UUTs (will be augmented with unique suffixes)
     * @param usingSeedUtxo - the seed utxo to be used for minting the UUTs (consumed in the transaction, and controls the suffixes)
     * @param roles - a map of role-names to purpose-names
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
        { usingSeedUtxo }: UutCreationAttrsWithSeed,
        //@ts-expect-error
        roles: RM = {} as Record<string, purposes>
    ): Promise<hasUutContext<ROLES | purposes> & existingTcx> {
        if (!usingSeedUtxo) debugger;
        const { txId, utxoIdx } = usingSeedUtxo.id;
        const { blake2b } = Crypto;

        const uutMap: uutPurposeMap<ROLES | purposes> = Object.fromEntries(
            uutPurposes.map((uutPurpose) => {
                const idx = new IntData(BigInt(utxoIdx)).toCbor();
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
            const mappedUutName = uutMap[uutPurpose as string];
            if (!mappedUutName) {
                throw new Error(
                    `role/name mismatch: ${role}: not found: ${uutPurpose}` +
                        `\n  ... available: ${uutPurposes.join(", ")}`
                );
            }
            uutMap[role] = mappedUutName;
        }

        if (!tcx.state) tcx.state = { uuts: {} };
        tcx.state.uuts = {
            ...(tcx.state.uuts as {}),
            ...uutMap,
        };

        return tcx as hasUutContext<ROLES | purposes> & existingTcx;
    }

    requirements() {
        return hasReqts({
            "is a base class for leader/Capo pattern": {
                purpose:
                    "so that smart contract developers can easily start multi-script development",
                details: [
                    "Instantiating a Capo contract always uses the seed-utxo pattern for uniqueness.",
                    "Subclassing Capo with no type-params gives the default minter,",
                    "  ... which only allows UUTs to be created",
                    "Subclassing Capo<CustomMinter> gives an overloaded minter,",
                    "  ... which must allow UUT minting and may allow more Activities too.",
                ],
                mech: [
                    "provides a default minter",
                    "allows the minter class to be overridden",
                ],
            },
            "can create unique utility tokens": {
                purpose:
                    "so the contract can use UUTs for scoped-authority semantics",
                details: [
                    "That UUT (a Value) is returned, and then should be added to a TxOutput.",
                    "The partial-helper doesn't constrain the semantics of the UUT.",
                    "The uniqueness level can be iterated in future as needed.",
                    "The UUT's token-name combines its textual purpose with a short hash ",
                    "   ... of the seed UTxO, formatted with bech32",
                ],
                mech: [
                    "Building a txn with a UUT involves using the txnMintingUuts partial-helper on the Capo.",
                    "Fills tcx.state.uuts with purpose-keyed unique token-names",
                    "The UUT uses the seed-utxo pattern to form 64 bits of uniqueness, so that token-names stay short-ish.",
                ],
            },
            "supports the Delegation pattern using roles and strategy-variants":
                {
                    purpose: "enables structured modularity and extensibility",
                    details: [
                        "A Capo constellation can declare a set of roles to be filled in the contract logic.",
                        "The roles are typed, so that implementers of extensibility can know ",
                        "  ... which capabilities their plugins need to provide",
                        "Each role should be filled by a StellarContract class, ",
                        "  ... which is required at the time it is needed during creation of a transaction.",
                        "Each role should normally provide a base implementation ",
                        "  ... of a delegate that can serve the role.",
                        "Strategies, strategy-variants, or simple 'variants' are all similar ways ",
                        "  ... of indicating different named plugins that can serve a particular role.",
                        "Variant-names are human-readable, while the actual code",
                        "  ... behind each variant name are the strategies",
                    ],
                    mech: [],
                    requires: [
                        "supports well-typed role declarations and strategy-adding",
                        "supports just-in-time strategy-selection using txnCreateDelegateLink()",
                        "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings",
                        "supports concrete resolution of existing role delegates",
                    ],
                },
            "supports well-typed role declarations and strategy-adding": {
                purpose:
                    "for plugin implementers to have a clear picture of what to implement",
                details: [
                    "Each Capo class may declare a roles data structure.",
                    "GOAL: The required type for each role must be matched when adding a plugin class serving a role",
                    "A dApp using a Capo class can add strategy variants by subclassing",
                ],
                mech: [
                    "Capo EXPECTS a synchronous getter for 'delegateRoles' to be defined",
                    "Capo provides a default 'delegateRoles' having no specific roles (or maybe just minter - TBD)",
                    "Subclasses can define their own get delegateRoles(), return a role-map-to-variant-map structure",
                ],
                requires: [
                    "Each role uses a RoleVariants structure which can accept new variants",
                ],
            },
            "supports just-in-time strategy-selection using txnCreateDelegateLink()":
                {
                    purpose:
                        "enabling each transaction to select appropriate plugins for its contextual needs",
                    details: [
                        "When a transaction having an extensibility-point is being created,",
                        "  ... it SHOULD require an explicit choice of the delegate to use in that role.",
                        "When a 'mkTxn‹DoesThings›' method creates a new role-delegated UTxO, ",
                        "  ... it sets essential configuration details for the delegation ",
                        "  ... including a specific UUT that provides a linking mechanism for the delegate",
                        "The delegate contract, including its address and/or reference-script UTxO ",
                        "  ... and/or its parameters and its StellarContract class, MUST be captured ",
                        "  ... so that it can be easily resolved and used/referenced",
                        "  .... during a later transaction whose UTxO-spending is governed by the delegate contract.",
                        "When the delegate serving the role is selected, ",
                        "  ... that delegate will be manifested as a concrete pair of StellarContract subclass ",
                        "  ... and contract address.  The contract address MAY be pre-existing ",
                        "  ... or be instantiated as a result of the delegation details.",
                    ],
                    mech: [
                        "txnCreateDelegateLink(tcx, role, delegationSettings) method configures a new delegate",
                        "txnCreateDelegateLink() will use a 'default' delegate strategy",
                        "If there is no delegate configured (or defaulted) for the needed role, txnCreateDelegateLink throws a DelegateConfigNeeded error.",
                        "If the strategy-configuration doesn't match available variants, the DelegateConfigNeeded error offers suggested strategy-names",
                        "If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object",
                        "txnCreateDelegateSettings(tcx, role, delegationSettings) returns the delegate link plus a concreted delegate instance",
                    ],
                },
            "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings":
                {
                    purpose:
                        "allows the known facts about a delegate to be resolved to working SC class",
                    details: [
                        "A delegate link created by txnCreateDelegateLink(), can be captured in different ways",
                        "  ... e.g. as a Datum property in a contract, ",
                        "  ... or in any off-chain way.",
                        "A dApp then reconstitutes this key information to a StellarContract, ",
                        "  ... enabling simple multi-contract collaboration",
                    ],
                    mech: [
                        "mustGetDelegate(configuredDelegate) method retrieves a configured delegate",
                    ],
                },

            "Each role uses a RoleVariants structure which can accept new variants":
                {
                    purpose:
                        "provides a type-safe container for adding strategy-variants to a role",
                    details: [
                        "Adding a strategy variant requires a human-readable name for the variant",
                        "  ... and a reference to the StellarContract class implementing that variant.",
                        "Each variant may indicate a type for its configuration data-structure",
                        "  ... and may include a factory function accepting a data-structure of that type.",
                        "TBD: base configuration type?  Capo txn-builders supporting utxo-creation can provide baseline details of the base type, ",
                        "  ... with additional strategy-specific details provided in the transaction-context.",
                        "When adding strategies, existing variants cannot be removed or replaced.",
                    ],
                    mech: [
                        "RoleVariants has type-parameters indicating the baseline types & interfaces for delegates in that role",
                        "TODO: variants can augment the delegateRoles object without removing or replacing any existing variant",
                    ],
                    requires: [
                        "provides a Strategy type for binding a contract to a strategy-variant name",
                    ],
                },
            "provides a Strategy type for binding a contract to a strategy-variant name":
                {
                    purpose:
                        "has all the strategy-specific bindings between a variant and the contract delegate",
                    details: [
                        "When adding a contract as a delegate serving in a role, its name",
                        "  ... and its Strategy binding creates the connection between the host contract (suite) ",
                        "  ... and the StellarContract subclass implementing the details of the strategy.",
                        "The Strategy and its underlying contract are type-matched",
                        "  ... with the interface needed by the Role.",
                        "The Strategy is a well-typed structure supporting ",
                        "  ... any strategy-specific configuration details (script parameters)",
                        "  ... and validation of script parameters",
                    ],
                    mech: [
                        "Each strategy must reference a type-matched implementation class",
                        "Each strategy may define scriptParams always used for that strategy",
                        "Each strategy may defer the definition of other script-params to be defined when a specific delegation relationship is being created",
                        "Each strategy must define a validateScriptParams(allScriptParams) function, returning an errors object if there are problems",
                        "validateScriptParams() should return undefined if there are no problems",
                    ],
                    requires: [
                        "supports concrete resolution of existing role delegates",
                    ],
                },
            "supports concrete resolution of existing role delegates": {
                purpose:
                    "so that transactions involving delegated responsibilities can be executed",
                details: [
                    "When a transaction needs to involve a UTxO governed by a delegate contract",
                    "   ... the need for that delegate contract is signalled through Capo callbacks ",
                    "   ... during the transaction-building process.",
                    "Those callbacks contain key information, such as role-name, parameters, and address",
                    "  ... needed in the collaboration to find the correct concrete delegate.",
                    "Once the delegate is resolved to a configured StellarContract class, ",
                    "   ... its established transaction-building interface is triggered, ",
                    "   ... augmenting the transaction with the correct details, ",
                    "   ... and enabling the right on-chain behaviors / verifications",
                    "The Strategy adapter is expected to return the proper delegate with its matching address.",
                ],
                mech: [
                    "TODO: with an existing delegate, the selected strategy class MUST exactly match the known delegate-address",
                ],
            },
            "can locate UUTs in the user's wallet": {
                purpose: "for finding UUTs representing user's authority",
                details: [
                    "A Capo contract can locate UUTs in the user's wallet",
                    "  ... using the findActorUut() method",
                    "This is useful for finding authority tokens, ",
                    "  ... such as a charter-governance token, ",
                    "  ... or a token representing a user's authority in a smart contract",
                ],
                mech: ["findActorUut() returns a FoundUut object, "],
            },

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
                        "can update the minting delegate in the charter data",
                        "can update the spending delegate in the charter data",
                        "can add invariant minting delegates to the charter data",
                        "can add invariant spending delegates to the charter data",
                    ],
                },
            "can update the minting delegate in the charter data": {
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
            "can update the spending delegate in the charter data": {
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

            "can add invariant spending delegates to the charter data": {
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

            "can add invariant minting delegates to the charter data": {
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

            "supports an abstract Settings structure stored in the contact": {
                purpose:
                    "allows settings that can evolve to support Capo-related scripts as needed",
                details: [
                    "The Settings structure can be stored in the contract, separately from the CharterData. ",
                    "It can be updated by the govAuthority, and can be used to store any ",
                    "  ... data needed by the Capo's scripts, such as minting and spending delegates.",
                    "The charter datum references the settings uut, and shouldn't ",
                    "  ... ever need to change that reference, since the settings data can be updated in place.",
                    "The settings can store various data using string keys and conventions defined within the Capo.",
                    "The Capo contract MUST NOT make any calls to methods in the Settings structure, ",
                    "  ... so that that the Capo's code won't be changed if any methods are modified.",
                ],
                mech: [
                    // "has a 'SettingsData' datum variant & utxo in the contract",
                    // "offchain code can read the settings data from the contract",
                    // "TODO: TEST onchain code can read the settings data from the contract",
                    // "charter creation requires a CharterData reference to the settings UUT",
                    // "charter creation requires presence of a SettingsData map",
                    // "updatingCharter activity MUST NOT change the set-UUT reference",
                ],
                requires: [
                    // "mkTxnUpdateSettings(): can update the settings",
                    "added and updated delegates always validate the present configuration data",
                ],
            },
            // "mkTxnUpdateSettings(): can update the settings": {
            //     purpose: "to support parameter changes",
            //     impl: "mkTxnUpdateSettings()",
            //     details: [
            //         "The minting delegate is expected to validate all updates to the configuration data.",
            //         "The spending delegate is expected to validate all updates to the configuration data.",
            //         "Settings changes are validated by all registered delegates before being accepted.",
            //     ],
            //     mech: [
            //         "can update the settings data with a separate UpdatingSettings Activity on the Settings",
            //         "requires the capoGov- authority uut to update the settings data",
            //         "the spending delegate must validate the UpdatingSettings details",
            //         "the minting delegate must validate the UpdatingSettings details",
            //         "all named delegates must validate the UpdatingSettings details",
            //         "TODO: the spending invariant delegates must validate the UpdatingSettings details",
            //         "TODO: the minting invariant delegates must validate the UpdatingSettings details",
            //     ],
            // },
            "added and updated delegates always validate the present configuration data":
                {
                    purpose:
                        "to ensure that the entirety of policies in a contract suite have integrity",
                    details: [
                        "New delegates cannot be adopted unless they also validate the present configuration data, ",
                        "  ... so that configuration and current delegates can always be expected to be in sync.",
                        "However, a new delegate can't verify the config during their creation, ",
                        "  ... because its policy can be triggered only after it has a utxo in it)",
                        "With an an initial step of staging a prospective delegate, the new delegate can ",
                        "  ... provide positive assurance of  compatibility with the current settings.",
                    ],
                    impl: "mkTxnStagingNewDelegate",
                    mech: [
                        "TODO: staging a Named delegate updates the namedDelegates structure with staged item",
                        "TODO: staging a Mint delegate updates the mintDelegateLink structure with staged item",
                        "TODO: staging a Spend delegate updates the spendDelegateLink structure with staged item",
                        "TODO: staging an invariant delegate updates the invariantDelegates structure with staged item",
                    ],
                    requires: ["can commit new delegates"],
                },
            "can commit new delegates": {
                purpose:
                    "to finalize the adoption of a new or updated delegate",
                details: [
                    "A staged delegate can be committed, if it the current settings validate okay with it. ",
                    "Given it already exists, then its settings-validation logic can be triggered ",
                    " ... and its status can advance from 'staged' to 'active' ",
                ],
                mech: [
                    "TODO: a staged delegate is only adopted if it validates ok with the then-current settings",
                ],
            },

            "supports storing new types of datum not pre-defined in the Capo's on-chain script":
                {
                    purpose:
                        "to allow data extensibility and evolution in a backwards-compatible way",
                    details: [
                        "The Capo's DelegatedDatum type encapsulates all custom data types, ",
                        "  ... and can be thought of as a Union of types that can be extended over time",
                        "This allows the policies governing each type of data to evolve independently",
                        "  ... without those data needing to be moved between contract addresses when changing the policies.",
                        "The spending delegate script is expected to enforce spending rules for each type of custom data",
                        "The minting delegate is expected to enforce creation rules for each type of custom data",
                        "The mint- and spend-delegates can evolve to handle new types of data",
                        "A namedDelegates structure in the Capo provides a manifest of additional delegates, ",
                        "  ... whose involvement may be required as needed by the mint- and spend-delegates.",
                    ],
                    mech: [
                        "has named delegates, as a string map to named delegate links",
                        "the spending policy ",
                    ],
                    requires: [
                        "the charter has a namedDelegates structure for semantic delegate links",
                        "CreatingDelegatedDatum: creates a UTxO with any custom datum",
                        "UpdatingDelegatedDatum: checks that a custom data element can be updated",
                    ],
                },

            "the charter has a namedDelegates structure for semantic delegate links":
                {
                    purpose:
                        "to provide a manifest of additional delegates that may be required to enforce application semantics",
                    details: [
                        "The namedDelegates structure is a string map to named delegate links",
                        "The minting and spending delegates can use these named delegates as needed",
                        "The minting and spending delegates can evolve to handle new types of data",
                        "The namedDelegates structure can be updated by the gov delegate",
                    ],
                    mech: [
                        "has a namedDelegates structure in the charter datum",
                        "TODO: TEST a named delegate can be added if the minter approves its creation",
                        "the charter.namedDelegates structure can only be updated by the gov delegate",
                        "can reject creation of named delegate with name not fitting the application's rules",
                        "TODO: won't mint the new delegate without the seed-utxo being included in the transaction",
                        "TODO: is created as a PendingDelegate datum during initial creation",
                        "TODO: can only be adopted into Charter datum when it successfully validates the current SettingsData",
                    ],
                    requires: [],
                },
            "CreatingDelegatedDatum: creates a UTxO with any custom datum": {
                purpose:
                    "allows the application to enforce policies for custom record creation",
                details: [
                    "The Capo must involve the minting delegate in creating a custom datum",
                    "  ... which can apply its own logic to deciding whether the creation is allowed.",
                    "The Capo trusts the minting delegate's enforcement of policy.",
                    "The mint delegate can be signalled to validate multiple minting activities creating multiple delegated-datum UTxOs with separate seeds",
                ],
                impl: "mkTxnCreatingDelegatedDatum",
                mech: [
                    "builds transactions including the minting delegate",
                    "fails if the minting delegate is not included in the transaction",
                    "fails if a CreatingDelegatedData activity isn't matched on recId by a data-controller MintingActivity",
                    "TODO: TEST the mint delegate's multi-activity works with the generic CreatingDelegatedData activity",
                    "TODO: the mint delegate's multi-activity can TODO work with the generic DeletingDelegatedData activity",

                    "TODO: the mint delegate's multi-activity fails if the delegated-data controller isn't triggered with a matching MintingActivity(seed, recId)",
                    "TODO: the mint delegate's multi-activity fails if the delegated-data controller has multiple activities for the same record id",
                    "TODO: the data-controller policy fails if any of its creation activities doesn't have a matching output record",
                    "TODO: the data-controller policy fails if any of the creation activities corresponds to an existing record-id input",
                    "TODO: the data-controller policy fails if a deletion activity isn't matched with a BURN of the record's UUT",
                ],
            },

            "UpdatingDelegatedDatum: checks that a custom data element can be updated":
                {
                    purpose:
                        "guards appropriate updates to custom data elements",
                    details: [
                        "When updating a custom datum, the Capo must involve the spending delegate ",
                        "  ... which can apply its own logic to deciding whether the update is allowed.",
                        "The Capo trusts the spending delegate's enforcement of policy.",
                        "The spend delegate can be signalled to validate multiple activities covering multiple utxos in a single transaction",
                    ],
                    mech: [
                        "builds transactions including the spending-delegate",
                        "TODO: TEST the capo fails if the spend delegate doesn't have an activity matching the record being updated",
                        "TODO: TEST the capo fails if the spend delegate has multiple activities for any one record id",
                        "TODO: TEST the spend delegate's multi-activity works only with the generic UpdatingDelegatedData activity",
                        "TODO: TEST the spend delegate fails if any of its activities isn't matched by a spent/updated record",
                        "TODO: TEST the spend delegate fails if the delegated data controller doesn't have an activity matching that record",
                        "TODO: TEST the spend delegate fails if the delegated data controller has multiple activities for the record id",
                        "TODO: TEST the data-controller policy fails if any of its activities isn't matched by a spent/updated record",
                        "TODO: TEST the data-controller policy works only with its specific SpendingActivities/MintingActivities, not the generic activities used by the SpendDgt",
                        "fails if the spending delegate is not included in the transaction",
                        "TODO: builds transactions including the invariant spending-delegates",
                        "TODO: fails if the expected invariant delegate is not included in the transaction",
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
                    "TODO: ensures that the charter token is kept separate from other assets in the contract",
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
        });
    }
}
// export interface Capo<SELF extends Capo<any>> extends hasSettingsType<SELF>{}
