import { statSync } from "fs";

import {
    Address,
    MintingPolicyHash,
    Program,
    TxOutput,
    TxInput,
    Value,
    Datum,
    UplcProgramV2,
    type UplcData,
    ListData,
    ConstrData,
} from "@hyperionbt/helios";
import * as helios from "@hyperionbt/helios";
import type { DataType } from "@helios-lang/compiler/types/typecheck/common.js";
import { SimpleWallet } from "@helios-lang/tx-utils";
import type { Network, Wallet } from "@hyperionbt/helios";
export type anyUplcProgram = UplcProgramV2;
// | UplcProgramV3;

export function isUplcData(x: any): x is UplcData {
    return "kind" in x && "memsize" in x && "toCbor" in x;
}

import {
    StellarTxnContext,
    type TxDescription,
    type MultiTxnCallback,
    type hasAddlTxns,
    type hasSeedUtxo,
} from "./StellarTxnContext.js";
import {
    betterJsonSerializer,
    dumpAny,
    utxosAsString,
    valueAsString,
} from "./diagnostics.js";
import type { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import {
    HeliosModuleSrc,
    type HeliosModuleOptions,
} from "./HeliosModuleSrc.js";
import { mkTv, mkValuesEntry, stringToNumberArray } from "./utils.js";
import { UutName, type SeedAttrs } from "./delegation/UutName.js";
import type { Capo } from "./Capo.js";
import { DatumAdapter, type adapterParsedOnchainData } from "./DatumAdapter.js";
import type { DatumAdapterOffchainType } from "./CapoSettingsTypes.js";
import type { SimpleWallet_stellar } from "./testing/StellarNetworkEmulator.js";
import type { ByteArrayLike } from "@helios-lang/uplc/types/data/ByteArrayData.js";
import { UtxoHelper, type utxoPredicate } from "./UtxoHelper.js";
import { Cast } from "@helios-lang/contract-utils";
import { TxOutputDatum } from "@helios-lang/ledger-babbage";

type NetworkName = "testnet" | "mainnet";
let configuredNetwork: NetworkName | undefined = undefined;

/**
 * a type for redeemer/activity-factory functions declared with \@Activity.redeemer
 *
 * @public
 */
export type isActivity = {
    // redeemer: UplcDataValue | UplcData | T;
    redeemer?: UplcData;
    details?: string;
};

type WalletsAndAddresses = {
    wallets: Wallet[];
    addresses?: Address[];
};
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
export type stellarSubclass<S extends StellarContract<any>> = (new (
    setup: SetupDetails,
    internal: typeof isInternalConstructor
) => S) & {
    // & StellarContract<CT>
    defaultParams: Partial<ConfigFor<S>>;
    createWith(args: StellarFactoryArgs<ConfigFor<S>>): Promise<S>;
    parseConfig(rawJsonConfig: any): any;
};

/**
 * Properties for Datum structures for on-chain scripts
 * @public
 **/
export type anyDatumProps = Record<string, any>;
/**
 * Configuration details for StellarContract classes
 * @public
 **/
export interface configBaseWithRev {
    rev: bigint;
}

export type devConfigProps = {
    isDev: boolean;
    devGen: bigint;
};

export type UplcRecord<CT extends configBaseWithRev> = {
    [key in keyof CT]: UplcData;
};

/**
 * Decorators for on-chain activity (redeemer) factory functions
 * @public
 **/
export const Activity = {
    /**
     * Decorates a partial-transaction function that spends a contract-locked UTxO using a specific activity ("redeemer")
     * @remarks
     *
     * activity-linked transaction-partial functions must follow the txn\{...\}
     * and active-verb ("ing") naming conventions.  `txnRetiringDelegation`,
     * `txnModifyingVote` and `txnWithdrawingStake` would be examples
     * of function names following this guidance.
     *
     * @public
     **/
    partialTxn(proto, thingName, descriptor) {
        needsActiveVerb(thingName);
        return partialTxn(proto, thingName, descriptor);
    },

    /**
     * Decorates a factory-function for creating tagged redeemer data for a specific on-chain activity
     * @remarks
     *
     * The factory function should follow an active-verb convention by including "ing" in
     * the name of the factory function
     *
     * Its leading prefix should also match one of 'activity', 'burn', or 'mint'.  These
     * conventions don't affect the way the activity is verified on-chain, but they
     * provide guard-rails for naming consistency.
     * @public
     **/
    redeemer(
        proto,
        thingName,
        descriptor
        // todo: improve this type, so the decorated function is type-checked for returning an isActivity object
        // : {value: (...args: any[])  => isActivity<any>}
    ) {
        const isActivity = thingName.match(/^activity[A-Z]/);
        const isBurn = thingName.match(/^burn[A-Z]/);
        const isMint = thingName.match(/^mint[A-Z]/);

        if (!isActivity && !isBurn) {
            throw new Error(
                `@Activity.redeemer: ${thingName}: name should start with '(activity|burn|mint)[A-Z]...'`
            );
        }
        needsActiveVerb(thingName, !!"okwhatever");
        return Activity.redeemerData(proto, thingName, descriptor);
    },
    redeemerData(proto, thingName, descriptor) {
        //!!! todo: registry and cross-checking for missing redeeming methods

        //!!! todo: develop more patterns of "redeemer uses an input of a certain mph/value"
        return descriptor;
    },
};

function needsActiveVerb(thingName: string, okWorkaround?: boolean) {
    if (!thingName.match(/ing/)) {
        const orWorkaround =
            okWorkaround &&
            "(or work around with @Activity.redeemerData instead)";
        throw new Error(
            `Activity: ${thingName}: name should have 'ing' in it ${orWorkaround}`
        );
    }
    if (thingName.match(/^ing/)) {
        throw new Error(
            `Activity: ${thingName}: name shouldn't start with 'ing'`
        );
    }
}

/**
 * Decorates datum-building functions
 * @remarks
 *
 * function names must follow the mkDatum... convention.
 *
 * The function should accept a single argument with input type
 * that feels Typescripty, and that can be fit to the on-chain type of
 * the underlying Datum variant of the given name.
 *
 * @public
 **/
export function datum(proto, thingName, descriptor) {
    // console.log("+datum", proto.constructor.name, thingName || "none", descriptor.value.name )
    if (!thingName.match(/^mkDatum/)) {
        throw new Error(
            `@datum factory: ${thingName}: name should start with 'mkDatum...'`
        );
    }
    return descriptor;
}

/**
 * Decorates functions that can construct a new transaction context for a specific use-case
 * @remarks
 *
 * function names must follow the mkTxn... convention.
 * @public
 **/
export function txn(proto, thingName, descriptor) {
    // console.log("+datum", proto.constructor.name, thingName || "none", descriptor.value.name )
    if (!thingName.match(/^mkTxn/)) {
        throw new Error(
            `@txn factory: ${thingName}: name should start with 'mkTxn...'`
        );
    }
    return descriptor;
}

/**
 * decorates functions that increment a transaction by adding needed details for a use-case
 * @remarks
 *
 * Function names must follow the txn\{...\} naming convention. Typical partial-transaction names
 * may describe the semantics of how the function augments the transaction.
 * `txnAddSignatures` or `txnReceivePayment` could be example names following
 * this guidance
 *
 * Partial transactions should have a \<TCX extends StellarTxnContext\<...\>\> type parameter,
 * matched to its first function argument, and should return a type extending that same TCX,
 * possibly with additional StellarTxnContext\<...\> type info.
 *
 * The TCX constraint can specify key requirements for an existing transaction context when
 * that's relevant.
 *
 * @public
 **/
export function partialTxn(proto, thingName, descriptor) {
    // console.log("+datum", proto.constructor.name, thingName || "none", descriptor.value.name )
    if (!thingName.match(/^txn[A-Z]/)) {
        let help = "";
        if (thingName.match(/^mkTxn/)) {
            help = `\n  ... or, for transaction initiation with mkTxn, you might try @txn instead. `;
        }
        throw new Error(
            `@partialTxn factory: ${thingName}: should start with 'txn[A-Z]...'${help}`
        );
    }
    return descriptor;
}

export async function findInputsInWallets(
    v: Value,
    searchIn: WalletsAndAddresses,
    network: Network
): Promise<TxInput<null, any>> {
    const { wallets, addresses } = searchIn;

    const lovelaceOnly = v.assets.isZero();
    console.warn("finding inputs", {
        lovelaceOnly,
    });

    for (const w of wallets) {
        const [a] = await w.usedAddresses;
        console.log("finding funds in wallet", a.toBech32().substring(0, 18));
        const utxos = await w.utxos;
        for (const u of utxos) {
            if (lovelaceOnly) {
                if (u.value.assets.isZero() && u.value.lovelace >= v.lovelace) {
                    return u as any;
                }
                console.log("  - too small; skipping ", u.value.dump());
            } else {
                if (u.value.isGreaterOrEqual(v)) {
                    return u as any;
                }
            }
        }
    }
    if (lovelaceOnly) {
        throw new Error(
            `no ADA is present except those on token bundles.  TODO: findFreeLovelaceWithTokens`
        );
        // const spareChange = this.findFreeLovelaceWithTokens(v, w)
    }
    //!!! todo: allow getting free ada from a contract address?

    if (addresses) {
        for (const a of addresses) {
            const utxos = await network.getUtxos(a);
            for (const u of utxos) {
                if (u.value.isGreaterOrEqual(v)) {
                    return u as any;
                }
            }
        }
    }

    throw new Error(
        `None of these wallets${
            (addresses && " or addresses") || ""
        } have the needed tokens`
    );
}

/**
 * standard setup for any Stellar Contract class
 * @public
 **/
export type SetupDetails = {
    network: Network;
    networkParams: helios.NetworkParams;
    isMainnet?: boolean;
    actorContext: ActorContext;
    isTest?: boolean;
    isDev?: boolean;
    uh: UtxoHelper;
    optimize?: boolean;
};

/**
 * @public
 * Extracts the config type for a Stellar Contract class
 **/
export type ConfigFor<SC extends StellarContract<any>> = configBaseWithRev &
    SC extends StellarContract<infer inferredConfig>
    ? inferredConfig
    : never;

/**
 * Initializes a stellar contract class
 * @remarks
 *
 * Includes network and other standard setup details, and any configuration needed
 * for the specific class.
 * @public
 **/
export type StellarFactoryArgs<CT extends configBaseWithRev> = {
    setup: SetupDetails;
    config?: CT;
    partialConfig?: Partial<CT>;
};

type scriptPurpose =
    | "testing"
    | "minting"
    | "spending"
    | "staking"
    | "module"
    | "endpoint";

type ComputedScriptProperties = Partial<{
    vh: helios.ValidatorHash;
    addr: Address;
    mph: MintingPolicyHash;
    identity: string;
}>;

/**
 * @public
 */
export type hasSeed = SeedAttrs | hasSeedUtxo;

const isInternalConstructor = Symbol("internalConstructor");

export type ActorContext<WTP extends Wallet = Wallet> = {
    wallet?: WTP;
};
export type NetworkContext<NWT extends Network = Network> = {
    network: NWT;
};

//!!! todo: type configuredStellarClass = class -> networkStuff -> withParams = stellar instance.

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
export class StellarContract<
    // SUB extends StellarContract<any, ParamsType>,
    ConfigType extends configBaseWithRev
> {
    //! it has scriptProgram: a parameterized instance of the contract
    //  ... with specific `parameters` assigned.
    scriptProgram?: Program;
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    contractParams?: UplcRecord<ConfigType>;
    setup: SetupDetails;
    network: Network;
    networkParams: helios.NetworkParams;
    actorContext: ActorContext<any>;
    // isTest?: boolean
    static get defaultParams() {
        return {};
    }
    static parseConfig(rawJsonConfig: any) {
        throw new Error(
            `Stellar contract subclasses should define their own static parseConfig where needed to enable connection from a specific dApp to a specific Stellar Contract.`
        );
    }

    get isConnected() {
        return !!this.wallet;
    }
    /**
     * returns the wallet connection used by the current actor
     * @remarks
     *
     * Throws an error if the strella contract facade has not been initialized with a wallet in settings.actorContext
     * @public
     **/
    get wallet() {
        if (!this.actorContext.wallet) throw new Error(this.missingActorError);
        return this.actorContext.wallet;
    }

    private get missingActorError(): string {
        return `Wallet not connected to Stellar Contract '${this.constructor.name}'`;
    }

    //! can transform input configuration to contract script params
    //! by default, all the config keys are used as script params
    getContractScriptParamsUplc(
        config: ConfigType
    ): UplcRecord<Partial<ConfigType> & Required<Pick<ConfigType, "rev">>> {
        throw new Error(
            `${this.constructor.name} must implement getContractScriptParamsUplc`
        );
    }

    delegateReqdAddress(): false | Address {
        return this.address;
    }
    delegateAddrHint(): Address[] | undefined {
        return undefined;
    }

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
    static async createWith<
        thisType extends StellarContract<configType>,
        configType extends configBaseWithRev = thisType extends StellarContract<
            infer iCT
        >
            ? iCT
            : never
    >(
        this: stellarSubclass<any>,
        args: StellarFactoryArgs<configType>
    ): Promise<StellarContract<configType> & InstanceType<typeof this>> {
        const Class = this;
        const { setup, config, partialConfig } = args;
        const c = new Class(setup, isInternalConstructor);

        // now all internal property assignments have been triggered,
        //  (e.g. class-level currentRev = .... declarations)
        // so we can do initialization activities post-construction
        return c.init(args);
    }
    /**
     * obsolete public constructor.  Use the createWith() factory function instead.
     *
     * @public
     **/
    constructor(setup: SetupDetails, internal: typeof isInternalConstructor) {
        this.setup = setup;
        this._utxoHelper = new UtxoHelper(this);
        if (internal !== isInternalConstructor) {
            throw new Error(
                `StellarContract: use createWith() factory function`
            );
        }
        // console.log(new Error(`\n  in ${this.constructor.name}`).stack!.split("\n").slice(1).join("\n"));

        const { network, networkParams, isTest, isMainnet, actorContext } =
            setup;
        this.actorContext = actorContext;
        // helios.config.set({ IS_TESTNET: !isMainnet }); use for TxBuilderConfig from this.setup.isMainnet
        this.network = network;
        this.networkParams = networkParams;
        // this.isTest = isTest
    }

    async init(args: StellarFactoryArgs<ConfigType>) {
        const { isMainnet, actorContext } = this.setup;
        const chosenNetwork = isMainnet ? "mainnet" : "testnet";
        if ("undefined" !== typeof configuredNetwork) {
            if (configuredNetwork != chosenNetwork) {
                console.warn(
                    `Possible CONFLICT:  previously configured as ${configuredNetwork}, while this setup indicates ${chosenNetwork}` +
                        `\n   ... are you or the user switching between networks?`
                );
            }
        }
        configuredNetwork = chosenNetwork;
        if (actorContext.wallet) {
            const isMain = await actorContext.wallet.isMainnet();
            const foundNetwork = isMain ? "mainnet" : "testnet";
            if (foundNetwork !== chosenNetwork) {
                throw new Error(
                    `wallet on ${foundNetwork} doesn't match network from setup`
                );
            }
            this.actorContext = actorContext;
        }

        const { config, partialConfig } = args;
        if (config) {
            this.configIn = config;
            
            this.scriptProgram = this.loadProgramScript(args);
        } else {
            this.partialConfig = partialConfig;
            this.scriptProgram = this.loadProgramScript();
        }
        return this;
    }

    compiledScript!: anyUplcProgram; // initialized in loadProgramScript

    get datumType() {
        return this.onChainDatumType;
    }

    /**
     * @internal
     **/
    _purpose?: scriptPurpose;
    get purpose() {
        if (this._purpose) return this._purpose;
        const purpose = this.scriptProgram?.purpose as scriptPurpose;
        if (!purpose) return "non-script";
        return (this._purpose = purpose as scriptPurpose);
    }

    get validatorHash() {
        const { vh } = this._cache;
        if (vh) return vh;
        // console.log(this.constructor.name, "cached vh", vh?.hex || "none");
        const nvh = this.compiledScript.hash();
        // console.log("nvh", nvh.hex);
        // if (vh) {
        //     if (!vh.eq(nvh)) {
        //         console.warn(`validatorHash mismatch: ${vh.hex} != ${nvh.hex}`);
        //         debugger
        //     }
        // }
        return (this._cache.vh = new helios.ValidatorHash(nvh));
    }

    //  todo: stakingAddress?: Address or credential or whatever;

    get address(): Address {
        const { addr } = this._cache;
        if (addr) return addr;
        console.log(this.constructor.name, "caching addr");
        console.log(
            "TODO TODO TODO - ensure each contract can indicate the right stake part of its address"
        );
        console.log("and that the onchain part also supports it");

        const nAddr = Address.fromHash(
            this.setup.isMainnet || false,
            this.validatorHash
        );
        // this.validatorHash);
        // console.log("nAddr", nAddr.toBech32());
        // if (this._address) {
        //     if (!this._address.eq(nAddr)) {
        //         console.warn(`address mismatch: ${this._address.toBech32()} != ${nAddr.toBech32()}`);
        //         debugger
        //     }
        // }
        return (this._cache.addr = nAddr);
    }

    get mintingPolicyHash() {
        if ("minting" != this.purpose) return undefined;
        const { mph } = this._cache;
        if (mph) return mph;
        // console.log(this.constructor.name, "_mph", this._mph?.hex || "none");
        const nMph = new helios.MintingPolicyHash(this.compiledScript.hash());
        // console.log("nMph", nMph.hex);
        // if (this._mph) {
        //     if (!this._mph.eq(nMph)) {
        //         console.warn(
        //             `mintingPolicyHash mismatch: ${this._mph.hex} != ${nMph.hex}`
        //         );
        //         debugger
        //     }
        // }
        return (this._cache.mph = nMph);
    }

    get identity() {
        const { identity } = this._cache;
        if (identity) return identity;
        console.log(this.constructor.name, "identity", identity || "none");

        let result: string;
        if ("minting" == this.purpose) {
            const b32 = this.mintingPolicyHash!.toBech32();
            //!!! todo: verify bech32 checksum isn't messed up by this:
            result = b32.replace(/^asset/, "mph");
        } else {
            result = this.address.toBech32();
        }
        // if (this._identity) {
        //     if (this._identity != result) {
        //         console.warn(
        //             `identity mismatch: ${this._identity} != ${result}`
        //         );
        //         debugger
        //     }
        // }
        // console.log("nIdentity", result);
        return (this._cache.identity = result);
    }

    //! searches the network for utxos stored in the contract,
    //  returning those whose datum hash is the same as the input datum
    async outputsSentToDatum(datum: InlineDatum) {
        const myUtxos = await this.network.getUtxos(this.address);
        throw new Error(`unused`);
        // const dump = utxosAsString(myUtxos)
        // console.log({dump})
        return myUtxos.filter((u) => {
            return u.output.datum?.hash.isEqual(datum.hash);
        });
    }

    /**
     * Returns the indicated Value to the contract script
     * @public
     * @param tcx - transaction context
     * @param value - a value already having minUtxo calculated
     * @param datum - inline datum
     **/
    //! adds the indicated Value to the transaction;
    //  ... EXPECTS  the value to already have minUtxo calculated on it.
    @partialTxn // non-activity partial
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum) {
        tcx.addOutput(new TxOutput(this.address, value, datum));

        return tcx;
    }

    async addStrellaWithConfig<
        SC extends StellarContract<any>
        // P = SC extends StellarContract<infer P> ? P : never
    >(
        TargetClass: stellarSubclass<SC>,
        config: SC extends StellarContract<infer iCT> ? iCT : never
    ) {
        const args: StellarFactoryArgs<ConfigFor<SC>> = {
            config,
            setup: this.setup,
        };

        const strella = await TargetClass.createWith(args);
        return strella;
    }

    // async findDatum(d: Datum | DatumHash): Promise<TxInput[]>;
    // async findDatum(predicate: utxoPredicate): Promise<TxInput[]>;
    // async findDatum(d: Datum | DatumHash | utxoPredicate): Promise<TxInput[]> {
    //     let targetHash: DatumHash | undefined =
    //         d instanceof Datum
    //             ? d.hash
    //             : d instanceof DatumHash
    //             ? d
    //             : undefined;
    //     let predicate =
    //         "function" === typeof d
    //             ? d
    //             : (u: TxInput) => {
    //                   const match =
    //                       u.origOutput?.datum?.hash.hex == targetHash?.hex;
    //                   console.log(
    //                       txOutputAsString(
    //                           u.origOutput,
    //                           `    ${match ? "✅ matched " : "❌ no match"}`
    //                       )
    //                   );
    //                   return !!match;
    //               };

    //     //prettier-ignore
    //     console.log(
    //         `finding utxo with datum ${
    //             targetHash?.hex.substring(0,12)
    //         }... in wallet`,
    //         this.address.toBech32().substring(0,18)
    //     );

    //     const heldUtxos = await this.network.getUtxos(this.address);
    //     console.log(`    - found ${heldUtxos.length} utxo:`);
    //     return heldUtxos.filter(predicate);
    // }

    /**
     * Returns all the types exposed by the contract script
     * @remarks
     *
     * Passed directly from Helios; property names match contract's defined type names
     *
     * @public
     **/
    get onChainTypes(): Program["userTypes"][string] {
        // compiledScript.userTypes()
        // const types = { ...this.scriptProgram!.types };

        const scriptNamespace = this.scriptProgram!.name;
        return this.scriptProgram!.userTypes[scriptNamespace];
    }

    /**
     * identifies the enum used for the script Datum
     * @remarks
     *
     * Override this if your contract script uses a type name other than Datum.
     * @public
     **/
    get scriptDatumName() {
        return "Datum";
    }

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
    get onChainDatumType(): DataType {
        const { scriptDatumName: onChainDatumName } = this;
        const scriptNamespace = this.scriptProgram!.name;
        const {
            [scriptNamespace]: { [onChainDatumName]: DatumType },
        } = this.scriptProgram!.userTypes;
        return DatumType;
    }

    /**
     * identifies the enum used for activities (redeemers) in the Helios script
     * @remarks
     *
     * Override this if your contract script uses a type name other than Activity.
     * @public
     **/

    get scriptActivitiesName() {
        return "Activity";
    }

    getSeed(arg: hasSeed): helios.TxOutputId {
        const { txId, idx } =
            arg instanceof StellarTxnContext ? arg.getSeedUtxoDetails() : arg;

        return new helios.TxOutputId(txId, idx);
    }

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
    get onChainActivitiesType() {
        const { scriptActivitiesName: onChainActivitiesName } = this;
        if (!this.scriptProgram) throw new Error(`no scriptProgram`);
        const scriptNamespace = this.scriptProgram!.name;
        const {
            [scriptNamespace]: { [onChainActivitiesName]: ActivitiesType },
        } = this.scriptProgram!.userTypes;

        return ActivitiesType;
    }

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
    mustGetActivity(activityName: string) {
        const ocat = this.onChainActivitiesType;
        return this.mustGetEnumVariant(ocat, activityName);
    }

    /**
     * asserts the presence of the indicated activity name in the on-chain script
     * @remarks
     * The activity name is expected to be found in the script's redeemer enum
     */
    mustHaveActivity(activityName: string) {
        const ocat = this.onChainActivitiesType;
        if (!(activityName in ocat.typeMembers)) {
            throw new Error(
                `${this.constructor.name}: missing required on-chain activity: ${activityName}`
            );
        }
        return this.mustGetEnumVariant(ocat, activityName);
    }

    activityRedeemer(activityName: string, data?: any) {
        const activities = this.onChainActivitiesType;

        return {
            redeemer: this.typeToUplc(activities, {
                [activityName]: data,
            }),
        };
    }

    activityVariantToUplc(activityName: string, data: any) {
        const activities = this.onChainActivitiesType;

        return this.typeToUplc(activities, {
            [activityName]: data,
        });
    }

    mustGetEnumVariant(enumType: DataType, variantName: string) {
        const { [variantName]: variantType } = enumType.typeMembers;

        if (!variantType) {
            // const { scriptActivitiesName: onChainActivitiesName } = this;
            const variantNames: string[] = [];
            //inspect the properties in `this`, using property descriptors.
            for (const [name, _] of Object.entries(enumType.typeMembers)) {
                //Some of them will point to Class definitions.
                // check if any of those classes inherit from UplcData.
                debugger;
                if (isUplcData(enumType[name].prototype)) {
                    console.warn(
                        "\n".repeat(8) +
                            "------------------------ check enum variant name",
                        name
                    );
                    debugger;
                    // if so, add the name to activityNames.
                    variantNames.push(name);
                } else {
                    debugger;
                    throw new Error(
                        "variant names only available via HeliosData : ("
                    );
                }
            }
            debugger;
            //!!! TODO
            // enumType.name.site.syntaxError("yuck")
            ///or similar (search: getFilePos())
            throw new Error(
                `$${
                    this.constructor.name
                }: activity/enum-variant name mismatch in ${
                    //@ts-expect-error
                    enumType.name.value
                }: variant '${variantName}' unknown\n` +
                    ` ... variants in this enum: ${variantNames.join(", ")}`
            );
        }
        return variantType;
    }

    inlineDatum(datumName: string, data: any) {
        return TxOutputDatum.Inline(
            this.typeToUplc(this.onChainDatumType, {
                [datumName]: data,
            })
        );
    }

    typeToUplc(
        type: DataType,
        data: any,
        path: string = ""
    ): UplcData {
        const schema = type.toSchema();
        const cast = new Cast(schema, {
            isMainnet: this.setup.isMainnet || false,
        });
        return cast.toUplcData(data, path);
    }

    paramsToUplc(params: Record<string, any>): UplcRecord<ConfigType> {
        const namespace = this.scriptProgram!.name;
        const { paramTypes } = this.scriptProgram!;

        return Object.fromEntries(
            Object.entries(params).map(([paramName, data]) => {
                const fullName = `${namespace}::${paramName}`;
                // console.log("  -- param", fullName);
                const thatType = paramTypes[fullName];
                return [
                    fullName,
                    this.typeToUplc(thatType, data, `params[${fullName}]`),
                ];
            })
        ) as UplcRecord<ConfigType>;
    }

    async readDatum<
        DPROPS extends anyDatumProps,
        adapterType extends DatumAdapter<any, DPROPS> | undefined = undefined
    >(
        datumNameOrAdapter: string | adapterType,
        datum: Datum | InlineDatum,
        ignoreOtherTypes?: "ignoreOtherTypes"
    ): Promise<
        | (adapterType extends DatumAdapter<any, any> ? adapterType : DPROPS)
        | undefined
    > {
        const ts1 = Date.now();
        const hasAdapter = datumNameOrAdapter instanceof DatumAdapter;
        const datumName: string = hasAdapter
            ? datumNameOrAdapter.datumName
            : (datumNameOrAdapter as string);

        const scriptDatumType = this.onChainDatumType;
        const thisDatumType = scriptDatumType.typeMembers[datumName];
        if (!thisDatumType) throw new Error(`invalid datumName ${datumName}`);

        const cast = new Cast(scriptDatumType.toSchema(), {
            isMainnet: this.setup.isMainnet || false,
        });
        
        const parsedData = (cast.fromUplcData(datum.data) as any)[datumName];
        const ts2 = Date.now();
        // throw new Error(`todo: parse some datum here`);
        // // console.log(` ----- read datum ${datumName}`)

        // if (!datum.isInline())
        //     throw new Error(
        //         `datum must be an InlineDatum to be readable using readDatum()`
        //     );

        // let ts2;
        // const rawParsedData = (await this.readUplcDatum(
        //     thisDatumType,
        //     datum.data!,
        //     ignoreOtherTypes
        // )
        //     .catch((e) => {
        //         if (e.message?.match(/expected constrData/)) return undefined;
        //         throw e;
        //     })
        //     .finally(() => {
        //         ts2 = Date.now();
        //         const elapsed = ts2 - ts1;
        //         if (elapsed > 10) {
        //             console.log(
        //                 `    -- readUplcDatum ${datumName} took ${ts2 - ts1}ms`
        //             );
        //         }
        //     })) as DPROPS | undefined;
        // if (!rawParsedData) return undefined;
        if (hasAdapter) {
            debugger; // ??? vvv
            const adapted = datumNameOrAdapter.fromOnchainDatum(
                parsedData as unknown as adapterParsedOnchainData<
                    DPROPS,
                    "adapterHasConcreteTypeInfo"
                >
            );
            const ts3 = Date.now();
            const elapsed = ts3 - ts1;
            if (elapsed > 10) {
                console.log(`    -- adapter ${datumName} took ${ts3 - ts2}ms`);
                console.log(
                    `  ⏱ readDatum ${datumName} took ${ts3 - ts1}ms total`
                );
            }
            console.log(
                JSON.parse(JSON.stringify(adapted, betterJsonSerializer, 2))
            );
            return adapted;
        }
        return parsedData as any;
    }

    private async readUplcStructList(uplcType: any, uplcData: ListData) {
        const { fieldNames, instanceMembers } = uplcType as any;

        if (uplcType.fieldNames?.length == 1) {
            const fn = fieldNames[0];
            const singleFieldStruct = {
                [fn]: await this.readUplcField(
                    fn,
                    instanceMembers[fn],
                    uplcData
                ),
            };
            return singleFieldStruct;
        }

        const nestedFieldList = uplcData.list;
        return Object.fromEntries(
            await Promise.all(
                fieldNames.map(async (fn: string, i: number) => {
                    const fieldData = nestedFieldList[i];
                    const fieldType = instanceMembers[fn];
                    // console.log(` ----- read struct field ${fn}`)
                    const value = await this.readUplcField(
                        fn,
                        fieldType,
                        fieldData
                    );
                    // console.log(` <----- struct field ${fn}`, value);

                    return [fn, value];
                })
            )
        );
    }

    private async readUplcEnumVariant(
        uplcType: any,
        enumDataDef: any,
        uplcData: ConstrData & UplcData
    ) {
        const fieldNames: string[] = enumDataDef.fieldNames;

        const { fields } = uplcData;
        return Object.fromEntries(
            await Promise.all(
                fieldNames.map(async (fn, i) => {
                    const fieldData = fields[i];
                    const fieldType = enumDataDef.fields[i].type;

                    const value = await this.readUplcField(
                        fn,
                        fieldType,
                        fieldData
                    ).catch((nestedError) => {
                        console.warn(
                            "error parsing nested data inside enum variant",
                            { fn, fieldType, fieldData }
                        );
                        debugger;
                        throw nestedError;
                    });
                    return [fn, value];
                })
            )
        );
    }

    private async readUplcDatum(
        uplcType: any,
        uplcData: UplcData,
        ignoreOther?: "ignoreOtherTypes"
    ) {
        const { fieldNames, instanceMembers } = uplcType as any;
        if (!fieldNames) {
            const enumVariant = uplcType.prototype._enumVariantStatement;
            if (enumVariant) {
                //@ts-expect-error because TS doesn't grok ConstrData here
                const foundIndex = uplcData.index;
                const { dataDefinition: enumDataDef, constrIndex } =
                    enumVariant;
                if (!(uplcData instanceof ConstrData)) {
                    throw new Error(
                        `uplcData mismatch - no constrData, expected constData#${constrIndex}`
                    );
                }
                if (!(foundIndex == constrIndex)) {
                    if (ignoreOther) return undefined;
                    throw new Error(
                        `uplcData expected constrData#${constrIndex}, got #${foundIndex}`
                    );
                }
                const t = this.readUplcEnumVariant(
                    uplcType,
                    enumDataDef,
                    uplcData
                );
                return t; // caller can deal with catching the error
            }
            throw new Error(
                `can't determine how to parse UplcDatum without 'fieldNames'.  Tried enum`
            );
        }

        // const heliosTypes = Object.fromEntries(
        //     fieldNames.map((fn) => {
        //         return [fn, instanceMembers[fn].name];
        //     })
        // );
        // const inputTypes = Object.fromEntries(
        //     fieldNames.map((fn) => {
        //         return [fn, instanceMembers[fn].typeDetails.inputType];
        //     })
        // );
        // const outputTypes = Object.fromEntries(
        //     fieldNames.map((fn) => {
        //         debugger
        //         return [fn, instanceMembers[fn].typeDetails.outputType];
        //     })
        // );
        return Object.fromEntries(
            await Promise.all(
                fieldNames.map(async (fn, i) => {
                    let current;

                    //@ts-expect-error
                    const uplcDataField = uplcData.fields[i];
                    const fieldType = instanceMembers[fn];
                    // console.log(` ----- read field ${fn}`)

                    current = await this.readUplcField(
                        fn,
                        fieldType,
                        uplcDataField
                    );

                    return [fn, current];
                })
            )
        );
    }

    async readTypedUplcMapData(fn: string, uplcMap, valueType) {
        const t = Object.fromEntries(
            await Promise.all(
                uplcMap.map.map(async ([keyThingy, vThingy]) => {
                    // const key = keyThingy.string;
                    const key = helios.bytesToText(keyThingy.bytes);
                    return [
                        key,
                        await this.readUplcField(
                            `${fn}.[${key}]`,
                            valueType,
                            vThingy
                        ),
                    ];
                })
            )
        );
        // if (uplcMap.map.length > 0) debugger
        return t;
    }

    private async readUplcField(
        fn: string,
        fieldType: any,
        uplcDataField: any
    ) {
        let value;
        const { offChainType } = fieldType;
        const isMapData = uplcDataField instanceof helios.MapData;
        try {
            let internalType;
            try {
                internalType = fieldType.typeDetails?.internalType.type;
                if ("Struct" == internalType) {
                    if (isMapData) {
                        value = await this.readOtherUplcType(
                            fn,
                            uplcDataField,
                            fieldType
                        );
                        return value;
                    } else {
                        value = await this.readUplcStructList(
                            fieldType,
                            uplcDataField
                        );
                        // console.log(`  <-- field value`, value)
                        return value;
                    }
                }
            } catch (e) {}
            value = fieldType.uplcToJs(uplcDataField);
            if (value.then) value = await value;

            if (internalType) {
                if (
                    "Enum" === internalType &&
                    0 === uplcDataField.fields.length
                ) {
                    return (value = Object.keys(value)[0]);
                }
            } else if (typeof value === "string") {
                return value;
            } else {
                console.log(
                    "no internal type for special post-uplc-to-JS handling at",
                    fn
                );
                debugger;
                return value;
            }
        } catch (e: any) {
            if (e.message?.match(/doesn't support converting from Uplc/)) {
                if (!offChainType) {
                    return this.readOtherUplcType(fn, uplcDataField, fieldType);
                }
                try {
                    value = await offChainType.fromUplcData(uplcDataField);
                    if (value && "some" in value) value = value.some;
                    if (value && "string" in value) value = value.string;

                    if (isMapData) {
                        const { valueType } =
                            fieldType.typeDetails.internalType;
                        // Map[String]SomethingSpecific?
                        return this.readTypedUplcMapData(
                            fn,
                            uplcDataField,
                            fieldType.instanceMembers.head_value
                        );
                    }
                } catch (e: any) {
                    console.error(`datum: field ${fn}: ${e.message}`);
                    // console.log({outputTypes, fieldNames, offChainTypes, inputTypes, heliosTypes, thisDatumType});
                    debugger;
                    throw e;
                }
            } else {
                throw e;
            }
        }
        // console.log(`  <-- field value`, value)
        return value;
    }
    async readOtherUplcType(fn: string, uplcDataField: any, fieldType: any) {
        if (uplcDataField instanceof helios.IntData) {
            return uplcDataField.value;
        }
        if (uplcDataField instanceof helios.ListData) {
            const entries = [];
            const promises = uplcDataField.list.map((item, i) => {
                const readOne = this.readOtherUplcType(
                    `${fn}.[${i}]`,
                    item,
                    undefined
                );
                return readOne;
            });
            const gotList = Promise.all(promises).catch((e) => {
                console.error(
                    `datum: field ${fn}: error reading list`,
                    e,
                    "\n   ",
                    { uplcDataField, fieldType }
                );
                debugger;
                throw e;
            });
            return gotList;
        }
        if (uplcDataField instanceof helios.IntData) {
            return uplcDataField.value;
        }
        if (uplcDataField instanceof helios.ByteArrayData) {
            return uplcDataField.bytes;
        }

        // it unwraps an existential type tag (#242) providing CIP-68 struct compatibility,
        // to return the inner details' key/value pairs as a JS object.
        if (uplcDataField instanceof helios.ConstrData) {
            //@ts-expect-error
            const { index } = uplcDataField;
            let fieldName = `‹constr#${index}›`;
            if (index == 242) {
                fieldName = "‹cip68›";
                if (
                    // prettier-ignore
                    //@ts-expect-error
                    (uplcDataField.fields.length != 1 || uplcDataField.fields.length != 3) &&

                    !(uplcDataField.fields[0] instanceof helios.MapData
                )
                ) {
                    console.log(
                        "CIP68 wrapper: expected MapData, got ",
                        uplcDataField
                    );
                    debugger;
                    throw new Error(
                        `datum error at ${fn} existential ConstrData(#242) must wrap a single field of MapData, or a triplet with Map, Version, Any`
                    );
                }
            }

            if (!uplcDataField.fields.length) {
                // console.log(`datum: field ${fn}: empty ConstrData`, {
                //     fieldType,
                //     uplcDataField,
                // });
                // enum variant without any nested data.  That's ok!!!
                return uplcDataField; // return `variant #${index}`;
            }
            return this.readOtherUplcType(
                `${fn}.${fieldName}`,

                uplcDataField.fields[0],
                undefined
            );
        }
        if (uplcDataField instanceof helios.MapData) {
            const entries: Record<string, any> = {};
            for (const [k, v] of uplcDataField["map"]) {
                let parsedKey: string;
                try {
                    parsedKey = helios.bytesToText(k.bytes);
                } catch (e) {
                    parsedKey = k.hex;
                }
                // type of value??
                entries[parsedKey] = await this.readOtherUplcType(
                    `${fn}.‹map›@${parsedKey}`,
                    v,
                    undefined
                );
            }

            return entries;
        }
        console.log(`datum: field ${fn}: no offChainType, no internalType`, {
            fieldType,
            uplcDataField,
        });

        debugger;
        return uplcDataField;
    }

    _utxoHelper: UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     */
    get utxoHelper() {
        return this._utxoHelper;
    }
    /**
     * Provides access to a UtxoHelper instance
     * @remarks - same as utxoHelper, but with a shorter name
     */
    get uh() {
        return this._utxoHelper;
    }

    /**
     * @deprecated - use `tcx.submit()` instead.
     */
    async submit(
        tcx: StellarTxnContext,
        {
            signers = [],
            addlTxInfo = {
                description: tcx.txnName ? ": "+tcx.txnName : "",
            },
        }: {
            signers?: Address[];
            addlTxInfo?: Pick<TxDescription<any>, "description">;
        } = {}
    ) {
        console.warn("deprecated: use tcx.submit() instead");
        return tcx.submit({ signers, addlTxInfo });
    }

    ADA(n: bigint | number): bigint {
        const bn =
            "number" == typeof n
                ? BigInt(Math.round(1_000_000 * n))
                : ((BigInt(1_000_000) * n) as bigint);
        return bn;
    }

    //! it requires each subclass to define a contractSource
    contractSource(): HeliosModuleSrc | HeliosModuleOptions {
        throw new Error(
            `${this.constructor.name}: missing required implementation of contractSource()`
        );
    }

    //!!! todo: implement more and/or test me:
    // async findFreeLovelaceWithTokens(v: Value, w: Wallet) {
    // it.todo("helps find spare lovelace in tokens");
    // it.todo("will help harvest spare lovelace in the future if minUtxo is changed");
    //     const utxos = await w.utxos;
    //     const lovelaceOnly = v.assets.isZero();
    //     //! it finds free lovelace in token bundles, if it can't find free lovelace otherwise
    //     if (lovelaceOnly) {
    //         let maxFree: TxInput, minToken: TxInput;
    //         let minPolicyCount = Infinity;

    //         for (const u of utxos) {
    //             const policies = u.value.assets.mintingPolicies.length;
    //             if (policies < minPolicyCount) {
    //                 minPolicyCount = policies;
    //                 minToken = u;
    //             }

    //             const free =
    //                 u.value.lovelace -
    //                 u.origOutput.calcMinLovelace(this.networkParams);
    //             //@ts-ignore
    //             if (!maxFree) {
    //                 maxFree = u;
    //             } else if (free > maxFree!.value.lovelace) {
    //                 maxFree = u;
    //             }
    //         }
    //     }
    // }

    /**
     * Sets a list of Helios source modules to be available for import by the smart contract
     * indicated by `this.contractSource()`
     * @remarks
     * The list of modules is used when compiling the smart contract.
     *
     * Note that the super class may provide import modules, so you should include the result
     * of `super.importModules()` in your return value.
     */
    importModules(): HeliosModuleSrc[] {
        return [];
    }
    _cache: ComputedScriptProperties = {};

    compileWithScriptParams() {
        if (this.compiledScript) {
            console.warn(
                "compileWithScriptParams() called after script compilation already done"
            );
            debugger;
        }
        if (!this.contractParams) {
            throw new Error(`contractParams not set`);
        }

        const script = this.scriptProgram;
        if (!script) {
            console.warn(
                "compileWithScriptParams() called without loaded script"
            );
            debugger;
            throw new Error(`missing required scriptProgram`);
        }

        const t = new Date().getTime();
        for (const [p, v] of Object.entries(this.contractParams)) {
            script.changeParam(p, v);
        }

        console.log(
            `${this.constructor.name} with params:`,
            this.contractParams
        );
        // debugger
        // console.log(
        //     new Error(
        //         "who is triggering script compilation here?"
        //     ).stack!.split("\n").join("\n")
        // );

        global.isCompiling = true;
        // console.profile?.("compile");

        this.compiledScript = script.compile({
            optimize: false,
            // optimize: {
            //     factorizeCommon: false,
            //     keepTracing: true,
            //     flattenNestedFuncExprs: false,
            //     inlineSimpleExprs: false,
            //     removeUnusedArgs: false,
            //     replaceUncalledArgsWithUnit: false,
            //     inlineErrorFreeSingleUserCallExprs: false,
            //     inlineSingleUseFuncExprs: false
            // },
            // withAlt: true,
            //     factorizeCommon: false,                
            // }
        });
        global.isCompiling = false;
        
        console.log(`       ✅ ${this.constructor.name}`);
        this._cache = {};
        const t2 = new Date().getTime();
        
        // Result: ~80ms cold-start or (much) faster on additional compiles
        console.log("::::::::::::::::::::::::compile time " + (t2 - t) + "ms");
        // console.profileEnd?.("compile");
        // if (console.profileEnd) debugger;
    }

    loadProgramScript(
        args?: StellarFactoryArgs<ConfigType>
    ): Program | undefined {
        let codeModule = HeliosModuleSrc.parseFromOptions(
            this.contractSource()
        );

        if (this.scriptProgram) {
            throw new Error("already set program");
            console.warn("already set program");
            debugger;
        }

        const modules = [...new Set(this.importModules())];
        const moduleInfo: Record<string, HeliosModuleSrc> = {
            [codeModule.name]: codeModule,
        };
        console.log(
            `${this.constructor.name} <- `,
            codeModule.name || "‹unknown path›"
        );
        for (let module of modules) {
            const m = HeliosModuleSrc.parseFromOptions(module);
            moduleInfo[m.name] = m;

            const { moduleName, purpose, name, project, content } = m;
            console.log(
                `  -- ${purpose}: ${moduleName} from ${name} in proj ${
                    project || "‹unknown›"
                }`
            );
            if (!(name && purpose && moduleName)) {
                console.log(
                    `  -- ${purpose}: ${moduleName} from ${name} in proj ${
                        project || "‹unknown›"
                    }`
                );

                debugger;
                throw new Error(
                    `${
                        this.constructor.name
                    }: invalid module returned from importModules():\n${
                        name ? `${name}\n` : ""
                    }\n${
                        content.split("\n").slice(0, 3).join("\n") // prettier-ignore
                    }${
                        purpose
                            ? ""
                            : "!!! missing script purpose on line 1, or not tagged as a Helios module.\n"
                    }\n... make sure you're using the result of mkHeliosModule(), if heliosRollupLoader() isn't suitable for your project`
                );
            }
        }
        // console.log({src, Program, modules})

        const { config: params } = args || {};
        try {
            const script = new Program(codeModule, {
                moduleSources: modules,
            });
            this.scriptProgram = script;

            if (params) {
                this.contractParams = this.getContractScriptParamsUplc(params);
                this.compileWithScriptParams();
            }

            return script;
        } catch (e: any) {
            if (e.message.match(/invalid parameter name/)) {
                throw new Error(
                    e.message +
                        `\n   ... this typically occurs when your StellarContract class (${this.constructor.name})` +
                        "\n   ... can be missing a getContractScriptParams() method " +
                        "\n   ... to map from the configured settings to contract parameters"
                );
            }
            const [unsetConst, constName] =
                e.message.match(/used unset const '(.*?)'/) || [];
            if (unsetConst) {
                console.log(e.message);
                throw new Error(
                    `${this.constructor.name}: missing required script param '${constName}' in static getDefaultParams() or getContractScriptParams()`
                );
            }
            if (!e.src) {
                console.error(
                    `unexpected error while compiling helios program (or its imported module) \n` +
                        `> ${e.message}\n` +
                        `Suggested: connect with debugger (we provided a debugging point already)\n` +
                        `  ... and use 'break on caught exceptions' to analyze the error \n` +
                        `This likely indicates a problem in Helios' error reporting - \n` +
                        `   ... please provide a minimal reproducer as an issue report for repair!\n\n` +
                        e.stack.split("\n").slice(1).join("\n")
                );
                try {
                    debugger;
                    // debugger'ing?  YOU ARE AWESOME!
                    //  reminder: ensure "pause on caught exceptions" is enabled
                    //  before playing this next line to dig deeper into the error.
                    const script2 = new Program(codeModule, {
                        moduleSources: modules,
                        isTestnet: this.setup.isTest,
                    });
                    console.log({ params });
                    if (params) {
                        for (const [p, v] of Object.entries(params || {})) {
                            script2.changeParam(p, v);
                        }
                        script2.compile();
                    }
                    console.warn("NOTE: no error thrown on second attempt");
                } catch (sameError) {
                    // entirely expected it would throw the same error
                    // throw sameError;
                }
                // throw e;
            }
            debugger;
            if (!e.site) {
                console.warn(
                    "error thrown from helios doesn't have source site info; rethrowing it"
                );
                throw e;
            }
            const moduleName2 = e.site.file; // moduleName? & filename ? :pray:
            const errorModule = moduleInfo[moduleName2];
            // const errorModule = [codeModule, ...modules].find(
            //     (m) => (m as any).name == moduleName
            // );
            debugger;
            const {
                project,
                moduleName,
                name: srcFilename = "‹unknown path to module›",
                moreInfo,
            } = errorModule || {};
            let errorInfo: string = "";
            try {
                statSync(srcFilename).isFile();
            } catch (e) {
                const indent = " ".repeat(6);
                errorInfo = project
                    ? `\n${indent}Error found in project ${project}:${srcFilename}\n` +
                      `${indent}- in module ${moduleName}:\n${moreInfo}\n` +
                      `${indent}  ... this can be caused by not providing correct types in a module specialization,\n` +
                      `${indent}  ... or if your module definition doesn't include a correct path to your helios file\n`
                    : `\n${indent}WARNING: the error was found in a Helios file that couldn't be resolved in your project\n` +
                      `${indent}  ... this can be caused if your module definition doesn't include a correct path to your helios file\n` +
                      `${indent}  ... (possibly in mkHeliosModule(heliosCode, \n${indent}    "${srcFilename}"\n${indent})\n`;
            }

            debugger;
            const { startLine, startColumn } = e.site;
            const t = new Error(errorInfo);
            const modifiedStack = t.stack!.split("\n").slice(1).join("\n");
            //!!! todo: restore additional errors
            // const additionalErrors = e.src.errors
            //     .slice(1)
            //     .map((x) => `       |         ⚠️  also: ${x}`);
            // const addlErrorText = additionalErrors.length
            //     ? ["", ...additionalErrors, "       v"].join("\n")
            //     : "";
            t.message = `${e.kind}: ${this.constructor.name}: ${
                e.originalMessage
                /* addlErrorText}${ */
            }\n${errorInfo}`;

            t.stack =
                `${this.constructor.name}: ${
                    e.message
                }\n    at ${moduleName2} (${srcFilename}:${1 + startLine}:${
                    1 + startColumn
                })\n` + modifiedStack;

            throw t;
        }
    }

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
    //! finds a utxo (
    async mustFindMyUtxo(
        semanticName: string,
        predicate: utxoPredicate,
        exceptInTcx: StellarTxnContext,
        extraErrorHint?: string
    ): Promise<TxInput>;
    async mustFindMyUtxo(
        semanticName: string,
        predicate: utxoPredicate,
        extraErrorHint?: string
    ): Promise<TxInput>;

    async mustFindMyUtxo(
        semanticName: string,
        predicate: utxoPredicate,
        hintOrExcept?: string | StellarTxnContext,
        hint?: string
    ): Promise<TxInput> {
        const { address } = this;
        const isTcx = hintOrExcept instanceof StellarTxnContext;
        const exceptInTcx = isTcx ? hintOrExcept : undefined;
        const extraErrorHint = isTcx
            ? hint
            : "string" == typeof hintOrExcept
            ? hintOrExcept
            : undefined;

        return this.utxoHelper.mustFindUtxo(
            semanticName,
            predicate,
            { address, exceptInTcx },
            extraErrorHint
        );
    }

    // async hasMyUtxo(
    //     semanticName: string,
    //     predicate: utxoPredicate
    // ): Promise<TxInput | undefined> {
    //     const utxos = await this.network.getUtxos(this.address);

    //     return this.utxoHelper.hasUtxo(semanticName, predicate, {
    //         address: this.address,
    //         utxos,
    //     });
    // }

    /**
     * Reuses an existing transaction context, or creates a new one with the given name and the current actor context
     */
    mkTcx<TCX extends StellarTxnContext>(
        tcx: StellarTxnContext | undefined,
        name?: string
    ): TCX;
    /**
     * Creates a new transaction context with the current actor context
     */
    mkTcx(name?: string): StellarTxnContext;
    mkTcx(tcxOrName?: StellarTxnContext | string, name?: string) {
        const tcx =
            tcxOrName instanceof StellarTxnContext
                ? tcxOrName
                : new StellarTxnContext(this.setup).withName(name || "");
        const effectiveName =
            tcxOrName instanceof StellarTxnContext ? name : tcxOrName;

        if (effectiveName && !tcx.txnName) return tcx.withName(effectiveName);
        return tcx;
    }

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
    async tcxWithSeedUtxo<TCX extends StellarTxnContext>(
        tcx: TCX = new StellarTxnContext(this.setup) as TCX,
        seedUtxo?: TxInput
    ): Promise<TCX & hasSeedUtxo> {
        if (
            //prettier-ignore
            //@ts-expect-error on this type probe
            tcx.state && tcx.state.seedUtxo
        ) {
            return tcx as TCX & hasSeedUtxo;
        }
        if (seedUtxo) {
            if (!tcx.inputs.find((utxo) => utxo.isEqual(seedUtxo))) {
                throw new Error(`seedUtxo not found in transaction inputs`);
            }
            const tcx2 = tcx as TCX & hasSeedUtxo;
            tcx2.state.seedUtxo = seedUtxo;
            return tcx2;
        } else {
            const newSeedUtxo = await this.findUutSeedUtxo([], tcx);
            const tcx2 = tcx.addInput(newSeedUtxo) as TCX & hasSeedUtxo;
            tcx2.state.seedUtxo = newSeedUtxo;
            return tcx2;
        }
    }
    async findUutSeedUtxo(uutPurposes: string[], tcx: StellarTxnContext<any>) {
        //!!! make it big enough to serve minUtxo for the new UUT(s)
        const uh = this.utxoHelper;
        const uutSeed = uh.mkValuePredicate(BigInt(42_000_000), tcx);
        return uh.mustFindActorUtxo(
            `seed-for-uut ${uutPurposes.join("+")}`,
            uutSeed,
            tcx
        );
    }
}
