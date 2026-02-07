/**
 * Helios-aware deep clone for datum-compatible record structures.
 *
 * Uses duck-typing heuristic rather than explicit `instanceof` checks against
 * Helios types. This is intentional (see architect audit wnk629abe9): duck-typing
 * is more resilient to Helios library evolution than an exhaustive type registry,
 * and a silent miss would surface as a test failure when the frozen input throws
 * on mutation.
 *
 * Cloning strategy by type:
 * - Primitives (string, number, bigint, boolean, undefined): pass through
 * - Objects with `.copy()` (Address, Value, Assets): call `.copy()`
 * - Objects with `.toCbor()` but no `.copy()` (PubKeyHash, UplcData): share by reference (immutable)
 * - Plain objects: recurse into properties
 * - Arrays: recurse into elements
 *
 * `structuredClone` is NOT suitable — it cannot handle objects with methods.
 */
export function deepCloneRecord<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    // Mutable Helios types: has copy() → produce independent copy
    if (typeof (obj as any).copy === "function") {
        return (obj as any).copy();
    }

    // Immutable Helios types: has toCbor() but no copy() → share by reference
    if (typeof (obj as any).toCbor === "function") {
        return obj;
    }

    // Arrays: create new array, recurse into each element
    if (Array.isArray(obj)) {
        return obj.map((item) => deepCloneRecord(item)) as T;
    }

    // Plain objects: create new object, recurse into each property
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
        result[key] = deepCloneRecord(
            (obj as Record<string, unknown>)[key]
        );
    }
    return result as T;
}

/**
 * Recursively freeze plain objects and arrays in a record structure.
 *
 * Does NOT freeze Helios type instances (they have internal state managed
 * by their own invariants). Only freezes objects with `Object.prototype`
 * or `null` prototype, and arrays.
 *
 * Designed to be called on an already-cloned record to enforce the
 * return-value contract: hooks must return a new object rather than
 * mutating the input.
 */
export function deepFreezeRecord<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    const proto = Object.getPrototypeOf(obj);
    const isPlainObject = proto === Object.prototype || proto === null;
    const isArray = Array.isArray(obj);

    if (isPlainObject || isArray) {
        Object.freeze(obj);
        if (isArray) {
            for (const item of obj as unknown[]) {
                deepFreezeRecord(item);
            }
        } else {
            for (const value of Object.values(
                obj as Record<string, unknown>
            )) {
                deepFreezeRecord(value);
            }
        }
    }

    return obj;
}
