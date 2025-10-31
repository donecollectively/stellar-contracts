import type { TypeError } from "./helios/typeUtils";
declare const notInherited: {
    inheriting: "‹empty/base class›";
};
type nothingInherited = typeof notInherited;
/**
 * Documents one specific requirement
 * @remarks
 *
 * Describes the purpose, details, and implementation mechanism for a single requirement for a unit of software.
 *
 * Also references any other requirements in the host ReqtsMap structure, whose behavior this requirement
 * depends on.  The details of those other dependencies, are delegated entirely to the other requirement, facilitating
 * narrowly-focused capture of for key expectations within each individual semantic expectation of a software unit's
 * behavior.
 *
 * if there are inherited requirements, dependencies on them can be expressed in the `requiresInherited` field.
 *
 * @typeParam reqts - constrains `requires` entries to the list of requirements in the host ReqtsMap structure
 * @public
 **/
export type RequirementEntry<reqtName extends string, reqts extends string, inheritedNames extends {
    inheriting: string;
} | nothingInherited> = {
    purpose: string;
    details: string[];
    mech: string[];
    impl?: string;
    requires?: inheritedNames extends nothingInherited ? Exclude<reqts, reqtName>[] : reqtName extends keyof inheritedNames["inheriting"] ? Exclude<inheritedNames["inheriting"], reqtName>[] : (Exclude<reqts, reqtName | inheritedNames["inheriting"]>)[];
    requiresInherited?: inheritedNames["inheriting"][];
};
declare const TODO: unique symbol;
/**
 * tags requirement that aren't yet implemented
 * @public
 **/
export type TODO_TYPE = typeof TODO;
/**
 * Describes the requirements for a unit of software
 * @remarks
 *
 * A requirements map is a list of described requirements, in which each requirement
 * has a synopsis, a description of its purpose, descriptive detail, and technical requirements
 * for the mechanism used for implementation.  The mech strings should be usable as unit-test titles.
 *
 * use the hasReqts() helper method to declare a type-safe set of requirements following this data structure.
 *
 * Each requirement also has space for nested 'requires', without the need for deeply nested data structures;
 * these reference other requirements in the same hasReqts() data structure. As a result, high-level and detail-
 * level requirements and 'impl' details can have progressive levels of detail.
 *
 * @typeParam reqts - the list of known requirement names.  Implicitly detected by the hasReqts() helper.
 * @public
 **/
export type ReqtsMap<validReqts extends string, inheritedNames extends {
    inheriting: string;
} | nothingInherited = nothingInherited> = {
    [reqtDescription in validReqts]: TODO_TYPE | RequirementEntry<reqtDescription, validReqts, inheritedNames>;
};
/**
 * Factory for type-safe requirements details for a unit of software
 * @public
 * @remarks
 * return `hasReqts({... requirements})` from a requirements() or other method in a class, to express
 * requirements using a standardized form that supports arbitrary amounts of detailed requirements
 * with references to unit-test labels that can verify the impl details.
 *
 * You don't need to provide the type params or TS type annotations.  `requirements() { return hasReqts({...yourReqts}) }` will work fine.
 *
 * See the {@link ReqtsMap} and {@link RequirementEntry} types for more details about expressing requirements.
 *
 * NOTE: Type parameters are inferred from the provided data structure
 * @param reqtsMap - the ReqtsMap structure for the software unit
 */
export declare function hasReqts<R extends ReqtsMap<validReqts, inheritedNames>, const validReqts extends string = string & keyof R, const inheritedNames extends {
    inheriting: string;
} | nothingInherited = nothingInherited>(reqtsMap: R): ReqtsMap<validReqts, inheritedNames>;
export declare namespace hasReqts {
    var TODO: unique symbol;
}
/**
 * Factory for type-safe requirements combining inherited requirements with subclass-specific requirements
 * @remarks
 *
 * Use this method to combine the requirements of a subclass with the requirements of its superclass.  This
 * allows the subclass, in its requires: [ ... ] section, to reference capabilities of the base class that the subclass depends on.
 *
 * See the {@link ReqtsMap} and {@link RequirementEntry} types for more details about expressing requirements.
 *
 * @param inherits - the requirements of the base class
 * @param reqtsMap - the requirements of the subclass
 * @public
 **/
export declare function mergesInheritedReqts<IR extends ReqtsMap<inheritedReqts["inheriting"]>, R extends ReqtsMap<string & myReqts, inheritedReqts>, const inheritedReqts extends {
    inheriting: string;
} = {
    inheriting: string & keyof IR;
}, const myReqts extends string | TypeError<any> = keyof R extends keyof IR ? TypeError<"myReqts can't override inherited reqts"> : string & keyof R>(inherits: IR, reqtsMap: R): ReqtsMap<(string & myReqts) | inheritedReqts["inheriting"], inheritedReqts> & IR;
export {};
//# sourceMappingURL=Requirements.d.ts.map