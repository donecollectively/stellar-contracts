# Helios essentials (agent quick-start)

## MUST READ: Context and Dependencies
- Purely functional, expression-oriented, readability-first language for on-chain Cardano. It is NOT JavaScript or any other language; syntax is Helios-specific (only loosely inspired by Go/Rust). Do not guess—follow the definitions here.
- See elsewhere for the off-chain APIs: `essential-helios-api.md`
- See elsewhere for builtins available on-chain: `essential-helios-builtins.md`
- See elsewhere for Cardano essentials: `essential-cardano.md`

## About the language: NOT JAVASCRIPT-like!  MUST READ DETAILS.

- Everything is immutable; no loops—use recursion. Comments are C-style (`//`, `/* */`).
- No side effects; declared `const` and imported modules are the only "global" variables ; no mutation.
- Variables are declared by assigning an expression to a name.  No `var`, no `let`, no `const` except at module top-level.
- Functions are first-class but cannot be stored in containers/struct fields.
- Untyped Data is an union of all the primitive types: `Data` enum with variants `IntData`, `ByteArrayData`, `ListData`, `MapData`, `ConstrData`.  `ConstrData{tagNumber, [...fieldList]}` corresponds to an Enum.  `Data` can be cast to any other type using `from_data`, which triggers runtime validity checking.  `Data.switch {... }` can be used for traversing untyped data for low-level access.
- User-defined types can be structs or enums.  Enums are sum types with variants (not integers!).  But variants do have underlying tag-numbers that can be customized.
- Container types List, Map, Option.  Lists are linked lists; Maps are association lists of key-value pairs; Options are Some/None.
- Structs and enums can contain functions and methods.  With `self` as arg1, they are methods (`someThing.someMethod(...)`).  Otherwise, they are like static functions: `Thing::someFunc(...)` to use them.
- No loops—use recursion or methods on the Container types (see builtin List,Map)
- No mutation—use `copy` to create a new instance with modified fields.

## Core building blocks
- Variables: arbitrary names assigned inside functions (no `let` or `const`; `foo = bar() or foo = if (...) { expr } else { expr }`); `const` at top-level can be recompiled with different `const` values.
- Script Parameters: `const` may omit a RHS if typed—value must be supplied off-chain before compile.
- Primitives: `Int` (unbounded, numeric literals incl. 0b/0o/0x, underscores), `Real` (fixed 6 dp), `Bool`, `String`, `ByteArray` (`#`hex or `b"..."`).
- Containers: `[]T` lists (linked list, access via `.get(i)`), `Map[K]V` (list of pairs, keys not guaranteed unique), `Option[T]` (Some/None), tuples (up to 5 entries, getters first..fifth).
- Control flow: `if/else` is an expression (or statement, when void return type); `switch` on enums (no pattern matching). No `for`/`while`.
- Builtins quick-start: see `essential-helios-builtins.md` for on-chain types and helpers.
- Functions: `func name(args) -> Ret { ... }` with implicit return of last expr. Anonymous `(args) -> Ret { ... }` allowed. First-class but cannot be stored in containers/struct fields. Optional args with defaults must trail. Named-call syntax supported. Multiple returns via tuples. Void is `()`. Recursion only self-reference; mutual recursion limited to methods within same struct/enum scope.
- Comments and semicolons: semicolons auto-inserted after assignments; comments don’t affect parsing.

## User types
- Structs: `struct S { field: Type \n field2: Type2 }`; instantiate `S{...}`; no semicolons between field defs.  Field access via dot. 
  - Encoding: 1-field structs encode as a bare field; others as data UplcList(...fields)
  - any tagged field (UTF-8 string tag following a field def `field3: Int "f3"`) forces CIP-68-style data map using the tag for encoding; use the full field name in all onchain code
  - struct methods: place `func foo(self [, arg1: Type]) -> returnType { ... }` inside struct block; `self` has implicit type; called with thing.foo(arg1). 
  - "static"/associated function inside the struct block `func bar() -> returnType { ... }` is called with `Type::bar()`. 
- Enums: sum types with variants
  - methods and static/associated functions allowed as with structs.  `self` typed as base (use `self.switch {...}`).
  - Variant tag numbers: by default, variants get implicit tags starting at 0 and auto-incrementing.  To assign an explicit tag, prefix the variant with `N :` (number, colon).  Subsequent variants auto-increment from the explicit tag.  Example: `42 : KeepAlive` gives KeepAlive tag 42; the next variant gets 43.
