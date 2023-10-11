import { DefaultCharterDatumArgs, DefaultCapo, PartialDefaultCharterDatumArgs } from "../../lib/DefaultCapo.js";
import { Address } from "@hyperionbt/helios";
import { StellarTxnContext } from "../../lib/StellarTxnContext.js";
import { CapoTestHelper, ADA } from "../../lib/testing";
import { CustomTreasury } from "./CustomTreasury.js";

export class CustomCapoTestHelper extends CapoTestHelper<CustomTreasury> {
    get stellarClass() {
        return CustomTreasury;
    }
    setupActors() {
        this.addActor("tina", 1100n * ADA);
        this.addActor("tracy", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        this.currentActor = "tina";
    }

    mkDefaultCharterArgs(): PartialDefaultCharterDatumArgs {
        const {tina, tom, tracy} = this.actors;
        return {
            govAuthorityLink: {
                strategyName: "multisig",
                reqdAddress: this.address,
                // addressesHint: [tina.address, tom.address, tracy.address],
            }
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
