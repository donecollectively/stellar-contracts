import { makeTxInput, makeTxOutput } from "@helios-lang/ledger";
import type {
    Value,
    TxOutputId,
    TxInput,
    ValidatorHash,
} from "@helios-lang/ledger";
import type { Capo } from "../Capo.js";
import type {
    DelegateSetupWithoutMintDelegate,
    MinimalDelegateLink,
    MintUutActivityArgs,
    NormalDelegateSetup,
    hasCharterRef,
} from "../CapoTypes.js";
import type {
    mustFindActivityType,
    mustFindConcreteContractBridgeType,
    mustFindDatumType,
    mustFindReadDatumType,
} from "../helios/dataBridge/BridgeTypes.js";
import type {
    GenericDelegateBridge,
    GenericDelegateBridgeClass,
    GenericDelegateDatum,
} from "./GenericDelegateBridge.js";

import { Activity, datum } from "../StellarContract.js";
import { StellarDelegate } from "./StellarDelegate.js";
import type {
    DelegationDetail,
    capoDelegateConfig,
} from "./RolesAndDelegates.js";
import { StellarTxnContext } from "../StellarTxnContext.js";
import type { CapoDelegateBundle } from "../helios/scriptBundling/CapoDelegateBundle.js";
import type { isActivity } from "../ActivityTypes.js";

import { bytesToText, textToBytes } from "../HeliosPromotedTypes.js";
import type { IFISNEVER } from "../helios/typeUtils.js";

/**
 * Base class for delegates controlled by a smart contract, as opposed
 * to a simple delegate backed by an issued token, whose presence
 * grants delegated authority.
 * @public
 */
export class ContractBasedDelegate extends StellarDelegate {
    /**
     * Each contract-based delegate must define its own dataBridgeClass, but they all
     * use the same essential template for the outer layer of their activity & datum interface.
     */
    declare dataBridgeClass: GenericDelegateBridgeClass;
    declare _dataBridge: GenericDelegateBridge;
    static currentRev = 1n;

    /**
     * Configures the matching parameter name in the on-chain script, indicating
     * that this delegate serves the Capo by enforcing policy for spending the Capo's utxos.
     * @remarks
     * Not used for any mint delegate.  Howeever, a mint delegate class can instead provide a true isMintAndSpendDelegate,
     *...  if a single script controls both the mintDgt-* and spendDgt-* tokens/delegation roles for your Capo.
     *
     * DO NOT enable this attribute for second-level delegates, such as named delegates or delegated-data controllers.
     * The base on-chain delegate script recognizes this conditional role and enforces that its generic delegated-data activities
     * are used only in the context the Capo's main spend delegate, re-delegating to the data-controller which
     * can't use those generic activities, but instead implements its user-facing txns as variants of its SpendingActivities enum.
     */
    static isSpendDelegate = false

    get delegateName(): string {
        throw new Error(
            `${this.constructor.name}: missing required get delegateName() : string`
        );
    }

    // dataBridgeClass = CapoDataBridge;

    get onchain(): mustFindConcreteContractBridgeType<this> {
        return this.getOnchainBridge() as any;
    }

    get offchain(): mustFindConcreteContractBridgeType<this>["reader"] {
        return super.offchain as any;
    }

    get reader(): mustFindConcreteContractBridgeType<this>["reader"] {
        return super.offchain as any;
    }

    // get activity(): IFISNEVER<
    //     mustFindActivityType<this>,
    //     IFISNEVER<findActivityType<this>,
    //         ContractDataBridge["activity"]
    //     >
    // > {
    get activity(): mustFindActivityType<this> {
        const bridge = this.onchain;
        return bridge.activity as any;
    }

    get mkDatum(): mustFindDatumType<this> {
        return this.onchain.datum;
    }

    get newReadDatum(): mustFindReadDatumType<this> {
        // & ( (d: UplcData) => CapoDatumLike ) {
        const bridge = this.getOnchainBridge();
        //x@ts-expect-error probing for presence
        const { readDatum } = bridge;
        if (!readDatum) {
            throw new Error(
                `${
                    (this as any).constructor.name
                }: this contract script doesn't use datum`
            );
        }

        return readDatum as any;
    }

