/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import { resolve } from 'path';
import { defineConfig } from 'vite';
import { heliosRollupLoader } from './src/heliosRollupLoader';

export default defineConfig({
    plugins: [
        heliosRollupLoader(),
    ],
  test: {
    // include: ['tests/new*.test.ts', ],
    include: ['tests/*.test.ts', 'tests/*.test.js'],
    restoreMocks: true,
    testTimeout: 500000,
    globals: true,
    // browser: {
    //     enabled: true,
    //     name: 'chrome', // browser name is required
    //   },
    },

    build: {
        target: ["node", "esnext" ],
        lib: {
          // Could also be a dictionary or array of multiple entry points
          entry: resolve(__dirname, 'index.ts'),
          name: 'stellar-contracts',
          // the proper extensions will be added
          fileName: 'stellar-contracts',
        }
    }
});
