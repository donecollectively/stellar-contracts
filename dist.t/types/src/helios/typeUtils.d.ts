type _inspectableUnionFuncs<U> = U extends any ? (k: U) => void : never;
type _intersectInspectFuncs<U> = _inspectableUnionFuncs<U> extends (k: infer MAGIC) => void ? MAGIC : never;
type _extractLastInspectableElement<F> = F extends {
    (a: infer UnionElement): void;
} ? UnionElement : never;
export type ExtractRestOfUnion<Union> = Exclude<Union, ExtractLastOfUnion<Union>>;
export type ExtractLastOfUnion<Union> = _extractLastInspectableElement<_intersectInspectFuncs<_inspectableUnionFuncs<Union>>>;
export type EachUnionElement<Union> = ReverseTuple<ReversedAllOfUnion<Union>>;
type ReversedAllOfUnion<Union> = [Union] extends [never] ? [] : [
    ExtractLastOfUnion<Union>,
    ...ReversedAllOfUnion<ExtractRestOfUnion<Union>>
];
export type ReverseTuple<T extends any[]> = T extends [infer A, ...infer B] ? [...ReverseTuple<B>, A] : [];
type intersectedElements<T extends any[]> = T extends [infer A, ...infer B] ? A & intersectedElements<B> : {};
export declare const _oneOf_: unique symbol;
export type _oneOf_ = typeof _oneOf_;
export type note = "Note: only one the following keys can be present";
/**
 * @public
 */
export type IntersectedEnum<T, intersected = intersectedElements<EachUnionElement<T>>, merged = {
    [key in keyof intersected]: key extends keyof intersected ? intersected[key] : never;
}> = IFISNEVER<ExtractRestOfUnion<keyof intersected>, merged, Partial<merged>>;
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
export type NEVERIF<T extends boolean | never, ELSE, ifError = unknown> = IF<T, never, ELSE, ifError>;
/**
 * @public
 */
export type OR<T1, T2> = [T1] extends [never] ? T2 : T1;
/**
 * @public
 */
export type IF<T1 extends boolean | never, T2, ELSE = never, ERR_TYPE = unknown> = [
    true | false
] extends [T1] ? ERR_TYPE : true extends T1 ? T2 : ELSE;
declare const TYPE_ERROR: unique symbol;
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
export declare function typeError<T extends string, moreInfo extends Object = {}>(msg: T, moreInfo?: moreInfo): TypeError<T, moreInfo>;
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
export type AbstractNew<T = any> = abstract new (...args: any) => T;
export {};
//# sourceMappingURL=typeUtils.d.ts.map