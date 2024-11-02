
// crazy type transformations to extract the union of all the variant constructors.

type _inspectableUnionFuncs<U> = U extends any ? (k: U) => void : never;
// this reversed "extends" test is a mystery.  Somehow MAGIC intersects all the **function types**
//   ... even though it seems to be just inferring a single function-arg.  Is there something special about
//   ... the parentheses?
type _intersectInspectFuncs<U> = _inspectableUnionFuncs<U> extends ((k: infer MAGIC) => void) ? MAGIC : never;
// Q: this one seems a little magical too.  Why the curly braces ?
type _extractLastInspectableElement<F> = F extends { (a: infer UnionElement): void } ? UnionElement : never;

export type ExtractRestOfUnion<Union> = Exclude<Union, ExtractLastOfUnion<Union>>;
export type ExtractLastOfUnion<Union> = _extractLastInspectableElement<
    _intersectInspectFuncs<_inspectableUnionFuncs<Union>>
>;

type TEST_UNION = "a" | "b" | "c";
type TEST_INSPECT = _inspectableUnionFuncs<TEST_UNION>
type TEST_INTERSECTED_FUNCS = _intersectInspectFuncs<TEST_INSPECT>
type TEST_EXTRACTED_LAST = _extractLastInspectableElement<TEST_INTERSECTED_FUNCS>
const testLast : TEST_EXTRACTED_LAST = "c";

type TEST /* "c" */ = ExtractLastOfUnion<TEST_UNION>;
const testC : TEST = "c"
type TEST_remainder = ExtractRestOfUnion<TEST_UNION>;
const testRemainder : TEST_remainder[][] = [ 
    [],
    ["a"],
    ["b"],
    ["a", "b"],
]

type TEST2 /* "b" */= ExtractLastOfUnion<TEST_remainder>;
const testB : TEST2 = "b"
type TEST2_remainder = ExtractRestOfUnion<TEST_remainder>;
const testRemainder2 : TEST2_remainder[][] = [
    [],
    ["a"],
]
type TEST3 /* "a" */ = ExtractLastOfUnion<TEST2_remainder>;
const testA : TEST3 = "a"

// uses ExtractOne and ExtractRest to recursively extract all the elements of a union 
// to a tuple type with each union element:
export type EachUnionElement<Union> = ReverseTuple<ReversedAllOfUnion<Union>>;
type ReversedAllOfUnion<Union> = [Union] extends [never] ? [] : [ExtractLastOfUnion<Union>, ...ReversedAllOfUnion<ExtractRestOfUnion<Union>>]
type TEST_ALL /* ["a", "b", "c"] */ = EachUnionElement<TEST_UNION>;
const testAll : TEST_ALL = ["a", "b", "c"];

// reverses the order of a tuple type
export type ReverseTuple<T extends any[]> = T extends [infer A, ...infer B] ? [...ReverseTuple<B>, A] : []
type TEST_REVERSE /* ["c", "b", "a"] */ = ReverseTuple<TEST_ALL>;
const testReverse : TEST_REVERSE = ["c", "b", "a"];

type unionObjectsTester = {
    a: number
} | {b: string} | {c: boolean};
// constructs a { a? : number, b? : string, c? : boolean } type
// ... by using the ExtractLastOfUnion and ExtractRestOfUnion types to find
// each element of the union, then interseting them
type intersectedElements<T extends any[]> = T extends [infer A, ...infer B] ? A & intersectedElements<B> : {}
type intersectedElementTypes = intersectedElements<EachUnionElement<unionObjectsTester>>;
type merged = { [key in keyof intersectedElementTypes]: intersectedElementTypes[key] }

export type IntersectedEnum<
    T,
    intersected = intersectedElements<EachUnionElement<T>>,
    merged={ [key in keyof intersected]: Option<intersected[key]> }
> = merged;
