import { DefaultCharterDatumArgs, DefaultCapo, PartialDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { Address } from "@hyperionbt/helios";
import { StellarTxnContext } from "../StellarTxnContext.js";
import {
    ADA,
} from "./types.js";
import { CapoTestHelper } from "./CapoTestHelper.js";
import { stellarSubclass } from "../StellarContract.js";

/**
 * Test helper for classes extending DefaultCapo
 * @remarks
 * 
 * Arranges an test environment with predefined actor-names having various amounts of ADA in their (emulated) wallets,
 * and default helpers for setting up test scenarios.  Provides a simplified framework for testing Stellar contracts extending 
 * the DefaultCapo class.
 * 
 * To use it, you MUST extend DefaultCapoTestHelper<YourStellarCapoClass>.
 * 
 * You MUST also implement a getter  for stellarClass, returning the specific class for YourStellarCapoClass
 * 
 * @typeParam DC - the specific DefaultCapo subclass under test
 * @public
 **/
export class DefaultCapoTestHelper<DC extends DefaultCapo=DefaultCapo> extends CapoTestHelper<DC> {
    //@ts-expect-error
    get stellarClass() : stellarSubclass<DC>{
        //@ts-expect-error
        return DefaultCapo;
    }

    setupActors() {
        this.addActor("tina", 1100n * ADA);
        this.addActor("tracy", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "tina";
    }

    async mkCharterSpendTx(): Promise<StellarTxnContext> {
        await this.mintCharterToken();

        const treasury = this.strella!;
        const tcx: StellarTxnContext = new StellarTxnContext();

        return treasury.txnAddAuthority(tcx);
    }

    mkDefaultCharterArgs(): PartialDefaultCharterDatumArgs {
        return {
            govAuthorityLink: {
                addressesHint: [ this.currentActor.address ],
                strategyName: "address",
            }
        };
    }

    async updateCharter(
        args: DefaultCharterDatumArgs
    ): Promise<StellarTxnContext> {
        await this.mintCharterToken();
        const treasury = this.strella!;

        const { signers } = this.state;

        const tcx = await treasury.mkTxnUpdateCharter(args);
        return treasury.submit(tcx, { signers }).then(() => {
            this.network.tick(1n);
            return tcx;
        });
    }
}
