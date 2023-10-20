import { DefaultCharterDatumArgs, DefaultCapo, PartialDefaultCharterDatumArgs } from "../DefaultCapo.js";
import { Address } from "@hyperionbt/helios";
import { StellarTxnContext } from "../StellarTxnContext.js";
import {
    ADA, canHaveRandomSeed, stellarTestHelperSubclass,
} from "./types.js";
import { CapoTestHelper } from "./CapoTestHelper.js";
import { stellarSubclass } from "../StellarContract.js";
import { Capo, CapoBaseConfig, hasBootstrappedConfig } from "../Capo.js";
import { DefaultMinter } from "../DefaultMinter.js";
import { expect } from "vitest";
import { StellarTestHelper } from "./StellarTestHelper.js";


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
 * You SHOULD also implement a setupActors method to arrange named actors for your test scenarios.
 * It's recommended to identify general roles of different people who will interact with the contract, and create
 * one or more actor names for each role, where the actor names start with the same letter as the role-names.
 * For example, a set of Trustees in a contract might have actor names tina, tracy and tom, while 
 * unprivileged Public users might have actor names like pablo and peter.  setupActors() also
 * should pre-assign some ADA funds to each actor: e.g. `this.addActor(‹actorName›, 142n * ADA)`
 * 
 * @typeParam DC - the specific DefaultCapo subclass under test
 * @public
 **/
export class DefaultCapoTestHelper<
    //@ts-expect-error spurious fail on mkFullConfig type; it tries to strongly match the generic abstract type
    //    from (abstract) Capo, instead of paying attention to the clearly-matching concrete version in DefaultCapo
    DC extends DefaultCapo<DefaultMinter, CDT, CT>=DefaultCapo,
    CDT extends DefaultCharterDatumArgs =
        DC extends Capo<DefaultMinter, infer iCDT> ? iCDT : DefaultCharterDatumArgs,
    CT extends CapoBaseConfig  = 
        DC extends Capo<any, any, infer iCT> ? iCT : never
//@ts-expect-error because of a mismatch between the Capo's abstract mkTxnMintCharterToken's defined constraints
//    ... vs the only concrete impl in DefaultCapo, with types that are actually nicely matchy.
> extends CapoTestHelper<DC, CDT, CT> {

    static forCapoClass<
        DC extends DefaultCapo<DefaultMinter, any, any>
    >(s : stellarSubclass<DC>) : stellarTestHelperSubclass<DC> {
        class specificCapoHelper extends DefaultCapoTestHelper<DC> {
            get stellarClass() {
                return s
            }
        }
        return specificCapoHelper;
    }

    //@ts-expect-error
    get stellarClass() : stellarSubclass<DC>{
        //@ts-expect-error
        return DefaultCapo;
    }

    //!!! todo: create type-safe ActorMap helper hasActors(), on same pattern as hasRequirements
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

    async mintCharterToken(args?: CDT): Promise<hasBootstrappedConfig<CT>> {
        const { delay } = this;
        const { tina, tom, tracy } = this.actors;
        
        if (this.state.mintedCharterToken) {
            console.warn(
                "reusing minted charter from existing testing-context"
            );
            return this.state.mintedCharterToken;
        }

        if (!this.strella) await this.initialize();
        const script = this.strella!;
        const goodArgs = (
            args || this.mkDefaultCharterArgs()
        ) as PartialDefaultCharterDatumArgs<CDT>;
        // debugger

        const tcx = await script.mkTxnMintCharterToken(
            goodArgs, 
            script.withDelegates({
                govAuthority: {
                    strategyName: "address",
                } 
            })
        );
        this.state.config = tcx.state.bootstrappedConfig;
        
        expect(script.network).toBe(this.network);

        await script.submit(tcx);
        console.log(`charter token minted at slot ${this.network.currentSlot}`);

        this.network.tick(1n);
        return (this.state.mintedCharterToken = tcx);
    }


    async updateCharter(
        args: CDT
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