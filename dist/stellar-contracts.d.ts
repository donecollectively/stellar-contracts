import { Address } from '@hyperionbt/helios';
import { AssetClass } from '@hyperionbt/helios';
import { Assets } from '@hyperionbt/helios';
import { Datum } from '@hyperionbt/helios';
import * as helios from '@hyperionbt/helios';
import { MintingPolicyHash } from '@hyperionbt/helios';
import { Network } from '@hyperionbt/helios';
import { NetworkEmulator } from '@hyperionbt/helios';
import { NetworkParams } from '@hyperionbt/helios';
import { Program } from '@hyperionbt/helios';
import { ReqtsMap } from './Requirements.js';
import { SimpleWallet } from '@hyperionbt/helios';
import { TestContext } from 'vitest';
import { Tx } from '@hyperionbt/helios';
import { TxId } from '@hyperionbt/helios';
import { TxInput } from '@hyperionbt/helios';
import { TxOutput } from '@hyperionbt/helios';
import { UplcData } from '@hyperionbt/helios';
import { UplcDataValue } from '@hyperionbt/helios';
import { UplcProgram } from '@hyperionbt/helios';
import { Value } from '@hyperionbt/helios';
import { Wallet } from '@hyperionbt/helios';

export declare const Activity: {
    partialTxn(proto: any, thingName: any, descriptor: any): any;
    redeemer(proto: any, thingName: any, descriptor: any): any;
    redeemerData(proto: any, thingName: any, descriptor: any): any;
};

declare type actorMap = Record<string, SimpleWallet>;

export declare const ADA = 1000000n;

export declare function addTestContext<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never>(context: StellarTestContext<any, SC, P>, TestHelperClass: helperSubclass<SC>, params?: P): Promise<void>;

declare type anyDatumArgs = Record<string, any>;

export declare type anyDatumProps = Record<string, any>;

export declare function assetsAsString(v: any): string;

export declare class BasicMintDelegate extends StellarContract<MintDelegateArgs> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    contractSource(): any;
    getContractScriptParams(config: MintDelegateArgs): paramsBase;
    txnCreatingTokenPolicy(tcx: StellarTxnContext, tokenName: string): Promise<StellarTxnContext>;
    servesDelegationRole(role: string): true | undefined;
    static mkDelegateWithArgs(a: MintDelegateArgs): void;
}

declare type canHaveRandomSeed = {
    randomSeed?: number;
};

declare type canHaveToken = TxInput | TxOutput | Assets;

declare type canSkipSetup = {
    skipSetup?: true;
};