- Builtin `Data` enum variants: `IntData`, `ByteArrayData`, `ListData`, `MapData`, `ConstrData`.
- Destructuring: positional, not pattern matching. Works in assignments and switch cases; can nest, optional type annotations; destructuring into a variant performs runtime type assertion. `_` discards.

## Automatic methods (all user + builtin types except functions)
- Deep `==` / `!=`.
- `copy` with named optional args for each field (struct/enum variant), producing modified copy.
- `from_data` (associated), `is_valid_data`, `serialize` (CBOR `ByteArray`), `show` (String).

## Operators
- Standard precedence table for binary operators
- Special operator `|` is pipe: `x | f` applies `f`, and `x + 2 | * 3` treats `* 3` as partial application.
- Automatic semicolon insertion after assignments; be careful with trailing binary ops.  Recommended to use semicolons to separate statements.

## Token name ordering
- Canonical ordering for token names in multi-asset maps is shortest-first, then lexicographic; rely on this when comparing minted maps or normalizing token-name order to match node/hardware wallet expectations.

## Generics & typeclasses
- Generics on functions/structs/enums: `func f[A](a: A) -> ...`. Type inference where possible; generic type for struct/enum instantiation must be explicit. Typeclasses constrain params. Builtins: `Any` (any data or function), empty constraint (any data, no functions), `Valuable` (has `.value -> Value` e.g. TxInput/TxOutput/Value).
- No user-defined typeclasses (yet)

