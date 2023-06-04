import { Program } from "@hyperionbt/helios";
import { StellarContract } from "../lib/StellarContract.js";

//@ts-expect-error
import contract from "./CommunityCoin.hl";

export class CommunityCoin extends StellarContract {
    contractSource() { return contract }
} 