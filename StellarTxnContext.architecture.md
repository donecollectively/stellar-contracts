# StellarTxnContext Architecture

## Overview

`StellarTxnContext` is the **transaction-building context** for Stellar Contracts. It serves as the central coordination point for constructing Cardano transactions, managing typed state accumulation, and orchestrating multi-transaction workflows.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  (Capo, Delegates, DelegatedDataContract, your dApp code)       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ creates & manipulates
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    StellarTxnContext                            │
│  • Typed state accumulation (S extends anyState)                │
│  • Input/output/refInput tracking                               │
│  • Multi-transaction queuing (addlTxns)                         │
│  • Validity period management                                   │
└──────────┬──────────────────┬───────────────────┬───────────────┘
           │                  │                   │
           ▼                  ▼                   ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  TxBuilder  │    │  TxBatcher  │    │TxChainBuilder│
    │  (Helios)   │    │             │    │   (Helios)  │
    └─────────────┘    └─────────────┘    └─────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Cardano Network │
                    └─────────────────┘
```

---

## Components & Ownership

| Component | Location | Owner | Responsibility |
|-----------|----------|-------|----------------|
| `StellarTxnContext` | Local | stellar-contracts | Transaction building context with typed state |
| `TxBuilder` | External | @helios-lang/tx-utils | Low-level transaction construction |
| `TxBatcher` | Local | stellar-contracts | Batch coordination, signing strategy |
| `BatchSubmitController` | Local | stellar-contracts | Per-batch state machine for submission |
| `TxChainBuilder` | External | @helios-lang/tx-utils | Virtual UTxO set for chained transactions |
| `SetupInfo` | Local | stellar-contracts | Network params, wallet, actor context |

### Artifact Ownership

| Artifact | Owner | Notes |
|----------|-------|-------|
| `state: S` | StellarTxnContext | Typed state accumulator |
| `inputs[]`, `outputs[]` | StellarTxnContext | Local reflection of tx contents |
| `txRefInputs[]` | StellarTxnContext | Reference inputs (idempotent) |
| `addlTxns` | StellarTxnContext (in state) | Queued transaction descriptions |
| `txb: TxBuilder` | StellarTxnContext | Wrapped, not exposed directly |
| `currentBatch` | TxBatcher | Active BatchSubmitController |
| Virtual UTxO set | TxChainBuilder | Uncommitted outputs available to chain |

---

## Interface Surface

### Creating a Transaction Context

```typescript
// Via StellarContract.mkTcx() - preferred
const tcx = capo.mkTcx();

// Direct construction (rare)
const tcx = new StellarTxnContext(setup);
```

### State Accumulation Pattern

Transaction builders return **refined types** that accumulate capabilities:

```typescript
// Each method adds to the type
async function buildComplexTx() {
    const tcx1 = capo.mkTcx();                          // StellarTxnContext<anyState>
    const tcx2 = await capo.tcxWithCharterRef(tcx1);    // + hasCharterRef
    const tcx3 = await capo.tcxWithSettingsRef(tcx2);   // + hasSettingsRef
    const tcx4 = await capo.addSeedUtxo(tcx3);          // + hasSeedUtxo

    // tcx4 now has type: StellarTxnContext & hasCharterRef & hasSettingsRef & hasSeedUtxo
    // Methods requiring these capabilities will type-check
}
```

### Adding Inputs & Outputs

```typescript
tcx.addInput(utxo, activity);       // Spend with redeemer
tcx.addRefInput(utxo);              // Reference only (idempotent)
tcx.addOutput(txOutput);            // Add output
tcx.addCollateral(utxo);            // For script execution
```

### Transaction Validity

```typescript
tcx.validFor(10 * 60 * 1000);       // Valid for 10 minutes from now
tcx.futureDate(scheduledDate)       // Start validity in the future
   .validFor(5 * 60 * 1000);        // Then valid for 5 minutes
```

### Multi-Transaction Chaining

```typescript
// Queue a dependent transaction
tcx.includeAddlTxn("next-step", {
    description: "Follow-up operation",
    mkTcx: async () => capo.mkTxnFollowUp(...)
});

// Submit all (primary + queued)
await tcx.submitAll();
```

---

## Data Flow: Single Transaction

```
Application Code
       │
       │ 1. mkTcx()
       ▼
┌─────────────────┐
│ StellarTxnContext│
│   state: {}     │
└────────┬────────┘
         │ 2. addInput(), addOutput(), etc.
         ▼
