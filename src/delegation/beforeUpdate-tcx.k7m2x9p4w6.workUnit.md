# Work Unit: Pass tcx to beforeUpdate() hook

**UUT**: `k7m2x9p4w6`
**Created**: 2026-02-06

## References

| Type | ID | Description |
|------|-----|-------------|
| Source | `DelegatedDataContract.ts:96-99` | `updateContext<T>` type definition |
| Source | `DelegatedDataContract.ts:433-435` | `beforeUpdate()` default implementation |
| Source | `DelegatedDataContract.ts:650-656` | `beforeUpdate()` call site in `txnUpdatingRecord` |

## Problem

`beforeUpdate()` is the framework-designated hook for pre-save record fixup during updates. However, it only receives the record and `{ original, activity }` — no transaction context.

Downstream consumers need to coordinate record fields with transaction properties during updates. Concrete case: on-chain policy requires `updatedAt` to exactly equal `txnEndTime` (pessimistic "certainly not after" timestamp semantics). The `beforeUpdate()` hook is the correct choke point for this fixup, but it can't access `tcx` to read `txnEndTime`.

Without tcx access, consumers are forced to either:
- Work around with a higher-level wrapper method (structural duplication)
- Modify records after they've been consumed by `mkTxnUpdateRecord` (incorrect — datum already built)

## Target State

Enrich `updateContext<T>` to include the transaction context:

```typescript
export type updateContext<T> = {
    original: T;
    activity: isActivity;
    tcx: StellarTxnContext;  // add
};
```

Pass `tcx` at the call site in `txnUpdatingRecord` (line 650):

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

No change to the default `beforeUpdate()` implementation — it returns the record unchanged and ignores context fields it doesn't use.

## Scope

- **Type change**: Add `tcx` field to `updateContext<T>` (line 96-99)
- **Call site**: Pass `tcx` through at line 650-656
- **Default impl**: No change needed (line 433-435)
- **Docs**: Update JSDoc on `updateContext` to document the new field

## Impact

- Non-breaking: existing `beforeUpdate()` overrides that destructure only `{ original, activity }` continue to work unchanged
- Enables downstream controllers to coordinate record fields with transaction properties (validity window, timestamps) in the designated hook
