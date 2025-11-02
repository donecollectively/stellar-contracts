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
/**
 * Options for creating a cancellable promise
 * @remarks
 * Properties in this object include:
 * - `wrap`: wrap the promise in a cancellable promise
 * - `timeout`: timeout the promise after the given number of milliseconds
 * - `onTimeout`: callback to be called when the promise times out
 * If `wrap` is provided, the promise will be wrapped in a cancellable promise.
 * If `timeout` is provided, the promise will be timed out after the given number of milliseconds.
 * The `onTimeout` callback will be called when the promise times out.
 * @public
 */
type CancellablePromiseOptions = wrapOnly | hasTimeout | wrapWithTimeout;
/**
 * @public
 */
export type WrappedPromise<T> = {
    promise: Promise<T>;
    cancel: () => void;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout";
};
/**
 * A promise that has additional direct methods for resolving or rejecting the promise, as well as for cancelling the promise.
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
 * Creates a cancellable promise
 * @remarks
 * The promise will be cancellable by calling the `cancel` method.
 * The promise will be timed out after the given number of milliseconds if `timeout` is provided.
 * The `onTimeout` callback will be called when the promise times out.
 * If `wrap` is provided, the promise will be wrapped in a cancellable promise.
 * The promise will be resolved or rejected by calling the `resolve` or `reject` methods.
 * The promise will be returned as a `WrappedPromise` or `ResolveablePromise` depending on the options provided.
 * @public
 */
export declare function mkCancellablePromise<T>(options?: CancellablePromiseOptions): CancellablePromiseOptions extends hasWrap ? WrappedPromise<T> : ResolveablePromise<T>;
export {};
//# sourceMappingURL=mkCancellablePromise.d.ts.map