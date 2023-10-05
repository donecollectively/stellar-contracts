import { DefaultCharterDatumArgs, DefaultCapo, PartialDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { Address } from "@hyperionbt/helios";
import { StellarTxnContext } from "../StellarTxnContext.js";
import {
    ADA,
} from "./types.js";
import { CapoTestHelper } from "./CapoTestHelper.js";

export class DefaultCapoTestHelper extends CapoTestHelper<DefaultCapo> {
    get stellarClass() {
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
                addressesHint: [ this.actors.tina.address ],
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
