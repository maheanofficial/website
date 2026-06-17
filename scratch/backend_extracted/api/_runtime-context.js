import { AsyncLocalStorage } from 'node:async_hooks';

const runtimeStorage = typeof AsyncLocalStorage === 'function'
    ? new AsyncLocalStorage()
    : null;

let fallbackContext = null;

export const runWithRuntimeContext = async (context, callback) => {
    const normalizedContext =
        context && typeof context === 'object' && !Array.isArray(context)
            ? context
            : {};

    if (runtimeStorage) {
        return runtimeStorage.run(normalizedContext, callback);
    }

    const previousContext = fallbackContext;
    fallbackContext = normalizedContext;
    try {
        return await callback();
    } finally {
        fallbackContext = previousContext;
    }
};

export const getRuntimeContext = () => {
    if (runtimeStorage) {
        return runtimeStorage.getStore() || null;
    }
    return fallbackContext;
};

export const getRuntimeEnv = () => getRuntimeContext()?.env || null;
