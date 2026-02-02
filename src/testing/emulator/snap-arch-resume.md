# Snapshot Architecture Interview - Resume Document

*Created: 2026-02-01*
*Purpose: Resume ad-hoc architecture refinement interview*

## Skills to Load

1. `skillz/interview/interview.SKILL.md` - Core interview patterns
2. `skillz/architect/deep-architect.interview.md` - Deep architecture interview phases
3. `skillz/architect/architect.SKILL.md` - Architect persona
4. `skillz/reqm/reqm.SKILL.md` - Requirements management

## Target Files

| File | Purpose |
|------|---------|
| `src/testing/emulator/Emulator.ARCHITECTURE.md` | Main architecture doc - being updated |
| `src/testing/emulator/Emulator-architecture.jsonl` | Structured architecture records |
| `src/testing/emulator/Emulator.reqts.md` | Requirements - pending updates |
| `src/testing/emulator/snapshot-resolution.md` | Reference: intended hierarchical design |
| `src/testing/emulator/SnapshotCache.ts` | Implementation - NOT being updated yet |

## CRITICAL: Care Required

**This architecture affects financial systems.** Many people's money is at stake. You MUST:
- Study all architecture documents very carefully before making changes
- Verify understanding before updating anything
- Be draft-forward but wait for confirmation on uncertain items
- Cross-check changes across all related documents
- Never assume - ask when unclear

## Context: The Design Change

**From:** Flat file storage (`.stellar/emu/{name}-{key}.json`) with `parentCacheKey` for O(1) lookup

**To:** Hierarchical directory storage (`.stellar/emu/{parent}/{name}-{key}/snapshot.json`) with just-in-time registration and symbolic parent resolution

### Key Semantic Details Established

0. **Most smarts in SnapshotCache** - SnapshotCache handles recursive resolution, path construction, caching logic. CapoTestHelper registers metadata and calls find/store.

0. **Symbolic parent resolution** - Use snapshot names (e.g., "capoInitialized"), not paths or cache keys. SnapshotCache resolves the chain via registered metadata.

1. **Hierarchical directories** - Parent relationship implicit in filesystem path
   - Path pattern: `{parentPath}/{name}-{cacheKey}/snapshot.json`
   - Enables `rm -rf` for subtree deletion
   - Reference: `snapshot-resolution.md` lines 36-50

2. **Just-in-time registration** - SnapshotCache tracks metadata before use
   - Called from `@hasNamedSnapshot` decorator wrapper (SnapWrap)
   - Registry stores: `Map<snapshotName, { parentSnapName, resolveScriptDependencies }>`
   - Resolvers pre-bound to helper instance by SnapWrap

3. **Resolver binding** - Must bind at runtime, not class definition
   - Signature: `(this: CapoTestHelper) => Promise<CacheKeyInputs>`
   - SnapWrap does: `resolver.bind(this)` before registration
   - Arrow functions in decorator options would bind wrong context

4. **Simplified interfaces** - Name-based, not key-based
   - `find(snapshotName)` - resolves parent chain via registry
   - `store(snapshotName, snapshot)` - computes path via registry
   - `has(snapshotName)`, `delete(snapshotName)` - same pattern
   - Path is internal detail, not exposed to caller

5. **Touch directories** - Not files, for freshness management

6. **parentCacheKey field** - Purpose under review (may be verification only or removed)

## Interview Progress

### Phase 1: Interface Specification (In Progress)

| Topic | Status | Notes |
|-------|--------|-------|
| 1.1: SnapshotCache.find interface | COMPLETED | `find(snapshotName) => CachedSnapshot \| null` |
| 1.2: SnapshotCache.store interface | COMPLETED | `store(snapshotName, snapshot)` |
| 1.3: SnapshotCache.has and delete | COMPLETED | Name-based, delete does recursive rm -rf |
| 1.4: CachedSnapshot.parentCacheKey field | COMPLETED | Marked "DO NOT USE - probably obsolete" (hierarchical dirs make it implicit) |
| 1.5: File naming and path construction | COMPLETED | Updated to hierarchical: `{parentPath}/{name}-{key}/snapshot.json` |

### Phases 2-5: Not Started

Standard deep-architect interview phases remain:
- Phase 2: Software Object Design
- Phase 2b: Dependency Relationships
- Phase 3: Pattern Application
- Phase 4: Concerns & Ownership
- Phase 4b: Supporting Documentation
- Phase 5: Validation & Synthesis

## Open Questions (from ARCHITECTURE.md)

- [ ] Migrate built-in snapshots (actors, capoInit, delegates) to `@hasNamedSnapshot` decorator
- [ ] Add reqts for built-in snapshot decorator migration
- [ ] Update Emulator.reqts.md for hierarchical directories, registration, touch directories

