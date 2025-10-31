import { type InteractionContext, type ConnectionConfig } from "@cardano-ogmios/client";
import { type TxId, type Tx, type TxOutputId } from "@helios-lang/ledger";
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
export declare function makeOgmiosConnection(conn: simpleOgmiosConn): Promise<{
    submitter: import("@cardano-ogmios/client/dist/TransactionSubmission").TransactionSubmissionClient;
    ledgerState: import("@cardano-ogmios/client/dist/LedgerStateQuery").LedgerStateQueryClient;
    context: InteractionContext;
}>;
type OgmiosClients = Awaited<ReturnType<typeof makeOgmiosConnection>>;
/**
 * @public
 */
export declare class OgmiosTxSubmitter implements CardanoTxSubmitter {
    static withOgmiosConn(isMainnet: boolean, conn: simpleOgmiosConn): Promise<OgmiosTxSubmitter>;
    mainnet: boolean;
    ogmios: OgmiosClients;
    constructor(isMainnet: boolean, conn: OgmiosClients);
    get stateQuery(): import("@cardano-ogmios/client/dist/LedgerStateQuery").LedgerStateQueryClient;
    get submitter(): import("@cardano-ogmios/client/dist/TransactionSubmission").TransactionSubmissionClient;
    isMainnet(): boolean;
    hasUtxo(txoId: TxOutputId): Promise<boolean>;
    submitTx(tx: Tx): Promise<TxId>;
    isUnknownUtxoError(e: Error): boolean;
    isSubmissionExpiryError(e: Error): boolean;
}
export {};
//# sourceMappingURL=OgmiosTxSubmitter.d.ts.map