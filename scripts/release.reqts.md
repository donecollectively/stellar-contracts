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

The essential technologies are **bash, pnpm, git, weaver**. Related technologies include semver, github.



# Must Read: Special Skills and Know-how


# Collaborators



**Expected users:** 

# Functional Areas and Key Requirements

### 1. Pre-flight Guards
Checks that must pass before any mutations begin

#### Key Requirements:
1. **Clean Working Tree**: Prevents corrupted or incomplete releases caused by uncommitted work reaching the published bundle.
2. **Proj Woven Into Main**: Prevents releases where proj-only content is missing from the release commit graph.
3. **No Duplicate Bundle**: Forces the user to explicitly bump the version rather than accidentally overwriting an existing published bundle.

### 2. Version Bump Control
How the script determines and applies the new release version

#### Key Requirements:
1. **Bump Flag**: Gives the caller explicit control over release type without requiring manual package.json edits.
2. **Bump Behavior Per Mode**: Ensures any developer or downstream user can predict the resulting version from a given bump mode and starting version.
3. **Package.json Scripts and Bin**: Lets developers trigger releases via familiar pnpm run commands and exposes the script to downstream projects as stellar-release.

### 3. Build and Package
Building and packaging the release artifact before git mutations

#### Key Requirements:
1. **Build Before Mutations**: Prevents incomplete releases where git is modified but the build artifact is broken or absent.
2. **Bundle Naming and Cleanup**: Ensures downstream projects can reference bundles by a predictable, version-stamped filename and that no staging artifacts linger after publication.

### 4. Release Notes
Documenting each release with sufficient detail for users and contributors

#### Key Requirements:
1. **Agent Interview for Notes**: Ensures release notes reflect the full depth of changes by requiring an agent-mediated review of the complete commit log, not mechanical summarization.
2. **Release Notes File**: Gives contributors a stable location to find detailed per-release context that goes beyond a changelog summary.
3. **Changelog Update**: Keeps CHANGELOG.md useful as a quick-scan resource while linking to detailed notes for readers who want depth.

### 5. Publication Sequence
Ordering of git mutations to ensure a coherent release state

#### Key Requirements:
1. **Pre-Meta-Assets Commits and Weave**: Ensures main and proj are in a coherent, fully-woven state before any meta-assets operations touch the release bundle.
2. **Meta-Assets Publication**: Ensures the released bundle, its provenance (weave graph), its tag, and its remote push all happen in the correct order.

### 6. Downstream Exposure and Error Recovery
Behavior in downstream projects and on mid-release failure

#### Key Requirements:
1. **Weaver Detection**: Prevents opaque failures in downstream projects and gives users a clear path to set up the required infrastructure.
2. **Failure Status Display**: Enables users to understand their exact git state across all worktrees and recover manually without guesswork.


# Detailed Requirements

## Area 1: Pre-flight Guards

### **REQT-1.1/r0g2gfymrt**: **BACKLOG**/draft: **Clean Working Tree**
#### Purpose: Ensures the release always starts from a known-good git state, preventing uncommitted changes from contaminating the build or being silently excluded. Applied before implementing or reviewing any mutation step.

 - 1.1.1: REQT-5zsdm0x74r: **BACKLOG**/draft: **Working Tree Cleanliness Check** - The script MUST verify that the main working tree has no uncommitted changes before any mutations begin.

### **REQT-1.2/n04657rp5t**: **BACKLOG**/draft: **Proj Woven Into Main**
#### Purpose: Ensures all project-branch content is incorporated into main before a release is cut. Applied as part of pre-flight verification when reviewing the release sequence.

 - 1.2.1: REQT-nt4bpnpgag: **BACKLOG**/draft: **Proj Ancestry Check** - The script MUST verify that the proj branch tip is an ancestor of main (i.e. .weaver/sync has been run) before proceeding.

### **REQT-1.3/k8jkb0gef1**: **BACKLOG**/draft: **No Duplicate Bundle**
#### Purpose: Guards against publishing a bundle with a version that already exists on meta-assets. Applied during pre-flight before any mutations begin.

 - 1.3.1: REQT-wyh7se401f: **BACKLOG**/draft: **Duplicate Bundle Detection** - The script MUST verify that stellar-contracts-{currentVersion}.tgz does not already exist on the meta-assets branch. If it does, the script MUST exit with a clear error directing the user to bump the version before releasing.

## Area 2: Version Bump Control

### **REQT-2.1/ev26jfd4ce**: **BACKLOG**/draft: **Bump Flag**
#### Purpose: Establishes the CLI interface for controlling which kind of version increment to apply. Applied when invoking the release script or configuring pnpm release scripts.

 - 2.1.1: REQT-rgt21gw5mn: **BACKLOG**/draft: **Supported Bump Modes** - The script MUST support --bump=patch|minor|major|release|prerelease|release-or-minor. The default when no flag is provided MUST be release-or-minor.

### **REQT-2.2/nc74ve6dan**: **BACKLOG**/draft: **Bump Behavior Per Mode**
#### Purpose: Defines the exact semantic behavior for each bump mode to ensure deterministic and predictable version transitions. Applied when testing or implementing bump logic, or reviewing version output.

 - 2.2.1: REQT-5vay51a5w9: **BACKLOG**/draft: **Mode-by-Mode Semantics** - Bump behavior MUST be: patch — increments pre-release counter (0.9.4-beta.1→0.9.4-beta.2) or stable patch (0.9.4→0.9.5); minor — drops pre-release and bumps patch digit (0.9.4-beta.1→0.9.5); major — bumps major version; release — graduates pre-release to stable (0.9.4-beta.1→0.9.4); prerelease — bumps patch and starts beta.1 (0.9.5→0.9.6-beta.1); release-or-minor — if on pre-release drops pre-release label, if stable bumps patch digit; always produces exactly one tag.

