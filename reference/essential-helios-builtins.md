
# Helios builtins quickstart

## MUST READ: Context

WARNING: Helios on-chain builtins are often closely aligned to the OFFCHAIN Typescript SDK, but THEY ARE DIFFERENT.

These built-in types are available for on-chain use.  You should be familiar with ./essential-helios.lang.md and ./essential-cardano.md to use these built-ins.

## Automatic  methods (all types)'

`serialize()`, `show()`, `from_data()`, `is_valid_data()`, `copy(...)` are provided by the language—see `essential-helios-lang.md` for details. Per-type sections below omit these.

## Address — https://helios-lang.io/docs/lang/builtins/address
- Cardano address consisting of a payment `Credential` plus optional `StakingCredential`.
- Construct/parse: `Address::new(credential, staking_credential: Option[StakingCredential])`, `from_validator(vh)` (no staking), `new_empty()`, `from_bytes`, `from_hex`, `from_data`.
- Inspect: `.credential -> Credential`, `.staking_credential -> Option[StakingCredential]`, `.is_staked() -> Bool`.
 - Encode: `.to_bytes() -> ByteArray` (CIP-19 raw), `.to_hex()/show() -> String`.
- Compare: `==` / `!=`.

## Any — https://helios-lang.io/docs/lang/builtins/any
- Typeclass constraint that accepts any data or function type; use when generics must permit functions (e.g., `list.fold`, `map.fold`).
- Default unconstrained typeclass (empty constraint) only permits data; switch to `Any` when higher-order values are required.
- Pair with generics notes in `essential-helios-lang.md`; Cardano context lives in `essential-cardano.md`.

## AssetClass — https://helios-lang.io/docs/lang/builtins/assetclass
- Identifies a specific asset: `MintingPolicyHash` + token name `ByteArray`; ADA is `AssetClass::ADA` (both empty).
- Build: `AssetClass::new(mph, token_name)`; decode with `from_data`.
- Access: `.mph -> MintingPolicyHash`, `.token_name -> ByteArray`.
 - Compare: `==` / `!=`; use inside `Value` maps when working with multi-asset balances; `.show()` yields `<mph_hex>.<tokenname_hex>`.

## Bool — https://helios-lang.io/docs/lang/builtins/bool
- Boolean literal `true`/`false`; standard operators `&&`, `||`, `!`, `==`, `!=`.
- Short-circuit helpers: `Bool::and` / `Bool::or` take thunks for conditional evaluation; `||`/`&&` use them under the hood.
- Other helpers: `to_int()` (false→0, true→1), `trace(msg)` for debugging.
- Common patterns: guard spending conditions; combine with `all`/`any` folds over lists/maps.

## ByteArray — https://helios-lang.io/docs/lang/builtins/bytearray
- Sequence of bytes, literal as `#...` hex.
- Build/parse: `ByteArray::parse(hex_string)`; ordering ops `> >= < <=` plus `==`/`!=`; concatenate with `+`.
- Inspect: `.length -> Int`.
- Transforms: `.slice(start, end)`, `.starts_with(prefix)`, `.ends_with(suffix)`, `.prepend(byte:int mod 256)`.
- Hashing: `.blake2b()`, `.sha2()`, `.sha3()` (32-byte digests).
- UTF-8: `.decode_utf8()` (errors on invalid), `.decode_utf8_safe()` (falls back to hex string).

## Cip67 — https://helios-lang.io/docs/lang/builtins/cip67
- Namespace of CIP-67 token-name label prefixes (import via `import Cip67`).
- Constants: `Cip67::fungible_token_label -> ByteArray` (333 / `#0014df10`), `Cip67::reference_token_label -> ByteArray` (100 / `#000643b0`), `Cip67::user_token_label -> ByteArray` (222 / `#000de140`).

## Credential — https://helios-lang.io/docs/lang/builtins/credential
- Non-staking half of an address; enum variants: `PubKey` (wraps `PubKeyHash`) or `Validator` (wraps `ValidatorHash`).
- Build: `Credential::new_pubkey(pkh) -> Credential::PubKey`, `Credential::new_validator(vh) -> Credential::Validator`.
- Access: `.hash` yields the underlying `PubKeyHash` or `ValidatorHash`.
- Compare: `==` / `!=`.

## Data — https://helios-lang.io/docs/lang/builtins/data
- Untyped on-chain data (inline datum, etc.); use `switch` on `Data` or cast with type’s `from_data`.
- Getter: `.tag -> Int` for `ConstrData` (errors otherwise).
- Compare: `==` / `!=`.

