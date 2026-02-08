import {
    loginUser,
    registerUser,
    setCurrentUserSession,
    getCurrentUser as getLocalCurrentUser,
    logoutUser,
    upsertUser,
    requestPasswordReset,
    consumePasswordReset,
    updateUserPassword,
    getPasswordResetUserId,
    type User
} from './userManager';
import { supabase } from '../lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

type AuthSession = { user: User | null } | null;

type AuthChangeDetail = {
    event: string;
    session: AuthSession;
};

const AUTH_PROVIDER_KEY = 'mahean_auth_provider';

const setAuthProvider = (provider: 'local' | 'supabase') => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AUTH_PROVIDER_KEY, provider);
};

const getAuthProvider = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(AUTH_PROVIDER_KEY);
};

const clearAuthProvider = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTH_PROVIDER_KEY);
};

const authEventTarget = typeof window !== 'undefined' ? new EventTarget() : null;

const emitAuthChange = (event: string, user: User | null) => {
    if (!authEventTarget) return;
    const detail: AuthChangeDetail = {
        event,
        session: { user }
    };
    authEventTarget.dispatchEvent(new CustomEvent('auth-change', { detail }));
};

const mapSupabaseUserToLocal = (user: SupabaseUser): User => {
    const metadata = user.user_metadata || {};
    const displayName = metadata.full_name
        || metadata.name
        || user.email?.split('@')[0]
        || 'User';

    return {
        id: user.id,
        username: user.email || user.id,
        email: user.email || undefined,
        role: 'writer',
        createdAt: user.created_at || new Date().toISOString(),
        displayName,
        photoURL: metadata.avatar_url || metadata.picture
    };
};

const syncSupabaseSession = (event: string, session: Session | null) => {
    if (!session?.user) {
        if (getAuthProvider() === 'supabase') {
            logoutUser();
            clearAuthProvider();
            emitAuthChange(event, null);
        }
        return getLocalCurrentUser();
    }

    const localUser = upsertUser(mapSupabaseUserToLocal(session.user));
    setCurrentUserSession(localUser);
    setAuthProvider('supabase');
    emitAuthChange(event, localUser);
    return localUser;
};

let supabaseListenerReady = false;
const ensureSupabaseAuthListener = () => {
    if (supabaseListenerReady || typeof window === 'undefined') return;
    supabaseListenerReady = true;

    supabase.auth.onAuthStateChange((event, session) => {
        syncSupabaseSession(event, session);
    });
};

/**
 * Google OAuth via Supabase (requires provider + redirect configured).
 */
export const signInWithGoogle = async () => {
    if (typeof window === 'undefined') {
        throw new Error('Google sign-in is only available in the browser.');
    }

    ensureSupabaseAuthListener();
    const redirectTo = `${window.location.origin}/author/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
    });

    if (error) {
        throw error;
    }
};

/**
 * Signs the current user out.
 */
export const signOut = async () => {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.warn('Supabase sign out failed:', error);
    }
    logoutUser();
    clearAuthProvider();
    emitAuthChange('SIGNED_OUT', null);
};

/**
 * Gets the current session and user.
 */
export const getCurrentUser = async () => {
    const localUser = getLocalCurrentUser();
    if (localUser) {
        return localUser;
    }

    if (typeof window === 'undefined') {
        return null;
    }

    try {
        ensureSupabaseAuthListener();
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            throw error;
        }
        if (data.session?.user) {
            return syncSupabaseSession('SIGNED_IN', data.session);
        }
    } catch (error) {
        console.warn('Supabase session lookup failed:', error);
    }

    return null;
};

/**
 * Sets up a listener for auth state changes.
 */
export const onAuthStateChange = (callback: (event: string, session: AuthSession) => void) => {
    if (!authEventTarget) {
        return { unsubscribe: () => undefined };
    }

    ensureSupabaseAuthListener();

    const handler = (event: Event) => {
        const detail = (event as CustomEvent<AuthChangeDetail>).detail;
        callback(detail.event, detail.session);
    };

    authEventTarget.addEventListener('auth-change', handler);

    return {
        unsubscribe: () => authEventTarget.removeEventListener('auth-change', handler)
    };
};

/**
 * Stores a local password reset intent for the provided email.
 */
export const resetPasswordForEmail = async (email: string) => {
    const result = requestPasswordReset(email);
    if (!result.success) {
        throw new Error(result.message);
    }
    return { success: true };
};

/**
 * Signs in with email and password (local storage).
 */
export const signInWithEmailOnly = async (email: string, pass: string) => {
    const result = loginUser(email, pass);
    if (!result.success || !result.user) {
        throw new Error(result.message);
    }
    setCurrentUserSession(result.user);
    setAuthProvider('local');
    emitAuthChange('SIGNED_IN', result.user);
    return { success: true };
};

/**
 * Signs up a new user with email and password (local storage).
 */
export const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const result = registerUser(email, password, fullName);
    if (!result.success || !result.user) {
        throw new Error(result.message);
    }
    setCurrentUserSession(result.user);
    setAuthProvider('local');
    emitAuthChange('SIGNED_IN', result.user);
    return { user: result.user };
};

/**
 * Updates the current user password in local storage.
 */
export const updateCurrentUserPassword = async (currentPassword: string | null, newPassword: string) => {
    const user = getLocalCurrentUser();
    if (!user) {
        throw new Error('Session expired. Please log in again.');
    }

    const result = updateUserPassword(user.id, newPassword, currentPassword || undefined);
    if (!result.success) {
        throw new Error(result.message);
    }

    return { success: true };
};

/**
 * Applies a pending password reset in local storage.
 */
export const applyPasswordReset = async (newPassword: string) => {
    const result = consumePasswordReset(newPassword);
    if (!result.success) {
        throw new Error(result.message);
    }
    return { success: true };
};

export const hasPendingPasswordReset = () => Boolean(getPasswordResetUserId());
