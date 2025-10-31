export declare const maxUutName = 32;
/**
 * a unique utility token having a unique name
 * @remarks
 *
 * This class contains a general 'purpose' name, mapped to a unique
 * `name`, which is generated using a seed-utxo pattern.
 *
 * @public
 **/
export declare class UutName {
    _uutName: string;
    purpose: string;
    constructor(purpose: string, fullUutName: string | number[]);
    /**
     * the full uniquified name of this UUT
     * @remarks
     *
     * format: `purpose-‹...uniqifier...›`
     * @public
     **/
    get name(): string;
    toString(): string;
}
//# sourceMappingURL=UutName.d.ts.map