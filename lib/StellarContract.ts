import {
    Address,
    Network,
    NetworkParams,
    Program,
    Tx,
    UTxO,
    UplcProgram,
    Value,
    Wallet,
} from "@hyperionbt/helios";

type WalletsAndAddresses = {
    wallets: Wallet[]
    addresses?: Address[]
}

export type StellarConstructorArgs<P> = {
    params: P;
    network: Network;
    networkParams: NetworkParams;
    isTest: boolean;
    myself?: Wallet
};
//<CT extends Program>
export class StellarContract<
    // SUB extends StellarContract<any, ParamsType>,
    ParamsType extends Record<string, any>
> {
    //! it has configuredContract: a parameterized instance of the contract
    //  ... with specific `parameters` assigned.
    configuredContract: Program;
    compiledContract: UplcProgram;
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
    }: StellarConstructorArgs<ParamsType>) {
        this.network = network
        this.networkParams = networkParams;
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
        return this.configuredContract.types.Datum
    }
    async submit(tx: Tx, {sign=true} = {}) {        
        if (this.myself) {
            const [a] = await this.myself.usedAddresses;        
            await tx.finalize(this.networkParams, a);
            if (sign) {
                const s = await this.myself.signTx(tx);
                tx.addSignatures(s, true)
            }
        }
        return this.network.submitTx(tx)
    }

    ADA(n: bigint | number): bigint {
        return BigInt(1_000_000) * BigInt(n);
    }

    get address(): Address {
        return Address.fromHashes(this.compiledContract.validatorHash);
    }
    //! it requires an subclass to define a contractSource
    contractSource(): string | never {
        throw new Error(`missing contractSource impl`);
    }

    async findInputsInWallets(v: Value, searchIn: WalletsAndAddresses) {
        const {wallets, addresses} = searchIn;

        const lovelaceOnly = v.assets.isZero();
        console.warn("finding inputs",{
            lovelaceOnly
        });

        for (const w of wallets) {
            const [a] = await w.usedAddresses;
            console.log("finding funds in wallet", a.toBech32())
            const utxos = await w.utxos;
            for (const u of utxos) {
                if (lovelaceOnly) {
                    if (
                        u.value.assets.isZero() &&
                        u.value.lovelace >= v.lovelace
                    ) {
                        return u;
                    }
                    console.log("insufficient: ", u.value.dump())
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
                const utxos = await this.network.getUtxos(a)
                for (const u of utxos) {
                    if (u.value.ge(v)) {
                        return u
                    }
                }
            }
        }
        
        throw new Error(`None of these wallets${
            (addresses && " or addresses") || ""
        } have the needed tokens`)
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
        // console.log({src, Program})
        return (this._template = this._template || Program.new(src));
    }
}
