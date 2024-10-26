import { blake2b } from "@helios-lang/crypto";
import { bytesToHex, textToBytes } from "@hyperionbt/helios";
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

// import CapoBundle from "../Capo.hlbundle.js";
import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";
import {
    LoadedScriptsWriter,
    loadCompilerLib,
    typeCheckScripts,
} from "@helios-lang/contract-utils";
import { genTypes } from "@helios-lang/contract-utils";
import { StellarHeliosProject } from "./StellarHeliosProject.js";
import { heliosRollupLoader } from "./heliosRollupLoader.js";

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
            include: /.*\.hlbundle\.[jt]s$/,
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
            console.log("heliosTypeGen: buildStart");

            if (isStellarContracts) {
                this.warn("building in stellar-contracts project");
                const existingBuildFile = `${projectRoot}/dist/stellar-contracts.mjs`;
                let CapoBundleClass;
                if (existsSync(existingBuildFile)) {
                    await import(existingBuildFile).then((module) => {
                        const {CapoHeliosBundle} = module
                        CapoBundleClass = CapoHeliosBundle;
                    }).catch( (e: any) => {
                        this.warn("couldn't import existing stellar-contracts build: " + e.message)
                    })
                } else {
                    this.warn(`no existing stellar-contracts build in ${existingBuildFile}`);
                }
                
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

                    console.log("making minimal rollup of CapoHeliosBundle");
                    const CapoBundleClass = await makeCapoHeliosBundle();
                    state.capoBundle = new CapoBundleClass();
                    state.capoBundle.program.entryPoint.mainArgTypes;
                    console.log("Ok loaded minimal CapoHeliosBundle rollup");
                }
            } else {
                //!!! verify this works
                import("@donecollectively/stellar-contracts").then(({CapoHeliosBundle}) => {
                    state.capoBundle = new CapoHeliosBundle();
                }).catch((e) => {
                    throw new Error(`couldn't import CapoHeliosBundle: ${e.message}`);
                })
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
                // if (source.match(/\.hlbundle/)) {
                //     throw new Error(
                //         `first hlbundle is being loaded by ${importer}`
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
                    if (id.match(/hlbundle/)) {
                        console.log(
                            `typeGen resolve: skipping due to filter mismatch`,
                            { source: id }
                        );
                        debugger;
                        filter(id);
                    }

                    return null;
                }

                const SomeBundleClass = await rollupSingleBundleToBundleClass(id);
                let bundle;
                let isHarmlessCapoOverlap = false
                if (SomeBundleClass.isCapoBundle) {
                    if (state.hasExplicitCapoBundle) {
                        throw new Error(
                            `only one Capo bundle is allowed in a project`
                        )
                    } else if (state.hasOtherBundles) {
                        const digestExisting = shortHash(JSON.stringify(state.capoBundle.modules));
                        const digestNew = shortHash(JSON.stringify(SomeBundleClass.prototype.modules));

                        if (digestExisting !== digestNew) {
                            console.log("Late-arriving Capo.  Project has these bundles already loaded: ", [...state.project.bundleEntries.values()].map(x => x.filename))
                            console.log(`existing = ${digestExisting}`, state.capoBundle.modules.map(x => (JSON.stringify({name: x.name, content: shortHash(x.content)}))))
                            console.log(`late arrival: ${digestNew}`, SomeBundleClass.prototype.modules.map( x => (JSON.stringify({name: x.name, content: shortHash(x.content)}))))
                            console.log(" ^^^ from", id)
                            throw new Error(
                                `Capo bundle must be the first bundle loaded in a project`
                            )
                        } else {
                            // possibly just start a new project when this happens
                            console.log("Warning: new capo bundle has the same modules as the existing one.  Try to load it first if you have any problems with its content being available to your other bundles");
                            isHarmlessCapoOverlap = true;
                        }
                    } else {
                        state.hasExplicitCapoBundle = true;
                    }
                    bundle =  new SomeBundleClass();
                    // just-in-time load of custom capo bundle to project
                    if (isHarmlessCapoOverlap) {
                        state.project.loadBundleWithClass(id, SomeBundleClass, isHarmlessCapoOverlap);
                        state.project.generateBundleTypes(id);
                    } else {                        
                        state.project.loadBundleWithClass(id, SomeBundleClass);
                        state.project.generateBundleTypes(id);
                        state.capoBundle = bundle;
                    }
                    this.warn(` 👁️ checking (Capo) helios bundle ${SomeBundleClass.name}`)
                    if (bundle.loadSources) {
                        // ??? load from filesystem, not from the bundle
                        bundle.loadSources();
                    } else {
                        this.warn(`NOTE: checking bundled sources, not filesystem sources`)
                    }
                } else {
                    state.hasOtherBundles = true;
                    if (state.project.bundleEntries.size === 0 ) {
                        // just-in-time load of default capoBundle
                        state.project.loadBundleWithClass("src/CapoHeliosBundle.ts", state.capoBundle.constructor);
                        state.project.generateBundleTypes("src/CapoHeliosBundle.ts");
                    }

                    try {
                        bundle = new SomeBundleClass(state.capoBundle);
                        const relativeFilename = path.relative(projectRoot, id);
                        this.warn(`👁️ checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`)
                    } catch (e:any) {
                        this.error(`Error loading helios bundle ${SomeBundleClass.name}: ${e.message}`);
                    }
                    state.project.loadBundleWithClass(id, SomeBundleClass);
                    try {
                        // triggers helios syntax-checking:
                        state.project.generateBundleTypes(id)
                    } catch(e:any) {
                        if (e.message.match("compilerError")) {
                            console.error(e);
                            throw new Error(`Error in Helios script (see above)`);
                        }
                        console.error(`Error generating types for ${id}`, e);
                        throw new Error(`type-generation error`);
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
    
    async function rollupSingleBundleToBundleClass(inputFile: string) {
        // writes the output file next to the input file as *.hlbundle.compiled.mjs
        const outputFile = inputFile.replace(
            /\.hlbundle\.[tj]s$/,
            ".hlbundle.compiled.mjs"
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
            const BundleClass = mod.default;
            return BundleClass
            // todo: get Capo bundle first, then instantate non-Capo bundles with it as arg
        });
    }

    async function makeCapoHeliosBundle() {
        // uses rollup to make a CapoHeliosBundle.mjs in .hltemp/typegen
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
        console.log(`📦 CapoHeliosBundle: generated bundle (${buildTime}ms): ${outputFile}`);

        throw new Error(`unused?`)
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

        return import(outputFile).then((mod) => {
            console.log("CapoHeliosBundle loaded", mod.CapoHeliosBundle);
            return mod.CapoHeliosBundle;
        })
    }
}


function shortHash(str: string) {
    return bytesToHex(blake2b(textToBytes(str)).slice(0, 5));
}