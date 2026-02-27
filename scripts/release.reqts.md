# About scripts/release

## MAINTAINERS MUST READ:
> **AUTO-GENERATED FILE - DO NOT EDIT DIRECTLY**
>
> This file is generated from the `.reqts.jsonl` source. To make changes:
> 1. Edit the JSONL source file
> 2. Run `node generate-reqts.mjs` to regenerate
>
> **COMPLIANCE TRIGGER**: Before interpreting these requirements, you **MUST** read:
> `reqt-consumer.SKILL.md`
>
> **hash.notice.reqt-consumer**: 5dddc026e9370dc8

Release automation script for @donecollectively/stellar-contracts. Handles version bumping, build, packaging, weaver integration, tagging, and publishing to meta-assets. Also exposed as stellar-release for use in downstream projects.

The essential technologies are **node, pnpm, git, weaver**. Related technologies include semver, github, bash.


# Background

Manual releases of stellar-contracts require coordinating version bumps, builds, npm pack, weaver branch DAG weaving, meta-assets publication, git tagging, and push. This multi-step sequence is error-prone and tedious — a missed step can leave git state inconsistent across worktrees or publish an incomplete bundle.



# Design Goals

**General Approach**

- Script in `scripts/` — JavaScript (Node.js), using semver for bump logic
- Uses existing weaver tools (.weaver/add-asset, .weaver/sync, .proj/weave.sh)
- Exposed downstream via pnpm bin entry

**Specific Goals**

1. **Guard Rails First**: Fail fast on dirty trees, stale weaves, or duplicate versions before any mutation
2. **Deterministic Bumps**: Explicit --bump flag with predictable semver behavior for each mode
3. **Weaver-Native**: Leverage existing .weaver/ tooling with no new infrastructure
4. **Downstream Reuse**: Exposed as stellar-release so downstream projects get identical release behavior


# Must Read: Special Skills and Know-how

1. **Weaver sync/weave semantics, worktree management, branch topology (proj → main → meta-assets)**: When implementing or reviewing the publication sequence (Areas 5-6), weave operations, or branch DAG topology → load `.weaver/host-repo.SKILL.md`

# Collaborators



**Expected users:** Library maintainers, downstream projects using stellar-contracts and weaver

# Functional Areas and Key Requirements

### 1. Pre-flight Guards
Checks that must pass before any mutations begin

#### Key Requirements:
1. **Clean Working Tree**: When you run a release, the script catches uncommitted changes upfront — you'll never ship a dirty working tree
2. **Proj Woven Into Main**: Before any release proceeds, you're guaranteed that all proj-branch content is woven into main — nothing gets left behind
3. **No Duplicate Release**: If you accidentally try to re-release an existing version, the script stops and shows you exactly which bump options are available and what version each produces

### 2. Version Bump Control
How the script determines and applies the new release version

#### Key Requirements:
1. **Bump Flag**: You control the release type with a single --bump flag — no manual package.json edits needed
2. **Bump Behavior Per Mode**: Each bump mode has deterministic behavior — you always know exactly what version you'll get from any starting point
3. **CLI Interface**: You get clear help with real version examples, invalid input always tells you what went wrong, and releases are triggered with familiar pnpm run commands — downstream projects get the same behavior via stellar-release

### 3. Build and Package
Building and packaging the release artifact before git mutations

#### Key Requirements:
1. **Build Before Mutations**: The build runs before any git changes — if it fails, your repo is untouched
2. **Bundle Naming and Cleanup**: You get a predictably-named stellar-contracts-{version}.tgz bundle, and staging artifacts are cleaned up automatically

### 4. Release Documentation Curation
Producing two tiers of release content: a public changelog entry for users and detailed release notes for technical stakeholders

#### Key Requirements:
1. **Curation Step Mechanics**: When a release reaches the curation step, you get a temp directory with three prepared files and a set of env vars — then either a shell or your custom curator command runs with that context
2. **Content Source**: Your curator always receives the full commit history since the last release — no merge noise, no truncated messages — so every change is visible for review
3. **Detailed Release Notes Output**: After curation, you'll find detailed release notes at a stable, version-specific path — substantive enough to understand the release without reading every commit
4. **Public Changelog Output**: CHANGELOG.md gets a concise public entry linking to the detailed release notes — quick to scan, with depth one click away

### 5. Publication Sequence
Ordering of git mutations to ensure a coherent release state