    get capo(): Capo<any, any> {
        return this.configIn?.capo as unknown as Capo<any, any>;
    }

    // mkBundleWithCapo<T extends HeliosScriptBundle>(BundleClass: new (capo: CapoHeliosBundle) => T) : T {
    //     const { capo } = this.configIn || this.partialConfig || {};
    //     if (!capo)
    //         throw new Error(
    //             `missing capo in config or partial-config for ${this.constructor.name}`
    //         );
    //     const capoBundle = capo.getBundle() as CapoHeliosBundle;
    //     return new BundleClass(capoBundle);
    // }

    scriptBundle(): CapoDelegateBundle {
        throw new Error(
            `${this.constructor.name}: missing required implementation of scriptBundle()\n` +
                `\nEach contract-based delegate must provide a scriptBundle() method.\n` +
                `It should return an instance of a class defined in a *.hlb.ts file.  At minimum:\n\n` +
                `    import {YourAppCapo} from "./YourAppCapo.js";\n\n` +
                `    import SomeSpecializedDelegate from "./YourSpecializedDelegate.hl";\n\n` +
                `    export default class SomeDelegateBundle extends CapoDelegateBundle.using(YourAppCapo) {\n` +
                `        specializedDelegateModule = SomeSpecializedDelegate; \n` +
                `    }\n\n` +
                `We'll generate an additional .typeInfo.ts, based on the types in your Helios sources,\n` +
                `  ... and a .bridge.ts with generated data-conversion code for bridging between off-chain` +
                `  ... and on-chain data encoding.` +
                `Your scriptBundle() method can \`return new SomeDelegateBundle()\``
        );
    }

    get scriptDatumName() {
        return "DelegateDatum";
    }

    get scriptActivitiesName() {
        return "DelegateActivity";
    }

    static isMintDelegate = false;
    static isMintAndSpendDelegate = false;
    static isDgDataPolicy = false;

    static get defaultParams() {
        const params = {
            rev: this.currentRev,
            isMintDelegate: this.isMintDelegate,
            isSpendDelegate: this.isMintAndSpendDelegate,
            isDgDataPolicy: this.isDgDataPolicy,
        };
        return params;
    }
    static mkDelegateWithArgs(a: capoDelegateConfig) {}
    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * If you set this to false, a delegated-data script will not 
     * require governance authority for its transactions, and you will
     * need to explicitly enforce any user-level permissions needed
     * for authorizing delegated-data transactions.
     * @public
     */
    needsGovAuthority = true;

    getContractScriptParams(config: capoDelegateConfig) {
        const { capoAddr, mph, tn, capo, ...otherConfig } = config;

        return {
            ...otherConfig,
            delegateName: this.delegateName,
            requiresGovAuthority: this.needsGovAuthority,
        }
        // console.log(`${this.constructor.name} config:`, otherConfig);
        // const namespace = this.scriptProgram!.name;
        // const {paramTypes} = this.scriptProgram!;
        // const {isMainnet=false} = this.setup
        // return Object.fromEntries(
        //     Object.entries(otherConfig).map(([k, v]) => {
        //         const fullName = `${namespace}::${k}`;
        //         const thatType = paramTypes[fullName];
        //         if (!thatType) {
        //             throw new Error(
        //                 `missing type for ${fullName} in ${this.constructor.name}\n`+
        //                 `  ... available types: ${Object.keys(paramTypes).join(", ")}`
        //             );
        //         }
        //         const schema = thatType.toSchema();
        //         const cast = new Cast(schema, {
        //             isMainnet
        //         });
        //         try {
        //             return [
        //                 fullName, this.typeToUplc(thatType, v, `params[${fullName}]`)
        //             ];
        //         } catch (e:any) {
        //             debugger;
        //             throw new Error(`error casting script param ${k} in ${this.constructor.name}: ${e.message}`);
        //         }
        //     })
        // ) as UplcRecord<CT>
    }

    tcxWithCharterRef<TCX extends StellarTxnContext | hasCharterRef>(tcx: TCX) {
        return this.capo.tcxWithCharterRef(tcx);
    }
    // tcxWithSettingsRef<TCX extends StellarTxnContext | hasSettingsRef>(
    //     tcx: TCX
    // ) {
    //     return this.capo.tcxWithSettingsRef(tcx);
    // }

