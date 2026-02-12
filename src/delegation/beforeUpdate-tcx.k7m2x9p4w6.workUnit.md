# Work Unit: Pass tcx to beforeCreate() and beforeUpdate() hooks

**UUT**: `k7m2x9p4w6`
**Created**: 2026-02-06

> **Required context**: Load [work-planner.SKILL.md](../../skillz/work-planner/work-planner.SKILL.md) for lifecycle protocol, team composition, and sign-off procedures before operating on this work unit.

## References

| Type | ID | Description |
|------|-----|-------------|
| Source | `DelegatedDataContract.ts:88-90` | `createContext<TLike>` type definition |
| Source | `DelegatedDataContract.ts:96-99` | `updateContext<T>` type definition |
| Source | `DelegatedDataContract.ts:411-414` | `beforeCreate()` default implementation |
| Source | `DelegatedDataContract.ts:433-435` | `beforeUpdate()` default implementation |
| Source | `DelegatedDataContract.ts:490-499` | `beforeCreate()` call site in `txnCreatingRecord` |
| Source | `DelegatedDataContract.ts:650-656` | `beforeUpdate()` call site in `txnUpdatingRecord` |
| REQT | REQT/a30n3rbmkp (beforeCreate Hook Context) | **UPDATED**: added `tcx: StellarTxnContext` + tcx mutability contract |
| REQT | REQT/76xh3h4fsk (beforeUpdate Hook Context) | **UPDATED**: added `tcx: StellarTxnContext` + original clone/freeze + tcx mutability contract |
| REQT | REQT/51vkbcm2vf (beforeCreate Record Input Protection) | **NEW**: Helios-aware deep clone + freeze of record input |
| REQT | REQT/v538zt7mkh (beforeUpdate Record Input Protection) | **NEW**: Helios-aware deep clone + freeze of merged record input |
| REQT | REQT/fyc6n4e6rt (Original Record Protection) | **NEW**: deep clone + freeze of `original` in updateContext |
| REQT | REQT/tsg5f4mz07 (Return Value Contract) | **NEW**: framework uses only return value for datum construction |

## Problem

`beforeCreate()` and `beforeUpdate()` are the framework-designated hooks for pre-save record fixup during creation and updates. However, neither receives the transaction context — `beforeCreate` gets `{ activity }` and `beforeUpdate` gets `{ original, activity }`.

Downstream consumers need to coordinate record fields with transaction properties. Concrete case: on-chain policy requires `updatedAt` / `createdAt` to exactly equal `txnEndTime` (pessimistic "certainly not after" timestamp semantics). These hooks are the correct choke points for this fixup, but they can't access `tcx` to read `txnEndTime`.

Without tcx access, consumers are forced to either:
- Work around with a higher-level wrapper method (structural duplication)
- Modify records after they've been consumed by `mkTxnCreateRecord` / `mkTxnUpdateRecord` (incorrect — datum already built)

## Target State

Enrich both context types to include the transaction context:

```typescript
export type createContext<TLike> = {
    activity: isActivity;
    tcx: StellarTxnContext;  // add
};

export type updateContext<T> = {
    original: T;
    activity: isActivity;
    tcx: StellarTxnContext;  // add
};
```

Pass `tcx` at the `beforeCreate` call site in `txnCreatingRecord` (line 490):

```typescript
const fullRecord = this.beforeCreate(
    { ... } as DgDataTypeLike<this>,
    { activity, tcx }       // add tcx
);
```

Pass `tcx` at the `beforeUpdate` call site in `txnUpdatingRecord` (line 650):

```typescript
const fullUpdatedRecord: TLike = this.beforeUpdate(
    updatedRecordLike,
    {
        original: existingRecord,
        activity,
        tcx,           // add
    }
);
```

No change to either default implementation — both return the record unchanged and ignore context fields they don't use.

## Scope

- **Type change**: Add `tcx` field to `createContext<TLike>` (line 88-90)
- **Type change**: Add `tcx` field to `updateContext<T>` (line 96-99)
- **Call site**: Deep clone + freeze record before passing to `beforeCreate` (line 490-499)
- **Call site**: Deep clone + freeze record and `original` before passing to `beforeUpdate` (line 650-656)
- **Call site**: Pass `tcx` through at both call sites
- **New utility**: Helios-aware `deepCloneRecord` function (see Implementation Guidance)
- **New utility**: `deepFreezeRecord` function (see Implementation Guidance)
- **Default impls**: No change needed (lines 411-414, 433-435)
- **Docs**: Update JSDoc on both context types and hooks (see Documentation Contract)

## Implementation Guidance

### Deep Clone Utility (`deepCloneRecord`)

