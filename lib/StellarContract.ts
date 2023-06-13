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

function txInputAsString(x: TxInput): string {
    return `-> ${x.address.toBech32().substring(0, 17)}... ${JSON.stringify(
        x.value.dump()
    )}`;
}
export function datumAsString(d: Datum | undefined) {
    if (!d) return "‹no datum›";
    const dhss = d.hash.hex.substring(0, 12);
    if (d.isInline()) return `‹inline:${dhss}...›`;
    return `‹hash:${dhss}...›`;
}

export function outputAsString(x: TxOutput, prefix = "<- ") {
    return `${prefix} ${x.address
        .toBech32()
        .substring(0, 17)}... ${JSON.stringify(
        x.value.dump()
    )} with ${datumAsString(x.datum)}`;
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
type utxoPredicate = (u: UTxO) => UTxO | undefined;

type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "linking";

//<CT extends Program>
export class StellarContract<
    // SUB extends StellarContract<any, ParamsType>,
    ParamsType extends paramsBase
> {
    //! it has configuredContract: a parameterized instance of the contract
    //  ... with specific `parameters` assigned.
    configuredContract: Program;
    compiledContract: UplcProgram;
    contractParams: ParamsType;
    network: Network;
    networkParams: NetworkParams;
    _template?: Program;
    myself?: Wallet;

    constructor({
        params,
        network,
        networkParams,
        isTest,
        myself,
    }: StellarConstructorArgs<StellarContract<ParamsType>, ParamsType>) {
        this.network = network;
        this.networkParams = networkParams;
        this.contractParams = params;
        if (myself) this.myself = myself;

        const configured = (this.configuredContract = this.contractTemplate());
        configured.parameters = params;
        const simplify = !!isTest;
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

        const [purpose, name] = extractScriptPurposeAndName(src) || []
        return this._purpose = purpose as scriptPurpose
    }


    get address(): Address {
        return Address.fromHashes(this.compiledContract.validatorHash);
    }

    get identity() {
        if ("minting" == this.purpose) { 
            const b32 = this.compiledContract.mintingPolicyHash.toBech32()
            return b32.replace(/^asset/, "mph")
        }

        return this.address.toBech32()
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
                          outputAsString(
                              u.origOutput,
                              `    ${match ? "✅ matched " : "❌ no match"}`
                          )
                      );
                      return match;
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

    async submit(tx: Tx, { sign = true } = {}) {
        if (this.myself) {
            const [a] = await this.myself.usedAddresses;
            await tx.finalize(this.networkParams, a);
            if (sign) {
                const s = await this.myself.signTx(tx);
                tx.addSignatures(s, true);
            }
        }
        console.log("Submitting tx: ", {
            // inputs: tx.body.inputs.map(x => x.dump()),
            inputs: tx.body.inputs.map(txInputAsString),
            outputs: tx.body.outputs.map((x) => outputAsString(x)),
            // outputs: tx.body.outputs.map(x => x.dump())
        });

        return this.network.submitTx(tx);
    }


    ADA(n: bigint | number): bigint {
        return BigInt(1_000_000) * BigInt(n);
    }

    //! it requires an subclass to define a contractSource
    contractSource(): string | never {
        throw new Error(`missing contractSource impl`);
    }

    async findInputsInWallets(v: Value, searchIn: WalletsAndAddresses) {
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
                    if (
                        u.value.assets.isZero() &&
                        u.value.lovelace >= v.lovelace
                    ) {
                        return u;
                    }
                    console.log("insufficient: ", u.value.dump());
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
                const utxos = await this.network.getUtxos(a);
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