    /**
     * Adds a mint-delegate-specific authority token to the txn output
     * @remarks
     *
     * Implements {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() }.
     *
     * Uses {@link ContractBasedDelegate.mkDelegationDatum | mkDelegationDatum()} to make the inline Datum for the output.
     * @see {@link StellarDelegate.txnReceiveAuthorityToken | baseline txnReceiveAuthorityToken()'s doc }
     * @public
     **/
    async txnReceiveAuthorityToken<TCX extends StellarTxnContext>(
        tcx: TCX,
        tokenValue: Value,
        fromFoundUtxo?: TxInput
    ): Promise<TCX> {
        const datum = this.mkDelegationDatum(fromFoundUtxo);

        const newOutput = makeTxOutput(this.address, tokenValue, datum);
        // const separator = `     -----`;
        // console.log(
        //     `${separator} delegate script receiving dgTkn\n${separator} ${dumpAny(
        //         newOutput
        //     )}` // ${dumpAny(tokenValue)} at ${dumpAny(addr)} = ${addr.toBech32()}`
        // );
        // const ffu = fromFoundUtxo;
        // const v : Value = ffu?.value || this.mkMinAssetValue(this.configIn!.uut);
        return tcx.addOutput(newOutput);
    }

    mkDelegationDatum(txin?: TxInput) {
        if (txin) return txin.output.datum!;
        const { capoAddr, mph, tn, ..._otherCfgSettings } = this.configIn!;

        return this.mkDatum.IsDelegation({
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
        seed,
        purpose,
    }: Omit<MintUutActivityArgs, "purposes"> & { purpose: string }) {
        throw new Error(`deprecated: explicit activity helper`);

        // return this.mkDelegateLifecycleActivity("ReplacingMe", {
        //     seed,
        //     purpose,
        // });
    }

    mkDelegateLifecycleActivity(
        delegateActivityName: "ReplacingMe" | "Retiring" | "ValidatingSettings",
        args?: Record<string, any>
    ): isActivity {
        throw new Error(`deprecated: explicit activity helper`);

        // try {
        //     return this.activityRedeemer("DelegateLifecycleActivities", {
        //         activity: { [delegateActivityName]: args },
        //     });
        // } catch (e: any) {
        //     // warning emoji: "⚠️"
        //     e.message =
        //         "⚠️ ⚠️ ⚠️ error constructing delegate lifecycle activity.  You might need " +
        //         "to format the args as UplcData if the enum doesn't recognize a valid off-chain type.\nDelegate lifecycle activity: " +
        //         e.message;
        //     throw e;
        // }
    }

    mkCapoLifecycleActivity(
        capoLifecycleActivityName: "CreatingDelegate" | "ActivatingDelegate",
        {
            seed,
            purpose,
            ...otherArgs
        }: Omit<MintUutActivityArgs, "purposes"> & { purpose?: string }
    ): isActivity {
        throw new Error(`deprecated: explicit activity helper`);

        // return this.activityRedeemer("CapoLifecycleActivities", {
        //     activity: {
        //         [capoLifecycleActivityName]: { seed, purpose, ...otherArgs },
        //     },
        // });
    }

    /**
     * Creates a reedemer for the indicated spending activity name
     **/
    mkSpendingActivity(
        spendingActivityName: string,
        args: { id: string | number[] } & Record<string, any>
    ): isActivity {
        throw new Error(`deprecated: explicit activity helper`);

        // try {
        //     let id : number[] = ("string" == typeof args.id) ?
        //         textToBytes(args.id as string) : args.id as number[];

        //         // TODO: require that the on-chain type have first field = 'id', not 'recId' or whatever
        //     return this.activityRedeemer("SpendingActivities", {
        //         activity: {
        //             [spendingActivityName]: { ...args, id },
        //         },
        //     });
        // } catch (e: any) {
        //     // warning emoji: "⚠️"
        //     e.message =
        //         "⚠️ ⚠️ ⚠️ error constructing spending activity: " + e.message;
        //     throw e;
        // }
    }

    mkSeedlessMintingActivity(
        mintingActivityName: string,
        args: Record<string, any>
    ): isActivity {
        const { MintingActivity } = this.onChainTypes;
        const NestedVariant = this.mustGetEnumVariant(
            MintingActivity,
            mintingActivityName
        );
        throw new Error(`mkSeedlessMintingActivity: deprecated`);
        // debugger; // ??? vvv
        // //@ts-ignore !!!!
        // const nestedVarSt = NestedVariant.prototype._enumVariantStatement;
        // const firstActivityField =
        //     nestedVarSt.dataDefinition.fields[0].name.value;
        // if ("seed" === firstActivityField) {
        //     throw new Error(
        //         `Minting activity '${mintingActivityName}' requires a seed 🍉. \n` +
        //             `   ... therefore, you must use mkSeededMintingActivity() instead.`
        //     );
        // }
        // if (args.seed) {
        //     throw new Error(
        //         `mkSeedlessMintingActivity: found unexpected 'seed' field in seedless MintingActivity variant!\n` +
        //             `  🍉 ... if this minting activity actually needs a seed, you'd need to adjust its on-chain type definition.` +
        //             `  ... a seed provides guaranteed uniqueness for minting e.g. a UUT. ` +
        //             `  ... e.g.minting only fungible tokens doesn't require a seed`
        //     );
        // }

        // try {
        //     return this.activityRedeemer("MintingActivities", {
        //         activity: { [mintingActivityName]: args },
        //     });
        // } catch (e: any) {
        //     // warning emoji: "⚠️"
        //     e.message =
        //         "⚠️ ⚠️ ⚠️ error constructing minting activity.  You might need " +
        //         "to format the args as UplcData if the enum doesn't recognize a valid off-chain type.\nMinting activity: " +
        //         e.message;
        //     throw e;
        // }
    }

    mkSeededMintingActivity(
        mintingActivityName: string,
        args: { seed: TxOutputId } & Record<string, any>
    ): isActivity {
        const { MintingActivity } = this.onChainTypes;
        const NestedVariant = this.mustGetEnumVariant(
            MintingActivity,
            mintingActivityName
        );
        throw new Error(`mkSeededMintingActivity: deprecated`);
        // if (!NestedVariant) {
        //     throw new Error(
        //         `mkSeededMintingActivity: missing MintingActivity variant '${mintingActivityName}'`
        //     );
        // }
        // // const nestedVarSt = NestedVariant.prototype._enumVariantStatement;
        // const firstActivityField = NestedVariant.fieldNames[0];
        // // nestedVarSt.dataDefinition.fields[0].name.value;
        // if ("seed" !== firstActivityField) {
        //     throw new Error(
        //         `Minting activity '${mintingActivityName}' is not a seeded activity.  \n` +
        //             `   ... therefore, you must use mkSeedlessMintingActivity() instead.  🍉`
        //     );
        // }
        // if (!args.seed) {
        //     throw new Error(
        //         `mkSeedlessMintingActivity: missing required 'seed' field in MintingActivity variant!\n` +
        //             `  🍉 ... if this minting activity doesn't actually need a seed, you'd need to adjust its on-chain type definition.` +
        //             `  ... a seed provides guaranteed uniqueness for minting e.g. a UUT. ` +
        //             `  ... e.g., minting only fungible tokens doesn't require a seed`
        //     );
        // }

        // try {
        //     return this.activityRedeemer("MintingActivities", {
        //         activity: { [mintingActivityName]: args },
        //     });
        // } catch (e: any) {
        //     // warning emoji: "⚠️"
        //     e.message =
        //         "⚠️ ⚠️ ⚠️ error constructing minting activity.  You might need " +
        //         "to format the args as UplcData if the enum doesn't recognize a valid off-chain type.\nMinting activity: " +
        //         e.message;
        //     throw e;
        // }
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
        throw new Error(`deprecated: explicit activity helper`);

        // return this.mkDelegateLifecycleActivity("Retiring");
    }

    @Activity.redeemer
    activityValidatingSettings() {
        throw new Error(`deprecated: explicit activity helper`);

        // return this.mkDelegateLifecycleActivity("ValidatingSettings");
    }

    // @Activity.redeemer
    activityMultipleDelegateActivities(
        ...activities: isActivity[]
    ): isActivity {
        throw new Error(`deprecated: explicit activity helper`);
        // return this.activityRedeemer("MultipleDelegateActivities", {
        //     // todo: allow the cast to take already-uplc'd data
        //     activities: activities.map((a) => a.redeemer),
        // });
    }

    // /**
    //  * A spend-delegate activity indicating that a delegated-data controller will be governing
    //  * an update to a specific piece of delegated data.  No further redeemer details are needed here,
    //  * but the data-delegate's controller-token may have additional details in ITS redeemer,
    //  * which will be aligned with the one.
    //  *
    //  * May be present in the context of a nested MultipleDelegateActivities redeemer, in which
    //  * case, multiple cases of the above scenario will be present in a single transaction.
    //  */
    // @Activity.redeemer
    // activityUpdatingDelegatedData(
    //     recId: string | number[]
    // ): isActivity {
    //     const recIdBytes = Array.isArray(recId)
    //         ? recId
    //         : textToBytes(recId);
    //     // const Activity = this.mustGetActivity("UpdatingDelegatedData");

    //     // this.activity.DeletingDelegatedData

    //     return {
    //         // redeemer: new Activity(uutPurpose, recIdBytes),
    //         redeemer: this.activityVariantToUplc("UpdatingDelegatedData", {
    //             recId: recIdBytes,
    //         }),
    //     };
    // }

    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * a deletion (burning its UUT) of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer,
     */
    @Activity.redeemer
    activityDeletingDelegatedData(recId: string | number[]): isActivity {
        throw new Error(`deprecated: explicit activity helper`);

        // const recIdBytes = Array.isArray(recId)
        //     ? recId
        //     : textToBytes(recId);

        //     return {
        //     redeemer: this.activityVariantToUplc("DeletingDelegatedData", {
        //         recId: recIdBytes,
        //     }),
        // };
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
    mkDatumIsDelegation(dd: DelegationDetail) {
        const { DelegationDetail } = this.onChainTypes;
        throw new Error(`deprecated: explicit datum helper`);

        // const schema = DelegationDetail.toSchema()
        // const cast = new Cast(schema, {
        //     isMainnet: this.setup.isMainnet || false
        // });
        return this.inlineDatum("IsDelegation", { dd });
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
     * {@inheritdoc StellarDelegate.DelegateMustFindAuthorityToken}
     **/
    async DelegateMustFindAuthorityToken(
        tcx: StellarTxnContext,
        label: string
    ): Promise<TxInput> {
        return this.mustFindMyUtxo(
            `${label}: ${bytesToText(this.configIn!.tn)}`, {
                predicate: this.uh.mkTokenPredicate(this.tvAuthorityToken()),
                extraErrorHint: "this delegate strategy might need to override txnMustFindAuthorityToken()"
            }
        );
    }

    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
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
        const tcx2 = await capo.txnAttachScriptOrRefScript(
            tcx,
            this.compiledScript
        );
        if (!redeemer.redeemer) debugger
        return tcx2.addInput(uutxo, redeemer);

        // return this.txnKeepValue(
        //     tcx,
        //     uutxo.value,
        //     uutxo.origOutput.datum as InlineDatum
        // );
    }

    /**
     * {@inheritdoc StellarDelegate.DelegateAddsAuthorityToken}
     **/

    async DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(
        this: ContractBasedDelegate,
        tcx: StellarTxnContext,
        fromFoundUtxo: TxInput
    ): Promise<TCX> {
        const utxo = fromFoundUtxo;

        return tcx.addInput(
            makeTxInput(utxo.id, utxo.output),
            this.activity.DelegateLifecycleActivities.Retiring
        ) as TCX;
    }
}

/**
 * @public
 */
export type NamedPolicyCreationOptions<
    thisType extends Capo<any>,
    DT extends StellarDelegate
> = PolicyCreationOptions & {
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

export type PolicyCreationOptions = MinimalDelegateLink & {
    /**
     * details for creating the delegate
     */
    mintSetup: NormalDelegateSetup | DelegateSetupWithoutMintDelegate;
    // strategyName: string & STRATEGIES;
    /**
     * Installs the named delegate without burning the existing UUT for this delegate.
     * That UUT may become lost and inaccessible, along with any of its minUtxo.
     **/
    forcedUpdate?: true;
};
