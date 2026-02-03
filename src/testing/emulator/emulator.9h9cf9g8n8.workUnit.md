# Work Unit: Store Actor Wallet Keys in Snapshot

**UUT**: `9h9cf9g8n8`
**Finding**: F8
**Audit**: `snapshot-impl-audit.4xb49a4jyw`
**Created**: 2026-02-02

## References

| Type | ID | Description |
|------|-----|-------------|
| Architecture | ARCH-09q3mytpga | Actor wallet keys concern |
| Architecture | ARCH-75rh0ewd7a | Offchain data concern (dependency) |
| Architecture | ARCH-41p1r2qpsq | StellarTestHelper component |
| Requirement | REQT-3.4/n93h9y5s85 | Actor Wallet Key Storage |
| Requirement | REQT-3.4.1/1p346cabct | Store wallet keys in offchainData |
| Requirement | REQT-3.4.2/avwkcrnwqp | Use makeBip32PrivateKey fast path |
| Requirement | REQT-3.4.3/ncbfwtyr8h | Replace regenerateActorsFromSetupInfo |
| Requirement | REQT-3.4.4/3rexpys2q3 | Remove __actorSetupInfo__ hack |

## Problem

Actor wallet regeneration uses PRNG replay instead of storing private keys directly.

**Current implementation** (StellarTestHelper.ts:684-708):
```typescript
regenerateActorsFromSetupInfo(): void {
    for (const actorInfo of this.actorSetupInfo) {
        // Expensive: derives keys from PRNG
        const wallet = this.createWalletWithoutUtxo();

        // Even more overhead: advance PRNG for each additional UTxO
        for (let i = 0; i < actorInfo.additionalUtxos.length; i++) {
            this.createWalletWithoutUtxo();
        }
        this.actors[actorInfo.name] = wallet;
    }
}

createWalletWithoutUtxo(): emulatedWallet {
    return emulatedWallet.fromRootPrivateKey(
        makeRootPrivateKey(generateBytes(this.network.mulberry32, 32)),  // Slow!
        this.networkCtx,
    );
}
```

**Hack in use**: Actor setup info stored as `__actorSetupInfo__` JSON string in namedRecords:
```json
"__actorSetupInfo__": "[{\"name\":\"tina\",\"initialBalance\":\"11000000000\",...}]"
```

## Perspective Violated

**Architecture goal**: Snapshot restoration should be fast. PRNG key derivation adds unnecessary overhead on every snapshot load.

**Fast pattern exists** (CapoDappProvider.tsx:1200-1202):
```typescript
spendingKey = makeBip32PrivateKey(hexToBytes(walletData.spendingKey));
stakingKey = makeBip32PrivateKey(hexToBytes(walletData.stakingKey));
```

## Target State

1. Store actor wallet private keys directly in snapshot (not in cache key, not in namedRecords)
2. On restore, use `makeBip32PrivateKey(hexToBytes(key))` for instant reconstruction
3. Remove PRNG replay logic

## Dependencies

**Requires**: WU5 (`bfwzqy0sb6`) - Offchain data storage mechanism

**Dependency Chain**:
```
WU5 (offchain data) ← WU3 (actor keys)
```

## Remediation Guidance

### Data Structure

```typescript
// In additionalStoredData (per snapshot)
actorWallets: {
    [actorName: string]: {
        spendingKey: string;  // hex bytes
        stakingKey: string;   // hex bytes
    }
}
```

### On Snapshot Save (actors snapshot)

```typescript
// After creating actors, capture keys
const actorWallets: Record<string, { spendingKey: string; stakingKey: string }> = {};
for (const [name, wallet] of Object.entries(this.actors)) {
    actorWallets[name] = {
        spendingKey: bytesToHex(wallet.spendingKey.bytes),
        stakingKey: bytesToHex(wallet.stakingKey.bytes),
    };
}
// Store in additionalStoredData (not namedRecords, not cache key)
```

### On Snapshot Load

```typescript
// Replace regenerateActorsFromSetupInfo() with:
restoreActorsFromStoredKeys(storedWallets: Record<string, StoredWalletKeys>): void {
    for (const [name, keys] of Object.entries(storedWallets)) {
        const spendingKey = makeBip32PrivateKey(hexToBytes(keys.spendingKey));
        const stakingKey = makeBip32PrivateKey(hexToBytes(keys.stakingKey));
        const wallet = emulatedWallet.fromKeys(spendingKey, stakingKey, this.networkCtx);
        this.actors[name] = wallet;
        this.actorContext.others[name] = wallet;
    }
}
```

### Cleanup

- Remove `__actorSetupInfo__` from namedRecords usage
- Remove `regenerateActorsFromSetupInfo()`
- Remove `createWalletWithoutUtxo()` (no longer needed)
- Remove `parseActorSetupInfo()` helper

## Focus Files

| File | Purpose |
|------|---------|
| `src/testing/StellarTestHelper.ts` | `regenerateActorsFromSetupInfo`, `createWalletWithoutUtxo` - replace with key restoration |
| `src/testing/CapoTestHelper.ts` | `findOrCreateSnapshot` - use stored keys on actor snapshot restore |
| `src/testing/emulator/SnapshotCache.ts` | `additionalStoredData` storage (depends on WU5) |
| `src/ui/CapoDappProvider.tsx:1200-1202` | Reference pattern for fast key restoration |

## Verification

- [x] Actors snapshot stores wallet keys in offchainData (REQT-3.4.1/1p346cabct)
- [x] Snapshot load restores actors without PRNG replay (REQT-3.4.2/avwkcrnwqp)
- [x] No `__actorSetupInfo__` written to namedRecords (REQT-3.4.4/3rexpys2q3)
- [x] `regenerateActorsFromSetupInfo()` and `createWalletWithoutUtxo()` removed (REQT-3.4.3/ncbfwtyr8h)
- [x] `parseActorSetupInfo()` removed
- [ ] Tests pass with cached snapshots (pending: unrelated test failures need investigation)