## DatumHash — https://helios-lang.io/docs/lang/builtins/datumhash
- Opaque `ByteArray` representing a datum hash.
- Build/parse: `DatumHash::new(bytes: ByteArray)`.
- Access: `.bytes -> ByteArray`.
- Compare/order: `==`, `!=`, `>`, `<`, `>=`, `<=`.

## DCert — https://helios-lang.io/docs/lang/builtins/dcert
- Enum of staking/pool certificates: `Register`, `Deregister`, `Delegate`, `RegisterPool`, `RetirePool`.
- Build: `new_register(credential)`, `new_deregister(credential)`, `new_delegate(delegator, pool_id)`, `new_register_pool(pool_id, pool_vrf)`, `new_retire_pool(pool_id, epoch)`.
- Variant fields: `Register|Deregister.credential -> StakingCredential`; `Delegate.delegator -> StakingCredential`, `Delegate.pool_id -> PubKeyHash`; `RegisterPool.pool_id/pool_vrf -> PubKeyHash`; `RetirePool.pool_id -> PubKeyHash`, `RetirePool.epoch -> Int`.
- Compare: `==` / `!=`.

## Duration — https://helios-lang.io/docs/lang/builtins/duration
- Time difference type; only `Duration + Time` is allowed (not Time + Time).
- Build/constants: `Duration::new(milliseconds: Int)`; predefined `SECOND`, `MINUTE`, `HOUR`, `DAY`, `WEEK`.
- Arithmetic/order: `+`, `-`, `%` with `Duration`; `*` with `Int`; division `Duration/Duration -> Int`, `Duration/Int -> Duration`; comparisons `==`, `!=`, `>`, `<`, `>=`, `<=`.

## Int — https://helios-lang.io/docs/lang/builtins/int
- Unbounded integer; literals support decimal/hex/etc per Helios basics.
- Parse/encode: `parse(string)` (no leading zeroes except `0`), `from_base58`, `to_base58` (non-negative), `from_big_endian` / `to_big_endian` (non-negative), `from_little_endian` / `to_little_endian` (non-negative), `to_hex`, `from_data`.
- Helpers: `sqrt` (truncates, rejects negative), `max(a,b)`, `min(a,b)`, zigzag `encode_zigzag`/`decode_zigzag` (decode expects non-negative input), `to_real`, `to_bool` (0→false else true), `bound(low, high)`, `bound_min(low)`, `bound_max(high)`, `abs`.
- Arithmetic/comparison: `+ - * / %` and `== != > < >= <=`.

## List — https://helios-lang.io/docs/lang/builtins/list
- Linked list `[]T`; constructors: `[]T::new(n, fn(i)->T)` and `new_const(n, item)`.
- Get/shape: `.length`, `.head` / `.tail` (error if empty), `is_empty()`, `get(i)` (O(n), bounds error), `get_singleton()` (asserts size 1), `split_at(index)`.  Note that `tail` is the second + rest of the list, not the last element.
- Bulk ops: concatenation with `+`; `prepend(item)`, `set(index,item)`, `drop(n)`, `drop_end(n)`, `take(n)`, `take_end(n)`, `flatten()` for nested lists.
- Queries: `all(pred)`, `any(pred)`, `filter(pred)`, `find(pred)` (error if none), `find_safe(pred)->Option`, `map`, `map_option`, `for_each`.
- Folds: `fold(reducer, init)`, `fold_lazy(reducer,item->next, final)`, `fold2(reducer, init1, init2)`, `fold2_lazy(reducer,item->next, init1, init2)`.
- Extras: `join` (only for `[]String`/`[]ByteArray`, optional separator), `sort(cmp)`, `sum()` (only `[]Int`/`[]Real`), `show()`; `from_data` available as associated function.

## Map — https://helios-lang.io/docs/lang/builtins/map
- Ordered list of key/value pairs (keys not enforced unique; order matters for `==`).
- Build: literal syntax; `Map[K]V::from_data(data)`.
- Get/shape: `.length`, `.head` / `.head_key` / `.head_value`, `.tail` (error if empty), `is_empty()`.  `tail` is the second + rest of the map, not the last element.
- Lookup: `get(key)` (error if missing), `get_safe(key)->Option`.
- Filters/search: `filter(pred)`, `find(pred)->(K,V)`, `find_safe(pred)->(()->(K,V), Bool)` (only call when Bool true), `find_key(_)/find_key_safe(_)`, `find_value(_)/find_value_safe(_)`.
- Queries: `all(pred)`, `any(pred)`, `for_each(fn)`.
- Transform: `map[NewK,NewV](mapper)->Map[NewK]NewV`, `fold`, `fold_lazy`.
- Mutation-like (returns new maps): `prepend(key, value)`, concatenation with `+`, `delete(key)` (no error if missing), `set(key, value)` (appends if missing), `update(key, fn)` (error if missing), `update_safe(key, fn)` (skips if missing), `sort(compare)`.

