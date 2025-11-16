import * as React from "react";
/**
 * @deprecated - probably not needed anymore
 * @public
 */
export declare function ShowFailedActivity({ failed, failure: { message, code, data, ...otherFailInfo }, ...results }?: OgmiosEvalFailure): React.JSX.Element | null;
/**
 * @public
 */
export type OgmiosEvalFailure = {
    failed: string;
    failure: {
        message: string;
        code: number;
        data: any;
    };
};
//# sourceMappingURL=ShowFailedActivity.d.ts.map