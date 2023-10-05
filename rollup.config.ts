import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import externals from "rollup-plugin-node-externals";
import resolve from "@rollup/plugin-node-resolve";
import { platformModulePaths } from "./rollup.lib.js";
import sourcemaps from "rollup-plugin-sourcemaps";

import packageJson from "./package.json" assert { type: "json" };
import { heliosRollupLoader } from "./lib/heliosRollupLoader.js";
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
            resolve({
                ...platformModulePaths("server"),
                extensions: [".json", ".ts"],
            }),
            esbuild(),
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
        input: "./index.ts",
        plugins: [
            dts()
        ],
        output: {
            file: `${name}.d.ts`,
            format: "es",
        },
    }),
];
