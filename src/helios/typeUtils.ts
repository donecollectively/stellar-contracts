// crazy type transformations to extract the union of all the variant constructors.

type _inspectableUnionFuncs<U> = U extends any ? (k: U) => void : never;
// this reversed "extends" test is a mystery.  Somehow MAGIC intersects all the **function types**
//   ... even though it seems to be just inferring a single function-arg.  Is there something special about
//   ... the parentheses?
type _intersectInspectFuncs<U> = _inspectableUnionFuncs<U> extends (
    k: infer MAGIC
) => void
    ? MAGIC
    : never;
// Q: this one seems a little magical too.  Why the curly braces ?
type _extractLastInspectableElement<F> = F extends {
    (a: infer UnionElement): void;
}
    ? UnionElement
    : never;

export type ExtractRestOfUnion<Union> = Exclude<
    Union,
    ExtractLastOfUnion<Union>
>;
export type ExtractLastOfUnion<Union> = _extractLastInspectableElement<
    _intersectInspectFuncs<_inspectableUnionFuncs<Union>>
>;

type TEST_UNION = "a" | "b" | "c";
type TEST_INSPECT = _inspectableUnionFuncs<TEST_UNION>;
type TEST_INTERSECTED_FUNCS = _intersectInspectFuncs<TEST_INSPECT>;
type TEST_EXTRACTED_LAST =
    _extractLastInspectableElement<TEST_INTERSECTED_FUNCS>;
const testLast: TEST_EXTRACTED_LAST = "c";

type TEST /* "c" */ = ExtractLastOfUnion<TEST_UNION>;
const testC: TEST = "c";
type TEST_remainder = ExtractRestOfUnion<TEST_UNION>;
const testRemainder: TEST_remainder[][] = [[], ["a"], ["b"], ["a", "b"]];

type TEST2 /* "b" */ = ExtractLastOfUnion<TEST_remainder>;
const testB: TEST2 = "b";
type TEST2_remainder = ExtractRestOfUnion<TEST_remainder>;
const testRemainder2: TEST2_remainder[][] = [[], ["a"]];
type TEST3 /* "a" */ = ExtractLastOfUnion<TEST2_remainder>;
const testA: TEST3 = "a";

// uses ExtractOne and ExtractRest to recursively extract all the elements of a union
// to a tuple type with each union element:
export type EachUnionElement<Union> = ReverseTuple<ReversedAllOfUnion<Union>>;
type ReversedAllOfUnion<Union> = [Union] extends [never]
    ? []
    : [
          ExtractLastOfUnion<Union>,
          ...ReversedAllOfUnion<ExtractRestOfUnion<Union>>
      ];
type TEST_ALL /* ["a", "b", "c"] */ = EachUnionElement<TEST_UNION>;
const testAll: TEST_ALL = ["a", "b", "c"];

// reverses the order of a tuple type
export type ReverseTuple<T extends any[]> = T extends [infer A, ...infer B]
    ? [...ReverseTuple<B>, A]
    : [];
type TEST_REVERSE /* ["c", "b", "a"] */ = ReverseTuple<TEST_ALL>;
const testReverse: TEST_REVERSE = ["c", "b", "a"];

type unionObjectsTester =
    | {
          a: number;
      }
    | { b: string }
    | { c: boolean };
// constructs a { a? : number, b? : string, c? : boolean } type
// ... by using the ExtractLastOfUnion and ExtractRestOfUnion types to find
// each element of the union, then interseting them
type intersectedElements<T extends any[]> = T extends [infer A, ...infer B]
    ? A & intersectedElements<B>
    : {};
type intersectedElementTypes = intersectedElements<
    EachUnionElement<unionObjectsTester>
>;
type merged = {
    [key in keyof intersectedElementTypes]: intersectedElementTypes[key];
};

export const _oneOf_ = Symbol("[oneOf]");
export type _oneOf_ = typeof _oneOf_;
export type note = "Note: only one the following keys can be present";


/**
 * @public
 */
export type IntersectedEnum<
    T,
    intersected = intersectedElements<EachUnionElement<T>>,
    merged = {
        [
            // key in _oneOf_  |
            key in keyof intersected
        ]: 
            // key extends _oneOf_ ? note :
            key extends keyof intersected
            ? intersected[key]
            : never;
    }
> = IFISNEVER<ExtractRestOfUnion<keyof intersected>, merged, Partial<merged>>;


/**
 * @public
 */
export type ISNEVER<T, ELSE = never> = [T] extends [never] ? true : ELSE;

/**
 * @public
 */
export type IFISNEVER<T, IFNEVER, ELSE = never> = [T] extends [never] ? IFNEVER : ELSE;

/**
 * @public
 */
export type IF_ISANY<T, IFANY, ELSE = never> = [0] extends [1 & T] ? IFANY : ELSE;

/**
 * @public
 */
export type ISSOME<T, ELSE = never> = [T] extends [never] ? ELSE : true;

/**
 * @public
 */
export type NEVERIF<T extends boolean | never, ELSE, ifError = unknown> = IF<
    T,
    never,
    ELSE,
    ifError
>;

/**
 * @public
 */
export  type OR<T1, T2> = [T1] extends [never] ? T2 : T1;

