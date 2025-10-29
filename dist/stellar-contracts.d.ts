import { Address } from '@helios-lang/ledger';
import type { AnyData } from './CapoHeliosBundle.typeInfo.js';
import type { AnyData as AnyData_2 } from './UnspecializedDelegate.typeInfo.js';
import type { AnyData as AnyData_3 } from './Reqts.concrete.typeInfo.js';
import type { AnyDataLike } from './CapoHeliosBundle.typeInfo.js';
import type { AnyDataLike as AnyDataLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { AnyDataLike as AnyDataLike_3 } from './Reqts.concrete.typeInfo.js';
import { anyState as anyState_2 } from './StellarTxnContext.js';
import { AssetClass } from '@helios-lang/ledger';
import { Assets } from '@helios-lang/ledger';
import { BasicMintDelegate as BasicMintDelegate_2 } from './minting/BasicMintDelegate.js';
import { BatchSubmitController as BatchSubmitController_2 } from './networkClients/BatchSubmitController.js';
import type { BurningActivityLike } from './UnspecializedDelegate.typeInfo.js';
import type { BurningActivityLike as BurningActivityLike_2 } from './Reqts.concrete.typeInfo.js';
import { ByteArrayData } from '@helios-lang/uplc';
import { BytesLike } from '@helios-lang/codec-utils';
import { decodeUtf8 as bytesToText } from '@helios-lang/codec-utils';
import type { CapoActivity } from './CapoHeliosBundle.typeInfo.js';
import { CapoConfig as CapoConfig_2 } from '../../CapoTypes.js';
import type { CapoCtx } from './UnspecializedDelegate.typeInfo.js';
import type { CapoCtx as CapoCtx_2 } from './Reqts.concrete.typeInfo.js';
import type { CapoCtxLike } from './UnspecializedDelegate.typeInfo.js';
import type { CapoCtxLike as CapoCtxLike_2 } from './Reqts.concrete.typeInfo.js';
import type { CapoDatum$CharterDataLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoDatum$CharterDataLike as CapoDatum$CharterDataLike_2 } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { CapoDatum$CharterDataLike as CapoDatum$CharterDataLike_3 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoDatum$CharterDataLike as CapoDatum$CharterDataLike_4 } from './Reqts.concrete.typeInfo.js';
import type { CapoDatum$DelegatedDataLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoDatum$Ergo$CharterData } from './CapoHeliosBundle.typeInfo.js';
import type { CapoDatum$Ergo$CharterData as CapoDatum$Ergo$CharterData_2 } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { CapoDatum$Ergo$DelegatedData } from './CapoHeliosBundle.typeInfo.js';
import type { CapoDatum as CapoDatum_2 } from './CapoHeliosBundle.typeInfo.js';
import type { CapoLifecycleActivity$CreatingDelegateLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoLifecycleActivity$CreatingDelegateLike as CapoLifecycleActivity$CreatingDelegateLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoLifecycleActivity$CreatingDelegateLike as CapoLifecycleActivity$CreatingDelegateLike_3 } from './Reqts.concrete.typeInfo.js';
import type { CapoLifecycleActivity$forcingNewMintDelegateLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoLifecycleActivity$forcingNewMintDelegateLike as CapoLifecycleActivity$forcingNewMintDelegateLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoLifecycleActivity$forcingNewMintDelegateLike as CapoLifecycleActivity$forcingNewMintDelegateLike_3 } from './Reqts.concrete.typeInfo.js';
import type { CapoLifecycleActivity$forcingNewSpendDelegateLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoLifecycleActivity$forcingNewSpendDelegateLike as CapoLifecycleActivity$forcingNewSpendDelegateLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoLifecycleActivity$forcingNewSpendDelegateLike as CapoLifecycleActivity$forcingNewSpendDelegateLike_3 } from './Reqts.concrete.typeInfo.js';
import type { CapoLifecycleActivity } from './CapoHeliosBundle.typeInfo.js';
import type { CapoLifecycleActivity as CapoLifecycleActivity_2 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoLifecycleActivity as CapoLifecycleActivity_3 } from './Reqts.concrete.typeInfo.js';
import type { CapoLifecycleActivityLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoLifecycleActivityLike as CapoLifecycleActivityLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoLifecycleActivityLike as CapoLifecycleActivityLike_3 } from './Reqts.concrete.typeInfo.js';
import type { CapoManifestEntry } from './CapoHeliosBundle.typeInfo.js';
import type { CapoManifestEntry as CapoManifestEntry_2 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoManifestEntry as CapoManifestEntry_3 } from './Reqts.concrete.typeInfo.js';
import type { CapoManifestEntryLike } from './CapoHeliosBundle.typeInfo.js';
import type { CapoManifestEntryLike as CapoManifestEntryLike_2 } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { CapoManifestEntryLike as CapoManifestEntryLike_3 } from './UnspecializedDelegate.typeInfo.js';
import type { CapoManifestEntryLike as CapoManifestEntryLike_4 } from './Reqts.concrete.typeInfo.js';
import { CapoMinterBundle } from './CapoMinter.hlb.js';
import { CardanoClient } from '@helios-lang/tx-utils';
import type { CardanoTxSubmitter } from '@helios-lang/tx-utils';
import { Cast } from '@helios-lang/contract-utils';
import type { cctx_CharterInputType$InputLike } from './UnspecializedDelegate.typeInfo.js';
import type { cctx_CharterInputType$InputLike as cctx_CharterInputType$InputLike_2 } from './Reqts.concrete.typeInfo.js';
import type { cctx_CharterInputType$RefInputLike } from './UnspecializedDelegate.typeInfo.js';
import type { cctx_CharterInputType$RefInputLike as cctx_CharterInputType$RefInputLike_2 } from './Reqts.concrete.typeInfo.js';
import type { cctx_CharterInputType } from './UnspecializedDelegate.typeInfo.js';
import type { cctx_CharterInputType as cctx_CharterInputType_2 } from './Reqts.concrete.typeInfo.js';
import type { cctx_CharterInputTypeLike } from './UnspecializedDelegate.typeInfo.js';
import type { cctx_CharterInputTypeLike as cctx_CharterInputTypeLike_2 } from './Reqts.concrete.typeInfo.js';
import { CompileOptions } from '@helios-lang/compiler';
import { ConcreteCapoDelegateBundle as ConcreteCapoDelegateBundle_2 } from '../..';
import { ConnectionConfig } from '@cardano-ogmios/client';
import { ContractBasedDelegate as ContractBasedDelegate_2 } from './delegation/ContractBasedDelegate.js';
import type { Cost } from '@helios-lang/uplc';
import type { DataType } from '@helios-lang/compiler';
import { DeferredState as DeferredState_2 } from '../StateMachine.js';
import type { DelegateActivity$CreatingDelegatedDataLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateActivity$CreatingDelegatedDataLike as DelegateActivity$CreatingDelegatedDataLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateActivity$DeletingDelegatedDataLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateActivity$DeletingDelegatedDataLike as DelegateActivity$DeletingDelegatedDataLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateActivity$UpdatingDelegatedDataLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateActivity$UpdatingDelegatedDataLike as DelegateActivity$UpdatingDelegatedDataLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateActivity } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateActivity as DelegateActivity_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateDatum$capoStoredDataLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateDatum$capoStoredDataLike as DelegateDatum$capoStoredDataLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateDatum$Cip68RefTokenLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateDatum$Cip68RefTokenLike as DelegateDatum$Cip68RefTokenLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateDatum$Ergo$capoStoredData } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateDatum$Ergo$capoStoredData as DelegateDatum$Ergo$capoStoredData_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateDatum$Ergo$Cip68RefToken } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateDatum$Ergo$Cip68RefToken as DelegateDatum$Ergo$Cip68RefToken_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateDatum } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateDatum as DelegateDatum_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateLifecycleActivity$ReplacingMeLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateLifecycleActivity$ReplacingMeLike as DelegateLifecycleActivity$ReplacingMeLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateLifecycleActivity } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateLifecycleActivity as DelegateLifecycleActivity_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateLifecycleActivityLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateLifecycleActivityLike as DelegateLifecycleActivityLike_2 } from './Reqts.concrete.typeInfo.js';
import type { DelegateRole } from './CapoHeliosBundle.typeInfo.js';
import type { DelegateRole as DelegateRole_2 } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateRole as DelegateRole_3 } from './Reqts.concrete.typeInfo.js';
import type { DelegateRoleLike } from './CapoHeliosBundle.typeInfo.js';
import type { DelegateRoleLike as DelegateRoleLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { DelegateRoleLike as DelegateRoleLike_3 } from './Reqts.concrete.typeInfo.js';
import { DelegateSetup as DelegateSetup_2 } from './delegation/RolesAndDelegates.js';
import type { DelegationDetail as DelegationDetail_2 } from './UnspecializedDelegate.typeInfo.js';
import type { DelegationDetail as DelegationDetail_3 } from './Reqts.concrete.typeInfo.js';
import type { DelegationDetailLike } from './UnspecializedDelegate.typeInfo.js';
import type { DelegationDetailLike as DelegationDetailLike_2 } from './Reqts.concrete.typeInfo.js';
import { Emulator } from '@helios-lang/tx-utils';
import type { EnumMemberType } from '@helios-lang/compiler';
import type { ErgoBurningActivity } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoBurningActivity as ErgoBurningActivity_2 } from './Reqts.concrete.typeInfo.js';
import type { ErgoCapoActivity } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoCapoDatum } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoCapoDatum as ErgoCapoDatum_2 } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { ErgoCapoLifecycleActivity } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoCapoLifecycleActivity as ErgoCapoLifecycleActivity_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoCapoLifecycleActivity as ErgoCapoLifecycleActivity_3 } from './Reqts.concrete.typeInfo.js';
import { ErgoCapoManifestEntry } from '../scriptBundling/CapoHeliosBundle.typeInfo.js';
import { ErgoCapoManifestEntry as ErgoCapoManifestEntry_2 } from '../index.js';
import type { Ergocctx_CharterInputType } from './UnspecializedDelegate.typeInfo.js';
import type { Ergocctx_CharterInputType as Ergocctx_CharterInputType_2 } from './Reqts.concrete.typeInfo.js';
import type { ErgoDelegateActivity } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoDelegateActivity as ErgoDelegateActivity_2 } from './Reqts.concrete.typeInfo.js';
import type { ErgoDelegateDatum } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoDelegateDatum as ErgoDelegateDatum_2 } from './Reqts.concrete.typeInfo.js';
import type { ErgoDelegateLifecycleActivity } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoDelegateLifecycleActivity as ErgoDelegateLifecycleActivity_2 } from './Reqts.concrete.typeInfo.js';
import type { ErgoDelegateRole } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoDelegateRole as ErgoDelegateRole_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoDelegateRole as ErgoDelegateRole_3 } from './Reqts.concrete.typeInfo.js';
import type { ErgoDelegationDetail } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoDelegationDetail as ErgoDelegationDetail_2 } from './Reqts.concrete.typeInfo.js';
import type { ErgoManifestActivity } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoManifestActivity as ErgoManifestActivity_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoManifestActivity as ErgoManifestActivity_3 } from './Reqts.concrete.typeInfo.js';
import type { ErgoManifestEntryType } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoManifestEntryType as ErgoManifestEntryType_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoManifestEntryType as ErgoManifestEntryType_3 } from './Reqts.concrete.typeInfo.js';
import type { ErgoMinterActivity } from './CapoMinter.typeInfo.js';
import type { ErgoMintingActivity } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoMintingActivity as ErgoMintingActivity_2 } from './Reqts.concrete.typeInfo.js';
import { ErgoPendingCharterChange } from '../scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { ErgoPendingCharterChange as ErgoPendingCharterChange_2 } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoPendingCharterChange as ErgoPendingCharterChange_3 } from './delegation/UnspecializedDelegate.typeInfo.js';
import type { ErgoPendingCharterChange as ErgoPendingCharterChange_4 } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoPendingCharterChange as ErgoPendingCharterChange_5 } from './Reqts.concrete.typeInfo.js';
import type { ErgoPendingDelegateAction } from './CapoHeliosBundle.typeInfo.js';
import type { ErgoPendingDelegateAction as ErgoPendingDelegateAction_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoPendingDelegateAction as ErgoPendingDelegateAction_3 } from './Reqts.concrete.typeInfo.js';
import { ErgoPendingDelegateChange } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { ErgoRelativeDelegateLink } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { ErgoReqtData } from './Reqts.concrete.typeInfo.d.ts';
import type { ErgoSpendingActivity } from './UnspecializedDelegate.typeInfo.js';
import type { ErgoSpendingActivity as ErgoSpendingActivity_2 } from './Reqts.concrete.typeInfo.js';
import { EventEmitter } from 'eventemitter3';
import { HeliosProgramWithCacheAPI } from '@donecollectively/stellar-contracts/HeliosProgramWithCacheAPI';
import { HeliosProgramWithCacheAPI as HeliosProgramWithCacheAPI_2 } from '../dist/HeliosProgramWithCacheAPI.js';
import { InlineTxOutputDatum } from '@helios-lang/ledger';
import { InteractionContext } from '@cardano-ogmios/client';
import type { IntLike } from '@helios-lang/codec-utils';
import { isActivity as isActivity_2 } from '../ActivityTypes.js';
import { LedgerStateQueryClient } from '@cardano-ogmios/client/dist/LedgerStateQuery';
import type { ManifestActivity$addingEntryLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestActivity$addingEntryLike as ManifestActivity$addingEntryLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestActivity$addingEntryLike as ManifestActivity$addingEntryLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestActivity$burningThreadTokenLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestActivity$burningThreadTokenLike as ManifestActivity$burningThreadTokenLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestActivity$burningThreadTokenLike as ManifestActivity$burningThreadTokenLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestActivity$forkingThreadTokenLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestActivity$forkingThreadTokenLike as ManifestActivity$forkingThreadTokenLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestActivity$forkingThreadTokenLike as ManifestActivity$forkingThreadTokenLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestActivity$updatingEntryLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestActivity$updatingEntryLike as ManifestActivity$updatingEntryLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestActivity$updatingEntryLike as ManifestActivity$updatingEntryLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestActivity } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestActivity as ManifestActivity_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestActivity as ManifestActivity_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestActivityLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestActivityLike as ManifestActivityLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestActivityLike as ManifestActivityLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestEntryType$DelegateThreadsLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestEntryType$DelegateThreadsLike as ManifestEntryType$DelegateThreadsLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestEntryType$DelegateThreadsLike as ManifestEntryType$DelegateThreadsLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestEntryType$DgDataPolicyLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestEntryType$DgDataPolicyLike as ManifestEntryType$DgDataPolicyLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestEntryType$DgDataPolicyLike as ManifestEntryType$DgDataPolicyLike_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestEntryType } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestEntryType as ManifestEntryType_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestEntryType as ManifestEntryType_3 } from './Reqts.concrete.typeInfo.js';
import type { ManifestEntryTypeLike } from './CapoHeliosBundle.typeInfo.js';
import type { ManifestEntryTypeLike as ManifestEntryTypeLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { ManifestEntryTypeLike as ManifestEntryTypeLike_3 } from './Reqts.concrete.typeInfo.js';
import type { minimalReqtData } from './Reqts.concrete.typeInfo.d.ts';
import type { MinterActivity$CreatingNewSpendDelegateLike } from './CapoMinter.typeInfo.js';
import type { MinterActivity } from './CapoMinter.typeInfo.js';
import type { MintingActivityLike } from './UnspecializedDelegate.typeInfo.js';
import type { MintingActivityLike as MintingActivityLike_2 } from './Reqts.concrete.typeInfo.js';
import { MintingPolicyHash } from '@helios-lang/ledger';
import type { MintingPolicyHashLike } from '@helios-lang/ledger';
import { NetworkParams } from '@helios-lang/ledger';
import { PendingCharterChange$Ergo$otherManifestChange } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { PendingCharterChange$otherManifestChangeLike } from './CapoHeliosBundle.typeInfo.js';
import type { PendingCharterChange$otherManifestChangeLike as PendingCharterChange$otherManifestChangeLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingCharterChange$otherManifestChangeLike as PendingCharterChange$otherManifestChangeLike_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingCharterChange } from './CapoHeliosBundle.typeInfo.js';
import type { PendingCharterChange as PendingCharterChange_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingCharterChange as PendingCharterChange_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingCharterChangeLike } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateAction$AddLike } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateAction$AddLike as PendingDelegateAction$AddLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingDelegateAction$AddLike as PendingDelegateAction$AddLike_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingDelegateAction$ReplaceLike } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateAction$ReplaceLike as PendingDelegateAction$ReplaceLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingDelegateAction$ReplaceLike as PendingDelegateAction$ReplaceLike_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingDelegateAction } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateAction as PendingDelegateAction_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingDelegateAction as PendingDelegateAction_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingDelegateActionLike } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateActionLike as PendingDelegateActionLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingDelegateActionLike as PendingDelegateActionLike_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingDelegateChange } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateChange as PendingDelegateChange_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingDelegateChange as PendingDelegateChange_3 } from './Reqts.concrete.typeInfo.js';
import type { PendingDelegateChangeLike } from './CapoHeliosBundle.typeInfo.js';
import type { PendingDelegateChangeLike as PendingDelegateChangeLike_2 } from './UnspecializedDelegate.typeInfo.js';
import type { PendingDelegateChangeLike as PendingDelegateChangeLike_3 } from './Reqts.concrete.typeInfo.js';
import type { Program } from '@helios-lang/compiler';
import { PubKeyHash } from '@helios-lang/ledger';
import { RelativeDelegateLink } from '../scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { RelativeDelegateLink as RelativeDelegateLink_2 } from './CapoHeliosBundle.typeInfo.js';
import type { RelativeDelegateLink as RelativeDelegateLink_3 } from './CapoMinter.typeInfo.js';
import type { RelativeDelegateLink as RelativeDelegateLink_4 } from './UnspecializedDelegate.typeInfo.js';
import type { RelativeDelegateLink as RelativeDelegateLink_5 } from './Reqts.concrete.typeInfo.js';
import type { RelativeDelegateLinkLike } from './CapoHeliosBundle.typeInfo.js';
import type { RelativeDelegateLinkLike as RelativeDelegateLinkLike_2 } from './CapoMinter.typeInfo.js';
import type { RelativeDelegateLinkLike as RelativeDelegateLinkLike_3 } from './helios/scriptBundling/CapoHeliosBundle.typeInfo.js';
import type { RelativeDelegateLinkLike as RelativeDelegateLinkLike_4 } from './UnspecializedDelegate.typeInfo.js';
import type { RelativeDelegateLinkLike as RelativeDelegateLinkLike_5 } from './Reqts.concrete.typeInfo.js';
import type { ReqtData } from './Reqts.concrete.typeInfo.d.ts';
import type { ReqtData as ReqtData_2 } from './Reqts.concrete.typeInfo.js';
import type { ReqtDataLike } from './Reqts.concrete.typeInfo.d.ts';
import type { ReqtDataLike as ReqtDataLike_2 } from './Reqts.concrete.typeInfo.js';
import { ReqtsConcreteBundle } from './Reqts.concrete.hlb.js';
import { ReqtsMap as ReqtsMap_2 } from './Requirements.js';
import { ReqtsMap as ReqtsMap_3 } from '../Requirements.js';
import { Signature } from '@helios-lang/ledger';
import { SimpleWallet } from '@helios-lang/tx-utils';
import type { Site } from '@helios-lang/compiler-utils';
import { Source } from '@helios-lang/compiler-utils';
import type { SpendingActivityLike } from './UnspecializedDelegate.typeInfo.js';
import type { SpendingActivityLike as SpendingActivityLike_2 } from './Reqts.concrete.typeInfo.js';
import { StellarDelegate as StellarDelegate_2 } from './delegation/StellarDelegate.js';
import type { SubmissionExpiryError } from '@helios-lang/tx-utils';
import type { SubmissionUtxoError } from '@helios-lang/tx-utils';
import { encodeUtf8 as textToBytes } from '@helios-lang/codec-utils';
import { tokenPredicate as tokenPredicate_2 } from '../UtxoHelper.js';
import { TransactionSubmissionClient } from '@cardano-ogmios/client/dist/TransactionSubmission';
import { Tx } from '@helios-lang/ledger';
import { TxBuilder } from '@helios-lang/tx-utils';
import { TxChainBuilder } from '@helios-lang/tx-utils';
import { TxId } from '@helios-lang/ledger';
import { TxInput } from '@helios-lang/ledger';
import { TxOutput } from '@helios-lang/ledger';
import { TxOutputDatum } from '@helios-lang/ledger';
import { TxOutputId } from '@helios-lang/ledger';
import { TxOutputIdLike } from '@helios-lang/ledger';
import type { TypeSchema } from '@helios-lang/type-utils';
import UnspecializedDelegateScript from './src/delegation/UnspecializedDelegate.hl';
import { UnspecializedDgtBundle as UnspecializedDgtBundle_2 } from '../delegation/UnspecializedDelegate.hlb.js';
import { UnspecializedDgtBundle as UnspecializedDgtBundle_3 } from './UnspecializedDelegate.hlb.js';
import { UplcData } from '@helios-lang/uplc';
import type { UplcLogger } from '@helios-lang/uplc';
import { UplcProgramV2 } from '@helios-lang/uplc';
import { UplcRecord } from '../../StellarContract.js';
import { UplcSourceMapJsonSafe } from '@helios-lang/uplc';
import { ValidatorHash } from '@helios-lang/ledger';
import { Value } from '@helios-lang/ledger';
import { valuesEntry as valuesEntry_2 } from './HeliosPromotedTypes.js';
import { Wallet } from '@helios-lang/tx-utils';
import { WalletHelper } from '@helios-lang/tx-utils';

declare type $states<SM extends StateMachine<any, any>> = SM extends StateMachine<infer S, any> ? S : never;

declare type $transitions<SM extends StateMachine<any, any>> = SM extends StateMachine<any, infer T> ? T : never;

/**
 * short version of address for compact display
 * @public
 */
export declare function abbrevAddress(address: Address): string;

/**
 * short version of hex string for compact display
 * @internal
 */
export declare function abbreviatedDetail(hext: string, initLength?: number, countOmitted?: boolean): string;

/**
 * short representation of bytes for compact display
 * @public
 */
export declare function abbreviatedDetailBytes(prefix: string, value: number[], initLength?: number): string;

/**
 * @public
 */
export declare type abstractContractBridgeClass = typeof ContractDataBridge & {
    isAbstract: true;
};

/**
 * @public
 */
export declare type AbstractNew<T = any> = abstract new (...args: any) => T;

/**
 * Decorators for on-chain activity (redeemer) factory functions
 * @public
 **/
export declare const Activity: {
    /**
     * Decorates a partial-transaction function that spends a contract-locked UTxO using a specific activity ("redeemer")
     * @remarks
     *
     * activity-linked transaction-partial functions must follow the txn\{...\}
     * and active-verb ("ing") naming conventions.  `txnRetiringDelegation`,
     * `txnModifyingVote` and `txnWithdrawingStake` would be examples
     * of function names following this guidance.
     *
     * @public
     **/
    partialTxn(proto: any, thingName: any, descriptor: any): any;
    /**
     * Decorates a factory-function for creating tagged redeemer data for a specific on-chain activity
     * @remarks
     *
     * The factory function should follow an active-verb convention by including "ing" in
     * the name of the factory function
     *
     * Its leading prefix should also match one of 'activity', 'burn', or 'mint'.  These
     * conventions don't affect the way the activity is verified on-chain, but they
     * provide guard-rails for naming consistency.
     * @public
     **/
    redeemer(proto: any, thingName: any, descriptor: any): any;
    redeemerData(proto: any, thingName: any, descriptor: any): any;
};

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ActivityDelegateRoleHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ActivityDelegateRoleHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_2, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ActivityDelegateRoleHelperNested_3 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_3, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): {
        redeemer: UplcData;
    };
}

/**
 * @public
 */
export declare type ActorContext<WTP extends Wallet = Wallet> = {
    wallet?: WTP;
    others: Record<string, WTP>;
};

/**
 * Renders an address in shortened bech32 form, with prefix and part of the bech32 suffix
 * @remarks
 * @param address - address
 * @public
 **/
export declare function addrAsString(address: Address): string;

declare type addRefInputArgs = Parameters<TxBuilder["refer"]>;

/**
 * @public
 */
export declare type aggregatedStateString = `pending` | `${numberString} confirming` | `${numberString} submitting` | `${numberString} confirmed` | `${numberString} failed` | `${numberString} mostly confirmed`;

/**
 * @public
 */
export declare type AllDeployedScriptConfigs = {
    [scriptModuleName: string]: ScriptDeployments;
};

/**
 * @public
 */
declare interface AllTxSubmissionStates {
    [txId: string]: TxSubmissionTracker;
}

/**
 * @public
 */
export declare class AlreadyPendingError extends TxNotNeededError {
    constructor(message: string);
}

/**
 * Token-based authority
 * @remarks
 *
 * Transferrable authority using a unique token and no smart-contract.
 *     Network,
 Wallet,

 * @public
 **/
export declare class AnyAddressAuthorityPolicy extends AuthorityPolicy {
    loadBundle(params: any): undefined;
    usesContractScript: false;
    getContractScriptParams(): {
        rev: bigint;
    };
    get delegateValidatorHash(): undefined;
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string, options?: UtxoSearchScope): Promise<TxInput>;
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo: TxInput): Promise<TCX>;
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput, redeemer?: isActivity): Promise<TCX>;
    DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput): Promise<TCX>;
}

/**
 * @public
 */
export declare type AnyDataTemplate<TYPENAME extends string, others extends anyDatumProps> = {
    [key in string & ("id" | "type" | keyof Omit<others, "id">)]: key extends "id" ? string : key extends "type" ? TYPENAME : others[key];
};

/**
 * Properties for Datum structures for on-chain scripts
 * @public
 **/
export declare type anyDatumProps = Record<string, any>;

declare type AnyPromise<T> = Promise<T> | WrappedPromise<T> | ResolveablePromise<T>;

/**
 * @public
 */
export declare type AnySC = StellarContract<any>;

/**
 * A base state for a transaction context
 * @public
 **/
export declare interface anyState {
    uuts: uutMap;
}

/**
 * @public
 */
declare type anyUplcProgram = UplcProgramV2;

/**
 * Converts an array of [ policyId, ‹tokens› ] tuples for on-screen presentation
 * @remarks
 *
 * Presents policy-ids with shortened identifiers, and shows a readable & printable
 * representation of token names even if they're not UTF-8 encoded.
 * @public
 **/
export declare function assetsAsString(a: Assets, joiner?: string, showNegativeAsBurn?: "withBURN", mintRedeemers?: Record<number, string>): string;

/**
 * Generic class as base for pure authorization
 * @remarks
 *
 * This isn't different from StellarDelegate, but
 * using it as a base class more specific than "any delegate"
 * gives useful semantics for Capo's govAuthority role
 * @public
 **/
export declare abstract class AuthorityPolicy extends StellarDelegate {
}

/**
 * @public
 */
export declare type basicDelegateMap<anyOtherRoles extends {
    [k: string]: DelegateSetup<any, StellarDelegate, any>;
} = {}> = {
    [k in keyof anyOtherRoles | keyof basicDelegateRoles]: (k extends keyof anyOtherRoles ? anyOtherRoles[k] : k extends keyof basicDelegateRoles ? basicDelegateRoles[k] : never);
};

/**
 * @public
 */
export declare type basicDelegateRoles = {
    govAuthority: DelegateSetup<"authority", StellarDelegate, any>;
    mintDelegate: DelegateSetup<"mintDgt", BasicMintDelegate, any>;
    spendDelegate: DelegateSetup<"spendDgt", ContractBasedDelegate, any>;
};

/**
 * Serves a delegated minting-policy role for Capo contracts
 * @remarks
 *
 * shifts detailed minting policy out of the minter and into the delegate.
 *
 * By default, this delegate policy serves also as a spend delegate.  To use a separate
 * spend delegate, define `static isMintAndSpendDelegate = false;` in the subclass,
 * define a separate ContractBasedDelegate subclass for the spend delegate, and
 * register it in the Capo contract's `delegateRoles.spendDelegate`.
 *
 * @public
 **/
export declare class BasicMintDelegate extends ContractBasedDelegate {
    static currentRev: bigint;
    static isMintDelegate: boolean;
    dataBridgeClass: GenericDelegateBridgeClass;
    /**
     * Enforces that the mint delegate needs gov-authority by default
     */
    get needsGovAuthority(): boolean;
    get delegateName(): string;
    static isMintAndSpendDelegate: boolean;
    /**
     * the scriptBundle for the BasicMintDelegate looks concrete,
     * but it's actually just referencing a generic, unspecialized delegate script
     * that may not provide much value to any specific application.
     *
     * Subclasses should expect to override this and provide a specialized
     * `get scriptBundle() { return new ‹YourMintDelegateBundle› }`, using
     *  a class you derive from CapoDelegateBundle and your own delegate
     * specialization.  TODO: a generator to make this easier.  Until then,
     * you can copy the UnspecializedDelegate.hl and specialize it.
     */
    scriptBundleClass(): Promise<UnspecializedDgtBundle_2>;
    static get defaultParams(): {
        delegateName: string;
        isMintDelegate: boolean;
        isDgDataPolicy: boolean;
        isSpendDelegate: boolean;
        requiresGovAuthority: boolean;
        rev: bigint;
    };
    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * creation of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer.
     * @public
     */
    activityCreatingDelegatedData(seedFrom: hasSeed, uutPurpose: string): isActivity;
    /**
     * A mint-delegate activity indicating that a delegated-data controller UUT is being created
     * to govern a class of delegated data.  ONLY the indicated data-controller UUT must be minted,
     * and is expected to be deposited into the data-controller's policy-script address.  Use the
     * {@link DelegatedDataContract} class to create the off-chain data controller and its on-chain policy.
     */
    activityCreatingDataDelegate(seedFrom: hasSeed, uutPurpose: string): isActivity;
    mkDatumScriptReference(): any;
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemerActivity: isActivity, options?: GrantAuthorityOptions): Promise<TCX>;
}

/**
 * The parameters for the Capo's basic minter
 * @public
 */
export declare type BasicMinterParams = configBase & SeedTxnScriptParams & {
    capo: Capo<any>;
};

/**
 * Gathers and manages submission of a batch of linked transactions
 * @remarks
 * Initialized with a pool of named submitters, the batch-submit controller
 * gathers a set of transactions in collaboration with one or more
 * transaction-context ("tcx" or StellarTxnContext) objects.
 *
 * Those tcx's provide the batch controller with a set of tx-descriptions,
 * either describing themselves `{id, description, tcx, ...}` or describing
 * a set of linked `addlTxns`.  Each of those linked transactions may itself
 * resolve to a tcx having its own bounded set of `addlTxns`.  This leads
 * to an eventually-bounded tree of resolved transactions, each having
 * a short, locally-unique string `id`.  The submit controller
 * shepherds those transactions through their path from being
 * known-but-abstract (description-only), to being resolved, then
 * signed as needed and submitted through TxSubmitMgr objects.
 *
 * The tx-descriptions added to the batch-controller are exposed for
 * presentation in the UI layer, and each one also contains a notifier
 * object - an event emitter that the UI can use to easily subscribe to
 * changes in the state of each transaction as it makes progress.
 *
 * It is expected that the transaction batch will generally be signed as
 * a unit after on-screen review, either with a wallet-specific "sign multiple"
 * strategy or using a series of individual tx-signing interactions (i.e. with
 * less-capable wallet interfaces).  To achieve this, the batch controller is
 * designed to use a signing-strategy object, which works in the abstract
 * on either individual transactions or the entire batch.  When working
 * with wallets having various different mechanisms or APIs for multi-signing
 * (or not having them), the strategy object provides a simple interface to
 * support wallet-specific implementation of the intended result.
 *
 * For single-tx-signers, the signing-strategy object is expected to indicate
 * step-wise progress, so the UI can be signalled to incrementally present
 * related details about each tx as appropriate for the dApp's user-interaction
 * model).  Full-batch signing strategies SHOULD NOT emit single-tx signing
 * signals.
 *
 * Once the signature(s) are collected for any tx, the submit-controller
 * creates txSubmitMgrs for that tx, and it aggregates the net state of
 * each transaction's submission progress. The aggregated information
 * about per-tx progress is included in state updates emitted to subscribers
 * of that transaction's change-notification events, for UI-level presentation
 * purposes.
 * @public
 */
export declare class BatchSubmitController {
    readonly submitters: namedSubmitters;
    setup: SetupInfo;
    submitOptions: SubmitOptions & TxSubmitCallbacks;
    $stateInfoCombined: aggregatedStateString[];
    $stateShortSummary: stateSummary;
    $txStates: AllTxSubmissionStates;
    $registeredTxs: AllTxSubmissionStates;
    isOpen: boolean;
    isConfirmationComplete: boolean;
    readonly _mainnet: boolean;
    nextUpdate?: TimeoutId;
    signingStrategy: WalletSigningStrategy;
    $txChanges: EventEmitter<TxBatchChangeNotifier>;
    destroyed: boolean;
    get chainBuilder(): TxChainBuilder | undefined;
    destroy(): void;
    notDestroyed(): void;
    constructor(options: BatchSubmitControllerOptions);
    isMainnet(): boolean;
    txId(tx: Tx): string;
    changeTxId(oldId: string, newId: string): void;
    map<T>(fn: ((txd: TxSubmissionTracker, i: number) => T) | ((txd: TxSubmissionTracker) => T)): T[];
    $addTxns(tcx: StellarTxnContext): any;
    $addTxns(txd: TxDescription<any, any>): any;
    $addTxns(txds: TxDescription<any, any>[]): any;
    $txInfo(id: string): TxSubmissionTracker;
    submitToTestnet(txd: TxDescription<any, "built">, tracker: TxSubmissionTracker): void;
    addTxDescr(txd: TxDescription<any, any>): void;
    get $allTxns(): TxSubmissionTracker[];
    txError(txd: TxDescriptionWithError): Promise<void>;
    /**
     * triggers all the transactions in the batch to be signed
     * and submitted.
     * @remarks
     * While the transactions are being signed, the signing-strategy
     * object will emit incremental status updates (the "signingSingleTx" event)
     * if it only supports signing one tx at a time.  If it supports multiple
     * tx signing, it should emit a single "signingAll" event instead.
     *
     * UI implementations are expected to listen for signingSingleTx events
     * and present a useful summary of the current transation being signed,
     * to ease the user's understanding of the signing process.
     *
     * If signing is successful, the batch controller will continue by
     * submitting each transation for submission through each of
     * the submitters configured on the batch controller.
     *
     * The controller and individual tx-submission trackers will continue
     * emitting status update events as each tx makes progress.  UIs
     * should continue reflecting updated state information to the user.
     * @public
     */
    $signAndSubmitAll(): Promise<void>;
    /**
     * Updates the aggregate state of the tx batch and notifies listeners
     * @remarks
     * The aggregate state is a summary of the state of all the tx's in the batch.
     *
     * It counts the number of tx's in each state, and emits a  `statusUpdate`
     * event to the batch-controller's {@link BatchSubmitController.$txChanges|txChanges}
     * event stream.
     *
     * The result is
     * @public
     */
    updateAggregateState(): void;
    reqts(): {
        "allows multiple underlying submitters": {
            purpose: string;
            mech: string[];
        };
        "uses the basic hasUtxo() function to check for transaction inclusion": {
            purpose: string;
            mech: string[];
        };
        "accepts multiple txns for persistent async submission": {
            purpose: string;
            mech: string[];
        };
        "is resistant to slot battles and rollbacks": {
            purpose: string;
            mech: string[];
        };
        "has an organized structure for the state of submitting each txn": {
            purpose: string;
            mech: string[];
        };
    };
}

/**
 * @public
 */
export declare type BatchSubmitControllerOptions = {
    submitters: namedSubmitters;
    setup: SetupInfo;
    signingStrategy: WalletSigningStrategy;
    submitOptions?: SubmitOptions & TxSubmitCallbacks;
};

/**
 * @public
 */
export declare const betterJsonSerializer: (key: any, value: any) => any;

declare type bootstrappedCapoConfig = {
    bsc: CapoConfig;
    uuts: uutMap;
    bootstrappedConfig: any;
};

declare type BuiltTcx = {
    tx: Tx;
} & BuiltTcxStats;

declare type BuiltTcxStats = {
    willSign: PubKeyHash[];
    walletMustSign: boolean;
    wallet: Wallet;
    wHelper: WalletHelper<any>;
    costs: {
        total: Cost;
        [key: string]: Cost;
    };
};

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class BurningActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1BA: number[];
    }, {
        _placeholder1BA: number[];
    }>;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::BurningActivity._placeholder1BA"***
     */
    _placeholder1BA(recId: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class BurningActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        DeletingRecord: number[];
    }, {
        DeletingRecord: number[];
    }>;
    /**
     * generates  UplcData for ***"ReqtsData::BurningActivity.DeletingRecord"***
     */
    DeletingRecord(id: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class BurningActivityHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1BA: number[];
    }, {
        _placeholder1BA: number[];
    }>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::BurningActivity._placeholder1BA"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    _placeholder1BA(recId: number[]): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***BurningActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class BurningActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        DeletingRecord: number[];
    }, {
        DeletingRecord: number[];
    }>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::BurningActivity.DeletingRecord"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DeletingRecord(id: number[]): isActivity;
}

/**
 * Renders a byteArray in printable form, assuming it contains (mostly) text
 * @remarks
 *
 * Because it uses {@link hexToPrintableString | hexToPrintableString()}, it will render any non-printable
 * characters using ‹hex› notation.
 * @param ba - the byte array
 * @public
 **/
