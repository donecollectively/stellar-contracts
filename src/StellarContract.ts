import {
    makeAddress,
    makeTxOutput,
    makeValidatorHash,
    type Address,
    type MintingPolicyHash,
    type NetworkParams,
    type TxInput,
    type ValidatorHash,
    type Value,
    makeMintingPolicyHash,
    makeInlineTxOutputDatum,
    type TxOutputId,
} from "@helios-lang/ledger";

import type {
    CardanoClient,
    Emulator,
    TxChainBuilder,
    Wallet,
} from "@helios-lang/tx-utils";
import type { UplcProgramV3, UplcData } from "@helios-lang/uplc";
import type { DataType, Program, EnumMemberType } from "@helios-lang/compiler";

import {
    StellarTxnContext,
    type TxDescription,
    type hasSeedUtxo,
} from "./StellarTxnContext.js";
import { betterJsonSerializer } from "./diagnostics.js";
import type {
    anyUplcProgram,
    InlineDatum,
    valuesEntry,
} from "./HeliosPromotedTypes.js";
import type { Capo } from "./Capo.js";
import { UtxoHelper, type utxoPredicate } from "./UtxoHelper.js";
// import { CachedHeliosProgram } from "./helios/CachedHeliosProgram.js";
// import { uplcDataSerializer } from "./delegation/jsonSerializers.js";
import { HeliosScriptBundle } from "./helios/scriptBundling/HeliosScriptBundle.js";
import { type HeliosBundleClass } from "./helios/HeliosMetaTypes.js";
import {
    DataBridge,
    ContractDataBridge,
    DataBridgeReaderClass,
    ContractDataBridgeWithOtherDatum,
    ContractDataBridgeWithEnumDatum,
} from "./helios/dataBridge/DataBridge.js";
import type { possiblyAbstractContractBridgeType } from "./helios/dataBridge/BridgeTypes.js";
import type { findReadDatumType } from "./helios/dataBridge/BridgeTypes.js";
import type { mustFindConcreteContractBridgeType } from "./helios/dataBridge/BridgeTypes.js";
import type { AbstractNew } from "./helios/typeUtils.js";
import { getSeed, type hasSeed, type SeedAttrs } from "./ActivityTypes.js";
import { makeCast } from "@helios-lang/contract-utils";
import type {
    DeployedProgramBundle,
    SerializedHeliosCacheEntry,
} from "./helios/CachedHeliosProgram.js";
import type { DeployedScriptDetails } from "./configuration/DeployedScriptConfigs.js";
import type { TxBatcher } from "./networkClients/TxBatcher.js";
import { bytesToHex } from "@helios-lang/codec-utils";

type NetworkName = "testnet" | "mainnet";
let configuredNetwork: NetworkName | undefined = undefined;

/**
 * @public
 */
export function isUplcData(x: any): x is UplcData {
    return "kind" in x && "toCbor" in x;
}

