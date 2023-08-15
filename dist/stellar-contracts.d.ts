import * as helios from '@hyperionbt/helios';
import { Value, Tx, TxInput, TxOutput, Wallet, Datum, UplcDataValue, UplcData, Network, NetworkParams, Program, UplcProgram, Address, MintingPolicyHash, Assets, TxId, NetworkEmulator, WalletEmulator } from '@hyperionbt/helios';
import { TestContext } from 'vitest';

declare function heliosRollupLoader(opts?: {
    include: string;
}): {
    name: string;
    transform(code: any, id: any): {
        code: string;
        map: {
            mappings: string;
        };
    } | undefined;
};

declare function assetsAsString(v: any): string;
declare function lovelaceToAda(l: bigint | number): string;
declare function valueAsString(v: Value): string;
declare function txAsString(tx: Tx): string;
declare function txInputAsString(x: TxInput, prefix?: string): string;
declare function utxosAsString(utxos: TxInput[], joiner?: string): string;
declare function utxoAsString(u: TxInput, prefix?: string): string;
declare function txOutputAsString(x: TxOutput, prefix?: string): string;

type noState = {};
declare class StellarTxnContext<S = noState> {
    tx: Tx;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: Partial<S>;
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

declare const DatumInline: typeof Datum.inline;
type InlineDatum = ReturnType<typeof DatumInline>;
type tokenNamesOrValuesEntry = [string | number[], bigint];
type valuesEntry = [number[], bigint];

type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    value: Value;
};
type isActivity = {
    redeemer: UplcDataValue | UplcData;
};
type utxoInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};
type stellarSubclass<S extends StellarContract<P>, P extends paramsBase> = new (args: StellarConstructorArgs<S, P>) => S & StellarContract<P>;
type paramsBase = Record<string, any>;
declare const Activity: {
    partialTxn(proto: any, thingName: any, descriptor: any): any;
    redeemer(proto: any, thingName: any, descriptor: any): any;
    redeemerData(proto: any, thingName: any, descriptor: any): any;
};
declare function datum(proto: any, thingName: any, descriptor: any): any;
declare function txn(proto: any, thingName: any, descriptor: any): any;
declare function partialTxn(proto: any, thingName: any, descriptor: any): any;
type StellarConstructorArgs<SC extends StellarContract<P>, P extends paramsBase = SC extends StellarContract<infer P> ? P : never> = {
    params: P;
    network: Network;
    networkParams: NetworkParams;
    isTest: boolean;
    myActor?: Wallet;
};
type utxoPredicate = ((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined);
type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "linking";
type canHaveToken = TxInput | TxOutput | Assets;
declare class StellarContract<ParamsType extends paramsBase> {
    configuredContract: Program;
    compiledContract: UplcProgram;
    paramsIn: ParamsType;
    contractParams: paramsBase;
    network: Network;
    networkParams: NetworkParams;
    _template?: Program;
    myActor?: Wallet;
    getContractParams(params: any): any;
    constructor({ params, network, networkParams, isTest, myActor, }: StellarConstructorArgs<StellarContract<ParamsType>, ParamsType>);
    get datumType(): any;
    _purpose?: scriptPurpose;
    get purpose(): scriptPurpose;
    get address(): Address;
    get mintingPolicyHash(): MintingPolicyHash | undefined;
    get identity(): string;
    stringToNumberArray(str: string): number[];
    mkValuesEntry(tokenName: string, count: bigint): valuesEntry;
    addScriptWithParams<SC extends StellarContract<any>>(TargetClass: new (a: SC extends StellarContract<any> ? StellarConstructorArgs<SC> : never) => SC, params: SC extends StellarContract<infer P> ? P : never): SC;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkTokenPredicate(vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): tokenPredicate<any>;
    private hasToken;
    private utxoHasToken;
    private inputHasToken;
    private assetsHasToken;
    private outputHasToken;
    tokenAsValue(tokenName: string, quantity: bigint, mph?: MintingPolicyHash): Value;
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput): TxInput | undefined;
    protected _utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }: utxoInfo, { free: free2, minAdaAmount: r2 }: utxoInfo): 0 | 1 | -1;
    protected _utxoIsSufficient({ sufficient }: utxoInfo): boolean;
    protected _utxoIsPureADA({ u }: utxoInfo): TxInput | undefined;
    protected _infoBackToUtxo({ u }: utxoInfo): TxInput;
    protected _mkUtxoSortInfo(min: bigint, max?: bigint): (u: TxInput) => utxoInfo;
    protected _utxoCountAdaOnly(c: number, { minAdaAmount }: utxoInfo): number;
    findAnySpareUtxos(tcx: StellarTxnContext): Promise<TxInput[] | never>;
    submit(tcx: StellarTxnContext, { sign, signers, }?: {
        sign?: boolean;
        signers?: Wallet[];
    }): Promise<helios.TxId>;
    ADA(n: bigint | number): bigint;
    contractSource(): string | never;
    importModules(): string[];
    contractTemplate(): Program;
    getMyActorAddress(): Promise<Address>;
    private get missingActorError();
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindActorUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindMyUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, exceptInTcx: StellarTxnContext<any>, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindMyUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, extraErrorHint?: string): Promise<TxInput | never>;
    mustFindUtxo(name: string, predicate: (u: TxInput) => TxInput | undefined, { address, exceptInTcx, }: {
        address: Address;
        exceptInTcx?: StellarTxnContext<any>;
    }, extraErrorHint?: string): Promise<TxInput | never>;
    toUtxoId(u: TxInput): string;
    txnFindUtxo(tcx: StellarTxnContext<any>, name: string, predicate: utxoPredicate, address?: Address): Promise<TxInput | undefined>;
    hasUtxo(name: string, predicate: utxoPredicate, { address, exceptInTcx, }: {
        address: Address;
        exceptInTcx?: StellarTxnContext<any>;
    }): Promise<TxInput | undefined>;
    hasMyUtxo(name: string, predicate: utxoPredicate): Promise<TxInput | undefined>;
}