### **REQT-2.3/51vtve38mt**: **BACKLOG**/draft: **Package.json Scripts and Bin**
#### Purpose: Establishes the standard developer interface for release invocation and the downstream bin entry. Applied when wiring pnpm scripts or adding the stellar-release bin entry.

 - 2.3.1: REQT-vrxnr7kaz9: **BACKLOG**/draft: **Scripts and Bin Entries** - package.json MUST include scripts: release (default), release:patch, release:minor, release:major, release:prerelease; and a bin entry stellar-release pointing to scripts/release.

## Area 3: Build and Package

### **REQT-3.1/9s2nw8v3qx**: **BACKLOG**/draft: **Build Before Mutations**
#### Purpose: Ensures a failing build never leaves git state mutated mid-release. Applied when sequencing release steps and reviewing error paths.

 - 3.1.1: REQT-qzgr32xrbq: **BACKLOG**/draft: **Build-First Exit Guard** - pnpm build MUST succeed before any git mutations. On build failure the script MUST exit cleanly without touching git state.

### **REQT-3.2/hvf7sfca32**: **BACKLOG**/draft: **Bundle Naming and Cleanup**
#### Purpose: Establishes the canonical name and lifecycle of the release bundle file. Applied when implementing packaging and verifying publication completeness.

 - 3.2.1: REQT-w544n4ajyj: **BACKLOG**/draft: **Bundle Filename and Cleanup** - The package MUST be produced via pnpm pack and renamed to stellar-contracts-{version}.tgz. The staging file MUST be deleted after successful publication.

## Area 4: Release Notes

### **REQT-4.1/w8br372bd1**: **BACKLOG**/draft: **Agent Interview for Notes**
#### Purpose: Governs the source material and interaction model for generating release notes content. Applied when implementing or invoking the release notes generation step.

 - 4.1.1: REQT-zyhrtbewtg: **BACKLOG**/draft: **Full-Log Agent Interview** - Release notes MUST be produced via an agent interview process using the full git log since the prior release tag. Merge commits MUST be excluded. The log MUST NOT use --oneline — full commit messages are required.

### **REQT-4.2/fh7e7abr6g**: **BACKLOG**/draft: **Release Notes File**
#### Purpose: Establishes where release notes are stored and the quality standard the content must meet. Applied when writing or reviewing the release notes output from the agent interview.

 - 4.2.1: REQT-16mz9nt9sd: **BACKLOG**/draft: **Notes File Path and Quality** - Release notes MUST be saved to .proj/releases/{version}.release-notes.md. The content MUST be substantive — not a full commit dump but not merely a summary.

### **REQT-4.3/mjdepm0n85**: **BACKLOG**/draft: **Changelog Update**
#### Purpose: Defines the format and linking requirements for the customer-facing changelog entry. Applied when prepending CHANGELOG.md after each release.

 - 4.3.1: REQT-fhbvs6sedp: **BACKLOG**/draft: **Changelog Prepend Format** - CHANGELOG.md MUST be prepended with a customer-facing summary of the release, linking to the release notes file in two forms: local weaver-checkout path and remote URL.

## Area 5: Publication Sequence

### **REQT-5.1/sz456nadba**: **BACKLOG**/draft: **Pre-Meta-Assets Commits and Weave**
#### Purpose: Defines the ordering of git mutations that must complete before meta-assets work begins. Applied when reviewing or implementing the publication sequence.

 - 5.1.1: REQT-bcwkg88p59: **BACKLOG**/draft: **Pre-Meta-Assets Commit Order** - The script MUST commit the version bump to main, commit release notes to proj and CHANGELOG update to main, then weave proj into main before any meta-assets operations begin.

### **REQT-5.2/0dr53zysr3**: **BACKLOG**/draft: **Meta-Assets Publication**
#### Purpose: Governs the complete sequence of operations constituting a meta-assets publication. Applied when implementing or auditing the publication phase.

 - 5.2.1: REQT-yyx4gkgce8: **BACKLOG**/draft: **Meta-Assets Publication Steps** - The script MUST add stellar-contracts-{version}.tgz to meta-assets via .weaver/add-asset, weave proj+main into meta-assets, tag the meta-assets tip with the verbatim package.json version (no v prefix), then push the branch and tag to origin.

## Area 6: Downstream Exposure and Error Recovery

### **REQT-6.1/bmbzmcwhna**: **BACKLOG**/draft: **Weaver Detection**
#### Purpose: Defines behavior when the script is invoked in an environment without Eidos Weaver infrastructure. Applied when implementing downstream entry points or testing in non-weaver projects.

 - 6.1.1: REQT-238e33vzfm: **BACKLOG**/draft: **Weaver Absence Detection** - When invoked in a project without .weaver/, the script MUST detect this and offer to set up Eidos Weaver before proceeding.

### **REQT-6.2/1ex1k5gx7t**: **BACKLOG**/draft: **Failure Status Display**
#### Purpose: Establishes the recovery information the script must surface when a failure occurs after git mutations have begun. Applied when implementing error handling paths.

 - 6.2.1: REQT-3vhp3een3b: **BACKLOG**/draft: **Worktree Status on Failure** - On failure after git mutations have begun, the script MUST display git status for all checked-out worktrees to assist manual recovery. No automated rollback is attempted.


# Files


# Implementation Log

> Maintainers MUST NOT modify past entries. Append new entries only.


# Release Management Plan

See `release-management-scope.md` for version criteria and lifecycle management.
