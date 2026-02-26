# scripts/release — Interview Context

> Working document for the REQM interview. Requirements will be formalized in `release.reqts.jsonl`.

## About

`scripts/release` is a Bash release automation script for the `@donecollectively/stellar-contracts` package.
It automates the end-to-end release process: version bumping, build, packaging, meta-assets publication,
branch weaving, tagging, and push. It is also exposed to downstream projects as `stellar-release` (or
`stellar release`) so any project using stellar-contracts and weaver can get the same release behaviors.

## Background

Manual releases require coordinating: version bump in package.json, build, npm pack, weave branch DAG,
add asset to meta-assets, create git tag, push. This is error-prone and tedious. The script codifies
the correct sequence with guard rails (clean branch, version already released check, etc.).

## Design Goals

### General Approach
- Script in `scripts/` — implemented in JavaScript (Node.js), using the `semver` package for bump logic
- Uses existing weaver tools (.weaver/list-assets, .weaver/add-asset, .weaver/sync, .proj/weave.sh)
- Exposed downstream via pnpm `bin` entry

### Specific Goals
1. **Guard rails first** — check branch cleanliness, version state, and pre-conditions before any mutation
2. **Semver bump control** — default=patch, --bump=minor or --bump=major
3. **Weaver-native** — uses existing .weaver/ tools; no new infrastructure
4. **Downstream reuse** — exposed as `stellar-release` so downstream projects can call it

## Key Behaviors (from user description)

### Execution order (guards bad state)
1. Pre-flight checks (fail fast before any mutations)
2. Build — succeed or exit before touching git
3. Bump version in package.json + commit to main
4. Release notes curation step:
   - Generate 3 files in a temp dir: (1) raw git commit log, (2) empty CHANGELOG entry template, (3) empty release notes template
   - List the 3 files on screen
   - Default: open a bash shell so user can curate manually
   - The release script sets these env vars before invoking the curation step (default shell or `CHANGELOG_CURATOR`):
     - `VERSION_PREV` — last released tag (default: most recent git tag); can be overridden by caller
     - `VERSION_NEXT` — the new release version (post-bump)
     - `COMMIT_LOGS_FILE` — path to raw git log file in mktemp dir
     - `RELEASE_NOTES_FILE` — path to release notes template file in mktemp dir
     - `CHANGELOG_SEGMENT` — path to CHANGELOG entry template file in mktemp dir
   - If `CHANGELOG_CURATOR` env var is set: invoke that command/script; it receives the above env vars
   - After shell/curator exits: commit `.proj/releases/{version}.release-notes.md` to proj + CHANGELOG to main
5. Weave proj → main (DAG link)
6. `pnpm pack` → rename to `stellar-contracts-{version}.tgz`
7. `add-asset` → weave proj+main → meta-assets → tag → push
8. Cleanup temp files

On failure in step 6+: show `git status` for all checked-out worktrees (main + `.proj/`). No automated rollback — user resolves from shown state.

### Pre-flight checks
- Verify main branch is clean
- Verify main has been merged to proj (weaved)
- Check meta-assets for existing bundle matching current version — error unless manual bump was done

### Version management
- Reads current version from package.json
- Bumps version if needed (patch/minor/major)
- Updates package.json with new version

### Build & package
- Runs `pnpm build`
- Packages dist into `.tgz` bundle

### Downstream reference format
Tag style (`0.9.4-beta.1`, no `v` prefix) is preserved. Switching from dist/ → .tgz means `github:#semver:` no longer delivers a valid package — downstream guidance will be updated to reference the .tgz directly (exact URL). The release script is not responsible for the downstream format change.

### Publish
- Adds `stellar-contracts-{version}.tgz` to meta-assets via `.weaver/add-asset`
- Weaves proj+main into meta-assets via `.weaver/sync`
- Tags the meta-assets tip with verbatim version (no `v` prefix, e.g. `0.9.5`)
- Pushes meta-assets branch and tag to origin

### Downstream exposure
- Exposed as `stellar-release` (or `stellar release`) for downstream projects using weaver

## Open Questions

- [x] 1.1: Standard pnpm `bin` entry (`"stellar-release": "scripts/release"`). If `.weaver/` is absent, script detects it and offers to set up Eidos Weaver.
- [x] 1.2: Tag format: verbatim package.json version, NO `v` prefix (e.g. `0.9.4-beta.1`). Confirmed from remote: 38+ tags in this format going back to `0.9.0-beta.3`. Old `v0.9.0-beta1` tags are pre-convention outliers. Tags were not locally fetched — script must fetch/check remote tags.
- [x] 1.3 (pre-flight duplicate check): Fetch remote tags and check whether the current version tag already exists on origin. A tag's presence is the canonical signal that a version has been fully released — not the TGZ file listing. If the tag exists and no `--bump` was passed, show available bump options with resulting version numbers (filtered by validity for current version type), then exit. User re-runs with desired flag.

- [x] 1.3: Bump modes:
  - `--bump=patch`: ONLY valid on pre-release versions. Increments pre-release counter (`0.9.4-beta.1`→`0.9.4-beta.2`). Error if current version is stable.
  - `--bump=release`: ONLY valid on pre-release versions. Graduates to stable (`0.9.4-beta.1`→`0.9.4`). Error if current version is stable.
  - `--bump=minor`: `0.9.4-beta.1`→`0.9.5` or `0.9.4`→`0.9.5` (bump patch digit — "next minor" in project convention)
  - `--bump=major`: bumps major version (`0.9.4`→`1.0.0`)
  - `--bump=prerelease`: bumps patch and starts beta.1 (`0.9.5`→`0.9.6-beta.1`)
  - default (`--bump=release-or-minor`): if on pre-release → drop pre-release label (`0.9.5-beta.12`→`0.9.5`); if stable → minor bump (`0.9.4`→`0.9.5`). Always one tag.
- [x] 1.4: Release notes use an agent interview process (not automated summarization). Full commit history since last tag, no merge commits, no --oneline — all change details considered. Output: `.proj/releases/<version>.release-notes.md` (not exhaustive but not summary-only). CHANGELOG.md gets a customer-facing summary prepended, linking to the release notes file in two variants: local weaver-checkout path and remote github-style URL. The release notes process will be formalized as a Skill Crafter skill with a nested audit process. The release script invokes this as an agent interaction step.
- [x] 1.5: Two checks: (1) main working tree is clean (`git status` shows no uncommitted changes); (2) proj tip is an ancestor of main — `git merge-base --is-ancestor proj main` — confirming `.weaver/sync` has already been run. Topology: proj → main → meta-assets.
- [x] 1.6: Bundle named `stellar-contracts-{version}.tgz` (rename from pnpm pack default). Staging location is implementation detail — clean up after `.weaver/add-asset`.
