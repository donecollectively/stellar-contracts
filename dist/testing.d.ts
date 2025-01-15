import { Address } from '@helios-lang/ledger';
import { anyState as anyState_2 } from './StellarTxnContext.js';
import { anyState as anyState_3 } from '../StellarTxnContext.js';
import { AssetClass } from '@helios-lang/ledger';
import { Assets } from '@helios-lang/ledger';
import { BasicMintDelegate as BasicMintDelegate_2 } from './minting/BasicMintDelegate.js';
import { Bip32PrivateKey } from '@helios-lang/tx-utils';
import { BytesLike } from '@helios-lang/codec-utils';
import { CardanoClient } from '@helios-lang/tx-utils';
import { Cast } from '@helios-lang/contract-utils';
import { Constructor as Constructor_2 } from '../helios/HeliosMetaTypes.js';
import { ContractBasedDelegate as ContractBasedDelegate_2 } from './delegation/ContractBasedDelegate.js';
import type { Cost } from '@helios-lang/uplc';
import type { DataType } from '@helios-lang/compiler';
import { DelegateSetup as DelegateSetup_2 } from './delegation/RolesAndDelegates.js';
import { EmptyConstructor as EmptyConstructor_2 } from '../helios/HeliosMetaTypes.js';
import { Emulator } from '@helios-lang/tx-utils';
import { EmulatorGenesisTx } from '@helios-lang/tx-utils';
import { EmulatorTx } from '@helios-lang/tx-utils';
import type { EnumMemberType } from '@helios-lang/compiler';
import { hasAddlTxns as hasAddlTxns_2 } from '../StellarTxnContext.js';
import { hasBootstrappedCapoConfig as hasBootstrappedCapoConfig_2 } from '../CapoTypes.js';
import { hasSeedUtxo as hasSeedUtxo_2 } from '../StellarTxnContext.js';
import { hasUutContext as hasUutContext_2 } from '../CapoTypes.js';
import { HeliosBundleClassWithCapo as HeliosBundleClassWithCapo_2 } from '../helios/HeliosMetaTypes.js';
import { HeliosProgramWithCacheAPI } from '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import { InlineTxOutputDatum } from '@helios-lang/ledger';
import { IntLike } from '@helios-lang/codec-utils';
import { isActivity as isActivity_2 } from '../ActivityTypes.js';
import { MintingPolicyHash } from '@helios-lang/ledger';
import type { MintingPolicyHashLike } from '@helios-lang/ledger';
import { NetworkParams } from '@helios-lang/ledger';
import { NetworkParamsHelper } from '@helios-lang/ledger';
import type { Program } from '@helios-lang/compiler';
import { PubKey } from '@helios-lang/ledger';
import { PubKeyHash } from '@helios-lang/ledger';
import { ReqtsMap } from '../Requirements.js';
import { ReqtsMap as ReqtsMap_3 } from './Requirements.js';
import { RootPrivateKey } from '@helios-lang/tx-utils';
import { ShelleyAddress } from '@helios-lang/ledger';
import { Signature } from '@helios-lang/ledger';
import { SimpleWallet } from '@helios-lang/tx-utils';
import type { Site } from '@helios-lang/compiler-utils';
import { Source } from '@helios-lang/compiler-utils';
import { StakingAddress } from '@helios-lang/ledger';
import { StellarDelegate as StellarDelegate_2 } from './delegation/StellarDelegate.js';
import type { TestContext } from 'vitest';
import { tokenPredicate as tokenPredicate_2 } from '../UtxoHelper.js';
import { Tx } from '@helios-lang/ledger';
import { TxBuilder } from '@helios-lang/tx-utils';
import { TxId } from '@helios-lang/ledger';
import { TxInput } from '@helios-lang/ledger';
import { TxOutput } from '@helios-lang/ledger';
import { TxOutputDatum } from '@helios-lang/ledger';
import { TxOutputId } from '@helios-lang/ledger';
import { TxOutputIdLike } from '@helios-lang/ledger';
import type { TypeSchema } from '@helios-lang/type-utils';
import { UplcData } from '@helios-lang/uplc';
import { UplcLogger } from '@helios-lang/uplc';
import type { UplcProgramV2 } from '@helios-lang/uplc';
import { UplcRecord as UplcRecord_2 } from '../StellarContract.js';
import { ValidatorHash } from '@helios-lang/ledger';
import { Value } from '@helios-lang/ledger';
import { valuesEntry as valuesEntry_2 } from './HeliosPromotedTypes.js';
import { Wallet } from '@helios-lang/tx-utils';
import { WalletHelper } from '@helios-lang/tx-utils';

declare type abstractContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: true;
};

declare type AbstractNew<T = any> = abstract new (...args: any) => T;

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class ActivityDelegateRoleHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class ActivityDelegateRoleHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_2, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class ActivityDelegateRoleHelperNested_3 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_3, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}

declare type ActorContext<WTP extends Wallet = Wallet> = {
    wallet?: WTP;
};

/**
 * @public
 */
export declare type actorMap = Record<string, SimpleWallet_stellar>;

/**
 * @public
 */
export declare const ADA = 1000000n;

declare type addRefInputArgs = Parameters<TxBuilder["refer"]>;

/**
 * Adds a test helper class to a `vitest` testing context.
 * @remarks
 *
 * @param context -  a vitest context, typically created with StellarTestContext
 * @param TestHelperClass - typically created with DefaultCapoTestHelper
 * @param stConfig - preset configuration for the contract under test
 * @public
 **/
export declare function addTestContext<SC extends StellarContract<any>, ST_CONFIG extends configBaseWithRev & ConfigFor<SC> = ConfigFor<SC>>(context: StellarTestContext<any, SC>, TestHelperClass: stellarTestHelperSubclass<SC>, stConfig?: ST_CONFIG, helperState?: TestHelperState<SC>): Promise<void>;

declare type AnyData = {
    id: number[];
    type: string;
};

declare type AnyData_2 = {
    id: number[];
    type: string;
};

declare type AnyData_3 = {
    id: number[];
    type: string;
};

declare type AnyDataLike = {
    id: number[];
    type: string;
};

declare type AnyDataLike_2 = {
    id: number[];
    type: string;
};

declare type AnyDataLike_3 = {
    id: number[];
    type: string;
};

/**
 * @public
 */
declare type AnyDataTemplate<TYPENAME extends string, others extends anyDatumProps> = {
    [key in string & ("id" | "type" | keyof Omit<others, "id">)]: key extends "id" ? string : key extends "type" ? TYPENAME : others[key];
};

/**
 * Properties for Datum structures for on-chain scripts
 * @public
 **/
declare type anyDatumProps = Record<string, any>;

/**
 * A base state for a transaction context
 * @public
 **/
declare interface anyState {
    uuts: uutMap;
}

/**
 * @public
 */
declare type anyUplcProgram = UplcProgramV2;

/**
 * Generic class as base for pure authorization
 * @remarks
 *
 * This isn't different from StellarDelegate, but
 * using it as a base class more specific than "any delegate"
 * gives useful semantics for Capo's govAuthority role
 * @public
 **/
declare abstract class AuthorityPolicy extends StellarDelegate {
}

/**
 * @public
 */
declare type basicDelegateMap<anyOtherRoles extends {
    [k: string]: DelegateSetup<any, StellarDelegate, any>;
} = {}, defaultRoles = {
    govAuthority: DelegateSetup<"authority", StellarDelegate, any>;
    mintDelegate: DelegateSetup<"mintDgt", BasicMintDelegate, any>;
    spendDelegate: DelegateSetup<"spendDgt", ContractBasedDelegate, any>;
}> = {
    [k in keyof anyOtherRoles | keyof defaultRoles]: k extends keyof anyOtherRoles ? anyOtherRoles[k] : k extends keyof defaultRoles ? defaultRoles[k] : never;
};

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 *
 * By default, this delegate policy serves also as a spend delegate.  To use a separate
 * spend delegate, define `get isMintAndSpendDelegate() { return false; }` in the subclass,
 * define a separate ContractBasedDelegate subclass for the spend delegate, and
 * register it in the Capo contract's `delegateRoles.spendDelegate`.
 *
 * @public
 **/
declare class BasicMintDelegate extends ContractBasedDelegate {
    static currentRev: bigint;
    dataBridgeClass: GenericDelegateBridgeClass;
    get delegateName(): string;
    get isMintAndSpendDelegate(): boolean;
    /**
     * the scriptBundle for the BasicMintDelegate looks concrete,
     * but it's actually just referencing a generic, unspecialized delegate script
     * that may not provide much value to any specific application.
     *
     * Subclasses should expect to override this and provide a specialized
     * `get scriptBundle() { return new ‹YourMintDelegateBundle› }`, using
     *  a class you derive from CapoDelegateBundle and your own delegate
     * specialization.  TODO: a generator to make this easier.  Until then,
     * you can copy the UnspecializedDelegate.hl and specialize it.
     */
    scriptBundle(): UnspecializedDgtBundle;
    static get defaultParams(): {
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        rev: bigint;
    };
    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * creation of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer.
     * @public
     */
    activityCreatingDelegatedData(seedFrom: hasSeed, uutPurpose: string): {
        redeemer: UplcData;
    };
    /**
     * A mint-delegate activity indicating that a delegated-data controller UUT is being created
     * to govern a class of delegated data.  ONLY the indicated data-controller UUT must be minted,
     * and is expected to be deposited into the data-controller's policy-script address.  Use the
     * {@link DelegatedDataContract} class to create the off-chain data controller and its on-chain policy.
     */
    activityCreatingDataDelegate(seedFrom: hasSeed, uutPurpose: string): isActivity;
    mkDatumScriptReference(): any;
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, skipReturningDelegate?: "skipDelegateReturn"): Promise<TCX>;
}

/**
 * The parameters for the Capo's basic minter
 * @public
 */
declare type BasicMinterParams = configBaseWithRev & SeedTxnScriptParams & {
    capo: Capo<any>;
};

/**
 * BurningActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the BurningActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `BurningActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type BurningActivity = {
    _placeholder1BA: number[];
};

/**
 * BurningActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the BurningActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `BurningActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type BurningActivity_2 = {
    DeletingRecord: number[];
};

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 */
declare class BurningActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1BA: number[];
    }, Partial<{
        _placeholder1BA: number[];
    }>>;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::BurningActivity._placeholder1BA"***
     */
    _placeholder1BA(recId: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 */
declare class BurningActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        DeletingRecord: number[];
    }, Partial<{
        DeletingRecord: number[];
    }>>;
    /**
     * generates  UplcData for ***"ReqtsData::BurningActivity.DeletingRecord"***
     */
    DeletingRecord(id: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 */
declare class BurningActivityHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1BA: number[];
    }, Partial<{
        _placeholder1BA: number[];
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::BurningActivity._placeholder1BA"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    _placeholder1BA(recId: number[]): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 */
declare class BurningActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        DeletingRecord: number[];
    }, Partial<{
        DeletingRecord: number[];
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::BurningActivity.DeletingRecord"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DeletingRecord(id: number[]): isActivity;
}

/**
 * BurningActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **1 variant(s)** of the BurningActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `BurningActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type BurningActivityLike = IntersectedEnum<{
    _placeholder1BA: number[];
}>;

/**
 * BurningActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **1 variant(s)** of the BurningActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `BurningActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type BurningActivityLike_2 = IntersectedEnum<{
    DeletingRecord: number[];
}>;

declare type canHaveDataBridge = {
    dataBridgeClass?: AbstractNew<ContractDataBridge>;
};

/**
 * @public
 */
export declare type canHaveRandomSeed = {
    randomSeed?: number;
};

declare type canHaveToken = TxInput | TxOutput | Assets;

/**
 * @public
 */
export declare type canSkipSetup = {
    skipSetup?: true;
};

/**
 * Base class for leader contracts, with predefined roles for cooperating/delegated policies
 * @remarks
 *
 * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract
 * scripts.  Capo contract can use these capabilities in custom ways for strong flexibility.
 *
 * ### Defining Delegates
 * Any Capo contract can define delegateRoles() to establish custom collaborating scripts; these are used for
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain)
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * Capo provides roles for govAuthority and mintDelegate, and methods to facilitate
 * the lifecycle of charter creation & update.   Define a delegateRoles data structure using
 * the standalone helper function of that name, use its type in your `extends Capo<...>` clause,
 * and return that delegate map from the `delegateRoles()` method in your subclass.
 *
 * You may wish to use the `basicRoles()` helper function to easily access any of the default
 * mint/ spend/ authority delegate definitions, and the defineRole() method to make additional
 * roles for your application's data types.
 *
 * ### The Delegation Pattern and UUTs
 *
 * The delegation pattern uses UUTs, which are non-fungible / ***unique utility tokens***.  This is
 * equivalent to a "thread token" - a provable source of self-authority or legitimacy for contract
 * UTxOs.  Without the UUT, a contract UTxO is just a piece of untrusted data; with the UUT, it
 * can be blessed with proactive policy enforcement during creation.
 *
 * Architecturally, UUTs provide a simple and unique handle for the Capo to use as a  **required transaction element**
 * in key operational activities (like updating the charter details); so that the delegate holding the UUT is entrusted to
 * approved the UUT's inclusion in a transaction, with all the policy-enforcement implicated on the other end of the
 * delegation.
 *
 * UUTs can be used to form a positive linkage between the Capo (which should normally retain a reference
 * to that UUT) and any delegate; that delegate is most commonly another contract script also
 * referenced within the roles() definition.
 *
 *  * **Example: Multisig authority delegation** - a Capo contract would get much more complicated if it
 * contained multisig logic.  Instead, the governance authority for the Capo can be delegated to a
 * standalone multi-sig contract, which can contain all (and only) the multi-sig logic.  Separating the
 * responsibilities makes each part simpler, easing the process of ensuring each part is doing its job :pray:
 *
 * ### UUTs and Delegated Data
 *
 * UUTs can also be used as a form of uniqueness for data stored in the Capo's UTxOs (i.e. a record id).
 * The UTxO only lasts until it is spent, but the UUT's identity can continue along with any value and
 * connected data.
 *
 * Policy delegates provide on-chain delegation of authority for the Capo's data, while being upgradable
 * to support the evolving needs of the application.  Delegated datums store data of various types
 * at the Capo's address, while delegate policies, each at its own address are invoked to enforce creation
 * and update rules for each type of data.
 *
 * @public
 */
declare abstract class Capo<SELF extends Capo<any>> extends StellarContract<CapoConfig> {
    #private;
    static currentRev: bigint;
    static currentConfig(): Promise<void>;
    dataBridgeClass: typeof CapoDataBridge;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get offchain(): mustFindConcreteContractBridgeType<this>["reader"];
    get reader(): mustFindConcreteContractBridgeType<this>["reader"];
    get activity(): mustFindActivityType<this>;
    get mkDatum(): mustFindDatumType<this>;
    get newReadDatum(): mustFindReadDatumType<this>;
    verifyConfigs(): Promise<any>;
    get isConfigured(): Promise<boolean>;
    scriptBundle(): CapoHeliosBundle;
    /**
     * Reveals any bootstrapping details that may be present during initial creation
     * of the Capo contract, for use during and immediately after charter-creation.
     *
     * @public
     **/
    bootstrapping?: {
        [key in "govAuthority" | "mintDelegate" | "spendDelegate"]: ConfiguredDelegate<any>;
    };
    static parseConfig(rawJsonConfig: {
        mph: {
            bytes: string;
        };
        rev: bigint;
        seedTxn?: {
            bytes: string;
        };
        seedIndex: bigint;
        rootCapoScriptHash: {
            bytes: string;
        };
    }): any;
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    static get defaultParams(): {
        rev: bigint;
    };
    /**
     * extracts from the input configuration the key details needed to construct/reconstruct the on-chain contract address
     * @remarks
     *
     * extracts the details that are key to parameterizing the Capo / leader's on-chain contract script
     * @public
     **/
    getContractScriptParamsUplc(config: CapoConfig): UplcRecord<configBaseWithRev & Pick<CapoConfig, "seedTxn" | "seedIndex" | "mph">>;
    init(args: StellarFactoryArgs<CapoConfig>): Promise<this>;
    static bootstrapWith(args: StellarFactoryArgs<CapoConfig>): any;
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
    mkAdditionalTxnsForCharter<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    get minterClass(): stellarSubclass<CapoMinter>;
    minter: CapoMinter;
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
    activityUsingAuthority(): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    get charterTokenPredicate(): tokenPredicate<any>;
    tokenAsValue(tokenName: string | number[] | UutName, count?: bigint): Value;
    mustFindCharterUtxo(): Promise<TxInput>;
    /**
     * @deprecated - use tcxWithCharterRef() instead
     */
    txnAddCharterRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasCharterRef>;
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
    tcxWithCharterRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasCharterRef>;
    tcxWithSettingsRef<TCX extends StellarTxnContext>(this: SELF, tcx: TCX): Promise<TCX & hasSettingsRef<any, any>>;
    /**
     * finds and spends the Capo's charter utxo, typically for updating
     * its CharterData datum.
     */
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newCharterData?: CharterDataLike): Promise<TCX>;
    /**
     * @deprecated - use {@link Capo.tcxWithCharterRef |tcxWithCharterRef(tcx)} instead
     */
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, useReferenceInput: "refInput" | true): Promise<TCX>;
    txnUpdateCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newDatum: CharterDataLike): Promise<StellarTxnContext | never>;
    txnKeepCharterToken<TCX extends StellarTxnContext>(tcx: TCX, datum: TxOutputDatum): TCX;
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
    txnAddGovAuthorityTokenRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    txnMustUseSpendDelegate<TCX extends hasCharterRef>(tcx: TCX, spendDelegate: ContractBasedDelegate, activity: isActivity): Promise<TCX & hasSpendDelegate>;
    /**
     * provides minter-targeted params extracted from the input configuration
     * @remarks
     *
     * extracts the seed-txn details that are key to parameterizing the minter contract
     * @public
     **/
    getMinterParams(): {
        seedTxn: TxId;
        seedIndex: bigint;
    };
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    findActorUut(uutPrefix: string, mph?: MintingPolicyHash): Promise<FoundUut | undefined>;
    /**
     * parses details in a delegate-link
     * @deprecated - use an adapter for CharterData instead?
     */
    offchainLink<T extends MinimalDelegateLink | OffchainPartialDelegateLink | RelativeDelegateLinkLike>(link: T): T;
    parseDgtConfig(inLink: // | MinimalDelegateLink
    ErgoRelativeDelegateLink | RelativeDelegateLinkLike): Partial<capoDelegateConfig>;
    serializeDgtConfig(config: Partial<capoDelegateConfig>): number[];
    /**
     * @deprecated - use the bridge type directly, and parseDgtConfig iff we ever need that.
     */
    parseDelegateLinksInCharter(charterData: CharterData): void;
    findCharterData(currentCharterUtxo?: TxInput): Promise<CharterData>;
    findSettingsInfo(this: SELF, charterRefOrInputOrProps?: hasCharterRef | TxInput | CapoDatum$Ergo$CharterData): Promise<FoundDatumUtxo<any, any>>;
    connectMintingScript(params: SeedTxnScriptParams): Promise<CapoMinter>;
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
    txnMustGetSeedUtxo(tcx: StellarTxnContext, purpose: string, tokenNames: string[]): Promise<TxInput | never>;
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
    txnCreateOffchainDelegateLink<RoLabel extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(tcx: hasUutContext<RoLabel>, roleLabel: RoLabel, delegateInfo: OffchainPartialDelegateLink): Promise<ConfiguredDelegate<DT> & Required<OffchainPartialDelegateLink>>;
    /**
     * extracts the key details for creating an on-chain delegate link, given a setup-phase
     * configuration for that delegate.
     */
    mkOnchainRelativeDelegateLink<CT extends ConfiguredDelegate<any>>(configured: CT): RelativeDelegateLinkLike;
    /**
     * extracts the key details of a delegate link, given a delegate configuration.
     * @remarks
     * This is valid only during the setup phase of creating a delegate, and does not encode the config entry.
     *
     * use mkRelativeDelegateLink() to encode the config entry, and use this.parseDgtConfig() to decode it.
     */
    extractDelegateLinkDetails<CT extends ConfiguredDelegate<DT> | OffchainPartialDelegateLink, DT extends StellarDelegate | never = CT extends ConfiguredDelegate<infer D> ? D : never>(configured: CT): CT extends ConfiguredDelegate<any> ? CT & OffchainPartialDelegateLink : OffchainPartialDelegateLink;
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
    txnCreateConfiguredDelegate<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(tcx: hasUutContext<RN>, roleName: RN, delegateInfo: OffchainPartialDelegateLink): Promise<ConfiguredDelegate<DT>>;
    mkImpliedDelegationDetails(uut: UutName): DelegationDetail_2;
    connectDelegateWithOnchainRDLink<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(roleLabel: RN, delegateLink: RelativeDelegateLinkLike): Promise<DT>;
    private showDelegateLink;
    mustGetDelegate<T extends StellarDelegate>(configuredDelegate: PreconfiguredDelegate<T>): Promise<T>;
    tvForDelegate(dgtLink: ErgoRelativeDelegateLink): Value;
    mkDelegatePredicate(dgtLink: ErgoRelativeDelegateLink): tokenPredicate<any>;
    activityUpdatingCharter(): isActivity;
    activitySpendingDelegatedDatum(): {
        redeemer: UplcData;
    };
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
    getDelegateRoles(): void;
    get delegateRoles(): basicDelegateMap<any> & ReturnType<SELF["initDelegateRoles"]>;
    _delegateRoles: basicDelegateMap<any> & ReturnType<SELF["initDelegateRoles"]>;
    abstract initDelegateRoles(): basicDelegateMap<any>;
    addressAuthorityConfig(): DelegateConfigDetails<AuthorityPolicy>;
    basicDelegateRoles(): basicDelegateMap;
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
    verifyCoreDelegates(): Promise<[BasicMintDelegate, AuthorityPolicy, ContractBasedDelegate]>;
    mkDatumScriptReference(): InlineTxOutputDatum;
    findGovDelegate(charterData?: CharterData): Promise<ContractBasedDelegate>;
    txnAddGovAuthority<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasGovAuthority>;
    getMintDelegate(charterData?: CharterData): Promise<BasicMintDelegate>;
    getSpendDelegate(charterData?: CharterData): Promise<BasicMintDelegate>;
    getSettingsController(this: SELF): Promise<DelegatedDataContract<any, any>>;
    /**
     * Finds the delegated-data controller for a given typeName.
     * @remarks
     * REQUIRES that the Capo manifest contains an installed DgDataPolicy
     * and that the off-chain Capo delegateMap provides an off-chain controller
     * for that typeName.
     */
    getDgDataController<RN extends string & keyof SELF["_delegateRoles"]>(this: SELF, roleName: RN, charterData?: CharterData): Promise<DelegatedDataContract<any, any>>;
    /**
     * @deprecated - use getOtherNamedDelegate() or getDgDataController() instead
     */
    getNamedDelegate(): void;
    /**
     * Finds a contract's named delegate, given the expected delegateName.
     * @remarks
     * @public
     **/
    getOtherNamedDelegate(delegateName: string, charterData?: CharterData): Promise<ContractBasedDelegate>;
    getNamedDelegates(charterData?: CharterData): Promise<{
        [k: string]: ContractBasedDelegate;
    }>;
    getGovDelegate(charterData?: CharterData): Promise<void>;
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
    };
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
    mkTxnMintCharterToken<TCX extends undefined | StellarTxnContext<anyState>, TCX2 extends StellarTxnContext<anyState> = hasBootstrappedCapoConfig & (TCX extends StellarTxnContext<infer TCXT> ? StellarTxnContext<TCXT> : unknown), TCX3 = TCX2 & hasAddlTxns<TCX2> & hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt" | "setting">>(charterDataArgs: MinimalCharterDataArgs, existingTcx?: TCX, dryRun?: "DRY_RUN"): Promise<TCX3 & Awaited<hasUutContext<"mintDelegate" | "spendDgt" | "mintDgt" | "capoGov" | "spendDelegate" | "govAuthority"> & TCX2 & hasBootstrappedCapoConfig & hasSeedUtxo>>;
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
    txnMkAddlRefScriptTxn<TCX extends StellarTxnContext<anyState>, RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any> ? TCX : hasAddlTxns<TCX>>(tcx: TCX, scriptName: string, script: anyUplcProgram): Promise<RETURNS>;
    mkRefScriptTxn(script: anyUplcProgram): StellarTxnContext;
    /**
     * Attach the given script by reference to a transaction
     * @remarks
     *
     * If the given script is found in the Capo's known list of reference scripts,
     * it is used to attach the refScript to the transaction context.  Otherwise,
     * the script's bytes are added directly to the transaction.
     *
     * The indicated script is expected to be found in one of the Capo's
     * refScript utxos.  Otherwise, a missing-refScript warning is emitted,
     * and the program is added directly to the transaction.
     * If this makes the transaction too big, the console
     * warning will be followed by a thrown error during the transaction's
     * wallet-submission sequence.
     * @param program - the UPLC program to attach to the script
     * @public
     **/
    txnAttachScriptOrRefScript<TCX extends StellarTxnContext>(tcx: TCX, program?: anyUplcProgram, useRefScript?: boolean): Promise<TCX>;
    findScriptReferences(): Promise<[TxInput, any][]>;
    mkTxnUpdateCharter<TCX extends StellarTxnContext>(args: CharterDataLike, activity?: isActivity, tcx?: TCX): Promise<StellarTxnContext>;
    txnAddNamedDelegateAuthority<TCX extends StellarTxnContext>(tcx: TCX, delegateName: string, delegate: ContractBasedDelegate, activity: isActivity): Promise<TCX>;
    /**
     * Returns a single item from a list, throwing an error if it has multiple items
     *
     */
    singleItem<T>(xs: Array<T>): T;
    /**
     * Queries a chain-index to find utxos having a specific type of delegated datum
     * @remarks
     * Optionally filters records by `id`, `type` and/or `predicate`
     *
     * The `predicate` function, if provided, can implement any logic suitable for a specific case of data-finding.
     */
    findDelegatedDataUtxos<const T extends undefined | (string & keyof SELF["_delegateRoles"]), RAW_DATUM_TYPE extends T extends string ? AnyDataTemplate<T, any> : never, PARSED_DATUM_TYPE>(this: SELF, { type, id, predicate, query, }: {
        type?: T;
        id?: string | number[] | UutName;
        predicate?: DelegatedDataPredicate<RAW_DATUM_TYPE>;
        query?: never;
    }): Promise<FoundDatumUtxo<RAW_DATUM_TYPE, PARSED_DATUM_TYPE>[]>;
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
    mkTxnUpdatingMintDelegate<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: MinimalDelegateUpdateLink, tcx?: TCX): Promise<TCX & hasUutContext<"mintDelegate" | "mintDgt"> & hasSeedUtxo>;
    mkValuesBurningDelegateUut(current: ErgoRelativeDelegateLink): valuesEntry_2[];
    mkTxnUpdatingSpendDelegate<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: MinimalDelegateUpdateLink, tcx?: TCX): Promise<TCX>;
    mkTxnAddingMintInvariant<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: OffchainPartialDelegateLink, tcx?: TCX): Promise<StellarTxnContext>;
    mkTxnAddingSpendInvariant<THIS extends Capo<any>, const SN extends string & keyof THIS["delegateRoles"]["spendDelegate"]["variants"], TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: OffchainPartialDelegateLink, tcx?: TCX): Promise<hasUutContext<"spendDgt" | "spendDelegate"> & TCX & hasSeedUtxo>;
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
    mkTxnAddingNamedDelegate<DT extends StellarDelegate, thisType extends Capo<any>, const delegateName extends string, TCX extends hasSeedUtxo = hasSeedUtxo>(this: thisType, delegateName: delegateName, options: OffchainPartialDelegateLink & NamedPolicyCreationOptions<thisType, DT>, tcx?: TCX): Promise<hasAddlTxns<TCX & hasSeedUtxo & hasNamedDelegate<DT, delegateName>>>;
    /**
     * Helper for installing a named policy delegate
     * @remarks
     *
     * Creates a transaction for adding a delegate-data-policy to the Capo.
     * TODO: support also updating an existing delegate to a new policy script.
     *
     * The designated role name refers to the a key in the Capo's delegateRoles list -
     * typically the full `typename` of a delegated-data-policy.
     *
     * The idPrefix refers to the short prefix used for UUT id's for this data-type.
     *
     * An addlTxn for ref-script creation is included.
     */
    mkTxnInstallingPolicyDelegate<const RoLabel extends string & keyof SELF["delegateRoles"], THIS extends Capo<any>>(this: THIS, dgtRole: RoLabel, idPrefix: string, charter?: CapoDatum$Ergo$CharterData): Promise<hasAddlTxns<StellarTxnContext<anyState> & hasSeedUtxo & hasNamedDelegate<StellarDelegate, RoLabel, "dgData">> & hasUutContext<"dgDataPolicy" | RoLabel>>;
    /**
     * Adds a new entry to the Capo's manifest
     * @remarks
     * Use mkTxnQueueingDelegateChange for changing DgDataPolicy entries.
     *
     * The type exclusions here mean this CURRENTLY works only with the
     * NamedTokenRef variety of manifest entry, but that's just pragmatic
     * because the other types don't yet have an implementation.
     * Other types can be eligible for adding to this API or to a different call.
     */
    mkTxnAddManifestEntry<THIS extends Capo<any>, TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>>(this: THIS, key: string, utxo: FoundDatumUtxo<any, any>, entry: ManifestEntryTokenRef, tcx?: TCX): Promise<StellarTxnContext<anyState>>;
    mkTxnQueuingDelegateChange<DT extends StellarDelegate, THIS extends Capo<any>, const RoLabel extends string & keyof SELF["delegateRoles"], OPTIONS extends OffchainPartialDelegateLink, TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>>(this: THIS, change: "Add" | "Replace", policyName: RoLabel, idPrefix: string, options?: OPTIONS, // & NamedPolicyCreationOptions<THIS, DT>,
    tcx?: TCX): Promise<hasAddlTxns<TCX & hasNamedDelegate<DT, RoLabel, "dgData">> & hasUutContext<"dgDataPolicy" | RoLabel>>;
    tempMkDelegateLinkForQueuingDgtChange(seedUtxo: TxInput, mintDgtActivity: SomeDgtActivityHelper, purpose: string, policyName: string, idPrefix: string, options: OffchainPartialDelegateLink): Promise<{
        delegateClass: stellarSubclass<ContractBasedDelegate>;
        delegate: ContractBasedDelegate;
        roleName: string;
        fullCapoDgtConfig: Partial<CapoConfig> & capoDelegateConfig;
    } & OffchainPartialDelegateLink & Required<OffchainPartialDelegateLink>>;
    mkTxnCommittingPendingChanges<TCX extends StellarTxnContext>(tcx?: TCX): Promise<StellarTxnContext<anyState>>;
    /**
     * Adds UUT minting to a transaction
     * @remarks
     *
     * Constructs UUTs with the indicated purposes, and adds them to the contract state.
     * This is a useful generic capability to support any application-specific purpose.
     *
     * The provided transaction context must have a seedUtxo - use {@link StellarContract.tcxWithSeedUtxo | tcxWithSeedUtxo()} to add one
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
    txnMintingUuts<const purposes extends string, existingTcx extends hasSeedUtxo, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], options: NormalDelegateSetup | DelegateSetupWithoutMintDelegate, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    /**
     * @deprecated use tcxWithSeedUtxo() instead
     * @remarks adds a seed utxo to a transaction-context,
     */
    addSeedUtxo<TCX extends StellarTxnContext>(tcx?: TCX, seedUtxo?: TxInput): Promise<TCX & hasSeedUtxo>;
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
    txnWillMintUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends string & keyof RM = string & keyof RM>(tcx: existingTcx, uutPurposes: purposes[], { usingSeedUtxo }: UutCreationAttrsWithSeed, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    requirements(): ReqtsMap_3<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using txnCreateDelegateLink()" | "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name" | "can locate UUTs in the user's wallet" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the charter token is always kept in the contract" | "the charter details can be updated by authority of the capoGov-* token" | "can mint other tokens, on the authority of the charter's registered mintDgt- token" | "can handle large transactions with reference scripts" | "has a singleton minting policy" | "can update the minting delegate in the charter data" | "can update the spending delegate in the charter data" | "can add invariant minting delegates to the charter data" | "can add invariant spending delegates to the charter data" | "supports an abstract Settings structure stored in the contact" | "added and updated delegates always validate the present configuration data" | "can commit new delegates" | "supports storing new types of datum not pre-defined in the Capo's on-chain script" | "the charter has a namedDelegates structure for semantic delegate links" | "CreatingDelegatedDatum: creates a UTxO with any custom datum" | "UpdatingDelegatedDatum: checks that a custom data element can be updated", never>;
}

