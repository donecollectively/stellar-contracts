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
- Script in `scripts/` — implementation language (Bash vs JavaScript) is an open question
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
4. Release notes interview (in `mktemp` dir) → commit `.proj/releases/{version}.release-notes.md` to proj + CHANGELOG to main
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
- [x] 1.3: Bump modes:
  - `--bump=patch`: `0.9.4-beta.1`→`0.9.4-beta.2` (pre-release counter); `0.9.4`→`0.9.5` (stable patch)
  - `--bump=minor`: `0.9.4-beta.1`→`0.9.5` (drop pre-release, bump patch — "next minor" in project convention)
  - `--bump=major`: TBD (presumably `0.9.x`→`0.10.0` or `1.0.0`)
  - `--bump=release`: `0.9.4-beta.1`→`0.9.4` (graduate, no version bump)
  - `--bump=prerelease`: `0.9.5`→`0.9.6-beta.1` (bump patch + start pre-release series)
  - default (`--bump=release-or-minor`): single release — if on pre-release (`0.9.5-beta.12`) → drop pre-release → `0.9.5`; if stable (`0.9.4`) → minor bump → `0.9.5`. Always one tag.
- [x] 1.4: Release notes use an agent interview process (not automated summarization). Full commit history since last tag, no merge commits, no --oneline — all change details considered. Output: `.proj/releases/<version>.release-notes.md` (not exhaustive but not summary-only). CHANGELOG.md gets a customer-facing summary prepended, linking to the release notes file in two variants: local weaver-checkout path and remote github-style URL. The release notes process will be formalized as a Skill Crafter skill with a nested audit process. The release script invokes this as an agent interaction step.
- [x] 1.5: Two checks: (1) main working tree is clean (`git status` shows no uncommitted changes); (2) current proj tip is an ancestor of main (`.weaver/sync` has been run). Topology: proj → main → meta-assets.
- [x] 1.6: Bundle named `stellar-contracts-{version}.tgz` (rename from pnpm pack default). Staging location is implementation detail — clean up after `.weaver/add-asset`.