## Validators and scripts
- Script purposes: `spending`, `minting`, `staking`, `testing`, `mixed`, `module`. Header syntax: `<purpose> <name>\n\n ... }`; the name is global in the source. `mixed <name>` = single validator whose `main` branches at runtime on `ScriptContext.purpose` (type `ScriptPurpose`).
- Staking reward withdrawals use `ScriptPurpose::Rewarding`; the on-chain tx sets the purpose when withdrawing rewards. Common pattern: the “withdraw-zero” trick—withdraw 0 lovelace from a staking credential to prove control of the reward account without moving funds.
- Mixed validator structure (single `main`, runtime purpose switch with enum `.switch`):
- Script module example (`go` only here to help Markdown formatting.  It's actually Helios code.).

  ```go
  mixed multiPurposeValidator 
  import { purpose, tx } from ScriptContext

func main(args: MixedArgs) -> Bool {
  args.switch{
    // NOTE: datum and redeemer are raw Data though, so must be cast explicitly
    Spending{datum, redeemer} => {
        validate_spend(
            MyDatum::from_data(datum), 
            MyRedeemer::from_data(redeemer)
        )
    },
    Other{redeemer} => {
        purpose.switch {
            Spending{outputId}  => error("unreachable"),
            Minting{mph} => {
                validate_mint(
                    MyRedeemer::from_data(redeemer),
                    mph
                )
            },
            Rewarding => error("This example doesn't allow rewarding"),
            },
            Certifying{dcert} => error("This example doesn't allow certifying"+dcert.show())
        }
    }
}
  ```

## Essential syntax patterns
- `if` / `if-else` (expression, last expr returned):
  ```
  result = if (someValue == 0) { 23 }
  else if (tag == 1) { 42 }
  // invalid: Real 66.0 doesn't match Ints from the rest of the expression
  //  else if (someOtherValue == 2) { 66.0 }
  else { 0 }

  // invalid without assignment
  //  if (someValue == 0) { 23 }

  // invalid: print is a void function; can't be used as an expression result
  // impossible = if (someValue == 0) { print "hi" }
  ```

- `if/else` statement with no return type:
  ```
  if (someValue == 0) {
    print("zero")
  } else { print("other") }

  if (value == 42) { print("good question") }
  ```
  - Structs:
  ```
  struct Point { 
    x: Int // newline required; comma not allowed
    y: Int 
  } // no comma after the struct declaration
  const p = Point{ x: 1, y: 2 } // INVALID; `const` is not a variable declaration and is not valid inside a program.  
  // Use `const` only at top-level of module.

  p = Point{ x: 1, y: 2 } // comma required; newline optional
  p2 = p.copy(x: 3) // named-arguments; overrides only the named fields
```
- Enums:
  ```
  enum PizzaSize {
    Small  // no fields; no braces; newline required
    Medium // no comma allowed after the variant name
    Large {
        thickCrust: Bool // no comma after the field name
        cheeseCrust: Bool
    } // no comma after the braces
    ExtraLarge {
        thickCrust: Bool
    }
  } // no comma after the enum declaration
  ```
- Enums with explicit tag numbers (custom ConstrData indices):
  ```
  enum Redeemer {
    Cancel              // implicit tag 0
    Buy {               // implicit tag 1
        buyer: PubKeyHash
    }
    42 : KeepAlive      // explicit tag 42
    SomethingElse       // auto-increments to tag 43
  }
  ```
  Use explicit tags when on-chain encoding must match a specific ConstrData tag index (e.g. for cross-script interop or datum compatibility).  Without explicit tags, variants are numbered 0, 1, 2, ... in declaration order.

- `switch` on enums uses the `.switch { ... }` form; variants are written without the enum prefix:
  - `a: Variant => { ... }` extracts the typed variant value (must be used inside).
  - `Variant => { ... }` matches variant without extraction.
  - `Variant{fieldA, fieldB} => { ... }` destructures fields.
  - `_, VariantB, VariantC => expr` is allowed; `_` matches any non-listed variants and does not need to be last (prefer exhaustive matches).
  - Commas separate clauses; last clause omits the comma.
  - Note: destructuring is NOT pattern matching.
  - Note: destructuring is positional; the names of the fields don't matter.
  - Note: destructuring into a variant performs runtime type assertion.  Nested destructuring is ok!
  - Note: a simple expression after `=>` can omit `{}` but still needs the trailing comma unless it is the last clause.
  - Example:
  ```
  func lookupPrice(size: PizzaSize, context: Purchase) -> Real {
    price : Real = a.switch {
        Small => 8.5,
        Medium => {
            if (couponSupported && context.hasCoupon) {
                9.89
            } else { 11.42 }
        },

        // INVALID: must extract all the fields of the variant
        // Large{thickCrust} => {
        //    if (thickCrust) { 13.99 } else { 12.49 }
        //}, 

        // INVALID: must use the extracted variable:
        // lg: Large => { 12.49 }/
        // Valid: destructure fields with different names (NOT javascript-like!)
        Large{thick, cheeseyCrust} => {
            if (cheeseyCrust) { 13.99 } else { if(thick) { 12.49 } else { 12.29 } }
        },
        // can also use the same names:
        // Large{thickCrust: thick, cheeseCrust: cheese} => {...}

        // INVALID: unused `thick`
        // Large{thick, cheeseyCrust} => {
        //    if (cheeseyCrust) { 13.99 } else { 12.49 }
        // },

        // VALID: _ placeholder means "ignore" 
        // Large{_, cheeseyCrust} => {
        //    if (cheeseyCrust) { 13.99 } else { 12.49 }
        // },

        xl: ExtraLargs => {
            // INVALID: cheese isn't in the XL variant
            // if (xl.cheese) { 25.99 } else { 22.99 }

            if (xl.thickCrust) { 22.99 } else { 22.19 }
        }
    }
}
```
- Lists / Maps / Option:
  ```
  const xs = []Int{1, 2, 3}
  const first = xs.get(0)

  const m = Map[ByteArray]Int{ #00: 1, #01: 2 }
  const v = m.get(#00)

  const maybe = Option[Int]::Some(1)
  const val = maybe.switch {
    Some(n) => n,
    None    => 0
  }
  ```

## Modules and imports
- `import { Foo } from MyModule` or `import { Foo as Bar } from MyModule` or `import MyModule` then `MyModule::Type`. Relative-path imports allowed when using CLI/loader: `import { X } from "./path/to/module.hl"`. See also Off-chain APIs for more about module resolution.

## Off-chain APIs
- Stellar contracts provides module binding for top-level `const` values at compile time.
- Helios separate-compilation utilities use a different module-resolution style from on-chain modules.
- See `essential-helios-api.md` for module resolution details, parameter rebinding, and build/compile guidance; this file deliberately omits those details.

## Tenets
- Prioritize readability, auditability, and a single obvious way to do things.
