import path from "path";
import {
    existsSync,
    mkdirSync,
    readFileSync,
    unlinkSync,
    utimesSync,
    writeFileSync,
} from "fs";
import { createFilter } from "rollup-pluginutils";
import MagicString from "magic-string";
import { inspect } from "util";
import { colors } from "../../utils.js";
const { magenta } = colors;

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

import { blake2b } from "@helios-lang/crypto";
import { bytesToHex, hexToBytes } from "@helios-lang/codec-utils";
import { StellarHeliosProject } from "./StellarHeliosProject.js";
import { bytesToText, textToBytes } from "../../HeliosPromotedTypes.js";
import {
    rollupCreateHlbundledClass,
    type BundleClassWithLoadStats,
    type heliosSourceFileSeenHook,
} from "../rollupPlugins/rollupCreateHlbundledClass.js";
import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";
import type { CapoHeliosBundle } from "../scriptBundling/CapoHeliosBundle.js";
import {
    parseCapoJSONConfig,
    type CapoDeployedDetails,
} from "../../configuration/DeployedScriptConfigs.js";
import {
    serializeCacheEntry,
    stringifyCacheEntry,
} from "../CachedHeliosProgram.js";
import {
    delegateLinkSerializer,
    uplcDataSerializer,
} from "../../delegation/jsonSerializers.js";
import { environment } from "../../environment.js";

