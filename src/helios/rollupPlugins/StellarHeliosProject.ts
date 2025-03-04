import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
import type { UplcData } from "@helios-lang/uplc";
import { BundleTypeGenerator } from "../dataBridge/BundleTypeGenerator.js";
import { dataBridgeGenerator } from "../dataBridge/dataBridgeGenerator.js";
import type { CapoHeliosBundle } from "../scriptBundling/CapoHeliosBundle.js";
import { mkCancellablePromise } from "../../networkClients/mkCancellablePromise.js";
// import {CapoHeliosBundle} from "../CapoHeliosBundle.js";

const startTime = Date.now();

type BundleStatusEntry = {
    filename: string;
    status: "registering" | "pendingLoad" | "loaded";
    bundleClassName: string;
    parentClassName?: string;
    bundleClass?: typeof HeliosScriptBundle; // or a subclass
    bundle?: HeliosScriptBundle;
};

export function isUplcData(x: any): x is UplcData {
    return "kind" in x && "toCbor" in x;
}

/**
 * Gathers `*.hlb.[tj]s` files along with their status and attributes.
 * @public
 * @remarks
 * For script bundles that have previously been loaded, the project will
 * have access to the bundle's type information, and  be able to
 * instantiate the bundle, given a CapoBundle that typically provides
 * library dependencies.
 *
 * For script bundles that are being loaded for the first time, the project
 * can generate a "placeholder" type-definition, to be updated once the
 * bundle has been transformed by the helios rollup loader to be able to
 * do the above.
 */
export class StellarHeliosProject {
    static details: {
        projectRoot: string;
        packageJSON: {
            name: string,
            version: string,
            dependencies: Record<string, string>,
            devDependencies: Record<string, string>,
        };
    };
    configuredCapo = mkCancellablePromise<CapoHeliosBundle>()
    bundleEntries: Map<string, BundleStatusEntry>;
    capoBundleName?: string;
    capoBundle: CapoHeliosBundle | undefined = undefined;
    constructor() {
        this.bundleEntries = new Map();
        const {
            projectRoot,
            packageJSON,
        } = StellarHeliosProject.findProjectDetails();

        this._isSC = packageJSON.name === "@donecollectively/stellar-contracts";
    }

    _isSC: boolean | undefined;

    isStellarContracts() {
        return this._isSC;
    }
    get projectRoot() {
        return StellarHeliosProject.details.projectRoot;
    }

    replaceWithNewCapo(
        absoluteFilename: string,
        newCapoClass: typeof HeliosScriptBundle
    ) {
        throw new Error(`dead code?!?!`)
        const replacement = new StellarHeliosProject();
        replacement.loadBundleWithClass(absoluteFilename, newCapoClass);
        replacement.generateBundleTypes(absoluteFilename);
        for (const [filename, entry] of this.bundleEntries.entries()) {
            if (!entry.bundleClass?.isCapoBundle) {
                replacement.loadBundleWithClass(filename, entry.bundleClass!);
                replacement.generateBundleTypes(filename);
            }
        }
        return replacement;
    }

