declare module "lib/heliosRollupLoader" {
    export function heliosRollupLoader(opts?: {
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
}
declare module "lib/StellarTxnContext" {
    import { Tx, TxOutput, TxInput, Wallet } from "@hyperionbt/helios";
    type noState = {};
    export class StellarTxnContext<S = noState> {
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
}
declare module "lib/HeliosPromotedTypes" {
    import { Datum } from "@hyperionbt/helios";
    export const DatumInline: typeof Datum.inline;
    export type InlineDatum = ReturnType<typeof DatumInline>;
    export type tokenNamesOrValuesEntry = [string | number[], bigint];
    export type valuesEntry = [number[], bigint];
}
declare module "lib/HeliosModuleSrc" {
    export type HeliosModuleSrc = string & {
        srcFile: string;
        purpose: string;
        moduleName: string;
    };
}
declare module "lib/StellarContract" {
    import { Address, Assets, MintingPolicyHash, Network, NetworkParams, Program, TxOutput, TxInput, UplcData, UplcDataValue, UplcProgram, Value, Wallet, Datum, AssetClass } from "@hyperionbt/helios";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { InlineDatum, valuesEntry } from "lib/HeliosPromotedTypes";
    import { HeliosModuleSrc } from "lib/HeliosModuleSrc";
    type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
        value: Value;
    };
    export type isActivity = {
        redeemer: UplcDataValue | UplcData;
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
    export type stellarSubclass<S extends StellarContract<P>, P extends configBase = S extends StellarContract<infer SCP> ? SCP : configBase> = (new (args: StellarConstructorArgs<S>) => S & StellarContract<P>) & {
        defaultParams: Partial<P>;
    };
    export type anyDatumProps = Record<string, any>;
    export type configBase = Record<string, any>;
    export const Activity: {
        partialTxn(proto: any, thingName: any, descriptor: any): any;
        redeemer(proto: any, thingName: any, descriptor: any): any;
        redeemerData(proto: any, thingName: any, descriptor: any): any;
    };
    export function datum(proto: any, thingName: any, descriptor: any): any;
    export function txn(proto: any, thingName: any, descriptor: any): any;
    export function partialTxn(proto: any, thingName: any, descriptor: any): any;
    export function findInputsInWallets(v: Value, searchIn: WalletsAndAddresses, network: Network): Promise<TxInput>;
    export type SetupDetails = {
        network: Network;
        networkParams: NetworkParams;
        isTest: boolean;
        myActor?: Wallet;
    };
    export type ConfigFor<SC extends StellarContract<C>, C extends configBase = SC extends StellarContract<infer inferredConfig> ? inferredConfig : never> = C;
    export type StellarConstructorArgs<SC extends StellarContract<any>> = {
        setup: SetupDetails;
        config: ConfigFor<SC>;
    };
    export type utxoPredicate = ((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined);
    type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint";
    export type canHaveToken = TxInput | TxOutput | Assets;
    export class StellarContract<ConfigType extends configBase> {
        scriptProgram?: Program;
        configIn: ConfigType;
        contractParams: configBase;
        setup: SetupDetails;
        network: Network;
        networkParams: NetworkParams;
        myActor?: Wallet;
        static get defaultParams(): {};
        getContractScriptParams(config: ConfigType): configBase;
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
        }): Promise<import("@hyperionbt/helios").TxId>;
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
}
declare module "lib/CapoMintHelpers" {
    import { HeliosModuleSrc } from "lib/HeliosModuleSrc";
    export const CapoMintHelpers: HeliosModuleSrc;
}
declare module "lib/delegation/CapoDelegateHelpers" {
    import { HeliosModuleSrc } from "lib/HeliosModuleSrc";
    export const CapoDelegateHelpers: HeliosModuleSrc;
}
declare module "lib/SeedTxn" {
    import { TxId } from "@hyperionbt/helios";
    export type SeedTxnParams = {
        seedTxn: TxId;
        seedIndex: bigint;
    };
}
declare module "lib/StellarHeliosHelpers" {
    import { HeliosModuleSrc } from "lib/HeliosModuleSrc";
    export const StellarHeliosHelpers: HeliosModuleSrc;
}
declare module "lib/Requirements" {
    type RequirementEntry<reqts extends string> = {
        purpose: string;
        details: string[];
        mech: string[];
        impl?: string;
        requires?: reqts[];
    };
    const TODO: unique symbol;
    export type TODO_TYPE = typeof TODO;
    export type ReqtsMap<reqts extends string> = {
        [reqtDescription in reqts]: TODO_TYPE | RequirementEntry<reqts>;
    };
    export function hasReqts<R extends ReqtsMap<reqts>, const reqts extends string = string & keyof R>(reqtsMap: R): ReqtsMap<reqts>;
    export namespace hasReqts {
        var TODO: unique symbol;
    }
}
declare module "lib/Capo" {
    import { Address, MintingPolicyHash, TxId, TxInput, Value, AssetClass } from "@hyperionbt/helios";
    import { DefaultMinter } from "lib/DefaultMinter";
    import { StellarConstructorArgs, StellarContract, isActivity, stellarSubclass, ConfigFor } from "lib/StellarContract";
    import { InlineDatum, valuesEntry } from "lib/HeliosPromotedTypes";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { DelegateSettings, SelectedDelegates, RoleMap, SelectedDelegate, PartialParamConfig, UutName, RelativeDelegateLink } from "lib/delegation/RolesAndDelegates";
    import { SeedTxnParams } from "lib/SeedTxn";
    import { HeliosModuleSrc } from "lib/HeliosModuleSrc";
    export { variantMap } from "lib/delegation/RolesAndDelegates";
    export type { RoleMap, strategyValidation, } from "lib/delegation/RolesAndDelegates";
    export type uutPurposeMap<unionPurpose extends string> = {
        [purpose in unionPurpose]: UutName;
    };
    export type hasSomeUuts<uutEntries extends string> = {
        uuts: Partial<uutPurposeMap<uutEntries>>;
    };
    export type hasAllUuts<uutEntries extends string> = {
        uuts: uutPurposeMap<uutEntries>;
    };
    interface hasUutCreator {
        txnCreatingUuts<const purposes extends string, TCX extends StellarTxnContext<any>>(tcx: TCX, uutPurposes: purposes[], seedUtxo?: TxInput): Promise<TCX & hasUutContext<purposes>>;
    }
    export type MintCharterRedeemerArgs<T = {}> = T & {
        owner: Address;
    };
    export type MintUutRedeemerArgs = {
        seedTxn: TxId;
        seedIndex: bigint | number;
        purposes: string[];
    };
    export type hasUutContext<uutEntries extends string> = StellarTxnContext<hasAllUuts<uutEntries>>;
    export interface MinterBaseMethods extends hasUutCreator {
        get mintingPolicyHash(): MintingPolicyHash;
        txnMintingCharter(tcx: StellarTxnContext<any>, charterMintArgs: {
            owner: Address;
            authZor: UutName;
        }, tVal: valuesEntry): Promise<StellarTxnContext<any>>;
    }
    export type anyDatumArgs = Record<string, any>;
    export type CapoBaseConfig = SeedTxnParams & {
        mph: MintingPolicyHash;
    };
    export type CapoImpliedSettings = {
        uut: AssetClass;
    };
    export type hasSelectedDelegates = StellarTxnContext<hasDelegateProp>;
    type hasDelegateProp = {
        delegates: SelectedDelegates;
    };
    export abstract class Capo<minterType extends MinterBaseMethods & DefaultMinter = DefaultMinter, charterDatumType extends anyDatumArgs = anyDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends StellarContract<configType> implements hasUutCreator {
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
        capoRequirements(): import("lib/Requirements.js").ReqtsMap<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using withDelegates() and txnMustGetDelegate()" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name">;
    }
}
declare module "lib/DefaultMinter" {
    import { Address, Value, MintingPolicyHash, TxInput } from "@hyperionbt/helios";
    import { StellarContract, isActivity } from "lib/StellarContract";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { MintCharterRedeemerArgs, MintUutRedeemerArgs, MinterBaseMethods, hasUutContext, uutPurposeMap } from "lib/Capo";
    import { SeedTxnParams } from "lib/SeedTxn";
    import { valuesEntry } from "lib/HeliosPromotedTypes";
    import { UutName } from "lib/delegation/RolesAndDelegates";
    import { HeliosModuleSrc } from "lib/HeliosModuleSrc";
    export class DefaultMinter extends StellarContract<SeedTxnParams> implements MinterBaseMethods {
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
}
declare module "lib/delegation/RolesAndDelegates" {
    import { Address } from "@hyperionbt/helios";
    import { ConfigFor, StellarContract, configBase, stellarSubclass } from "lib/StellarContract";
    const _uutName: unique symbol;
    export class UutName {
        private [_uutName];
        private purpose;
        constructor(purpose: string, un: string);
        get name(): string;
        toString(): string;
    }
    export const PARAM_REQUIRED: unique symbol;
    export const PARAM_IMPLIED: unique symbol;
    export class DelegateConfigNeeded extends Error {
        errors?: ErrorMap;
        availableStrategies?: string[];
        constructor(message: string, options: {
            errors?: ErrorMap;
            availableStrategies?: string[];
        });
    }
    export type ErrorMap = Record<string, string[]>;
    export type strategyValidation = ErrorMap | undefined;
    export function variantMap<T extends StellarContract<any>>(vm: VariantMap<T>): VariantMap<T>;
    export type VariantMap<T extends StellarContract<any>> = Record<string, VariantStrategy<T>>;
    export type RoleMap = Record<string, VariantMap<any>>;
    export type strategyParams = configBase;
    export type delegateScriptParams = configBase;
    export type PartialParamConfig<CT extends configBase> = Partial<{
        [key in keyof CT]: typeof PARAM_REQUIRED | typeof PARAM_IMPLIED | CT[key];
    }>;
    export type VariantStrategy<T extends StellarContract<any>> = {
        delegateClass: stellarSubclass<T>;
        partialConfig?: PartialParamConfig<ConfigFor<T>>;
        validateConfig(p: ConfigFor<T>): strategyValidation;
    };
    export type SelectedDelegates = {
        [roleName: string]: SelectedDelegate<StellarContract<any>>;
    };
    export type SelectedDelegate<T extends StellarContract<any>> = {
        strategyName: string;
        config: Partial<ConfigFor<T>>;
    };
    export function selectDelegate<T extends StellarContract<any>>(sd: SelectedDelegate<T>): SelectedDelegate<T>;
    export type DelegateSettings<T extends StellarContract<any>> = {
        delegateClass: stellarSubclass<T>;
        roleName: string;
        strategyName: string;
        config: ConfigFor<T>;
        reqdAddress?: Address;
        addressesHint?: Address[];
    };
    export type RelativeDelegateLink<CT extends configBase> = {
        uutName: string;
        strategyName: string;
        config: Partial<CT>;
        reqdAddress?: Address;
        addressesHint?: Address[];
    };
    export type xDelegateLink = {
        strategyName: string;
        uutFingerprint: string;
        reqdAddress?: Address;
        addressesHint?: Address[];
    };
    export type DelegateDetailSnapshot<T extends StellarContract<any>> = {
        isDelegateSnapshot: true;
        uut: string;
        settings: DelegateSettings<T>;
    };
}
declare module "lib/diagnostics" {
    import { Datum, Tx, TxOutput, TxInput, Value } from "@hyperionbt/helios";
    import { ErrorMap } from "lib/delegation/RolesAndDelegates";
    export function hexToPrintableString(hexStr: any): string;
    export function assetsAsString(v: any): string;
    export function lovelaceToAda(l: bigint | number): string;
    export function valueAsString(v: Value): string;
    export function txAsString(tx: Tx): string;
    export function txInputAsString(x: TxInput, prefix?: string): string;
    export function utxosAsString(utxos: TxInput[], joiner?: string): string;
    export function utxoAsString(u: TxInput, prefix?: string): string;
    export function datumAsString(d: Datum | null | undefined): string;
    export function txOutputAsString(x: TxOutput, prefix?: string): string;
    export function errorMapAsString(em: ErrorMap, prefix?: string): string;
}
declare module "lib/authority/AuthorityPolicy" {
    import { Address, AssetClass, TxInput } from "@hyperionbt/helios";
    import { StellarContract } from "lib/StellarContract";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    export type AuthorityPolicySettings = {
        rev: bigint;
        uut: AssetClass;
        reqdAddress?: Address;
        addrHint: Address[];
    };
    export abstract class AuthorityPolicy<T extends AuthorityPolicySettings = AuthorityPolicySettings> extends StellarContract<T> {
        static currentRev: bigint;
        static get defaultParams(): {
            rev: bigint;
        };
        txnCreatingAuthority(tcx: StellarTxnContext, tokenId: AssetClass, delegateAddr: Address): Promise<StellarTxnContext>;
        abstract txnMustFindAuthorityToken(tcx: StellarTxnContext): Promise<TxInput>;
        abstract txnReceiveAuthorityToken(tcx: StellarTxnContext, delegateAddr: Address): Promise<StellarTxnContext>;
        abstract txnGrantAuthority(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
        abstract txnRetireCred(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
        authorityPolicyRequirements(): import("lib/Requirements.js").ReqtsMap<"provides an interface for providing arms-length proof of authority to any other contract" | "implementations SHOULD positively govern spend of the UUT" | "implementations MUST provide an essential interface for transaction-building" | "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)" | "requires a mustFindAuthorityToken(tcx)" | "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)" | "requires txnRetireCred(tcx, fromFoundUtxo)">;
    }
}
declare module "lib/authority/MultisigAuthorityPolicy" {
    import { Address, TxInput } from "@hyperionbt/helios";
    export const MultisigAuthorityScript: any;
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { AuthorityPolicy } from "lib/authority/AuthorityPolicy";
    export class MultisigAuthorityPolicy extends AuthorityPolicy {
        static currentRev: bigint;
        static get defaultParams(): {
            rev: bigint;
        };
        contractSource(): any;
        txnMustFindAuthorityToken(tcx: StellarTxnContext): Promise<TxInput>;
        txnReceiveAuthorityToken(tcx: StellarTxnContext, delegateAddr: Address): Promise<StellarTxnContext>;
        txnGrantAuthority(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
        txnRetireCred(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
        requirements(): import("lib/Requirements.js").ReqtsMap<"provides arms-length proof of authority to any other contract" | "positively governs spend of the UUT" | "the trustee threshold is required to spend its UUT" | "the trustee group can be changed" | "TODO: has a unique authority UUT" | "TODO: the trustee threshold is required to spend its UUT" | "TODO: the trustee group can be changed">;
    }
}
declare module "lib/delegation/BasicMintDelegate" {
    import { AssetClass } from "@hyperionbt/helios";
    import { StellarContract, configBase } from "lib/StellarContract";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    type MintDelegateArgs = {
        rev: bigint;
        uut: AssetClass;
    };
    export type MintDelegate<T> = StellarContract<any & T> & {
        txnCreateTokenPolicy: any;
    };
    export class BasicMintDelegate extends StellarContract<MintDelegateArgs> {
        static currentRev: bigint;
        static get defaultParams(): {
            rev: bigint;
        };
        contractSource(): any;
        getContractScriptParams(config: MintDelegateArgs): configBase;
        txnCreatingTokenPolicy(tcx: StellarTxnContext, tokenName: string): Promise<StellarTxnContext>;
        servesDelegationRole(role: string): true | undefined;
        static mkDelegateWithArgs(a: MintDelegateArgs): void;
    }
}
declare module "lib/testing/StellarTestHelper" {
    import * as helios from "@hyperionbt/helios";
    import { Address, NetworkEmulator, NetworkParams, Tx, TxId, SimpleWallet as WalletEmulator } from "@hyperionbt/helios";
    import { StellarContract, configBase, stellarSubclass } from "lib/StellarContract";
    import { actorMap, canHaveRandomSeed, canSkipSetup, enhancedNetworkParams } from "lib/testing/types";
    export abstract class StellarTestHelper<SC extends StellarContract<any>, P extends configBase = SC extends StellarContract<infer PT> ? PT : never> {
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
        get currentActor(): WalletEmulator;
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
}
declare module "lib/testing/StellarTestContext" {
    import { TestContext } from "vitest";
    import { StellarContract, configBase } from "lib/StellarContract";
    import { canHaveRandomSeed, canSkipSetup } from "lib/testing/types";
    import { StellarTestHelper } from "lib/testing/StellarTestHelper";
    export interface StellarTestContext<HTH extends StellarTestHelper<SC, P>, SC extends StellarContract<any> = HTH extends StellarTestHelper<infer SC2, any> ? SC2 : never, P extends configBase = SC extends StellarContract<infer PT> ? PT : never> extends canHaveRandomSeed, TestContext {
        h: HTH;
        get strella(): SC;
        initHelper(params: Partial<P> & canHaveRandomSeed & canSkipSetup): Promise<StellarTestHelper<SC, P>>;
    }
}
declare module "lib/testing/types" {
    import { NetworkParams, SimpleWallet as WalletEmulator } from "@hyperionbt/helios";
    import { StellarContract, configBase } from "lib/StellarContract";
    import { StellarTestContext } from "lib/testing/StellarTestContext";
    import { StellarTestHelper } from "lib/testing/StellarTestHelper";
    export const preProdParams: {
        shelleyGenesis: {
            activeSlotsCoeff: number;
            epochLength: number;
            genDelegs: {
                "637f2e950b0fd8f8e3e811c5fbeb19e411e7a2bf37272b84b29c1a0b": {
                    delegate: string;
                    vrf: string;
                };
                "8a4b77c4f534f8b8cc6f269e5ebb7ba77fa63a476e50e05e66d7051c": {
                    delegate: string;
                    vrf: string;
                };
                b00470cd193d67aac47c373602fccd4195aad3002c169b5570de1126: {
                    delegate: string;
                    vrf: string;
                };
                b260ffdb6eba541fcf18601923457307647dce807851b9d19da133ab: {
                    delegate: string;
                    vrf: string;
                };
                ced1599fd821a39593e00592e5292bdc1437ae0f7af388ef5257344a: {
                    delegate: string;
                    vrf: string;
                };
                dd2a7d71a05bed11db61555ba4c658cb1ce06c8024193d064f2a66ae: {
                    delegate: string;
                    vrf: string;
                };
                f3b9e74f7d0f24d2314ea5dfbca94b65b2059d1ff94d97436b82d5b4: {
                    delegate: string;
                    vrf: string;
                };
            };
            initialFunds: {};
            maxKESEvolutions: number;
            maxLovelaceSupply: number;
            networkId: string;
            networkMagic: number;
            protocolParams: {
                a0: number;
                decentralisationParam: number;
                eMax: number;
                extraEntropy: {
                    tag: string;
                };
                keyDeposit: number;
                maxBlockBodySize: number;
                maxBlockHeaderSize: number;
                maxTxSize: number;
                minFeeA: number;
                minFeeB: number;
                minPoolCost: number;
                minUTxOValue: number;
                nOpt: number;
                poolDeposit: number;
                protocolVersion: {
                    major: number;
                    minor: number;
                };
                rho: number;
                tau: number;
            };
            securityParam: number;
            slotLength: number;
            slotsPerKESPeriod: number;
            staking: {
                pools: {};
                stake: {};
            };
            systemStart: string;
            updateQuorum: number;
        };
        alonzoGenesis: {
            lovelacePerUTxOWord: number;
            executionPrices: {
                prSteps: {
                    numerator: number;
                    denominator: number;
                };
                prMem: {
                    numerator: number;
                    denominator: number;
                };
            };
            maxTxExUnits: {
                exUnitsMem: number;
                exUnitsSteps: number;
            };
            maxBlockExUnits: {
                exUnitsMem: number;
                exUnitsSteps: number;
            };
            maxValueSize: number;
            collateralPercentage: number;
            maxCollateralInputs: number;
            costModels: {
                PlutusV1: {
                    "sha2_256-memory-arguments": number;
                    "equalsString-cpu-arguments-constant": number;
                    "cekDelayCost-exBudgetMemory": number;
                    "lessThanEqualsByteString-cpu-arguments-intercept": number;
                    "divideInteger-memory-arguments-minimum": number;
                    "appendByteString-cpu-arguments-slope": number;
                    "blake2b-cpu-arguments-slope": number;
                    "iData-cpu-arguments": number;
                    "encodeUtf8-cpu-arguments-slope": number;
                    "unBData-cpu-arguments": number;
                    "multiplyInteger-cpu-arguments-intercept": number;
                    "cekConstCost-exBudgetMemory": number;
                    "nullList-cpu-arguments": number;
                    "equalsString-cpu-arguments-intercept": number;
                    "trace-cpu-arguments": number;
                    "mkNilData-memory-arguments": number;
                    "lengthOfByteString-cpu-arguments": number;
                    "cekBuiltinCost-exBudgetCPU": number;
                    "bData-cpu-arguments": number;
                    "subtractInteger-cpu-arguments-slope": number;
                    "unIData-cpu-arguments": number;
                    "consByteString-memory-arguments-intercept": number;
                    "divideInteger-memory-arguments-slope": number;
                    "divideInteger-cpu-arguments-model-arguments-slope": number;
                    "listData-cpu-arguments": number;
                    "headList-cpu-arguments": number;
                    "chooseData-memory-arguments": number;
                    "equalsInteger-cpu-arguments-intercept": number;
                    "sha3_256-cpu-arguments-slope": number;
                    "sliceByteString-cpu-arguments-slope": number;
                    "unMapData-cpu-arguments": number;
                    "lessThanInteger-cpu-arguments-intercept": number;
                    "mkCons-cpu-arguments": number;
                    "appendString-memory-arguments-intercept": number;
                    "modInteger-cpu-arguments-model-arguments-slope": number;
                    "ifThenElse-cpu-arguments": number;
                    "mkNilPairData-cpu-arguments": number;
                    "lessThanEqualsInteger-cpu-arguments-intercept": number;
                    "addInteger-memory-arguments-slope": number;
                    "chooseList-memory-arguments": number;
                    "constrData-memory-arguments": number;
                    "decodeUtf8-cpu-arguments-intercept": number;
                    "equalsData-memory-arguments": number;
                    "subtractInteger-memory-arguments-slope": number;
                    "appendByteString-memory-arguments-intercept": number;
                    "lengthOfByteString-memory-arguments": number;
                    "headList-memory-arguments": number;
                    "listData-memory-arguments": number;
                    "consByteString-cpu-arguments-intercept": number;
                    "unIData-memory-arguments": number;
                    "remainderInteger-memory-arguments-minimum": number;
                    "bData-memory-arguments": number;
                    "lessThanByteString-cpu-arguments-slope": number;
                    "encodeUtf8-memory-arguments-intercept": number;
                    "cekStartupCost-exBudgetCPU": number;
                    "multiplyInteger-memory-arguments-intercept": number;
                    "unListData-memory-arguments": number;
                    "remainderInteger-cpu-arguments-model-arguments-slope": number;
                    "cekVarCost-exBudgetCPU": number;
                    "remainderInteger-memory-arguments-slope": number;
                    "cekForceCost-exBudgetCPU": number;
                    "sha2_256-cpu-arguments-slope": number;
                    "equalsInteger-memory-arguments": number;
                    "indexByteString-memory-arguments": number;
                    "addInteger-memory-arguments-intercept": number;
                    "chooseUnit-cpu-arguments": number;
                    "sndPair-cpu-arguments": number;
                    "cekLamCost-exBudgetCPU": number;
                    "fstPair-cpu-arguments": number;
                    "quotientInteger-memory-arguments-minimum": number;
                    "decodeUtf8-cpu-arguments-slope": number;
                    "lessThanInteger-memory-arguments": number;
                    "lessThanEqualsInteger-cpu-arguments-slope": number;
                    "fstPair-memory-arguments": number;
                    "modInteger-memory-arguments-intercept": number;
                    "unConstrData-cpu-arguments": number;
                    "lessThanEqualsInteger-memory-arguments": number;
                    "chooseUnit-memory-arguments": number;
                    "sndPair-memory-arguments": number;
                    "addInteger-cpu-arguments-intercept": number;
                    "decodeUtf8-memory-arguments-slope": number;
                    "equalsData-cpu-arguments-intercept": number;
                    "mapData-cpu-arguments": number;
                    "mkPairData-cpu-arguments": number;
                    "quotientInteger-cpu-arguments-constant": number;
                    "consByteString-memory-arguments-slope": number;
                    "cekVarCost-exBudgetMemory": number;
                    "indexByteString-cpu-arguments": number;
                    "unListData-cpu-arguments": number;
                    "equalsInteger-cpu-arguments-slope": number;
                    "cekStartupCost-exBudgetMemory": number;
                    "subtractInteger-cpu-arguments-intercept": number;
                    "divideInteger-cpu-arguments-model-arguments-intercept": number;
                    "divideInteger-memory-arguments-intercept": number;
                    "cekForceCost-exBudgetMemory": number;
                    "blake2b-cpu-arguments-intercept": number;
                    "remainderInteger-cpu-arguments-constant": number;
                    "tailList-cpu-arguments": number;
                    "encodeUtf8-cpu-arguments-intercept": number;
                    "equalsString-cpu-arguments-slope": number;
                    "lessThanByteString-memory-arguments": number;
                    "multiplyInteger-cpu-arguments-slope": number;
                    "appendByteString-cpu-arguments-intercept": number;
                    "lessThanEqualsByteString-cpu-arguments-slope": number;
                    "modInteger-memory-arguments-slope": number;
                    "addInteger-cpu-arguments-slope": number;
                    "equalsData-cpu-arguments-slope": number;
                    "decodeUtf8-memory-arguments-intercept": number;
                    "chooseList-cpu-arguments": number;
                    "constrData-cpu-arguments": number;
                    "equalsByteString-memory-arguments": number;
                    "cekApplyCost-exBudgetCPU": number;
                    "quotientInteger-memory-arguments-slope": number;
                    "verifySignature-cpu-arguments-intercept": number;
                    "unMapData-memory-arguments": number;
                    "mkCons-memory-arguments": number;
                    "sliceByteString-memory-arguments-slope": number;
                    "sha3_256-memory-arguments": number;
                    "ifThenElse-memory-arguments": number;
                    "mkNilPairData-memory-arguments": number;
                    "equalsByteString-cpu-arguments-slope": number;
                    "appendString-cpu-arguments-intercept": number;
                    "quotientInteger-cpu-arguments-model-arguments-slope": number;
                    "cekApplyCost-exBudgetMemory": number;
                    "equalsString-memory-arguments": number;
                    "multiplyInteger-memory-arguments-slope": number;
                    "cekBuiltinCost-exBudgetMemory": number;
                    "remainderInteger-memory-arguments-intercept": number;
                    "sha2_256-cpu-arguments-intercept": number;
                    "remainderInteger-cpu-arguments-model-arguments-intercept": number;
                    "lessThanEqualsByteString-memory-arguments": number;
                    "tailList-memory-arguments": number;
                    "mkNilData-cpu-arguments": number;
                    "chooseData-cpu-arguments": number;
                    "unBData-memory-arguments": number;
                    "blake2b-memory-arguments": number;
                    "iData-memory-arguments": number;
                    "nullList-memory-arguments": number;
                    "cekDelayCost-exBudgetCPU": number;
                    "subtractInteger-memory-arguments-intercept": number;
                    "lessThanByteString-cpu-arguments-intercept": number;
                    "consByteString-cpu-arguments-slope": number;
                    "appendByteString-memory-arguments-slope": number;
                    "trace-memory-arguments": number;
                    "divideInteger-cpu-arguments-constant": number;
                    "cekConstCost-exBudgetCPU": number;
                    "encodeUtf8-memory-arguments-slope": number;
                    "quotientInteger-cpu-arguments-model-arguments-intercept": number;
                    "mapData-memory-arguments": number;
                    "appendString-cpu-arguments-slope": number;
                    "modInteger-cpu-arguments-constant": number;
                    "verifySignature-cpu-arguments-slope": number;
                    "unConstrData-memory-arguments": number;
                    "quotientInteger-memory-arguments-intercept": number;
                    "equalsByteString-cpu-arguments-constant": number;
                    "sliceByteString-memory-arguments-intercept": number;
                    "mkPairData-memory-arguments": number;
                    "equalsByteString-cpu-arguments-intercept": number;
                    "appendString-memory-arguments-slope": number;
                    "lessThanInteger-cpu-arguments-slope": number;
                    "modInteger-cpu-arguments-model-arguments-intercept": number;
                    "modInteger-memory-arguments-minimum": number;
                    "sha3_256-cpu-arguments-intercept": number;
                    "verifySignature-memory-arguments": number;
                    "cekLamCost-exBudgetMemory": number;
                    "sliceByteString-cpu-arguments-intercept": number;
                };
            };
        };
        latestParams: {
            collateralPercentage: number;
            costModels: {
                PlutusScriptV1: {
                    "addInteger-cpu-arguments-intercept": number;
                    "addInteger-cpu-arguments-slope": number;
                    "addInteger-memory-arguments-intercept": number;
                    "addInteger-memory-arguments-slope": number;
                    "appendByteString-cpu-arguments-intercept": number;
                    "appendByteString-cpu-arguments-slope": number;
                    "appendByteString-memory-arguments-intercept": number;
                    "appendByteString-memory-arguments-slope": number;
                    "appendString-cpu-arguments-intercept": number;
                    "appendString-cpu-arguments-slope": number;
                    "appendString-memory-arguments-intercept": number;
                    "appendString-memory-arguments-slope": number;
                    "bData-cpu-arguments": number;
                    "bData-memory-arguments": number;
                    "blake2b_256-cpu-arguments-intercept": number;
                    "blake2b_256-cpu-arguments-slope": number;
                    "blake2b_256-memory-arguments": number;
                    "cekApplyCost-exBudgetCPU": number;
                    "cekApplyCost-exBudgetMemory": number;
                    "cekBuiltinCost-exBudgetCPU": number;
                    "cekBuiltinCost-exBudgetMemory": number;
                    "cekConstCost-exBudgetCPU": number;
                    "cekConstCost-exBudgetMemory": number;
                    "cekDelayCost-exBudgetCPU": number;
                    "cekDelayCost-exBudgetMemory": number;
                    "cekForceCost-exBudgetCPU": number;
                    "cekForceCost-exBudgetMemory": number;
                    "cekLamCost-exBudgetCPU": number;
                    "cekLamCost-exBudgetMemory": number;
                    "cekStartupCost-exBudgetCPU": number;
                    "cekStartupCost-exBudgetMemory": number;
                    "cekVarCost-exBudgetCPU": number;
                    "cekVarCost-exBudgetMemory": number;
                    "chooseData-cpu-arguments": number;
                    "chooseData-memory-arguments": number;
                    "chooseList-cpu-arguments": number;
                    "chooseList-memory-arguments": number;
                    "chooseUnit-cpu-arguments": number;
                    "chooseUnit-memory-arguments": number;
                    "consByteString-cpu-arguments-intercept": number;
                    "consByteString-cpu-arguments-slope": number;
                    "consByteString-memory-arguments-intercept": number;
                    "consByteString-memory-arguments-slope": number;
                    "constrData-cpu-arguments": number;
                    "constrData-memory-arguments": number;
                    "decodeUtf8-cpu-arguments-intercept": number;
                    "decodeUtf8-cpu-arguments-slope": number;
                    "decodeUtf8-memory-arguments-intercept": number;
                    "decodeUtf8-memory-arguments-slope": number;
                    "divideInteger-cpu-arguments-constant": number;
                    "divideInteger-cpu-arguments-model-arguments-intercept": number;
                    "divideInteger-cpu-arguments-model-arguments-slope": number;
                    "divideInteger-memory-arguments-intercept": number;
                    "divideInteger-memory-arguments-minimum": number;
                    "divideInteger-memory-arguments-slope": number;
                    "encodeUtf8-cpu-arguments-intercept": number;
                    "encodeUtf8-cpu-arguments-slope": number;
                    "encodeUtf8-memory-arguments-intercept": number;
                    "encodeUtf8-memory-arguments-slope": number;
                    "equalsByteString-cpu-arguments-constant": number;
                    "equalsByteString-cpu-arguments-intercept": number;
                    "equalsByteString-cpu-arguments-slope": number;
                    "equalsByteString-memory-arguments": number;
                    "equalsData-cpu-arguments-intercept": number;
                    "equalsData-cpu-arguments-slope": number;
                    "equalsData-memory-arguments": number;
                    "equalsInteger-cpu-arguments-intercept": number;
                    "equalsInteger-cpu-arguments-slope": number;
                    "equalsInteger-memory-arguments": number;
                    "equalsString-cpu-arguments-constant": number;
                    "equalsString-cpu-arguments-intercept": number;
                    "equalsString-cpu-arguments-slope": number;
                    "equalsString-memory-arguments": number;
                    "fstPair-cpu-arguments": number;
                    "fstPair-memory-arguments": number;
                    "headList-cpu-arguments": number;
                    "headList-memory-arguments": number;
                    "iData-cpu-arguments": number;
                    "iData-memory-arguments": number;
                    "ifThenElse-cpu-arguments": number;
                    "ifThenElse-memory-arguments": number;
                    "indexByteString-cpu-arguments": number;
                    "indexByteString-memory-arguments": number;
                    "lengthOfByteString-cpu-arguments": number;
                    "lengthOfByteString-memory-arguments": number;
                    "lessThanByteString-cpu-arguments-intercept": number;
                    "lessThanByteString-cpu-arguments-slope": number;
                    "lessThanByteString-memory-arguments": number;
                    "lessThanEqualsByteString-cpu-arguments-intercept": number;
                    "lessThanEqualsByteString-cpu-arguments-slope": number;
                    "lessThanEqualsByteString-memory-arguments": number;
                    "lessThanEqualsInteger-cpu-arguments-intercept": number;
                    "lessThanEqualsInteger-cpu-arguments-slope": number;
                    "lessThanEqualsInteger-memory-arguments": number;
                    "lessThanInteger-cpu-arguments-intercept": number;
                    "lessThanInteger-cpu-arguments-slope": number;
                    "lessThanInteger-memory-arguments": number;
                    "listData-cpu-arguments": number;
                    "listData-memory-arguments": number;
                    "mapData-cpu-arguments": number;
                    "mapData-memory-arguments": number;
                    "mkCons-cpu-arguments": number;
                    "mkCons-memory-arguments": number;
                    "mkNilData-cpu-arguments": number;
                    "mkNilData-memory-arguments": number;
                    "mkNilPairData-cpu-arguments": number;
                    "mkNilPairData-memory-arguments": number;
                    "mkPairData-cpu-arguments": number;
                    "mkPairData-memory-arguments": number;
                    "modInteger-cpu-arguments-constant": number;
                    "modInteger-cpu-arguments-model-arguments-intercept": number;
                    "modInteger-cpu-arguments-model-arguments-slope": number;
                    "modInteger-memory-arguments-intercept": number;
                    "modInteger-memory-arguments-minimum": number;
                    "modInteger-memory-arguments-slope": number;
                    "multiplyInteger-cpu-arguments-intercept": number;
                    "multiplyInteger-cpu-arguments-slope": number;
                    "multiplyInteger-memory-arguments-intercept": number;
                    "multiplyInteger-memory-arguments-slope": number;
                    "nullList-cpu-arguments": number;
                    "nullList-memory-arguments": number;
                    "quotientInteger-cpu-arguments-constant": number;
                    "quotientInteger-cpu-arguments-model-arguments-intercept": number;
                    "quotientInteger-cpu-arguments-model-arguments-slope": number;
                    "quotientInteger-memory-arguments-intercept": number;
                    "quotientInteger-memory-arguments-minimum": number;
                    "quotientInteger-memory-arguments-slope": number;
                    "remainderInteger-cpu-arguments-constant": number;
                    "remainderInteger-cpu-arguments-model-arguments-intercept": number;
                    "remainderInteger-cpu-arguments-model-arguments-slope": number;
                    "remainderInteger-memory-arguments-intercept": number;
                    "remainderInteger-memory-arguments-minimum": number;
                    "remainderInteger-memory-arguments-slope": number;
                    "sha2_256-cpu-arguments-intercept": number;
                    "sha2_256-cpu-arguments-slope": number;
                    "sha2_256-memory-arguments": number;
                    "sha3_256-cpu-arguments-intercept": number;
                    "sha3_256-cpu-arguments-slope": number;
                    "sha3_256-memory-arguments": number;
                    "sliceByteString-cpu-arguments-intercept": number;
                    "sliceByteString-cpu-arguments-slope": number;
                    "sliceByteString-memory-arguments-intercept": number;
                    "sliceByteString-memory-arguments-slope": number;
                    "sndPair-cpu-arguments": number;
                    "sndPair-memory-arguments": number;
                    "subtractInteger-cpu-arguments-intercept": number;
                    "subtractInteger-cpu-arguments-slope": number;
                    "subtractInteger-memory-arguments-intercept": number;
                    "subtractInteger-memory-arguments-slope": number;
                    "tailList-cpu-arguments": number;
                    "tailList-memory-arguments": number;
                    "trace-cpu-arguments": number;
                    "trace-memory-arguments": number;
                    "unBData-cpu-arguments": number;
                    "unBData-memory-arguments": number;
                    "unConstrData-cpu-arguments": number;
                    "unConstrData-memory-arguments": number;
                    "unIData-cpu-arguments": number;
                    "unIData-memory-arguments": number;
                    "unListData-cpu-arguments": number;
                    "unListData-memory-arguments": number;
                    "unMapData-cpu-arguments": number;
                    "unMapData-memory-arguments": number;
                    "verifyEd25519Signature-cpu-arguments-intercept": number;
                    "verifyEd25519Signature-cpu-arguments-slope": number;
                    "verifyEd25519Signature-memory-arguments": number;
                };
                PlutusScriptV2: {
                    "addInteger-cpu-arguments-intercept": number;
                    "addInteger-cpu-arguments-slope": number;
                    "addInteger-memory-arguments-intercept": number;
                    "addInteger-memory-arguments-slope": number;
                    "appendByteString-cpu-arguments-intercept": number;
                    "appendByteString-cpu-arguments-slope": number;
                    "appendByteString-memory-arguments-intercept": number;
                    "appendByteString-memory-arguments-slope": number;
                    "appendString-cpu-arguments-intercept": number;
                    "appendString-cpu-arguments-slope": number;
                    "appendString-memory-arguments-intercept": number;
                    "appendString-memory-arguments-slope": number;
                    "bData-cpu-arguments": number;
                    "bData-memory-arguments": number;
                    "blake2b_256-cpu-arguments-intercept": number;
                    "blake2b_256-cpu-arguments-slope": number;
                    "blake2b_256-memory-arguments": number;
                    "cekApplyCost-exBudgetCPU": number;
                    "cekApplyCost-exBudgetMemory": number;
                    "cekBuiltinCost-exBudgetCPU": number;
                    "cekBuiltinCost-exBudgetMemory": number;
                    "cekConstCost-exBudgetCPU": number;
                    "cekConstCost-exBudgetMemory": number;
                    "cekDelayCost-exBudgetCPU": number;
                    "cekDelayCost-exBudgetMemory": number;
                    "cekForceCost-exBudgetCPU": number;
                    "cekForceCost-exBudgetMemory": number;
                    "cekLamCost-exBudgetCPU": number;
                    "cekLamCost-exBudgetMemory": number;
                    "cekStartupCost-exBudgetCPU": number;
                    "cekStartupCost-exBudgetMemory": number;
                    "cekVarCost-exBudgetCPU": number;
                    "cekVarCost-exBudgetMemory": number;
                    "chooseData-cpu-arguments": number;
                    "chooseData-memory-arguments": number;
                    "chooseList-cpu-arguments": number;
                    "chooseList-memory-arguments": number;
                    "chooseUnit-cpu-arguments": number;
                    "chooseUnit-memory-arguments": number;
                    "consByteString-cpu-arguments-intercept": number;
                    "consByteString-cpu-arguments-slope": number;
                    "consByteString-memory-arguments-intercept": number;
                    "consByteString-memory-arguments-slope": number;
                    "constrData-cpu-arguments": number;
                    "constrData-memory-arguments": number;
                    "decodeUtf8-cpu-arguments-intercept": number;
                    "decodeUtf8-cpu-arguments-slope": number;
                    "decodeUtf8-memory-arguments-intercept": number;
                    "decodeUtf8-memory-arguments-slope": number;
                    "divideInteger-cpu-arguments-constant": number;
                    "divideInteger-cpu-arguments-model-arguments-intercept": number;
                    "divideInteger-cpu-arguments-model-arguments-slope": number;
                    "divideInteger-memory-arguments-intercept": number;
                    "divideInteger-memory-arguments-minimum": number;
                    "divideInteger-memory-arguments-slope": number;
                    "encodeUtf8-cpu-arguments-intercept": number;
                    "encodeUtf8-cpu-arguments-slope": number;
                    "encodeUtf8-memory-arguments-intercept": number;
                    "encodeUtf8-memory-arguments-slope": number;
                    "equalsByteString-cpu-arguments-constant": number;
                    "equalsByteString-cpu-arguments-intercept": number;
                    "equalsByteString-cpu-arguments-slope": number;
                    "equalsByteString-memory-arguments": number;
                    "equalsData-cpu-arguments-intercept": number;
                    "equalsData-cpu-arguments-slope": number;
                    "equalsData-memory-arguments": number;
                    "equalsInteger-cpu-arguments-intercept": number;
                    "equalsInteger-cpu-arguments-slope": number;
                    "equalsInteger-memory-arguments": number;
                    "equalsString-cpu-arguments-constant": number;
                    "equalsString-cpu-arguments-intercept": number;
                    "equalsString-cpu-arguments-slope": number;
                    "equalsString-memory-arguments": number;
                    "fstPair-cpu-arguments": number;
                    "fstPair-memory-arguments": number;
                    "headList-cpu-arguments": number;
                    "headList-memory-arguments": number;
                    "iData-cpu-arguments": number;
                    "iData-memory-arguments": number;
                    "ifThenElse-cpu-arguments": number;
                    "ifThenElse-memory-arguments": number;
                    "indexByteString-cpu-arguments": number;
                    "indexByteString-memory-arguments": number;
                    "lengthOfByteString-cpu-arguments": number;
                    "lengthOfByteString-memory-arguments": number;
                    "lessThanByteString-cpu-arguments-intercept": number;
                    "lessThanByteString-cpu-arguments-slope": number;
                    "lessThanByteString-memory-arguments": number;
                    "lessThanEqualsByteString-cpu-arguments-intercept": number;
                    "lessThanEqualsByteString-cpu-arguments-slope": number;
                    "lessThanEqualsByteString-memory-arguments": number;
                    "lessThanEqualsInteger-cpu-arguments-intercept": number;
                    "lessThanEqualsInteger-cpu-arguments-slope": number;
                    "lessThanEqualsInteger-memory-arguments": number;
                    "lessThanInteger-cpu-arguments-intercept": number;
                    "lessThanInteger-cpu-arguments-slope": number;
                    "lessThanInteger-memory-arguments": number;
                    "listData-cpu-arguments": number;
                    "listData-memory-arguments": number;
                    "mapData-cpu-arguments": number;
                    "mapData-memory-arguments": number;
                    "mkCons-cpu-arguments": number;
                    "mkCons-memory-arguments": number;
                    "mkNilData-cpu-arguments": number;
                    "mkNilData-memory-arguments": number;
                    "mkNilPairData-cpu-arguments": number;
                    "mkNilPairData-memory-arguments": number;
                    "mkPairData-cpu-arguments": number;
                    "mkPairData-memory-arguments": number;
                    "modInteger-cpu-arguments-constant": number;
                    "modInteger-cpu-arguments-model-arguments-intercept": number;
                    "modInteger-cpu-arguments-model-arguments-slope": number;
                    "modInteger-memory-arguments-intercept": number;
                    "modInteger-memory-arguments-minimum": number;
                    "modInteger-memory-arguments-slope": number;
                    "multiplyInteger-cpu-arguments-intercept": number;
                    "multiplyInteger-cpu-arguments-slope": number;
                    "multiplyInteger-memory-arguments-intercept": number;
                    "multiplyInteger-memory-arguments-slope": number;
                    "nullList-cpu-arguments": number;
                    "nullList-memory-arguments": number;
                    "quotientInteger-cpu-arguments-constant": number;
                    "quotientInteger-cpu-arguments-model-arguments-intercept": number;
                    "quotientInteger-cpu-arguments-model-arguments-slope": number;
                    "quotientInteger-memory-arguments-intercept": number;
                    "quotientInteger-memory-arguments-minimum": number;
                    "quotientInteger-memory-arguments-slope": number;
                    "remainderInteger-cpu-arguments-constant": number;
                    "remainderInteger-cpu-arguments-model-arguments-intercept": number;
                    "remainderInteger-cpu-arguments-model-arguments-slope": number;
                    "remainderInteger-memory-arguments-intercept": number;
                    "remainderInteger-memory-arguments-minimum": number;
                    "remainderInteger-memory-arguments-slope": number;
                    "serialiseData-cpu-arguments-intercept": number;
                    "serialiseData-cpu-arguments-slope": number;
                    "serialiseData-memory-arguments-intercept": number;
                    "serialiseData-memory-arguments-slope": number;
                    "sha2_256-cpu-arguments-intercept": number;
                    "sha2_256-cpu-arguments-slope": number;
                    "sha2_256-memory-arguments": number;
                    "sha3_256-cpu-arguments-intercept": number;
                    "sha3_256-cpu-arguments-slope": number;
                    "sha3_256-memory-arguments": number;
                    "sliceByteString-cpu-arguments-intercept": number;
                    "sliceByteString-cpu-arguments-slope": number;
                    "sliceByteString-memory-arguments-intercept": number;
                    "sliceByteString-memory-arguments-slope": number;
                    "sndPair-cpu-arguments": number;
                    "sndPair-memory-arguments": number;
                    "subtractInteger-cpu-arguments-intercept": number;
                    "subtractInteger-cpu-arguments-slope": number;
                    "subtractInteger-memory-arguments-intercept": number;
                    "subtractInteger-memory-arguments-slope": number;
                    "tailList-cpu-arguments": number;
                    "tailList-memory-arguments": number;
                    "trace-cpu-arguments": number;
                    "trace-memory-arguments": number;
                    "unBData-cpu-arguments": number;
                    "unBData-memory-arguments": number;
                    "unConstrData-cpu-arguments": number;
                    "unConstrData-memory-arguments": number;
                    "unIData-cpu-arguments": number;
                    "unIData-memory-arguments": number;
                    "unListData-cpu-arguments": number;
                    "unListData-memory-arguments": number;
                    "unMapData-cpu-arguments": number;
                    "unMapData-memory-arguments": number;
                    "verifyEcdsaSecp256k1Signature-cpu-arguments": number;
                    "verifyEcdsaSecp256k1Signature-memory-arguments": number;
                    "verifyEd25519Signature-cpu-arguments-intercept": number;
                    "verifyEd25519Signature-cpu-arguments-slope": number;
                    "verifyEd25519Signature-memory-arguments": number;
                    "verifySchnorrSecp256k1Signature-cpu-arguments-intercept": number;
                    "verifySchnorrSecp256k1Signature-cpu-arguments-slope": number;
                    "verifySchnorrSecp256k1Signature-memory-arguments": number;
                };
            };
            executionUnitPrices: {
                priceMemory: number;
                priceSteps: number;
            };
            maxBlockBodySize: number;
            maxBlockExecutionUnits: {
                memory: number;
                steps: number;
            };
            maxBlockHeaderSize: number;
            maxCollateralInputs: number;
            maxTxExecutionUnits: {
                memory: number;
                steps: number;
            };
            maxTxSize: number;
            maxValueSize: number;
            minPoolCost: number;
            monetaryExpansion: number;
            poolPledgeInfluence: number;
            poolRetireMaxEpoch: number;
            protocolVersion: {
                major: number;
                minor: number;
            };
            stakeAddressDeposit: number;
            stakePoolDeposit: number;
            stakePoolTargetNum: number;
            treasuryCut: number;
            txFeeFixed: number;
            txFeePerByte: number;
            utxoCostPerByte: number;
        };
        latestTip: {
            epoch: number;
            hash: string;
            slot: number;
            time: number;
        };
    };
    export type enhancedNetworkParams = NetworkParams & {
        slotToTimestamp(n: bigint): Date;
    };
    export type helperSubclass<SC extends StellarContract<any>, P extends configBase = SC extends StellarContract<infer PT> ? PT : never> = new (params: P & canHaveRandomSeed) => StellarTestHelper<SC, P>;
    export type canHaveRandomSeed = {
        randomSeed?: number;
    };
    export type canSkipSetup = {
        skipSetup?: true;
    };
    export function addTestContext<SC extends StellarContract<any>, P extends configBase = SC extends StellarContract<infer PT> ? PT : never>(context: StellarTestContext<any, SC, P>, TestHelperClass: helperSubclass<SC>, params?: P): Promise<void>;
    export type actorMap = Record<string, WalletEmulator>;
    export const ADA = 1000000n;
}
declare module "lib/authority/AddressAuthorityPolicy" {
    import { Address, TxInput } from "@hyperionbt/helios";
    import { isActivity } from "lib/StellarContract";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { AuthorityPolicy } from "lib/authority/AuthorityPolicy";
    export class AddressAuthorityPolicy extends AuthorityPolicy {
        loadProgramScript(params: any): null;
        protected usingAuthority(): isActivity;
        txnMustFindAuthorityToken(tcx: any): Promise<TxInput>;
        txnReceiveAuthorityToken(tcx: StellarTxnContext, delegateAddr: Address): Promise<StellarTxnContext>;
        txnGrantAuthority(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
        txnRetireCred(tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<StellarTxnContext>;
    }
}
declare module "lib/DefaultCapo" {
    import { configBase, isActivity } from "lib/StellarContract";
    import { InlineDatum } from "lib/HeliosPromotedTypes";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { Capo, CapoBaseConfig, hasSelectedDelegates } from "lib/Capo";
    import { DefaultMinter } from "lib/DefaultMinter";
    import { RelativeDelegateLink, RoleMap } from "lib/delegation/RolesAndDelegates";
    export type DefaultCharterDatumArgs<CT extends configBase = CapoBaseConfig> = {
        govAuthorityLink: RelativeDelegateLink<CT>;
    };
    export type PartialDefaultCharterDatumArgs<T extends DefaultCharterDatumArgs<any> = DefaultCharterDatumArgs, CT extends configBase = T extends DefaultCharterDatumArgs<infer iCT> ? iCT : never> = Partial<Omit<T, "govAuthorityLink">> & {
        govAuthorityLink: Required<Pick<RelativeDelegateLink<CT>, "strategyName">> & Partial<RelativeDelegateLink<CT>>;
    };
    export type HeldAssetsArgs = {
        purposeId?: string;
        purpose?: string;
    };
    export class DefaultCapo<MinterType extends DefaultMinter = DefaultMinter, CDT extends DefaultCharterDatumArgs = DefaultCharterDatumArgs, configType extends CapoBaseConfig = CapoBaseConfig> extends Capo<MinterType, CDT, configType> {
        contractSource(): any;
        get roles(): RoleMap;
        mkDatumCharterToken(args: CDT): InlineDatum;
        txnAddCharterAuthz(tcx: StellarTxnContext, datum: InlineDatum): Promise<StellarTxnContext<{}>>;
        mkTxnMintCharterToken(charterDatumArgs: PartialDefaultCharterDatumArgs<CDT>, existingTcx?: hasSelectedDelegates): Promise<StellarTxnContext | never>;
        updatingCharter(): isActivity;
        mkTxnUpdateCharter(args: CDT, tcx?: StellarTxnContext): Promise<StellarTxnContext>;
        requirements(): import("lib/Requirements.js").ReqtsMap<"the trustee group can be changed" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the trustee threshold is enforced on all administrative actions" | "the charter token is always kept in the contract" | "can mint other tokens, on the authority of the Charter token" | "has a singleton minting policy" | "foo">;
    }
}
declare module "lib/testing/CapoTestHelper" {
    import { TxId } from "@hyperionbt/helios";
    import { Capo, CapoBaseConfig, anyDatumArgs } from "lib/Capo";
    import { StellarTxnContext } from "lib/StellarTxnContext";
    import { StellarTestHelper } from "lib/testing/StellarTestHelper";
    export abstract class CapoTestHelper<SC extends Capo<any>, CDT extends anyDatumArgs = SC extends Capo<any, infer iCDT> ? iCDT : anyDatumArgs> extends StellarTestHelper<SC, CapoBaseConfig> {
        initialize({ randomSeed, seedTxn, seedIndex, }?: {
            seedTxn?: TxId;
            seedIndex?: bigint;
            randomSeed?: number;
        }): Promise<SC>;
        abstract mkDefaultCharterArgs(): Partial<CDT>;
        mintCharterToken(args?: CDT): Promise<StellarTxnContext>;
    }
}
declare module "index" {
    global {
        interface ImportAttributes {
            type: "json" | "text";
        }
    }
    export { heliosRollupLoader } from "lib/heliosRollupLoader";
    export { assetsAsString, txAsString, utxoAsString, valueAsString, utxosAsString, txOutputAsString, txInputAsString, lovelaceToAda, errorMapAsString, } from "lib/diagnostics";
    export { Capo, variantMap, } from "lib/Capo";
    export type { MintUutRedeemerArgs, MintCharterRedeemerArgs, uutPurposeMap, hasSomeUuts, hasAllUuts, hasUutContext, RoleMap, strategyValidation, } from "lib/Capo";
    export type { SeedTxnParams } from "lib/SeedTxn";
    export { BasicMintDelegate } from "lib/delegation/BasicMintDelegate";
    export { StellarContract, Activity, txn, partialTxn, datum, } from "lib/StellarContract";
    export { StellarTxnContext } from "lib/StellarTxnContext";
    export type { stellarSubclass, isActivity, utxoPredicate, anyDatumProps, configBase as paramsBase } from "lib/StellarContract";
    export { ADA, addTestContext, } from "lib/testing/types";
    export type { StellarTestContext } from "lib/testing/StellarTestContext";
    export { CapoTestHelper } from "lib/testing/CapoTestHelper";
    export { StellarTestHelper } from "lib/testing/StellarTestHelper";
    export { DefaultMinter } from "lib/DefaultMinter";
    export { DefaultCapo } from "lib/DefaultCapo";
    export type { DefaultCharterDatumArgs } from "lib/DefaultCapo";
    export type { tokenNamesOrValuesEntry, InlineDatum, valuesEntry, } from "lib/HeliosPromotedTypes";
}
//# sourceMappingURL=stellar-contracts.d.ts.map