import type { TypeSchema } from "@helios-lang/type-utils";
import type { anyTypeDetails } from "../HeliosMetaTypes.js";
import { type Cast, makeCast } from "@helios-lang/contract-utils";

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

export class DataReader extends (dataReaderProxy as typeof Object) {
    isMainnet: boolean;
    schema?: TypeSchema;
    ᱺᱺcast?: Cast<any, any>;
    constructor(public typeDetails: anyTypeDetails, isMainnet: boolean) {
        super();
        this.schema = undefined;
        if ("undefined" == typeof isMainnet) {
            throw new Error("isMainnet is required");
        }
        this.isMainnet = isMainnet;
    }

    read(uplcData): any {
        throw new Error("todo")
    }

    getTypeSchema() {
        if (!this.schema) {
            throw new Error("unreachable?")
            this.schema = this.typeDetails.dataType.toSchema();
            this.ᱺᱺcast = makeCast(this.schema!, { 
                isMainnet: this.isMainnet,
                unwrapSingleFieldEnumVariants: true
            });
        }
        return this.schema;
    }
}
