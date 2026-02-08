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

**Status**: PENDING

---

### spgmtnfvgg (Concern): Missing identity extraction choke point

**Evidence**: The plan describes extracting activity identity at two call sites (create path in `mkTxnCreateRecord`/`txnCreatingRecord`, update path in `mkTxnUpdateRecord`/`txnUpdatingRecord`) using two methods (SeedActivity/UpdateActivity wrapper inspection, and `details` string parsing). This produces up to four inline extraction points for the same concept.

**Impact**: DRY violation risk. If the extraction logic changes (e.g., the `details` format evolves, or a third wrapper type is added), each site must be updated independently. The two call sites will likely share the same extraction pattern:
```
if wrapper → use wrapper.variantName + wrapper.arg/args
else → parse from activity.details
```

**Proposed remediation**: Add a single utility function as the extraction choke point:
```typescript
function extractActivityIdentity(
    activity: isActivity | SeedActivity<any> | UpdateActivity<any>
): { activityName: string; activityArgs?: unknown }
```
Located alongside the context type definitions in `DelegatedDataContract.ts` (or in a shared utility). Both call sites delegate to this function. Add this to the work unit's plan.

**Status**: PENDING

---

### y3ktnra645 (Suggestion): Plan typo — updateContext conditional references wrong type parameter

**Evidence**: The work unit's plan shows:
```typescript
type updateContext<T, SA = any> = {
    ...
} & ([MA] extends [any] ? { activityName?: string; activityArgs?: unknown } : ActivityIdentity<SA>);
```

The conditional uses `[MA]` but the type parameter is `SA`. Should be `[SA] extends [any]`.

**Proposed remediation**: Fix the plan text to reference `SA` consistently.

**Status**: PENDING

---

### 9kjyp4k7sz (Suggestion): Public vs Core options boundary not explicit

**Evidence**: The plan says to "thread through `CoreDgDataCreationOptions` and `CoreDgDataUpdateOptions`" but doesn't explicitly address the public `DgDataCreationOptions` and `DgDataUpdateOptions` types. The identity fields (`activityName`, `activityArgs`) should be internal-only — the framework extracts them from the activity, callers don't provide them.

**Impact**: Without explicit guidance, the Coder might add identity fields to the public options types, creating a confusing API where callers could provide conflicting identity info.

**Proposed remediation**: Add an explicit note to the plan: "The `activityName`/`activityArgs` fields are framework-internal. Add them to `CoreDgDataCreationOptions` and `CoreDgDataUpdateOptions` only. Do NOT add to the public `DgDataCreationOptions` or `DgDataUpdateOptions`."

**Status**: PENDING