/**
 * CapoActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **6 variant(s)** of the CapoActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type CapoActivity = {
    capoLifecycleActivity: CapoLifecycleActivity;
} | {
    usingAuthority: tagOnly;
} | {
    retiringRefScript: tagOnly;
} | {
    addingSpendInvariant: tagOnly;
} | {
    spendingDelegatedDatum: tagOnly;
} | {
    updatingCharter: tagOnly;
};

/**
 * Helper class for generating UplcData for variants of the ***CapoActivity*** enum type.
 * @public
 */
declare class CapoActivityHelper extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoActivity, Partial<{
        capoLifecycleActivity: CapoLifecycleActivityLike;
        usingAuthority: tagOnly;
        retiringRefScript: tagOnly;
        addingSpendInvariant: tagOnly;
        spendingDelegatedDatum: tagOnly;
        updatingCharter: tagOnly;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***CapoActivity:capoLifecycleActivity***.
     */
    get capoLifecycleActivity(): CapoLifecycleActivityHelperNested;
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.usingAuthority"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get usingAuthority(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.retiringRefScript"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get retiringRefScript(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.addingSpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get addingSpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.spendingDelegatedDatum"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get spendingDelegatedDatum(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.updatingCharter"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#5***
     */
    get updatingCharter(): {
        redeemer: UplcData;
    };
}

declare type CapoBundleClass = new () => CapoHeliosBundle;

/**
 * Configuration details for a Capo
 * @public
 */
declare type CapoConfig = configBaseWithRev & rootCapoConfig & SeedTxnScriptParams & {
    mph: MintingPolicyHash;
    rev: bigint;
    bootstrapping?: true;
};

declare type CapoCtx = {
    mph: MintingPolicyHash;
    charter: cctx_CharterInputType;
};

declare type CapoCtx_2 = {
    mph: MintingPolicyHash;
    charter: cctx_CharterInputType_2;
};

declare type CapoCtxLike = {
    mph: /*minStructField*/ MintingPolicyHash | string | number[];
    charter: cctx_CharterInputTypeLike;
};

declare type CapoCtxLike_2 = {
    mph: /*minStructField*/ MintingPolicyHash | string | number[];
    charter: cctx_CharterInputTypeLike_2;
};

/**
 * GENERATED data bridge for **Capo** script (defined in class ***CapoHeliosBundle***)
 * main: **src/DefaultCapo.hl**, project: **stellar-contracts**
 * @remarks - note that you may override `get dataBridgeName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class CapoDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (CapoDatum)***
     * for this contract script.
     */
    datum: CapoDatumHelper;
    /**
     * this is the specific type of datum for the `Capo` script
     */
    CapoDatum: CapoDatumHelper;
    readDatum: (d: UplcData) => ErgoCapoDatum;
    /**
     * generates UplcData for the activity type (***CapoActivity***) for the `Capo` script
     */
    activity: CapoActivityHelper;
    CapoActivity: CapoActivityHelper;
    reader: CapoDataBridgeReader;
    /**
     * accessors for all the types defined in the `Capo` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `Capo` script
         */
        DelegateRole: DelegateRoleHelper;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `Capo` script
         */
        ManifestEntryType: ManifestEntryTypeHelper;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `Capo` script
         */
        PendingDelegateAction: PendingDelegateActionHelper;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `Capo` script
         */
        PendingCharterChange: PendingCharterChangeHelper;
        /**
         * generates UplcData for the enum type ***CapoDatum*** for the `Capo` script
         */
        CapoDatum: CapoDatumHelper;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `Capo` script
         */
        ManifestActivity: ManifestActivityHelper;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `Capo` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper;
        /**
         * generates UplcData for the enum type ***CapoActivity*** for the `Capo` script
         */
        CapoActivity: CapoActivityHelper;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `Capo` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `Capo` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike | {
            entryType: ManifestEntryTypeLike;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `Capo` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike | {
            action: PendingDelegateActionLike;
            role: DelegateRoleLike;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `Capo` script
         */
        AnyData: (fields: AnyDataLike | {
            id: number[];
            type: string;
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink, RelativeDelegateLinkLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry, CapoManifestEntryLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange, PendingDelegateChangeLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData, AnyDataLike>;
}

declare class CapoDataBridgeReader extends DataBridgeReaderClass {
    bridge: CapoDataBridge;
    constructor(bridge: CapoDataBridge);
    /**
     * reads UplcData *known to fit the **DelegateRole*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateRole(d: UplcData): ErgoDelegateRole;
    /**
     * reads UplcData *known to fit the **ManifestEntryType*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType;
    /**
     * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction;
    /**
     * reads UplcData *known to fit the **PendingCharterChange*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange;
    datum: (d: UplcData) => Partial<{
        CharterData: CapoDatum$Ergo$CharterData;
        ScriptReference: tagOnly;
        DelegatedData: CapoDatum$Ergo$DelegatedData;
    }>;
    /**
     * reads UplcData *known to fit the **CapoDatum*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoDatum(d: UplcData): ErgoCapoDatum;
    /**
     * reads UplcData *known to fit the **ManifestActivity*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestActivity(d: UplcData): ErgoManifestActivity;
    /**
     * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity;
    /**
     * reads UplcData *known to fit the **CapoActivity*** enum type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoActivity(d: UplcData): ErgoCapoActivity;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink;
    /**
     * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoManifestEntry(d: UplcData): CapoManifestEntry;
    /**
     * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateChange(d: UplcData): PendingDelegateChange;
    /**
     * reads UplcData *known to fit the **AnyData*** struct type,
     * for the Capo script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    AnyData(d: UplcData): AnyData;
}

declare type CapoDatum$CharterData = {
    spendDelegateLink: RelativeDelegateLink;
    spendInvariants: Array<RelativeDelegateLink>;
    otherNamedDelegates: Map<string, RelativeDelegateLink>;
    mintDelegateLink: RelativeDelegateLink;
    mintInvariants: Array<RelativeDelegateLink>;
    govAuthorityLink: RelativeDelegateLink;
    manifest: Map<string, CapoManifestEntry>;
    pendingChanges: Array<PendingCharterChange>;
};

declare type CapoDatum$CharterData_2 = {
    spendDelegateLink: RelativeDelegateLink_2;
    spendInvariants: Array<RelativeDelegateLink_2>;
    otherNamedDelegates: Map<string, RelativeDelegateLink_2>;
    mintDelegateLink: RelativeDelegateLink_2;
    mintInvariants: Array<RelativeDelegateLink_2>;
    govAuthorityLink: RelativeDelegateLink_2;
    manifest: Map<string, CapoManifestEntry_2>;
    pendingChanges: Array<PendingCharterChange_2>;
};

declare type CapoDatum$CharterData_3 = {
    spendDelegateLink: RelativeDelegateLink_4;
    spendInvariants: Array<RelativeDelegateLink_4>;
    otherNamedDelegates: Map<string, RelativeDelegateLink_4>;
    mintDelegateLink: RelativeDelegateLink_4;
    mintInvariants: Array<RelativeDelegateLink_4>;
    govAuthorityLink: RelativeDelegateLink_4;
    manifest: Map<string, CapoManifestEntry_3>;
    pendingChanges: Array<PendingCharterChange_3>;
};

declare type CapoDatum$CharterDataLike = {
    spendDelegateLink: RelativeDelegateLinkLike;
    spendInvariants: Array<RelativeDelegateLinkLike>;
    otherNamedDelegates: Map<string, RelativeDelegateLinkLike>;
    mintDelegateLink: RelativeDelegateLinkLike;
    mintInvariants: Array<RelativeDelegateLinkLike>;
    govAuthorityLink: RelativeDelegateLinkLike;
    manifest: Map<string, CapoManifestEntryLike>;
    pendingChanges: Array<PendingCharterChangeLike>;
};

declare type CapoDatum$CharterDataLike_2 = {
    spendDelegateLink: RelativeDelegateLinkLike_2;
    spendInvariants: Array<RelativeDelegateLinkLike_2>;
    otherNamedDelegates: Map<string, RelativeDelegateLinkLike_2>;
    mintDelegateLink: RelativeDelegateLinkLike_2;
    mintInvariants: Array<RelativeDelegateLinkLike_2>;
    govAuthorityLink: RelativeDelegateLinkLike_2;
    manifest: Map<string, CapoManifestEntryLike_2>;
    pendingChanges: Array<PendingCharterChangeLike_2>;
};

declare type CapoDatum$CharterDataLike_3 = {
    spendDelegateLink: RelativeDelegateLinkLike_4;
    spendInvariants: Array<RelativeDelegateLinkLike_4>;
    otherNamedDelegates: Map<string, RelativeDelegateLinkLike_4>;
    mintDelegateLink: RelativeDelegateLinkLike_4;
    mintInvariants: Array<RelativeDelegateLinkLike_4>;
    govAuthorityLink: RelativeDelegateLinkLike_4;
    manifest: Map<string, CapoManifestEntryLike_3>;
    pendingChanges: Array<PendingCharterChangeLike_3>;
};

declare type CapoDatum$DelegatedData = {
    data: Map<string, UplcData>;
    version: bigint;
    otherDetails: UplcData;
};

declare type CapoDatum$DelegatedDataLike = {
    data: Map<string, UplcData>;
    version: IntLike;
    otherDetails: UplcData;
};

declare type CapoDatum$Ergo$CharterData = {
    spendDelegateLink: ErgoRelativeDelegateLink;
    spendInvariants: Array<ErgoRelativeDelegateLink>;
    otherNamedDelegates: Map<string, ErgoRelativeDelegateLink>;
    mintDelegateLink: ErgoRelativeDelegateLink;
    mintInvariants: Array<ErgoRelativeDelegateLink>;
    govAuthorityLink: ErgoRelativeDelegateLink;
    manifest: Map<string, ErgoCapoManifestEntry>;
    pendingChanges: Array<ErgoPendingCharterChange>;
};

declare type CapoDatum$Ergo$CharterData_2 = {
    spendDelegateLink: ErgoRelativeDelegateLink_2;
    spendInvariants: Array<ErgoRelativeDelegateLink_2>;
    otherNamedDelegates: Map<string, ErgoRelativeDelegateLink_2>;
    mintDelegateLink: ErgoRelativeDelegateLink_2;
    mintInvariants: Array<ErgoRelativeDelegateLink_2>;
    govAuthorityLink: ErgoRelativeDelegateLink_2;
    manifest: Map<string, ErgoCapoManifestEntry_2>;
    pendingChanges: Array<ErgoPendingCharterChange_2>;
};

declare type CapoDatum$Ergo$CharterData_3 = {
    spendDelegateLink: ErgoRelativeDelegateLink_3;
    spendInvariants: Array<ErgoRelativeDelegateLink_3>;
    otherNamedDelegates: Map<string, ErgoRelativeDelegateLink_3>;
    mintDelegateLink: ErgoRelativeDelegateLink_3;
    mintInvariants: Array<ErgoRelativeDelegateLink_3>;
    govAuthorityLink: ErgoRelativeDelegateLink_3;
    manifest: Map<string, ErgoCapoManifestEntry_3>;
    pendingChanges: Array<ErgoPendingCharterChange_3>;
};

declare type CapoDatum$Ergo$DelegatedData = CapoDatum$DelegatedData;

/**
 * CapoDatum enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the CapoDatum enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoDatumHelper` class
 *     for generating UPLC data for this enum type
 */
declare type CapoDatum = {
    CharterData: CapoDatum$CharterData;
} | {
    ScriptReference: tagOnly;
} | {
    DelegatedData: CapoDatum$DelegatedData;
};

/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***CapoDatum*** enum type.
 * @public
 */
declare class CapoDatumHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoDatum, Partial<{
        CharterData: CapoDatum$CharterDataLike;
        ScriptReference: tagOnly;
        DelegatedData: CapoDatum$DelegatedDataLike;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.CharterData"***
     * @remarks - ***CapoDatum$CharterDataLike*** is the same as the expanded field-types.
     */
    CharterData(fields: CapoDatum$CharterDataLike | {
        spendDelegateLink: RelativeDelegateLinkLike;
        spendInvariants: Array<RelativeDelegateLinkLike>;
        otherNamedDelegates: Map<string, RelativeDelegateLinkLike>;
        mintDelegateLink: RelativeDelegateLinkLike;
        mintInvariants: Array<RelativeDelegateLinkLike>;
        govAuthorityLink: RelativeDelegateLinkLike;
        manifest: Map<string, CapoManifestEntryLike>;
        pendingChanges: Array<PendingCharterChangeLike>;
    }): InlineTxOutputDatum;
    /**
     * (property getter): InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.ScriptReference"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get ScriptReference(): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.DelegatedData"***
     * @remarks - ***CapoDatum$DelegatedDataLike*** is the same as the expanded field-types.
     */
    DelegatedData(fields: CapoDatum$DelegatedDataLike | {
        data: Map<string, UplcData>;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}

/**
 * for any Capo delegate; combines the BasicDelegate with a
 *  concrete specialization
 * @public
 **/
declare abstract class CapoDelegateBundle extends HeliosScriptBundle {
    abstract get specializedDelegateModule(): Source;
    capoBundle: CapoHeliosBundle;
    isConcrete: boolean;
    /**
     * Creates a CapoDelegateBundle subclass based on a specific CapoHeliosBundle class
     */
    static usingCapoBundleClass<THIS extends typeof CapoDelegateBundle, CB extends CapoBundleClass>(this: THIS, c: CB): ConcreteCapoDelegateBundle;
    constructor(isUsingExtension: typeof USING_EXTENSION);
    get main(): Source;
    get moduleName(): string;
    /**
     * A list of modules always available for import in the delegate policy script
     */
    private implicitIncludedModules;
    /**
     * specifies a list module names to be included in the build for this delegate
     * @remarks
     * Each of these modules MUST be
     * provided by the CapoHeliosBundle (`get modules()`) used to create this delegate.
     * By default, CapoMintHelpers, CapoDelegateHelpers, StellarHeliosHelpers and CapoHelpers
     * are available for import to the delegate policy script.
     *
     * For Capos with augmented module-lists, this method is used to make any of those additional
     * modules available to the delegate policy bundle.
     *
     */
    includeFromCapoModules(): string[];
    get modules(): Source[];
    mkDelegateWrapper(moduleName: any): Source;
}

/**
 * Allows any targeted delegate class to access & use certain details originating in the leader contract
 * @remarks
 *
 * This setting is implicitly defined on all Delegate configurations.
 *
 * These allow any Capo delegate class to reference details from its essential
 * delegation context
 *
 * @public
 **/
declare type capoDelegateConfig = configBaseWithRev & {
    capoAddr: Address;
    capo: Capo<any>;
    mph: MintingPolicyHash;
    delegateName: string;
    tn: number[];
    rev: bigint;
    addrHint: Address[];
};

/**
 * A set of Helios scripts that are used to define a Capo contract.
 * @remarks
 * This class is intended to be extended to provide a specific Capo contract.
 *
 * You can inherit & augment `get modules()` to make additional modules available
 * for use in related contract scripts.  Other bundles can include these modules only
 * by naming them in their own `includes` property.
 * @public
 */
declare class CapoHeliosBundle extends HeliosScriptBundle {
    get main(): Source;
    datumTypeName: string;
    capoBundle: this;
    scripts?: any;
    get bridgeClassName(): string;
    static isCapoBundle: boolean;
    get modules(): Source[];
}

declare type CapoLifecycleActivity$CreatingDelegate = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$CreatingDelegate_2 = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$CreatingDelegate_3 = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$CreatingDelegateLike = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$CreatingDelegateLike_2 = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$CreatingDelegateLike_3 = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$Ergo$CreatingDelegate = CapoLifecycleActivity$CreatingDelegate;

declare type CapoLifecycleActivity$Ergo$CreatingDelegate_2 = CapoLifecycleActivity$CreatingDelegate_2;

declare type CapoLifecycleActivity$Ergo$CreatingDelegate_3 = CapoLifecycleActivity$CreatingDelegate_3;

declare type CapoLifecycleActivity$Ergo$forcingNewMintDelegate = CapoLifecycleActivity$forcingNewMintDelegate;

declare type CapoLifecycleActivity$Ergo$forcingNewMintDelegate_2 = CapoLifecycleActivity$forcingNewMintDelegate_2;

declare type CapoLifecycleActivity$Ergo$forcingNewMintDelegate_3 = CapoLifecycleActivity$forcingNewMintDelegate_3;

declare type CapoLifecycleActivity$Ergo$forcingNewSpendDelegate = CapoLifecycleActivity$forcingNewSpendDelegate;

declare type CapoLifecycleActivity$Ergo$forcingNewSpendDelegate_2 = CapoLifecycleActivity$forcingNewSpendDelegate_2;

declare type CapoLifecycleActivity$Ergo$forcingNewSpendDelegate_3 = CapoLifecycleActivity$forcingNewSpendDelegate_3;

declare type CapoLifecycleActivity$forcingNewMintDelegate = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewMintDelegate_2 = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewMintDelegate_3 = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewMintDelegateLike = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewMintDelegateLike_2 = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewMintDelegateLike_3 = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewSpendDelegate = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewSpendDelegate_2 = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewSpendDelegate_3 = {
    seed: TxOutputId;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewSpendDelegateLike = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewSpendDelegateLike_2 = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type CapoLifecycleActivity$forcingNewSpendDelegateLike_3 = {
    seed: TxOutputId | string;
    purpose: string;
};

/**
 * CapoLifecycleActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **7 variant(s)** of the CapoLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type CapoLifecycleActivity = {
    CreatingDelegate: CapoLifecycleActivity$CreatingDelegate;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: DelegateRole;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegate;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegate;
} | {
    updatingManifest: ManifestActivity;
};

/**
 * CapoLifecycleActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **7 variant(s)** of the CapoLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type CapoLifecycleActivity_2 = {
    CreatingDelegate: CapoLifecycleActivity$CreatingDelegate_2;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: DelegateRole_2;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegate_2;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegate_2;
} | {
    updatingManifest: ManifestActivity_2;
};

/**
 * CapoLifecycleActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **7 variant(s)** of the CapoLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type CapoLifecycleActivity_3 = {
    CreatingDelegate: CapoLifecycleActivity$CreatingDelegate_3;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: DelegateRole_3;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegate_3;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegate_3;
} | {
    updatingManifest: ManifestActivity_3;
};

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 */
declare class CapoLifecycleActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
        updatingManifest: ManifestActivityLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): DelegateRoleHelperNested;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 */
declare class CapoLifecycleActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_2, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_2;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_2;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_2;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_2;
        updatingManifest: ManifestActivityLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): DelegateRoleHelperNested_2;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested_2;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 */
declare class CapoLifecycleActivityHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_3, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_3;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_3;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_3;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_3;
        updatingManifest: ManifestActivityLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): DelegateRoleHelperNested_3;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested_3;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 */
declare class CapoLifecycleActivityHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
        updatingManifest: ManifestActivityLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 */
declare class CapoLifecycleActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_2, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_2;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_2;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_2;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_2;
        updatingManifest: ManifestActivityLike_2;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested_2;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested_2;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 */
declare class CapoLifecycleActivityHelperNested_3 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_3, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_3;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_3;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_3;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_3;
        updatingManifest: ManifestActivityLike_3;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested_3;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested_3;
}

/**
 * CapoLifecycleActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **7 variant(s)** of the CapoLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type CapoLifecycleActivityLike = IntersectedEnum<{
    CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: DelegateRoleLike;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
} | {
    updatingManifest: ManifestActivityLike;
}>;

/**
 * CapoLifecycleActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **7 variant(s)** of the CapoLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type CapoLifecycleActivityLike_2 = IntersectedEnum<{
    CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_2;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: DelegateRoleLike_2;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_2;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_2;
} | {
    updatingManifest: ManifestActivityLike_2;
}>;

/**
 * CapoLifecycleActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **7 variant(s)** of the CapoLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `CapoLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type CapoLifecycleActivityLike_3 = IntersectedEnum<{
    CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_3;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: DelegateRoleLike_3;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_3;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_3;
} | {
    updatingManifest: ManifestActivityLike_3;
}>;

declare type CapoManifestEntry = {
    entryType: ManifestEntryType;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | undefined;
};

declare type CapoManifestEntry_2 = {
    entryType: ManifestEntryType_2;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | undefined;
};

declare type CapoManifestEntry_3 = {
    entryType: ManifestEntryType_3;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | undefined;
};

declare type CapoManifestEntryLike = {
    entryType: ManifestEntryTypeLike;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
};

declare type CapoManifestEntryLike_2 = {
    entryType: ManifestEntryTypeLike_2;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
};

declare type CapoManifestEntryLike_3 = {
    entryType: ManifestEntryTypeLike_3;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
};

/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 *
 * NOTE that this class provides the actual MINTING script, which is
 * DIFFERENT from the minting delegate.  The minting delegate is a separate
 * contract that can be updated within the scope of a Capo, with this minting
 * script remaining unchanged.
 *
 * Because this minter always defers to the minting delegate, that delegate
 * always expresses the true policy for minting application-layer tokens.
 * This minter contains only the most basic minting constraints - mostly, those
 * needed for supporting Capo lifeycle activities in which the minting delegate
 * isn't yet available, or is being replaced.
 *
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and
 * other tokens as approved by the Capo's minting delegate.
 * @public
 **/
declare class CapoMinter extends StellarContract<BasicMinterParams> implements MinterBaseMethods {
    currentRev: bigint;
    scriptBundle(): CapoMinterBundle;
    /**
     * the data bridge for this minter is fixed to one particular type
     */
    dataBridgeClass: typeof CapoMinterDataBridge;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get activity(): mustFindActivityType<CapoMinter>;
    getContractScriptParamsUplc(config: BasicMinterParams): UplcRecord<configBaseWithRev & SeedTxnScriptParams>;
    get scriptActivitiesName(): string;
    /**
     * Mints initial charter token for a Capo contract
     * @remarks
     *
     * This is the fundamental bootstrapping event for a Capo.
     * @param ownerInfo - contains the `{owner}` address of the Capo contract
     * @public
     **/
    activityMintingCharter(ownerInfo: MintCharterActivityArgs): isActivity;
    /**
     * Mints any tokens on sole authority of the Capo contract's minting delegage
     * @remarks
     *
     * The Capo's minting delegate takes on the responsibility of validating a mint.
     * It can validate mintingUuts, burningUuts and any application-specific use-cases
     * for minting and/or burning tokens from the policy.
     * @public
     **/
    activityMintWithDelegateAuthorizing(): isActivity;
    /**
     * Mints a new UUT specifically for a minting invariant
     * @remarks
     *
     * When adding a minting invariant, the Capo's existing mint delegate
     * doesn't get to be involved, as it could otherwise block a critical administrative
     * change needed.  The Capo's authority token is all the minter requires
     * to create the needed UUT.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @public
     **/
    activityAddingMintInvariant(seedFrom: hasSeed): isActivity;
    /** Mints a new UUT specifically for a spending invariant
     * @remarks When adding a spending invariant, the Capo's existing mint delegate
     * is not consulted, as this administrative function works on a higher
     * level than the usual minting delegate's authority.
     *
     * @public
     * **/
    activityAddingSpendInvariant(seedFrom: hasSeed): isActivity;
    /**
     * Forces replacement of the Capo's mint delegate
     * @remarks
     *
     * Forces the minting of a new UUT to replace the Capo's mint delegate.
     *
     * @public
     **/
    activityForcingNewMintDelegate(seedFrom: hasSeed): {
        redeemer: UplcData;
    };
    /**
     * Forces replacement of the Capo's spend delegate
     * @remarks
     *
     * Creates a new UUT to replace the Capo's spend delegate.  The mint delegate
     * is bypassed in this operation.  There is always some existing spend delegate
     * when this is called, and it's normally burned in the process, when replacingUut is
     * provided.  If replacingUut is not provided, the existing spend delegate is left in place,
     * although it won't be useful because the new spend delegate will have been installed.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @param replacingUut - the name of an exiting delegate being replaced
     * @public
     **/
    activityForcingNewSpendDelegate(seedFrom: hasSeed, replacingUut?: number[]): isActivity;
    get mintingPolicyHash(): MintingPolicyHash;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharter<TCX extends StellarTxnContext<anyState>>(this: CapoMinter, tcx: TCX, { owner, capoGov, mintDelegate, spendDelegate, }: {
        owner: Address;
        capoGov: UutName;
        mintDelegate: UutName;
        spendDelegate: UutName;
    }): Promise<TCX>;
    attachScript<TCX extends StellarTxnContext<anyState>>(tcx: TCX, useRefScript?: boolean): Promise<TCX>;
    txnMintingWithoutDelegate<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], minterActivity: isActivity): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], mintDelegate: BasicMintDelegate, mintDgtRedeemer: isActivity, skipReturningDelegate?: "skipDelegateReturn"): Promise<TCX>;
}

/**
 * for the special Capo minter; makes the Capo's modules available
 *  to the minter for imports
 **/
declare class CapoMinterBundle extends CapoMinterBundle_base {
    capoBundle: CapoHeliosBundle;
    get main(): Source;
    get modules(): Source[];
}

declare const CapoMinterBundle_base: HeliosBundleClassWithCapo_2;