#### Key Requirements:
1. **Pre-Meta-Assets Commits and Weave**: Version bump, release notes, and changelog are all committed and woven before meta-assets publication begins — you won't get a half-committed release
2. **Meta-Assets Publication**: The bundle is added to meta-assets, the DAG is woven, the tag is created, and everything is pushed — in one correct sequence you don't have to orchestrate

### 6. Downstream Exposure and Error Recovery
Behavior in downstream projects and on mid-release failure

#### Key Requirements:
1. **Weaver Detection**: If you run the script without weaver set up, it detects this and offers to help — no cryptic failures
2. **Failure Status Display**: If something fails mid-release after git mutations, you see the exact status of every worktree so you can recover without guesswork
3. **Downstream Init Subcommand**: You run a single init command and your downstream project gets all the release:* scripts wired into package.json automatically


# Detailed Requirements

## Area 1: Pre-flight Guards

### **REQT-1.1/r0g2gfymrt**: **BACKLOG**/draft: **Clean Working Tree**
#### Purpose: Ensures the release always starts from a known-good git state, preventing uncommitted changes from contaminating the build or being silently excluded. Applied before implementing or reviewing any mutation step.

 - 1.1.1: REQT-5zsdm0x74r: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Working Tree Cleanliness Check** - The script MUST verify the working tree before any mutations begin. Uncommitted changes MUST cause a hard fail. Untracked files with --untracked-ok MUST be silently ignored. Untracked files in a non-TTY context MUST cause a hard fail. Untracked files in a TTY context MUST prompt the user to continue or abort.

### **REQT-1.2/n04657rp5t**: **BACKLOG**/draft: **Proj Woven Into Main**
#### Purpose: Ensures all project-branch content is incorporated into main before a release is cut. Applied as part of pre-flight verification when reviewing the release sequence.

 - 1.2.1: REQT-nt4bpnpgag: **BACKLOG**/draft: **Proj Ancestry Check** - The script MUST verify that the proj branch tip is an ancestor of main (i.e. .weaver/sync has been run) before proceeding.

### **REQT-1.3/k8jkb0gef1**: **BACKLOG**/draft: **No Duplicate Release**
#### Purpose: Guards against publishing a version that has already been released. Uses the presence of a remote git tag as the canonical signal. Applied during pre-flight before any mutations begin.

 - 1.3.1: REQT-wyh7se401f: **BACKLOG**/draft: **Already-Released Version Detection** - The script MUST fetch remote tags and check whether the current version tag already exists on origin. If it does and no --bump flag was provided, the script MUST display the valid bump options for the current version type (pre-release or stable), each with its resulting version number, then exit. The script MUST NOT show options that are invalid for the current version type (e.g. --bump=patch and --bump=release are not shown for stable versions).

## Area 2: Version Bump Control

### **REQT-2.1/ev26jfd4ce**: **BACKLOG**/draft: **Bump Flag**
#### Purpose: Establishes the CLI interface for controlling which kind of version increment to apply. Applied when invoking the release script or configuring pnpm release scripts.

 - 2.1.1: REQT-rgt21gw5mn: **BACKLOG**/draft: **Supported Bump Modes** - The script MUST support --bump=patch|minor|major|release|prerelease|release-or-minor. The default when no flag is provided MUST be release-or-minor.

### **REQT-2.2/nc74ve6dan**: **BACKLOG**/draft: **Bump Behavior Per Mode**
#### Purpose: Defines the exact semantic behavior for each bump mode to ensure deterministic and predictable version transitions. Applied when testing or implementing bump logic, or reviewing version output.

 - 2.2.1: REQT-5vay51a5w9: **BACKLOG**/draft: **Mode-by-Mode Semantics** - Bump behavior MUST be: patch — pre-release only: increments pre-release counter (0.9.4-beta.1→0.9.4-beta.2); MUST error if current version is stable; release — pre-release only: graduates to stable (0.9.4-beta.1→0.9.4); MUST error if current version is stable; minor — bumps patch digit for both stable and pre-release (0.9.4-beta.1→0.9.5, 0.9.4→0.9.5); major — bumps major version (0.9.4→1.0.0); prerelease — bumps patch and starts beta.1 (0.9.5→0.9.6-beta.1); release-or-minor — if on pre-release drops pre-release label (0.9.5-beta.12→0.9.5), if stable bumps patch digit (0.9.4→0.9.5); always produces exactly one tag.

