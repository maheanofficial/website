export const readServerAccessToken = (): string => '';

export const buildServerAuthHeaders = (headers: Record<string, string> = {}) => {
    return { ...headers };
};