/**
 * @public
 */
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
    setup: SetupInfo
) => S) & {
    // & StellarContract<CT>
    defaultParams: Partial<ConfigFor<S>>;
    createWith(args: StellarSetupDetails<ConfigFor<S>>): Promise<S>;
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

/**
 * @public
 */
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
        needsActiveVerb(thingName, /* show workaround offer */ true);
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

/**
 * @public
 */
export async function findInputsInWallets(
    v: Value,
    searchIn: WalletsAndAddresses,
    network: CardanoClient
): Promise<TxInput<any>> {
    const { wallets, addresses } = searchIn;

    const lovelaceOnly = v.assets.isZero();
    console.warn("finding inputs", {
        lovelaceOnly,
    });

    for (const w of wallets) {
        const [a] = await w.usedAddresses;
        console.log("finding funds in wallet", a.toString().substring(0, 18));
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

export type HeliosOptimizeOptions = Exclude<Pick<Exclude<
    Parameters<Program["compile"]>[0], undefined | boolean
>, "optimize"
>["optimize"], undefined | boolean>

export type UtxoDisplayCache = Map<TxOutputId, string>;
/**
 * standard setup for any Stellar Contract class
 * @public
 **/
export type SetupInfo = {
    /** access to ledger: utxos, txn-posting; can sometimes be a TxChainBuilder overlay on the real network */
    network: CardanoClient | Emulator;
    /** the actual network client; never a TxChainBuilder */
    chainBuilder?: TxChainBuilder;
    /** the params for this network */
    networkParams: NetworkParams;
    /** collects a batch of transactions, connected with a TxChainBuilder in context */
    txBatcher: TxBatcher;
    /** false for any testnet.  todo: how to express L2? */
    isMainnet: boolean;
    /** wallet-wrapping envelope, allows wallet-changing without reinitializing anything using that envelope */
    actorContext: ActorContext;
    /** testing environment? */
    isTest?: boolean;
    /** helper for finding utxos and related utility functions */
    uh?: UtxoHelper;
    /** global setting for script-compile optimization, only used when a compilation is triggered, can be overridden per script-bundle  */
    optimize?: boolean | HeliosOptimizeOptions;
    /** presentation-cache indicates utxos whose details have already been emitted to the console */
    uxtoDisplayCache?: UtxoDisplayCache;
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
export type StellarSetupDetails<CT extends configBaseWithRev> = {
    setup: SetupInfo;
    config?: CT;
    partialConfig?: Partial<CT>;
    programBundle?: DeployedProgramBundle;
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
};

export type SetupOrMainnetSignalForBundle = Partial<
    Omit<SetupInfo, "isMainnet">
> &
    Required<Pick<SetupInfo, "isMainnet">> & { isPlaceholder?: any };

export type StellarBundleSetupDetails<CT extends configBaseWithRev> = {
    setup: SetupOrMainnetSignalForBundle;
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
    params?: CT;
    /**
     * used only for Capo bundles, to initialize them based on
     * their `.hlDeploy.<network>.json` config file
     */
    deployedDetails?: DeployedScriptDetails<CT>;
    // partialConfig?: Partial<UplcRecord<CT>>;
    variant?: string;
};

type scriptPurpose =
    | "testing"
    | "minting"
    | "spending"
    | "staking"
    | "module"
    | "endpoint"
    | "non-script";

type ComputedScriptProperties = Partial<{
    vh: ValidatorHash;
    addr: Address;
    mph: MintingPolicyHash;
    program: Program;
    identity: string;
}>;

/**
 * @public
 */
export type ActorContext<WTP extends Wallet = Wallet> = {
    wallet?: WTP;
};
/**
 * @public
 */
export type NetworkContext<NWT extends CardanoClient = CardanoClient> = {
    network: NWT;
};

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
    // bundle?: HeliosScriptBundle;
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    // contractParams?: UplcRecord<ConfigType>;
    setup: SetupInfo;
    get network(): CardanoClient | Emulator | TxChainBuilder {
        return this.setup.chainBuilder || this.setup.network;
    }

    networkParams: NetworkParams;
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
    scriptBundle(): HeliosScriptBundle {
        debugger; // eslint-disable-line no-debugger - keep for downstream troubleshooting
        throw new Error(
            `${this.constructor.name}: missing required implementation of scriptBundle()\n` +
                `...each Stellar Contract must provide a scriptBundle() method. \n` +
                `It should return an instance of a class defined in a *.hlb.ts file.  At minimum:\n\n` +
                `    export default class MyScriptBundle extends HeliosScriptBundle { ... }\n` +
                ` or export default CapoDelegateBundle.usingCapoBundleClass(SomeCapoBundleClass) { ... }\n\n` +
                `We'll generate TS types and other utilities for connecting to the data-types in your Helios sources.\n` +
                `Your scriptBundle() method can return \`MyScriptBundle.create();\``
        );
    }

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
    dataBridgeClass: AbstractNew<ContractDataBridge> | undefined = undefined;

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
     * @public
     */
    get onchain(): possiblyAbstractContractBridgeType<this> {
        return this.getOnchainBridge();
    }

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
     * @public
     */
    get offchain(): possiblyAbstractContractBridgeType<this>["reader"] {
        // ensures the dataBridge is initialized by accessing the 'onchain' getter
        // accesses its data-reader.
        return this.getOnchainBridge().reader;
    }

    get reader(): possiblyAbstractContractBridgeType<this>["reader"] {
        // ensures the dataBridge is initialized by accessing the 'onchain' getter
        // accesses its data-reader.
        return this.getOnchainBridge().reader;
    }

    get activity(): any {
        const bridge = this.onchain;
        return bridge.activity as any;
    }

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
    get newReadDatum(): findReadDatumType<this> {
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

        return readDatum;
    }

    _bundle: HeliosScriptBundle | undefined;
    getBundle(): HeliosScriptBundle {
        if (!this._bundle) {
            this._bundle = this.scriptBundle();
            if (
                this._bundle.preCompiled &&
                !this._bundle.preCompiled.singleton
            ) {
            }
            if (!this._bundle._didInit) {
                console.warn(
                    `NOTE: the scriptBundle() method in ${this.constructor.name} isn't\n` +
                        `initialized properly; it should use \`${this._bundle.constructor.name}.create({...})\`\n` +
                        `... instead of \`new ${this._bundle.constructor.name}({...})\` `
                );
            }
            // this._bundle.checkDevReload()
        }

        return this._bundle;
    }

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
    // get activity(): findActivityType<this> {
    //     const bridge = this.onchain;
    //     // each specific bridge has to have an activity type, but this code can't
    //     // introspect that type.  It could be a getter OR a method, and Typescript can only
    //     // be told it is one, or the other, concretely.
    //     // findActivityType() does probe for the specific type for specific contracts,
    //     // at the **interface** level, but this code has no visibility of that.

    //     //x@ts-expect-error accessing it in this way
    //     const { activity } = bridge

    //     return activity as any
    // }

    // /**
    //  * Redirect for intuitive developers having a 'redeemer' habit
    //  *
    //  * @deprecated - We recommend using `activity` instead of `redeemer`
    //  */
    // get redeemer(): findActivityType<this> {
    //     return this.activity;
    // }

    /**
     * Provides access to the script's defined on-chain types, using a fluent
     * API for type-safe generation of data conforming to on-chain data formats & types.
     * @remarks
     *
     */
    _dataBridge?: ContractDataBridge;
    // get mkDatum() : findDatumType<this> {
    //     //x@ts-expect-error probing for presence
    //     if (!this.onchain?.datum) throw new Error(`${this.constructor.name}: no datum is used on this type of script`);

    //     //@ts-expect-error probing for presence
    //     return this.onchain.datum;
    // }

    getOnchainBridge(): possiblyAbstractContractBridgeType<this> {
        if ("undefined" == typeof this._dataBridge) {
            const { dataBridgeClass } = this;
            if (!dataBridgeClass) {
                if (this.usesContractScript) {
                    throw new Error(
                        `${
                            this._bundle?.moduleName || this.constructor.name
                        }: each contract script needs a dataBridgeClass = dataBridge‹YourScriptName›\n` +
                            `  ... this dataBridge class is generated by heliosRollupBundler \n` +
                            `  ... and imported (\`import dataBridge‹something› from "./‹yourScriptName›.bridge.js"\`)\n` +
                            `      This critical class converts between off-chain and on-chain typed data\n\n` +
                            `Note: if you haven't customized the mint AND spend delegates for your Capo, \n` +
                            `  ... you might want to define both of those roles using a single \n` +
                            `  ... subclass of the BasicMintDelegate. That fixes the most common \n` +
                            `  ... first-time setup problems of this kind.`
                    );
                } else {
                    console.log(
                        `${this.constructor.name} dataBridgeClass = NONE`
                    );
                    this._dataBridge = undefined;
                    //@ts-expect-error setting to degenerate type
                    return null;
                }
            }

            const datumType = this.getBundle().locateDatumType();
            const isMainnet = this.setup.isMainnet;
            let newBridge: any;
            try {
                newBridge = new (dataBridgeClass as any)(
                    isMainnet ?? false
                ) as any;
            } catch (e) {
                console.error(e);
                debugger;
            }
            if (datumType) {
                // verifies that the dataBridge ALSO has a datum-type
                console.log(
                    `${this.constructor.name} dataBridgeClass = `,
                    dataBridgeClass.name
                );
                if (!newBridge.datum) {
                    console.warn(
                        `${this.constructor.name}: dataBridgeClass must define a datum accessor.  This is likely a code-generation problem.`
                    );
                }
            }
            // verifies that every dataBridge has an activity-type
            if (!newBridge.activity) {
                console.warn(
                    `${this.constructor.name}: dataBridgeClass must define an activity accessor.  This is likely a code-generation problem.`
                );
            }
            if ("undefined" == typeof isMainnet) {
                return newBridge;
            }

            return (this._dataBridge = newBridge);
        }

        if (!this._dataBridge) {
            throw new Error(
                `${this.constructor.name}: this contract script doesn't have a dataBridgeClass defined`
            );
        }
        //@ts-expect-error - the type we show externally is fine, given the above logic.
        // It's not worth hoop-jumping to make TS perfectly happy with how the sausage is made.
        return this._dataBridge;
    }

    ADA(n: bigint | number): bigint {
        const bn =
            "number" == typeof n
                ? BigInt(Math.round(1_000_000 * n))
                : ((BigInt(1_000_000) * n) as bigint);
        return bn;
    }

    get isConfigured(): boolean {
        return !!this.configIn;
    }

    get isConnected() {
        return this.isConfigured && !!this.wallet;
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

    get missingActorError(): string {
        return `Wallet not connected to Stellar Contract '${this.constructor.name}'`;
    }

    /**
     * Transforms input configuration to contract script params
     * @remarks
     * May filter out any keys from the ConfigType that are not in the contract
     * script's params.  Should add any keys that may be needed by the script and
     * not included in the ConfigType (as delegate scripts do with `delegateName`).
     */
    getContractScriptParams(
        config: ConfigType
    ): Partial<ConfigType> & Required<Pick<ConfigType, "rev">> {
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
        configType extends configBaseWithRev = thisType extends StellarContract<
            infer iCT
        >
            ? iCT
            : never
    >(
        this: stellarSubclass<any>,
        args: StellarSetupDetails<configType>
    ): Promise<StellarContract<configType> & InstanceType<typeof this>> {
        const Class = this;
        const {
            setup,
            config,
            partialConfig,
            previousOnchainScript: program,
        } = args;
        const c: StellarContract<configType> = new Class(setup);

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
    constructor(setup: SetupInfo) {
        this.setup = setup;
        this._utxoHelper = new UtxoHelper(this.setup, this);
        setup.uh = this._utxoHelper;

        // console.log(new Error(`\n  in ${this.constructor.name}`).stack!.split("\n").slice(1).join("\n"));

        const { networkParams, isTest, isMainnet, actorContext } = setup;
        this.actorContext = actorContext;
        // helios.config.set({ IS_TESTNET: !isMainnet }); use for TxBuilderConfig from this.setup.isMainnet
        this.networkParams = networkParams;
        // this.isTest = isTest
    }

    get canPartialConfig() {
        return false;
    }
    /**
     * performs async initialization, enabling an async factory pattern
     * @remarks
     * This method is called by the createWith() factory function, and should not be called directly.
     *
     *
     */
    async init(args: StellarSetupDetails<ConfigType>) {
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
            const walletIsMainnet = await actorContext.wallet.isMainnet();
            const foundNetwork = walletIsMainnet ? "mainnet" :"a testnet (preprod/preview)";
            const chosenNetworkLabel = isMainnet ? "mainnet" : "a testnet (preprod/preview)";
            if (walletIsMainnet !== isMainnet) {
                const message = `The wallet is connected to ${foundNetwork}, doesn't match this app's target network  ${chosenNetworkLabel}`;
                if (chosenNetwork == "mainnet") {
                    console.log(`${message}\n   ... have you provided env.TESTNET to the build to target a testnet?`)
                }
                throw new Error( message );
            }
            // redundant
            this.actorContext = actorContext;
        }

        // the config comes from...
        //  - a Stellar SaaSaaS configuration handle
        //      - has a SaaS application id
        //      - maps domain name to a specific SaaS instance for that SaaS app
        //      - resolves to a Capo Configuration structure
        //  - a Capo Configuration structure created in Stellar SaaS, with...
        //      - Capo minter's seed-txn/mph/rev
        //          - seed txn == a utxo in Stellar SaaS contract
        //          - in this case, there is also args.programBundle, provided by
        //            the Capo's init(), via its connectMintingScript().
        //      - Capo's mph/rev & script hash
        //      - each delegate's {rev, delegateName, isMint/Spend/DataPolicy} details
        //          - a script hash for the delegate's script, can be cross-checked with the on-chain version
        //          - possibly an "upgrade from ... " {rev} for strong signals of need to update
        //      - materialized in code bundle and/or dApp's localStorage/indexedDB
        //          - with CBOR scripts ready to use
        //  - (temporary) a similar configuration structure included with the dApp, where supported
        //  - (temporary) a null configuration for testnet deployment
        //      - the dApp will generate a config structure to be deployed
        //      - ... using a seed txn selected from the creator's wallet (for a Capo Minter in testnet)
        //  - low-level bootstrap details for emulator & automated-testing
        //      - using a seed txn from emulated environment's wallet
        //      - the minter MPH (for a Capo)
        //      - derived details for delegates

        const {
            config,
            partialConfig,
            programBundle,
            previousOnchainScript,
            previousOnchainScript: { validatorHash, uplcProgram } = {},
        } = args;
        this.partialConfig = partialConfig;
        this.configIn = config;

        if (uplcProgram) {
            // with a rawProgram, the contract script is used directly
            // to make a HeliosScriptBundle with that rawProgram
            // as an override.
            this._bundle = this.scriptBundle().withSetupDetails({
                setup: this.setup,
                previousOnchainScript: previousOnchainScript,
                // params: this.getContractScriptParams(config),
                // deployedDetails: {
                //     config,
                // },
            });
        } else if (config || partialConfig) {
            //@ts-expect-error on probe for possible but not
            //   required variant config
            const variant = (config || partialConfig).variant;

            // const params = this.getContractScriptParams(config);
            if (this.usesContractScript) {
                const genericBundle = this.scriptBundle();
                if (!config) {
                    debugger
                    console.warn(`${this.constructor.name}: no config provided`)
                }
                const params =
                    genericBundle.scriptParamsSource != "bundle"
                        ? config ? { params: this.getContractScriptParams(config) }
                        : {} : {};
                const deployedDetails = {
                    config,
                    programBundle,
                    // scriptHash,
                };
                if (!programBundle) {
                    console.log(
                        `  -- 🐞🐞🐞 🐞 ${this.constructor.name}: no programBundle; will use JIT compilation`
                    );
                }
                this._bundle = genericBundle.withSetupDetails({
                    ...params,
                    setup: this.setup,
                    deployedDetails,
                    variant,
                });
                // await this.prepareBundleWithScriptParams(params);
                
            } else if (partialConfig) {
                // if (this.canPartialConfig) {
                throw new Error(
                    `${this.constructor.name}: any use case for partial-config?`
                );
                this.partialConfig = partialConfig;
                // this._bundle = this.scriptBundle();
            }
            if (this.usesContractScript) {
                const bundle = this.getBundle();
                if (!bundle) {
                    throw new Error(
                        `${this.constructor.name}: missing required this.bundle for contract class`
                    );
                } else if (!bundle.isHeliosScriptBundle()) {
                    throw new Error(
                        `${this.constructor.name}: this.bundle must be a HeliosScriptBundle; got ${bundle.constructor.name}`
                    );
                }
                if (bundle.setup && bundle.configuredParams) {
                    try {
                        // eager compile for early feedback on errors
                        this._compiledScript = await bundle.compiledScript(
                            true
                        );
                    } catch (e: any) {
                        console.warn(
                            "while setting compiledScript: ",
                            e.message
                        );
                    }
                } else if (bundle.setup && bundle.params) {
                    debugger;
                    throw new Error(`what is this situation here? (dbpa)`);
                }
                console.log(this.program.name, "bundle loaded");
            }
        } else {
            const bundle = this.getBundle();
            if (bundle.isPrecompiled) {
                console.log(
                    `${bundle.displayName}: will use precompiled script on-demand`
                );
                // this.compiledScript = await bundle.compiledScript();
            } else if (bundle.scriptParamsSource == "config") {
                console.log(
                    `${this.constructor.name}: not preconfigured; will use JIT compilation`
                );
            } else if (bundle.scriptParamsSource == "bundle") {
                throw new Error(
                    `missing required on-chain script params in bundle`
                );
            }
            this.partialConfig = partialConfig;
        }

        return this;
    }

    _compiledScript!: anyUplcProgram; // initialized in compileWithScriptParams()
    get compiledScript(): anyUplcProgram {
        if (!this._compiledScript) {
            throw new Error(
                `${this.constructor.name}: compiledScript not yet initialized; call asyncCompiledScript() first`
            );
        }
        return this._compiledScript;
    }

    async asyncCompiledScript() {
        const s = await this.getBundle().compiledScript(true);
        this._compiledScript = s;
        return s;
    }
    usesContractScript: boolean = true;

    get datumType(): DataType {
        return this.onChainDatumType;
    }

    /**
     * @internal
     **/
    get purpose(): scriptPurpose {
        const purpose = this.program.purpose as scriptPurpose;
        if (!purpose) return "non-script";
        return purpose;
    }

    get validatorHash() {
        const { vh } = this._cache;
        if (vh) return vh;
        // console.log(this.constructor.name, "cached vh", vh?.hex || "none");

        // debugger
        const nvh = this.compiledScript.hash();
        // console.log("nvh", nvh.hex);
        // if (vh) {
        //     if (!vh.eq(nvh)) {
        //         console.warn(`validatorHash mismatch: ${vh.hex} != ${nvh.hex}`);
        //         debugger
        //     }
        // }
        return (this._cache.vh = makeValidatorHash(nvh));
    }

    //  todo: stakingAddress?: Address or credential or whatever;

    get address(): Address {
        const prevVh = this._bundle?.previousOnchainScript?.validatorHash
        if (prevVh) {
            return makeAddress(this.setup.isMainnet, makeValidatorHash(prevVh))
        }
        const { addr } = this._cache;
        if (addr) return addr;
        if (!this.validatorHash) {
            throw new Error(
                "This contract isn't yet configured with a validatorHash"
            );
        }
        console.log(this.constructor.name, "caching addr");
        console.log(
            "TODO TODO TODO - ensure each contract can indicate the right stake part of its address"
        );
        console.log("and that the onchain part also supports it");
        const isMainnet = this.setup.isMainnet;
        if ("undefined" == typeof isMainnet) {
            throw new Error(
                `${this.constructor.name}: isMainnet must be defined in the setup`
            );
        }
        const nAddr = makeAddress(isMainnet, this.validatorHash);
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
        const nMph = makeMintingPolicyHash(this.compiledScript.hash());
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
            const b32 = this.mintingPolicyHash!.toString();
            //!!! todo: verify bech32 checksum isn't messed up by this:
            result = b32.replace(/^asset/, "mph");
        } else {
            result = this.address.toString();
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
    async outputsSentToDatum(datum: InlineDatum): Promise<any> /*unused*/ {
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
        tcx.addOutput(makeTxOutput(this.address, value, datum));

        return tcx;
    }

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

        const scriptNamespace = this.program.name;
        return this.program.userTypes[scriptNamespace];
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
        return this.getBundle()!.locateDatumType()!;
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

    getSeed(arg: hasSeed) {
        return getSeed(arg);
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
    get onChainActivitiesType(): DataType {
        const { scriptActivitiesName: onChainActivitiesName } = this;
        if (!this._bundle) throw new Error(`no scriptProgram`);
        const scriptNamespace = this.program.name;
        const {
            [scriptNamespace]: { [onChainActivitiesName]: ActivitiesType },
        } = this.program.userTypes;

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
    mustGetActivity(activityName: string): EnumMemberType | null {
        const ocat = this.onChainActivitiesType;
        return this.mustGetEnumVariant(ocat, activityName);
    }

    /**
     * asserts the presence of the indicated activity name in the on-chain script
     * @remarks
     * The activity name is expected to be found in the script's redeemer enum
     */
    mustHaveActivity(activityName: string): EnumMemberType | null {
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

    mustGetEnumVariant(
        enumType: DataType,
        variantName: string
    ): EnumMemberType | null {
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
                `$${this.constructor.name}: activity/enum-variant name mismatch in ${enumType.name}: variant '${variantName}' unknown\n` +
                    ` ... variants in this enum: ${variantNames.join(", ")}`
            );
        }
        return variantType.asEnumMemberType;
    }

    inlineDatum(datumName: string, data: any) {
        return makeInlineTxOutputDatum(
            this.typeToUplc(this.onChainDatumType, {
                [datumName]: data,
            })
        );
    }

    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     * @remarks
     * Allows other methods to proceed prior to the final determination of mainnet status.
     *
     * Any code using this path should avoid caching a negative result.  If you need to
     * determine the actual network being used, getBundle().isMainnet, if present, provides
     * the definitive answer.  If that attribute is not yet present, then the mainnet status
     * has not yet been materialized.
     * @public
     */
    isDefinitelyMainnet() {
        return this.getBundle().isDefinitelyMainnet();
    }

    paramsToUplc(params: Record<string, any>): UplcRecord<ConfigType> {
        return this.getBundle().paramsToUplc(params);
    }

    typeToUplc(type: DataType, data: any, path: string = ""): UplcData {
        return this.getBundle().typeToUplc(type, data, path);
    }

    get program() {
        return this.getBundle()!.program;
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
                description: tcx.txnName ? ": " + tcx.txnName : "",
            },
        }: {
            signers?: Address[];
            addlTxInfo?: Pick<TxDescription<any, any>, "description">;
        } = {}
    ) {
        console.warn("deprecated: use tcx.submit() instead");
        return tcx.buildAndQueue({ signers, addlTxInfo });
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

    _cache: ComputedScriptProperties = {};
    optimize: boolean = true;

    async prepareBundleWithScriptParams(
        params: Partial<ConfigType> & Required<Pick<ConfigType, "rev">>
    ) {
        if (this._compiledScript) {
            console.warn(
                "compileWithScriptParams() called after script compilation already done"
            );
            debugger;
        }
        if (!this.usesContractScript) {
            throw new Error(`avoid this call to begin with?`);
            return;
        }
        if (!params) {
            throw new Error(`contractParams not set`);
        }

        let bundle = this.getBundle();
        // if (bundle.isPrecompiled) {
        //     debugger;
        //     console.warn(
        //         `deployed script shouldn't need to compile (debugging breakpoint available)`
        //     );
        // }
        if (!this.setup) {
            console.warn(
                `compileWithScriptParams() called before setup is available`
            );
            debugger;
        }

        if (
            !bundle.setup ||
            bundle.setup.isPlaceholder ||
            !bundle.configuredUplcParams
        ) {
            // serves capo's bootstrap in mkTxnMintCharterToken()
            // also allows delegates to call <bundleClass>.create() without args,
            // ... and still get the right setup details.
            bundle = this._bundle = bundle.withSetupDetails({
                params,
                setup: this.setup,
            });
        }
        // this._compiledScript = await bundle.compiledScript(true);

        // console.log(
        //     `       ✅ ${this.constructor.name} ready with scriptHash=`,
        //     bytesToHex(this.compiledScript.hash())
        // );
        this._cache = {};
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
        options: {
            predicate: utxoPredicate;
            exceptInTcx?: StellarTxnContext;
            extraErrorHint?: string;
            utxos?: TxInput[];
        }
    ): Promise<TxInput> {
        const { predicate, exceptInTcx, extraErrorHint, utxos } = options;
        const { address } = this;

        return this.utxoHelper.mustFindUtxo(semanticName, {
            predicate,
            address,
            exceptInTcx,
            extraErrorHint,
            utxos,
        });
    }

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
            let tcx2 = tcx as TCX & hasSeedUtxo;
            if (!tcx.inputs.find((utxo) => utxo.isEqual(seedUtxo))) {
                tcx2 = tcx2.addInput(seedUtxo);
                // throw new Error(`seedUtxo not found in transaction inputs`);
            }
            tcx2.state.seedUtxo = seedUtxo;
            return tcx2;
        } else {
            return this.findUutSeedUtxo([], tcx).then((newSeedUtxo) => {
                const tcx2 = tcx.addInput(newSeedUtxo) as TCX & hasSeedUtxo;
                tcx2.state.seedUtxo = newSeedUtxo;
                return tcx2;
            });
        }
    }
    async findUutSeedUtxo(uutPurposes: string[], tcx: StellarTxnContext<any>) {
        const uh = this.utxoHelper;
        //!!! big enough to serve minUtxo for each of the new UUT(s)
        const uutSeed = uh.mkValuePredicate(BigInt(13_000_000), tcx);
        return uh.mustFindActorUtxo(`seed-for-uut ${uutPurposes.join("+")}`, {
            predicate: uutSeed,
            exceptInTcx: tcx,
            extraErrorHint:
                "You might need to create some granular utxos in your wallet by sending yourself a series of small transactions (e.g. 15 then 16 and then 17 ADA) as separate utxos/txns",
        });
    }
}
