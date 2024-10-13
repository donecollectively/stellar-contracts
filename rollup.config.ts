// seems to have a bug that deletes one of the pnpm modules :/
// import { apiExtractor } from "rollup-plugin-api-extractor";
import externals from "rollup-plugin-node-externals";
import { platformModulePaths } from "./rollup.lib.js";

import esbuild from "rollup-plugin-esbuild";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import execute from "rollup-plugin-shell";
import sourcemaps from "rollup-plugin-sourcemaps";

// const packageJson = await import("./package.json", { assert: { type: "json" } });

import packageJson from "./package.json" assert { type: "json" };
import { heliosRollupLoader } from "./src/helios/heliosRollupLoader.js";
const name = packageJson.main.replace(/\.m?js$/, "");

const serverBundledModules : string[] = [
    // "@hyperionbt/helios"
];
const forcedServerExternals : string[] = [];

const notified = {}

// import { join } from "path";
// import alias from "@rollup/plugin-alias";
// console.warn({modulePaths})
const codeBundle = (config) => {
    if (!config.input) throw new Error(`missing required entry module 'input'`);

    return {
        ...config,

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

// console.log(JSON.stringify(browserRollupConfig, null, 2))
export default [
    codeBundle({
        input: "./index.ts",
        plugins: [
            // externals(),
            heliosRollupLoader({
                project: "stellar-contracts"
            }),
            json(),
            resolve({
                ...platformModulePaths("server"),
                extensions: [".json", ".ts"],
            }),
            // sourcemaps(),
            esbuild({
                tsconfig: "./tsconfig.json",
                target: ["node18" ],
                
                sourceMap: false,
            }),
            // heliosRollupTypeGen(),
            execute({
                sync: true,
                commands: [
                    "./scripts/smokeBuild"
                    // "set -e ; tsc & \n p=$! ; if [ \"$SMOKE\" != \"\" ] ; \nthen \n pnpm smoke:test & \n api-extractor run --local --verbose & fi  ;\n  if ! wait $p ; then { echo '---------- TYPESCRIPT ERRORS --------- ' ; tsc ; } else { api-extractor run --local --verbose ; } fi "
                    // "tsc -p ./tsconfig.dts.json &&  api-extractor run --local --verbose"
                ]
            })
            // apiExtractor({
            //     configFile: "./api-extractor.json",
            //   }),        
        ],
        output: [
            {
                file: `${name}.mjs`,
                format: "es",
                sourcemap: false,
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
];
