import { buildServerAuthHeaders } from './serverAuth';

export type ManagedUserRole = 'admin' | 'moderator';

export interface ManagedUser {
    id: string;
    email: string;
    displayName: string;
    role: ManagedUserRole;
    createdAt: string;
    providers: string[];
}

const requestAdminUsersApi = async (method: 'GET' | 'POST' | 'DELETE' | 'PATCH', body?: Record<string, unknown>) => {
    const response = await fetch('/api/admin-users', {
        method,
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: method === 'GET' ? undefined : JSON.stringify(body || {})
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof payload?.error === 'string'
            ? payload.error
            : 'User API request failed.';
        throw new Error(message);
    }
    return payload;
};

export const listManagedUsers = async (): Promise<ManagedUser[]> => {
    const payload = await requestAdminUsersApi('GET');
    const users = Array.isArray(payload?.users) ? (payload.users as ManagedUser[]) : [];
    return users.sort((a: ManagedUser, b: ManagedUser) =>
        String(a.email || '').localeCompare(String(b.email || ''))
    );
};

export const createManagedUser = async (payload: {
    email: string;
    password: string;
    displayName?: string;
    role: ManagedUserRole;
}) => {
    const response = await requestAdminUsersApi('POST', payload);
    return response.user as ManagedUser;
};

export const deleteManagedUser = async (userId: string) => {
    await requestAdminUsersApi('DELETE', { userId });
};

export const updateManagedUserRole = async (userId: string, role: ManagedUserRole) => {
    const response = await requestAdminUsersApi('PATCH', { userId, role });
    return response.user as ManagedUser;
};
