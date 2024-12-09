import type { StellarContract, anyDatumProps } from "../StellarContract.js";
import type { UplcData } from "@helios-lang/uplc";
import type { ContractBasedDelegate } from "./ContractBasedDelegate.js";
import type { T } from "vitest/dist/chunks/environment.C5eAp3K6.js";

/**
 * @public
 */
export type AnyDataTemplate<TYPENAME extends string, others extends anyDatumProps> = {
    [ key in string & ( "id" | "type" | keyof Omit<others, "id"> ) ]: 
        key extends "id" ? string :  // same as the UUT-name on the data
        key extends "type" ? TYPENAME : // for a type-indicator on the data 
            others[key]
} // & anyDatumProps 

export type minimalData<
    T extends AnyDataTemplate<any, anyDatumProps>
> = Omit<T, "id" | "type">

/**
 * @public
 */
export interface hasAnyDataTemplate<DATA_TYPE extends string, T extends anyDatumProps> {
    data: AnyDataTemplate<DATA_TYPE, T> 
}

// example html-embedded NFT data
// see https://cardanoscan.io/transaction/d3ff356f16db37e58e656da7ed7a4012f56715104e9a5802f21563fe0e349567?tab=metadata
// and https://pool.pm/adc5716393953403109c335e68c0384238fd19653e960e03afa1fb1f.TheRefresh05517
// data:text/html;base64,PCFET0NUWVBFIEhUTUw+DQogICAgPGh0bWw+DQogIC
// AgPGhlYWQ+DQogICAgICA8c3R5bGU+DQogICAgICAgIGJvZHkgIHtvdmVyZmxvdz
// poaWRkZW47fQ0KICAgICAgICA8L3N0eWxlPg0KICAgICAgPC9oZWFkPg0KICAgIC
// AgICA8Ym9keT4NCiAgPGRpdiBzdHlsZT0idGV4dC1hbGlnbjpjZW50ZXIiPiAgID
// xjYW52YXMgaWQ9Im15Q2FudmFzIiBzdHlsZT0ib2JqZWN0LWZpdDogY29udGFpbi
// I+PC9jYW52YXM+IDwvZGl2Pg0KDQogICAgPHNjcmlwdCB0eXBlPSJ0ZXh0L2phdm
// FzY3JpcHQiPg0KICAgICAgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SW
// QoJ215Q2FudmFzJyk7DQogICAgICBjYW52YXMud2lkdGggPTU1MDsNCiAgICAgIG
// NhbnZhcy5oZWlnaHQgPSA1NTA7DQogICAgICBjYW52YXMuc3R5bGUud2lkdGggPS
// AnMTAwdncnOw0KICAgICAgY2FudmFzLnN0eWxlLmhlaWdodCA9ICcxMDB2aCc7DQ
// ogICAgICBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5zY2FsZSgyLDIpOw0KDQoNCi
// AgICAgICAgdmFyIGMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgibXlDYW52YX
// MiKTsNCiAgICAgICAgdmFyIGN0eCA9IGMuZ2V0Q29udGV4dCgiMmQiKTsNCiAgIC
// AgICAgdmFyIGdyZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCBNYX
// RoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA1NTApLCBNYXRoLmZsb29yKE1hdGgucm
// FuZG9tKCkgKiA1NTApKTsNCmdyZC5hZGRDb2xvclN0b3AoTWF0aC5yYW5kb20oKS
// wgIiMwMGE1Y2IiKTsNCmdyZC5hZGRDb2xvclN0b3AoTWF0aC5yYW5kb20oKSwgIi
// NmZTNlYTUiKTsNCmdyZC5hZGRDb2xvclN0b3AoTWF0aC5yYW5kb20oKSwgIiNlZW
// ZmMDEiKTsNCg0KDQpjdHguZmlsbFN0eWxlID0gZ3JkOw0KY3R4LmZpbGxSZWN0KD
// AsIDAsIDU1MCwgNTUwKTsNCg0KDQoNCiAgICAgICAgdmFyIGM9ZG9jdW1lbnQuZ2
// V0RWxlbWVudEJ5SWQoIm15Q2FudmFzIik7DQogICAgICAgIHZhciBjeHQ9Yy5nZX
// RDb250ZXh0KCIyZCIpOw0KICAgICAgICB2YXIgY2VudGVyWCA9IE1hdGguZmxvb3
// IoTWF0aC5yYW5kb20oKSAqIDIwMCk7DQogICAgICAgIHZhciBjZW50ZXJZID0gTW
// F0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMzUwKTsNCiAgICAgICAgY3h0Lm1vdm
// VUbyhjZW50ZXJYLCBjZW50ZXJZKTsNCg0KDQogICAgICAgIHZhciBnYXAgPSBNYX
// RoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxKSArIC4wMDU7IC8vIGluY3JlYXNlIH
// RoaXMgZm9yIHNwYWNpbmcgYmV0d2VlbiBzcGlyYWwgbGluZXMgYWxzbyBiaWdnZX
// Igc21hbGxlcg0KICAgICAgICB2YXIgU1RFUFNfUEVSX1JPVEFUSU9OID0gTWF0aC
// 5mbG9vcihNYXRoLnJhbmRvbSgpICogNTAwKSArIDE7IC8vIGluY3JlYXNpbmcgdG
// hpcyBtYWtlcyB0aGUgY3VydmUgc21vb3RoZXINCg0KICAgICAgICB2YXIgaW5jcm
// VtZW50ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNDAwKSArIC4wMSpNYX
// RoLlBJL1NURVBTX1BFUl9ST1RBVElPTjsvL2xvd2VyPWRhcmtlcg0KICAgICAgIC
// B2YXIgdGhldGEgPSBpbmNyZW1lbnQ7DQogICAgICAgIHdoaWxlKCB0aGV0YSA8IE
// 1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDE1MCkgKyAzNTAwMCkgey8vYmlnZ2
// VyIG9yIHNtYWxsZXINCiAgICAgICAgICAgdmFyIG5ld1ggPSBjZW50ZXJYICsgdG
// hldGEgKiBNYXRoLmNvcyh0aGV0YSkgKiBnYXA7DQogICAgICAgICAgIHZhciBuZX
// dZID0gY2VudGVyWSArIHRoZXRhICogTWF0aC5zaW4odGhldGEpICogZ2FwOw0KIC
// AgICAgICAgICBjeHQubGluZVRvKG5ld1gsIG5ld1kpOw0KICAgICAgICAgICB0aG
// V0YSA9IHRoZXRhICsgaW5jcmVtZW50Ow0KICAgICAgICAgICAgICAgIH0NCiAgIC
// AgICAgY3R4LnN0cm9rZVN0eWxlID0gIiMwMDAwMDAiOw0KICAgICAgICBjdHgubG
// luZVdpZHRoID0gLjU7DQogICAgICAgIGN0eC5zdHJva2UoKTsgLy8gZHJhdw0KDQ
// oNCiAgICA8L3NjcmlwdD4NCiAgICAgICAgPC9ib2R5Pg0KICAgICAgICAgICAgPC
// 9odG1sPg==


type DelegatedDataAttrs<D extends AnyDataTemplate<any,any>> = {
    [key in "@id" | "tpe" | keyof D /*Omit<D, "id" >*/ ]: UplcData
}
