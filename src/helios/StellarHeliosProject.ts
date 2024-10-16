import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import { type TypeSchema, genTypes } from "@helios-lang/contract-utils";
import * as rollup from "rollup";
import { heliosRollupLoader } from "./heliosRollupLoader.js";
import esbuild from "rollup-plugin-esbuild";
// import {CapoHeliosBundle} from "../CapoHeliosBundle.js";

const startTime = Date.now();
const writeDelay: number = process?.env?.BUILD_LATENCY
    ? parseInt(process?.env?.BUILD_LATENCY)
    : 2500;

type HeliosTypeInfo = {
    kind: TypeSchema["kind"];
    canonicalType: string;
    permissiveType: string;
};
type HeliosVariantInfo = {
    fields: Record<string, HeliosTypeInfo>;
};

type HeliosEnumInfo = {
    kind: "enum";
    variants: Record<string, HeliosVariantInfo>;
};

type HeliosBundleTypes = {
    datum: HeliosTypeInfo | HeliosEnumInfo;
    redeemer: HeliosTypeInfo | HeliosEnumInfo;
};

type BundleStatusEntry = {
    filename: string;
    status: "registering" | "pendingLoad" | "loaded";
    importName: string;
    bundleClass?: typeof HeliosScriptBundle; // or a subclass
    bundle?: Option<HeliosScriptBundle>;
    types?: Option<HeliosBundleTypes>;
};
/**
 * Gathers `*.hlbundle.js` files along with their status and attributes.
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
    static root: string;
    static loadExistingProject(): Promise<StellarHeliosProject> | undefined {
        const root = StellarHeliosProject.findProjectRoot();
        const compiledFile = StellarHeliosProject.compiledProjectFilename(root);
        if (existsSync(compiledFile)) {
            return import(compiledFile).then((projectPackage) => {
                if (!projectPackage.project) {
                    throw new Error(
                        `must export a \`project\` from ${compiledFile}`
                    );
                }
                return projectPackage.project;
            });
        }
    }
    bundleEntries: Map<string, BundleStatusEntry>;
    capoBundle: HeliosScriptBundle | null = null;
    projectRoot: string;
    constructor() {
        this.bundleEntries = new Map();
        this.projectRoot = StellarHeliosProject.findProjectRoot();
    }
    static compiledProjectFilename(root: string) {
        return `${root}/hlproject.compiled.mjs`;
    }
    get compiledProjectFilename() {
        return StellarHeliosProject.compiledProjectFilename(this.projectRoot);
    }

    addBundleWithMockTypes(filename: string) {
        this.bundleEntries.set(filename, {
            filename,
            status: "registering",
            importName: this.getImportNameFromHlBundle(filename),
        });
        // probably the generic types of the mkDatum, mkRedeemer, and readDatum proxies
        // in the base class will be enough to bootstrap the real types, in which those proxies
        // get a more specific type defined (via the generated .d.ts, from the underlying helios source)
        // for each bundle file.
        const mockTypesAreImportant = false;
        if (mockTypesAreImportant) {
            this.writeMockTypes(filename);
        }
    }
    // call from code-generated hlproject.mjs with instantiated bundle
    // call from rollup plugin with bundle filename
    loadBundleWithClass(
        absoluteFilename: string,
        bundleClass: typeof HeliosScriptBundle
    ) {
        
        // if the file location is within the project root, make it relative
        // otherwise, use the absolute path
        const filename = absoluteFilename.startsWith(this.projectRoot)
            ? path.relative(this.projectRoot, absoluteFilename)
            : absoluteFilename;
        
        if (filename.startsWith('/')) debugger
        const importName = bundleClass.name;

        // we need to do rollup on the project before we'll ever hit this path
        let bundle: HeliosScriptBundle | undefined;
        // if the bundle has a CapoBundle, use it
        // searches the bundle class hierarchy for the presence of a class named CapoHeliosBundle.
        let isCapoBundle = false
        let proto = bundleClass.prototype;
        while (proto) {
            if (proto.constructor.name === "CapoHeliosBundle") {
                isCapoBundle = true;
                break;
            }
            proto = Object.getPrototypeOf(proto);
        }
        if (isCapoBundle) {
            //bundleClass.prototype instanceof CapoBundle) {
            if (this.bundleEntries.size > 0) {
                if (this.capoBundle) {
                    throw new Error(
                        `only one CapoBundle is currently supported`
                    );
                } else {
                    // update any pending bundles with an instantiated
                    // bundle including the newly-discovered CapoBundle
                    for (const filename of this.bundleEntries.keys()) {
                        const entry = this.bundleEntries.get(filename);
                        if (entry?.status !== "pendingLoad") {
                            throw new Error(`unexpected status: ${entry?.status}`);
                        }
                        const bundleClass = entry.bundleClass;
                        if (!bundleClass) {
                            throw new Error(
                                `no bundleClass for entry with status '${entry?.status}': ${filename}`
                            );
                        }
                        entry.bundle = new (bundleClass as any)(this.capoBundle);
                        entry.status = "loaded";
                    }
                }
            }
            this.capoBundle = new (bundleClass as any)();
            this.bundleEntries.set(filename, {
                filename,
                status: "loaded",
                bundle: this.capoBundle,
                importName,
                bundleClass,
            });
        } else {
            const bundleEntry : BundleStatusEntry = {
                filename,
                status: "registering", // overwritten below, one way or other
                bundleClass,
                importName,
            };
            // if we have the CapoBundle, we can use it to instantiate this bundle now.
            if (this.capoBundle) {
                bundle = new (bundleClass as any)(this.capoBundle);
                bundleEntry.bundle = bundle;
                bundleEntry.status = "loaded";
            } else {
                bundleEntry.status = "pendingLoad"
            }
            this.bundleEntries.set(filename, bundleEntry);
        }

        // this.bundleEntries.set(filename, { filename, bundle, types, importName });
    }

    registerBundle(absoluteFilename: string) {
        const filename = absoluteFilename.startsWith(this.projectRoot)
            ? path.relative(this.projectRoot, absoluteFilename)
            : absoluteFilename;

        if (filename.startsWith('/')) debugger
        if (this.bundleEntries.has(filename)) {
            return // already registered AND loaded
        }
        console.log(`heliosTypeGen: new .hlbundle: ${filename}`);

        const importName = this.getImportNameFromHlBundle(filename);

        this.bundleEntries.set(filename, {
            filename,
            status: "registering",
            importName,
        });
        this.deferredWriteProjectFile();
    }

    private getImportNameFromHlBundle(filename: string) {
        const fileContent = readFileSync(filename, "utf-8");
        const importNameMatch = fileContent.match(
            /export\s+default\s+(?:class|function)\s+([a-zA-Z0-9_]+)/
        );
        if (!importNameMatch) {
            throw new Error(
                `could not extract **default export** name from ${filename}\n` +
                    `  expected: export default class ...`
            );
        }
        const importName = importNameMatch[1];
        if (!importName.match(/^[a-zA-Z0-9_]+$/)) {
            throw new Error(
                `invalid import name from ${filename}: ${importName}`
            );
        }
        return importName;
    }

    hasBundleClass(filename: string) {

        if (this.bundleEntries.has(filename)) {
            return this.bundleEntries.get(filename)?.bundle !== undefined;
        }
        console.log(`heliosTypeGen: no bundle yet for ${filename}`);
    }

    writeMockTypes(filename: string) {
        // const typeFilename = filename.replace(/\.hlbundle\.js$/, ".hlbundle.d.ts");
        // writeFileSync(typeFilename, `// generated by StellarHeliosProject using Stellar Helios Rollup type-generator
        //     // mock types
    }

    generateBundleTypes() {
        // for each bundle, generate the types
        for (const filename of this.bundleEntries.keys()) {
            this.writeTypeInfo(filename);
        }
    }

    writeTypeInfo(filename: string) {
        const bundle = this.bundleEntries.get(filename);
        if (!bundle) {
            throw new Error(`bundle not found: ${filename}`);
        } else if (!bundle.bundle) {
            throw new Error(
                `cannot write type info for ${filename} for newly-added bundle (check for hasBundleClass first)`
            );
        }
        const types = this.genTypes(bundle.bundle);
        const typeFilename = filename.replace(
            /\.hlbundle\.js$/,
            ".hlbundle.d.ts"
        );
        const className = bundle.bundle.constructor.name;

        const parentClass = "Placehodler"; // bundle.bundle?.constructor.name || "HeliosScriptBundle";
        debugger;
        throw new Error(`todo: write type info to ${typeFilename}`);
        writeFileSync(
            typeFilename,
            `// generated by StellarHeliosProject using Stellar Helios Rollup type-generator
import type {CapoBundle} from "src/CapoHeliosBundle.ts"   // todo import  from @stellar-contracts
import type {HeliosScriptBundle} from "src/helios/HeliosScriptBundle.ts" // todo import from @stellar-contracts

export default class ${className} extends ${parentClass} {
    mkDatum: {
        placeholder: "generate proxy types here";
    }
    mkRedeemer: {
        placeholder: "make proxy types here";
    }
    readDatum: {
        placeholder: "show proxy types here";
    }
}
           `
        );
    }

    genTypes(bundle: HeliosScriptBundle): HeliosBundleTypes {
        debugger;
        throw new Error(
            `todo: detect enums, generate enum-variant types for each`
        );

        // const [canonicalType, permissiveType] = genTypes(bundle)
    }

    private _didCreateBackupFile = false;
    createBackupFileOnce() {
        // uses this.projectFilename
        // creates a backup of the existing hlproject.mjs
        // if this object already did this, it isn't done a second time

        if (!this._didCreateBackupFile) {
            if (existsSync(this.projectFilename)) {
                writeFileSync(
                    `${this.projectFilename}.bk`,
                    readFileSync(this.projectFilename)
                );
            }
            this._didCreateBackupFile = true;
        }
    }

    _delayPromise: Promise<string> | null = null;
    _delayResolver: ((projectContent: string) => void) | null = null;
    _delayRejecter: ((reason?: any) => void) | null = null;
    _delayCanceler: any; // int on browser, NodeJS.Timeout on node
    /**
     * schedules the project file to be written after a delay
     * returns a promise for the contents of the project file, which will be resolved when the file is written
     * if called again before the delay, the delay is reset, and the same promise is returned a second time
     */
    async deferredWriteProjectFile(
        delay: number = writeDelay
    ): Promise<string> {
        // uses this.projectFilename
        // writes the project file after a delay
        // if called again before the delay, the delay is reset
        // when the delay is up, the file is written

        this.cancelDeferredWrite("extending deferral");

        const triggerWrite = () => {
            console.log(
                `📦 StellarHeliosProject: deferred write of project file after timeout ${ts()}`
            );

            this.writeProjectFile();
        };
        this._delayCanceler = setTimeout(triggerWrite, delay);
        if (!this._delayPromise) {
            this._delayPromise = new Promise<string>((resolve, reject) => {
                this._delayResolver = resolve;
                this._delayRejecter = reject;
            });
        }
        // this._delayPromise.then(() => {
        //     debugger
        // })
        return this._delayPromise;
    }

    cancelDeferredWrite(
        reason?: ("extending deferral" | "writeProjectFile") | string
    ) {
        if (this._delayCanceler) {
            clearTimeout(this._delayCanceler);
            this._delayCanceler = null;

            if ("extending deferral" == reason) {
                // silent OK
                // no reset of the promise
                // the timeout is re-created by the caller
                return;
            }

            // the promise will be cleared below.  The only questions
            // are whether it's resolved or rejected prior to that,
            // and whether any logging is appropriate.
            if ("writeProjectFile" == reason) {
                // silent OK
                // resolve the promise before it's cleared;
                // the writeProjectFile method calls the resolution function,
                // so we should not do that here.
                // //  this._delayResolver?.(); // notify anyone listening for completion
            } else if (reason) {
                console.log(`📦 StellarHeliosProject: ${reason}`);
                // reject the promise, passing the reason through.
                this._delayRejecter?.(reason);
            } else {
                const exception = new Error(
                    "deferred project-write cancelled for no special reason"
                );
                console.log(
                    `📦 StellarHeliosProject: deferred write cancelled \n` +
                        `  ... for no special reason (add a reason to improve observability)\n` +
                        `  ... escalating as exception` +
                        // remove the redundant message from the stack trace:
                        exception.stack!.split("\n").slice(1).join("\n")
                );
                // reject the promise, passing the reason through.
                this._delayRejecter?.(exception);
            }
            // reset the promise in both its aspects
            // future calls for deferred write will create a new promise
            this._delayResolver = null;
            this._delayPromise = null;
        } else {
            if ("extending deferral" === reason) {
                console.log(
                    `📦 StellarHeliosProject: scheduling deferred write of project file ${ts()}`
                );
            }
        }
    }

    writeProjectFile() {
        // creates or updates hlproject.mjs in the project root
        // makes a backup of the existing hlproject.mjs
        // writes the new hlproject.mjs

        const resolver = this._delayResolver;
        this.cancelDeferredWrite("writeProjectFile");
        this.createBackupFileOnce();

        let content = `// generated by StellarHeliosProject using Stellar Helios Rollup type-generator

// import { HeliosScriptBundle } from "./src/helios/HeliosScriptBundle.ts"     // todo import from @stellar-contracts
// import { CapoHeliosBundle } from "./src/CapoHeliosBundle.ts"                // todo import from @stellar-contracts
import { StellarHeliosProject } from "./src/helios/StellarHeliosProject.ts" // todo import from @stellar-contracts
`;
        for (const [filename, bundle] of this.bundleEntries) {
            content += `import ${bundle.importName} from "./${filename}";\n`;
        }
        content += `\nexport const project = new StellarHeliosProject();\n\n`;
        for (const [filename, bundle] of this.bundleEntries) {
            content += `project.loadBundleWithClass("./${filename}", ${bundle.importName});\n`;
        }
        // compare the content to the existing file
        // ONLY if it is different, write the new file
        let existingContent = "--- not existing ---";
        if (existsSync(this.projectFilename)) {
            existingContent = readFileSync(this.projectFilename, "utf-8");
        }
        if (existingContent === content) {
            console.log(`📦 StellarHeliosProject: no changes to hlproject.mjs`);
            if (!existsSync(this.compiledProjectFilename)) {
                this._rollupInProgress = this.runRollupBuild();
            }
        } else {
            writeFileSync(`${this.projectRoot}/hlproject.mjs`, content);
            console.log(
                `📦 StellarHeliosProject: wrote hlproject.mjs to ${this.projectRoot} with ${this.bundleEntries.size} script bundles`
            );
            this._rollupInProgress = this.runRollupBuild();
        }
        return Promise.resolve(this._rollupInProgress).then(() => {
            resolver?.(content);
        })
    }

    _rollupInProgress: Promise<void> | null = null;
    async runRollupBuild() {
        if (this._rollupInProgress) {
            console.log(
                `📦 StellarHeliosProject: waiting for a previous project-build to finish...`
            );
            await this._rollupInProgress;
        }
        console.log(`📦 StellarHeliosProject: running rollup build`);
        const buildStartTime = Date.now();
        return (this._rollupInProgress = rollup
            .rollup({
                input: this.projectFilename,
                external(id) {
                    return !/^[./]/.test(id);
                },
                plugins: [
                    heliosRollupLoader({
                        // todo make this right for the context
                        project: "stellar-contracts",
                    }),
                    esbuild({
                        tsconfig: "./tsconfig.json",
                        target: ["node18"],

                        sourceMap: false,
                    }),
                ],
                output: {
                    file: this.compiledProjectFilename,
                    format: "es",
                },
            })
            .then((bundle) => {
                bundle.write({
                    file: this.compiledProjectFilename,
                    format: "es",
                });
                const buildTime = Date.now() - buildStartTime;
                console.log(
                    `📦 StellarHeliosProject: wrote compiled project to ${this.compiledProjectFilename} after ${buildTime}ms`
                );
                this._rollupInProgress = null;
                bundle.close();
            }));
    }

    static findProjectRoot() {
        // starting in the current working directory,
        // look for package.json
        // if not found, go up a directory and try again
        // repeat until found or at root
        // throw error if not found
        // returns the full path to the project root

        if (this.root) return this.root;

        const cwd = process.cwd();
        let dir = cwd;
        let found = false;
        while (!found) {
            if (existsSync(path.join(dir, "package.json"))) {
                found = true;
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
        console.log(`📦 StellarHeliosProject: found project root at ${dir}`);
        this.root = dir;
        return dir;
    }

    static get projectFilename() {
        return this.findProjectRoot() + "/hlproject.mjs";
    }
    get projectFilename() {
        return StellarHeliosProject.projectFilename;
    }
}

function ts() {
    return Date.now() - startTime;
}
