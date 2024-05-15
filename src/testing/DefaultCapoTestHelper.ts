
import { StellarTxnContext } from "../StellarTxnContext.js";
import { ADA } from "./types.js";
import type {
    DefaultCapoTestHelperClass,
    canHaveRandomSeed,
    stellarTestHelperSubclass,
} from "./types.js";
import { CapoTestHelper } from "./CapoTestHelper.js";
import type { ConfigFor, stellarSubclass } from "../StellarContract.js";
import { Capo } from "../Capo.js";
import type {
    CapoBaseConfig,
    CharterDatumProps,
    MinimalCharterDatumArgs,
    hasBootstrappedConfig,
    hasUutContext,
} from "../Capo.js";
import { CapoMinter } from "../minting/CapoMinter.js";

import type { expect as expectType } from "vitest";
import type { CapoOffchainSettingsType } from "../CapoSettingsTypes.js";
import { CapoWithoutSettings } from "../CapoWithoutSettings.js";

declare namespace NodeJS {
    interface Global {
        expect: typeof expectType;
    }
}
declare const expect: typeof expectType;

/**
 * Test helper for classes extending Capo
 * @remarks
 *
 * Arranges an test environment with predefined actor-names having various amounts of ADA in their (emulated) wallets,
 * and default helpers for setting up test scenarios.  Provides a simplified framework for testing Stellar contracts extending
 * the Capo class.
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
 * @typeParam DC - the specific Capo subclass under test
 * @public
 **/
export class DefaultCapoTestHelper<
    //@xxxts-expect-error spurious fail  type; it tries to strongly match the generic abstract type
    //    from (abstract) Capo, instead of paying attention to the clearly-matching concrete version in DefaultCapo
    CAPO extends Capo<any> = CapoWithoutSettings, //prettier-ignore
    //@xxxts-ignore because of a mismatch between the Capo's abstract mkTxnMintCharterToken's defined constraints
    //    ... vs the only concrete impl in DefaultCapo, with types that are actually nicely matchy.
    //    vscode is okay with it, but api-extractor is not :/
> extends CapoTestHelper<CAPO> {
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
     * @param s - your Capo subclass
     * @typeParam CAPO - no need to specify it; it's inferred from your parameter
     * @public
     **/
    static forCapoClass<CAPO extends Capo<any>>(
        s: stellarSubclass<CAPO>
    ): DefaultCapoTestHelperClass<CAPO> {
        class specificCapoHelper extends DefaultCapoTestHelper<CAPO> {
            get stellarClass() {
                debugger
                return s;
            }
        }
        return specificCapoHelper;
    }

    //xx@ts-expect-error
    get stellarClass(): stellarSubclass<CAPO> {
        //@ts-expect-error
        return CapoWithoutSettings;
    }

    //!!! todo: create type-safe ActorMap helper hasActors(), on same pattern as hasRequirements
    async setupActors() {
        // console.log("DCTH: setupActors")

        this.addActor("tina", 11000n * ADA);
        this.addActor("tracy", 13n * ADA);
        this.addActor("tom", 1200n * ADA);
        return this.setActor("tina");
    }

    async mkCharterSpendTx(): Promise<StellarTxnContext> {
        await this.mintCharterToken();

        const treasury = await this.strella!;
        const tcx: StellarTxnContext = new StellarTxnContext(this.currentActor);
        const tcx2 = await treasury.txnAttachScriptOrRefScript(
            await treasury.txnAddGovAuthority(tcx),
            treasury.compiledScript
        );

        return treasury.txnMustUseCharterUtxo(
            tcx2,
            treasury.activityUsingAuthority()
        );

        // return treasury.txnAddCharterWithAuthority(tcx);
    }

    mkDefaultCharterArgs(): MinimalCharterDatumArgs {
        const addr = this.currentActor.address;
        console.log("test helper charter -> actor addr", addr.toBech32());
        return {
            govAuthorityLink: {
                strategyName: "address",
                config: {
                    addrHint: [addr],
                },
            },
            mintDelegateLink: {
                strategyName: "defaultV1",
            },
            spendDelegateLink: {
                strategyName: "defaultV1",
            },
            mintInvariants: [],
            spendInvariants: [],
        };
    }

    async mintCharterToken(
        args?: Partial<MinimalCharterDatumArgs>
    ) {
        const { delay } = this;
        const { tina, tom, tracy } = this.actors;

        if (this.state.mintedCharterToken) {
            console.warn(
                "reusing minted charter from existing testing-context"
            );
            return this.state.mintedCharterToken as typeof tcx;
        }

        if (!this.strella) await this.initialize();
        const capo = await this.strella!;
        const goodArgs = {
            ... this.mkDefaultCharterArgs(),
            ... (args || {})
        } as MinimalCharterDatumArgs
        // debugger

        const tcx = await capo.mkTxnMintCharterToken(goodArgs);
        const rawConfig =
            (this.state.rawConfig =
            this.state.config =
                tcx.state.bootstrappedConfig);

        this.state.parsedConfig = this.stellarClass.parseConfig(rawConfig);

        expect(capo.network).toBe(this.network);

        await capo.submit(tcx);
        console.log(
            `----- charter token minted at slot ${this.network.currentSlot}`
        );
        this.network.tick(1n);
        await capo.submitAddlTxns(tcx, ({ txName, description }) => {
            this.network.tick(1n);
            console.log(
                `           ------- submitting addl txn ${txName} at slot ${this.network.currentSlot}:`
            );
        });

        this.network.tick(1n);
        this.state.mintedCharterToken = tcx;
        console.log("mintCharterToken returning tcx", tcx);
        return tcx;
    }

    async updateCharter(args: CharterDatumProps): Promise<StellarTxnContext> {
        await this.mintCharterToken();
        const treasury = await this.strella!;

        const { signers } = this.state;

        const tcx = await treasury.mkTxnUpdateCharter(args);
        return treasury.submit(tcx, { signers }).then(() => {
            this.network.tick(1n);
            return tcx;
        });
    }

    async updateSettings(args: CapoOffchainSettingsType<CAPO>) {
        await this.mintCharterToken();
        const capo = this.strella!;
        const tcx = await capo.mkTxnUpdateOnchainSettings(args);
        return capo.submit(tcx).then(() => {
            this.network.tick(1n);
            return tcx;
        });
    }
}
