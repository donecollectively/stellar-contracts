import {
    Address, Datum, Tx,
    TxOutput,
    TxInput, Value
} from "@hyperionbt/helios";
import { ErrorMap } from "./delegation/RolesAndDelegates.js";


export function hexToPrintableString(hexStr) {
    let result = "";
    for (let i = 0; i < hexStr.length; i += 2) {
        let hexChar = hexStr.substring(i, i + 2);
        let charCode = parseInt(hexChar, 16);

        // ASCII printable characters are in the range 32 (space) to 126 (~)
        if (charCode >= 32 && charCode <= 126) {
            result += String.fromCharCode(charCode);
        } else {
            result += `‹${hexChar}›`;
        }
    }
    return result;
}
export function assetsAsString(v: any) {
    return Object.entries(v)
        .map(([policyId, tokens]) => {
            const tokenString = Object.entries(tokens as any)
                .map(
                    ([name, count]) => `${count}×💴 ${hexToPrintableString(name)}`
                )
                .join(" + ");
            return `⦑🏦 ${policyId.substring(0, 12)}… ${tokenString}⦒`;
        })
        .join("\n  ");
}
export function lovelaceToAda(l: bigint | number) {
    const asNum = parseInt(l.toString());
    const ada = (asNum && `${(Math.round(asNum / 1000) / 1000).toFixed(3)} ADA`) || "";
    return ada;
}

export function valueAsString(v: Value) {
    const ada = lovelaceToAda(v.lovelace);
    const assets = assetsAsString(v.assets.dump?.() || v.assets);
    return [ada, assets].filter((x) => !!x).join(" + ");
}

export function txAsString(tx: Tx): string {
    const bodyAttrs = [
        "inputs",
        "minted",
        "collateral",
        "refInputs",
        "outputs",
        "fee",
        "lastValidSlot",
        "firstValidSlot",
        "metadataHash",
        "scriptDataHash",
        "signers",
        "collateralReturn",
    ];
    const witnessAttrs = [
        "signatures",
        "datums",
        "refScripts",
        "scripts",
        "redeemers",
        "nativeScripts",
    ];

    let details = "";

    const d = tx.dump();
    //!!! todo: improve interface of tx so useful things have a non-private api
    //!!! todo: get rid of dump()
    //!!! todo: get back to type-safety in this diagnostic suite
    for (const x of bodyAttrs) {
        let item = tx.body[x] || (d.body[x] as any);
        let skipLabel = false;
        // console.log(`attr '${x}'`)
        if (Array.isArray(item) && !item.length) continue;

        if (!item) continue;
        if ("inputs" == x) {
            item = `\n  ${item.map((x) => txInputAsString(x)).join("\n  ")}`;
        }
        if ("refInputs" == x) {
            item = `\n  ${item.map((x) => txInputAsString(x, "ℹ️  ")).join("\n  ")}`;
        }
        if ("collateral" == x) {
            //!!! todo: group collateral with inputs and reflect it being spent either way,
            //     IFF it is also a tx `input`
            //!!! todo: move collateral to bottom with collateralReturn,
            //     IFF it is not part of the tx `inputs`
            item = item.map((x) => txInputAsString(x, "🔪")).join("\n    ");
        }
        if ("minted" == x) {
            const assets = item?.dump();
            if (!Object.entries(assets || {}).length) continue;

            item = ` ❇️  ${assetsAsString(assets)}`;
        }
        if ("outputs" == x) {
            item = `\n  ${item
                .map((x, i) => txOutputAsString(x, `${i}  <-`))
                .join("\n  ")}`;
        }
        if ("signers" == x) {
            item = item.map((x) => {
                if (!x.hex) debugger;
                return `🔑#${x.hex.substring(0, 8)}…`;
            });
        }

        if ("fee" == x) {
            item = parseInt(item);
            item = `${(Math.round(item / 1000) / 1000).toFixed(3)} ADA ` +
                    tx.profileReport.split("\n")[0]

            // console.log("fee", item)
        }

        if ("collateralReturn" == x) {
            skipLabel = true;
            item = `  ${txOutputAsString(
                item,
                `0  <- ❓`
            )} conditional: collateral change (returned in case of txn failure)`;
        }

        details += `${skipLabel ? "" : "  " + x + ": "}${item}\n`;
    }
    let hasWinfo = false;
    const winfo = {};
    for (const x of witnessAttrs) {
        let item = tx.witnesses[x] || (d.witnesses[x] as any);
        if (Array.isArray(item) && !item.length) continue;
        if ("datums" == x && !Object.entries(item || {}).length) continue;
        if ("signatures" == x) {
            if (!item) continue;
            item = item.map((s) => {
                return `🖊️ ${Address.fromHash(s.pubKeyHash)
                    .toBech32()
                    .substring(0, 24)}…`;
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("redeemers" == x) {
            if (!item) continue;
            //!!! todo: augment with mph when that's available from the Redeemer.
            item = item.map(                
                (x) => {
                    // console.log("redeemer keys", ...[ ...Object.keys(x2) ], x2.dump());
                    const indexInfo = (x.inputIndex == -1) ? `spend txin #‹tbd›` : 
                        'inputIndex' in x ? `spend txin #${1+x.inputIndex}` : `mint policy#${1+x.mphIndex}`;
        
                    return `🏧  ${indexInfo} ${x.data.toString()}`
                }
            );
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("scripts" == x) {
            if (!item) continue;
            item = item.map((s) => {
                try {
                    return `🏦 ${s.mintingPolicyHash.hex.substring(
                        0,
                        12
                    )}… (minting)`;
                } catch (e) {
                    return `📜 ${s.validatorHash.hex.substring(
                        0,
                        12
                    )}… (validator)`;
                }
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }

        if (!item) continue;
        hasWinfo = true;
        winfo[x] = item;
    }
    if (hasWinfo) {
        details += Object.entries(winfo)
            .map(([k, v]) => `  ${k}: ${v}\n`)
            .join("");
    }
    try {
        details = details + `  txId: ${tx.id().hex}`;
    } catch (e) {
        details = details + `  (Tx not yet finalized!)`;
    }
    return details;
}

export function txInputAsString(x: TxInput, prefix = "-> "): string {
    return `${prefix}${x.address.toBech32().substring(0, 18)}… ${valueAsString(
        x.value
    )} = 📖 ${x.txId.hex.substring(0, 12)}…@${x.utxoIdx}`;
}

export function utxosAsString(utxos: TxInput[], joiner = "\n"): string {
    return utxos.map((u) => utxoAsString(u, " 💵")).join(joiner);
}

export function utxoAsString(u: TxInput, prefix = "💵"): string {
    return ` 📖 ${u.txId.hex.substring(0, 12)}…@${u.utxoIdx}: ${txOutputAsString(u.origOutput, prefix)}`; // or 🪙
}

export function datumAsString(d: Datum | null | undefined): string {
    if (!d) return ""; //"‹no datum›";

    // debugger
    const dhss = d.hash.hex.substring(0, 12);
    if (d.isInline()) return `d‹inline:${dhss}…›`;
    return `d‹hash:${dhss}…›`;
}

export function txOutputAsString(x: TxOutput, prefix = "<-"): string {
    const bech32 = (x.address as any).bech32 || x.address.toBech32();

    return `${prefix} ${bech32.substring(0, 18)}… ${datumAsString(
        x.datum
    )} ${valueAsString(x.value)}`;
}

export function errorMapAsString(em: ErrorMap, prefix = "  ") {
    return Object.keys(em).map( k => 
        `${prefix }${k}: ${JSON.stringify(em[k])}`
    ).join("\n")
}
