import {
    Address,
    Program,
    Tx,
    UplcProgram,
    TxOutput,
    Value,
    Datum,
    Wallet,
    UTxO,
    DatumHash,
    ByteArray,
    Assets,
    TxId,
} from "@hyperionbt/helios";

import {
    StellarConstructorArgs,
    StellarContract,
    StellarTxnContext,
    utxoAsString,
    utxosAsString,
} from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityTreasury.hl";
import { CommunityCoinFactory } from "./CommunityCoinFactory.js";

export type CtParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

type CtConstellation = Record<string, typeof StellarContract<any>>;

// type paramsFuncForStar<
//     S2 extends StellarContract<any>
// > = () => S2 extends StellarContract<infer P> ? Promise<P> : never

type paramsForStar<S2 extends StellarContract<any>> =
    S2 extends StellarContract<infer P> ? P : never;

export type CharterDatumArgs = { trustees: Address[]; minSigs: number | bigint };

export class CommunityTreasury extends StellarContract<CtParams> {
    contractSource() {
        return contract;
    }

    minter?: CommunityCoinFactory;
    mkMintingScript(): CommunityCoinFactory {
        if (this.minter) return this.minter;
        const { seedTxn, seedIndex } = this.paramsIn;

        // const charterToken = (await this.findDatum((u : UTxO) => {
        //     return this.isCharterToken(u)
        // }))[0];
        // const seedUtxo = charterToken ? null : (await this.findDatum(this.charterSeedDatum))[0];
        // if (!charterToken && !seedUtxo) throw new Error(`seed or charter utxo is present in ${this.address.toBech32()}`)
        // const seedTxn = seedUtxo?.txId || charterToken.origOutput.datum

        return (this.minter = this.addScriptWithParams(CommunityCoinFactory, {
            seedTxn,
            seedIndex,
        }));
    }

    isCharterToken(u: UTxO) {
        debugger;
        return false;
    }

    get mph() {
        const minter = this.mkMintingScript();
        return minter.mintingPolicyHash;
    }

    mkContractParams(params: CtParams) {
        const {mph} = this
        console.log("this treasury uses mph", mph?.hex);
        
        return {
            mph,
        };
    }

    mkCharterTokenDatum({
        trustees,
        minSigs,
    }: {
        trustees: Address[];
        minSigs: bigint;
    }) {
        const t = new this.configuredContract.types.Datum.CharterToken(
            trustees,
            minSigs
        );
        return t._toUplcData();
    }

    mkDependencyStars() {
        return {};
    }

    async XXtxMintCharterToken(
        tcx: StellarTxnContext = new StellarTxnContext()
    ) {
        //! EXPECTS myself to be set
        if (!this.myself)
            throw new Error(
                `missing required 'myself' attribute on ${this.constructor.name}`
            );

        const [addr] = await this.myself.usedAddresses;
        const utxos = await this.network.getUtxos(addr);
        const { seedTxn, seedIndex } = this.paramsIn;

        const seedUtxo = utxos.find(
            (u) => u.txId == seedTxn && BigInt(u.utxoIdx) == seedIndex
        );
        if (!seedUtxo)
            throw new Error(
                `seed utxo not found / already spent: ${seedTxn.hex}@${seedIndex}`
            );

        //! deposits one ADA into the contract for use with the CoinFactory charter.
        //! deposits the minimum
        const txValue = new Value(this.ADA(1));

        const output = new TxOutput(
            this.address,
            txValue,
            Datum.inline(this.mkCharterTokenDatum({}).data)
        );

        // prettier-ignore
        tcx.addOutput(output)
            .addInput(seedUtxo)

        return tcx;
    }
    stringToNumberArray(str: string) : number[] {
        let encoder = new TextEncoder();
        let byteArray = encoder.encode(str);
        return [...byteArray].map(x => parseInt(x.toString()))
    }
    get charterTokenAsValuesEntry() : [number[], bigint]{
        return [this.stringToNumberArray("charter"), BigInt(1)]
    }
    get charterTokenAsValue() {
        const minter = this.mkMintingScript();

        return new Value(
            this.ADA(1.7),
            new Assets([
                [minter.compiledContract.mintingPolicyHash, [
                    this.charterTokenAsValuesEntry
                ]],
            ])
        );
    }

