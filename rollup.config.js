import dts from "rollup-plugin-dts";
import ts from "rollup-plugin-ts";
import externals from "rollup-plugin-node-externals";
import resolve from "@rollup/plugin-node-resolve";
import { string } from "rollup-plugin-string";
import { platformModulePaths } from "./rollup.lib.js";

import packageJson from "./package.json" assert { type: "json" };
const name = packageJson.main.replace(/\.m?js$/, "");

const serverBundledModules = [];
const forcedServerExternals = [];

// import { join } from "path";
// import alias from "@rollup/plugin-alias";
// console.warn({modulePaths})
const codeBundle = (config) => {
    if (!config.input) throw new Error(`missing required entry module 'input'`);

    return {
        ...config,
        external: (id) => {
            if (serverBundledModules.includes(id)) return false;
            if (forcedServerExternals.includes(id)) return true;
            // console.warn("---ext detect ---", id)

            return !/^[./]/.test(id);
        },
    };
};

// console.log(JSON.stringify(browserRollupConfig, null, 2))
export default [
    codeBundle({
        input: "lib/index.ts",
        plugins: [
            externals(),
            string({
                // Required to be specified
                include: "**/*.hl",
            }),
                resolve({
                ...platformModulePaths("server"),
                extensions: [".json", ".ts"],
            }),
            ts(),
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
        input: "lib/index.ts",
        plugins: [dts()],
        output: {
            file: `${name}.d.ts`,
            format: "es",
        },
    }),

];
