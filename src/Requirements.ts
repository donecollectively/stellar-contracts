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
 * @typeParam reqts - constrains `requires` entries to the list of requirements in the host ReqtsMap structure
 * @public
 **/
export type RequirementEntry<reqts extends string> = {
    purpose: string;
    details: string[];
    mech: string[];
    impl?: string; // todo: constrained to method names of the object meeting the requirements
    requires?: reqts[];
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
export type ReqtsMap<validReqts extends string> = {
    [reqtDescription in validReqts]: TODO_TYPE | RequirementEntry<validReqts>;
};


/**
 * Factory for type-safe requirements details for a unit of software
 * @remarks
 * 
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
 * @public
 **/
export function hasReqts<
    R extends ReqtsMap<validReqts>,
    const validReqts extends string = string & keyof R
>(reqtsMap: R): ReqtsMap<validReqts> {
    return reqtsMap;
}
/** @public **/
hasReqts.TODO = TODO;
