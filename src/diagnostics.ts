import {
    Address,
    Datum,
    Tx,
    TxOutput,
    TxInput,
    Value,
    bytesToText,
    Assets,
    MintingPolicyHash,
    ByteArray,
    ByteArrayData,
    TxId,
    TxOutputId,
    NetworkParams,
} from "@hyperionbt/helios";
import type { ErrorMap } from "./delegation/RolesAndDelegates.js";
import { StellarTxnContext } from "./StellarTxnContext.js";

/**
 * converts a hex string to a printable alternative, with no assumptions about the underlying data
 * @remarks
 *
 * Unlike Helios' bytesToText, hexToPrintable() simply changes printable characters to characters,
 * and represents non-printable characters in '‹XX›' format.
 * @param ‹pName› - descr
 * @typeParam ‹pName› - descr (for generic types)
 * @public
 **/
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

        // todo decode utf8 parts using bytesToText(...substring...)
        // int         required_len;
        // if (key[0] >> 7 == 0)
        //     required_len = 1;
        // else if (key[0] >> 5 == 0x6)
        //     required_len = 2;
        // else if (key[0] >> 4 == 0xE)
        //     required_len = 3;
        // else if (key[0] >> 5 == 0x1E)
        //     required_len = 4;
        // else
        //     return (0);
        // return (strlen(key) == required_len && chars_are_folow_uni(key + 1));
    }
    return result;
}
/**
 * Converts an array of [ policyId, ‹tokens› ] tuples for on-screen presentation
 * @remarks
 *
 * Presents policy-ids with shortened identifiers, and shows a readable & printable
 * representation of token names even if they're not UTF-8 encoded.
 * @public
 **/
export function assetsAsString(a: Assets) {
    //@ts-expect-error it's marked as private, but thankfully it's still accessible
    const assets = a.assets;
    return assets
        .map(([policyId, tokenEntries]) => {
            const tokenString = tokenEntries
                .map(([nameBytes, count]) => {
                    const nameString = hexToPrintableString(nameBytes.hex);
                    const burn = count < 1 ? "🔥" : "";
                    const burned = count < 1 ? "- BURN 🔥 " : "";
                    return `${burn} ${count}×💴 ${nameString} ${burned}`;
                })
                .join(" + ");
            return `⦑${policyIdAsString(policyId)} ${tokenString}⦒`;
        })
        .join("\n  ");
}

export function policyIdAsString(p: MintingPolicyHash) {
    const pIdHex = p.hex;
    return `🏦 ${pIdHex.slice(0, 8)}…${pIdHex.slice(-4)}`;
}

/**
 * Converts lovelace to approximate ADA, in consumable 3-decimal form
 * @public
 **/
export function lovelaceToAda(l: bigint | number) {
    const asNum = parseInt(l.toString());
    const ada =
        (asNum && `${(Math.round(asNum / 1000) / 1000).toFixed(3)} ADA`) || "";
    return ada;
}

/**
 * Converts a Value to printable form
 * @public
 **/
export function valueAsString(v: Value) {
    const ada = lovelaceToAda(v.lovelace);
    const assets = assetsAsString(v.assets);
    return [ada, assets].filter((x) => !!x).join(" + ");
}

/**
 * Converts a Tx to printable form
 * @public
 **/
