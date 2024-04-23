import { TxInput, TxOutput, Value, bytesToText } from "@hyperionbt/helios";
import type {
    DelegateSetupWithoutMintDelegate,
    MinimalDelegateLink,
    MintUutActivityArgs,
    NormalDelegateSetup,
} from "../Capo.js";
import {
    Datum,
    type InlineDatum,
    type ValidatorHash,
} from "../HeliosPromotedTypes.js";
import {
    Activity,
    datum,
    type configBase,
    type isActivity,
} from "../StellarContract.js";
import { StellarDelegate } from "./StellarDelegate.js";
import type {
    DelegationDetail,
    capoDelegateConfig,
} from "./RolesAndDelegates.js";
import type { StellarTxnContext } from "../StellarTxnContext.js";
import { dumpAny } from "../diagnostics.js";
import type { DefaultCapo } from "../DefaultCapo.js";
import { BasicDelegate } from "./BasicDelegate.js";
import type { HeliosModuleSrc } from "../HeliosModuleSrc.js";
import { UnspecializedDelegate } from "./UnspecializedDelegate.js";

export abstract class ContractBasedDelegate<
    CT extends configBase & capoDelegateConfig = configBase & capoDelegateConfig
> extends StellarDelegate<CT> {
    static currentRev = 1n;

    //@ts-expect-error - we provide a default impl for javascript users
    abstract get delegateName() : string {
        throw new Error(`${this.constructor.name}: missing required get delegateName() : string`)
    }

    contractSource() {
        return BasicDelegate;
    }

    get scriptDatumName() {
        return "DelegateDatum";
    }
    get scriptActivitiesName() {
        return "DelegateActivity";
    }

    importModules(): HeliosModuleSrc[] {
        const specializedDelegate = this.specializedDelegate;
        if (specializedDelegate.moduleName !== "specializedDelegate") {
            throw new Error(
                `${this.constructor.name}: specializedMintDelegate() module name must be ` +
                    `'specializedDelegate', not '${specializedDelegate.moduleName}'\n  ... in ${specializedDelegate.srcFile}`
            );
        }

        //@ts-expect-error
        const { capo } = this.configIn || this.partialConfig;

        if (!capo)
            throw new Error(
                `missing capo in config or partial-config for ${this.constructor.name}`
            );
        return [specializedDelegate, ...capo.importModules()];
    }


    static get defaultParams() {
        const params = {
            rev: this.currentRev,
            devGen: 0n,
        };
        return params;
    }
    static mkDelegateWithArgs(a: capoDelegateConfig) {}

    getContractScriptParams(config: CT) {
        //@ts-expect-error - spurious "could be instantiated with an unrelated type"
        const params : CT= {
            rev: config.rev,
            isDev: false,
            devGen: 0n,            
            delegateName: this.delegateName,
        };    

        const {
            capoAddr,
            mph,
            tn,
            capo,
            ... otherConfig
        } = config;
        otherConfig.delegateName = this.delegateName;

        if ("development" === process.env.NODE_ENV) {
            otherConfig.isDev = true;
            if (!otherConfig.devGen) {
                throw new Error(
                    `Missing expected devGen in config for ${this.constructor.name}`
                );
            }
        }
        return otherConfig as CT
    }

    /**
     * specializedDelegate module for customizing policies atop the basic delegate
     * @public
     * @remarks
     *
     * The basic mint delegate contains an "unspecialized" implementation of this
     * customization, which doesn't have any special restrictions (or capabilities)
     **/
    get specializedDelegate(): HeliosModuleSrc {
        return UnspecializedDelegate;
    }

    /**
     * Adds a mint-delegate-specific authority token to the txn output
     * @remarks
     *
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
     *
     * Uses {@link mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
     * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
     * @public
     **/
    async txnReceiveAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        tokenValue: Value,
        fromFoundUtxo?: TxInput
    ): Promise<TCX> {
        console.log(
            `     ----- minting delegate validator receiving mintDgt token at ` +
                this.validatorHash!.hex
        );
        // const ffu = fromFoundUtxo;
        // const v : Value = ffu?.value || this.mkMinAssetValue(this.configIn!.uut);
        const datum = this.mkDelegationDatum(fromFoundUtxo);
        return tcx.addOutput(new TxOutput(this.address, tokenValue, datum));
    }

    mkDelegationDatum(txin?: TxInput) {
        if (txin) return txin.origOutput.datum!;
        const { capoAddr, mph, tn, ..._otherCfgSettings } = this.configIn!;

        return this.mkDatumIsDelegation({
            capoAddr,
            mph,
            tn,
        });
    }

    /**
     * redeemer for replacing the authority UUT with a new one
     * @remarks
     *
     * When replacing the delegate, the current UUT will be burned,
     * and a new one will be minted.  It can be deposited to any next delegate address.
     *
     * @param seedTxnDetails - seed details for the new UUT
     * @public
     **/
    @Activity.redeemer
    activityReplacingMe({
        // todo: add type for seedTxnDetails
        seedTxn,
        seedIndex,
        purpose,
    }: Omit<MintUutActivityArgs, "purposes"> & { purpose?: string }) {
        return this.mkDelegateLifecycleActivity(
            "ReplacingMe",
            seedTxn,
            seedIndex,
            purpose
        );
    }

    mkDelegateLifecycleActivity(
        delegateActivityName: "ReplacingMe" | "Retiring" | "ValidatingSettings", 
        ...args: any[]
    ) {
        const TopEnum = this.mustGetActivity("DelegateLifecycleActivities");
        const { DelegateLifecycleActivity } = this.onChainTypes;
        const NestedVariant = this.mustGetEnumVariant(
            DelegateLifecycleActivity,
            delegateActivityName
        );
        return {
            redeemer: new TopEnum(new NestedVariant(...args))._toUplcData(),
        };
    }

    mkCapoLifecycleActivity(
        capoLifecycleActivityName: "CreatingDelegate" | "ActivatingDelegate",
        ...args: any[]
    ) {
        //!!! TODO use a seed: hasSeed arg here?
        const TopEnum = this.mustGetActivity("CapoLifecycleActivities");
        const { CapoLifecycleActivity } = this.onChainTypes;
        const NestedVariant = this.mustGetEnumVariant(
            CapoLifecycleActivity,
            capoLifecycleActivityName
        );
        return {
            redeemer: new TopEnum(new NestedVariant(...args))._toUplcData(),
        };
    }

    mkSpendingActivity(spendingActivityName: string, ...args: any[]) {
        const TopEnum = this.mustGetActivity("SpendingActivities");
        const { SpendingActivity } = this.onChainTypes;
        const NestedVariant = this.mustGetEnumVariant(
            SpendingActivity,
            spendingActivityName
        );
        return {
            redeemer: new TopEnum(new NestedVariant(...args))._toUplcData(),
        };
    }

    mkMintingActivity(mintingActivityName: string, ...args: any[]) {
        const TopEnum = this.mustGetActivity("MintingActivities");
        const { MintingActivity } = this.onChainTypes;
        const NestedVariant = this.mustGetEnumVariant(
            MintingActivity,
            mintingActivityName
        );
        return {
            redeemer: new TopEnum(new NestedVariant(...args))._toUplcData(),
        };
    }

    /**
     * redeemer for spending the authority UUT for burning it.
     * @public
     * @remarks
     *
     * The Retiring redeemer indicates that the delegate is being
     * removed.
     *
     **/
    @Activity.redeemer
    activityRetiring() {
        return this.mkDelegateLifecycleActivity("Retiring");
    }

    @Activity.redeemer
    activityValidatingSettings() {
        return this.mkDelegateLifecycleActivity("ValidatingSettings");
    }

    /**
     * creates the essential datum for a delegate UTxO
     * @remarks
     *
     * Every delegate is expected to have a two-field 'IsDelegation' variant
     * in the first position of its on-chain Datum type.  This helper method
     * constructs a suitable UplcData structure, given appropriate inputs.
     * @param dd - Delegation details
     * @public
     **/
    @datum
    mkDatumIsDelegation(dd: DelegationDetail): InlineDatum {
        const { IsDelegation } = this.onChainDatumType;
        const { DelegationDetail } = this.onChainTypes;
        const t = new IsDelegation(new DelegationDetail(dd));
        return Datum.inline(t._toUplcData());
    }

    /**
     * returns the ValidatorHash of the delegate script, if relevant
     * @public
     * @remarks
     *
     * A delegate that doesn't use an on-chain validator should override this method and return undefined.
     **/
    get delegateValidatorHash(): ValidatorHash | undefined {
        if (!this.validatorHash) {
            throw new Error(
                `${this.constructor.name}: address doesn't use a validator hash!\n` +
                    `  ... if that's by design, you may wish to override 'get delegateValidatorHash()'`
            );
        }
        return this.validatorHash;
    }

    /**
     * @inheritdoc AnyDelegate.DelegateMustFindAuthorityToken
     **/
    async DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string
    ): Promise<TxInput> {
        return this.mustFindMyUtxo(
            `${label}: ${bytesToText(this.configIn!.tn)}`,
            this.mkTokenPredicate(this.tvAuthorityToken()),
            "this delegate strategy might need to override txnMustFindAuthorityToken()"
        );
    }

    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     *
     * The default implementation adds the `uutxo` to the transaction
     * using {@link activityAuthorizing | activityAuthorizing() }.
     *
     * The off-chain code shouldn't need to check the details; it can simply
     * arrange the details properly and spend the delegate's authority token,
     * using this method.
     *
     * ### Reliance on this delegate
     *
     * Other contract scripts can rely on the delegate script to have validated its
     * on-chain policy and enforced its own "return to the delegate script" logic.
     *
     * ### Enforcing on-chain policy
     *
     * When spending the authority token in this way, the delegate's authority is typically
     * narrowly scoped, and it's expected that the delegate's on-chain script validates that
     * those parts of the transaction detail should be authorized, in accordance with the
     * delegate's core purpose/responsbility - i.e. that the txn does all of what the delegate
     * expects, and none of what it shouldn't do in that department.
     *
     * The on-chain code SHOULD typically enforce:
     *  * that the token is spent with an application-specific redeemer variant of its
     *     MintingActivity or SpendingActivitie.
     *
     *  * that the authority token is returned to the contract with its datum unchanged
     *  * that any other tokens it may also hold in the same UTxO do not become
     *     inaccessible as a result of the transactions - perhaps by requiring them to be
     *     returned together with the authority token.
     *
     * It MAY enforce additional requirements as well.
     *
     * @example
     * A minting delegate should check that all the expected tokens are
     * minted, AND that no other tokens are minted.
     *
     * @example
     * A role-based authentication/signature-checking delegate can
     * require an appropriate signature on the txn.
     *
     * @param tcx - the transaction context
     * @param utxo - the utxo having the authority UUT for this delegate
     * @reqt Adds the uutxo to the transaction inputs with appropriate redeemer.
     * @reqt Does not output the value; can EXPECT txnReceiveAuthorityToken to be called for that purpose.
     **/
    async DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        uutxo: TxInput,
        redeemer: isActivity
    ): Promise<TCX> {
        const { capo } = this.configIn!;
        return capo.txnAttachScriptOrRefScript(
            tcx.addInput(uutxo, redeemer),
            this.compiledScript
        );

        // return this.txnKeepValue(
        //     tcx,
        //     uutxo.value,
        //     uutxo.origOutput.datum as InlineDatum
        // );
    }

    /**
     * @inheritdoc AnyDelegate.DelegateAddsAuthorityToken
     **/
    async DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(
        tcx: StellarTxnContext,
        fromFoundUtxo: TxInput
    ): Promise<TCX> {
        const utxo = fromFoundUtxo;

        return tcx.addInput(
            new TxInput(utxo.outputId, utxo.origOutput),
            this.activityRetiring()
        ) as TCX;
    }
}

export type NamedDelegateCreationOptions<
    thisType extends DefaultCapo<any, any, any, any>,
    DT extends StellarDelegate
> = DelegateCreationOptions<
    string & keyof thisType["delegateRoles"]["namedDelegate"]["variants"],
    DT
> & {
    /**
     * Optional name for the UUT; uses the delegate name if not provided.
     **/
    uutName?: string;
};
// MinimalDelegateLink<DT> & {
//     uutOptions: UutCreationAttrs | ForcedUutReplacement
//     strategyName: string &
//     keyof thisType["delegateRoles"]["spendDelegate"]["variants"];
//     forcedUpdate?: true;
// };

export type DelegateCreationOptions<
    STRATEGIES extends string,
    DT extends StellarDelegate
> = MinimalDelegateLink<DT> & {
    /**
     * details for creating the delegate
     */
    mintSetup: NormalDelegateSetup | DelegateSetupWithoutMintDelegate;
    strategyName: string & STRATEGIES;
    /**
     * Installs the named delegate without burning the existing UUT for this delegate.
     * That UUT may become lost and inaccessible, along with any of its minUtxo.
     **/
    forcedUpdate?: true;
};
