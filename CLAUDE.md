# CLAUDE.md

This file provides guidance specific to maintaining the stellar-contracts
repository itself. For architectural concepts, patterns, and reference material
that applies to both this repo and downstream dApps, see `AGENTS.md`.

## Related Project Symlinks

Note that ./skillz/ may exist as symlink for local co-development of those repositories.  If you get an error accessing them, you may look in node_modules/ for them instead.

You MUST load ./skillz/index.md !!!

## Development Commands

### Build & Development
- `pnpm build` — Full production build (runs rollup, generates types, builds docs)
- `pnpm dev` — Development mode with watch/rebuild on file changes
- `scripts/build` — Direct build script execution

Always use `pnpm`. Never use `npx` or `pnpx` if a direct `pnpm` command will do.

When types are changed, `pnpm dev` will NOT regenerate the types; `pnpm build` is needed in that case.

Note that tests import some packages built into dist/ — any changes to those packages will NOT be reflected in the tests until you run `pnpm build`.

To check types in the project, you MUST use `pnpm build`, not `tsc`.

NEVER START TWO BUILDS OR TESTS with `| head` and `| tail` because this creates unnecessary overhead. Run a command and send its output to a file; inspect that output file.

### Testing
- `pnpm test` — Run all tests once
- `pnpm testing` — Run tests in watch mode
- `fit()` instead of `it()` for focusing on a single test
- `pnpm test ‹one-filename›` for running a specific test
- `pnpm testing:debug` — Run tests with debugger attached
- `pnpm smoke:test` — Run smoke tests (tests 02 and 04 only)
- Test files are generally located in `tests/` directory with `.test.ts` extension

MOST TESTS ARE FULL INTEGRATION WITH EMULATED CHAIN and take non-trivial time. NEVER start multiple instances of the test at the same time; instead, redirect ONE test process output to a file and work with that file. STRONGLY prefer running a specific test case with `pnpm test ‹one-filename› -t "one test unique string"` instead of running an entire test file.

### Documentation
- `pnpm docs:build` — Generate TypeScript declarations and documentation
- `pnpm docs:generate` — Generate TypeDoc documentation only

### Node Version
Use `nvm use` to switch to the correct Node.js version (requires Node >= 20)

## Build System Notes

- Uses custom Rollup plugins to compile Helios (`.hl`) files during bundling
- Generates multiple package entry points (`stellar-contracts`, `testing`, `ui`, `rollup-plugins`)
- TypeScript configured with `module: "preserve"` and `moduleResolution: "bundler"`
- Build outputs to `dist/` with `.mjs` format and source maps

**Build tooling source**:
- `src/helios/rollupPlugins/` — Custom Rollup plugins for Helios compilation
- `scripts/build` — Main build orchestration script
- `rollup.config.ts` — Rollup bundler configuration
- `vite.config.js` — Vitest test configuration

## MUST LOAD Related skills index

Before you do anything, you MUST ensure you loaded ./skillz/index.md and use
this to load any of the mentioned skills just in time when needed.
