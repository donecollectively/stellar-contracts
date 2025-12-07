# Cardano essentials

## UTxO Blockchain

### UTxO basics
- Ledger is a set of unspent transaction outputs (UTxOs). Each output = `address + value + datum + optional ref script`.
- Inputs consume entire outputs; change is created as new outputs. There is no partial spend.
- Addresses = payment credential + optional staking credential; payment controls spend, staking controls delegation/rewards.
- Addresses can be wallet addresses controlled by a key, or they can be script addresses whose spending is controlled by a validator script.  The hash of the compiled validator script is the script address.

### Spending UTxOs in a a contract
- A spending validator runs when its output is consumed. It sees the whole transaction through `ScriptContext`.
- The input being validated is identified by `ScriptPurpose::Spending`; Helios exposes it via `get_current_input()` in spending policies.
- Spend authority comes from either the payment key signature or the validator logic at the address.

### UTxO Datum in a contract
- Datum carries state for script outputs. Two storage forms:
  - Inline datum: datum stored directly in the output.
  - Datum hash: output holds a `DatumHash`; the actual datum data is provided in the tx witness set.
- In Helios onchain, use `OutputDatum` (`Inline` vs `Hash`) and read datums through the current tx (`tx.datums`, `get_datum_data`, `outputs_sent_to_datum`, etc.).  Offchain APIs have accessors for it too.

### Cardano Native Assets and the Value type
- Cardano supports multi-asset natively; ADA and other tokens live in the same `Value` bundle.
- Each asset is identified by `AssetClass = (MintingPolicyHash, token name ByteArray)`. ADA is the special empty policy hash with empty token name.
- Quantities are integers; 1 ADA = 1,000,000 lovelace. Multi-asset arithmetic is per-asset inside `Value`.
- In Helios onchain, use `Value`, `AssetClass`, `MintingPolicyHash`, `ByteArray` helpers (`Value::lovelace`, `Value::new`, `get_policy`, `contains_policy`, `Value::sum`, `get_lovelace`).  Offchain API's give access to the same essential details, with normal Typescript types & techniques.

## Staking basics
- Staking credential = staking half of an address; decides who can delegate/withdraw rewards.
- Two forms:
  - `StakingCredential::Hash` → staking key hash or staking validator hash (see `StakingHash`).
  - `StakingCredential::Ptr` → on-ledger pointer to a staking registration (slot, tx index, cert index).
- Payment credential + optional staking credential = full address; omit staking for pure payment addresses.
- Rewards go to the staking credential owner; delegation certificates reference it; spending still governed by payment credential.
- Encodings: raw bytes per CIP-19 for addresses; staking credentials appear in witness sets/certs, not datum.
- A policy script can be used to control a staking credential.  The hash of the compiled policy script is the staking address.  The address MUST be registered as a staking credential before it can be used for staking.  Staking credentials are registered by submitting a staking registration certificate to the network.  Withdrawing from a staking credential is done with a specific script purpose.

## Where to use in Helios
- In scripts, inspect `tx.outputs[i].address.staking_credential` to enforce delegation rules or require reward rights.
- Build addresses with `Address::new(credential, Option[StakingCredential])`; construct staking side via `StakingCredential::new_hash` or `new_ptr`.
- For hashing forms, use `StakingHash::Validator` when a staking script controls rewards; `StakingHash::PubKey` for key-controlled staking.

## Cross-links
- Helios API essentials: see `essential-helios-api.md` when you need to be an expert on the off-chain Helios API.
- Helios language basics: see `essential-helios-lang.md` when you need any amount of knowledge about the on-chain Helios language.  NEVER make assumptions that you understand the language until you have read the language specification in its entirety.
- Helios builtins (address/staking types and APIs): see `essential-helios-builtins.md`.