export declare abstract class Capo<minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter, charterDatumType extends anyDatumArgs = anyDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends StellarContract<configType> implements hasUutCreator {
    abstract get roles(): RoleMap;
    constructor(args: StellarConstructorArgs<StellarContract<CapoBaseConfig>>);
    abstract contractSource(): string;
    abstract mkDatumCharterToken(args: charterDatumType): InlineDatum;
    get minterClass(): stellarSubclass<DefaultMinter, SeedTxnParams>;
    minter?: minterType;
    txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(tcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
    uutsValue(uutMap: uutPurposeMap<any>): Value;
    uutsValue(tcx: hasUutContext<any>): Value;
    protected usingAuthority(): isActivity;
    protected abstract updatingCharter(args: charterDatumType): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    importModules(): HeliosModuleSrc[];
    abstract mkTxnMintCharterToken(charterDatumArgs: Partial<charterDatumType>, tcx?: StellarTxnContext): Promise<StellarTxnContext | never>;
    get charterTokenPredicate(): ((something: any) => any) & {
        value: Value;
    };
    tokenAsValue(tokenName: string, quantity?: bigint): Value;
    mustFindCharterUtxo(): Promise<TxInput>;
    abstract txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum): Promise<StellarTxnContext<any> | never>;
    txnMustUseCharterUtxo(tcx: StellarTxnContext<any>, redeemer: isActivity, newDatum?: InlineDatum): Promise<StellarTxnContext<any> | never>;
    txnMustUseCharterUtxo(tcx: StellarTxnContext<any>, useReferenceInput: true, forceAddRefScript?: true): Promise<StellarTxnContext<any> | never>;
    txnUpdateCharterUtxo(tcx: StellarTxnContext, redeemer: isActivity, newDatum: InlineDatum): Promise<StellarTxnContext | never>;
    txnKeepCharterToken(tcx: StellarTxnContext<any>, datum: InlineDatum): StellarTxnContext<any>;
    txnAddAuthority(tcx: StellarTxnContext<any>): Promise<StellarTxnContext<any>>;
    getMinterParams(): configType;
    getCapoRev(): bigint;
    getContractScriptParams(params: SeedTxnParams): {
        mph: MintingPolicyHash;
        rev: bigint;
    };
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    connectMintingScript(params: SeedTxnParams): minterType;
    mustGetContractSeedUtxo(): Promise<TxInput | never>;
    withDelegates(delegates: SelectedDelegates): hasSelectedDelegates;
    txnGetSelectedDelegateConfig<T extends StellarContract<any>, const RN extends string>(tcx: hasSelectedDelegates, roleName: RN): PartialParamConfig<ConfigFor<T>>;
    txnMustSelectDelegate<T extends StellarContract<any>, const RN extends string, TCX extends hasSelectedDelegates>(tcx: TCX, roleName: RN): SelectedDelegate<T>;
    protected txnMustConfigureSelectedDelegate<T extends StellarContract<any>, const RN extends string>(tcx: hasSelectedDelegates & hasUutContext<RN>, roleName: RN): DelegateSettings<T>;
    mkImpliedSettings(uut: UutName): CapoImpliedSettings;
    txnMustGetDelegate<T extends StellarContract<any>, const RN extends string>(tcx: hasSelectedDelegates & hasUutContext<RN>, roleName: RN, configuredDelegate?: DelegateSettings<T>): T;
    connectDelegateWith<DelegateType extends StellarContract<any>>(roleName: string, delegateLink: RelativeDelegateLink<ConfigFor<DelegateType>>): Promise<DelegateType>;
    capoRequirements(): ReqtsMap<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name">;
}

declare type CapoBaseConfig = SeedTxnParams & {
    mph: MintingPolicyHash;
};

declare type CapoImpliedSettings = {
    uut: AssetClass;
};

export declare abstract class CapoTestHelper<SC extends Capo<any>, CDT extends anyDatumArgs = SC extends Capo<any, infer iCDT> ? iCDT : anyDatumArgs> extends StellarTestHelper<SC, CapoBaseConfig> {
    initialize({ randomSeed, seedTxn, seedIndex, }?: {
        seedTxn?: TxId;
        seedIndex?: bigint;
        randomSeed?: number;
    }): Promise<SC>;
    abstract mkDefaultCharterArgs(): Partial<CDT>;
    mintCharterToken(args?: CDT): Promise<StellarTxnContext>;
}

declare type ConfigFor<SC extends StellarContract<C>, C extends paramsBase = SC extends StellarContract<infer inferredConfig> ? inferredConfig : never> = C;

export declare function datum(proto: any, thingName: any, descriptor: any): any;

declare const DatumInline: typeof Datum.inline;

export declare class DefaultCapo<MinterType extends DefaultMinter = DefaultMinter, CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends Capo<MinterType, CDT, configType> {
    contractSource(): any;
    get roles(): RoleMap;
    mkDatumCharterToken(args: CDT): InlineDatum;
    txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum): Promise<StellarTxnContext<{}>>;
    mkTxnMintCharterToken(charterDatumArgs: PartialDefaultCharterDatumArgs<CDT>, existingTcx?: hasSelectedDelegates): Promise<StellarTxnContext | never>;
    updatingCharter(): isActivity;
    mkTxnUpdateCharter(args: CDT, tcx?: StellarTxnContext): Promise<StellarTxnContext>;
    requirements(): ReqtsMap<"the trustee group can be changed" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the trustee threshold is enforced on all administrative actions" | "the charter token is always kept in the contract" | "can mint other tokens, on the authority of the Charter token" | "has a singleton minting policy" | "foo">;
}

export declare type DefaultCharterDatumArgs<CT extends paramsBase = CapoBaseConfig> = {
    govAuthorityLink: RelativeDelegateLink<CT>;
};

