import {
    type Address,
    type MintingPolicyHash,
    makeAssets,
} from "@helios-lang/ledger";
import { makeValue } from "@helios-lang/ledger";

import { Activity, StellarContract } from "../StellarContract.js";
import type { UplcRecord, configBaseWithRev } from "../StellarContract.js";

import { StellarTxnContext, type anyState } from "../StellarTxnContext.js";
import type { Capo } from "../Capo.js";
import type { MinterBaseMethods } from "../CapoTypes.js";
import type { SeedTxnScriptParams } from "../SeedTxnScriptParams.js";
import type { valuesEntry } from "../HeliosPromotedTypes.js";
import { UutName } from "../delegation/UutName.js";

import { mkValuesEntry } from "../utils.js";

import type { BasicMintDelegate } from "./BasicMintDelegate.js";
// imports the Capo bundle before anything, so the minter bundle can use it
import CapoMinterBundle from "./CapoMinter.hlb.js";
import CapoMinterDataBridge from "./CapoMinter.bridge.js";
import type { 
    mustFindActivityType,
    mustFindConcreteContractBridgeType,
} from "../helios/dataBridge/BridgeTypes.js";
import type { hasSeed, isActivity } from "../ActivityTypes.js";

type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};

/**
 * The parameters for the Capo's basic minter
 * @public
 */
export type BasicMinterParams = configBaseWithRev &
    SeedTxnScriptParams & {
        capo: Capo<any>;
    };

/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 *
 * NOTE that this class provides the actual MINTING script, which is
 * DIFFERENT from the minting delegate.  The minting delegate is a separate
 * contract that can be updated within the scope of a Capo, with this minting
 * script remaining unchanged.
 *
 * Because this minter always defers to the minting delegate, that delegate
 * always expresses the true policy for minting application-layer tokens.
 * This minter contains only the most basic minting constraints - mostly, those
 * needed for supporting Capo lifeycle activities in which the minting delegate
 * isn't yet available, or is being replaced.
 *
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and
 * other tokens as approved by the Capo's minting delegate.
 * @public
 **/
