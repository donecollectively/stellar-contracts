type hasWrap = {
    wrap: Promise<any>;
};
type hasTimeout = {
    wrap?: Promise<any>;
    timeout: number;
    onTimeout: () => void;
};
type noTimeout = Record<string, never>;
type wrapOnly = hasWrap & noTimeout;
type wrapWithTimeout = hasWrap & hasTimeout;
type MCP_options = wrapOnly | hasTimeout | wrapWithTimeout;
/**
 * @public
 */
export type WrappedPromise<T> = {
    promise: Promise<T>;
    cancel: () => void;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout";
};
/**
 * @public
 */
export type ResolveablePromise<T> = {
    promise: Promise<T>;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout";
    resolve: (value?: T) => void;
    reject: (reason?: Error) => void;
    cancel: () => void;
};
/**
 * @public
 */
export declare function mkCancellablePromise<T>(options?: MCP_options): MCP_options extends hasWrap ? WrappedPromise<T> : ResolveablePromise<T>;
export {};
//# sourceMappingURL=mkCancellablePromise.d.ts.map