# Audit Result: Pre-Coding Advisory — beforeUpdate-tcx (k7m2x9p4w6)

**Date**: 2026-02-06
**Audit type**: Code Whisperer pre-coding advisory
**Work unit**: `beforeUpdate-tcx.k7m2x9p4w6.workUnit.md`
**Target code**: `src/delegation/DelegatedDataContract.ts` — `createContext`, `updateContext`, `beforeCreate`, `beforeUpdate`, `txnCreatingRecord`, `txnUpdatingRecord`

## Files in Scope

- `src/delegation/DelegatedDataContract.ts`
- `src/delegation/beforeUpdate-tcx.k7m2x9p4w6.workUnit.md`

## Findings

#### Finding: 0xs4npgfmy — Asymmetric hook enrichment
**Status**: resolved
**Severity**: Concern
**Location**: In `createContext<TLike>` (context type for `beforeCreate`, symmetric counterpart to `updateContext<T>`) at `src/delegation/DelegatedDataContract.ts:88-90`

**Observation**: The work unit added `tcx` to `updateContext<T>` but not to `createContext<TLike>`. These form a symmetric pair serving the same role for their respective hooks. The motivating use case (timestamp coordination with tx validity) applies equally to record creation. Both call sites have `tcx` available.

**Resolution**: Work unit expanded to include `createContext<TLike>` enrichment and the `beforeCreate` call site. Title, problem, target state, scope, and impact sections all updated to reflect symmetric treatment.

#### Finding: shfbdn0zav — Shallow spread exposes caller data to nested mutation
**Status**: resolved
**Severity**: Concern
**Location**: In `txnCreatingRecord` (builds spread object passed to `beforeCreate`) at `src/delegation/DelegatedDataContract.ts:490-498` and `txnUpdatingRecord` (builds spread object passed to `beforeUpdate`) at `src/delegation/DelegatedDataContract.ts:646-650`

**Observation**: Both call sites create a shallow spread before passing to the hooks. Nested objects (including Helios types like Address, Value) share references with the caller's original data. A hook mutating a nested field would corrupt the source. Initial suggestion to use `structuredClone` was ruled out because TLike records can contain Helios types with methods (Address, Value, UplcData variants), which `structuredClone` cannot handle — it throws on objects with methods. No extensibility protocol exists for `structuredClone`.

Investigation of @helios-lang packages revealed:
- Mutable types (Address, Value, Assets) provide `.copy()` methods
- Immutable types (PubKey, PubKeyHash, all UplcData variants) are safe to share by reference
- Detection heuristic: `.copy()` present → call it; `.toCbor()` without `.copy()` → immutable Helios leaf, share by reference; plain object/array → recurse

Additionally, `Object.freeze` (recursive) on the cloned input enforces the "return a new object" contract at runtime.

**Resolution**: Work unit expanded with Implementation Guidance section covering: Helios-aware `deepCloneRecord` utility (with type-by-type strategy table), `deepFreezeRecord` utility, and updated Documentation Contract clarifying the two-part hook contract (tcx is mutable, input record is frozen clone). Requirements updated: REQT/a30n3rbmkp and REQT/76xh3h4fsk updated with tcx and clone/freeze semantics. 4 new requirements added: REQT/51vkbcm2vf, REQT/v538zt7mkh, REQT/fyc6n4e6rt, REQT/tsg5f4mz07. JSONL and markdown both updated.

## Summary

- **Findings**: 2 (both resolved)
- **Work unit modifications**: Title, references, problem, target state, scope, implementation guidance, documentation contract, impact
- **Requirements updated**: 2 existing (REQT/a30n3rbmkp, REQT/76xh3h4fsk)
- **Requirements added**: 4 new (REQT/51vkbcm2vf, REQT/v538zt7mkh, REQT/fyc6n4e6rt, REQT/tsg5f4mz07)
- **Code Whisperer skill updated**: Added REQT-3.0.7/tzevvak9r1 (Requirements Impact Check) to pre-coding advisory workflow
- **Architectural escalations**: None needed
