import * as helios from "@hyperionbt/helios";
import { DatumAdapter, type AnyDataTemplate } from "./DatumAdapter.js";
import type { StellarContract } from "./StellarContract.js";

export abstract class DelegatedDatumAdapter<
    appType,
    OnchainBridgeType extends {data: OBD & AnyDataTemplate<any>},
    contractType extends StellarContract<any>,
    OBD extends AnyDataTemplate<any> = OnchainBridgeType["data"]
> extends DatumAdapter<appType, OnchainBridgeType, contractType>{
    constructor(strella: contractType) {
        super(strella)
    }

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
    DelegatedData(d: DelegatedDataAttrs<OBD, OnchainBridgeType>): helios.Datum {
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

type DelegatedDataAttrs<D extends AnyDataTemplate<any>, T extends {data: D}> = {
    "@id": helios.ByteArrayData,
    "tpe": helios.ByteArrayData,
} & {
    [key in keyof D]: helios.UplcData
}
