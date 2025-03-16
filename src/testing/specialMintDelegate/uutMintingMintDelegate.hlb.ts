import uutMintingMintDelegate from "./uutMintingMintDelegate.hl";
import { CapoDelegateBundle } from "../../helios/scriptBundling/CapoDelegateBundle.js";
import { CapoHeliosBundle } from "../../helios/scriptBundling/CapoHeliosBundle.js";


// todo: use MintSpendDelegateBundle here
// todo: ?? package the bundle-types as a export @dc/s-c/script-bundles?

/**
 * A specialized minting delegate for testing purposes
 */
export default class BundleMintDelegateWithGenericUuts 
extends CapoDelegateBundle.usingCapoBundleClass(CapoHeliosBundle) {
    specializedDelegateModule = uutMintingMintDelegate;
}

// if (false) {
//     // ... type tests for Datum and Datum variants
//     {
//         type delegateDatumVariant = singleEnumVariantMeta<
//         DelegateDatumMeta,
//             "IsDelegation",
//             "Constr#0",
//             "singletonField",
//             DelegationDetailLike,
//             "noSpecialFlags"
//         >;
//         const delegateDatumNOTSeeded: delegateDatumVariant extends anySeededActivity
//             ? false // seeded
//             : true = true; // not seeded

//         type delegateDatumVariantMaker =
//             EnumVariantCreator<delegateDatumVariant>;
//         const callVariantMaker: delegateDatumVariantMaker = (() => {}) as any;
//         // sample calls for checking different type-signatures
//         callVariantMaker({
//             capoAddr: { fake: true } as unknown as Address,
//             mph: { fake: true } as unknown as MintingPolicyHash,
//             tn: textToBytes("tokenName1234"),
//         });
//         callVariantMaker({
//             capoAddr: "fakeAddressAsString",
//             mph: "fakeMphAsString",
//             tn: textToBytes("tokenName1234"),
//         });

//         // negative case:
//         callVariantMaker({
//             capoAddr: "fakeAddress",
//             mph: "fakeMph",
//             //@ts-expect-error - string not OK here (NOTE: OK to make this more permissive later)
//             tn: "badTokenName",
//         });
//     }

//     {
//         type nestedEnumVariant = singleEnumVariantMeta<
//             DelegateDatumMeta, 
//             "HasNestedEnum",
//             "Constr#4", 
//             "singletonField", { 
//                 nested: SomeEnum /*singleVariantField*/ 
//             } , "noSpecialFlags"
//         >

//         type hasTestNestedEnum = nestedEnumVariant["data"];
//         const nestedThingIsEnum: hasTestNestedEnum extends EnumTypeMeta<any, any>
//             ? true
//             : false = true;
//         const nestedEnumVariantNOTSeeded: nestedEnumVariant["data"]["variants"]["hasNestedFields"] extends anySeededActivity
//             ? false
//             : true = true;

//         type nestedEnumMaker = makesUplcActivityEnumData<hasTestNestedEnum>;
//         const t: nestedEnumMaker = "fake" as any;
//         const minimal = { n: 1n, m: {
//             a: 1, 
//             b: new Map(), 
//             c: [], 
//             d: null
//         } };
//         t.hasNestedFields({...minimal});

//         t.hasNestedFields({
//             m: {a: 1, b: new Map([ 
//                 // ["hey look ma", "no hands" ],
//                 ["hello", textToBytes("world") ] 
//             ]), c: [true, false],  d: undefined },
//             n: 42n,
//         }) // should work

//         t.hasNestedFields({
//             m: {
//                 a: 1, 
//                 //@ts-expect-error - wrong type in map entry
//                 b: new Map([ 
//                     ["hey look ma", "no hands" ],
//             ]), 
//             c: [] 
//         },
//             n: 42n,
//         }) // should work