export class CapoMinter
    extends StellarContract<BasicMinterParams>
    implements MinterBaseMethods
{
    currentRev: bigint = 1n;
    scriptBundle() {
        return CapoMinterBundle.create({
            setup: this.setup
        });
    }

    /**
     * the data bridge for this minter is fixed to one particular type
     */
    dataBridgeClass: typeof CapoMinterDataBridge = CapoMinterDataBridge;
    get onchain(): mustFindConcreteContractBridgeType<this> {
        return this.getOnchainBridge() as any;
    }

    // get offchain(): mustFindConcreteContractBridgeType<this>["reader"] {
    //     return super.offchain as any;
    // }

    // get reader(): mustFindConcreteContractBridgeType<this>["reader"] {
    //     return super.offchain as any;
    // }

    get activity(): mustFindActivityType<CapoMinter> {
        const bridge = this.onchain;
        return bridge.activity as any;
    }

    get scriptActivitiesName() {
        return "MinterActivity";
    }

    /**
     * Mints initial charter token for a Capo contract
     * @remarks
     *
     * This is the fundamental bootstrapping event for a Capo.
     * @param ownerInfo - contains the `{owner}` address of the Capo contract
     * @public
     **/
    @Activity.redeemer
    activityMintingCharter(ownerInfo: MintCharterActivityArgs): isActivity {
        return this.activityRedeemer("mintingCharter", ownerInfo);
    }

    /**
     * Mints any tokens on sole authority of the Capo contract's minting delegage
     * @remarks
     *
     * The Capo's minting delegate takes on the responsibility of validating a mint.
     * It can validate mintingUuts, burningUuts and any application-specific use-cases
     * for minting and/or burning tokens from the policy.
     * @public
     **/
    @Activity.redeemer
    activityMintWithDelegateAuthorizing(): isActivity {
        return this.activityRedeemer("mintWithDelegateAuthorizing");
    }

    /**
     * Mints a new UUT specifically for a minting invariant
     * @remarks
     *
     * When adding a minting invariant, the Capo's existing mint delegate
     * doesn't get to be involved, as it could otherwise block a critical administrative
     * change needed.  The Capo's authority token is all the minter requires
     * to create the needed UUT.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @public
     **/
    @Activity.redeemer
    activityAddingMintInvariant(seedFrom: hasSeed): isActivity {
        const seed = this.getSeed(seedFrom);

        return this.activityRedeemer("addingMintInvariant", { seed });
    }

    /** Mints a new UUT specifically for a spending invariant
     * @remarks When adding a spending invariant, the Capo's existing mint delegate
     * is not consulted, as this administrative function works on a higher
     * level than the usual minting delegate's authority.
     *
     * @public
     * **/
    @Activity.redeemer
    activityAddingSpendInvariant(seedFrom: hasSeed): isActivity {
        const seed = this.getSeed(seedFrom);
        return this.activityRedeemer("addingSpendInvariant", { seed });
    }

    /**
     * Forces replacement of the Capo's mint delegate
     * @remarks
     *
     * Forces the minting of a new UUT to replace the Capo's mint delegate.
     *
     * @public
     **/
    @Activity.redeemer
    activityForcingNewMintDelegate(seedFrom: hasSeed): isActivity {
        console.warn(
            "NOTE: REPLACING THE MINT DELEGATE USING A DIRECT MINTER ACTIVITY\n" +
                "THIS IS NOT THE RECOMMENDED PATH - prefer using the existing mint delegate's ReplacingMe activity'"
        );
        const seed = this.getSeed(seedFrom);
        return this.activityRedeemer("forcingNewMintDelegate", { seed });
    }

    /**
     * Forces replacement of the Capo's spend delegate
     * @remarks
     *
     * Creates a new UUT to replace the Capo's spend delegate.  The mint delegate
     * is bypassed in this operation.  There is always some existing spend delegate
     * when this is called, and it's normally burned in the process, when replacingUut is
     * provided.  If replacingUut is not provided, the existing spend delegate is left in place,
     * although it won't be useful because the new spend delegate will have been installed.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @param replacingUut - the name of an exiting delegate being replaced
     * @public
     **/
    @Activity.redeemer
    activityForcingNewSpendDelegate(
        seedFrom: hasSeed,
        replacingUut?: number[]
    ): isActivity {
        const seed = this.getSeed(seedFrom);
        return this.activityRedeemer("forcingNewSpendDelegate", {
            seed,
            replacingUut,
        });
    }

    //! overrides base getter type with undefined not being allowed
    get mintingPolicyHash(): MintingPolicyHash {
        return super.mintingPolicyHash!;
    }

    get charterTokenAsValuesEntry(): valuesEntry {
        return mkValuesEntry("charter", BigInt(1));
    }

    tvCharter() {
        const { mintingPolicyHash } = this;

        const v = makeValue(
            0,
            makeAssets([[mintingPolicyHash, [this.charterTokenAsValuesEntry]]])
        );
        return v;
    }

    get charterTokenAsValue() {
        console.warn(
            "deprecated use of `get minter.charterTokenAsValue`; use tvCharter() instead"
        );
        return this.tvCharter();
    }

    @Activity.partialTxn
    async txnMintingCharter<TCX extends StellarTxnContext<anyState>>(
        this: CapoMinter,
        tcx: TCX,
        {
            owner,
            capoGov,
            mintDelegate,
            spendDelegate,
        }: // settingsUut,
        {
            owner: Address;
            capoGov: UutName;
            mintDelegate: UutName;
            spendDelegate: UutName;
            // settingsUut: UutName;
        }
    ): Promise<TCX> {
        //!!! todo: can we expect capoGov & mintDgt in tcx.state.uuts? and update the type constraint here?
        //   ^^^ possibly based on role names instead of UUT names.
        const charterVE = this.charterTokenAsValuesEntry;
        const capoGovVE = mkValuesEntry(capoGov.name, BigInt(1));
        const mintDgtVE = mkValuesEntry(mintDelegate.name, BigInt(1));
        const spendDgtVE = mkValuesEntry(spendDelegate.name, BigInt(1));
        // const settingsUutVE = mkValuesEntry(settingsUut.name, BigInt(1));

        // these are listed in the order they're expected to be found in the txn
        // even though the txn builder would take care of reordering them.
        //  a) shortest-first,
        //  b) then same-length items are sorted according to byte values.
        const values = [
            charterVE,
            // settingsUutVE,
            capoGovVE,
            mintDgtVE,
            spendDgtVE,
        ];
        
        const activity = this.activity.mintingCharter(owner);
        return tcx.addScriptProgram(
            this.compiledScript
        ).mintTokens(
            this.mintingPolicyHash!,
            values,
            activity
        ) as TCX;
    }

    attachScript<TCX extends StellarTxnContext<anyState>>(
        tcx: TCX,
        useRefScript = true
    ) {
        return this.configIn!.capo.txnAttachScriptOrRefScript(
            tcx,
            this.compiledScript,
            useRefScript
        ) as Promise<TCX>;
    }

    @Activity.partialTxn
    async txnMintingWithoutDelegate<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
        minterActivity: isActivity
    ): Promise<TCX> {
        return (await this.attachScript(tcx)).mintTokens(
            this.mintingPolicyHash!,
            vEntries,
            minterActivity
        ) as TCX;
    }

    @Activity.partialTxn
    async txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(
        tcx: TCX,
        vEntries: valuesEntry[],
        mintDelegate: BasicMintDelegate,
        mintDgtRedeemer: isActivity,
        skipReturningDelegate?: "skipDelegateReturn"
    ): Promise<TCX> {
        const { capo } = this.configIn!;
        const md = mintDelegate || (await capo.getMintDelegate());
        const tcx1 = await capo.tcxWithCharterRef(tcx);
        const tcx2 = await md.txnGrantAuthority(
            tcx1,
            mintDgtRedeemer,
            skipReturningDelegate
        );
        return (await this.attachScript(tcx)).mintTokens(
            this.mintingPolicyHash!,
            vEntries,
            this.activityMintWithDelegateAuthorizing()
        ) as TCX;
    }
}