export declare function byteArrayAsString(ba: ByteArrayData): string;

/**
 * Converts a list of ByteArrays to printable form
 * @remarks
 *
 * ... using {@link hexToPrintableString}
 * @public
 **/
export declare function byteArrayListAsString(items: ByteArrayData[], joiner?: string): string;

export { bytesToText }

/**
 * @internal
 */
export declare type callWith<ARGS, T extends DataBridge> = T & ((x: ARGS) => ReturnType<T["ᱺᱺcast"]["toUplcData"]>);

/**
 * @public
 */
export declare type canHaveDataBridge = {
    dataBridgeClass?: AbstractNew<ContractDataBridge>;
};

declare type canHaveToken = TxInput | TxOutput | Assets;

/**
 * @public
 */
export declare type CANNOT_ERROR = never;

/**
 * Base class for leader contracts, with predefined roles for cooperating/delegated policies
 * @remarks
 *
 * A Capo contract provides a central contract address that can act as a treasury or data registry;
 * it can mint tokens using its connected minting-policy, and it can delegate policies to other contract
 * scripts.  Capo contract can use these capabilities in custom ways for strong flexibility.
 *
 * ### Defining Delegates
 * Any Capo contract can define delegateRoles() to establish custom collaborating scripts; these are used for
 * separating granular responsbilities for different functional purposes within your (on-chain and off-chain)
 * application; this approach enables delegates to use any one of multiple strategies with different
 * functional logic to serve in any given role, thus providing flexibility and extensibility.
 *
 * Capo provides roles for govAuthority and mintDelegate, and methods to facilitate
 * the lifecycle of charter creation & update.   Define a delegateRoles data structure using
 * the standalone helper function of that name, use its type in your `extends Capo<...>` clause,
 * and return that delegate map from the `delegateRoles()` method in your subclass.
 *
 * You may wish to use the `basicRoles()` helper function to easily access any of the default
 * mint/ spend/ authority delegate definitions, and the defineRole() method to make additional
 * roles for your application's data types.
 *
 * ### The Delegation Pattern and UUTs
 *
 * The delegation pattern uses UUTs, which are non-fungible / ***unique utility tokens***.  This is
 * equivalent to a "thread token" - a provable source of self-authority or legitimacy for contract
 * UTxOs.  Without the UUT, a contract UTxO is just a piece of untrusted data; with the UUT, it
 * can be blessed with proactive policy enforcement during creation.
 *
 * Architecturally, UUTs provide a simple and unique handle for the Capo to use as a  **required transaction element**
 * in key operational activities (like updating the charter details); so that the delegate holding the UUT is entrusted to
 * approved the UUT's inclusion in a transaction, with all the policy-enforcement implicated on the other end of the
 * delegation.
 *
 * UUTs can be used to form a positive linkage between the Capo (which should normally retain a reference
 * to that UUT) and any delegate; that delegate is most commonly another contract script also
 * referenced within the roles() definition.
 *
 *  * **Example: Multisig authority delegation** - a Capo contract would get much more complicated if it
 * contained multisig logic.  Instead, the governance authority for the Capo can be delegated to a
 * standalone multi-sig contract, which can contain all (and only) the multi-sig logic.  Separating the
 * responsibilities makes each part simpler, easing the process of ensuring each part is doing its job :pray:
 *
 * ### UUTs and Delegated Data
 *
 * UUTs can also be used as a form of uniqueness for data stored in the Capo's UTxOs (i.e. a record id).
 * The UTxO only lasts until it is spent, but the UUT's identity can continue along with any value and
 * connected data.
 *
 * Policy delegates provide on-chain delegation of authority for the Capo's data, while being upgradable
 * to support the evolving needs of the application.  Delegated datums store data of various types
 * at the Capo's address, while delegate policies, each at its own address are invoked to enforce creation
 * and update rules for each type of data.
 *
 * @public
 */