export declare class DefaultMinter extends StellarContract<SeedTxnParams> implements MinterBaseMethods {
    contractSource(): any;
    importModules(): HeliosModuleSrc[];
    txnWithUuts<const purposes extends string, existingTcx extends StellarTxnContext<any>, const R extends string>(tcx: existingTcx, uutPurposes: purposes[], seedUtxo: TxInput, role: R): Promise<existingTcx & hasUutContext<purposes | (R extends "" ? never : R)>>;
    txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(initialTcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
    mkUutValuesEntries<UM extends uutPurposeMap<any>>(uutMap: UM): valuesEntry[];
    get mintingPolicyHash(): MintingPolicyHash;
    protected mintingCharter({ owner, }: MintCharterRedeemerArgs): isActivity;
    protected mintingUuts({ seedTxn, seedIndex: sIdx, purposes, }: MintUutRedeemerArgs): isActivity;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharter(tcx: StellarTxnContext, { owner, authZor }: {
        authZor: UutName;
        owner: Address;
    }): Promise<StellarTxnContext>;
}

declare type DelegateSettings<T extends StellarContract<any>> = {
    delegateClass: stellarSubclass<T>;
    roleName: string;
    strategyName: string;
    config: ConfigFor<T>;
    reqdAddress?: Address;
    addressesHint?: Address[];
};

declare type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};

declare type ErrorMap = Record<string, string[]>;

export declare function errorMapAsString(em: ErrorMap, prefix?: string): string;

export declare type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
};

declare type hasDelegateProp = {
    delegates: SelectedDelegates;
};

declare type hasSelectedDelegates = StellarTxnContext<hasDelegateProp>;

export declare type hasSomeUuts<uutEntries extends string> = {
    uuts: Partial<uutPurposeMap<uutEntries>>;
};

export declare type hasUutContext<uutEntries extends string> = StellarTxnContext<hasAllUuts<uutEntries>>;

declare interface hasUutCreator {
    txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(tcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
}

export declare type HeliosModuleSrc = string & {
    srcFile: string;
    purpose: string;
    moduleName: string;
};

export declare function heliosRollupLoader(opts?: {
    include: string;
    exclude: never[];
}): {
    name: string;
    transform(content: any, id: any): {
        code: String;
        map: {
            mappings: string;
        };
    } | undefined;
};

declare type helperSubclass<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> = new (params: P & canHaveRandomSeed) => StellarTestHelper<SC, P>;

export declare type InlineDatum = ReturnType<typeof DatumInline>;

export declare type isActivity = {
    redeemer: UplcDataValue | UplcData;
};

export declare function lovelaceToAda(l: bigint | number): string;

export declare type MintCharterRedeemerArgs<T = {}> = T & {
    owner: Address;
};

declare type MintDelegateArgs = {
    rev: bigint;
    uut: AssetClass;
};

declare interface MinterBaseMethods extends hasUutCreator {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharter(tcx: StellarTxnContext<any>, charterMintArgs: {
        owner: Address;
        authZor: UutName;
    }, tVal: valuesEntry): Promise<StellarTxnContext<any>>;
}

export declare type MintUutRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};

export declare function mkHeliosModule(src: string, filename: string): HeliosModuleSrc;

declare type noState = {};

declare const PARAM_IMPLIED: unique symbol;

declare const PARAM_REQUIRED: unique symbol;

export declare type paramsBase = Record<string, any>;

declare type PartialDefaultCharterDatumArgs<T extends DefaultCharterDatumArgs<any> = DefaultCharterDatumArgs, CT extends paramsBase = T extends DefaultCharterDatumArgs<infer iCT> ? iCT : never> = Partial<Omit<T, "govAuthorityLink">> & {
    govAuthorityLink: Required<Pick<RelativeDelegateLink<CT>, "strategyName">> & Partial<RelativeDelegateLink<CT>>;
};

declare type PartialParamConfig<CT extends paramsBase> = Partial<{
    [key in keyof CT]: typeof PARAM_REQUIRED | typeof PARAM_IMPLIED | CT[key];
}>;

export declare function partialTxn(proto: any, thingName: any, descriptor: any): any;

declare type RelativeDelegateLink<CT extends paramsBase> = {
    uutName: string;
    strategyName: string;
    config: Partial<CT>;
    reqdAddress?: Address;
    addressesHint?: Address[];
};

export declare type RoleMap = Record<string, VariantMap<any>>;

declare type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint";

export declare type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

declare type SelectedDelegate<T extends StellarContract<any>> = {
    strategyName: string;
    config: Partial<ConfigFor<T>>;
};

declare type SelectedDelegates = {
    [roleName: string]: SelectedDelegate<StellarContract<any>>;
};

