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
    rollupCreateHlPrecompiledClass,
    type BundleClassWithLoadStats,
    type heliosSourceFileSeenHook,
} from "../rollupPlugins/rollupCreateHlbundledClass.js";
import type { CapoHeliosBundle } from "../scriptBundling/CapoHeliosBundle.js";
import {
    parseCapoJSONConfig,
    type CapoDeployedDetails,
} from "../../configuration/DeployedScriptConfigs.js";
import {
    serializeCacheEntry,
    stringifyCacheEntry,
    type PrecompiledProgramJSON,
} from "../CachedHeliosProgram.js";
import {
    delegateLinkSerializer,
    uplcDataSerializer,
} from "../../delegation/jsonSerializers.js";
import { environment } from "../../environment.js";
import type { HeliosScriptBundle } from "../scriptBundling/HeliosScriptBundle.js";

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

const interestingRegex = /XXXS3Capo.hlb/;

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
    const tempDir = path.join(process.cwd(), ".stellar", "typeGen");
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

    // const filterHlbundledImportName = createFilter(/.*\.hlb\.[jt]s\?bundled/);
    const filterHlprecompiledImportName = createFilter(
        /.*\.hlb\.[jt]s\?precompiled/
    );
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
        placeholderAt: "rollupBundlerPlugin for type-gen",
        setup: {
            isMainnet: false,
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

    function addMeta(this: PluginContext, id: string, meta: any) {
        const info = this.getModuleInfo(id)! as any;
        if (info?.meta) {
            this.debug("---------- adding meta for " + id);
            // this.debug('  ^ was '+ JSON.stringify(info.meta.stellar || "nothing"));
            // this.debug("  now "+ meta.precompiledModuleFilename)

            const st = info.meta.stellar || {}
            try {
                info.meta.stellar = {
                    ...st,
                    ...meta,
                };
            } catch (e:any) {
                console.warn("detected error while adding meta for " + id)
                this.debug("detected error while adding meta: "+e.stack)
            }
        }
    }

    return {
        name: "stellar-bundler",
        buildEnd: {
            order: "pre",
            handler(this: PluginContext, error?: Error) {
                // write the project file after the build, skipping any
                // pending delay from calls to `deferredWriteProjectFile()`
                // this.warn(
                //     "@buildEnd: " + (error ? "error: " + error?.message : "")
                // );
                if (pluginOptions.vite) return;

                this.emitFile({
                    type: "asset",
                    fileName: "needResolverConditions.mjs",
                    source: resolverConditionsHelper(),
                });
            },
        },
        resolveId: {
            order: "pre",
            handler: async function resolveIdHandler(
                this: PluginContext,
                source: string,
                importer: string,
                options
            ) {
                const interesting = !!source.match(interestingRegex);

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
                    // if (source.match(/UnspecializedDelegate.hlb/)) {
                    //     debugger;
                    // }

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
                            `stellar-bundler: in vitest: resolving ${source} as ${sourceWithTs} for ${importer}`
                        );
                        // addMeta.call(this, resolved.id, meta)
                    }
                }
                if (isEntry && !importer) {
                    const interesting = source.match(interestingRegex);
                    if (interesting) {
                        debugger;
                    }

                    // this.debug(`<- resolveId (${source}) @isEntry`)
                    if (resolved && filterHeliosSources(source)) {
                        const importerDeps = findOrCreateDeps(importer);
                        importerDeps.add(resolved.id);
                    } else {
                        // This is too verbose - it never shows anything except all the non-hlb files
                        // this.debug(
                        //     "resolveId: not resolved or not a filter match: " +
                        //         source +
                        //         " " +
                        //         resolved?.id
                        // );
                    }
                    // if (source.match(/UnspecializedDelegate/)) {
                    //     debugger;
                    // }
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

                const precompiledId = `${id}?precompiled`;

                const name = resolved?.id?.replace(
                    /.*\/([._a-zA-Z0-9]*)\.hlb\.[jt]s(?:\??.*)$/,
                    "$1"
                );
                const buildGenericArtifacts = !!isStellarContracts;
                const netIdSuffix = buildGenericArtifacts
                    ? ""
                    : `-${networkId}`;

                // ===================================================
                // ===================================================
                // The resolveId handler is called twice for each .hlb.ts file:
                //  - The first time is triggered directly by an import in the project source.
                //     This leads to a second resolution?
                // ===================================================
                // ===================================================

                const isPrecompiled = filterHlprecompiledImportName(id);

                // debugger;
                const packageRelativeName = `contracts${netIdSuffix}/${name}`;
                const packageImportName = `${packageWithPrefix}/contracts/${name}.hlb`;
                const preconfiguredModuleFilename = `${packageRelativeName}.hlb`;
                const preconfiguredExportName = `${packageWithPrefix}/${packageRelativeName}.hlb`;
                const precompiledModuleFilename = `${packageRelativeName}.compiled.hlb.mjs`;
                const precompiledExportName = `${packageWithPrefix}/${packageRelativeName}.compiled.hlb`;

                const meta = {
                    // packageRelativeName,
                    // preconfiguredExportName,
                    preconfiguredModuleFilename,
                    precompiledModuleFilename,
                    precompiledExportName,
                };
                if (filterHlprecompiledImportName(id) || filterHLB(id)) {
                    this.debug(
                        `in resolveId: ${JSON.stringify(
                            {
                                source,
                                id,
                                isPrecompiled,
                                name,
                                packageRelativeName,
                                preconfiguredExportName,
                                precompiledExportName,
                            },
                            null,
                            2
                        )}`
                    );
                }

                if (resolved && id && filterHLB(id)) {                    
                    this.debug(
                        `-> resolveId ${source} (from ${relativePath(
                            importer
                        )})`
                    );
                    addMeta.call(this, id, meta);
                    if (interesting) {
                        this.debug(
                            `resolved absolute HLB id ${id} with options: ` +
                                JSON.stringify(options)
                        );
                    }
                    // if (source.match(/UnspecializedDelegate.hlb/)) {
                    //     debugger;
                    // }

                    if (pluginOptions.vite) {
                        // in vite, we allow resolution and loading to proceed without
                        // forking a separate compile-and-load sequence for an emitted chunk.
                        // Vite(st) uses in-memory techniques, so it doesn't support emitFile().
                        // nonetheless, our type-generation will create the appropriate
                        // typeInfo & bridge files for any .hlb.ts file loaded in vite/vitest.
                        this.debug(
                            `<- resolveId (${relativePath(
                                resolved.id
                            )}) for Vite / vitest`
                        );
                        // if (source.match(/UnspecializedDelegate/)) {
                        //     debugger;
                        // }

                        return resolved;
                    } else {
                        // id is now an absolute filename of a (TS or JS) helios-bundle definition.
                        // Before proceeding with returning a resolution for that file, let's
                        // try to push it through a depth-first compile, load it and generate types.
                        // const name = resolved.id.replace(
                        //     /.*\/([._a-zA-Z]*)\.hlb\.[jt]s$/,
                        //     "$1"
                        // );
                        // const precompiledId = `${id}?precompiled`;

                        // const name = resolved.id.replace(
                        //     /.*\/([._a-zA-Z0-9]*)\.hlb\.[jt]s$/,
                        //     "$1"
                        // );
                        // const buildGenericArtifacts = !!isStellarContracts;
                        // const netIdSuffix = buildGenericArtifacts
                        //     ? ""
                        //     : `-${networkId}`;

                        // const packageRelativeName = `contracts${netIdSuffix}/${name}.hlb.compiled`;
                        // const precompiledExportName = `${packageWithPrefix}/${packageRelativeName}`;
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
                                !state.emittedArtifacts.has(precompiledId)
                            ) {
                                // preempt asynchronous overlapping work:
                                state.emittedArtifacts.add(precompiledId);

                                const myDeps = findOrCreateDeps(
                                    actualResolutionResult?.id
                                );
                                const onHeliosSource: heliosSourceFileSeenHook =
                                    (hsId, outFile) => {
                                        myDeps.add(hsId);
                                        if (
                                            !this.getWatchFiles().includes(hsId)
                                        ) {
                                            this.debug(
                                                `• ${relativePath(hsId)} 👀🔍`
                                            );
                                            this.addWatchFile(hsId);
                                        }
                                        addHlArtifact(hsId, outFile);
                                        addHlb(hsId, id);
                                    };

                                const SomeBundleClass =
                                    await rollupCreateHlPrecompiledClass(
                                        actualResolutionResult.id,
                                        {
                                            projectRoot,
                                            onHeliosSource,
                                            outDir: tempDir,
                                        }
                                    );

                                const isMainnet = networkId === "mainnet";

                                state.bundleClassById[id] = SomeBundleClass;
                                let isPreconfiguredCapo = "preconfigured";
                                let localMeta = { ...meta };
                                const hlBundler: HeliosScriptBundle =
                                    SomeBundleClass.create({
                                        ...placeholderSetup,
                                        scriptParamsSource: "config",
                                        originatorLabel: "variant generation",
                                    });
                                if (SomeBundleClass.isCapoBundle) {
                                    if (!hlBundler.capoBundle) {
                                        // mostly this is to prevent unused-variable warning:
                                    }
                                    if (interesting) {
                                        debugger;
                                    }
                                    if (
                                        state.project.capoBundleName &&
                                        state.project.capoBundleName ==
                                            SomeBundleClass.name
                                    ) {
                                        const filenameBase = id.replace(
                                            /.*\/([^.]+)\..*$/,
                                            "$1"
                                        );
                                        const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
                                        const resolvedDeployConfig =
                                            await this.resolve(
                                                deployDetailsFile,
                                                id
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
                                            isPreconfiguredCapo =
                                                "without deploy config";
                                            localMeta = {} as any;
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
                                    // `˚. ✦.˳·˖✶ ⋆.✧̣̇˚. `
                                    `--------------------------------------------------------------\n` +
                                        `  -- stellar-bundler: emitting ${isPreconfiguredCapo} ${relativePath(
                                            resolved.id
                                        )}\n` +
                                        `     for import("${packageImportName}") (condition = network-${networkId})` +
                                        `\n--------------------------------------------------------------\n` +
                                        ""
                                );

                                addMeta.call(this, resolved.id, localMeta);
                                const resolvedInfo: PartialResolvedId = {
                                    // id: preconfiguredExportName,
                                    id: resolved.id,
                                    meta: { stellar: localMeta },
                                    external: false,
                                    resolvedBy: "stellar",
                                };

                                this.debug(
                                    `<- resolveId(${relativePath(
                                        resolved.id
                                    )}) = ${resolvedInfo.id}`
                                );
                                this.debug(
                                    `   ^ ... with meta ${colors.green(
                                        JSON.stringify(localMeta, null, 8)
                                    )}`
                                );
                                this.emitFile({
                                    type: "chunk",
                                    // id: precompiledId,
                                    id: resolved.id,
                                    // name: packageRelativeName,
                                    name: preconfiguredModuleFilename,
                                    importer,
                                    //XXX // now the only importer of the precompiled bundle is the original file:
                                    //XXX importer: resolved.id,
                                    // only valid for emitted assets, not chunks:
                                    // originalFileName: resolved.id,
                                });
                                if (interesting) {
                                    debugger;
                                }

                                return resolvedInfo;
                                // return preconfiguredExportName;
                            }
                        }
                        this.info(
                            `<- resolveId(${source}) => ${preconfiguredModuleFilename} (without emitted artifacts)` +
                                `\n    emitBundled = ${pluginOptions.emitBundled}`
                        );
                        this.debug("here3")
                        addMeta.call(this, resolved.id, meta);
                        return {
                            ...resolved,
                            meta: { stellar: meta },
                            external: false,
                        };
                        return preconfiguredExportName;
                    }
                } else if (filterHlprecompiledImportName(id)) {
                    this.error("dead code path???");
                    // this.debug(
                    //     `-> resolveId for emitted bundle: ${relativePath(
                    //         source
                    //     )}\n   (from ${relativePath(importer)})`
                    // );
                    // // debugger;
                    // // return precompiledExportName;

                    // if (interesting && process.env.DEBUG) {
                    //     this.warn(
                    //         `resolveId: got HLBundled: ${id}` +
                    //             JSON.stringify(options)
                    //     );
                    // }
                    // // resolving the file-to-be-emitted - it's the same file, but as a
                    // // dynamic entry-point.  We resolve it like any file, minus the ?precompiled suffix,
                    // // then load & transform as seen below.

                    // const unbundledId = id.replace(/\?precompiled$/, "");
                    // if (filterHLB(unbundledId)) {
                    //     const myDeps = findOrCreateDeps(unbundledId);
                    //     for (const dep of myDeps) {
                    //         // bullet: •;  eyes: 👀; box: 📦
                    //         this.debug(" • 👀  📦" + dep);
                    //         addHlArtifact(dep, unbundledId);
                    //         addHlb(dep, unbundledId);
                    //         this.addWatchFile(dep);
                    //     }
                    // }
                    // // this call doesn't hit the path above, or cause an infinite loop,
                    // //  because this.resolve() skips using this plugin's own resolveId hook.
                    // const result = await this.resolve(unbundledId, importer, {
                    //     ...options,
                    //     skipSelf: true,
                    // });
                    // // debugger;
                    // if (!result) {
                    //     throw new Error(`can't fail here`); // for typescript narrowing
                    // }
                    // const resolvedWithMeta = {
                    //     ...result,
                    //     meta: {
                    //         ...(result?.meta || {}),
                    //         stellar: {
                    //             // preconfiguredExportName,
                    //             precompiledExportName,
                    //             // packageRelativeName,
                    //             // importer,
                    //         },
                    //     },
                    // };

                    // this.debug(
                    //     `<- resolveId (${relativePath(result!.id)}) = ${
                    //         result!.id
                    //     } with meta ${JSON.stringify(
                    //         resolvedWithMeta.meta.stellar
                    //     )}`
                    // );
                    // debugger;
                    // return resolvedWithMeta;
                } else {
                    if (
                        id.match(/hlb/) &&
                        !id.match(/hlBundled/) &&
                        !id.match(/dist\//)
                    ) {
                        this.warn(
                            `resolve: skipping due to filter mismatch (debugging breakpoint available)` +
                                `\n    id: ${id}` +
                                `\n    importer: ${importer}`
                        );
                        debugger;
                        //no-op, but helpful for debugging:
                        filterHLB(id); // trace into here to see what's up with the filter


                        return null;
                    }
                }

                // this responds to files that aren't handled by this plugin.
                //  no verbose logging about those, unless you're just doing
                // some sanity-checking for the logic above.
                // this.debug(`<- resolveId (${source}) verbatim result`)
                return resolved;
            },
        },
        load: {
            order: "pre",
            handler: async function loadHandler(
                this: PluginContext,
                id: string
            ): Promise<LoadResult> {
                // the source is a relative path name
                // the importer is an a fully resolved id of the imported module
                // console.log("heliosBundler: load");

                const interesting = !!id.match(interestingRegex);

                const { project } = state;
                if (filterHlprecompiledImportName(id)) {
                    // this.debug(`-> load: ${relativePath(id)} for transform to precompiled scripts`);
                    // const unbundledId = id.replace(/\?precompiled$/, "");
                    // const data = await this.fs.readFile(unbundledId, {encoding: "utf8"});
                    // this.debug(`<- load: ${unbundledId}`)
                    // return data

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
                } else if (!filterHLB(id)) {
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
                } else {
                    this.debug(`-> load: ${relativePath(id)}`);
                }
                if (interesting) debugger;
                // const info = this.getModuleInfo(id)! as any;
                // if (!info?.stellar) {
                //     debugger
                //     this.warn("incontheeivable!  (at A) No stellar module info for " + id);
                // }
                // const {
                //     preconfiguredExportName,
                //     precompiledExportName,
                //     packageRelativeName,
                //     importer,
                // } = info.meta.stellar as any;

                // ->  todo: load an existing bundle if it's already compiled, and ask that class to
                // ->   check its sources for changes, so we can skip rollup and recompilation if
                // ->   things are already up-to-date.
                let SomeBundleClass = state.bundleClassById[id];

                // bullet: • ; eyes: 👀; numeral 1: 1️⃣ for the entry point
                if (!this.getWatchFiles().includes(id)) {
                    this.debug(`• ${relativePath(id)} 👀 1️⃣ 👜`);
                    this.addWatchFile(id);
                }
                const myDeps = findOrCreateDeps(id);
                const onHeliosSource: heliosSourceFileSeenHook = (
                    heliosSourceId,
                    outputFile
                ) => {
                    if (!this.getWatchFiles().includes(heliosSourceId)) {
                        this.addWatchFile(heliosSourceId);
                        this.debug(`• ${relativePath(heliosSourceId)} 👀 👜`);
                    }
                    addHlArtifact(heliosSourceId, outputFile);
                    addHlb(heliosSourceId, id);
                    myDeps.add(heliosSourceId);
                };
                if (!SomeBundleClass) {
                    if (pluginOptions.emitBundled && !id.match(/CapoMinter|UnspecializedDelegate/)) {
                        this.warn(
                            `stellar-bundler: missing expected bundleClass for ${id} (debugging breakpoint available)`
                        );
                        debugger;
                    }
                    SomeBundleClass = await rollupCreateHlPrecompiledClass(id, {
                        projectRoot,
                        onHeliosSource,
                        outDir: tempDir,
                    });
                    const { hash, afterDelay } = SomeBundleClass;
                    // this.debug(
                    //     `  -- created helper class ${colors.cyanBright(
                    //         SomeBundleClass.name
                    //     )} for type-gen from ${relativePath(id)} ${hash} ${afterDelay}s`
                    // );
                }

                const relativeFilename = path.relative(projectRoot, id);
                this.debug(
                    `   👁️  checking helios script bundle ${colors.green(
                        SomeBundleClass.name
                    )} for ${colors.cyanBright("type-gen needs")}`
                );

                let bundle = SomeBundleClass.create({
                    ...placeholderSetup,
                    scriptParamsSource: "config",
                    originatorLabel: "load() before type-gen",
                });

                // compile the program seen in that bundle!
                // ... to trigger helios syntax-checking:
                // console.log("WHA3")
                let replacedCapo = false;
                if (SomeBundleClass.isCapoBundle) {
                    let skipInstallingThisOne = false;
                    const filenameBase = id.replace(/.*\/([^.]+)\..*$/, "$1");
                    // const deployDetailsFile = `./${filenameBase}.hlDeploy.${networkId}.json`;
                    // const resolvedDeployConfig = await this.resolve(
                    //     deployDetailsFile,
                    //     id
                    // );

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
                            this.warn(
                                "have explicitCapoBundle...  AND another, with a different lineage: " +
                                    JSON.stringify(
                                        { id, existing: state.capoBundle },
                                        null,
                                        2
                                    )
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
                    } else {
                        if (state.hasOtherBundles && !skipInstallingThisOne) {
                            throw new Error(`unreachable code path??`);
                        }
                    }
                    state.hasExplicitCapoBundle = true;

                    this.debug(
                        `   👁️  checking (Capo) helios bundle ${SomeBundleClass.name}`
                    );
                    if (!skipInstallingThisOne) {
                        state.capoBundle = bundle;
                        state.project.loadBundleWithClass({
                            absoluteFilename: id,
                            bundleClass: SomeBundleClass,
                            originatorLabel: "load() specific Capo bundle for type-gen",
                            scriptParamsSource: "none",
                        });
                        state.project.generateBundleTypes(id);
                        this.debug(
                            `      ^ ok, ${colors.cyanBright(
                                "Capo type-gen done"
                            )}: ${id}`
                        );
                        return null;
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
                                `  -- no special Capo registered... using the default Capo bundle ${capoName}`
                            );
                            state.project.capoBundleName = capoName;

                            state.project.configuredCapo.resolve(undefined);
                            state.project.loadBundleWithClass({
                                absoluteFilename: "src/helios/scriptBundling/CapoHeliosBundle.ts",
                                bundleClass: bundle.capoBundle.constructor as any,
                                originatorLabel: "load() default Capo bundle",
                                scriptParamsSource: "none",
                            });
                            this.warn(
                                "skipping type-gen for default Capo bundle"
                            );
                        } else {
                            console.log(
                                `  -- 📦 Your project's Capo bundle: ${capoName}`
                            );
                            state.project.capoBundleName = capoName;
                        }
                    }

                    state.project.loadBundleWithClass({
                        absoluteFilename: id,
                        bundleClass: SomeBundleClass,
                        originatorLabel: "load() Capo bundle for type-gen",
                        scriptParamsSource: "none",
                    });
                    try {
                        state.project.generateBundleTypes(id);
                        this.debug(
                            `<- load: ${relativePath(id)} ${colors.cyanBright(
                                "^^ type-gen side effects done"
                            )}`
                        );
                        return null;
                    } catch (e: any) {
                        if (e.message.match("compilerError")) {
                            console.error(e);
                            throw new Error(
                                `Error in Helios script (see above)`
                            );
                        }
                        this.error(`Error generating types for ${id}:\n`+ e.message);
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
                    `<- load: ${relativePath(id)} ${colors.cyanBright(
                        "deferred to other plugins"
                    )}`
                );
                return null as LoadResult;
            },
        },
        watchChange: {
            order: "pre",
            handler: function watchChangeHandler(
                this: PluginContext,
                id: string,
                change: { event: "create" | "update" | "delete" }
            ) {
                this.warn("change: " + id + " " + change.event);
                removeOutputArtifact(id);
                const hlbs = state.hlToHlb.get(id);
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
            handler: function transformHandler(
                this: PluginContext,
                code: string,
                id: string
            ) {
                if (!filterHLB(id)) return;
                this.debug(`-> transform: ${id}`);
                let looksLikeCapo = code.match(/extends .*Capo.*/);
                if (looksLikeCapo?.[0].match(/usingCapoBundle/))
                    looksLikeCapo = null;
                const myDeps = findOrCreateDeps(id);
                if (myDeps.size > 0) {
                    // this.debug(
                    //     `watching helios sources\n` +
                    //         Array.from(myDeps)
                    //             .map(
                    //                 // bullet: • ; eyes: 👀
                    //                 (dep) => `   • ${relativePath(dep)}`
                    //             )
                    //             .join("\n")
                    // );
                    for (const dep of myDeps) {
                        if (!this.getWatchFiles().includes(dep)) {
                            this.addWatchFile(dep);
                            // jekyll/hyde (transform) emoji :🧟
                            this.debug(`• ${relativePath(dep)} 👀 🧟`);
                        }
                    }
                } else {
                    this.warn(`----- no dependencies registered for ${id}`);
                }
                const capoConfigRegex =
                    /^(\s*)(preConfigured) *= *(?:capoConfigurationDetails)\s*;?\s*$/m;
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

                if (id.match(interestingRegex)) {
                    debugger;
                }
                if (!SomeBundleClass) {
                    this.debug(`<- transform: no emitBundle, skipping config`);
                    return null;
                }

                if (looksLikeCapo) {
                    if (!code.match(capoConfigRegex)) {
                        if (SomeBundleClass.isAbstract == true) {
                            this.warn(
                                `${SomeBundleClass.name}: abstract class; skipping config insertion\n` +
                                    `  ... downstream libraries can subclass it and create their own deployment configs`
                            );
                            this.debug("<- transform: skipped/abstract");
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
                        this.debug("<- transform: skipped/no-preconfig-cues");
                        console.log(colors.red(msg));
                        return null;
                    }
                } else if (code.match(capoConfigRegex)) {
                    this.debug("<- transform: skipped/non-Capo/bad config");
                    this.error(
                        `non-Capo class using currentDeploymentConfig in ${id}`
                    ); // never returns
                } else {
                    return addCompiledDetailsNonCapo.call(this, code, id);
                }
                return addCompiledDetailsToCapo.call(
                    this,
                    code,
                    id,
                    capoConfigRegex,
                    deployDetailsFile
                );
            },
        },
    };

    async function addCompiledDetailsToCapo(
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

        const interesting = id.match(interestingRegex);
        if (interesting) {
            debugger;
        }

        if (!SomeBundleClass) return null;

        const resolvedDeployConfig = await this.resolve(deployDetailsFile, id);

        if (!resolvedDeployConfig) {
            this.warn(
                `no ${networkId} setup for Capo bundle: ${deployDetailsFile}`
            );
            if (SomeBundleClass.name == state.project.capoBundleName) {
                state.project.configuredCapo.resolve(undefined);
            }
            this.debug(`<- transform: no setup for Capo bundle`);
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

            console.log({ deployDetails });
            const capoConfig = parseCapoJSONConfig(deployDetails.capo.config);
            const { seedIndex, seedTxn } = capoConfig;
            const hlBundler: CapoHeliosBundle = await SomeBundleClass.create({
                deployedDetails: {
                    config: capoConfig,
                },
                params: {
                    ...capoConfig,
                    variant: "capo"
                },
                originatorLabel: `stellar bundler, inserting pre-compiled Capo details`,
                setup: {
                    isMainnet: networkId === "mainnet",
                }
            });

            hlBundler.loadProgram()
            await hlBundler.compiledScript(true);

            // NOTE: when the stellar-contracts packages aren't built (yet), this
            // will show up as an error.  It shouldn't affect the ability for the packages
            // to BE built, and after they're built correctly, the issue will resolve.
            const { CapoMinterBundle } = await import(
                "@donecollectively/stellar-contracts/contracts/CapoMinter.hlb"
            );
            const minterBundler: HeliosScriptBundle =
                await CapoMinterBundle.create({
                    params: capoConfig,
                    deployedDetails: {
                        config: capoConfig,
                    },                    
                    placeholderAt: `rollupBundlerPlugin for inserting pre-compiled Minter details`,
                    setup: {
                        isMainnet: networkId === "mainnet",
                    },
                });

            minterBundler.loadProgram()
            await minterBundler.compiledScript(true);
            const { programBundle: minterBundle, scriptHash: mph } =
                await minterBundler.getSerializedProgramBundle();
            const { scriptHash, programBundle } =
                await hlBundler.getSerializedProgramBundle();
            state.project.configuredCapo.resolve(hlBundler);

            const {
                capo: { config },
            } = deployDetails;
            debugger;

            // if (mode == "precompiled") {
            this.debug(
                `emitting ${colors.cyanBright("precompiled scripts")} for ${id}`
            );

            
            const info = this.getModuleInfo(id)! as any;
            if (!info?.stellar) {
                debugger;
                this.warn(
                    "incontheeivable!  (at B) No stellar module info for " + id
                );
            }
            const {
                // preconfiguredExportName,
                preconfiguredModuleFilename,
                precompiledModuleFilename,
                precompiledExportName,
                // packageRelativeName,
                // importer,
            } = info.meta.stellar as any;
            
            this.emitFile({
                type: "prebuilt-chunk",
                fileName: precompiledModuleFilename,
                exports: ["precompiled"],
                code:
                    `export const precompiled = {\n` +
                    _i_(`capo: ${JSON.stringify(programBundle, null, 4)},\n`) +
                    _i_(`minter: ${JSON.stringify(minterBundle, null, 4)},\n`) +
                    `};\n` +
                    `export default precompiled;\n`,
            });
            //   ^^^ precompiled script binary, sourcemaps, etc
            //         to be loaded just in time when an on-chain script
            //         is needed.
            // ----------------------------------------------------------
            //   vvv summary details, scriptHashes, params, etc 
            //   vvv  ... for insertion to the lighter-weight capo bundle

            // evalutated in the context of the CapoHeliosBundle class
            // (static variable)
            const staticPreConfiguredDetails = `{
        capo: {
            scriptHash: "${scriptHash}",
            config: this.prototype.parseCapoJSONConfig(${JSON.stringify(
                deployDetails.capo.config,
                null,
                16
            )}),
                  programName: "${hlBundler.program.name}",
        },
        minter: {
            scriptHash: ${JSON.stringify(mph)},
            config: this.prototype.parseCapoMinterJSONConfig({
                seedTxn: ${JSON.stringify(config.seedTxn)},
                seedIndex: ${JSON.stringify(config.seedIndex)},
            }),
            programName: "${minterBundler.program.name}",
        }
    } 
            // static isPreconfigured = true;
            `;
            // deployDetails.capo.scriptHash = hexToBytes(scriptHash);
            // deployDetails.capo.programBundle = programBundle;

            const lazyLoader =
                `\n${_i_(`async loadPrecompiledVariant(variant: string) {\n`)}` +
                _ii__(`if (variant !== "capo") throw new Error(\`unknown capo variant: \${variant}\`);\n`) +
                _ii__(
                    `const module = await import("${precompiledExportName}");\n`
                ) +
                _ii__(`return module.precompiled.capo;\n`) +
                _i_(`}\n\n`) +
                _i_(`async loadPrecompiledMinterScript() {\n`) +
                _ii__(
                    `const module = await import("${precompiledExportName}");\n`
                ) +
                _ii__(`return module.precompiled.minter;\n`) +
                _i_(`}\n\n`);

            const s = new MagicString(code);
            s.replace(
                capoConfigRegex,
                // $1 = leading whitesapce
                // $2 = "preConfigured"
                `$1precompiledScriptDetails = this.constructor.precompiledScriptDetails; \n`+
                `$1static precompiledScriptDetails = ${staticPreConfiguredDetails}\n\n`+
                `$1scriptParamsSource = "bundle";\n`+
                `$1isConcrete = true;\n`+
                `${lazyLoader}`
            );
            // console.log(s.toString());
            // debugger;
            this.debug(`<- transform: Capo/script-details`);
            return {
                code: s.toString(),
                map: s.generateMap({ hires: true }),
            };
        }
    }

    async function addCompiledDetailsNonCapo(
        this: PluginContext,
        code: string,
        id: string
        // mode: "precompiled" | "details"
    ) {
        const s = new MagicString(code);
        const r = filterHLB(id);
        if (!r) {
            this.debug(`<- transform: skipped/non-HLB`);
            return null;
        }
        const interesting = id.match(interestingRegex);
        if (interesting) {
            debugger;
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
                this.debug(`<- transform: no specializedDelegateModule found`);

                return null;
            }
            let hlBundler: HeliosScriptBundle = SomeBundleClass.create({
                originatorLabel: `stellar bundler for finding pre-compiled script variants`,                
                scriptParamsSource: "config",
                setup: {
                    isMainnet: networkId === "mainnet",
                },
            });
            hlBundler.loadProgram()

            const precompiledScriptInfo: Record<
                string,
                string //... with jsonified contents:
                // {
                //     scriptHash: string;
                //     config
                // }
            > = {};

            const precompiledVariants: Record<
                string,
                PrecompiledProgramJSON //... with jsonified contents:
                //     programBundle: any;
                //   // ^^^ removed extraneous programBundle key
                //   // vvv moved to precompiledScriptInfo
                // {
                //     /// scriptHash: string;
                //     ///  config: string
                // }
            > = {};

            if (SomeBundleClass.needsCapoConfiguration) {
                // hourglass emoji: ⏳
                this.debug(`[transform] ...⏳  waiting for configured capo`);
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
                    // racecar emoji: 🏎️
                    this.debug(`[transform] 🏎️ ok, configured capo ready`);
                } else {
                    this.warn(
                        `[transform]  ---- no capo deployment; not inserting compiled script for ${relativePath(
                            id
                        )}`
                    );
                    this.debug(`[transform] <- capo isn't configured`);
                    return null; // transform without injecting compiled script
                }
            }

            let scriptCount = 0;
            let skipCount = 0;
            for (const [variant, params] of Object.entries(
                hlBundler.variants
            )) {
                if (params) {
                    const configuredBundle = SomeBundleClass.create({
                        params,
                        scriptParamsSource: "config",
                        originatorLabel: `stellar bundler, inserting pre-compiled script details for variant '${variant}'`,
                        setup: { isMainnet: networkId === "mainnet" },
                    });

                    const { scriptHash, programBundle, config } =
                        await (async () => {
                            if (
                                configuredBundle.precompiledScriptDetails?.[
                                    variant
                                ]
                            ) {
                                const { scriptHash, config } =
                                    configuredBundle.precompiledScriptDetails[
                                        variant
                                    ];
                                if (!scriptHash) {
                                    throw new Error(
                                        `${configuredBundle.displayName}: missing expected scriptHash for pre-compiled variant ${variant}`
                                    );
                                }
                                const programBundle =
                                    await configuredBundle.loadPrecompiledVariant(
                                        variant
                                    );
                                return {
                                    programBundle,
                                    scriptHash,
                                    config: JSON.stringify(config),
                                };
                            } else {
                                configuredBundle.loadProgram()
                                await configuredBundle.compiledScript(true);
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
                    precompiledScriptInfo[variant] = `{
                        scriptHash: "${scriptHash}",
                        config: ${config},
                    }`;
                    precompiledVariants[variant] = programBundle;
                    scriptCount++;
                } else {
                    debugger;
                    if (state.capoBundle?.configuredUplcParams) {
                        this.warn(
                            `  -- variant '${variant}': derive params from capo? (dbpa)`
                        );
                    } else if (state.capoBundle) {
                        this.warn(
                            `  --variant '${variant}': missing baseParams; skipping (dbpa)`
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
                    `<- transform: skipping script insertion for non-capo ${skipMsg}`
                );
                return null;
            }

            const baseFilename = id.replace(/.*\/(.*\.hlb).[jt]s$/, "$1");
            const info = this.getModuleInfo(id)! as any;
            if (!info?.meta.stellar) {
                {
                    // for troubleshooting
                    debugger;
                    this.getModuleInfo(id)! as any;
                }

                this.debug(
                    `incontheeivable! (at C) ${colors.magenta(
                        "No stellar module info for " + id
                    )}`
                );
                this.warn(
                    "incontheeivable! (at C) No stellar module info for " + id
                );
            }
            const {
                // preconfiguredExportName,
                precompiledModuleFilename,
                precompiledExportName,
                preconfiguredModuleFilename,
                // packageRelativeName,
                // importer,
            } = info.meta.stellar as any;

            this.debug(
                `emitting ${colors.cyanBright(
                    "prebuilt contracts"
                )} in ${precompiledExportName}`
            );
            const refId = this.emitFile({
                type: "prebuilt-chunk",
                fileName: precompiledModuleFilename,
                // fileName: prebuiltFilename,
                exports: ["precompiled"],
                code: `export const precompiled = ${JSON.stringify(
                    precompiledVariants,
                    null,
                    4
                )};
                    export default precompiled;
                    `,
            });
            const precompiledScriptDetails =
                _i_(`precompiledScriptDetails = ({\n`) +
                Object.entries(precompiledScriptInfo)
                    .map(([vName, vSrc]) => _iii___(`${vName}: ${vSrc},\n`))
                    .join("") +
                _i_(`})\n\n`);


            const asyncLoader = `const module = await import("${precompiledExportName}");\n`;
            const badVariant = `throw new Error(\`unknown variant: \${variant}\`);\n`;
            const precompiledScriptLoader =
                _i_(`scriptParamsSource = "bundle";\n`) +
                _i_(`async loadPrecompiledVariant(variant: string) {\n`) +
                _ii__(asyncLoader) +
                _ii__(`const foundVariant = module.precompiled[variant];\n`) +
                _ii__(`if (!foundVariant) {\n`) +
                _iii___(badVariant) +
                _ii__(`}\n`) +
                _ii__(`return foundVariant;\n`) +
                _i_(`}\n\n`);
            // _iii +
            // `// no side effect: prevent the precompiled module from being tree-shaken out\n` +
            // _iii +
            // `await import(${precompiledModuleName});\n` +

            s.replace(regex, (_match, specializedDelegateModule, getMain) => {
                this.debug(`[transform] -- inserting pre-compiled script`);
                const existing = specializedDelegateModule || getMain;
                return `\n${precompiledScriptDetails}\n\n${precompiledScriptLoader}   ${existing}`;
            });

            // console.log(s.toString());
            this.debug(
                `<- transform: non-capo w/ ${scriptCount} compiled script(s)${skipMsg}`
            );
            return {
                code: s.toString(),
                map: s.generateMap({ hires: true }),
            };
        }
        throw new Error(
            `bundle module format error\n` +
                ` ... non-Capo must define 'specializedDelegateModule = ...\n` +
                ` ... or EXACTLY AND VERBATIM: \`static needsSpecializedDelegateModule = false\``
        );
        // return null;
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

function _i_(x: string) {
    return "    " + x;
} // indent
function _ii__(x: string) {
    return _i_(_i_(x));
}
function _iii___(x: string) {
    return _ii__(_i_(x));
}
