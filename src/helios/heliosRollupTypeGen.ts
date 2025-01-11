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
} from "rollup";
import esbuild from "rollup-plugin-esbuild";

// use design details for Copilot:
// import design from "./typegen-approach2.md" with { type: "markdown" };

import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import {
    loadCompilerLib,
} from "@helios-lang/contract-utils";
import { genTypes } from "@helios-lang/contract-utils";
import { StellarHeliosProject } from "./StellarHeliosProject.js";
import { heliosRollupLoader } from "./heliosRollupLoader.js";
import { bytesToHex } from "@helios-lang/codec-utils";
import { textToBytes } from "../HeliosPromotedTypes.js";

type TypeGenPluginState = {
    capoBundle: any; // CapoHeliosBundle;
    hasExplicitCapoBundle: boolean;
    hasOtherBundles: boolean;
    project: StellarHeliosProject;
}

/**
 * Rollup loader for generating typescript types from Helios source files
 * @summary
 * This rollup plugin is designed to be used in a rollup configuration
 * to generate typescript types from Helios source files.
 *
 * The plugin is designed to be used in conjunction with the helios rollup loader,
 * which compiles the helios source files into javascript.
 *
 * The following Rollup build hooks are used to make it all happen:
 * - buildStart: in this hook, any existing hlproject.mjs file is loaded, or a fresh project is created.
 * - resolveId: this hook is used to intercept the import of the helios bundle files, and use the
 *   project to generate updated types if needed and available.
 * @public
 **/
