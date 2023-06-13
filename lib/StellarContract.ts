import {
    Address,
    Datum,
    DatumHash,
    Network,
    NetworkParams,
    Program,
    Tx,
    TxOutput,
    UTxO,
    UplcProgram,
    Value,
    Wallet,
    extractScriptPurposeAndName,
} from "@hyperionbt/helios";

type WalletsAndAddresses = {
    wallets: Wallet[];
    addresses?: Address[];
};
export type paramsBase = Record<string, any>;

type TxInput = Tx["body"]["inputs"][0];

export function hexToPrintableString(hexStr) {
    let result = '';
    for(let i=0; i<hexStr.length; i+=2){
        let hexChar = hexStr.substring(i, i+2);
        let charCode = parseInt(hexChar, 16);
        
        // ASCII printable characters are in the range 32 (space) to 126 (~)
        if(charCode >= 32 && charCode <= 126){
            result += String.fromCharCode(charCode);
        } else {
            result += `‹${hexChar}›`;
        }
    }
    return result;
}
export function assetsAsString(v: any) {
    return Object.entries(v).map(
        ([policyId, tokens]) => {
            
            const tokenString = Object.entries(
                tokens as any
            ).map( ([name, count]) => 
                `${count}×💴 ${hexToPrintableString(name)}`
            ).join(" + ");
            return `⦑🏦 ${policyId.substring(0,12)}… ${tokenString}⦒`
        }
    ).join("\n  ")
}
export function valueAsString(v: Value) {
    const l = parseInt(v.lovelace.toString());
    const ada = l && `${(Math.round(l / 1000) / 1000).toFixed(3)} ADA ` || ""
    const assets = assetsAsString(v.assets.dump())
    return [ ada, assets ].filter(x => !!x).join( " + " )
}

export function txAsString(tx: Tx): string {
    const bodyAttrs = [
        "inputs",
        "minted",
        "outputs",
        "collateral",
        "fee",
        "lastValidSlot",
        "firstValidSlot",
        "metadataHash",
        "scriptDataHash",
        "signers",
        "collateralReturn",
        "refInputs",
    ];
    const witnessAttrs = [
        "signatures",
        "datums",
        "refScripts",
        "scripts",
        "redeemers",
        "nativeScripts",
    ];
    
    let details = "";

    const d = tx ;// .dump()
    // console.log("tx dump", JSON.stringify(d,null, 2))

    for (const x of bodyAttrs) {
        let item = d.body[x] as any;
        // console.log(`attr '${x}'`)
        if (Array.isArray(item) && !item.length) continue;
      
        if (!item) continue;
        if ("inputs" == x) {
            item =`\n     ${item.map(x => txInputAsString(x)).join("\n  ")}`;
        }
        if ("minted" == x) {
            const assets = item?.dump()
            if (!Object.entries( assets || {}).length) continue;
            
            item = ` ❇️  ${assetsAsString(assets)}`;
        }
        if("outputs" == x) {
            item = `\n  ${item.map((x, i)=> txOutputAsString(x, `${i}  <-`)).join("\n  ")}`;
        }

        if ("fee" == x) {
            item = parseInt(item)
            item = `${(Math.round(item / 1000) / 1000).toFixed(3)} ADA`;
            // console.log("fee", item)
        }
        if ("collateral" == x) {
            item = item.map((x) => txInputAsString(x, "🔪")).join("\n    ");
        }
        details += `  ${x}: ${item}\n`;
    }
    let hasWinfo = false
    const winfo = {}
    for (const x of witnessAttrs) {
        let item = d.witnesses[x] as any;
        if (Array.isArray(item) && !item.length) continue;
        if ("datums" == x && !Object.entries(item || {}).length) continue;
        if ("signatures" == x) {
            item = item.map( s => {
                return `🖊️ ${Address.fromPubKeyHash(
                    s.pubKeyHash
                ).toBech32().substring(0,24) }…`
            }).join("\n  ")
        }
        if ("redeemers" == x) {
            //!!! todo: augment with mph when that's available from the Redeemer.
            item = item.map(
                x => `🏧 ${x.constructor.name} #${1+x.data.index} ${x.data.toString()}`
            ).join("\n  ")
        }
        if ("scripts" == x) {
            item = item.map(
                s => {
                    try {
                        return `🏦 ${s.mintingPolicyHash.hex.substring(0,12)}…`
                    } catch(e) {
                        return `📝 ${s.validatorHash.hex.substring(0,12)}}…`
                    }
                }
            ).join("\n  ")
        }

        if (!item) continue;
        hasWinfo = true
        winfo[x] = item;
    }
    if (hasWinfo) {
        details += Object.entries(winfo).map(
            ([k, v]) => `  ${k}: ${v}\n`
        ).join("")
    }
    try {
        details = details + `  txId: ${tx.id().dump()}`
    } catch(e) {
        details = details + `  (Tx not yet finalized!)`
    }
    return details

    // body {
    // inputs,
    // output
    //     "fee": "168581",
    //     "lastValidSlot": null,
    //     "firstValidSlot": null,
    //     "minted": null,
    //     "metadataHash": null,
    //     "scriptDataHash": null,
    //     "collateral": null,
    //     "signers": null,
    //     "collateralReturn": null,
    //     "refInputs": []
    //   },
    //   "witnesses": {
    //     "signatures": [],
    //     "datums": [],
    //     "redeemers": [],
    //     "nativeScripts": [],
    //     "scripts": [],
    //     "refScripts": []
    //   },
    //   "valid": true,
    //   "metadata": null
}
export function txInputAsString(x: TxInput, prefix="-> "): string {
    return `${prefix}${x.address.toBech32().substring(0, 17)}… ${
        valueAsString(x.value)
    } = 📖 ${x.txId.hex.substring(0, 12)}…@${x.utxoIdx}`;
}

