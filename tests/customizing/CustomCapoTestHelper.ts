import { Address } from "@hyperionbt/helios";
import { StellarTxnContext } from "../../src/StellarTxnContext.js";
import { CapoTestHelper, ADA } from "../../src/testing/index.js";
import { CustomTreasury } from "./CustomTreasury.js";
import { DefaultCapoTestHelper } from "../../src/testing/DefaultCapoTestHelper.js";
import { CharterDatumProps, MinimalCharterDatumArgs } from "../../src/Capo.js";

export class CustomCapoTestHelper extends DefaultCapoTestHelper<CustomTreasury> {
    get stellarClass() {
        return CustomTreasury;
    }
    async setupActors() {
        this.addActor("tina", 1100n * ADA);
        this.addActor("tracy", 13n * ADA);
        this.addActor("tom", 120n * ADA);
        return this.setActor("tina");
    }

    mkDefaultCharterArgs(): MinimalCharterDatumArgs {
        const { tina, tom, tracy } = this.actors;
        return {
            ...super.mkDefaultCharterArgs(),
            govAuthorityLink: {
                strategyName: "multisig",
                config: {
                    addrHint: [tina.address, tom.address, tracy.address],
                }
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
        const tcx: StellarTxnContext = new StellarTxnContext(this.currentActor);
        return treasury.txnAddGovAuthority(tcx)
        // return treasury.txnAddCharterWithAuthority(tcx);
    }

    async updateCharter(
        args: CharterDatumProps
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