    // call from code-generated hlproject.mjs with instantiated bundle
    // call from rollup plugin with bundle filename
    loadBundleWithClass(
        absoluteFilename: string,
        bundleClass: typeof HeliosScriptBundle,
        harmlessSecondCapo: boolean = false
    ) {
        if (harmlessSecondCapo) {
            throw new Error("deprecated use of arg3 'harmlessSecondCapo'");
        }
        // if the file location is within the project root, make it relative
        // otherwise, use the absolute path
        const filename = absoluteFilename.startsWith(this.projectRoot)
            ? path.relative(this.projectRoot, absoluteFilename)
            : absoluteFilename;

        if (filename.startsWith("/")) debugger;
        const bundleClassName = bundleClass.name;

        // we need to do rollup on the project before we'll ever hit this path
        let bundle: HeliosScriptBundle | undefined;
        // if the bundle has a CapoBundle, use it
        // searches the bundle class hierarchy for the presence of a class named CapoHeliosBundle.
        let isCapoBundle = bundleClass.isCapoBundle;
        let proto = bundleClass.prototype;
        let parentClassName = "";
        while (proto) {
            const thisClassName = proto.constructor.name;
            if (!parentClassName && bundleClassName !== thisClassName) {
                parentClassName = proto.constructor.name;
                break;
            }
            proto = Object.getPrototypeOf(proto);
        }

        if (isCapoBundle && !harmlessSecondCapo) {
            if (this.capoBundle) {
                throw new Error(`only one CapoBundle is currently supported`);
            }
            // console.log(`Project: loading CapoBundle ${bundleClassName}`);
            this.capoBundle = new (bundleClass as any)({setup: {isMainnet: false}});
            const registeredCapoName = bundleClass.name;
            if (this.bundleEntries.size > 0) {
                // debugger
                for (const [filename, entry] of this.bundleEntries.entries()) {
                    const thatCapoName = entry.bundle?.capoBundle?.constructor.name;
                    if (thatCapoName !== registeredCapoName) {
                        console.log("new capo bundle is "+registeredCapoName);
                        console.log("pre-registered bundle uses capo "+thatCapoName);
                        throw new Error(`mismatched capo bundle for ${filename} (see details above)`);
                    }
                }
                // throw new Error(`register capo first!! ??`);
                // update any pending bundles with an instantiated
                // bundle including the newly-discovered CapoBundle
                // for (const filename of this.bundleEntries.keys()) {
                //     const entry = this.bundleEntries.get(filename);
                //     if (entry?.status !== "pendingLoad") {
                //         throw new Error(`unexpected status: ${entry?.status}`);
                //     }
                //     const bundleClass = entry.bundleClass;
                //     if (!bundleClass) {
                //         throw new Error(
                //             `no bundleClass for entry with status '${entry?.status}': ${filename}`
                //         );
                //     }
                //     console.log("finishing pending load for", filename);
                //     entry.bundle = new (bundleClass as any)(this.capoBundle);
                //     entry.status = "loaded";
                // }
            }
            this.bundleEntries.set(filename, {
                filename,
                status: "loaded",
                bundle: this.capoBundle,
                bundleClassName: bundleClassName,
                parentClassName,
                bundleClass,
            });
        } else if (isCapoBundle && harmlessSecondCapo) {
            throw new Error("dead code path")
            console.log(`Project: loading CapoBundle ${bundleClassName}`);
            console.log(
                `  (replaces existing capo ${this.capoBundle?.constructor.name})`
            );
            debugger;
            this.bundleEntries.set(filename, {
                filename,
                status: "loaded",
                bundle: new (bundleClass as any)({setup: {isMainnet: false}}), // harmless second capo
                bundleClassName: bundleClassName,
                parentClassName,
                bundleClass,
            });
        } else {
            const bundleEntry: BundleStatusEntry = {
                filename,
                status: "registering", // overwritten below, one way or other
                bundleClass,
                bundleClassName: bundleClassName,
                parentClassName,
            };
            bundle = new (bundleClass as any)({setup: {isMainnet: false}});
            bundleEntry.bundle = bundle;
            bundleEntry.status = "loaded";
            this.bundleEntries.set(filename, bundleEntry);
        }

        // this.bundleEntries.set(filename, { filename, bundle, types, importName });
    }

    hasBundleClass(filename: string) {
        if (this.bundleEntries.has(filename)) {
            return this.bundleEntries.get(filename)?.bundle !== undefined;
        }
        if (filename.startsWith(this.projectRoot)) {
            const relativeFilename = path.relative(this.projectRoot, filename);
            return this.hasBundleClass("./" + relativeFilename);
        }
        console.log(
            `helios project: no bundle yet for ${filename}\n` +
                `${[...this.bundleEntries.keys()]
                    .map((k) => `  - ${k}`)
                    .join("\n")}`
        );
    }

    generateBundleTypes(oneFile: string) {
        const fn = this.normalizeFilePath(oneFile);
        const bundleEntry = this.bundleEntries.get(fn);
        if (!bundleEntry) {
            throw new Error(`bundle not found: ${fn}`);
        }
        this.writeTypeInfo(oneFile, bundleEntry);
        this.writeDataBridgeCode(
            oneFile.replace(/(\.hlb)?\.[tj]s$/, ".bridge.ts"),
            bundleEntry
        );

        // this.writeReadDatabridge(
        //     oneFile.replace(/\.hlb\.[tj]s$/, ".readData.ts"),
        //     bundleEntry
        // );

        // throw new Error(`don't use omnibus generation anymore!`);

        // // for each bundle, generate the types
        // for (const filename of this.bundleEntries.keys()) {
        //     if (oneFile && oneFile !== filename) continue;
        //     this.writeTypeInfo(filename);
        // }
    }

