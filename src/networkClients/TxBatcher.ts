import { SubmitterMultiClient, type namedSubmitters } from "./SubmitterMultiClient.js";

export class TxBatcher {
    previous: SubmitterMultiClient
    current: SubmitterMultiClient
    submitters: namedSubmitters

    constructor(submitters: namedSubmitters) {
        this.submitters = submitters;
        this.previous = new SubmitterMultiClient(submitters);
        this.current = new SubmitterMultiClient(submitters);
    }

    canRotate() {
        const {
            aggregateState
        } = this.previous;

        if (
            "failed" ==  aggregateState ||
            "confirmed" ==  aggregateState            
        ) {
            return true
        }
        return false
    }

    rotate() {
        if (!this.canRotate()) {
            throw new Error(`must verify canRotate() before rotating`)
        }
        this.previous = this.current;
        this.current = new SubmitterMultiClient(this.submitters);
    }
    
}