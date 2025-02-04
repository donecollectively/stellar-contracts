import type { TimeoutId } from "./SubmitterMultiClient.js";

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


export type CancellablePromise<T> = {
    promise: Promise<T>;
    cancel: () => void;
}
type GenericResolvable<T> = {
    promise: Promise<T>;
    resolve: (value?: T) => void;
    reject: (reason?: Error) => void;
    cancel: () => void;
}

export function mkCancellablePromise<T>(
    options?: MCP_options,
) : CancellablePromise<T> | GenericResolvable<T> {
    const { 
        wrap: wrapped ,
        timeout, 
        onTimeout,
    } = options || {};

    const controller = new AbortController();
    const signal = controller.signal;

    const { promise, resolve, reject } = Promise.withResolvers();
    let timeoutId: TimeoutId | undefined = timeout ? setTimeout(() => {
        controller.abort();
        onTimeout?.();
        reject(new Error("timeout"));
    }) : undefined;
    signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        timeoutId = undefined;
        console.log("cancelling activity by external signal")
        reject(new Error("cancelled"))
    });

    const cancel = () => {
        reject(new Error("cancelled"))
        controller.abort;
    }
    promise.then(() => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = undefined
    });

    if (wrapped) {
        wrapped.then(resolve, reject);
        return { 
            promise: promise as any, 
            cancel,
        }
    }

    return { 
        promise: promise as any,
        resolve, 
        reject, 
        cancel 
    }
}
