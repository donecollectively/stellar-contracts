import { type TxChainBuilder } from "@helios-lang/tx-utils";
import type { SetupInfo } from "../StellarContract.js";
import { BatchSubmitController, type namedSubmitters } from "./BatchSubmitController.js";
import { EventEmitter } from "eventemitter3";
import type { WalletSigningStrategy } from "./WalletSigningStrategy.js";
/**
 * @public
 */
type TxBatcherChanges = {
    rotated: [BatchSubmitController];
};
/**
 * @public
 */
export type TxBatcherOptions = {
    submitters: namedSubmitters;
    setup?: SetupInfo;
    signingStrategy?: WalletSigningStrategy;
};
/**
 * @public
 */
export declare class TxBatcher {
    previous?: BatchSubmitController;
    _current?: BatchSubmitController;
    signingStrategy?: WalletSigningStrategy;
    submitters: namedSubmitters;
    setup?: SetupInfo;
    $notifier: EventEmitter<TxBatcherChanges, any>;
    constructor(options: TxBatcherOptions);
    get current(): BatchSubmitController;
    canRotate(): boolean;
    rotate(chainBuilder?: TxChainBuilder): void;
}
export {};
//# sourceMappingURL=TxBatcher.d.ts.map