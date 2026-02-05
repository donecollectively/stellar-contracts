# Snapshot Documentation Audit

**Theme**: Documentation clarity and accuracy for the snapshot system
**Purpose**: Ensure all docs accurately reflect the current implementation and provide clear, consistent guidance for using `@hasNamedSnapshot` decorator and related patterns.

## Files in Scope

### Documentation
- `reference/essential-stellar-testing.md` - General testing guide
- `reference/essential-stellar-testing-snapshots.md` - Snapshot system deep-dive
- `src/testing/emulator/Emulator.ARCHITECTURE.md` - Architecture reference

### Boilerplate Examples
- `reference/boilerplate/testHelper.ts` - Example test helper
- `reference/boilerplate/testing/basic-offchain.test.ts` - Example test file
- `reference/boilerplate/testing/policy-flow.test.ts` - Example policy test

### Implementation Reference
- `src/testing/CapoTestHelper.ts` - Actual implementation

## Audit Structure

1. Decorator syntax accuracy
2. Required vs optional options
3. Naming conventions
4. Test context setup patterns
5. Snapshot chaining patterns
6. Cross-document consistency

---

## Findings

### FINDING-kx7m2nfq3w: RESOLVED
**Location**: In `reference/boilerplate/testHelper.ts` (example test helper showing decorator usage)
**Discrepancy**: Uses outdated decorator syntax - passes only actor string instead of required options object
**Evidence**:
- Line 45: `@CapoTestHelper.hasNamedSnapshot("firstRegisteredCustomer", "wally")`
- Line 71: `@CapoTestHelper.hasNamedSnapshot("firstPendingOrder", "tina")`
- Line 97: `@CapoTestHelper.hasNamedSnapshot("firstOrderBaked", "baker")`
**Implementation requires** (CapoTestHelper.ts:488-498):
```typescript
static hasNamedSnapshot(
    snapshotName: string,
    options: SnapshotDecoratorOptions,  // NOT a string!
) {
    const { actor: actorName, parentSnapName, ... } = options;
    if (!parentSnapName) {
        throw new Error(`hasNamedSnapshot('${snapshotName}'): parentSnapName is required.`);
    }
```
**Impact**: Boilerplate will throw runtime error; misleads developers

---

### FINDING-ppxks5emx6: RESOLVED
**Location**: In `reference/boilerplate/testing/basic-offchain.test.ts` (example test setup pattern)
**Discrepancy**: Uses deprecated `beforeEach` + `addTestContext` pattern instead of recommended `createTestContext()`
**Evidence**: Lines 24-32 use manual beforeEach setup:
```typescript
beforeEach<PizzaCapo_TC>(async (context) => {
    await addTestContext(context, PizzaCapoTestHelper, undefined, helperState);
});
```
**Recommended pattern** (per essential-stellar-testing.md:101-103 and CapoTestHelper.ts:223-248):
```typescript
export const { describe, it, fit, xit } = YourCapoTestHelper.createTestContext();
// Then tests just import these pre-wired functions
```
**Impact**: Unnecessary boilerplate; doesn't demonstrate the modern pattern

---

### FINDING-qr9t4hj2m8: RESOLVED
**Location**: In `reference/boilerplate/testHelper.ts` lines 61, 79-80, 110-111
**Discrepancy**: Snapshot builders call `this.bootstrap()` or `await this.snapToParentSnapshot()` but the decorator already handles this via `reusableBootstrap()`
**Evidence**:
- Line 61: `await this.bootstrap();` in `firstRegisteredCustomer()`
- Line 80: `await this.snapToFirstRegisteredCustomer();` in `firstPendingOrder()`
- Line 111: `await this.snapToFirstPendingOrder();` in `firstOrderBaked()`
**The decorator** (CapoTestHelper.ts:540): already calls `await this.reusableBootstrap()` before the builder
**Impact**: Confusing guidance; may cause duplicate bootstrap calls

---

### FINDING-st5u6vk3n9: RESOLVED
**Location**: In `reference/boilerplate/testHelper.ts` line 22-25
**Discrepancy**: Exports standalone `helperState` object instead of using class's static `defaultHelperState`
**Evidence**:
```typescript
export const helperState: TestHelperState<PizzaCapo, addlState> = {
    snapshots: {},
    namedRecords: {},
} as any;
```
**Modern pattern** (CapoTestHelper.ts:217-220 and createTestContext):
- Class has `static defaultHelperState` that's used automatically by `createTestContext()`
- For custom state fields, use: `DefaultCapoTestHelper.forCapoClass(YourCapo, { customField: [] })`
**Impact**: Shows old pattern; doesn't leverage built-in state sharing

---

### FINDING-vt8w3mk4p2: RESOLVED
**Location**: In `reference/essential-stellar-testing.md` line 22
**Discrepancy**: Link to snapshot deep-dive doesn't convey that it contains required information
**Fix applied**: Changed "See X for full details" to "**Required reading**: see X for decorator options (especially required `parentSnapName`)"

---

## Progress

- [x] Read all files in scope
- [x] Complete decorator syntax findings
- [x] Complete test context setup findings
- [x] Complete snapshot chaining findings
- [x] Complete cross-document consistency review
- [x] Resolution phase

## Summary

All 6 findings resolved. Key changes:

1. **Decorator syntax** - Updated boilerplate to use options object with required `parentSnapName`
2. **Link prominence** - Added "Required reading" callout for snapshot deep-dive
3. **Test context setup** - Updated boilerplate to use `createTestContext()` pattern
4. **Builder methods** - Removed redundant `bootstrap()` and `snapTo<parent>()` calls
5. **Snapshot chaining docs** - Added migration guide from old pattern to `parentSnapName`
6. **Helper state** - Simplified boilerplate to use built-in state management

Files modified:
- `reference/essential-stellar-testing.md`
- `reference/essential-stellar-testing-snapshots.md`
- `reference/boilerplate/testHelper.ts`
- `reference/boilerplate/testing/basic-offchain.test.ts`
- `reference/boilerplate/testing/policy-flow.test.ts`
