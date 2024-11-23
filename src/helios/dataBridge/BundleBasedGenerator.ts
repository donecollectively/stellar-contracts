import { BundleTypes } from "./BundleTypes.js";
import type { HeliosScriptBundle } from "../HeliosScriptBundle.js";
import path from "path";

const CREATED = Symbol("withCreate");

export class BundleBasedGenerator {
    bundle: HeliosScriptBundle;
    typeBundle!: BundleTypes;

    /**
     * ## Don't use this constructor directly!
     * For proper initialization, you must use `‹class›.create(bundle)`, not `new ‹class›(bundle)`
     */
    constructor(bundle: HeliosScriptBundle, isBrandedCreate: typeof CREATED) {
        if (isBrandedCreate !== CREATED) {
            throw new Error(`Invalid use of \`new ${this.constructor.name}.new(bundle)\`\n  ... use \`${this.constructor.name}.create(bundle)\` instead`);
        }
        this.bundle = bundle;
    }

    /**
     * provides delayed iniitalization of the BundleTypes
     */
    static create<T extends BundleBasedGenerator>(this: (
        new (bundle: HeliosScriptBundle, isBrandedCreate: typeof CREATED) => T
    ), bundle: HeliosScriptBundle): T {
        const item = new this(bundle, CREATED)
        item.initTypeBundle()
        return item
    }

    initTypeBundle() {
        this.typeBundle = new BundleTypes(this.bundle, this as any);
    }

    get namedTypes() {
        return this.typeBundle.namedTypes;
    }

    get topLevelTypeDetails() {
        return this.typeBundle.topLevelTypeDetails;
    }

    get activityTypeDetails() {
        return this.typeBundle.activityTypeDetails;
    }

    get datumTypeDetails() {
        return this.typeBundle.datumTypeDetails;
    }

    /**
     * internal use for modifying imports for hlbundles part of the stellar contracts library
     * if it is true, then the imports will be expressed in a way relative to the stellar contracts 
     * repository.  Otherwise, all the stellar contracts types will be imported from the
     * @donecollectively/stellar-contracts package.
     */
    protected _isSC = false;
    _isInStellarContractsLib(t: true) {
        this._isSC = true;
    }

    /**
     * computes relative path from inputFile to importFile
     */
    mkRelativeImport(inputFile: string, importFile: string) {
        let relativePath = path.relative(
            path.dirname(inputFile),
            path.join(importFile)
        );
        if (relativePath[0] !== ".") {
            relativePath = `./${relativePath}`;
        }
        return relativePath;
    }

    get datumTypeName() {
        return this.bundle.effectiveDatumTypeName();
    }
}