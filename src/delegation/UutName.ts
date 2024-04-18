import { TxId, bytesToText } from "@hyperionbt/helios";

export const _uutName = Symbol("uutName");
export const maxUutName = 32;

export type SeedAttrs = {
    txId: TxId,
    idx: bigint,
}

/**
 * a unique utility token having a unique name
 * @remarks
 *
 * This class contains a general 'purpose' name, mapped to a unique
 * `name`, which is generated using a seed-utxo pattern.
 *
 * @public
 **/
export class UutName {
    private [_uutName]: string;
    purpose: string;
    constructor(purpose: string, fullUutName: string | number[]) {
        this.purpose = purpose;
        if (Array.isArray(fullUutName)) {
            fullUutName = bytesToText(fullUutName);
        }
        if (fullUutName.length > maxUutName) {
            throw new Error(
                `uut name '${fullUutName}' exceeds max length of ${maxUutName}`
            );
        }
        this[_uutName] = fullUutName;
    }
    /**
     * the full uniquified name of this UUT
     * @remarks
     *
     * format: `purpose-‹...uniqifier...›`
     * @public
     **/
    get name() {
        return this[_uutName];
    }
    toString() {
        return this[_uutName];
    }
}