export function utxosAsString(utxos: UTxO[]): string {
    return utxos.map((u) => utxoAsString(u, " 💵")).join("\n");
}

export function utxoAsString(u: UTxO, prefix = "💵"): string {
    return ` 📖 ${u.txId.hex.substring(0,12)}…@${u.utxoIdx}: ${txOutputAsString(u.origOutput, prefix)}`; // or 🪙
}

export function datumAsString(d: Datum | undefined): string {
    if (!d) return ""; //"‹no datum›";
    // debugger
    const dhss = d.hash.hex.substring(0, 12);
    if (d.isInline()) return `d‹inline:${dhss}…›`;
    return `d‹hash:${dhss}…›`;
}

export function txOutputAsString(x: TxOutput, prefix = "<-"): string {
    return `${prefix} ${x.address
        .toBech32()
        .substring(0, 17)}… ${datumAsString(x.datum)} ${
            valueAsString(x.value)
    }`;
}

//!!! if we could access the inputs and outputs in a building Tx,
//  this might  not be necessary (unless it becomes a
//   bigger-picture contextual container that serves various Stellar
//   contract scripts with non-txn context for building a Tx)

export class StellarTxnContext {
    tx: Tx;
    inputs: UTxO[];
    outputs: TxOutput[];
    constructor() {
        this.tx = new Tx();
        this.inputs = [];
        this.outputs = [];
    }
    dump() {
        const { tx } = this;
        return txAsString(tx);
    }
    mintTokens(...args: Parameters<Tx["mintTokens"]>) {
        return this.tx.mintTokens(...args)
    }
    addInput(input: UTxO) {
        this.inputs.push(input);
        this.tx.addInput(input);
        return this;
    }
    addInputs(inputs: UTxO[]) {
        this.inputs.push(...inputs);
        this.tx.addInputs(inputs);
        return this;
    }

    addOutput(output: TxOutput) {
        this.outputs.push(output);
        this.tx.addOutput(output);
        return this;
    }
    addOutputs(outputs: TxOutput[]) {
        this.outputs.push(...outputs);
        this.tx.addOutputs(outputs);
        return this;
    }
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
        console.log("finding funds in wallet", a.toBech32());
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
    myself?: Wallet;
};
type utxoPredicate = (u: UTxO) => UTxO | boolean;

