import {
    Address,
    Assets,
    Datum,
    MintingPolicyHash,
    TxId,
    TxOutput,
    TxInput,
    Value,
} from "@hyperionbt/helios";
import { DefaultMinter } from "./DefaultMinter.js";
import {
    Activity,
    StellarConstructorArgs,
    StellarContract,
    datum,
    isActivity,
    paramsBase,
    partialTxn,
    stellarSubclass,
    txn,
} from "./StellarContract.js";
import { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import { StellarTxnContext } from "./StellarTxnContext.js";
import {
    DelegateConfig,
    SelectedDelegates,
    DelegateConfigNeeded,
    ErrorMap,
    RoleMap,
    variantMap,
    strategyValidation,
    SelectedDelegate,
    VariantStrategy,
    RelativeDelegateLink,
    PartialParamConfig,
    UutName,
} from "./delegation/RolesAndDelegates.js";
import { CapoDelegateHelpers } from "./delegation/CapoDelegateHelpers.js";
import { SeedTxnParams } from "./SeedTxn.js";
import { DefaultCharterDatumArgs } from "./DefaultCapo.js";
import { CapoMintHelpers } from "./CapoMintHelpers.js";
import { StellarHeliosHelpers } from "./StellarHeliosHelpers.js";
import { AuthorityPolicy } from "./authority/AuthorityPolicy.js";
import { AddressAuthorityPolicy } from "./authority/AddressAuthorityPolicy.js";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";

export { variantMap } from "./delegation/RolesAndDelegates.js";
export type {
    RoleMap,
    strategyValidation,
} from "./delegation/RolesAndDelegates.js";

export type uutPurposeMap = { [purpose: string]: UutName };
export type hasSomeUuts<uutEntries extends uutPurposeMap = {}> = {
    uuts: Partial<uutEntries>;
};
export type hasAllUuts<uutEntries extends uutPurposeMap = {}> = {
    uuts: uutEntries;
};

interface hasUutCreator {
    txnCreatingUuts<UutMapType extends uutPurposeMap>(
        tcx: StellarTxnContext<any>,
        uutPurposes: (string & keyof UutMapType)[],
        seedUtxo?: TxInput
    ): Promise<hasUutContext<UutMapType>>;
}

export type MintCharterRedeemerArgs<T={}> = T & {
    owner: Address;
    govAuthorityLink: RelativeDelegateLink
};

export type MintUutRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};
export type hasUutContext<uutEntries extends uutPurposeMap> = StellarTxnContext<
    hasAllUuts<uutEntries>
>;

export interface MinterBaseMethods extends hasUutCreator {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharter(
        tcx: StellarTxnContext<any>,
        charterMintArgs: {
            owner: Address,
            govAuthorityLink: RelativeDelegateLink,
        },
        tVal: valuesEntry
    ): Promise<StellarTxnContext<any>>;
}

export type anyDatumArgs = Record<string, any>;

