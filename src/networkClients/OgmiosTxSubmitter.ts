
import {
    createInteractionContext,
    type InteractionContext,
    createLedgerStateQueryClient,
    createChainSynchronizationClient,
    isBlockEBB,
    type ConnectionConfig,
    createTransactionSubmissionClient
} from "@cardano-ogmios/client";
import { bytesToHex } from "@helios-lang/codec-utils";
import { type TxId, type Tx, type TxOutputId, makeTxId } from "@helios-lang/ledger";
import type { CardanoTxSubmitter } from "@helios-lang/tx-utils";

/**
 * allows the samed detailed configuration used by the Ogmios typescript client,
 * or a simple http[s] url string.
 * @remarks
 * With a string argument, the websocket URL is constructed from the provided http[s] URL.
 * @public
 */
export type simpleOgmiosConn = ConnectionConfig | string;

/**
 * creates ogmios connections for ledger-state and tx submission
 * @remarks
 * The connection string can be a simple http[s] url e.g. from TxPipe's ogmios service
 * (use their Authenticated Endpoint URL)
 * @public
 */
export async function makeOgmiosConnection(conn: simpleOgmiosConn) {
    const connection: ConnectionConfig =
        typeof conn === "string"
            ? {
                  address: {
                      http: conn,
                      webSocket: conn.replace(/^http(s)?:\/\//, "ws$1://"),
                  },
              }
            : conn;

    const context = await createInteractionContext(
        (err) => console.error(err),
        () => console.log("Connection closed"),
        {
            connection,
        }
    );

    return {
        submitter: await createTransactionSubmissionClient(context),
        ledgerState: await createLedgerStateQueryClient(context),
        context
    }
}
type OgmiosClients = Awaited<ReturnType<typeof makeOgmiosConnection>>

export class OgmiosTxSubmitter implements CardanoTxSubmitter {
    static async withOgmiosConn(isMainnet: boolean, conn: simpleOgmiosConn) {
        const ogmios = await makeOgmiosConnection(conn);
        return new this(isMainnet, ogmios);
    }

    mainnet: boolean;
    ogmios: OgmiosClients;
    constructor(isMainnet: boolean, conn: OgmiosClients) {
        this.mainnet = isMainnet;
        this.ogmios = conn;
    }
    get stateQuery() {
        return this.ogmios.ledgerState;
    }
    get submitter() {
        return this.ogmios.submitter;
    }

    isMainnet() {
        return this.mainnet;
    }

    async hasUtxo(txoId: TxOutputId) : Promise<boolean> {
        type utxoResult = {
            transaction: {id: string}, index: number, address: string, 
            value: any
        };

        try {
            const result :  utxoResult[] = await this.stateQuery.utxo({
                outputReferences: [{ 
                    transaction: { 
                        id: txoId.txId.toString()
                    }, 
                    index: txoId.index }],
            })
            for (const {
                transaction: {id: txIdString}, index, address, value
            } of result ) {
                if (txIdString === txoId.txId.toString() && index === txoId.index) {
                    return true;
                }
            }
            return false;
        } catch(e) {
            const {message, stack, otherDetails} = e as any
            console.error("ogmios client: getUtxo failed:", {
                message, 
                ... otherDetails
            })
            return false
        }
    }

    async submitTx(tx: Tx): Promise<TxId> {
        try {
            const result = await this.submitter.submitTransaction(
                bytesToHex(tx.toCbor())
            );

            return makeTxId(result)
        } catch (e) {
            console.error("ogmios client: submitTx failed:", e)
            throw e;
        }
    }

    isUnknownUtxoError(e: Error) : boolean {
        debugger

        return false
    }

    isSubmissionExpiryError(e: Error): boolean {
        debugger

        return false
    }

// ledgerStateQuery: 
//  utxo(context, txoutputref[])

// https://ogmios.dev/typescript/api/interfaces/_cardano_ogmios_client.Schema.TransactionOutputReference.html
//
// TransactionOutputReference: {
//  index: number
//  transaction: {
//      id: string
//  }
// }

}