The call sites currently pass a shallow spread to the hooks. Nested objects share references with the caller's original data. A hook mutating `record.someNested.field` would corrupt the source.

The clone must be **Helios-aware**. Record fields (`TLike`) can contain a mix of:

| Type | Package | Strategy |
|------|---------|----------|
| Plain objects, arrays | JS built-in | Recurse — copy structure |
| `number`, `string`, `bigint`, `boolean` | JS primitives | Pass through — immutable |
| `number[]` (byte arrays for ids) | JS built-in | Slice — `arr.slice()` |
| `Address` (ShelleyAddress) | `@helios-lang/ledger` | **Call `.copy()`** — mutable, has copy method |
| `Value` | `@helios-lang/ledger` | **Call `.copy()`** — deep copies lovelace + assets |
| `Assets` | `@helios-lang/ledger` | **Call `.copy()`** — copies internal array |
| `PubKey`, `PubKeyHash` | `@helios-lang/ledger` | Share by reference — immutable (readonly bytes) |
| `ByteArrayData` | `@helios-lang/uplc` | Share by reference — immutable |
| `IntData` | `@helios-lang/uplc` | Share by reference — immutable (bigint) |
| `ConstrData` | `@helios-lang/uplc` | Share by reference — readonly fields |
| `ListData` | `@helios-lang/uplc` | Share by reference — items are immutable |
| `MapData` | `@helios-lang/uplc` | Share by reference — items are immutable |

**Detection heuristic**: If an object has a `copy()` method, call it. If it has a `toCbor()` method but no `copy()`, it's an immutable Helios type — share by reference. Otherwise, if it's a plain object or array, recurse. Primitives pass through.

`structuredClone` is NOT suitable — it cannot handle objects with methods (throws on Helios types).

### Deep Freeze Utility (`deepFreezeRecord`)

After cloning, freeze the record before passing to the hook. This enforces the "return a new object" contract — a hook that tries `record.field = x` will throw (ES modules are always strict mode).

Must be recursive — `Object.freeze` is shallow. Walk the object graph and freeze each plain object/array. Do NOT freeze Helios type instances (they may have internal state managed by their own invariants) — freeze only plain objects and arrays.

**Detection heuristic**: Freeze if `Object.getPrototypeOf(obj) === Object.prototype` (plain object) or `Array.isArray(obj)`. Skip anything with a non-default prototype (Helios types, etc.).

### Documentation Contract

Update JSDoc on `beforeCreate` and `beforeUpdate` to clarify the two-part contract:

- **`tcx`**: Fully mutable. Hooks are expected to mutate it when needed (e.g., `tcx.validFor(duration)` to fix the validity window before reading `tcx.txnEndTime`).
- **Input record**: Frozen deep clone. MUST NOT be mutated — return a new object with modifications. The framework honors only the return value.
- **`original`** (beforeUpdate only): Frozen deep clone of the pre-update record. Safe to read for comparison; cannot be mutated.

## Impact

- Non-breaking: existing overrides that destructure only their current fields continue to work unchanged
- Enables downstream controllers to coordinate record fields with transaction properties (validity window, timestamps) in the designated hooks
- Symmetric: both creation and update hooks gain the same capability
- Defensive: framework protects caller data from mutation through deep clone; enforces return-value contract through freeze

## Audit Trail

### Code Whisperer: Pre-Coding Advisory (2026-02-06)

**Audit file**: `20260206-beforeUpdate-tcx-pre-coding.audit-result.md`

**Findings** (2, both resolved):
- **0xs4npgfmy** (Concern): Asymmetric hook enrichment — expanded scope to include `createContext`/`beforeCreate` symmetrically
- **shfbdn0zav** (Concern): Shallow spread exposes caller data — added Helios-aware deep clone + freeze utilities, documentation contract, and 4 new requirements

**Requirements updated**: REQT/a30n3rbmkp, REQT/76xh3h4fsk (COMPLETED→NEXT)
**Requirements added**: REQT/51vkbcm2vf, REQT/v538zt7mkh, REQT/fyc6n4e6rt, REQT/tsg5f4mz07
**Pattern captured**: `validity-window-timestamp` in `reference/essential-stellar.patterns.jsonl`

### Architect: Architectural Review (2026-02-06)

**Audit file**: `20260206-beforeUpdate-tcx-architect.audit-result.md`

**Findings** (3, all resolved — no blockers for Coder handoff):
- **rjxm060nye** (Concern): Utility placement — accepted `src/util/` for `deepCloneRecord` and `deepFreezeRecord`
- **wnk629abe9** (Concern): Helios coupling — accepted duck-typing heuristic over explicit type checks; Coder should document the rationale in a comment
- **cg8p8frtys** (Suggestion): Convention → enforcement contract change — no downstream compatibility concern at this time
