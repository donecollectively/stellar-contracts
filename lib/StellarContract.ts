import {
    Address,
    Assets,
    DatumHash,
    HInt,
    HeliosData,
    MintingPolicyHash,
    Network,
    NetworkParams,
    Program,
    TxOutput,
    UTxO,
    UplcData,
    UplcDataValue,
    UplcProgram,
    Value,
    Wallet,
    extractScriptPurposeAndName,
} from "@hyperionbt/helios";
import { StellarTxnContext } from "./StellarTxnContext.js";
import { utxosAsString } from "./diagnostics.js";
import { TxInput, valuesEntry } from "./HeliosPromotedTypes.js";

type tokenPredicate<tokenBearer extends canHaveToken> = ((
    something: tokenBearer
) => tokenBearer | undefined) & { value: Value };
export type isActivity = {
    redeemer:  UplcDataValue | UplcData
    // | HeliosData 
}

type WalletsAndAddresses = {
    wallets: Wallet[];
    addresses?: Address[];
};
export type utxoInfo = {
    u: UTxO;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

export type stellarSubclass<
    S extends StellarContract<P>,
    P extends paramsBase
> = new (args: StellarConstructorArgs<S, P>) => S & StellarContract<P>;

export type paramsBase = Record<string, any>;

export const Activity = {
    partialTxn(proto, thingName, descriptor) {
        needsActiveVerb(thingName)
        return partialTxn(proto, thingName, descriptor);
    },
    redeemer(proto, thingName, descriptor) {
        needsActiveVerb(thingName, !!"okwhatever")
        return Activity.redeemerData(proto, thingName, descriptor);
    },
    redeemerData(proto, thingName, descriptor) {
        //!!! todo: registry and cross-checking for missing redeeming methods
        
        //!!! todo: develop more patterns of "redeemer uses an input of a certain mph/value"
        return descriptor;
    }
};

function needsActiveVerb(thingName : string, okWorkaround? : boolean) {
    if (!thingName.match(/ing/)) {
        const orWorkaround = okWorkaround  && "(or work around with @Activity.redeemerData instead)";
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


export function datum(proto, thingName, descriptor) {
    // console.log("+datum", proto.constructor.name, thingName || "none", descriptor.value.name )
    if (!thingName.match(/^mkDatum/)) {
        throw new Error(
            `@datum factory: ${thingName}: name should start with 'mkDatum...'`
        );
    }
    return descriptor;
}

export function txn(proto, thingName, descriptor) {
    // console.log("+datum", proto.constructor.name, thingName || "none", descriptor.value.name )
    if (!thingName.match(/^mkTxn/)) {
        throw new Error(
            `@txn factory: ${thingName}: name should start with 'mkTxn...'`
        );
    }
    return descriptor;
}

export function partialTxn(proto, thingName, descriptor) {
    // console.log("+datum", proto.constructor.name, thingName || "none", descriptor.value.name )
    if (!thingName.match(/^txn[A-Z]/)) {
        throw new Error(
            `@partialTxn factory: ${thingName}: should start with 'txn[A-Z]...'`
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

export type StellarConstructorArgs<
    SC extends StellarContract<P>,
    P extends paramsBase = SC extends StellarContract<infer P> ? P : never
> = {
    params: P;
    network: Network;
    networkParams: NetworkParams;
    isTest: boolean;
    myActor?: Wallet;
};
export type utxoPredicate =
    | ((u: UTxO) => UTxO | undefined)
    | ((u: UTxO) => boolean)
    | ((u: UTxO) => boolean | undefined);

type scriptPurpose =
    | "testing"
    | "minting"
    | "spending"
    | "staking"
    | "module"
    | "linking";

export type canHaveToken = UTxO | TxInput | TxOutput | Assets;

//<CT extends Program>
export class StellarContract<
    // SUB extends StellarContract<any, ParamsType>,
    ParamsType extends paramsBase
> {
    //! it has configuredContract: a parameterized instance of the contract
    //  ... with specific `parameters` assigned.
    configuredContract: Program;
    compiledContract: UplcProgram;
    paramsIn: ParamsType;
    contractParams: paramsBase;
    network: Network;
    networkParams: NetworkParams;
    _template?: Program;
    myActor?: Wallet;

    getContractParams(params) {
        return params;
    }

    constructor({
        params,
        network,
        networkParams,
        isTest,
        myActor,
    }: StellarConstructorArgs<StellarContract<ParamsType>, ParamsType>) {
        this.network = network;
        this.networkParams = networkParams;
        this.paramsIn = params;
        if (myActor) this.myActor = myActor;

        this.contractParams = this.getContractParams(params);

        const configured = (this.configuredContract = this.contractTemplate());
        this.configuredContract.parameters = this.contractParams;

        const simplify = !isTest;
        // const t = new Date().getTime();
        this.compiledContract = configured.compile(simplify);
        // const t2 = new Date().getTime();

        // Result: ~80ms cold-start or (much) faster on additional compiles
        // console.log("::::::::::::::::::::::::compile time "+ (t2 - t) + "ms")
        // -> caching would not improve

        // const configured = Program.new(source)
        // configured.parameters = params;
        // const compiledContract = configured.compile(simplify)
        // const addr = Address.fromHashes(compiledContract.validatorHash)
    }

    get datumType() {
        return this.configuredContract.types.Datum;
    }
    _purpose?: scriptPurpose;
    get purpose() {
        if (this._purpose) return this._purpose;

        const purpose = this.configuredContract.purpose as scriptPurpose;
        return (this._purpose = purpose as scriptPurpose);
    }

    get address(): Address {
        return Address.fromHashes(this.compiledContract.validatorHash);
    }

    get mintingPolicyHash() {
        if ("minting" != this.purpose) return undefined;

        return this.compiledContract.mintingPolicyHash;
    }

    get identity() {
        if ("minting" == this.purpose) {
            const b32 = this.compiledContract.mintingPolicyHash.toBech32();
            //!!! todo: verify bech32 checksum isn't messed up by this:
            return b32.replace(/^asset/, "mph");
        }

        return this.address.toBech32();
    }

    stringToNumberArray(str: string): number[] {
        let encoder = new TextEncoder();
        let byteArray = encoder.encode(str);
        return [...byteArray].map((x) => parseInt(x.toString()));
    }

    mkValuesEntry(tokenName: string, count: bigint): valuesEntry {
        return [this.stringToNumberArray(tokenName), count];
    }

    addScriptWithParams<
        SC extends StellarContract<any>
        // P = SC extends StellarContract<infer P> ? P : never
    >(
        TargetClass: new (
            a: SC extends StellarContract<any>
                ? StellarConstructorArgs<SC>
                : never
        ) => SC,
        params: SC extends StellarContract<infer P> ? P : never
    ) {
        const args: StellarConstructorArgs<SC> = {
            params,
            network: this.network,
            myActor: this.myActor,
            networkParams: this.networkParams,
            isTest: true,
        };
        //@ts-expect-error todo: why is the conditional type not matching enough?
        const strella = new TargetClass(args);
        return strella;
    }

    // async findDatum(d: Datum | DatumHash): Promise<UTxO[]>;
    // async findDatum(predicate: utxoPredicate): Promise<UTxO[]>;
    // async findDatum(d: Datum | DatumHash | utxoPredicate): Promise<UTxO[]> {
    //     let targetHash: DatumHash | undefined =
    //         d instanceof Datum
    //             ? d.hash
    //             : d instanceof DatumHash
    //             ? d
    //             : undefined;
    //     let predicate =
    //         "function" === typeof d
    //             ? d
    //             : (u: UTxO) => {
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

    findSmallestUnusedUtxo(
        lovelace: bigint,
        utxos: UTxO[],
        tcx?: StellarTxnContext
    ): UTxO | undefined {
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
            .map(this._infoBackToUtxo)
            .at(0);

        return found;
    }

    //! creates a filtering function, currently for UTxO-filtering only.
    //! with the optional tcx argument, utxo's already reserved
    //  ... in that transaction context will be skipped.
    mkValuePredicate(
        lovelace: bigint,
        tcx?: StellarTxnContext
    ): tokenPredicate<UTxO> {
        const value = new Value({ lovelace });
        const predicate = _adaPredicate.bind(this, tcx) as tokenPredicate<any>;
        predicate.value = value;
        return predicate;

        function _adaPredicate(
            this: StellarContract<ParamsType>,
            tcx: StellarTxnContext | undefined,
            utxo: UTxO
        ): UTxO | undefined {
            return this.hasOnlyAda(value, tcx, utxo);
        }
    }

    mkTokenPredicate(
        vOrMph: Value | MintingPolicyHash,
        tokenName?: string,
        quantity?: bigint
    ): tokenPredicate<any> {
        let v: Value;

        if (!vOrMph)
            throw new Error(
                `missing required Value or MintingPolicyHash in arg1`
            );
        const predicate = _tokenPredicate.bind(this) as tokenPredicate<any>;

        const isValue = !(vOrMph instanceof MintingPolicyHash);
        if (isValue) {
            v = predicate.value = vOrMph;
            return predicate;
        }
        if (!tokenName || !quantity)
            throw new Error(
                `missing required tokenName, quantity for this mph`
            );

        const mph = vOrMph;
        v = predicate.value = this.tokenAsValue(tokenName, quantity, mph);
        return predicate;

        function _tokenPredicate<tokenBearer extends canHaveToken>(
            this: StellarContract<ParamsType>,
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
        if (something instanceof UTxO)
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
        u: UTxO,
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

    tokenAsValue(
        tokenName: string,
        quantity: bigint,
        mph?: MintingPolicyHash
    ): Value {
        if (!mph) {
            mph = (this as any).mph;
            if (!mph)
                throw new Error(
                    `tokenAsValue: mph in arg3 required unless the stellar contract (${this.constructor.name}) has an 'mph' getter.`
                );
        }

        const v = new Value(
            this.ADA(0),
            new Assets([[mph, [this.mkValuesEntry(tokenName, quantity)]]])
        );
        const o = new TxOutput(this.address, v);
        v.setLovelace(o.calcMinLovelace(this.networkParams));

        return v;
    }

    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: UTxO) {
        const toSortInfo = this._mkUtxoSortInfo(value.lovelace);

        const found = [u]
            .map(toSortInfo)
            .filter(this._utxoIsSufficient)
            .filter(this._utxoIsPureADA)
            .map(this._infoBackToUtxo)
            .at(0);

        return found;
    }

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
        if (free2 > free1) return 1;
        if (free2 < free1) return -1;
        return 0;
    }

    protected _utxoIsSufficient({ sufficient }: utxoInfo) {
        return !!sufficient;
    }
    protected _utxoIsPureADA({ u }: utxoInfo) {
        return u.value.assets.isZero() ? u : undefined;
    }
    protected _infoBackToUtxo({ u }: utxoInfo) {
        return u;
    }
    protected _mkUtxoSortInfo(min: bigint, max?: bigint) {
        return (u: UTxO): utxoInfo => {
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
    protected _utxoCountAdaOnly(c: number, { minAdaAmount }: utxoInfo): number {
        return c + (minAdaAmount ? 0 : 1);
    }

    async findAnySpareUtxos(tcx: StellarTxnContext): Promise<UTxO[] | never> {
        if (!this.myActor) throw this.missingActorError;

        const toSortInfo = this._mkUtxoSortInfo(this.ADA(2), this.ADA(10));
        const notReserved = tcx
            ? tcx.utxoNotReserved.bind(tcx)
            : (u: UTxO) => u;

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

    async submit(
        tcx: StellarTxnContext,
        {
            sign = true,
            signers = [],
        }: {
            sign?: boolean;
            signers?: Wallet[];
        } = {}
    ) {
        let { tx, feeLimit = 2_000_000n } = tcx;
        if (this.myActor || signers.length) {
            const [changeAddress] = (await this.myActor?.usedAddresses) || [];
            const spares = await this.findAnySpareUtxos(tcx);
            const willSign = [...signers];
            if (sign && this.myActor) {
                willSign.push(this.myActor);
            }
            for (const s of willSign) {
                const [a] = await s.usedAddresses;
                if (tx.body.signers.find(s => a.pubKeyHash.hex === s.hex)) continue;
                tx.addSigner(a.pubKeyHash);
            }
            const feeEstimated = tx.estimateCollateralBaseFee(this.networkParams, changeAddress, spares)
            if (feeEstimated > feeLimit) {
                console.log("outrageous fee - adjust tcx.feeLimit to get a different threshold")
                throw new Error(`outrageous fee-computation found - check txn setup for correctness`)
            }
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
                console.log("FAILED submitting:", tcx.dump());
                throw e;
            }
            for (const s of willSign) {
                const sig = await s.signTx(tx);
                tx.addSignatures(sig, true);
            }
        } else {
            console.warn("no 'myActor'; not finalizing");
        }
        console.log("Submitting tx: ", tcx.dump());

        return this.network.submitTx(tx);
    }

    ADA(n: bigint | number): bigint {
        const bn =
            "number" == typeof n
                ? BigInt(Math.round(1_000_000 * n))
                : ((BigInt(1_000_000) * n) as bigint);
        return bn;
    }

    //! it requires an subclass to define a contractSource
    contractSource(): string | never {
        throw new Error(`missing contractSource impl`);
    }

    //!!! todo: implement more and/or test me:
    // async findFreeLovelaceWithTokens(v: Value, w: Wallet) {
    // it.todo("helps find spare lovelace in tokens");
    // it.todo("will help harvest spare lovelace in the future if minUtxo is changed");
    //     const utxos = await w.utxos;
    //     const lovelaceOnly = v.assets.isZero();
    //     //! it finds free lovelace in token bundles, if it can't find free lovelace otherwise
    //     if (lovelaceOnly) {
    //         let maxFree: UTxO, minToken: UTxO;
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

    // static withParams(this: new () => StellarContract, params: any) : never | StellarContract {
    //     throw new Error(`subclass must implement static withParams`);
    //     // return new this(params)
    // }
    // constructor(params: any) {

    // }
    contractTemplate() {
        const src = this.contractSource();
        // console.log({src, Program)

        return (this._template = this._template || Program.new(src));
    }

    async getMyActorAddress() {
        if (!this.myActor) throw this.missingActorError;

        const [addr] = await this.myActor.usedAddresses;

        return addr;
    }

    private get missingActorError(): string | undefined {
        return `missing required 'myActor' property on ${this.constructor.name} instance`;
    }

    async mustFindActorUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        exceptInTcx: StellarTxnContext,
        extraErrorHint?: string
    ): Promise<UTxO | never>;
    async mustFindActorUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        extraErrorHint?: string
    ): Promise<UTxO | never>;

    async mustFindActorUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        hintOrExcept?: string | StellarTxnContext,
        hint?: string
    ): Promise<UTxO | never> {
        const address = await this.getMyActorAddress();

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
            { address, exceptInTcx },
            extraErrorHint
        );
    }

    async mustFindMyUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        exceptInTcx: StellarTxnContext,
        extraErrorHint?: string
    ): Promise<UTxO | never>;
    async mustFindMyUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        extraErrorHint?: string
    ): Promise<UTxO | never>;

    async mustFindMyUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        hintOrExcept?: string | StellarTxnContext,
        hint?: string
    ): Promise<UTxO | never> {
        const { address } = this;
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
            { address, exceptInTcx },
            extraErrorHint
        );
    }

    async mustFindUtxo(
        name: string,
        predicate: (u: UTxO) => UTxO | undefined,
        {
            address,
            exceptInTcx,
        }: { address: Address; exceptInTcx?: StellarTxnContext },
        extraErrorHint: string = ""
    ): Promise<UTxO | never> {
        const found = await this.hasUtxo(name, predicate, {
            address,
            exceptInTcx,
        });
        if (!found) {
            throw new Error(
                `${this.constructor.name}: '${name}' utxo not found (${extraErrorHint}) in address`
            );
        }

        return found;
    }
    toUtxoId(u: UTxO) {
        return `${u.txId.hex}@${u.utxoIdx}`;
    }

    async txnFindUtxo(tcx: StellarTxnContext,
        name: string,
        predicate: utxoPredicate,
        address = this.address
    ): Promise<UTxO | undefined> {
        return this.hasUtxo(name, predicate, {
            address,
            exceptInTcx: tcx
        })
    }

    async hasUtxo(
        name: string,
        predicate: utxoPredicate,
        {
            address,
            exceptInTcx,
        }: { address: Address; exceptInTcx?: StellarTxnContext }
    ): Promise<UTxO | undefined> {
        const utxos = await this.network.getUtxos(address);
        const filterUtxos = exceptInTcx?.reservedUtxos();

        const filtered = exceptInTcx
            ? utxos.filter(exceptInTcx.utxoNotReserved.bind(exceptInTcx))
            : utxos;

        console.log(
            `finding '${name}' utxo${
                exceptInTcx ? " (not already being spent in txn)" : ""
            } from set:\n  ${utxosAsString(filtered, "\n  ")}`,
            ...(exceptInTcx && filterUtxos?.length
                ? [
                      "\n  ... after filtering out:\n  ",
                      utxosAsString(exceptInTcx.reservedUtxos(), "\n  "),
                  ]
                : [])
        );

        const found = filtered.find(predicate);
        if (found) {
            console.log({
                found: utxosAsString([found]),
            });
        } else {
            console.log("  (not found)");
        }
        return found;
    }

    async hasMyUtxo(
        name: string,
        predicate: utxoPredicate
    ): Promise<UTxO | undefined> {
        return this.hasUtxo(name, predicate, { address: this.address });
    }
}