type scriptPurpose =
    | "testing"
    | "minting"
    | "spending"
    | "staking"
    | "module"
    | "linking";

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
    myself?: Wallet;

    mkContractParams(params) {
        return params;
    }
    constructor({
        params,
        network,
        networkParams,
        isTest,
        myself,
    }: StellarConstructorArgs<StellarContract<ParamsType>, ParamsType>) {
        this.network = network;
        this.networkParams = networkParams;
        this.paramsIn = params;

        this.contractParams = this.mkContractParams(params);
        if (myself) this.myself = myself;

        const configured = (this.configuredContract = this.contractTemplate());

        configured.parameters = this.contractParams;
        const simplify = !isTest;
        this.compiledContract = configured.compile(simplify);

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
        const src = this.contractSource();

        const [purpose, name] = extractScriptPurposeAndName(src) || [];
        return (this._purpose = purpose as scriptPurpose);
    }

    async findInputsInWallets(v: Value, searchIn: WalletsAndAddresses) {
        return findInputsInWallets(v, searchIn, this.network);
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
            return b32.replace(/^asset/, "mph");
        }

        return this.address.toBech32();
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
            myself: this.myself,
            networkParams: this.networkParams,
            isTest: true,
        };
        //@ts-expect-error todo: why is the conditional type not matching enough?
        const strella = new TargetClass(args);
        return strella;
    }

    async findDatum(d: Datum | DatumHash): Promise<UTxO[]>;
    async findDatum(predicate: utxoPredicate): Promise<UTxO[]>;
    async findDatum(d: Datum | DatumHash | utxoPredicate): Promise<UTxO[]> {
        let targetHash: DatumHash | undefined =
            d instanceof Datum
                ? d.hash
                : d instanceof DatumHash
                ? d
                : undefined;
        let predicate =
            "function" === typeof d
                ? d
                : (u: UTxO) => {
                      const match =
                          u.origOutput?.datum?.hash.hex == targetHash?.hex;
                      console.log(
                          txOutputAsString(
                              u.origOutput,
                              `    ${match ? "✅ matched " : "❌ no match"}`
                          )
                      );
                      return !!match;
                  };

        //prettier-ignore
        console.log(
            `finding utxo with datum ${
                targetHash?.hex.substring(0,12)
            }... in wallet`,
            this.address.toBech32()
        );

        const heldUtxos = await this.network.getUtxos(this.address);
        console.log(`    - found ${heldUtxos.length} utxo:`);
        return heldUtxos.filter(predicate);
    }

    async submit(txc: StellarTxnContext, { sign = true } = {}) {
        const { tx } = txc;
        if (this.myself) {
            const [a] = await this.myself.usedAddresses;
            await tx.finalize(this.networkParams, a);
            if (sign) {
                const s = await this.myself.signTx(tx);
                tx.addSignatures(s, true);
            }
        }
        console.log("Submitting tx: ", txc.dump());

        return this.network.submitTx(tx);
    }

    ADA(n: bigint | number): bigint {
        const bn = ("number" == typeof n) ? 
            BigInt(Math.floor(1_000_000 * n)) : 
            (BigInt(1_000_000) * n as bigint);
        return bn;
    }

    //! it requires an subclass to define a contractSource
    contractSource(): string | never {
        throw new Error(`missing contractSource impl`);
    }

    //!!! todo: implement more and/or test me:
    async findFreeLovelaceWithTokens(v: Value, w: Wallet) {
        const utxos = await w.utxos;
        const lovelaceOnly = v.assets.isZero();
        //! it finds free lovelace in token bundles, if it can't find free lovelace otherwise
        if (lovelaceOnly) {
            let maxFree: UTxO, minToken: UTxO;
            let minPolicyCount = Infinity;

            for (const u of utxos) {
                const policies = u.value.assets.mintingPolicies.length;
                if (policies < minPolicyCount) {
                    minPolicyCount = policies;
                    minToken = u;
                }

                const free =
                    u.value.lovelace -
                    u.origOutput.calcMinLovelace(this.networkParams);
                //@ts-ignore
                if (!maxFree) {
                    maxFree = u;
                } else if (free > maxFree!.value.lovelace) {
                    maxFree = u;
                }
            }
        }
    }

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
}
