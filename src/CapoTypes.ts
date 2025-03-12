import type {
    Address,
    MintingPolicyHash,
    MintingPolicyHashLike,
    TxInput,
    TxOutputId,
    ValidatorHash,
} from "@helios-lang/ledger";
import type { Capo } from "./Capo.js";
import type {
    ErgoCapoDatum,
    CapoDatum$Ergo$CharterData,
    CapoDatum$CharterDataLike,
    ErgoRelativeDelegateLink,
    CapoManifestEntryLike,
} from "./helios/scriptBundling/CapoHeliosBundle.typeInfo.js";
import type {
    OffchainPartialDelegateLink,
    ConfiguredDelegate,
    DelegateSetup,
} from "./delegation/RolesAndDelegates.js";
import type { StellarDelegate } from "./delegation/StellarDelegate.js";
import type { configBaseWithRev } from "./StellarContract.js";
import type {
    StellarTxnContext,
    anyState,
    uutMap,
} from "./StellarTxnContext.js";
import type { AnyDataTemplate } from "./delegation/DelegatedData.js";
import type { isActivity } from "./ActivityTypes.js";
import type { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import type { ContractBasedDelegate } from "./delegation/ContractBasedDelegate.js";
import type { UutName } from "./delegation/UutName.js";
import type { valuesEntry, InlineDatum } from "./HeliosPromotedTypes.js";
import type { BasicMintDelegate } from "./minting/BasicMintDelegate.js";
import type { SeedTxnScriptParams } from "./SeedTxnScriptParams.js";

/**
 * @public
 */
export type CapoDatum = ErgoCapoDatum;
/**
 * @public
 */
export type CharterData = CapoDatum$Ergo$CharterData;
/**
 * @public
 */
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
}

/**
 * @internal
 */
export function mkDgtStateKey<
    const N extends string,
    const PREFIX extends string = "dgPoi"
>(n: N, p: PREFIX = "dgPol" as PREFIX) {
    return `${p}${n.slice(0, 1).toUpperCase()}${n.slice(1)}` as dgtStateKey<
        N,
        PREFIX
    >;
}

/**
 * @internal
 */
export type dgtStateKey<
    N extends string,
    PREFIX extends string = "dgPol"
> = `${PREFIX}${Capitalize<N>}`;

/**
 * @public
 */
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

/**
 * @public
 */
export type DelegatedDataPredicate<
    DATUM_TYPE extends AnyDataTemplate<any, any>
> = (utxo: TxInput, data: DATUM_TYPE) => boolean;
/**
 * @public
 */
export type ManifestEntryTokenRef = Omit<CapoManifestEntryLike, "entryType"> & {
    entryType: Pick<CapoManifestEntryLike["entryType"], "NamedTokenRef">;
};
/**
 * @public
 */
export type SettingsDataContext = {
    settingsUtxo?: TxInput;
    tcx?: hasCharterRef;
    charterUtxo?: TxInput;
};

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
 * @public
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

/**
 * @public
 */
export type DelegateSetupWithoutMintDelegate = {
    withoutMintDelegate: useRawMinterSetup;
};

/**
 * @public
 */
export type NormalDelegateSetup = {
    usingSeedUtxo?: TxInput | undefined;
    additionalMintValues?: valuesEntry[];
    skipDelegateReturn?: true;
    mintDelegateActivity: isActivity;
};

/**
 * Pre-parsed results of finding and matching contract-held UTxOs
 * with datum details.
 * @public
 */
export type FoundDatumUtxo<
    DelegatedDatumType extends AnyDataTemplate<any, any>,
    WRAPPED_DatumType extends any = any
> = {
    utxo: TxInput;
    datum: InlineDatum;
    data?: DelegatedDatumType;
    dataWrapped?: WRAPPED_DatumType;
};

export type FoundCarterUtxo = {
    utxo: TxInput;
    datum: InlineDatum;
    data: CharterData
}

/**
 * @public
 */
export type UutCreationAttrsWithSeed = {
    usingSeedUtxo: TxInput;
};

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
 * @public
 */
export interface MinterBaseMethods {
    get mintingPolicyHash(): MintingPolicyHashLike;
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

/**
 * @public
 */
export type rootCapoConfig = {
    rootCapoScriptHash?: ValidatorHash;
};

/**
 * Configuration details for a Capo
 * @public
 */
export type CapoConfig<FF extends CapoFeatureFlags={}> = 
    configBaseWithRev &
    rootCapoConfig &
    SeedTxnScriptParams & {
        mph: MintingPolicyHash;
        rev: bigint;
        bootstrapping?: true;
    } &
    {featureFlags? : Partial<FF>}

type bootstrappedCapoConfig = {
    bsc: CapoConfig;
    uuts: uutMap;
    bootstrappedConfig: any;
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
export type hasBootstrappedCapoConfig = StellarTxnContext<bootstrappedCapoConfig>;

/**
 * @public
 */
export type charterDataState = {
    charterData: CharterDataLike,
    uuts: uutMap
}


/**
 * @public
 */
export type PreconfiguredDelegate<T extends StellarDelegate> = Omit<
    ConfiguredDelegate<T>,
    "delegate" | "delegateValidatorHash"
>;

/**
 * @public
 */
export type basicDelegateMap<
    anyOtherRoles extends {
        [k: string]: DelegateSetup<any, StellarDelegate, any>;
    } = {},
    defaultRoles = {
        govAuthority: DelegateSetup<"authority", StellarDelegate, any>;
        mintDelegate: DelegateSetup<"mintDgt", BasicMintDelegate, any>;
        spendDelegate: DelegateSetup<"spendDgt", ContractBasedDelegate, any>;
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
 * A transaction context having a reference to the Capo's charter
 * @remarks
 * The transaction will have a refInput pointing to the charter, for
 * on-chain delegate scripts' use
*
* The transaction context will have \{charterData, charterRef\} in its state
 * @public
 */
export type hasCharterRef = StellarTxnContext<
    {
        charterRef: TxInput;
        charterData: CharterData;
    } & anyState
>;

/**
 * A transaction context having a reference to the Capo's settings
 * @remarks
 * The transaction will have a refInput pointing to the settings record,
 * for any on-chain delegate scripts' use
*
* The transaction context will have \{settingsRef, settingsUtxo\} in its state.
*
* For more specific typing of the contents of the utxo's \{data, dataWrapped\},
* you may add a type parameter to this type.
 * @public
 */
export type hasSettingsRef<
    SETTINGS_TYPE extends AnyDataTemplate<any, any> = AnyDataTemplate<any, any>,
    WRAPPED_SETTINGS = any
> = StellarTxnContext<
    {
        settingsInfo: FoundDatumUtxo<SETTINGS_TYPE, WRAPPED_SETTINGS>;
    } & anyState
>;

/**
 * @public
 */
export type hasSpendDelegate = StellarTxnContext<
    anyState & {
        spendDelegate: ContractBasedDelegate;
    }
>;

/**
 * @public
 */
export type hasGovAuthority = StellarTxnContext<
    anyState & {
        govAuthority: AuthorityPolicy;
    }
>;

/**
 * @public
 */
export type FindableViaCharterData = {
    charterData: CharterData;
    optional?: true;
};

export type CapoFeatureFlags = Record<string, boolean>;