declare class DefaultMinter extends StellarContract<SeedTxnParams> implements MinterBaseMethods {
    contractSource(): any;
    capoMinterHelpers(): string;
    importModules(): string[];
    txnCreatingUUTs<uutIndex extends hasUUTs<any>>(tcx: StellarTxnContext<uutIndex>, purposes: string[]): Promise<StellarTxnContext<uutIndex>>;
    mkUUTValuesEntries<UM extends uutPurposeMap<any>>(uutMap: UM): valuesEntry[];
    get mintingPolicyHash(): MintingPolicyHash;
    protected mintingCharterToken({ owner }: MintCharterRedeemerArgs): isActivity;
    protected mintingUUTs({ seedTxn, seedIndex: sIdx, purposes, }: MintUUTRedeemerArgs): isActivity;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharterToken(tcx: StellarTxnContext, owner: Address): Promise<StellarTxnContext>;
}

type SeedTxnParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};
type uutPurposeMap<uutNames extends {
    [k: string]: string;
} = {}> = Partial<uutNames>;
type hasUUTs<uutNames extends {} = {}> = {
    uuts: uutPurposeMap<uutNames>;
};
interface hasUUTCreator {
    txnCreatingUUTs(tcx: StellarTxnContext<any>, uutPurposes: string[]): Promise<StellarTxnContext<any>>;
}
type MintCharterRedeemerArgs = {
    owner: Address;
};
type MintUUTRedeemerArgs = {
    seedTxn: TxId;
    seedIndex: bigint | number;
    purposes: string[];
};
type hasUutContext = StellarTxnContext<hasUUTs<any>>;
interface MinterBaseMethods extends hasUUTCreator {
    get mintingPolicyHash(): MintingPolicyHash;
    txnMintingCharterToken(tcx: StellarTxnContext<any>, owner: Address, tVal: valuesEntry): Promise<StellarTxnContext<any>>;
}
type anyDatumArgs = Record<string, any>;
declare abstract class Capo<minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter> extends StellarContract<SeedTxnParams> implements hasUUTCreator {
    constructor(args: StellarConstructorArgs<StellarContract<SeedTxnParams>, SeedTxnParams>);
    abstract contractSource(): string;
    abstract mkDatumCharterToken(args: anyDatumArgs): InlineDatum;
    get minterClass(): stellarSubclass<DefaultMinter, SeedTxnParams>;
    minter?: minterType;
    txnCreatingUUTs(tcx: hasUutContext, uutPurposes: string[]): Promise<hasUutContext>;
    uutsValue(uutMap: uutPurposeMap): Value;
    uutsValue(tcx: hasUutContext): Value;
    protected usingAuthority(): isActivity;
    protected updatingCharter({ trustees, minSigs, }: {
        trustees: Address[];
        minSigs: bigint;
    }): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    mkTxnMintCharterToken(datumArgs: anyDatumArgs, tcx?: StellarTxnContext): Promise<StellarTxnContext | never>;
    get charterTokenPredicate(): ((something: any) => any) & {
        value: Value;
    };
    mustFindCharterUtxo(): Promise<TxInput>;
    txnMustUseCharterUtxo(tcx: StellarTxnContext<any>, redeemer: isActivity, newDatum?: InlineDatum): Promise<StellarTxnContext<any> | never>;
    txnUpdateCharterUtxo(tcx: StellarTxnContext, redeemer: isActivity, newDatum: InlineDatum): Promise<StellarTxnContext | never>;
    txnKeepCharterToken(tcx: StellarTxnContext<any>, datum: InlineDatum): StellarTxnContext<any>;
    txnAddAuthority(tcx: StellarTxnContext<any>): Promise<StellarTxnContext<any>>;
    getMinterParams(): SeedTxnParams;
    getCapoRev(): bigint;
    getContractParams(params: SeedTxnParams): {
        mph: MintingPolicyHash;
        rev: bigint;
    };
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    connectMintingScript(params: SeedTxnParams): minterType;
    mustGetContractSeedUtxo(): Promise<TxInput | never>;
    capoRequirements(): {
        "is a base class for leader/Capo pattern": {
            purpose: string;
            details: string[];
            mech: string[];
        };
        "can create unique utility tokens": {
            purpose: string;
            details: string[];
        };
    };
}

