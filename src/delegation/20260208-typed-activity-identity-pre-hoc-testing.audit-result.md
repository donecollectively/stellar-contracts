# Pre-hoc Testing Recommendations: Typed Activity Identity in Hook Contexts

**Work Unit**: `wkwbwbe6ws` (`20260208.typed-activity-identity.workUnit.md`)
**Auditor**: Stellar Testing Expert (Domain-Fit Tester)
**Date**: 2026-02-08
**Status**: Complete

## Setup

**Target**: Work unit for adding type-safe `activityName`, `activityArgs`, and `isDeferredRedeemer` to `isActivity` and hook contexts in DelegatedDataContract.

**REQT scope**: REQT-2kd3mrnq4t (Activity Identity in createContext), REQT-mfpqs35scd (Activity Identity in updateContext)

**Essential guide loaded**: `reference/essential-stellar-testing.md` ✓
**Patterns loaded**: `stellar-testing.patterns.jsonl` (12 entries) ✓

## Existing Test Infrastructure Inventory

**Test file**: `tests/05e-DataPolicyDelegates.test.ts` — exercises DelegatedDatumTester for delegate policy installation, replacement, and multi-version scenarios. Does NOT test record creation, update, or hooks.

**Test helper**: `tests/CapoForDgDataPolicyTestHelper.ts` — has snapshots for `installingTestDataPolicy`, `hasTestDataPolicyDgt`, `replacingTestDataPolicy`. No snapshots or helpers for record creation/update flows.

**Concrete controller**: `src/testing/DelegatedDatumTester.ts` — extends `DelegatedDataContract<DgDatumTestData, DgDatumTestDataLike>`. Does NOT override `beforeCreate` or `beforeUpdate`. Has `exampleData()` and `txnCreatingTestRecord()` but these aren't exercised in the test suite.

**Record creation example**: `tests/CapoWithoutSettingsTestHelper.ts:188` — uses `delegate.mkTxnCreateRecord()` with `$seeded$CreatingDelegatedData`. This is the closest existing pattern for record creation in tests.

**Generated types**: `DelegatedDatumTester.typeInfo.d.ts` has:
- `MintingActivity = { CreatingTData: TxOutputId }`
- `SpendingActivity = { UpdatingTData: number[] }`

These are ideal for testing type-safe activity identity — single-variant unions with concrete arg types.

**Hooks section in essential guide**: Lines 170-220 show the exact patterns for testing `beforeCreate`/`beforeUpdate` hooks — spy-based verification and negative-path bypass.

## Per-Requirement Analysis

### REQT-2kd3mrnq4t: Activity Identity in createContext

**What the requirement demands**: `createContext` includes `activityName` (always available, type-safe variant key from MintingActivity) and `activityArgs` (may be undefined for no-arg variants).

**Recommended test cases**:

1. **`beforeCreate receives activity identity (create-activity-identity/REQT/2kd3mrnq4t)`**
   - Happy path: spy on `beforeCreate`, create a record, verify `context.activityName === "CreatingTData"` and `context.activityArgs` is a `TxOutputId`
   - Uses: `vi.spyOn(controller, "beforeCreate")`, inspect `spy.mock.calls[0][1]` (context arg)
   - Pattern: follows essential guide § "Testing your hook implementations"
   - Applies: `happy-path-consolidation` — combine activityName and activityArgs assertions in one test

2. **`isActivity carries variantName after bridge construction (bridge-activity-identity/REQT/2kd3mrnq4t)`**
   - Verify that after the bridge method produces an `isActivity`, the `variantName` and `details` fields are populated
   - Uses: direct bridge call `controller.activity.MintingActivities.CreatingTData(tcx)`, inspect the returned object
   - This tests the `EnumBridge.mkUplcData` choke point independently of the hook flow

### REQT-mfpqs35scd: Activity Identity in updateContext

**Recommended test cases**:

3. **`beforeUpdate receives activity identity (update-activity-identity/REQT/mfpqs35scd)`**
   - Happy path: create a record, then spy on `beforeUpdate`, update the record, verify `context.activityName === "UpdatingTData"` and `context.activityArgs` is a `number[]`
   - Uses: spy pattern per essential guide, but requires a created record first → chain from creation
   - Pattern: `happy-path-consolidation` — combine activityName and activityArgs assertions

### Type-Level Verification

4. **`switch narrowing works on activity identity (activity-type-narrowing)`**
   - NOT a runtime test — a compile-time verification
   - Best approach: create a test subclass of `DelegatedDatumTester` that overrides `beforeCreate` with a switch on `context.activityName` and accesses `context.activityArgs` with narrowed type. If this compiles, the generic threading works.
   - The Coder needs to update `DelegatedDatumTester`'s class signature to thread `MintingActivity`/`SpendingActivity` generics for this to work
   - Alternative: use vitest's `expectTypeOf` / `assertType` if a compile-only check suffices

## Cross-Cutting Assessment

### Shared Setup

Tests 1 and 3 both need a bootstrapped chain with an installed test data policy. The existing `snapToInstalledTestDataPolicy` snapshot in `CapoForDgDataPolicyTestHelper` provides this. Test 3 additionally needs a created record to update.

**Helper extraction opportunity**: A `createTestRecord()` method on the test helper (or use of existing `DelegatedDatumTester.txnCreatingTestRecord()` wired through the helper) would serve tests 1, 3, and future hook-related tests. Consider adding a `snapToTestRecordCreated` snapshot if update tests multiply.

### Anti-Pattern Compliance

- ✓ `happy-path-consolidation`: Tests 1 and 3 each check multiple fields in a single transaction
- ✓ `stable-slug-identity`: Proposed slugs are semantic and stable
- ✓ `snapshot-before-mock`: No mocking in these tests (spy observes, doesn't alter behavior)
- ✓ `test-coupling`: Each test uses snapshot for independent state setup
- ✓ `missing-edge-cases`: Bridge-level test (case 2) covers the construction boundary

### Test Suite Impact

- **Existing file modification**: Tests can be added to `05e-DataPolicyDelegates.test.ts` as a new `describe` block, or a new file (Coder's judgment)
- **Helper modification**: `CapoForDgDataPolicyTestHelper` may need a `createTestRecord()` helper method
- **Infrastructure change**: `DelegatedDatumTester`'s class signature needs `MA`/`SA` type parameters for type-narrowing test (case 4) to compile. This is both a test subject and test infrastructure change — the Coder should update it as part of the implementation, not as test-only work

### Testability Concern

**a0jke4wtxv**: The `activityArgs` threading through `EnumBridge.mkUplcData` is the most uncertain part of the plan. The Coder should write test case 2 (bridge-level identity check) EARLY — before wiring up the hook contexts. If `mkUplcData` doesn't have access to the pre-serialization args, the test will surface this quickly and prevent wasted effort on downstream plumbing.

## Findings Summary

| ID | Severity | Finding |
|----|----------|---------|
| a0jke4wtxv | Suggestion | Write bridge-level test (case 2) early as a feasibility probe for `activityArgs` threading through `EnumBridge.mkUplcData` |
| skd46xwsp5 | Suggestion | Consider a `createTestRecord()` helper method in `CapoForDgDataPolicyTestHelper` for reuse across hook tests |
| r0wz2vkjh7 | Suggestion | Update `DelegatedDatumTester` class signature to thread `MintingActivity`/`SpendingActivity` generics as part of the implementation (needed for type-narrowing test to compile) |

No Objections or Concerns. The testing approach is straightforward given the existing infrastructure.
