import {
    Address,
    NetworkEmulator,
    NetworkParams,
    Program,
    UplcProgram,
    WalletEmulator,
} from "@hyperionbt/helios";

import { StellarContract } from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityTreasury.hl";

type CCTParams = {
    nonce: Uint8Array,
    trustees: Address[]
}
export class CommunityTreasury extends StellarContract<CommunityTreasury, CCTParams> {
    contractSource() { return contract }

}