export abstract class Capo<
        minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter,
        charterDatumType extends anyDatumArgs=anyDatumArgs
    >
    extends StellarContract<SeedTxnParams>
    implements hasUutCreator
{
    get roles(): RoleMap {
        return {
            govAuthority: variantMap<AuthorityPolicy>({ 
                address: {
                    delegateClass: AddressAuthorityPolicy,
                    scriptParams: {
                        mph: "__required__",
                        uut: "__required__"
                    },
                    validateScriptParams(args) : strategyValidation {
                        return undefined
                    }
                }
            }),
        };
    }

    constructor(
        args: StellarConstructorArgs<
            StellarContract<SeedTxnParams>,
            SeedTxnParams
        >
    ) {
        super(args);

        const { Datum, Redeemer } = this.configuredContract.types;

        const { CharterToken } = Datum;
        const { updatingCharter, usingAuthority } = Redeemer;

        if (!CharterToken)
            throw new Error("Datum must have a 'CharterToken' variant");
        if (!updatingCharter)
            throw new Error("Redeemer must have a 'updatingCharter' variant");
        if (!usingAuthority)
            throw new Error("Redeemer must have a 'usingAuthority' variant");
    }
    abstract contractSource(): string;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum;
    // abstract txnMustUseCharterUtxo(
    //     tcx: StellarTxnContext,
    //     newDatum?: InlineDatum
    // ): Promise<TxInput | never>;

    get minterClass(): stellarSubclass<DefaultMinter, SeedTxnParams> {
        return DefaultMinter;
    }

    minter?: minterType;

    @Activity.partialTxn
    txnCreatingUuts<UutMapType extends uutPurposeMap>(
        tcx: StellarTxnContext<any>,
        uutPurposes: (string & keyof UutMapType)[],
        seedUtxo?: TxInput
    ): Promise<hasUutContext<UutMapType>> {
        return this.minter!.txnCreatingUuts(tcx, uutPurposes, seedUtxo);
    }
    // P extends paramsBase = SC extends StellarContract<infer P> ? P : never

    uutsValue(uutMap: uutPurposeMap): Value;
    uutsValue(tcx: hasUutContext<any>): Value;
    uutsValue(x: uutPurposeMap | hasUutContext<any>): Value {
        const uutMap = x instanceof StellarTxnContext ? x.state.uuts! : x;
        const vEntries = this.minter!.mkUutValuesEntries(uutMap);

        return new Value(
            undefined,
            new Assets([[this.mintingPolicyHash!, vEntries]])
        );
    }

    @Activity.redeemer
    protected usingAuthority(): isActivity {
        const r = this.configuredContract.types.Redeemer;
        const { usingAuthority } = r;
        if (!usingAuthority) {
            throw new Error(
                `invalid contract without a usingAuthority redeemer`
            );
        }
        const t = new usingAuthority();

        return { redeemer: t._toUplcData() };
    }

    protected abstract updatingCharter(args: charterDatumType): isActivity;

    tvCharter() {
        return this.minter!.tvCharter();
    }

    get charterTokenAsValue() {
        console.warn(
            "deprecated get charterTokenAsValue; use tvCharter() instead"
        );
        return this.tvCharter();
    }

    importModules(): HeliosModuleSrc[] {
        return [StellarHeliosHelpers, CapoDelegateHelpers, CapoMintHelpers];
    }

    abstract mkTxnMintCharterToken(
        charterDatumArgs: Partial<charterDatumType>,
        tcx?: StellarTxnContext
    ): Promise<StellarTxnContext | never>;
    // @txn
    // async mkTxnMintCharterToken(
    //     datumArgs: charterDatumType,
    //     tcx: StellarTxnContext = new StellarTxnContext()
    // ): Promise<StellarTxnContext | never> {
    //     console.log(
    //         `minting charter from seed ${this.paramsIn.seedTxn.hex.substring(
    //             0,
    //             12
    //         )}…@${this.paramsIn.seedIndex}`
    //     );

    //     return this.mustGetContractSeedUtxo().then((seedUtxo) => {
    //         const v = this.tvCharter();

    //         const datum = this.mkDatumCharterToken(datumArgs);
    //         const output = new TxOutput(this.address, v, datum);
    //         output.correctLovelace(this.networkParams);

    //         tcx.addInput(seedUtxo).addOutputs([output]);

    //         return this.minter!.txnMintingCharter(tcx, {
    //             owner: this.address,
    //             delegate
    //         })
    //     });
    // }

    get charterTokenPredicate() {
        const predicate = this.mkTokenPredicate(this.tvCharter());

        return predicate;
    }

    //! forms a Value with minUtxo included
    tokenAsValue(tokenName: string, quantity: bigint = 1n) {
        const { mintingPolicyHash } = this;

        const e = this.mkValuesEntry(tokenName, quantity);

        const v = new Value(
            this.ADA(0),
            new Assets([[mintingPolicyHash, [e]]])
        );
        const t = new TxOutput(this.address, v);
        const minLovelace = t.calcMinLovelace(this.networkParams);

        v.setLovelace(minLovelace);
        return v;
    }

    async mustFindCharterUtxo() {
        const predicate = this.mkTokenPredicate(this.tvCharter());

        return this.mustFindMyUtxo("charter", predicate, "has it been minted?");
    }

    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext<any>,
        redeemer: isActivity,
        newDatum?: InlineDatum
    ): Promise<StellarTxnContext<any> | never>;
    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext<any>,
        useReferenceInput: true,
        forceAddRefScript?: true
    ): Promise<StellarTxnContext<any> | never>;
    @partialTxn // non-activity partial
    async txnMustUseCharterUtxo(
        tcx: StellarTxnContext<any>,
        redeemerOrRefInput: isActivity | true,
        newDatumOrForceRefScript?: InlineDatum | true
    ): Promise<StellarTxnContext<any> | never> {
        return this.mustFindCharterUtxo().then((ctUtxo: TxInput) => {
            //!!! todo: include call to authority delegate's txnAuthorizeCharter
            if (true === redeemerOrRefInput) {
                if (
                    newDatumOrForceRefScript &&
                    true !== newDatumOrForceRefScript
                )
                    throw new Error(
                        `when using reference input for charter, arg3 can only be true (or may be omitted)`
                    );
                tcx.tx.addRefInput(
                    ctUtxo,
                    newDatumOrForceRefScript ? this.compiledContract : undefined
                );
            } else {
                const redeemer = redeemerOrRefInput;
                const newDatum = newDatumOrForceRefScript;
                if (true === newDatum)
                    throw new Error(
                        `wrong type for newDatum when not using reference input for charter`
                    );
                tcx.addInput(ctUtxo, redeemer.redeemer).attachScript(
                    this.compiledContract
                );
                const datum =
                    newDatum || (ctUtxo.origOutput.datum as InlineDatum);

                this.txnKeepCharterToken(tcx, datum);
            }
            return tcx;
        });
    }

    @partialTxn // non-activity partial
    async txnUpdateCharterUtxo(
        tcx: StellarTxnContext,
        redeemer: isActivity,
        newDatum: InlineDatum
    ): Promise<StellarTxnContext | never> {
        // this helper function is very simple.  Why have it?
        //   -> its 3rd arg is required,
        //   -> and its name gives a more specific meaning.
        return this.txnMustUseCharterUtxo(tcx, redeemer, newDatum);
    }

    @partialTxn // non-activity partial
    txnKeepCharterToken(tcx: StellarTxnContext<any>, datum: InlineDatum) {
        const txo = new TxOutput(this.address, this.tvCharter(), datum);
        txo.correctLovelace(this.networkParams);
        tcx.addOutput(txo);

        return tcx;
    }

    @partialTxn
    async txnAddAuthority(tcx: StellarTxnContext<any>) {
        return this.txnMustUseCharterUtxo(tcx, this.usingAuthority());
    }

    //! it can provide minter-targeted params through getMinterParams()
    getMinterParams() {
        return this.paramsIn;
    }
    getCapoRev() {
        return 1n;
    }

    getContractParams(params: SeedTxnParams) {
        const { mph } = this;
        const rev = this.getCapoRev();
        // console.log("this treasury uses mph", mph?.hex);

        return {
            mph,
            rev,
        };
    }

    get mph() {
        const minter = this.connectMintingScript(this.getMinterParams());
        return minter.mintingPolicyHash!;
    }

    get mintingPolicyHash() {
        return this.mph;
    }

    connectMintingScript(params: SeedTxnParams): minterType {
        if (this.minter) return this.minter;
        const { minterClass } = this;
        const { seedTxn, seedIndex } = this.paramsIn;

        const minter = this.addScriptWithParams(minterClass, params);
        const { mintingCharter, mintingUuts } =
            minter.configuredContract.types.Redeemer;
        if (!mintingCharter)
            throw new Error(
                `minting script doesn't offer required 'mintingCharter' activity-redeemer`
            );
        if (!mintingUuts)
            throw new Error(
                `minting script doesn't offer required 'mintingUuts' activity-redeemer`
            );

        //@ts-ignore-error - can't seem to indicate to typescript that minter's type can be relied on to be enough
        return (this.minter = minter);
    }

    async mustGetContractSeedUtxo(): Promise<TxInput | never> {
        //! given a Capo-based contract instance having a free TxInput to seed its validator address,
        //! prior to initial on-chain creation of contract,
        //! it finds that specific TxInput in the current user's wallet.
        const { seedTxn, seedIndex } = this.paramsIn;
        console.log(
            `seeking seed txn ${seedTxn.hex.substring(0, 12)}…@${seedIndex}`
        );

        return this.mustFindActorUtxo(
            "seed",
            (u) => {
                const { txId, utxoIdx } = u.outputId;

                if (txId.eq(seedTxn) && BigInt(utxoIdx) == seedIndex) {
                    return u;
                }
            },
            "already spent?"
        );
    }

    withDelegates(delegates: SelectedDelegates): StellarTxnContext {
        const tcx = new StellarTxnContext();
        tcx.selectedDelegates = delegates;

        return tcx;
    }

    txnGetSelectedDelegateParams<T extends StellarContract<any>,
        PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
    >(
        tcx: StellarTxnContext,
        roleName: string,
    ) : PartialParamConfig<PT>{
        const selected = this.txnMustSelectDelegate(tcx, roleName);
        const { strategyName, selectedParams } = selected;

        const { roles } = this;
        
        const foundStrategies = roles[roleName];
        const selectedStrategy = foundStrategies[strategyName] as VariantStrategy<T, PT>

        const stratParams = selectedStrategy.scriptParams || {}
        return {...stratParams, ...selectedParams }
    }

    txnMustSelectDelegate<T extends StellarContract<any>,
        PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
    >(
        tcx: StellarTxnContext,
        roleName: string,
    ) : SelectedDelegate<T,PT>{
        const { selectedDelegates } = tcx;
        let selected = selectedDelegates[roleName];
        const role = this.roles[roleName];
        if (!selected) {
            if (role.default) {
                selected = {
                    strategyName: "default",
                    selectedParams: {}
                };
            }
        }
        if (!selected) {
            throw new DelegateConfigNeeded(
                `no selected or default delegate for role '${roleName}' found in transaction-context.  \n`+
                ` Hint:   use ‹capo instance›.withDelegates(delegates) to select delegates by role name`,
                {availableStrategies: Object.keys(role)}
            );
        }

            return selected
        }
    txnMustConfigureSelectedDelegate<T extends StellarContract<any>,
        PT extends paramsBase = T extends StellarContract<infer iPT> ? iPT : never
    >(
        tcx: StellarTxnContext,
        roleName: string,
        partialParams: Partial<PT>={}
    ) : DelegateConfig<T, PT>{
        const { selectedDelegates } = tcx;
        let selected = this.txnMustSelectDelegate(tcx, roleName)
       const { strategyName, selectedParams } = selected;

        const { roles } = this;
        
        const foundStrategies = roles[roleName];
        const selectedStrategy = foundStrategies[strategyName] as VariantStrategy<T, PT>
        if (!selectedStrategy) {
            const e = new DelegateConfigNeeded(`invalid strategy name '${strategyName}' for role '${roleName}'`, {
                availableStrategies: Object.keys(foundStrategies)
            });
            throw e
        }
        const { delegateClass, validateScriptParams } = selectedStrategy;
        const { defaultParams: defaultParamsFromDelegateClass } = delegateClass;
        const scriptParamsFromStrategyVariant = selected.selectedParams;
        const mergedParams: PT = {
            ...defaultParamsFromDelegateClass,
            ...(scriptParamsFromStrategyVariant || {}),
            ...selectedParams,
        } as unknown as PT;

        const errors: ErrorMap | undefined = validateScriptParams(mergedParams);
        if (errors) {
            throw new DelegateConfigNeeded(
                "validation errors in contract params",
                { errors }
            );
        }

        return {
            roleName,
            strategyName,
            scriptParams: mergedParams,
            selectedClass: delegateClass,
        }
    }

    txnMustGetDelegate<RT extends StellarContract<any>>(
        tcx: StellarTxnContext,
        roleName: string,
        configuredDelegate?: DelegateConfig<RT>
    ) : RT {
        const sdd = configuredDelegate || this.txnMustConfigureSelectedDelegate<RT>(tcx, roleName);
        const {selectedClass, scriptParams} = sdd;
        try {
            // delegate
            const configured = this.addScriptWithParams(
                selectedClass,
                scriptParams
            );
            return configured as RT
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

    capoRequirements() {
        return {
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
                    "Building a txn with a UUT involves using the txnCreatingUuts partial-helper on the Capo.",
                    "That UUT (a Value) is returned, and then should be added to a TxOutput.",
                    "Fills tcx.state.uuts with purpose-keyed unique token-names",
                    "The partial-helper doesn't constrain the semantics of the UUT.",
                    "The UUT uses the seed-utxo pattern to form 64 bits of uniqueness",
                    "   ... so that token-names stay short-ish.",
                    "The uniqueness level can be iterated in future as needed.",
                    "The UUT's token-name combines its textual purpose with a short hash ",
                    "   ... of the seed UTxO, formatted with bech32",
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
                    requires: [
                        "supports well-typed role declarations and strategy-adding",
                        "supports just-in-time strategy-selection",
                        "can concretely resolve role delegates",
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
                    "Capo EXPECTS a synchronous getter for 'roles' to be defined",
                    "Capo provides a default 'roles' having no specific roles (or maybe just minter - TBD)",
                    "Subclasses can define their own get roles(), return a role-map-to-variant-map structure",
                ],
                requires: [
                    "role definitions use a RoleMap and nested VariantMap data structure",
                ],
            },
            "supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()":
                {
                    purpose:
                        "enabling each transaction to select appropriate plugins for its contextual needs",
                    details: [
                        "When a transaction having an extensibility-point is being created,",
                        "  ... it SHOULD require an explicit choice of the delegate to use in that role.",
                        "When a mkTxnDoesThings method creates a new role-delegated UTxO, ",
                        "  ... it sets essential configuration details for the delegation ",
                        "  ... and it requires the transaction-context to have delegation details.",
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
                        "withDelegates method starts a transaction with prepared delegate settings",
                        "txnMustGetDelegate(tcx, role) method retrieves a configured delegate",
                        "txnMustGetDelegate() will use a 'default' delegate",
                        "If there is no delegate configured (or defaulted) for the needed role, txnMustGetDelegate throws a DelegateConfigNeeded error.",
                        "If the strategy-configuration has any configuration problems, the DelegateConfigNeeded error contains an 'errors' object",
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
                        "TODO: variants can augment the definedRoles object without removing or replacing any existing variant",
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
                        "supports concrete resolution of role delegates",
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
        };
    }
}
