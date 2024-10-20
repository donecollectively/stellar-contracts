import type { capoDelegateConfig } from "../delegation/RolesAndDelegates.js";
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
export abstract class AuthorityPolicy extends StellarDelegate {
    // this class is distinct from other delegates
}
