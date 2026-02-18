# On-chain diagnostics: REQT & logging helpers

Use these helpers when **writing** validation logic — not just when debugging. They are the standard way to express enforceable, traceable requirements in on-chain code. Every invariant your validator enforces should be wrapped in a REQT* call so it's visible at runtime, not just in source.

The REQT helpers create proactive transparency/observability and support end-user verification of actual contractual behaviors.

## How we choose helpers (principles seen in src/*.hl)
- Use `REQT` when a requirement must fail the script immediately and you want the log to say what was expected (e.g., gating mint/spend invariants).  This is the same as an assert(), except it also includes a proactive logged line of output indicating the requirement/expectation before the assertion is made.
- Use `bREQT` when you need a Bool for chaining/short-circuit but still want the assertion and message.
- You SHOULD prefer to use bREQT/REQT's `showSuccess: true` to emit a diagnostic cue that the check was actually performed.  You should use their onError: option to indicate what is wrong (ONLY if the reqt text itself doesn't make it clear).
- Wrap multi-step or nested checks in `REQTgroup*` so the log shows a grouped requirement with auto-closed status; pick the variant that matches your return type (`REQTgroup`, `REQTgroupUnit`, `bREQTgroup`, `assertREQTgroup`).
- Open-ended flows start with `REQTgroupStart` and finish with `logGroupEnd` when you can’t use a single callback wrapper, or when it's inconvenient to do so.
- `collapsed: true` is used for ONLY when the detail is noisy and the nested calls are expected-success, library-provided functions; leave it false when the detail is decision-critical or when the nested calls are application-layer logic.
- Use `print("   -- ...details")` to transparently show details of what important data is observed in flight, particularly when it relates to logic and decision-making and can be useful for debugging.  The Helios compiler optimizes these out of the on-chain compiled script but makes them available for customer-facing transparency and developer troubleshooting.
- Use `logGroup*` for wrapping diagnostics for more signfiicant chunks of logic, and to give a viewer of the diagnostics a visual indication of the call-trees so they can see what is nested and when the group is closed.  Pair `logGroupStart`/`logGroupEnd` when you need manual control.
- Reserve `TRACE` for very cheap identifiers/messages and `TODO` to mark missing enforcement paths; these intentionally keep failing branches visible in logs.
- Use named arguments (except for trivial single-arg calls) to REQT() and other diagnostic helpers to make the code's intention obvious.

## REQT family (requirements)
- `REQT(reqt, assertion=true, onError=…, showSuccess=false) -> ()`
  - Hard assert with labeled requirement text; set `showSuccess=true` only when you need positive confirmation in logs that the requirement executed (e.g., debugging a rare branch or proving a gate was checked).
  - Example enforcing mint requirements for delegated data creation:
```
1181:1188:src/CapoHelpers.hl
REQTgroupStart(reqt, collapsed: true);
output : TxOutput = self.delegatedTxOutput(recIdBytes);
recIdAssetClass = AssetClass::new(self.mph, recIdBytes);
minted = tx.minted.get_safe(recIdAssetClass)
if (minted == 1) {
    logGroupEnd("✅ creating: "+recIdBytes.decode_utf8_safe())
} else {
    …
}
```
- `bREQT(…) -> Bool`
  - Same as `REQT` but returns `true` to enable boolean chaining. Common inside combined guards.
- `REQTgroupStart(reqt, collapsed=false) -> ()`
  - Opens a requirement-scoped log when you will finish manually with `logGroupEnd`.
- `assertREQTgroup(reqt, collapsed, callback) -> ()`
  - Grouped requirement enforcement that returns nothing. Runs a Bool callback inside a requirement-labelled log group; asserts on false. Use when you need grouped enforcement in a void context — the requirement must hold, but you don't need a Bool result for chaining. The void return makes intent clear: this is a standalone gate, not part of a boolean expression.