type enhancedNetworkParams = NetworkParams & {
    slotToTimestamp(n: bigint): Date;
};
interface StellarTestContext<HTH extends StellarTestHelper<SC, P>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer SC2, any> ? SC2 : never, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> extends canHaveRandomSeed, TestContext {
    h: HTH;
    get strella(): SC;
    initHelper(params: Partial<P> & canHaveRandomSeed & canSkipSetup): Promise<StellarTestHelper<SC, P>>;
}
type helperSubclass<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> = new (params: P & canHaveRandomSeed) => StellarTestHelper<SC, P>;
type canHaveRandomSeed = {
    randomSeed?: number;
};
type canSkipSetup = {
    skipSetup?: true;
};
declare function addTestContext<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never>(context: StellarTestContext<any, SC, P>, TestHelperClass: helperSubclass<SC>, params?: P): Promise<void>;
declare abstract class StellarTestHelper<SC extends StellarContract<any>, P extends paramsBase = SC extends StellarContract<infer PT> ? PT : never> {
    state: Record<string, any>;
    abstract get stellarClass(): stellarSubclass<SC, any>;
    defaultActor?: string;
    strella: SC;
    actors: actorMap;
    optimize: boolean;
    liveSlotParams: NetworkParams;
    networkParams: NetworkParams;
    network: NetworkEmulator;
    private actorName;
    get currentActor(): WalletEmulator;
    set currentActor(actorName: string);
    address?: Address;
    setupPending?: Promise<any>;
    setupActors(): void;
    constructor(params?: P & canHaveRandomSeed & canSkipSetup);
    setup(params: P & canHaveRandomSeed): Promise<SC>;
    initStrella(params: P): SC & StellarContract<any>;
    randomSeed?: number;
    rand?: () => number;
    delay(ms: any): Promise<unknown>;
    mkSeedUtxo(seedIndex?: bigint): Promise<helios.TxId>;
    submitTx(tx: Tx, force?: "force"): Promise<TxId>;
    mkRandomBytes(length: number): number[];
    addActor(roleName: string, walletBalance: bigint): helios.WalletEmulator;
    mkNetwork(): [NetworkEmulator, enhancedNetworkParams];
    slotToTimestamp(s: bigint): Date;
    currentSlot(): bigint;
    waitUntil(time: Date): bigint;
}
declare abstract class StellarCapoTestHelper<SC extends Capo<any>> extends StellarTestHelper<SC, SeedTxnParams> {
    setup({ randomSeed, seedTxn, seedIndex, }?: {
        seedTxn?: TxId;
        seedIndex?: bigint;
        randomSeed?: number;
    }): Promise<SC>;
    mintCharterToken(args?: anyDatumArgs): Promise<StellarTxnContext>;
}
type actorMap = Record<string, WalletEmulator>;
declare const ADA = 1000000n;

