import { Capo } from "../Capo.js";
import type {
    CapoConfig,
    CharterDataLike,
    MinimalCharterDataArgs,
    MinterBaseMethods,
    anyDatumArgs,
    hasBootstrappedCapoConfig,
    hasUutContext,
} from "../Capo.js";

import { StellarTxnContext, type anyState, type hasAddlTxns, type SubmitOptions } from "../StellarTxnContext.js";
import { StellarTestHelper } from "./StellarTestHelper.js";
import { CapoMinter } from "../minting/CapoMinter.js";

const ACTORS_ALREADY_MOVED =
    "NONE! all actors were moved from a different network via snapshot";

export const SNAP_INIT = "initialized";
export const SNAP_BOOTSTRAP = "bootstrapped";

/**
 * Base class for test helpers for Capo contracts
 * @remarks
 *
 * You should probably use DefaultCapoTestHelper instead of this class.
 * @public
 **/
export abstract class CapoTestHelper<
    SC extends Capo<any>
> extends StellarTestHelper<SC> {
    get capo() {
        return this.strella
    }
    async initialize({
        randomSeed = 42,
    }: { randomSeed?: number } = {},
    args?: Partial<MinimalCharterDataArgs>
)
    : Promise<SC> {
        // Note: This method diverges from the base class impl, due to type difficulties.
        // Patches welcome.

        if (this.strella && this.randomSeed == randomSeed) {
            console.log(
                "       ----- skipped duplicate initialize() in test helper"
            );

            return this.strella;
        }
        // console.log("A in capo test helper")

        if (this.strella) {
            console.log(
                `    -- 🌱🌱🌱 new test helper setup with new seed (was ${this.randomSeed}, now ${randomSeed})...\n` +
                    new Error("stack")
                        .stack!.split("\n")
                        .slice(1)
                        .filter(
                            (line) =>
                                !line.match(/node_modules/) &&
                                !line.match(/node:internal/)
                        )
                        .join("\n")
            );

            //@ts-expect-error
            this.strella = undefined;
            this.actors = {};
            this._actorName = "";
        }
        await this.delay(1);

        this.randomSeed = randomSeed;

        if (Object.keys(this.actors).length) {
            console.log("Skipping actor setup - already done");
        } else {
            console.log("  -- 🎭🎭🎭 actor setup...");
            const actorSetup = this.setupActors();
            await actorSetup;
            await this.setDefaultActor();
        }

        this.state.mintedCharterToken = undefined;
        this.state.parsedConfig = undefined;

        //! when there's not a preset config, it leaves the detailed setup to be done just-in-time
        //   based on seedUtxo in mkTxnMintCharterToken
        if (!this.config) {
            console.log("  -- Capo not yet bootstrapped");
            const ts1 = Date.now();
            this.strella = await this.initStrella(this.stellarClass);

            const ts2 = Date.now();
            console.log(
                // stopwatch emoji: ⏱️
                `  -- ⏱️ initialized Capo: ${ts2-ts1}ms`
            );                
            console.log("checking delegate scripts...");
            return this.checkDelegateScripts(args).then(() => {
                const ts3 = Date.now();
                console.log(
                    `  -- ⏱️ checked delegate scripts: ${ts3-ts2}ms`
                )
                return this.strella;
            });
        }
        console.log("  -- Capo already bootstrapped");
        const strella = await this.initStrella(this.stellarClass, this.config);

        this.strella = strella;
        const { address, mintingPolicyHash: mph } = strella;

        const { name } = strella.program;
        console.log(
            name,
            address.toString().substring(0, 18) + "…",
            "vHash 📜 " + strella.validatorHash.toHex().substring(0, 12) + "…",
            "mph 🏦 " + mph?.toHex().substring(0, 12) + "…"
        );
        console.log("<- CAPO initialized()");
        return strella;
    }

    async checkDelegateScripts(args: Partial<MinimalCharterDataArgs>={}): Promise<void> {
        throw new Error(`doesn't fail, because it's implemented by DefaultCapoTestHelper`);
    }

    get ready() {
        return !!(
            (this.strella.configIn && !this.strella.didDryRun.configIn) 
            || this.state.parsedConfig
        );
    }

    /**
     * Creates a new transaction-context with the helper's current or default actor
     * @public
     **/
    mkTcx<T extends anyState=anyState>() : StellarTxnContext<T> {
        return new StellarTxnContext(this.strella.setup)
    }

    loadSnapshot(snapName: string) {
        const snap = this.helperState!.snapshots[snapName];
        if (!snap) throw new Error(`no snapshot named ${snapName}`);

        this.network.loadSnapshot(snap);
    }

    async reusableBootstrap(
        snap = SNAP_BOOTSTRAP
        // override = false
    ) {
        let capo;
        const helperState = this.helperState!;
        if (helperState.bootstrapped) {
            console.log("  ---  ⚗️🐞🐞 already bootstrapped");
            if (!helperState.previousHelper) {
                debugger;
                throw new Error(
                    `already bootstrapped, but no previousHelper : ( `
                );
            }
            capo = await this.restoreFrom(snap);
        } else {
            capo = await this.bootstrap();
            helperState.bootstrappedStrella = capo;
        }
        const { previousHelper } = helperState;
        if (!previousHelper) {
            this.snapshot(SNAP_BOOTSTRAP);
        } else {
            console.log(
                `changing helper from network ${previousHelper.network.id} to ${this.network.id}`
            );
        }
        helperState.bootstrapped = true;
        helperState.previousHelper = this;

        return capo;
    }

    // a decorator for test-helper functions that generate named snapshots
    static hasNamedSnapshot(snapshotName: string, actorName: string) {
        return function (
            target: any,
            propertyKey: string,
            descriptor: PropertyDescriptor
        ) {
            const originalMethod = descriptor.value;
            descriptor.value = SnapWrap;

            const [_, WithCapMethodName] =
                propertyKey.match(/^snapTo(.*)/) || [];
            if (!WithCapMethodName) {
                throw new Error(
                    `hasNamedSnapshot(): ${propertyKey}(): expected method name to start with 'snapTo'`
                );
            }
            const methodName =
                WithCapMethodName[0].toLowerCase() + WithCapMethodName.slice(1);
            const generateSnapshotFunc = target[methodName];
            if (!generateSnapshotFunc) {
                throw new Error(
                    `hasNamedSnapshot(): ${propertyKey}: expected method ${methodName} to exist`
                );
            }

            console.log(
                "hasNamedSnapshot(): ",
                propertyKey,
                " -> ",
                methodName
            );

            async function SnapWrap(this: CapoTestHelper<any>, ...args: any[]) {
                await this.reusableBootstrap();

                return this.findOrCreateSnapshot(
                    snapshotName,
                    actorName,
                    () => {
                        return generateSnapshotFunc
                            .apply(this, ...args)
                            .then((result) => {
                                if (this.actorName !== actorName) {
                                    throw new Error(
                                        `actorName mismatch during snapshot generation; was '${this.actorName}', expected '${actorName}'`
                                    );
                                }
                                this.network.tick(1);
                                return result;
                            });
                    }
                );
            }
            return descriptor;
        };
    }

    hasSnapshot(snapshotName: string) {
        return !!this.helperState?.snapshots[snapshotName];
    }

    snapshot(snapshotName: string) {
        if (!this.helperState) {
            throw new Error(`can't snapshot without a helperState`);
        }
        if (this.hasSnapshot(snapshotName)) {
            throw new Error(`snapshot ${snapshotName} already exists`);
        }
        this.helperState.snapshots[snapshotName] =
            this.network.snapshot(snapshotName);
    }

    async findOrCreateSnapshot(
        snapshotName: string,
        actorName: string,
        contentBuilder: () => Promise<StellarTxnContext<any>>
    ): Promise<SC> {
        if (this.helperState!.snapshots[snapshotName]) {
            const capo = await this.restoreFrom(snapshotName);
            await this.setActor(actorName);
            return capo;
        }
        let result;
        try {
            result = await contentBuilder();
            return this.strella;
            // the correct actor name is expected from the underlying activity
            // await this.setActor(actorName);
            return result;
        } catch (e) {
            throw e;
        } finally {
            if (result) {
                this.snapshot(snapshotName);
            }
        }
    }

    async restoreFrom(snapshotName: string): Promise<SC> {
        const {
            helperState,
            helperState: {
                snapshots,
                previousHelper,
                bootstrappedStrella,
            } = {},
        } = this;
        if (!helperState)
            throw new Error(
                `can't restore from a previous helper without a helperState`
            );
        if (!bootstrappedStrella)
            throw new Error(
                `can't restore from a previous helper without a bootstrappedStrella`
            );

        if (!snapshots || !snapshots[snapshotName]) {
            throw new Error(`no snapshot named ${snapshotName} in helperState`);
        }
        if (!previousHelper) {
            throw new Error(`no previousHelper in helperState`);
        }
        const { parsedConfig } = previousHelper.state;

        const { networkCtx: oldNetworkEnvelope } = previousHelper;
        const { network: previousNetwork } = oldNetworkEnvelope;
        const { network: newNet } = this.networkCtx;

        // hacky load of the indicator of already having restored details from the prievous helper
        const otherNet: number = previousHelper.actors[
            ACTORS_ALREADY_MOVED
        ] as unknown as number;
        if (otherNet) {
            if (otherNet !== newNet.id) {
                throw new Error(
                    `actors already moved to network #${otherNet}; can't move to #${newNet.id} now.`
                );
            }
            console.log("  -- actors are already here");
        } else {
            if (this === previousHelper) {
                console.log(
                    "  -- helper already transferred; loading incremental snapshot"
                );
            } else {
                Object.assign(this.actors, previousHelper.actors);

                // swaps out the previous helper's envelope
                previousHelper.networkCtx = { network: previousNetwork };

                // uses the old envelope (that the actors used on the old network)
                this.networkCtx = oldNetworkEnvelope;
                // ... to reflect the new snapshotted network
                this.networkCtx.network = newNet;

                this.state.mintedCharterToken =
                    previousHelper.state.mintedCharterToken;
                this.state.parsedConfig = parsedConfig;

                //@ts-expect-error
                previousHelper.actors = { [ACTORS_ALREADY_MOVED]: newNet.id };
                console.log(
                    `   -- moving ${
                        Object.keys(this.actors).length
                    } actors from network ${previousNetwork.id} to ${newNet.id}`
                );
            }
            newNet.loadSnapshot(snapshots[snapshotName]);
        }
        if (!this.actorName) {
            await this.setDefaultActor();
        }
        // this.strella = bootstrappedStrella;
        if (!this.strella) {
            await this.initStellarClass(parsedConfig);
        }
        return this.strella;
    }

    async bootstrap(
        args?: Partial<MinimalCharterDataArgs>,
        submitOptions: SubmitOptions = {}
    ) {
        let strella = this.strella || (await this.initialize(undefined, args));
        if (this.bootstrap != CapoTestHelper.prototype.bootstrap) {
            throw new Error(
                `Don't override the test-helper bootstrap().  Instead, provide an implementation of extraBootstrapping()`
            );
        }
        if (this.ready) {
            console.log(
                "       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap already OK"
            );

            return strella;
        }

        await this.mintCharterToken(args, submitOptions);
        console.log(
            "       --- ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ⚗️ 🐞 ✅ Capo bootstrap with charter"
        );
        await this.bootstrapSettings();
        await this.extraBootstrapping(args);
        return strella;
    }

    abstract bootstrapSettings(): Promise<any>;

    async extraBootstrapping(args?: Partial<MinimalCharterDataArgs>) {
        return this.strella;
    }

    abstract mkDefaultCharterArgs(): Partial<MinimalCharterDataArgs>;
    abstract mintCharterToken(
        args?: Partial<MinimalCharterDataArgs>,
        submitOptions?: SubmitOptions
    ): Promise<
        hasUutContext<
            "govAuthority" | "capoGov" | "mintDelegate" | "mintDgt" 
        > &
            hasBootstrappedCapoConfig &
            hasAddlTxns<any>
    >;
}
