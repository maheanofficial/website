export type ManagedUserRole = 'admin' | 'moderator';

export interface ManagedUser {
    id: string;
    email: string;
    displayName: string;
    role: ManagedUserRole;
    createdAt: string;
    providers: string[];
}

const readCurrentUserId = () => {
    if (typeof window === 'undefined') return '';
    try {
        const raw = localStorage.getItem('mahean_current_user');
        if (!raw) return '';
        const parsed = JSON.parse(raw) as { id?: string };
        return typeof parsed?.id === 'string' ? parsed.id : '';
    } catch {
        return '';
    }
};

const requestAdminUsersApi = async (method: 'GET' | 'POST' | 'DELETE', body?: Record<string, unknown>) => {
    const actorId = readCurrentUserId();
    const response = await fetch('/api/admin-users', {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-actor-id': actorId
        },
        body: method === 'GET' ? undefined : JSON.stringify({
            ...(body || {}),
            actorId
        })
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
