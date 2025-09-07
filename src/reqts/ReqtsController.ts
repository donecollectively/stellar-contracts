import type {
    Capo,
} from "../Capo.js";
import type {
    FoundDatumUtxo,
    hasUutContext
} from "../CapoTypes.js";
import type { hasSettingsRef } from "../CapoTypes.js";
import {
    Activity,
    partialTxn,
} from "../StellarContract.js";

import type { StellarTxnContext, hasSeedUtxo } from "../StellarTxnContext.js";
import { dumpAny } from "../diagnostics.js";
import { hasReqts } from "../Requirements.js";
import { DelegatedDataContract } from "../delegation/DelegatedDataContract.js";

// import ReqtsPolicyScript from "./ReqtsPolicy.hl";
// import { type ReqtData } from "./ReqtsAdapter.js";
import  ReqtsConcreteBundle from "./Reqts.concrete.hlb.js";
import {ReqtsBundle} from "./ReqtsBundle.js";
import {
    DelegateDatumHelper,
    ReqtsPolicyDataBridge
} from "./Reqts.concrete.bridge.js";
import type {
    ReqtDataLike, ErgoReqtData,
    ReqtData,
    minimalReqtData
} from "./Reqts.concrete.typeInfo.d.ts";
import type { hasSeed } from "../ActivityTypes.js";
import { textToBytes } from "../HeliosPromotedTypes.js";
import { makeTxOutput, makeValue } from "@helios-lang/ledger";
import type { minimalData } from "../delegation/DelegatedData.js";

export class ReqtsController extends DelegatedDataContract<
    ReqtData, 
    ReqtDataLike
