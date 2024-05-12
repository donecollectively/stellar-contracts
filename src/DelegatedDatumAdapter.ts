import * as helios from "@hyperionbt/helios";
import { DatumAdapter  } from "./DatumAdapter.js";
import type { StellarContract, anyDatumProps } from "./StellarContract.js";

export type AnyDataTemplate<TYPENAME extends string, others extends anyDatumProps> = {
    [ key in string & ( "@id" | "tpe" | keyof others ) ]: 
        key extends "@id" ? string :  // same as the UUT-name on the data
        key extends "tpe" ? TYPENAME : // for a type-indicator on the data 
            others[key]
} // & anyDatumProps 

export interface hasAnyDataTemplate<DATA_TYPE extends string, T extends anyDatumProps> {
    data: AnyDataTemplate<DATA_TYPE, T> 
}

export abstract class DelegatedDatumAdapter<
    appType,
    OnchainBridgeType extends hasAnyDataTemplate<any, anyDatumProps>
> extends DatumAdapter<appType, OnchainBridgeType>{
    constructor(strella: StellarContract<any>) {
        super(strella)
    }
    datumName = "DelegatedData";

    /**
     * creates and returns a delegated-data object suitable for storing
     * in a Capo utxo.  The input argument should be a javascript object
     * mapping keys in YOUR delegated-data type to UplcData objects.
     * 
     * The returned value is an inline datum, suitable for direct use in a TxOutput.
     * Its content is a single-item list with an internal CIP-68-style key/value map, 
     * tagged with the ConstrData index suitable for the Capo's DelegatedDatum 
     * variant.
     * 
     * You may wish to use this.uplcString(), this.uplcint(), this.toMphUplc(), etc,
     * to convert your data to UplcData objects.
     * 
     * @param d - an object map of the UplcData (suitable for use in this.toMapData({...})) 
     */
    DelegatedData(d: DelegatedDataAttrs<OnchainBridgeType["data"]>): helios.Datum {
        const DD = this.capo.onChainDatumType.DelegatedData;
        const {constrIndex} = DD.prototype._enumVariantStatement;

        const constrData = new helios.ConstrData(constrIndex, [
            this.toMapData(
                d
            )
        ]);
        return helios.Datum.inline(
            constrData
        )
    }
}

type DelegatedDataAttrs<D extends AnyDataTemplate<any,any>> = {
    [key in "@id" | "tpe" | keyof D]: helios.UplcData
}
