import type { TimeoutId } from "./SubmitterMultiClient.js";

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
type MCP_options = wrapOnly | hasTimeout | wrapWithTimeout


/**
 * @public
 */
export type WrappedPromise<T> = {
    promise: Promise<T>;
    cancel: () => void;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout",
}
export type ResolveablePromise<T> = {
    promise: Promise<T>;
    status: "pending" | "fulfilled" | "rejected" | "cancelled" | "timeout",
    resolve: (value?: T) => void;
    reject: (reason?: Error) => void;
    cancel: () => void;
}

/**
 * @public
 */
export function mkCancellablePromise<T>(
    options?: MCP_options,
) : MCP_options extends hasWrap ? WrappedPromise<T> : ResolveablePromise<T> {
    const { 
        wrap: wrapped ,
        timeout, 
        onTimeout,
    } = options || {};

    // const controller = new AbortController();
    // const signal = controller.signal;

    const { promise, resolve, reject } = Promise.withResolvers();
    const cancel = () => {
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
        cpObj.status = "timeout"
        onTimeout?.();
        reject(new Error("timeout"));
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