export function heliosRollupTypeGen(
    opts: { include?: string; exclude?: string[]; project?: string } = {}
) {
    const options = {
        ...{
            include: /.*\.hlb\.[jt]s$/,
            exclude: [],
            project: "",
        },
        ...opts,
    };

    // creates a temporary directory for dynamic loading,
    // in the project-root's .temp directory
    const tempDir = path.join(process.cwd(), ".hltemp", "typeGen");
    // create the tempdir if needed
    if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
    }
    // console.log(`heliosTypeGen: using tempDir: ${tempDir}`);

    const filter = createFilter(options.include, options.exclude);
    // const project = options.project ? `${options.project}` : "";

    const lib = loadCompilerLib();

    const projectRoot = StellarHeliosProject.findProjectRoot();
    //read package.json from project root, parse and check its package name
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const isStellarContracts = "@donecollectively/stellar-contracts" === packageJson.name;

    const state : TypeGenPluginState = {
        capoBundle: null, // new CapoHeliosBundle(),
        hasExplicitCapoBundle: false,
        hasOtherBundles: false,
        project: new StellarHeliosProject()
    };

    const isJavascript = /\.js$/;
    return {
        name: "helios-type-gen",
        async buildStart(
            this: PluginContext,
            options: InputOptions
        ): Promise<void> {
            console.log("heliosTypeGen: buildStart WITHOUT StellarHeliosProject");
            return;

            if (isStellarContracts) {
                this.warn("building in stellar-contracts project");
                const existingBuildFile = `${projectRoot}/dist/stellar-contracts.mjs`;
                let CapoBundleClass;
                // if the build is present, that doesn't mean it's not obsolete,
                // so instead of using it, we will make a minimal build of the
                // CapoHeliosBundle, knowing it will always be up-to-date.

                // if (existsSync(existingBuildFile)) {
                //     await import(existingBuildFile).then((module) => {
                //         const {CapoHeliosBundle} = module
                //         CapoBundleClass = CapoHeliosBundle;
                //     }).catch( (e: any) => {
                //         this.warn("couldn't import existing stellar-contracts build: " + e.message)
                //     })
                // } else {
                //     this.warn(`no existing stellar-contracts build in ${existingBuildFile}`);
                // }
                
                if (CapoBundleClass) {
                    // this is the implicit Capo bundle
                    state.capoBundle = new CapoBundleClass();
                    // we might get an explicit bundle added later.
                    // state.hasExplicitCapoBundle = true;
                } else {
                    // this.warn("stellar-contracts: NOT validating helios scripts during build");
                    // this.warn("  -- make sure you run the bootstrap build (NOT vitest) ");
                    // this.warn("  -- ... to enable script validation and type generation");
                    // this.warn("  -- ... (maybe that's happening right now :)");

                    // console.log("making minimal rollup of CapoHeliosBundle");
                    // const CapoBundleClass = await makeCapoHeliosBundle();
                    // state.capoBundle = new CapoBundleClass();
                    // load the program
                    // const program = state.capoBundle.program;
                    // 
                    // program.entryPoint.mainArgTypes;
                    console.log("NO minimal CapoHeliosBundle rollup");
                }
            } else {
                //!!! verify this works
                const ourProject = "@donecollectively/stellar-contracts"
                import(ourProject).then(({CapoHeliosBundle}) => {
                    console.log("finished loading CapoHeliosBundle");
                    state.capoBundle = new CapoHeliosBundle();
                }).catch((e) => {
                    throw new Error(`couldn't import CapoHeliosBundle: ${e.message}`);
                })
                console.log("finished initializing CapoHeliosBundle");
            }
        
            state.project = new StellarHeliosProject();
        },
        buildEnd: {
            order: "pre",
            handler(this: PluginContext, error?: Error) {
                // write the project file after the build, skipping any
                // pending delay from calls to `deferredWriteProjectFile()`
                console.log("heliosTypeGen: buildEnd: " + error ? "error: " : "" + error?.message);
                // return state.project.writeProjectFile();
            },
        },
        resolveId: {
            order: "pre",
            async handler(this: PluginContext, source, importer, options) {
                // console.log("heliosTypeGen: resolveId", { source, importer });
                // if (source.match(/\.hlb/)) {
                //     throw new Error(
                //         `first .hlb file is being loaded by ${importer}`
                //     );
                // }
                const {project} = state;
                if (
                    importer?.match(isJavascript) &&
                    source?.match(isJavascript) &&
                    importer?.indexOf(project.projectRoot) === 0
                ) {
                    // work around vitest not resolving .ts files from .js using
                    // the correct rules...
                    const sourceWithTs = source.replace(/\.js$/, ".ts");
                    const resolved = await this.resolve(
                        source,
                        importer.replace(/\.js$/, ".ts"),
                        {
                            ...options,
                            skipSelf: true,
                        }
                    );
                    if (resolved) {
                        console.log(
                            `heliosTypeGen: in vitest: resolving ${source} as ${sourceWithTs} for ${importer}`
                            // {
                            //     source,
                            //     importer,
                            //     resolved,
                            // }
                        );
                        return resolved;
                    }
                }
            },
        },
        load: {
            order: "pre",
            handler: async function (this: PluginContext, id: string): Promise<LoadResult> {
                // the source is a relative path name
                // the importer is an a fully resolved id of the imported module
                // console.log("heliosTypeGen: load");

                const {project} = state;
                if (!filter(id)) {
                    if (id.match(/hlb/)) {
                        console.log(
                            `typeGen resolve: skipping due to filter mismatch`,
                            { source: id }
                        );
                        debugger;
                        //no-op, but helpful for debugging:
                        filter(id); // trace into here to see what's up with the filter
                    }

                    return null;
                }

                // todo: load an existing bundle if it's already compiled, and ask that class to
                //   check its sources for changes, so we can skip rollup and recompilation if
                //   things are already up-to-date.
                const SomeBundleClass = await rollupMakeBundledScriptClass(id);
                const relativeFilename = path.relative(projectRoot, id);
                this.warn(`👁️ checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`)
                //??? addWatchFile for all the .hl scripts in the bundle
                // return null as LoadResult;

                let bundle = new SomeBundleClass()
                // compile the program seen in that bundle!
                // ... to trigger helios syntax-checking:
                let program = bundle.program;
 
                let replacedCapo = false
                if (SomeBundleClass.isCapoBundle) {
                    let skipInstallingThisOne = false; 
                    if (state.hasExplicitCapoBundle) {
                            let existingBundleProtoChainNames : string[]= [];
                            // if the new class is just a base class for a more specific one, that's ok
                            // we will still return it, without installing it as "the" Capo bundle
                            let existingBundleProto = state.capoBundle.constructor;
                            while (existingBundleProto) {
                                existingBundleProtoChainNames.push(existingBundleProto.name);
                                existingBundleProto = Object.getPrototypeOf(existingBundleProto);
                            }
                            if (existingBundleProtoChainNames.includes(SomeBundleClass.name)) {
                                skipInstallingThisOne = true
                                console.log(
                                    `Helios project-loader: not adopting ${SomeBundleClass.name} as the project Capo\n`+
                                    `  ... because it looks like a base class of already-loaded ${
                                        state.capoBundle.constructor.name
                                    }`
                                )
                            } else {
                                // console.log({id, x, y})
                                debugger
                            }


                    } 
                    if (state.hasOtherBundles && !skipInstallingThisOne) {
                        const digestExisting = shortHash(JSON.stringify(state.capoBundle.modules));
                        const digestNew = shortHash(JSON.stringify(SomeBundleClass.prototype.modules));

                        if (digestExisting !== digestNew) {
                            console.log(`existing = ${digestExisting}`, state.capoBundle.modules.map(x => (JSON.stringify({name: x.name, content: shortHash(x.content)}))))
                            console.log(`late arrival: ${digestNew}`, SomeBundleClass.prototype.modules.map( x => (JSON.stringify({name: x.name, content: shortHash(x.content)}))))
                            console.log("  ^^^^ from", id)
                            console.log("  ---- Late-arriving Capo.  Reinitializing project with updated dependencies...");
                            const ts1 = Date.now();
                            state.project = state.project.replaceWithNewCapo(id, SomeBundleClass);
                            console.log("  ---- Reinitialized project in", Date.now() - ts1, "ms");
                            replacedCapo = true;
                        } else {
                            console.log("  ---- warning: second capo discovered, though its modules aren't different from default. Generatings its types, but otherwise, Ignoring.")
                            // make a new project, add the new Capo bundle to it, generate types.
                            const newProject = new StellarHeliosProject();
                            newProject.loadBundleWithClass(id, SomeBundleClass);
                            newProject.generateBundleTypes(id);
                        }
                    }
                    state.hasExplicitCapoBundle = true;

                    bundle =  new SomeBundleClass();
                    if (!replacedCapo) {
                        // state.project.loadBundleWithClass(id, SomeBundleClass);
                        // state.project.generateBundleTypes(id);
                    }
                    console.log(` 👁️ checking (Capo) helios bundle ${SomeBundleClass.name}`)
                    if (!skipInstallingThisOne) {
                        state.capoBundle = bundle;
                        state.project.loadBundleWithClass(id, SomeBundleClass);
                        state.project.generateBundleTypes(id);
                    }
                } else {
                    state.hasOtherBundles = true;
                    if (state.project.bundleEntries.size === 0 ) {
                        console.log("looks like you're using the default Capo bundle. ok!\n");

                        const capoName = bundle.capoBundle.constructor.name;
                        if (capoName == "CapoHeliosBundle" && !state.capoBundle) {
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
                        state.project.generateBundleTypes(id)
                    } catch(e:any) {
                        if (e.message.match("compilerError")) {
                            console.error(e);
                            throw new Error(`Error in Helios script (see above)`);
                        }
                        console.error(`Error generating types for ${id}:\n`, e);
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                reject(new Error(`type-generation error (see above)`));
                            }, 5000)
                        })
                    }
                    this.warn("ok")
                }
                return null as LoadResult;
                //     id: source,
                // };
                //  throw new Error(`heliosLoader: ${importer} is importing ${source}`);
            },
        },
    };
    
    async function rollupMakeBundledScriptClass(inputFile: string) {
        // writes the output file next to the input file as *.hlb.bundled.mjs
        const outputFile = inputFile.replace(
            /\.hlb\.[tj]s$/,
            ".hlb.bundled.mjs" // ??? move to dist/ or .hltemp/?  hlbundle
        );
        if (inputFile == outputFile) {
            throw new Error(`inputFile cannot be the same as outputFile`);
        }

        const buildStartTime = Date.now();

        // throw new Error(inputFile);
        console.log(`📦 StellarHeliosProject: loading ${inputFile}`);
        const bundle = await rollup({
            input: inputFile,
            external(id) {
                return !/^[./]/.test(id);
            },
            onwarn( warning, warn ) {
                if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
                if (warning.code === 'CIRCULAR_DEPENDENCY') {
                    if (warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts") {
                        return
                        // console.log("   --- suppressed circular dependency warning");
                    }
                    if (warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts") {
                        return
                    }
                }

                warn(warning);
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
        const buildTime = Date.now() - buildStartTime;

        let needsWrite = true
        // if the file is not changed, skip write of the compiled file
        if (existsSync(outputFile)) {
            const existing = readFileSync(outputFile, "utf-8");
            if (existing === compiled) {
                console.log(
                    `📦 StellarHeliosProject: unchanged bundle (${buildTime}ms): ${outputFile}`
                );
                needsWrite = false
            }
        }
        if (needsWrite) {
            await bundle.write({
                file: outputFile,
                // sourcemap: true,  // ?? how to get this to work properly?  debugging goes to wrong site
                format: "es",
            });
            console.log(
                `📦 StellarHeliosProject: wrote compiled bundle (${buildTime}ms): ${outputFile}`
            );
        }
        bundle.close();
        return import(outputFile).then((mod) => {
            if (mod.default) {
                const BundleClass = mod.default;
                return BundleClass
            } else {
                throw new Error(`no default export in ${outputFile}`);
            }
        });
    }

    async function makeCapoHeliosBundle() {
        // uses rollup to make a CapoHeliosBundle.mjs in .hltemp/typegen

        throw new Error(`not implemented2`);

        const outputFile = path.join(tempDir, "CapoHeliosBundle.mjs");
        console.log(`📦 StellarHeliosProject: making CapoHeliosBundle: ${outputFile}`);
        const buildStartTime = Date.now();
        const bundle = await rollup({
            input: path.join("src/CapoHeliosBundle.ts"),
            external(id) {
                return !/^[./]/.test(id);
            },
            onwarn( warning, warn ) {
                if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
                if (warning.code === 'CIRCULAR_DEPENDENCY') {
                    if (warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts") {
                        return
                        // console.log("   --- suppressed circular dependency warning");
                    }
                    if (warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts") {
                        return
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
        console.log(`📦 CapoHeliosBundle: generated temporary bundle (${buildTime}ms): ${outputFile}`);
        let needsWrite = true;
        // if the file is not changed, skip write of the compiled file
        if (existsSync(outputFile)) {
            const existing = readFileSync(outputFile, "utf-8");
            if (existing === compiled) {
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
        })
    }
}


function shortHash(str: string) {
    return bytesToHex(blake2b(textToBytes(str)).slice(0, 5));
}