declare type SetupDetails = {
    network: Network;
    networkParams: NetworkParams;
    isTest: boolean;
    myActor?: Wallet;
};

declare type StellarConstructorArgs<SC extends StellarContract<any>> = {
    setup: SetupDetails;
    config: ConfigFor<SC>;
};

export declare class StellarContract<ConfigType extends paramsBase> {
    scriptProgram?: Program;
    configIn: ConfigType;
    contractParams: paramsBase;
    setup: SetupDetails;
    network: Network;
    networkParams: NetworkParams;
    myActor?: Wallet;
    static get defaultParams(): {};
    getContractScriptParams(config: ConfigType): paramsBase;
    constructor({ setup, config, }: StellarConstructorArgs<StellarContract<any>>);
    compiledScript: UplcProgram;
    get datumType(): any;
    _purpose?: scriptPurpose;
    get purpose(): scriptPurpose | "non-script";
    get address(): Address;
    get mintingPolicyHash(): MintingPolicyHash | undefined;
    get identity(): string;
    stringToNumberArray(str: string): number[];
    mkValuesEntry(tokenName: string, count: bigint): valuesEntry;
    outputsSentToDatum(datum: InlineDatum): Promise<TxInput[]>;
    totalValue(utxos: TxInput[]): Value;
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<{}>;
    addScriptWithParams<SC extends StellarContract<any>>(TargetClass: new (a: SC extends StellarContract<any> ? StellarConstructorArgs<SC> : never) => SC, params: SC extends StellarContract<infer P> ? P : never): SC;
    readDatum<DPROPS extends anyDatumProps>(datumName: string, datum: Datum | InlineDatum): Promise<DPROPS>;
    private readUplcStructList;
    private readUplcDatum;
    private readUplcField;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkAssetValue(tokenId: AssetClass, count?: number): Value;
    mkTokenPredicate(val: Value): tokenPredicate<any>;
    mkTokenPredicate(mph: MintingPolicyHash, tokenName: string, quantity?: bigint): tokenPredicate<any>;
    mkTokenPredicate(vOrMph: AssetClass, quantity?: bigint): tokenPredicate<any>;
    private hasToken;
    private utxoHasToken;
    private inputHasToken;
    private assetsHasToken;
    private outputHasToken;
    tokenAsValue(tokenName: string, quantity: bigint, mph?: MintingPolicyHash): Value;
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput): TxInput | undefined;
    protected _utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }: utxoInfo, { free: free2, minAdaAmount: r2 }: utxoInfo): 1 | -1 | 0;
    protected _utxoIsSufficient({ sufficient }: utxoInfo): boolean;
    protected _utxoIsPureADA({ u }: utxoInfo): TxInput | undefined;
    protected _infoBackToUtxo({ u }: utxoInfo): TxInput;
    protected _mkUtxoSortInfo(min: bigint, max?: bigint): (u: TxInput) => utxoInfo;
    protected _utxoCountAdaOnly(c: number, { minAdaAmount }: utxoInfo): number;
    findAnySpareUtxos(tcx: StellarTxnContext): Promise<TxInput[] | never>;
    submit(tcx: StellarTxnContext, { sign, signers, }?: {
        sign?: boolean;
        signers?: Wallet[];
    }): Promise<TxId>;
    ADA(n: bigint | number): bigint;
    contractSource(): string | never;
    importModules(): HeliosModuleSrc[];
    loadProgramScript(params: ConfigType): Program | null;
    getMyActorAddress(): Promise<Address>;
    private get missingActorError();
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindMyUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindMyUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindUtxo(semanticName: string, predicate: (u: TxInput) => TxInput | undefined, { address, exceptInTcx, }: {
        address: Address;
        exceptInTcx?: StellarTxnContext<any>;
    }, extraErrorHint?: string): Promise<TxInput | never>;
    toUtxoId(u: TxInput): string;
    txnFindUtxo(tcx: StellarTxnContext<any>, name: string, predicate: utxoPredicate, address?: Address): Promise<TxInput | undefined>;
    hasUtxo(semanticName: string, predicate: utxoPredicate, { address, exceptInTcx, }: {
        address: Address;
        exceptInTcx?: StellarTxnContext<any>;
    }): Promise<TxInput | undefined>;
    hasMyUtxo(semanticName: string, predicate: utxoPredicate): Promise<TxInput | undefined>;
}

