import type { enumTypeDetails, typeDetails } from "../HeliosMetaTypes.js";
import { BundleBasedGenerator } from "./BundleBasedGenerator.js";
/**
 * Gathers any number of types expressible for an on-chain Helios script,
 * and generates types and type aliases for the off-chain TypeScript context.
 *
 * Each struct type is directly expressed as its name
 * Each enum type is expressed as a proxy type, unioned with the possible raw enum variants for that type
 * As each type is encountered (as a **nested field** within a datum or redeemer), any named types encountered
 * are added to the context, with any recursive expansions generated and added to the context, depth-first,
 * ... then the named type is used for the **nested field** where it was encountered.
 * @public
 */
export declare class BundleTypeGenerator extends BundleBasedGenerator {
    createAllTypesSource(className: string, parentClassName: string, inputFile: string): string;
    generateNamedDependencyTypes(): string;
    generateEnumTypeSource(name: string, typeInfo: enumTypeDetails): string;
    generateOtherNamedTypeSource(name: string, typeInfo: typeDetails): string;
}
//# sourceMappingURL=BundleTypeGenerator.d.ts.map