import { StellarDelegate } from "../delegation/StellarDelegate.js";
/**
 * Generic class as base for pure authorization
 * @remarks
 *
 * This isn't different from StellarDelegate, but
 * using it as a base class more specific than "any delegate"
 * gives useful semantics for Capo's govAuthority role
 * @public
 **/
export declare abstract class AuthorityPolicy extends StellarDelegate {
}
//# sourceMappingURL=AuthorityPolicy.d.ts.map