const ISNEVER_TEST: IF<ISNEVER<never>, true> = true;
const ALSO_IF_TEST: IF<ISNEVER<never>, true> = true;
const IF_ISANY_TEST: IF_ISANY<never, true, false> = false;
const IF_ISANY_TEST2: IF_ISANY<any, true, false> = true;
const IF_ISANY_TEST3: IF_ISANY<unknown, true, false> = false;
const IF_ISANY_TEST4: IF_ISANY<"hi", true, false> = false;

// const neverExtendsTrueYuck : never extends true ? true : false = true;
// const trueDOESNTExtendNever : true extends never ? true : false = false;
// const iF_TEST4 : IF<42, true, false> = true; // not yet with numeric
const NEVER_ALWAYS_EXTENDS_ANYTHING: never extends any ? true : false = true;
// const t2 : unknown extends any ? true : false = true;
// const t3 : any extends unknown ? true : false = true;
// const t4 : unknown extends never ? true : false = false
// const t5 : never extends unknown ? true : false = true
// const t6: never extends true ? true : false = true;



const b1: true extends boolean ? true : false = true;
const b2: false extends boolean ? true : false = true;
const b3: boolean extends true ? true : false = false;
const b4: boolean extends false ? true : false = false;
const b5: [true] extends [true] ? true : false = true;
const b6: [true] extends [false] ? true : false = false;
const b7: [false] extends [true] ? true : false = false;
const b8: [false] extends [false] ? true : false = true;

const IfNeedsConstBool =
    'the IF<...> type only detects constant-typed boolean inputs (such as "true}" as const';
type needsConstBool = TypeError<typeof IfNeedsConstBool>;
const lacksConstBool: needsConstBool = typeError(IfNeedsConstBool);

/**
 * @public
 */
export type IF<T1 extends boolean | never, T2, ELSE = never, ERR_TYPE = unknown> = [
    true | false
] extends [T1]
    ? ERR_TYPE
    : true extends T1
    ? T2
    : ELSE;

class FooTestIf {
    static something = true as const;
    somethingElse = true as const;

    static justBoolStatic = true;
    justBool = true;
}

const IF_TEST1: IF<ISNEVER<true>, true, false, needsConstBool> = false;
const IF_TEST2: IF<never, true, false, needsConstBool> = false;
const IF_TEST3a: IF<
    (typeof FooTestIf)["something"],
    true,
    false,
    needsConstBool
> = true;
const IF_TEST3b: IF<FooTestIf["somethingElse"], true, false, needsConstBool> =
    true;
//@ts-expect-error false is not assignable to true
const IF_TEST4aNeg: IF<
    (typeof FooTestIf)["something"],
    true,
    false,
    needsConstBool
> = false;
//@ts-expect-error false is not assignable to true
const IF_TEST4bNeg: IF<
    FooTestIf["somethingElse"],
    true,
    false,
    needsConstBool
> = false;
const IF_TEST4c: IF<FooTestIf["justBool"], true, false, needsConstBool> =
    lacksConstBool;
const IF_TEST4cStatic: IF<
    (typeof FooTestIf)["justBoolStatic"],
    true,
    false,
    needsConstBool
> = lacksConstBool;


const TYPE_ERROR = Symbol("TYPE_ERROR");
type TYPE_ERROR = typeof TYPE_ERROR;

/**
 * @public
 */
export type TypeError<T extends string, moreInfo extends Object = {}> = {
    [TYPE_ERROR]: T;
    moreInfo: moreInfo;
};

/**
 * @public
 */
export function typeError<T extends string, moreInfo extends Object = {}>(
    msg: T,
    moreInfo?: moreInfo
): TypeError<T, moreInfo> {
    return {
        [TYPE_ERROR]: msg,
        moreInfo: (moreInfo || {}) as moreInfo,
    };
}


type AnyAnyOfcourse = any extends any ? "yes" : "no";
// this type looks useless.  Its result is interesting, though.
//  ... it's matchiness for "yes" | "no" means ANYTHING could happen
type AnyThingUselessEither = any extends "something" ? "yes" : "no";
type ThingAnyYes = "something" extends any ? "yes" : "no";
type AnyUnkYes = any extends unknown ? "yes" : "no";
type UnkAnyYes = unknown extends any ? "yes" : "no";

type UnkStrNo = unknown extends string ? "yes" : "no";
type UnkUnkYes = unknown extends unknown ? "yes" : "no";

type StrUnkYes = string extends unknown ? "yes" : "no";
type StrAnyYes = string extends any ? "yes" : "no";
type UnkConstStringNo = unknown extends "MyCONST STRING" ? "yes" : "no";
type UnkFooNo = unknown extends { foo: string } ? "yes" : "no";
type ConstStringUnkYES = "MyCONST STRING" extends unknown ? "yes" : "no";
type FooUnkYES = { foo: string } extends unknown ? "yes" : "no";
/**
 * type debugging - typeinfo
 * @public
 */
export type Expand<T> = T extends (...args: infer A) => infer R ? (...args: Expand<A>) => Expand<R> : T extends infer O ? {
    [K in keyof O]: O[K];
} : never;

/**
 * @public
 */
export type AbstractNew<T = any> = abstract new (...args: any) => T; // T extends DataMaker ?