- `bREQTgroup(reqt, collapsed, callback) -> Bool`
  - Grouped requirement enforcement that returns the Bool result after asserting. Use when combining grouped requirements inside boolean expressions or when you want the result for short-circuit chaining.
- `REQTgroup[T](reqt, collapsed, callback) -> T`
  - Wraps any return type; asserts by virtue of `logGroupEnd("✅")` only when the callback succeeds.
  - Example for mandatory gov authority check:
```
1398:1407:src/CapoHelpers.hl
REQTgroup[CapoCtx](
    reqt: "MUST have the Capo's govAuthority approval",
    collapsed: true,
    callback: () -> CapoCtx {
        assert(self.getCharterData().govAuthorityLink.hasValidOutput(self.mph), "^ that fails, this can't");
        print("✅ govAuthority ok!")
        self
    })
```
- `REQTgroupUnit(reqt, collapsed, callback) -> ()`
  - Grouped void variant; use when only side effects/logging matter.
- Pattern: multi-activity validation mixes `bREQT` for role-tagging with `bREQTgroup` for nested validation to keep the log readable:
```
286:305:src/delegation/BasicDelegate.hl
spendDgtCheck : Bool = notSpendDgt || bREQTgroup(
    reqt: "validates nested activities: in the spend delegate, only {Updating,Deleting}DelegatedData activities are valid in multi-activities",
    collapsed: false,
    callback: () -> Bool { activities.all( (rawActivity: Data) -> Bool {
        a : DelegateActivity = DelegateActivity::from_data(rawActivity);
        …
        checkOneActivity(dgtionDatum, a, dd, cctx, "one update is properly delegated")
    })});
```
- Pattern: grouped requirement + optional logging when requirement is optional. For optional lookups, code uses `logGroupStart`/`logGroupEnd` instead of `REQTgroupStart` so the absence doesn’t assert (see `requiresDgDataPolicyInput` at 1432–1467 in `src/CapoHelpers.hl`).

## Logging helpers (non-asserting diagnostics)
- `logGroupStart(group, collapsed=false) -> ()` / `logGroupEnd(status="") -> ()`
  - Manual bracketing; required when a flow spans multiple statements or early returns.
- `logGroup(group, collapsed, callback) -> Bool`
  - Auto-closes with ✅/❌ based on callback Bool. Good for “try-find/validate” probes.
- `logGroupUnit(group, collapsed, callback) -> ()`
  - Auto-closes for side-effect-only scopes.
  - Example: activity dispatch uses `logGroup` to make the decision tree readable:
```
204:213:src/delegation/BasicDelegate.hl
logGroup(group:"🏒 checking activity: "+desc, collapsed: false, callback: () -> {
    result = if (true) {
        checkNonDelegatedActivities: Bool = activity.switch {
            MultipleDelegateActivities{activities} => {
                …
```
- `TRACE(id, message) -> ()`
  - Lightweight print; use for stable identifiers or small breadcrumbs, not full requirement text.
- `TODO(task) -> ()`
  - Emits a red “TODO” marker; keep for intentional gaps so reviewers/tests know a path is incomplete.
- Collapsing logs: prefer `collapsed: true` when the log noise would be high in green paths (e.g., per-record checks), leave it open when the decision is important to debug failures (e.g., activity dispatch).

## When to pick what (quick rules)
- Use `REQT`/`REQTgroup*` for invariants that must abort the transaction; select the variant that fits your return type and whether you need automatic log closure.
- Use `assertREQTgroup` for standalone grouped enforcement gates in void context — the requirement must hold, but the surrounding code doesn't need a Bool result.
- Use `bREQT`/`bREQTgroup` when combining requirements inside boolean expressions or when you want short-circuit behavior with logging.
- Use `REQTgroupStart` + `logGroupEnd` when you need to emit intermediate logs before deciding success/failure.
- Use `logGroup*` for narrative tracing or optional flows where failure should not assert.
- Use `TRACE` sparingly for micro breadcrumbs; use `TODO` to flag missing enforcement so it’s visible in logs/tests.
