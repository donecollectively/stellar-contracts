import { StellarTxnContext, type SubmitOptions } from "../StellarTxnContext.js";
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
    CapoConfig,
    CharterDataLike,
    MinimalCharterDataArgs,
    hasBootstrappedCapoConfig,
    hasUutContext,
} from "../Capo.js";
// import { CapoMinter } from "../minting/CapoMinter.js";

import type { expect as expectType } from "vitest";
// import type { CapoOffchainSettingsType } from "../CapoSettingsTypes.js";
import { CapoWithoutSettings } from "../CapoWithoutSettings.js";
import type {
    DelegateConfigDetails,
    DelegateSetup,
} from "../delegation/RolesAndDelegates.js";
import type { UutName } from "../delegation/UutName.js";
import type { Address } from "@helios-lang/ledger-babbage";

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
    CAPO extends Capo<any> = CapoWithoutSettings //prettier-ignore
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
    }

    setDefaultActor() {
        return this.setActor("tina");
    }

    async mkCharterSpendTx(): Promise<StellarTxnContext> {
        await this.mintCharterToken();

        const treasury = await this.strella!;
        const tcx: StellarTxnContext = this.mkTcx();
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

    // accesses the delegate roles, iterates the namedDelegate entries,
    // and uses txnCreateConfiguredDelegate() to trigger compilation of the script for each one
    async checkDelegateScripts(args: Partial<MinimalCharterDataArgs> = {}) {
        const { strella: capo } = this;
        const { delegateRoles } = capo;
        // const { namedDelegate: {
        //     selected,
        //     uutPurpose: roleName
        // } } = delegateRoles;
        const goodArgs = {
            ...this.mkDefaultCharterArgs(),
            ...args,
        } as MinimalCharterDataArgs;

        let helperTxn = await capo.mkTxnMintCharterToken(
            goodArgs,
            undefined,
            "DRY_RUN"
        );
        // emoji ladybug: "🐞"
        console.log("  🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞 ");

        for (const dgtLabel of Object.keys(delegateRoles)) {
            const dgtSetup = delegateRoles[dgtLabel] as DelegateSetup<
                any,
                any,
                any
            >;

            const { config, delegateClass, delegateType, uutPurpose } =
                dgtSetup;

            console.log(
                `  -- checking delegate script: ${dgtLabel} (${delegateType})`
            );
            // }

            // for (const [delegateName, delegate] of Object.entries(delegates) as [ string, DelegateConfigDetails<any>][]) {
            //     console.log(`  -- checking named-delegate script: ${delegateName}`);

            helperTxn = await capo.txnWillMintUuts(
                helperTxn,
                [uutPurpose],
                { usingSeedUtxo: helperTxn.state.seedUtxo },
                {
                    // namedDelegate: uutPurpose,
                    [dgtLabel]: uutPurpose,
                }
            );

            const addr = this.wallet.address;
            const newLink = await capo.txnCreateOffchainDelegateLink(
                helperTxn as any,
                dgtLabel,
                {
                    // strategyName: delegateName,
                    uutName: (helperTxn.state.uuts[uutPurpose] as UutName).name,
                    
                    config: {
                        // rev: 1n,
                        addrHint: [addr as any as Address]
                    },
                }
            );
        }
        //     // await capo.txnCreateConfiguredDelegate(helperTxn, delegate, );
        // } else {
        // }
    }

    mkDefaultCharterArgs(): MinimalCharterDataArgs {
        const addr = this.wallet.address;
        console.log("test helper charter -> actor addr", addr.toBech32());
        return {
            govAuthorityLink: {
                config: {
                    //this.capo.stringifyDgtConfig({
                    addrHint: [addr],
                },
            },
            mintDelegateLink: {
                config: {},
            },
            spendDelegateLink: {
                config: {},
            },
            mintInvariants: [],
            spendInvariants: [],
            otherNamedDelegates: new Map(),
            manifest: new Map(),
            rev: 1n,
        };
    }

    async mintCharterToken(
        args?: Partial<MinimalCharterDataArgs>,
        submitOptions: SubmitOptions = {}
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
            ...this.mkDefaultCharterArgs(),
            ...(args || {}),
        } as MinimalCharterDataArgs;
        // debugger

        const tcx = await capo.mkTxnMintCharterToken(goodArgs);
        const rawConfig =
            (this.state.rawConfig =
            this.state.config =
                tcx.state.bootstrappedConfig);

        this.state.parsedConfig = this.stellarClass.parseConfig(rawConfig);

        expect(capo.network).toBe(this.network);

        await tcx.submit(submitOptions);
        console.log(
            `----- charter token minted at slot ${this.network.currentSlot}`
        );
        this.network.tick(1);
        await tcx.submitAddlTxns(({ txName, description }) => {
            this.network.tick(1);
            console.log(
                `           ------- submitting addl txn ${txName} at slot ${this.network.currentSlot}:`
            );
        });

        this.network.tick(1);
        this.state.mintedCharterToken = tcx;
        // console.log("mintCharterToken returning tcx", tcx);
        return tcx;
    }

    async updateCharter(
        args: CharterDataLike,
        submitSettings: SubmitOptions = {}
    ): Promise<StellarTxnContext> {
        await this.mintCharterToken();
        const treasury = await this.strella!;

        const { signers } = this.state;

        const tcx = await treasury.mkTxnUpdateCharter(args);
        return tcx
            .submit({
                signers,
                ...submitSettings,
            })
            .then(() => {
                this.network.tick(1);
                return tcx;
            });
    }

    // async updateSettings(args: CapoOffchainSettingsType<CAPO>, submitSettings: SubmitOptions={}) {
    //     await this.mintCharterToken();
    //     const capo = this.strella!;
    //     const tcx = await capo.mkTxnUpdateOnchainSettings(args);
    //     return tcx.submit(submitSettings).then(() => {
    //         this.network.tick(1);
    //         return tcx;
    //     });
    // }
}