## Resolved This Session

- [x] SnapshotCache.find() and store() interface signatures
- [x] Just-in-time registration model
- [x] Hierarchical directory structure (vs flat files)
- [x] Resolver binding pattern (SnapWrap binds to instance)
- [x] parentCacheKey field: marked "DO NOT USE - probably obsolete"
- [x] File naming pattern: updated to `{parentPath}/{name}-{key}/snapshot.json`
- [x] Interface payload: removed "cache key" from CapoTestHelper → SnapshotCache payload
- [x] Key Decisions: "Touch files" → "Touch directories"
- [x] Requirements (Emulator.reqts.md): updated REQT-1.2.7.1, 1.2.9.x for hierarchical directories; deprecated parentCacheKey
- [x] Requirements: added REQT-3.3 (Built-in Snapshot Registration) for decorator-based registration of built-ins

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Hierarchical directories | Parent relationship in path; easy subtree deletion |
| Just-in-time registration | Decorator registers before requesting snapshot |
| Name-based interfaces | Path computed internally via registry |
| SnapWrap binds resolvers | Arrow functions in decorator options bind wrong context |
| Touch directories not files | Hierarchical structure requires directory mtime |
| parentCacheKey: DO NOT USE | With hierarchical dirs, parent path is implicit; field retained as breadcrumb |

## Resume Instructions

1. Load the skills listed above
2. Read target files to refresh context
3. Continue with pending Phase 1 topics (#7, #8)
4. Then proceed to Phase 2 or address Open Questions

## Discrepancy Analysis Methodology

This ad-hoc interview is a **refinement pass** to align architecture docs with an evolved design. The process:

### 1. Identify the Target State

**Primary reference:** `snapshot-resolution.md` - detailed walkthrough showing intended hierarchical design
- Directory structure (lines 36-50)
- Resolution sequence with path construction
- Key invariants (lines 383-393)
- snapshot.json structure (lines 395-406)

### 2. Systematic Comparison

For each architecture element, compare:

| Check | Target (snapshot-resolution.md) | Current (ARCHITECTURE.md, JSONL) |
|-------|--------------------------------|----------------------------------|
| File storage pattern | Hierarchical directories | Was: flat files |
| Path construction | `parent.path + "{name}-{key}/"` | Was: `.stellar/emu/{name}-{key}.json` |
| Parent resolution | Recursive via symbolic names | Was: via `parentCacheKey` field |
| Interface signatures | Name-based | Was: `(cacheKey, snapshotName)` |
| CachedSnapshot fields | No `parentCacheKey` in snapshot.json | Has `parentCacheKey` field |

### 3. Work Through Deep Interview Topics

Use deep-architect.interview.md phases as a checklist:
- **Phase 1: Interface Specification** - Check each interface for discrepancies
- **Phase 2: Software Object Design** - Check types, classes for stale details
- **Phase 4: Concerns & Ownership** - Check if ownership changed

### 4. Draft-Forward Updates

For each discrepancy found:
1. State what's wrong in current version (quote the text)
2. State what target says (quote or summarize)
3. Draft the fix
4. Wait for confirmation before applying

### 5. Incremental Captures

Only update docs for **confirmed** changes. Mark unresolved items:
- In JSONL: `"maturity": {"status": "draft"}` or `"signature": "TBD"`
- In ARCHITECTURE.md: Add to Open Questions as `[ ] **Pending**: ...`

### 6. Cross-Check Both Docs

After updating ARCHITECTURE.md, ensure JSONL records match:
- Interface signatures
- Component activities
- Behavior descriptions
- Maturity status

### Areas Still Needing Discrepancy Analysis

| Area | Status |
|------|--------|
| SnapshotCache interfaces | DONE - updated to name-based |
| CachedSnapshot type | DONE - parentCacheKey marked "DO NOT USE" |
| File naming section | DONE - updated for hierarchical |
| Behavior descriptions | PARTIAL - some updated, verify all |
| Requirements (reqts.md) | DONE - updated for hierarchical directories |
| Key Design Decisions table | DONE - updated |
| Resolution Flow section | CHECK - may need updates |
| Cache Key Recomputation section | CHECK - may reference old patterns |

## Related Commits/Changes

This session updated:
- `Emulator.ARCHITECTURE.md` - SnapshotCache activities, API, Key Design Decisions, Open Questions
- `Emulator-architecture.jsonl` - Component activities, interface contracts (find, store, has, delete, register)
- Earlier in session: `.stellar/emulator/` renamed to `.stellar/emu/` across all files
