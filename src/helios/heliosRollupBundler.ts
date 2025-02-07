import { inspect } from "util";
import { blake2b } from "@helios-lang/crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createFilter } from "rollup-pluginutils";
import MagicString from "magic-string";
import {
    type InputOptions,
    type ResolveIdHook,
    type ResolveDynamicImportHook,
    type ResolveIdResult,
    type PartialResolvedId,
    type LoadResult,
    type PluginContext,
    type SourceDescription,
    type LoadHook,
    type CustomPluginOptions,
    rollup,
    type ResolvedId,
} from "rollup";

import { StellarHeliosProject } from "./StellarHeliosProject.js";
import { bytesToHex } from "@helios-lang/codec-utils";
import { textToBytes } from "../HeliosPromotedTypes.js";
import { rollupCreateHlbundledClass } from "./rollupPlugins/rollupCreateHlbundledClass.js";
import type { HeliosScriptBundle } from "./HeliosScriptBundle.js";

type HeliosBundlerPluginState = {
    capoBundle: any; // CapoHeliosBundle;
    hasExplicitCapoBundle: boolean;
    hasOtherBundles: boolean;
    project: StellarHeliosProject;
    bundleClassById: Record<string, any>;
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

    const regexCurrentCapoConfig =
        /^@donecollectively\/stellar-contracts\/currentCapoConfig$/;

    const filterHlbundledImportName = createFilter(/.*\.hlb\.[jt]s\?bundled/);
    // const project = options.project ? `${options.project}` : "";

    const netName = process.env.CARDANO_NETWORK;
    if (!netName) {
        console.warn(
            "missing CARDANO_NETWORK environment variable; building for 'preprod'"
        );
    }
    const networkId = netName || "preprod";

    // const lib = loadCompilerLib();
    const { projectRoot, packageJSON } =
        StellarHeliosProject.findProjectDetails();

    const thisPackageName = packageJSON.name;
    //read package.json from project root, parse and check its package name
    // const packageJsonPath = path.join(projectRoot, "package.json");
    // const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const isStellarContracts =
        "@donecollectively/stellar-contracts" === packageJSON.name;

    const state: HeliosBundlerPluginState = {
        capoBundle: null, // new CapoHeliosBundle(),
        hasExplicitCapoBundle: false,
        hasOtherBundles: false,
        project: new StellarHeliosProject(),
        bundleClassById: {},
    };

    const firstImportFrom: Record<string, string> = {};

    function relativePath(id: string) {
        return id.replace(`${projectRoot}/`, "");
    }
    const isJavascript = /\.js$/;

    const placeholderSetup = {
        setup: {
            isMainnet: false,
            isPlaceholder: "rollupBundlerPlugin for type-gen",
        }
    };

    return {
        name: "helios-type-gen",
        buildEnd: {
            order: "pre",
            handler(this: PluginContext, error?: Error) {
                // write the project file after the build, skipping any
                // pending delay from calls to `deferredWriteProjectFile()`
                console.log(
                    "heliosBundler @buildEnd: " +
                        (error ? "error: " + error?.message : "")
                );
                if (pluginOptions.vite) return;
                this.emitFile({
                    type: "asset",
                    fileName: "needResolverConditions.mjs",
                    source: resolverConditionsHelper(),
                });
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
                    this.warn(
                        `patching up a vitest resolution: ${importer} imported ${source}`
                    );
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
                        // Before proceeding with returning a resolution for that file, let's
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
                        const buildGenericArtifacts = !!isStellarContracts;
                        const netIdSuffix = buildGenericArtifacts
                            ? ""
                            : `-${networkId}`;

                        const packageRelativeName = `contracts${netIdSuffix}/${name}.hlb`;
                        const bundledExportName = `${thisPackageName}/${packageRelativeName}`;
                        //This arranges a convention for emitting a predictable
                        // exported file, used to connect the importer with emitted code
                        // using an expected import name
                        // Note: this requires subpath patterns for contracts/*.hlb
                        // to be part of the package.json exports field:
                        // ```
                        //   "exports": {
                        //       ".": { /* types, import, ...etc */ }
                        //       "./contracts/*.hlb": {
                        //             "network-preprod": "./dist/contracts-preprod/*.hlb.mjs",
                        //             "network-mainnet": ""./dist/contracts-mainnet/*.hlb.mjs",
                        //       }
                        //      [...]
                        //   }
                        // ```
                        if (pluginOptions.emitBundled) {
                            const result = await this.resolve(
                                id,
                                importer,
                                options
                            );
                            if (result?.id) {
                                const SomeBundleClass =
                                    await rollupCreateHlbundledClass(result.id);

                                const isMainnet = networkId === "mainnet";

                                state.bundleClassById[id] = SomeBundleClass;
                                const hlBundler: HeliosScriptBundle =
                                    new SomeBundleClass({
                                        ...placeholderSetup,
                                        placeholderAt: "variant generation",
                                    });

                                const scriptVariants = hlBundler.variants;
                                for (const [
                                    variant,
                                    baseParams,
                                ] of Object.entries(scriptVariants)) {
                                    const compiled =
                                        await hlBundler.withSetupDetails({
                                            params: baseParams,
                                            setup: { isMainnet },
                                        });

                                    // immediately starts resolving the file-for-emit, and returns a
                                    // PACKAGE-RELATIVE name for the artifact.  The importer of
                                    // the .hlb.ts file will get that translated import statement, and
                                    // the emitFile acts like a fork, with the processing of the emitted
                                    // file happening on a separate track.
                                    // and the package-relative import name used in place of normal
                                    // load/transform processing of the separate chunk.
                                    console.log(
                                        `  -- heliosBundler: emitting ${packageRelativeName}`
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
                            }
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
                    return result;
                } else {

                    if (
                        id.match(/hlb/) &&
                        !id.match(/hlBundled/) &&
                        !id.match(/dist\//)
                    ) {
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
                    // NOTE: the filterHlbundledImportName branch
                    // in the resolveId hook above ensures that we NEVER
                    // arrive here.  Instead, the load process continues
                    // normally, but with the output emitted to the separate
                    // chunk whose emitFile() is initiated above.
                    //
                    // See the transform hook for the details we add to the .hlb

                    throw new Error(
                        `unused code path for broken emitFile in load `
                    );
                }
                if (!filterHLB(id)) {
                    if (
                        id.match(/hlb/) &&
                        !id.match(/hlBundled/) &&
                        !id.match(/dist\//)
                    ) {
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
                let SomeBundleClass = state.bundleClassById[id];

                if (!SomeBundleClass) {
                    if (pluginOptions.emitBundled) {
                        this.warn(
                            `heliosBundler: missing expected bundleClass for ${id} (debugging breakpoint available)`
                        );
                        debugger;
                    }
                    SomeBundleClass = await rollupCreateHlbundledClass(id);
                }
                const relativeFilename = path.relative(projectRoot, id);
                console.log(
                    `   👁️  checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`
                );
                //??? addWatchFile for all the .hl scripts in the bundle
                // return null as LoadResult;

                let bundle = new SomeBundleClass({
                    ...placeholderSetup,
                    placeholderAt: "load() before type-gen",
                });
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
                            throw new Error(`unreachable code path??`);
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

                    // bundle = new SomeBundleClass({
                    //     ...placeholderSetup,
                    //     placeholderAt: "redundant thing?",
                    // });
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

        async transform(this: PluginContext, code: string, id: string) {
            if (!filterHLB(id)) return;
            let looksLikeCapo = code.match(/extends .*Capo.*/);
            if (looksLikeCapo?.[0].match(/usingCapoBundle/))
                looksLikeCapo = null;

            const capoConfigRegex =
                /^(\s*preConfigured *= )*(?:capoConfigurationDetails)(?:\s|$)/m;
            // const tester = `            preConfigured = mkCapoDeployment`
            const filenameBase = id.replace(/.*\/([^.]+)\..*$/, "$1");
            const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
            if (!code.match(capoConfigRegex)) {
                if (looksLikeCapo) {
                    debugger;
                    this.warn(
                        `It looks like this is a Capo bundle class without a currentDeploymentConfig in ${id}`
                    );
                    console.log(
                        `  import {currentDeploymentConfig} from "@donecollectively/stellar-contracts"`
                    );
                    console.log(
                        `  ... and add  'preConfigured = capoConfigurationDetails' to your class.`
                    );
                    console.log(
                        `This will use configuration details from its ${deployDetailsFile}`
                    );
                    console.log(
                        `  ... or another json file when deploying to a different network`
                    );
                }
                return null;
            }
            if (!looksLikeCapo) {
                this.warn(
                    `non-Capo class using currentDeploymentConfig in ${id}`
                );
            }
            debugger;

            const s = new MagicString(code);
            const resolvedDeployConfig = await this.resolve(
                deployDetailsFile,
                id,
                {
                    // attributes: {type: "json" },
                }
            );
            if (!resolvedDeployConfig) {
                this.warn(
                    `no ${networkId} deployDetails for Capo bundle: ${deployDetailsFile}`
                );
            } else {
                const deployDetailsConfigJSON = readFileSync(
                    resolvedDeployConfig.id
                );
                debugger;
                const deployDetails = JSON.parse(
                    deployDetailsConfigJSON.toString() || "{}"
                );

                if (!deployDetails.capo) {
                    this.warn(
                        `missing required 'capo' entry in ${resolvedDeployConfig.id}`
                    );
                }
                this.addWatchFile(id);
                this.addWatchFile(resolvedDeployConfig.id);

                s.replace(
                    capoConfigRegex,
                    `$1 (${JSON.stringify(deployDetails)})`
                );
                console.log(s.toString());
                debugger;
                return {
                    code: s.toString(),
                    map: s.generateMap({ hires: true }),
                };
            }
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
    function shortHash(str: string) {
        return bytesToHex(blake2b(textToBytes(str)).slice(0, 5));
    }

    function resolverConditionsHelper() {
        return `export default class needResolveConditions {
    constructor() {
        throw new Error(\`

This app tried to load a deployed on-chain script bundle, without
having indicated a network-id.

To resolve deployed on-chain script bundles, you need to specify
custom resolver condition to connect the specific deployment
environment with the pre-compiled scripts for that environment.

In Next.js, try something like this in next.config.js:
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  },
  webpack: (config) => {
    config.resolve.conditionNames.push(\`network-\${CARDANO_NETWORK || "preprod"}\`);
    return config;
  }
    ...
                        \`)
                    }

In VIte, use its resolve.conditions setting.
   - see https://vite.dev/config/shared-options.html#resolve-conditions
                    
   export default defineConfig({
        ...
        resolve: {
            conditions: [
                \`network-\${process.env.CARDANO_NETWORK || "preprod"}\`
            ]
    })

More about conditional exports and the resolver conditions they match:

  https://nodejs.org/docs/latest-v22.x/api/packages.html#conditional-exports
\`  
  }
}
`;
    }

}
