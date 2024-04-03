import {
    Address,
    Assets,
    DatumHash,
    HInt,
    HeliosData,
    MintingPolicyHash,
    NetworkParams,
    Program,
    TxOutput,
    TxInput,
    UplcData,
    UplcDataValue,
    UplcProgram,
    Value,
    extractScriptPurposeAndName,
    Datum,
    AssetClass,
    //@ts-expect-error
    DataDefinition,
    ListData,
    ConstrData,
    WalletHelper,
} from "@hyperionbt/helios";
import * as helios from "@hyperionbt/helios";
import type { Network, Wallet } from "@hyperionbt/helios";

import {
    StellarTxnContext,
    type AddlTxInfo,
    type AddlTxnCallback,
    type hasAddlTxns,
} from "./StellarTxnContext.js";
import { utxosAsString, valueAsString } from "./diagnostics.js";
import type { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import type { HeliosModuleSrc } from "./HeliosModuleSrc.js";
import { mkTv, stringToNumberArray } from "./utils.js";
import { UutName } from "./delegation/UutName.js";
import type { Capo } from "./Capo.js";
import { DatumAdapter } from "./DatumAdapter.js";

type tokenPredicate<tokenBearer extends canHaveToken> = ((
    something: tokenBearer
) => tokenBearer | undefined) & { value: Value };

type NetworkName = "testnet" | "mainnet";
let configuredNetwork: NetworkName | undefined = undefined;

/**
 * a type for redeemer/activity-factory functions declared with \@Activity.redeemer
 *
 * @public
 */
export type isActivity<T = never> = {
    redeemer: UplcDataValue | UplcData | T;
    // | HeliosData
};

type WalletsAndAddresses = {
    wallets: Wallet[];
    addresses?: Address[];
};
export type utxoInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
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
export type stellarSubclass<
    S extends StellarContract<CT>,
    CT extends configBase = S extends StellarContract<infer iCT>
        ? iCT
        : configBase
> = (new (setup: SetupDetails, internal: typeof isInternalConstructor) => S) & {
    // & StellarContract<CT>
    defaultParams: Partial<CT>;
    createWith(args: StellarFactoryArgs<CT>): Promise<S>;
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
export type configBase = { rev: bigint } & Record<string, any>;

export type devConfigProps = {
    isDev: boolean;
    devGen: bigint;
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
    redeemer(proto, thingName, descriptor) {
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
) {
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
                    return u;
                }
                console.log("  - too small; skipping ", u.value.dump());
            } else {
                if (u.value.ge(v)) {
                    return u;
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
                if (u.value.ge(v)) {
                    return u;
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
    networkParams: NetworkParams;
    isMainnet?: boolean;
    myActor?: Wallet;
    isTest?: boolean;
    isDev?: boolean;
    optimize?: boolean;
};

/**
 * @public
 * Extracts the config type for a Stellar Contract class
 **/
export type ConfigFor<
    SC extends StellarContract<C>,
    C extends configBase = SC extends StellarContract<infer inferredConfig>
        ? inferredConfig
        : never
> = C;

/**
 * Initializes a stellar contract class
 * @remarks
 *
 * Includes network and other standard setup details, and any configuration needed
 * for the specific class.
 * @public
 **/
export type StellarFactoryArgs<CT extends configBase> = {
    setup: SetupDetails;
    config?: CT;
    partialConfig?: Partial<CT>;
};

/**
 * a function that can filter txInputs for coin-selection
 * @remarks
 *
 * short form: "returns truthy" if the input is matchy for the context
 * @public
 **/
export type utxoPredicate =
    | ((u: TxInput) => TxInput | undefined)
    | ((u: TxInput) => boolean)
    | ((u: TxInput) => boolean | undefined);

type scriptPurpose =
    | "testing"
    | "minting"
    | "spending"
    | "staking"
    | "module"
    | "endpoint";

export type canHaveToken = TxInput | TxOutput | Assets;
type UtxoSearchScope = {
    address?: Address;
    wallet?: Wallet;
    exceptInTcx?: StellarTxnContext;
};

type ComputedScriptProperties = Partial<{
    vh: helios.ValidatorHash;
    addr: Address;
    mph: MintingPolicyHash;
    identity: string;
}>;

const isInternalConstructor = Symbol("internalConstructor");

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
    ConfigType extends configBase
> {
    //! it has scriptProgram: a parameterized instance of the contract
    //  ... with specific `parameters` assigned.
    scriptProgram?: Program;
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    contractParams?: configBase;
    setup: SetupDetails;
    network: Network;
    networkParams: NetworkParams;
    myActor?: Wallet;
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
        return !!this.myActor;
    }
    /**
     * returns the wallet connection used by the current actor
     * @remarks
     *
     * Throws an error if the strella contract facade has not been initialized with a wallet in settings.myActor
     * @public
     **/
    get wallet() {
        if (!this.myActor)
            throw new Error(
                `wallet is not connected to strella '${this.constructor.name}'`
            );
        return this.myActor;
    }

    //! can transform input configuration to contract script params
    //! by default, all the config keys are used as script params
    getContractScriptParams(
        config: ConfigType
    ): configBase & Partial<ConfigType> {
        return config;
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
        configType extends configBase = thisType extends StellarContract<
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
        if (internal !== isInternalConstructor) {
            throw new Error(
                `StellarContract: use createWith() factory function`
            );
        }
        const { network, networkParams, isTest, myActor, isMainnet } = setup;

        helios.config.set({ IS_TESTNET: !isMainnet });
        this.network = network;
        this.networkParams = networkParams;
        // this.isTest = isTest
    }

    async init(args: StellarFactoryArgs<ConfigType>) {
        const { isMainnet, myActor } = this.setup;
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
        if (myActor) {
            const isMain = await myActor.isMainnet();
            const foundNetwork = isMain ? "mainnet" : "testnet";
            if (foundNetwork !== chosenNetwork) {
                throw new Error(
                    `wallet on ${foundNetwork} doesn't match network from setup`
                );
            }
            this.myActor = myActor;
        }

        const { config, partialConfig } = args;
        if (config) {
            this.configIn = config;

            const fullScriptParams = (this.contractParams =
                this.getContractScriptParams(config));

            this.scriptProgram = this.loadProgramScript(fullScriptParams);
        } else {
            this.partialConfig = partialConfig;
            this.scriptProgram = this.loadProgramScript();
        }
        return this;
    }

    compiledScript!: UplcProgram; // initialized in loadProgramScript

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
        const nvh = this.compiledScript.validatorHash;
        // console.log("nvh", nvh.hex);
        // if (vh) {
        //     if (!vh.eq(nvh)) {
        //         console.warn(`validatorHash mismatch: ${vh.hex} != ${nvh.hex}`);
        //         debugger
        //     }
        // }
        return (this._cache.vh = nvh);
    }

    //  todo: stakingAddress?: Address or credential or whatever;

    get address(): Address {
        const { addr } = this._cache;
        console.log(
            this.constructor.name,
            "cached addr",
            addr?.toBech32() || "none"
        );
        if (addr) return addr;
        console.log("TODO TODO TODO TODO TODO - ensure each contract can indicate the right stake part of its address");
        console.log("and that the onchain part also supports it")
        
        const nAddr = Address.fromHashes(this.validatorHash);
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
        const nMph = this.compiledScript.mintingPolicyHash;
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

        // const dump = utxosAsString(myUtxos)
        // console.log({dump})
        return myUtxos.filter((u) => {
            return u.origOutput.datum?.hash.hex == datum.hash.hex;
        });
    }

    //! adds the values of the given TxInputs
    totalValue(utxos: TxInput[]): Value {
        return utxos.reduce((v: Value, u: TxInput) => {
            return v.add(u.value);
        }, new Value(0n));
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
    get onChainTypes() {
        const types = { ...this.scriptProgram!.types };
        //@ts-expect-error because allStatements is marked as internal
        const statements = this.scriptProgram!.allStatements;

        for (const [statement, _someBoolThingy] of statements) {
            const name = statement.name.value;
            if (types[name]) continue;
            if (
                "StructStatement" ==
                Object.getPrototypeOf(statement).constructor.name
            ) {
                const type = statement.genOffChainType(); // an off-chain type **representing** an on-chain type
                const name = type.name.value;
                if (types[name]) throw new Error(`ruh roh`);
                types[name] = type;
            }
        }
        return types;
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
    get onChainDatumType() {
        const { scriptDatumName: onChainDatumName } = this;
        const { [onChainDatumName]: DatumType } = this.scriptProgram!.types;
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

        const { [onChainActivitiesName]: ActivitiesType } =
            this.scriptProgram!.types;
        return ActivitiesType;
    }

    /**
     * Retrieves an on-chain type for a specific named activity ("redeemer")
     * @remarks
     *
     * Cross-checks the requested name against the available activities in the script.
     * Throws a helpful error if the requested activity name isn't present.
     * @param activityName - the name of the requested activity
     * @public
     **/
    mustGetActivity(activityName: string) {
        const ocat = this.onChainActivitiesType;
        const { [activityName]: activityType } = ocat;
        if (!activityType) {
            const { scriptActivitiesName: onChainActivitiesName } = this;
            const activityNames: string[] = [];
            //inspect the properties in `this`, using property descriptors.
            for (const [name, _] of Object.entries(
                Object.getOwnPropertyDescriptors(ocat)
            )) {
                //Some of them will point to Class definitions.
                // check if any of those classes inherit from HeliosData.
                if (ocat[name].prototype instanceof HeliosData) {
                    // if so, add the name to activityNames.
                    activityNames.push(name);
                }
            }

            throw new Error(
                `$${this.constructor.name}: activity name mismatch ${onChainActivitiesName}::${activityName}''\n` +
                    `   known activities in this script: ${activityNames.join(
                        ", "
                    )}`
            );
        }
        return activityType;
    }

    async readDatum<
        DPROPS extends anyDatumProps,
        adapterType extends DatumAdapter<any, DPROPS, any> | undefined = undefined
    >(
        datumNameOrAdapter: string | adapterType,
        datum: Datum | InlineDatum,
    ): Promise<
        (adapterType extends DatumAdapter<any,any,any> ? adapterType : DPROPS) | undefined> {
        const hasAdapter = datumNameOrAdapter instanceof DatumAdapter;
        const datumName = hasAdapter ?
            datumNameOrAdapter.datumName : datumNameOrAdapter;
        const thisDatumType = this.onChainDatumType[datumName];
        // console.log(` ----- read datum ${datumName}`)

        if (!thisDatumType) throw new Error(`invalid datumName ${datumName}`);
        if (!datum.isInline())
            throw new Error(
                `datum must be an InlineDatum to be readable using readDatum()`
            );

        const rawParsedData = (await this.readUplcDatum(thisDatumType, datum.data!).catch((e) => {
            if (e.message?.match(/expected constrData/)) return undefined;
            throw e;
        }) ) as DPROPS | undefined;
        if (!rawParsedData) return undefined;
        if (hasAdapter) {
            return datumNameOrAdapter.fromOnchainDatum(rawParsedData);
        }
        return rawParsedData as any
    }

    private async readUplcStructList(uplcType: any, uplcData: ListData) {
        const { fieldNames, instanceMembers } = uplcType as any;

        if (uplcType.fieldNames?.length == 1) {
            const fn = fieldNames[0];
            const singleFieldStruct = {
                [fn]: await this.readUplcField(fn, instanceMembers[fn], uplcData)
            }
            return singleFieldStruct
        }

        //@ts-expect-error until Helios exposes right type info for the list element
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

        //@ts-expect-error TS doesn't understand this enum variant data
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

    private async readUplcDatum(uplcType: any, uplcData: UplcData) {
        const { fieldNames, instanceMembers } = uplcType as any;
        if (!fieldNames) {
            const enumVariant = uplcType.prototype._enumVariantStatement;
            if (enumVariant) {
                //@ts-expect-error because TS doesn't grok ConstrData here
                const foundIndex = uplcData.index;
                const { dataDefinition: enumDataDef, constrIndex } =
                    enumVariant;
                if (!(uplcData instanceof ConstrData))
                    throw new Error(
                        `uplcData mismatch - no constrData, expected constData#${constrIndex}`
                    );
                if (!(foundIndex == constrIndex))
                    throw new Error(
                        `uplcData expected constrData#${constrIndex}, got #${foundIndex}`
                    );

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

    private async readUplcField(
        fn: string,
        fieldType: any,
        uplcDataField: any
    ) {
        let value;
        const { offChainType } = fieldType;
        try {
            let internalType;
            try {
                 internalType = fieldType.typeDetails.internalType.type;
                if ("Struct" == internalType) {
                    value = await this.readUplcStructList(fieldType, uplcDataField);
                    // console.log(`  <-- field value`, value) 
                    return value;
                }
            } catch(e) {}
            value = fieldType.uplcToJs(uplcDataField);
            if (value.then) value = await value;

            if (internalType) {
                if ("Enum" === internalType && 0 === uplcDataField.fields.length) {
                    return value = Object.keys(value)[0];
                }
            } else {
                return value;
                // console.log("no internal type for special post-uplc-to-JS handling at", fn);
                // debugger
            }
        } catch (e: any) {
            if (e.message?.match(/doesn't support converting from Uplc/)) {
                if (!offChainType) { return this.readOtherUplcType(fn, uplcDataField, fieldType); }
                try {
                    value = await offChainType.fromUplcData(uplcDataField);
                    if (value && "some" in value) value = value.some;
                    if (value && "string" in value) value = value.string;
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
            return uplcDataField.value
        }
        if (uplcDataField instanceof helios.MapData) {
            const entries: Record<string, any> = {};
            for (const [k, v] of uplcDataField["map"]) {
                debugger
                const bytesToString = {
                    uplcToJs(uplcField) {
                        return helios.bytesToText(uplcField.bytes)
                    }
                };
                const parsedKey = await this.readUplcField(`${fn}.‹mapKey›`, bytesToString, k)
                                // check type of parsed key?
                debugger
                // type of value??
                entries[  parsedKey ] = await this.readOtherUplcType(
                    `${fn}.‹map›@${parsedKey}`, v, undefined
                )
            }
            debugger
            return entries
        }
        console.log(`datum: field ${fn}: no offChainType, no internalType`, {fieldType, uplcDataField});
        debugger
        return uplcDataField;
    }

    findSmallestUnusedUtxo(
        lovelace: bigint,
        utxos: TxInput[],
        tcx?: StellarTxnContext
    ): TxInput | undefined {
        const value = new Value({ lovelace });
        const toSortInfo = this._mkUtxoSortInfo(value.lovelace);

        const found = utxos
            .map(toSortInfo)
            .filter(this._utxoIsPureADA)
            .filter(this._utxoIsSufficient)
            .filter((uInfo: utxoInfo) => {
                if (!tcx) return true;
                return !!tcx?.utxoNotReserved(uInfo.u);
            })
            .sort(this._utxoSortSmallerAndPureADA)
            .map(this._infoBackToUtxo);
        console.log("smallest utxos: ", utxosAsString(found));
        const chosen = found.at(0);

        return chosen;
    }

    //! creates a filtering function, currently for TxInput-filtering only.
    //! with the optional tcx argument, utxo's already reserved
    //  ... in that transaction context will be skipped.
    mkValuePredicate(
        lovelace: bigint,
        tcx?: StellarTxnContext
    ): tokenPredicate<TxInput> {
        const value = new Value({ lovelace });
        const predicate = _adaPredicate.bind(this, tcx) as tokenPredicate<any>;
        predicate.value = value;
        return predicate;

        function _adaPredicate(
            this: StellarContract<ConfigType>,
            tcx: StellarTxnContext | undefined,
            utxo: TxInput
        ): TxInput | undefined {
            return this.hasOnlyAda(value, tcx, utxo);
        }
    }

    mkMinTv(
        mph: MintingPolicyHash,
        tokenName: string | UutName | number[],
        count: bigint = 1n
    ) {
        const tnBytes = Array.isArray(tokenName)
            ? tokenName
            : stringToNumberArray(tokenName.toString());

        return this.mkMinAssetValue(new AssetClass([mph, tnBytes]), count);
    }

    mkAssetValue(tokenId: AssetClass, count: bigint = 1n) {
        const assets = [[tokenId, count] as [AssetClass, bigint]];
        const v = new Value(undefined, assets);
        return v;
    }

    mkMinAssetValue(tokenId: AssetClass, count: bigint = 1n) {
        const v = this.mkAssetValue(tokenId, count);
        // uses a dummy address so it can be used even during bootstrap
        const txo = new TxOutput(
            new Address(Array<number>(29).fill(0)),
            this.mkAssetValue(tokenId, count)
        );
        txo.correctLovelace(this.networkParams);
        return txo.value;
    }

    mkTokenPredicate(val: Value): tokenPredicate<any>;
    mkTokenPredicate(
        mph: MintingPolicyHash,
        tokenName: string,
        quantity?: bigint
    ): tokenPredicate<any>;
    mkTokenPredicate(
        vOrMph: AssetClass,
        quantity?: bigint
    ): tokenPredicate<any>;
    mkTokenPredicate(
        specifier: Value | MintingPolicyHash | AssetClass | UutName | number[],
        quantOrTokenName?: string | bigint,
        quantity?: bigint
    ): tokenPredicate<any> {
        let v: Value;
        let mph: MintingPolicyHash;
        let tokenName: string;
        //!!! todo: support (AssetClass, quantity) input form
        if (!specifier)
            throw new Error(
                `missing required Value or MintingPolicyHash or UutName (or uut-name as byte-array) in arg1`
            );
        const predicate = _tokenPredicate.bind(this) as tokenPredicate<any>;

        const isValue = specifier instanceof Value;
        const isUut = specifier instanceof Array || specifier instanceof UutName;
        if (isValue) {
            v = predicate.value = specifier;
            return predicate;
        } else if (isUut) {
            const uutNameOrBytes = specifier instanceof Array ? specifier : specifier.name;
            const quant = quantOrTokenName ? BigInt(quantOrTokenName) : 1n;
            v = predicate.value = this.tokenAsValue(
                uutNameOrBytes, 
                quant // quantity if any
            );
            return predicate;
        } else if (specifier instanceof MintingPolicyHash) {
            mph = specifier;
            if ("string" !== typeof quantOrTokenName)
                throw new Error(
                    `with minting policy hash, token-name must be a string (or ByteArray support is TODO)`
                );
            tokenName = quantOrTokenName;
            quantity = quantity || 1n;

            v = predicate.value = this.tokenAsValue(tokenName, quantity, mph);
            return predicate;
        } else if (specifier instanceof AssetClass) {
            mph = specifier.mintingPolicyHash;
            if (!quantOrTokenName) quantOrTokenName = 1n;
            if ("bigint" !== typeof quantOrTokenName)
                throw new Error(
                    `with AssetClass, the second arg must be a bigint like 3n, or omitted`
                );
            quantity = quantOrTokenName;

            v = predicate.value = new Value(0n, [[specifier, quantity]]);
            return predicate;
        } else {
            throw new Error(
                `wrong token specifier (need Value, MPH+tokenName, or AssetClass`
            );
        }

        function _tokenPredicate<tokenBearer extends canHaveToken>(
            this: StellarContract<ConfigType>,
            something: tokenBearer
        ): tokenBearer | undefined {
            return this.hasToken(something, v);
        }
    }

    private hasToken<tokenBearer extends canHaveToken>(
        something: tokenBearer,
        value: Value,
        tokenName?: string,
        quantity?: bigint
    ): tokenBearer | undefined {
        if (something instanceof TxInput)
            return (
                (this.utxoHasToken(something, value, tokenName, quantity) &&
                    something) ||
                undefined
            );
        if (something instanceof TxOutput)
            return (
                (this.outputHasToken(something, value, tokenName, quantity) &&
                    something) ||
                undefined
            );
        if (something instanceof Assets)
            return (
                (this.assetsHasToken(something, value, tokenName, quantity) &&
                    something) ||
                undefined
            );

        //!!! todo: more explicit match for TxInput, which seems to be a type but not an 'instanceof'-testable thing.
        return (
            (this.inputHasToken(something, value, tokenName, quantity) &&
                something) ||
            undefined
        );
    }

    private utxoHasToken(
        u: TxInput,
        value: Value,
        tokenName?: string,
        quantity?: bigint
    ) {
        return (
            this.outputHasToken(u.origOutput, value, tokenName, quantity) && u
        );
    }
    private inputHasToken(
        i: TxInput,
        value: Value,
        tokenName?: string,
        quantity?: bigint
    ) {
        return (
            this.outputHasToken(i.origOutput, value, tokenName, quantity) && i
        );
    }

    private assetsHasToken(
        a: Assets,
        vOrMph: Value | MintingPolicyHash,
        tokenName?: string,
        quantity?: bigint
    ) {
        const v =
            vOrMph instanceof MintingPolicyHash
                ? this.tokenAsValue(tokenName!, quantity!, vOrMph)
                : vOrMph;

        return a.ge(v.assets);
    }

    private outputHasToken(
        o: TxOutput,
        vOrMph: Value | MintingPolicyHash,
        tokenName?: string,
        quantity?: bigint
    ) {
        if (vOrMph instanceof MintingPolicyHash && !tokenName)
            throw new Error(
                `missing required tokenName (or use a Value in arg2`
            );
        if (vOrMph instanceof MintingPolicyHash && !quantity)
            throw new Error(
                `missing required quantity (or use a Value in arg2`
            );

        const v =
            vOrMph instanceof MintingPolicyHash
                ? this.tokenAsValue(tokenName!, quantity!, vOrMph)
                : vOrMph;

        return o.value.ge(v);
    }

    //! deprecated tokenAsValue - use Capo
    tokenAsValue(
        tokenName: string | number[],
        quantity: bigint,
        mph?: MintingPolicyHash
    ): Value {
        throw new Error(
            `deprecated tokenAsValue on StellarContract base class (Capo has mph, not so much any StellarContract`
        );
        // if (!mph) {
        //     mph = (this as any).mph;
        //     if (!mph)
        //         throw new Error(
        //             `tokenAsValue: mph in arg3 required unless the stellar contract (${this.constructor.name}) has an 'mph' getter.`
        //         );
        // }

        // const v = new Value(
        //     this.ADA(0),
        //     new Assets([[mph, [this.mkValuesEntry(tokenName, quantity)]]])
        // );
        // const o = new TxOutput(this.address, v);
        // v.setLovelace(o.calcMinLovelace(this.networkParams));

        // return v;
    }

    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput) {
        const toSortInfo = this._mkUtxoSortInfo(value.lovelace);

        const found = [u]
            .map(toSortInfo)
            .filter(this._utxoIsSufficient)
            .filter(this._utxoIsPureADA)
            .map(this._infoBackToUtxo)
            .at(0);

        return found;
    }

    /**
     * @internal
     **/
    protected _utxoSortSmallerAndPureADA(
        { free: free1, minAdaAmount: r1 }: utxoInfo,
        { free: free2, minAdaAmount: r2 }: utxoInfo
    ) {
        {
            //! primary: treats pure-ada utxos as always better
            if (!r1 && r2) {
                return -1;
            }
            if (r1 && !r2) {
                return 1; //
            }
        }
        //! secondary: smaller utxos are more preferred than larger ones
        if (free2 > free1) return -1;
        if (free2 < free1) return 1;
        return 0;
    }

    /**
     * @internal
     **/
    protected _utxoIsSufficient({ sufficient }: utxoInfo) {
        return !!sufficient;
    }
    /**
     * @internal
     **/
    protected _utxoIsPureADA({ u }: utxoInfo) {
        return u.value.assets.isZero() ? u : undefined;
    }
    /*
     * @internal
     **/
    protected _infoBackToUtxo({ u }: utxoInfo) {
        return u;
    }
    /**
     * @internal
     **/
    protected _mkUtxoSortInfo(min: bigint, max?: bigint) {
        return (u: TxInput): utxoInfo => {
            const minAdaAmount = u.value.assets.isZero()
                ? BigInt(0)
                : u.origOutput.calcMinLovelace(this.networkParams);
            const free = u.value.lovelace - minAdaAmount;
            const sufficient = free > min && (max ? free < max : true);
            const t = { u, sufficient, free, minAdaAmount };
            // console.log(t, utxoAsString(u))
            return t;
        };
    }
    /**
     * @internal
     **/
    protected _utxoCountAdaOnly(c: number, { minAdaAmount }: utxoInfo): number {
        return c + (minAdaAmount ? 0 : 1);
    }

    async findAnySpareUtxos(
        tcx: StellarTxnContext
    ): Promise<TxInput[] | never> {
        if (!this.myActor) throw this.missingActorError;

        const mightNeedFees = this.ADA(3.5);

        const toSortInfo = this._mkUtxoSortInfo(mightNeedFees);
        const notReserved = tcx
            ? tcx.utxoNotReserved.bind(tcx)
            : (u: TxInput) => u;

        return this.myActor.utxos.then((utxos) => {
            const allSpares = utxos
                .filter(notReserved)
                .map(toSortInfo)
                .filter(this._utxoIsSufficient)
                .sort(this._utxoSortSmallerAndPureADA);

            if (allSpares.reduce(this._utxoCountAdaOnly, 0) > 0) {
                return allSpares
                    .filter(this._utxoIsPureADA)
                    .map(this._infoBackToUtxo);
            }
            return allSpares.map(this._infoBackToUtxo);
        });
    }

    async findChangeAddr(): Promise<Address> {
        const { myActor } = this;
        if (!myActor) {
            throw new Error(
                `⚠️ ${this.constructor.name}: no this.myActor; can't get required change address!`
            );
        }
        let unused = (await myActor.unusedAddresses).at(0);
        if (!unused) unused = (await myActor.usedAddresses).at(-1);
        if (!unused)
            throw new Error(
                `⚠️ ${this.constructor.name}: can't find a good change address!`
            );
        return unused;
    }

    async submit(
        tcx: StellarTxnContext,
        {
            signers = [],
        }: {
            signers?: Address[];
        } = {}
    ) {
        let { tx, feeLimit = 2_000_000n } = tcx;
        const { myActor: wallet } = this;

        let walletMustSign = false;
        let sigs: helios.Signature[] | null = [];

        if (wallet || signers.length) {
            const changeAddress = await this.findChangeAddr();

            const spares = await this.findAnySpareUtxos(tcx);
            const willSign = [...signers, ...tcx.neededSigners];

            const wHelper = wallet && new WalletHelper(wallet);
            // if (false)  { if (wallet && wHelper) {
            //     //@ts-expect-error on internal isSmart()
            //     if (tx.isSmart() && !tcx.collateral) {
            //         let [c] = await wallet.collateral;
            //         if (!c) {
            //             c = await wHelper.pickCollateral(this.ADA(5n));
            //             if (c.value.lovelace > this.ADA(20n))
            //                 throw new Error(
            //                     `The only collateral-eligible utxos in this wallet have more than 20 ADA.  It's recommended to create and maintain collateral values between 2 and 20 ADA (or 5 and 20, for more complex txns)`
            //                 );
            //         }
            //         tcx.addCollateral(c); // adds it also to the tx.
            //     }
            // } }
            // if (sign && this.myActor) {
            //     willSign.push(this.myActor);
            // }
            for (const { pubKeyHash: pkh } of willSign) {
                if (!pkh) continue;
                if (tx.body.signers.find((s) => pkh.eq(s))) continue;

                tx.addSigner(pkh);
            }
            // const feeEstimated = tx.estimateFee(this.networkParams);
            // if (feeEstimated > feeLimit) {
            //     console.log("outrageous fee - adjust tcx.feeLimit to get a different threshold")
            //     throw new Error(`outrageous fee-computation found - check txn setup for correctness`)
            // }
            try {
                // const t1 = new Date().getTime();
                await tx.finalize(this.networkParams, changeAddress, spares);
                // const t2 = new Date().getTime();
                // const elapsed = t2 - t1;
                // console.log(`::::::::::::::::::::::::::::::::: tx validation time: ${elapsed}ms`);
                // result: validations for non-trivial txns can take ~800+ ms
                //  - validations with simplify:true, ~250ms - but ...
                //    ... with elided error messages that don't support negative-testing very well
            } catch (e) {
                // todo: find a way to run the same scripts again, with tracing retained
                // for client-facing transparency of failures that can be escalated in a meaningful
                // way to users.
                console.log("FAILED submitting:", tcx.dump(this.networkParams));
                debugger;
                throw e;
            }
            if (wallet && wHelper) {
                for (const a of willSign) {
                    if (!(await wHelper.isOwnAddress(a))) continue;
                    walletMustSign = true;
                    break;
                }
                // if any inputs from the wallet were added as part of finalizing,
                // add the wallet's signature to the txn
                if (!walletMustSign)
                    for (const input of tx.body.inputs) {
                        if (!(await wHelper.isOwnAddress(input.address)))
                            continue;
                        walletMustSign = true;
                        tcx.neededSigners.push(input.address);
                        break;
                    }
                if (walletMustSign) {
                    const walletSign = wallet.signTx(tx);
                    sigs = await walletSign.catch((e) => {
                        console.warn(
                            "signing via wallet failed: " + e.message,
                            tcx.dump(this.networkParams)
                        );
                        return null;
                    });
                    //! doesn't need to re-verify a sig it just collected
                    //   (sig verification is ~2x the cost of signing)
                    if (sigs) tx.addSignatures(sigs, false);
                }
            }
        } else {
            console.warn("no 'myActor'; not finalizing");
        }
        if (walletMustSign && !sigs) {
            throw new Error(`wallet signing failed`);
        }
        console.log("Submitting tx: ", tcx.dump(this.networkParams));
        const promises = [
            this.network.submitTx(tx).catch((e) => {
                console.warn(
                    "submitting via helios Network failed: ",
                    e.message
                );
                debugger;
                throw e;
            }),
        ];
        if (wallet) {
            if (!this.setup.isTest)
                promises.push(
                    wallet.submitTx(tx).catch((e) => {
                        console.warn(
                            "submitting via wallet failed: ",
                            e.message
                        );
                        debugger;
                        throw e;
                    })
                );
        }
        return Promise.any(promises);
    }

    /**
     * Executes additional transactions indicated by an existing transaction
     * @remarks
     *
     * During the off-chain txn-creation process, additional transactions may be
     * queued for execution.  This method is used to execute those transactions.
     * @param tcx - the prior txn context having the additional txns to execute
     * @param callback - an optional async callback that you can use to notify a user, or to log the results of the additional txns
     * @public
     **/
    async submitAddlTxns(
        tcx:  hasAddlTxns<any, any>,
        callback?: AddlTxnCallback
    ) {
        const { addlTxns } = tcx.state;
        for (const [txName, addlTxInfo] of 
            Object.entries(addlTxns) as [ string, AddlTxInfo<any> ][]
        ) {
            const { description, moreInfo, optional, tcx } = addlTxInfo;
            // todo: allow the txn to be skipped, perhaps by letting
            // the callback throw a new SkipAddlTxn error.
            const replacementTcx = callback && ( 
                await callback({txName, ...addlTxInfo})
            );
            await this.submit(replacementTcx || tcx);
        }
    }

    ADA(n: bigint | number): bigint {
        const bn =
            "number" == typeof n
                ? BigInt(Math.round(1_000_000 * n))
                : ((BigInt(1_000_000) * n) as bigint);
        return bn;
    }

    //! it requires each subclass to define a contractSource
    contractSource(): string | never {
        throw new Error(`${this.constructor.name}: missing required implementation of contractSource()`);
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

    importModules(): HeliosModuleSrc[] {
        return [];
    }
    _cache: ComputedScriptProperties = {};

    loadProgramScript(params?: Partial<ConfigType>): Program | undefined {
        const src = this.contractSource();
        const modules = this.importModules();
        console.log(`${this.constructor.name}: loading program script from`, 
            //@ts-expect-error
            src.srcFile || "‹unknown path›"
        );
        for (const module of modules) {
            const { srcFile, purpose, moduleName } = module;
            console.log(  `  -- ${purpose}: ${moduleName} from ${srcFile}`);
            if (!(srcFile && purpose && moduleName)) {
                throw new Error(
                    `${
                        this.constructor.name
                    }: invalid module returned from importModules():\n${
                        module.split("\n").slice(0, 3).join("\n") // prettier-ignore
                    }\n... you may need to create it with mkHeliosModule() if heliosRollupLoader() isn't suitable for your project`
                );
            }
        }
        // console.log({src, Program, modules})

        try {
            const script = Program.new(src, modules);
            if (params) script.parameters = params;

            const simplify =
                "optimize" in this.setup
                    ? this.setup.optimize
                    : !this.setup.isTest && !this.setup.isDev;
            // const t = new Date().getTime();
            if (simplify) {
                console.warn(
                    `Loading optimized contract code for ` + script.name
                );
            }

            console.log(
                `${this.constructor.name}: setting compiledScript with simplify=${simplify} + params:`,
                params
            );
            //!!! todo: consider pushing this to JIT or async
            this.compiledScript = script.compile(simplify);
            this._cache = {};
            // const t2 = new Date().getTime();

            // Result: ~80ms cold-start or (much) faster on additional compiles
            // console.log("::::::::::::::::::::::::compile time "+ (t2 - t) + "ms")
            // -> caching would not improve

            // const configured = Program.new(source)
            // configured.parameters = params;
            // const compiledScript = configured.compile(simplify)
            // const addr = Address.fromHashes(compiledScript.validatorHash)

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
                    const script2 = Program.new(src, modules);
                    console.log({ params });
                    if (params) script2.parameters = params;
                } catch (sameError) {
                    throw sameError;
                }
                throw e;
            }
            const moduleName = e.src.name;
            const errorModule = [src, ...modules].find(
                (m) => (m as any).moduleName == moduleName
            );
            const { srcFile = "‹unknown path to module›" } =
                (errorModule as any) || {};
            const [sl, sc, el, ec] = e.getFilePos();
            const t = new Error("");
            const modifiedStack = t.stack!.split("\n").slice(1).join("\n");
            const additionalErrors = e.src.errors
                .slice(1)
                .map((x) => `       |         ⚠️  also: ${x}`);
            const addlErrorText = additionalErrors.length
                ? ["", ...additionalErrors, "       v"].join("\n")
                : "";
            t.message = this.constructor.name + ":" + e.message + addlErrorText;

            t.stack =
                `${this.constructor.name}: ${
                    e.message
                }\n    at ${moduleName} (${srcFile}:${1 + sl}:${1 + sc})\n` +
                modifiedStack;

            throw t;
        }
    }

    private get missingActorError(): string | undefined {
        return `Wallet not connected to Stellar Contract '${this.constructor.name}'`;
    }

    async findActorUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined
    ) {
        const wallet = this.myActor;

        if (!wallet) throw new Error(this.missingActorError);

        return this.hasUtxo(name, predicate, { wallet });
    }

    async mustFindActorUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        exceptInTcx: StellarTxnContext<any>,
        extraErrorHint?: string
    ): Promise<TxInput>;
    async mustFindActorUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        extraErrorHint?: string
    ): Promise<TxInput>;

    async mustFindActorUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        hintOrExcept?: string | StellarTxnContext,
        hint?: string
    ): Promise<TxInput> {
        const wallet = this.myActor;

        if (!wallet) throw new Error(this.missingActorError);
        const isTcx = hintOrExcept instanceof StellarTxnContext;
        const exceptInTcx = isTcx ? hintOrExcept : undefined;
        const extraErrorHint = isTcx
            ? hint
            : "string" == typeof hintOrExcept
            ? hintOrExcept
            : undefined;

        return this.mustFindUtxo(
            name,
            predicate,
            { wallet, exceptInTcx },
            extraErrorHint
        );
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

        return this.mustFindUtxo(
            semanticName,
            predicate,
            { address, exceptInTcx },
            extraErrorHint
        );
    }

    async mustFindUtxo(
        semanticName: string,
        predicate: utxoPredicate,
        searchScope: UtxoSearchScope,
        extraErrorHint: string = ""
    ): Promise<TxInput> {
        const { address, wallet, exceptInTcx } = searchScope;

        const found = await this.hasUtxo(semanticName, predicate, {
            address,
            wallet,
            exceptInTcx,
        });
        if (!found) {
            throw new Error(this.utxoSearchError(semanticName, searchScope));
        }

        return found;
    }

    utxoSearchError(
        semanticName: string,
        searchScope: UtxoSearchScope,
        extraErrorHint?: string
    ): string {
        const where = searchScope.address
            ? `address ${searchScope.address.toBech32()}`
            : `connected wallet`;
        return `${this.constructor.name}: '${semanticName}' utxo not found (${
            extraErrorHint || "sorry, no extra clues available"
        }) in ${where}`;
    }
    toUtxoId(u: TxInput) {
        return `${u.outputId.txId.hex}@${u.outputId.utxoIdx}`;
    }

    /**
     * Try finding a utxo matching a predicate
     * @remarks
     *
     * Finds the first matching utxo, if any, either in the indicated search-scope's `wallet` or `address`.
     *
     * @public
     **/
    async hasUtxo(
        semanticName: string,
        predicate: utxoPredicate,
        { address, wallet, exceptInTcx }: UtxoSearchScope
    ): Promise<TxInput | undefined> {
        const utxos = address
            ? await this.network.getUtxos(address)
            : await wallet!.utxos;

        const collateral = (wallet ? await wallet.collateral : [])[0];
        // const filterUtxos = [
        //     ...collateral,
        //     ...(exceptInTcx?.reservedUtxos() || []),
        // ];
        const notCollateral = utxos.filter((u) => !collateral?.eq(u));
        const filtered = exceptInTcx
            ? notCollateral.filter(
                  exceptInTcx.utxoNotReserved.bind(exceptInTcx)
              )
            : notCollateral;

        console.log(
            `finding '${semanticName}' utxo${
                exceptInTcx ? " (not already being spent in txn)" : ""
            } from set:\n  ${utxosAsString(filtered, "\n  ")}`
            // ...(exceptInTcx && filterUtxos?.length
            //     ? [
            //           "\n  ... after filtering out:\n ",
            //           utxosAsString(exceptInTcx.reservedUtxos(), "\n  "),
            //       ]
            //     : [])
        );

        const found = filtered.find(predicate);
        if (found) {
            console.log("  <- found:" + utxosAsString([found]));
        } else {
            console.log("  (not found)");
        }
        return found;
    }

    async hasMyUtxo(
        semanticName: string,
        predicate: utxoPredicate
    ): Promise<TxInput | undefined> {
        return this.hasUtxo(semanticName, predicate, { address: this.address });
    }
}
