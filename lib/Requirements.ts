
type RequirementEntry<reqts extends string> = {
    purpose: string
    details: string[]
    mech: string[]
    impl? : string;  // todo: constrained to method names of the object meeting the requirements
    requires?: reqts[]
}

const TODO = Symbol("needs to be implemented")
export type TODO_TYPE = typeof TODO
export type ReqtsMap<reqts extends string> = {
    [reqtDescription in reqts ]: TODO_TYPE | RequirementEntry<reqts>
}

export function hasReqts<
    R extends ReqtsMap<reqts>,
    const reqts extends string = string & keyof R
>(
    reqtsMap: R 
) : ReqtsMap<reqts> {
    return reqtsMap
}

hasReqts.TODO = TODO