/**
 * GENERATED data bridge for **CapoMinter** script (defined in class ***CapoMinterBundle***)
 * main: **src/minting/CapoMinter.hl**, project: **stellar-contracts**
 * @remarks - note that you may override `get dataBridgeName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class CapoMinterDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    datum: undefined;
    /**
     * generates UplcData for the activity type (***MinterActivity***) for the `CapoMinter` script
     */
    activity: MinterActivityHelper;
    MinterActivity: MinterActivityHelper;
    reader: CapoMinterDataBridgeReader;
    /**
     * accessors for all the types defined in the `CapoMinter` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***MinterActivity*** for the `CapoMinter` script
         */
        MinterActivity: MinterActivityHelper;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `CapoMinter` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike_3 | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_3, RelativeDelegateLinkLike_3>;
}

declare class CapoMinterDataBridgeReader extends DataBridgeReaderClass {
    bridge: CapoMinterDataBridge;
    constructor(bridge: CapoMinterDataBridge);
    /**
     * reads UplcData *known to fit the **MinterActivity*** enum type,
     * for the CapoMinter script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    MinterActivity(d: UplcData): ErgoMinterActivity;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the CapoMinter script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_3;
}

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 *
 * You should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export declare abstract class CapoTestHelper<SC extends Capo<any>> extends StellarTestHelper<SC> {
    get capo(): SC;
    initialize({ randomSeed, }?: {
        randomSeed?: number;
    }, args?: Partial<MinimalCharterDataArgs>): Promise<SC>;
    checkDelegateScripts(args?: Partial<MinimalCharterDataArgs>): Promise<void>;
    get ready(): boolean;
    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx<T extends anyState = anyState>(txnName?: string): StellarTxnContext<T>;
    loadSnapshot(snapName: string): void;
    reusableBootstrap(snap?: string): Promise<any>;
    static hasNamedSnapshot(snapshotName: string, actorName: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
    hasSnapshot(snapshotName: string): boolean;
    snapshot(snapshotName: string): void;
    findOrCreateSnapshot(snapshotName: string, actorName: string, contentBuilder: () => Promise<StellarTxnContext<any>>): Promise<SC>;
    restoreFrom(snapshotName: string): Promise<SC>;
    bootstrap(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<SC>;
    abstract bootstrapSettings(): Promise<any>;
    extraBootstrapping(args?: Partial<MinimalCharterDataArgs>): Promise<SC>;
    abstract mkDefaultCharterArgs(): Partial<MinimalCharterDataArgs>;
    abstract mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> & hasBootstrappedCapoConfig & hasAddlTxns<any>>;
}

/**
 * @internal
 */
declare class CapoWithoutSettings extends Capo<CapoWithoutSettings> {
    initDelegateRoles(): {
        reqts: DelegateSetup_2<"dgDataPolicy", any, {}>;
        mintDelegate: DelegateSetup_2<"mintDgt", BasicMintDelegate_2, any>;
        spendDelegate: DelegateSetup_2<"spendDgt", ContractBasedDelegate_2, any>;
        govAuthority: DelegateSetup_2<"authority", StellarDelegate_2, any>;
    };
    reqtsController(): Promise<ReqtsController>;
}

declare type cctx_CharterInputType$Ergo$Input = {
    datum: CapoDatum$Ergo$CharterData_2;
    utxo: TxInput;
};

declare type cctx_CharterInputType$Ergo$Input_2 = {
    datum: CapoDatum$Ergo$CharterData_3;
    utxo: TxInput;
};

declare type cctx_CharterInputType$Ergo$RefInput = {
    datum: CapoDatum$Ergo$CharterData_2;
    utxo: TxInput;
};

declare type cctx_CharterInputType$Ergo$RefInput_2 = {
    datum: CapoDatum$Ergo$CharterData_3;
    utxo: TxInput;
};

declare type cctx_CharterInputType$Input = {
    datum: CapoDatum$CharterData_2;
    utxo: TxInput;
};

declare type cctx_CharterInputType$Input_2 = {
    datum: CapoDatum$CharterData_3;
    utxo: TxInput;
};

declare type cctx_CharterInputType$InputLike = {
    datum: CapoDatum$CharterDataLike_2;
    utxo: TxInput;
};

declare type cctx_CharterInputType$InputLike_2 = {
    datum: CapoDatum$CharterDataLike_3;
    utxo: TxInput;
};

declare type cctx_CharterInputType$RefInput = {
    datum: CapoDatum$CharterData_2;
    utxo: TxInput;
};

declare type cctx_CharterInputType$RefInput_2 = {
    datum: CapoDatum$CharterData_3;
    utxo: TxInput;
};

declare type cctx_CharterInputType$RefInputLike = {
    datum: CapoDatum$CharterDataLike_2;
    utxo: TxInput;
};

declare type cctx_CharterInputType$RefInputLike_2 = {
    datum: CapoDatum$CharterDataLike_3;
    utxo: TxInput;
};

/**
 * cctx_CharterInputType enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the cctx_CharterInputType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `cctx_CharterInputTypeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type cctx_CharterInputType = {
    Unk: tagOnly;
} | {
    RefInput: cctx_CharterInputType$RefInput;
} | {
    Input: cctx_CharterInputType$Input;
};

/**
 * cctx_CharterInputType enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the cctx_CharterInputType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `cctx_CharterInputTypeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type cctx_CharterInputType_2 = {
    Unk: tagOnly;
} | {
    RefInput: cctx_CharterInputType$RefInput_2;
} | {
    Input: cctx_CharterInputType$Input_2;
};

/**
 * Helper class for generating UplcData for variants of the ***cctx_CharterInputType*** enum type.
 * @public
 */
declare class cctx_CharterInputTypeHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<cctx_CharterInputType, Partial<{
        Unk: tagOnly;
        RefInput: cctx_CharterInputType$RefInputLike;
        Input: cctx_CharterInputType$InputLike;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::cctx_CharterInputType.Unk"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get Unk(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.RefInput"***
     * @remarks - ***cctx_CharterInputType$RefInputLike*** is the same as the expanded field-types.
     */
    RefInput(fields: cctx_CharterInputType$RefInputLike | {
        datum: CapoDatum$CharterDataLike_2;
        utxo: TxInput;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.Input"***
     * @remarks - ***cctx_CharterInputType$InputLike*** is the same as the expanded field-types.
     */
    Input(fields: cctx_CharterInputType$InputLike | {
        datum: CapoDatum$CharterDataLike_2;
        utxo: TxInput;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***cctx_CharterInputType*** enum type.
 * @public
 */
declare class cctx_CharterInputTypeHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<cctx_CharterInputType_2, Partial<{
        Unk: tagOnly;
        RefInput: cctx_CharterInputType$RefInputLike_2;
        Input: cctx_CharterInputType$InputLike_2;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::cctx_CharterInputType.Unk"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get Unk(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.RefInput"***
     * @remarks - ***cctx_CharterInputType$RefInputLike*** is the same as the expanded field-types.
     */
    RefInput(fields: cctx_CharterInputType$RefInputLike_2 | {
        datum: CapoDatum$CharterDataLike_3;
        utxo: TxInput;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.Input"***
     * @remarks - ***cctx_CharterInputType$InputLike*** is the same as the expanded field-types.
     */
    Input(fields: cctx_CharterInputType$InputLike_2 | {
        datum: CapoDatum$CharterDataLike_3;
        utxo: TxInput;
    }): UplcData;
}

/**
 * cctx_CharterInputType enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the cctx_CharterInputType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `cctx_CharterInputTypeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type cctx_CharterInputTypeLike = IntersectedEnum<{
    Unk: tagOnly;
} | {
    RefInput: cctx_CharterInputType$RefInputLike;
} | {
    Input: cctx_CharterInputType$InputLike;
}>;

/**
 * cctx_CharterInputType enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the cctx_CharterInputType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `cctx_CharterInputTypeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type cctx_CharterInputTypeLike_2 = IntersectedEnum<{
    Unk: tagOnly;
} | {
    RefInput: cctx_CharterInputType$RefInputLike_2;
} | {
    Input: cctx_CharterInputType$InputLike_2;
}>;

/**
 * @public
 */
declare type CharterData = CapoDatum$Ergo$CharterData;

/**
 * @public
 */
declare type CharterDataLike = CapoDatum$CharterDataLike;

declare type ComputedScriptProperties = Partial<{
    vh: ValidatorHash;
    addr: Address;
    mph: MintingPolicyHash;
    program: Program;
    identity: string;
}>;

declare type ConcreteCapoDelegateBundle = typeof CapoDelegateBundle & Constructor<CapoDelegateBundle> & EmptyConstructor<CapoDelegateBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};

/**
 * Configuration details for StellarContract classes
 * @public
 **/
declare interface configBaseWithRev {
    rev: bigint;
}

/**
 * @public
 * Extracts the config type for a Stellar Contract class
 **/
declare type ConfigFor<SC extends StellarContract<any>> = configBaseWithRev & SC extends StellarContract<infer inferredConfig> ? inferredConfig : never;

/**
 * A complete, validated and resolved configuration for a specific delegate
 * @public
 * @remarks
 *
 * Use StellarContract's `txnCreateDelegateSettings()` method to resolve
 * from any (minimal or better) delegate details to a ResolvedDelegate object.
 * @typeParam DT - a StellarContract class conforming to the `roleName`,
 *     within the scope of a Capo class's `roles()`.
 **/
declare type ConfiguredDelegate<DT extends StellarDelegate> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    fullCapoDgtConfig: Partial<CapoConfig> & capoDelegateConfig;
} & OffchainPartialDelegateLink;

declare type Constructor<T> = new (...args: any[]) => T;

/**
 * Base class for delegates controlled by a smart contract, as opposed
 * to a simple delegate backed by an issued token, whose presence
 * grants delegated authority.
 * @public
 */
declare class ContractBasedDelegate extends StellarDelegate {
    /**
     * Each contract-based delegate must define its own dataBridgeClass, but they all
     * use the same essential template for the outer layer of their activity & datum interface.
     */
    dataBridgeClass: GenericDelegateBridgeClass;
    _dataBridge: GenericDelegateBridge;
    static currentRev: bigint;
    /**
     * Configures the matching parameter name in the on-chain script, indicating
     * that this delegate serves the Capo by enforcing policy for spending the Capo's utxos.
     * @remarks
     * Not used for any mint delegate.  Howeever, a mint delegate class can instead provide a true isMintAndSpendDelegate,
     *...  if a single script controls both the mintDgt-* and spendDgt-* tokens/delegation roles for your Capo.
     *
     * DO NOT enable this attribute for second-level delegates, such as named delegates or delegated-data controllers.
     * The base on-chain delegate script recognizes this conditional role and enforces that its generic delegated-data activities
     * are used only in the context the Capo's main spend delegate, re-delegating to the data-controller which
     * can't use those generic activities, but instead implements its user-facing txns as variants of its SpendingActivities enum.
     */
    get isSpendDelegate(): boolean;
    get delegateName(): string;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get offchain(): mustFindConcreteContractBridgeType<this>["reader"];
    get reader(): mustFindConcreteContractBridgeType<this>["reader"];
    get activity(): mustFindActivityType<this>;
    get mkDatum(): mustFindDatumType<this>;
    get newReadDatum(): mustFindReadDatumType<this>;
    get capo(): Capo<any>;
    scriptBundle(): CapoDelegateBundle;
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    static get defaultParams(): {
        rev: bigint;
        isSpendDelegate: boolean;
    };
    static mkDelegateWithArgs(a: capoDelegateConfig): void;
    getContractScriptParamsUplc(config: capoDelegateConfig): UplcRecord_2<capoDelegateConfig>;
    tcxWithCharterRef<TCX extends StellarTxnContext | hasCharterRef>(tcx: TCX): Promise<TCX & hasCharterRef>;
    /**
     * Adds a mint-delegate-specific authority token to the txn output
     * @remarks
     *
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
     *
     * Uses {@link ContractBasedDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
     * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
     * @public
     **/
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkDelegationDatum(txin?: TxInput): TxOutputDatum;
    /**
     * redeemer for replacing the authority UUT with a new one
     * @remarks
     *
     * When replacing the delegate, the current UUT will be burned,
     * and a new one will be minted.  It can be deposited to any next delegate address.
     *
     * @param seedTxnDetails - seed details for the new UUT
     * @public
     **/
    activityReplacingMe({ seed, purpose, }: Omit<MintUutActivityArgs, "purposes"> & {
        purpose: string;
    }): void;
    mkDelegateLifecycleActivity(delegateActivityName: "ReplacingMe" | "Retiring" | "ValidatingSettings", args?: Record<string, any>): isActivity;
    mkCapoLifecycleActivity(capoLifecycleActivityName: "CreatingDelegate" | "ActivatingDelegate", { seed, purpose, ...otherArgs }: Omit<MintUutActivityArgs, "purposes"> & {
        purpose?: string;
    }): isActivity;
    /**
     * Creates a reedemer for the indicated spending activity name
     **/
    mkSpendingActivity(spendingActivityName: string, args: {
        id: string | number[];
    } & Record<string, any>): isActivity;
    mkSeedlessMintingActivity(mintingActivityName: string, args: Record<string, any>): isActivity;
    mkSeededMintingActivity(mintingActivityName: string, args: {
        seed: TxOutputId;
    } & Record<string, any>): isActivity;
    /**
     * redeemer for spending the authority UUT for burning it.
     * @public
     * @remarks
     *
     * The Retiring redeemer indicates that the delegate is being
     * removed.
     *
     **/
    activityRetiring(): void;
    activityValidatingSettings(): void;
    activityMultipleDelegateActivities(...activities: isActivity[]): isActivity;
    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * a deletion (burning its UUT) of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer,
     */
    activityDeletingDelegatedData(recId: string | number[]): isActivity;
    /**
     * creates the essential datum for a delegate UTxO
     * @remarks
     *
     * Every delegate is expected to have a two-field 'IsDelegation' variant
     * in the first position of its on-chain Datum type.  This helper method
     * constructs a suitable UplcData structure, given appropriate inputs.
     * @param dd - Delegation details
     * @public
     **/
    mkDatumIsDelegation(dd: DelegationDetail_2): InlineTxOutputDatum;
    /**
     * returns the ValidatorHash of the delegate script, if relevant
     * @public
     * @remarks
     *
     * A delegate that doesn't use an on-chain validator should override this method and return undefined.
     **/
    get delegateValidatorHash(): ValidatorHash | undefined;
    /**
     * {@inheritdoc StellarDelegate.DelegateMustFindAuthorityToken}
     **/
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     *
     * The off-chain code shouldn't need to check the details; it can simply
     * arrange the details properly and spend the delegate's authority token,
     * using this method.
     *
     * ### Reliance on this delegate
     *
     * Other contract scripts can rely on the delegate script to have validated its
     * on-chain policy and enforced its own "return to the delegate script" logic.
     *
     * ### Enforcing on-chain policy
     *
     * When spending the authority token in this way, the delegate's authority is typically
     * narrowly scoped, and it's expected that the delegate's on-chain script validates that
     * those parts of the transaction detail should be authorized, in accordance with the
     * delegate's core purpose/responsbility - i.e. that the txn does all of what the delegate
     * expects, and none of what it shouldn't do in that department.
     *
     * The on-chain code SHOULD typically enforce:
     *  * that the token is spent with an application-specific redeemer variant of its
     *     MintingActivity or SpendingActivitie.
     *
     *  * that the authority token is returned to the contract with its datum unchanged
     *  * that any other tokens it may also hold in the same UTxO do not become
     *     inaccessible as a result of the transactions - perhaps by requiring them to be
     *     returned together with the authority token.
     *
     * It MAY enforce additional requirements as well.
     *
     * @example
     * A minting delegate should check that all the expected tokens are
     * minted, AND that no other tokens are minted.
     *
     * @example
     * A role-based authentication/signature-checking delegate can
     * require an appropriate signature on the txn.
     *
     * @param tcx - the transaction context
     * @param utxo - the utxo having the authority UUT for this delegate
     * @reqt Adds the uutxo to the transaction inputs with appropriate redeemer.
     * @reqt Does not output the value; can EXPECT txnReceiveAuthorityToken to be called for that purpose.
     **/
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput, redeemer: isActivity): Promise<TCX>;
    /**
     * {@inheritdoc StellarDelegate.DelegateAddsAuthorityToken}
     **/
    DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(this: ContractBasedDelegate, tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<TCX>;
}

/**
 * @public
 */
declare class ContractDataBridge {
    static isAbstract: (true | false);
    isAbstract: (true | false);
    types: Record<string, DataBridge | ((x: any) => UplcData)>;
    reader: DataBridgeReaderClass | undefined;
    datum: DataBridge | undefined;
    activity: DataBridge;
    readDatum: readsUplcData<any> | undefined;
    constructor();
    readData(x: any): any;
}

/**
 * @public
 */
declare class ContractDataBridgeWithEnumDatum extends ContractDataBridge {
    static isAbstract: (true | false);
    isAbstract: (true | false);
    datum: EnumBridge;
    readDatum: readsUplcData<unknown>;
    constructor();
}

declare type CoreDgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    data: minimalData<TLike>;
    addedUtxoValue?: Value;
};

declare type CoreDgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    updatedFields: minimalData<TLike>;
    addedUtxoValue?: Value;
};

/**
 * @internal
 */
declare class DataBridge extends DataBridge_base {
    protected ᱺᱺschema: TypeSchema;
    protected isActivity: boolean;
    protected isNested: boolean;
    ᱺᱺcast: Cast<any, any>;
    isCallable: boolean;
    mkData: this["ᱺᱺcast"]["toUplcData"];
    readData: this["ᱺᱺcast"]["fromUplcData"];
    constructor(options?: DataBridgeOptions);
    getSeed(arg: hasSeed | TxOutputId): TxOutputId;
    protected redirectTo?: (value: any) => void;
    protected mkDataVia(redirectionCallback: (value: any) => void): void;
    protected get isEnum(): boolean;
    protected getTypeSchema(): TypeSchema;
}

declare const DataBridge_base: ObjectConstructor;

/**
 * @internal
 */
declare type DataBridgeOptions = {
    isActivity?: boolean;
    isNested?: boolean;
};

/**
 * @public
 */
declare class DataBridgeReaderClass {
    datum: readsUplcTo<unknown> | undefined;
}

/**
 * Test helper for classes extending Capo
 * @remarks
 *
 * Arranges an test environment with predefined actor-names having various amounts of ADA in their (emulated) wallets,
 * and default helpers for setting up test scenarios.  Provides a simplified framework for testing Stellar contracts extending
 * the Capo class.
 *
 * To use it, you MUST extend DefaultCapoTestHelper<YourStellarCapoClass>.
 *
 * You MUST also implement a getter  for stellarClass, returning the specific class for YourStellarCapoClass
 *
 * You SHOULD also implement a setupActors method to arrange named actors for your test scenarios.
 * It's recommended to identify general roles of different people who will interact with the contract, and create
 * one or more actor names for each role, where the actor names start with the same letter as the role-names.
 * For example, a set of Trustees in a contract might have actor names tina, tracy and tom, while
 * unprivileged Public users might have actor names like pablo and peter.  setupActors() also
 * should pre-assign some ADA funds to each actor: e.g. `this.addActor(‹actorName›, 142n * ADA)`
 *
 * @typeParam DC - the specific Capo subclass under test
 * @public
 **/
export declare class DefaultCapoTestHelper<CAPO extends Capo<any> = CapoWithoutSettings> extends CapoTestHelper<CAPO> {
    /**
     * Creates a prepared test helper for a given Capo class, with boilerplate built-in
     *
     * @remarks
     *
     * You may wish to provide an overridden setupActors() method, to arrange actor
     * names that fit your project's user-roles / profiles.
     *
     * You may also wish to add methods that satisfy some of your application's key
     * use-cases in simple predefined ways, so that your automated tests can re-use
     * the logic and syntax instead of repeating them in multiple test-cases.
     *
     * @param s - your Capo subclass
     * @typeParam CAPO - no need to specify it; it's inferred from your parameter
     * @public
     **/
    static forCapoClass<CAPO extends Capo<any>>(s: stellarSubclass<CAPO>): DefaultCapoTestHelperClass<CAPO>;
    get stellarClass(): stellarSubclass<CAPO>;
    setupActors(): Promise<void>;
    setDefaultActor(): Promise<void>;
    mkCharterSpendTx(): Promise<StellarTxnContext>;
    checkDelegateScripts(args?: Partial<MinimalCharterDataArgs>): Promise<void>;
    mkDefaultCharterArgs(): MinimalCharterDataArgs;
    mintCharterToken(args?: Partial<MinimalCharterDataArgs>, submitOptions?: SubmitOptions): Promise<hasBootstrappedCapoConfig_2 & hasAddlTxns_2<hasBootstrappedCapoConfig_2> & hasUutContext_2<"mintDelegate" | "mintDgt" | "capoGov" | "govAuthority" | "setting"> & hasUutContext_2<"mintDelegate" | "spendDgt" | "mintDgt" | "capoGov" | "spendDelegate" | "govAuthority"> & hasSeedUtxo_2>;
    updateCharter(args: CharterDataLike, submitSettings?: SubmitOptions): Promise<StellarTxnContext>;
    bootstrapSettings(): Promise<any[] | undefined>;
}

/**
 * @public
 */
export declare type DefaultCapoTestHelperClass<SC extends Capo<any>> = new (config: ConfigFor<SC> & canHaveRandomSeed) => StellarTestHelper<SC> & DefaultCapoTestHelper<SC>;

declare type DelegateActivity$CreatingDelegatedData = {
    seed: TxOutputId;
    dataType: string;
};

declare type DelegateActivity$CreatingDelegatedData_2 = {
    seed: TxOutputId;
    dataType: string;
};

declare type DelegateActivity$CreatingDelegatedDataLike = {
    seed: TxOutputId | string;
    dataType: string;
};

declare type DelegateActivity$CreatingDelegatedDataLike_2 = {
    seed: TxOutputId | string;
    dataType: string;
};

declare type DelegateActivity$DeletingDelegatedData = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$DeletingDelegatedData_2 = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$DeletingDelegatedDataLike = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$DeletingDelegatedDataLike_2 = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$Ergo$CreatingDelegatedData = DelegateActivity$CreatingDelegatedData;

declare type DelegateActivity$Ergo$CreatingDelegatedData_2 = DelegateActivity$CreatingDelegatedData_2;

declare type DelegateActivity$Ergo$DeletingDelegatedData = DelegateActivity$DeletingDelegatedData;

declare type DelegateActivity$Ergo$DeletingDelegatedData_2 = DelegateActivity$DeletingDelegatedData_2;

declare type DelegateActivity$Ergo$UpdatingDelegatedData = DelegateActivity$UpdatingDelegatedData;

declare type DelegateActivity$Ergo$UpdatingDelegatedData_2 = DelegateActivity$UpdatingDelegatedData_2;

declare type DelegateActivity$UpdatingDelegatedData = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$UpdatingDelegatedData_2 = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$UpdatingDelegatedDataLike = {
    dataType: string;
    recId: number[];
};

declare type DelegateActivity$UpdatingDelegatedDataLike_2 = {
    dataType: string;
    recId: number[];
};

/**
 * DelegateActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **9 variant(s)** of the DelegateActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateActivity = {
    CapoLifecycleActivities: CapoLifecycleActivity_2;
} | {
    DelegateLifecycleActivities: DelegateLifecycleActivity;
} | {
    SpendingActivities: SpendingActivity;
} | {
    MintingActivities: MintingActivity;
} | {
    BurningActivities: BurningActivity;
} | {
    CreatingDelegatedData: DelegateActivity$CreatingDelegatedData;
} | {
    UpdatingDelegatedData: DelegateActivity$UpdatingDelegatedData;
} | {
    DeletingDelegatedData: DelegateActivity$DeletingDelegatedData;
} | {
    MultipleDelegateActivities: Array<UplcData>;
};

/**
 * DelegateActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **9 variant(s)** of the DelegateActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateActivity_2 = {
    CapoLifecycleActivities: CapoLifecycleActivity_3;
} | {
    DelegateLifecycleActivities: DelegateLifecycleActivity_2;
} | {
    SpendingActivities: SpendingActivity_2;
} | {
    MintingActivities: MintingActivity_2;
} | {
    BurningActivities: BurningActivity_2;
} | {
    CreatingDelegatedData: DelegateActivity$CreatingDelegatedData_2;
} | {
    UpdatingDelegatedData: DelegateActivity$UpdatingDelegatedData_2;
} | {
    DeletingDelegatedData: DelegateActivity$DeletingDelegatedData_2;
} | {
    MultipleDelegateActivities: Array<UplcData>;
};

/**
 * Helper class for generating UplcData for variants of the ***DelegateActivity*** enum type.
 * @public
 */
declare class DelegateActivityHelper extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateActivity, Partial<{
        CapoLifecycleActivities: CapoLifecycleActivityLike_2;
        DelegateLifecycleActivities: DelegateLifecycleActivityLike;
        SpendingActivities: SpendingActivityLike;
        MintingActivities: MintingActivityLike;
        BurningActivities: BurningActivityLike;
        CreatingDelegatedData: DelegateActivity$CreatingDelegatedDataLike;
        UpdatingDelegatedData: DelegateActivity$UpdatingDelegatedDataLike;
        DeletingDelegatedData: DelegateActivity$DeletingDelegatedDataLike;
        MultipleDelegateActivities: Array<UplcData>;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***DelegateActivity:CapoLifecycleActivities***.
     */
    get CapoLifecycleActivities(): CapoLifecycleActivityHelperNested_2;
    /**
     * access to different variants of the ***nested DelegateLifecycleActivity*** type needed for ***DelegateActivity:DelegateLifecycleActivities***.
     */
    get DelegateLifecycleActivities(): DelegateLifecycleActivityHelperNested;
    /**
     * access to different variants of the ***nested SpendingActivity*** type needed for ***DelegateActivity:SpendingActivities***.
     */
    get SpendingActivities(): SpendingActivityHelperNested;
    /**
     * access to different variants of the ***nested MintingActivity*** type needed for ***DelegateActivity:MintingActivities***.
     */
    get MintingActivities(): MintingActivityHelperNested;
    /**
     * access to different variants of the ***nested BurningActivity*** type needed for ***DelegateActivity:BurningActivities***.
     */
    get BurningActivities(): BurningActivityHelperNested;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.CreatingDelegatedData"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegatedData}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegatedData(value: hasSeed, fields: {
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.CreatingDelegatedData"***
     * with raw seed details included in fields.
     */
    CreatingDelegatedData(fields: DelegateActivity$CreatingDelegatedDataLike | {
        seed: TxOutputId | string;
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.CreatingDelegatedData"***,
     * @param fields - \{ dataType: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegatedData({ dataType })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegatedData: (fields: {
        dataType: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        dataType: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.UpdatingDelegatedData"***
     * @remarks - ***DelegateActivity$UpdatingDelegatedDataLike*** is the same as the expanded field-types.
     */
    UpdatingDelegatedData(fields: DelegateActivity$UpdatingDelegatedDataLike | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.DeletingDelegatedData"***
     * @remarks - ***DelegateActivity$DeletingDelegatedDataLike*** is the same as the expanded field-types.
     */
    DeletingDelegatedData(fields: DelegateActivity$DeletingDelegatedDataLike | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.MultipleDelegateActivities"***
     */
    MultipleDelegateActivities(activities: Array<UplcData>): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateActivity*** enum type.
 * @public
 */
declare class DelegateActivityHelper_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateActivity_2, Partial<{
        CapoLifecycleActivities: CapoLifecycleActivityLike_3;
        DelegateLifecycleActivities: DelegateLifecycleActivityLike_2;
        SpendingActivities: SpendingActivityLike_2;
        MintingActivities: MintingActivityLike_2;
        BurningActivities: BurningActivityLike_2;
        CreatingDelegatedData: DelegateActivity$CreatingDelegatedDataLike_2;
        UpdatingDelegatedData: DelegateActivity$UpdatingDelegatedDataLike_2;
        DeletingDelegatedData: DelegateActivity$DeletingDelegatedDataLike_2;
        MultipleDelegateActivities: Array<UplcData>;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***DelegateActivity:CapoLifecycleActivities***.
     */
    get CapoLifecycleActivities(): CapoLifecycleActivityHelperNested_3;
    /**
     * access to different variants of the ***nested DelegateLifecycleActivity*** type needed for ***DelegateActivity:DelegateLifecycleActivities***.
     */
    get DelegateLifecycleActivities(): DelegateLifecycleActivityHelperNested_2;
    /**
     * access to different variants of the ***nested SpendingActivity*** type needed for ***DelegateActivity:SpendingActivities***.
     */
    get SpendingActivities(): SpendingActivityHelperNested_2;
    /**
     * access to different variants of the ***nested MintingActivity*** type needed for ***DelegateActivity:MintingActivities***.
     */
    get MintingActivities(): MintingActivityHelperNested_2;
    /**
     * access to different variants of the ***nested BurningActivity*** type needed for ***DelegateActivity:BurningActivities***.
     */
    get BurningActivities(): BurningActivityHelperNested_2;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.CreatingDelegatedData"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegatedData}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegatedData(value: hasSeed, fields: {
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.CreatingDelegatedData"***
     * with raw seed details included in fields.
     */
    CreatingDelegatedData(fields: DelegateActivity$CreatingDelegatedDataLike_2 | {
        seed: TxOutputId | string;
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.CreatingDelegatedData"***,
     * @param fields - \{ dataType: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingDelegatedData({ dataType })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegatedData: (fields: {
        dataType: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        dataType: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.UpdatingDelegatedData"***
     * @remarks - ***DelegateActivity$UpdatingDelegatedDataLike*** is the same as the expanded field-types.
     */
    UpdatingDelegatedData(fields: DelegateActivity$UpdatingDelegatedDataLike_2 | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.DeletingDelegatedData"***
     * @remarks - ***DelegateActivity$DeletingDelegatedDataLike*** is the same as the expanded field-types.
     */
    DeletingDelegatedData(fields: DelegateActivity$DeletingDelegatedDataLike_2 | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.MultipleDelegateActivities"***
     */
    MultipleDelegateActivities(activities: Array<UplcData>): isActivity;
}

/**
 * declaration for one strategy-variant of a delegate role
 * @remarks
 *
 * Indicates the details needed to construct a delegate script
 *
 * NOTE: the Type param is always inferred by defineRole()
 * @public
 **/
declare interface DelegateConfigDetails<DT extends StellarDelegate> {
    partialConfig?: PartialParamConfig<ConfigFor<DT>>;
    validateConfig?: (p: ConfigFor<DT>) => delegateConfigValidation;
}

/**
 * return type for a delegate-config's validateScriptParams()
 * @internal
 **/
declare type delegateConfigValidation = ErrorMap | undefined | void;

declare type DelegateDatum$capoStoredData = {
    data: AnyData_2;
    version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$capoStoredData_2 = {
    data: ReqtData;
    version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$capoStoredDataLike = {
    data: AnyDataLike_2;
    version: IntLike;
    otherDetails: UplcData;
};

declare type DelegateDatum$capoStoredDataLike_2 = {
    data: ReqtDataLike;
    version: IntLike;
    otherDetails: UplcData;
};

declare type DelegateDatum$Cip68RefToken = {
    cip68meta: AnyData_2;
    cip68version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$Cip68RefToken_2 = {
    cip68meta: AnyData_3;
    cip68version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$Cip68RefTokenLike = {
    cip68meta: AnyDataLike_2;
    cip68version: IntLike;
    otherDetails: UplcData;
};

declare type DelegateDatum$Cip68RefTokenLike_2 = {
    cip68meta: AnyDataLike_3;
    cip68version: IntLike;
    otherDetails: UplcData;
};

declare type DelegateDatum$Ergo$capoStoredData = {
    data: ErgoAnyData;
    version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$Ergo$capoStoredData_2 = {
    data: ErgoReqtData;
    version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$Ergo$Cip68RefToken = {
    cip68meta: ErgoAnyData;
    cip68version: bigint;
    otherDetails: UplcData;
};

declare type DelegateDatum$Ergo$Cip68RefToken_2 = {
    cip68meta: ErgoAnyData_2;
    cip68version: bigint;
    otherDetails: UplcData;
};

/**
 * DelegateDatum enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the DelegateDatum enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateDatumHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateDatum = {
    Cip68RefToken: DelegateDatum$Cip68RefToken;
} | {
    IsDelegation: DelegationDetail;
} | {
    capoStoredData: DelegateDatum$capoStoredData;
};

/**
 * DelegateDatum enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the DelegateDatum enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateDatumHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateDatum_2 = {
    Cip68RefToken: DelegateDatum$Cip68RefToken_2;
} | {
    IsDelegation: DelegationDetail_3;
} | {
    capoStoredData: DelegateDatum$capoStoredData_2;
};

/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***DelegateDatum*** enum type.
 * @public
 */
declare class DelegateDatumHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateDatum, Partial<{
        Cip68RefToken: DelegateDatum$Cip68RefTokenLike;
        IsDelegation: DelegationDetailLike;
        capoStoredData: DelegateDatum$capoStoredDataLike;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"UnspecializedDelegate::DelegateDatum.Cip68RefToken"***
     * @remarks - ***DelegateDatum$Cip68RefTokenLike*** is the same as the expanded field-types.
     */
    Cip68RefToken(fields: DelegateDatum$Cip68RefTokenLike | {
        cip68meta: AnyDataLike_2;
        cip68version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"UnspecializedDelegate::DelegateDatum.IsDelegation"***
     * @remarks - ***DelegationDetailLike*** is the same as the expanded field-type.
     */
    IsDelegation(dd: DelegationDetailLike | {
        capoAddr: /*minStructField*/ Address | string;
        mph: /*minStructField*/ MintingPolicyHash | string | number[];
        tn: number[];
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"UnspecializedDelegate::DelegateDatum.capoStoredData"***
     * @remarks - ***DelegateDatum$capoStoredDataLike*** is the same as the expanded field-types.
     */
    capoStoredData(fields: DelegateDatum$capoStoredDataLike | {
        data: AnyDataLike_2;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}

/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***DelegateDatum*** enum type.
 * @public
 */
declare class DelegateDatumHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateDatum_2, Partial<{
        Cip68RefToken: DelegateDatum$Cip68RefTokenLike_2;
        IsDelegation: DelegationDetailLike_2;
        capoStoredData: DelegateDatum$capoStoredDataLike_2;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"ReqtsData::DelegateDatum.Cip68RefToken"***
     * @remarks - ***DelegateDatum$Cip68RefTokenLike*** is the same as the expanded field-types.
     */
    Cip68RefToken(fields: DelegateDatum$Cip68RefTokenLike_2 | {
        cip68meta: AnyDataLike_3;
        cip68version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"ReqtsData::DelegateDatum.IsDelegation"***
     * @remarks - ***DelegationDetailLike*** is the same as the expanded field-type.
     */
    IsDelegation(dd: DelegationDetailLike_2 | {
        capoAddr: /*minStructField*/ Address | string;
        mph: /*minStructField*/ MintingPolicyHash | string | number[];
        tn: number[];
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"ReqtsData::DelegateDatum.capoStoredData"***
     * @remarks - ***DelegateDatum$capoStoredDataLike*** is the same as the expanded field-types.
     */
    capoStoredData(fields: DelegateDatum$capoStoredDataLike_2 | {
        data: ReqtDataLike;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}

/**
 * DelegatedDataContract provides a base class for utility functions
 * to simplify implementation of delegate controllers.  They are used
 * to manage the creation and updating of records in a delegated data store,
 * where the data is stored in a Capo, and the controller is forced into the
 * transaction by the Capo's delegate policy (or its spend-delegate's).
 *@public
 */
declare abstract class DelegatedDataContract<T extends AnyDataTemplate<any, any>, TLike extends AnyDataTemplate<any, any>> extends ContractBasedDelegate {
    usesWrappedData?: boolean;
    dgDatumHelper: any;
    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * This is a convenience for the controller, and should be used along with
     * the appropriate on-chain policy to require the gov token's presence.
     */
    needsGovAuthority: boolean;
    abstract get recordTypeName(): string;
    abstract get idPrefix(): string;
    abstract exampleData(): minimalData<TLike>;
    /**
     * Provides a customized label for the delegate, used in place of
     * a generic script name ("BasicDelegate").  DelegatedDataContract
     * provides a default name with the record type name and "Pol" suffix.
     *
     * Affects the on-chain logging for the policy and the compiled script
     * output in the script-cache on-disk or in browser's storage.
     */
    get delegateName(): string;
    abstract requirements(): ReqtsMap_2<any, any> | ReqtsMap_2<any, never>;
    get abstractBundleClass(): undefined | typeof CapoDelegateBundle;
    scriptBundle(): CapoDelegateBundle;
    /**
     * Finds records of this delegate's type, optionally by ID.
     * @remarks
     * Returns a record list when no ID is provided, or a single record when an ID is provided.
     */
    findRecords<THIS extends DelegatedDataContract<any, any>, ID extends undefined | string | UutName | number[]>(this: THIS, options?: {
        id?: T;
    }): Promise<ID extends undefined ? FoundDatumUtxo<T, TLike>[] : FoundDatumUtxo<T, TLike>>;
    mkDgDatum<THIS extends DelegatedDataContract<any, any>>(this: THIS, record: TLike): InlineDatum;
    /**
     * Intuition hook redirecting to activity.MintingActivities.$seeded$...
     * @remarks
     * @deprecated use activites.MintingActivites.$seeded$* accessors/methods instead.
     */
    usesSeedActivity<SA extends seedActivityFunc<any, any>>(a: SA, seedPlaceholder: "...seed", ...args: SeedActivityArg<SA>): void;
    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     */
    mkTxnCreateRecord<TCX extends StellarTxnContext>(options: DgDataCreationOptions<TLike>, tcx?: TCX): Promise<TCX>;
    creationDefaultDetails(): Partial<TLike>;
    txnCreatingRecord<TCX extends StellarTxnContext & hasCharterRef & hasSeedUtxo & hasUutContext<DelegatedDatumIdPrefix<this>>>(tcx: TCX, options: CoreDgDataCreationOptions<TLike>): Promise<TCX>;
    /**
     * Creates an indirect reference to an an update activity with arguments,
     * using a record-id placeholder.
     *
     * @remarks
     * Provide an update activity function, a placeholder for the record-id, any other args
     * for the on-chain activity/redeemer.  The update-activity function can be any of this
     * contract's `activity.SpendingActivities.*` functions.
     *
     * This approach is similar to the creation-time {@link DelegatedDataContract.usesSeedActivity|usesSeedActivity()} method,
     * with a "...recId" placeholder instead of a "...seed" placeholder.
     *
     * The arguments are passed to the update activity function, which is expected to return
     * an {@link isActivity} object serializing the `{redeemer}` data as a UplcData object.
     * Normally that's done with {@link ContractBasedDelegate.mkSpendingActivity | mkSpendingActivity()}.
     */
    usesUpdateActivity<UA extends updateActivityFunc<any>>(a: UA, _idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>): UpdateActivity<updateActivityFunc<any>, UpdateActivityArgs<UA>>;
    /**
     * Creates a transaction for updating a record in the delegated data store
     *
     * @remarks
     * Provide a transaction name, an existing item, and a controller activity to trigger.
     * The activity MUST either be an activity triggering one of the controller's SpendingActivity variants,
     * or the result of calling {@link DelegatedDataContract.usesUpdateActivity | usesUpdateActivity()}.
     *   **or TODO support a multi-activity**
     *
     * The updatedRecord only needs to contain the fields that are being updated.
     */
    mkTxnUpdateRecord<TCX extends StellarTxnContext>(this: DelegatedDataContract<any, any>, txnName: string, item: FoundDatumUtxo<T, any>, options: DgDataUpdateOptions<TLike>, tcx?: TCX): Promise<TCX>;
    txnUpdatingRecord<TCX extends StellarTxnContext & hasCharterRef>(tcx: TCX, id: hasRecId, item: FoundDatumUtxo<T, any>, options: CoreDgDataUpdateOptions<TLike>): Promise<TCX>;
    getReturnAddress(): Address;
    returnUpdatedRecord<TCX extends StellarTxnContext & hasCharterRef>(tcx: TCX, returnedValue: Value, updatedRecord: TLike): TCX;
}

/**
 * @public
 */
declare type DelegatedDataPredicate<DATUM_TYPE extends AnyDataTemplate<any, any>> = (utxo: TxInput, data: DATUM_TYPE) => boolean;

declare type DelegatedDatumIdPrefix<T extends DelegatedDataContract<any, any>, TN extends string = T["idPrefix"]> = TN;

declare type DelegateLifecycleActivity$Ergo$ReplacingMe = DelegateLifecycleActivity$ReplacingMe;

declare type DelegateLifecycleActivity$Ergo$ReplacingMe_2 = DelegateLifecycleActivity$ReplacingMe_2;

declare type DelegateLifecycleActivity$ReplacingMe = {
    seed: TxOutputId;
    purpose: string;
};

declare type DelegateLifecycleActivity$ReplacingMe_2 = {
    seed: TxOutputId;
    purpose: string;
};

declare type DelegateLifecycleActivity$ReplacingMeLike = {
    seed: TxOutputId | string;
    purpose: string;
};

declare type DelegateLifecycleActivity$ReplacingMeLike_2 = {
    seed: TxOutputId | string;
    purpose: string;
};

/**
 * DelegateLifecycleActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the DelegateLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateLifecycleActivity = {
    ReplacingMe: DelegateLifecycleActivity$ReplacingMe;
} | {
    Retiring: tagOnly;
} | {
    ValidatingSettings: tagOnly;
};

/**
 * DelegateLifecycleActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the DelegateLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateLifecycleActivity_2 = {
    ReplacingMe: DelegateLifecycleActivity$ReplacingMe_2;
} | {
    Retiring: tagOnly;
} | {
    ValidatingSettings: tagOnly;
};

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 */
declare class DelegateLifecycleActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 */
declare class DelegateLifecycleActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity_2, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike_2;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 */
declare class DelegateLifecycleActivityHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): {
        redeemer: UplcData;
    };
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 */
declare class DelegateLifecycleActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity_2, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike_2;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): {
        redeemer: UplcData;
    };
}

/**
 * DelegateLifecycleActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the DelegateLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type DelegateLifecycleActivityLike = IntersectedEnum<{
    ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike;
} | {
    Retiring: tagOnly;
} | {
    ValidatingSettings: tagOnly;
}>;

/**
 * DelegateLifecycleActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the DelegateLifecycleActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateLifecycleActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type DelegateLifecycleActivityLike_2 = IntersectedEnum<{
    ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike_2;
} | {
    Retiring: tagOnly;
} | {
    ValidatingSettings: tagOnly;
}>;

/**
 * DelegateRole enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **8 variant(s)** of the DelegateRole enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateRoleHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateRole = {
    MintDgt: tagOnly;
} | {
    SpendDgt: tagOnly;
} | {
    MintInvariant: tagOnly;
} | {
    SpendInvariant: tagOnly;
} | {
    DgDataPolicy: string;
} | {
    OtherNamedDgt: string;
} | {
    BothMintAndSpendDgt: tagOnly;
} | {
    HandledByCapoOnly: tagOnly;
};

/**
 * DelegateRole enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **8 variant(s)** of the DelegateRole enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateRoleHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateRole_2 = {
    MintDgt: tagOnly;
} | {
    SpendDgt: tagOnly;
} | {
    MintInvariant: tagOnly;
} | {
    SpendInvariant: tagOnly;
} | {
    DgDataPolicy: string;
} | {
    OtherNamedDgt: string;
} | {
    BothMintAndSpendDgt: tagOnly;
} | {
    HandledByCapoOnly: tagOnly;
};

/**
 * DelegateRole enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **8 variant(s)** of the DelegateRole enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateRoleHelper` class
 *     for generating UPLC data for this enum type
 */
declare type DelegateRole_3 = {
    MintDgt: tagOnly;
} | {
    SpendDgt: tagOnly;
} | {
    MintInvariant: tagOnly;
} | {
    SpendInvariant: tagOnly;
} | {
    DgDataPolicy: string;
} | {
    OtherNamedDgt: string;
} | {
    BothMintAndSpendDgt: tagOnly;
} | {
    HandledByCapoOnly: tagOnly;
};

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class DelegateRoleHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class DelegateRoleHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_2, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class DelegateRoleHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_3, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class DelegateRoleHelperNested extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class DelegateRoleHelperNested_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_2, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 */
declare class DelegateRoleHelperNested_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_3, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * DelegateRole enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **8 variant(s)** of the DelegateRole enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateRoleHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type DelegateRoleLike = IntersectedEnum<{
    MintDgt: tagOnly;
} | {
    SpendDgt: tagOnly;
} | {
    MintInvariant: tagOnly;
} | {
    SpendInvariant: tagOnly;
} | {
    DgDataPolicy: string;
} | {
    OtherNamedDgt: string;
} | {
    BothMintAndSpendDgt: tagOnly;
} | {
    HandledByCapoOnly: tagOnly;
}>;

/**
 * DelegateRole enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **8 variant(s)** of the DelegateRole enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateRoleHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type DelegateRoleLike_2 = IntersectedEnum<{
    MintDgt: tagOnly;
} | {
    SpendDgt: tagOnly;
} | {
    MintInvariant: tagOnly;
} | {
    SpendInvariant: tagOnly;
} | {
    DgDataPolicy: string;
} | {
    OtherNamedDgt: string;
} | {
    BothMintAndSpendDgt: tagOnly;
} | {
    HandledByCapoOnly: tagOnly;
}>;

/**
 * DelegateRole enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **8 variant(s)** of the DelegateRole enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `DelegateRoleHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type DelegateRoleLike_3 = IntersectedEnum<{
    MintDgt: tagOnly;
} | {
    SpendDgt: tagOnly;
} | {
    MintInvariant: tagOnly;
} | {
    SpendInvariant: tagOnly;
} | {
    DgDataPolicy: string;
} | {
    OtherNamedDgt: string;
} | {
    BothMintAndSpendDgt: tagOnly;
} | {
    HandledByCapoOnly: tagOnly;
}>;

/**
 * Describes one delegation role used in a Capo contract
 * @remarks
 *
 * Includes the controller / delegate class, the configuration details for that class,
 * and a uutPurpose (base name for the authority tokens).
 *
 * All type-parameters are normally inferred from {@link defineRole}()
 *
 * @public
 **/
declare type DelegateSetup<DT extends DelegateTypes, SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate), CONFIG extends DelegateConfigDetails<SC>> = {
    uutPurpose: string;
    delegateType: DelegateTypes;
    delegateClass: stellarSubclass<SC>;
    config: CONFIG;
};

/**
 * @public
 */
declare type DelegateSetupWithoutMintDelegate = {
    withoutMintDelegate: useRawMinterSetup;
};

declare type DelegateTypes = "spendDgt" | "mintDgt" | "authority" | "dgDataPolicy" | "other";

declare type DelegationDetail = {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
};

/**
 * Captures normal details of every delegate relationship
 * @remarks
 *
 * Includes the address of the leader contract, its minting policy, and the token-name
 * used for the delegate
 * @public
 **/
declare type DelegationDetail_2 = {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
};

declare type DelegationDetail_3 = {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
};

declare type DelegationDetailLike = {
    capoAddr: /*minStructField*/ Address | string;
    mph: /*minStructField*/ MintingPolicyHash | string | number[];
    tn: number[];
};

declare type DelegationDetailLike_2 = {
    capoAddr: /*minStructField*/ Address | string;
    mph: /*minStructField*/ MintingPolicyHash | string | number[];
    tn: number[];
};

declare type DgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity | SeedActivity<any>;
    data: minimalData<TLike>;
    addedUtxoValue?: Value;
};

declare type DgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity | UpdateActivity<any>;
    updatedFields: Partial<minimalData<TLike>>;
    addedUtxoValue?: Value;
};

/**
 * @internal
 */
declare type dgtStateKey<N extends string, PREFIX extends string = "dgPol"> = `${PREFIX}${Capitalize<N>}`;

declare type EachUnionElement<Union> = ReverseTuple<ReversedAllOfUnion<Union>>;

declare type EmptyConstructor<T> = new () => T;

/**
 * @public
 */
export declare type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};

/**
 * EnumMaker provides a way to create UplcData for enums.  It optionally includes an activity wrapper \{ redeemer: UplcData \}
 * ... and honors a nested context to inject (instead of UPLC-ing) typed, nested data into a parent context for uplc formatting.
 * @public
 */
declare class EnumBridge<TYPE extends isActivity | isDatum | JustAnEnum = JustAnEnum, uplcReturnType = isActivity extends TYPE ? {
    redeemer: UplcData;
} : UplcData> extends DataBridge {
    constructor(options?: DataBridgeOptions);
    protected mkUplcData(value: any, enumPathExpr: string): uplcReturnType;
}

declare type ErgoAnyData = AnyData_2;

declare type ErgoAnyData_2 = AnyData_3;

declare type ErgoBurningActivity = IntersectedEnum<BurningActivity>;

declare type ErgoBurningActivity_2 = IntersectedEnum<BurningActivity_2>;

declare type ErgoCapoActivity = IntersectedEnum<{
    capoLifecycleActivity: ErgoCapoLifecycleActivity;
} | {
    usingAuthority: tagOnly;
} | {
    retiringRefScript: tagOnly;
} | {
    addingSpendInvariant: tagOnly;
} | {
    spendingDelegatedDatum: tagOnly;
} | {
    updatingCharter: tagOnly;
}>;

declare type ErgoCapoDatum = IntersectedEnum<{
    CharterData: CapoDatum$Ergo$CharterData;
} | {
    ScriptReference: tagOnly;
} | {
    DelegatedData: CapoDatum$Ergo$DelegatedData;
}>;

declare type ErgoCapoLifecycleActivity = IntersectedEnum<{
    CreatingDelegate: CapoLifecycleActivity$Ergo$CreatingDelegate;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: ErgoDelegateRole;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$Ergo$forcingNewSpendDelegate;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$Ergo$forcingNewMintDelegate;
} | {
    updatingManifest: ErgoManifestActivity;
}>;

declare type ErgoCapoLifecycleActivity_2 = IntersectedEnum<{
    CreatingDelegate: CapoLifecycleActivity$Ergo$CreatingDelegate_2;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: ErgoDelegateRole_2;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$Ergo$forcingNewSpendDelegate_2;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$Ergo$forcingNewMintDelegate_2;
} | {
    updatingManifest: ErgoManifestActivity_2;
}>;

declare type ErgoCapoLifecycleActivity_3 = IntersectedEnum<{
    CreatingDelegate: CapoLifecycleActivity$Ergo$CreatingDelegate_3;
} | {
    queuePendingChange: tagOnly;
} | {
    removePendingChange: ErgoDelegateRole_3;
} | {
    commitPendingChanges: tagOnly;
} | {
    forcingNewSpendDelegate: CapoLifecycleActivity$Ergo$forcingNewSpendDelegate_3;
} | {
    forcingNewMintDelegate: CapoLifecycleActivity$Ergo$forcingNewMintDelegate_3;
} | {
    updatingManifest: ErgoManifestActivity_3;
}>;

declare type ErgoCapoManifestEntry = {
    entryType: ErgoManifestEntryType;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | undefined;
};

declare type ErgoCapoManifestEntry_2 = {
    entryType: ErgoManifestEntryType_2;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | undefined;
};

declare type ErgoCapoManifestEntry_3 = {
    entryType: ErgoManifestEntryType_3;
    tokenName: number[];
    mph: /*minStructField*/ MintingPolicyHash | undefined;
};

declare type Ergocctx_CharterInputType = IntersectedEnum<{
    Unk: tagOnly;
} | {
    RefInput: cctx_CharterInputType$Ergo$RefInput;
} | {
    Input: cctx_CharterInputType$Ergo$Input;
}>;

declare type Ergocctx_CharterInputType_2 = IntersectedEnum<{
    Unk: tagOnly;
} | {
    RefInput: cctx_CharterInputType$Ergo$RefInput_2;
} | {
    Input: cctx_CharterInputType$Ergo$Input_2;
}>;

declare type ErgoDelegateActivity = IntersectedEnum<{
    CapoLifecycleActivities: ErgoCapoLifecycleActivity_2;
} | {
    DelegateLifecycleActivities: ErgoDelegateLifecycleActivity;
} | {
    SpendingActivities: ErgoSpendingActivity;
} | {
    MintingActivities: ErgoMintingActivity;
} | {
    BurningActivities: ErgoBurningActivity;
} | {
    CreatingDelegatedData: DelegateActivity$Ergo$CreatingDelegatedData;
} | {
    UpdatingDelegatedData: DelegateActivity$Ergo$UpdatingDelegatedData;
} | {
    DeletingDelegatedData: DelegateActivity$Ergo$DeletingDelegatedData;
} | {
    MultipleDelegateActivities: Array<UplcData>;
}>;

declare type ErgoDelegateActivity_2 = IntersectedEnum<{
    CapoLifecycleActivities: ErgoCapoLifecycleActivity_3;
} | {
    DelegateLifecycleActivities: ErgoDelegateLifecycleActivity_2;
} | {
    SpendingActivities: ErgoSpendingActivity_2;
} | {
    MintingActivities: ErgoMintingActivity_2;
} | {
    BurningActivities: ErgoBurningActivity_2;
} | {
    CreatingDelegatedData: DelegateActivity$Ergo$CreatingDelegatedData_2;
} | {
    UpdatingDelegatedData: DelegateActivity$Ergo$UpdatingDelegatedData_2;
} | {
    DeletingDelegatedData: DelegateActivity$Ergo$DeletingDelegatedData_2;
} | {
    MultipleDelegateActivities: Array<UplcData>;
}>;

declare type ErgoDelegateDatum = IntersectedEnum<{
    Cip68RefToken: DelegateDatum$Ergo$Cip68RefToken;
} | {
    IsDelegation: ErgoDelegationDetail;
} | {
    capoStoredData: DelegateDatum$Ergo$capoStoredData;
}>;

declare type ErgoDelegateDatum_2 = IntersectedEnum<{
    Cip68RefToken: DelegateDatum$Ergo$Cip68RefToken_2;
} | {
    IsDelegation: ErgoDelegationDetail_2;
} | {
    capoStoredData: DelegateDatum$Ergo$capoStoredData_2;
}>;

declare type ErgoDelegateLifecycleActivity = IntersectedEnum<{
    ReplacingMe: DelegateLifecycleActivity$Ergo$ReplacingMe;
} | {
    Retiring: tagOnly;
} | {
    ValidatingSettings: tagOnly;
}>;

declare type ErgoDelegateLifecycleActivity_2 = IntersectedEnum<{
    ReplacingMe: DelegateLifecycleActivity$Ergo$ReplacingMe_2;
} | {
    Retiring: tagOnly;
} | {
    ValidatingSettings: tagOnly;
}>;

declare type ErgoDelegateRole = IntersectedEnum<DelegateRole>;

declare type ErgoDelegateRole_2 = IntersectedEnum<DelegateRole_2>;

declare type ErgoDelegateRole_3 = IntersectedEnum<DelegateRole_3>;

declare type ErgoDelegationDetail = DelegationDetail;

declare type ErgoDelegationDetail_2 = DelegationDetail_3;

declare type ErgoManifestActivity = IntersectedEnum<{
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$Ergo$updatingEntry;
} | {
    addingEntry: ManifestActivity$Ergo$addingEntry;
} | {
    forkingThreadToken: ManifestActivity$Ergo$forkingThreadToken;
} | {
    burningThreadToken: ManifestActivity$Ergo$burningThreadToken;
}>;

declare type ErgoManifestActivity_2 = IntersectedEnum<{
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$Ergo$updatingEntry_2;
} | {
    addingEntry: ManifestActivity$Ergo$addingEntry_2;
} | {
    forkingThreadToken: ManifestActivity$Ergo$forkingThreadToken_2;
} | {
    burningThreadToken: ManifestActivity$Ergo$burningThreadToken_2;
}>;

declare type ErgoManifestActivity_3 = IntersectedEnum<{
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$Ergo$updatingEntry_3;
} | {
    addingEntry: ManifestActivity$Ergo$addingEntry_3;
} | {
    forkingThreadToken: ManifestActivity$Ergo$forkingThreadToken_3;
} | {
    burningThreadToken: ManifestActivity$Ergo$burningThreadToken_3;
}>;

declare type ErgoManifestEntryType = IntersectedEnum<{
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$Ergo$DgDataPolicy;
} | {
    DelegateThreads: ManifestEntryType$Ergo$DelegateThreads;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
}>;

declare type ErgoManifestEntryType_2 = IntersectedEnum<{
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$Ergo$DgDataPolicy_2;
} | {
    DelegateThreads: ManifestEntryType$Ergo$DelegateThreads_2;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
}>;

declare type ErgoManifestEntryType_3 = IntersectedEnum<{
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$Ergo$DgDataPolicy_3;
} | {
    DelegateThreads: ManifestEntryType$Ergo$DelegateThreads_3;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
}>;

declare type ErgoMinterActivity = IntersectedEnum<{
    mintingCharter: Address;
} | {
    mintWithDelegateAuthorizing: tagOnly;
} | {
    addingMintInvariant: TxOutputId;
} | {
    addingSpendInvariant: TxOutputId;
} | {
    forcingNewMintDelegate: TxOutputId;
} | {
    CreatingNewSpendDelegate: MinterActivity$Ergo$CreatingNewSpendDelegate;
}>;

declare type ErgoMintingActivity = IntersectedEnum<MintingActivity>;

declare type ErgoMintingActivity_2 = IntersectedEnum<MintingActivity_2>;

declare type ErgoPendingCharterChange = IntersectedEnum<{
    delegateChange: ErgoPendingDelegateChange;
} | {
    otherManifestChange: tagOnly;
}>;

declare type ErgoPendingCharterChange_2 = IntersectedEnum<{
    delegateChange: ErgoPendingDelegateChange_2;
} | {
    otherManifestChange: tagOnly;
}>;

declare type ErgoPendingCharterChange_3 = IntersectedEnum<{
    delegateChange: ErgoPendingDelegateChange_3;
} | {
    otherManifestChange: tagOnly;
}>;

declare type ErgoPendingDelegateAction = IntersectedEnum<{
    Add: PendingDelegateAction$Ergo$Add;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$Ergo$Replace;
}>;

declare type ErgoPendingDelegateAction_2 = IntersectedEnum<{
    Add: PendingDelegateAction$Ergo$Add_2;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$Ergo$Replace_2;
}>;

declare type ErgoPendingDelegateAction_3 = IntersectedEnum<{
    Add: PendingDelegateAction$Ergo$Add_3;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$Ergo$Replace_3;
}>;

declare type ErgoPendingDelegateChange = {
    action: ErgoPendingDelegateAction;
    role: ErgoDelegateRole;
    dgtLink: /*minStructField*/ ErgoRelativeDelegateLink | undefined;
};

declare type ErgoPendingDelegateChange_2 = {
    action: ErgoPendingDelegateAction_2;
    role: ErgoDelegateRole_2;
    dgtLink: /*minStructField*/ ErgoRelativeDelegateLink_2 | undefined;
};

declare type ErgoPendingDelegateChange_3 = {
    action: ErgoPendingDelegateAction_3;
    role: ErgoDelegateRole_3;
    dgtLink: /*minStructField*/ ErgoRelativeDelegateLink_3 | undefined;
};

declare type ErgoRelativeDelegateLink = RelativeDelegateLink;

declare type ErgoRelativeDelegateLink_2 = RelativeDelegateLink_2;

declare type ErgoRelativeDelegateLink_3 = RelativeDelegateLink_4;

declare type ErgoReqtData = ReqtData;

declare type ErgoSpendingActivity = IntersectedEnum<SpendingActivity>;

declare type ErgoSpendingActivity_2 = IntersectedEnum<SpendingActivity_2>;

/**
 * Reveals errors found during delegate selection
 * @remarks
 *
 * Each field name is mapped to an array of string error messages found on that field.
 * @public
 **/
declare type ErrorMap = Record<string, string[]>;

/**
 * type debugging - typeinfo
 * @public
 */
export declare type Expand<T> = T extends (...args: infer A) => infer R ? (...args: Expand<A>) => Expand<R> : T extends infer O ? {
    [K in keyof O]: O[K];
} : never;

/**
 * Recursively expand all types in a type
 * @public
 */
export declare type ExpandRecursively<T> = T extends object ? T extends infer O ? {
    [K in keyof O]: ExpandRecursively<O[K]>;
} : never : T;

declare type _extractLastInspectableElement<F> = F extends {
    (a: infer UnionElement): void;
} ? UnionElement : never;

declare type ExtractLastOfUnion<Union> = _extractLastInspectableElement<_intersectInspectFuncs<_inspectableUnionFuncs<Union>>>;

declare type ExtractRestOfUnion<Union> = Exclude<Union, ExtractLastOfUnion<Union>>;

declare type findReadDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>> = IF<CBT["isAbstract"], readsUplcTo<any>, undefined extends CBT["datum"] ? never : undefined extends CBT["readDatum"] ? never : CBT["readDatum"]>;

/**
 * Pre-parsed results of finding and matching contract-held UTxOs
 * with datum details.
 * @public
 */
declare type FoundDatumUtxo<DelegatedDatumType extends AnyDataTemplate<any, any>, WRAPPED_DatumType extends any = any> = {
    utxo: TxInput;
    datum: InlineDatum;
    data?: DelegatedDatumType;
    dataWrapped?: WRAPPED_DatumType;
};

/**
 * represents a UUT found in a user-wallet, for use in authorizing a transaction
 * @public
 */
declare type FoundUut = {
    utxo: TxInput;
    uut: UutName;
};

/**
 * @public
 */
declare type GenericDelegateBridge = ContractDataBridgeWithEnumDatum & Pick<UnspecializedDelegateBridge, "isAbstract" | "readData"> & {
    reader: SomeDgtBridgeReader;
    activity: EnumBridge<isActivity> & SomeDgtActivityHelper;
    DelegateActivity: EnumBridge<isActivity> & SomeDgtActivityHelper;
    datum: EnumBridge<JustAnEnum> & SomeDgtDatumHelper<any>;
    DelegateDatum: SomeDgtDatumHelper<any>;
    readDatum: (d: UplcData) => GenericDelegateDatum;
    types: Pick<UnspecializedDelegateBridge["types"], "DelegateRole" | "ManifestActivity" | "CapoLifecycleActivity" | "DelegateLifecycleActivity" | "DelegationDetail"> & {
        SpendingActivity: EnumBridge<JustAnEnum>;
        MintingActivity: EnumBridge<JustAnEnum>;
        BurningActivity: EnumBridge<JustAnEnum>;
        DelegateDatum: SomeDgtDatumHelper<any>;
        DelegateActivity: EnumBridge<isActivity>;
    };
};

/**
 * @public
 */
declare type GenericDelegateBridgeClass = AbstractNew<GenericDelegateBridge>;

/**
 * @public
 */
declare type GenericDelegateDatum = Pick<ErgoDelegateDatum, "Cip68RefToken" | "IsDelegation"> & {
    capoStoredData?: {
        data: AnyDataTemplate<any, any>;
        version: bigint;
        otherDetails: unknown;
    };
};

/**
 * A transaction context that includes additional transactions in its state for later execution
 * @remarks
 *
 * During the course of creating a transaction, the transaction-building functions for a contract
 * suite may suggest or require further transactions, which may not be executable until after the
 * current transaction is executed.  This type allows the transaction context to include such
 * future transactions in its state, so that they can be executed later.
 *
 * The future transactions can be executed using the {@link StellarTxnContext.submitAddlTxns}
 * helper method.
 * @public
 **/
declare type hasAddlTxns<TCX extends StellarTxnContext<anyState>, existingStateType extends anyState = TCX["state"]> = StellarTxnContext<existingStateType & {
    addlTxns: Record<string, TxDescription<any>>;
}>;

/**
 * used for transaction-context state having specific uut-purposes
 *
 * @public
 */
declare type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
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
declare type hasBootstrappedCapoConfig = StellarTxnContext<{
    bsc: CapoConfig;
    uuts: uutMap;
    bootstrappedConfig: any;
}>;

/**
 * A transaction context having a reference to the Capo's charter
 * @remarks
 * The transaction will have a refInput pointing to the charter, for
 * on-chain delegate scripts' use
 *
 * The transaction context will have \{charterData, charterRef\} in its state
 * @public
 */
declare type hasCharterRef = StellarTxnContext<{
    charterRef: TxInput;
    charterData: CharterData;
} & anyState>;

/**
 * @public
 */
declare type hasGovAuthority = StellarTxnContext<anyState & {
    govAuthority: AuthorityPolicy;
}>;

/**
 * @public
 */
declare type hasNamedDelegate<DT extends StellarDelegate, N extends string, PREFIX extends string = "namedDelegate"> = StellarTxnContext<anyState & {
    [k in dgtStateKey<N, PREFIX>]: ConfiguredDelegate<DT> & ErgoRelativeDelegateLink;
}>;

declare type hasRecId = string | number[] | UutName;

/**
 * @public
 */
declare type hasSeed = SeedAttrs | hasSeedUtxo | TxOutputIdLike;

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
declare type hasSeedUtxo = StellarTxnContext<anyState & {
    seedUtxo: TxInput;
}>;

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
declare type hasSettingsRef<SETTINGS_TYPE extends AnyDataTemplate<any, any> = AnyDataTemplate<any, any>, WRAPPED_SETTINGS = any> = StellarTxnContext<{
    settingsInfo: FoundDatumUtxo<SETTINGS_TYPE, WRAPPED_SETTINGS>;
} & anyState>;

/**
 * @public
 */
declare type hasSpendDelegate = StellarTxnContext<anyState & {
    spendDelegate: ContractBasedDelegate;
}>;

/**
 * A txn context having specifically-purposed UUTs in its state
 * @public
 */
declare type hasUutContext<uutEntries extends string> = StellarTxnContext<hasAllUuts<uutEntries>>;

declare type HeliosBundleClassWithCapo = typeof HeliosScriptBundle & EmptyConstructor<HeliosScriptBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};

declare type HeliosBundleTypes = {
    datum?: DataType;
    redeemer: DataType;
};

/**
 * Base class for any Helios script bundle
 * @remarks
 * See also {@link CapoHeliosBundle} and {@link CapoDelegateBundle} for
 * specialized bundle types
 * @public
 */
declare abstract class HeliosScriptBundle {
    static isCapoBundle: boolean;
    capoBundle?: CapoHeliosBundle;
    isConcrete: boolean;
    /**
     * Constructs a base class for any Helios script bundle,
     * given the class for an application-specific CapoHeliosBundle.
     * @remarks
     * The resulting class provides its own CapoHeliosBundle instance
     * for independent use (specifically, for compiling this bundle using
     * the dependency libraries provided by the Capo bundle).
     */
    static usingCapoBundleClass<CB extends CapoBundleClass>(c: CB): HeliosBundleClassWithCapo;
    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferrring the type from the entry point.
     */
    datumTypeName?: string;
    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName?: string;
    constructor();
    get main(): Source;
    get modules(): Source[];
    get bridgeClassName(): string;
    get moduleName(): string;
    config?: HeliosScriptSettings<any>;
    artifacts: null;
    compiledScript(params: UplcRecord<any>): Promise<anyUplcProgram>;
    _program?: HeliosProgramWithCacheAPI;
    get program(): Program;
    isHeliosScriptBundle(): boolean;
    addTypeProxies(): void;
    effectiveDatumTypeName(): string;
    locateDatumType(): DataType | undefined;
    locateRedeemerType(): DataType;
    getTopLevelTypes(): HeliosBundleTypes;
}

/**
 * @public
 */
declare type HeliosScriptSettings<ConfigType extends configBaseWithRev> = {
    config: ConfigType;
    optimize?: boolean;
};

declare type IF<T1 extends boolean | never, T2, ELSE = never, ERR_TYPE = unknown> = [
true | false
] extends [T1] ? ERR_TYPE : true extends T1 ? T2 : ELSE;

declare type IFISNEVER<T, IFNEVER, ELSE = never> = [T] extends [never] ? IFNEVER : ELSE;

/**
 * @public
 */
declare type InlineDatum = InlineTxOutputDatum;

declare type _inspectableUnionFuncs<U> = U extends any ? (k: U) => void : never;

/**
 * @public
 */
export declare const insufficientInputError: RegExp;

declare type intersectedElements<T extends any[]> = T extends [infer A, ...infer B] ? A & intersectedElements<B> : {};

/**
 * @public
 */
declare type IntersectedEnum<T, intersected = intersectedElements<EachUnionElement<T>>, merged = {
    [key in keyof intersected]: key extends keyof intersected ? intersected[key] : never;
}> = Partial<merged>;

declare type _intersectInspectFuncs<U> = _inspectableUnionFuncs<U> extends (k: infer MAGIC) => void ? MAGIC : never;

/**
 * a type for redeemer/activity-factory functions declared with \@Activity.redeemer
 *
 * @public
 */
declare type isActivity = {
    redeemer: UplcData;
    details?: string;
};

/**
 * @public
 */
declare type isDatum = typeof isDatum_2;

declare const isDatum_2: unique symbol;

/**
 * @public
 */
declare type isDatum = typeof isDatum_2;

declare const isInternalConstructor: unique symbol;

/**
 * @public
 */
declare type JustAnEnum = typeof JustAnEnum_2;

declare const JustAnEnum_2: unique symbol;

/**
 * @public
 */
declare type JustAnEnum = typeof JustAnEnum_2;

declare type ManifestActivity$addingEntry = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$addingEntry_2 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$addingEntry_3 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$addingEntryLike = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$addingEntryLike_2 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$addingEntryLike_3 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$burningThreadToken = {
    key: string;
    burnedThreadCount: bigint;
};

declare type ManifestActivity$burningThreadToken_2 = {
    key: string;
    burnedThreadCount: bigint;
};

declare type ManifestActivity$burningThreadToken_3 = {
    key: string;
    burnedThreadCount: bigint;
};

declare type ManifestActivity$burningThreadTokenLike = {
    key: string;
    burnedThreadCount: IntLike;
};

declare type ManifestActivity$burningThreadTokenLike_2 = {
    key: string;
    burnedThreadCount: IntLike;
};

declare type ManifestActivity$burningThreadTokenLike_3 = {
    key: string;
    burnedThreadCount: IntLike;
};

declare type ManifestActivity$Ergo$addingEntry = ManifestActivity$addingEntry;

declare type ManifestActivity$Ergo$addingEntry_2 = ManifestActivity$addingEntry_2;

declare type ManifestActivity$Ergo$addingEntry_3 = ManifestActivity$addingEntry_3;

declare type ManifestActivity$Ergo$burningThreadToken = ManifestActivity$burningThreadToken;

declare type ManifestActivity$Ergo$burningThreadToken_2 = ManifestActivity$burningThreadToken_2;

declare type ManifestActivity$Ergo$burningThreadToken_3 = ManifestActivity$burningThreadToken_3;

declare type ManifestActivity$Ergo$forkingThreadToken = ManifestActivity$forkingThreadToken;

declare type ManifestActivity$Ergo$forkingThreadToken_2 = ManifestActivity$forkingThreadToken_2;

declare type ManifestActivity$Ergo$forkingThreadToken_3 = ManifestActivity$forkingThreadToken_3;

declare type ManifestActivity$Ergo$updatingEntry = ManifestActivity$updatingEntry;

declare type ManifestActivity$Ergo$updatingEntry_2 = ManifestActivity$updatingEntry_2;

declare type ManifestActivity$Ergo$updatingEntry_3 = ManifestActivity$updatingEntry_3;

declare type ManifestActivity$forkingThreadToken = {
    key: string;
    newThreadCount: bigint;
};

declare type ManifestActivity$forkingThreadToken_2 = {
    key: string;
    newThreadCount: bigint;
};

declare type ManifestActivity$forkingThreadToken_3 = {
    key: string;
    newThreadCount: bigint;
};

declare type ManifestActivity$forkingThreadTokenLike = {
    key: string;
    newThreadCount: IntLike;
};

declare type ManifestActivity$forkingThreadTokenLike_2 = {
    key: string;
    newThreadCount: IntLike;
};

declare type ManifestActivity$forkingThreadTokenLike_3 = {
    key: string;
    newThreadCount: IntLike;
};

declare type ManifestActivity$updatingEntry = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$updatingEntry_2 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$updatingEntry_3 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$updatingEntryLike = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$updatingEntryLike_2 = {
    key: string;
    tokenName: number[];
};

declare type ManifestActivity$updatingEntryLike_3 = {
    key: string;
    tokenName: number[];
};

/**
 * ManifestActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the ManifestActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type ManifestActivity = {
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$updatingEntry;
} | {
    addingEntry: ManifestActivity$addingEntry;
} | {
    forkingThreadToken: ManifestActivity$forkingThreadToken;
} | {
    burningThreadToken: ManifestActivity$burningThreadToken;
};

/**
 * ManifestActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the ManifestActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type ManifestActivity_2 = {
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$updatingEntry_2;
} | {
    addingEntry: ManifestActivity$addingEntry_2;
} | {
    forkingThreadToken: ManifestActivity$forkingThreadToken_2;
} | {
    burningThreadToken: ManifestActivity$burningThreadToken_2;
};

/**
 * ManifestActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the ManifestActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type ManifestActivity_3 = {
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$updatingEntry_3;
} | {
    addingEntry: ManifestActivity$addingEntry_3;
} | {
    forkingThreadToken: ManifestActivity$forkingThreadToken_3;
} | {
    burningThreadToken: ManifestActivity$burningThreadToken_3;
};

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 */
declare class ManifestActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike;
        addingEntry: ManifestActivity$addingEntryLike;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
        burningThreadToken: ManifestActivity$burningThreadTokenLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 */
declare class ManifestActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_2, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_2;
        addingEntry: ManifestActivity$addingEntryLike_2;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_2;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_2 | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_2 | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 */
declare class ManifestActivityHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_3, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_3;
        addingEntry: ManifestActivity$addingEntryLike_3;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_3;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_3 | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_3 | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 */
declare class ManifestActivityHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike;
        addingEntry: ManifestActivity$addingEntryLike;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
        burningThreadToken: ManifestActivity$burningThreadTokenLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 */
declare class ManifestActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_2, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_2;
        addingEntry: ManifestActivity$addingEntryLike_2;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_2;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_2;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_2 | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_2 | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 */
declare class ManifestActivityHelperNested_3 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_3, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_3;
        addingEntry: ManifestActivity$addingEntryLike_3;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_3;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_3;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_3 | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     * ### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_3 | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}

/**
 * ManifestActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **5 variant(s)** of the ManifestActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type ManifestActivityLike = IntersectedEnum<{
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$updatingEntryLike;
} | {
    addingEntry: ManifestActivity$addingEntryLike;
} | {
    forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
} | {
    burningThreadToken: ManifestActivity$burningThreadTokenLike;
}>;

/**
 * ManifestActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **5 variant(s)** of the ManifestActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type ManifestActivityLike_2 = IntersectedEnum<{
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$updatingEntryLike_2;
} | {
    addingEntry: ManifestActivity$addingEntryLike_2;
} | {
    forkingThreadToken: ManifestActivity$forkingThreadTokenLike_2;
} | {
    burningThreadToken: ManifestActivity$burningThreadTokenLike_2;
}>;

/**
 * ManifestActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **5 variant(s)** of the ManifestActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type ManifestActivityLike_3 = IntersectedEnum<{
    retiringEntry: string;
} | {
    updatingEntry: ManifestActivity$updatingEntryLike_3;
} | {
    addingEntry: ManifestActivity$addingEntryLike_3;
} | {
    forkingThreadToken: ManifestActivity$forkingThreadTokenLike_3;
} | {
    burningThreadToken: ManifestActivity$burningThreadTokenLike_3;
}>;

/**
 * @public
 */
declare type ManifestEntryTokenRef = Omit<CapoManifestEntryLike, "entryType"> & {
    entryType: Pick<CapoManifestEntryLike["entryType"], "NamedTokenRef">;
};

declare type ManifestEntryType$DelegateThreads = {
    role: DelegateRole;
    refCount: bigint;
};

declare type ManifestEntryType$DelegateThreads_2 = {
    role: DelegateRole_2;
    refCount: bigint;
};

declare type ManifestEntryType$DelegateThreads_3 = {
    role: DelegateRole_3;
    refCount: bigint;
};

declare type ManifestEntryType$DelegateThreadsLike = {
    role: DelegateRoleLike;
    refCount: IntLike;
};

declare type ManifestEntryType$DelegateThreadsLike_2 = {
    role: DelegateRoleLike_2;
    refCount: IntLike;
};

declare type ManifestEntryType$DelegateThreadsLike_3 = {
    role: DelegateRoleLike_3;
    refCount: IntLike;
};

declare type ManifestEntryType$DgDataPolicy = {
    policyLink: RelativeDelegateLink;
    idPrefix: string;
    refCount: bigint;
};

declare type ManifestEntryType$DgDataPolicy_2 = {
    policyLink: RelativeDelegateLink_2;
    idPrefix: string;
    refCount: bigint;
};

declare type ManifestEntryType$DgDataPolicy_3 = {
    policyLink: RelativeDelegateLink_4;
    idPrefix: string;
    refCount: bigint;
};

declare type ManifestEntryType$DgDataPolicyLike = {
    policyLink: RelativeDelegateLinkLike;
    idPrefix: string;
    refCount: IntLike;
};

declare type ManifestEntryType$DgDataPolicyLike_2 = {
    policyLink: RelativeDelegateLinkLike_2;
    idPrefix: string;
    refCount: IntLike;
};

declare type ManifestEntryType$DgDataPolicyLike_3 = {
    policyLink: RelativeDelegateLinkLike_4;
    idPrefix: string;
    refCount: IntLike;
};

declare type ManifestEntryType$Ergo$DelegateThreads = {
    role: ErgoDelegateRole;
    refCount: bigint;
};

declare type ManifestEntryType$Ergo$DelegateThreads_2 = {
    role: ErgoDelegateRole_2;
    refCount: bigint;
};

declare type ManifestEntryType$Ergo$DelegateThreads_3 = {
    role: ErgoDelegateRole_3;
    refCount: bigint;
};

declare type ManifestEntryType$Ergo$DgDataPolicy = {
    policyLink: ErgoRelativeDelegateLink;
    idPrefix: string;
    refCount: bigint;
};

declare type ManifestEntryType$Ergo$DgDataPolicy_2 = {
    policyLink: ErgoRelativeDelegateLink_2;
    idPrefix: string;
    refCount: bigint;
};

declare type ManifestEntryType$Ergo$DgDataPolicy_3 = {
    policyLink: ErgoRelativeDelegateLink_3;
    idPrefix: string;
    refCount: bigint;
};

/**
 * ManifestEntryType enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the ManifestEntryType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestEntryTypeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type ManifestEntryType = {
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$DgDataPolicy;
} | {
    DelegateThreads: ManifestEntryType$DelegateThreads;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
};

/**
 * ManifestEntryType enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the ManifestEntryType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestEntryTypeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type ManifestEntryType_2 = {
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$DgDataPolicy_2;
} | {
    DelegateThreads: ManifestEntryType$DelegateThreads_2;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
};

/**
 * ManifestEntryType enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **5 variant(s)** of the ManifestEntryType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestEntryTypeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type ManifestEntryType_3 = {
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$DgDataPolicy_3;
} | {
    DelegateThreads: ManifestEntryType$DelegateThreads_3;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
};

/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 */
declare class ManifestEntryTypeHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike | {
        policyLink: RelativeDelegateLinkLike;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike | {
        role: DelegateRoleLike;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 */
declare class ManifestEntryTypeHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType_2, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike_2;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike_2;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike_2 | {
        policyLink: RelativeDelegateLinkLike_2;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike_2 | {
        role: DelegateRoleLike_2;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 */
declare class ManifestEntryTypeHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType_3, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike_3;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike_3;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike_3 | {
        policyLink: RelativeDelegateLinkLike_4;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike_3 | {
        role: DelegateRoleLike_3;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}

/**
 * ManifestEntryType enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **5 variant(s)** of the ManifestEntryType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestEntryTypeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type ManifestEntryTypeLike = IntersectedEnum<{
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$DgDataPolicyLike;
} | {
    DelegateThreads: ManifestEntryType$DelegateThreadsLike;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
}>;

/**
 * ManifestEntryType enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **5 variant(s)** of the ManifestEntryType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestEntryTypeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type ManifestEntryTypeLike_2 = IntersectedEnum<{
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$DgDataPolicyLike_2;
} | {
    DelegateThreads: ManifestEntryType$DelegateThreadsLike_2;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
}>;

/**
 * ManifestEntryType enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **5 variant(s)** of the ManifestEntryType enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `ManifestEntryTypeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type ManifestEntryTypeLike_3 = IntersectedEnum<{
    NamedTokenRef: tagOnly;
} | {
    DgDataPolicy: ManifestEntryType$DgDataPolicyLike_3;
} | {
    DelegateThreads: ManifestEntryType$DelegateThreadsLike_3;
} | {
    MerkleMembership: tagOnly;
} | {
    MerkleStateRoot: tagOnly;
}>;

/**
 * Schema for initial setup of Charter Datum - state stored in the Leader contract
 * together with its primary or "charter" utxo.  Converted from this convenient form
 * to the on-chain form during mkTxnMintCharterToken().
 * @public
 **/
declare interface MinimalCharterDataArgs extends configBaseWithRev {
    spendDelegateLink: OffchainPartialDelegateLink;
    spendInvariants: OffchainPartialDelegateLink[];
    otherNamedDelegates: Map<string, OffchainPartialDelegateLink>;
    mintDelegateLink: OffchainPartialDelegateLink;
    mintInvariants: OffchainPartialDelegateLink[];
    govAuthorityLink: OffchainPartialDelegateLink;
    manifest: Map<string, OffchainPartialDelegateLink>;
}

/**
 * for a delegated-data record type, omits the id and type fields to indicate
 * the minimal fields needed for records of that type
 * @public
 */
declare type minimalData<T extends AnyDataTemplate<any, anyDatumProps>> = Omit<T, "id" | "type">;

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
declare type MinimalDelegateLink = Partial<OffchainPartialDelegateLink>;

/**
 * Delegate updates can, in an "escape hatch" scenario, be forced by sole authority
 * of the Capo's govAuthority.  While the normal path of update involves the existing
 * mint/spend delegate's involvement, a forced update can be used to bypass that route.
 * This provides that signal.
 * @public
 */
declare type MinimalDelegateUpdateLink = Omit<OffchainPartialDelegateLink, "uutName"> & {
    forcedUpdate?: true;
};

declare type minimalReqtData = minimalData<ReqtDataLike>;

declare type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};

declare type MinterActivity$CreatingNewSpendDelegate = {
    seed: TxOutputId;
    replacingUut: number[] | undefined;
};

declare type MinterActivity$CreatingNewSpendDelegateLike = {
    seed: TxOutputId | string;
    replacingUut: number[] | undefined;
};

declare type MinterActivity$Ergo$CreatingNewSpendDelegate = MinterActivity$CreatingNewSpendDelegate;

/**
 * MinterActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **6 variant(s)** of the MinterActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `MinterActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type MinterActivity = {
    mintingCharter: Address;
} | {
    mintWithDelegateAuthorizing: tagOnly;
} | {
    addingMintInvariant: TxOutputId;
} | {
    addingSpendInvariant: TxOutputId;
} | {
    forcingNewMintDelegate: TxOutputId;
} | {
    CreatingNewSpendDelegate: MinterActivity$CreatingNewSpendDelegate;
};

/**
 * Helper class for generating UplcData for variants of the ***MinterActivity*** enum type.
 * @public
 */
declare class MinterActivityHelper extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<MinterActivity, Partial<{
        mintingCharter: Address | string;
        mintWithDelegateAuthorizing: tagOnly;
        addingMintInvariant: TxOutputId | string;
        addingSpendInvariant: TxOutputId | string;
        forcingNewMintDelegate: TxOutputId | string;
        CreatingNewSpendDelegate: MinterActivity$CreatingNewSpendDelegateLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.mintingCharter"***
     */
    mintingCharter(owner: Address | string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoMintHelpers::MinterActivity.mintWithDelegateAuthorizing"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get mintWithDelegateAuthorizing(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingMintInvariant"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$addingMintInvariant}` variant of this activity instead
     *
     */
    addingMintInvariant(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingMintInvariant"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$addingMintInvariant`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$addingMintInvariant(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingSpendInvariant"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$addingSpendInvariant}` variant of this activity instead
     *
     */
    addingSpendInvariant(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingSpendInvariant"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$addingSpendInvariant`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$addingSpendInvariant(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.forcingNewMintDelegate"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$forcingNewMintDelegate}` variant of this activity instead
     *
     */
    forcingNewMintDelegate(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.forcingNewMintDelegate"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$forcingNewMintDelegate`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$forcingNewMintDelegate(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingNewSpendDelegate(value: hasSeed, fields: {
        replacingUut: number[] | undefined;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    CreatingNewSpendDelegate(fields: MinterActivity$CreatingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        replacingUut: number[] | undefined;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***,
     * @param fields - \{ replacingUut: number[] | undefined \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$CreatingNewSpendDelegate({ replacingUut })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingNewSpendDelegate: (fields: {
        replacingUut: number[] | undefined;
    }) => SeedActivity<(value: hasSeed, fields: {
        replacingUut: number[] | undefined;
    }) => isActivity>;
}

/**
 * charter-minting interface
 * @public
 */
declare interface MinterBaseMethods {
    get mintingPolicyHash(): MintingPolicyHashLike;
    txnMintingCharter<TCX extends StellarTxnContext>(tcx: TCX, charterMintArgs: {
        owner: Address;
        capoGov: UutName;
    }, tVal: valuesEntry): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], delegate: BasicMintDelegate, redeemer: isActivity): Promise<TCX>;
}

/**
 * MintingActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the MintingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `MintingActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type MintingActivity = {
    _placeholder1MA: TxOutputId;
};

/**
 * MintingActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the MintingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `MintingActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type MintingActivity_2 = {
    CreatingRecord: TxOutputId;
};

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 */
declare class MintingActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1MA: TxOutputId;
    }, Partial<{
        _placeholder1MA: TxOutputId | string;
    }>>;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$_placeholder1MA}` variant of this activity instead
     *
     */
    _placeholder1MA(thingWithSeed: hasSeed | TxOutputId | string): UplcData;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$_placeholder1MA`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$_placeholder1MA(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 */
declare class MintingActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        CreatingRecord: TxOutputId;
    }, Partial<{
        CreatingRecord: TxOutputId | string;
    }>>;
    /**
     * generates  UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$CreatingRecord}` variant of this activity instead
     *
     */
    CreatingRecord(thingWithSeed: hasSeed | TxOutputId | string): UplcData;
    /**
     * generates  UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$CreatingRecord`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$CreatingRecord(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 */
declare class MintingActivityHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1MA: TxOutputId;
    }, Partial<{
        _placeholder1MA: TxOutputId | string;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$_placeholder1MA}` variant of this activity instead
     *
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    _placeholder1MA(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$_placeholder1MA`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    get $seeded$_placeholder1MA(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 */
declare class MintingActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        CreatingRecord: TxOutputId;
    }, Partial<{
        CreatingRecord: TxOutputId | string;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see the {@link hasSeed} type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$CreatingRecord}` variant of this activity instead
     *
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingRecord(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * ## Usage
     * Access the activity-creator as a getter: `$seeded$CreatingRecord`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    get $seeded$CreatingRecord(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
}

/**
 * MintingActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **1 variant(s)** of the MintingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `MintingActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type MintingActivityLike = IntersectedEnum<{
    _placeholder1MA: /* implied wrapper { seed: ... } for singleVariantField */ TxOutputId | string;
}>;

/**
 * MintingActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **1 variant(s)** of the MintingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `MintingActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type MintingActivityLike_2 = IntersectedEnum<{
    CreatingRecord: /* implied wrapper { seed: ... } for singleVariantField */ TxOutputId | string;
}>;

declare type MintTokensParams = [
MintUnsafeParams[0],
MintUnsafeParams[1],
    {
    redeemer: MintUnsafeParams[2];
}
];

declare type MintUnsafeParams = Parameters<TxBuilder["mintPolicyTokensUnsafe"]>;

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
declare type MintUutActivityArgs = {
    seed: TxOutputId;
    purposes: string[];
};

/**
 * @public
 */
declare type MultiTxnCallback = ((futTx: TxDescription<any>) => void) | ((futTx: TxDescription<any>) => Promise<void>) | ((futTx: TxDescription<any>) => StellarTxnContext<any> | false) | ((futTx: TxDescription<any>) => Promise<StellarTxnContext<any> | false>);

declare type mustFindActivityType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = CBT["activity"];

declare type mustFindConcreteContractBridgeType<T extends canHaveDataBridge, bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass ? T["dataBridgeClass"] : never, instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge ? InstanceType<bridgeClassMaybe> : StellarContract<any> extends T ? any : never> = instanceMaybe;

declare type mustFindDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = CBT["datum"];

declare type mustFindReadDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = undefined extends CBT["datum"] ? never : undefined extends CBT["readDatum"] ? never : CBT["readDatum"];

/**
 * @public
 */
declare type NamedPolicyCreationOptions<thisType extends Capo<any>, DT extends StellarDelegate> = PolicyCreationOptions & {
    /**
     * Optional name for the UUT; uses the delegate name if not provided.
     **/
    uutName?: string;
};

declare type NetworkContext<NWT extends CardanoClient = CardanoClient> = {
    network: NWT;
};

declare type NetworkName = "testnet" | "mainnet";

/**
 * Captures details from emulated network, to be used for quickly restoring a network state.
 * @alpha
 */
declare type NetworkSnapshot = {
    seed: number;
    netNumber: number;
    name: string;
    slot: number;
    genesis: EmulatorGenesisTx[];
    blocks: EmulatorTx[][];
    allUtxos: Record<string, TxInput>;
    consumedUtxos: Set<string>;
    addressUtxos: Record<string, TxInput[]>;
};

/**
 * @public
 */
declare type NormalDelegateSetup = {
    usingSeedUtxo?: TxInput | undefined;
    additionalMintValues?: valuesEntry[];
    skipDelegateReturn?: true;
    mintDelegateActivity: isActivity;
};

/**
 * Minimal structure for connecting a specific Capo contract to a configured StellarDelegate
 * @remarks
 *
 * This structure can always resolve to a reproducible delegate class (a {@link StellarDelegate}),
 * given a specific Capo and roleName.
 *
 * When the delegate isn't backed by a specific on-chain contract script, the delegateValidatorHash
 * is optional.
 *
 * Use Capo mkDelegateLink(x: OffchainRelativeDelegateLink) to
 * convert this data for on-chain use in the Capo's charter data structure
 *
 * @typeParam DT - the base class, to which all role-strategy variants conform
 * @public
 **/
declare type OffchainPartialDelegateLink = {
    uutName?: string;
    config: Partial<capoDelegateConfig>;
    delegateValidatorHash?: ValidatorHash;
};

declare type PartialParamConfig<CT extends configBaseWithRev> = Partial<CT>;

/**
 * @public
 */
declare type PartialReader = Pick<UnspecializedDelegateBridgeReader, "DelegateRole" | "ManifestActivity" | "CapoLifecycleActivity" | "DelegateLifecycleActivity" | "DelegationDetail">;

/**
 * PendingCharterChange enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **2 variant(s)** of the PendingCharterChange enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingCharterChangeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type PendingCharterChange = {
    delegateChange: PendingDelegateChange;
} | {
    otherManifestChange: tagOnly;
};

/**
 * PendingCharterChange enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **2 variant(s)** of the PendingCharterChange enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingCharterChangeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type PendingCharterChange_2 = {
    delegateChange: PendingDelegateChange_2;
} | {
    otherManifestChange: tagOnly;
};

/**
 * PendingCharterChange enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **2 variant(s)** of the PendingCharterChange enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingCharterChangeHelper` class
 *     for generating UPLC data for this enum type
 */
declare type PendingCharterChange_3 = {
    delegateChange: PendingDelegateChange_3;
} | {
    otherManifestChange: tagOnly;
};

/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 */
declare class PendingCharterChangeHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange, Partial<{
        delegateChange: PendingDelegateChangeLike;
        otherManifestChange: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike | {
        action: PendingDelegateActionLike;
        role: DelegateRoleLike;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get otherManifestChange(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 */
declare class PendingCharterChangeHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange_2, Partial<{
        delegateChange: PendingDelegateChangeLike_2;
        otherManifestChange: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike_2 | {
        action: PendingDelegateActionLike_2;
        role: DelegateRoleLike_2;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike_2 | undefined;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get otherManifestChange(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 */
declare class PendingCharterChangeHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange_3, Partial<{
        delegateChange: PendingDelegateChangeLike_3;
        otherManifestChange: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike_3 | {
        action: PendingDelegateActionLike_3;
        role: DelegateRoleLike_3;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike_4 | undefined;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get otherManifestChange(): UplcData;
}

/**
 * PendingCharterChange enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **2 variant(s)** of the PendingCharterChange enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingCharterChangeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type PendingCharterChangeLike = IntersectedEnum<{
    delegateChange: PendingDelegateChangeLike;
} | {
    otherManifestChange: tagOnly;
}>;

/**
 * PendingCharterChange enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **2 variant(s)** of the PendingCharterChange enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingCharterChangeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type PendingCharterChangeLike_2 = IntersectedEnum<{
    delegateChange: PendingDelegateChangeLike_2;
} | {
    otherManifestChange: tagOnly;
}>;

/**
 * PendingCharterChange enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **2 variant(s)** of the PendingCharterChange enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingCharterChangeHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type PendingCharterChangeLike_3 = IntersectedEnum<{
    delegateChange: PendingDelegateChangeLike_3;
} | {
    otherManifestChange: tagOnly;
}>;

declare type PendingDelegateAction$Add = {
    seed: TxOutputId;
    purpose: string;
    idPrefix: string;
};

declare type PendingDelegateAction$Add_2 = {
    seed: TxOutputId;
    purpose: string;
    idPrefix: string;
};

declare type PendingDelegateAction$Add_3 = {
    seed: TxOutputId;
    purpose: string;
    idPrefix: string;
};

declare type PendingDelegateAction$AddLike = {
    seed: TxOutputId | string;
    purpose: string;
    idPrefix: string;
};

declare type PendingDelegateAction$AddLike_2 = {
    seed: TxOutputId | string;
    purpose: string;
    idPrefix: string;
};

declare type PendingDelegateAction$AddLike_3 = {
    seed: TxOutputId | string;
    purpose: string;
    idPrefix: string;
};

declare type PendingDelegateAction$Ergo$Add = PendingDelegateAction$Add;

declare type PendingDelegateAction$Ergo$Add_2 = PendingDelegateAction$Add_2;

declare type PendingDelegateAction$Ergo$Add_3 = PendingDelegateAction$Add_3;

declare type PendingDelegateAction$Ergo$Replace = PendingDelegateAction$Replace;

declare type PendingDelegateAction$Ergo$Replace_2 = PendingDelegateAction$Replace_2;

declare type PendingDelegateAction$Ergo$Replace_3 = PendingDelegateAction$Replace_3;

declare type PendingDelegateAction$Replace = {
    seed: TxOutputId;
    purpose: string;
    idPrefix: string;
    replacesDgt: AssetClass;
};

declare type PendingDelegateAction$Replace_2 = {
    seed: TxOutputId;
    purpose: string;
    idPrefix: string;
    replacesDgt: AssetClass;
};

declare type PendingDelegateAction$Replace_3 = {
    seed: TxOutputId;
    purpose: string;
    idPrefix: string;
    replacesDgt: AssetClass;
};

declare type PendingDelegateAction$ReplaceLike = {
    seed: TxOutputId | string;
    purpose: string;
    idPrefix: string;
    replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
        mph: MintingPolicyHash | string | number[];
        tokenName: string | number[];
    };
};

declare type PendingDelegateAction$ReplaceLike_2 = {
    seed: TxOutputId | string;
    purpose: string;
    idPrefix: string;
    replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
        mph: MintingPolicyHash | string | number[];
        tokenName: string | number[];
    };
};

declare type PendingDelegateAction$ReplaceLike_3 = {
    seed: TxOutputId | string;
    purpose: string;
    idPrefix: string;
    replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
        mph: MintingPolicyHash | string | number[];
        tokenName: string | number[];
    };
};

/**
 * PendingDelegateAction enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the PendingDelegateAction enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingDelegateActionHelper` class
 *     for generating UPLC data for this enum type
 */
declare type PendingDelegateAction = {
    Add: PendingDelegateAction$Add;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$Replace;
};

/**
 * PendingDelegateAction enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the PendingDelegateAction enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingDelegateActionHelper` class
 *     for generating UPLC data for this enum type
 */
declare type PendingDelegateAction_2 = {
    Add: PendingDelegateAction$Add_2;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$Replace_2;
};

/**
 * PendingDelegateAction enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **3 variant(s)** of the PendingDelegateAction enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingDelegateActionHelper` class
 *     for generating UPLC data for this enum type
 */
declare type PendingDelegateAction_3 = {
    Add: PendingDelegateAction$Add_3;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$Replace_3;
};

/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 */
declare class PendingDelegateActionHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction, Partial<{
        Add: PendingDelegateAction$AddLike;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 */
declare class PendingDelegateActionHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction_2, Partial<{
        Add: PendingDelegateAction$AddLike_2;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 */
declare class PendingDelegateActionHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction_3, Partial<{
        Add: PendingDelegateAction$AddLike_3;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
     * ### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * ## Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}

/**
 * PendingDelegateAction enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the PendingDelegateAction enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingDelegateActionHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type PendingDelegateActionLike = IntersectedEnum<{
    Add: PendingDelegateAction$AddLike;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$ReplaceLike;
}>;

/**
 * PendingDelegateAction enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the PendingDelegateAction enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingDelegateActionHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type PendingDelegateActionLike_2 = IntersectedEnum<{
    Add: PendingDelegateAction$AddLike_2;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$ReplaceLike_2;
}>;

/**
 * PendingDelegateAction enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **3 variant(s)** of the PendingDelegateAction enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `PendingDelegateActionHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type PendingDelegateActionLike_3 = IntersectedEnum<{
    Add: PendingDelegateAction$AddLike_3;
} | {
    Remove: tagOnly;
} | {
    Replace: PendingDelegateAction$ReplaceLike_3;
}>;

declare type PendingDelegateChange = {
    action: PendingDelegateAction;
    role: DelegateRole;
    dgtLink: /*minStructField*/ RelativeDelegateLink | undefined;
};

declare type PendingDelegateChange_2 = {
    action: PendingDelegateAction_2;
    role: DelegateRole_2;
    dgtLink: /*minStructField*/ RelativeDelegateLink_2 | undefined;
};

declare type PendingDelegateChange_3 = {
    action: PendingDelegateAction_3;
    role: DelegateRole_3;
    dgtLink: /*minStructField*/ RelativeDelegateLink_4 | undefined;
};

declare type PendingDelegateChangeLike = {
    action: PendingDelegateActionLike;
    role: DelegateRoleLike;
    dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
};

declare type PendingDelegateChangeLike_2 = {
    action: PendingDelegateActionLike_2;
    role: DelegateRoleLike_2;
    dgtLink: /*minStructField*/ RelativeDelegateLinkLike_2 | undefined;
};

declare type PendingDelegateChangeLike_3 = {
    action: PendingDelegateActionLike_3;
    role: DelegateRoleLike_3;
    dgtLink: /*minStructField*/ RelativeDelegateLinkLike_4 | undefined;
};

declare type PolicyCreationOptions = MinimalDelegateLink & {
    /**
     * details for creating the delegate
     */
    mintSetup: NormalDelegateSetup | DelegateSetupWithoutMintDelegate;
    /**
     * Installs the named delegate without burning the existing UUT for this delegate.
     * That UUT may become lost and inaccessible, along with any of its minUtxo.
     **/
    forcedUpdate?: true;
};

declare type possiblyAbstractContractBridgeType<T extends canHaveDataBridge, bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass ? T["dataBridgeClass"] : T["dataBridgeClass"] extends undefined ? never : abstractContractBridgeClass, instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge ? InstanceType<bridgeClassMaybe> : //???                                  vvvvvvvvv
ContractDataBridge & InstanceType<bridgeClassMaybe>> = instanceMaybe;

/**
 * @public
 */
declare type PreconfiguredDelegate<T extends StellarDelegate> = Omit<ConfiguredDelegate<T>, "delegate" | "delegateValidatorHash">;

declare type readsUplcData<canonicalType> = (x: UplcData) => canonicalType;

declare type readsUplcTo<T> = (d: UplcData) => T;

declare type RelativeDelegateLink = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | undefined;
    config: number[];
};

declare type RelativeDelegateLink_2 = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | undefined;
    config: number[];
};

declare type RelativeDelegateLink_3 = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | undefined;
    config: number[];
};

declare type RelativeDelegateLink_4 = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | undefined;
    config: number[];
};

declare type RelativeDelegateLinkLike = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
    config: number[];
};

declare type RelativeDelegateLinkLike_2 = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
    config: number[];
};

declare type RelativeDelegateLinkLike_3 = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
    config: number[];
};

declare type RelativeDelegateLinkLike_4 = {
    uutName: string;
    delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
    config: number[];
};

declare type ReqtData = {
    id: number[];
    type: string;
    category: string;
    name: string;
    image: string;
    description: string;
    mustFreshenBy: number;
    target: number[];
    purpose: string;
    details: Array<string>;
    mech: Array<string>;
    impl: string;
    requires: Array<string>;
};

declare type ReqtDataLike = {
    id: number[];
    type: string;
    category: string;
    name: string;
    image: string;
    description: string;
    mustFreshenBy: TimeLike;
    target: number[];
    purpose: string;
    details: Array<string>;
    mech: Array<string>;
    impl: string;
    requires: Array<string>;
};

/**
 * This concrete bundle for Reqts presumes use in a basic Capo bundle,
 * and provides type-generation for the Reqts module.  It can be used as is
 * if you have no separate Capo or need to share the ReqtsData types with
 * other scripts in your smart contract.
 */
declare class ReqtsConcreteBundle extends CapoDelegateBundle {
}

declare class ReqtsController extends DelegatedDataContract<ReqtData, ReqtDataLike> {
    dataBridgeClass: typeof ReqtsPolicyDataBridge;
    dgDatumHelper: DelegateDatumHelper_2;
    get delegateName(): string;
    get capo(): Capo<any>;
    get idPrefix(): string;
    get recordTypeName(): string;
    exampleData(): minimalReqtData;
    scriptBundle(): ReqtsConcreteBundle;
    activityCreatingReqt(seedFrom: hasSeed): isActivity_2;
    activityUpdatingReqt(id: any): isActivity_2;
    activityCreatingRequirement(seedFrom: hasSeed): isActivity_2;
    txnCreatingReqt<TCX extends StellarTxnContext & hasSeedUtxo & hasSettingsRef & hasUutContext<"reqt">>(tcx: TCX, reqt: ReqtDataLike, initialStake: bigint): Promise<TCX>;
    txnUpdateReqt(tcx: hasSettingsRef & hasSeedUtxo, reqtDetails: FoundDatumUtxo<ErgoReqtData>, newDepositIncrement: bigint, // can be positive or negative
    newDatum?: any): Promise<hasSettingsRef & hasSeedUtxo>;
    requirements(): ReqtsMap<"stores requirements connected to any target object" | "the target object can gradually adopt further requirements as needed", never>;
}

/**
 * Describes the requirements for a unit of software
 * @remarks
 *
 * A requirements map is a list of described requirements, in which each requirement
 * has a synopsis, a description of its purpose, descriptive detail, and technical requirements
 * for the mechanism used for implementation.  The mech strings should be usable as unit-test titles.
 *
 * use the hasReqts() helper method to declare a type-safe set of requirements following this data structure.
 *
 * Each requirement also has space for nested 'requires', without the need for deeply nested data structures;
 * these reference other requirements in the same hasReqts() data structure. As a result, high-level and detail-
 * level requirements and 'impl' details can have progressive levels of detail.
 *
 * @typeParam reqts - the list of known requirement names.  Implicitly detected by the hasReqts() helper.
 * @public
 **/
declare type ReqtsMap_2<validReqts extends string, inheritedNames extends string | never = never> = {
    [reqtDescription in validReqts]: TODO_TYPE | RequirementEntry<reqtDescription, validReqts, inheritedNames>;
};

/**
 * GENERATED data bridge for **BasicDelegate** script (defined in class ***ReqtsConcreteBundle***)
 * main: **src/delegation/BasicDelegate.hl**, project: **stellar-contracts**
 * @remarks - note that you may override `get dataBridgeName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class ReqtsPolicyDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (DelegateDatum)***
     * for this contract script.
     */
    datum: DelegateDatumHelper_2;
    /**
     * this is the specific type of datum for the `BasicDelegate` script
     */
    DelegateDatum: DelegateDatumHelper_2;
    readDatum: (d: UplcData) => ErgoDelegateDatum_2;
    /**
     * generates UplcData for the activity type (***DelegateActivity***) for the `BasicDelegate` script
     */
    activity: DelegateActivityHelper_2;
    DelegateActivity: DelegateActivityHelper_2;
    reader: ReqtsPolicyDataBridgeReader;
    /**
     * accessors for all the types defined in the `BasicDelegate` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateDatum*** for the `BasicDelegate` script
         */
        DelegateDatum: DelegateDatumHelper_2;
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `BasicDelegate` script
         */
        DelegateRole: DelegateRoleHelper_3;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `BasicDelegate` script
         */
        ManifestActivity: ManifestActivityHelper_3;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `BasicDelegate` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper_3;
        /**
         * generates UplcData for the enum type ***DelegateLifecycleActivity*** for the `BasicDelegate` script
         */
        DelegateLifecycleActivity: DelegateLifecycleActivityHelper_2;
        /**
         * generates UplcData for the enum type ***SpendingActivity*** for the `BasicDelegate` script
         */
        SpendingActivity: SpendingActivityHelper_2;
        /**
         * generates UplcData for the enum type ***MintingActivity*** for the `BasicDelegate` script
         */
        MintingActivity: MintingActivityHelper_2;
        /**
         * generates UplcData for the enum type ***BurningActivity*** for the `BasicDelegate` script
         */
        BurningActivity: BurningActivityHelper_2;
        /**
         * generates UplcData for the enum type ***DelegateActivity*** for the `BasicDelegate` script
         */
        DelegateActivity: DelegateActivityHelper_2;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `BasicDelegate` script
         */
        PendingDelegateAction: PendingDelegateActionHelper_3;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `BasicDelegate` script
         */
        ManifestEntryType: ManifestEntryTypeHelper_3;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `BasicDelegate` script
         */
        PendingCharterChange: PendingCharterChangeHelper_3;
        /**
         * generates UplcData for the enum type ***cctx_CharterInputType*** for the `BasicDelegate` script
         */
        cctx_CharterInputType: cctx_CharterInputTypeHelper_2;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `BasicDelegate` script
         */
        AnyData: (fields: AnyDataLike_3 | {
            id: number[];
            type: string;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***DelegationDetail*** for the `BasicDelegate` script
         */
        DelegationDetail: (fields: DelegationDetailLike_2 | {
            capoAddr: /*minStructField*/ Address | string;
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            tn: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***ReqtData*** for the `BasicDelegate` script
         */
        ReqtData: (fields: ReqtDataLike | {
            id: number[];
            type: string;
            category: string;
            name: string;
            image: string;
            description: string;
            mustFreshenBy: TimeLike_2;
            target: number[];
            purpose: string;
            details: Array<string>;
            mech: Array<string>;
            impl: string;
            requires: Array<string>;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `BasicDelegate` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike_4 | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `BasicDelegate` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike_3 | {
            action: PendingDelegateActionLike_3;
            role: DelegateRoleLike_3;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike_4 | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `BasicDelegate` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike_3 | {
            entryType: ManifestEntryTypeLike_3;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoCtx*** for the `BasicDelegate` script
         */
        CapoCtx: (fields: CapoCtxLike_2 | {
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            charter: cctx_CharterInputTypeLike_2;
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData_3, AnyDataLike_3>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺDelegationDetailCast: Cast<DelegationDetail_3, DelegationDetailLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺReqtDataCast: Cast<ReqtData, ReqtDataLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_4, RelativeDelegateLinkLike_4>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange_3, PendingDelegateChangeLike_3>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry_3, CapoManifestEntryLike_3>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoCtxCast: Cast<CapoCtx_2, CapoCtxLike_2>;
}

declare class ReqtsPolicyDataBridgeReader extends DataBridgeReaderClass {
    bridge: ReqtsPolicyDataBridge;
    constructor(bridge: ReqtsPolicyDataBridge);
    datum: (d: UplcData) => Partial<{
        Cip68RefToken: DelegateDatum$Ergo$Cip68RefToken_2;
        IsDelegation: ErgoDelegationDetail_2;
        capoStoredData: DelegateDatum$Ergo$capoStoredData_2;
    }>;
    /**
     * reads UplcData *known to fit the **DelegateDatum*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateDatum(d: UplcData): ErgoDelegateDatum_2;
    /**
     * reads UplcData *known to fit the **DelegateRole*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateRole(d: UplcData): ErgoDelegateRole_3;
    /**
     * reads UplcData *known to fit the **ManifestActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestActivity(d: UplcData): ErgoManifestActivity_3;
    /**
     * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity_3;
    /**
     * reads UplcData *known to fit the **DelegateLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateLifecycleActivity(d: UplcData): ErgoDelegateLifecycleActivity_2;
    /**
     * reads UplcData *known to fit the **SpendingActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    SpendingActivity(d: UplcData): ErgoSpendingActivity_2;
    /**
     * reads UplcData *known to fit the **MintingActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    MintingActivity(d: UplcData): ErgoMintingActivity_2;
    /**
     * reads UplcData *known to fit the **BurningActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    BurningActivity(d: UplcData): ErgoBurningActivity_2;
    /**
     * reads UplcData *known to fit the **DelegateActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateActivity(d: UplcData): ErgoDelegateActivity_2;
    /**
     * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction_3;
    /**
     * reads UplcData *known to fit the **ManifestEntryType*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType_3;
    /**
     * reads UplcData *known to fit the **PendingCharterChange*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange_3;
    /**
     * reads UplcData *known to fit the **cctx_CharterInputType*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    cctx_CharterInputType(d: UplcData): Ergocctx_CharterInputType_2;
    /**
     * reads UplcData *known to fit the **AnyData*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    AnyData(d: UplcData): AnyData_3;
    /**
     * reads UplcData *known to fit the **DelegationDetail*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegationDetail(d: UplcData): DelegationDetail_3;
    /**
     * reads UplcData *known to fit the **ReqtData*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ReqtData(d: UplcData): ReqtData;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_4;
    /**
     * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateChange(d: UplcData): PendingDelegateChange_3;
    /**
     * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoManifestEntry(d: UplcData): CapoManifestEntry_3;
    /**
     * reads UplcData *known to fit the **CapoCtx*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoCtx(d: UplcData): CapoCtx_2;
}

/**
 * Documents one specific requirement
 * @remarks
 *
 * Describes the purpose, details, and implementation mechanism for a single requirement for a unit of software.
 *
 * Also references any other requirements in the host ReqtsMap structure, whose behavior this requirement
 * depends on.  The details of those other dependencies, are delegated entirely to the other requirement, facilitating
 * narrowly-focused capture of for key expectations within each individual semantic expectation of a software unit's
 * behavior.
 *
 * if there are inherited requirements, dependencies on them can be expressed in the `requiresInherited` field.
 *
 * @typeParam reqts - constrains `requires` entries to the list of requirements in the host ReqtsMap structure
 * @public
 **/
declare type RequirementEntry<reqtName extends string, reqts extends string, inheritedNames extends string | never> = {
    purpose: string;
    details: string[];
    mech: string[];
    impl?: string;
    requires?: reqtName extends inheritedNames ? inheritedNames[] : Exclude<reqts, reqtName | inheritedNames>[];
    requiresInherited?: inheritedNames[];
};

declare type ReversedAllOfUnion<Union> = [Union] extends [never] ? [] : [
ExtractLastOfUnion<Union>,
...ReversedAllOfUnion<ExtractRestOfUnion<Union>>
];

declare type ReverseTuple<T extends any[]> = T extends [infer A, ...infer B] ? [...ReverseTuple<B>, A] : [];

/**
 * @public
 */
declare type rootCapoConfig = {
    rootCapoScriptHash?: ValidatorHash;
};

declare type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint" | "non-script";

/**
 * @public
 */
declare class SeedActivity<FactoryFunc extends seedActivityFunc<any, any>> {
    private host;
    private factoryFunc;
    arg: SeedActivityArg<FactoryFunc>;
    constructor(host: {
        getSeed(x: hasSeed): TxOutputId;
    }, factoryFunc: FactoryFunc, arg: SeedActivityArg<FactoryFunc>);
    mkRedeemer(seedFrom: hasSeed): any;
}

/**
 * @internal
 */
declare type SeedActivityArg<SA extends seedFunc<any, any>> = SA extends seedFunc<SA, infer ARG, infer RV> ? ARG : never;

/**
 * @public
 */
declare type seedActivityFunc<ARGS extends [...any] | never, RV extends isActivity | UplcData | TypeError_2<any>> = IFISNEVER<ARGS, (seed: hasSeed) => RV, (seed: hasSeed, ...args: ARGS) => RV>;

/**
 * @public
 */
declare type SeedAttrs = {
    txId: TxId;
    idx: bigint;
};

declare type seedFunc<F extends ((seed: hasSeed, arg: any) => any) | ((seed: hasSeed) => any), ARG extends (F extends (seed: hasSeed) => any ? never : F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never) = F extends (seed: hasSeed) => any ? never : F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never, RV extends ReturnType<F> = ReturnType<F>> = IFISNEVER<ARG, seedActivityFunc<never, RV>, seedActivityFunc<[ARG], RV>>;

/**
 * details of seed transaction
 * @remarks
 * Provides attribute names used for parameterizing scripts
 * based on the "seed-txn" pattern for guaranteed uniqueness.
 *
 * Note that when minting UUTs based on the same pattern,
 * these attribute names are not used.  See {@link UutName} and {@link Capo}
 * for more.
 *
 * @public
 **/
declare type SeedTxnScriptParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

/**
 * standard setup for any Stellar Contract class
 * @public
 **/
declare type SetupDetails = {
    network: CardanoClient | Emulator;
    networkParams: NetworkParams;
    isMainnet?: boolean;
    actorContext: ActorContext;
    isTest?: boolean;
    uh?: UtxoHelper;
    optimize?: boolean;
    uxtoDisplayCache?: UtxoDisplayCache;
};

/**
 * This wallet only has a single private/public key, which isn't rotated. Staking is not yet supported.
 */
declare class SimpleWallet_stellar implements Wallet {
    #private;
    spendingPrivateKey: Bip32PrivateKey;
    spendingPubKey: PubKey;
    stakingPrivateKey: Bip32PrivateKey | undefined;
    stakingPubKey: PubKey | undefined;
    get cardanoClient(): CardanoClient;
    static fromPhrase(phrase: string[], networkCtx: NetworkContext, dict?: string[]): SimpleWallet_stellar;
    static fromRootPrivateKey(key: RootPrivateKey, networkCtx: NetworkContext): SimpleWallet_stellar;
    constructor(networkCtx: NetworkContext, spendingPrivateKey: Bip32PrivateKey, stakingPrivateKey?: Bip32PrivateKey | undefined);
    get privateKey(): Bip32PrivateKey;
    get pubKey(): PubKey;
    get spendingPubKeyHash(): PubKeyHash;
    get stakingPubKeyHash(): PubKeyHash | undefined;
    get address(): ShelleyAddress<PubKeyHash>;
    get stakingAddress(): StakingAddress<PubKeyHash> | undefined;
    get stakingAddresses(): Promise<StakingAddress[]>;
    isMainnet(): Promise<boolean>;
    /**
     * Assumed wallet was initiated with at least 1 UTxO at the pubkeyhash address.
     */
    get usedAddresses(): Promise<ShelleyAddress<PubKeyHash>[]>;
    get unusedAddresses(): Promise<ShelleyAddress<PubKeyHash>[]>;
    get utxos(): Promise<TxInput<PubKeyHash>[]>;
    get collateral(): Promise<TxInput<PubKeyHash>[]>;
    /**
     * Not yet implemented.
     */
    signData(addr: Address, message: number[]): Promise<Signature>;
    /**
     * Simply assumed the tx needs to by signed by this wallet without checking.
     */
    signTx(tx: Tx): Promise<Signature[]>;
    submitTx(tx: Tx): Promise<TxId>;
}

declare type someContractBridgeClass = AbstractNew<ContractDataBridge>;

declare type someContractBridgeType = ContractDataBridge;

/**
 * abstract interface for activity-helpers
 * @public
 */
declare type SomeDgtActivityHelper = EnumBridge<isActivity> & Pick<DelegateActivityHelper, "CapoLifecycleActivities" | "DelegateLifecycleActivities" | "CreatingDelegatedData" | "UpdatingDelegatedData" | "DeletingDelegatedData" | "MultipleDelegateActivities"> & {
    SpendingActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
    MintingActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
    BurningActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
};

/**
 * @public
 */
declare type SomeDgtBridgeReader = DataBridgeReaderClass & PartialReader & {
    bridge: GenericDelegateBridge;
    DelegateDatum(d: UplcData): unknown;
    SpendingActivity(d: UplcData): unknown;
    MintingActivity(d: UplcData): unknown;
    BurningActivity(d: UplcData): unknown;
    DelegateActivity(d: UplcData): unknown;
};

/**
 * @public
 */
declare type SomeDgtDatumHelper<T extends AnyDataTemplate<any, any>> = EnumBridge<JustAnEnum> & Pick<DelegateDatumHelper, "Cip68RefToken" | "IsDelegation"> & {
    capoStoredData(fields: {
        data: T;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
};

/**
 * SpendingActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the SpendingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `SpendingActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type SpendingActivity = {
    _placeholder1SA: number[];
};

/**
 * SpendingActivity enum variants
 *
 * @remarks - expresses the essential raw data structures
 * supporting the **1 variant(s)** of the SpendingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `SpendingActivityHelper` class
 *     for generating UPLC data for this enum type
 */
declare type SpendingActivity_2 = {
    UpdatingRecord: number[];
};

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 */
declare class SpendingActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1SA: number[];
    }, Partial<{
        _placeholder1SA: number[];
    }>>;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::SpendingActivity._placeholder1SA"***
     */
    _placeholder1SA(recId: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 */
declare class SpendingActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        UpdatingRecord: number[];
    }, Partial<{
        UpdatingRecord: number[];
    }>>;
    /**
     * generates  UplcData for ***"ReqtsData::SpendingActivity.UpdatingRecord"***
     */
    UpdatingRecord(id: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 */
declare class SpendingActivityHelperNested extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1SA: number[];
    }, Partial<{
        _placeholder1SA: number[];
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::SpendingActivity._placeholder1SA"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    _placeholder1SA(recId: number[]): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 */
declare class SpendingActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        UpdatingRecord: number[];
    }, Partial<{
        UpdatingRecord: number[];
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::SpendingActivity.UpdatingRecord"***
     * ## Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    UpdatingRecord(id: number[]): isActivity;
}

/**
 * SpendingActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **1 variant(s)** of the SpendingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `SpendingActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type SpendingActivityLike = IntersectedEnum<{
    _placeholder1SA: number[];
}>;

/**
 * SpendingActivity enum variants (permissive)
 *
 * @remarks - expresses the allowable data structure
 * for creating any of the **1 variant(s)** of the SpendingActivity enum type
 *
 * - **Note**: Stellar Contracts provides a higher-level `SpendingActivityHelper` class
 *     for generating UPLC data for this enum type
 *
 * ### Permissive Type
 * This is a permissive type that allows additional input data types, which are
 * converted by convention to the canonical types used in the on-chain context.
 */
declare type SpendingActivityLike_2 = IntersectedEnum<{
    UpdatingRecord: number[];
}>;

/**
 * Basic wrapper and off-chain facade for interacting with a single Plutus contract script
 * @remarks
 *
 * This class is normally used only for individual components of a higher-level {@link Capo | Capo or Leader contract},
 * which act as delegates within its application context.  Nonetheless, it is the base class for every Capo as well as
 * simpler contract scripts.
 *
 * The StellarContract class serves as an off-chain facade for transaction-building and interfacing to any on-chain
 * contract script.  Each StellarContract subclass must define a `contractSource()`, which is currently a Helios-language
 * script, compiled in any Javascript environment to an on-chain executable UPLC or "plutus core" form.  This enables
 * a static dApp to be self-sovereign, without need for any server ("application back-end") environment.
 *
 * @typeParam ConfigType - schema for the configuration needed for creating or reproducing a
 * specific instance of the contract script on-chain.
 *
 * @public
 **/
declare class StellarContract<ConfigType extends configBaseWithRev> {
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    contractParams?: UplcRecord<ConfigType>;
    setup: SetupDetails;
    network: CardanoClient | Emulator;
    networkParams: NetworkParams;
    actorContext: ActorContext<any>;
    static get defaultParams(): {};
    static parseConfig(rawJsonConfig: any): void;
    /** each StellarContracts subclass needs to provide a scriptBundle class.
     * @remarks
     * Your script bundle MUST be defined in a separate file using a convention of
     * `‹scriptName›.hlb.ts`, and exported as a default class.  It should inherit
     * from HeliosScriptBundle or one of its subclasses.  Stellar Contracts processes
     * this file, analyzes the on-chain types defined in your Helios sources, and generates
     * Typescript types and a data-bridging class for your script.
     *
     * Once the data-bridge class is generated, you should import it into your contract
     * module and assign it to your `dataBridgeClass` attribute.
     */
    scriptBundle(): HeliosScriptBundle;
    /**
     * the dataBridgeClass attribute MUST be defined for any bundle having a datum type
     *  - this is the bridge class for converting from off-chain data types to on-chain data
     *  - it provides convenient, type-safe interfaces for doing that
     *
     * @remarks
     * Minters don't have datum, so they don't need to define this attribute.  However,
     * note that ***mint delegates*** do in fact have datum types. If you are defining
     * a custom delegate of that kind, you will need to define this attribute.
     */
    dataBridgeClass: AbstractNew<ContractDataBridge> | undefined;
    /**
     * The `onchain` object provides access to all bridging capabilities for this contract script.
     * @remarks
     * Its nested attributes include:
     *  - `types` - a collection of all the on-chain types defined in the script, with data-creation helpers for each
     *  - `activity` - a creation helper for the activities/redeemers defined in the script
     *
     * Scripts that use datum types (not including minters) will also have:
     *  - `datum` - a data-creation helper for the datum type of the script
     *  - `readDatum` - a data-reading helper for the datum type of the script
     *
     * ### Low-level type access
     * For low-level access (it's likely you don't need to use this) for on-chain types, the `reader` attribute (aka `offchain`) exists: .
     *  - `reader` - a collection of data-reading helpers for the on-chain types, given UPLC data known to be of that type
     */
    get onchain(): possiblyAbstractContractBridgeType<this>;
    /**
     * The `offchain` object provides access to readers for the on-chain types of this contract script.
     * @remarks
     * Its nested attributes include all the on-chain types defined in the script, with data-reading helpers for each.
     * This is useful for reading on-chain data in off-chain code.
     *
     * ### Warning: low-level typed-data access!
     *
     * Note that these readers will work properly with UPLC data known to be of the correct type.  If you
     * encounter errors related to these results, it's likely you are using the wrong reader for the data you
     * have in hand.
     *
     * For the typical use-case of reading the datum type from a UTxO held in the contract, this is not a problem,
     * and note that the `readDatum` helper provides a shortcut for this most-common use-case.
     *
     * If you're not sure what you're doing, it's likely that this is not the right tool for your job.
     */
    get offchain(): possiblyAbstractContractBridgeType<this>["reader"];
    get reader(): possiblyAbstractContractBridgeType<this>["reader"];
    get activity(): any;
    /**
     * Converts UPLC from an on-chain datum object to a typed off-chain datum object.
     *
     * Given a **utxo with a datum of the contract's datum type**, this method will convert the UPLC datum
     * to a typed off-chain datum object.
     *
     * ### Standard WARNING
     *
     * If the datum's structure is not of the expected type, this method MAY throw an error, or it might
     * return data that can cause problems somewhere else in your code.  That won't happen if you're
     * following the guidance above.
     */
    get newReadDatum(): findReadDatumType<this>;
    _bundle: HeliosScriptBundle | undefined;
    getBundle(): HeliosScriptBundle;
    /**
     * Provides access to the script's activities with type-safe structures needed by the validator script.
     *
     * @remarks - the **redeemer** data (needed by the contract script) is defined as one or
     * more activity-types (e.g. in a struct, or an enum as indicated in the type of the last argument to
     * the validator function).
     *   - See below for more about ***setup & type-generation*** if your editor doesn't  provide auto-complete for
     *    the activities.
     *
     * ### A terminology note: Activities and Redeemers
     *
     * Although the conventional terminology of "redeemer" is universally well-known
     * in the Cardano developer community, we find that defining one or more **activities**,
     * with their associated ***redeemer data***, provides an effective semantic model offering
     * better clarity and intution.
     *
     * Each type of contract activity corresponds to an enum variant in the contract script.
     * For each of those variants, its redeemer data contextualizes the behavior of the requested
     * transaction.  A non-enum redeemer-type implies that there is only one type of activity.
     *
     * Any data not present in the transaction inputs or outputs, but needed for
     * specificity of the requested activity, can only be provided through these activity details.
     * If that material is like a "claim ticket", it would match the "redeemer" type of labeling.
     *
     * Activity data can include any kinds of details needed by the validator: settings for what it
     * is doing, options for how it is being done, or what remaining information the validator may
     * need, to verify the task is being completed according to protocol.  Transactions containing
     * a variety of inputs and output, each potential candidates for an activity, can use the activity
     * details to resolve ambiguity so the validator easily acts on the correct items.
     *
     * ### Setup and Type generation
     * #### Step 1: create your script **`.hlb.ts`**
     * With a defined script bundle, `import YourScriptNameBundle from "./YourBundleName.hlb.js"`
     * to your StellarContracts class module, and define a `scriptBundle() { return new YourScriptNameBundle() }` or
     * similar method in that class.
     *
     * This results in a generated **`.typeInfo.ts`** and **`.bridge.ts`** with complete
     * typescript bindings for your on-chain script (trouble? check Plugin setup below).
     *
     * #### Step 2: Import the generated bridge class
     * Using the generated .bridge file:
     * > `import YourScriptNameDataBridge from "./YourBundleName.bridge.js"`
     *
     * ... and set the `dataBridgeClass` property in your class:
     *
     * >    `dataBridgeClass = YourScriptNameDataBridge`
     *
     * ### Plugin Setup
     *
     * The activity types should be available through type-safe auto-complete in your editor.  If not,
     * you may need to install and configure the Stellar Contracts rollup plugins for importing .hl
     * files and generating .d.ts for your .hlb.ts files.  See the Stellar Contracts development
     * guide for additional details.
     *
     */
    /**
     * Provides access to the script's defined on-chain types, using a fluent
     * API for type-safe generation of data conforming to on-chain data formats & types.
     * @remarks
     *
     */
    _dataBridge?: ContractDataBridge;
    getOnchainBridge(): possiblyAbstractContractBridgeType<this>;
    ADA(n: bigint | number): bigint;
    get isConnected(): boolean;
    /**
     * returns the wallet connection used by the current actor
     * @remarks
     *
     * Throws an error if the strella contract facade has not been initialized with a wallet in settings.actorContext
     * @public
     **/
    get wallet(): any;
    private get missingActorError();
    getContractScriptParamsUplc(config: ConfigType): UplcRecord<Partial<ConfigType> & Required<Pick<ConfigType, "rev">>>;
    delegateReqdAddress(): false | Address;
    delegateAddrHint(): Address[] | undefined;
    walletNetworkCheck?: Promise<NetworkName> | NetworkName;
    /**
     * Factory function for a configured instance of the contract
     * @remarks
     *
     * Due to boring details of initialization order, this factory function is needed
     * for creating a new instance of the contract.
     * @param args - setup and configuration details
     * @public
     **/
    static createWith<thisType extends StellarContract<configType>, configType extends configBaseWithRev = thisType extends StellarContract<infer iCT> ? iCT : never>(this: stellarSubclass<any>, args: StellarFactoryArgs<configType>): Promise<StellarContract<configType> & InstanceType<typeof this>>;
    /**
     * obsolete public constructor.  Use the createWith() factory function instead.
     *
     * @public
     **/
    constructor(setup: SetupDetails, internal: typeof isInternalConstructor);
    init(args: StellarFactoryArgs<ConfigType>): Promise<this>;
    compiledScript: anyUplcProgram;
    usesContractScript: boolean;
    get datumType(): DataType;
    /**
     * @internal
     **/
    get purpose(): scriptPurpose;
    get validatorHash(): ValidatorHash<unknown>;
    get address(): Address;
    get mintingPolicyHash(): MintingPolicyHash | undefined;
    get identity(): string;
    outputsSentToDatum(datum: InlineDatum): Promise<TxInput[]>;
    /**
     * Returns the indicated Value to the contract script
     * @public
     * @param tcx - transaction context
     * @param value - a value already having minUtxo calculated
     * @param datum - inline datum
     **/
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<anyState_2>;
    addStrellaWithConfig<SC extends StellarContract<any>>(TargetClass: stellarSubclass<SC>, config: SC extends StellarContract<infer iCT> ? iCT : never): Promise<SC>;
    /**
     * Returns all the types exposed by the contract script
     * @remarks
     *
     * Passed directly from Helios; property names match contract's defined type names
     *
     * @public
     **/
    get onChainTypes(): Program["userTypes"][string];
    /**
     * identifies the enum used for the script Datum
     * @remarks
     *
     * Override this if your contract script uses a type name other than Datum.
     * @public
     **/
    get scriptDatumName(): string;
    /**
     * The on-chain type for datum
     * @remarks
     *
     * This getter provides a class, representing the on-chain enum used for attaching
     * data (or data hashes) to contract utxos the returned type (and its enum variants)
     * are suitable for off-chain txn-creation override `get scriptDatumName()` if
     * needed to match your contract script.
     * @public
     **/
    get onChainDatumType(): DataType;
    /**
     * identifies the enum used for activities (redeemers) in the Helios script
     * @remarks
     *
     * Override this if your contract script uses a type name other than Activity.
     * @public
     **/
    get scriptActivitiesName(): string;
    getSeed(arg: hasSeed): TxOutputId;
    /**
     * returns the on-chain type for activities ("redeemers")
     * @remarks
     *
     * Use mustGetActivityName() instead, to get the type for a specific activity.
     *
     * returns the on-chain enum used for spending contract utxos or for different use-cases of minting (in a minting script).
     * the returned type (and its enum variants) are suitable for off-chain txn-creation
     * override `get onChainActivitiesName()` if needed to match your contract script.
     * @public
     **/
    get onChainActivitiesType(): DataType;
    /**
     * @deprecated - see {@link StellarContract.activityVariantToUplc|this.activityVariantToUplc(variant, data)} instead
     * Retrieves an on-chain type for a specific named activity ("redeemer")
     * @remarks
     *
     * Cross-checks the requested name against the available activities in the script.
     * Throws a helpful error if the requested activity name isn't present.'
     *
     * @param activityName - the name of the requested activity
     * @public
     **/
    mustGetActivity(activityName: string): EnumMemberType | null;
    /**
     * asserts the presence of the indicated activity name in the on-chain script
     * @remarks
     * The activity name is expected to be found in the script's redeemer enum
     */
    mustHaveActivity(activityName: string): EnumMemberType | null;
    activityRedeemer(activityName: string, data?: any): {
        redeemer: UplcData;
    };
    activityVariantToUplc(activityName: string, data: any): UplcData;
    mustGetEnumVariant(enumType: DataType, variantName: string): EnumMemberType | null;
    inlineDatum(datumName: string, data: any): InlineTxOutputDatum;
    typeToUplc(type: DataType, data: any, path?: string): UplcData;
    paramsToUplc(params: Record<string, any>): UplcRecord<ConfigType>;
    get program(): Program;
    _utxoHelper: UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     */
    get utxoHelper(): UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     * @remarks - same as utxoHelper, but with a shorter name
     */
    get uh(): UtxoHelper;
    /**
     * @deprecated - use `tcx.submit()` instead.
     */
    submit(tcx: StellarTxnContext, { signers, addlTxInfo, }?: {
        signers?: Address[];
        addlTxInfo?: Pick<TxDescription<any>, "description">;
    }): Promise<TxId>;
    _cache: ComputedScriptProperties;
    optimize: boolean;
    compileWithScriptParams(): Promise<void>;
    /**
     * Locates a UTxO locked in a validator contract address
     * @remarks
     *
     * Throws an error if no matching UTxO can be found
     * @param semanticName - descriptive name; used in diagnostic messages and any errors thrown
     * @param predicate - filter function; returns its utxo if it matches expectations
     * @param exceptInTcx - any utxos already in the transaction context are disregarded and not passed to the predicate function
     * @param extraErrorHint - user- or developer-facing guidance for guiding them to deal with the miss
     * @public
     **/
    mustFindMyUtxo(semanticName: string, predicate: utxoPredicate, exceptInTcx: StellarTxnContext, extraErrorHint?: string): Promise<TxInput>;
    mustFindMyUtxo(semanticName: string, predicate: utxoPredicate, extraErrorHint?: string): Promise<TxInput>;
    /**
     * Reuses an existing transaction context, or creates a new one with the given name and the current actor context
     */
    mkTcx<TCX extends StellarTxnContext>(tcx: StellarTxnContext | undefined, name?: string): TCX;
    /**
     * Creates a new transaction context with the current actor context
     */
    mkTcx(name?: string): StellarTxnContext;
    /**
     * Finds a free seed-utxo from the user wallet, and adds it to the transaction
     * @remarks
     *
     * Accepts a transaction context that may already have a seed.  Returns a typed
     * tcx with hasSeedUtxo type.
     *
     * The seedUtxo will be consumed in the transaction, so it can never be used
     * again; its value will be returned to the user wallet.
     *
     * The seedUtxo is needed for UUT minting, and the transaction is typed with
     * the presence of that seed (found in tcx.state.seedUtxo).
     *
     * If a seedUtxo is already present in the transaction context, no additional seedUtxo
     * will be added.
     *
     * If a seedUtxo is provided as an argument, that utxo must already be present
     * in the transaction inputs; the state will be updated to reference it.
     *
     * @public
     *
     **/
    tcxWithSeedUtxo<TCX extends StellarTxnContext>(tcx?: TCX, seedUtxo?: TxInput): Promise<TCX & hasSeedUtxo>;
    findUutSeedUtxo(uutPurposes: string[], tcx: StellarTxnContext<any>): Promise<TxInput>;
}

/**
 * Base class for modules that can serve as Capo delegates
 * @public
 * @remarks
 *
 * establishes a base protocol for delegates.
 * @typeParam CT - type of any specialized configuration; use capoDelegateConfig by default.
 **/
declare abstract class StellarDelegate extends StellarContract<capoDelegateConfig> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    dataBridgeClass: AbstractNew<ContractDataBridgeWithEnumDatum> | undefined;
    /**
     * Finds and adds the delegate's authority token to the transaction
     * @remarks
     *
     * calls the delegate-specific DelegateAddsAuthorityToken() method,
     * with the uut found by DelegateMustFindAuthorityToken().
     *
     * returns the token back to the contract using {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }
     * @param tcx - transaction context
     * @public
     **/
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemer?: isActivity, skipReturningDelegate?: "skipDelegateReturn"): Promise<TCX>;
    /**
     * Finds the authority token and adds it to the transaction, tagged for retirement
     * @public
     * @remarks
     * Doesn't return the token back to the contract.
     **/
    txnRetireAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * Standard delegate method for receiving the authority token as a txn output
     * @remarks
     *
     * creates a UTxO / TxOutput, depositing the indicated token-name into the delegated destination.
     *
     * Each implemented subclass can use it's own style to match its strategy & mechanism,
     * and is EXPECTED to use tcx.addOutput() to receive the indicated `tokenValue` into the
     * contract or other destination address.
     *
     * This method is used both for the original deposit and for returning the token during a grant-of-authority.
     *
     * Impls should normally preserve the datum from an already-present sourceUtxo, possibly with evolved details.
     *
     * @param tcx - transaction-context
     * @param tokenValue - the Value of the token that needs to be received.  Always includes
     *   the minUtxo needed for this authority token
     * @param fromFoundUtxo - always present when the authority token already existed; can be
     *   used to duplicate or iterate on an existing datum, or to include any additional Value in the new
     *   UTxO, to match the previous UTxO with minimal extra heuristics
     * @public
     **/
    abstract txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkAuthorityTokenPredicate(): tokenPredicate_2<any>;
    get authorityTokenName(): number[];
    tvAuthorityToken(useMinTv?: boolean): Value;
    get delegateValidatorHash(): ValidatorHash | undefined;
    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    abstract DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     **/
    abstract DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput, redeemer?: isActivity): Promise<TCX>;
    /**
     * Adds any important transaction elemements supporting the authority token being retired, closing the delegate contracts' utxo.
     * @remarks
     *
     * EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
     *
     * EXPECTS the `burn` instruction to be separately added to the transaction.
     *
     * The default implementation uses the conventional `Retiring` activity
     * to spend the token.
     *
     * @reqt
     * It MUST add the indicated utxo to the transaction as an input
     *
     * @reqt
     * When backed by a contract:
     *   * it should use an activity/redeemer allowing the token to be spent
     *      **and NOT returned**.
     *   * the contract script SHOULD ensure any other UTXOs it may also hold, related to this delegation,
     *      do not become inaccessible as a result.
     *
     * It MAY enforce additional requirements and/or block the action.
     *
     *
     * @param tcx - transaction context
     * @param fromFoundUtxo - the utxo having the authority otken
     * @public
     **/
    abstract DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput): Promise<TCX>;
    /**
     * Captures requirements as data
     * @remarks
     *
     * see reqts structure
     * @public
     **/
    delegateRequirements(): ReqtsMap<"provides an interface for providing arms-length proof of authority to any other contract" | "implementations SHOULD positively govern spend of the UUT" | "implementations MUST provide an essential interface for transaction-building" | "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)" | "requires a mustFindAuthorityToken(tcx)" | "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)" | "requires txnRetireCred(tcx, fromFoundUtxo)", never>;
}

/**
 * Initializes a stellar contract class
 * @remarks
 *
 * Includes network and other standard setup details, and any configuration needed
 * for the specific class.
 * @public
 **/
declare type StellarFactoryArgs<CT extends configBaseWithRev> = {
    setup: SetupDetails;
    config?: CT;
    partialConfig?: Partial<CT>;
};

/**
 * A simple emulated Network.
 * This can be used to do integration tests of whole dApps.
 * Staking is not yet supported.
 * @public
 */
export declare class StellarNetworkEmulator implements Emulator {
    #private;
    currentSlot: number;
    genesis: EmulatorGenesisTx[];
    mempool: EmulatorTx[];
    blocks: EmulatorTx[][];
    /**
     * Cached map of all UTxOs ever created
     * @internal
     */
    _allUtxos: Record<string, TxInput>;
    /**
     * Cached set of all UTxOs ever consumed
     * @internal
     */
    _consumedUtxos: Set<string>;
    /**
     * Cached map of UTxOs at addresses
     * @internal
     */
    _addressUtxos: Record<string, TxInput[]>;
    id: number;
    params: NetworkParams;
    /**
     * Instantiates a NetworkEmulator at slot 0.
     * An optional seed number can be specified, from which all EMULATED RANDOMNESS is derived.
     */
    constructor(seed?: number, { params }?: {
        params: NetworkParams;
    });
    isMainnet(): boolean;
    /**
     * Each slot is assumed to be 1000 milliseconds
     *
     * returns milliseconds since start of emulation
     */
    get now(): number;
    get parameters(): Promise<NetworkParams>;
    get parametersSync(): {
        refTipSlot: number;
        refTipTime: number;
        txFeeFixed: number;
        txFeePerByte: number;
        exMemFeePerUnit: number;
        exCpuFeePerUnit: number;
        utxoDepositPerByte: number;
        refScriptsFeePerByte: number;
        collateralPercentage: number;
        maxCollateralInputs: number;
        maxTxExMem: number;
        maxTxExCpu: number;
        maxTxSize: number;
        secondsPerSlot: number;
        stakeAddrDeposit: number;
        costModelParamsV1: number[];
        costModelParamsV2: number[];
        costModelParamsV3: number[];
    };
    /**
     * retains continuity for the seed and the RNG through one or more snapshots.
     * @internal
     */
    mulberry32: () => number;
    netPHelper: NetworkParamsHelper;
    initHelper(): NetworkParamsHelper;
    /**
     * Ignores the genesis txs
     */
    get txIds(): TxId[];
    snapshot(snapName: string): NetworkSnapshot;
    utxoTotals(utxos: TxInput[]): Value;
    fromSnapshot: string;
    loadSnapshot(snapshot: NetworkSnapshot): void;
    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     * @deprecated - use TestHelper.createWallet instead, enabling wallets to be transported to
     *     different networks (e.g. ones that have loaded snapshots from the original network).
     */
    createWallet(lovelace?: bigint, assets?: Assets): SimpleWallet_stellar;
    /**
     * Creates a UTxO using a GenesisTx.  The txn doesn't need to balance or be signed.  It's magic.
     * @param wallet - the utxo is created at this wallet's address
     * @param lovelace - the lovelace amount to create
     * @param assets - other assets to include in the utxo
     */
    createUtxo(wallet: SimpleWallet, lovelace: bigint, assets?: Assets): TxOutputId;
    warnMempool(): void;
    /**
     * Throws an error if the UTxO isn't found
     */
    getUtxo(id: TxOutputId): Promise<TxInput>;
    getUtxos(address: Address): Promise<TxInput[]>;
    dump(): void;
    isConsumed(utxo: any): boolean;
    submitTx(tx: Tx, logger?: UplcLogger): Promise<TxId>;
    /**
     * Mint a block with the current mempool, and advance the slot by a number of slots.
     */
    tick(nSlots: IntLike): void;
    /**
     * @internal
     */
    pushBlock(txs: EmulatorTx[]): void;
}

/**
 * Type for the Class that constructs to a given type
 * @remarks
 *
 * Type of the matching literal class
 *
 * note: Typescript should make this pattern easier
 *
 * @typeParam S - the type of objects of this class
 * @typeParam CT - inferred type of the constructor args for the class
 * @public
 **/
declare type stellarSubclass<S extends StellarContract<any>> = (new (setup: SetupDetails, ...args: any[]) => S) & {
    defaultParams: Partial<ConfigFor<S>>;
    createWith(args: StellarFactoryArgs<ConfigFor<S>>): Promise<S>;
    parseConfig(rawJsonConfig: any): any;
};

/**
 * Interface augmenting the generic vitest testing context with a convention for testing contracts created with Stellar Contracts.
 * @public
 **/
export declare interface StellarTestContext<HTH extends StellarTestHelper<SC>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer iSC> ? iSC : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(config: Partial<ConfigFor<SC>> & canHaveRandomSeed & canSkipSetup, helperState?: TestHelperState<SC>): Promise<StellarTestHelper<SC>>;
}

/**
 * Base class for test-helpers on generic Stellar contracts
 * @remarks
 *
 * NOTE: DefaultCapoTestHelper is likely to be a better fit for typical testing needs and typical contract-development scenarios.
 * Use this class for specific unit-testing needs not sufficiently served by integration-testing on a Capo.
 * @public
 **/
export declare abstract class StellarTestHelper<SC extends StellarContract<any>> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC>;
    config?: ConfigFor<SC> & canHaveRandomSeed;
    defaultActor?: string;
    strella: SC;
    actors: actorMap;
    optimize: boolean;
    netPHelper: NetworkParamsHelper;
    networkCtx: NetworkContext<StellarNetworkEmulator>;
    protected _actorName: string;
    get actorName(): string;
    get network(): StellarNetworkEmulator;
    /**
     * Gets the current actor wallet
     *
     * @public
     **/
    get wallet(): SimpleWallet_stellar;
    actorContext: ActorContext<SimpleWallet_stellar>;
    setActor(actorName: string): Promise<void>;
    address?: Address;
    setupPending?: Promise<any>;
    setupActors(): Promise<void>;
    setDefaultActor(): Promise<void>;
    helperState?: TestHelperState<SC>;
    constructor(config?: ConfigFor<SC> & canHaveRandomSeed & canSkipSetup, helperState?: TestHelperState<SC>);
    fixupParams(preProdParams: NetworkParams): NetworkParams;
    submitTxnWithBlock(tcx: StellarTxnContext | Promise<StellarTxnContext>, options?: SubmitOptions & {
        futureDate?: Date;
    }): Promise<StellarTxnContext<anyState_3>>;
    advanceNetworkTimeForTx(tcx: StellarTxnContext, futureDate?: Date): Promise<void>;
    initialize({ randomSeed, }?: {
        randomSeed?: number;
    }): Promise<SC>;
    initStellarClass(config?: (ConfigFor<SC> & canHaveRandomSeed) | undefined): Promise<SC>;
    initStrella(TargetClass: stellarSubclass<SC>, config?: ConfigFor<SC>): Promise<SC>;
    randomSeed?: number;
    rand?: () => number;
    delay(ms: any): Promise<unknown>;
    /**
     * Creates a new SimpleWallet and populates it with a given lovelace quantity and assets.
     * Special genesis transactions are added to the emulated chain in order to create these assets.
     */
    createWallet(lovelace?: bigint, assets?: Assets): SimpleWallet_stellar;
    mkSeedUtxo(seedIndex?: bigint): Promise<TxId>;
    submitTx(tx: Tx, force?: "force"): Promise<TxId>;
    mkRandomBytes(length: number): number[];
    /**
     * creates a new Actor in the transaction context with initial funds, returning a Wallet object
     * @remarks
     *
     * Given an actor name ("marcie") or role name ("marketer"), and a number
     * of indicated lovelace, creates and returns a wallet having the indicated starting balance.
     *
     * By default, three additional, separate 5-ADA utxos are created, to ensure sufficient Collateral and
     * small-change are existing, making typical transaction scenarios work easily.  If you want to include
     * other utxo's instead you can supply their lovelace sizes.
     *
     * To suppress creation of additional utxos, use `0n` for arg3.
     *
     * You may wish to import {@link ADA} = 1_000_000n from the testing/ module, and
     * multiply smaller integers by that constant.
     *
     * @param roleName - an actor name or role-name for this wallet
     * @param walletBalance - initial wallet balance
     * @param moreUtxos - additional utxos to include
     *
     * @example
     *     this.addActor("cheapo", 14n * ADA, 0n);  //  14 ADA and no additional utxos
     *     this.addActor("flexible", 14n * ADA);  //  14 ADA + default 15 ADA in 3 additional utxos
     *     this.addActor("moneyBags", 42_000_000n * ADA, 5n, 4n);  //  many ADA and two collaterals
     *
     *     //  3O ADA in 6 separate utxos:
     *     this.addActor("smallChange", 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA, 5n * ADA);
     *
     * @public
     **/
    addActor(roleName: string, walletBalance: bigint, ...moreUtxos: bigint[]): Wallet;
    addrRegistry: Record<string, string>;
    get networkParams(): NetworkParams;
    mkNetwork(params: NetworkParams): [StellarNetworkEmulator, NetworkParamsHelper];
    slotToTime(s: bigint): number | Date;
    currentSlot(): number;
    waitUntil(time: Date): number;
}

/**
 * @public
 */
export declare type stellarTestHelperSubclass<SC extends StellarContract<any>> = new (stConfig: ConfigFor<SC> & canHaveRandomSeed, helperState: any) => StellarTestHelper<SC>;

/**
 * Transaction-building context for Stellar Contract transactions
 * @remarks
 *
 * Uses same essential facade as Helios Tx.
 *
 * Adds a transaction-state container with strong typing of its contents,
 * enabling transaction-building code to use type-sensitive auto-complete
 * and allowing Stellar Contracts library code to require transaction contexts
 * having known states.
 *
 * Retains reflection capabilities to allow utxo-finding utilities to exclude
 * utxo's already included in the contract.
 *
 * @typeParam S - type of the context's `state` prop
 * @public
 **/
declare class StellarTxnContext<S extends anyState = anyState> {
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    neededSigners: Address[];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[];
    setup: SetupDetails;
    txb: TxBuilder;
    txnName: string;
    withName(name: string): this;
    get wallet(): Wallet;
    get uh(): UtxoHelper;
    get networkParams(): NetworkParams;
    get actorContext(): ActorContext<any>;
    /**
     * Provides a lightweight, NOT complete, serialization for presenting the transaction context
     * @remarks
     * Serves rendering of the transaction context in vitest
     * @internal
     */
    toJSON(): {
        kind: string;
        state: string | undefined;
        inputs: string;
        outputs: string;
        isBuilt: boolean;
        hasParent: boolean;
        addlTxns: string[] | undefined;
    };
    logger: UplcConsoleLogger;
    constructor(setup: SetupDetails, state?: Partial<S>, parentTcx?: StellarTxnContext<any>);
    withParent(tcx: StellarTxnContext<any>): this;
    get actorWallet(): any;
    dump(tx?: Tx): string;
    dump(): Promise<string>;
    includeAddlTxn<TCX extends StellarTxnContext<anyState>, RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any> ? TCX : hasAddlTxns<TCX>>(this: TCX, txnName: string, txInfo: TxDescription<any>): RETURNS;
    mintTokens(...args: MintTokensParams): StellarTxnContext<S>;
    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs;
    reservedUtxos(): TxInput[];
    utxoNotReserved(u: TxInput): TxInput | undefined;
    addUut<T extends string, TCX extends StellarTxnContext>(this: TCX, uutName: UutName, ...names: T[]): hasUutContext<T> & TCX;
    addState<TCX extends StellarTxnContext, K extends string, V>(this: TCX, key: K, value: V): StellarTxnContext<{
        [keyName in K]: V;
    } & anyState> & TCX;
    addCollateral(collateral: TxInput): this;
    getSeedUtxoDetails(this: hasSeedUtxo): SeedAttrs;
    _txnTime?: Date;
    /**
     * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
     *
     * @remarks Returns the txn context.
     * Throws an error if the transaction already has a txnTime set.
     *
     * This method does not itself set the txn's validity interval.  You MUST combine it with
     * a call to validFor(), to set the txn's validity period.  The resulting transaction will
     * be valid from the moment set here until the end of the validity period set by validFor().
     *
     * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
     * during test scenarios to verify time-sensitive behaviors.
     *
     * In the test environment, the network wil normally be advanced to this date
     * before executing the transaction, unless a different execution time is indicated.
     * Use the test helper's `submitTxnWithBlock(txn, {futureDate})` or `advanceNetworkTimeForTx()` methods, or args to
     * use-case-specific functions that those methods.
     */
    futureDate<TCX extends StellarTxnContext<S>>(this: TCX, date: Date): TCX;
    assertNumber(obj: any, msg?: string): number;
    /**
     * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
     * @param slot - Slot number
     */
    slotToTime(slot: bigint): bigint;
    /**
     * Calculates the slot number associated with a given time.
     * @param time - Milliseconds since 1970
     */
    timeToSlot(time: bigint): bigint;
    /**
     * Identifies the time at which the current transaction is expected to be executed.
     * Use this attribute in any transaction-building code that sets date/time values
     * for the transaction.
     * Honors any futureDate() setting or uses the current time if none has been set.
     */
    get txnTime(): Date;
    /**
     * Sets an on-chain validity period for the transaction, in miilliseconds
     *
     * @remarks if futureDate() has been set on the transaction, that
     * date will be used as the starting point for the validity period.
     *
     * Returns the transaction context for chaining.
     *
     * @param durationMs - the total validity duration for the transaction.  On-chain
     *  checks using CapoCtx `now(granularity)` can enforce this duration
     */
    validFor<TCX extends StellarTxnContext<S>>(this: TCX, durationMs: number): TCX;
    txRefInputs: TxInput[];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(this: TCX, ...inputArgs: addRefInputArgs): TCX;
    /**
     * @deprecated - use addRefInput() instead.
     */
    addRefInputs<TCX extends StellarTxnContext<S>>(this: TCX, ...args: addRefInputArgs): void;
    addInput<TCX extends StellarTxnContext<S>>(this: TCX, input: TxInput, r?: isActivity): TCX;
    addOutput<TCX extends StellarTxnContext<S>>(this: TCX, output: TxOutput): TCX;
    attachScript(...args: Parameters<TxBuilder["attachUplcProgram"]>): void;
    /**
     * Adds a UPLC program to the transaction context, increasing the transaction size.
     * @remarks
     * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
     * when available. That method uses a fallback approach adding the script to the
     * transaction if needed.
     */
    addScriptProgram(...args: Parameters<TxBuilder["attachUplcProgram"]>): this;
    wasModified(): void;
    _builtTx?: Tx | Promise<Tx>;
    get builtTx(): Tx | Promise<Tx>;
    addSignature(wallet: Wallet): Promise<void>;
    findAnySpareUtxos(): Promise<TxInput[] | never>;
    findChangeAddr(): Promise<Address>;
    build(this: StellarTxnContext<any>, { signers, addlTxInfo, beforeValidate, }?: {
        signers?: Address[];
        addlTxInfo?: Pick<TxDescription<any>, "description">;
        beforeValidate?: (tx: Tx) => Promise<any> | any;
    }): Promise<{
        tx: Tx;
        willSign: PubKeyHash[];
        walletMustSign: boolean;
        wallet: Wallet;
        wHelper: WalletHelper<any>;
        costs: {
            total: Cost;
            [key: string]: Cost;
        };
    }>;
    log(...msgs: string[]): this;
    flush(): this;
    finish(): this;
    /**
     * Submits the current transaction and any additional transactions in the context.
     * @remarks
     * To submit only the current transaction, use the `submit()` method.
     *
     * The signers array can be used to add additional signers to the transaction, and
     * is passed through to the submit() for the current txn only; it is not used for
     * any additional transactions.
     *
     * The beforeSubmit, onSubmitted callbacks are used for each additional transaction.
     *
     * beforeSubmit can be used to notify the user of the transaction about to be submitted,
     * and can also be used to add additional signers to the transaction or otherwise modify
     * it (by returning the modified transaction).
     *
     * onSubmitted can be used to notify the user that the transaction has been submitted,
     * or for logging or any other post-submission processing.
     */
    submitAll(this: StellarTxnContext<any>, options?: SubmitOptions): Promise<any[] | undefined>;
    /**
     * Submits only the current transaction.
     * @remarks
     * To also submit additional transactions, use the `submitAll()` method.
     */
    submit(this: StellarTxnContext<any>, { signers, addlTxInfo, expectError, beforeError, beforeValidate, }?: SubmitOptions): Promise<TxId>;
    emitCostDetails(tx: Tx, costs: {
        total: Cost;
        [key: string]: Cost;
    }): void;
    get currentSlot(): number;
    private checkTxValidityDetails;
    /**
     * Executes additional transactions indicated by an existing transaction
     * @remarks
     *
     * During the off-chain txn-creation process, additional transactions may be
     * queued for execution.  This method is used to execute those transactions,
     * along with any chained transactions they may trigger.
     * @param tcx - the prior txn context having the additional txns to execute
     * @param callback - an optional async callback that you can use to notify a user, or to log the results of the additional txns
     * @public
     **/
    submitAddlTxns(this: hasAddlTxns<any, any>, callbacks?: {
        beforeSubmit?: MultiTxnCallback;
        onSubmitted?: MultiTxnCallback;
    }): Promise<any[] | undefined>;
    /**
     * Submits a list of transactions, without executing any chained/nested txns.
     * @remarks
     * use submitTxnChain() to submit a list of txns with chaining
     */
    submitTxns(txns: TxDescription<any>[], callbacks?: SubmitCallbacks): Promise<void>;
    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
     **/
    addScript(): void;
    submitTxnChain(options?: {
        txns?: TxDescription<any>[];
    } & SubmitCallbacks): Promise<any[]>;
}

declare type SubmitCallbacks = {
    beforeSubmit?: MultiTxnCallback;
    onSubmitted?: MultiTxnCallback;
};

declare type SubmitOptions = {
    /**
     * indicates additional signers expected for the transaction
     */
    signers?: Address[];
    addlTxInfo?: Pick<TxDescription<any>, "description">;
    /**
     * useful most for test environment, so that a txn failure can be me marked
     * as "failing as expected".  Not normally needed for production code.
     */
    expectError?: true;
    /**
     * Called when there is a detected error, before logging.  Probably only needed in test.
     */
    beforeError?: (tx: Tx) => Promise<any> | any;
    beforeValidate?: (tx: Tx) => Promise<any> | any;
    beforeSubmit?: MultiTxnCallback;
    onSubmitted?: MultiTxnCallback;
};

declare type tagOnly = Record<string, never>;

declare const tagOnly: tagOnly;

/**
 * @public
 */
export declare type TestHelperState<SC extends StellarContract<any>> = {
    bootstrapped: Boolean;
    bootstrappedStrella?: SC;
    snapshots: Record<string, NetworkSnapshot>;
    previousHelper: StellarTestHelper<any>;
};

declare type TimeLike = IntLike;

declare type TimeLike_2 = IntLike;

declare const TODO: unique symbol;

/**
 * tags requirement that aren't yet implemented
 * @public
 **/
declare type TODO_TYPE = typeof TODO;

declare type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    predicateValue: Value;
};

/**
 * @public
 */
declare type TxDescription<T extends StellarTxnContext> = {
    tcx: T | (() => T) | (() => Promise<T>);
    description: string;
    moreInfo: string;
    optional: boolean;
    txName?: string;
};

declare const TYPE_ERROR: unique symbol;

declare type TYPE_ERROR = typeof TYPE_ERROR;

declare type TypeError_2<T extends string, moreInfo extends Object = {}> = {
    [TYPE_ERROR]: T;
    moreInfo: moreInfo;
};

/**
 * GENERATED data bridge for **BasicDelegate** script (defined in class ***UnspecializedDgtBundle***)
 * main: **src/delegation/BasicDelegate.hl**, project: **stellar-contracts**
 * @remarks - note that you may override `get dataBridgeName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class UnspecializedDelegateBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (DelegateDatum)***
     * for this contract script.
     */
    datum: DelegateDatumHelper;
    /**
     * this is the specific type of datum for the `BasicDelegate` script
     */
    DelegateDatum: DelegateDatumHelper;
    readDatum: (d: UplcData) => ErgoDelegateDatum;
    /**
     * generates UplcData for the activity type (***DelegateActivity***) for the `BasicDelegate` script
     */
    activity: DelegateActivityHelper;
    DelegateActivity: DelegateActivityHelper;
    reader: UnspecializedDelegateBridgeReader;
    /**
     * accessors for all the types defined in the `BasicDelegate` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateDatum*** for the `BasicDelegate` script
         */
        DelegateDatum: DelegateDatumHelper;
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `BasicDelegate` script
         */
        DelegateRole: DelegateRoleHelper_2;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `BasicDelegate` script
         */
        ManifestActivity: ManifestActivityHelper_2;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `BasicDelegate` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper_2;
        /**
         * generates UplcData for the enum type ***DelegateLifecycleActivity*** for the `BasicDelegate` script
         */
        DelegateLifecycleActivity: DelegateLifecycleActivityHelper;
        /**
         * generates UplcData for the enum type ***SpendingActivity*** for the `BasicDelegate` script
         */
        SpendingActivity: SpendingActivityHelper;
        /**
         * generates UplcData for the enum type ***MintingActivity*** for the `BasicDelegate` script
         */
        MintingActivity: MintingActivityHelper;
        /**
         * generates UplcData for the enum type ***BurningActivity*** for the `BasicDelegate` script
         */
        BurningActivity: BurningActivityHelper;
        /**
         * generates UplcData for the enum type ***DelegateActivity*** for the `BasicDelegate` script
         */
        DelegateActivity: DelegateActivityHelper;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `BasicDelegate` script
         */
        PendingDelegateAction: PendingDelegateActionHelper_2;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `BasicDelegate` script
         */
        ManifestEntryType: ManifestEntryTypeHelper_2;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `BasicDelegate` script
         */
        PendingCharterChange: PendingCharterChangeHelper_2;
        /**
         * generates UplcData for the enum type ***cctx_CharterInputType*** for the `BasicDelegate` script
         */
        cctx_CharterInputType: cctx_CharterInputTypeHelper;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `BasicDelegate` script
         */
        AnyData: (fields: AnyDataLike_2 | {
            id: number[];
            type: string;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***DelegationDetail*** for the `BasicDelegate` script
         */
        DelegationDetail: (fields: DelegationDetailLike | {
            capoAddr: /*minStructField*/ Address | string;
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            tn: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `BasicDelegate` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike_2 | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `BasicDelegate` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike_2 | {
            action: PendingDelegateActionLike_2;
            role: DelegateRoleLike_2;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike_2 | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `BasicDelegate` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike_2 | {
            entryType: ManifestEntryTypeLike_2;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoCtx*** for the `BasicDelegate` script
         */
        CapoCtx: (fields: CapoCtxLike | {
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            charter: cctx_CharterInputTypeLike;
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData_2, AnyDataLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺDelegationDetailCast: Cast<DelegationDetail, DelegationDetailLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_2, RelativeDelegateLinkLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange_2, PendingDelegateChangeLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry_2, CapoManifestEntryLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoCtxCast: Cast<CapoCtx, CapoCtxLike>;
}

declare class UnspecializedDelegateBridgeReader extends DataBridgeReaderClass {
    bridge: UnspecializedDelegateBridge;
    constructor(bridge: UnspecializedDelegateBridge);
    datum: (d: UplcData) => Partial<{
        Cip68RefToken: DelegateDatum$Ergo$Cip68RefToken;
        IsDelegation: ErgoDelegationDetail;
        capoStoredData: DelegateDatum$Ergo$capoStoredData;
    }>;
    /**
     * reads UplcData *known to fit the **DelegateDatum*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateDatum(d: UplcData): ErgoDelegateDatum;
    /**
     * reads UplcData *known to fit the **DelegateRole*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateRole(d: UplcData): ErgoDelegateRole_2;
    /**
     * reads UplcData *known to fit the **ManifestActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestActivity(d: UplcData): ErgoManifestActivity_2;
    /**
     * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity_2;
    /**
     * reads UplcData *known to fit the **DelegateLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateLifecycleActivity(d: UplcData): ErgoDelegateLifecycleActivity;
    /**
     * reads UplcData *known to fit the **SpendingActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    SpendingActivity(d: UplcData): ErgoSpendingActivity;
    /**
     * reads UplcData *known to fit the **MintingActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    MintingActivity(d: UplcData): ErgoMintingActivity;
    /**
     * reads UplcData *known to fit the **BurningActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    BurningActivity(d: UplcData): ErgoBurningActivity;
    /**
     * reads UplcData *known to fit the **DelegateActivity*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateActivity(d: UplcData): ErgoDelegateActivity;
    /**
     * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction_2;
    /**
     * reads UplcData *known to fit the **ManifestEntryType*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType_2;
    /**
     * reads UplcData *known to fit the **PendingCharterChange*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange_2;
    /**
     * reads UplcData *known to fit the **cctx_CharterInputType*** enum type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    cctx_CharterInputType(d: UplcData): Ergocctx_CharterInputType;
    /**
     * reads UplcData *known to fit the **AnyData*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    AnyData(d: UplcData): AnyData_2;
    /**
     * reads UplcData *known to fit the **DelegationDetail*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegationDetail(d: UplcData): DelegationDetail;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_2;
    /**
     * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateChange(d: UplcData): PendingDelegateChange_2;
    /**
     * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoManifestEntry(d: UplcData): CapoManifestEntry_2;
    /**
     * reads UplcData *known to fit the **CapoCtx*** struct type,
     * for the BasicDelegate script.
     * ### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoCtx(d: UplcData): CapoCtx;
}

declare class UnspecializedDgtBundle extends UnspecializedDgtBundle_base {
    get moduleName(): string;
    get bridgeClassName(): string;
    get specializedDelegateModule(): Source;
}

declare const UnspecializedDgtBundle_base: typeof CapoDelegateBundle & Constructor_2<CapoDelegateBundle> & EmptyConstructor_2<CapoDelegateBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};

declare class UpdateActivity<FactoryFunc extends updateActivityFunc<any>, ARGS extends [...any] = FactoryFunc extends updateActivityFunc<infer ARGS> ? ARGS : never> {
    private host;
    private factoryFunc;
    args: ARGS;
    constructor(host: DelegatedDataContract<any, any>, factoryFunc: updateActivityFunc<any>, args: ARGS);
    mkRedeemer(recId: hasRecId): isActivity;
}

declare type UpdateActivityArgs<UA extends updateActivityFunc<any>> = UA extends updateActivityFunc<infer ARGS> ? ARGS : never;

/**
 * @public
 */
declare type updateActivityFunc<ARGS extends [...any]> = (recId: hasRecId, ...args: ARGS) => isActivity;

declare class UplcConsoleLogger implements UplcLogger {
    didStart: boolean;
    lines: string[];
    lastMessage: string;
    lastReason?: "build" | "validate";
    history: string[];
    constructor();
    reset(reason: "build" | "validate"): void;
    logPrint(message: string, site?: Site): this;
    logError(message: string, stack?: Site): void;
    toggler: number;
    toggleDots(): void;
    get isMine(): boolean;
    resetDots(): void;
    showDot(): "│   ┊ " | "│ ● ┊ ";
    flushLines(footerString?: string): void;
    finish(): this;
    flush(): this;
    flushError(message?: string): this;
}

declare type UplcRecord<CT extends configBaseWithRev> = {
    [key in keyof CT]: UplcData;
};

declare type useRawMinterSetup = Omit<NormalDelegateSetup, "mintDelegateActivity"> & {
    omitMintDelegate: true;
    specialMinterActivity: isActivity;
    mintDelegateActivity?: undefined;
};

declare const USING_EXTENSION: unique symbol;

declare type UtxoDisplayCache = Map<TxOutputId, string>;

/**
 * A helper class for managing UTXOs in a Stellar contract
 * @remarks
 * Using the provided setup details, this helper provides methods for finding,
 * filtering and selecting UTXOs for inclusion in transactions, and for creating
 * related values and predicate-functions for matching UTXOs.
 * @public
 */
declare class UtxoHelper {
    strella?: StellarContract<any>;
    setup: SetupDetails;
    constructor(setup: SetupDetails, strella?: StellarContract<any>);
    get networkParams(): NetworkParams;
    get wallet(): Wallet;
    get network(): CardanoClient | Emulator;
    /**
     * Filters out utxos having non-ada tokens
     * @internal
     */
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput): TxInput | undefined;
    /**
     * Sorts utxos by size, with pure-ADA utxos preferred over others.
     * @internal
     */
    utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }: utxoSortInfo, { free: free2, minAdaAmount: r2 }: utxoSortInfo): 0 | 1 | -1;
    /**
     * Filters out utxos that are not sufficient to cover the minimum ADA amount established in
     * the utxo sort info in {@link UtxoHelper.mkUtxoSortInfo | mkUtxoSortInfo(min, max?)}.  Use in a filter() call.
     * @internal
     */
    utxoIsSufficient({ sufficient }: utxoSortInfo): boolean;
    /**
     * Filters out utxos that have non-ADA tokens, given a utxo sort info object.  Use in a filter() call.
     * @internal
     */
    utxoIsPureADA({ u }: utxoSortInfo): TxInput | undefined;
    /**
     * transforms utxo sort info back to just the utxo.
     * @internal
     */
    sortInfoBackToUtxo({ u }: utxoSortInfo): TxInput;
    /**
     * Creates a function that creates sort-info details for a utxo, given a minimum ADA amount
     * and an optional maximum ADA amount.
     * @internal
     **/
    mkUtxoSortInfo(min: bigint, max?: bigint): (u: TxInput) => utxoSortInfo;
    /**
     * accumulates the count of utxos, but only if the utxo is ADA-only.  Use in a reduce() call.
     **/
    reduceUtxosCountAdaOnly(c: number, { minAdaAmount }: utxoSortInfo): number;
    hasToken<tokenBearer extends canHaveToken>(something: tokenBearer, value: Value, tokenName?: string, quantity?: bigint): tokenBearer | undefined;
    utxoHasToken(u: TxInput, value: Value, tokenName?: string, quantity?: bigint): false | TxInput;
    inputHasToken(i: TxInput, value: Value, tokenName?: string, quantity?: bigint): false | TxInput;
    assetsHasToken(a: Assets, vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): boolean;
    outputHasToken(o: TxOutput, vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): boolean;
    /**
     * @deprecated - use helios `makeValue()` instead
     */
    mkAssetValue(mph: MintingPolicyHash, tokenName: BytesLike, count?: bigint): any;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    /**
     * creates a filtering function, currently for TxInput-filtering only.
     * with the optional tcx argument, utxo's already reserved
     *  ... in that transaction context will be skipped.
     * @public
     */
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    /**
     * Creates an asset class for the given token name, for the indicated minting policy
     */
    acAuthorityToken(tokenName: string | number[], mph?: MintingPolicyHash): AssetClass;
    /**
     * Creates a Value object representing a token with a minimum lovelace amount
     * making it valid for output in a utxo.
     * @public
     */
    mkMinTv(mph: MintingPolicyHash, tokenName: string | UutName | number[], count?: bigint): Value;
    mkMinAssetValue(mph: MintingPolicyHash, tokenName: BytesLike, count?: bigint): Value;
    tokenAsValue(tokenName: string | number[] | UutName, count?: bigint): Value;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant takes just a token-name / quantity, working only on Capo instances,
     * and seeks a token created by the Capo's minting policy.
     *
     * Choose from one of the other variants to make a more specific token predicate.
     * @public
     */
    mkTokenPredicate(tokenName: UutName | number[] | string, quantity?: bigint): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses a Value for filtering - each matched item must have the ENTIRE value.
     * @public
     */
    mkTokenPredicate(val: Value): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an explicit combination of policy/token-name/quantity
     * @public
     */
    mkTokenPredicate(mph: MintingPolicyHash, tokenName: string, quantity?: bigint): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an AssetClass(policy/token-name) and quantity
     * @public
     */
    mkTokenPredicate(mphAndTokenName: AssetClass, quantity?: bigint): tokenPredicate<any>;
    /**
     * adds the values of the given TxInputs
     */
    totalValue(utxos: TxInput[]): Value;
    /**
     * Creates a Value object representing a token with the given name and quantity
     * @deprecated - Use `helios' makeValue()` instead.
     * @remarks
     * This method doesn't include any lovelace in the Value object.
     * use mkMinAssetValue() to include the minimum lovelace for storing that token in its own utxo
     * @param tokenName - the name of the token
     * @param quantity - the quantity of the token
     * @param mph - the minting policy hash of the token
     * @public
     **/
    mkTokenValue(tokenName: string | number[], quantity: bigint, mph: MintingPolicyHash): Value;
    /**
     * Creates a Value having enough lovelace to store the indicated token
     * @deprecated - Use {@link UtxoHelper.mkMinAssetValue | mkMinAssetValue(mph, tokenName, quantity)} instead.
     * @remarks
     * This is equivalent to mkTokenValue() with an extra min-utxo calculation
     * @public
     **/
    mkMinTokenValue(tokenName: string | number[], quantity: bigint, mph: MintingPolicyHash): Value;
    /**
     * Locates a utxo in the current actor's wallet that matches the provided token predicate
     * @public
     */
    findActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined): Promise<TxInput | undefined>;
    /**
     * Try finding a utxo matching a predicate
     * @remarks
     * Filters the provided list of utxos to find the first one that matches the predicate.
     *
     * Skips any utxos that are already being spent in the provided transaction context.
     * Skips any utxos that are marked as collateral in the wallet.
     *
     * @public
     **/
    hasUtxo(semanticName: string, predicate: utxoPredicate, { wallet, exceptInTcx, utxos, required, }: UtxoSearchScopeWithUtxos): Promise<TxInput | undefined>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput>;
    mustFindUtxo(semanticName: string, predicate: utxoPredicate, searchScope: UtxoSearchScope, extraErrorHint?: string): Promise<TxInput>;
    utxoSearchError(semanticName: string, searchScope: UtxoSearchScope, extraErrorHint?: string, walletAddresses?: Address | Address[]): string;
    toUtxoId(u: TxInput): string;
}

/**
 * a function that can filter txInputs for coin-selection
 * @remarks
 *
 * short form: "returns truthy" if the input is matchy for the context
 * @public
 **/
declare type utxoPredicate = (((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined)) & {
    predicateValue?: Value;
};

declare type UtxoSearchScope = {
    address?: Address;
    wallet?: Wallet | SimpleWallet | SimpleWallet_stellar;
    exceptInTcx?: StellarTxnContext;
};

declare type UtxoSearchScopeWithUtxos = UtxoSearchScope & {
    utxos: TxInput[];
    required?: true;
};

declare type utxoSortInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

/**
 * @public
 */
declare type UutCreationAttrsWithSeed = {
    usingSeedUtxo: TxInput;
};

/**
 * A base state for a transaction context
 * @public
 **/
declare type uutMap = Record<string, unknown>;

/**
 * a unique utility token having a unique name
 * @remarks
 *
 * This class contains a general 'purpose' name, mapped to a unique
 * `name`, which is generated using a seed-utxo pattern.
 *
 * @public
 **/
declare class UutName {
    private [_uutName];
    purpose: string;
    constructor(purpose: string, fullUutName: string | number[]);
    /**
     * the full uniquified name of this UUT
     * @remarks
     *
     * format: `purpose-‹...uniqifier...›`
     * @public
     **/
    get name(): string;
    toString(): string;
}

declare const _uutName: unique symbol;

/**
 * strongly-typed map of purpose-names to Uut objects
 *
 * @public
 */
declare type uutPurposeMap<unionPurpose extends string> = {
    [purpose in unionPurpose]: UutName;
};

/**
 * Tuple of byte-array, count, needed for Value creation on native tokens.
 * @public
 **/
declare type valuesEntry = [number[], bigint];

export { }