//         const withoutOption = {
//             m: {
//                 a: minimal.m.a,
//                 b: minimal.m.b,
//                 c: minimal.m.c,
//             },
//             n: 42n,
//         }
//         //@ts-expect-error - property d is missing - is an optional value, but has to be there - with null | undefined!
//         t.hasNestedFields({...withoutOption})
//     }
// }

// if (false) {
//     // ... type tests for Activities and Activity variants

//     {
//         // seeded activity
//         type seededVariant = singleEnumVariantMeta<
//             DelegateActivityMeta,
//             "CreatingDelegatedData",
//             "Constr#5",
//             "fields",
//             {
//                 seed: TxOutputId | string;
//                 dataType: string;
//             },
//             "isSeededActivity"
//         >;
//         const seededActivityWorks: seededVariant extends anySeededActivity
//             ? true
//             : false = true;

//         type seededVariantMaker = ActivityEnumVariantCreator<
//             seededVariant,
//             "redeemerWrapper"
//         >;
//         const callVariantMaker: seededVariantMaker = (() => {}) as any;
//         // sample calls for checking different type-signatures
//         callVariantMaker(
//             {
//                 txId: "" as unknown as TxId,
//                 idx: "" as unknown as bigint,
//             },
//             {
//                 dataType: "awesome",
//             }
//         );
//         callVariantMaker({
//             dataType: "awesome",
//             seed: "" as unknown as TxOutputId,
//         });
//     }
//     {
//         // unseeded activity
//         type unseededVariant = singleEnumVariantMeta<
//             DelegateActivityMeta,
//             "UpdatingDelegatedData",
//             "Constr#6",
//             "fields",
//             {
//                 dataType: string;
//                 recId: number[];
//             },
//             "noSpecialFlags"
//         >;

//         const unseededActivityWorks: unseededVariant extends anySeededActivity
//             ? true
//             : false = false;

//         type unseededVariantMaker = EnumVariantCreator<unseededVariant>;
//         const callVariantMaker: unseededVariantMaker = (() => {}) as any;
//         // sample calls for checking different type-signatures
//         callVariantMaker({
//             dataType: "awesome",
//             recId: [],
//         });
//     }

//     {
//         type nestedEnumVariant = singleEnumVariantMeta<
//             DelegateActivityMeta,
//             "CapoLifecycleActivities",
//             "Constr#0",
//             "singletonField",
//             CapoLifecycleActivity,
//             "noSpecialFlags"
//         >;

//         type nestedEnum = nestedEnumVariant["data"];
//         const nestedThingIsEnum: nestedEnum extends EnumTypeMeta<any, any>
//             ? true
//             : false = true;
//         const nestedEnumVariantIsSeeded: nestedEnumVariant["data"]["variants"]["CreatingDelegate"] extends anySeededActivity
//             ? true
//             : false = true;
//         type nestedEnumMaker = makesUplcActivityEnumData<nestedEnum>;
//         const t: nestedEnumMaker = "fake" as any;
//     }

//     const integratedTest =
//         "fake" as unknown as BundleMintDelegateWithGenericUuts;
//     {
//         // if these don't show type errors, then they're good expressions / type tests
//         integratedTest.Activity.CreatingDelegatedData(
//             {} as unknown as SeedAttrs,
//             {
//                 dataType: "awesome",
//             }
//         );

//         integratedTest.mkDatum.IsDelegation({
//             capoAddr: "" as unknown as Address,
//             mph: "",
//             tn: [],
//         });

//         // todo: support an inline proxy for generating a nested enum:
//         integratedTest.Activity.CapoLifecycleActivities.CreatingDelegate({
//             seed: "" as unknown as TxOutputId,
//             purpose: "awesome",
//         });
//         integratedTest.Activity.CapoLifecycleActivities.CreatingDelegate(
//             {
//                 txId: "" as unknown as TxId,
//                 idx: 0n,
//             },
//             {
//                 purpose: "awesome",
//             }
//         );
//     }
// }
