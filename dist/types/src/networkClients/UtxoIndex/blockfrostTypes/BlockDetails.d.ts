export interface BlockDetailsType {
    time: number;
    height: number;
    hash: string;
    slot: number;
    epoch: number;
    epoch_slot: number;
    slot_leader: string;
    size: number;
    tx_count: number;
    output: string | null;
    fees: string | null;
    block_vrf: string | null;
    op_cert: string | null;
    op_cert_counter: string | null;
    previous_block: string | null;
    next_block: string | null;
    confirmations: number;
}
//# sourceMappingURL=BlockDetails.d.ts.map