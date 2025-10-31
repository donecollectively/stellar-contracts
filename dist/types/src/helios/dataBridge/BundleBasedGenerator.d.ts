import { BundleTypes } from "./BundleTypes.js";
import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
declare const CREATED: unique symbol;
export declare class BundleBasedGenerator {
    bundle: HeliosScriptBundle;
    typeBundle: BundleTypes;
    /**
     * ## Don't use this constructor directly!
     * For proper initialization, you must use `‹class›.create(bundle)`, not `new ‹class›(bundle)`
     */
    constructor(bundle: HeliosScriptBundle, isBrandedCreate: typeof CREATED);
    /**
     * provides delayed iniitalization of the BundleTypes
     */
    static create<T extends BundleBasedGenerator>(this: (new (bundle: HeliosScriptBundle, isBrandedCreate: typeof CREATED) => T), bundle: HeliosScriptBundle): T;
    initTypeBundle(): void;
    get namedTypes(): Record<string, import("../HeliosMetaTypes.js").anyTypeDetails>;
    get topLevelTypeDetails(): import("../HeliosMetaTypes.js").HeliosBundleTypeDetails;
    get activityTypeDetails(): import("../HeliosMetaTypes.js").anyTypeDetails;
    get datumTypeDetails(): import("../HeliosMetaTypes.js").anyTypeDetails | undefined;
    /**
     * internal use for modifying imports for .hlb*.[tj]s that are part of the stellar contracts library
     * if it is true, then the imports will be expressed in a way relative to the stellar contracts
     * repository.  Otherwise, all the stellar contracts types will be imported from the
     * \`\@donecollectively\/stellar-contracts\` package.
     */
    protected _isSC: boolean;
    _isInStellarContractsLib(t: true): void;
    /**
     * computes relative path from inputFile to importFile
     */
    mkRelativeImport(inputFile: string, importFile: string): string;
    get datumTypeName(): string;
}
export {};
//# sourceMappingURL=BundleBasedGenerator.d.ts.map