┌─────────────────┐
│ StellarTxnContext│
│   state: {      │
│     seedUtxo,   │
│     charterRef  │
│   }             │
│   inputs: [...]│
│   outputs: [...] │
└────────┬────────┘
         │ 3. submitAll() → build()
         ▼
┌─────────────────┐
│   TxBuilder     │──► Tx (built, validated)
└────────┬────────┘
         │ 4. buildAndQueue()
         ▼
┌─────────────────┐
│ BatchSubmitController │
│   txStates: {   │
│     [id]: built │
│   }             │
└────────┬────────┘
         │ 5. Sign & submit
         ▼
    Cardano Network
```

---

## Data Flow: Transaction Chain

When multiple dependent transactions must execute in sequence:

```
┌─────────────────────────────────────────────────────────────┐
│                    TxChainBuilder                           │
│  Virtual UTxO Set (evolves as transactions are built)       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Network UTxOs + TX1 outputs + TX2 outputs + ...     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ▲
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     ┌────┴────┐         ┌────┴────┐         ┌────┴────┐
     │  TCX 1  │────────►│  TCX 2  │────────►│  TCX 3  │
     │(primary)│ outputs │(queued) │ outputs │(queued) │
     └─────────┘ become  └─────────┘ become  └─────────┘
                 inputs            inputs

Build Order: TCX1 → TCX2 → TCX3 (depth-first)
Submit Order: TCX1 → TCX2 → TCX3 (same)
```

---

## Example: Simple Token Transfer

```typescript
class MyCapo extends Capo<MySettings> {
    @txn
    async mkTxnTransferToken(
        recipient: Address,
        amount: bigint,
        tcx: StellarTxnContext = this.mkTcx()
    ): Promise<StellarTxnContext> {
        // 1. Find the token UTxO
        const tokenUtxo = await this.findTokenUtxo();

        // 2. Add charter reference (required for validation)
        const tcx2 = await this.tcxWithCharterRef(tcx);

        // 3. Spend the token with appropriate activity
        tcx2.addInput(tokenUtxo, this.activityTransferring());

        // 4. Create output to recipient
        tcx2.addOutput(new TxOutput(
            recipient,
            tokenUtxo.value
        ));

        // 5. Set validity
        tcx2.validFor(10 * 60 * 1000); // 10 minutes

        return tcx2;
    }
}