export function txAsString(tx: Tx, networkParams?: NetworkParams): string {
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
    if (!networkParams) {
        console.warn(
            new Error(`dumpAny: no networkParams; can't show txn size info!?!`)
        );
    }

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
            item = `\n  ${item.map((x, i) => txInputAsString(x, 
                "➡️  " /* <- unicode blue arrow right */ + `@${1+i} `
            )).join("\n  ")}`;
        }
        if ("refInputs" == x) {
            item = `\n  ${item
                .map((x) => txInputAsString(x, "ℹ️  "))
                .join("\n  ")}`;
        }
        if ("collateral" == x) {
            //!!! todo: group collateral with inputs and reflect it being spent either way,
            //     IFF it is also a tx `input`
            //!!! todo: move collateral to bottom with collateralReturn,
            //     IFF it is not part of the tx `inputs`
            item = item.map((x) => txInputAsString(x, "🔪")).join("\n    ");
        }
        if ("minted" == x) {
            item = ` ❇️  ${assetsAsString(item)}`;
        }
        if ("outputs" == x) {
            item = `\n  ${item
                .map((x, i) =>
                    txOutputAsString(
                        x,
                        "🔹" /* <-- unicode blue bullet */ + `${i} <-`
                    )
                )
                .join("\n  ")}`;
        }
        if ("signers" == x) {
            item = item.map((x) => {
                if (!x.hex) debugger;
                return `🔑#${x.hex.slice(0, 6)}…${x.hex.slice(-4)}`;
            });
        }

        if ("fee" == x) {
            item = parseInt(item);
            item =
                `${(Math.round(item / 1000) / 1000).toFixed(3)} ADA ` +
                tx.profileReport.split("\n")[0];

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
    let indeterminateRedeemerDetails = false;

    let hasWinfo = false;
    const winfo = {};
    for (const x of witnessAttrs) {
        let item = tx.witnesses[x] || (d.witnesses[x] as any);
        if (Array.isArray(item) && !item.length) continue;
        if ("datums" == x && !Object.entries(item || {}).length) continue;
        if ("signatures" == x) {
            if (!item) continue;
            item = item.map((s) => {
                const addr = Address.fromHash(s.pubKeyHash);
                return `🖊️ ${addrAsString(addr)} = 🔑…${s.pubKeyHash.hex.slice(
                    -4
                )}`;
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("redeemers" == x) {
            if (!item) continue;
            //!!! todo: augment with mph when that's available from the Activity.
            item = item.map((x) => {
                // console.log("redeemer keys", ...[ ...Object.keys(x2) ], x2.dump());
                const isIndeterminate = x.inputIndex == -1;
                if (isIndeterminate) indeterminateRedeemerDetails = true;
                const indexInfo = isIndeterminate
                    ? `spend txin #‹tbd›`
                    : "inputIndex" in x
                    ? `spend txin ➡️  @${1 + x.inputIndex}`
                    : `mint policy#${1 + x.mphIndex}`;

                return `🏧  ${indexInfo} ${x.data.toString()}`;
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("scripts" == x) {
            if (!item) continue;
            item = item.map((s) => {
                try {
                    const mph = s.mintingPolicyHash.hex;
                    // debugger
                    return `🏦 ${mph.slice(0, 8)}…${mph.slice(-4)} (minting): ${
                        s.serializeBytes().length
                    } bytes`;
                } catch (e) {
                    const vh = s.validatorHash.hex;
                    const addr = Address.fromHash(s.validatorHash);
                    // debugger
                    return `📜 ${vh.slice(0, 8)}…${vh.slice(
                        -4
                    )} (validator at ${addrAsString(addr)}): ${
                        s.serializeBytes().length
                    } bytes`;
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
        details += `  txId: ${tx.id().hex}`;
        if (networkParams)
            details += `  size: ${
                tx.toTxData(networkParams).toCbor().length
            } bytes`;
    } catch (e) {
        details = details + `(Tx not yet finalized!)`;
        if (networkParams) details += `\n  - NOTE: can't determine txn size\n`;
    }
    return details;
}

/**
 * Converts a TxInput to printable form
 * @remarks
 *
 * Shortens address and output-id for visual simplicity; doesn't include datum info
 * @public
 **/
export function txInputAsString(x: TxInput, prefix = "-> "): string {
    return `${prefix}${addrAsString(x.address)} ${valueAsString(
        x.value
    )} = 📖 ${txOutputIdAsString(x.outputId)}`;
}

/**
 * Converts a list of UTxOs to printable form
 * @remarks
 *
 * ... using {@link txInputAsString}
 * @public
 **/
export function utxosAsString(utxos: TxInput[], joiner = "\n"): string {
    return utxos.map((u) => utxoAsString(u, " 💵")).join(joiner);
}

export function txOutputIdAsString(x: TxOutputId): string {
    return (
        txidAsString(x.txId) +
        "🔹" /* <-- unicode blue bullet */ +
        `#${x.utxoIdx}`
    );
}

export function txidAsString(x: TxId): string {
    const tid = x.hex;
    return `${tid.slice(0, 6)}…${tid.slice(-4)}`;
}

/**
 * converts a utxo to printable form
 * @remarks
 *
 * shows shortened output-id and the value being output, plus its datum
 * @internal
 **/
export function utxoAsString(x: TxInput, prefix = "💵"): string {
    return ` 📖 ${txOutputIdAsString(x.outputId)}: ${txOutputAsString(
        x.origOutput,
        prefix
    )}`; // or 🪙
}

/**
 * converts a Datum to a printable summary
 * @remarks
 *
 * using shortening techniques for the datumHash
 * @public
 **/
export function datumAsString(d: Datum | null | undefined): string {
    if (!d) return ""; //"‹no datum›";

    // debugger
    const dh = d.hash.hex;
    const dhss = `${dh.slice(0, 8)}…${dh.slice(-4)}`;
    if (d.isInline()) return `d‹inline:${dhss} - ${d.toCbor().length} bytes›`;
    return `d‹hash:${dhss}…›`;
}

/**
 * Converts a txOutput to printable form
 * @remarks
 *
 * including all its values, and shortened Address.
 * @public
 **/
export function txOutputAsString(x: TxOutput, prefix = "<-"): string {
    return `${prefix} ${addrAsString(x.address)} ${valueAsString(
        x.value
    )} ${datumAsString(x.datum)}`;
}

/**
 * Renders an address in shortened bech32 form, with prefix and part of the bech32 suffix
 * @remarks
 * @param address - address
 * @public
 **/
export function addrAsString(address: Address): string {
    const bech32 = (address as any).bech32 || address.toBech32();

    return `${bech32.slice(0, 14)}…${bech32.slice(-4)}`;
}

/**
 * Converts an Errors object to a string for onscreen presentation
 * @public
 **/
export function errorMapAsString(em: ErrorMap, prefix = "  ") {
    return Object.keys(em)
        .map((k) => `in field ${prefix}${k}: ${JSON.stringify(em[k])}`)
        .join("\n");
}

/**
 * Converts a list of ByteArrays to printable form
 * @remarks
 *
 * ... using {@link hexToPrintableString}
 * @public
 **/
export function byteArrayListAsString(
    items: ByteArray[] | ByteArrayData[],
    joiner = "\n  "
): string {
    return (
        "[\n  " +
        items.map((ba) => byteArrayAsString(ba)).join(joiner) +
        "\n]\n"
    );
}

/**
 * Renders a byteArray in printable form, assuming it contains (mostly) text
 * @remarks
 *
 * Because it uses {@link hexToPrintableString()}, it will render any non-printable
 * characters using ‹hex› notation.
 * @param ba - the byte array
 * @public
 **/
export function byteArrayAsString(ba: ByteArray | ByteArrayData): string {
    return hexToPrintableString(ba.hex);
}

/**
 * Converts any (supported) input arg to string
 * @remarks
 *
 * more types to be supported TODO
 * @public
 **/
export function dumpAny(
    x:
        | Tx
        | StellarTxnContext
        | Address
        | Value
        | TxOutput
        | TxInput
        | TxInput[]
        | TxId
        | ByteArray
        | ByteArray[]
        | ByteArrayData
        | ByteArrayData[],
    networkParams?: NetworkParams
) {
    if (Array.isArray(x)) {
        if (x[0] instanceof TxInput) {
            //@ts-expect-error sorry, typescript : /
            return "utxos: \n" + utxosAsString(x);
        }
        if (x[0] instanceof ByteArray || x[0] instanceof ByteArrayData) {
            //@ts-expect-error sorry, typescript : /
            return "byte array:\n" + byteArrayListAsString(x);
        }
    }

    if (x instanceof Tx) {
        return txAsString(x, networkParams);
    }

    if (x instanceof TxOutput) {
        return txOutputAsString(x);
    }

    if (x instanceof TxOutputId) {
        return txOutputIdAsString(x);
    }

    if (x instanceof TxId) {
        return txidAsString(x);
    }

    if (x instanceof TxInput) {
        return utxoAsString(x);
    }
    if (x instanceof Value) {
        return valueAsString(x);
    }
    if (x instanceof Address) {
        return addrAsString(x);
    }
    if (x instanceof MintingPolicyHash) {
        return policyIdAsString(x);
    }
    if (x instanceof StellarTxnContext) {
        return txAsString(x.tx);
    }
    if (x instanceof ByteArray || x[0] instanceof ByteArrayData) {
        //@ts-expect-error sorry, typescript : /
        return byteArrayAsString(x);
    }

    debugger;
    return "dumpAny(): unsupported type or library mismatch";
}

if ("undefined" == typeof window) {
    globalThis.peek = dumpAny;
} else {
    //@ts-expect-error
    window.peek = dumpAny;
}
