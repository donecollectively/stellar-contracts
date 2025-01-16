// seems to have a bug that deletes one of the pnpm modules :/
// import { apiExtractor } from "rollup-plugin-api-extractor";
import externals from "rollup-plugin-node-externals";
import { platformModulePaths } from "./rollup.lib.js";

import esbuildPlugin from "rollup-plugin-esbuild";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import sourcemaps from "rollup-plugin-sourcemaps";

// const packageJson = await import("./package.json", { assert: { type: "json" } });

import packageJson from "./package.json" with { type: "json" };
import { 
    heliosRollupLoader, 
    heliosRollupTypeGen
} from "./dist/rollup-plugins.mjs";

const name = packageJson.main.replace(/\.m?js$/, "");
const serverBundledModules : string[] = [];
const forcedServerExternals : string[] = [
    "rollup-plugin-esbuild", "esbuild"
];

const notified = {}

// import { join } from "path";
// import alias from "@rollup/plugin-alias";
// console.warn({modulePaths})
const codeBundle = (config) => {
    if (!config.input) throw new Error(`missing required entry module 'input'`);

    let didWarn = false;
    return {
        ...config,
        onwarn(warning: any, warn: (s: string) => void) {
            if (warning.code === "CIRCULAR_DEPENDENCY") {
                if (
                    warning.message == "Circular dependency: src/StellarTxnContext.ts -> src/diagnostics.ts -> src/StellarTxnContext.ts" 
                    || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts"
                    || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramFs.ts -> src/helios/CachedHeliosProgram.ts"
                    || warning.message == "Circular dependency: src/helios/CachedHeliosProgram.ts -> src/helios/CachedHeliosProgramWeb.ts -> src/helios/CachedHeliosProgram.ts"
                    || warning.message == "Circular dependency: src/diagnostics.ts -> src/StellarTxnContext.ts -> src/diagnostics.ts"
                    || warning.message == "Circular dependency: src/diagnostics.ts -> src/delegation/jsonSerializers.ts -> src/diagnostics.ts"
                ) {
                    if (didWarn) return;
                    didWarn = true
                    warn("    ... some known circular dependencies...")
                    return;
                }
                // console.warn("circular: ", warning)
            }
            warn(warning)
        },
        external: (id) => {
            // console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ext check")
            if (serverBundledModules.includes(id)) {
                if (!notified[id]) {
                    console.warn("    --- bundling module:", id);
                    notified[id] = true;
                }
                return false;
            }
            if (forcedServerExternals.includes(id)) {
                console.warn("    --- dependency on external module:", id);
                return true;
            }

            return !/^[./]/.test(id);
        },
    };
};
const heliosLoader = heliosRollupLoader({
    project: "stellar-contracts"
});
const heliosTypeGen = heliosRollupTypeGen();

const dualPlatformEntryPoints = {
};
const nodeOnlyEntryPoints = {
    // "ContractBasedDelegate": "./src/delegation/ContractBasedDelegate.ts",
    "testing": "./src/testing/index.ts",
}
const browserOnlyEntryPoints = {
}
const platformIndependentEntryPoints = {
    "ContractBasedDelegate": "./src/delegation/ContractBasedDelegate.ts",
    "HeliosBundle": "./src/helios/HeliosScriptBundle.ts",
    "CapoHeliosBundle": "./src/CapoHeliosBundle.ts",
    "CapoDelegateHeliosBundle": "./src/delegation/CapoDelegateBundle.ts",
    "DelegatedDataContract": "./src/delegation/DelegatedDataContract.ts",
    "stellar-contracts": "./index.ts",
};

// !restore the codeBundle() call below for this when needed
const browserTargetedEntryPoints = {
    ...dualPlatformEntryPoints,
    ...browserOnlyEntryPoints
};
export default [
    false && codeBundle({
        input: {
            ...dualPlatformEntryPoints,
            ...nodeOnlyEntryPoints
        },
        plugins: [
            // externals(),
            heliosLoader, 
            heliosTypeGen,
            json(),
            resolve({
                // ...platformModulePaths("server"),
                exportConditions: ["node"],
                extensions: [".json", ".ts", ".js"],
            }),
            // sourcemaps(),
            esbuildPlugin({
                tsconfig: "./tsconfig.json",
                target: ["node18" ],
                dropLabels: [ "__BROWSER_ONLY__" ],
                sourceMap: false,                
            })
        ],
        output: [
            {
                dir: "./dist/",
                sourcemap: true,
                entryFileNames: "[name]-node.mjs",
                chunkFileNames: "[name]-node.mjs",
                format: "es",
                // tells Chrome devtools to automatically omit these files from the stack presentation 
                // sourcemapIgnoreList: (relativeSourcePath, sourcemapPath) => {
                //     // console.warn("ignore list? ", relativeSourcePath);
                //     if (relativeSourcePath.includes('helios')) {
                //         // console.warn("INCLUDING");
                //         return false;
                //     }

                //     // will ignore-list all files with node_modules in their paths
                //     if (relativeSourcePath.includes('node_modules')) return true;
                //     // console.warn("INCLUDING");
                //     return false
                // },
    
            },
        ],
    }),
    // codeBundle({
    //     input: browserTargetedEntryPoints,
    //     plugins: [
    //         // externals(),
    //         heliosLoader, 
    //         heliosTypeGen,
    //         json(),
    //         resolve({
    //             // ...platformModulePaths("browser"),
    //             exportConditions: ["browser"],
    //             extensions: [".json", ".ts", ".js"],
    //         }),
    //         // sourcemaps(),
    //         esbuildPlugin({
    //             tsconfig: "./tsconfig.json",
    //             target: ["node18" ],
    //             dropLabels: [ "__NODEJS_ONLY__" ],
    //             sourceMap: false,                                
    //         })
    //     ],
    //     output: [
    //         {
    //             dir: `./dist/`,
    //             entryFileNames: "[name]-browser.mjs",
    //              chunkFileNames: "[name]-browser.mjs",
    //             sourcemap: true,
    //             format: "es",
    //         }
    //     ]
    // }),
    codeBundle({
        input: platformIndependentEntryPoints,
        plugins: [
            // externals(),
            heliosLoader, 
            heliosTypeGen,
            json(),
            resolve({
                extensions: [".json", ".ts", ".js"],
            }),
            // sourcemaps(),
            esbuildPlugin({
                tsconfig: "./tsconfig.json",
                target: ["node18" ],
                sourceMap: false,                                
            })
        ],
        output: [
            {
                dir: `./dist/`,
                entryFileNames: "[name].mjs",
                chunkFileNames: "[name].mjs",
                sourcemap: true,
                format: "es",
            }
        ]
    }),
    // codeBundle({
    //     input: "./src/testing/index.ts",
    //     plugins: [
    //         sourcemaps(),
    //         externals(),
    //         heliosRollupLoader(),
    //         json(),
    //         resolve({
    //             ...platformModulePaths("server"),
    //             extensions: [".json", ".ts"],
    //         }),
    //         esbuild({
    //             tsconfig: "./tsconfig.json",
    //             target: ["node18" ],
    //         }),
    //     ],
    //     output: [
    //         {
    //             file: `dist/testing.mjs`,
    //             format: "es",
    //             sourcemap: true,
    //         },
    //     ],
    // }),
    
    // codeBundle({
    //     input: "./index.ts",
    //     plugins: [
    //         dts()
    //     ],
    //     output: {
    //         file: `${name}.d.ts`,
    //         format: "es",
    //     },
    // }),
].filter((x) => !!x);