import {
    DefaultCharterDatumArgs,
    DefaultCapo,
    MinimalDefaultCharterDatumArgs,
} from "../../src/DefaultCapo.js";
import { Address } from "@hyperionbt/helios";
import { StellarTxnContext } from "../../src/StellarTxnContext.js";
import { CapoTestHelper, ADA } from "../../src/testing/index.js";
import { CustomTreasury } from "./CustomTreasury.js";
import { DefaultCapoTestHelper } from "../../src/testing/DefaultCapoTestHelper.js";

export class CustomCapoTestHelper extends DefaultCapoTestHelper<CustomTreasury> {
    get stellarClass() {
        return CustomTreasury;
    }
    setupActors() {
        this.addActor("tina", 1100n * ADA);
        this.addActor("tracy", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "tina";
    }

    mkDefaultCharterArgs(): MinimalDefaultCharterDatumArgs {
        const { tina, tom, tracy } = this.actors;
        return {
            ...super.mkDefaultCharterArgs(),
            govAuthorityLink: {
                strategyName: "multisig",
                reqdAddress: this.address,
                // addressesHint: [tina.address, tom.address, tracy.address],
            },
        };

        //! todo arrange the delegation to the multisig authority
        // return {
        //     trustees: [tina.address, tom.address, tracy.address],
        //     minSigs: 2,
        // };
    }

    async mkCharterSpendTx(): Promise<StellarTxnContext> {
        await this.mintCharterToken();

        const treasury = this.strella!;
        const tcx: StellarTxnContext = new StellarTxnContext();

        return treasury.txnAddAuthority(tcx);
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
