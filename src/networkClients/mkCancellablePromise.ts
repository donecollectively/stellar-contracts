import type { TimeoutId } from "./BatchSubmitController.js";

if (typeof Promise.withResolvers !== 'function') {
    //@ts-expect-error
    Promise.withResolvers = function() {
      let resolve, reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
  
type hasWrap = {
    wrap: Promise<any>
}
type hasTimeout = {
    wrap?: Promise<any>
    timeout: number,
    onTimeout: () => void,
} 
type noTimeout = Record<string, never>
type wrapOnly = hasWrap & noTimeout
type wrapWithTimeout = hasWrap & hasTimeout
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
type CancellablePromiseOptions = wrapOnly | hasTimeout | wrapWithTimeout


/**
 * @public
 */
export type WrappedPromise<T> = {
    promise: Promise<T>;
    cancel: () => void;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout",
}

/**
 * A promise that has additional direct methods for resolving or rejecting the promise, as well as for cancelling the promise.
 * @public
 */
export type ResolveablePromise<T> = {
    promise: Promise<T>;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout",
    resolve: (value?: T) => void;
    reject: (reason?: Error) => void;
    cancel: () => void;
}

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
export function mkCancellablePromise<T>(
    options?: CancellablePromiseOptions,
) : CancellablePromiseOptions extends hasWrap ? WrappedPromise<T> : ResolveablePromise<T> {
    const { 
        wrap: wrapped ,
        timeout, 
        onTimeout,
    } = options || {};

    // const controller = new AbortController();
    // const signal = controller.signal;

    const { promise, resolve, reject } = Promise.withResolvers();
    const cancel = () => {
        cpObj.status = "cancelled"
        if (timeoutId) clearTimeout(timeoutId);

        reject(new Error("cancelled"))
        // controller.abort();
    }
    const wrappedResolve = (x) => {
        resolve(x)
        cpObj.status = "fulfilled"
    }
    const wrappedReject = (e) => {
        cpObj.status="rejected"
        reject(e)
    }
    const cpObj = { 
        promise: promise as any,
        status: "pending",
        resolve: wrappedResolve, 
        reject: wrappedReject,
        cancel 
    }

    let timeoutId: TimeoutId | undefined = timeout ? setTimeout(() => {
        // controller.abort();
        if (cpObj.status !== "cancelled") {
            cpObj.status = "timeout"
            onTimeout?.();
            reject(new Error("timeout"));
        }
    }, timeout) : undefined;


    promise.then(() => {
        if (timeoutId) clearTimeout(timeoutId);
        cpObj.status = "fulfilled"
        timeoutId = undefined
    }, () =>{
        // prevent unhanded promise rejection.
        // callers should still handle the rejection.
    });

    if (wrapped) {
        wrapped.then(wrappedResolve, wrappedReject);
        return { 
            promise: promise as any, 
            isWrapped: "wraps an input promise; no separate resolve/reject",
            status: "pending",
            cancel,
        } as any // WrappedPromise<T>
    }

    return cpObj as any // ResolveablePromise<T>
}
