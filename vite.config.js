/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import { resolve } from "path";
import { defineConfig } from "vite";
import { heliosRollupLoader } from "./src/helios/heliosRollupLoader";
import { heiiosRollupTypeGen } from "./src/helios/heliosRollupTypeGen";
import { sourceMapsEnabled } from "process";
import { debug } from "console";

debugger
const profiling = parseInt(process.env.PROFILE);
// WTF Vitest? suppressing console output AND stderr output?!? BAD!
// ... can't even stop with the debugger! : ( 
// if (profiling) {
//     debugger
//     process.stderr.write("NOTE: Profiling enabled because env.PROFILE is set!\n");
//     process.stderr.write(" ... connect with node inspector from Chrome DevTools to view the profile traces.\n\n");
//     process.stderr.write("This causes some problems in vitest's terminal output, so you'll want to\n");
//     process.stderr.write(" ... disable it when not profiling.");
// }
const profilingOptions = profiling ? {
    poolOptions: {
        forks: {
            singleFork: true
        }
    },
    inspect: true,
    disableConsoleIntercept: true,
} : {};

// --poolOptions.forks.singleFork --disableConsoleIntercept 
export default defineConfig({
    plugins: [
        heliosRollupLoader({ project: "stellar-contracts" }),
        heiiosRollupTypeGen()
    ],
    test: {
        // include: ['tests/new*.test.ts', ],
        include: ["tests/*.test.ts", "tests/*.test.js"],
        restoreMocks: true,
        ...profilingOptions,
        hookTimeout: 500000,
        testTimeout: 500000,
        globals: true,
        // browser: {
        //     enabled: true,
        //     name: 'chrome', // browser name is required
        //   },
    },

    build: {
        target: ["node", "esnext"],
        lib: {
            // Could also be a dictionary or array of multiple entry points
            entry: resolve(__dirname, "index.ts"),
            name: "stellar-contracts",
            // the proper extensions will be added
            fileName: "stellar-contracts",
        },
    },
});