type CharterDatumArgs = {
    trustees: Address[];
    minSigs: number | bigint;
};
declare class SampleTreasury extends Capo {
    contractSource(): any;
    mkDatumCharterToken({ trustees, minSigs, }: {
        trustees: Address[];
        minSigs: bigint;
    }): InlineDatum;
    mkTxnMintCharterToken({ trustees, minSigs }: CharterDatumArgs, tcx?: StellarTxnContext): Promise<StellarTxnContext | never>;
    mkTxnUpdateCharter(trustees: Address[], minSigs: bigint, tcx?: StellarTxnContext): Promise<StellarTxnContext>;
    requirements(): {
        "positively governs all administrative actions": {
            purpose: string;
            details: string[];
            mech: string[];
            requires: string[];
        };
        "has a singleton minting policy": {
            purpose: string;
            details: string[];
            mech: string[];
            requires: never[];
        };
        "has a unique, permanent treasury address": {
            purpose: string;
            details: string[];
            mech: string[];
            requires: string[];
        };
        "has a unique, permanent charter token": {
            purpose: string;
            details: string[];
            impl: string;
            mech: string[];
            requires: string[];
        };
        "the charter token is always kept in the contract": {
            purpose: string;
            details: string[];
            mech: string[];
            requires: never[];
        };
        "XXX can mint other tokens, on the authority of the charter token": {
            purpose: string;
            details: string[];
            mech: string[];
        };
        "the trustee group can be changed": {
            purpose: string;
            details: string[];
            mech: string[];
            requires: string[];
        };
        "the trustee threshold is enforced on all administrative actions": {
            purpose: string;
            details: string[];
            mech: string[];
            requires: never[];
        };
        foo: {
            purpose: string;
            details: never[];
            mech: never[];
            requires: never[];
        };
    };
}

export { ADA, Activity, Capo, CharterDatumArgs, DefaultMinter, InlineDatum, MintCharterRedeemerArgs, MintUUTRedeemerArgs, SampleTreasury, SeedTxnParams, StellarCapoTestHelper, StellarContract, StellarTestContext, StellarTestHelper, StellarTxnContext, addTestContext, assetsAsString, datum, hasUUTs, heliosRollupLoader, isActivity, lovelaceToAda, partialTxn, stellarSubclass, tokenNamesOrValuesEntry, txAsString, txInputAsString, txOutputAsString, txn, utxoAsString, utxoPredicate, utxosAsString, uutPurposeMap, valueAsString, valuesEntry };
