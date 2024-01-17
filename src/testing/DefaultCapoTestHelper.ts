import type {
    DefaultCharterDatumArgs,
    MinimalDefaultCharterDatumArgs,
} from "../DefaultCapo.js";

import {
    DefaultCapo,
} from "../DefaultCapo.js";


import { StellarTxnContext } from "../StellarTxnContext.js";
import { ADA} from "./types.js";
import type { DefaultCapoTestHelperClass, canHaveRandomSeed, stellarTestHelperSubclass } from "./types.js";
import { CapoTestHelper } from "./CapoTestHelper.js";
import type { stellarSubclass } from "../StellarContract.js";
import {
    Capo,
} from "../Capo.js";
import type {
    CapoBaseConfig,
    hasBootstrappedConfig,
    hasUutContext,
} from "../Capo.js";
import { DefaultMinter } from "../minting/DefaultMinter.js";

import type { expect as expectType } from "vitest";

declare namespace NodeJS {
    interface Global {
        expect: typeof expectType
    }
}
declare const expect: typeof  expectType;

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
    DC extends DefaultCapo<DefaultMinter, CDT, CT> = DefaultCapo, //prettier-ignore
    CDT extends DefaultCharterDatumArgs =        
        DC extends Capo<DefaultMinter, infer iCDT> ? iCDT : DefaultCharterDatumArgs, //prettier-ignore
    CT extends CapoBaseConfig  = 
        DC extends Capo<any, any, infer iCT> ? iCT : never //prettier-ignore
    //@ts-expect-error because of a mismatch between the Capo's abstract mkTxnMintCharterToken's defined constraints
    //    ... vs the only concrete impl in DefaultCapo, with types that are actually nicely matchy.
> extends CapoTestHelper<DC, CDT, CT> {
    /**
     * Creates a prepared test helper for a given Capo class, with boilerplate built-in
     *
     * @remarks
     *
     * You may wish to provide an overridden setupActors() method, to arrange actor
     * names that fit your project's user-roles / profiles.
     *
     * You may also wish to add methods that satisfy some of your application's key
     * use-cases in simple predefined ways, so that your automated tests can re-use
     * the logic and syntax instead of repeating them in multiple test-cases.
     *
     * @param s - your Capo class that extends DefaultCapo
     * @typeParam DC - no need to specify it; it's inferred from your parameter
     * @public
     **/
    static forCapoClass<DC extends DefaultCapo<DefaultMinter, any, any>>(
        s: stellarSubclass<DC>
    ):  DefaultCapoTestHelperClass<DC> {
        class specificCapoHelper extends DefaultCapoTestHelper<DC> {
            get stellarClass() {
                return s;
            }
        }
        return specificCapoHelper;
    }

    //@ts-expect-error
    get stellarClass(): stellarSubclass<DC> {
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
        const tcx: StellarTxnContext = new StellarTxnContext(this.currentActor);
        const tcx2 = await treasury.txnAddGovAuthority(tcx);
        return treasury.txnMustUseCharterUtxo(tcx2, treasury.activityUsingAuthority());

        // return treasury.txnAddCharterWithAuthority(tcx);
    }

    mkDefaultCharterArgs(): Partial<MinimalDefaultCharterDatumArgs<CDT>> {
        const addr = this.currentActor.address;
        console.log("test helper charter -> actor addr", addr.toBech32());
        return {
            govAuthorityLink: {
                strategyName: "address",
                config: {
                    addrHint: [addr],
                },
            },
            // mintDelegateLink: {
            //     strategyName: "default",
            // },
        };
    }

    async mintCharterToken(
        args?: MinimalDefaultCharterDatumArgs<CDT>
    ): Promise<
        hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt"> &
            hasBootstrappedConfig<CapoBaseConfig>
    > {
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
        const goodArgs = (args ||
            this.mkDefaultCharterArgs()) as MinimalDefaultCharterDatumArgs<CDT>;
        // debugger

        const tcx = await script.mkTxnMintCharterToken(goodArgs);
        const rawConfig = this.state.rawConfig =
        this.state.config = tcx.state.bootstrappedConfig;
        
        this.state.parsedConfig = this.stellarClass.parseConfig(rawConfig)

        expect(script.network).toBe(this.network);

        await script.submit(tcx);
        console.log(
            `----- charter token minted at slot ${this.network.currentSlot}`
        );

        this.network.tick(1n);
        this.state.mintedCharterToken = tcx;
        return tcx;
    }

    async updateCharter(args: CDT): Promise<StellarTxnContext> {
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