    async getSeedUtxo() : Promise<UTxO> {
        //! EXPECTS myself to be set
        if (!this.myself)
            throw new Error(
                `missing required 'myself' attribute on ${this.constructor.name}`
            );

        const [addr] = await this.myself.usedAddresses;
        const utxos = await this.network.getUtxos(addr);
        const { seedTxn, seedIndex } = this.paramsIn;
        console.log("utxos held by actor (\"myself\"): ", utxosAsString(utxos))

        const seedUtxo = utxos.find(
            (u) => {
                const {txId, utxoIdx} = u;
                const t = (txId.eq(seedTxn) && BigInt(utxoIdx) == seedIndex)
                return t;
            }
        );
        if (!seedUtxo)
            throw new Error(
                `seed utxo not found / already spent: ${seedTxn.hex}@${seedIndex}`
            );

            return seedUtxo
    }

    async txMintCharterToken(
        { trustees, minSigs }: CharterDatumArgs,
        tcx: StellarTxnContext = new StellarTxnContext()
    ) {
        let seedUtxo;
        try {
            seedUtxo = await this.getSeedUtxo()
        } catch(e) {
            throw(e);
        }

        const v= this.charterTokenAsValue
       // this.charterTokenDatum
        const datum = this.mkCharterTokenDatum({
            trustees,
            minSigs: BigInt(minSigs),
        })

        const outputs = [
            new TxOutput(
                this.address,
                v,
                Datum.inline(datum)
                // Datum.inline(new this.datumType.CharterToken([42]))
                // seed.
            ),
        ];

        // debugger
        tcx.addInput(seedUtxo).addOutputs(outputs).mintTokens(
            this.mph!,
            [
                this.charterTokenAsValuesEntry   
            ], 
            this.minter!.mkCharterRedeemer({treasury: this.address})
        ).attachScript(this.minter!.compiledContract)
        return tcx;
    }

