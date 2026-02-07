import { describe, it, expect } from "vitest";
import { deepCloneRecord, deepFreezeRecord } from "./deepCloneRecord.js";

import {
    makeAddress,
    makePubKeyHash,
    makeValue,
    makeAssets,
} from "@helios-lang/ledger";
import {
    makeByteArrayData,
    makeIntData,
    makeConstrData,
} from "@helios-lang/uplc";

// 28-byte hash for PubKeyHash (Cardano standard)
const SAMPLE_PKH_BYTES = new Array(28).fill(0).map((_, i) => i);
const SAMPLE_PKH_BYTES_2 = new Array(28).fill(0).map((_, i) => i + 100);

describe("deepCloneRecord", () => {
    it("passes through primitives", () => {
        expect(deepCloneRecord(null)).toBe(null);
        expect(deepCloneRecord(undefined)).toBe(undefined);
        expect(deepCloneRecord(42)).toBe(42);
        expect(deepCloneRecord("hello")).toBe("hello");
        expect(deepCloneRecord(true)).toBe(true);
        expect(deepCloneRecord(99n)).toBe(99n);
    });

    it("clones plain objects with new references", () => {
        const original = { a: 1, b: "two" };
        const cloned = deepCloneRecord(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
    });

    it("deep-clones nested plain objects", () => {
        const nested = { x: 10 };
        const original = { outer: nested, label: "test" };
        const cloned = deepCloneRecord(original);

        expect(cloned.outer).toEqual(nested);
        expect(cloned.outer).not.toBe(nested);

        // Mutation of clone doesn't affect original
        cloned.outer.x = 999;
        expect(nested.x).toBe(10);
    });

    it("clones arrays with new references", () => {
        const original = [1, 2, { nested: true }];
        const cloned = deepCloneRecord(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned[2]).not.toBe(original[2]);
    });

    it("copies Value via copy() — independent mutable clone", () => {
        const value = makeValue(5_000_000n);
        const cloned = deepCloneRecord(value);

        expect(cloned).not.toBe(value);
        // Both represent the same lovelace amount
        expect(cloned.lovelace).toBe(5_000_000n);
    });

    it("copies Address via copy() — independent clone", () => {
        const pkh = makePubKeyHash(SAMPLE_PKH_BYTES);
        const address = makeAddress(false, pkh);
        const cloned = deepCloneRecord(address);

        expect(cloned).not.toBe(address);
        expect(cloned.toHex()).toBe(address.toHex());
    });

    it("copies Assets via copy() — independent clone", () => {
        const assets = makeAssets([]);
        const cloned = deepCloneRecord(assets);

        expect(cloned).not.toBe(assets);
    });

    it("shares PubKeyHash by reference — immutable type", () => {
        const pkh = makePubKeyHash(SAMPLE_PKH_BYTES);
        const cloned = deepCloneRecord(pkh);

        expect(cloned).toBe(pkh);
    });

    it("shares ByteArrayData by reference — immutable type", () => {
        const data = makeByteArrayData([10, 20, 30]);
        const cloned = deepCloneRecord(data);

        expect(cloned).toBe(data);
    });

    it("shares IntData by reference — immutable type", () => {
        const data = makeIntData(42n);
        const cloned = deepCloneRecord(data);

        expect(cloned).toBe(data);
    });

    it("shares ConstrData by reference — immutable type", () => {
        const data = makeConstrData(0, [makeIntData(1n)]);
        const cloned = deepCloneRecord(data);

        expect(cloned).toBe(data);
    });

    it("handles mixed records with real Helios fields", () => {
        const pkh = makePubKeyHash(SAMPLE_PKH_BYTES);
        const address = makeAddress(false, pkh);
        const value = makeValue(2_000_000n);
        const uplcData = makeByteArrayData([1, 2, 3]);

        const record = {
            id: [10, 20, 30],
            type: "myRecord",
            owner: address,
            pkh: pkh,
            lockedValue: value,
            metadata: uplcData,
            nested: { count: 5 },
        };

        const cloned = deepCloneRecord(record);

        // Top-level is a new object
        expect(cloned).not.toBe(record);

        // Primitive fields pass through
        expect(cloned.type).toBe("myRecord");

        // Array field (byte array for id) is cloned
        expect(cloned.id).toEqual([10, 20, 30]);
        expect(cloned.id).not.toBe(record.id);

        // Mutable Helios types are copied (new reference)
        expect(cloned.owner).not.toBe(address);
        expect(cloned.owner.toHex()).toBe(address.toHex());
        expect(cloned.lockedValue).not.toBe(value);
        expect(cloned.lockedValue.lovelace).toBe(2_000_000n);

        // Immutable Helios types are shared (same reference)
        expect(cloned.pkh).toBe(pkh);
        expect(cloned.metadata).toBe(uplcData);

        // Nested plain object is cloned
        expect(cloned.nested).not.toBe(record.nested);
        expect(cloned.nested.count).toBe(5);
    });
});

describe("deepFreezeRecord", () => {
    it("passes through primitives without error", () => {
        expect(deepFreezeRecord(null)).toBe(null);
        expect(deepFreezeRecord(42)).toBe(42);
        expect(deepFreezeRecord("hello")).toBe("hello");
    });

    it("freezes plain objects", () => {
        const obj = { a: 1 };
        deepFreezeRecord(obj);

        expect(Object.isFrozen(obj)).toBe(true);
        expect(() => {
            (obj as any).a = 2;
        }).toThrow();
    });

    it("recursively freezes nested plain objects", () => {
        const obj = { outer: { inner: { deep: true } } };
        deepFreezeRecord(obj);

        expect(Object.isFrozen(obj)).toBe(true);
        expect(Object.isFrozen(obj.outer)).toBe(true);
        expect(Object.isFrozen(obj.outer.inner)).toBe(true);
    });

    it("freezes arrays and their plain-object elements", () => {
        const arr = [{ x: 1 }, { y: 2 }];
        deepFreezeRecord(arr);

        expect(Object.isFrozen(arr)).toBe(true);
        expect(Object.isFrozen(arr[0])).toBe(true);
        expect(Object.isFrozen(arr[1])).toBe(true);
        expect(() => {
            arr.push({ z: 3 } as any);
        }).toThrow();
    });

    it("does NOT freeze real Helios type instances", () => {
        const value = makeValue(1_000_000n);
        deepFreezeRecord(value);

        // Value has a non-default prototype — should NOT be frozen
        expect(Object.isFrozen(value)).toBe(false);
    });

    it("freezes plain parts but skips Helios fields in mixed records", () => {
        const address = makeAddress(false, makePubKeyHash(SAMPLE_PKH_BYTES));
        const record = {
            label: "test",
            owner: address,
            nested: { count: 1 },
        };

        deepFreezeRecord(record);

        // Plain parts are frozen
        expect(Object.isFrozen(record)).toBe(true);
        expect(Object.isFrozen(record.nested)).toBe(true);

        // Helios field is NOT frozen
        expect(Object.isFrozen(address)).toBe(false);

        // Cannot mutate the plain record
        expect(() => {
            (record as any).label = "changed";
        }).toThrow();
    });
});

describe("deepCloneRecord + deepFreezeRecord integration", () => {
    it("clone-then-freeze produces an independent frozen snapshot", () => {
        const pkh = makePubKeyHash(SAMPLE_PKH_BYTES);
        const address = makeAddress(false, pkh);

        const original = {
            id: [1, 2, 3],
            type: "test",
            owner: address,
            pkh: pkh,
            data: { count: 10, tags: ["a", "b"] },
        };

        const frozen = deepFreezeRecord(deepCloneRecord(original));

        // Independent from original
        expect(frozen).not.toBe(original);
        expect(frozen.data).not.toBe(original.data);
        expect(frozen.owner).not.toBe(original.owner); // copied via .copy()
        expect(frozen.pkh).toBe(original.pkh); // shared — immutable

        // Frozen — cannot mutate plain parts
        expect(Object.isFrozen(frozen)).toBe(true);
        expect(Object.isFrozen(frozen.data)).toBe(true);
        expect(Object.isFrozen(frozen.data.tags)).toBe(true);
        expect(() => {
            (frozen as any).type = "changed";
        }).toThrow();

        // Original is untouched and still mutable
        expect(Object.isFrozen(original)).toBe(false);
        original.data.count = 20;
        expect(original.data.count).toBe(20);
        expect(frozen.data.count).toBe(10);
    });
});