export declare type stellarSubclass<S extends StellarContract<P>, P extends paramsBase = S extends StellarContract<infer SCP> ? SCP : paramsBase> = (new (args: StellarConstructorArgs<S>) => S & StellarContract<P>) & {
    defaultParams: Partial<P>;
};

export declare interface StellarTestContext<HTH extends StellarTestHelper<SC, P>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer SC2, any> ? SC2 : never, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(params: Partial<P> & canHaveRandomSeed & canSkipSetup): Promise<StellarTestHelper<SC, P>>;
}

export declare abstract class StellarTestHelper<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC, any>;
    params?: P;
    defaultActor?: string;
    strella: SC;
    actors: actorMap;
    optimize: boolean;
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    network: NetworkEmulator;
    private actorName;
    get currentActor(): SimpleWallet;
    set currentActor(actorName: string);
    address?: Address;
    setupPending?: Promise<any>;
    setupActors(): void;
    constructor(params?: P & canHaveRandomSeed & canSkipSetup);
    initialize(params: P & canHaveRandomSeed): Promise<any>;
    initStellarClass(): any;
    initStrella(TargetClass: stellarSubclass<any, any>, params: any): any;
    randomSeed?: number;
    rand?: () => number;
    delay(ms: any): Promise<unknown>;
    mkSeedUtxo(seedIndex?: bigint): Promise<helios.TxId>;
    submitTx(tx: Tx, force?: "force"): Promise<TxId>;
    mkRandomBytes(length: number): number[];
    addActor(roleName: string, walletBalance: bigint): helios.SimpleWallet;
    mkNetwork(): [NetworkEmulator, enhancedNetworkParams];
    slotToTimestamp(s: bigint): bigint | Date;
    currentSlot(): bigint | null;
    waitUntil(time: Date): bigint;
}

export declare class StellarTxnContext<S = noState> {
    tx: Tx;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    constructor(state?: Partial<S>);
    dump(): string;
    mintTokens(...args: Parameters<Tx["mintTokens"]>): StellarTxnContext<S>;
    reservedUtxos(): TxInput[];
    utxoNotReserved(u: TxInput): TxInput | undefined;
    addCollateral(collateral: TxInput): this;
    addInput(...args: Parameters<Tx["addInput"]>): StellarTxnContext<S>;
    addInputs(...args: Parameters<Tx["addInputs"]>): StellarTxnContext<S>;
    addOutput(...args: Parameters<Tx["addOutput"]>): StellarTxnContext<S>;
    addOutputs(...args: Parameters<Tx["addOutputs"]>): StellarTxnContext<S>;
    attachScript(...args: Parameters<Tx["attachScript"]>): this;
    addSignature(wallet: Wallet): Promise<void>;
    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use attachScript
     **/
    addScript(): void;
}

export declare type strategyValidation = ErrorMap | undefined;

export declare type tokenNamesOrValuesEntry = [string | number[], bigint];

declare type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    value: Value;
};

export declare function txAsString(tx: Tx): string;

export declare function txInputAsString(x: TxInput, prefix?: string): string;

export declare function txn(proto: any, thingName: any, descriptor: any): any;

export declare function txOutputAsString(x: TxOutput, prefix?: string): string;

export declare function utxoAsString(u: TxInput, prefix?: string): string;

declare type utxoInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

export declare type utxoPredicate = ((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined);

export declare function utxosAsString(utxos: TxInput[], joiner?: string): string;

declare class UutName {
    private [_uutName];
    private purpose;
    constructor(purpose: string, un: string);
    get name(): string;
    toString(): string;
}

declare const _uutName: unique symbol;

export declare type uutPurposeMap<unionPurpose extends string> = {
    [purpose in unionPurpose]: UutName;
};

export declare function valueAsString(v: Value): string;

export declare type valuesEntry = [number[], bigint];

declare type VariantMap<T extends StellarContract<any>> = Record<string, VariantStrategy<T>>;

export declare function variantMap<T extends StellarContract<any>>(vm: VariantMap<T>): VariantMap<T>;

declare type VariantStrategy<T extends StellarContract<any>> = {
    delegateClass: stellarSubclass<T>;
    partialConfig?: PartialParamConfig<ConfigFor<T>>;
    validateConfig(p: ConfigFor<T>): strategyValidation;
};

export { }