    requirements() {
        return {
            "positively governs all administrative actions": {
                purpose: "to maintain clear control by a trustee group",
                details: [
                    // descriptive details of the requirement (not the tech):
                    "a trustee group is defined during contract creation",
                    "the trustee list's signatures provide consent",
                    "the trustee group can evolve by consent of the trustee group",
                    "a threshold set of the trustee group can give consent for the whole group",
                ],
                mech: [
                    // descriptive details of the chosen mechanisms for implementing the reqts:
                    "uses a 'charter' token specialized for this contract",
                    "the charter token has a trustee list in its Datum structure",
                    "the charter token has a threshold setting in its Datum structure",
                    "the charter Datum is updated when needed to reflect new trustees/thresholds",
                ],
                requires: [
                    "has a unique, permanent charter token",
                    "has a unique, permanent treasury address",
                    "the trustee threshold is enforced on all administrative actions",
                    "the trustee group can be changed",
                    "the charter token is always kept in the contract",
                    "minting is gated on use of the Charter token",
                ],
            },

            "has a singleton minting policy": {
                purpose: "to mint various tokens authorized by the treasury",
                details: [
                    "A chosen minting script is bound deterministically to the contract constellation",
                    "Its inaugural (aka 'initial Charter' or 'Charter Mint') transaction creates a charter token",
                    "The minting script can issue further tokens approved by Treasury Trustees",
                    "The minting script does not need to concern itself with details of Treasury Trustee approval",
                ],
                mech: [
                    "has an initial UTxO chosen arbitrarily, and that UTxO is consumed during initial Charter",
                    "makes a different address depending on (txId, outputIndex) parameters of the Minting script",
                ],
                requires: [],
            },

            "has a unique, permanent treasury address": {
                purpose: "to give continuity for its stakeholders",
                details: [
                    "One-time creation is ensured by UTxO's unique-spendability property",
                    "Determinism is transferred from the charter utxo to the MPH and to the treasury address",
                ],
                mech: [
                    "uses the Minting Policy Hash as the sole parameter for the treasury spending script",
                ],
                requires: ["has a singleton minting policy"],
            },

            "has a unique, permanent charter token": {
                purpose:
                    "to guarantee permanent identity of a token constraining administrative actions",
                details: [
                    "a charter token is uniquely created when bootstrapping the constellation contract",
                    "the charter token can't ever be recreated (it's non-fungible and can't be re-minted)",
                    "the treasury address, minting policy hash, and charter token are all deterministic based on input utxo",
                ],
                impl: "txMintCharterToken()",
                mech: [
                    "creates a unique 'charter' token, with assetId determined from minting-policy-hash+'charter'",
                    "doesn't work with a different spent utxo",
                ],
                requires: [
                    "has a singleton minting policy",
                    "the charter token is always kept in the contract",
                ],
            },

            "the charter token is always kept in the contract": {
                purpose:
                    "so that the treasury contract is always in control of administrative changes",
                details: [
                    "The charter token being allowed to spend is used as a signal of administrative authority transactions wanting proof of authority",
                    "Thus, those transactions don't need to express the authority policy, but can simply verify the token's presence in the txn",
                    "Those other transactions also don't need to express the return of the Charter token to the contract, because that's enforced universally by the treasury script",
                    "By enforcing that the charter token is always returned to the contract, it has assurance of continuing ability to govern the next activity using that token",
                    "It shouldn't ever be possible to interfere with its spendability, e.g. by bundling it in an inconvenient way with other assets",
                ],
                mech: [
                    "TODO: Every spend of any utility- or value-bearing assets in the contract also moves the Charter token to a new utxo in the contract",
                    "TODO: The charter is always kept separate from other assets held in the contract",
                ],
                requires: [],
            },

            "minting is gated on use of the Charter token": {
                purpose:
                    "to simplify the logic of minting, while being sure of minting authority",
                details: [
                    "the minting policy doesn't have to directly enforce the trustee-list policy",
                    "instead, it delegates that to the treasury spending script, ",
                    "... and simply requires that the charter token is used for minting anything else",
                ],
                mech: [
                    "TODO: requires the charter-token to be spent on all non-Charter minting",
                ],
                requires: [],
            },

            "the trustee group can be changed": {
                purpose: "to ensure administrative continuity for the group",
                details: [
                    "When the needed threshold for administrative modifications is achieved, the Charter Datum can be updated",
                    "This type of administrative action should be explicit and separate from any other administrative activity",
                ],
                mech: [
                    "TODO: If the CharterToken's Datum hash is being changed, no other tx inputs/outputs are allowed",
                    "TODO: The charter setting changes are approved based on same threshold as any other administrative change",
                ],
                requires: [
                    "the trustee threshold is enforced on all administrative actions",
                ],
            },

            "the trustee threshold is enforced on all administrative actions": {
                purpose:
                    "allows progress in case a small fraction of trustees may not be available",
                details: [
                    "A group can indicate how many of the trustees are required to provide their explicit approval",
                    "If a small number of trustees lose their keys, this allows the remaining trustees to directly regroup",
                    "For example, they can replace the trustee list with a new set of trustees and a new approval threshold",
                    "Normal day-to-day administrative activities can also be conducted while a small number of trustees are on vacation or otherwise temporarily unavailable",
                ],
                mech: [
                    "TODO: a minSigs setting is included in the CharterToken datum",
                    "TODO: any transaction that spends the CharterToken is deined if it lacks at least 'minSigs' number of trustee signatures",
                ],
                requires: [],
            },

            foo: {
                purpose: "",
                details: [],
                mech: [],
                requires: [],
            },
        };
    }
}
