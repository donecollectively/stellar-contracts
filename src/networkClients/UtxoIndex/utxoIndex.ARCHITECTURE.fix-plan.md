# UtxoIndex Architecture Fix Plan

## Goal

Establish clean type boundaries where:
- **CachedUtxoIndex** is the only component with Helios coupling
- **UtxoStoreGeneric** and implementations use only storage-agnostic types
- **types/** directory contains all storage-agnostic type definitions

---

## Phase 1: Define Storage-Agnostic Types

### 1.1 Create `types/UtxoIndexEntry.ts`

```typescript
export interface UtxoIndexEntry {
    utxoId: string;              // "txHash#outputIndex"
    address: string;             // bech32
    lovelace: bigint;
    tokens: Array<{
        policyId: string;        // hex
        tokenName: string;       // hex-encoded
        quantity: bigint;
    }>;
    datumHash: string | null;
    inlineDatum: string | null;  // CBOR hex
    uutIds: string[];            // extracted UUT identifiers
}
```

### 1.2 Create `types/BlockIndexEntry.ts`

```typescript
export interface BlockIndexEntry {
    hash: string;
    height: number;
    time: number;
    slot: number;
}
```

### 1.3 Create `types/TxIndexEntry.ts`

```typescript
export interface TxIndexEntry {
    txid: string;
    cbor: string;
}
```

### 1.4 Create `types/index.ts`

Export all types from single entry point.

---

## Phase 2: Update Storage Interface

### 2.1 Update `UtxoStoreGeneric.ts`

- Remove all `@helios-lang/*` imports
- Import types from `./types/`
- Update method signatures:
  - `saveUtxo(entry: UtxoIndexEntry): Promise<void>`
  - `findUtxoByUtxoId(id: string): Promise<UtxoIndexEntry | undefined>`
  - `findUtxoByUUT(uutId: string): Promise<UtxoIndexEntry | undefined>`
  - `saveBlock(block: BlockIndexEntry): Promise<void>`
  - `findBlockByBlockId(id: string): Promise<BlockIndexEntry | undefined>`
  - `saveTx(tx: TxIndexEntry): Promise<void>`
  - `findTxById(id: string): Promise<TxIndexEntry | undefined>`

---

## Phase 3: Update Dexie Implementation

### 3.1 Update `dexieRecords/UtxoDetails.ts`

Follow the pattern:
```typescript
import type { UtxoIndexEntry } from "../types/UtxoIndexEntry.js";

export class DexieUtxoEntry implements UtxoIndexEntry {
    id?: number;  // Dexie auto-increment if needed, or use utxoId as PK
    utxoId!: string;
    address!: string;
    lovelace!: bigint;
    tokens!: Array<{policyId: string; tokenName: string; quantity: bigint}>;
    datumHash!: string | null;
    inlineDatum!: string | null;
    uutIds!: string[];

    constructor(entry?: UtxoIndexEntry) {
        if (entry) Object.assign(this, entry);
    }
}
```

### 3.2 Update `dexieRecords/BlockDetails.ts`

Same pattern with `BlockIndexEntry`.

### 3.3 Update `DexieUtxoStore.ts`

- Remove `@helios-lang/*` imports
- Remove `txInputUtils.ts` import
- Import from `./types/`
- Simplify `saveUtxo()` to just store the entry:
  ```typescript
  async saveUtxo(entry: UtxoIndexEntry): Promise<void> {
      await this.utxos.put(entry);
  }
  ```

---

## Phase 4: Move Conversion Logic to CachedUtxoIndex

### 4.1 Add `extractUutIds()` method

```typescript
private extractUutIds(output: TxOutput): string[] {
    const uutPattern = /^[a-z]+-[0-9a-f]{12}$/;
    const tokenNames = output.value.assets.getPolicyTokenNames(this.capo.mph);

    return tokenNames
        .map(bytes => {
            try {
                return new TextDecoder().decode(new Uint8Array(bytes));
            } catch {
                return '';
            }
        })
        .filter(name => uutPattern.test(name));
}
```

### 4.2 Update `indexUtxoFromOutput()`

Convert TxOutput → UtxoIndexEntry here:
```typescript
private async indexUtxoFromOutput(
    txHash: string,
    outputIndex: number,
    output: TxOutput,
    blockHash: string
): Promise<void> {
    const utxoId = `${txHash}#${outputIndex}`;

    // Extract tokens
    const tokens: UtxoIndexEntry['tokens'] = [];
    for (const [mph, policyTokens] of output.value.assets.mintingPolicies) {
        for (const [tokenName, qty] of policyTokens) {
            tokens.push({
                policyId: mph.toHex(),
                tokenName: bytesToHex(tokenName),
                quantity: qty
            });
        }
    }

    // Extract datum
    let datumHash: string | null = null;
    let inlineDatum: string | null = null;
    if (output.datum) {
        if (output.datum.kind === "HashedTxOutputDatum") {
            datumHash = output.datum.hash.toHex();
        } else if (output.datum.kind === "InlineTxOutputDatum") {
            inlineDatum = bytesToHex(output.datum.toCbor());
        }
    }

    const entry: UtxoIndexEntry = {
        utxoId,
        address: output.address.toBech32(),
        lovelace: output.value.lovelace,
        tokens,
        datumHash,
        inlineDatum,
        uutIds: this.extractUutIds(output)
    };

    await this.store.saveUtxo(entry);
}
```

---

## Phase 5: Cleanup

### 5.1 Delete `txInputUtils.ts`

No longer needed - logic moved to CachedUtxoIndex.

### 5.2 Update `blockfrostTypes/UtxoDetails.ts`

Remove `uutIds` field - this is for Blockfrost API validation only, and Blockfrost doesn't provide uutIds.

### 5.3 Verify no Helios imports in storage layer

Check these files have NO `@helios-lang/*` imports:
- `UtxoStoreGeneric.ts`
- `DexieUtxoStore.ts`
- `dexieRecords/*.ts`
- `types/*.ts`

---

## Verification

1. `pnpm build` passes
2. No `@helios-lang` imports in storage layer files
3. `CachedUtxoIndex` is the only file importing from `@helios-lang/ledger`
4. All store operations use `UtxoIndexEntry`, `BlockIndexEntry`, `TxIndexEntry`
5. Only `CachedUtxoIndex` imports from `blockfrostTypes/*` (for API response validation)
6. `DexieUtxoStore`, `UtxoStoreGeneric`, `dexieRecords/*`, `types/*` have NO `blockfrostTypes` imports

---

## File Change Summary

| File | Action |
|------|--------|
| `types/UtxoIndexEntry.ts` | CREATE |
| `types/BlockIndexEntry.ts` | CREATE |
| `types/TxIndexEntry.ts` | CREATE |
| `types/index.ts` | CREATE |
| `UtxoStoreGeneric.ts` | UPDATE - remove Helios, use new types |
| `DexieUtxoStore.ts` | UPDATE - remove Helios, simplify saveUtxo |
| `dexieRecords/UtxoDetails.ts` | UPDATE - implement UtxoIndexEntry |
| `dexieRecords/BlockDetails.ts` | UPDATE - implement BlockIndexEntry |
| `CachedUtxoIndex.ts` | UPDATE - add extractUutIds, update indexUtxoFromOutput |
| `blockfrostTypes/UtxoDetails.ts` | UPDATE - remove uutIds field |
| `txInputUtils.ts` | DELETE |