type HeliosBundlerPluginState = {
    capoBundle?: CapoHeliosBundle;
    hasExplicitCapoBundle: boolean;
    hasOtherBundles: boolean;
    project: StellarHeliosProject;
    bundleClassById: Record<string, BundleClassWithLoadStats>;
    emittedArtifacts: Set<string>;
    deps: Map<string, Set<string>>;
    hlToOutputFiles: Map<string, Set<string>>;
    hlToHlb: Map<string, Set<string>>;
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
        exportPrefix?: string;
    } = {}
) {
    const pluginOptions = {
        vite: false,
        project: "",
        compile: false,
        exportPrefix: "",
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

    const filterHeliosSources = createFilter(["*.hl", "**/*.hl"]);

    const regexCurrentCapoConfig =
        /^@donecollectively\/stellar-contracts\/currentCapoConfig$/;

    const filterHlbundledImportName = createFilter(/.*\.hlb\.[jt]s\?bundled/);
    // const project = options.project ? `${options.project}` : "";

    const netName = environment.CARDANO_NETWORK;
    if (!netName) {
        console.warn(
            "missing CARDANO_NETWORK environment signal; building for 'preprod'"
        );
    }
    const networkId = netName || "preprod";

    // const lib = loadCompilerLib();
    const { projectRoot, packageJSON } =
        StellarHeliosProject.findProjectDetails();

    const thisPackageName = packageJSON.name;
    const packageWithPrefix =
        `${thisPackageName}/${pluginOptions.exportPrefix}/`
            .replace(/\/+/g, "/")
            .replace(/\/$/, "");

    //read package.json from project root, parse and check its package name
    // const packageJsonPath = path.join(projectRoot, "package.json");
    // const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    const isStellarContracts =
        "@donecollectively/stellar-contracts" === packageJSON.name;

    const state: HeliosBundlerPluginState = {
        capoBundle: undefined, // new CapoHeliosBundle(),
        hasExplicitCapoBundle: false,
        hasOtherBundles: false,
        project: new StellarHeliosProject(),
        bundleClassById: {},
        emittedArtifacts: new Set<string>(),
        deps: new Map<string, Set<string>>(),
        hlToOutputFiles: new Map<string, Set<string>>(),
        hlToHlb: new Map<string, Set<string>>(),
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
        },
    };

    function findOrCreateDeps(importerId: string) {
        if (state.deps.has(importerId)) {
            return state.deps.get(importerId)!;
        } else {
            const newDeps = new Set<string>();
            state.deps.set(importerId, newDeps);
            return newDeps;
        }
    }
    function addHlb(hlId: string, hlbId: string) {
        if (!state.hlToHlb.has(hlId)) {
            state.hlToHlb.set(hlId, new Set<string>());
        }
        // console.warn( colors.redBright( "--- addHlb: ") + hlId + " -> " + hlbId);
        state.hlToHlb.get(hlId)!.add(hlbId);
    }
    function addHlArtifact(hlId: string, filename: string) {
        if (!state.hlToOutputFiles.has(hlId)) {
            state.hlToOutputFiles.set(hlId, new Set<string>());
        }
        // console.warn( colors.greenBright( "--- addHlArtifact: ") + hlId + " -> " + filename);
        state.hlToOutputFiles.get(hlId)!.add(filename);
    }
    function removeOutputArtifact(hlId: string) {
        if (state.hlToOutputFiles.has(hlId)) {
            for (const filename of state.hlToOutputFiles.get(hlId)!) {
                // console.warn("--- removeOutputArtifact: " + filename);
                if (existsSync(filename)) {
                    unlinkSync(filename);
                }
            }
        }
    }

    return {
        name: "heliosBundler",
        buildEnd: {
            order: "pre",
            handler(this: PluginContext, error?: Error) {
                // write the project file after the build, skipping any
                // pending delay from calls to `deferredWriteProjectFile()`
                this.debug(
                    "@buildEnd: " + (error ? "error: " + error?.message : "")
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
        // ...stellarDeploymentHook({
        //     networkId,
        //     thisPackageName,
        //     isStellarContracts,
        // }),
        resolveId: {
            order: "pre",
            async handler(this: PluginContext, source, importer, options) {
                const interesting = !!source.match(/Vesting.*\.hlb\./);

                if (source.match(regexCurrentCapoConfig)) {
                    throw new Error(`hurray`);
                } else {
                    // console.log("      ==== import ... from ", source);
                }

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
                    // this.debug(`<- resolveId (${source}) @isEntry`)
                    if (resolved && filterHeliosSources(source)) {
                        const importerDeps = findOrCreateDeps(importer);
                        importerDeps.add(resolved.id);
                    } else {
                        this.debug(
                            "resolveId: not resolved or not a filter match: " +
                                source +
                                " " +
                                resolved?.id
                        );
                    }

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
                    this.debug(
                        `-> resolveId ${source} (from ${relativePath(
                            importer
                        )})`
                    );
                    if (interesting) {
                        this.debug(
                            `resolved absolute HLB id ${id} with options: ` +
                                JSON.stringify(options)
                        );
                    }

                    if (pluginOptions.vite) {
                        // in vite, we allow resolution and loading to proceed without
                        // forking a separate compile-and-load sequence for an emitted chunk.
                        // Vite(st) uses in-memory techniques, so it doesn't support emitFile().
                        // nonetheless, our type-generation will create the appropriate
                        // typeInfo & bridge files for any .hlb.ts file loaded in vite/vitest.
                        this.debug(
                            `<- resolveId (${relativePath(
                                resolved.id
                            )}) for Vite`
                        );
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
                        const bundledExportName = `${packageWithPrefix}/${packageRelativeName}`;
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
                            const actualResolutionResult = await this.resolve(
                                id,
                                importer,
                                options
                            );

                            if (
                                actualResolutionResult?.id &&
                                !state.emittedArtifacts.has(bundledId)
                            ) {
                                // preempt asynchronous overlapping work:
                                state.emittedArtifacts.add(bundledId);

                                const myDeps = findOrCreateDeps(
                                    actualResolutionResult?.id
                                );
                                const onHeliosSource: heliosSourceFileSeenHook =
                                    (hsId, outFile) => {
                                        this.debug(`  • ${hsId} 👀🔍`);

                                        this.debug(` •  ${hsId} 👀🔍`);
                                        myDeps.add(hsId);
                                        this.addWatchFile(hsId);
                                        addHlArtifact(hsId, outFile);
                                        addHlb(hsId, id);
                                    };

                                const SomeBundleClass =
                                    await rollupCreateHlbundledClass(
                                        actualResolutionResult.id,
                                        {
                                            projectRoot,
                                            onHeliosSource,
                                        }
                                    );

                                const isMainnet = networkId === "mainnet";

                                state.bundleClassById[id] = SomeBundleClass;
                                const hlBundler: HeliosScriptBundle =
                                    SomeBundleClass.create({
                                        ...placeholderSetup,
                                        placeholderAt: "variant generation",
                                    });
                                if (SomeBundleClass.isCapoBundle) {
                                    debugger;
                                    if (!state.project.capoBundleName) {
                                        // debugger
                                        // throw new Error(`surprise, we don't know the capo name yet!?! (debugging breakpoint available)`);
                                    } else if (
                                        SomeBundleClass.name ==
                                        state.project.capoBundleName
                                    ) {
                                        const filenameBase = id.replace(
                                            /.*\/([^.]+)\..*$/,
                                            "$1"
                                        );
                                        const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
                                        const resolvedDeployConfig =
                                            await this.resolve(
                                                deployDetailsFile,
                                                id, // importer
                                                {
                                                    // attributes: {type: "json" },
                                                }
                                            );
                                        if (!resolvedDeployConfig) {
                                            debugger;
                                            this.info(
                                                `Capo bundle: no deploy config for ${networkId}: ${SomeBundleClass.name}`
                                            );

                                            state.project.configuredCapo.reject(
                                                new Error(
                                                    "no deployment config"
                                                )
                                            );
                                            debugger;
                                        }
                                    }
                                }
                                // immediately starts resolving the file-for-emit, and returns a
                                // PACKAGE-RELATIVE name for the artifact.  The importer of
                                // the .hlb.ts file will get that translated import statement, and
                                // the emitFile acts like a fork, with the processing of the emitted
                                // file happening on a separate track.
                                // and the package-relative import name used in place of normal
                                // load/transform processing of the separate chunk.
                                console.log(
                                    `--------------------------------------------------------------\n` +
                                        `  -- heliosBundler: emitting ${packageRelativeName}` +
                                        `\n--------------------------------------------------------------\n` +
                                        ""
                                );
                                this.emitFile({
                                    type: "chunk",
                                    id: bundledId,
                                    name: packageRelativeName,
                                    importer,
                                    // only valid for emitted assets, not chunks:
                                    // originalFileName: resolved.id,
                                });
                                this.debug(
                                    `<- resolveId (${relativePath(
                                        resolved.id
                                    )}) with artifacts to be emitted`
                                );
                                // this.debug(`  --> load before finishing resolution: ${relativePath(bundledExportName)}`)
                                // await this.load(actualResolutionResult)
                                // this.debug(`  <-- loaded and finishing resolution: ${relativePath(bundledExportName)}`)

                                return bundledExportName;
                            } else if (actualResolutionResult?.id) {
                                // this.debug(
                                //     `<- resolveId (${relativePath(
                                //         resolved.id
                                //     )}) skipped redundant artifact creation`
                                // );
                                return bundledExportName;
                            }
                        }
                        this.info(
                            `<- resolveId (${relativePath(
                                resolved?.id
                            )}) without emitted artifacts`
                        );
                        return bundledExportName;
                    }
                } else if (filterHlbundledImportName(id)) {
                    this.debug(
                        `-> resolveId for emitted bundle: ${relativePath(
                            source
                        )}\n   (from ${relativePath(importer)})`
                    );

                    if (interesting && process.env.DEBUG) {
                        this.warn(
                            `resolveId: got HLBundled: ${id}` +
                                JSON.stringify(options)
                        );
                    }
                    // resolving the file-to-be-emitted - it's the same file, but as a
                    // dynamic entry-point.  We resolve it like any file, minus the ?bundled suffix,
                    // then load & transform as seen below.

                    const unbundledId = id.replace(/\?bundled$/, "");
                    if (filterHLB(unbundledId)) {
                        const myDeps = findOrCreateDeps(unbundledId);
                        for (const dep of myDeps) {
                            // box: 📦; eyes: 👀; bullet: •
                            this.debug(" • 👀  📦" + dep);
                            addHlArtifact(dep, unbundledId);
                            addHlb(dep, unbundledId);
                            this.addWatchFile(dep);
                        }
                    }
                    // this call doesn't hit the path above, or cause an infinite loop,
                    //  because this.resolve() skips using this plugin's own resolveId hook.
                    const result = await this.resolve(unbundledId, importer, {
                        ...options,
                        skipSelf: true,
                    });
                    // debugger;
                    if (!result) {
                        throw new Error(`can't fail here`); // for typescript narrowing
                    }
                    this.debug(
                        `<- resolveId (${
                            result ? relativePath(result.id) : "‹null›"
                        }) for emitted bundle`
                    );
                    return result;
                } else {
                    if (
                        id.match(/hlb/) &&
                        !id.match(/hlBundled/) &&
                        !id.match(/dist\//)
                    ) {
                        console.log(
                            `resolve: skipping due to filter mismatch (debugging breakpoint available)`,
                            { id, importer }
                        );
                        debugger;
                        //no-op, but helpful for debugging:
                        filterHLB(id); // trace into here to see what's up with the filter
                        return null;
                    }
                }
                // this.debug(`<- resolveId (${source}) verbatim result`)
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

                const interesting = !!id.match(/Vesting.*\.hlb\./);
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
                            `load: skipping due to filter mismatch (debugging breakpoint available)`,
                            { id }
                        );
                        debugger;
                        //no-op, but helpful for debugging:
                        filterHLB(id); // trace into here to see what's up with the filter
                    }

                    return null;
                }
                this.debug(`-> load: ${relativePath(id)}`);
                if (interesting && process.env.DEBUG) {
                    console.log("    ---- heliosBundler: load", { id });
                }

                // ->  todo: load an existing bundle if it's already compiled, and ask that class to
                // ->   check its sources for changes, so we can skip rollup and recompilation if
                // ->   things are already up-to-date.
                let SomeBundleClass = state.bundleClassById[id];

                // bullet: • ; eyes: 👀
                this.debug(`watch: ${id} 👀 👜`);
                this.addWatchFile(id);
                const myDeps = findOrCreateDeps(id);
                const onHeliosSource: heliosSourceFileSeenHook = (
                    heliosSourceId,
                    outputFile
                ) => {
                    this.debug(`  • ${heliosSourceId} 👀 👜`);
                    this.addWatchFile(heliosSourceId);
                    addHlArtifact(heliosSourceId, outputFile);
                    addHlb(heliosSourceId, id);
                    myDeps.add(heliosSourceId);
                };
                if (!SomeBundleClass) {
                    if (pluginOptions.emitBundled) {
                        this.warn(
                            `heliosBundler: missing expected bundleClass for ${id} (debugging breakpoint available)`
                        );
                        debugger;
                    }
                    SomeBundleClass = await rollupCreateHlbundledClass(id, {
                        projectRoot,
                        onHeliosSource,
                    });
                }
                // await rollupCreateHlbundledClass(id);
                const relativeFilename = path.relative(projectRoot, id);
                this.debug(
                    `   👁️  checking helios bundle ${SomeBundleClass.name} from ${relativeFilename}`
                );

                const { hash, afterDelay } = SomeBundleClass;
                this.debug(
                    colors.cyanBright(
                        `create from ${id} ${hash} ${afterDelay}s`
                    )
                );

                let bundle = SomeBundleClass.create({
                    ...placeholderSetup,
                    placeholderAt: "load() before type-gen",
                });

                // compile the program seen in that bundle!
                // ... to trigger helios syntax-checking:
                let program = bundle.program;

                let replacedCapo = false;
                if (SomeBundleClass.isCapoBundle) {
                    let skipInstallingThisOne = false;
                    const filenameBase = id.replace(/.*\/([^.]+)\..*$/, "$1");
                    const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
                    const resolvedDeployConfig = await this.resolve(
                        deployDetailsFile,
                        id, // importer
                        {
                            // attributes: {type: "json" },
                        }
                    );

                    if (state.hasExplicitCapoBundle) {
                        if (!state.capoBundle) {
                            throw new Error(
                                `redundant unreachable error for typescript narrowing`
                            );
                        }

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
                            console.log(
                                "have explicitCapoBundle...  AND another, with a different lineage",
                                { id, existing: state.capoBundle }
                            );
                            debugger;
                        }
                    }
                    if (!state.capoBundle) {
                        console.log(
                            "\nTroubleshooting first .hlb.ts imports?\n" +
                                [...state.project.bundleEntries.keys()]
                                    .map(
                                        (existing: string) =>
                                            // bullet: •
                                            `    • ${traceImportPath(existing)}`
                                    )
                                    .join("\n") +
                                "\n"
                        );
                        // throw new Error(
                        //     `heliosBundler: Capo bundle not loaded, but there are already other bundles in the state (see import trace above)`
                        // );
                    } else {
                        if (state.hasOtherBundles && !skipInstallingThisOne) {
                            throw new Error(`unreachable code path??`);
                            let dCur = shortHash(
                                JSON.stringify(state.capoBundle?.modules)
                            );
                            let dNew = shortHash(
                                JSON.stringify(
                                    SomeBundleClass.prototype.modules
                                )
                            );

                            if (dCur !== dNew) {
                                throw new Error(`unreachable code path`);
                                // logCapoBundleDifferences(
                                //     dCur,
                                //     state,
                                //     dNew,
                                //     SomeBundleClass,
                                //     id
                                // );
                                // const ts1 = Date.now();
                                // state.project =
                                //     state.project.replaceWithNewCapo(
                                //         id,
                                //         SomeBundleClass
                                //     );
                                // console.log(
                                //     "  ---- Reinitialized project in",
                                //     Date.now() - ts1,
                                //     "ms"
                                // );
                                // replacedCapo = true;
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
                    this.debug(
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
                        const capoName = bundle.capoBundle.constructor.name;

                        if (
                            capoName == "CapoHeliosBundle" &&
                            !state.capoBundle
                        ) {
                            console.log(
                                `looks like you're using the default Capo bundle! ${capoName}`
                            );
                            state.project.capoBundleName = capoName;

                            state.project.configuredCapo.resolve(undefined);
                            state.project.loadBundleWithClass(
                                "src/helios/scriptBundling/CapoHeliosBundle.ts",
                                bundle.capoBundle.constructor
                            );
                            this.warn(
                                "skipping type-gen for default Capo bundle"
                            );
                            // state.project.generateBundleTypes(
                            //     "src/helios/scriptBundling/CapoHeliosBundle.ts"
                            // );
                        } else {
                            console.log(
                                `  -- 📦 Your project's Capo bundle: ${capoName}`
                            );
                            state.project.capoBundleName = capoName;
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
                        this.debug(
                            `<- load: ${relativePath(
                                id
                            )} type-gen side effects done`
                        );
                        return null;
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
                }
                this.debug(
                    `<- load: ${relativePath(id)} deferred to other plugins`
                );
                return null as LoadResult;
                //     id: source,
                // };
                //  throw new Error(`heliosLoader: ${importer} is importing ${source}`);
            },
        },
        watchChange: {
            order: "pre",
            handler: function (
                this: PluginContext,
                id: string,
                change: { event: "create" | "update" | "delete" }
            ) {
                this.warn("change: " + id + " " + change.event);
                removeOutputArtifact(id);
                const hlbs = state.hlToHlb.get(id);
                debugger;
                if (hlbs) {
                    for (const hlb of hlbs) {
                        // touch the hlb file
                        utimesSync(hlb, new Date(), new Date());
                    }
                }
                return Promise.resolve();
            },
        },
        shouldTransformCachedModule: {
            handler: function (this: PluginContext, id: string) {
                this.warn("shouldTransformCachedModule: " + id);
                return true;
            },
        },
        transform: {
            order: "pre",
            handler: function (this: PluginContext, code: string, id: string) {
                if (!filterHLB(id)) return;
                let looksLikeCapo = code.match(/extends .*Capo.*/);
                if (looksLikeCapo?.[0].match(/usingCapoBundle/))
                    looksLikeCapo = null;
                // this.warn("------------------------------------------- transform: " + id);
                const myDeps = findOrCreateDeps(id);
                if (myDeps.size > 0) {
                    this.debug(`---- watching helios sources for ${id}: `);
                    for (const dep of myDeps) {
                        // bullet: • ; eyes: 👀
                        this.debug(`  • ${dep} 👀`);
                        this.addWatchFile(dep);
                    }
                } else {
                    this.warn(`----- no dependencies registered for ${id}`);
                }
                const capoConfigRegex =
                    /^(\s*preConfigured *= )*(?:capoConfigurationDetails)\s*;?\s*$/m;
                // const tester = `            preConfigured = mkCapoDeployment`
                // const tester2 = `            preConfigured = mkCapoDeployment; `
                // const tester3 = `            preConfigured = mkCapoDeployment ;`
                // const tester4 = `            preConfigured = mkCapoDeployment  ;  `
                const filenameBase = id.replace(/.*\/([^.]+)\..*$/, "$1");
                const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
                const hlbFile = id.replace(/.*\/([^.]+)\..*$/, "$1");

                const SomeBundleClass = state.bundleClassById[
                    id
                ] as typeof CapoHeliosBundle;

                if (!SomeBundleClass) {
                    this.debug(
                        `skipping config insertion (no emitBundle in this env) ${filenameBase}`
                    );
                    return null;
                }
                if (looksLikeCapo) {
                    if (!code.match(capoConfigRegex)) {
                        debugger;
                        if (SomeBundleClass.isAbstract == true) {
                            this.info(
                                `${SomeBundleClass.name}: abstract class; skipping config insertion`
                            );
                            return null;
                        }
                        const msg =
                            `${SomeBundleClass.name}: this looks like a Capo bundle class without a currentDeploymentConfig\n` +
                            `  in ${hlbFile}\n` +
                            `  import {currentDeploymentConfig} from "@donecollectively/stellar-contracts"\n` +
                            `  ... and add  'preConfigured = capoConfigurationDetails' to your class.\n` +
                            `This will use deployment details from ${deployDetailsFile}\n` +
                            `  ... or another json file when deploying to a different network`;
                        this.warn(msg);
                        console.log(colors.red(msg));
                        return null;
                    }
                } else if (code.match(capoConfigRegex)) {
                    this.warn(
                        `non-Capo class using currentDeploymentConfig in ${id}`
                    );
                } else {
                    debugger;
                    return transformNonCapo.call(this, code, id);
                }
                return transformCapo.call(
                    this,
                    code,
                    id,
                    capoConfigRegex,
                    deployDetailsFile
                );
            },
        },
    };

    async function transformCapo(
        this: PluginContext,
        code: string,
        id: string,
        capoConfigRegex: RegExp,
        deployDetailsFile: string
    ) {
        this.debug(`-> [transform] Capo`);

        const SomeBundleClass = state.bundleClassById[
            id
        ] as typeof CapoHeliosBundle;

        if (!SomeBundleClass) return null;

        const resolvedDeployConfig = await this.resolve(
            deployDetailsFile,
            id, // importer
            {
                // attributes: {type: "json" },
            }
        );
        if (!resolvedDeployConfig) {
            this.warn(
                `no ${networkId} setup for Capo bundle: ${deployDetailsFile}`
            );
            if (SomeBundleClass.name == state.project.capoBundleName) {
                state.project.configuredCapo.resolve(undefined);
            }
        } else {
            this.info("building with Capo setup: " + deployDetailsFile);
            const deployDetailsConfigJSON = readFileSync(
                resolvedDeployConfig.id
            );
            const deployDetails: CapoDeployedDetails<"json"> = JSON.parse(
                deployDetailsConfigJSON.toString() || "{}"
            );
            if (!deployDetails.capo) {
                throw new Error(
                    `missing required 'capo' entry in ${resolvedDeployConfig.id}`
                );
            }

            // this.warn(`watch2: ${id}`);
            // this.addWatchFile(id);
            // this.addWatchFile(resolvedDeployConfig.id);

            // debugger;
            // const myDeps = findOrCreateDeps(id);
            // for (const dep of myDeps) {
            //     this.addWatchFile(dep);
            // }

            console.log(deployDetails);
            const capoConfig = parseCapoJSONConfig(deployDetails.capo.config);
            const { seedIndex, seedTxn } = capoConfig;
            const hlBundler: CapoHeliosBundle = await SomeBundleClass.create({
                deployedDetails: {
                    config: capoConfig,
                },
                setup: {
                    isMainnet: networkId === "mainnet",
                    isPlaceholder: `rollupBundlerPlugin for inserting pre-compiled Capo details`,
                },
            });

            const { CapoMinterBundle } = await import(
                "@donecollectively/stellar-contracts/contracts/CapoMinter.hlb"
            );
            const minterBundler: HeliosScriptBundle =
                await CapoMinterBundle.create({
                    params: {
                        seedTxn,
                        seedIndex,
                    },
                    // deployedDetails: {
                    //     config: {
                    //         seedTxn,
                    //         seedIndex
                    //     }
                    // },
                    setup: {
                        isMainnet: networkId === "mainnet",
                        isPlaceholder: `rollupBundlerPlugin for inserting pre-compiled Minter details`,
                    },
                });

            const { programBundle: minterBundle, scriptHash: mph } =
                await minterBundler.getSerializedProgramBundle();
            const { scriptHash, programBundle } =
                await hlBundler.getSerializedProgramBundle();
            state.project.configuredCapo.resolve(hlBundler);

            const {
                capo: { config },
            } = deployDetails;
            debugger;
            const typedDeployDetailsText = `{
        capo: {
            programBundle: (${JSON.stringify(programBundle)} as never),
            scriptHash: "${scriptHash}",
            config: this.parseCapoJSONConfig(${JSON.stringify(
                deployDetails.capo.config
            )}),
        },
        minter: {
            programBundle: (${JSON.stringify(minterBundle)} as never),
            scriptHash: ${JSON.stringify(mph)},
            config: this.parseCapoMinterJSONConfig({
                seedTxn: ${JSON.stringify(config.seedTxn)},
                seedIndex: ${JSON.stringify(config.seedIndex)},
            }),
        }
    } 
            static isPreconfigured = true;
            `;
            // deployDetails.capo.scriptHash = hexToBytes(scriptHash);
            deployDetails.capo.programBundle = programBundle;

            const s = new MagicString(code);
            s.replace(capoConfigRegex, `$1 ${typedDeployDetailsText}`);
            // console.log(s.toString());
            // debugger;
            this.debug(`[transform] <- Capo (w/ deployment)`);
            return {
                code: s.toString(),
                map: s.generateMap({ hires: true }),
            };
        }
    }

    async function transformNonCapo(
        this: PluginContext,
        code: string,
        id: string
    ) {
        const s = new MagicString(code);
        const r = filterHLB(id);
        if (!r) {
            return null;
        }
        // 1. matches one of the following patterns in the bundle code:
        //  - specializedDelegateModule = ...
        //  - static needsSpecializedDelegateModule = false
        // 2. inserts precompiled: { [variant]: {scriptHash, programBundle} } details
        //     ... with one entry per variant found in the SomeBundleClass

        // const myDeps = findOrCreateDeps(id);
        // for (const dep of myDeps) {
        //     this.debug(`  • ${dep} 👀`);
        //     this.addWatchFile(dep);
        // }
        const regex =
            /(\s*specializedDelegateModule\s*=\s*)|(static needsSpecializedDelegateModule = false)/m;
        if (code.match(regex)) {
            const SomeBundleClass: typeof HeliosScriptBundle =
                state.bundleClassById[id];

            if (!SomeBundleClass) {
                debugger;
                this.warn(
                    `not (yet) inserting pre-compiled script for ${id} (dbpa)`
                );
                return null;
            }
            let hlBundler: HeliosScriptBundle = SomeBundleClass.create({
                setup: {
                    isMainnet: networkId === "mainnet",
                    isPlaceholder: `rollupBundlerPlugin for inserting pre-compiled script details`,
                },
            });

            const precompiledVariants: Record<
                string,
                string //... with jsonified contents:
                // {
                //     scriptHash: string;
                //     programBundle: any;
                //     config
                // }
            > = {};

            if (SomeBundleClass.needsCapoConfiguration) {
                this.debug(`[transform]  -- waiting for configured capo`);
                const configuredCapo =
                    await state.project.configuredCapo.promise.catch((e) => {
                        this.debug(
                            `failed to load configured Capo bundle: ${e.message}`
                        );
                        debugger;
                        return undefined;
                    });
                if (configuredCapo) {
                    hlBundler.capoBundle = configuredCapo;
                    this.debug(`[transform]  -- configured capo ready`);
                } else {
                    this.warn(
                        `[transform]  ---- no capo deployment; not inserting compiled script for ${relativePath(
                            id
                        )}`
                    );
                    return null; // transform without injecting compiled script
                }
            }

            let scriptCount = 0;
            let skipCount = 0;
            for (const [variant, params] of Object.entries(
                hlBundler.variants
            )) {
                if (params) {
                    const configuredBundle = hlBundler.withSetupDetails({
                        params,
                        setup: { isMainnet: networkId === "mainnet" },
                    });

                    const { scriptHash, programBundle, config } =
                        await (async () => {
                            if (configuredBundle.preCompiled?.[variant]) {
                                const { scriptHash, programBundle, config } =
                                    configuredBundle.preCompiled[variant];
                                if (!scriptHash) {
                                    throw new Error(
                                        `${configuredBundle.displayName}: missing expected scriptHash for pre-compiled variant ${variant}`
                                    );
                                }
                                return {
                                    programBundle,
                                    scriptHash,
                                    config: JSON.stringify(config),
                                };
                            } else {
                                const t =
                                    await configuredBundle.getSerializedProgramBundle();
                                const { scriptHash, programBundle } = t;
                                return {
                                    programBundle,
                                    scriptHash,
                                    config: JSON.stringify(
                                        configuredBundle.configuredParams,
                                        delegateLinkSerializer
                                    ),
                                };
                            }
                        })();
                    precompiledVariants[variant] = `{
                        programBundle: (${JSON.stringify(
                            programBundle
                        )} as never),
                        scriptHash: "${scriptHash}",
                        config: ${config},
                    }\n`;
                    scriptCount++;
                } else {
                    debugger;
                    if (state.capoBundle?.configuredUplcParams) {
                        this.warn(
                            `variant '${variant}': derive params from capo? (dbpa)`
                        );
                    } else if (state.capoBundle) {
                        this.warn(
                            `variant '${variant}': missing baseParams; skipping (dbpa)`
                        );
                    } else {
                        this.warn(`wait for capoBundle?`);
                    }
                    skipCount++;
                }
            }

            const skipMsg = skipCount > 0 ? ` (+${skipCount} skipped)` : ``;
            if (!scriptCount) {
                this.debug(
                    `[transform] <- skipping script insertion for non-capo ${skipMsg}`
                );
                return null;
            } else {
                const precompiled = `    preCompiled = ({\n${Object.entries(
                    precompiledVariants
                )
                    .map(([vName, vSrc]) => `${vName}: ${vSrc},\n`)
                    .join("")}    })\n\n`;

                s.replace(
                    regex,
                    (match, specializedDelegateModule, getMain) => {
                        this.debug(
                            `[transform] -- inserting pre-compiled script`
                        );
                        const existing = specializedDelegateModule || getMain;
                        return `${precompiled}   ${existing}`;
                    }
                );

                // console.log(s.toString())
                this.debug(
                    `[transform] <- non-capo w/ ${scriptCount} compiled script(s)${skipMsg}`
                );
                return {
                    code: s.toString(),
                    map: s.generateMap({ hires: true }),
                };
            }
        }
        throw new Error(
            `bundle module format error\n` +
                ` ... non-Capo must define 'specializedDelegateModule = ...\n` +
                ` ... or EXACTLY AND VERBATIM: \`static needsSpecializedDelegateModule = false\``
        );

        return null;
    }

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
