import type { TypeSchema } from "@helios-lang/type-utils";
import type { anyTypeDetails } from "../HeliosScriptBundle.js";
import { Cast } from "@helios-lang/contract-utils";

// reads the same type of data used
// for writing 

const rawDataReaderProxy = new Proxy(
    {},
    {
        get(_, typeName, DRP) {
            throw new Error("todo")
            // const cast = DRP.getCast(typeName);
            // return DRP.types.get(prop);
        },
        apply(xxx, ptp, args) {
            debugger;
            throw new Error("todo")
            // return ptp.toUplc(...args);
        },
    }
);

function dataReaderProxy() {}
dataReaderProxy.prototype = rawDataReaderProxy;

export class DataReader extends (dataReaderProxy as any) {
    schema?: TypeSchema;
    cast?: Cast<any, any>;
    constructor(public typeDetails: anyTypeDetails) {
        super();
        this.schema = undefined;
    }

    read(uplcData): any {
        throw new Error("todo")
    }

    getTypeSchema() {
        if (!this.schema) {
            this.schema = this.typeDetails.dataType.toSchema();
            this.cast = new Cast(this.schema, { isMainnet: true });
        }
        return this.schema;
    }
}
