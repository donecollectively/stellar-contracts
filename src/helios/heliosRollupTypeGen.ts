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
    type PluginContext,
    type LoadHook,
} from "rollup";

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

    let project: StellarHeliosProject;
    let capoBundle: any;
    const lib = loadCompilerLib();

    const isJavascript = /\.js$/;
    return {
        name: "helios-type-gen",
        async buildStart(
            this: PluginContext,
            options: InputOptions
        ): Promise<void> {
            console.log("heliosTypeGen: buildStart");
            const loading = StellarHeliosProject.loadExistingProject();
            if (loading) {
                project = await loading;
                // write all the types for the bundles loaded in the project
                project.generateBundleTypes();
            } else {
                project = new StellarHeliosProject();
                // gives the rollup build a chance to gather all new bundles at once
                project.deferredWriteProjectFile(5000);
            }
            this.addWatchFile(project.projectFilename);
            this.addWatchFile(project.compiledProjectFilename);
        },
        buildEnd: {
            order: "pre",
            handler(this: PluginContext, error?: Error) {
                // write the project file after the build, skipping any
                // pending delay from calls to `deferredWriteProjectFile()`
                console.log("heliosTypeGen: buildEnd");
                return project.writeProjectFile();
            },
        },
        resolveId: {
            order: "pre",
            async handler(this: PluginContext, source, importer, options) {
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
            handler: function (id: string) {
                // the source is a relative path name
                // the importer is an a fully resolved id of the imported module
                // console.log("heliosTypeGen: resolveId");

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

                const isTypescript = id.match(/\.hlbundle\.ts$/);
                if (isTypescript) {
                    // throw new Error(
                    //     `${id} should be a .js file, not a .ts file (HeliosTypeGen will provide types for it)`
                    // );

                    console.log("heliosTypeGen: found Typescript .hlbundle.ts (not .js):", id);
                    const ignoredFile = id.replace(/.*\/(.*.hlbundle).ts/, "$1.d.ts.ignored");
                    console.log(
                        `Generating types in \`${ignoredFile}\` for your reference\n` +
                            "   ... this will be ignored by Typescript, but you can copy the types from it to your .ts file\n" +
                            "   ... to keep them synced manually with the discovered types from your Helios source\n"
                    );
                    console.log(
                        "To automatically use generated types, use the *.hlbundle.js file type instead of .ts\n\n"
                    );
                    project.registerBundle(id, ".d.ts.ignored")
                }
                if (project.hasBundleClass(id)) {
                    //      writing types is handled in a batch at the top
                    //      project.writeTypeInfo(id);
                } else if (!isTypescript){
                    project.registerBundle(id)
                }
                return null;
                //     id: source,
                // };
                //  throw new Error(`heliosLoader: ${importer} is importing ${source}`);
            } as LoadHook,
        },
    };

    const transform = {
        order: "post",
        async handler(code, id) {
            // if (id.match(/\.hlbundle/) ) debugger
            if (filter(id)) {
                const relPath = path.relative(".", id);
                console.warn(
                    `heliosTypeGen: extracting types for ${relPath} = ${id}`
                );
                // generates a temporary .js file with the transformed code
                const hashedId = bytesToHex(blake2b(textToBytes(id))).substring(
                    0,
                    8
                );
                const tempFile = path.join(tempDir, `${hashedId}.js`);
                writeFileSync(tempFile, code);
                // dynamically imports that file.
                console.log("importing hlbundle", id);
                const module = await import(`file://${tempFile}`);
                debugger;
                if (!module.default) {
                    console.error(
                        `heliosTypeGen: must use 'export default' on the bundle class: ${relPath}`
                    );
                }
                let thisBundle: HeliosScriptBundle;
                // detect whether the class inherits from CapoBundle
                let isCapoBundle = module.default.name == "CapoBundle";
                debugger;
                // module.default.prototype instanceof CapoBundle
                if (isCapoBundle) {
                    // if so, we can instantiate it directly.
                    thisBundle = capoBundle = new module.default();
                } else {
                    // otherwise, instantiate it using the existing CapoBundle instance.
                    if (!capoBundle) {
                        //  (the developer is expected to import the CapoBundle before importing
                        // any other bundle that depends on it).
                        console.error(
                            `heliosTypeGen: no CapoBundle instance is imported yet, to satisfy lib deps for ${relPath}`
                        );
                    }
                    thisBundle = new module.default(capoBundle);
                }
                const ts1 = Date.now();
                // console.log("starting compile", ts1)
                // with the created instance of the bundle, it runs the helios compiler on that bundle.
                return thisBundle.program
                    .compileCached(false)
                    .then((compiled) => {
                        // const types = thisBundle.program.
                        if (false) {
                            const ts2 = Date.now();
                            console.log("compile: ", ts2 - ts1, "ms");
                            // triggers type-generation from the helios types seen in the bundle
                            const { modules, validators } = typeCheckScripts(
                                lib,
                                [
                                    thisBundle.main.content,
                                    ...thisBundle.modules.map((m) => m.content),
                                ]
                            );
                            const ts3 = Date.now();
                            console.log("typecheck: ", ts3 - ts2, "ms");

                            const [js, dts, ts] = LoadedScriptsWriter.new()
                                // .writeModules(modules, false)
                                .writeValidators(validators)
                                .finalize();
                            console.log(
                                "generate types: ",
                                Date.now() - ts3,
                                "ms"
                            );
                            const typesPath = id.replace(
                                /\.hlbundle\.js$/,
                                "Types.d.ts"
                            );
                            console.log(`writing types to ${typesPath}`);
                            writeFileSync(typesPath, ts);
                        }
                    });
                console.log({ code });
                // import(id).then((mod) => {
                //     console.log({ mod });
                // })
            }
            return null;
        },
    };
}
