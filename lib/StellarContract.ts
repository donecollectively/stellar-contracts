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
    TxInput,
    UplcData,
    UplcDataValue,
    UplcProgram,
    Value,
    Wallet,
    extractScriptPurposeAndName,
    Datum,
    AssetClass,
} from "@hyperionbt/helios";
import { StellarTxnContext } from "./StellarTxnContext.js";
import { utxosAsString, valueAsString } from "./diagnostics.js";
import { InlineDatum, valuesEntry } from "./HeliosPromotedTypes.js";
import { HeliosModuleSrc } from "./HeliosModuleSrc.js";


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
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

export type stellarSubclass<
    S extends StellarContract<P>,
    P extends paramsBase = S extends StellarContract<infer SCP> ? SCP : paramsBase
> = 
& ( new (args: StellarConstructorArgs<S, P>) => S & StellarContract<P> )
& { defaultParams: Partial<P> }

export type anyDatumProps = Record<string, any>;
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

    static get defaultParams() {
        return {}
    }

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
        if (simplify) {
            console.warn(`Loading optimized contract code for `+this.configuredContract.name);
        }

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

    //! adds the indicated Value to the transaction; 
    //  ... EXPECTS  the value to already have minUtxo calculated on it.
    @partialTxn // non-activity partial
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum) {
        tcx.addOutput(new TxOutput(this.address, value, datum));

        return tcx;
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

    async readDatum<DPROPS extends anyDatumProps>(datumName:string, datum:Datum | InlineDatum) : Promise<DPROPS> {
        //@ts-expect-error until mainArgTypes is made public again
        const thisDatumType = this.configuredContract.mainArgTypes.find(
            (x) => "Datum" == x.name
        )!.typeMembers[datumName];

        if (!thisDatumType) throw new Error(`invalid datumName ${datumName}`);
        if (!datum.isInline()) throw new Error(`datum must be an InlineDatum to be readable using readDatum()`);

        const { fieldNames, instanceMembers } = thisDatumType as any;
        debugger
        
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
        const offChainTypes = Object.fromEntries(
            fieldNames.map((fn) => {
                return [fn, instanceMembers[fn].offChainType];
            })
        );
        return Object.fromEntries(await Promise.all(
            fieldNames.map(async (fn, i) => {
                let current;
                const uplcData = datum.data;
                debugger
                
                const uplcDataField = uplcData.fields[i];
                const thisFieldType = instanceMembers[fn];
                try {
                    current = thisFieldType.uplcToJs(uplcDataField);
                    if (current.then) current = await current;

                    if ("Enum" === thisFieldType?.typeDetails?.internalType?.type && 0 === uplcDataField.fields.length) {
                        current = Object.keys(current)[0]
                    }
                } catch (e: any) {
                    if (
                        e.message?.match(/doesn't support converting from Uplc/)
                    ) {
                        try {
                            current = await offChainTypes[fn].fromUplcData(uplcDataField);
                            if ("some" in current) current = current.some;
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
                return [fn, current];
            })
        )) as DPROPS;
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
            .map(this._infoBackToUtxo)
        console.log("smallest utxos: ", utxosAsString(found))
        const chosen = found
            .at(0);

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
            this: StellarContract<ParamsType>,
            tcx: StellarTxnContext | undefined,
            utxo: TxInput
        ): TxInput | undefined {
            return this.hasOnlyAda(value, tcx, utxo);
        }
    }

    mkAssetValue(tokenId: AssetClass, count: number = 1) {
        const assets = [
            [tokenId, count] as [AssetClass, number]
        ];
        const v = new Value(undefined, assets);
        return v;
    }

    mkTokenPredicate(
        vOrMph: Value | MintingPolicyHash,
        tokenName?: string,
        quantity?: bigint
    ): tokenPredicate<any> {
        let v: Value;

        //!!! todo: support (AssetClass, quantity) input form
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
        tokenName: string,
        quantity: bigint,
        mph?: MintingPolicyHash
    ): Value {
        throw new Error(`deprecated tokenAsValue on StellarContract base class (Capo has mph, not so much any StellarContract`)
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
    protected _utxoCountAdaOnly(c: number, { minAdaAmount }: utxoInfo): number {
        return c + (minAdaAmount ? 0 : 1);
    }

    async findAnySpareUtxos(tcx: StellarTxnContext): Promise<TxInput[] | never> {
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
                if (tx.body.signers.find(s => a.pubKeyHash!.hex === s.hex)) continue;
                tx.addSigner(a.pubKeyHash!);
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

    // static withParams(this: new () => StellarContract, params: any) : never | StellarContract {
    //     throw new Error(`subclass must implement static withParams`);
    //     // return new this(params)
    // }
    // constructor(params: any) {

    // }
    importModules() : HeliosModuleSrc[] {
        return []
    }

    contractTemplate() {
        const src = this.contractSource();
        const modules = this.importModules();

        // console.log({src, Program)

        try {
            return (this._template = this._template || Program.new(src, modules))
        } catch(e: any) {
            if (!e.src) {
                console.error(
                    `unexpected thrown error while compiling helios program`+
                            `(or its imported module) \n`+
                    `Suggested: connect with debugger (we provided a debugging point already)\n`+
                     `  ... and use 'break on caught exceptions' to analyze the error \n`+
                     `This likely indicates a problem in Helios' error reporting - \n`+
                     `   ... please provide a minimal reproducer as an issue report for repair!`
                )
                try {
                    debugger
                    //! debugger'ing?  YOU ARE AWESOME!
                    //  reminder: ensure "break on caught exceptions" is enabled
                    //  before playing this next line to dig deeper into the error.
                    Program.new(src, modules)
                } catch(sameError) {
                    throw sameError;
                }
            }
            const moduleName = e.src.name;
            const errorModule = [src, ...modules] .find((m) => (m as any).moduleName == moduleName)
            const {srcFile ="‹unknown path to module›"} = errorModule as any || {}
            const [sl, sc, el, ec] = e.getFilePos()
            const t= new Error("");
            const modifiedStack = t.stack!.split("\n").slice(1).join("\n");
            const additionalErrors = e.src.errors.slice(1).map((x) => `       |         ⚠️  also: ${x}`);
            const addlErrorText = additionalErrors.length ? ["", ...additionalErrors, "       v" ].join("\n") : ""
            t.message = e.message + addlErrorText;

            t.stack = `${e.message}\n    at ${moduleName
                } (${srcFile}:${1+sl}:${1+sc})\n`+ 
                modifiedStack 

                throw(t)
        }
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
        predicate: (u: TxInput) => TxInput | undefined,
        exceptInTcx: StellarTxnContext<any>,
        extraErrorHint?: string
    ): Promise<TxInput | never>;
    async mustFindActorUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        extraErrorHint?: string
    ): Promise<TxInput | never>;

    async mustFindActorUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        hintOrExcept?: string | StellarTxnContext<any>,
        hint?: string
    ): Promise<TxInput | never> {
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
        predicate: (u: TxInput) => TxInput | undefined,
        exceptInTcx: StellarTxnContext<any>,
        extraErrorHint?: string
    ): Promise<TxInput | never>;
    async mustFindMyUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        extraErrorHint?: string
    ): Promise<TxInput | never>;

    async mustFindMyUtxo(
        name: string,
        predicate: (u: TxInput) => TxInput | undefined,
        hintOrExcept?: string | StellarTxnContext<any>,
        hint?: string
    ): Promise<TxInput | never> {
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
        predicate: (u: TxInput) => TxInput | undefined,
        {
            address,
            exceptInTcx,
        }: { address: Address; exceptInTcx?: StellarTxnContext<any> },
        extraErrorHint: string = ""
    ): Promise<TxInput | never> {
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
    toUtxoId(u: TxInput) {
        return `${u.txId.hex}@${u.utxoIdx}`;
    }

    async txnFindUtxo(tcx: StellarTxnContext<any>,
        name: string,
        predicate: utxoPredicate,
        address = this.address
    ): Promise<TxInput | undefined> {
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
        }: { address: Address; exceptInTcx?: StellarTxnContext<any> }
    ): Promise<TxInput | undefined> {
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
    ): Promise<TxInput | undefined> {
        return this.hasUtxo(name, predicate, { address: this.address });
    }
}
