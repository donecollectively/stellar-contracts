import * as React from "react";

/**
 * @deprecated - probably not needed anymore
 * @public
 */
export function ShowFailedActivity(
    {
        failed, failure: { message, code, data, ...otherFailInfo } = {} as any, ...results
    }: OgmiosEvalFailure = {} as any) {

    const [isMounted, setIsMounted] = React.useState(false);
    React.useEffect(() => {
        setIsMounted(true);
    }, []);
    if (!isMounted) {
        return null;
    }
    if (Object.keys(otherFailInfo).length === 0) {
        otherFailInfo = undefined as any;
    }
    if (!failed || !message) {
        return (
            <code>
                <pre>
                    {failed && (
                        <>
                            failed: {failed}
                            <br />
                        </>
                    )}
                    {message && (
                        <>
                            message: {message}
                            <br />
                        </>
                    )}
                    {JSON.stringify({ otherFailInfo, ...results }, null, 2)}
                    <br />
                </pre>
            </code>
        );
    }
    const moreDetail = Array.isArray(data) && !!data[0].validator ? (
        <div>
            {data.map(({ validator, error, ...others }) => {
                const { index, purpose } = validator;
                const {
                    code: errorCode, message: errorMessage, data: { validationError, traces = [], ...otherData } = {},
                } = error;

                return (
                    <div key={index}>
                        <h4>
                            Validator {index} ({purpose}): {errorMessage}
                            <pre>{JSON.stringify(others, null, 2)}</pre>
                        </h4>
                        <hr />
                        <div className="ml-8 bl-2 b-slate bl-2">
                            <code>
                                <pre>{traces.join("\n")}</pre>
                            </code>
                            <hr />
                            <pre>otherData: {JSON.stringify(otherData, null, 2)}</pre>
                        </div>
                    </div>
                );
            })}
        </div>
    ) : (
        <code>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </code>
    );

    return (
        <div>
            Activity failed: {failed} <br />
            Message: {message} <br />
            {moreDetail}
        </div>
    );
}

/**
 * @public
 */
export type OgmiosEvalFailure = {
    failed: string
    failure: {
        message: string
        code: number
        data: any
    }
}
// Example data:
const exampleData = {
    failed: "evaluate",
    failure: {
        message: "Some scripts of the transactions terminated with error(s).",
        code: 3010,
        data: [
            {
                validator: {
                    index: 0,
                    purpose: "mint",
                },
                error: {
                    code: 3012,
                    message: "Some of the scripts failed to evaluate to a positive outcome. The field 'data.validationError' informs about the nature of the error, and 'data.traces' lists all the execution traces collected during the script execution.",
                    data: {
                        validationError: "An error has occurred:\nThe machine terminated because of an error, either from a built-in function or from an explicit use of 'error'.",
                        traces: [
                            "cm1",
                            " 🚥❓ Capo minter",
                            " -- minter policy id: 160b62cc1aa98de8c818aa553e76dd1596f5d2800f9d9f958b8ef20e",
                            "cm2",
                            " -- creating Capo charter",
                            "❗ must mint the charter token",
                            "❗ verifies that the provided seed utxo is being spent, providing uniqueness assurances for the minting-script's seed parameters",
                            " -- has seed -> ok\n",
                            "cm3",
                            "validateUutMinting",
                            "❗ must mint uuts for mintDgt, spendDgt, and govAuth using the same seed",
                            " ℹ️ 🐞 expected: 1x charter",
                            " ℹ️ 🐞 expected: 1x capoGov-0458e5880117",
                            " ℹ️ 🐞 expected: 1x mintDgt-0458e5880117",
                            " ℹ️ 🐞 expected: 1x spendDgt-0458e5880117",
                            " ℹ️ 🐞 actual: 1x capoGov-0458e5880117",
                            " ℹ️ 🐞 actual: 1x charter",
                            " ℹ️ 🐞 actual: 1x mintDgt-0458e5880117",
                            " ℹ️ 🐞 actual: 1x spendDgt-0458e5880117",
                            "other policy values minted: \n",
                            "lovelace: 0\n",
                            "❗ Ensures the mint for this policy-id is exactly the expected value",
                            "mismatch in UUT mint",
                        ],
                    },
                },
            },
        ],
        id: {},
    },
}

