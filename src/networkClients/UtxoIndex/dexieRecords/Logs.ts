import { Entity } from "dexie";
import type { DexieUtxoStore } from "../DexieUtxoStore.js";
import { type } from "arktype";
import { jsonSchemaToType } from "@ark/json-schema";
import type { BlockDetailsType } from "../blockfrostTypes/BlockDetails.js";

export type LogType = {
    logId: string;
    pid: number;
    time: number;
    location: string;
    message: string;    
}

export class indexerLogs
    extends Entity<DexieUtxoStore>
    implements LogType
{
    logId!: LogType["logId"];
    pid!: LogType["pid"];
    time!: LogType["time"];
    location!: LogType["location"];
    message!: LogType["message"];
}
