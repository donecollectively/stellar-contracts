import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import { type TypeSchema, genTypes } from "@helios-lang/contract-utils";
// import CapoBundle from "../CapoHeliosBundle.js";

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

type bundleWithStatus = {
    filename: string;
    importName: string;
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
        if (existsSync(`${root}/hlproject.mjs`)) {
            return import(`${root}/hlproject.mjs`).then((projectPackage) => {
                if (!projectPackage.project) {
                    throw new Error(`hlproject.mjs must export a \`project\``);
                }
                return projectPackage.project;
            });
        }
    }
    bundles: Map<string, bundleWithStatus>;
    capoBundle: HeliosScriptBundle | null = null;
    projectRoot: string;
    constructor() {
        this.bundles = new Map();
        this.projectRoot = StellarHeliosProject.findProjectRoot();
    }
    addBundleWithMockTypes(filename: string) {
        this.bundles.set(filename, { filename, importName: this.getImportNameFromHlBundle(filename) });
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
    addBundle(
        absoluteFilename: string,
        bundleClass?: typeof HeliosScriptBundle
    ) {
        // if the file location is within the project root, make it relative
        // otherwise, use the absolute path
        const filename = absoluteFilename.startsWith(this.projectRoot)
            ? path.relative(this.projectRoot, absoluteFilename)
            : absoluteFilename;

        if (bundleClass) {
            let bundle: HeliosScriptBundle | undefined;
            // if the bundle has a CapoBundle, use it
            const isCapoBundle = false;
            if (isCapoBundle) {
                //bundleClass.prototype instanceof CapoBundle) {
                if (this.bundles.size > 0) {
                    if (this.capoBundle) {
                        throw new Error(
                            `only one CapoBundle is currently supported`
                        );
                    } else {
                        throw new Error(
                            `the CapoBundle must be registered before any other bundles (at ${absoluteFilename}`
                        );
                    }
                }
                this.capoBundle = new (bundleClass as any)();
            } else {
                if (!this.capoBundle) {
                    throw new Error(
                        `the CapoBundle must be registered before any other bundles (at ${absoluteFilename}`
                    );
                }
                bundle = new (bundleClass as any)(this.capoBundle);
            }
            const types = bundle ? this.genTypes(bundle) : undefined;
            const importName =
                bundle?.program.name ||
                this.getImportNameFromHlBundle(filename);

            this.bundles.set(filename, { filename, bundle, types, importName });
        } else {
            const importName = this.getImportNameFromHlBundle(filename);

            this.bundles.set(filename, { filename, importName });
        }
        this.writeProjectFile();
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
        if (this.bundles.has(filename)) {
            return this.bundles.get(filename)?.bundle !== undefined;
        }
    }

    writeMockTypes(filename: string) {
        // const typeFilename = filename.replace(/\.hlbundle\.js$/, ".hlbundle.d.ts");
        // writeFileSync(typeFilename, `// generated by StellarHeliosProject using Stellar Helios Rollup type-generator
        //     // mock types
    }

    writeTypeInfo(filename: string) {
        const bundle = this.bundles.get(filename);
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

    writeProjectFile() {
        // creates or updates hlproject.mjs in the project root
        // makes a backup of the existing hlproject.mjs
        // writes the new hlproject.mjs

        this.createBackupFileOnce();

        let content = `// generated by StellarHeliosProject using Stellar Helios Rollup type-generator

import { HeliosScriptBundle } from "src/helios/HeliosScriptBundle.ts"   // todo import from @stellar-contracts
import { CapoHeliosBundle } from "src/CapoHeliosBundle.ts"                    // todo import from @stellar-contracts
import { StellarHeliosProject } from "src/helios/StellarHeliosProject.ts" // todo import from @stellar-contracts
`;
        for (const [filename, bundle] of this.bundles) {
            content += `import ${bundle.importName} from "${filename}";\n`;
        }
        content += `\nexport const project = new StellarHeliosProject();\n\n`;
        for (const [filename, bundle] of this.bundles) {
            content += `project.addBundle("${filename}", ${bundle.importName});\n`;
        }
        // compare the content to the existing file
        // ONLY if it is different, write the new file
        let existingContent = "--- not existing ---";
        if (existsSync(this.projectFilename)) {
            existingContent = readFileSync(this.projectFilename, "utf-8");
        }
        if (existingContent === content) {
            console.log(`📦 StellarHeliosProject: no changes to hlproject.mjs`);
        } else {
            writeFileSync(`${this.projectRoot}/hlproject.mjs`, content);
            console.log(
                `📦 StellarHeliosProject: wrote hlproject.mjs to ${this.projectRoot}`
            );
        }
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