    // uses the dataBridgeGenerator class to generate a *.bridge.ts file
    writeDataBridgeCode(oneFilename: string, bundleEntry: BundleStatusEntry) {
        const fn = this.normalizeFilePath(oneFilename);
        const dataBridgeFn = fn.replace(/\.hlb\.[jt]s$/, ".bridge.ts");

        const bundle = bundleEntry.bundle;
        const status = bundleEntry.status;
        if (!bundle) {
            console.warn(
                `not writing data bridge for ${fn} for newly-added bundle (check for hasBundleClass() first?)`
            );
            return;
        }
        if (status !== "loaded") {
            throw new Error(
                `cannot generate data bridge for ${fn} with status ${status}`
            );
        }
        const ts1 = Date.now();
        // console.log("writing data bridge code: ", bundle.moduleName);
        const bridgeGenerator = dataBridgeGenerator.create(bundle);
        if (this.isStellarContracts()) {
            if (dataBridgeFn.match(/\b(testing|tests)\//)) {
                console.log(`   ------- from testing package or tests: ${dataBridgeFn} -- uses @donecollectively/stellar-contracts for imports`);
            } else {
                bridgeGenerator._isInStellarContractsLib(true);
            }
        }
        const bridgeSourceCode = this.isStellarContracts()
            ? bridgeGenerator.generateDataBridge(fn, "stellar-contracts")
            : bridgeGenerator.generateDataBridge(fn);
        this.writeIfUnchanged(dataBridgeFn, bridgeSourceCode);
        // console.log(`NOT writing data bridge code to ${dataBridgeFn}:${bridgeSourceCode}`);
        writeFileSync(dataBridgeFn, bridgeSourceCode);
        console.log(
            `📦 ${bundle.moduleName}: generated data bridge: ${
                Date.now() - ts1
            }ms`
        );
    }

    writeIfUnchanged(filename: string, source: string) {
        if (existsSync(filename)) {
            const existingSource = readFileSync(filename, "utf-8");
            if (existingSource === source) {
                // console.log(`   -- unchanged: ${filename}`);
                return;
            }
        }
        writeFileSync(filename, source);
        return source;
    }

    normalizeFilePath(filename: string) {
        const fn = filename.startsWith(this.projectRoot)
            ? path.relative(this.projectRoot, filename)
            : filename;

        if (fn.startsWith("/")) debugger;
        // console.log("normalizedFilePath: ", fn);
        return fn;
    }

    writeTypeInfo(filename: string, bundleEntry: BundleStatusEntry) {
        const fn = this.normalizeFilePath(filename);
        const bundle = bundleEntry.bundle;
        const status = bundleEntry.status;

        if (!bundle) {
            console.warn(
                `not writing type info for ${filename} for newly-added bundle (check for hasBundleClass() first?)`
            );
            return;
        }
        if (status !== "loaded") {
            throw new Error(
                `cannot generate types for ${filename} with status ${status}`
            );
        }

        let typeFilename = filename.replace(/(\.hlb)?\.[jt]s$/, ".typeInfo.ts");
        const { bundleClassName, parentClassName } = bundleEntry;

        if (!parentClassName) {
            throw new Error(`no parent class name for ${filename}`);
        }

        const ts1 = Date.now();
        const typeContext = BundleTypeGenerator.create(bundle);
        if (this.isStellarContracts()) {
            if (filename.match(/\b(testing|tests)\//)) {
                console.log(`   ------- from testing package or tests: ${filename} -- uses @donecollectively/stellar-contracts for imports`);
            } else {
                typeContext._isInStellarContractsLib(true);
            }
        }

        const typesSource = typeContext.createAllTypesSource(
            bundleClassName,
            parentClassName,
            typeFilename
        );
        // console.log("not writing type info yet:", {
        //     filename,
        //     typeFilename,
        // });
        // return

        if (this.writeIfUnchanged(typeFilename, typesSource)) {
            console.log(
                `📦 ${bundleClassName}: generated types (${Date.now() - ts1}ms)`
            );
        }
    }

    static findProjectDetails() {
        if (this.details) return this.details;

        const cwd = process.cwd();
        let dir = cwd;
        let found = false;
        let packageJSON = {} as any
        while (!found) {
            const fileName = path.join(dir, "package.json");
            if (existsSync(fileName)) {
                found = true;
                packageJSON = JSON.parse(readFileSync(fileName, "utf-8"));
            } else {
                const parent = path.dirname(dir);
                if (parent === dir) {
                    throw new Error(
                        `could not find package.json in ${cwd} or any parent directories`
                    );
                }
                dir = parent;
            }
        }
        console.log(`📦 StellarHeliosProject: found project root at ${dir}: ${packageJSON.name}`);
        this.details = {
            packageJSON,
            projectRoot: dir,
        }
        return this.details;
    }
}

function ts() {
    return Date.now() - startTime;
}
