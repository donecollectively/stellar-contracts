import type { ErrorMap } from "./delegation/RolesAndDelegates.js";
import { StellarTxnContext } from "./StellarTxnContext.js";
import {
    makeByteArrayData,
    type ByteArrayData,
    type UplcProgramV2,
} from "@helios-lang/uplc";
import {
    uplcDataSerializer,
    abbreviatedDetail,
    abbreviatedDetailBytes,
} from "./delegation/jsonSerializers.js";
import {
    type Value,
    type Address,
    type Tx,
    type TxId,
    type TxInput,
    type TxOutput,
    type TxOutputId,
    type NetworkParams,
    type Assets,
    type MintingPolicyHash,
    type TxRedeemer,
    type TxOutputDatum,
    makeAddress,
    decodeAddress,
} from "@helios-lang/ledger";
import { bytesToHex } from "@helios-lang/codec-utils";
import { textToBytes, type InlineDatum } from "./HeliosPromotedTypes.js";

/**
 * converts a hex string to a printable alternative, with no assumptions about the underlying data
 * @remarks
 *
 * Unlike Helios' bytesToText, hexToPrintable() simply changes printable characters to characters,
 * and represents non-printable characters in '‹XX›' format.
 * @param hexStr - hex input
 * @public
 **/
export function hexToPrintableString(hexStr: string) {
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
 * Displays a token name in a human-readable form
 * @remarks
 * Recognizes CIP-68 token names and displays them in a special format.
 * @param nameBytesOrString - the token name, as a string or byte array
 * @public
 */
export function displayTokenName(nameBytesOrString: string | number[]) {
    // check if it is a cip-68 token name by inspecting the first 4 bytes.  If they don't match the cip-68 pattern, display using stringToPrintableString.
    // if it has a cip-68 tag in the first 4 bytes, show the cip-68 tag as `‹cip68/{tag}›` and append the rest of the token name as a string.
    // inspect the first 4 bytes by:
    //  - converting them to hex
    //  - checking if the first and last nibbles are 0's (if not, then it is not a cip-68 token name)
    //  - removing the first and last nibbles, shifting the hex string to the left by 1 nibble to get a 2-byte tag and 1 byte of checksum
    //  - separating the cip-68 tag from the checksum
    //  - parsing the cip-68 tag as a number (parseInt(numHex, 16))

    let nameString = "";
    let cip68Tag = "";
    let cip68TagHex = "";
    let checksum = "";
    let nameHex = "";
    let nameBytesHex = "";
    let nameBytesString = "";
    let isCip68 = false;
    if (typeof nameBytesOrString === "string") {
        // convert the bytes of the string to hex
        nameBytesHex = Buffer.from(textToBytes(nameBytesOrString)).toString(
            "hex"
        );
    } else {
        nameBytesHex = Buffer.from(nameBytesOrString).toString("hex");
    }
    // check if the first 4 bytes are a cip-68 token name
    if (nameBytesHex.length >= 8) {
        // check if the first and last nibbles are 0's
        if (
            nameBytesHex.substring(0, 1) === "0" &&
            nameBytesHex.substring(7, 8) === "0"
        ) {
            // remove the first and last nibbles
            nameHex = nameBytesHex.substring(2, 6);
            cip68TagHex = nameHex.substring(0, 4);
            checksum = nameHex.substring(4, 6);
            // separate the cip-68 tag from the checksum
            cip68Tag = parseInt(cip68TagHex, 16).toString();
            // TODO: check the crc-8 checksum of the tag

            isCip68 = true;
        }
    }
    if (isCip68) {
        nameString = `‹cip68/${cip68Tag}›${nameBytesOrString.slice(4)}`;
    } else {
        nameString = stringToPrintableString(nameBytesOrString);
    }
    return nameString;
}

/**
 * Presents a string in printable form, even if it contains non-printable characters
 *
 * @remarks
 * Non-printable characters are shown in '‹XX›' format.
 * @public
 */
export function stringToPrintableString(str: string | number[]) {
    if ("string" != typeof str) {
        // use a TextEncoder to identify if it is a utf8 string
        try {
            return new TextDecoder("utf-8", { fatal: true }).decode(
                new Uint8Array(str as number[])
            );
        } catch (e) {
            // if it is not a utf8 string, fall back to printing what's printable and showing hex for other bytes
            str = Buffer.from(str as number[]).toString("hex");
        }
    }
    let result = "";
    for (let i = 0; i < str.length; i++) {
        let charCode = str.charCodeAt(i);

        // ASCII printable characters are in the range 32 (space) to 126 (~)
        if (charCode >= 32 && charCode <= 126) {
            result += str[i];
        } else {
            result += `‹${charCode.toString(16)}›`;
        }
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
export function assetsAsString(
    a: Assets,
    joiner = "\n    ",
    showNegativeAsBurn?: "withBURN",
    mintRedeemers?: Record<number, string>
) {
    const assets = a.assets;
    return (
        assets?.map(([policyId, tokenEntries], index) => {
            let redeemerInfo = mintRedeemers?.[index] || "";
            if (redeemerInfo) {
                redeemerInfo = `\n        r = ${redeemerInfo} `;
            }
            const tokenString = tokenEntries
                .map(([nameBytes, count]: [number[], bigint]) => {
                    // const nameString =  hexToPrintableString(nameBytes.hex);
                    const nameString = displayTokenName(nameBytes);

                    const negWarning =
                        count < 1n
                            ? showNegativeAsBurn
                                ? "🔥 "
                                : " ⚠️ NEGATIVE⚠️"
                            : "";
                    const burned =
                        count < 1
                            ? showNegativeAsBurn
                                ? "- BURN 🔥 "
                                : ""
                            : "";
                    return `${negWarning} ${count}×💴 ${nameString} ${burned}`;
                })
                .join("+");
            return `⦑${policyIdAsString(
                policyId
            )} ${tokenString} ${redeemerInfo}⦒`;
        }) || []
    ).join(joiner);
}

/**
 * Converts a MintingPolicyHash to a printable form
 * @public
 **/
export function policyIdAsString(p: MintingPolicyHash) {
    const pIdHex = p.toHex();
    const abbrev = abbreviatedDetail(pIdHex);
    return `🏦 ${abbrev}`;
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
    const outputOrder = [
        ["body", "inputs"],
        ["body", "minted"],
        ["body", "outputs"],
        ["body", "refInputs"],
        ["witnesses", "redeemers"],
        ["body", "signers"],
        ["witnesses", "v2refScripts"],
        ["witnesses", "v2scripts"],
        ["witnesses", "nativeScripts"],
        ["body", "collateral"],
        ["body", "collateralReturn"],
        ["body", "scriptDataHash"],
        ["body", "metadataHash"],
        ["witnesses", "signatures"],
        ["witnesses", "datums"],
        ["body", "lastValidSlot"],
        ["body", "firstValidSlot"],
        ["body", "fee"],
    ];

    let details = "";
    if (!networkParams) {
        debugger;
        console.warn(
            new Error(`dumpAny: no networkParams; can't show txn size info!?!`)
        );
    }

    // const d = tx.dump();
    const seenRedeemers = new Set();

    const allRedeemers = tx.witnesses.redeemers as any;
    let hasIndeterminate = false;
    const inputRedeemers: Record<
        string | number,
        { r?: TxRedeemer; display: string }
    > = Object.fromEntries(
        allRedeemers
            .map((x: TxRedeemer, index: number) => {
                // debugger;
                if (x.kind != "TxSpendingRedeemer") return undefined;
                // if (!("inputIndex" in x)) return undefined;
                const { inputIndex } = x;
                const isIndeterminate = inputIndex == -1;
                if (isIndeterminate) hasIndeterminate = true;
                const inpIndex = isIndeterminate ? `‹unk${index}›` : inputIndex;
                if (!x.data) debugger;
                const showData = x.data.rawData
                    ? uplcDataSerializer("", x.data.rawData)
                    : x.data?.toString() || "‹no data›";
                return [inpIndex, { r: x, display: showData }];
            })
            .filter((x) => !!x)
    );
    if (hasIndeterminate)
        inputRedeemers["hasIndeterminate"] = {
            r: undefined,
            display: "‹unk›",
        };

    const mintRedeemers = Object.fromEntries(
        allRedeemers
            .map((x) => {
                if ("TxMintingRedeemer" != x.kind) return undefined;
                if ("number" != typeof x.policyIndex) {
                    debugger;
                    throw new Error(`non-mint redeemer here not yet supported`);
                }
                if (!x.data) debugger;

                const showData =
                    (x.data.rawData
                        ? uplcDataSerializer("", x.data.rawData)
                        : x.data?.toString() || "‹no data›") +
                    "\n" +
                    bytesToHex(x.data.toCbor());

                return [x.policyIndex, showData];
            })
            .filter((x) => !!x)
    );

    //!!! todo: improve interface of tx so useful things have a non-private api
    //!!! todo: get back to type-safety in this diagnostic suite
    for (const [where, x] of outputOrder) {
        let item = tx[where][x];
        let skipLabel = false;
        if (Array.isArray(item) && !item.length) continue;

        if (!item) continue;
        if ("inputs" == x) {
            item = `\n  ${item
                .map((x: TxInput, i) => {
                    const { r, display } =
                        inputRedeemers[i] ||
                        inputRedeemers["hasIndeterminate"] ||
                        {};
                    if (!display && x.datum?.data) debugger;
                    tx;
                    if (r) seenRedeemers.add(r);
                    return txInputAsString(
                        x,
                        /* unicode blue arrow right -> */ "➡️  " + `@${1 + i} `,
                        i,
                        display || "‹failed to find redeemer info›"
                    );
                })
                .join("\n  ")}`;
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
            if (!item.assets.length) {
                continue;
            }
            item = `\n   ❇️  ${assetsAsString(
                item,
                "\n   ❇️  ",
                "withBURN",
                mintRedeemers
            )}`;
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
                const hex = x.toHex();
                return `🔑#${hex.slice(0, 6)}…${hex.slice(-4)}`;
            });
        }

        if ("fee" == x) {
            item = parseInt(item);
            item = `${(Math.round(item / 1000) / 1000).toFixed(3)} ADA ` + ""; // tx.profileReport.split("\n")[0];
            // todo: find profile info and restore it here

            // console.log("fee", item)
        }

        if ("collateralReturn" == x) {
            skipLabel = true;
            item = `  ${txOutputAsString(
                item,
                `0  <- ❓`
            )} conditional: collateral change (returned in case of txn failure)`;
        }
        if ("scriptDataHash" == x) {
            item = bytesToHex(item);
        }

        if ("datums" == x && !Object.entries(item || {}).length) continue;
        if ("signatures" == x) {
            if (!item) continue;
            item = item.map((s) => {
                const addr = makeAddress(true, s.pubKeyHash);
                const hashHex = s.pubKeyHash.toHex();
                return `🖊️ ${addrAsString(addr)} = 🔑…${hashHex.slice(-4)}`;
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("redeemers" == x) {
            if (!item) continue;

            //!!! todo: augment with mph when that's available from the Activity.
            item = item.map((x) => {
                // console.log("redeemer keys", ...[ ...Object.keys(x2) ], x2.dump());
                // const isIndeterminate = x.inputIndex == -1;
                // if (isIndeterminate) indeterminateRedeemerDetails = true;
                // debugger
                // const indexInfo = isIndeterminate
                //     ? `spend txin #‹tbd›`
                // if (x.kind == "TxSpendingRedeemer") {
                //     debugger
                // }
                const indexInfo =
                    x.kind == "TxMintingRedeemer"
                        ? `minting policy ${x.policyIndex}`
                        : `spend txin ➡️  @${1 + x.inputIndex}`;

                const showData = seenRedeemers.has(x)
                    ? "(see above)"
                    : x.data.fromData
                    ? uplcDataSerializer("", x.data.fromData)
                    : x.data.toString();
                return `🏧  ${indexInfo} ${showData}`;
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("v2Scripts" == x) {
            if (!item) continue;
            item = item.map((s) => {
                try {
                    const mph = s.mintingPolicyHash.toHex();
                    // debugger
                    return `🏦 ${mph.slice(0, 8)}…${mph.slice(-4)} (minting): ${
                        s.serializeBytes().length
                    } bytes`;
                } catch (e) {
                    const vh = s.validatorHash;

                    const vhh = vh.toHex();
                    const addr = makeAddress(true, vh);
                    // debugger
                    return `📜 ${vhh.slice(0, 8)}…${vhh.slice(
                        -4
                    )} (validator at ${addrAsString(addr)}): ${
                        s.serializeBytes().length
                    } bytes`;
                }
            });
            if (item.length > 1) item.unshift("");
            item = item.join("\n    ");
        }
        if ("v2RefScripts" == x) {
            item = `${item.length} - see refInputs`;
            // todo: @helios give us refScripts outside of dump(), which only shows us hex.
        }

        if (!item) continue;
        details += `${skipLabel ? "" : "  " + x + ": "}${item}\n`;
    }
    try {
        details += `  txId: ${tx.id().toHex()}`;
        if (networkParams) details += `  \n\nsize: ${tx.toCbor().length} bytes`;
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
export function txInputAsString(
    x: TxInput,
    prefix = "-> ",
    index?: number,
    redeemer?: string
): string {
    const { output: oo } = x;
    const redeemerInfo = redeemer ? `\n    r = ${redeemer}` : "";
    const datumInfo =
        oo.datum?.kind == "InlineTxOutputDatum" ? datumSummary(oo.datum) : "";

    return `${prefix}${addrAsString(x.address)}${showRefScript(
        oo.refScript as any
    )} ${valueAsString(x.value)} ${datumInfo} = 📖 ${txOutputIdAsString(
        x.id
    )}${redeemerInfo}`;
}

/**
 * Converts a list of UTxOs to printable form
 * @remarks
 *
 * ... using {@link utxoAsString}
 * @public
 **/
export function utxosAsString(utxos: TxInput[], joiner = "\n"): string {
    return utxos.map((u) => utxoAsString(u, " 💵")).join(joiner);
}
/**
 * Converts a TxOutputId to printable form
 * @public
 */
export function txOutputIdAsString(x: TxOutputId, length=8): string {
    return (
        txidAsString(x.txId, length) +
        "🔹" /* <-- unicode blue bullet */ +
        `#${x.index}`
    );
}

/**
 * Converts a TxId to printable form
 * @remarks
 *
 * ... showing only the first 6 and last 4 characters of the hex
 * @public
 **/
export function txidAsString(x: TxId, length=8): string {
    const tid = x.toHex();
    return `${tid.slice(0, length)}…${tid.slice(-4)}`;
}

/**
 * converts a utxo to printable form
 * @remarks
 *
 * shows shortened output-id and the value being output, plus its datum
 * @internal
 **/
export function utxoAsString(x: TxInput, prefix = "💵"): string {
    return ` 📖 ${txOutputIdAsString(x.id)}: ${txOutputAsString(
        x.output,
        prefix
    )}`;
}

/**
 * converts a Datum to a printable summary
 * @remarks
 *
 * using shortening techniques for the datumHash
 * @public
 **/
export function datumSummary(d: TxOutputDatum | null | undefined): string {
    if (!d) return ""; //"‹no datum›";

    // debugger
    const dh = d.hash.toHex();
    const dhss = `${dh.slice(0, 8)}…${dh.slice(-4)}`;
    if (d.kind == "InlineTxOutputDatum") {
        const attachedData = d.data.rawData;
        if (attachedData) {
            return `\n    d‹inline:${dhss} - ${
                uplcDataSerializer("", attachedData) //.slice(1,-1)
            }=${d.toCbor().length} bytes›`;
        } else {
            return `d‹inline:${dhss} - ${d.toCbor().length} bytes›`;
        }
    }
    return `d‹hash:${dhss}…›`;
}
// /**
//  * @internal
//  */
// export function datumExpanded(d: Datum | null | undefined): string {
//     if (!d) return "";
//     if (!d.isInline()) return "";
//     const data = bytesToHex(d.data?.toCbor());
//     return `\n    d = ${data}`;
// }

/**
 * Displays a short summary of any provided reference script
 * @remarks
 *
 * detailed remarks
 * @param ‹pName› - descr
 * @typeParam ‹pName› - descr (for generic types)
 * @public
 **/
export function showRefScript(rs?: UplcProgramV2 | null) {
    if (!rs) return "";
    const hash = rs.hash();
    const hh = bytesToHex(hash);
    const size = rs.toCbor().length;
    const rshInfo = `${hh.slice(0, 8)}…${hh.slice(-4)}`;
    return ` ‹📀 refScript📜 ${rshInfo}: ${size} bytes› +`;
}

/**
 * Converts a txOutput to printable form
 * @remarks
 *
 * including all its values, and shortened Address.
 * @public
 **/
export function txOutputAsString(x: TxOutput, prefix = "<-"): string {
    return `${prefix} ${addrAsString(x.address)}${showRefScript(
        x.refScript as any
    )} ${valueAsString(x.value)} ${datumSummary(x.datum)}`;
}

/**
 * Renders an address in shortened bech32 form, with prefix and part of the bech32 suffix
 * @remarks
 * @param address - address
 * @public
 **/
export function addrAsString(address: Address): string {
    const bech32 = address.toString();
    // const uplc = address.toUplcData?.();
    // const hex = bytesToHex(uplc.toCbor());
    return `${bech32.slice(0, 14)}…${bech32.slice(-4)}`;
    // + ` = `+abbreviatedDetailBytes("‹cbor:", uplc.toCbor(), 99)+"›"
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
    items: ByteArrayData[],
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
 * Because it uses {@link hexToPrintableString | hexToPrintableString()}, it will render any non-printable
 * characters using ‹hex› notation.
 * @param ba - the byte array
 * @public
 **/
export function byteArrayAsString(ba: ByteArrayData): string {
    return hexToPrintableString(ba.toHex());
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
        | undefined
        | Tx
        | StellarTxnContext
        | Address
        | MintingPolicyHash
        | Value
        | TxOutputId
        | TxOutput
        | TxOutput[]
        | TxInput
        | TxInput[]
        | TxId
        | number[]
        | ByteArrayData
        | ByteArrayData[],
    networkParams?: NetworkParams,
    forJson = false
) {
    if ("undefined" == typeof x) return "‹undefined›";
    if (Array.isArray(x)) {
        if (!x.length) return "‹empty array›";
        
        const firstItem = x[0];
        if ("number" == typeof firstItem) {
            return (
                "num array: " +
                byteArrayListAsString([makeByteArrayData(x as number[])])
            );
        }
        if (firstItem.kind == "TxOutput") {
            return (
                "tx outputs: \n" +
                (x as TxOutput[]).map((txo: TxOutput) => txOutputAsString(txo))
            );
        }

        if (firstItem.kind == "TxInput") {
            return "utxos: \n" + utxosAsString(x as TxInput[]);
        }

        //@ts-expect-error on this type probe
        if (firstItem.kind == "ByteArrayData") {
            return (
                "byte array:\n" + byteArrayListAsString(x as ByteArrayData[])
            );
        }
        console.log("firstItem", firstItem);
        throw new Error(
            `dumpAny(): unsupported array type: ${typeof firstItem}`
        );
    }

    if ("bigint" == typeof x) {
        return (x as bigint).toString();
    }
    if (x instanceof StellarTxnContext) {
        debugger;
        throw new Error(`use await build() and dump the result instead.`);
    }

    const xx = x;

    if (x.kind == "TxOutput") {
        return txOutputAsString(x as TxOutput);
    }
    if (xx.kind == "Tx") {
        return txAsString(xx, networkParams);
    }

    if (xx.kind == "TxOutputId") {
        return txOutputIdAsString(xx);
    }

    if (xx.kind == "TxId") {
        return txidAsString(xx);
    }

    if (xx.kind == "TxInput") {
        return utxoAsString(xx);
    }
    if (xx.kind == "Value") {
        return valueAsString(xx);
    }
    if (xx.kind == "Address") {
        return addrAsString(xx);
    }
    if (xx.kind == "MintingPolicyHash") {
        return policyIdAsString(xx);
    }
    if (forJson) return xx;
    debugger;
    return "dumpAny(): unsupported type or library mismatch";
}

/**
 * @public
 */
export const betterJsonSerializer = (key, value) => {
    return dumpAny(value, undefined, true);
};

if ("undefined" == typeof window) {
    globalThis.peek = dumpAny;
} else {
    //@ts-expect-error
    window.peek = dumpAny;
}
