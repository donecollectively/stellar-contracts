import esbuild from "rollup-plugin-esbuild";
import externals from "rollup-plugin-node-externals";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";

import { platformModulePaths } from "./rollup.lib.js";
import sourcemaps from "rollup-plugin-sourcemaps";

// const packageJson = await import("./package.json", { assert: { type: "json" } });

import packageJson from "./package.json" assert { type: "json" };
import { heliosRollupLoader } from "./src/heliosRollupLoader.js";
const name = packageJson.main.replace(/\.m?js$/, "");

const serverBundledModules : string[] = [];
const forcedServerExternals = ["@hyperionbt/helios"];

// import { join } from "path";
// import alias from "@rollup/plugin-alias";
// console.warn({modulePaths})
const codeBundle = (config) => {
    if (!config.input) throw new Error(`missing required entry module 'input'`);

    return {
        ...config,
        external: (id) => {
            if (serverBundledModules.includes(id)) return false;
            if (forcedServerExternals.includes(id)) {
                console.warn("---ext detect ---", id);
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
            sourcemaps(),
            externals(),
            heliosRollupLoader(),
            json(),
            resolve({
                ...platformModulePaths("server"),
                extensions: [".json", ".ts"],
            }),
            esbuild({
                tsconfig: "./tsconfig.json",
                target: ["node18" ],
            }),
        ],
        output: [
            {
                file: `${name}.mjs`,
                format: "es",
                sourcemap: true,
            },
        ],
    }),
    codeBundle({
        input: "./src/testing/index.ts",
        plugins: [
            sourcemaps(),
            externals(),
            heliosRollupLoader(),
            json(),
            resolve({
                ...platformModulePaths("server"),
                extensions: [".json", ".ts"],
            }),
            esbuild({
                tsconfig: "./tsconfig.json",
                target: ["node18" ],
            }),
        ],
        output: [
            {
                file: `dist/testing.mjs`,
                format: "es",
                sourcemap: true,
            },
        ],
    }),
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