### **REQT-2.3/g4wvjth1cz**: **BACKLOG**/draft: **CLI Interface**
#### Purpose: Defines the developer-facing interface: self-documentation, options, error handling, pnpm scripts, and the downstream bin entry. Applied when implementing arg parsing, adding new options, wiring pnpm scripts, or reviewing usability.

 - 2.3.1: REQT-477fxq1xxn: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Help Flag** - The script MUST support --help and -h flags that display usage information including all bump modes with concrete version transitions computed from the current version, then exit 0.
 - 2.3.2: REQT-d9ve2wgg0a: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Unknown Argument Rejection** - Unknown arguments and unknown --bump modes MUST show an error message followed by help text, then exit non-zero.
 - 2.3.3: REQT-f5w1s9tkcd: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Pre-Release Label Option** - The script MUST support --pre=TAG to set the pre-release label used by --bump=prerelease. Default MUST be beta.
 - 2.3.4: REQT-0eesm26ava: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Untracked Files Option** - The script MUST support --untracked-ok to skip the untracked files check during pre-flight.
 - 2.3.5: REQT-vrxnr7kaz9: **BACKLOG**/draft: **Scripts and Bin Entries** - package.json MUST include scripts: release (default), release:patch, release:minor, release:major, release:prerelease; and a bin entry stellar-release pointing to scripts/release.

## Area 3: Build and Package

### **REQT-3.1/9s2nw8v3qx**: **BACKLOG**/draft: **Build Before Mutations**
#### Purpose: Ensures a failing build never leaves git state mutated mid-release. Applied when sequencing release steps and reviewing error paths.

 - 3.1.1: REQT-qzgr32xrbq: **BACKLOG**/draft: **Build-First Exit Guard** - pnpm build MUST succeed before any git mutations. On build failure the script MUST exit cleanly without touching git state.

### **REQT-3.2/hvf7sfca32**: **BACKLOG**/draft: **Bundle Naming and Cleanup**
#### Purpose: Establishes the canonical name and lifecycle of the release bundle file. Applied when implementing packaging and verifying publication completeness.

 - 3.2.1: REQT-w544n4ajyj: **BACKLOG**/draft: **Bundle Filename and Cleanup** - The package MUST be produced via pnpm pack and renamed to stellar-contracts-{version}.tgz. The staging file MUST be deleted after successful publication.
 - 3.2.2: REQT-z5rnv8hd6f: **BACKLOG**/draft: **Temp File Cleanup** - The script MUST remove the curation temp directory after successful publication.

## Area 4: Release Documentation Curation

### **REQT-4.1/az99gygycq**: **BACKLOG**/draft: **Curation Step Mechanics**
#### Purpose: Defines how the release script orchestrates the curation environment — temp files, env vars, and curator invocation. Applied when implementing or reviewing the curation step, or when building a custom curator.

 - 4.1.1: REQT-dg7ymbabzz: **BACKLOG**/draft: **Temp Dir and File Setup** - The script MUST create a temp directory containing three files: (1) the raw git commit log since the prior release tag, (2) an empty public changelog entry template, and (3) an empty detailed release notes template. The paths to these files MUST be listed on screen before invoking the curator.
 - 4.1.2: REQT-ans8qxa9e1: **BACKLOG**/draft: **Environment Variables** - The script MUST set these env vars before invoking the curator: VERSION_PREV (last released tag, default: most recent git tag, overridable by caller), VERSION_NEXT (new release version post-bump), COMMIT_LOGS_FILE (path to raw git log), RELEASE_NOTES_FILE (path to detailed release notes template), CHANGELOG_SEGMENT (path to public changelog entry template).
 - 4.1.3: REQT-162c7xerq9: **BACKLOG**/draft: **Default Shell Behavior** - When CHANGELOG_CURATOR env var is not set, the script MUST open an interactive bash shell so the user can curate the detailed release notes and public changelog entry manually.
 - 4.1.4: REQT-pqyv6v5xxy: **BACKLOG**/draft: **Pluggable Curator** - When CHANGELOG_CURATOR env var is set, the script MUST invoke that command/script instead of opening a shell. The curator receives all curation env vars.

### **REQT-4.2/w8br372bd1**: **BACKLOG**/draft: **Content Source**
#### Purpose: Governs the source material for generating release notes. Applied when implementing or reviewing what data the curator receives.

 - 4.2.1: REQT-zyhrtbewtg: **BACKLOG**/draft: **Full Commit Log** - The commit log file MUST contain the full git log since the prior release tag. Merge commits MUST be excluded. The log MUST NOT use --oneline — full commit messages are required.

