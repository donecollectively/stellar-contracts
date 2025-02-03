import { inspect } from "util";
import { blake2b } from "@helios-lang/crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createFilter } from "rollup-pluginutils";
import {
    type InputOptions,
    type ResolveIdHook,
    type ResolveIdResult,
    type PartialResolvedId,
    type LoadResult,
    type PluginContext,
    type LoadHook,
    type CustomPluginOptions,
    rollup,
    type ResolvedId,
} from "rollup";
import esbuild from "rollup-plugin-esbuild";

import { StellarHeliosProject } from "./StellarHeliosProject.js";
import { heliosRollupLoader } from "./heliosRollupLoader.js";
import { bytesToHex } from "@helios-lang/codec-utils";
import { textToBytes } from "../HeliosPromotedTypes.js";

type HeliosBundlerPluginState = {
    capoBundle: any; // CapoHeliosBundle;
    hasExplicitCapoBundle: boolean;
    hasOtherBundles: boolean;
    project: StellarHeliosProject;
};

/**
 * Rollup loader for generating typescript types from Helios source files
 * @remarks
 * This rollup plugin is designed to be used in a rollup configuration
 * to generate typescript types from Helios source files.
 *
 * The plugin is designed to be used in conjunction with the helios rollup loader,
 * which compiles the helios source files into javascript.
 *
 * The following Rollup build hooks are used to make it all happen:
 * - resolveId: this hook is used to intercept the import of the helios bundle files, and use the
 *   project to generate updated types if needed and available.
 * @public
 **/
