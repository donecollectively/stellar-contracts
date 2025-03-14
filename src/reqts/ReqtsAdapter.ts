// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
// This file is not needed.  The only
// reason for an adapter is if the app
// needs to do something special with the
// data (i.e. represented it as a class) -
// in which case we can simply instantiate
// that class based on the data-type, with
// an expectation that it can then be
// converted to on-chain format at need.
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

// type onChainReqtRepresentation = {
//     data: BridgeReqtData;
// };
// type T = UplcFor<onChainReqtData>


// export type BridgeReqtData = hasAnyDataTemplate<"reqt", {
//     tgt: string,
//     tpe: string,
//     exp: Numeric<"Time">,

//     prps: string,
//     dtls: string[],
//     mech: string[],
//     impl: string,
// }>;

export type ReqtData = {
    id: string; // "@id"
    type: string,
    mustFreshenBy: Date,  // "exp"
    target: string;   // "tgt"  // id of the object meeting the requirements
    purpose: string; // "prps"
    details: string[];  // "dtls"
    mech: string[];  // "mech"
    impl: string; //  "impl"  //  todo: constrained to method names of the object meeting the requirements
};

// export class ReqtsAdapter extends DelegatedDatumAdapter<
//     ReqtData,
//     BridgeReqtData
// > {
//     // datumName = "DelegatedData";
//     // async initDelegate() {
//     //     return this.capo.getListenerDelegate();
//     // }
//     fromOnchainDatum(parsedDatum: adapterParsedOnchainData<BridgeReqtData, "Reqt">): ReqtData {
//         console.log("parsedDatum", parsedDatum);
        
//         const { data } = parsedDatum;
//         // XXX there's no super class right now
//         // const inheritedData = super.fromOnchainDatum(parsedDatum);

//         const str = this.fromUplcString;
//         const real = this.fromUplcReal;

//         if (str(data.tpe) != "reqt") {
//             throw new Error(
//                 "Invalid type data from on-chain format; expected reqt- type"
//             );
//         }

//         const { RoyaltyOwnerType } = this.onChainTypes;
//         const reqt = {
//             id: str(data["@id"]),
//             type: str(data.tpe),
//             mustFreshenBy: new Date(Number(data.exp)),            
//             target: str(data.tgt),
//             purpose: str(data.prps),
//             details: data.dtls.map(str),
//             mech: data.mech.map(str),
//             impl: str(data.impl || ""),

//         } as ReqtData;
//         return reqt;
//     }

//     async toOnchainDatum(d: ReqtData & { id: string }) {
//         const DatumClass = this.onChainDatumType[this.datumName];
//         const {
//             ReqtData,
//         } = this.onChainTypes;

//         debugger
//         return this.DelegatedData({
//             "@id": new helios.ByteArrayData(helios.textToBytes(d.id)),
//             tpe: this.uplcString("reqt"),
//             exp: this.uplcInt(d.mustFreshenBy.getTime()),

//             tgt: this.uplcString(d.target),
//             prps: this.uplcString(d.purpose),
//             dtls: new ListData(d.details.map(x => this.uplcString(x))),
//             mech: new ListData(d.mech.map(x => this.uplcString(x))),
//             impl: this.uplcString(d.impl),
//         });
//     }

// }
