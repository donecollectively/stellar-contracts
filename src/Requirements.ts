import type { IFISNEVER, TypeError } from "./helios/typeUtils";

const notInherited = {
    inheriting: "‹empty/base class›" as const,
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
export type RequirementEntry<
    reqtName extends string,
    reqts extends string,
    inheritedNames extends { inheriting: string } | nothingInherited
> = {
    purpose: string;
    details: string[];
    mech: string[];
    impl?: string; // todo: constrained to method names of the object meeting the requirements

    // excludes the requirement from being referenced as its own dependendcy
    // excludes inherited reqt names from being referenced as dependencies (use requiresInherited instead)
    // allows inherited names to reference other inherited names
    requires?: inheritedNames extends nothingInherited
        ? Exclude<reqts, reqtName>[]
        : reqtName extends keyof inheritedNames["inheriting"]
        ? Exclude<inheritedNames["inheriting"], reqtName>[]
        : (Exclude<reqts, reqtName | inheritedNames["inheriting"]>)[];

    requiresInherited?: inheritedNames["inheriting"][];
};

const TODO = Symbol("needs to be implemented");
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
export type ReqtsMap<
    validReqts extends string,
    inheritedNames extends {inheriting: string} | nothingInherited = nothingInherited
> = {
    [reqtDescription in validReqts]:
        | TODO_TYPE
        | RequirementEntry<reqtDescription, validReqts, inheritedNames>;
};

/**
 * Factory for type-safe requirements details for a unit of software
 * @remarks
 * return `hasReqts({... requirements})` from a requirements() or other method in a class, to express
 * requirements using a standardized form that supports arbitrary amounts of detailed requirements
 * with references to unit-test labels that can verify the impl details.
*
* You don't need to provide the type params or TS type annotations.  `requirements() { return hasReqts({...yourReqts}) }` will work fine.
 * @public
 */
export function hasReqts<
    R extends ReqtsMap<validReqts, inheritedNames>,
    const validReqts extends string = string & keyof R,
    const inheritedNames extends {inheriting: string} | nothingInherited = nothingInherited
>(reqtsMap: R): ReqtsMap<validReqts, inheritedNames> {
    return reqtsMap;
}
/** @public */
hasReqts.TODO = TODO;

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
export function mergesInheritedReqts<
    IR extends ReqtsMap<inheritedReqts["inheriting"], any>,
    R extends ReqtsMap<string & myReqts, inheritedReqts>,
    const inheritedReqts extends {inheriting: string} = {inheriting: string & keyof IR},
    const myReqts extends string | TypeError<any> = keyof R extends keyof IR
        ? TypeError<"myReqts can't override inherited reqts">
        : string & keyof R
    // const parentReqts extends string = keyof { [parentReqt in inheritedReqts as `Parent: ${parentReqt}`] : any}
>(
    inherits: IR,
    reqtsMap: R
): ReqtsMap<(string & myReqts) | inheritedReqts["inheriting"], inheritedReqts> & IR {
    // >(
    //     inherits: IR,
    //     reqtsMap: R
    // ): IR & R {
    // (string & myReqts) | inheritedReqts,
    // inheritedReqts
    // never /*parentReqts */
    // > {
    return { ...inherits, ...reqtsMap } as ReqtsMap<
        (string & myReqts) | inheritedReqts["inheriting"],
        inheritedReqts
    > &
        IR;
}

function typeTester() {
    const stub = {
        details: [] as string[],
        mech: [] as string[],
    };
    const pReqts = hasReqts({
        req1: {
            purpose: "test base reqts",
            ...stub,
        },
        req2: {
            purpose: "test internal reqt deps",
            ...stub,
            requires: ["req1"],
        },
    });

    const mergedReqts = mergesInheritedReqts(pReqts, {
        mreq1: {
            purpose: "outer reqt",
            ...stub,
        },
        mreq2: {
            purpose: "outer dep to outer",
            ...stub,
            requires: ["mreq1"],
        },
        mreq3: {
            purpose: "outer dep to inherited req (bad)",
            ...stub,
            //@ts-expect-error - can't reference inherited reqt here; use requiresInherited instead
            requires: ["req1"],
            //@ts-expect-error - can't reference local reqt as an inherited req.
            requiresInherited: ["mreq2"]
        },
        mreq4: {
            purpose: "outer dep to inherited req (good)",
            ...stub,
            requiresInherited: ["req1"],
            // requires: ["req1"],
        },
    });

    const assignable: typeof pReqts = mergedReqts;

    const mergedAgain = mergesInheritedReqts(mergedReqts, {
        L2req5: {
            purpose: "outer dep to inherited req (good)",
            ...stub,
            requiresInherited: ["req1", "mreq4"],
            // requires: ["req1"],
        },
    });

    return mergedReqts;
}