## MintingPolicyHash — https://helios-lang.io/docs/lang/builtins/mintingpolicyhash
- Opaque `ByteArray` hash of a minting policy script.
- Build/cast: `MintingPolicyHash::new(bytes)`, `from_script_hash(script_hash)`, `from_data(data)`.
- Access: `.bytes -> ByteArray`.
- Compare/order: `==`, `!=`, `>`, `<`, `>=`, `<=`.

## Option — https://helios-lang.io/docs/lang/builtins/option
- Enum for optional values: variants `Some{value}` and `None`; type `Option[T]`.
- Build/cast: literal `Option[T]::Some{t}` / `Option[T]::None`; `Option[T]::from_data(data)`.
- Inspect: `.some` getter on `Some` variant; `unwrap()` returns value or errors if `None`.
- Map: `map(fn: T->U) -> Option[U]` (passes through `None`).
- Compare: `==`, `!=`.

## OutputDatum — https://helios-lang.io/docs/lang/builtins/outputdatum
- Enum for datum on a `TxOutput`: `None`, `Hash`, `Inline`.
- Build: `new_none()`, `new_hash(datum_hash: DatumHash)`, `new_inline(any: AnyType)`; `from_data(data)`.
- Access: `get_inline_data()` (errors if not Inline), `OutputDatum::Inline.data -> Data`, `OutputDatum::Hash.hash -> DatumHash`.
- Compare: `==`, `!=`.

## PubKey — https://helios-lang.io/docs/lang/builtins/pubkey
- Opaque 32-byte Ed25519 public key (`ByteArray`); `PubKeyHash` is blake2b-224 of a `PubKey` but not computable on-chain.  Can check that the transaction is SIGNED by a PubKeyHash with Tx methods.
- Build/cast: `PubKey::new(bytes)`, `from_data(data)`.
- Verify: `.verify(message: ByteArray, signature: ByteArray) -> Bool` (signature expected 64 bytes).
- Display: `.show()` (hex).
- Compare: `==`, `!=`.

## PubKeyHash — https://helios-lang.io/docs/lang/builtins/pubkeyhash
- Opaque `ByteArray` hash of a `PubKey`; first part of a payment address.  Can check that the transaction is SIGNED by a PubKeyHash with Tx methods.
- Build/cast: `PubKeyHash::new(bytes)`, `from_data(data)`.
- Access: `.bytes -> ByteArray`.
- Compare/order: `==`, `!=`, `>`, `<`, `>=`, `<=`.

## Ratio — https://helios-lang.io/docs/lang/builtins/ratio
- Fractional number as `top/bottom` integers (arbitrary precision on-chain).
- Build/cast: `Ratio::new(top: Int, bottom: Int)`, `from_data(data)`.
- Inspect: `.top -> Int`, `.bottom -> Int`.
- Equality: exact `==`/`!=` require same numerator and denominator; `equals(other)` compares cross-multiplied values (same numeric value even if different denominators).
- Arithmetic: `+ - * /` with `Ratio` or `Int`.
- Ordering: `< <= > >=` against `Ratio` or `Int`.
- Rounding/convert: `.ceil()`, `.floor()`, `.round()`, `.trunc()` -> `Int`; `.to_real() -> Real` (denominator 1_000_000 truncation).

## Real — https://helios-lang.io/docs/lang/builtins/real
- Fixed-point number with 6 decimal places (e.g., `0.001` = 0.1%).
- Build/cast: real literals; `Real::from_data(data)`.
- Math: `+ - * /` and comparisons `== != < <= > >=` (mixed with `Int` allowed both sides).
- Helpers: `Real::sqrt(a)` (errors on negative); `.abs()`.
- Rounding: `.ceil()`, `.floor()`, `.round()`, `.trunc()` -> `Int`.

## ScriptContext — https://helios-lang.io/docs/lang/builtins/scriptcontext
- Namespace for the transaction under validation; commonly `import { tx } from ScriptContext`.
- Spending-only: `get_current_input() -> TxInput`, `get_spending_purpose_output_id() -> TxOutputId`, `get_cont_outputs() -> []TxOutput`, `get_current_validator_hash() -> ValidatorHash` (errors if not spending).
- Minting-only: `get_current_minting_policy_hash() -> MintingPolicyHash` (errors otherwise).
- Staking-only: `get_staking_purpose() -> StakingPurpose` (Rewarding | Certifying).
- Generic: `purpose -> ScriptPurpose` (current validation purpose), `tx -> Tx`.