export declare abstract class Capo<SELF extends Capo<any>, featureFlags extends CapoFeatureFlags = {}> extends StellarContract<CapoConfig & {
    featureFlags?: Partial<featureFlags>;
}> {
    static currentRev: bigint;
    static currentConfig(): Promise<void>;
    /**
     * Enable auto-setup for delegates in the Capo contract.
     * @remarks
     *
     * This is a flag that can be set to true to enable auto-setup for delegates in the Capo contract.
     * It is currently false by default, meaning that the Capo contract will not automatically setup any delegates.
     *
     * We'll change that to true real soon now.
     */
    autoSetup: boolean;
    isChartered: boolean;
    dataBridgeClass: typeof CapoDataBridge;
    needsCoreDelegateUpdates: boolean;
    usesContractScript: boolean;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get offchain(): mustFindConcreteContractBridgeType<this>["reader"];
    /**
     * @internal
     */
    get reader(): mustFindConcreteContractBridgeType<this>["reader"];
    /**
     * Accessor for generating activity-data ("redeemer") values for use in transactions.
     * @remarks
     * This object contains named accessors for generating activity-data values for each
     * activity type defined in the contract's on-chain scripts.
     *
     * Most activity types on the Capo are used implicitly by the other methods on the Capo,
     * so you may seldom need to use this object directly.
     *
     * @example
     * ```typescript
     * const activity = capo.activity.usingAuthority;
     * ```
     */
    get activity(): mustFindActivityType<this>;
    get mkDatum(): mustFindDatumType<this>;
    /**
     * @internal
     */
    get defaultFeatureFlags(): featureFlags;
    /**
     * @internal
     */
    featureEnabled(f: keyof featureFlags): boolean;
    get canPartialConfig(): boolean;
    get newReadDatum(): mustFindReadDatumType<this>;
    getBundle(): Promise<CapoHeliosBundle>;
    scriptBundleClass(): Promise<typeof CapoHeliosBundle>;
    mkScriptBundle(setupDetails?: StellarBundleSetupDetails<any>): Promise<any>;
    /**
     * Reveals any bootstrapping details that may be present during initial creation
     * of the Capo contract, for use during and immediately after charter-creation.
     *
     * @public
     **/
    bootstrapping?: {
        [key in "govAuthority" | "mintDelegate" | "spendDelegate"]: ConfiguredDelegate<any>;
    };
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    static get defaultParams(): {
        rev: bigint;
    };
    init(args: StellarSetupDetails<CapoConfig & {
        featureFlags?: Partial<featureFlags>;
    }>): Promise<this>;
    static bootstrapWith(args: StellarSetupDetails<CapoConfig>): any;
    /**
     * Creates any additional transactions needed during charter creation
     * @public
     * @remarks
     *
     * This method is a hook for subclasses to add extra transactions during the
     * charter creation process.  It is called during the creation of the charter transaction.
     *
     * The Capo has a {@link Capo.bootstrapping|`bootstrapping`} property that can be
     * referenced as needed during extra transaction creation.
     *
     * The provided transaction context has state.charterData in case it's needed.
     *
     * This method should use {@link StellarTxnContext.includeAddlTxn} to add transactions
     * to the context.
     *
     **/
    mkAdditionalTxnsForCharter<TCX extends hasAddlTxns<StellarTxnContext<any>>>(tcx: TCX, options: {
        charterData: CharterData;
        capoUtxos: TxInput[];
    }): Promise<hasAddlTxns<TCX>>;
    get minterClass(): stellarSubclass<CapoMinter>;
    minter: CapoMinter;
    /**
     * returns a value representing the provided UUT(s)
     * @remarks
     *
     * The inputs can be of a few forms - see the overload variants
     * @param uutMap - a set of UUTs, all of which will be represented in the returned value
     * @param tcx - a transaction context, whose `state.uuts` will be processed as in the `uutMap` variant
     * @param uutName - a UutName object representinga single UUT
     * @public
     **/
    uutsValue(uutMap: uutPurposeMap<any>): Value;
    /**
     * from all the uuts in the transaction context
     **/
    uutsValue(tcx: hasUutContext<any>): Value;
    /**
     * from a single uut name or byte array
     */
    uutsValue(uutName: UutName | number[]): Value;
    /**
     * mockable method to make testing easier
     * @internal
     */
    mkUutValuesEntries(uutNameOrMap: UutName[] | uutPurposeMap<any>): valuesEntry_2[];
    activityUsingAuthority(): isActivity;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    get charterTokenPredicate(): tokenPredicate<any>;
    tokenAsValue(tokenName: string | number[] | UutName, count?: bigint): Value;
    canFindCharterUtxo(capoUtxos: TxInput[]): Promise<TxInput | undefined>;
    mustFindCharterUtxo(capoUtxos?: TxInput[]): Promise<TxInput>;
    /**
     * @deprecated - use tcxWithCharterRef() instead
     */
    txnAddCharterRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasCharterRef>;
    /**
     * Ensures the transaction context has a reference to the charter token
     * @remarks
     *
     * Accepts a transaction context that may already have a charter reference.  Returns a typed
     * tcx with hasCharterRef type.
     *
     * The transaction is typed with the presence of the charter reference (found in tcx.state.charterRef).
     *
     * If the charter reference is already present in the transaction context, the transaction will not be modified.
     */
    tcxWithCharterRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasCharterRef>;
    tcxWithSettingsRef<TCX extends StellarTxnContext>(this: SELF, tcx: TCX, { charterData, capoUtxos, }: {
        charterData: CharterData;
        capoUtxos: TxInput[];
    }): Promise<TCX & hasSettingsRef<any, any>>;
    /**
     * finds and spends the Capo's charter utxo, typically for updating
     * its CharterData datum.
     */
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newCharterData?: CharterDataLike): Promise<TCX>;
    /**
     * @deprecated - use {@link Capo.tcxWithCharterRef |tcxWithCharterRef(tcx)} instead
     */
    txnMustUseCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, useReferenceInput: "refInput" | true): Promise<TCX>;
    txnUpdateCharterUtxo<TCX extends StellarTxnContext>(tcx: TCX, redeemer: isActivity, newDatum: CharterDataLike): Promise<StellarTxnContext | never>;
    txnKeepCharterToken<TCX extends StellarTxnContext>(tcx: TCX, datum: TxOutputDatum): TCX;
    /**
     * adds the charter-token, along with its gov-authority UUT, to a transaction context
     * @remarks
     *
     * Uses txnAddGovAuthority() to locate the govAuthority delegate and txnGrantAuthority() to
     * add its authority token to a transaction.
     *
     * The charter-token is included as a reference input.
     *
     * @param tcx - the transaction context
     * @public
     **/
    txnAddGovAuthorityTokenRef<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    txnMustUseSpendDelegate<TCX extends hasCharterRef>(tcx: TCX, spendDelegate: ContractBasedDelegate, activity: isActivity): Promise<TCX & hasSpendDelegate>;
    /**
     * provides minter-targeted params extracted from the input configuration
     * @remarks
     *
     * extracts the seed-txn details that are key to parameterizing the minter contract
     * @public
     **/
    getMinterParams(): {
        seedTxn: TxId;
        seedIndex: bigint;
    };
    get mph(): MintingPolicyHash;
    get mintingPolicyHash(): MintingPolicyHash;
    findActorUut(uutPrefix: string, mph?: MintingPolicyHash): Promise<FoundUut | undefined>;
    /**
     * parses details in a delegate-link
     * @deprecated - use an adapter for CharterData instead?
     */
    offchainLink<T extends MinimalDelegateLink | OffchainPartialDelegateLink | RelativeDelegateLinkLike_3>(link: T): T;
    parseDgtConfig(inLink: // | MinimalDelegateLink
    ErgoRelativeDelegateLink | RelativeDelegateLinkLike_3): Partial<capoDelegateConfig>;
    serializeDgtConfig(config: Partial<capoDelegateConfig>): number[];
    /**
     * @deprecated - use the bridge type directly, and parseDgtConfig iff we ever need that.
     */
    parseDelegateLinksInCharter(charterData: CharterData): void;
    /**
     * finds charter data for a capo.
     * @remarks
     * Accepts a current utxo for that charter
     * @public
     */
    findCharterData(currentCharterUtxo?: TxInput, options?: {
        optional: false;
        capoUtxos?: TxInput[];
    }): Promise<CharterData>;
    /**
     * Finds charter data for a Capo, if available.  Otherwise, returns undefined.
     * @public
     */
    findCharterData(currentCharterUtxo: TxInput | undefined, options: {
        optional: true;
        capoUtxos?: TxInput[];
    }): Promise<CharterData | undefined>;
    findCharterData(currentCharterUtxo?: TxInput, options?: {
        optional: boolean;
        capoUtxos?: TxInput[];
    }): Promise<CharterData>;
    /**
     * Finds the currentSettings record for a Capo
     * @remarks
     * A Capo's currentSettings can be different in any deployment, but
     * any deployment can have one.  This function finds the currentSettings
     * as found in the Capo's `charterData.manifest`, and returns it with its
     * underlying `data` and possible application-layer `dataWrapped` object.
     *
     * Provide charterData and capoUtxos to resolve the currentSettings without
     * extra queries.
     *
     * Define your SettingsController as a subclass of WrappedDgDataContract
     * to provide a custom data-wrapper.
     *
     * If your protocol doesn't use settings, you probably aren't using
     * this method.  If you are writing some protocol-independent code, be sure
     * to use the `optional` attribute and be robust to cases of "no settings yet"
     * and "the specific current protocol doesn't use settings at all".
     *
     * Future: we will cache charterData and UTxOs so that this function will be
     * simpler in its interface and fast to execute without external management
     * of `{charterData, capoUtxos}`.
     * @public
     */
    findSettingsInfo(this: SELF, options?: {
        charterData?: CharterData;
        capoUtxos?: TxInput[];
        optional?: boolean;
    }): Promise<FoundDatumUtxo<any, any> | undefined>;
    /**
     * @public
     */
    addStrellaWithConfig<SC extends StellarContract<any>>(TargetClass: stellarSubclass<SC>, config: ConfigFor<SC>, previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    }): Promise<SC>;
    connectMintingScript(params: SeedTxnScriptParams): Promise<CapoMinter>;
    /**
     * Finds a sufficient-sized utxo for seeding one or more named tokens
     * @remarks
     *
     * For allocating a charter token (/its minter), one or more UUTs, or other token name(s)
     * to be minted, this function calculates the size of minUtxo needed for all the needed tokens,
     * assuming they'll each be stored in separate utxos.  It then finds and returns a UTxO from the
     * current actor's wallet.  The utxo is NOT implicitly added to the transaction (use tcx.addInput() to add it).
     *
     * When the transaction context already has some utxo's being consumed, they're not
     * eligible for selection.
     *
     * If the transaction doesn't store the new tokens in separate utxos, any spare lovelace
     * are returned as change in the transaction.
     *
     * @param tcx - transaction context
     * @param purpose - a descriptive purpose used during utxo-finding in case of problems
     * @param tokenNames - the token names to be seeded.
     * @public
     **/
    txnMustGetSeedUtxo(tcx: StellarTxnContext, purpose: string, tokenNames: string[]): Promise<TxInput | never>;
    /**
     * Creates a new delegate link, given a delegation role and and strategy-selection details
     * @param tcx - A transaction-context having state.uuts[roleName] matching the roleName
     * @param role - the role of the delegate, matched with the `delegateRoles()` of `this`
     * @param delegateInfo - partial detail of the delegation with any
     *     details required by the particular role.  Its delegate type may be a subclass of the type
     *     indicated by the `roleName`.
     * @remarks
     *
     * Combines partal and implied configuration settings, validating the resulting configuration.
     *
     * It expects the transaction-context to have a UUT whose name (or a UUT roleName) matching
     * the indicated `roleName`.  Use {@link Capo.txnWillMintUuts|txnWillMintUuts()} or {@link Capo.txnMintingUuts|txnMintingUuts()} to construct
     * a transaction having that and a compliant txn-type.
     *
     * The resulting delegate-linking details can be used with this.mkRelativeDelegateLink() to
     * encode it as an on-chain RelativeLinkLink in the Capo's charter.
     *
     * The delegate-link is by default a contract-based delegate.  If that's not what you want,
     * you can the type-parameters to override it to a more general StellarDelegate type (NOTE: if you
     * find you're needing to specify a more specific contract-based delegate type, please let us know, as
     * our expectation is that the general type for a contract-based delegate should already provide all the
     * necessary type information for all kinds of contract-based delegate subclasses).
     *
     * To get a full DelegateSettings object, use txnCreateDelegateSettings() instead.
     *
     * @public
     *
     * @reqt throws DelegateConfigNeeded with an `errors` entry
     *   ... if there are any problems in validating the net configuration settings.
     * @reqt EXPECTS the `tcx` to be minting a UUT for the delegation,
     *   ... whose UutName can be found in `tcx.state.uuts[roleName]`
     * @reqt combines base settings from the selected delegate class's `defaultParams`
     *   ... adding the delegateRoles()[roleName] configuration for the selected roleName,
     *   ... along with any explicit `config` from the provided `delegateInfo`
     *   ... and automatically applies a `uut` setting.
     *   ... The later properties in this sequence take precedence.
     **/
    txnCreateOffchainDelegateLink<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(tcx: hasUutContext<RN>, role: RN, delegateInfo: OffchainPartialDelegateLink): Promise<ConfiguredDelegate<DT> & Required<OffchainPartialDelegateLink>>;
    /**
     * extracts the key details for creating an on-chain delegate link, given a setup-phase
     * configuration for that delegate.
     */
    mkOnchainRelativeDelegateLink<CT extends ConfiguredDelegate<any>>(configured: CT): RelativeDelegateLinkLike_3;
    /**
     * extracts the key details of a delegate link, given a delegate configuration.
     * @remarks
     * This is valid only during the setup phase of creating a delegate, and does not encode the config entry.
     *
     * use mkRelativeDelegateLink() to encode the config entry, and use this.parseDgtConfig() to decode it.
     */
    extractDelegateLinkDetails<CT extends ConfiguredDelegate<DT> | OffchainPartialDelegateLink, DT extends StellarDelegate | never = CT extends ConfiguredDelegate<infer D> ? D : never>(configured: CT): CT extends ConfiguredDelegate<any> ? CT & OffchainPartialDelegateLink : OffchainPartialDelegateLink;
    /**
     * Generates and returns a complete set of delegate settings, given a delegation role and strategy-selection details.
     * @remarks
     *
     * Maps the indicated delegation role to specific UUT details from the provided transaction-context
     * to provide the resulting settings.  The transaction context isn't modified.
     *
     * Behaves exactly like (and provides the core implementation of) {@link Capo.txnCreateOffchainDelegateLink | txnCreateDelegateLink()},
     * returning additional `roleName` and `delegateClass`, to conform with the DelegateSettings type.
     *
     * ### Overriding the Delegate Type
     * The configuration is typed for a contract-based delegate by default.  If you need a more general
     * StellarDelegate type (for AuthorityPolicy, for example), you can override the type-parameters (if you are finding
     * that you need to specify a more specific contract-based delegate type, please let us know, as our expectation is that
     * the general type for a contract-based delegate should already provide all the necessary type information for all kinds of
     * contract-based delegate subclasses).
     *
     * See txnCreateDelegateLink for further details.
     * @public
     **/
    txnCreateConfiguredDelegate<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(tcx: hasUutContext<RN>, role: RN, delegateInfo: OffchainPartialDelegateLink): Promise<ConfiguredDelegate<DT>>;
    /**
     * loads the pre-compiled minter script from the pre-compiled bundle
     */
    /** note, here in this file we show only a stub.  The heliosRollupBundler
     * actually writes a real implementation that does a JIT import of the
     * precompiled bundle
     */
    loadPrecompiledMinterScript(): Promise<PrecompiledProgramJSON>;
    mkImpliedDelegationDetails(uut: UutName): DelegationDetail;
    _delegateCache: {
        [roleName: string]: {
            [delegateLink: string]: {
                delegate: StellarDelegate;
            };
        };
    };
    connectDelegateWithOnchainRDLink<RN extends string & keyof SELF["_delegateRoles"], DT extends StellarDelegate = ContractBasedDelegate>(role: RN, delegateLink: RelativeDelegateLinkLike_3): Promise<DT>;
    showDelegateLink(delegateLink: RelativeDelegateLinkLike_3): string;
    /**
     * Given a role name and configuration details,
     * finds and creates the class for the delegate in that role.
     * @remarks
     * Uses the deployedDetails from the Capo's bundle
     * for the compiled on-chain script, if available.
     *
     * If the indicated script role is not deployed as a singleton,
     * the deployedName is required, and matched against those
     * instances of the script seen in the bundle's deployedDetails.
     *
     * If the script role has no deployedDetails, the configuredDelegate
     * details are used to compile the script for on-chain use, after
     * which the resulting details should be used to update the bundle's
     * deployedDetails.  Normally this should be done during the build
     * of a new version of the package, resulting in a bundle having
     * "deployedDetails" for a script that is actually created on-chain
     * after the package is installed.
     */
    mustGetDelegate<T extends StellarDelegate>(scriptRole: string, configuredDelegate: PreconfiguredDelegate<T>, deployedName?: string): Promise<T>;
    tvForDelegate(dgtLink: ErgoRelativeDelegateLink): Value;
    mkDelegatePredicate(dgtLink: ErgoRelativeDelegateLink): tokenPredicate<any>;
    activityUpdatingCharter(): isActivity;
    activitySpendingDelegatedDatum(): {
        redeemer: UplcData;
    };
    /**
     * USE THE `delegateRoles` GETTER INSTEAD
     * @remarks
     *
     * - this no-op method is a convenience for Stellar Contracts maintainers
     *   and intuitive developers using autocomplete.
     * - Including it enables an entry
     *   in VSCode "Outline" view, which doesn't include the delegateRoles getter : /
     * @deprecated but please keep as a kind of redirect
     * @public
     **/
    getDelegateRoles(): void;
    get delegateRoles(): basicDelegateMap<any>;
    _delegateRoles: basicDelegateMap<any> & IF_ISANY<ReturnType<SELF["initDelegateRoles"]>, basicDelegateRoles>;
    abstract initDelegateRoles(): basicDelegateMap<any>;
    addressAuthorityConfig(): DelegateConfigDetails<AuthorityPolicy>;
    basicDelegateRoles(): basicDelegateMap;
    verifyIsChartered(): Promise<CapoDatum$Ergo$CharterData_2 | undefined>;
    /**
     * Performs a validation of all critical delegate connections
     * @remarks
     *
     * Checks that each delegate connection is correct and that the underlying
     * scripts for those delegates have not been modified in unplanned ways.
     *
     * Every Capo subclass that adds new delegate types SHOULD implement
     * this method, performing any checks needed to verify the scripts underlying
     * those delegate-types.  It should return `Promise.all([ super(), ...myOwnChecks])`.
     * @public
     **/
    verifyCoreDelegates(): Promise<[BasicMintDelegate, AuthorityPolicy, ContractBasedDelegate] | undefined>;
    mkDatumScriptReference(): InlineTxOutputDatum;
    findGovDelegate(charterData?: CharterData): Promise<ContractBasedDelegate>;
    txnAddGovAuthority<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX & hasGovAuthority>;
    getMintDelegate(charterData?: CharterData): Promise<BasicMintDelegate>;
    getSpendDelegate(charterData?: CharterData): Promise<BasicMintDelegate>;
    getSettingsController(this: SELF, options: FindableViaCharterData): Promise<DelegatedDataContract<any, any> | undefined>;
    /**
     * Finds the delegated-data controller for a given typeName.
     * @remarks
     * REQUIRES that the Capo manifest contains an installed DgDataPolicy
     * and that the off-chain Capo delegateMap provides an off-chain controller
     * for that typeName.
     */
    getDgDataController<RN extends string & keyof SELF["_delegateRoles"]>(this: SELF, recordTypeName: RN, options?: FindableViaCharterData): Promise<undefined | DelegatedDataContract<any, any>>;
    /**
     * @deprecated - use getOtherNamedDelegate() or getDgDataController() instead
     */
    getNamedDelegate(): void;
    /**
     * Finds a contract's named delegate, given the expected delegateName.
     * @remarks
     * @public
     **/
    getOtherNamedDelegate(delegateName: string, charterData?: CharterData): Promise<ContractBasedDelegate>;
    getNamedDelegates(charterData?: CharterData): Promise<{
        [k: string]: ContractBasedDelegate;
    }>;
    getGovDelegate(charterData?: CharterData): Promise<void>;
    /**
     * helper for test environment, allowing an abortive initial charter-creation, without
     * most of the costs, but enabling named-delegate scripts to be compiled/validated
     * much earlier in the test lifecycle.  The real charter process can then continue without
     * duplicating any of the dry-run setup costs.
     */
    didDryRun: {
        minter: CapoMinter;
        seedUtxo: TxInput;
        configIn: CapoConfig;
        args: MinimalCharterDataArgs;
    };
    /**
     * Initiates a seeding transaction, creating a new Capo contract of this type
     * @remarks
     *
     * The returned transaction context has `state.bootstrappedConfig` for
     * capturing the details for reproducing the contract's settings and on-chain
     * address, and state.charterData
     *
     * @param charterDataArgs - initial details for the charter datum
     * @param existinTcx - any existing transaction context
     * @typeParam TCX - inferred type of a provided transaction context
     * @public
     **/
    mkTxnMintCharterToken<TCX extends undefined | StellarTxnContext<anyState>, TCX2 extends StellarTxnContext<anyState> = hasBootstrappedCapoConfig & (TCX extends StellarTxnContext<infer TCXT> ? StellarTxnContext<TCXT> : unknown), TCX3 = TCX2 & hasAddlTxns<TCX2> & StellarTxnContext<charterDataState> & hasUutContext<"govAuthority" | "capoGov" | "mintDelegate" | "mintDgt" | "setting">>(this: SELF, charterDataArgs: MinimalCharterDataArgs, existingTcx?: TCX, dryRun?: "DRY_RUN"): Promise<TCX3 & Awaited<hasUutContext<"spendDelegate" | "govAuthority" | "mintDelegate" | "capoGov" | "mintDgt" | "spendDgt"> & TCX2 & hasBootstrappedCapoConfig & hasSeedUtxo & StellarTxnContext<charterDataState>>>;
    mkTxnUpgradeIfNeeded(this: SELF, charterData?: CharterData): Promise<hasAddlTxns<hasAddlTxns<StellarTxnContext<anyState>, anyState> & {
        isFacade: true;
    }>>;
    findCapoUtxos(option?: Required<Pick<UtxoSearchScope, "dumpDetail">>): Promise<TxInput[]>;
    tcxWithCharterData<TCX extends StellarTxnContext>(this: SELF, tcx: TCX): Promise<TCX & StellarTxnContext<charterDataState>>;
    /**
     * Adds an additional txn to the transaction context, committing any pending manifest changes
     * @remarks
     *
     * If the capo manifest has any pending changes, this tx makes them active.
     * Use this after each queued manifest update
     * @public
     */
    commitPendingChangesIfNeeded(this: SELF, tcx: StellarTxnContext): Promise<hasAddlTxns<StellarTxnContext<anyState>, anyState>>;
    addTxnBootstrappingSettings<TCX extends StellarTxnContext>(this: SELF, tcx: TCX, charterData: CharterData): Promise<hasAddlTxns<TCX>>;
    /**
     * Creates an additional reference-script-creation txn
     * @remarks
     *
     * Creates a txn for reference-script creation, and
     * adds it to the current transaction context to also be submitted.
     *
     * The reference script is stored in the Capo contract with a special
     * Datum, and it can be used in future transactions to save space and fees.
     *
     * @param tcx - the transaction context
     * @param scriptName - the name of the script, used in the addlTxn's  name
     * @param script - the script to be stored onchain for future reference
     * @public
     **/
    txnMkAddlRefScriptTxn<TCX extends StellarTxnContext<anyState>, RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any> ? TCX : hasAddlTxns<TCX>>(tcx: TCX, scriptName: string, script: anyUplcProgram): Promise<RETURNS>;
    mkRefScriptTxn(script: anyUplcProgram): Promise<StellarTxnContext>;
    /**
     * Attach the given script by reference to a transaction
     * @remarks
     *
     * If the given script is found in the Capo's known list of reference scripts,
     * it is used to attach the refScript to the transaction context.  Otherwise,
     * the script's bytes are added directly to the transaction.
     *
     * The indicated script is expected to be found in one of the Capo's
     * refScript utxos.  Otherwise, a missing-refScript warning is emitted,
     * and the program is added directly to the transaction.
     * If this makes the transaction too big, the console
     * warning will be followed by a thrown error during the transaction's
     * wallet-submission sequence.
     * @param program2 - the UPLC program to attach to the script
     * @public
     **/
    txnAttachScriptOrRefScript<TCX extends StellarTxnContext>(tcx: TCX, program?: anyUplcProgram | undefined, useRefScript?: boolean): Promise<TCX>;
    findRefScriptUtxo(expectedVh: number[], capoUtxos: TxInput[]): Promise<TxInput | undefined>;
    /** finds UTXOs in the capo that are of tnhe ReferenceScript variety of its datum
     * @remarks
     *
     * @public
     */
    findScriptReferences(capoUtxos: TxInput[]): Promise<TxInput[]>;
    mkTxnUpdateCharter<TCX extends StellarTxnContext>(args: CharterDataLike, activity?: isActivity, tcx?: TCX): Promise<StellarTxnContext>;
    txnAddNamedDelegateAuthority<TCX extends StellarTxnContext>(tcx: TCX, delegateName: string, delegate: ContractBasedDelegate, activity: isActivity): Promise<TCX>;
    /**
     * Returns a single item from a list, throwing an error if it has multiple items
     *
     */
    singleItem<T>(xs: Array<T>): T;
    /**
     * Queries a chain-index to find utxos having a specific type of delegated datum
     * @remarks
     * Optionally filters records by `id`, `type` and/or `predicate`
     *
     * The `predicate` function, if provided, can implement any logic suitable for a specific case of data-finding.
     */
    findDelegatedDataUtxos<const T extends undefined | (string & keyof SELF["_delegateRoles"]), RAW_DATUM_TYPE extends T extends string ? AnyDataTemplate<T, any> : never, PARSED_DATUM_TYPE>(this: SELF, { type, id, predicate, query, charterData, capoUtxos, }: {
        type?: T;
        id?: string | number[] | UutName;
        predicate?: DelegatedDataPredicate<RAW_DATUM_TYPE>;
        query?: never;
        charterData?: CharterData;
        capoUtxos?: TxInput[];
    }): Promise<FoundDatumUtxo<RAW_DATUM_TYPE, PARSED_DATUM_TYPE>[]>;
    /**
     * Installs a new Minting delegate to the Capo contract
     * @remarks
     *
     * Updates the policy by which minting under the contract's minting policy is allowed.
     *
     * This supports the evolution of logic for token-minting.
     * Note that updating the minting policy can't modify or interfere with constraints
     * enforced by any existing mintInvariants.
     *
     * Normally, the existing minting delegate is signalled to be Retiring its delegation token,
     * burning it as part of the update transaction and cleaning things up.  The minUtxo from
     * the old delegation UUT will be recycled for use in the new delegate.
     *
     * @param delegateInfo - the new minting delegate's info
     * @param options - allows a forced update, which leaves a dangling delegation token
     *   in the old minting delegate, but allows the new minting delegate to take over without
     *   involving the old delegate in the transaction.
     * @param tcx - any existing transaction context
     * @public
     **/
    mkTxnUpdatingMintDelegate<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: MinimalDelegateUpdateLink, tcx?: TCX): Promise<TCX & hasUutContext<"mintDelegate" | "mintDgt"> & hasSeedUtxo>;
    mkValuesBurningDelegateUut(current: ErgoRelativeDelegateLink): valuesEntry_2[];
    mkTxnUpdatingSpendDelegate<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: MinimalDelegateUpdateLink, tcx?: TCX): Promise<TCX>;
    mkTxnAddingMintInvariant<THIS extends Capo<any>, TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: OffchainPartialDelegateLink, tcx?: TCX): Promise<StellarTxnContext>;
    mkTxnAddingSpendInvariant<THIS extends Capo<any>, const SN extends string & keyof THIS["delegateRoles"]["spendDelegate"]["variants"], TCX extends hasSeedUtxo = hasSeedUtxo>(this: THIS, delegateInfo: OffchainPartialDelegateLink, tcx?: TCX): Promise<hasUutContext<"spendDelegate" | "spendDgt"> & TCX & hasSeedUtxo>;
    /**
     * Adds or replaces a named delegate in the Capo contract
     * @remarks
     *
     * Registers a new delegate, keyed by its name.  The delegate may
     * replace another
     *
     * Other contract scripts can reference named delegates through the
     * contract's charter, requiring their presence in a transaction - thus
     * delegating some portion of validation responsibility to the other script
     *
     * @param delegateName - the key that will be used in the on-chain data structures and in dependent contracts.
     *  @param options - configuration for the delegate
     * @public
     **/
    mkTxnAddingNamedDelegate<DT extends StellarDelegate, thisType extends Capo<any>, const delegateName extends string, TCX extends hasSeedUtxo = hasSeedUtxo>(this: thisType, delegateName: delegateName, options: OffchainPartialDelegateLink & NamedPolicyCreationOptions<thisType, DT>, tcx?: TCX): Promise<hasAddlTxns<TCX & hasSeedUtxo & hasNamedDelegate<DT, delegateName>>>;
    /**
     * Helper for installing a named policy delegate
     * @remarks
     *
     * Creates a transaction for adding a delegate-data-policy to the Capo.
     *
     * The designated role name refers to the a key in the Capo's delegateRoles list -
     * typically the full `typename` of a delegated-data-policy.
     *
     * The idPrefix refers to the short prefix used for UUT id's for this data-type.
     *
     * An addlTxn for ref-script creation is included.
     *
     * An addlTxn for committing pending changes is NOT included, leaving pendingChange queued in the Capo's charter.
     * Use mkTxnInstallPolicyDelegate to also ***commit*** pending changes.
     */
    mkTxnInstallingPolicyDelegate<const TypeName extends string & keyof SELF["delegateRoles"], THIS extends Capo<any>>(this: THIS, options: InstallPolicyDgtOptions<THIS, TypeName>): Promise<hasAddlTxns<StellarTxnContext<anyState> & hasSeedUtxo & hasNamedDelegate<StellarDelegate, TypeName, "dgData">> & hasUutContext<TypeName | "dgDataPolicy">>;
    /**
     * Helper for installing a named policy delegate
     * @remarks
     *
     * Creates a transaction for adding a delegate-data-policy to the Capo, using the same logic as mkTxnInstallingPolicyDelegate.
     *
     * In addition, it also commits the pending changes to the Capo's charter.
     *
     * Use mkTxnInstallingPolicyDelegate to queue a pending change without committing it (useful
     * for tests, or when multiple policies can be queued and installed at once).
     *
     * Note that deploying multiple policies at once is currently disabled, to help prevent resource-exhaustion attacks.
     *
     * @public
     */
    mkTxnInstallPolicyDelegate<const TypeName extends string & keyof SELF["delegateRoles"], THIS extends Capo<any>>(this: THIS, options: InstallPolicyDgtOptions<THIS, TypeName>): Promise<hasAddlTxns<StellarTxnContext<anyState>, anyState>>;
    /**
     * Adds a new entry to the Capo's manifest
     * @remarks
     * Use mkTxnQueueingDelegateChange for changing DgDataPolicy entries.
     *
     * The type exclusions here mean this CURRENTLY works only with the
     * NamedTokenRef variety of manifest entry, but that's just pragmatic
     * because the other types don't yet have an implementation.
     * Other types can be eligible for adding to this API or to a different call.
     */
    mkTxnAddManifestEntry<THIS extends Capo<any>, TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>>(this: THIS, key: string, utxo: FoundDatumUtxo<any, any>, entry: ManifestEntryTokenRef, tcx?: TCX): Promise<StellarTxnContext<anyState>>;
    mkTxnQueuingDelegateChange<DT extends StellarDelegate, THIS extends Capo<any>, const TypeName extends string & keyof SELF["delegateRoles"], OPTIONS extends OffchainPartialDelegateLink, TCX extends StellarTxnContext<anyState> = StellarTxnContext<anyState>>(this: THIS, change: "Add" | "Replace", options: {
        typeName: TypeName;
        charterData: CharterData;
        idPrefix: string;
        dgtOptions?: OPTIONS;
    }, tcx?: TCX): Promise<hasAddlTxns<TCX & hasNamedDelegate<DT, TypeName, "dgData">> & hasUutContext<TypeName | "dgDataPolicy">>;
    /**
     * Looks up a policy in the manifest, returning the policy name and the manifest entry if found.
     * @remarks
     * Returns a pair of [ policyName, manifestEntry ] if found.  Returns undefined if the policy is not found.
     * @public
     */
    hasPolicyInManifest<const RoLabel extends string & keyof SELF["delegateRoles"]>(policyName: RoLabel, charterData: CapoDatum$Ergo$CharterData_2): [string, ErgoCapoManifestEntry_2] | undefined;
    /**
     * mockable helper for finding a pending change in the charter, to make it easier to test
     */
    findPendingChange(charterData: CapoDatum$Ergo$CharterData_2, changingThisRole: (pc: ErgoPendingCharterChange_3) => boolean): Partial<{
        delegateChange: ErgoPendingDelegateChange;
        otherManifestChange: PendingCharterChange$Ergo$otherManifestChange;
    }> | undefined;
    tempMkDelegateLinkForQueuingDgtChange(seedUtxo: TxInput, mintDgtActivity: SomeDgtActivityHelper, purpose: string, typeName: string, idPrefix: string, options: OffchainPartialDelegateLink): Promise<{
        delegateClass: stellarSubclass<ContractBasedDelegate>;
        delegate: ContractBasedDelegate;
        roleName: string;
        fullCapoDgtConfig: Partial<CapoConfig> & capoDelegateConfig;
    } & OffchainPartialDelegateLink & Required<OffchainPartialDelegateLink>>;
    mkTxnCommittingPendingChanges<TCX extends StellarTxnContext>(tcx?: TCX): Promise<StellarTxnContext<anyState>>;
    /**
     * Adds UUT minting to a transaction
     * @remarks
     *
     * Constructs UUTs with the indicated purposes, and adds them to the contract state.
     * This is a useful generic capability to support any application-specific purpose.
     *
     * The provided transaction context must have a seedUtxo - use {@link StellarContract.tcxWithSeedUtxo | tcxWithSeedUtxo()} to add one
     * from the current user's wallet. The seed utxo is consumed, so it can never be used again; its
     * value will be returned to the user wallet.  All the uuts named in the uutPurposes argument will
     * be minted from the same seedUtxo, and will share the same suffix, because it is derived from the
     * seedUtxo's outputId.
     *
     * Many cases of UUT minting are covered by the delegation pattern, where this method
     * is used implicitly.
     *
     * @param initialTcx - an existing transaction context
     * @param uutPurposes - a set of purpose-names (prefixes) for the UUTs to be minted
     * @param options - additional options for the minting operation.  In particular, you likely want
     * to provide a custom activity instead of the default uutMinting activity.
     * @param roles - a map of role-names to purpose-names
     * @public
     **/
    txnMintingUuts<const purposes extends string, existingTcx extends hasSeedUtxo, const RM extends Record<ROLES, purposes>, const ROLES extends keyof RM & string = string & keyof RM>(initialTcx: existingTcx, uutPurposes: purposes[], options: NormalDelegateSetup | DelegateSetupWithoutMintDelegate, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    /**
     * @deprecated use tcxWithSeedUtxo() instead
     * @remarks adds a seed utxo to a transaction-context,
     */
    addSeedUtxo<TCX extends StellarTxnContext>(tcx?: TCX, seedUtxo?: TxInput): Promise<TCX & hasSeedUtxo>;
    /**
     * Adds UUT types to the transaction context
     * @remarks
     *
     * adds tcx.state.uut entries for each purpose.
     *
     * also adds a second uut entry for each role-name found in the roles map, corresponding to the uut entry for its purpose.
     *
     * NOTE: this method doesn't add a minting instruction to the transaction, so that
     * all the minting/burning needed for the txn can (because it must) be done in one minting instruction.
     *
     * If the uuts being minted are the only minting/burning needed in the transaction, then
     * you can use {@link Capo.txnMintingUuts | txnMintingUuts()} instead of this method.
     *
     * @param tcx - the transaction context
     * @param uutPurposes - a list of short names for the UUTs (will be augmented with unique suffixes)
     * @param usingSeedUtxo - the seed utxo to be used for minting the UUTs (consumed in the transaction, and controls the suffixes)
     * @param roles - a map of role-names to purpose-names
     * @public
     **/
    txnWillMintUuts<const purposes extends string, existingTcx extends StellarTxnContext, const RM extends Record<ROLES, purposes>, const ROLES extends string & keyof RM = string & keyof RM>(tcx: existingTcx, uutPurposes: purposes[], { usingSeedUtxo }: UutCreationAttrsWithSeed, roles?: RM): Promise<hasUutContext<ROLES | purposes> & existingTcx>;
    requirements(): ReqtsMap_2<"is a base class for leader/Capo pattern" | "can create unique utility tokens" | "supports the Delegation pattern using roles and strategy-variants" | "supports well-typed role declarations and strategy-adding" | "supports just-in-time strategy-selection using txnCreateDelegateLink()" | "given a configured delegate-link, it can create a ready-to-use Stellar subclass with all the right settings" | "supports concrete resolution of existing role delegates" | "Each role uses a RoleVariants structure which can accept new variants" | "provides a Strategy type for binding a contract to a strategy-variant name" | "can locate UUTs in the user's wallet" | "positively governs all administrative actions" | "has a unique, permanent charter token" | "has a unique, permanent treasury address" | "the charter token is always kept in the contract" | "the charter details can be updated by authority of the capoGov-* token" | "can mint other tokens, on the authority of the charter's registered mintDgt- token" | "can handle large transactions with reference scripts" | "has a singleton minting policy" | "can update the minting delegate in the charter data" | "can update the spending delegate in the charter data" | "can add invariant minting delegates to the charter data" | "can add invariant spending delegates to the charter data" | "supports an abstract Settings structure stored in the contact" | "added and updated delegates always validate the present configuration data" | "can commit new delegates" | "supports storing new types of datum not pre-defined in the Capo's on-chain script" | "the charter has a namedDelegates structure for semantic delegate links" | "CreatingDelegatedDatum: creates a UTxO with any custom datum" | "UpdatingDelegatedDatum: checks that a custom data element can be updated", never>;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoActivityHelper extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoActivity, Partial<{
        capoLifecycleActivity: CapoLifecycleActivityLike;
        usingAuthority: tagOnly;
        retiringRefScript: tagOnly;
        addingSpendInvariant: tagOnly;
        spendingDelegatedDatum: tagOnly;
        updatingCharter: tagOnly;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***CapoActivity:capoLifecycleActivity***.
     */
    get capoLifecycleActivity(): CapoLifecycleActivityHelperNested;
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.usingAuthority"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get usingAuthority(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.retiringRefScript"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get retiringRefScript(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.addingSpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get addingSpendInvariant(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.spendingDelegatedDatum"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get spendingDelegatedDatum(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoHelpers::CapoActivity.updatingCharter"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#5***
     */
    get updatingCharter(): {
        redeemer: UplcData;
    };
}

declare type CapoBundleClass = AbstractNew<CapoHeliosBundle>;

/**
 * Configuration details for a Capo
 * @public
 */
export declare type CapoConfig<FF extends CapoFeatureFlags = {}> = configBase & rootCapoConfig & SeedTxnScriptParams & {
    mph: MintingPolicyHash;
    rev: bigint;
    bootstrapping?: true;
} & {
    featureFlags?: Partial<FF>;
};

/**
 * @public
 */
export declare type CapoConfigJSON = {
    mph: {
        bytes: string;
    };
    rev: bigint;
    seedTxn?: {
        bytes: string;
    };
    seedIndex: bigint;
    rootCapoScriptHash: {
        bytes: string;
    };
};

/**
 * default null-deployment
 * @remarks
 * Provides a default configuration to hold the place of a real
 * Capo deployment.
 *
 * This serves to provide a resolution for the \`currentCapoConfig\` import,
 * being bundled to dist/currentCapoConfig.mjs.
 *
 * This also serves during the heliosRollupBundler's
 * type- and bridge-code generation activities, which are independent
 * of the actual deployment environment.
 * @public
 */
export declare const capoConfigurationDetails: CapoDeployedDetails<"native">;

/**
 * GENERATED data bridge for **Capo** script (defined in class ***CapoHeliosBundle***)
 * main: **src/DefaultCapo.hl**, project: **stellar-contracts**
 * @remarks
 * This class doesn't need to be used directly.  Its methods are available through the ***contract's methods***:
 *  - `get mkDatum` - returns the datum-building bridge for the contract's datum type
 *  - `get activity` - returns an activity-building bridge for the contract's activity type
 *  - `get reader` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
 *  - `get onchain` - (advanced) returns a data-encoding bridge for types defined in the contract's script
 * The advanced methods are not typically needed - mkDatum and activity should normally provide all the
 * type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's `findDelegatedDataUtxos()`
 * method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
 *
 * ##### customizing the bridge class name
 * Note that you may override `get dataBridgeName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class CapoDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (CapoDatum)***
     * for this contract script.
     */
    datum: CapoDatumHelper;
    /**
     * this is the specific type of datum for the `Capo` script
     */
    CapoDatum: CapoDatumHelper;
    readDatum: (d: UplcData) => ErgoCapoDatum;
    /**
     * generates UplcData for the activity type (***CapoActivity***) for the `Capo` script
     */
    activity: CapoActivityHelper;
    CapoActivity: CapoActivityHelper;
    reader: CapoDataBridgeReader;
    /**
     * accessors for all the types defined in the `Capo` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `Capo` script
         */
        DelegateRole: DelegateRoleHelper;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `Capo` script
         */
        ManifestEntryType: ManifestEntryTypeHelper;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `Capo` script
         */
        PendingDelegateAction: PendingDelegateActionHelper;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `Capo` script
         */
        ManifestActivity: ManifestActivityHelper;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `Capo` script
         */
        PendingCharterChange: PendingCharterChangeHelper;
        /**
         * generates UplcData for the enum type ***CapoDatum*** for the `Capo` script
         */
        CapoDatum: CapoDatumHelper;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `Capo` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper;
        /**
         * generates UplcData for the enum type ***CapoActivity*** for the `Capo` script
         */
        CapoActivity: CapoActivityHelper;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `Capo` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `Capo` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike | {
            entryType: ManifestEntryTypeLike;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `Capo` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike | {
            action: PendingDelegateActionLike;
            role: DelegateRoleLike;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `Capo` script
         */
        AnyData: (fields: AnyDataLike | {
            id: number[];
            type: string;
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_2, RelativeDelegateLinkLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry, CapoManifestEntryLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange, PendingDelegateChangeLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData, AnyDataLike>;
}

declare class CapoDataBridgeReader extends DataBridgeReaderClass {
    bridge: CapoDataBridge;
    constructor(bridge: CapoDataBridge, isMainnet: boolean);
    /**
     * reads UplcData *known to fit the **DelegateRole*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateRole(d: UplcData): ErgoDelegateRole;
    /**
     * reads UplcData *known to fit the **ManifestEntryType*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType;
    /**
     * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction;
    /**
     * reads UplcData *known to fit the **ManifestActivity*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestActivity(d: UplcData): ErgoManifestActivity;
    /**
     * reads UplcData *known to fit the **PendingCharterChange*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange_2;
    datum: (d: UplcData) => Partial<{
        CharterData: CapoDatum$Ergo$CharterData;
        ScriptReference: tagOnly;
        DelegatedData: CapoDatum$Ergo$DelegatedData;
    }>;
    /**
     * reads UplcData *known to fit the **CapoDatum*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoDatum(d: UplcData): ErgoCapoDatum;
    /**
     * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity;
    /**
     * reads UplcData *known to fit the **CapoActivity*** enum type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoActivity(d: UplcData): ErgoCapoActivity;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_2;
    /**
     * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoManifestEntry(d: UplcData): CapoManifestEntry;
    /**
     * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateChange(d: UplcData): PendingDelegateChange;
    /**
     * reads UplcData *known to fit the **AnyData*** struct type,
     * for the Capo script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    AnyData(d: UplcData): AnyData;
}

/**
 * @public
 */
export declare type CapoDatum = ErgoCapoDatum_2;

/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***CapoDatum*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoDatumHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoDatum_2, Partial<{
        CharterData: CapoDatum$CharterDataLike;
        ScriptReference: tagOnly;
        DelegatedData: CapoDatum$DelegatedDataLike;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.CharterData"***
     * @remarks - ***CapoDatum$CharterDataLike*** is the same as the expanded field-types.
     */
    CharterData(fields: CapoDatum$CharterDataLike | {
        spendDelegateLink: RelativeDelegateLinkLike;
        spendInvariants: Array<RelativeDelegateLinkLike>;
        otherNamedDelegates: Map<string, RelativeDelegateLinkLike>;
        mintDelegateLink: RelativeDelegateLinkLike;
        mintInvariants: Array<RelativeDelegateLinkLike>;
        govAuthorityLink: RelativeDelegateLinkLike;
        manifest: Map<string, CapoManifestEntryLike>;
        pendingChanges: Array<PendingCharterChangeLike>;
    }): InlineTxOutputDatum;
    /**
     * (property getter): InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.ScriptReference"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get ScriptReference(): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"CapoHelpers::CapoDatum.DelegatedData"***
     * @remarks - ***CapoDatum$DelegatedDataLike*** is the same as the expanded field-types.
     */
    DelegatedData(fields: CapoDatum$DelegatedDataLike | {
        data: Map<string, UplcData>;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}

/**
 * for any Capo delegate; combines the BasicDelegate with a
 *  concrete specialization
 * @public
 **/
export declare abstract class CapoDelegateBundle extends HeliosScriptBundle {
    /**
     * The delegate module specialization for this script bundle.
     * @remarks
     * Basic mint/spend delegates can use the UnspecializedDelegateScript for this purpose.
     *
     * Delegated-data policy bundles need to provide their own specialization, probably
     * by using a template, or by copying the UnspecializedDelegateScript and adding any
     * application-specific logic needed.
     * @public
     */
    abstract specializedDelegateModule: Source;
    /**
     * indicates where the script params are sourced from
     * ### advanced usage
     * use "config" to draw the script params from a json file
     * use "bundle" to draw the script params from the bundle's params and/or defined variants
     */
    scriptParamsSource: "bundle" | "config";
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
    capoBundle: CapoHeliosBundle;
    isConcrete: boolean;
    /**
     * Creates a CapoDelegateBundle subclass based on a specific CapoHeliosBundle class
     */
    static usingCapoBundleClass<THIS extends typeof CapoDelegateBundle, CB extends CapoBundleClass>(this: THIS, c: CB, generic?: "generic" | false): ConcreteCapoDelegateBundle;
    get main(): Source;
    get rev(): bigint;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: boolean;
    };
    get moduleName(): string;
    getEffectiveModuleList(): Source[];
    get modules(): Source[];
    mkDelegateWrapper(moduleName: any): Source;
}

/**
 * Allows any targeted delegate class to access & use certain details originating in the leader contract
 * @remarks
 *
 * This setting is implicitly defined on all Delegate configurations.
 *
 * These allow any Capo delegate class to reference details from its essential
 * delegation context
 *
 * @public
 **/
export declare type capoDelegateConfig = configBase & {
    rev: bigint;
    delegateName: string;
    mph: MintingPolicyHash;
    tn: number[];
    addrHint: Address[];
    capoAddr: Address;
    capo: Capo<any>;
};

/**
 * @public
 */
export declare type CapoDeployedDetails<form extends "json" | "native" = "native"> = {
    capo?: DeployedScriptDetails<CapoConfig, form>;
    minter?: DeployedScriptDetails<BasicMinterParams, form>;
};

/**
 * @public
 */
export declare type CapoFeatureFlags = Record<string, boolean>;

/**
 * A set of Helios scripts that are used to define a Capo contract.
 * @remarks
 * This class is intended to be extended to provide a specific Capo contract.
 *
 * You can inherit & augment `get sharedModules()` to make additional
 * helios modules available for use in related contract scripts.  Other
 * bundles can include these modules only by naming them in their
 * own `includeFromCapoModules()` method.
 * @public
 */
export declare class CapoHeliosBundle extends HeliosScriptBundle {
    preConfigured?: typeof capoConfigurationDetails;
    precompiledScriptDetails?: CapoDeployedDetails<any>;
    scriptParamsSource: "config";
    requiresGovAuthority: boolean;
    get hasAnyVariant(): boolean;
    parseCapoJSONConfig(config: any): CapoConfig_2;
    parseCapoMinterJSONConfig(config: any): {
        seedTxn: TxId;
        seedIndex: bigint;
    };
    init(setupDetails: StellarBundleSetupDetails<any>): void;
    initProgramDetails(): void;
    get isPrecompiled(): boolean;
    loadPrecompiledScript(): Promise<PrecompiledProgramJSON>;
    loadPrecompiledMinterScript(): Promise<PrecompiledProgramJSON>;
    getPreCompiledBundle(variant: string): any;
    get main(): Source;
    getPreconfiguredUplcParams(variantName: string): UplcRecord<any> | undefined;
    get params(): any;
    datumTypeName: string;
    capoBundle: this;
    get scriptConfigs(): void;
    get bridgeClassName(): string;
    static isCapoBundle: boolean;
    /**
     * returns only the modules needed for the Capo contract
     * @remarks
     * overrides the base class's logic that references a connected
     * Capo bundle - that policy is not needed here because this IS
     * the Capo bundle.
     */
    getEffectiveModuleList(): Source[];
    /**
     * indicates a list of modules available for inclusion in Capo-connected scripts
     * @remarks
     * Subclasses can implement this method to provide additional modules
     * shareable to various Capo-connected scripts; those scripts need to
     * include the modules by name in their `includeFromCapoModules()` method.
     *
     * See the
     */
    get sharedModules(): Source[];
    get modules(): Source[];
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoLifecycleActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
        updatingManifest: ManifestActivityLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): DelegateRoleHelperNested;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoLifecycleActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_2, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_2;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_2;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_2;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_2;
        updatingManifest: ManifestActivityLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoLifecycleActivityHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_3, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_3;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_3;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_3;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_3;
        updatingManifest: ManifestActivityLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoLifecycleActivityHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike;
        updatingManifest: ManifestActivityLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoLifecycleActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_2, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_2;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_2;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_2;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_2;
        updatingManifest: ManifestActivityLike_2;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested_2;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested_2;
}

/**
 * Helper class for generating UplcData for variants of the ***CapoLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class CapoLifecycleActivityHelperNested_3 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<CapoLifecycleActivity_3, Partial<{
        CreatingDelegate: CapoLifecycleActivity$CreatingDelegateLike_3;
        queuePendingChange: tagOnly;
        removePendingChange: DelegateRoleLike_3;
        commitPendingChanges: tagOnly;
        forcingNewSpendDelegate: CapoLifecycleActivity$forcingNewSpendDelegateLike_3;
        forcingNewMintDelegate: CapoLifecycleActivity$forcingNewMintDelegateLike_3;
        updatingManifest: ManifestActivityLike_3;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***
     * with raw seed details included in fields.
     */
    CreatingDelegate(fields: CapoLifecycleActivity$CreatingDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.CreatingDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$CreatingDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.queuePendingChange"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get queuePendingChange(): {
        redeemer: UplcData;
    };
    /**
     * access to different variants of the ***nested DelegateRole*** type needed for ***CapoLifecycleActivity:removePendingChange***.
     */
    get removePendingChange(): ActivityDelegateRoleHelperNested_3;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.commitPendingChanges"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get commitPendingChanges(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewSpendDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewSpendDelegate(fields: CapoLifecycleActivity$forcingNewSpendDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewSpendDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewSpendDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewSpendDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$forcingNewMintDelegate}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forcingNewMintDelegate(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***
     * with raw seed details included in fields.
     */
    forcingNewMintDelegate(fields: CapoLifecycleActivity$forcingNewMintDelegateLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::CapoLifecycleActivity.forcingNewMintDelegate"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$forcingNewMintDelegate({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$forcingNewMintDelegate: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * access to different variants of the ***nested ManifestActivity*** type needed for ***CapoLifecycleActivity:updatingManifest***.
     */
    get updatingManifest(): ManifestActivityHelperNested_3;
}

/**
 * A basic minting validator serving a Capo's family of contract scripts
 * @remarks
 *
 * NOTE that this class provides the actual MINTING script, which is
 * DIFFERENT from the minting delegate.  The minting delegate is a separate
 * contract that can be updated within the scope of a Capo, with this minting
 * script remaining unchanged.
 *
 * Because this minter always defers to the minting delegate, that delegate
 * always expresses the true policy for minting application-layer tokens.
 * This minter contains only the most basic minting constraints - mostly, those
 * needed for supporting Capo lifeycle activities in which the minting delegate
 * isn't yet available, or is being replaced.
 *
 * Mints charter tokens based on seed UTxOs.  Can also mint UUTs and
 * other tokens as approved by the Capo's minting delegate.
 * @public
 **/
export declare class CapoMinter extends StellarContract<BasicMinterParams> implements MinterBaseMethods {
    currentRev: bigint;
    scriptBundleClass(): Promise<CapoMinterBundle>;
    mkScriptBundle(setupDetails?: StellarBundleSetupDetails<any>): Promise<any>;
    /**
     * the data bridge for this minter is fixed to one particular type
     */
    dataBridgeClass: typeof CapoMinterDataBridge;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get activity(): mustFindActivityType<CapoMinter>;
    get scriptActivitiesName(): string;
    /**
     * Mints initial charter token for a Capo contract
     * @remarks
     *
     * This is the fundamental bootstrapping event for a Capo.
     * @param ownerInfo - contains the `{owner}` address of the Capo contract
     * @public
     **/
    activityMintingCharter(ownerInfo: MintCharterActivityArgs): isActivity;
    /**
     * Mints any tokens on sole authority of the Capo contract's minting delegage
     * @remarks
     *
     * The Capo's minting delegate takes on the responsibility of validating a mint.
     * It can validate mintingUuts, burningUuts and any application-specific use-cases
     * for minting and/or burning tokens from the policy.
     * @public
     **/
    activityMintWithDelegateAuthorizing(): isActivity;
    /**
     * Mints a new UUT specifically for a minting invariant
     * @remarks
     *
     * When adding a minting invariant, the Capo's existing mint delegate
     * doesn't get to be involved, as it could otherwise block a critical administrative
     * change needed.  The Capo's authority token is all the minter requires
     * to create the needed UUT.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @public
     **/
    activityAddingMintInvariant(seedFrom: hasSeed): isActivity;
    /** Mints a new UUT specifically for a spending invariant
     * @remarks When adding a spending invariant, the Capo's existing mint delegate
     * is not consulted, as this administrative function works on a higher
     * level than the usual minting delegate's authority.
     *
     * @public
     * **/
    activityAddingSpendInvariant(seedFrom: hasSeed): isActivity;
    /**
     * Forces replacement of the Capo's mint delegate
     * @remarks
     *
     * Forces the minting of a new UUT to replace the Capo's mint delegate.
     *
     * @public
     **/
    activityForcingNewMintDelegate(seedFrom: hasSeed): isActivity;
    /**
     * Forces replacement of the Capo's spend delegate
     * @remarks
     *
     * Creates a new UUT to replace the Capo's spend delegate.  The mint delegate
     * is bypassed in this operation.  There is always some existing spend delegate
     * when this is called, and it's normally burned in the process, when replacingUut is
     * provided.  If replacingUut is not provided, the existing spend delegate is left in place,
     * although it won't be useful because the new spend delegate will have been installed.
     *
     * @param seedFrom - either a transaction-context with seedUtxo, or `{seedTxn, seedIndex}`
     * @param replacingUut - the name of an exiting delegate being replaced
     * @public
     **/
    activityForcingNewSpendDelegate(seedFrom: hasSeed, replacingUut?: number[]): isActivity;
    get mintingPolicyHash(): MintingPolicyHash;
    get charterTokenAsValuesEntry(): valuesEntry;
    tvCharter(): Value;
    get charterTokenAsValue(): Value;
    txnMintingCharter<TCX extends StellarTxnContext<anyState>>(this: CapoMinter, tcx: TCX, { owner, capoGov, mintDelegate, spendDelegate, }: {
        owner: Address;
        capoGov: UutName;
        mintDelegate: UutName;
        spendDelegate: UutName;
    }): Promise<TCX>;
    attachScript<TCX extends StellarTxnContext<anyState>>(tcx: TCX, useRefScript?: boolean): Promise<TCX>;
    txnMintingWithoutDelegate<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], minterActivity: isActivity): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], mintDelegate: BasicMintDelegate, mintDgtRedeemer: isActivity, options?: GrantAuthorityOptions): Promise<TCX>;
}

/**
 * GENERATED data bridge for **CapoMinter** script (defined in class ***CapoMinterBundle***)
 * main: **src/minting/CapoMinter.hl**, project: **stellar-contracts**
 * @remarks
 * This class doesn't need to be used directly.  Its methods are available through the ***contract's methods***:
 *  - `get mkDatum` - returns the datum-building bridge for the contract's datum type
 *  - `get activity` - returns an activity-building bridge for the contract's activity type
 *  - `get reader` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
 *  - `get onchain` - (advanced) returns a data-encoding bridge for types defined in the contract's script
 * The advanced methods are not typically needed - mkDatum and activity should normally provide all the
 * type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's `findDelegatedDataUtxos()`
 * method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
 *
 * ##### customizing the bridge class name
 * Note that you may override `get bridgeClassName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class CapoMinterDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    datum: undefined;
    /**
     * generates UplcData for the activity type (***MinterActivity***) for the `CapoMinter` script
     */
    activity: MinterActivityHelper;
    MinterActivity: MinterActivityHelper;
    reader: CapoMinterDataBridgeReader;
    /**
     * accessors for all the types defined in the `CapoMinter` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***MinterActivity*** for the `CapoMinter` script
         */
        MinterActivity: MinterActivityHelper;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `CapoMinter` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike_2 | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_3, RelativeDelegateLinkLike_2>;
}

/**
 * @public
 */
declare class CapoMinterDataBridgeReader extends DataBridgeReaderClass {
    bridge: CapoMinterDataBridge;
    constructor(bridge: CapoMinterDataBridge, isMainnet: boolean);
    /**
     * reads UplcData *known to fit the **MinterActivity*** enum type,
     * for the CapoMinter script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    MinterActivity(d: UplcData): ErgoMinterActivity;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the CapoMinter script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_3;
}

/**
 * @internal
 */
export declare class CapoWithoutSettings extends Capo<CapoWithoutSettings> {
    initDelegateRoles(): {
        Reqt: DelegateSetup_2<"dgDataPolicy", any, {}>;
        spendDelegate: DelegateSetup_2<"spendDgt", ContractBasedDelegate_2, any>;
        govAuthority: DelegateSetup_2<"authority", StellarDelegate_2, any>;
        mintDelegate: DelegateSetup_2<"mintDgt", BasicMintDelegate_2, any>;
    };
    reqtsController(): Promise<ReqtsController>;
}

/**
 * Helper class for generating UplcData for variants of the ***cctx_CharterInputType*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class cctx_CharterInputTypeHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<cctx_CharterInputType, Partial<{
        Unk: tagOnly;
        RefInput: cctx_CharterInputType$RefInputLike;
        Input: cctx_CharterInputType$InputLike;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::cctx_CharterInputType.Unk"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get Unk(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.RefInput"***
     * @remarks - ***cctx_CharterInputType$RefInputLike*** is the same as the expanded field-types.
     */
    RefInput(fields: cctx_CharterInputType$RefInputLike | {
        datum: CapoDatum$CharterDataLike_3;
        utxo: TxInput;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.Input"***
     * @remarks - ***cctx_CharterInputType$InputLike*** is the same as the expanded field-types.
     */
    Input(fields: cctx_CharterInputType$InputLike | {
        datum: CapoDatum$CharterDataLike_3;
        utxo: TxInput;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***cctx_CharterInputType*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class cctx_CharterInputTypeHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<cctx_CharterInputType_2, Partial<{
        Unk: tagOnly;
        RefInput: cctx_CharterInputType$RefInputLike_2;
        Input: cctx_CharterInputType$InputLike_2;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::cctx_CharterInputType.Unk"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get Unk(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.RefInput"***
     * @remarks - ***cctx_CharterInputType$RefInputLike*** is the same as the expanded field-types.
     */
    RefInput(fields: cctx_CharterInputType$RefInputLike_2 | {
        datum: CapoDatum$CharterDataLike_4;
        utxo: TxInput;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::cctx_CharterInputType.Input"***
     * @remarks - ***cctx_CharterInputType$InputLike*** is the same as the expanded field-types.
     */
    Input(fields: cctx_CharterInputType$InputLike_2 | {
        datum: CapoDatum$CharterDataLike_4;
        utxo: TxInput;
    }): UplcData;
}

/**
 * @public
 */
export declare type CharterData = CapoDatum$Ergo$CharterData_2;

/**
 * @public
 */
export declare type CharterDataLike = CapoDatum$CharterDataLike_2;

/**
 * @public
 */
export declare type charterDataState = {
    charterData: CharterDataLike;
    uuts: uutMap;
};

declare type CoinSelector = (utxos: TxInput[], amount: Value) => [TxInput[], TxInput[]];

/**
 * @public
 */
declare interface Colors {
    isColorSupported: boolean;
    reset: Formatter;
    bold: Formatter;
    dim: Formatter;
    italic: Formatter;
    underline: Formatter;
    inverse: Formatter;
    hidden: Formatter;
    strikethrough: Formatter;
    black: Formatter;
    red: Formatter;
    green: Formatter;
    yellow: Formatter;
    blue: Formatter;
    magenta: Formatter;
    cyan: Formatter;
    white: Formatter;
    gray: Formatter;
    bgBlack: Formatter;
    bgRed: Formatter;
    bgGreen: Formatter;
    bgYellow: Formatter;
    bgBlue: Formatter;
    bgMagenta: Formatter;
    bgCyan: Formatter;
    bgWhite: Formatter;
    blackBright: Formatter;
    redBright: Formatter;
    greenBright: Formatter;
    yellowBright: Formatter;
    blueBright: Formatter;
    magentaBright: Formatter;
    cyanBright: Formatter;
    whiteBright: Formatter;
    bgBlackBright: Formatter;
    bgRedBright: Formatter;
    bgGreenBright: Formatter;
    bgYellowBright: Formatter;
    bgBlueBright: Formatter;
    bgMagentaBright: Formatter;
    bgCyanBright: Formatter;
    bgWhiteBright: Formatter;
}

/**
 * @public
 */
export declare const colors: Colors;

declare type ComputedScriptProperties = Partial<{
    vh: ValidatorHash;
    addr: Address;
    mph: MintingPolicyHash;
    program: Program;
    identity: string;
}>;

/**
 * @public
 */
export declare type ConcreteCapoDelegateBundle = typeof CapoDelegateBundle & Constructor<CapoDelegateBundle> & EmptyConstructor<CapoDelegateBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};

/**
 * Configuration details for StellarContract classes
 * @public
 **/
export declare interface configBase {
    rev: bigint;
}

/**
 * @public
 * Extracts the config type for a Stellar Contract class
 **/
export declare type ConfigFor<SC extends StellarContract<any>> = configBase & SC extends StellarContract<infer inferredConfig> ? inferredConfig : never;

/**
 * A complete, validated and resolved configuration for a specific delegate
 * @public
 * @remarks
 *
 * Use StellarContract's `txnCreateDelegateSettings()` method to resolve
 * from any (minimal or better) delegate details to a ResolvedDelegate object.
 * @typeParam DT - a StellarContract class conforming to the `roleName`,
 *     within the scope of a Capo class's `roles()`.
 **/
export declare type ConfiguredDelegate<DT extends StellarDelegate> = {
    delegateClass: stellarSubclass<DT>;
    delegate: DT;
    roleName: string;
    fullCapoDgtConfig: Partial<CapoConfig> & capoDelegateConfig;
} & OffchainPartialDelegateLink;

declare type Constructor<T> = new (...args: any[]) => T;

/**
 * Base class for delegates controlled by a smart contract, as opposed
 * to a simple delegate backed by an issued token, whose presence
 * grants delegated authority.
 * @public
 */
export declare class ContractBasedDelegate extends StellarDelegate {
    /**
     * Each contract-based delegate must define its own dataBridgeClass, but they all
     * use the same essential template for the outer layer of their activity & datum interface.
     */
    dataBridgeClass: GenericDelegateBridgeClass;
    _dataBridge: GenericDelegateBridge;
    static currentRev: bigint;
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
    static isSpendDelegate: boolean;
    get delegateName(): string;
    _scriptBundle: HeliosScriptBundle | undefined;
    mkScriptBundle(setupDetails?: PartialStellarBundleDetails<any>): Promise<any>;
    get onchain(): mustFindConcreteContractBridgeType<this>;
    get offchain(): mustFindConcreteContractBridgeType<this>["reader"];
    get reader(): mustFindConcreteContractBridgeType<this>["reader"];
    get activity(): mustFindActivityType<this>;
    get mkDatum(): mustFindDatumType<this>;
    get newReadDatum(): mustFindReadDatumType<this>;
    get capo(): Capo<any, any>;
    scriptBundleClass(): Promise<typeof CapoDelegateBundle>;
    get scriptDatumName(): string;
    get scriptActivitiesName(): string;
    static isMintDelegate: boolean;
    static isMintAndSpendDelegate: boolean;
    static isDgDataPolicy: boolean;
    static get defaultParams(): {
        rev: bigint;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
    };
    static mkDelegateWithArgs(a: capoDelegateConfig): void;
    getContractScriptParams(config: capoDelegateConfig): {
        delegateName: string;
        rev: bigint;
        addrHint: Address[];
    };
    tcxWithCharterRef<TCX extends StellarTxnContext | hasCharterRef>(tcx: TCX): Promise<TCX & hasCharterRef>;
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
    txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkDelegationDatum(txin?: TxInput): TxOutputDatum;
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
    activityReplacingMe({ seed, purpose, }: Omit<MintUutActivityArgs, "purposes"> & {
        purpose: string;
    }): void;
    mkDelegateLifecycleActivity(delegateActivityName: "ReplacingMe" | "Retiring" | "ValidatingSettings", args?: Record<string, any>): isActivity;
    mkCapoLifecycleActivity(capoLifecycleActivityName: "CreatingDelegate" | "ActivatingDelegate", { seed, purpose, ...otherArgs }: Omit<MintUutActivityArgs, "purposes"> & {
        purpose?: string;
    }): isActivity;
    /**
     * Creates a reedemer for the indicated spending activity name
     **/
    mkSpendingActivity(spendingActivityName: string, args: {
        id: string | number[];
    } & Record<string, any>): isActivity;
    mkSeedlessMintingActivity(mintingActivityName: string, args: Record<string, any>): isActivity;
    mkSeededMintingActivity(mintingActivityName: string, args: {
        seed: TxOutputId;
    } & Record<string, any>): isActivity;
    /**
     * redeemer for spending the authority UUT for burning it.
     * @public
     * @remarks
     *
     * The Retiring redeemer indicates that the delegate is being
     * removed.
     *
     **/
    activityRetiring(): void;
    activityValidatingSettings(): void;
    activityMultipleDelegateActivities(...activities: isActivity[]): isActivity;
    /**
     * A mint-delegate activity indicating that a delegated-data controller will be governing
     * a deletion (burning its UUT) of a specific piece of delegated data.  No further redeemer details are needed here,
     * but the data-delegate's controller-token may have additional details in ITS redeemer,
     */
    activityDeletingDelegatedData(recId: string | number[]): isActivity;
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
    mkDatumIsDelegation(dd: DelegationDetail): InlineTxOutputDatum;
    /**
     * returns the ValidatorHash of the delegate script, if relevant
     * @public
     * @remarks
     *
     * A delegate that doesn't use an on-chain validator should override this method and return undefined.
     **/
    get delegateValidatorHash(): ValidatorHash | undefined;
    /**
     * {@inheritdoc StellarDelegate.DelegateMustFindAuthorityToken}
     **/
    DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
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
    DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput, redeemer: isActivity): Promise<TCX>;
    /**
     * {@inheritdoc StellarDelegate.DelegateAddsAuthorityToken}
     **/
    DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(this: ContractBasedDelegate, tcx: StellarTxnContext, fromFoundUtxo: TxInput): Promise<TCX>;
}

/**
 * @public
 */
export declare class ContractDataBridge {
    static isAbstract: true | false;
    isAbstract: true | false;
    isMainnet: boolean;
    types: Record<string, DataBridge | ((x: any) => UplcData)>;
    reader: DataBridgeReaderClass | undefined;
    datum: DataBridge | undefined;
    activity: DataBridge;
    readDatum: readsUplcData<any> | undefined;
    constructor(isMainnet: boolean);
    readData(x: any): any;
}

/**
 * @public
 */
export declare class ContractDataBridgeWithEnumDatum extends ContractDataBridge {
    static isAbstract: true | false;
    isAbstract: true | false;
    datum: EnumBridge;
    readDatum: readsUplcData<unknown>;
}

/**
 * @public
 */
export declare class ContractDataBridgeWithOtherDatum extends ContractDataBridge {
    static isAbstract: true | false;
    isAbstract: true | false;
    readDatum: readsUplcData<unknown>;
}

declare type CoreDgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    data: minimalData<TLike>;
    addedUtxoValue?: Value;
};

declare type CoreDgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity;
    updatedFields: minimalData<TLike>;
    addedUtxoValue?: Value;
};

/**
 * @internal
 */
export declare class DataBridge extends DataBridge_base {
    /**
     * @internal
     */
    ᱺᱺschema: TypeSchema;
    /**
     * @internal
     */
    isMainnet: boolean;
    /**
     * @internal
     */
    isActivity: boolean;
    /**
     * @internal
     */
    isNested: boolean;
    /**
     * @internal
     */
    ᱺᱺcast: Cast<any, any>;
    /**
     * @internal
     */
    isCallable: boolean;
    mkData: this["ᱺᱺcast"]["toUplcData"];
    readData: this["ᱺᱺcast"]["fromUplcData"];
    constructor(options: DataBridgeOptions);
    getSeed(arg: hasSeed | TxOutputId): TxOutputId;
    /**
     * @internal
     */
    redirectTo?: (value: any) => void;
    /**
     * @internal
     */
    mkDataVia(redirectionCallback: (value: any) => void): void;
    /**
     * @internal
     */
    get isEnum(): boolean;
    /**
     * @internal
     */
    getTypeSchema(): TypeSchema;
}

declare const DataBridge_base: ObjectConstructor;

/**
 * @internal
 */
export declare type DataBridgeOptions = {
    isMainnet: boolean;
    isActivity?: boolean;
    isNested?: boolean;
};

/**
 * @public
 */
export declare class DataBridgeReaderClass {
    datum: readsUplcTo<unknown> | undefined;
}

/**
 * @public
 */
export declare type dateAsMillis = number;

/**
 * Decorates datum-building functions
 * @remarks
 *
 * function names must follow the mkDatum... convention.
 *
 * The function should accept a single argument with input type
 * that feels Typescripty, and that can be fit to the on-chain type of
 * the underlying Datum variant of the given name.
 *
 * @public
 **/
export declare function datum(proto: any, thingName: any, descriptor: any): any;

/**
 * converts a Datum to a printable summary
 * @remarks
 *
 * using shortening techniques for the datumHash
 * @public
 **/
export declare function datumSummary(d: TxOutputDatum | null | undefined): string;

/**
 * Temporarily enable debugRealMath for the duration of the callback
 * @internal
 */
export declare function debugMath<T extends number>(callback: () => T): T;

/**
 * @deprecated - use CharterDataLike instead
 * @internal
 */
export declare type DefaultCharterDatumArgs = CharterDataLike;

/**
 * @internal
 */
export declare const defaultNoDefinedModuleName = "\u2039default-needs-override\u203A";

declare type DeferredState<SM extends StateMachine<any, any>> = DeferredStateMachineAction<SM, "state">;

declare type DeferredStateMachineAction<SM extends StateMachine<any, any>, TYPE extends "state" | "transition"> = {
    type: TYPE;
    promise: AnyPromise<any>;
    displayStatus: string;
} & (TYPE extends "state" ? {
    targetState: $states<SM>;
} : TYPE extends "transition" ? {
    transitionName: $transitions<SM>;
} : never);

declare type DeferredTransition<SM extends StateMachine<any, any>> = DeferredStateMachineAction<SM, "transition">;

/**
 * Creates a strongly-typed definition of a delegation role used in a Capo contract
 *
 * @remarks
 * The definition ncludes the different strategy variants that can serve in that role.
 *
 * NOTE: all type parameters are inferred from the function params.
 *
 * @param uutBaseName - token-name prefix for the tokens connecting delegates for the role
 * @param delegate - class and configuration for a selected delegate - see {@link DelegateConfigDetails}
 * @param delegateType - the variety of delegate
 * @public
 **/
export declare function defineRole<DT extends DelegateTypes, SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate), const CONFIG extends DelegateConfigDetails<SC>>(delegateType: DT, delegateClass: stellarSubclass<SC>, config: CONFIG, uutBaseName?: string): DelegateSetup<DT, SC, CONFIG>;

/**
 * Helper class for generating UplcData for variants of the ***DelegateActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateActivityHelper extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateActivity, Partial<{
        CapoLifecycleActivities: CapoLifecycleActivityLike_2;
        DelegateLifecycleActivities: DelegateLifecycleActivityLike;
        SpendingActivities: SpendingActivityLike;
        MintingActivities: MintingActivityLike;
        BurningActivities: BurningActivityLike;
        CreatingDelegatedData: DelegateActivity$CreatingDelegatedDataLike;
        UpdatingDelegatedData: DelegateActivity$UpdatingDelegatedDataLike;
        DeletingDelegatedData: DelegateActivity$DeletingDelegatedDataLike;
        OtherActivities: UplcData;
        MultipleDelegateActivities: Array<UplcData>;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***DelegateActivity:CapoLifecycleActivities***.
     */
    get CapoLifecycleActivities(): CapoLifecycleActivityHelperNested_2;
    /**
     * access to different variants of the ***nested DelegateLifecycleActivity*** type needed for ***DelegateActivity:DelegateLifecycleActivities***.
     */
    get DelegateLifecycleActivities(): DelegateLifecycleActivityHelperNested;
    /**
     * access to different variants of the ***nested SpendingActivity*** type needed for ***DelegateActivity:SpendingActivities***.
     */
    get SpendingActivities(): SpendingActivityHelperNested;
    /**
     * access to different variants of the ***nested MintingActivity*** type needed for ***DelegateActivity:MintingActivities***.
     */
    get MintingActivities(): MintingActivityHelperNested;
    /**
     * access to different variants of the ***nested BurningActivity*** type needed for ***DelegateActivity:BurningActivities***.
     */
    get BurningActivities(): BurningActivityHelperNested;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.CreatingDelegatedData"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegatedData}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegatedData(value: hasSeed, fields: {
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.CreatingDelegatedData"***
     * with raw seed details included in fields.
     */
    CreatingDelegatedData(fields: DelegateActivity$CreatingDelegatedDataLike | {
        seed: TxOutputId | string;
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.CreatingDelegatedData"***,
     * @param fields - \{ dataType: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegatedData({ dataType })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegatedData: (fields: {
        dataType: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        dataType: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.UpdatingDelegatedData"***
     * @remarks - ***DelegateActivity$UpdatingDelegatedDataLike*** is the same as the expanded field-types.
     */
    UpdatingDelegatedData(fields: DelegateActivity$UpdatingDelegatedDataLike | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.DeletingDelegatedData"***
     * @remarks - ***DelegateActivity$DeletingDelegatedDataLike*** is the same as the expanded field-types.
     */
    DeletingDelegatedData(fields: DelegateActivity$DeletingDelegatedDataLike | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.OtherActivities"***
     */
    OtherActivities(activity: UplcData): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::DelegateActivity.MultipleDelegateActivities"***
     */
    MultipleDelegateActivities(activities: Array<UplcData>): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateActivityHelper_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateActivity_2, Partial<{
        CapoLifecycleActivities: CapoLifecycleActivityLike_3;
        DelegateLifecycleActivities: DelegateLifecycleActivityLike_2;
        SpendingActivities: SpendingActivityLike_2;
        MintingActivities: MintingActivityLike_2;
        BurningActivities: BurningActivityLike_2;
        CreatingDelegatedData: DelegateActivity$CreatingDelegatedDataLike_2;
        UpdatingDelegatedData: DelegateActivity$UpdatingDelegatedDataLike_2;
        DeletingDelegatedData: DelegateActivity$DeletingDelegatedDataLike_2;
        MultipleDelegateActivities: Array<UplcData>;
        OtherActivities: UplcData;
    }>>;
    /**
     * access to different variants of the ***nested CapoLifecycleActivity*** type needed for ***DelegateActivity:CapoLifecycleActivities***.
     */
    get CapoLifecycleActivities(): CapoLifecycleActivityHelperNested_3;
    /**
     * access to different variants of the ***nested DelegateLifecycleActivity*** type needed for ***DelegateActivity:DelegateLifecycleActivities***.
     */
    get DelegateLifecycleActivities(): DelegateLifecycleActivityHelperNested_2;
    /**
     * access to different variants of the ***nested SpendingActivity*** type needed for ***DelegateActivity:SpendingActivities***.
     */
    get SpendingActivities(): SpendingActivityHelperNested_2;
    /**
     * access to different variants of the ***nested MintingActivity*** type needed for ***DelegateActivity:MintingActivities***.
     */
    get MintingActivities(): MintingActivityHelperNested_2;
    /**
     * access to different variants of the ***nested BurningActivity*** type needed for ***DelegateActivity:BurningActivities***.
     */
    get BurningActivities(): BurningActivityHelperNested_2;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.CreatingDelegatedData"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingDelegatedData}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingDelegatedData(value: hasSeed, fields: {
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.CreatingDelegatedData"***
     * with raw seed details included in fields.
     */
    CreatingDelegatedData(fields: DelegateActivity$CreatingDelegatedDataLike_2 | {
        seed: TxOutputId | string;
        dataType: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.CreatingDelegatedData"***,
     * @param fields - \{ dataType: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingDelegatedData({ dataType })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingDelegatedData: (fields: {
        dataType: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        dataType: string;
    }) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.UpdatingDelegatedData"***
     * @remarks - ***DelegateActivity$UpdatingDelegatedDataLike*** is the same as the expanded field-types.
     */
    UpdatingDelegatedData(fields: DelegateActivity$UpdatingDelegatedDataLike_2 | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.DeletingDelegatedData"***
     * @remarks - ***DelegateActivity$DeletingDelegatedDataLike*** is the same as the expanded field-types.
     */
    DeletingDelegatedData(fields: DelegateActivity$DeletingDelegatedDataLike_2 | {
        dataType: string;
        recId: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.MultipleDelegateActivities"***
     */
    MultipleDelegateActivities(activities: Array<UplcData>): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsPolicy::DelegateActivity.OtherActivities"***
     */
    OtherActivities(activity: UplcData): isActivity;
}

/**
 * declaration for one strategy-variant of a delegate role
 * @remarks
 *
 * Indicates the details needed to construct a delegate script
 *
 * NOTE: the Type param is always inferred by defineRole()
 * @public
 **/
export declare interface DelegateConfigDetails<DT extends StellarDelegate> {
    partialConfig?: PartialParamConfig<ConfigFor<DT>>;
    validateConfig?: (p: ConfigFor<DT>) => delegateConfigValidation;
}

/**
 * An error type for reflecting configuration problems at time of delegate setup
 * @remarks
 *
 * acts like a regular error, plus has an `errors` object mapping field names
 * to problems found in those fields.
 * @public
 **/
export declare class DelegateConfigNeeded extends Error {
    errors?: ErrorMap;
    availableDgtNames?: string[];
    constructor(message: string, options: {
        errors?: ErrorMap;
        availableDgtNames?: string[];
        errorRole?: string;
    });
}

/**
 * return type for a delegate-config's validateScriptParams()
 * @internal
 **/
declare type delegateConfigValidation = ErrorMap | undefined | void;
export { delegateConfigValidation }
export { delegateConfigValidation as strategyValidation }

/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***DelegateDatum*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateDatumHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateDatum, Partial<{
        Cip68RefToken: DelegateDatum$Cip68RefTokenLike;
        IsDelegation: DelegationDetailLike;
        capoStoredData: DelegateDatum$capoStoredDataLike;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"UnspecializedDelegate::DelegateDatum.Cip68RefToken"***
     * @remarks - ***DelegateDatum$Cip68RefTokenLike*** is the same as the expanded field-types.
     */
    Cip68RefToken(fields: DelegateDatum$Cip68RefTokenLike | {
        cip68meta: AnyDataLike_2;
        cip68version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"UnspecializedDelegate::DelegateDatum.IsDelegation"***
     * @remarks - ***DelegationDetailLike*** is the same as the expanded field-type.
     */
    IsDelegation(dd: DelegationDetailLike | {
        capoAddr: /*minStructField*/ Address | string;
        mph: /*minStructField*/ MintingPolicyHash | string | number[];
        tn: number[];
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"UnspecializedDelegate::DelegateDatum.capoStoredData"***
     * @remarks - ***DelegateDatum$capoStoredDataLike*** is the same as the expanded field-types.
     */
    capoStoredData(fields: DelegateDatum$capoStoredDataLike | {
        data: AnyDataLike_2;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}

/**
 * Helper class for generating InlineTxOutputDatum for variants of the ***DelegateDatum*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateDatumHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateDatum_2, Partial<{
        Cip68RefToken: DelegateDatum$Cip68RefTokenLike_2;
        IsDelegation: DelegationDetailLike_2;
        capoStoredData: DelegateDatum$capoStoredDataLike_2;
    }>>;
    /**
     * generates  InlineTxOutputDatum for ***"ReqtsData::DelegateDatum.Cip68RefToken"***
     * @remarks - ***DelegateDatum$Cip68RefTokenLike*** is the same as the expanded field-types.
     */
    Cip68RefToken(fields: DelegateDatum$Cip68RefTokenLike_2 | {
        cip68meta: AnyDataLike_3;
        cip68version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"ReqtsData::DelegateDatum.IsDelegation"***
     * @remarks - ***DelegationDetailLike*** is the same as the expanded field-type.
     */
    IsDelegation(dd: DelegationDetailLike_2 | {
        capoAddr: /*minStructField*/ Address | string;
        mph: /*minStructField*/ MintingPolicyHash | string | number[];
        tn: number[];
    }): InlineTxOutputDatum;
    /**
     * generates  InlineTxOutputDatum for ***"ReqtsData::DelegateDatum.capoStoredData"***
     * @remarks - ***DelegateDatum$capoStoredDataLike*** is the same as the expanded field-types.
     */
    capoStoredData(fields: DelegateDatum$capoStoredDataLike_2 | {
        data: ReqtDataLike_2;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
}

/**
 * @public
 */
export declare abstract class DelegatedDataBundle extends CapoDelegateBundle {
    scriptParamsSource: "config" | "bundle";
    /**
     * The delegate module specialization for this script bundle.
     * @remarks
     * Each delegated-data policy bundle needs to provide its own specialization, probably
     * by using a template, or by copying the UnspecializedDelegateScript and adding any
     * application-specific logic needed.
     *
     * The specialized module must export `DelegateActivity` and `DelegateDatum` enums,
     * each of which follows the conventions seen in the UnspecializedDelegateScript.
     * The DelegateActivity's additionalDelegateValidation() function must handle MintingActivities,
     * BurningActivities, and SpendingActivities, to govern the creation, updating, and deletion of
     * delegated-data records for defined variants of their nested enums indicating delegate-specific
     * activities.
     *
     * For example, a Vesting delegate might have SpendingActivities::AddingFunds and
     * SpendingActivities::WithdrawingVestedValue; its DelegateActivity::additionalDelegateValidation()
     * would handle each of these cases according to the application's needs, along with any
     * creation or deletion activities within those DelegateActivity variants.
     *
     * The `xxxLifecycleActivities` variants are not handled by DelegatedData specializations; the
     * Capo's mint/spend delegate governs these variants of delegate behaviors.  A delegate bundle
     * receiving these activities will throw errors by virtue of the BasicDelegate's logic.
     *
     * Likewise, the `xxxDelegateData` variants are not handled by DelegatedData specializations,
     * but by the mint/spend delegate, which transfers its responsbility for these activities to your
     * specialized delegate.
     *
     * @public
     */
    abstract specializedDelegateModule: Source;
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
    abstract requiresGovAuthority: boolean;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: boolean;
    };
}

/**
 * DelegatedDataContract provides a base class for utility functions
 * to simplify implementation of delegate controllers.  They are used
 * to manage the creation and updating of records in a delegated data store,
 * where the data is stored in a Capo, and the controller is forced into the
 * transaction by the Capo's delegate policy (or its spend-delegate's).
 *@public
 */
export declare abstract class DelegatedDataContract<T extends AnyDataTemplate<any, any>, TLike extends AnyDataTemplate<any, any>> extends ContractBasedDelegate {
    static isDgDataPolicy: boolean;
    static isMintDelegate: boolean;
    usesWrappedData?: boolean;
    dgDatumHelper: any;
    /**
     * when set to true, the controller class will include the Capo's
     * gov authority in the transaction, to ease transaction setup.
     * @remarks
     * This is a convenience for the controller, and should be used along with
     * the appropriate on-chain policy to require the gov token's presence.
     * @public
     * @deprecated - set requiresGovAuthority in the contract-bundle instead
     */
    get needsGovAuthority(): boolean;
    abstract get recordTypeName(): string;
    abstract get idPrefix(): string;
    abstract exampleData(): minimalData<TLike>;
    /**
     * Provides a customized label for the delegate, used in place of
     * a generic script name ("BasicDelegate").  DelegatedDataContract
     * provides a default name with the record type name and "Pol" suffix.
     *
     * Affects the on-chain logging for the policy and the compiled script
     * output in the script-cache on-disk or in browser's storage.
     */
    get delegateName(): string;
    abstract requirements(): ReqtsMap<any, any> | ReqtsMap<any, never>;
    get abstractBundleClass(): undefined | typeof DelegatedDataBundle;
    scriptBundleClass(): Promise<typeof DelegatedDataBundle>;
    /**
     * Finds records of this delegate's type, optionally by ID.
     * @remarks
     * Returns a record list when no ID is provided, or a single record when an ID is provided.
     */
    findRecords<THIS extends DelegatedDataContract<any, any>>(this: THIS): Promise<FoundDatumUtxo<T, TLike>[]>;
    /**
     * Finds one record of this delegate's type by id
     * @remarks
     * Returns a record list when no ID is provided, or a single record when an ID is provided.
     */
    findRecords<THIS extends DelegatedDataContract<any, any>, ID extends undefined | string | UutName | number[]>(this: THIS, options: {
        id: ID;
    }): Promise<FoundDatumUtxo<T, TLike>>;
    mkDgDatum<THIS extends DelegatedDataContract<any, any>>(this: THIS, record: TLike): InlineDatum;
    /**
     * Intuition hook redirecting to activity.MintingActivities.$seeded$...
     * @remarks
     * @deprecated use activites.MintingActivites.$seeded$* accessors/methods instead.
     */
    usesSeedActivity<SA extends seedActivityFunc<any, any>>(a: SA, seedPlaceholder: "...seed", ...args: SeedActivityArg<SA>): void;
    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     */
    mkTxnCreateRecord<THIS extends DelegatedDataContract<any, any>, TCX extends StellarTxnContext>(this: THIS, options: DgDataCreationOptions<TLike>, tcx?: TCX): Promise<hasUutContext<THIS["idPrefix"] | "recordId"> & TCX & hasCharterRef & hasSeedUtxo & hasUutContext<"recordId" | (string extends THIS["idPrefix"] ? "‹idPrefix (hint: declare with 'idPrefix = \"...\" as const')›" : THIS["idPrefix"])>>;
    creationDefaultDetails(): Partial<TLike>;
    beforeCreate(record: TLike): TLike;
    txnCreatingRecord<THIS extends DelegatedDataContract<any, any>, TCX extends StellarTxnContext & hasCharterRef & hasSeedUtxo & hasUutContext<"recordId">>(this: THIS, tcx: TCX, options: CoreDgDataCreationOptions<TLike>): Promise<TCX & hasUutContext<"recordId" | (string extends DelegatedDatumIdPrefix<THIS> ? "‹idPrefix (hint: declare with 'idPrefix = \"...\" as const')›" : DelegatedDatumIdPrefix<THIS>)>>;
    /**
     * Creates an indirect reference to an an update activity with arguments,
     * using a record-id placeholder.
     *
     * @remarks
     * Provide an update activity function, a placeholder for the record-id, any other args
     * for the on-chain activity/redeemer.  The update-activity function can be any of this
     * contract's `activity.SpendingActivities.*` functions.
     *
     * This approach is similar to the creation-time {@link DelegatedDataContract.usesSeedActivity|usesSeedActivity()} method,
     * with a "...recId" placeholder instead of a "...seed" placeholder.
     *
     * The arguments are passed to the update activity function, which is expected to return
     * an {@link isActivity} object serializing the `{redeemer}` data as a UplcData object.
     * Normally that's done with {@link ContractBasedDelegate.mkSpendingActivity | mkSpendingActivity()}.
     */
    usesUpdateActivity<UA extends updateActivityFunc<any>>(a: UA, _idPlaceholder: "...recId", ...args: UpdateActivityArgs<UA>): UpdateActivity<UA, UpdateActivityArgs<UA>>;
    /**
     * Creates a transaction for updating a record in the delegated data store
     *
     * @remarks
     * Provide a transaction name, an existing item, and a controller activity to trigger.
     * The activity MUST either be an activity triggering one of the controller's SpendingActivity variants,
     * or the result of calling {@link DelegatedDataContract.usesUpdateActivity | usesUpdateActivity()}.
     *   **or TODO support a multi-activity**
     *
     * The updatedRecord only needs to contain the fields that are being updated.
     */
    mkTxnUpdateRecord<TCX extends StellarTxnContext>(this: DelegatedDataContract<any, any>, txnName: string, item: FoundDatumUtxo<T, any>, options: DgDataUpdateOptions<TLike>, tcx?: TCX): Promise<TCX>;
    txnUpdatingRecord<TCX extends StellarTxnContext & hasCharterRef>(tcx: TCX, id: hasRecId, item: FoundDatumUtxo<T, any>, options: CoreDgDataUpdateOptions<TLike>): Promise<TCX>;
    getReturnAddress(): Address;
    returnUpdatedRecord<TCX extends StellarTxnContext & hasCharterRef>(tcx: TCX, returnedValue: Value, updatedRecord: TLike): TCX;
    moreInfo(): string;
    /**
     * Generates any needed transactions for updating the Capo manifest
     * to install or (todo: support for update) the policy for this delegate.
     * @remarks
     * The default implementation checks for the presence of the delegate policy
     * in the Capo's manifest, and if not found, creates a transaction to install it.
     *
     * The data-controller class's recordTypeName and idPrefix are used to
     * initialize the Capo's registry of data-controllers.  You may also implement
     * a moreInfo() method to provide more on-screen context about the
     * data-controller's role for administrators and/or end-users; the moreInfo
     * will be displayed in the Capo's on-screen policy-management (administrative)
     * interface, and you may also display it elsewhere in your application.
     *
     * To add any other transactions that may be needed for the delegate to operate
     * effectively, override this method, call `super(...args)`, and then add your
     * additional transactions using tcx.includeAddlTxn(...).  In that case, be sure to
     * perform any needed queries for ***fresh state of the on-chain data***, such as
     * for settings or the Capo's fresh charter data, INSIDE your mkTcx() function.
     */
    setupCapoPolicy(tcx: StellarTxnContext, typeName: string, options: {
        charterData: CharterData;
        capoUtxos: TxInput[];
    }): Promise<undefined>;
}

/**
 * @public
 */
export declare type DelegatedDataPredicate<DATUM_TYPE extends AnyDataTemplate<any, any>> = (utxo: TxInput, data: DATUM_TYPE) => boolean;

declare type DelegatedDatumIdPrefix<T extends DelegatedDataContract<any, any>, TN extends string = T["idPrefix"]> = TN;

/**
 * @public
 */
export declare type DelegatedDatumTypeName<T extends DelegatedDataContract<any, any>, TN extends string = T["recordTypeName"]> = TN;

/**
 * @public
 */
declare type DelegateDeployment = {
    config: minimalDelegateConfig;
    scriptHash: string;
    programBundle?: PrecompiledProgramJSON;
};

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateLifecycleActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateLifecycleActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity_2, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike_2;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateLifecycleActivityHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): {
        redeemer: UplcData;
    };
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateLifecycleActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateLifecycleActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateLifecycleActivity_2, Partial<{
        ReplacingMe: DelegateLifecycleActivity$ReplacingMeLike_2;
        Retiring: tagOnly;
        ValidatingSettings: tagOnly;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$ReplacingMe}` for use in a context
     * providing an implicit seed utxo.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    ReplacingMe(value: hasSeed, fields: {
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***
     * with raw seed details included in fields.
     */
    ReplacingMe(fields: DelegateLifecycleActivity$ReplacingMeLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ReplacingMe"***,
     * @param fields - \{ purpose: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$ReplacingMe({ purpose })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    $seeded$ReplacingMe: (fields: {
        purpose: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
    }) => isActivity>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.Retiring"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Retiring(): {
        redeemer: UplcData;
    };
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateLifecycleActivity.ValidatingSettings"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get ValidatingSettings(): {
        redeemer: UplcData;
    };
}

/**
 * Richly-typed structure that can capture the various delegation roles available
 * in a Capo contract
 * @remarks
 *
 * Defined in a delegateRoles() method using the standalone delegateRoles()
 * and defineRole() helper functions.
 * @typeParam KR - deep, strong type of the role map - always inferred by
 * delegateRoles() helper.
 * @public
 **/
export declare type DelegateMap<KR extends Record<string, DelegateSetup<any, any, any>>> = {
    [roleName in keyof KR]: KR[roleName];
};

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateRoleHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateRoleHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_2, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateRoleHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole_3, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***DelegateRole*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class DelegateRoleHelperNested extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<DelegateRole, Partial<{
        MintDgt: tagOnly;
        SpendDgt: tagOnly;
        MintInvariant: tagOnly;
        SpendInvariant: tagOnly;
        DgDataPolicy: string;
        OtherNamedDgt: string;
        BothMintAndSpendDgt: tagOnly;
        HandledByCapoOnly: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get MintDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get SpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.MintInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#2***
     */
    get MintInvariant(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.SpendInvariant"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get SpendInvariant(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.DgDataPolicy"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    DgDataPolicy(name: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::DelegateRole.OtherNamedDgt"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    OtherNamedDgt(name: string): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.BothMintAndSpendDgt"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#6***
     */
    get BothMintAndSpendDgt(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::DelegateRole.HandledByCapoOnly"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#7***
     */
    get HandledByCapoOnly(): UplcData;
}

/**
 * Standalone helper method defining a specific DelegateMap; used in a Capo's delegateRoles() instance method
 * @remarks
 *
 * Called with a set of literal role defintitions, the full type  of the DelegateMap is inferred.
 *
 * Use {@link defineRole}() to create each role entry
 *
 * @param roleMap - maps role-names to role-definitions
 * @typeParam RM - inferred type of the `delegateMap` param
 * @public
 **/
export declare function delegateRoles<const RM extends DelegateMap<any>>(delegateMap: RM): DelegateMap<RM>;

/**
 * Describes one delegation role used in a Capo contract
 * @remarks
 *
 * Includes the controller / delegate class, the configuration details for that class,
 * and a uutPurpose (base name for the authority tokens).
 *
 * All type-parameters are normally inferred from {@link defineRole}()
 *
 * @public
 **/
export declare type DelegateSetup<DT extends DelegateTypes, SC extends (DT extends "dgDataPolicy" ? DelegatedDataContract<any, any> : StellarDelegate), CONFIG extends DelegateConfigDetails<SC>> = {
    uutPurpose: string;
    delegateType: DelegateTypes;
    delegateClass: stellarSubclass<SC>;
    config: CONFIG;
};

/**
 * @public
 */
export declare type DelegateSetupWithoutMintDelegate = {
    withoutMintDelegate: useRawMinterSetup;
    skipReturningDelegate?: true;
};

declare type DelegateTypes = "spendDgt" | "mintDgt" | "authority" | "dgDataPolicy" | "other";

/**
 * Captures normal details of every delegate relationship
 * @remarks
 *
 * Includes the address of the leader contract, its minting policy, and the token-name
 * used for the delegate
 * @public
 **/
declare type DelegationDetail = {
    capoAddr: Address;
    mph: MintingPolicyHash;
    tn: number[];
};

/**
 * @public
 */
declare type DeployedConfigWithVariants = {
    [name: string]: DeployedScriptDetails;
} & {
    singleton?: never;
};

/**
 * @public
 */
export declare type DeployedScriptDetails<CT extends configBase = configBase, form extends "json" | "native" = "native"> = {
    config: form extends "json" ? any : CT;
    scriptHash?: number[];
    programName?: string;
};

/**
 * @public
 */
declare type DeployedSingletonConfig<CT extends configBase = configBase> = {
    singleton: DeployedScriptDetails<CT>;
};

/**
 * @public
 * @deprecated use minimalDgDataTypeLike instead
 */
export declare type DgDataCreationAttrs<T extends DelegatedDataContract<any, any>> = Omit<DgDataTypeLike<T>, "id" | "type">;

/**
 * @public
 */
export declare type DgDataCreationOptions<TLike extends AnyDataTemplate<any, any>> = {
    data: minimalData<TLike>;
    activity?: isActivity | SeedActivity<any>;
    addedUtxoValue?: Value;
};

/**
 * @public
 */
export declare type DgDataType<T extends DelegatedDataContract<any, any>> = T extends DelegatedDataContract<infer T, infer TLike> ? T : never;

/**
 * @public
 */
export declare type DgDataTypeLike<T extends DelegatedDataContract<any, any>> = T extends DelegatedDataContract<infer T, infer TLike> ? TLike : never;

/**
 * @public
 */
export declare type DgDataUpdateOptions<TLike extends AnyDataTemplate<any, any>> = {
    activity: isActivity | UpdateActivity<any>;
    updatedFields: Partial<minimalData<TLike>>;
    addedUtxoValue?: Value;
};

/**
 * @internal
 */
export declare type dgtStateKey<N extends string, PREFIX extends string = "dgPol"> = `${PREFIX}${Capitalize<N>}`;

/**
 * Displays a token name in a human-readable form
 * @remarks
 * Recognizes CIP-68 token names and displays them in a special format.
 * @param nameBytesOrString - the token name, as a string or byte array
 * @public
 */
export declare function displayTokenName(nameBytesOrString: string | number[]): string;

/**
 * @public
 */
export declare class DraftEternlMultiSigner extends GenericSigner {
    canBatch: boolean;
    signTxBatch(batch: BatchSubmitController): Promise<any>;
}

/**
 * Converts any (supported) input arg to string
 * @remarks
 *
 * more types to be supported TODO
 * @public
 **/
export declare function dumpAny(x: undefined | Tx | StellarTxnContext | Address | MintingPolicyHash | Value | Assets | TxOutputId | TxOutput | TxOutput[] | TxInput | TxInput[] | TxId | number[] | ByteArrayData | ByteArrayData[], networkParams?: NetworkParams, forJson?: boolean): any;

declare type EachUnionElement<Union> = ReverseTuple<ReversedAllOfUnion<Union>>;

declare type EmptyConstructor<T> = new () => T;

/**
 * EnumMaker provides a way to create UplcData for enums.  It optionally includes an activity wrapper \{ redeemer: UplcData \}
 * ... and honors a nested context to inject (instead of UPLC-ing) typed, nested data into a parent context for uplc formatting.
 * @public
 */
export declare class EnumBridge<TYPE extends isActivity | isDatum | JustAnEnum = JustAnEnum, uplcReturnType = isActivity extends TYPE ? {
    redeemer: UplcData;
} : UplcData> extends DataBridge {
    constructor(options: DataBridgeOptions);
    mkUplcData(value: any, enumPathExpr: string): uplcReturnType;
}

declare type EnumId = {
    module: string;
    enumName: string;
};

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum,
 * for generating the types for reading and writing data conforming to the type.
 * @public
 */
export declare type EnumTypeMeta<EID extends EnumId, enumVariants extends VariantMap> = {
    NEVER_INSTANTIATED: "?maybe?";
    SEE_BUNDLE_CLASS: "accessor gateway there";
    kind: "enum";
    enumId: EID;
    variants: {
        [k in keyof enumVariants]: enumVariants[k];
    };
};

/**
 * @public
 */
export declare const environment: {
    DEBUG: number;
    CARDANO_NETWORK: string;
    BF_API_KEY: string;
    NODE_ENV: string;
    OPTIMIZE: number;
    cwd: string;
};

export { ErgoCapoManifestEntry }

export { ErgoPendingCharterChange }

/**
 * Reveals errors found during delegate selection
 * @remarks
 *
 * Each field name is mapped to an array of string error messages found on that field.
 * @public
 **/
export declare type ErrorMap = Record<string, string[]>;

/**
 * Converts an Errors object to a string for onscreen presentation
 * @public
 **/
export declare function errorMapAsString(em: ErrorMap, prefix?: string): string;

/**
 * type debugging - typeinfo
 * @public
 */
export declare type Expand<T> = T extends (...args: infer A) => infer R ? (...args: Expand<A>) => Expand<R> : T extends infer O ? {
    [K in keyof O]: O[K];
} : never;

declare type _extractLastInspectableElement<F> = F extends {
    (a: infer UnionElement): void;
} ? UnionElement : never;

declare type ExtractLastOfUnion<Union> = _extractLastInspectableElement<_intersectInspectFuncs<_inspectableUnionFuncs<Union>>>;

declare type ExtractRestOfUnion<Union> = Exclude<Union, ExtractLastOfUnion<Union>>;

/**
 * @public
 */
export declare type FindableViaCharterData = {
    charterData?: CharterData;
    optional?: true;
};

/**
 * extracts the activity type from the declarations in its dataBridgeClass
 * @public
 */
export declare type findActivityType<T extends canHaveDataBridge, isSCBaseClass extends AnySC extends T ? true : false = AnySC extends T ? true : false, CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>, activityHelper = CBT extends {
    activity: infer A;
} ? A : never> = IF<IF<CBT["isAbstract"], true, IF<isSCBaseClass, true, false, CANNOT_ERROR>, CANNOT_ERROR>, DataBridge, activityHelper, // CBT extends { activity: infer A } ? CBT["activity"] : never, //    activityHelper,
CANNOT_ERROR>;

/**
 * @public
 */
export declare type findReadDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = possiblyAbstractContractBridgeType<T>> = IF<CBT["isAbstract"], readsUplcTo<any>, undefined extends CBT["datum"] ? never : undefined extends CBT["readDatum"] ? never : CBT["readDatum"]>;

/**
 * @public
 */
declare type Formatter = {
    start: string;
    end: string;
} & ((input: string | number | null | undefined) => string);

/**
 * @public
 */
export declare type FoundCharterUtxo = {
    utxo: TxInput;
    datum: InlineDatum;
    data: CharterData;
};

/**
 * Pre-parsed results of finding and matching contract-held UTxOs
 * with datum details.
 * @public
 */
export declare type FoundDatumUtxo<DelegatedDatumType extends AnyDataTemplate<any, any>, WRAPPED_DatumType extends any = any> = {
    utxo: TxInput;
    datum: InlineDatum;
    data?: DelegatedDatumType;
    dataWrapped?: WRAPPED_DatumType;
};

/**
 * represents a UUT found in a user-wallet, for use in authorizing a transaction
 * @public
 */
export declare type FoundUut = {
    utxo: TxInput;
    uut: UutName;
};

/**
 * @internal
 */
export declare type funcWithImpliedSeed<FACTORY_FUNC extends seedActivityFunc<any, any>> = IFISNEVER<SeedActivityArg<FACTORY_FUNC>, () => SeedActivity<FACTORY_FUNC>, SeedActivityArg<FACTORY_FUNC> extends NeedsSingleArgError ? never : (fields: SeedActivityArg<FACTORY_FUNC>) => SeedActivity<FACTORY_FUNC>>;

/**
 * @public
 */
export declare type GenericDelegateBridge = ContractDataBridgeWithEnumDatum & Pick<UnspecializedDelegateBridge, "isAbstract" | "readData"> & {
    reader: SomeDgtBridgeReader;
    activity: EnumBridge<isActivity> & SomeDgtActivityHelper;
    DelegateActivity: EnumBridge<isActivity> & SomeDgtActivityHelper;
    datum: EnumBridge<JustAnEnum> & SomeDgtDatumHelper<any>;
    DelegateDatum: SomeDgtDatumHelper<any>;
    readDatum: (d: UplcData) => GenericDelegateDatum;
    types: Pick<UnspecializedDelegateBridge["types"], "DelegateRole" | "ManifestActivity" | "CapoLifecycleActivity" | "DelegateLifecycleActivity" | "DelegationDetail"> & {
        SpendingActivity: EnumBridge<JustAnEnum>;
        MintingActivity: EnumBridge<JustAnEnum>;
        BurningActivity: EnumBridge<JustAnEnum>;
        DelegateDatum: SomeDgtDatumHelper<any>;
        DelegateActivity: EnumBridge<isActivity>;
    };
};

/**
 * @public
 */
export declare type GenericDelegateBridgeClass = AbstractNew<GenericDelegateBridge>;

/**
 * @public
 */
export declare type GenericDelegateDatum = Partial<Pick<ErgoDelegateDatum, "Cip68RefToken" | "IsDelegation">> & {
    capoStoredData?: {
        data: AnyDataTemplate<any, any>;
        version: bigint;
        otherDetails: unknown;
    };
};

/**
 * @public
 */
export declare class GenericSigner extends WalletSigningStrategy {
    canBatch: boolean;
    signSingleTx(tx: Tx): Promise<Signature[]>;
}

/**
 * extracts a tx output id from a "has-seed" type of object, for use in
 * on-chain uniqueness assurances
 * @public
 */
export declare function getSeed(arg: hasSeed | TxOutputId): TxOutputId;

declare type GrantAuthorityOptions = {
    skipReturningDelegate?: true;
    ifExists?: (existingInput: TxInput, existingRedeemer: UplcData) => void;
};

declare type Group = {
    name: string;
    lines: (LineOrGroup)[];
    result?: string;
    collapsed?: boolean;
};

/**
 * A transaction context that includes additional transactions in its state for later execution
 * @remarks
 *
 * During the course of creating a transaction, the transaction-building functions for a contract
 * suite may suggest or require further transactions, which may not be executable until after the
 * current transaction is executed.  This type allows the transaction context to include such
 * future transactions in its state, so that they can be executed later.
 *
 * The future transactions can be executed using the {@link StellarTxnContext.queueAddlTxns}
 * helper method.
 * @public
 **/
export declare type hasAddlTxns<TCX extends StellarTxnContext<anyState>, existingStateType extends anyState = TCX["state"]> = StellarTxnContext<existingStateType & {
    addlTxns: Record<string, TxDescription<any, "buildLater!">>;
}>;

/**
 * used for transaction-context state having specific uut-purposes
 *
 * @public
 */
export declare type hasAllUuts<uutEntries extends string> = {
    uuts: uutPurposeMap<uutEntries>;
};

/**
 * @public
 */
export declare interface hasAnyDataTemplate<DATA_TYPE extends string, T extends anyDatumProps> {
    data: AnyDataTemplate<DATA_TYPE, T>;
}

/**
 * StellarTransactionContext exposing a bootstrapped Capo configuration
 * @remarks
 *
 * During first-time setup of a Capo contract, its manifest configuration details
 * should be captured for reproducibility, and this type allows the bootstrap
 * transaction to expose that configuration.
 *
 * {@link Capo.mkTxnMintCharterToken | mkTxnMintCharterToken()} returns a transaction context
 * of this type, with `state.bootstrappedConfig`;
 * @public
 **/
export declare type hasBootstrappedCapoConfig = StellarTxnContext<bootstrappedCapoConfig>;

/**
 * A transaction context having a reference to the Capo's charter
 * @remarks
 * The transaction will have a refInput pointing to the charter, for
 * on-chain delegate scripts' use
 *
 * The transaction context will have \{charterData, charterRef\} in its state
 * @public
 */
export declare type hasCharterRef = StellarTxnContext<{
    charterRef: TxInput;
    charterData: CharterData;
} & anyState>;

/**
 * @public
 */
export declare type hasGovAuthority = StellarTxnContext<anyState & {
    govAuthority: AuthorityPolicy;
}>;

/**
 * @public
 */
export declare type hasNamedDelegate<DT extends StellarDelegate, N extends string, PREFIX extends string = "namedDelegate"> = StellarTxnContext<anyState & {
    [k in dgtStateKey<N, PREFIX>]: ConfiguredDelegate<DT> & ErgoRelativeDelegateLink;
}>;

declare type hasRecId = string | number[] | UutName;

/**
 * Factory for type-safe requirements details for a unit of software
 * @public
 * @remarks
 * return `hasReqts({... requirements})` from a requirements() or other method in a class, to express
 * requirements using a standardized form that supports arbitrary amounts of detailed requirements
 * with references to unit-test labels that can verify the impl details.
 *
 * You don't need to provide the type params or TS type annotations.  `requirements() { return hasReqts({...yourReqts}) }` will work fine.
 *
 * See the {@link ReqtsMap} and {@link RequirementEntry} types for more details about expressing requirements.
 *
 * NOTE: Type parameters are inferred from the provided data structure
 * @param reqtsMap - the ReqtsMap structure for the software unit
 */
export declare function hasReqts<R extends ReqtsMap<validReqts, inheritedNames>, const validReqts extends string = string & keyof R, const inheritedNames extends string | never = never>(reqtsMap: R): ReqtsMap<validReqts, inheritedNames>;

export declare namespace hasReqts {
    var TODO: unique symbol;
}

/**
 * @public
 */
export declare type hasSeed = SeedAttrs | hasSeedUtxo | TxOutputIdLike;

/**
 * A txn context having a seedUtxo in its state
 * @public
 **/
export declare type hasSeedUtxo = StellarTxnContext<anyState & {
    seedUtxo: TxInput;
}>;

/**
 * A transaction context having a reference to the Capo's settings
 * @remarks
 * The transaction will have a refInput pointing to the settings record,
 * for any on-chain delegate scripts' use
 *
 * The transaction context will have \{settingsRef, settingsUtxo\} in its state.
 *
 * For more specific typing of the contents of the utxo's \{data, dataWrapped\},
 * you may add a type parameter to this type.
 * @public
 */
export declare type hasSettingsRef<SETTINGS_TYPE extends AnyDataTemplate<any, any> = AnyDataTemplate<any, any>, WRAPPED_SETTINGS = any> = StellarTxnContext<{
    settingsInfo: FoundDatumUtxo<SETTINGS_TYPE, WRAPPED_SETTINGS>;
} & anyState>;

/**
 * @public
 */
export declare type hasSpendDelegate = StellarTxnContext<anyState & {
    spendDelegate: ContractBasedDelegate;
}>;

declare type hasTimeout = {
    wrap?: Promise<any>;
    timeout: number;
    onTimeout: () => void;
};

/**
 * A txn context having specifically-purposed UUTs in its state
 * @public
 */
export declare type hasUutContext<uutEntries extends string> = StellarTxnContext<hasAllUuts<uutEntries>>;

declare type hasWrap = {
    wrap: Promise<any>;
};

/**
 * @public
 */
declare type HeliosBundleClassWithCapo = typeof HeliosScriptBundle & EmptyConstructor<HeliosScriptBundle> & {
    capoBundle: CapoHeliosBundle;
    isConcrete: true;
};

/**
 * @public
 */
declare type HeliosBundleTypes = {
    datum?: DataType;
    redeemer: DataType;
};

/**
 * @public
 */
export declare type HeliosOptimizeOptions = Exclude<Pick<Exclude<Parameters<Program["compile"]>[0], undefined | boolean>, "optimize">["optimize"], undefined | boolean>;

/**
 * Base class for any Helios script bundle
 * @remarks
 * See also {@link CapoHeliosBundle} and {@link CapoDelegateBundle}
 * and {@link DelegatedDataBundle} for specialized bundle types
 * @public
 */
export declare abstract class HeliosScriptBundle {
    /**
     * an indicator of a Helios bundle that is intended to be used as a Capo contract
     * @remarks
     * the CapoHeliosBundle class overrides this to true.
     * @internal
     */
    static isCapoBundle: boolean;
    abstract requiresGovAuthority: boolean;
    /**
     * set to true if the bundle depends on having a deployed capo's configuration details
     * @public
     */
    static needsCapoConfiguration: boolean;
    /**
     * an opt-in indicator of abstractness
     * @remarks
     * Subclasses that aren't intended for instantiation can set this to true.
     *
     * Subclasses that don't set this will not be treated as abstract.
     * @public
     */
    static isAbstract?: boolean | undefined;
    /**
     * Constructs a base class for any Helios script bundle,
     * given the class for an application-specific CapoHeliosBundle.
     * @remarks
     * The resulting class provides its own CapoHeliosBundle instance
     * for independent use (specifically, for compiling this bundle using
     * the dependency libraries provided by the Capo bundle).
     */
    static usingCapoBundleClass<CB extends CapoBundleClass>(c: CB, generic?: "generic" | false): HeliosBundleClassWithCapo;
    static create<THIS extends typeof HeliosScriptBundle>(this: THIS, setupDetails?: StellarBundleSetupDetails<any>): any;
    abstract scriptParamsSource: "config" | "bundle" | "none";
    capoBundle?: CapoHeliosBundle;
    isConcrete: boolean;
    configuredScriptDetails?: DeployedScriptDetails;
    /**
     * optional attribute explicitly naming a type for the datum
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the datum; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    datumTypeName?: string;
    /**
     * optional attribute explicitly naming a type for the redeemer
     * @remarks
     * This can be used if needed for a contract whose entry point uses an abstract
     * type for the redeemer; the type-bridge & type-gen system will use this data type
     * instead of inferring the type from the entry point.
     */
    redeemerTypeName: string;
    isMainnet: boolean;
    _program: HeliosProgramWithCacheAPI | undefined;
    previousOnchainScript: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    } | undefined;
    _progIsPrecompiled: boolean;
    setup: SetupOrMainnetSignalForBundle;
    setupDetails: StellarBundleSetupDetails<any>;
    ___id: number;
    _didInit: boolean;
    _selectedVariant?: string;
    debug: boolean;
    configuredUplcParams: UplcRecord_2<any> | undefined;
    configuredParams: any | undefined;
    precompiledScriptDetails?: {
        [variant: string]: DeployedScriptDetails<any, "native">;
    };
    alreadyCompiledScript: anyUplcProgram | undefined;
    constructor(setupDetails?: StellarBundleSetupDetails<any>);
    get hasAnyVariant(): boolean;
    init(setupDetails: StellarBundleSetupDetails<any>): void;
    get scriptHash(): number[];
    /**
     * deferred initialization of program details, preventing the need to
     * load the program prior to it actually being needed
     */
    initProgramDetails(): void;
    get isPrecompiled(): boolean;
    getPreCompiledBundle(variant: string): void;
    getPreconfiguredVariantParams(variantName: string): any;
    getPreconfiguredUplcParams(variantName: string): UplcRecord_2<any> | undefined;
    get params(): any;
    /**
     * The known variants of this contract script, with any contract
     * parameters applicable to each variant.  By default, there is a
     * singleton variant that uses the result of `get params()`.
     */
    get variants(): {
        [variantName: string]: any;
    };
    get main(): Source;
    /**
     * A list of modules always available for import to Capo-hosted policy scripts
     * @public
     */
    implicitIncludedCapoModules(): string[];
    /**
     * specifies a list module names to be included in the compilation of this script
     * @remarks
     * Only used in bundles created with `HeliosScriptBundle.usingCapoBundleClass()` or
     * `CapoDelegateBundle.usingCapoBundleClass()`.
     *
     * Each of these module-names MUST be provided by the CapoHeliosBundle used for
     * this script bundle (in its `get modules()`).  CapoMintHelpers, CapoDelegateHelpers,
     * StellarHeliosHelpers and CapoHelpers are always available for import to the
     * policy script, and the module names you list here will be added to that list.
     *
     * These module names will then be available for `import { ... }` statements in your helios script.
     *
     * ### Beware of Shifting Sands
     *
     * If you include any modules provided by other scripts in your project, you should
     * be aware that any material changes to those scripts will change your delegate's validator,
     * resulting in a need to deploy new script contracts.  This is why it's important to only include
     * modules that are relatively stable, or whose changes SHOULD trigger a new deployment
     * for this script.
     *
     * When you can use isolation techniques including abstract data definitions and/or granular
     * code-modularization, you can reduce the incidence of such changes while ensuring that needed
     * upgrades are easy to manage.
     * @public
     */
    includeFromCapoModules(): string[];
    /**
     * Computes a list of modules to be provided to the Helios compiler
     * @remarks
     * includes any explicit `modules` from your script bundle, along with any
     * modules, provided by your Capo and listed by name in your
     * `includeFromCapoModules()` method.
     * @public
     */
    getEffectiveModuleList(): Source[];
    resolveCapoIncludedModules(): Source[];
    logModuleDetails(): void;
    /**
     * lists any helios modules owned by & needed for this script bundle.
     * @remarks
     * Modules listed here should (imported from their .hl files as helios Source objects.
     *
     * Any modules shared ***from other script bundles in your project*** should instead be
     * added to your Capo's `modules`, and named in your `includeFromCapoModules()` method.
     *
     * Any of these modules needed by ***other script bundles*** in your project may also be
     * listed in your Capo's `modules`.
     */
    get modules(): Source[];
    get displayName(): string;
    get bridgeClassName(): string;
    /**
     * indicates whether the script should be optimized.
     * @remarks
     * Defaults to the general optimize setting provided by the factoryArgs.
     * Override to force optimization on or off.
     */
    get optimize(): HeliosOptimizeOptions | boolean | undefined;
    get moduleName(): string;
    /**
     * Sets the currently-selected variant for this bundle, asserting its presence
     * in the `variants()` list.
     */
    withVariant(vn: string): this;
    previousCompiledScript(): UplcProgramV2 | undefined;
    loadPrecompiledVariant(variant: string): Promise<PrecompiledProgramJSON>;
    /**
     * resolves the compiled script for this class with its provided
     * configuration details
     * @remarks
     * The configuration details & pre-compiled script may be injected by
     * the HeliosRollupBundler or by compiling the script with provided
     * params (in tests or during a first deployment of a Capo)
     *
     * When the asyncOk flag is not present, returns or fails synchronously.
     * With the asyncOk flag, returns synchronously if the script is already
     * compiled, or returns a Promise that resolves to the compiled script.
     */
    compiledScript(): anyUplcProgram;
    compiledScript(asyncOk: true): anyUplcProgram | Promise<anyUplcProgram>;
    get preBundledScript(): void;
    getSerializedProgramBundle(): Promise<{
        scriptHash: string;
        programBundle: {
            programElements: Record<string, string | Object>;
            version: "PlutusV2" | "PlutusV3";
            optimized: string | undefined;
            unoptimized: string | undefined;
            optimizedIR: string | undefined;
            unoptimizedIR: string | undefined;
            optimizedSmap: UplcSourceMapJsonSafe | undefined;
            unoptimizedSmap: UplcSourceMapJsonSafe | undefined;
        };
    }>;
    decodeAnyPlutusUplcProgram(version: "PlutusV2" | "PlutusV3", cborHex: string, ir?: string, sourceMap?: UplcSourceMapJsonSafe, alt?: anyUplcProgram): UplcProgramV2;
    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     */
    isDefinitelyMainnet(): boolean;
    get program(): HeliosProgramWithCacheAPI;
    loadProgram(): HeliosProgramWithCacheAPI;
    isHeliosScriptBundle(): boolean;
    addTypeProxies(): void;
    effectiveDatumTypeName(): string;
    /**
     * @internal
     */
    locateDatumType(): DataType | undefined;
    /**
     * @internal
     */
    locateRedeemerType(): DataType;
    get includeEnums(): string[];
    /**
     * @internal
     */
    getTopLevelTypes(): HeliosBundleTypes;
    /**
     * @internal
     */
    paramsToUplc<ConfigType extends configBase>(params: Record<string, any>): UplcRecord_2<ConfigType>;
    /**
     * @internal
     */
    typeToUplc(type: DataType, data: any, path?: string): UplcData;
}

/**
 * converts a hex string to a printable alternative, with no assumptions about the underlying data
 * @remarks
 *
 * Unlike Helios' bytesToText, hexToPrintable() simply changes printable characters to characters,
 * and represents non-printable characters in '‹XX›' format.
 * @param hexStr - hex input
 * @public
 **/
export declare function hexToPrintableString(hexStr: string): string;

/**
 * @public
 */
export declare type IF<T1 extends boolean | never, T2, ELSE = never, ERR_TYPE = unknown> = [
true | false
] extends [T1] ? ERR_TYPE : true extends T1 ? T2 : ELSE;

/**
 * @public
 */
export declare type IF_ISANY<T, IFANY, ELSE = never> = [0] extends [1 & T] ? IFANY : ELSE;

/**
 * @public
 */
export declare type IFISNEVER<T, IFNEVER, ELSE = never> = [T] extends [never] ? IFNEVER : ELSE;

/**
 * @internal
 */
export declare function impliedSeedActivityMaker<FACTORY_FUNC extends seedActivityFunc<any, any>, IMPLIED_SEED_FUNC extends funcWithImpliedSeed<FACTORY_FUNC> = funcWithImpliedSeed<FACTORY_FUNC>, ARG extends SeedActivityArg<FACTORY_FUNC> = SeedActivityArg<FACTORY_FUNC>>(host: {
    getSeed(x: hasSeed): TxOutputId;
}, factoryFunc: FACTORY_FUNC): IMPLIED_SEED_FUNC;

/**
 * @public
 */
export declare type InlineDatum = InlineTxOutputDatum;

declare type _inspectableUnionFuncs<U> = U extends any ? (k: U) => void : never;

declare type InstallPolicyDgtOptions<CAPO extends Capo<any>, TypeName extends string & keyof CAPO["delegateRoles"]> = {
    typeName: TypeName;
    idPrefix: string;
    charterData: CapoDatum$Ergo$CharterData_2;
};

declare type intersectedElements<T extends any[]> = T extends [infer A, ...infer B] ? A & intersectedElements<B> : {};

/**
 * @public
 */
export declare type IntersectedEnum<T, intersected = intersectedElements<EachUnionElement<T>>, merged = {
    [key in keyof intersected]: key extends keyof intersected ? intersected[key] : never;
}> = IFISNEVER<ExtractRestOfUnion<keyof intersected>, merged, Partial<merged>>;

declare type _intersectInspectFuncs<U> = _inspectableUnionFuncs<U> extends (k: infer MAGIC) => void ? MAGIC : never;

/**
 * a type for redeemer/activity-factory functions declared with \@Activity.redeemer
 *
 * @public
 */
export declare type isActivity = {
    redeemer: UplcData;
    details?: string;
};

/**
 * @public
 */
export declare const isDatum: unique symbol;

/**
 * @public
 */
export declare type isDatum = typeof isDatum;

/**
 * @public
 */
export declare type ISNEVER<T, ELSE = never> = [T] extends [never] ? true : ELSE;

/**
 * @public
 */
export declare const JustAnEnum: unique symbol;

/**
 * @public
 */
export declare type JustAnEnum = typeof JustAnEnum;

declare type LineOrGroup = string | Group;

/**
 * Converts lovelace to approximate ADA, in consumable 3-decimal form
 * @public
 */
export declare function lovelaceToAda(lovelace: bigint | number): string;

/**
 * creates ogmios connections for ledger-state and tx submission
 * @remarks
 * The connection string can be a simple http[s] url e.g. from TxPipe's ogmios service
 * (use their Authenticated Endpoint URL)
 * @public
 */
export declare function makeOgmiosConnection(conn: simpleOgmiosConn): Promise<{
    submitter: TransactionSubmissionClient;
    ledgerState: LedgerStateQueryClient;
    context: InteractionContext;
}>;

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike;
        addingEntry: ManifestActivity$addingEntryLike;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
        burningThreadToken: ManifestActivity$burningThreadTokenLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_2, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_2;
        addingEntry: ManifestActivity$addingEntryLike_2;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_2;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_2 | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_2 | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestActivityHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_3, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_3;
        addingEntry: ManifestActivity$addingEntryLike_3;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_3;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     */
    retiringEntry(key: string): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_3 | {
        key: string;
        newThreadCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_3 | {
        key: string;
        burnedThreadCount: IntLike;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestActivityHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike;
        addingEntry: ManifestActivity$addingEntryLike;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike;
        burningThreadToken: ManifestActivity$burningThreadTokenLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_2, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_2;
        addingEntry: ManifestActivity$addingEntryLike_2;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_2;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_2;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_2 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_2 | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_2 | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestActivityHelperNested_3 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestActivity_3, Partial<{
        retiringEntry: string;
        updatingEntry: ManifestActivity$updatingEntryLike_3;
        addingEntry: ManifestActivity$addingEntryLike_3;
        forkingThreadToken: ManifestActivity$forkingThreadTokenLike_3;
        burningThreadToken: ManifestActivity$burningThreadTokenLike_3;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.retiringEntry"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    retiringEntry(key: string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.updatingEntry"***
     * @remarks - ***ManifestActivity$updatingEntryLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    updatingEntry(fields: ManifestActivity$updatingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.addingEntry"***
     * @remarks - ***ManifestActivity$addingEntryLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    addingEntry(fields: ManifestActivity$addingEntryLike_3 | {
        key: string;
        tokenName: number[];
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.forkingThreadToken"***
     * @remarks - ***ManifestActivity$forkingThreadTokenLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    forkingThreadToken(fields: ManifestActivity$forkingThreadTokenLike_3 | {
        key: string;
        newThreadCount: IntLike;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoDelegateHelpers::ManifestActivity.burningThreadToken"***
     * @remarks - ***ManifestActivity$burningThreadTokenLike*** is the same as the expanded field-types.
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    burningThreadToken(fields: ManifestActivity$burningThreadTokenLike_3 | {
        key: string;
        burnedThreadCount: IntLike;
    }): isActivity;
}

/**
 * @public
 */
export declare type ManifestEntryTokenRef = Omit<CapoManifestEntryLike_2, "entryType"> & {
    entryType: Pick<CapoManifestEntryLike_2["entryType"], "NamedTokenRef">;
};

/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestEntryTypeHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike | {
        policyLink: RelativeDelegateLinkLike;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike | {
        role: DelegateRoleLike;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestEntryTypeHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType_2, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike_2;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike_2;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike_2 | {
        policyLink: RelativeDelegateLinkLike_4;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike_2 | {
        role: DelegateRoleLike_2;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***ManifestEntryType*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class ManifestEntryTypeHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<ManifestEntryType_3, Partial<{
        NamedTokenRef: tagOnly;
        DgDataPolicy: ManifestEntryType$DgDataPolicyLike_3;
        DelegateThreads: ManifestEntryType$DelegateThreadsLike_3;
        MerkleMembership: tagOnly;
        MerkleStateRoot: tagOnly;
    }>>;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.NamedTokenRef"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#0***
     */
    get NamedTokenRef(): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DgDataPolicy"***
     * @remarks - ***ManifestEntryType$DgDataPolicyLike*** is the same as the expanded field-types.
     */
    DgDataPolicy(fields: ManifestEntryType$DgDataPolicyLike_3 | {
        policyLink: RelativeDelegateLinkLike_5;
        idPrefix: string;
        refCount: IntLike;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoHelpers::ManifestEntryType.DelegateThreads"***
     * @remarks - ***ManifestEntryType$DelegateThreadsLike*** is the same as the expanded field-types.
     */
    DelegateThreads(fields: ManifestEntryType$DelegateThreadsLike_3 | {
        role: DelegateRoleLike_3;
        refCount: IntLike;
    }): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleMembership"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#3***
     */
    get MerkleMembership(): UplcData;
    /**
     * (property getter): UplcData for ***"CapoHelpers::ManifestEntryType.MerkleStateRoot"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#4***
     */
    get MerkleStateRoot(): UplcData;
}

declare type MCP_options = wrapOnly | hasTimeout | wrapWithTimeout;

/**
 * Factory for type-safe requirements combining inherited requirements with subclass-specific requirements
 * @remarks
 *
 * Use this method to combine the requirements of a subclass with the requirements of its superclass.  This
 * allows the subclass, in its requires: [ ... ] section, to reference capabilities of the base class that the subclass depends on.
 *
 * See the {@link ReqtsMap} and {@link RequirementEntry} types for more details about expressing requirements.
 *
 * @param inherits - the requirements of the base class
 * @param reqtsMap - the requirements of the subclass
 * @public
 **/
export declare function mergesInheritedReqts<IR extends ReqtsMap<inheritedReqts>, R extends ReqtsMap<myReqts, inheritedReqts>, const inheritedReqts extends string = string & keyof IR, const myReqts extends string = keyof R extends keyof IR ? never : string & keyof R>(inherits: IR, reqtsMap: R): ReqtsMap<myReqts | inheritedReqts, inheritedReqts> & IR;

/**
 * Schema for initial setup of Charter Datum - state stored in the Leader contract
 * together with its primary or "charter" utxo.  Converted from this convenient form
 * to the on-chain form during mkTxnMintCharterToken().
 * @public
 **/
export declare interface MinimalCharterDataArgs extends configBase {
    spendDelegateLink: OffchainPartialDelegateLink;
    spendInvariants: OffchainPartialDelegateLink[];
    otherNamedDelegates: Map<string, OffchainPartialDelegateLink>;
    mintDelegateLink: OffchainPartialDelegateLink;
    mintInvariants: OffchainPartialDelegateLink[];
    govAuthorityLink: OffchainPartialDelegateLink;
    manifest: Map<string, OffchainPartialDelegateLink>;
}

/**
 * for a delegated-data record type, omits the id and type fields to indicate
 * the minimal fields needed for records of that type
 * @public
 */
export declare type minimalData<T extends AnyDataTemplate<any, anyDatumProps>> = Omit<T, "id" | "type">;

declare type minimalDelegateConfig = Pick<capoDelegateConfig, "rev" | "delegateName"> & {
    rev: bigint;
    delegateName: string;
    isMintDelegate: true;
    isSpendDelegate: true;
    isDgDataPolicy: false;
};

/**
 * Includes key details needed to create a delegate link
 * @remarks
 *
 * uutName can't be specified in this structure because creating a delegate link
 * should use txnMustGetSeedUtxo() instead, minting a new UUT for the purpose.
 * If you seek to reuse an existing uutName, probably you're modifying an existing
 * full RelativeDelegateLink structure instead - e.g. with a different `strategy` and
 * `config`; this type wouldn't be involved in that case.
 *
 * @public
 **/
export declare type MinimalDelegateLink = Partial<OffchainPartialDelegateLink>;

/**
 * Delegate updates can, in an "escape hatch" scenario, be forced by sole authority
 * of the Capo's govAuthority.  While the normal path of update involves the existing
 * mint/spend delegate's involvement, a forced update can be used to bypass that route.
 * This provides that signal.
 * @public
 */
export declare type MinimalDelegateUpdateLink = Omit<OffchainPartialDelegateLink, "uutName"> & {
    forcedUpdate?: true;
};

/**
 * use for new or updated record data, where id and type can
 * be implied instead of explicitly provided
 * @public
 */
export declare type minimalDgDataTypeLike<T extends DelegatedDataContract<any, any>> = minimalData<DgDataTypeLike<T>>;

declare type MintCharterActivityArgs<T = {}> = T & {
    owner: Address;
};

/**
 * Helper class for generating UplcData for variants of the ***MinterActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class MinterActivityHelper extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<MinterActivity, Partial<{
        mintingCharter: Address | string;
        mintWithDelegateAuthorizing: tagOnly;
        addingMintInvariant: TxOutputId | string;
        addingSpendInvariant: TxOutputId | string;
        forcingNewMintDelegate: TxOutputId | string;
        CreatingNewSpendDelegate: MinterActivity$CreatingNewSpendDelegateLike;
    }>>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.mintingCharter"***
     */
    mintingCharter(owner: Address | string): isActivity;
    /**
     * (property getter): UplcData for ***"CapoMintHelpers::MinterActivity.mintWithDelegateAuthorizing"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get mintWithDelegateAuthorizing(): {
        redeemer: UplcData;
    };
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingMintInvariant"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$addingMintInvariant}` variant of this activity instead
     *
     */
    addingMintInvariant(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingMintInvariant"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$addingMintInvariant`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$addingMintInvariant(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingSpendInvariant"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$addingSpendInvariant}` variant of this activity instead
     *
     */
    addingSpendInvariant(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.addingSpendInvariant"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$addingSpendInvariant`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$addingSpendInvariant(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.forcingNewMintDelegate"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$forcingNewMintDelegate}` variant of this activity instead
     *
     */
    forcingNewMintDelegate(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.forcingNewMintDelegate"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$forcingNewMintDelegate`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$forcingNewMintDelegate(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$CreatingNewSpendDelegate}` for use in a context
     * providing an implicit seed utxo.
     */
    CreatingNewSpendDelegate(value: hasSeed, fields: {
        replacingUut: number[] | undefined;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***
     * with raw seed details included in fields.
     */
    CreatingNewSpendDelegate(fields: MinterActivity$CreatingNewSpendDelegateLike | {
        seed: TxOutputId | string;
        replacingUut: number[] | undefined;
    }): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"CapoMintHelpers::MinterActivity.CreatingNewSpendDelegate"***,
     * @param fields - \{ replacingUut: number[] | undefined \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$CreatingNewSpendDelegate({ replacingUut })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$CreatingNewSpendDelegate: (fields: {
        replacingUut: number[] | undefined;
    }) => SeedActivity<(value: hasSeed, fields: {
        replacingUut: number[] | undefined;
    }) => isActivity>;
}

/**
 * charter-minting interface
 * @public
 */
export declare interface MinterBaseMethods {
    get mintingPolicyHash(): MintingPolicyHashLike;
    txnMintingCharter<TCX extends StellarTxnContext>(tcx: TCX, charterMintArgs: {
        owner: Address;
        capoGov: UutName;
    }, tVal: valuesEntry): Promise<TCX>;
    txnMintWithDelegateAuthorizing<TCX extends StellarTxnContext>(tcx: TCX, vEntries: valuesEntry[], delegate: BasicMintDelegate, redeemer: isActivity): Promise<TCX>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class MintingActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1MA: TxOutputId;
    }, {
        _placeholder1MA: TxOutputId | string;
    }>;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$_placeholder1MA}` variant of this activity instead
     *
     */
    _placeholder1MA(thingWithSeed: hasSeed | TxOutputId | string): UplcData;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$_placeholder1MA`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$_placeholder1MA(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class MintingActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        CreatingRecord: TxOutputId;
    }, {
        CreatingRecord: TxOutputId | string;
    }>;
    /**
     * generates  UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$CreatingRecord}` variant of this activity instead
     *
     */
    CreatingRecord(thingWithSeed: hasSeed | TxOutputId | string): UplcData;
    /**
     * generates  UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$CreatingRecord`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     */
    get $seeded$CreatingRecord(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class MintingActivityHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1MA: TxOutputId;
    }, {
        _placeholder1MA: TxOutputId | string;
    }>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$_placeholder1MA}` variant of this activity instead
     *
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    _placeholder1MA(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::MintingActivity._placeholder1MA"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$_placeholder1MA`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    get $seeded$_placeholder1MA(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
}

/**
 * Helper class for generating UplcData for variants of the ***MintingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class MintingActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        CreatingRecord: TxOutputId;
    }, {
        CreatingRecord: TxOutputId | string;
    }>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***,
     * given a transaction-context (or direct arg) with a ***seed utxo***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     *  - to get a transaction context having the seed needed for this argument,
     *    see the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass.
     * - or see Stellar Contracts' `hasSeed` type for other ways to feed it with a TxOutputId.
     *  - in a context providing an implicit seed utxo, use
     *    the `$seeded$CreatingRecord}` variant of this activity instead
     *
     * ##### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    CreatingRecord(thingWithSeed: hasSeed | TxOutputId | string): isActivity;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::MintingActivity.CreatingRecord"***
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     * #### Usage
     * Access the activity-creator as a getter: `$seeded$CreatingRecord`
     *
     * Use the resulting activity-creator in a seed-providing context, such as the delegated-data-controller's
     * `mkTxnCreateRecord({activity, ...})` method.
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    get $seeded$CreatingRecord(): SeedActivity<(thingWithSeed: hasSeed | TxOutputId | string) => isActivity>;
}

/**
 * base class for helios code bundles for a mint/spend delegate
 * @public
 */
export declare abstract class MintSpendDelegateBundle extends CapoDelegateBundle {
    /**
     * The delegate module specialization for this mint/spend delegate script.
     * @remarks
     * Basic mint/spend delegates can use the UnspecializedDelegateScript for this purpose.
     *
     * For more advanced mint/spend delegates, you may start from a template
     * or copy the UnspecializedDelegateScript and add any application-specific logic needed.
     *
     * @public
     */
    abstract specializedDelegateModule: Source;
    requiresGovAuthority: boolean;
    scriptParamsSource: "config";
    /**
     * returns an unspecialized module that works for basic use-cases of mint/spend delegate
     * @public
     */
    get unspecializedDelegateModule(): Source;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: true;
    };
}

declare type MintTokensParams = [
MintUnsafeParams[0],
MintUnsafeParams[1],
    {
    redeemer: MintUnsafeParams[2];
}
];

declare type MintUnsafeParams = Parameters<TxBuilder["mintPolicyTokensUnsafe"]>;

/**
 * UUT minting should always use these settings to guard for uniqueness
 *
 * @public
 */
export declare type MintUutActivityArgs = {
    seed: TxOutputId;
    purposes: string[];
};

/**
 * @public
 */
export declare function mkCancellablePromise<T>(options?: MCP_options): MCP_options extends hasWrap ? WrappedPromise<T> : ResolveablePromise<T>;

/**
 * type-safe factory function for creating a Capo deployment details object
 * with details of its scripts deployed to the on-chain environment
 * @remarks
 * use this to make your Capo bundle's deployedDetails attribute.
 * @public
 */
export declare function mkCapoDeployment({ capo, }: Required<CapoDeployedDetails<"json">>): {
    capo: DeployedScriptDetails<CapoConfig, "native">;
};

/**
 * type-safe factory function for creating a Delegate deployment details object
 * @public
 */
export declare function mkDelegateDeployment(ddd: DelegateDeployment): DelegateDeployment;

/**
 * type-safe factory function for creating a registry of scripts with their
 * deployment details for the on-chain environment
 * @remarks
 * use this in your Capo bundle's `config()` function
 *
 * The registry is indexed by each script's moduleName, and contains a list of
 * deployed configurations for that script, with configuration details,
 * on-chain script hash, and program CBOR.
 * @public
 */
export declare function mkDeployedScriptConfigs(x: AllDeployedScriptConfigs): AllDeployedScriptConfigs;

/**
 * @internal
 */
export declare function mkDgtStateKey<const N extends string, const PREFIX extends string = "dgPoi">(n: N, p?: PREFIX): dgtStateKey<N, PREFIX>;

/**
 * Creates Value-creation entires for a list of uuts
 * @remarks
 *
 * returns a list of `entries` usable in Value's `[mph, entries[]]` tuple.
 * @param uuts - a list of {@link UutName}s or a {@link uutPurposeMap}
 * @public
 **/
export declare function mkUutValuesEntries(uuts: UutName[]): valuesEntry[];

/** @public **/
export declare function mkUutValuesEntries(uuts: uutPurposeMap<any>): valuesEntry[];

/** @public **/
export declare function mkUutValuesEntries(uuts: UutName[] | uutPurposeMap<any>): valuesEntry[];

/**
 * Creates a tuple usable in a Value, converting token-name to byte-array if needed
 * @public
 **/
export declare function mkValuesEntry(tokenName: string | number[], count: bigint): valuesEntry;

/**
 * @public
 */
export declare type MultiTxnCallback<T extends undefined | StellarTxnContext<any> = StellarTxnContext<any>, TXINFO extends TxDescription<any, resolvedOrBetter, any> = TxDescription<any, "resolved">> = ((txd: TXINFO) => void) | ((txd: TXINFO) => Promise<void>) | ((txd: TXINFO) => T | false) | ((txd: TXINFO) => Promise<T | false>);

/**
 * @public
 */
export declare type mustFindActivityType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = CBT["activity"];

/**
 * @public
 */
export declare type mustFindConcreteContractBridgeType<T extends canHaveDataBridge, bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass ? T["dataBridgeClass"] : never, instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge ? InstanceType<bridgeClassMaybe> : StellarContract<any> extends T ? any : never> = instanceMaybe;

/**
 * @public
 */
export declare type mustFindDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = CBT["datum"];

/**
 * @public
 */
export declare type mustFindReadDatumType<T extends canHaveDataBridge, CBT extends someContractBridgeType = mustFindConcreteContractBridgeType<T>> = undefined extends CBT["datum"] ? never : undefined extends CBT["readDatum"] ? never : CBT["readDatum"];

/**
 * @public
 */
export declare type NamedPolicyCreationOptions<thisType extends Capo<any>, DT extends StellarDelegate> = PolicyCreationOptions & {
    /**
     * Optional name for the UUT; uses the delegate name if not provided.
     **/
    uutName?: string;
};

/**
 * @public
 */
export declare type namedSubmitters = Record<submitterName, CardanoTxSubmitter>;

/**
 * @public
 */
export declare type namedTxSubmitMgrs = Record<submitterName, TxSubmitMgr>;

declare type NeedsSingleArgError = TypeError_2<"expected at most one arg for seeded activity func">;

/**
 * @public
 */
export declare const Nested: unique symbol;

/**
 * @public
 */
export declare type Nested = typeof Nested;

/**
 * @public
 */
export declare type NetworkContext<NWT extends CardanoClient = CardanoClient> = {
    network: NWT;
};

declare type NetworkName = "testnet" | "mainnet";

/**
 * @public
 */
export declare type NEVERIF<T extends boolean | never, ELSE, ifError = unknown> = IF<T, never, ELSE, ifError>;

/**
 * @public
 */
export declare type NormalDelegateSetup = {
    usingSeedUtxo?: TxInput | undefined;
    additionalMintValues?: valuesEntry[];
    skipReturningDelegate?: true;
    mintDelegateActivity: isActivity;
};

declare type noTimeout = Record<string, never>;

/**
 * @public
 */
export declare const NotNested: unique symbol;

/**
 * @public
 */
export declare type NotNested = typeof NotNested;

/**
 * @public
 */
declare type numberString = `${number}`;

/**
 * Minimal structure for connecting a specific Capo contract to a configured StellarDelegate
 * @remarks
 *
 * This structure can always resolve to a reproducible delegate class (a {@link StellarDelegate}),
 * given a specific Capo and roleName.
 *
 * When the delegate isn't backed by a specific on-chain contract script, the delegateValidatorHash
 * is optional.
 *
 * Use Capo mkDelegateLink(x: OffchainRelativeDelegateLink) to
 * convert this data for on-chain use in the Capo's charter data structure
 *
 * @typeParam DT - the base class, to which all role-strategy variants conform
 * @public
 **/
export declare type OffchainPartialDelegateLink = {
    uutName?: string;
    config: Partial<capoDelegateConfig>;
    delegateValidatorHash?: ValidatorHash;
};

declare type OgmiosClients = Awaited<ReturnType<typeof makeOgmiosConnection>>;

/**
 * @public
 */
export declare class OgmiosTxSubmitter implements CardanoTxSubmitter {
    static withOgmiosConn(isMainnet: boolean, conn: simpleOgmiosConn): Promise<OgmiosTxSubmitter>;
    mainnet: boolean;
    ogmios: OgmiosClients;
    constructor(isMainnet: boolean, conn: OgmiosClients);
    get stateQuery(): LedgerStateQueryClient;
    get submitter(): TransactionSubmissionClient;
    isMainnet(): boolean;
    hasUtxo(txoId: TxOutputId): Promise<boolean>;
    submitTx(tx: Tx): Promise<TxId>;
    isUnknownUtxoError(e: Error): boolean;
    isSubmissionExpiryError(e: Error): boolean;
}

declare type OptimizeOptions = false | Omit<Exclude<CompileOptions["optimize"], boolean | undefined>, "iterSpecificOptions" | "commonSubExprCount">;

/**
 * @public
 */
export declare type OR<T1, T2> = [T1] extends [never] ? T2 : T1;

/**
 * parses details needed for a Capo and its related minter to be instantiated
 * @public
 */
export declare function parseCapoJSONConfig(rawJsonConfig: CapoConfigJSON | string): CapoConfig;

/**
 * parses details needed for a Capo minter to be instantiated
 * @public
 */
export declare function parseCapoMinterJSONConfig(rawJSONConfig: Pick<CapoConfigJSON, "seedTxn" | "seedIndex">): {
    seedTxn: TxId;
    seedIndex: bigint;
};

declare type PartialParamConfig<CT extends configBase> = Partial<CT>;

/**
 * @public
 */
declare type PartialReader = Pick<UnspecializedDelegateBridgeReader, "DelegateRole" | "ManifestActivity" | "CapoLifecycleActivity" | "DelegateLifecycleActivity" | "DelegationDetail">;

declare type PartialStellarBundleDetails<CT extends configBase> = Omit<StellarBundleSetupDetails<CT>, "setup">;

/**
 * decorates functions that increment a transaction by adding needed details for a use-case
 * @remarks
 *
 * Function names must follow the txn\{...\} naming convention. Typical partial-transaction names
 * may describe the semantics of how the function augments the transaction.
 * `txnAddSignatures` or `txnReceivePayment` could be example names following
 * this guidance
 *
 * Partial transactions should have a \<TCX extends StellarTxnContext\<...\>\> type parameter,
 * matched to its first function argument, and should return a type extending that same TCX,
 * possibly with additional StellarTxnContext\<...\> type info.
 *
 * The TCX constraint can specify key requirements for an existing transaction context when
 * that's relevant.
 *
 * @public
 **/
export declare function partialTxn(proto: any, thingName: any, descriptor: any): any;

/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class PendingCharterChangeHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange, Partial<{
        delegateChange: PendingDelegateChangeLike;
        otherManifestChange: PendingCharterChange$otherManifestChangeLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike | {
        action: PendingDelegateActionLike;
        role: DelegateRoleLike;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike | undefined;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***PendingCharterChange$otherManifestChangeLike*** is the same as the expanded field-types.
     */
    otherManifestChange(fields: PendingCharterChange$otherManifestChangeLike | {
        activity: ManifestActivityLike;
        remainingDelegateValidations: Array<DelegateRoleLike>;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class PendingCharterChangeHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange_2, Partial<{
        delegateChange: PendingDelegateChangeLike_2;
        otherManifestChange: PendingCharterChange$otherManifestChangeLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike_2 | {
        action: PendingDelegateActionLike_2;
        role: DelegateRoleLike_2;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike_4 | undefined;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***PendingCharterChange$otherManifestChangeLike*** is the same as the expanded field-types.
     */
    otherManifestChange(fields: PendingCharterChange$otherManifestChangeLike_2 | {
        activity: ManifestActivityLike_2;
        remainingDelegateValidations: Array<DelegateRoleLike_2>;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingCharterChange*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class PendingCharterChangeHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingCharterChange_3, Partial<{
        delegateChange: PendingDelegateChangeLike_3;
        otherManifestChange: PendingCharterChange$otherManifestChangeLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.delegateChange"***
     * @remarks - ***PendingDelegateChangeLike*** is the same as the expanded field-type.
     */
    delegateChange(change: PendingDelegateChangeLike_3 | {
        action: PendingDelegateActionLike_3;
        role: DelegateRoleLike_3;
        dgtLink: /*minStructField*/ RelativeDelegateLinkLike_5 | undefined;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingCharterChange.otherManifestChange"***
     * @remarks - ***PendingCharterChange$otherManifestChangeLike*** is the same as the expanded field-types.
     */
    otherManifestChange(fields: PendingCharterChange$otherManifestChangeLike_3 | {
        activity: ManifestActivityLike_3;
        remainingDelegateValidations: Array<DelegateRoleLike_3>;
    }): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class PendingDelegateActionHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction, Partial<{
        Add: PendingDelegateAction$AddLike;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class PendingDelegateActionHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction_2, Partial<{
        Add: PendingDelegateAction$AddLike_2;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike_2;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike_2 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}

/**
 * Helper class for generating UplcData for variants of the ***PendingDelegateAction*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class PendingDelegateActionHelper_3 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<PendingDelegateAction_3, Partial<{
        Add: PendingDelegateAction$AddLike_3;
        Remove: tagOnly;
        Replace: PendingDelegateAction$ReplaceLike_3;
    }>>;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Add}` for use in a context
     * providing an implicit seed utxo.
     */
    Add(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***
     * with raw seed details included in fields.
     */
    Add(fields: PendingDelegateAction$AddLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Add"***,
     * @param fields - \{ purpose: string, idPrefix: string \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Add({ purpose, idPrefix })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Add: (fields: {
        purpose: string;
        idPrefix: string;
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
    }) => UplcData>;
    /**
     * (property getter): UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Remove"***
     * @remarks - ***tagOnly*** variant accessor returns an empty ***constrData#1***
     */
    get Remove(): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * given a transaction-context ***with a seed utxo*** and other field details
     * @remarks
     * See the `tcxWithSeedUtxo()` method in your contract's off-chain StellarContracts subclass
     * to create a context satisfying `hasSeed`.
     * See `$seeded$Replace}` for use in a context
     * providing an implicit seed utxo.
     */
    Replace(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***
     * with raw seed details included in fields.
     */
    Replace(fields: PendingDelegateAction$ReplaceLike_3 | {
        seed: TxOutputId | string;
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }): UplcData;
    /**
     * generates  UplcData for ***"CapoDelegateHelpers::PendingDelegateAction.Replace"***,
     * @param fields - \{ purpose: string, idPrefix: string, replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | \{mph: MintingPolicyHash | string | number[], tokenName: string | number[]\} \}
     * @remarks
     * ##### Seeded activity
     * This activity  uses the pattern of spending a utxo to provide a uniqueness seed.
     * ##### Activity contains implied seed
     * Creates a SeedActivity based on the provided args, reserving space for a seed to be
     * provided implicitly by a SeedActivity-supporting library function.
     *
     * #### Usage
     *   1. Call the `$seeded$Replace({ purpose, idPrefix, replacesDgt })`
     *       method with the indicated (non-seed) details.
     *   2. Use the resulting activity in a seed-providing context, such as the delegated-data-controller's
     *       `mkTxnCreateRecord({activity})` method.
     */
    $seeded$Replace: (fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => SeedActivity<(value: hasSeed, fields: {
        purpose: string;
        idPrefix: string;
        replacesDgt: AssetClass | string | [string | MintingPolicyHash | number[], string | number[]] | {
            mph: MintingPolicyHash | string | number[];
            tokenName: string | number[];
        };
    }) => UplcData>;
}

/**
 * @public
 */
export declare const placeholderSetupDetails: StellarBundleSetupDetails<any>;

declare type PolicyCreationOptions = MinimalDelegateLink & {
    /**
     * details for creating the delegate
     */
    mintSetup: NormalDelegateSetup | DelegateSetupWithoutMintDelegate;
    /**
     * Installs the named delegate without burning the existing UUT for this delegate.
     * That UUT may become lost and inaccessible, along with any of its minUtxo.
     **/
    forcedUpdate?: true;
};

/**
 * Converts a MintingPolicyHash to a printable form
 * @public
 **/
export declare function policyIdAsString(p: MintingPolicyHash): string;

/**
 * @public
 */
export declare type possiblyAbstractContractBridgeType<T extends canHaveDataBridge, bridgeClassMaybe extends someContractBridgeClass = T["dataBridgeClass"] extends someContractBridgeClass ? T["dataBridgeClass"] : T["dataBridgeClass"] extends undefined ? never : abstractContractBridgeClass, instanceMaybe extends InstanceType<bridgeClassMaybe> = InstanceType<bridgeClassMaybe> extends ContractDataBridge ? InstanceType<bridgeClassMaybe> : ContractDataBridge & InstanceType<bridgeClassMaybe>> = instanceMaybe;

/**
 * @internal
 */
declare type PrecompiledProgramJSON = Pick<SerializedHeliosCacheEntry, "version" | "programElements" | "optimized" | "unoptimized" | "optimizedIR" | "unoptimizedIR" | "optimizedSmap" | "unoptimizedSmap">;

/**
 * @public
 */
export declare type PreconfiguredDelegate<T extends StellarDelegate> = Omit<ConfiguredDelegate<T>, "delegate" | "delegateValidatorHash"> & {
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
};

declare type readsUplcData<canonicalType> = (x: UplcData) => canonicalType;

/**
 * @public
 */
export declare type readsUplcTo<T> = (d: UplcData) => T;

/**
 * Divides two numbers using integer math semantics for matching with Helios on-chain Real math
 *
 * @remarks
 * The numbers can be whole or fractional, with 6 decimal places of honored precision.
 * The result is rounded to 6 decimal places.
 * @todo - delegate this to a call into the on-chain version of same
 * @public
 */
export declare function realDiv(a: number, b: number): number;

/**
 * Multiplies two numbers using integer math semantics for matching with Helios on-chain Real math
 *
 * @remarks
 * The numbers can be whole or fractional, with 6 decimal places of honored precision.
 * The result is rounded to 6 decimal places.
 * @todo - delegate this to a call into the on-chain version of same
 * @public
 */
export declare function realMul(a: number, b: number): number;

export { RelativeDelegateLink }

declare class ReqtsController extends DelegatedDataContract<ReqtData, ReqtDataLike> {
    dataBridgeClass: typeof ReqtsPolicyDataBridge;
    get delegateName(): string;
    get idPrefix(): string;
    get recordTypeName(): string;
    exampleData(): minimalReqtData;
    scriptBundleClass(): Promise<ReqtsConcreteBundle>;
    activityCreatingReqt(seedFrom: hasSeed): isActivity_2;
    activityUpdatingReqt(id: any): isActivity_2;
    activityCreatingRequirement(seedFrom: hasSeed): isActivity_2;
    txnCreatingReqt<TCX extends StellarTxnContext & hasSeedUtxo & hasSettingsRef & hasUutContext<"reqt">>(tcx: TCX, reqt: ReqtDataLike, initialStake: bigint): Promise<TCX>;
    txnUpdateReqt(tcx: hasSettingsRef & hasSeedUtxo, reqtDetails: FoundDatumUtxo<ErgoReqtData>, newDepositIncrement: bigint, // can be positive or negative
    newDatum?: any): Promise<hasSettingsRef & hasSeedUtxo>;
    requirements(): ReqtsMap_3<"stores requirements connected to any target object" | "the target object can gradually adopt further requirements as needed", never>;
}

/**
 * Describes the requirements for a unit of software
 * @remarks
 *
 * A requirements map is a list of described requirements, in which each requirement
 * has a synopsis, a description of its purpose, descriptive detail, and technical requirements
 * for the mechanism used for implementation.  The mech strings should be usable as unit-test titles.
 *
 * use the hasReqts() helper method to declare a type-safe set of requirements following this data structure.
 *
 * Each requirement also has space for nested 'requires', without the need for deeply nested data structures;
 * these reference other requirements in the same hasReqts() data structure. As a result, high-level and detail-
 * level requirements and 'impl' details can have progressive levels of detail.
 *
 * @typeParam reqts - the list of known requirement names.  Implicitly detected by the hasReqts() helper.
 * @public
 **/
export declare type ReqtsMap<validReqts extends string, inheritedNames extends string | never = never> = {
    [reqtDescription in validReqts]: TODO_TYPE | RequirementEntry<reqtDescription, validReqts, inheritedNames>;
};

/**
 * GENERATED data bridge for **BasicDelegate** script (defined in class ***ReqtsConcreteBundle***)
 * main: **src/delegation/BasicDelegate.hl**, project: **stellar-contracts**
 * @remarks
 * This class doesn't need to be used directly.  Its methods are available through the ***contract's methods***:
 *  - `get mkDatum` - returns the datum-building bridge for the contract's datum type
 *  - `get activity` - returns an activity-building bridge for the contract's activity type
 *  - `get reader` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
 *  - `get onchain` - (advanced) returns a data-encoding bridge for types defined in the contract's script
 * The advanced methods are not typically needed - mkDatum and activity should normally provide all the
 * type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's `findDelegatedDataUtxos()`
 * method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
 *
 * ##### customizing the bridge class name
 * Note that you may override `get bridgeClassName() { return "..." }` to customize the name of this bridge class
 * @public
 */
declare class ReqtsPolicyDataBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (DelegateDatum)***
     * for this contract script.
     */
    datum: DelegateDatumHelper_2;
    /**
     * this is the specific type of datum for the `BasicDelegate` script
     */
    DelegateDatum: DelegateDatumHelper_2;
    readDatum: (d: UplcData) => ErgoDelegateDatum_2;
    /**
     * generates UplcData for the activity type (***DelegateActivity***) for the `BasicDelegate` script
     */
    activity: DelegateActivityHelper_2;
    DelegateActivity: DelegateActivityHelper_2;
    reader: ReqtsPolicyDataBridgeReader;
    /**
     * accessors for all the types defined in the `BasicDelegate` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateDatum*** for the `BasicDelegate` script
         */
        DelegateDatum: DelegateDatumHelper_2;
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `BasicDelegate` script
         */
        DelegateRole: DelegateRoleHelper_3;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `BasicDelegate` script
         */
        ManifestActivity: ManifestActivityHelper_3;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `BasicDelegate` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper_3;
        /**
         * generates UplcData for the enum type ***DelegateLifecycleActivity*** for the `BasicDelegate` script
         */
        DelegateLifecycleActivity: DelegateLifecycleActivityHelper_2;
        /**
         * generates UplcData for the enum type ***SpendingActivity*** for the `BasicDelegate` script
         */
        SpendingActivity: SpendingActivityHelper_2;
        /**
         * generates UplcData for the enum type ***MintingActivity*** for the `BasicDelegate` script
         */
        MintingActivity: MintingActivityHelper_2;
        /**
         * generates UplcData for the enum type ***BurningActivity*** for the `BasicDelegate` script
         */
        BurningActivity: BurningActivityHelper_2;
        /**
         * generates UplcData for the enum type ***DelegateActivity*** for the `BasicDelegate` script
         */
        DelegateActivity: DelegateActivityHelper_2;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `BasicDelegate` script
         */
        PendingDelegateAction: PendingDelegateActionHelper_3;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `BasicDelegate` script
         */
        ManifestEntryType: ManifestEntryTypeHelper_3;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `BasicDelegate` script
         */
        PendingCharterChange: PendingCharterChangeHelper_3;
        /**
         * generates UplcData for the enum type ***cctx_CharterInputType*** for the `BasicDelegate` script
         */
        cctx_CharterInputType: cctx_CharterInputTypeHelper_2;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `BasicDelegate` script
         */
        AnyData: (fields: AnyDataLike_3 | {
            id: number[];
            type: string;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***DelegationDetail*** for the `BasicDelegate` script
         */
        DelegationDetail: (fields: DelegationDetailLike_2 | {
            capoAddr: /*minStructField*/ Address | string;
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            tn: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***ReqtData*** for the `BasicDelegate` script
         */
        ReqtData: (fields: ReqtDataLike_2 | {
            id: number[];
            type: string;
            category: string;
            name: string;
            image: string;
            description: string;
            mustFreshenBy: TimeLike;
            target: number[];
            purpose: string;
            details: Array<string>;
            mech: Array<string>;
            impl: string;
            requires: Array<string>;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `BasicDelegate` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike_5 | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `BasicDelegate` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike_3 | {
            action: PendingDelegateActionLike_3;
            role: DelegateRoleLike_3;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike_5 | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `BasicDelegate` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike_4 | {
            entryType: ManifestEntryTypeLike_3;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoCtx*** for the `BasicDelegate` script
         */
        CapoCtx: (fields: CapoCtxLike_2 | {
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            charter: cctx_CharterInputTypeLike_2;
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData_3, AnyDataLike_3>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺDelegationDetailCast: Cast<DelegationDetail_3, DelegationDetailLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺReqtDataCast: Cast<ReqtData_2, ReqtDataLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_5, RelativeDelegateLinkLike_5>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange_3, PendingDelegateChangeLike_3>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry_3, CapoManifestEntryLike_4>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoCtxCast: Cast<CapoCtx_2, CapoCtxLike_2>;
}

/**
 * @public
 */
declare class ReqtsPolicyDataBridgeReader extends DataBridgeReaderClass {
    bridge: ReqtsPolicyDataBridge;
    constructor(bridge: ReqtsPolicyDataBridge, isMainnet: boolean);
    datum: (d: UplcData) => Partial<{
        Cip68RefToken: DelegateDatum$Ergo$Cip68RefToken_2;
        IsDelegation: ErgoDelegationDetail_2;
        capoStoredData: DelegateDatum$Ergo$capoStoredData_2;
    }>;
    /**
     * reads UplcData *known to fit the **DelegateDatum*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateDatum(d: UplcData): ErgoDelegateDatum_2;
    /**
     * reads UplcData *known to fit the **DelegateRole*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateRole(d: UplcData): ErgoDelegateRole_3;
    /**
     * reads UplcData *known to fit the **ManifestActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestActivity(d: UplcData): ErgoManifestActivity_3;
    /**
     * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity_3;
    /**
     * reads UplcData *known to fit the **DelegateLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateLifecycleActivity(d: UplcData): ErgoDelegateLifecycleActivity_2;
    /**
     * reads UplcData *known to fit the **SpendingActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    SpendingActivity(d: UplcData): ErgoSpendingActivity_2;
    /**
     * reads UplcData *known to fit the **MintingActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    MintingActivity(d: UplcData): ErgoMintingActivity_2;
    /**
     * reads UplcData *known to fit the **BurningActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    BurningActivity(d: UplcData): ErgoBurningActivity_2;
    /**
     * reads UplcData *known to fit the **DelegateActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateActivity(d: UplcData): ErgoDelegateActivity_2;
    /**
     * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction_3;
    /**
     * reads UplcData *known to fit the **ManifestEntryType*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType_3;
    /**
     * reads UplcData *known to fit the **PendingCharterChange*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange_5;
    /**
     * reads UplcData *known to fit the **cctx_CharterInputType*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    cctx_CharterInputType(d: UplcData): Ergocctx_CharterInputType_2;
    /**
     * reads UplcData *known to fit the **AnyData*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    AnyData(d: UplcData): AnyData_3;
    /**
     * reads UplcData *known to fit the **DelegationDetail*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegationDetail(d: UplcData): DelegationDetail_3;
    /**
     * reads UplcData *known to fit the **ReqtData*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ReqtData(d: UplcData): ReqtData_2;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_5;
    /**
     * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateChange(d: UplcData): PendingDelegateChange_3;
    /**
     * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoManifestEntry(d: UplcData): CapoManifestEntry_3;
    /**
     * reads UplcData *known to fit the **CapoCtx*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoCtx(d: UplcData): CapoCtx_2;
}

/**
 * Documents one specific requirement
 * @remarks
 *
 * Describes the purpose, details, and implementation mechanism for a single requirement for a unit of software.
 *
 * Also references any other requirements in the host ReqtsMap structure, whose behavior this requirement
 * depends on.  The details of those other dependencies, are delegated entirely to the other requirement, facilitating
 * narrowly-focused capture of for key expectations within each individual semantic expectation of a software unit's
 * behavior.
 *
 * if there are inherited requirements, dependencies on them can be expressed in the `requiresInherited` field.
 *
 * @typeParam reqts - constrains `requires` entries to the list of requirements in the host ReqtsMap structure
 * @public
 **/
export declare type RequirementEntry<reqtName extends string, reqts extends string, inheritedNames extends string | never> = {
    purpose: string;
    details: string[];
    mech: string[];
    impl?: string;
    requires?: reqtName extends inheritedNames ? inheritedNames[] : Exclude<reqts, reqtName | inheritedNames>[];
    requiresInherited?: inheritedNames[];
};

/**
 * @public
 */
export declare type ResolveablePromise<T> = {
    promise: Promise<T>;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout";
    resolve: (value?: T) => void;
    reject: (reason?: Error) => void;
    cancel: () => void;
};

declare type resolvedOrBetter = "resolved" | txBuiltOrSubmitted;

declare type ReversedAllOfUnion<Union> = [Union] extends [never] ? [] : [
ExtractLastOfUnion<Union>,
...ReversedAllOfUnion<ExtractRestOfUnion<Union>>
];

declare type ReverseTuple<T extends any[]> = T extends [infer A, ...infer B] ? [...ReverseTuple<B>, A] : [];

/**
 * @public
 */
export declare type rootCapoConfig = {
    rootCapoScriptHash?: ValidatorHash;
};

/**
 * @public
 */
export declare type ScriptDeployments = DeployedSingletonConfig | DeployedConfigWithVariants;

declare type scriptPurpose = "testing" | "minting" | "spending" | "staking" | "module" | "endpoint" | "non-script";

/**
 * @public
 */
export declare class SeedActivity<FactoryFunc extends seedActivityFunc<any, any>> {
    private host;
    private factoryFunc;
    arg: SeedActivityArg<FactoryFunc>;
    constructor(host: {
        getSeed(x: hasSeed): TxOutputId;
    }, factoryFunc: FactoryFunc, arg: SeedActivityArg<FactoryFunc>);
    mkRedeemer(seedFrom: hasSeed): any;
}

/**
 * @internal
 */
export declare type SeedActivityArg<SA extends seedFunc<any, any>> = SA extends seedFunc<SA, infer ARG, infer RV> ? ARG : never;

/**
 * @public
 */
export declare type seedActivityFunc<ARGS extends [...any] | never, RV extends isActivity | UplcData | TypeError_2<any>> = IFISNEVER<ARGS, (seed: hasSeed) => RV, (seed: hasSeed, ...args: ARGS) => RV>;

/**
 * @public
 */
export declare type SeedAttrs = {
    txId: TxId;
    idx: bigint;
};

declare type seedFunc<F extends ((seed: hasSeed, arg: any) => any) | ((seed: hasSeed) => any), ARG extends (F extends (seed: hasSeed) => any ? never : F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never) = F extends (seed: hasSeed) => any ? never : F extends (seed: hasSeed, arg: infer iArg) => any ? iArg : never, RV extends ReturnType<F> = ReturnType<F>> = IFISNEVER<ARG, seedActivityFunc<never, RV>, seedActivityFunc<[ARG], RV>>;

/**
 * details of seed transaction
 * @remarks
 * Provides attribute names used for parameterizing scripts
 * based on the "seed-txn" pattern for guaranteed uniqueness.
 *
 * Note that when minting UUTs based on the same pattern,
 * these attribute names are not used.  See {@link UutName} and {@link Capo}
 * for more.
 *
 * @public
 **/
export declare type SeedTxnScriptParams = {
    seedTxn: TxId;
    seedIndex: bigint;
};

/**
 * @internal
 */
declare type SerializedHeliosCacheEntry = {
    version: "PlutusV2" | "PlutusV3";
    createdBy: string;
    programElements: Record<string, string | Object>;
    optimizeOptions: OptimizeOptions;
    optimized?: string;
    unoptimized?: string;
    optimizedIR?: string;
    unoptimizedIR?: string;
    optimizedSmap?: UplcSourceMapJsonSafe;
    unoptimizedSmap?: UplcSourceMapJsonSafe;
};

/**
 * @public
 */
export declare type SettingsDataContext = {
    settingsUtxo?: TxInput;
    tcx?: hasCharterRef;
    charterUtxo?: TxInput;
};

/**
 * standard setup for any Stellar Contract class
 * @public
 **/
export declare type SetupInfo = {
    /** access to ledger: utxos, txn-posting; can sometimes be a TxChainBuilder overlay on the real network */
    network: CardanoClient | Emulator;
    /** the actual network client; never a TxChainBuilder */
    chainBuilder?: TxChainBuilder;
    /** the params for this network */
    networkParams: NetworkParams;
    /** collects a batch of transactions, connected with a TxChainBuilder in context */
    txBatcher: TxBatcher;
    /** false for any testnet.  todo: how to express L2? */
    isMainnet: boolean;
    /** wallet-wrapping envelope, allows wallet-changing without reinitializing anything using that envelope */
    actorContext: ActorContext;
    /** testing environment? */
    isTest?: boolean;
    /** helper for finding utxos and related utility functions */
    uh?: UtxoHelper;
    /** global setting for script-compile optimization, only used when a compilation is triggered, can be overridden per script-bundle  */
    optimize?: boolean | HeliosOptimizeOptions;
    /** presentation-cache indicates utxos whose details have already been emitted to the console */
    uxtoDisplayCache?: UtxoDisplayCache;
};

declare type SetupOrMainnetSignalForBundle = Partial<Omit<SetupInfo, "isMainnet">> & Required<Pick<SetupInfo, "isMainnet">>;

/**
 * allows the samed detailed configuration used by the Ogmios typescript client,
 * or a simple http[s] url string.
 * @remarks
 * With a string argument, the websocket URL is constructed from the provided http[s] URL.
 * @public
 */
export declare type simpleOgmiosConn = ConnectionConfig | string;

/**
 * ### Don't use this type directly.
 *
 * This type is used as an intermediate representation of an enum variant,
 * for generating the types of utilities that read and write the enum data.
 * See the mkEnum<EnumType> factory function, the ‹tbd› reader function
 * and the ‹tbd› readable type
 * @public
 */
export declare type singleEnumVariantMeta<ET extends EnumTypeMeta<any, any>, VNAME extends keyof ET["variants"], variantConstr extends `Constr#${string}`, FLAVOR extends VariantFlavor, variantArgs extends FLAVOR extends "tagOnly" ? tagOnly : any, specialFlags extends SpecialActivityFlags, EID extends EnumId = ET["enumId"]> = {
    kind: "variant";
    enumId: EID;
    variantName: VNAME;
    variantKind: FLAVOR;
    constr: variantConstr;
    data: variantArgs;
    uplcData: UplcData;
};

/**
 * @public
 */
export declare type someContractBridgeClass = AbstractNew<ContractDataBridge>;

/**
 * @public
 */
export declare type someContractBridgeType = ContractDataBridge;

/**
 * @public
 */
export declare interface someDataWrapper<wrappedType extends AnyDataTemplate<any, any>> {
    unwrapData(): wrappedType;
}

/**
 * abstract interface for activity-helpers
 * @public
 */
export declare type SomeDgtActivityHelper = EnumBridge<isActivity> & Pick<DelegateActivityHelper, "CapoLifecycleActivities" | "DelegateLifecycleActivities" | "CreatingDelegatedData" | "UpdatingDelegatedData" | "DeletingDelegatedData" | "MultipleDelegateActivities"> & {
    SpendingActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
    MintingActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
    BurningActivities: EnumBridge<isActivity> & {
        isAbstract?: "NOTE: use a specific delegate to get concrete delegate activities";
    };
};

/**
 * @public
 */
export declare type SomeDgtBridgeReader = DataBridgeReaderClass & PartialReader & {
    bridge: GenericDelegateBridge;
    DelegateDatum(d: UplcData): unknown;
    SpendingActivity(d: UplcData): unknown;
    MintingActivity(d: UplcData): unknown;
    BurningActivity(d: UplcData): unknown;
    DelegateActivity(d: UplcData): unknown;
};

/**
 * @public
 */
export declare type SomeDgtDatumHelper<T extends AnyDataTemplate<any, any>> = EnumBridge<JustAnEnum> & Pick<DelegateDatumHelper, "Cip68RefToken" | "IsDelegation"> & {
    capoStoredData(fields: {
        data: T;
        version: IntLike;
        otherDetails: UplcData;
    }): InlineTxOutputDatum;
};

declare type SpecialActivityFlags = "isSeededActivity" | "noSpecialFlags";

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class SpendingActivityHelper extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1SA: number[];
    }, {
        _placeholder1SA: number[];
    }>;
    /**
     * generates  UplcData for ***"UnspecializedDelegate::SpendingActivity._placeholder1SA"***
     */
    _placeholder1SA(recId: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class SpendingActivityHelper_2 extends EnumBridge<JustAnEnum> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        UpdatingRecord: number[];
    }, {
        UpdatingRecord: number[];
    }>;
    /**
     * generates  UplcData for ***"ReqtsData::SpendingActivity.UpdatingRecord"***
     */
    UpdatingRecord(id: number[]): UplcData;
}

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class SpendingActivityHelperNested extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        _placeholder1SA: number[];
    }, {
        _placeholder1SA: number[];
    }>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"UnspecializedDelegate::SpendingActivity._placeholder1SA"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    _placeholder1SA(recId: number[]): isActivity;
}

/**
 * Helper class for generating UplcData for variants of the ***SpendingActivity*** enum type.
 * @public
 * @remarks
 * this class is not intended to be used directly.  Its methods are available through automatic accesors in the parent struct, contract-datum- or contract-activity-bridges. */
declare class SpendingActivityHelperNested_2 extends EnumBridge<isActivity> {
    /**
     * @internal
     *  uses unicode U+1c7a - sorts to the end */
    ᱺᱺcast: Cast<{
        UpdatingRecord: number[];
    }, {
        UpdatingRecord: number[];
    }>;
    /**
     * generates isActivity/redeemer wrapper with UplcData for ***"ReqtsData::SpendingActivity.UpdatingRecord"***
     * @remarks
     * #### Nested activity:
     * this is connected to a nested-activity wrapper, so the details are piped through
     * the parent's uplc-encoder, producing a single uplc object with
     * a complete wrapper for this inner activity detail.
     */
    UpdatingRecord(id: number[]): isActivity;
}

declare abstract class StateMachine<STATES extends string, TRANSITIONS extends string> {
    $state: STATES;
    $notifier: EventEmitter<StateMachineEmitter<this>>;
    destroyed: boolean;
    _deferredSMAction?: DeferredStateMachineAction<this, any>;
    abstract transitionTable: StateTransitionTable<STATES, TRANSITIONS>;
    instanceId: number;
    abstract resetState(): any;
    constructor();
    get $deferredAction(): any;
    get $describeDeferredAction(): string;
    get deferredTargetState(): any;
    /**
     * schedules a deferred transition to be performed when the promise resolves
     * @remarks
     * When there is a deferred transition, the state-machine will not accept other
     * transitions until the promise resolves one way or the other.
     *
     * A prime use-case for a deferred transition is for an onEntry hook to
     * defer (with setTimeout()) an unconditional next activity that will be
     * triggered by transitioning to the next state.
     *
     * The displayStatus is used to provide transparency about the
     * implied "activity" of waiting to trigger the transition.  For instance,
     * a "doneCooking" state on a microwave might have a displayStatus of
     * "food is ready", with a 2m-deferred transition to "remindingReady" state,
     * where it beeps three times and returns to doneCooking for further
     * reminders (opening the door or pressing Cancel would interrupt and
     * prevent the deferred transition).
     *
     * ### Return-type notes
     * Note that the returned type is not usable as result of an
     * onTransition hook or onEntry hook.  In onTransition, you can return
     * `this.$deferredState(...)`.  To use `$deferredTransition(...)` in onEntry,
     * just call it and don't return it.
     */
    $deferredTransition(this: this, tn: TRANSITIONS, displayStatus: string, promiseOrDelay: number | AnyPromise<any>): DeferredTransition<this>;
    ignoringListenerErrors(event: string, cb: () => void): void;
    /**
     * Schedules the completion of a deferred transition, placing the
     * state-machine into the target state.
     * @remarks
     * When the context of a particular state-transition has a natural
     * affinity to a delayed effect of triggering a state-change (or to
     * re-initiating the current-state), this method can be used to
     * indicate that deferred effect.
     *
     * The displayStatus is used to provide transparency about the cause
     * and context of the delayed change-of-state.
     *
     * The deferred transition will be cancelled if the promise is
     * cancelled or fails.
     *
     * A key use-case for this is to allow a transition that can re-trigger
     * the onEntry effects of the current state (or another next state), while
     * remaining cosmetically or semantically in the original state, deferred
     * the deferred entry to the target state; the target state's onEntry
     * hook will then be called after the transition is actually finished.
     *
     * Meanwhile, there is an explicit block on other state-transitions, and
     * there is an explicit current displayStatus providing strong transparency
     * about the deferred switch to the target state.
     *
     * As an example, a kitchen-timer feature on a microwave might (once it
     * finishes its countdown to zero and is done beeping), trigger a
     * `$deferredState("idle", ...)` with a deferred displayStatus of "timer finished".
     * It would then move to idle when the Cancel button is pressed.  This example
     * differs from that in $deferredTransition(), with the assumption that the
     * kitchen timer doesn't try to bug the user about it being finished,
     * the way the "doneCooking" state example describes.
     *
     * ### Return-type notes
     * Note that this type is only valid as the return value of an onTransition
     * callback, and not as a return value of an onEntry hook.  In an onEntry
     * hook, call and don't return the $deferredTransition(...).
     */
    $deferredState(this: this, transitionName: TRANSITIONS, targetState: STATES, displayStatus: string, promiseOrDelay: number | AnyPromise<any>): DeferredState<this>;
    delayed(delay?: number): Promise<unknown>;
    onStateEntered(sm: any, state: any): void;
    destroy(): void;
    notDestroyed(): void;
    log(...args: [string, ...any[]]): void;
    onEntry: Partial<{
        [state in STATES]: () => void;
    }>;
    get stateMachineName(): string;
    get initialState(): STATES;
    /**
     * creates a transition function for the indicated transition name
     * @remarks
     * the prefix brings this most common method to the top for autocomplete
     *
     * the resulting callback will try to transition the state-machine
     * but can fail if the transition table doesn't permit the named transition
     * at the time of the call.
     * @public
     */
    $mkTransition(tn: TRANSITIONS): () => Promise<void>;
    /**
     * creates a transition function for the indicated transition name
     * @remarks
     * The resulting callback will try to transition the state-machine
     * but can fail if the transition table doesn't permit the named transition
     * at the time of the call.
     * @public
     */
    mkTransition(tn: TRANSITIONS): () => Promise<void>;
    /**
     * returns true if the state-machine can currently use the named transition
     * @public
     */
    $canTransition(tn: TRANSITIONS): boolean;
    /**
     * transitions the state-machine through the indicated tx name
     * @remarks
     * can fail if the transition table doesn't permit the named transition
     * while in the current state.
     *
     * the prefix brings this most common method to the top for autocomplete
     * @public
     */
    $transition(tn: TRANSITIONS): Promise<void>;
    /**
     * transitions the state-machine through the indicated tx name
     * @public
     */
    transition(tn: TRANSITIONS): Promise<void>;
    finishTransition(tn: TRANSITIONS, targetState: STATES, currentState: string, nextState: string | false | DeferredState<this>, error: string): Promise<void> | undefined;
}

declare type StateMachineEmitter<SM extends StateMachine<any, any>> = {
    changed: [SM];
    [`transition`]: [SM, transitionEventInfo<SM>];
    [`state:entered`]: [SM, string];
    [`destroyed`]: [SM];
    [`backoff`]: [SM, number, string];
};

/**
 * @public
 */
export declare type stateSummary = `pending` | `building` | `confirmed` | `submitting` | `confirming` | `failed` | `mostly confirmed` | `pending`;

declare type StateTransitionTable<S extends string, T extends string> = {
    [state in S]: {
        [transition in T]: null | {
            to: S;
            onTransition?: (() => void) | (() => S) | (() => DeferredState<StateMachine<S, T>>) | (() => false) | (() => S | false) | (() => S | false | DeferredState<StateMachine<S, T>>) | (() => S | DeferredState<StateMachine<S, T>>) | (() => false | DeferredState<StateMachine<S, T>>);
        };
    };
};

declare type StellarBundleSetupDetails<CT extends configBase> = {
    setup: SetupOrMainnetSignalForBundle;
    scriptParamsSource?: "config" | "bundle" | "none";
    originatorLabel?: string;
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
    params?: CT;
    /**
     * used only for Capo bundles, to initialize them based on
     * their `.hlDeploy.<network>.json` config file
     */
    deployedDetails?: DeployedScriptDetails<CT>;
    variant?: string;
};

/**
 * Basic wrapper and off-chain facade for interacting with a single Plutus contract script
 * @remarks
 *
 * This class is normally used only for individual components of a higher-level {@link Capo | Capo or Leader contract},
 * which act as delegates within its application context.  Nonetheless, it is the base class for every Capo as well as
 * simpler contract scripts.
 *
 * The StellarContract class serves as an off-chain facade for transaction-building and interfacing to any on-chain
 * contract script.  Each StellarContract subclass must define a `contractSource()`, which is currently a Helios-language
 * script, compiled in any Javascript environment to an on-chain executable UPLC or "plutus core" form.  This enables
 * a static dApp to be self-sovereign, without need for any server ("application back-end") environment.
 *
 * @typeParam ConfigType - schema for the configuration needed for creating or reproducing a
 * specific instance of the contract script on-chain.
 *
 * @public
 **/
export declare class StellarContract<ConfigType extends configBase> {
    configIn?: ConfigType;
    partialConfig?: Partial<ConfigType>;
    setup: SetupInfo;
    get network(): CardanoClient | Emulator | TxChainBuilder;
    networkParams: NetworkParams;
    actorContext: ActorContext<any>;
    static get defaultParams(): {};
    static parseConfig(rawJsonConfig: any): void;
    /** each StellarContracts subclass needs to provide a scriptBundle class.
     * @remarks
     * Your script bundle MUST be defined in a separate file using a convention of
     * `‹scriptName›.hlb.ts`, and exported as a default class.  It should inherit
     * from HeliosScriptBundle or one of its subclasses.  Stellar Contracts processes
     * this file, analyzes the on-chain types defined in your Helios sources, and generates
     * Typescript types and a data-bridging class for your script.
     *
     * Once the data-bridge class is generated, you should import it into your contract
     * module and assign it to your `dataBridgeClass` attribute.
     */
    scriptBundleClass(): Promise<typeof HeliosScriptBundle>;
    /**
     * the dataBridgeClass attribute MUST be defined for any bundle having a datum type
     *  - this is the bridge class for converting from off-chain data types to on-chain data
     *  - it provides convenient, type-safe interfaces for doing that
     *
     * @remarks
     * Minters don't have datum, so they don't need to define this attribute.  However,
     * note that ***mint delegates*** do in fact have datum types. If you are defining
     * a custom delegate of that kind, you will need to define this attribute.
     */
    dataBridgeClass: AbstractNew<ContractDataBridge> | undefined;
    /**
     * The `onchain` object provides access to all bridging capabilities for this contract script.
     * @remarks
     * Its nested attributes include:
     *  - `types` - a collection of all the on-chain types defined in the script, with data-creation helpers for each
     *  - `activity` - a creation helper for the activities/redeemers defined in the script
     *
     * Scripts that use datum types (not including minters) will also have:
     *  - `datum` - a data-creation helper for the datum type of the script
     *  - `readDatum` - a data-reading helper for the datum type of the script
     *
     * ### Low-level type access
     * For low-level access (it's likely you don't need to use this) for on-chain types, the `reader` attribute (aka `offchain`) exists: .
     *  - `reader` - a collection of data-reading helpers for the on-chain types, given UPLC data known to be of that type
     * @public
     */
    get onchain(): possiblyAbstractContractBridgeType<this>;
    /**
     * The `offchain` object provides access to readers for the on-chain types of this contract script.
     * @remarks
     * Its nested attributes include all the on-chain types defined in the script, with data-reading helpers for each.
     * This is useful for reading on-chain data in off-chain code.
     *
     * ### Warning: low-level typed-data access!
     *
     * Note that these readers will work properly with UPLC data known to be of the correct type.  If you
     * encounter errors related to these results, it's likely you are using the wrong reader for the data you
     * have in hand.
     *
     * For the typical use-case of reading the datum type from a UTxO held in the contract, this is not a problem,
     * and note that the `readDatum` helper provides a shortcut for this most-common use-case.
     *
     * If you're not sure what you're doing, it's likely that this is not the right tool for your job.
     * @public
     */
    get offchain(): possiblyAbstractContractBridgeType<this>["reader"];
    get reader(): possiblyAbstractContractBridgeType<this>["reader"];
    get activity(): any;
    /**
     * Converts UPLC from an on-chain datum object to a typed off-chain datum object.
     *
     * Given a **utxo with a datum of the contract's datum type**, this method will convert the UPLC datum
     * to a typed off-chain datum object.
     *
     * ### Standard WARNING
     *
     * If the datum's structure is not of the expected type, this method MAY throw an error, or it might
     * return data that can cause problems somewhere else in your code.  That won't happen if you're
     * following the guidance above.
     */
    get newReadDatum(): findReadDatumType<this>;
    _bundle: HeliosScriptBundle | undefined;
    getBundle(): Promise<HeliosScriptBundle>;
    /**
     * Provides access to the script's activities with type-safe structures needed by the validator script.
     *
     * @remarks - the **redeemer** data (needed by the contract script) is defined as one or
     * more activity-types (e.g. in a struct, or an enum as indicated in the type of the last argument to
     * the validator function).
     *   - See below for more about ***setup & type-generation*** if your editor doesn't  provide auto-complete for
     *    the activities.
     *
     * ### A terminology note: Activities and Redeemers
     *
     * Although the conventional terminology of "redeemer" is universally well-known
     * in the Cardano developer community, we find that defining one or more **activities**,
     * with their associated ***redeemer data***, provides an effective semantic model offering
     * better clarity and intution.
     *
     * Each type of contract activity corresponds to an enum variant in the contract script.
     * For each of those variants, its redeemer data contextualizes the behavior of the requested
     * transaction.  A non-enum redeemer-type implies that there is only one type of activity.
     *
     * Any data not present in the transaction inputs or outputs, but needed for
     * specificity of the requested activity, can only be provided through these activity details.
     * If that material is like a "claim ticket", it would match the "redeemer" type of labeling.
     *
     * Activity data can include any kinds of details needed by the validator: settings for what it
     * is doing, options for how it is being done, or what remaining information the validator may
     * need, to verify the task is being completed according to protocol.  Transactions containing
     * a variety of inputs and output, each potential candidates for an activity, can use the activity
     * details to resolve ambiguity so the validator easily acts on the correct items.
     *
     * ### Setup and Type generation
     * #### Step 1: create your script **`.hlb.ts`**
     * With a defined script bundle, `import YourScriptNameBundle from "./YourBundleName.hlb.js"`
     * to your StellarContracts class module, and define a `scriptBundle() { return new YourScriptNameBundle() }` or
     * similar method in that class.
     *
     * This results in a generated **`.typeInfo.d.ts`** and **`.bridge.ts`** with complete
     * typescript bindings for your on-chain script (trouble? check Plugin setup below).
     *
     * #### Step 2: Import the generated bridge class
     * Using the generated .bridge file:
     * > `import YourScriptNameDataBridge from "./YourBundleName.bridge.js"`
     *
     * ... and set the `dataBridgeClass` property in your class:
     *
     * >    `dataBridgeClass = YourScriptNameDataBridge`
     *
     * ### Plugin Setup
     *
     * The activity types should be available through type-safe auto-complete in your editor.  If not,
     * you may need to install and configure the Stellar Contracts rollup plugins for importing .hl
     * files and generating .d.ts for your .hlb.ts files.  See the Stellar Contracts development
     * guide for additional details.
     *
     */
    /**
     * Provides access to the script's defined on-chain types, using a fluent
     * API for type-safe generation of data conforming to on-chain data formats & types.
     * @remarks
     *
     */
    _dataBridge?: ContractDataBridge;
    getOnchainBridge(): possiblyAbstractContractBridgeType<this>;
    ADA(n: bigint | number): bigint;
    get isConfigured(): boolean;
    get isConnected(): boolean;
    /**
     * returns the wallet connection used by the current actor
     * @remarks
     *
     * Throws an error if the strella contract facade has not been initialized with a wallet in settings.actorContext
     * @public
     **/
    get wallet(): any;
    get missingActorError(): string;
    /**
     * Transforms input configuration to contract script params
     * @remarks
     * May filter out any keys from the ConfigType that are not in the contract
     * script's params.  Should add any keys that may be needed by the script and
     * not included in the ConfigType (as delegate scripts do with `delegateName`).
     */
    getContractScriptParams(config: ConfigType): Partial<ConfigType> & Required<Pick<ConfigType, "rev">>;
    delegateReqdAddress(): false | Address;
    delegateAddrHint(): Address[] | undefined;
    walletNetworkCheck?: Promise<NetworkName> | NetworkName;
    /**
     * Factory function for a configured instance of the contract
     * @remarks
     *
     * Due to boring details of initialization order, this factory function is needed
     * for creating a new instance of the contract.
     * @param args - setup and configuration details
     * @public
     **/
    static createWith<thisType extends StellarContract<configType>, configType extends configBase = thisType extends StellarContract<infer iCT> ? iCT : never>(this: stellarSubclass<any>, args: StellarSetupDetails<configType>): Promise<StellarContract<configType> & InstanceType<typeof this>>;
    /**
     * obsolete public constructor.  Use the createWith() factory function instead.
     *
     * @public
     **/
    constructor(setup: SetupInfo);
    get canPartialConfig(): boolean;
    /**
     * performs async initialization, enabling an async factory pattern
     * @remarks
     * This method is called by the createWith() factory function, and should not be called directly.
     *
     *
     */
    init(args: StellarSetupDetails<ConfigType>): Promise<this>;
    mkScriptBundle(setupDetails?: PartialStellarBundleDetails<any>): Promise<any>;
    _compiledScript: anyUplcProgram;
    get compiledScript(): anyUplcProgram;
    asyncCompiledScript(): Promise<UplcProgramV2>;
    usesContractScript: boolean;
    get datumType(): DataType;
    /**
     * @internal
     **/
    get purpose(): scriptPurpose;
    get validatorHash(): ValidatorHash<unknown>;
    get address(): Address;
    get mintingPolicyHash(): MintingPolicyHash;
    get identity(): string;
    outputsSentToDatum(datum: InlineDatum): Promise<any>;
    /**
     * Returns the indicated Value to the contract script
     * @public
     * @param tcx - transaction context
     * @param value - a value already having minUtxo calculated
     * @param datum - inline datum
     **/
    txnKeepValue(tcx: StellarTxnContext, value: Value, datum: InlineDatum): StellarTxnContext<anyState_2>;
    /**
     * Returns all the types exposed by the contract script
     * @remarks
     *
     * Passed directly from Helios; property names match contract's defined type names
     *
     * @public
     **/
    get onChainTypes(): Program["userTypes"][string];
    /**
     * identifies the enum used for the script Datum
     * @remarks
     *
     * Override this if your contract script uses a type name other than Datum.
     * @public
     **/
    get scriptDatumName(): string;
    /**
     * The on-chain type for datum
     * @remarks
     *
     * This getter provides a class, representing the on-chain enum used for attaching
     * data (or data hashes) to contract utxos the returned type (and its enum variants)
     * are suitable for off-chain txn-creation override `get scriptDatumName()` if
     * needed to match your contract script.
     * @public
     **/
    get onChainDatumType(): DataType;
    get preloadedBundle(): HeliosScriptBundle;
    /**
     * identifies the enum used for activities (redeemers) in the Helios script
     * @remarks
     *
     * Override this if your contract script uses a type name other than Activity.
     * @public
     **/
    get scriptActivitiesName(): string;
    getSeed(arg: hasSeed): TxOutputId;
    loadProgram(): HeliosProgramWithCacheAPI_2;
    /**
     * returns the on-chain type for activities ("redeemers")
     * @remarks
     *
     * Use mustGetActivityName() instead, to get the type for a specific activity.
     *
     * returns the on-chain enum used for spending contract utxos or for different use-cases of minting (in a minting script).
     * the returned type (and its enum variants) are suitable for off-chain txn-creation
     * override `get onChainActivitiesName()` if needed to match your contract script.
     * @public
     **/
    get onChainActivitiesType(): DataType;
    /**
     * @deprecated - see {@link StellarContract.activityVariantToUplc|this.activityVariantToUplc(variant, data)} instead
     * Retrieves an on-chain type for a specific named activity ("redeemer")
     * @remarks
     *
     * Cross-checks the requested name against the available activities in the script.
     * Throws a helpful error if the requested activity name isn't present.'
     *
     * @param activityName - the name of the requested activity
     * @public
     **/
    mustGetActivity(activityName: string): EnumMemberType | null;
    /**
     * asserts the presence of the indicated activity name in the on-chain script
     * @remarks
     * The activity name is expected to be found in the script's redeemer enum
     */
    mustHaveActivity(activityName: string): EnumMemberType | null;
    activityRedeemer(activityName: string, data?: any): {
        redeemer: UplcData;
    };
    activityVariantToUplc(activityName: string, data: any): UplcData;
    mustGetEnumVariant(enumType: DataType, variantName: string): EnumMemberType | null;
    inlineDatum(datumName: string, data: any): InlineTxOutputDatum;
    /**
     * provides a temporary indicator of mainnet-ness, while not
     * requiring the question to be permanently resolved.
     * @remarks
     * Allows other methods to proceed prior to the final determination of mainnet status.
     *
     * Any code using this path should avoid caching a negative result.  If you need to
     * determine the actual network being used, getBundle().isMainnet, if present, provides
     * the definitive answer.  If that attribute is not yet present, then the mainnet status
     * has not yet been materialized.
     * @public
     */
    isDefinitelyMainnet(): boolean;
    paramsToUplc(params: Record<string, any>): UplcRecord_2<ConfigType>;
    typeToUplc(type: DataType, data: any, path?: string): UplcData;
    get program(): HeliosProgramWithCacheAPI_2;
    _utxoHelper: UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     */
    get utxoHelper(): UtxoHelper;
    /**
     * Provides access to a UtxoHelper instance
     * @remarks - same as utxoHelper, but with a shorter name
     */
    get uh(): UtxoHelper;
    /**
     * @deprecated - use `tcx.submit()` instead.
     */
    submit(tcx: StellarTxnContext, { signers, addlTxInfo, }?: {
        signers?: Address[];
        addlTxInfo?: Pick<TxDescription<any, any>, "description">;
    }): Promise<void>;
    _cache: ComputedScriptProperties;
    optimize: boolean;
    prepareBundleWithScriptParams(params: Partial<ConfigType> & Required<Pick<ConfigType, "rev">>): Promise<void>;
    /**
     * Locates a UTxO locked in a validator contract address
     * @remarks
     *
     * Throws an error if no matching UTxO can be found
     * @param semanticName - descriptive name; used in diagnostic messages and any errors thrown
     * @param predicate - filter function; returns its utxo if it matches expectations
     * @param exceptInTcx - any utxos already in the transaction context are disregarded and not passed to the predicate function
     * @param extraErrorHint - user- or developer-facing guidance for guiding them to deal with the miss
     * @public
     **/
    mustFindMyUtxo(semanticName: string, options: {
        predicate: utxoPredicate;
        exceptInTcx?: StellarTxnContext;
        extraErrorHint?: string;
        utxos?: TxInput[];
    }): Promise<TxInput>;
    /**
     * Reuses an existing transaction context, or creates a new one with the given name and the current actor context
     */
    mkTcx<TCX extends StellarTxnContext>(tcx: StellarTxnContext | undefined, name?: string): TCX;
    /**
     * Creates a new transaction context with the current actor context
     */
    mkTcx(name?: string): StellarTxnContext;
    /**
     * Finds a free seed-utxo from the user wallet, and adds it to the transaction
     * @remarks
     *
     * Accepts a transaction context that may already have a seed.  Returns a typed
     * tcx with hasSeedUtxo type.
     *
     * The seedUtxo will be consumed in the transaction, so it can never be used
     * again; its value will be returned to the user wallet.
     *
     * The seedUtxo is needed for UUT minting, and the transaction is typed with
     * the presence of that seed (found in tcx.state.seedUtxo).
     *
     * If a seedUtxo is already present in the transaction context, no additional seedUtxo
     * will be added.
     *
     * If a seedUtxo is provided as an argument, that utxo must already be present
     * in the transaction inputs; the state will be updated to reference it.
     *
     * @public
     *
     **/
    tcxWithSeedUtxo<TCX extends StellarTxnContext>(tcx?: TCX, seedUtxo?: TxInput): Promise<TCX & hasSeedUtxo>;
    findUutSeedUtxo(uutPurposes: string[], tcx: StellarTxnContext<any>): Promise<TxInput>;
}

/**
 * Base class for modules that can serve as Capo delegates
 * @public
 * @remarks
 *
 * establishes a base protocol for delegates.
 * @typeParam CT - type of any specialized configuration; use capoDelegateConfig by default.
 **/
export declare abstract class StellarDelegate extends StellarContract<capoDelegateConfig> {
    static currentRev: bigint;
    static get defaultParams(): {
        rev: bigint;
    };
    dataBridgeClass: AbstractNew<ContractDataBridgeWithEnumDatum> | undefined;
    existingRedeemerError(label: string, authorityVal: Value, existingRedeemer: UplcData, redeemerActivity?: UplcData): Error;
    /**
     * Finds and adds the delegate's authority token to the transaction
     * @remarks
     *
     * calls the delegate-specific DelegateAddsAuthorityToken() method,
     * with the uut found by DelegateMustFindAuthorityToken().
     *
     * Returns the token back to the contract using {@link StellarDelegate.txnReceiveAuthorityToken | txnReceiveAuthorityToken() },
     * automatically, unless the `skipReturningDelegate` option is provided.
     *
     * If the authority token
     * @param tcx - transaction context
     * @public
     **/
    txnGrantAuthority<TCX extends StellarTxnContext>(tcx: TCX, redeemer?: isActivity, options?: GrantAuthorityOptions): Promise<TCX>;
    /**
     * Finds the authority token and adds it to the transaction, tagged for retirement
     * @public
     * @remarks
     * Doesn't return the token back to the contract.
     **/
    txnRetireAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX): Promise<TCX>;
    /**
     * Standard delegate method for receiving the authority token as a txn output
     * @remarks
     *
     * creates a UTxO / TxOutput, depositing the indicated token-name into the delegated destination.
     *
     * Each implemented subclass can use it's own style to match its strategy & mechanism,
     * and is EXPECTED to use tcx.addOutput() to receive the indicated `tokenValue` into the
     * contract or other destination address.
     *
     * This method is used both for the original deposit and for returning the token during a grant-of-authority.
     *
     * Impls should normally preserve the datum from an already-present sourceUtxo, possibly with evolved details.
     *
     * @param tcx - transaction-context
     * @param tokenValue - the Value of the token that needs to be received.  Always includes
     *   the minUtxo needed for this authority token
     * @param fromFoundUtxo - always present when the authority token already existed; can be
     *   used to duplicate or iterate on an existing datum, or to include any additional Value in the new
     *   UTxO, to match the previous UTxO with minimal extra heuristics
     * @public
     **/
    abstract txnReceiveAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, tokenValue: Value, fromFoundUtxo?: TxInput): Promise<TCX>;
    mkAuthorityTokenPredicate(): tokenPredicate_2<any>;
    get authorityTokenName(): number[];
    tvAuthorityToken(useMinTv?: boolean): Value;
    get delegateValidatorHash(): ValidatorHash | undefined;
    /**
     * Finds the delegate authority token, normally in the delegate's contract address
     * @public
     * @remarks
     *
     * The default implementation finds the UTxO having the authority token
     * in the delegate's contract address.
     *
     * @param tcx - the transaction context
     * @reqt It MUST resolve and return the UTxO (a TxInput type ready for spending)
     *  ... or throw an informative error
     **/
    abstract DelegateMustFindAuthorityToken(tcx: StellarTxnContext, label: string): Promise<TxInput>;
    /**
     * Adds the delegate's authority token to a transaction
     * @public
     * @remarks
     * Given a delegate already configured by a Capo, this method implements
     * transaction-building logic needed to include the UUT into the `tcx`.
     * the `utxo` is discovered by {@link StellarDelegate.DelegateMustFindAuthorityToken | DelegateMustFindAuthorityToken() }
     **/
    abstract DelegateAddsAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, uutxo: TxInput, redeemer?: isActivity): Promise<TCX>;
    /**
     * Adds any important transaction elemements supporting the authority token being retired, closing the delegate contracts' utxo.
     * @remarks
     *
     * EXPECTS to receive a Utxo having the result of txnMustFindAuthorityToken()
     *
     * EXPECTS the `burn` instruction to be separately added to the transaction.
     *
     * The default implementation uses the conventional `Retiring` activity
     * to spend the token.
     *
     * @reqt
     * It MUST add the indicated utxo to the transaction as an input
     *
     * @reqt
     * When backed by a contract:
     *   * it should use an activity/redeemer allowing the token to be spent
     *      **and NOT returned**.
     *   * the contract script SHOULD ensure any other UTXOs it may also hold, related to this delegation,
     *      do not become inaccessible as a result.
     *
     * It MAY enforce additional requirements and/or block the action.
     *
     *
     * @param tcx - transaction context
     * @param fromFoundUtxo - the utxo having the authority otken
     * @public
     **/
    abstract DelegateRetiresAuthorityToken<TCX extends StellarTxnContext>(tcx: TCX, fromFoundUtxo: TxInput): Promise<TCX>;
    /**
     * Captures requirements as data
     * @remarks
     *
     * see reqts structure
     * @public
     **/
    delegateRequirements(): ReqtsMap_3<"provides an interface for providing arms-length proof of authority to any other contract" | "implementations SHOULD positively govern spend of the UUT" | "implementations MUST provide an essential interface for transaction-building" | "requires a txnReceiveAuthorityToken(tcx, delegateAddr, fromFoundUtxo?)" | "requires a mustFindAuthorityToken(tcx)" | "requires a txnGrantAuthority(tcx, delegateAddr, fromFoundUtxo)" | "requires txnRetireCred(tcx, fromFoundUtxo)", never>;
}

/**
 * Initializes a stellar contract class
 * @remarks
 *
 * Includes network and other standard setup details, and any configuration needed
 * for the specific class.
 * @public
 **/
declare type StellarSetupDetails<CT extends configBase> = {
    setup: SetupInfo;
    config?: CT;
    partialConfig?: Partial<CT>;
    previousOnchainScript?: {
        validatorHash: number[];
        uplcProgram: anyUplcProgram;
    };
};
export { StellarSetupDetails as StellarFactoryArgs }
export { StellarSetupDetails }

/**
 * Type for the Class that constructs to a given type
 * @remarks
 *
 * Type of the matching literal class
 *
 * note: Typescript should make this pattern easier
 *
 * @typeParam S - the type of objects of this class
 * @typeParam CT - inferred type of the constructor args for the class
 * @public
 **/
export declare type stellarSubclass<S extends StellarContract<any>> = (new (setup: SetupInfo) => S) & {
    defaultParams: Partial<ConfigFor<S>>;
    createWith(args: StellarSetupDetails<ConfigFor<S>>): Promise<S>;
    parseConfig(rawJsonConfig: any): any;
};

/**
 * Transaction-building context for Stellar Contract transactions
 * @remarks
 *
 * Uses same essential facade as Helios Tx.
 *
 * Adds a transaction-state container with strong typing of its contents,
 * enabling transaction-building code to use type-sensitive auto-complete
 * and allowing Stellar Contracts library code to require transaction contexts
 * having known states.
 *
 * Retains reflection capabilities to allow utxo-finding utilities to exclude
 * utxo's already included in the contract.
 *
 * @typeParam S - type of the context's `state` prop
 * @public
 **/
export declare class StellarTxnContext<S extends anyState = anyState> {
    id: string;
    inputs: TxInput[];
    collateral?: TxInput;
    outputs: TxOutput[];
    feeLimit?: bigint;
    state: S;
    allNeededWitnesses: (Address | PubKeyHash)[];
    otherPartySigners: PubKeyHash[];
    parentTcx?: StellarTxnContext<any>;
    childReservedUtxos: TxInput[];
    parentId: string;
    alreadyPresent: TxNotNeededError | undefined;
    depth: number;
    setup: SetupInfo;
    txb: TxBuilder;
    txnName: string;
    withName(name: string): this;
    get wallet(): Wallet;
    get uh(): UtxoHelper;
    get networkParams(): NetworkParams;
    get actorContext(): ActorContext<any>;
    /**
     * Provides a lightweight, NOT complete, serialization for presenting the transaction context
     * @remarks
     * Serves rendering of the transaction context in vitest
     * @internal
     */
    toJSON(): {
        kind: string;
        state: string | undefined;
        inputs: string;
        outputs: string;
        isBuilt: boolean;
        hasParent: boolean;
        addlTxns: string[] | undefined;
    };
    logger: UplcConsoleLogger;
    constructor(setup: SetupInfo, state?: Partial<S>, parentTcx?: StellarTxnContext<any>);
    isFacade: true | false | undefined;
    facade(this: StellarTxnContext): hasAddlTxns<this> & {
        isFacade: true;
    };
    noFacade(situation: string): void;
    withParent(tcx: StellarTxnContext<any>): this;
    get actorWallet(): any;
    dump(tx?: Tx): string;
    dump(): Promise<string>;
    includeAddlTxn<TCX extends StellarTxnContext<anyState>, RETURNS extends hasAddlTxns<TCX> = TCX extends hasAddlTxns<any> ? TCX : hasAddlTxns<TCX>>(this: TCX, txnName: string, txInfoIn: Omit<TxDescription<any, "buildLater!">, "id" | "depth" | "parentId"> & {
        id?: string;
    }): RETURNS;
    /**
     * @public
     */
    get addlTxns(): Record<string, TxDescription<any, "buildLater!">>;
    mintTokens(...args: MintTokensParams): StellarTxnContext<S>;
    getSeedAttrs<TCX extends hasSeedUtxo>(this: TCX): SeedAttrs;
    reservedUtxos(): TxInput[];
    utxoNotReserved(u: TxInput): TxInput | undefined;
    addUut<T extends string, TCX extends StellarTxnContext>(this: TCX, uutName: UutName, ...names: T[]): hasUutContext<T> & TCX;
    addState<TCX extends StellarTxnContext, K extends string, V>(this: TCX, key: K, value: V): StellarTxnContext<{
        [keyName in K]: V;
    } & anyState> & TCX;
    addCollateral(collateral: TxInput): this;
    getSeedUtxoDetails(this: hasSeedUtxo): SeedAttrs;
    _txnTime?: Date;
    /**
     * Sets a future date for the transaction to be executed, returning the transaction context.  Call this before calling validFor().
     *
     * @remarks Returns the txn context.
     * Throws an error if the transaction already has a txnTime set.
     *
     * This method does not itself set the txn's validity interval.  You MUST combine it with
     * a call to validFor(), to set the txn's validity period.  The resulting transaction will
     * be valid from the moment set here until the end of the validity period set by validFor().
     *
     * This can be used anytime to construct a transaction valid in the future.  This is particularly useful
     * during test scenarios to verify time-sensitive behaviors.
     *
     * In the test environment, the network wil normally be advanced to this date
     * before executing the transaction, unless a different execution time is indicated.
     * Use the test helper's `submitTxnWithBlock(txn, {futureDate})` or `advanceNetworkTimeForTx()` methods, or args to
     * use-case-specific functions that those methods.
     */
    futureDate<TCX extends StellarTxnContext<S>>(this: TCX, date: Date): TCX;
    assertNumber(obj: any, msg?: string): number;
    /**
     * Calculates the time (in milliseconds in 01/01/1970) associated with a given slot number.
     * @param slot - Slot number
     */
    slotToTime(slot: bigint): bigint;
    /**
     * Calculates the slot number associated with a given time.
     * @param time - Milliseconds since 1970
     */
    timeToSlot(time: bigint): bigint;
    /**
     * Identifies the time at which the current transaction is expected to be executed.
     * Use this attribute in any transaction-building code that sets date/time values
     * for the transaction.
     * Honors any futureDate() setting or uses the current time if none has been set.
     */
    get txnTime(): Date;
    _txnEndTime?: Date;
    get txnEndTime(): Date;
    /**
     * Sets an on-chain validity period for the transaction, in miilliseconds
     *
     * @remarks if futureDate() has been set on the transaction, that
     * date will be used as the starting point for the validity period.
     *
     * Returns the transaction context for chaining.
     *
     * @param durationMs - the total validity duration for the transaction.  On-chain
     *  checks using CapoCtx `now(granularity)` can enforce this duration
     */
    validFor<TCX extends StellarTxnContext<S>>(this: TCX, durationMs: number): TCX;
    _validityPeriodSet: boolean;
    txRefInputs: TxInput[];
    /**
     * adds a reference input to the transaction context
     * @remarks
     *
     * idempotent version of helios addRefInput()
     *
     * @public
     **/
    addRefInput<TCX extends StellarTxnContext<S>>(this: TCX, input: TxInput<any>, refScript?: UplcProgramV2): TCX;
    /**
     * @deprecated - use addRefInput() instead.
     */
    addRefInputs<TCX extends StellarTxnContext<S>>(this: TCX, ...args: addRefInputArgs): void;
    addInput<TCX extends StellarTxnContext<S>>(this: TCX, input: TxInput, r?: isActivity): TCX;
    addOutput<TCX extends StellarTxnContext<S>>(this: TCX, output: TxOutput): TCX;
    attachScript(...args: Parameters<TxBuilder["attachUplcProgram"]>): void;
    /**
     * Adds a UPLC program to the transaction context, increasing the transaction size.
     * @remarks
     * Use the Capo's `txnAttachScriptOrRefScript()` method to use a referenceScript
     * when available. That method uses a fallback approach adding the script to the
     * transaction if needed.
     */
    addScriptProgram(...args: Parameters<TxBuilder["attachUplcProgram"]>): this;
    wasModified(): void;
    _builtTx?: Tx | Promise<Tx>;
    get builtTx(): Tx | Promise<Tx>;
    addSignature(wallet: Wallet): Promise<void>;
    hasAuthorityToken(authorityValue: Value): boolean;
    findAnySpareUtxos(): Promise<TxInput[] | never>;
    findChangeAddr(): Promise<Address>;
    /**
     * Adds required signers to the transaction context
     * @remarks
     * Before a transaction can be submitted, signatures from each of its signers must be included.
     *
     * Any inputs from the wallet are automatically added as signers, so addSigners() is not needed
     * for those.
     */
    addSigners(...signers: PubKeyHash[]): Promise<void>;
    build(this: StellarTxnContext<any>, { signers, addlTxInfo, beforeValidate, paramsOverride, expectError, }?: {
        signers?: Address[];
        addlTxInfo?: Pick<TxDescription<any, "buildLater!">, "description">;
        beforeValidate?: (tx: Tx) => Promise<any> | any;
        paramsOverride?: Partial<NetworkParams>;
        expectError?: boolean;
    }): Promise<BuiltTcx>;
    log(...msgs: string[]): this;
    flush(): this;
    finish(): this;
    /**
     * Submits the current transaction and any additional transactions in the context.
     * @remarks
     * To submit only the current transaction, use the `submit()` method.
     *
     * Uses the TxBatcher to create a new batch of transactions.  This new batch
     * overlays a TxChainBuilder on the current network-client, using that facade
     * to provide utxos for chained transactions in the batch.
     *
     * The signers array can be used to add additional signers to the transaction, and
     * is passed through to the submit() for the current txn only; it is not used for
     * any additional transactions.
     *
     * The beforeSubmit, onSubmitted callbacks are used for each additional transaction.
     *
     * beforeSubmit can be used to notify the user of the transaction about to be submitted,
     * and can also be used to add additional signers to the transaction or otherwise modify
     * it (by returning the modified transaction).
     *
     * onSubmitted can be used to notify the user that the transaction has been submitted,
     * or for logging or any other post-submission processing.
     */
    submitAll(this: StellarTxnContext<any>, options?: SubmitOptions): Promise<BatchSubmitController_2>;
    /**
     * augments a transaction context with a type indicator
     * that it has additional transactions to be submitted.
     * @public
     * @remarks
     * The optional argument can also be used to include additional
     * transactions to be chained after the current transaction.
     */
    withAddlTxns<TCX extends StellarTxnContext<anyState>>(this: TCX, addlTxns?: Record<string, TxDescription<any, "buildLater!">>): hasAddlTxns<TCX>;
    buildAndQueueAll(this: StellarTxnContext<any>, options?: SubmitOptions): Promise<BatchSubmitController_2>;
    get currentBatch(): BatchSubmitController_2;
    /**
     * Submits only the current transaction.
     * @remarks
     * To also submit additional transactions, use the `submitAll()` method.
     */
    buildAndQueue(this: StellarTxnContext<any>, submitOptions?: SubmitOptions): Promise<void>;
    emitCostDetails(tx: Tx, costs: {
        total: Cost;
        [key: string]: Cost;
    }): void;
    /**
     * Executes additional transactions indicated by an existing transaction
     * @remarks
     *
     * During the off-chain txn-creation process, additional transactions may be
     * queued for execution.  This method is used to register those transactions,
     * along with any chained transactions THEY may trigger.
     *
     * The TxBatcher and batch-controller classes handle wallet-signing
     * and submission of the transactions for execution.
     * @public
     **/
    queueAddlTxns(this: hasAddlTxns<any>, pipelineOptions?: TxPipelineOptions): Promise<any[] | undefined>;
    /**
     * Resolves a list of tx descriptions to full tcx's, without handing any of their
     * any chained/nested txns.
     * @remarks
     * if submitEach is provided, each txn will be submitted as it is resolved.
     * If submitEach is not provided, then the network must be capable of tx-chaining
     * use submitTxnChain() to submit a list of txns with chaining
     */
    resolveMultipleTxns(txns: TxDescription<any, "buildLater!">[], pipelineOptions?: TxPipelineOptions): Promise<void>;
    /**
     * To add a script to the transaction context, use `attachScript`
     *
     * @deprecated - invalid method name; use `addScriptProgram()` or capo's `txnAttachScriptOrRefScript()` method
     **/
    addScript(): void;
    submitTxnChain(options?: {
        txns?: TxDescription<any, "buildLater!">[];
    } & TxPipelineOptions): Promise<any[] | undefined>;
}

/**
 * Presents a string in printable form, even if it contains non-printable characters
 *
 * @remarks
 * Non-printable characters are shown in '‹XX›' format.
 * @public
 */
export declare function stringToPrintableString(str: string | number[]): string;

declare type SubmissionsStates = "registered" | "building" | "nested batch" | "not needed" | "built" | "signingSingle" | "submitting" | "confirming" | "confirmed" | "failed" | "mostly confirmed";

declare type SubmissionsTransitions = Exclude<SubmissionsStates, "not needed" | "nested batch"> | "reconfirm" | "alreadyDone" | "isFacade";

/**
 * @public
 */
export declare type SubmitManagerState = {
    pendingActivity: string;
    nextActivityDelay?: number;
    lastSubmissionAttempt?: dateAsMillis;
    isBadTx?: Error;
    failedSubmissions: number;
    successfulSubmitAt?: number;
    expirationDetected: boolean;
    confirmations: number;
    firstConfirmedAt?: dateAsMillis;
    lastConfirmedAt?: dateAsMillis;
    confirmationFailures: number;
    lastConfirmationFailureAt?: dateAsMillis;
    lastConfirmAttempt?: dateAsMillis;
    battleDetected: boolean;
    serviceFailures: number;
    signsOfServiceLife: number;
    lastServiceFailureAt?: dateAsMillis;
    totalSubmissionAttempts: number;
    totalSubmissionSuccesses: number;
    totalConfirmationAttempts: number;
    totalConfirmationSuccesses: number;
    nextActivityStartTime?: dateAsMillis;
};

/**
 * @public
 */
export declare type SubmitOptions = TxPipelineOptions & {
    /**
     * indicates additional signers expected for the transaction
     */
    signers?: Address[];
    addlTxInfo?: Partial<Omit<TxDescription<any, "submitted">, "description">> & {
        description: string;
    };
    paramsOverride?: Partial<NetworkParams>;
    /**
     * useful most for test environment, so that a txn failure can be me marked
     * as "failing as expected".  Not normally needed for production code.
     */
    expectError?: true;
    /**
     * Called when there is a detected error, before logging.  Probably only needed in test.
     */
    beforeError?: MultiTxnCallback<any, TxDescriptionWithError>;
    /**
     * Passed into the Helios TxBuilder's build()/buildUnsafe()
     */
    beforeValidate?: (tx: Tx) => MultiTxnCallback<any>;
};

/**
 * @public
 */
export declare type submitterName = string;

/**
 * @public
 */
export declare type SubmitterRetryIntervals = {
    reconfirm?: number;
    submit?: number;
    confirm?: number;
    startup?: number;
    maximum?: number;
};

/**
 * Type of enum variant having no fields (only the variant-tag)
 * @public
 */
export declare type tagOnly = Record<string, never>;

/**
 * An empty object, satisfying the data-bridge for a tag-only enum variant having no fields.
 * @public
 */
export declare const tagOnly: tagOnly;

export { textToBytes }

/**
 * @public
 */
declare type TimeLike = IntLike;

/**
 * @public
 */
export declare type TimeoutId = ReturnType<typeof setTimeout>;

declare const TODO: unique symbol;

/**
 * tags requirement that aren't yet implemented
 * @public
 **/
declare type TODO_TYPE = typeof TODO;

/**
 * Rounds a number to 6 decimal places, with correction for low-value floating-point
 * errors e.g. `(2.999999999) -> 3.0`
 * @public
 */
export declare function toFixedReal(n: number): number;

/**
 * tuple expressing a token-name and count
 * @public
 **/
export declare type tokenNamesOrValuesEntry = [string | number[], bigint];

declare type tokenPredicate<tokenBearer extends canHaveToken> = ((something: tokenBearer) => tokenBearer | undefined) & {
    predicateValue: Value;
};

declare type transitionEventInfo<SM extends StateMachine<any, any>> = {
    from: $states<SM>;
    transition: string;
    to: $states<SM>;
    cancelTransition: (reason: string) => void;
};

/**
 * Converts a Tx to printable form
 * @public
 **/
export declare function txAsString(tx: Tx, networkParams?: NetworkParams): string;

/**
 * @public
 */
export declare type TxBatchChangeNotifier = {
    txAdded: [TxSubmissionTracker];
    destroyed: [BatchSubmitController];
    txListUpdated: [BatchSubmitController];
    statusUpdate: [aggregatedStateString[]];
};

/**
 * @public
 */
export declare class TxBatcher {
    previous?: BatchSubmitController;
    _current?: BatchSubmitController;
    signingStrategy?: WalletSigningStrategy;
    submitters: namedSubmitters;
    setup?: SetupInfo;
    $notifier: EventEmitter<TxBatcherChanges, any>;
    constructor(options: TxBatcherOptions);
    get current(): BatchSubmitController;
    canRotate(): boolean;
    rotate(chainBuilder?: TxChainBuilder): void;
}

/**
 * @public
 */
declare type TxBatcherChanges = {
    rotated: [BatchSubmitController];
};

/**
 * @public
 */
export declare type TxBatcherOptions = {
    submitters: namedSubmitters;
    setup?: SetupInfo;
    signingStrategy?: WalletSigningStrategy;
};

declare type txBuiltOrSubmitted = "built" | "alreadyPresent" | "signed" | "submitted";

/**
 * @public
 */
export declare type TxDescription<T extends StellarTxnContext, PROGRESS extends "buildLater!" | "resolved" | "alreadyPresent" | "built" | "signed" | "submitted", TCX extends StellarTxnContext = IF_ISANY<T, StellarTxnContext<anyState>, T>, otherProps extends Record<string, unknown> = {}> = {
    description: string;
    id: string;
    parentId?: string;
    depth: number;
    moreInfo?: string;
    optional?: boolean;
    txName?: string;
    tcx?: TCX | TxNotNeededError;
    tx?: Tx;
    stats?: BuiltTcxStats;
    txCborHex?: string;
    signedTxCborHex?: string;
} & otherProps & (PROGRESS extends "alreadyPresent}" ? {
    mkTcx: (() => TCX) | (() => Promise<TCX>);
    tcx: TCX & {
        alreadyPresent: TxNotNeededError;
    };
} : PROGRESS extends resolvedOrBetter ? {
    mkTcx?: (() => TCX) | (() => Promise<TCX>) | undefined;
    tcx: TCX;
} : {
    mkTcx: (() => TCX) | (() => Promise<TCX>);
    tcx?: undefined;
}) & (PROGRESS extends txBuiltOrSubmitted ? {
    tx: Tx;
    txId?: TxId;
    stats: BuiltTcxStats;
    options: SubmitOptions;
    txCborHex: string;
} : {}) & (PROGRESS extends "signed" | "submitted" ? {
    txId: TxId;
    txCborHex: string;
    signedTxCborHex: string;
    walletTxId: TxId;
} : {});

declare type TxDescriptionWithError = TxDescription<any, "built", any, {
    error: string;
}>;

/**
 * Converts a TxId to printable form
 * @remarks
 *
 * ... showing only the first 6 and last 4 characters of the hex
 * @public
 **/
export declare function txidAsString(x: TxId, length?: number): string;

/**
 * @public
 */
export declare type txIdString = string;

/**
 * Converts a TxInput to printable form
 * @remarks
 *
 * Shortens address and output-id for visual simplicity; doesn't include datum info
 * @public
 **/
export declare function txInputAsString(x: TxInput, prefix?: string, index?: number, redeemer?: string): string;

/**
 * Decorates functions that can construct a new transaction context for a specific use-case
 * @remarks
 *
 * function names must follow the mkTxn... convention.
 * @public
 **/
export declare function txn(proto: any, thingName: any, descriptor: any): any;

/**
 * @public
 */
export declare class TxNotNeededError extends Error {
    constructor(message: string);
}

/**
 * Converts a txOutput to printable form
 * @remarks
 *
 * including all its values, and shortened Address.
 * @public
 **/
export declare function txOutputAsString(x: TxOutput, prefix?: string, utxoDCache?: UtxoDisplayCache, txoid?: TxOutputId): string;

/**
 * Converts a TxOutputId to printable form
 * @public
 */
export declare function txOutputIdAsString(x: TxOutputId, length?: number): string;

/**
 * Provides notifications for various stages of transaction submission
 */
declare type TxPipelineOptions = Expand<TxSubmitCallbacks & {
    fixupBeforeSubmit?: MultiTxnCallback;
    whenBuilt?: MultiTxnCallback<any, TxDescription<any, "built">>;
}>;

/**
 * Tracks the submission of a single tx via one or more submitter clients
 * @public
 */
export declare class TxSubmissionTracker extends StateMachine<SubmissionsStates, SubmissionsTransitions> {
    txd: TxDescription<any, any>;
    submitters: namedSubmitters;
    txSubmitters: Record<string, TxSubmitMgr>;
    setup: SetupInfo;
    isSigned: boolean;
    get initialState(): "registered";
    constructor({ txd, submitters, setup, }: {
        txd: TxDescription<any, any>;
        submitters: namedSubmitters;
        setup: SetupInfo;
    });
    destroy(): void;
    get id(): string;
    get txLabel(): string;
    get stateMachineName(): string;
    get txId(): string;
    resetState(): void;
    isBuilt: boolean;
    onEntry: {
        registered: () => void;
        building: () => void;
        built: () => void;
        signingSingle: () => void;
        submitting: () => void;
    };
    $signAndSubmit(): Promise<void>;
    update(txd: TxDescription<any, any>, transition?: SubmissionsTransitions): void;
    /**
     * signals that the tx was signed, and automatically triggers submission
     * @remarks
     * this should be triggered by the batch-controller's tx-submit strategy
     * either in bulk or on individual txns
     * @public
     */
    $didSignTx(): void;
    $startSubmitting(): void;
    transitionTable: StateTransitionTable<SubmissionsStates, SubmissionsTransitions>;
    /**
     * aggregates the states of all the various submitters of a single tx
     * @remarks
     * Called every time one of the submit-managers' state is changed.  Based
     * on the status of that submitter, the tx-tracker's state is updated.
     *
     * If there is a failure detected in the submit-manager, the other submit
     * managers are notified of the problem, which typically triggers them to
     * re-confirm and/or re-submit the transaction to the network, to recover
     * from txns that might otherwise have been dropped due to a slot/height
     * battle.
     *
     * Switches the tx-tracker's state to match the aggregated state of its
     * submitters.  This aggregated state is suitable for presenting to the user
     */
    updateSubmitterState(name: string, mgr: TxSubmitMgr): void;
    /**
     * private internal method for forcing the state into an indication
     * of confirmed, without triggering any other state changes
     * @remarks
     * helps prevent the test env from being affected by particularities
     * of the tx batcher that are good for user-facing context but disruptive
     * for test automation
     * @internal
     */
    _emulatorConfirmed(): void;
}

declare type TxSubmitCallbacks = {
    onSubmitError?: MultiTxnCallback<any, TxDescription<any, "built", any, {
        error: string;
    }>>;
    onSubmitted?: MultiTxnCallback<any, TxDescription<any, "submitted">>;
};

/**
 * manages the submission of a single transaction to a single submitter
 * @public
 */
export declare class TxSubmitMgr extends StateMachine<TxSubmitterStates, TxSubmitterTransitions> {
    name: string;
    submitter: CardanoTxSubmitter;
    txd: TxDescription<any, "signed">;
    get $$statusSummary(): {
        status: TxSubmitterStates;
        currentActivity: string;
        deferredAction: string;
        confirmations: number;
        hasConfirmationProblems: boolean;
        expirationDetected: boolean;
        isHealthy: boolean;
        isBadTx: Error | undefined;
        recovering: boolean;
        nextActivityStartTime: number | undefined;
        stats: {
            totalSubmissionAttempts: number;
            totalSubmissionSuccesses: number;
            totalConfirmationAttempts: number;
            totalConfirmationSuccesses: number;
            confirmationFailures: number;
            signsOfServiceLife: number;
        };
    };
    $mgrState: SubmitManagerState;
    setup: SetupInfo;
    submitIssue?: string;
    pending: (WrappedPromise<any> & {
        activity: string;
    }) | undefined;
    retryIntervals: Required<SubmitterRetryIntervals>;
    constructor(args: {
        name: string;
        txd: TxDescription<any, "signed">;
        setup: SetupInfo;
        submitter: CardanoTxSubmitter;
        retryIntervals?: SubmitterRetryIntervals;
    });
    destroy(): void;
    get networkParams(): NetworkParams;
    get network(): CardanoClient;
    get stateMachineName(): string;
    get txDescription(): string;
    /**
     * the locally-unique id-ish label of the tx description
     * @remarks
     * see {@link TxSubmitMgr.txId|txId} for the actual txId available after the tx is built
     */
    get id(): string;
    get txId(): TxId;
    get tx(): Tx;
    wasUpdated(): void;
    get initialState(): TxSubmitterStates;
    resetState(): void;
    otherSubmitterProblem(): void;
    nothingPendingAllowed(that: string): void;
    pendingActivity<P>(activityName: string, p: Promise<P>): Promise<P | undefined>;
    done(activityName: string): void;
    tryConfirm(): Promise<void>;
    didConfirm(): void;
    notConfirmed(problem?: Error): void;
    scheduleAnotherConfirmation(this: this, transitionName: TxSubmitterTransitions, reason: string, backoff?: number): DeferredState_2<this>;
    trySubmit(): Promise<void>;
    inputUtxosAreResolvable(): Promise<boolean>;
    notSubmitted(problem: Error): Promise<void>;
    scheduleAnotherSubmit(transitionName: TxSubmitterTransitions, displayStatus: string, backoff?: number): DeferredState_2<this>;
    nextStartTime(retryInterval: number): void;
    txExpired(): void;
    resetConfirmationStats(): void;
    /**
     * mockable method for checking an error (provided by the submitter)
     * to see if the submitter understands it to be of the "unknown UTXO" type
     * @remarks
     * When a utxo is unknown, it can mean it was existing and is now spent,
     * or it can mean it was not yet known to exist.  The error message can
     * potentially indicate either of these cases, and ideally the submitter can
     * tell the difference.  In any case, a truthy response indicates that the
     * tx is not yet submittable.
     */
    isUnknownUtxoError(problem: Error | SubmissionUtxoError): boolean;
    /**
     * ?? can the expiry error indicate not-yet-valid?  Or only no-longer-valid??
     */
    isExpiryError(problem: Error | SubmissionExpiryError): boolean;
    gradualBackoff(baseInterval: number, thisAttempt: number, backoff?: number): number;
    firmBackoff(baseInterval: any, thisAttempt: number): number;
    /**
     * mockable method for finding the tx from the submitter, which
     * is a confirmation that it was submitted successfully
     */
    confirmTx(): Promise<boolean>;
    onEntry: {
        submitting: () => void;
        confirming: () => Promise<void>;
        softConfirmed: () => Promise<void> | undefined;
        failed: () => void;
    };
    transitionTable: StateTransitionTable<TxSubmitterStates, TxSubmitterTransitions>;
    get currentSlot(): number;
    /**
     * Mockable method for submitting the transaction
     */
    doSubmit(): Promise<TxId | undefined>;
    isTxExpired(tx: Tx): boolean;
    /**
     * @internal
     */
    checkTxValidityDetails(tx: Tx): void;
}

/**
 * @public
 */
declare type TxSubmitterStates = "submitting" | "confirming" | "softConfirmed" | "confirmed" | "failed";

/**
 * @public
 */
declare type TxSubmitterTransitions = "submitted" | "confirmed" | "unconfirmed" | "hardConfirm" | "failed" | "notOk" | "timeout" | "txExpired" | "reconfirm" | "otherSubmitterProblem";

declare const TYPE_ERROR: unique symbol;

declare type TYPE_ERROR = typeof TYPE_ERROR;

/**
 * @public
 */
declare type TypeError_2<T extends string, moreInfo extends Object = {}> = {
    [TYPE_ERROR]: T;
    moreInfo: moreInfo;
};

/**
 * GENERATED data bridge for **BasicDelegate** script (defined in class ***UnspecializedDgtBundle***)
 * main: **src/delegation/BasicDelegate.hl**, project: **stellar-contracts**
 * @remarks
 * This class doesn't need to be used directly.  Its methods are available through the ***contract's methods***:
 *  - `get mkDatum` - returns the datum-building bridge for the contract's datum type
 *  - `get activity` - returns an activity-building bridge for the contract's activity type
 *  - `get reader` - (advanced) returns a data-reader bridge for parsing CBOR/UPLC-encoded data of specific types
 *  - `get onchain` - (advanced) returns a data-encoding bridge for types defined in the contract's script
 * The advanced methods are not typically needed - mkDatum and activity should normally provide all the
 * type-safe data-encoding needed for the contract.  For reading on-chain data, the Capo's `findDelegatedDataUtxos()`
 * method is the normal way to locate and decode on-chain data without needing to explicitly use the data-bridge helper classes.
 *
 * ##### customizing the bridge class name
 * Note that you may override `get bridgeClassName() { return "..." }` to customize the name of this bridge class
 * @public
 */
export declare class UnspecializedDelegateBridge extends ContractDataBridge {
    static isAbstract: false;
    isAbstract: false;
    /**
     * Helper class for generating TxOutputDatum for the ***datum type (DelegateDatum)***
     * for this contract script.
     */
    datum: DelegateDatumHelper;
    /**
     * this is the specific type of datum for the `BasicDelegate` script
     */
    DelegateDatum: DelegateDatumHelper;
    readDatum: (d: UplcData) => ErgoDelegateDatum;
    /**
     * generates UplcData for the activity type (***DelegateActivity***) for the `BasicDelegate` script
     */
    activity: DelegateActivityHelper;
    DelegateActivity: DelegateActivityHelper;
    reader: UnspecializedDelegateBridgeReader;
    /**
     * accessors for all the types defined in the `BasicDelegate` script
     * @remarks - these accessors are used to generate UplcData for each type
     */
    types: {
        /**
         * generates UplcData for the enum type ***DelegateDatum*** for the `BasicDelegate` script
         */
        DelegateDatum: DelegateDatumHelper;
        /**
         * generates UplcData for the enum type ***DelegateRole*** for the `BasicDelegate` script
         */
        DelegateRole: DelegateRoleHelper_2;
        /**
         * generates UplcData for the enum type ***ManifestActivity*** for the `BasicDelegate` script
         */
        ManifestActivity: ManifestActivityHelper_2;
        /**
         * generates UplcData for the enum type ***CapoLifecycleActivity*** for the `BasicDelegate` script
         */
        CapoLifecycleActivity: CapoLifecycleActivityHelper_2;
        /**
         * generates UplcData for the enum type ***DelegateLifecycleActivity*** for the `BasicDelegate` script
         */
        DelegateLifecycleActivity: DelegateLifecycleActivityHelper;
        /**
         * generates UplcData for the enum type ***SpendingActivity*** for the `BasicDelegate` script
         */
        SpendingActivity: SpendingActivityHelper;
        /**
         * generates UplcData for the enum type ***MintingActivity*** for the `BasicDelegate` script
         */
        MintingActivity: MintingActivityHelper;
        /**
         * generates UplcData for the enum type ***BurningActivity*** for the `BasicDelegate` script
         */
        BurningActivity: BurningActivityHelper;
        /**
         * generates UplcData for the enum type ***DelegateActivity*** for the `BasicDelegate` script
         */
        DelegateActivity: DelegateActivityHelper;
        /**
         * generates UplcData for the enum type ***PendingDelegateAction*** for the `BasicDelegate` script
         */
        PendingDelegateAction: PendingDelegateActionHelper_2;
        /**
         * generates UplcData for the enum type ***ManifestEntryType*** for the `BasicDelegate` script
         */
        ManifestEntryType: ManifestEntryTypeHelper_2;
        /**
         * generates UplcData for the enum type ***PendingCharterChange*** for the `BasicDelegate` script
         */
        PendingCharterChange: PendingCharterChangeHelper_2;
        /**
         * generates UplcData for the enum type ***cctx_CharterInputType*** for the `BasicDelegate` script
         */
        cctx_CharterInputType: cctx_CharterInputTypeHelper;
        /**
         * generates UplcData for the enum type ***AnyData*** for the `BasicDelegate` script
         */
        AnyData: (fields: AnyDataLike_2 | {
            id: number[];
            type: string;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***DelegationDetail*** for the `BasicDelegate` script
         */
        DelegationDetail: (fields: DelegationDetailLike | {
            capoAddr: /*minStructField*/ Address | string;
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            tn: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***RelativeDelegateLink*** for the `BasicDelegate` script
         */
        RelativeDelegateLink: (fields: RelativeDelegateLinkLike_4 | {
            uutName: string;
            delegateValidatorHash: /*minStructField*/ ValidatorHash | string | number[] | undefined;
            config: number[];
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***PendingDelegateChange*** for the `BasicDelegate` script
         */
        PendingDelegateChange: (fields: PendingDelegateChangeLike_2 | {
            action: PendingDelegateActionLike_2;
            role: DelegateRoleLike_2;
            dgtLink: /*minStructField*/ RelativeDelegateLinkLike_4 | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoManifestEntry*** for the `BasicDelegate` script
         */
        CapoManifestEntry: (fields: CapoManifestEntryLike_3 | {
            entryType: ManifestEntryTypeLike_2;
            tokenName: number[];
            mph: /*minStructField*/ MintingPolicyHash | string | number[] | undefined;
        }) => UplcData;
        /**
         * generates UplcData for the enum type ***CapoCtx*** for the `BasicDelegate` script
         */
        CapoCtx: (fields: CapoCtxLike | {
            mph: /*minStructField*/ MintingPolicyHash | string | number[];
            charter: cctx_CharterInputTypeLike;
        }) => UplcData;
    };
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺAnyDataCast: Cast<AnyData_2, AnyDataLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺDelegationDetailCast: Cast<DelegationDetail_2, DelegationDetailLike>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺRelativeDelegateLinkCast: Cast<RelativeDelegateLink_4, RelativeDelegateLinkLike_4>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺPendingDelegateChangeCast: Cast<PendingDelegateChange_2, PendingDelegateChangeLike_2>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoManifestEntryCast: Cast<CapoManifestEntry_2, CapoManifestEntryLike_3>;
    /**
     * uses unicode U+1c7a - sorts to the end */
    ᱺᱺCapoCtxCast: Cast<CapoCtx, CapoCtxLike>;
}

/**
 * @public
 */
declare class UnspecializedDelegateBridgeReader extends DataBridgeReaderClass {
    bridge: UnspecializedDelegateBridge;
    constructor(bridge: UnspecializedDelegateBridge, isMainnet: boolean);
    datum: (d: UplcData) => Partial<{
        Cip68RefToken: DelegateDatum$Ergo$Cip68RefToken;
        IsDelegation: ErgoDelegationDetail;
        capoStoredData: DelegateDatum$Ergo$capoStoredData;
    }>;
    /**
     * reads UplcData *known to fit the **DelegateDatum*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateDatum(d: UplcData): ErgoDelegateDatum;
    /**
     * reads UplcData *known to fit the **DelegateRole*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateRole(d: UplcData): ErgoDelegateRole_2;
    /**
     * reads UplcData *known to fit the **ManifestActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestActivity(d: UplcData): ErgoManifestActivity_2;
    /**
     * reads UplcData *known to fit the **CapoLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoLifecycleActivity(d: UplcData): ErgoCapoLifecycleActivity_2;
    /**
     * reads UplcData *known to fit the **DelegateLifecycleActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateLifecycleActivity(d: UplcData): ErgoDelegateLifecycleActivity;
    /**
     * reads UplcData *known to fit the **SpendingActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    SpendingActivity(d: UplcData): ErgoSpendingActivity;
    /**
     * reads UplcData *known to fit the **MintingActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    MintingActivity(d: UplcData): ErgoMintingActivity;
    /**
     * reads UplcData *known to fit the **BurningActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    BurningActivity(d: UplcData): ErgoBurningActivity;
    /**
     * reads UplcData *known to fit the **DelegateActivity*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegateActivity(d: UplcData): ErgoDelegateActivity;
    /**
     * reads UplcData *known to fit the **PendingDelegateAction*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateAction(d: UplcData): ErgoPendingDelegateAction_2;
    /**
     * reads UplcData *known to fit the **ManifestEntryType*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    ManifestEntryType(d: UplcData): ErgoManifestEntryType_2;
    /**
     * reads UplcData *known to fit the **PendingCharterChange*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingCharterChange(d: UplcData): ErgoPendingCharterChange_4;
    /**
     * reads UplcData *known to fit the **cctx_CharterInputType*** enum type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the enum type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    cctx_CharterInputType(d: UplcData): Ergocctx_CharterInputType;
    /**
     * reads UplcData *known to fit the **AnyData*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    AnyData(d: UplcData): AnyData_2;
    /**
     * reads UplcData *known to fit the **DelegationDetail*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    DelegationDetail(d: UplcData): DelegationDetail_2;
    /**
     * reads UplcData *known to fit the **RelativeDelegateLink*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    RelativeDelegateLink(d: UplcData): RelativeDelegateLink_4;
    /**
     * reads UplcData *known to fit the **PendingDelegateChange*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    PendingDelegateChange(d: UplcData): PendingDelegateChange_2;
    /**
     * reads UplcData *known to fit the **CapoManifestEntry*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoManifestEntry(d: UplcData): CapoManifestEntry_2;
    /**
     * reads UplcData *known to fit the **CapoCtx*** struct type,
     * for the BasicDelegate script.
     * #### Standard WARNING
     *
     * This is a low-level data-reader for use in ***advanced development scenarios***.
     *
     * Used correctly with data that matches the type, this reader
     * returns strongly-typed data - your code using these types will be safe.
     *
     * On the other hand, reading non-matching data will not give you a valid result.
     * It may throw an error, or it may throw no error, but return a value that
     * causes some error later on in your code, when you try to use it.
     */
    CapoCtx(d: UplcData): CapoCtx;
}

export { UnspecializedDelegateScript }

/**
 * @public
 */
export declare class UnspecializedDgtBundle extends UnspecializedDgtBundle_base {
    specializedDelegateModule: Source;
    requiresGovAuthority: boolean;
    get rev(): bigint;
    get params(): {
        rev: bigint;
        delegateName: string;
        isMintDelegate: boolean;
        isSpendDelegate: boolean;
        isDgDataPolicy: boolean;
        requiresGovAuthority: boolean;
    };
    get moduleName(): string;
    get bridgeClassName(): string;
}

declare const UnspecializedDgtBundle_base: ConcreteCapoDelegateBundle_2;

/**
 * @public
 */
export declare class UnspecializedMintDelegate extends BasicMintDelegate {
    dataBridgeClass: typeof UnspecializedDelegateBridge;
    get delegateName(): string;
    scriptBundleClass(): Promise<UnspecializedDgtBundle_3>;
    activityMintingUutsAppSpecific(seedFrom: hasSeedUtxo, purposes: string[]): isActivity_2;
    activityCreatingTestNamedDelegate(seedFrom: hasSeed, purpose: string): isActivity_2;
}

declare class UpdateActivity<FactoryFunc extends updateActivityFunc<any>, ARGS extends [...any] = FactoryFunc extends updateActivityFunc<infer ARGS> ? ARGS : never> {
    args: ARGS;
    host: DelegatedDataContract<any, any>;
    factoryFunc: FactoryFunc;
    constructor(host: DelegatedDataContract<any, any>, factoryFunc: FactoryFunc, args: ARGS);
    mkRedeemer(recId: hasRecId): isActivity;
}

declare type UpdateActivityArgs<UA extends updateActivityFunc<any>> = UA extends updateActivityFunc<infer ARGS> ? ARGS : never;

/**
 * @public
 */
export declare type updateActivityFunc<ARGS extends [...any]> = (recId: hasRecId, ...args: ARGS) => isActivity;

declare class UplcConsoleLogger implements UplcLogger {
    didStart: boolean;
    lastMessage: string;
    lastReason?: "build" | "validate";
    history: string[];
    groupStack: Group[];
    constructor();
    get currentGroupLines(): LineOrGroup[];
    get topLines(): LineOrGroup[];
    reset(reason: "build" | "validate"): void;
    interesting: number;
    logPrint(message: string, site?: Site): this;
    get currentGroup(): Group;
    logError(message: string, stack?: Site): void;
    toggler: number;
    toggleDots(): void;
    get isMine(): boolean;
    resetDots(): void;
    showDot(): "│   ┊ " | "│ ● ┊ ";
    fullHistory(): string;
    formattedHistory: string[];
    fullFormattedHistory(): string;
    formatGroup(group: Group): string[];
    formatLines(lines: LineOrGroup[]): string[];
    flushLines(footerString?: string): void;
    finish(): this;
    get groupLines(): LineOrGroup[];
    flush(): this;
    flushError(message?: string): this;
}

/**
 *  this is NOT a jsonifier, but it emits nice-looking info onscreen when used with JSON.stringify (in arg2)
 * @public
 */
export declare function uplcDataSerializer(key: string, value: any, depth?: number): any;

/**
 * @public
 */
declare type UplcRecord_2<CT extends configBase> = {
    [key in keyof CT]: UplcData;
};

declare type useRawMinterSetup = Omit<NormalDelegateSetup, "mintDelegateActivity"> & {
    omitMintDelegate: true;
    specialMinterActivity: isActivity;
    mintDelegateActivity?: undefined;
};

/**
 * converts a utxo to printable form
 * @remarks
 *
 * shows shortened output-id and the value being output, plus its datum
 * @internal
 **/
export declare function utxoAsString(x: TxInput, prefix?: string, utxoDCache?: UtxoDisplayCache): string;

/**
 * @public
 */
declare type UtxoDisplayCache = Map<TxOutputId, string>;

/**
 * A helper class for managing UTXOs in a Stellar contract
 * @remarks
 * Using the provided setup details, this helper provides methods for finding,
 * filtering and selecting UTXOs for inclusion in transactions, and for creating
 * related values and predicate-functions for matching UTXOs.
 * @public
 */
export declare class UtxoHelper {
    strella?: StellarContract<any>;
    setup: SetupInfo;
    constructor(setup: SetupInfo, strella?: StellarContract<any>);
    get networkParams(): NetworkParams;
    get wallet(): Wallet;
    get network(): TxChainBuilder | CardanoClient | Emulator;
    /**
     * Filters out utxos having non-ada tokens
     * @internal
     */
    hasOnlyAda(value: Value, tcx: StellarTxnContext | undefined, u: TxInput): TxInput | undefined;
    /**
     * Sorts utxos by size, with pure-ADA utxos preferred over others.
     * @internal
     */
    utxoSortSmallerAndPureADA({ free: free1, minAdaAmount: r1 }: utxoSortInfo, { free: free2, minAdaAmount: r2 }: utxoSortInfo): 0 | 1 | -1;
    /**
     * Filters out utxos that are not sufficient to cover the minimum ADA amount established in
     * the utxo sort info in {@link UtxoHelper.mkUtxoSortInfo | mkUtxoSortInfo(min, max?)}.  Use in a filter() call.
     * @internal
     */
    utxoIsSufficient({ sufficient }: utxoSortInfo): boolean;
    /**
     * Filters out utxos that have non-ADA tokens, given a utxo sort info object.  Use in a filter() call.
     * @internal
     */
    utxoIsPureADA({ u }: utxoSortInfo): TxInput | undefined;
    /**
     * transforms utxo sort info back to just the utxo.
     * @internal
     */
    sortInfoBackToUtxo({ u }: utxoSortInfo): TxInput;
    /**
     * Creates a function that creates sort-info details for a utxo, given a minimum ADA amount
     * and an optional maximum ADA amount.
     * @internal
     **/
    mkUtxoSortInfo(min: bigint, max?: bigint): (u: TxInput) => utxoSortInfo;
    /**
     * accumulates the count of utxos, but only if the utxo is ADA-only.  Use in a reduce() call.
     **/
    reduceUtxosCountAdaOnly(c: number, { minAdaAmount }: utxoSortInfo): number;
    hasToken<tokenBearer extends canHaveToken>(something: tokenBearer, value: Value, tokenName?: string, quantity?: bigint): tokenBearer | undefined;
    utxoHasToken(u: TxInput, value: Value, tokenName?: string, quantity?: bigint): false | TxInput;
    inputHasToken(i: TxInput, value: Value, tokenName?: string, quantity?: bigint): false | TxInput;
    assetsHasToken(a: Assets, vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): boolean;
    outputHasToken(o: TxOutput, vOrMph: Value | MintingPolicyHash, tokenName?: string, quantity?: bigint): boolean;
    /**
     * @deprecated - use helios `makeValue()` instead
     */
    mkAssetValue(mph: MintingPolicyHash, tokenName: BytesLike, count?: bigint): any;
    findSmallestUnusedUtxo(lovelace: bigint, utxos: TxInput[], tcx?: StellarTxnContext): TxInput | undefined;
    /**
     * creates a filtering function, currently for TxInput-filtering only.
     * with the optional tcx argument, utxo's already reserved
     *  ... in that transaction context will be skipped.
     * @public
     */
    mkValuePredicate(lovelace: bigint, tcx?: StellarTxnContext): tokenPredicate<TxInput>;
    mkRefScriptPredicate(expectedScriptHash: number[]): utxoPredicate;
    /**
     * Creates an asset class for the given token name, for the indicated minting policy
     */
    acAuthorityToken(tokenName: string | number[], mph?: MintingPolicyHash): AssetClass;
    /**
     * Creates a Value object representing a token with a minimum lovelace amount
     * making it valid for output in a utxo.
     * @public
     */
    mkMinTv(mph: MintingPolicyHash, tokenName: string | UutName | number[], count?: bigint): Value;
    mkMinAssetValue(mph: MintingPolicyHash, tokenName: BytesLike, count?: bigint): Value;
    tokenAsValue(tokenName: string | number[] | UutName, count?: bigint): Value;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant takes just a token-name / quantity, working only on Capo instances,
     * and seeks a token created by the Capo's minting policy.
     *
     * Choose from one of the other variants to make a more specific token predicate.
     * @public
     */
    mkTokenPredicate(tokenName: UutName | number[] | string, quantity?: bigint): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses a Value for filtering - each matched item must have the ENTIRE value.
     * @public
     */
    mkTokenPredicate(val: Value): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an explicit combination of policy/token-name/quantity
     * @public
     */
    mkTokenPredicate(mph: MintingPolicyHash, tokenName: string, quantity?: bigint): tokenPredicate<any>;
    /**
     * Creates a token predicate suitable for mustFindActorUtxo or mustFindMyUtxo
     * @remarks
     * This variant uses an AssetClass(policy/token-name) and quantity
     * @public
     */
    mkTokenPredicate(mphAndTokenName: AssetClass, quantity?: bigint): tokenPredicate<any>;
    /**
     * adds the values of the given TxInputs
     */
    totalValue(utxos: TxInput[]): Value;
    /**
     * Creates a Value object representing a token with the given name and quantity
     * @deprecated - Use `helios' makeValue()` instead.
     * @remarks
     * This method doesn't include any lovelace in the Value object.
     * use mkMinAssetValue() to include the minimum lovelace for storing that token in its own utxo
     * @param tokenName - the name of the token
     * @param quantity - the quantity of the token
     * @param mph - the minting policy hash of the token
     * @public
     **/
    mkTokenValue(tokenName: string | number[], quantity: bigint, mph: MintingPolicyHash): Value;
    /**
     * Creates a Value having enough lovelace to store the indicated token
     * @deprecated - Use {@link UtxoHelper.mkMinAssetValue | mkMinAssetValue(mph, tokenName, quantity)} instead.
     * @remarks
     * This is equivalent to mkTokenValue() with an extra min-utxo calculation
     * @public
     **/
    mkMinTokenValue(tokenName: string | number[], quantity: bigint, mph: MintingPolicyHash): Value;
    /**
     * finds utxos in the current actor's wallet that have enough ada to cover the given amount
     * @remarks
     * This method is useful for finding ADA utxos that can be used to pay for a transaction.
     *
     * Other methods in the utxo helper are better for finding individual utxos.
     *
     * If the `required` option is true, it throws an error if no sufficient utxos are found.
     * @public
     */
    findSufficientActorUtxos(name: string, amount: Value, options?: UtxoSearchScope, strategy?: CoinSelector | CoinSelector[]): Promise<TxInput[]>;
    /**
     * Locates a utxo in the current actor's wallet that matches the provided token predicate
     * @remarks
     * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
     *
     * In "single" mode, it returns the single matching utxo, or undefined if none are found
     *
     * When the searchOthers option is true, it searches in other wallets from the actor-context
     * if no utxos are matched  in the current actor's wallet.
     * @public
     */
    findActorUtxo<T extends "single" | "multiple" = "single">(name: string, predicate: (u: TxInput) => TxInput | undefined, options?: UtxoSearchScope, mode?: T): any;
    /**
     * Try finding a utxo matching a predicate
     * @remarks
     * Filters the provided list of utxos to find the first one that matches the predicate.
     *
     * Skips any utxos that are already being spent in the provided transaction context.
     * Skips any utxos that are marked as collateral in the wallet.
     *
     * With the mode="multiple" option, it returns an array of matches if any are found, or undefined if none are found.
     * @public
     **/
    hasUtxo<T extends "single" | "multiple" = "single">(semanticName: string, predicate: utxoPredicate, { wallet, exceptInTcx, utxos, required, dumpDetail, searchOthers, }: UtxoSearchScopeWithUtxos, mode?: T): Promise<T extends "single" ? TxInput | undefined : TxInput[] | undefined>;
    mustFindActorUtxo(name: string, options: {
        predicate: (u: TxInput) => TxInput | undefined;
        exceptInTcx?: StellarTxnContext<any>;
        extraErrorHint?: string;
    }): Promise<TxInput>;
    mustFindUtxo(semanticName: string, options: UtxoSearchScope & {
        predicate: utxoPredicate;
    }): Promise<TxInput>;
    utxoSearchError(semanticName: string, searchScope: UtxoSearchScope, extraErrorHint?: string, walletAddresses?: Address | Address[]): string;
    toUtxoId(u: TxInput): string;
}

/**
 * a function that can filter txInputs for coin-selection
 * @remarks
 *
 * short form: "returns truthy" if the input is matchy for the context
 * @public
 **/
export declare type utxoPredicate = (((u: TxInput) => TxInput | undefined) | ((u: TxInput) => boolean) | ((u: TxInput) => boolean | undefined)) & {
    predicateValue?: Value;
};

/**
 * Converts a list of UTxOs to printable form
 * @remarks
 *
 * ... using {@link utxoAsString}
 * @public
 **/
export declare function utxosAsString(utxos: TxInput[], joiner?: string, utxoDCache?: UtxoDisplayCache): string;

declare type UtxoSearchScope = {
    /**
     * provides pre-resolved utxos for the indicated address-or-wallet
     */
    utxos?: TxInput[];
    /**
     * searches in a specific address (e.g. a smart contract address)
     */
    address?: Address;
    /**
     * searches in this wallet rather than the address
     */
    wallet?: Wallet | SimpleWallet;
    /**
     * suppresses searching in other actor-wallets found in the setup / actorContext:
     */
    searchOthers?: boolean;
    /**
     * extra hint to add to the error message if no utxos are found
     */
    extraErrorHint?: string;
    /**
     * @deprecated - ??? use txBatcher's chainBuilder and includeAddlTxns instead
     * NOTE: if we're only using this to reference our OWN tcx, then
     *   either make that automatic, or retract the deprecation.
     */
    exceptInTcx?: StellarTxnContext;
    /**
     * by default it, only dumps detail if global.utxoDump is set to true
     * @remarks
     * - use "onFail" to log candidate utxos if the search fails
     * - use "always" to log candidate utxos for a single search,
     *   regardless of success or failure
     */
    dumpDetail?: "onFail" | "always";
};

declare type UtxoSearchScopeWithUtxos = UtxoSearchScope & {
    utxos: TxInput[];
    required?: true;
};

declare type utxoSortInfo = {
    u: TxInput;
    sufficient: boolean;
    free: bigint;
    minAdaAmount: bigint;
};

/**
 * @public
 */
export declare type UutCreationAttrsWithSeed = {
    usingSeedUtxo: TxInput;
};

/**
 * A base state for a transaction context
 * @public
 **/
declare type uutMap = Record<string, unknown>;

/**
 * a unique utility token having a unique name
 * @remarks
 *
 * This class contains a general 'purpose' name, mapped to a unique
 * `name`, which is generated using a seed-utxo pattern.
 *
 * @public
 **/
export declare class UutName {
    _uutName: string;
    purpose: string;
    constructor(purpose: string, fullUutName: string | number[]);
    /**
     * the full uniquified name of this UUT
     * @remarks
     *
     * format: `purpose-‹...uniqifier...›`
     * @public
     **/
    get name(): string;
    toString(): string;
}

/**
 * strongly-typed map of purpose-names to Uut objects
 *
 * @public
 */
export declare type uutPurposeMap<unionPurpose extends string> = {
    [purpose in unionPurpose]: UutName;
};

/**
 * Converts a Value to printable form
 * @public
 **/
export declare function valueAsString(v: Value): string;

/**
 * Tuple of byte-array, count, needed for Value creation on native tokens.
 * @public
 **/
export declare type valuesEntry = [number[], bigint];

declare type VariantFlavor = "tagOnly" | "fields" | "singletonField";

declare type VariantMap = {
    [variantName: string]: singleEnumVariantMeta<any, any, any, any, any, any>;
};

/**
 * @public
 */
export declare abstract class WalletSigningStrategy {
    abstract canBatch: boolean;
    wallet: Wallet;
    constructor(wallet: Wallet);
    abstract signSingleTx(tx: Tx): Promise<Signature[]>;
    /**
     * has the wallet sign the txns in the batch
     * @remarks
     * implements a fallback for strategies that don't support batching
     *
     * You must override this method if your wallet can batch sign.  Also,
     * set canBatch = true.
     *
     * Adds the signatures to the txns and also returns the signatures
     * in case that's helpful.
     */
    signTxBatch(batch: BatchSubmitController): Promise<(undefined | Signature[])[]>;
    signTx(txTracker: TxSubmissionTracker): Promise<void | Signature[]>;
}

declare type wrapOnly = hasWrap & noTimeout;

/**
 * For a delegate-data contract using an off-chain data structure
 * @remarks
 * ...with additional logic beyond the data itself (e.g. a class with methods
 * wrapping the underlying data details)
 * @public
 */
export declare abstract class WrappedDgDataContract<T extends AnyDataTemplate<any, any>, TLike extends AnyDataTemplate<any, any>, WRAPPER extends someDataWrapper<TLike>> extends DelegatedDataContract<T, TLike> {
    usesWrappedData: boolean;
    /**
     * Transforms the on-chain data structure into a higher-level
     * application-specific class representation.  That class should
     * provide an unwrapData() method to get back to the on-chain data.
     * @public
     */
    abstract mkDataWrapper(d: TLike): WRAPPER;
    mkDgDatum(record: TLike | WRAPPER): InlineDatum;
    /**
     * converts a record from the essential
     * on-chain data structure to a higher-level application-specific
     * class representation.
     * @remarks
     * When a wrapper is used, the results of Capo's findDelegatedDataUtxos() method
     * will include the data: property having the unwrapped data, as well as
     * the dataWrapped property with the unwrapped version of the data.
     */
    wrapData(data: TLike): WRAPPER;
    /**
     * builds a txn creating a record of this type in the data store
     * @remarks
     * The \{activity\} option can be a {@link SeedActivity} object provided by
     * `this.activity.MintingActivities.$seeded$‹activityName›` accessors/methods,
     * which creates a record id based on the (unique) spend of a seed value.
     * @public
     */
    mkTxnCreateRecord<TCX extends StellarTxnContext>(options: DgDataCreationOptions<TLike> & {
        wrapped?: WRAPPER;
    }): Promise<TCX>;
    /**
     * builds a txn updating a record of this type in the data store
     * @remarks
     * Use `this.activity.SpendingActivities.*` to access the available
     * types of update offered by the contract.
     */
    mkTxnUpdateRecord<TCX extends StellarTxnContext>(txnName: string, item: FoundDatumUtxo<T, WRAPPER>, options: DgDataUpdateOptions<TLike> & {
        updatedWrapped?: WRAPPER;
    }, tcx?: TCX): Promise<TCX>;
}

/**
 * @public
 */
export declare type WrappedDgDataType<WDDC extends WrappedDgDataContract<any, any, any>> = WDDC extends WrappedDgDataContract<any, any, infer WRAPPER> ? WRAPPER : never;

/**
 * @public
 */
export declare type WrappedPromise<T> = {
    promise: Promise<T>;
    cancel: () => void;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout";
};

declare type wrapWithTimeout = hasWrap & hasTimeout;

export { }