### **REQT-4.3/fh7e7abr6g**: **BACKLOG**/draft: **Detailed Release Notes Output**
#### Purpose: Establishes where detailed release notes are stored and the quality standard. Applied when writing or reviewing the release notes produced by the curator.

 - 4.3.1: REQT-16mz9nt9sd: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Notes File Path and Quality** - Detailed release notes MUST be saved to .proj/releases/{version}.release-notes.md. The template MUST include a pre-generated download URL for the release tgz. The content MUST be substantive — not a full commit dump but not merely a summary.

### **REQT-4.4/mjdepm0n85**: **BACKLOG**/draft: **Public Changelog Output**
#### Purpose: Defines the format and linking requirements for the customer-facing changelog entry. Applied when prepending CHANGELOG.md after each release.

 - 4.4.1: REQT-fhbvs6sedp: **IMPLEMENTED/NEEDS VERIFICATION**/draft: **Changelog Prepend Format** - CHANGELOG.md MUST be prepended with a customer-facing summary of the release. The template MUST include pre-generated links to the detailed release notes in two forms (local weaver-checkout path and remote URL), and a pre-generated download/dependency URL for the release tgz.

## Area 5: Publication Sequence

### **REQT-5.1/sz456nadba**: **BACKLOG**/draft: **Pre-Meta-Assets Commits and Weave**
#### Purpose: Defines the ordering of git mutations that must complete before meta-assets work begins. Applied when reviewing or implementing the publication sequence.

 - 5.1.1: REQT-bcwkg88p59: **BACKLOG**/draft: **Pre-Meta-Assets Commit Order** - The script MUST commit the version bump to main, commit release notes to proj and CHANGELOG update to main, then weave proj into main before any meta-assets operations begin.

### **REQT-5.2/0dr53zysr3**: **BACKLOG**/draft: **Meta-Assets Publication**
#### Purpose: Governs the complete sequence of operations constituting a meta-assets publication. Applied when implementing or auditing the publication phase.

 - 5.2.1: REQT-yyx4gkgce8: **BACKLOG**/draft: **Meta-Assets Publication Steps** - The script MUST add stellar-contracts-{version}.tgz to meta-assets via .weaver/add-asset, weave proj+main into meta-assets, tag the meta-assets tip per REQT-k9zgpff7da (Tag Format Convention), then push main, meta-assets, and the tag to origin.
 - 5.2.2: REQT-k9zgpff7da: **BACKLOG**/draft: **Tag Format Convention** - Release tags MUST use the format x.y.z for stable releases and x.y.z-beta.b for pre-releases, with no v prefix. This is the established convention (38+ existing tags back to 0.9.0-beta.3). Tags MUST NOT be derived from package.json — the script MUST construct the tag string from the resolved version components.

## Area 6: Downstream Exposure and Error Recovery

### **REQT-6.1/bmbzmcwhna**: **BACKLOG**/draft: **Weaver Detection**
#### Purpose: Defines behavior when the script is invoked in an environment without Eidos Weaver infrastructure. Applied when implementing downstream entry points or testing in non-weaver projects.

 - 6.1.1: REQT-238e33vzfm: **BACKLOG**/draft: **Weaver Absence Detection** - When invoked in a project without .weaver/, the script MUST detect this and offer to set up Eidos Weaver before proceeding.

### **REQT-6.2/1ex1k5gx7t**: **BACKLOG**/draft: **Failure Status Display**
#### Purpose: Establishes the recovery information the script must surface when a failure occurs after git mutations have begun. Applied when implementing error handling paths.

 - 6.2.1: REQT-3vhp3een3b: **BACKLOG**/draft: **Worktree Status on Failure** - On failure after git mutations have begun, the script MUST display git status for all checked-out worktrees to assist manual recovery. No automated rollback is attempted.

### **REQT-6.3/xta8chsm7v**: **BACKLOG**/draft: **Downstream Init Subcommand**
#### Purpose: Defines a setup subcommand that wires release scripts into a downstream project's package.json. Applied when onboarding a new downstream project to use stellar-release.

 - 6.3.1: REQT-zzjmbhwxky: **BACKLOG**/draft: **Package.json Script Injection** - stellar-release init (or equivalent subcommand) MUST add the standard release, release:patch, release:minor, release:major, and release:prerelease scripts to the downstream project's package.json.
 - 6.3.2: REQT-5vqahdp8fe: **BACKLOG**/draft: **Missing Scripts Guidance** - When the script detects that the project's package.json has no release scripts configured, it MUST display instructions for how to add them — either by running the init subcommand or by showing the exact scripts entries to add manually.


# Files

- `scripts/release` - Main release automation script (JavaScript/Node.js)

# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