## ScriptHash — https://helios-lang.io/docs/lang/builtins/scripthash
- Opaque `ByteArray` for any script hash (validator, minting policy, or staking validator); returned by `TxOutput.ref_script_hash`.
- Build/cast: `ScriptHash::from_data(data)`.
- Access: `.bytes -> ByteArray`.
- Compare: `==`, `!=`.

## ScriptPurpose — https://helios-lang.io/docs/lang/builtins/scriptpurpose
- Enum for current redemption: variants `Minting`, `Spending`, `Rewarding`, `Certifying`.
- Build: `new_minting(mph)`, `new_spending(output_id)`, `new_rewarding(staking_credential)`, `new_certifying(dcert)`; `from_data`.
- Variant getters: `Minting.policy_hash -> MintingPolicyHash`; `Spending.output_id -> TxOutputId`; `Rewarding.credential -> StakingCredential`; `Certifying.dcert -> DCert`.
- Compare: `==`, `!=`.

## StakingCredential — https://helios-lang.io/docs/lang/builtins/stakingcredential
- Staking part of an `Address`; variants: `Hash` (wraps `StakingHash`), `Ptr` (slot, tx index, cert index).
- Build: `new_hash(staking_hash)`, `new_ptr(a, b, c)`; `from_data`.
- Access: `StakingCredential::Hash.hash -> StakingHash`.
- Compare: `==`, `!=`.

## StakingHash — https://helios-lang.io/docs/lang/builtins/stakinghash
- Enum staking identifier: `StakeKey` (wraps `PubKeyHash`) or `Validator` (wraps `StakingValidatorHash`).
- Build: `new_stakekey(pkh)`, `new_validator(svh)`; `from_data`.
- Access: `.hash -> PubKeyHash` or `StakingValidatorHash` depending on variant.
- Compare: `==`, `!=`.

## StakingPurpose — https://helios-lang.io/docs/lang/builtins/stakingpurpose
- Enum used inside staking scripts: `Rewarding` or `Certifying`.
- Build/cast: `StakingPurpose::from_data(data)`.
- Access: `Rewarding.credential -> StakingCredential`; `Certifying.dcert -> DCert`.
- Compare: `==`, `!=`.

## StakingValidatorHash — https://helios-lang.io/docs/lang/builtins/stakingvalidatorhash
- Opaque `ByteArray` hash of a staking script.
- Build/cast: `StakingValidatorHash::new(bytes)`, `from_data(data)`, `from_script_hash(script_hash)`.
- Access: `.bytes -> ByteArray`.
- Compare/order: `==`, `!=`, `>`, `<`, `>=`, `<=`.

## String — https://helios-lang.io/docs/lang/builtins/string
- UTF-8 text.
- Build/cast: string literals; `String::from_data(data)`.
- Validation: `String::is_valid_utf8(bytes: ByteArray) -> Bool` checks a `ByteArray`.
- Operators: `==`, `!=`, concatenation with `+`.
- Methods: `.encode_utf8() -> ByteArray`, `.starts_with(prefix) -> Bool`, `.ends_with(suffix) -> Bool`.

## Time — https://helios-lang.io/docs/lang/builtins/time
- POSIX time in milliseconds since 1970-01-01 UTC.
- Build/cast: `Time::new(millis: Int)`, `from_data(data)`.
- Arithmetic: `Time + Duration -> Time`, `Time - Duration -> Time`, `Time - Time -> Duration`.
- Ordering: `==`, `!=`, `>`, `<`, `>=`, `<=`.
- Display: `.show() -> String` (decimal millis).

## TimeRange — https://helios-lang.io/docs/lang/builtins/timerange
- Range of `Time` (can be open-ended).
- Constants/constructors: `ALWAYS`, `NEVER`, `TimeRange::from(start)`, `::to(end)`, `::new(start, end)`, `from_data(data)`.
- Getters: `.start -> Time`, `.end -> Time` (error if infinite).
- Queries: `.contains(time) -> Bool`, `.is_before(time) -> Bool` (end before time unless infinite), `.is_after(time) -> Bool` (start after time unless -inf).
- Compare: `==`, `!=`.

