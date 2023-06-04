/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import { defineConfig } from 'vite';
// import heliosPlugin from './lib/HeliosLoader.ts';
import { string } from "rollup-plugin-string";

export default defineConfig({
    plugins: [
        string({
            // Required to be specified
            include: "**/*.hl",
        })  
    //     heliosPlugin()
    ],
  test: {
    // include: ['tests/new*.test.ts', ],
    include: ['tests/*.test.ts', 'tests/*.test.js'],
    
    // browser: {
    //     enabled: true,
    //     name: 'chrome', // browser name is required
    //   },
    },
});
