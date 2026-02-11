import { supabase } from '../lib/supabase';
import { restoreSessionFromUrl } from '../lib/supabase';

export type ManagedUserRole = 'admin' | 'moderator';

export interface ManagedUser {
    id: string;
    email: string;
    displayName: string;
    role: ManagedUserRole;
    createdAt: string;
    providers: string[];
}

type RequestMethod = 'GET' | 'POST' | 'DELETE';

type RequestPayload = Record<string, unknown> | undefined;

const toManagedRole = (value?: string): ManagedUserRole => (value === 'admin' ? 'admin' : 'moderator');

const toManagedUser = (value: unknown): ManagedUser | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id : '';
    const email = typeof raw.email === 'string' ? raw.email : '';
    const displayName = typeof raw.displayName === 'string' ? raw.displayName : '';
    const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
    const providers = Array.isArray(raw.providers)
        ? raw.providers.filter((entry): entry is string => typeof entry === 'string')
        : [];

    if (!id) return null;

    return {
        id,
        email,
        displayName: displayName || (email ? email.split('@')[0] : 'User'),
        role: toManagedRole(typeof raw.role === 'string' ? raw.role : undefined),
        createdAt,
        providers
    };
};

const getCurrentAccessToken = async () => {
    if (typeof window !== 'undefined') {
        await restoreSessionFromUrl();
    }
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) {
        throw new Error('Active Supabase session not found. Please log in with email/Google admin account.');
    }
    return data.session.access_token;
};

const parseResponse = async (response: Response): Promise<Record<string, unknown>> => {
    try {
        const parsed = await response.json();
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
        return {};
    } catch {
        return {};
    }
};

const requestAdminUsersApi = async (
    method: RequestMethod,
    payload?: RequestPayload
): Promise<Record<string, unknown>> => {
    const token = await getCurrentAccessToken();
    const response = await fetch('/api/admin-users', {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: payload ? JSON.stringify(payload) : undefined
    });

    const body = await parseResponse(response);
    if (!response.ok) {
        const errorMessage = typeof body.error === 'string'
            ? body.error
            : 'Admin user request failed.';
        throw new Error(errorMessage);
    }

    return body;
};

export const listManagedUsers = async (): Promise<ManagedUser[]> => {
    const body = await requestAdminUsersApi('GET');
    const users = Array.isArray(body.users) ? body.users : [];
    return users
        .map(toManagedUser)
        .filter((entry): entry is ManagedUser => Boolean(entry))
        .sort((a, b) => a.email.localeCompare(b.email));
};

export const createManagedUser = async (payload: {
    email: string;
    password: string;
    displayName?: string;
    role: ManagedUserRole;
}) => {
    const body = await requestAdminUsersApi('POST', payload);
    const user = toManagedUser(body.user);
    if (!user) {
        throw new Error('User was created but response was invalid.');
    }
    return user;
};

export const deleteManagedUser = async (userId: string) => {
    await requestAdminUsersApi('DELETE', { userId });
};
