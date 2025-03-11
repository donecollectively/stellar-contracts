import { makeTxChainBuilder, type TxChainBuilder } from "@helios-lang/tx-utils";
import type { SetupInfo } from "../StellarContract.js";
import {
    BatchSubmitController,
    type namedSubmitters,
} from "./BatchSubmitController.js";
import { EventEmitter } from "eventemitter3";
import type { WalletSigningStrategy } from "./WalletSigningStrategy.js";

type TxBatcherChanges = {
    rotated: [BatchSubmitController];
};

export type TxBatcherOptions = {
    submitters: namedSubmitters;
    setup?: SetupInfo;
    signingStrategy?: WalletSigningStrategy;
};

/**
 * @public
 */
export class TxBatcher {
    previous?: BatchSubmitController;
    _current?: BatchSubmitController;
    signingStrategy?: WalletSigningStrategy;
    submitters: namedSubmitters;
    setup?: SetupInfo;
    $notifier = new EventEmitter<TxBatcherChanges>();

    constructor(options: TxBatcherOptions) {
        const { signingStrategy, submitters, setup } = options;
        this.submitters = submitters;
        this.signingStrategy = signingStrategy;
        this.setup = setup;

        // this.previous = new SubmitterMultiClient(submitters, setup);
        // this.current = new SubmitterMultiClient(submitters, setup);
    }

    get current() {
        if (!this.setup) {
            throw new Error(
                `Finish initializing txBatcher by assigning txBatcher.setup = <setup from a StellarContracts class or StellarTxnContext>`
            );
        }
        if (!this.signingStrategy) {
            throw new Error(
                `Finish initializing txBatcher by assigning txBatcher.signingStrategy = <a WalletSigningStrategy>`
            );
        }

        if (!this._current) {
            if (this.setup.chainBuilder) {
                throw new Error(
                    `surprise! txBatcher's setup wasn't expected to have a chainBuilder yet (was it not cleaned up from an earlier batch?)`
                );
                // maybe it's okay - TBD if the error ever occurs.
            }
            const chainBuilder = this.setup.isTest ? undefined : makeTxChainBuilder(this.setup.network);
            this.setup.chainBuilder = chainBuilder
            this._current = new BatchSubmitController({
                submitters: this.submitters,
                setup: this.setup,
                signingStrategy: this.signingStrategy,
            });
            this.$notifier.emit("rotated", this._current);
        }
        return this._current;
    }
    canRotate() {
        const mostCurrent = this.previous || this._current;
        if (!mostCurrent) return true;

        const { $stateShortSummary } = mostCurrent;

        if (
            "failed" == $stateShortSummary ||
            "confirmed" == $stateShortSummary
        ) {
            return true;
        }
        return false;
    }

    rotate(chainBuilder?: TxChainBuilder) {
        if (!this.setup) {
            throw new Error(`setup not set`);
        }
        if (!this.signingStrategy) {
            throw new Error(`signingStrategy not set`);
        }
        if (!this.canRotate()) {
            throw new Error(`must verify canRotate() before rotating`);
        }
        this.previous?.destroy();
        this.previous = this.current;

        this._current = new BatchSubmitController({
            submitters: this.submitters,
            setup: {
                ...this.setup,
                chainBuilder,
            },
            signingStrategy: this.signingStrategy,
        });
        this.$notifier.emit("rotated", this._current);
    }
}
