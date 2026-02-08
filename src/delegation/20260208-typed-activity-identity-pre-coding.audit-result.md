# Pre-Coding Advisory: Typed Activity Identity in Hook Contexts

**Work Unit**: `wkwbwbe6ws` (`20260208.typed-activity-identity.workUnit.md`)
**Auditor**: Code Whisperer
**Date**: 2026-02-08
**Status**: Complete — all findings resolved

## Setup

**Target**: Work unit plan for adding type-safe `activityName`/`activityArgs` to `createContext` and `updateContext` in DelegatedDataContract hooks.

**ARCH scope**: ARCH-g45m262w3m (Typed activity identity in hooks)
**REQT scope**: REQT-2kd3mrnq4t (Activity Identity in createContext), REQT-mfpqs35scd (Activity Identity in updateContext)

**Code area examined**:
- `src/delegation/DelegatedDataContract.ts` — context types, hook signatures, call sites, options types
- `src/ActivityTypes.ts` — `isActivity` type, `SeedActivity` class
- `src/helios/dataBridge/EnumBridge.ts` — `mkUplcData` activity construction
- `src/testing/DelegatedDatumTester.bridge.ts` — concrete generated bridge example

## Findings

### jp3zpynehb (Concern): `details` field never populated — plan's fallback extraction is broken

**Evidence**: The work unit plan states: "The bridge generators already set `details` to `'ScriptName::ActivityType.VariantName'`" and relies on `activity.details?.split('.').pop()` as a fallback extraction method.

However, `EnumBridge.mkUplcData` (src/helios/dataBridge/EnumBridge.ts:68-71) returns:
```typescript
if (this.isActivity) {
    return { redeemer: uplc } as uplcReturnType;
}
```

The `details` field is **never set**. The `enumPathExpr` (which contains the qualified variant name) is stored on `uplc.dataPath` (line 67), not on the returned `isActivity` wrapper. No other code in the codebase sets `details` on `isActivity` objects.

**Impact**: The plan's fallback extraction would produce `undefined` at runtime for all activity objects. Since raw `isActivity` CAN reach hooks (callers may pass raw `isActivity` in `DgDataCreationOptions` and `DgDataUpdateOptions`), this fallback IS needed.

**Proposed remediation**:
1. Add `details: enumPathExpr` to the `isActivity` return in `EnumBridge.mkUplcData`:
   ```typescript
   if (this.isActivity) {
       return { redeemer: uplc, details: enumPathExpr } as uplcReturnType;
   }
   ```
2. Add `src/helios/dataBridge/EnumBridge.ts` to the work unit's Focus Files
3. Update the plan to include this one-line fix as a prerequisite step

**Status**: RESOLVED — Design revised per stakeholder direction: enrich `isActivity` at `EnumBridge.mkUplcData` with `variantName`, `activityArgs`, `isDeferredRedeemer`, and `details`. This makes `EnumBridge.mkUplcData` the single identity choke point, eliminating the need for downstream extraction logic.

**Resolution**: Work unit plan updated to reflect the enriched `isActivity` approach. The `details` string fallback is no longer the primary mechanism — identity is populated structurally at origin.

---

### spgmtnfvgg (Concern): Missing identity extraction choke point

**Evidence**: The plan describes extracting activity identity at two call sites (create path in `mkTxnCreateRecord`/`txnCreatingRecord`, update path in `mkTxnUpdateRecord`/`txnUpdatingRecord`) using two methods (SeedActivity/UpdateActivity wrapper inspection, and `details` string parsing). This produces up to four inline extraction points for the same concept.

**Impact**: DRY violation risk. If the extraction logic changes (e.g., the `details` format evolves, or a third wrapper type is added), each site must be updated independently.

**Status**: RESOLVED — Design revised: `EnumBridge.mkUplcData` is the single choke point. All `isActivity` objects carry identity from birth. No downstream extraction utilities needed. Call sites pass the activity through; identity fields are already present.

---

### y3ktnra645 (Suggestion): Plan typo — updateContext conditional references wrong type parameter

**Evidence**: The work unit's plan showed `[MA] extends [any]` in the `updateContext` type but the parameter is `SA`.

**Status**: RESOLVED — Fixed in work unit plan. Now reads `[SA] extends [any]`.

---

### 9kjyp4k7sz (Suggestion): Public vs Core options boundary not explicit

**Evidence**: The plan didn't explicitly address whether identity fields belong on public or internal options types.

**Status**: RESOLVED — Plan now explicitly states: identity fields go on `CoreDgDataCreationOptions` and `CoreDgDataUpdateOptions` only. NOT on public `DgDataCreationOptions` or `DgDataUpdateOptions`.