// Application usage
const tcx = await myCapo.mkTxnTransferToken(recipientAddr, 100n);
await tcx.submitAll();
```

---

## Example: Pizza Order (Transaction Chain)

A relatable example showing multi-transaction workflows. Imagine a blockchain pizza ordering system where:

1. **Order TX**: Customer places order, locking payment in escrow
2. **Confirm TX**: Restaurant confirms and claims partial payment
3. **Deliver TX**: Delivery confirmed, remaining payment released

```typescript
class PizzaCapo extends Capo<PizzaSettings> {

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Customer places order
    // ═══════════════════════════════════════════════════════════
    @txn
    async mkTxnPlaceOrder(
        order: PizzaOrder,
        tcx: StellarTxnContext = this.mkTcx()
    ): Promise<StellarTxnContext> {
        const tcx2 = await this.tcxWithCharterRef(tcx);
        const tcx3 = await this.addSeedUtxo(tcx2);

        // Mint order token
        const tcx4 = await this.txnMintOrderToken(tcx3, order);

        // Lock payment in escrow
        const escrowOutput = new TxOutput(
            this.escrowAddress,
            makeValue(order.totalPrice),
            this.mkOrderDatum(order)
        );
        tcx4.addOutput(escrowOutput);

        tcx4.validFor(15 * 60 * 1000); // 15 min to submit
        return tcx4.withName("Place Pizza Order");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Restaurant confirms (chained after order)
    // ═══════════════════════════════════════════════════════════
    @txn
    async mkTxnConfirmOrder(
        orderUtxo: TxInput,  // From TX1's output (via TxChainBuilder!)
        tcx: StellarTxnContext = this.mkTcx()
    ): Promise<StellarTxnContext> {
        const tcx2 = await this.tcxWithCharterRef(tcx);

        // Spend order UTxO with "confirming" activity
        tcx2.addInput(orderUtxo, this.activityConfirming());

        // Restaurant gets prep fee immediately
        const prepFee = orderUtxo.value.lovelace / 3n;
        tcx2.addOutput(new TxOutput(
            this.restaurantAddress,
            makeValue(prepFee)
        ));

        // Remainder stays in escrow with updated status
        tcx2.addOutput(new TxOutput(
            this.escrowAddress,
            orderUtxo.value.subtract(makeValue(prepFee)),
            this.mkConfirmedDatum(orderUtxo)
        ));

        tcx2.validFor(30 * 60 * 1000); // 30 min window
        return tcx2.withName("Confirm Pizza Order");
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Delivery complete (chained after confirm)
    // ═══════════════════════════════════════════════════════════
    @txn
    async mkTxnCompleteDelivery(
        confirmedUtxo: TxInput,  // From TX2's output
        deliveryProof: DeliveryProof,
        tcx: StellarTxnContext = this.mkTcx()
    ): Promise<StellarTxnContext> {
        const tcx2 = await this.tcxWithCharterRef(tcx);

        // Spend confirmed escrow
        tcx2.addInput(confirmedUtxo, this.activityDelivering(deliveryProof));

        // Release remaining to restaurant
        tcx2.addOutput(new TxOutput(
            this.restaurantAddress,
            confirmedUtxo.value
        ));

        // Burn the order token
        await this.txnBurnOrderToken(tcx2, confirmedUtxo);

        tcx2.validFor(60 * 60 * 1000); // 1 hour window
        return tcx2.withName("Complete Pizza Delivery");
    }

    // ═══════════════════════════════════════════════════════════
    // ORCHESTRATION: Full order flow as chained transactions
    // ═══════════════════════════════════════════════════════════
    async submitPizzaOrder(order: PizzaOrder): Promise<void> {
        // Start with the order transaction
        const orderTcx = await this.mkTxnPlaceOrder(order);

        // Queue the confirmation (will execute after order TX confirms)
        // Note: mkTcx is a factory - it runs LATER, when TxChainBuilder
        // has the order TX's outputs available
        orderTcx.includeAddlTxn("confirm", {
            description: "Restaurant confirms order",
            mkTcx: async () => {
                // This runs after orderTcx is built!
                // TxChainBuilder provides the escrow UTxO from orderTcx
                const escrowUtxo = await this.findEscrowUtxo(order.id);
                return this.mkTxnConfirmOrder(escrowUtxo);
            }
        });

        // Queue delivery completion (chains after confirm)
        orderTcx.includeAddlTxn("deliver", {
            description: "Complete delivery",
            mkTcx: async () => {
                const confirmedUtxo = await this.findConfirmedUtxo(order.id);
                const proof = await this.getDeliveryProof(order.id);
                return this.mkTxnCompleteDelivery(confirmedUtxo, proof);
            }
        });

        // Submit all three transactions in sequence
        // TxChainBuilder maintains virtual UTxO set across the chain
        await orderTcx.submitAll();
    }
}
```

### UI Integration: "Submit All" Workflow

```tsx
function PizzaOrderButton({ order }: { order: PizzaOrder }) {
    const { pizzaCapo } = usePizzaDapp();
    const [status, setStatus] = useState<'idle' | 'building' | 'signing' | 'submitted'>('idle');

    const handleSubmit = async () => {
        setStatus('building');

        try {
            // Build the transaction chain
            const orderTcx = await pizzaCapo.mkTxnPlaceOrder(order);

            // Queue follow-up transactions
            orderTcx.includeAddlTxn("confirm", {
                description: "Restaurant confirms",
                mkTcx: () => pizzaCapo.mkTxnConfirmOrder(/* ... */)
            });

            setStatus('signing');

            // submitAll() handles:
            // 1. Building each TX (depth-first)
            // 2. Collecting signatures
            // 3. Submitting in order
            // 4. TxChainBuilder shares UTxOs across chain
            await orderTcx.submitAll({
                onSubmitted: (txInfo) => {
                    console.log(`✓ ${txInfo.description} submitted`);
                }
            });

            setStatus('submitted');
        } catch (e) {
            console.error("Order failed:", e);
            setStatus('idle');
        }
    };

    return (
        <button onClick={handleSubmit} disabled={status !== 'idle'}>
            {status === 'idle' && '🍕 Place Order'}
            {status === 'building' && '🔨 Building transactions...'}
            {status === 'signing' && '✍️ Please sign in wallet...'}
            {status === 'submitted' && '✅ Order submitted!'}
        </button>
    );
}
```

### What Happens Under the Hood

```
User clicks "Place Order"
         │
         ▼
    orderTcx created & built
    escrowOutput added
         │
         ├── includeAddlTxn("confirm", mkTcx: ...)
         │       └── queued, not built yet
         │
         ├── includeAddlTxn("deliver", mkTcx: ...)
         │       └── queued, not built yet
         │
         ▼
    submitAll()
         │
         ├── 1. Build orderTcx → TX1
         │       TxChainBuilder.with(TX1)
         │       Virtual UTxO set now includes TX1 outputs
         │
         ├── 2. Resolve "confirm" → mkTcx() runs
         │       findEscrowUtxo() queries TxChainBuilder
         │       Gets escrow output FROM TX1 (not yet on-chain!)
         │       Build confirmTcx → TX2
         │       TxChainBuilder.with(TX2)
         │
         ├── 3. Resolve "deliver" → mkTcx() runs
         │       findConfirmedUtxo() queries TxChainBuilder
         │       Gets confirmed output FROM TX2
         │       Build deliverTcx → TX3
         │
         ├── 4. BatchSubmitController signs all
         │       Wallet prompted once for all signatures
         │
         └── 5. Submit TX1 → TX2 → TX3 in sequence
                 Each must confirm before next submits
```

---

## Collaboration Summary

```
┌────────────────────────────────────────────────────────────────┐
│                      Application Code                          │
│  • Creates TCX via capo.mkTcx()                                │
│  • Calls @txn / @partialTxn methods                            │
│  • Queues chained txns via includeAddlTxn()                    │
│  • Triggers submission via submitAll()                         │
└───────────────────────────┬────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │StellarTxn   │ │  TxBatcher  │ │TxChain      │
     │Context      │ │             │ │Builder      │
     ├─────────────┤ ├─────────────┤ ├─────────────┤
     │Accumulates  │ │Coordinates  │ │Maintains    │
     │typed state  │ │batches      │ │virtual UTxO │
     │Tracks I/O   │ │Manages      │ │set across   │
     │Queues addl  │ │signing      │ │chained txns │
     │txns         │ │strategy     │ │             │
     └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
            │               │               │
            └───────────────┴───────┬───────┘
                                    │
                            ┌───────┴───────┐
                            │BatchSubmit    │
                            │Controller     │
                            ├───────────────┤
                            │Per-batch state│
                            │machine        │
                            │Signs & submits│
                            └───────┬───────┘
                                    │
                                    ▼
                            ┌───────────────┐
                            │Cardano Network│
                            └───────────────┘
```

### Interaction Patterns

| From | To | Mechanism | Data |
|------|----|-----------|------|
| App | StellarTxnContext | Method call | Inputs, outputs, state |
| StellarTxnContext | TxBuilder | Internal delegation | Transaction primitives |
| StellarTxnContext | TxBatcher | `currentBatch` accessor | TxDescription |
| TxBatcher | BatchSubmitController | Creates/rotates | Setup, signing strategy |
| BatchSubmitController | TxChainBuilder | `chainBuilder.with(tx)` | Built transactions |
| App (UTxO queries) | TxChainBuilder | Via network facade | Virtual UTxO set |

---

## Key Design Decisions

### Why Typed State Accumulation?

Transaction builders often require specific preconditions (e.g., "must have seed UTxO", "must have charter reference"). By encoding these in the type system:

```typescript
// Compiler enforces that seedUtxo exists
async function mintUut<TCX extends StellarTxnContext & hasSeedUtxo>(tcx: TCX) {
    const seed = tcx.state.seedUtxo;  // ✓ Type-safe access
}
```

### Why Facade Pattern?

Some workflows are pure orchestration—they queue multiple transactions but don't create transaction content themselves:

```typescript
const facadeTcx = tcx.facade();  // Marks as container-only
facadeTcx.includeAddlTxn("step1", { ... });
facadeTcx.includeAddlTxn("step2", { ... });
await facadeTcx.submitAll();  // Only submits nested txns
```

### Why Deferred mkTcx()?

Transaction builders are stored as factories (`mkTcx: () => Promise<TCX>`) rather than pre-built transactions because:

1. **UTxO availability**: Chained transactions need outputs from previous transactions
2. **Fresh state**: Network state may change between queueing and building
3. **Conditional logic**: The factory can make decisions based on current state

---

## Files

| File | Role |
|------|------|
| `src/StellarTxnContext.ts` | Core class implementation |
| `src/CapoTypes.ts` | Type aliases (hasSeedUtxo, hasCharterRef, etc.) |
| `src/StellarContract.ts` | SetupInfo, mkTcx(), base contract class |
| `src/networkClients/TxBatcher.ts` | Batch coordination |
| `src/networkClients/BatchSubmitController.ts` | Per-batch state machine |
| `src/StellarTxnContext.reqts.md` | Requirements specification |
