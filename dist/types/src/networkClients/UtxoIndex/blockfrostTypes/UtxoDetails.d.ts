export interface UtxoDetailsType {
    address: string;
    tx_hash: string;
    tx_index: number;
    output_index: number;
    amount: Array<{
        unit: string;
        quantity: number;
    }>;
    block: string;
    data_hash: string | null;
    inline_datum: string | null;
    reference_script_hash: string | null;
}
export declare function validateUtxoDetails(data: unknown): UtxoDetailsType;
//# sourceMappingURL=UtxoDetails.d.ts.map