## Tx — https://helios-lang.io/docs/lang/builtins/tx
- Balanced transaction available in validators via `ScriptContext.tx`.
- Build/cast: `Tx::new(inputs, ref_inputs, outputs, fee: Value, minted: Value, dcerts: []DCert, withdrawals: Map[StakingCredential]Int, time_range: TimeRange, signatories: []PubKeyHash, redeemers: Map[ScriptPurpose]AnyType, datums: Map[DatumHash]AnyType, id: TxId)`, `from_data`.  `new()` is never used in practice; get the ***current*** tx from the ScriptContext.
- Getters: `.inputs`, `.ref_inputs`, `.outputs`, `.fee`, `.minted`, `.dcerts`, `.withdrawals`, `.  time_range`, `.signatories`, `.redeemers` (map `ScriptPurpose -> Data`), `.datums` (map `DatumHash -> Data`), `.id`.
- Methods: `.is_signed_by(pkh)`, `.find_datum_hash(data)`, `.get_datum_data(output)`, output filters (`outputs_sent_to(pkh)`, `outputs_sent_to_datum(pkh, datum, is_inline)`, `outputs_locked_by(vhash)`, `outputs_locked_by_datum(vhash, datum, is_inline)`), value helpers (`value_sent_to(pkh)`, `value_sent_to_datum(pkh, datum, is_inline)`, `value_locked_by(vhash)`, `value_locked_by_datum(vhash, datum, is_inline)`, `value_paid_to[InlineDatumDataType](address, datum)`).
- Compare: `==`, `!=`.

## TxId — https://helios-lang.io/docs/lang/builtins/txid
- Opaque transaction hash (`ByteArray` wrapper).
- Build/cast: `TxId::new(bytes)`, `from_data`.
- Getter: `.bytes`.
- Compare/order: `==`, `!=`, `>=`, `>`, `<=`, `<`.
- Display: `.show()` hex.

## TxInput — https://helios-lang.io/docs/lang/builtins/txinput
- Transaction input (UTxO being spent).
- Build/cast: `TxInput::new(output_id: TxOutputId, output: TxOutput)`, `from_data`. `new()` is never used in practice; get inputs from the current tx, or get_current_input() from the ScriptContext, for the input being validated during policy execution.
- Getters: `.output_id`, `.output`, shortcuts `.address`, `.datum`, `.value`.
- Compare: `==`, `!=`.

## TxOutput — https://helios-lang.io/docs/lang/builtins/txoutput
- Transaction output.
- Build/cast: `TxOutput::new(address: Address, value: Value, datum: OutputDatum)`, `from_data`.  `new()` is never used in practice; get outputs from the current tx, or `get_cont_outputs()` from the ScriptContext, .
- Getters: `.address`, `.value`, `.datum`, `.ref_script_hash -> Option[ScriptHash]`.
- Compare: `==`, `!=`.

## TxOutputId — https://helios-lang.io/docs/lang/builtins/txoutputid
- Unique UTxO id = `(TxId, index)`.
- Build/cast: `TxOutputId::new(tx_id: TxId, index: Int)`, `from_data`.
- Getters: `.tx_id`, `.index`.
- Compare/order: `==`, `!=`, `>=`, `>`, `<=`, `<` (lexicographic by tx bytes then index).

## ValidatorHash — https://helios-lang.io/docs/lang/builtins/validatorhash
- Opaque validator script hash (`ByteArray`); first part of script address.
- Build/cast: `ValidatorHash::new(bytes)`, `from_data`, `from_script_hash(hash: ScriptHash)`.
- Getter: `.bytes`.
- Compare/order: `==`, `!=`, `>=`, `>`, `<=`, `<`. Display: `.show()` hex.

## Valuable (type class) — https://helios-lang.io/docs/lang/builtins/valuable
- Matches types exposing `.value -> Value` plus automatic data methods.
- Implemented by `TxInput`, `TxOutput`, `Value`; enables `Value::sum` over those lists.

## Value — https://helios-lang.io/docs/lang/builtins/value
- Token bundle `Map[MintingPolicyHash]Map[ByteArray]Int`; ADA note: 1 ADA = 1,000,000 lovelace.
- Constants/ctors: `Value::ZERO`, `Value::lovelace(amount)`, `Value::new(asset_class, amount)`, `from_data`, `from_map(raw_map)`, `Value::sum[V: Valuable]([]V)`.
- Getters: `.value` (self for Valuable), `.to_map()`, `.get(asset_class)`, `.get_safe(asset_class)`, `.get_policy(mph)`, `.get_assets()`, `.get_lovelace()`, `.contains_policy(mph)`, `.is_zero()`.
- Comparisons: `==`, `!=`, `>=`, `>`, `<=`, `<` (per-asset comparisons).
- Arithmetic: `+`, `-`, `* Int`, `/ Int`.
- Helpers: `.contains(other_value)` (alias `>=`), `.show(ada?: Bool)` pretty string (optional Ada-format lovelace).