export function heliosRollupBundler(
    opts: {
        include?: string;
        exclude?: string[];
        project?: string;
        vite?: boolean;
        emitBundled?: boolean;
        compile?: boolean;
    } = {}
) {
    const pluginOptions = {
        vite: false,
        project: "",
        compile: false,
        ...opts,
        ...{
            include: /.*\.hlb\.[jt]s$/,
            exclude: [],
        },
    };

    // creates a temporary directory for dynamic loading,
    // in the project-root's .temp directory
    const tempDir = path.join(process.cwd(), ".hltemp", "heliosBundler");
    // create the tempdir if needed
    if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
    }
    // console.log(`heliosBundler: using tempDir: ${tempDir}`);

    const filterHLB = createFilter(
        pluginOptions.include,
        pluginOptions.exclude
    );
    const filterHlbundledImportName = createFilter(/.*\.hlb\.[jt]s\?bundled/);
    // const project = options.project ? `${options.project}` : "";

    // const lib = loadCompilerLib();
    const { projectRoot, packageJSON } =
        StellarHeliosProject.findProjectDetails();

    const thisPackageName = packageJSON.name;
    //read package.json from project root, parse and check its package name
    // const packageJsonPath = path.join(projectRoot, "package.json");
    // const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    // const isStellarContracts = "@donecollectively/stellar-contracts" === packageJson.name;

    const state: HeliosBundlerPluginState = {
        capoBundle: null, // new CapoHeliosBundle(),
        hasExplicitCapoBundle: false,
        hasOtherBundles: false,
        project: new StellarHeliosProject(),
    };

    const firstImportFrom: Record<string, string> = {};

    function relativePath(id: string) {
        return id.replace(`${projectRoot}/`, "");
    }
    const isJavascript = /\.js$/;
    return {
        name: "helios-type-gen",
        buildEnd: {
            order: "pre",
            handler(this: PluginContext, error?: Error) {
                // write the project file after the build, skipping any
                // pending delay from calls to `deferredWriteProjectFile()`
                console.log(
                    "heliosBundler: buildEnd: " +
                        (error ? "error: " + error?.message : "")
                );
                // return state.project.writeProjectFile();
            },
        },
        resolveId: {
            order: "pre",
            async handler(this: PluginContext, source, importer, options) {
                const interesting = !!source.match(/CapoMinter\.hlb\./);

                const { project } = state;
                const { isEntry } = options;
                let resolved: ResolvedId | null = null;

                const importerIsJS = !!importer?.match(isJavascript);
                const resolutionTargetIsJS = !!source?.match(isJavascript);
                const importerIsInThisProject =
                    importer?.indexOf(project.projectRoot) === 0;
                if (
                    pluginOptions.vite &&
                    importerIsJS &&
                    resolutionTargetIsJS &&
                    importerIsInThisProject
                ) {
                    this.warn(`patching up a vitest resolution: ${importer} imported ${source}`);
                    // work around vitest not resolving .ts files from .js using
                    // the correct rules...
                    const sourceWithTs = source.replace(/\.js$/, ".ts");
                    resolved = await this.resolve(
                        source,
                        importer.replace(/\.js$/, ".ts"),
                        {
                            ...options,
                            skipSelf: true,
                        }
                    );
                    if (resolved) {
                        console.log(
                            `heliosBundler: in vitest: resolving ${source} as ${sourceWithTs} for ${importer}`
                            // {
                            //     source,
                            //     importer,
                            //     resolved,
                            // }
                        );
                    }
                }
                if (isEntry && !importer) {
                    return resolved;
                }
                // let other resolvers resolve to an absolute filename
                const r = await this.resolve(source, importer, {
                    ...options,
                    skipSelf: true,
                });
                if (r) resolved = r;
                const id = resolved?.id || source;
                const p = relativePath(id);
                firstImportFrom[p] =
                    firstImportFrom[p] || relativePath(importer);
                if (resolved && id && filterHLB(id)) {
                    if (interesting && process.env.DEBUG) {
                        console.log("resolved absolute HLB id " + id, options);
                    }
                    if (pluginOptions.vite) {
                        // in vite, we allow resolution and loading to proceed without
                        // forking a separate compile-and-load sequence for an emitted chunk.
                        // Vite(st) uses in-memory techniques, so it doesn't support emitFile().
                        // nonetheless, our type-generation will create the appropriate
                        // typeInfo & bridge files for any .hlb.ts file loaded in vite/vitest.
                        return resolved;
                    } else {
                        // id is now an absolute filename of a (TS or JS) helios-bundle definition.
                        // before proceeding with returning a resolution for that file, let's
                        // try to push it through a depth-first compile, load it and generate types.
                        // const name = resolved.id.replace(
                        //     /.*\/([._a-zA-Z]*)\.hlb\.[jt]s$/,
                        //     "$1"
                        // );
                        const bundledId = `${id}?bundled`;

                        const name = resolved.id.replace(
                            /.*\/([._a-zA-Z]*)\.hlb\.[jt]s$/,
                            "$1"
                        );
                        const packageRelativeName = `contracts/${name}.hlb`;
                        const bundledExportName = `${thisPackageName}/${packageRelativeName}`;
                        //This arranges a convention for emitting a predictable
                        // exported file, used to connect the importer with emitted code
                        // using an expected import name
                        // Note: this requires subpath patterns for contracts/*.hlb
                        // to be part of the package.json exports field:
                        // ```
                        //   "exports": {
                        //       ".": { /* types, import, ...etc */ }
                        //       "./contracts/*.hlb": "./dist/contracts/*.hlb.mjs",
                        //      [...]
                        //   }
                        // ```
                        if (pluginOptions.emitBundled) {
                            // immediately starts resolving the file-for-emit, and returns a
                            // PACKAGE-RELATIVE name for the artifact.  The importer of
                            // the .hlb.ts file will get that translated import statement, and
                            // the emitFile acts like a fork, with the processing of the emitted
                            // file happening on a separate track.
                            // and the package-relative import name used in place of normal
                            // load/transform processing of the separate chunk.
                            console.log(
                                `  -- heliosBundler: emitting ${bundledExportName}`
                            );
                            const outputId = this.emitFile({
                                type: "chunk",
                                id: bundledId,
                                name: packageRelativeName,
                                importer,
                                // only valid for emitted assets, not chunks:
                                // originalFileName: resolved.id,
                            });
                        }
                        return bundledExportName;
                    }
                } else if (filterHlbundledImportName(id)) {
                    if (interesting && process.env.DEBUG) {
                        console.log("resolveId: got HLBundled: " + id, options);
                    }
                    // resolving the file-to-be-emitted - it's the same file, but as a
                    // dynamic entry-point.  We resolve it like any file, minus the ?bundled suffix,
                    // then load & transform as seen below.

                    // this call doesn't hit the path above, or cause an infinite loop,
                    //  because this.resolve() skips using this plugin's own resolveId hook.
                    const result = await this.resolve(
                        id.replace(/\?bundled$/, ""),
                        importer,
                        {
                            ...options,
                            skipSelf: true,
                        }
                    );
                    debugger;
                    return result;
                } else {
                    if (id.match(/hlb/) && !id.match(/hlbundled/)) {
                        console.log(
                            `HeliosBundler resolve: skipping due to filter mismatch (debugging breakpoint available)`,
                            { id, importer }
                        );
                        debugger;
                        //no-op, but helpful for debugging:
                        filterHLB(id); // trace into here to see what's up with the filter
                    }
                }
                return resolved;
            },
        },
        load: {
            order: "pre",
            handler: async function (
                this: PluginContext,
                id: string
            ): Promise<LoadResult> {
                // the source is a relative path name
                // the importer is an a fully resolved id of the imported module
                // console.log("heliosBundler: load");

                const interesting = !!id.match(/\.hlb\./);
                const { project } = state;
                if (filterHlbundledImportName(id)) {
                    if (process.env.DEBUG) console.log("    ---- heliosBundler: load", { id });
                    const indirectBundleId = id;
                    const referenceId = indirectBundleId.replace(
                        /\?bundled$/,
                        ""
                    );
                    const name = referenceId.replace(
                        /.*\/([._a-zA-Z]*)\.hlb\.[jt]s$/,
                        "$1"
                    );
                    console.log(
                        "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX emitFile chunk",
                        indirectBundleId
                    );
                    throw new Error(
                        `unused code path for broken emitFile in load `
                    );

                    //XXX emits meta information for an OUTPUT chunk, indirectly
                    //XXX resolving it to a separate output file.  This miniature chunk
                    //XXX of code ends up being transparently removed from the output,
                    //XXX with the indirectBundleId that was resolved above being replaced
                    //XXX with the output-file indicated in the import.meta... expression.

                    // doesn't work as expected - the emitted file simply references
                    // its own filename, not the bundled content.  see emitFile() above,
                    // in which a convention for emitting a predictable exported file
                    // is used to connect the importer with emitted code.
                    const outputId = this.emitFile({
                        type: "chunk",
                        id: indirectBundleId,
                        name: `contracts/${name}.hlbundled`,
                        // only valid for emitted assets, not chunks:
                        // originalFileName: resolved.id,
                    });
                    if (interesting) {
                        console.log("   ---- emitted chunkId", outputId);
                    }
                    return `export default import.meta.ROLLUP_FILE_URL_${outputId};`;
                }
                if (!filterHLB(id)) {
                    if (id.match(/hlb/) && !id.match(/hlbundled/)) {
                        console.log(
                            `HeliosBundler load: skipping due to filter mismatch (debugging breakpoint available)`,
                            { id }
                        );
                        debugger;
                        //no-op, but helpful for debugging:
                        filterHLB(id); // trace into here to see what's up with the filter
                    }

                    return null;
                }
                if (interesting && process.env.DEBUG) {
                    console.log("    ---- heliosBundler: load", { id });
                }

                // ->  todo: load an existing bundle if it's already compiled, and ask that class to
                // ->   check its sources for changes, so we can skip rollup and recompilation if
                // ->   things are already up-to-date.
                const SomeBundleClass = await rollupMakeBundledScriptClass(id);
                const relativeFilename = path.relative(projectRoot, id);
                console.log(
                    `   👁️  checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`
                );
                //??? addWatchFile for all the .hl scripts in the bundle
                // return null as LoadResult;

                let bundle = new SomeBundleClass({setup: {isMainnet:false}});
                // compile the program seen in that bundle!
                // ... to trigger helios syntax-checking:
                let program = bundle.program;

                let replacedCapo = false;
                if (SomeBundleClass.isCapoBundle) {
                    let skipInstallingThisOne = false;
                    if (state.hasExplicitCapoBundle) {
                        let existingBundleProtoChainNames: string[] = [];
                        // if the new class is just a base class for a more specific one, that's ok
                        // we will still return it, without installing it as "the" Capo bundle
                        let existingBundleProto = state.capoBundle.constructor;
                        while (existingBundleProto) {
                            existingBundleProtoChainNames.push(
                                existingBundleProto.name
                            );
                            existingBundleProto =
                                Object.getPrototypeOf(existingBundleProto);
                        }
                        if (
                            existingBundleProtoChainNames.includes(
                                SomeBundleClass.name
                            )
                        ) {
                            skipInstallingThisOne = true;
                            console.log(
                                `Helios project-loader: not adopting ${SomeBundleClass.name} as the project Capo\n` +
                                    `  ... because it looks like a base class of already-loaded ${state.capoBundle.constructor.name}`
                            );
                        } else {
                            // console.log({id, x, y})
                            debugger;
                        }
                    }
                    if (!state.capoBundle) {
                        console.log("\nTroubleshooting first .hlb.ts imports?");

                        for (const existing of state.project.bundleEntries.keys()) {
                            console.log(`    • ${traceImportPath(existing)}`);
                        }
                        console.log("");
                        // throw new Error(
                        //     `heliosBundler: Capo bundle not loaded, but there are already other bundles in the state (see import trace above)`
                        // );
                    } else {
                        if (state.hasOtherBundles && !skipInstallingThisOne) {
                            let dCur = shortHash(
                                JSON.stringify(state.capoBundle.modules)
                            );
                            let dNew = shortHash(
                                JSON.stringify(
                                    SomeBundleClass.prototype.modules
                                )
                            );

                            if (dCur !== dNew) {
                                throw new Error(`unreachable code path`);
                                logCapoBundleDifferences(
                                    dCur,
                                    state,
                                    dNew,
                                    SomeBundleClass,
                                    id
                                );
                                const ts1 = Date.now();
                                state.project =
                                    state.project.replaceWithNewCapo(
                                        id,
                                        SomeBundleClass
                                    );
                                console.log(
                                    "  ---- Reinitialized project in",
                                    Date.now() - ts1,
                                    "ms"
                                );
                                replacedCapo = true;
                            } else {
                                console.log(
                                    "  ---- warning: second capo discovered, though its modules aren't different from default. Generatings its types, but otherwise, Ignoring."
                                );
                                // make a new project, add the new Capo bundle to it, generate types.
                                const newProject = new StellarHeliosProject();
                                newProject.loadBundleWithClass(
                                    id,
                                    SomeBundleClass
                                );
                                newProject.generateBundleTypes(id);
                            }
                        }
                    }
                    state.hasExplicitCapoBundle = true;

                    bundle = new SomeBundleClass({setup: {isMainnet:false}});
                    if (!replacedCapo) {
                        // state.project.loadBundleWithClass(id, SomeBundleClass);
                        // state.project.generateBundleTypes(id);
                    }
                    console.log(
                        `   👁️  checking (Capo) helios bundle ${SomeBundleClass.name}`
                    );
                    if (!skipInstallingThisOne) {
                        state.capoBundle = bundle;
                        state.project.loadBundleWithClass(id, SomeBundleClass);
                        state.project.generateBundleTypes(id);
                    }
                } else {
                    state.hasOtherBundles = true;
                    if (state.project.bundleEntries.size === 0) {
                        console.log(
                            "looks like you're using the default Capo bundle. ok!\n"
                        );

                        const capoName = bundle.capoBundle.constructor.name;
                        if (
                            capoName == "CapoHeliosBundle" &&
                            !state.capoBundle
                        ) {
                            state.project.loadBundleWithClass(
                                "src/CapoHeliosBundle.ts",
                                bundle.capoBundle.constructor
                            );
                            state.project.generateBundleTypes(
                                "src/CapoHeliosBundle.ts"
                            );
                        }
                    }
                    // try {
                    //     bundle = new SomeBundleClass(state.capoBundle);
                    //     this.warn(`👁️ checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`)
                    // } catch (e:any) {
                    //     this.error(`Error loading helios bundle ${SomeBundleClass.name}: ${e.message}`);
                    // }
                    state.project.loadBundleWithClass(id, SomeBundleClass);
                    try {
                        state.project.generateBundleTypes(id);
                    } catch (e: any) {
                        if (e.message.match("compilerError")) {
                            console.error(e);
                            throw new Error(
                                `Error in Helios script (see above)`
                            );
                        }
                        console.error(`Error generating types for ${id}:\n`, e);
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                reject(
                                    new Error(
                                        `type-generation error (see above)`
                                    )
                                );
                            }, 5000);
                        });
                    }
                    if (process.env.DEBUG) {
                        this.warn("  ---- heliosRollupBundler: load: ok");
                    }
                }
                return null as LoadResult;
                //     id: source,
                // };
                //  throw new Error(`heliosLoader: ${importer} is importing ${source}`);
            },
        },
    };

    function traceImportPath(existing: string) {
        let trace: string[] = [];
        for (let p = existing; p; p = firstImportFrom[p]) {
            trace.push(p);
        }
        const importTrace = trace.join("\n      imported by ");
        return importTrace;
    }

    async function rollupMakeBundledScriptClass(inputFile: string) {
        // writes the output file next to the input file as *.hlBundled.mjs
        const outputFile = inputFile.replace(
            /\.hlb\.[tj]s$/,
            ".hlBundled.mjs" // ??? move to dist/ or .hltemp/?  hlbundle
        );
        if (inputFile == outputFile) {
            throw new Error(`inputFile cannot be the same as outputFile`);
        }

        const buildStartTime = Date.now();

        // throw new Error(inputFile);
        console.log(`📦 StellarHeliosProject: loading ${inputFile}`);
        let didWarn = false;
        const bundle = await rollup({
            input: inputFile,
            external(id) {
                return !/^[./]/.test(id);
            },

            onwarn(warning, warn) {
                if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
                if (warning.code === "CIRCULAR_DEPENDENCY") {
                    if (
                        warning.message ==
                            "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" ||
                        warning.message ==
                            "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts" ||
                        warning.message ==
                            "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts" ||
                        warning.message ==
                            "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts" ||
                        warning.message ==
                            "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts" ||
                        warning.message ==
                            "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts"
                    ) {
                        if (didWarn) return;
                        didWarn = true;
                        // warn("    ... all the usual Circular dependencies...")
                        return;
                    }
                }
                warn(warning);
            },
            plugins: [
                heliosRollupLoader({
                    // todo make this right for the context
                    project: "stellar-contracts",
                    // onLoadHeliosFile: (filename) => {
                    //   remember this list of files
                    // }
                }),
                // !!! figure out how to make the bundle include the compiled & optimized
                //   program, when options.compile is true.
                esbuild({
                    tsconfig: "./tsconfig.json",
                    target: ["node18"],

                    sourceMap: false,
                }),
                // after the build is finished, append the list of input files
                // in a way making it quick and easy to load an existing compiled
                // file and let it check its own input files for changes.  Then
                // we can save time and avoid this build step if everything is already good.
            ],
            // output: {
            //     file: this.compiledProjectFilename,
            //     sourcemap: true,
            //     format: "es",
            // },
        }).catch((error) => {
            console.error("Error during rollup of helios bundle:", error);
            throw error;
        });

        const result = await bundle.generate({ format: "es" });
        if (result.output.length > 1) {
            throw new Error(`unexpected: bundle should have one output`);
        }
        const compiled = result.output[0].code;
        let buildTime = Date.now() - buildStartTime;

        let needsWrite = true;
        // if the file is not changed, skip write of the compiled file
        if (existsSync(outputFile)) {
            const existing = readFileSync(outputFile, "utf-8");
            if (existing === compiled) {
                console.log(
                    `📦 StellarHeliosProject: unchanged bundle (${buildTime}ms): ${outputFile}`
                );
                needsWrite = false;
            }
        }
        if (needsWrite) {
            await bundle.write({
                file: outputFile,
                // sourcemap: true,  // ?? how to get this to work properly?  debugging goes to wrong site
                format: "es",
            });
            buildTime = Date.now() - buildStartTime;
            console.log(
                `📦 StellarHeliosProject: wrote compiled bundle (${buildTime}ms): ${outputFile}`
            );
        }
        bundle.close();
        return import(outputFile).then((mod) => {
            if (mod.default) {
                const BundleClass = mod.default;
                return BundleClass;
            } else {
                throw new Error(`no default export in ${outputFile}`);
            }
        });
    }

    async function makeCapoHeliosBundle() {
        // uses rollup to make a CapoHeliosBundle.mjs in .hltemp/typegen

        throw new Error(`not implemented2`);

        const outputFile = path.join(tempDir, "CapoHeliosBundle.mjs");
        console.log(
            `📦 StellarHeliosProject: making CapoHeliosBundle: ${outputFile}`
        );
        const buildStartTime = Date.now();
        let didWarn = false;
        const bundle = await rollup({
            input: path.join("src/CapoHeliosBundle.ts"),
            external(id) {
                return !/^[./]/.test(id);
            },
            onwarn(warning, warn) {
                if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
                if (warning.code === "CIRCULAR_DEPENDENCY") {
                    if (
                        warning.message ==
                            "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" ||
                        warning.message ==
                            "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts" ||
                        warning.message ==
                            "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts" ||
                        warning.message ==
                            "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts" ||
                        warning.message ==
                            "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts" ||
                        warning.message ==
                            "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts"
                    ) {
                        if (didWarn) return;
                        didWarn = true;
                        // warn("    ... all the usual Circular dependencies...")
                        return;
                    }
                }
                warn(warning);
            },
            plugins: [
                heliosRollupLoader({
                    project: "stellar-contracts",
                }),
                esbuild({
                    tsconfig: "./tsconfig.json",
                    target: ["node18"],
                    sourceMap: false,
                }),
            ],
        }).catch((error) => {
            console.error("Error during rollup of CapoHeliosBundle:", error);
            throw error;
        });
        const result = await bundle.generate({ format: "es" });
        const compiled = result.output[0].code;
        const buildTime = Date.now() - buildStartTime;
        console.log(
            `📦 CapoHeliosBundle: generated temporary bundle (${buildTime}ms): ${outputFile}`
        );
        let needsWrite = true;
        // if the file is not changed, skip write of the compiled file
        if (existsSync(outputFile)) {
            const existing = readFileSync(outputFile, "utf-8");
            if (existing === compiled ) {
                console.log(
                    `📦 CapoHeliosBundle: unchanged bundle (${buildTime}ms): ${outputFile}`
                );
                needsWrite = false;
            }
        }

        if (needsWrite) {
            await bundle.write({
                file: outputFile,
                format: "es",
            });
            console.log(
                `📦 CapoHeliosBundle: wrote compiled bundle (${buildTime}ms): ${outputFile}`
            );
        }

        console.log("importing CapoHeliosBundle");
        return import(outputFile).then((mod) => {
            console.log("CapoHeliosBundle loaded", outputFile);
            return mod.CapoHeliosBundle;
        });
    }
}

function logCapoBundleDifferences(
    digestExisting: string,
    state: HeliosBundlerPluginState,
    digestNew: string,
    SomeBundleClass: any,
    id: string
) {
    console.log(
        `existing = ${digestExisting}`,
        state.capoBundle.modules.map((x) =>
            JSON.stringify({
                name: x.name,
                content: shortHash(x.content),
            })
        )
    );
    console.log(
        `late arrival: ${digestNew}`,
        SomeBundleClass.prototype.modules.map((x) =>
            JSON.stringify({
                name: x.name,
                content: shortHash(x.content),
            })
        )
    );
    console.log("  ^^^^ from", id);
    console.log(
        "  ---- Late-arriving Capo.  Reinitializing project with updated dependencies..."
    );
}

function shortHash(str: string) {
    return bytesToHex(blake2b(textToBytes(str)).slice(0, 5));
}