> {
    dataBridgeClass = ReqtsPolicyDataBridge;
    // dgDatumHelper: DelegateDatumHelper  = new DelegateDatumHelper()

    get delegateName() {
        return "ReqtsPolicy";
    }


    get idPrefix() {
        return "reqt";
    }
    
    get recordTypeName() {
        return "reqt";
    }

    exampleData() : minimalReqtData {
        return {
            // id: textToBytes("reqt-1234"),
            // type: "reqt",
            category: "SCALE",
            name: "Supports multiple users",
            purpose: "testing & type example data",
            description: "Some descriptive requirement information to clarify the short name field",
            image: "ipfs://...",
            target: textToBytes("something-1234"),
            details: [ "more info", "more more info" ],
            mech: ["how it's designed", "how it's implemented"],
            impl: "some method or class name providing the described functionality",
            mustFreshenBy: 42n,
            requires: [ /* no deps */ ],
        }  //as minimalData<ReqtDataLike>;
    }


    // this method is only needed if the app needs a class for
    // implementing app-specific "business logic" on the data,
    // e.g. for presentation in a UI
    // mkDatumAdapter(): DelegatedDatumAdapter<any> {
    //     return new ReqtsAdapter(this);
    // }

    scriptBundle() {    
        return ReqtsConcreteBundle.create()
    }
    
    @Activity.redeemer
    activityCreatingReqt(seedFrom: hasSeed) {
        const seed= this.getSeed(seedFrom);

        return this.mkSeededMintingActivity("CreatingRecord", {seed});
    }

    @Activity.redeemer
    activityUpdatingReqt(id) {
        return this.mkSpendingActivity("UpdatingRecord", {id});
    }

    @Activity.redeemer
    activityCreatingRequirement(seedFrom: hasSeed) {
        const seed = this.getSeed(seedFrom);

        return this.mkSeededMintingActivity("CreatingRecord", {seed});
    }

    async txnCreatingReqt<
        TCX extends StellarTxnContext &
            hasSeedUtxo &
            hasSettingsRef &
            hasUutContext<"reqt">
    >(tcx: TCX, reqt: ReqtDataLike, initialStake: bigint): Promise<TCX> {
        const tcx2 = await this.txnGrantAuthority(
            tcx,
            this.activityCreatingRequirement(tcx)
        );

        console.log(
            "🏒 starting reqt for TODO add `target` id and implement a parent object... "
        );
        console.log("    -- initial stake: ", initialStake);

        const initialStakeValue = makeValue(initialStake);

        const reqtOutput = makeTxOutput(
            this.capo.address,
            this.uh.mkMinTv(this.capo.mph, tcx2.state.uuts.reqt)
                .add(initialStakeValue),
            await this.mkDgDatum({
                ...reqt,
                id: tcx.state.uuts.reqt.toString(),
            }as any /* !!!!!!! */ )
        );
        console.log("reqt: ", dumpAny(reqtOutput));
        const tcx4 = tcx2.addOutput(reqtOutput);
        return tcx4 as typeof tcx4 & TCX;
    }

    // @partialTxn
    // async txnReturnMemberTokenPlus<TCX extends StellarTxnContext>(
    //     tcx: TCX,
    //     v: helios.Value
    // ): Promise<TCX> {
    //     console.log("real txnReturnMemberTokenPlus");

    //     const walletOutput = new TxOutput(
    //         this.actorContext.wallet.address,
    //         v.add(this.mkMinTv(this.capo.mph, tcx.state.memberToken))
    //     );
    //     walletOutput.correctLovelace(this.networkParams);
    //     return tcx.addOutput(walletOutput);
    // }

    @partialTxn
    async txnUpdateReqt(
        tcx: hasSettingsRef & hasSeedUtxo,
        reqtDetails: FoundDatumUtxo<ErgoReqtData>,
        newDepositIncrement: bigint, // can be positive or negative
        newDatum?: any
    ) {
        if (newDatum) {
            throw new Error(
                `todo: support for iterating the reqt details here`
            );
        }
        const settingsUtxo = tcx.state.settingsInfo.utxo

        const id = reqtDetails.data!.id;

        // adds the reqt- token to the transaction:
        const tcx2 = await this.txnGrantAuthority(
            tcx,
            this.activityUpdatingReqt(id)
        );

        const previousDeposit = reqtDetails.utxo.value.lovelace;
        console.log("    ---- deposit increment: ", newDepositIncrement);
        const newDepositTotal = previousDeposit + newDepositIncrement;
        let newUtxoValue =
            // todo: change to $DEMU
            reqtDetails.utxo.value.add(makeValue(newDepositIncrement));

        let updates: Partial<ReqtDataLike> = {};

        console.log("🏒 updating reqt vault... ");
        // const freshExpiry = await this.getExpiry(tcx2);

        // if (freshExpiry) {
        //     updates.mustFreshenBy = freshExpiry;
        //     console.log("    -- refreshing expiry: ", freshExpiry);
        // } else {
        //     console.log("    -- no change in expiry");
        // }

        // new Reqt output:
        const tcx3 = tcx2.addOutput(
            makeTxOutput(
                this.capo.address,
                newUtxoValue,
                this.mkDgDatum({
                    ...reqtDetails.datum,
                    ...updates,
                } as any /* !!!!!!! */ )
            )
        );

        return tcx3;
    }

    requirements() {
        return hasReqts({
            "stores requirements connected to any target object": {                
                purpose: "to create clear expectations, applicable in a variety of contexts",
                details: [
                    "each requirement is a unique object, with a unique identifier",
                    "a set of requirements comprises all the core expectations of a target object",
                    "the target object must be a valid object in the system",
                    "the set of requirements created for any object is captured by cryptographic proof",
                    "the lifecycle of a requirement is shared between its internal state and the object referencing it",
                    "a requirement can be suggested, iterated and adopted, and is intended to be immutable once adopted",
                    "further iteration after a requirement achieving 'adopted' status should be captured in a new requirement",
                    "a requirement can be retired, with its history preserved",
                    "different target objects can subscribe to a requirement, indicating a mutual expectation"
                ],
                mech: [
                    "each requirement is a unique object, with a unique identifier",
                ],
                requires: [
                    // "a person can create a requirement on a target object having a reqts relationship",
                    // "the target object is consulted during requirement creation",
                    // "the target object can verify the reqt relationship using code provided by the reqts module",
                    // "the target object can provide additional validation related to the requirement",
                    "the target object can gradually adopt further requirements as needed",                    
                ],
            },
            "the target object can gradually adopt further requirements as needed": {
                purpose: "honoring the lifecycle of the target object",
                details: [
                    "every target object supporting requirements gets a data structure for organizing its requirements workflow",
                    "the requirements workflow centers on transactional iteration and consensual adoption",
                    "the target's reqts structure contains all the details needed for the lifecycle to work"
                ],
                mech: [
                    "the target object has a reqts structure",
                    "the reqts structure contains a current-reqts list, and a hash of that list",
                    "the reqts structure contains a next-reqts list, and a hash of that list",
                    "each next-reqts list can have a 'replaces' entry and/or a 'new' entry",
                    "a 'replaces' entry with no 'new' entry indicates a requirement that is being retired",
                    "a 'new' entry with no 'replaces' entry indicates a new requirement",
                    "a 'replaces' entry with a 'new' entry indicates a requirement that is being replaced",
                    "adopting the next-reqts list updates the current-reqts list",
                    "adopting the next-reqts list requires that all the new requirements are finalized",                    
                ],
                requires: []
            }
        });
    }
}
