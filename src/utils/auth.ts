import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, restoreSessionFromUrl } from '../lib/supabase';
import {
    loginUser,
    registerUser,
    setCurrentUserSession,
    getCurrentUser as getLocalCurrentUser,
    logoutUser,
    requestPasswordReset,
    consumePasswordReset,
    updateUserPassword,
    getPasswordResetUserId,
    upsertUser,
    getUserById,
    getUserByIdentifier,
    type User as LocalUser
} from './userManager';

type AuthSession = { user: LocalUser | null } | null;

type AuthChangeDetail = {
    event: string;
    session: AuthSession;
};

type EmailAuthResult = {
    user?: LocalUser | null;
    needsEmailConfirmation?: boolean;
};

const authEventTarget = typeof window !== 'undefined' ? new EventTarget() : null;

const emitAuthChange = (event: string, user: LocalUser | null) => {
    if (!authEventTarget) return;
    const detail: AuthChangeDetail = {
        event,
        session: { user }
    };
    authEventTarget.dispatchEvent(new CustomEvent('auth-change', { detail }));
};

const pickMetadataString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const resolveMetadataRole = (metadata: Record<string, unknown>) => {
    const role = pickMetadataString(metadata.role);
    return role === 'admin' || role === 'moderator' ? role : undefined;
};

const mapSupabaseUser = (user: SupabaseUser): LocalUser => {
    const metadata = user.user_metadata ?? {};
    const email = user.email?.toLowerCase();
    const displayName = pickMetadataString(metadata.full_name)
        || pickMetadataString(metadata.name)
        || email?.split('@')[0]
        || 'User';
    const photoURL = pickMetadataString(metadata.avatar_url) || pickMetadataString(metadata.picture);
    const usernameRaw = pickMetadataString(metadata.user_name)
        || pickMetadataString(metadata.username)
        || email
        || user.id;
    const storedUser = getUserById(user.id)
        || (email ? getUserByIdentifier(email) : null)
        || (usernameRaw ? getUserByIdentifier(usernameRaw) : null);
    const role = resolveMetadataRole(metadata) || storedUser?.role || 'moderator';

    return {
        id: user.id,
        username: usernameRaw.toLowerCase(),
        email,
        role,
        createdAt: user.created_at || new Date().toISOString(),
        displayName,
        photoURL
    };
};

const syncSupabaseSession = (user: SupabaseUser | null) => {
    if (!user) return null;
    const storedUser = upsertUser(mapSupabaseUser(user));
    setCurrentUserSession(storedUser);
    return storedUser;
};

const getOAuthRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    return import.meta.env.VITE_SUPABASE_REDIRECT_URL || `${window.location.origin}/admin/dashboard`;
};

const getPasswordResetRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    return import.meta.env.VITE_SUPABASE_RESET_REDIRECT_URL || `${window.location.origin}/update-password`;
};

/**
 * Google OAuth sign-in.
 */
export const signInWithGoogle = async () => {
    if (typeof window === 'undefined') {
        throw new Error('Google sign-in requires a browser environment.');
    }

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: getOAuthRedirectUrl()
        }
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
        console.warn('Supabase sign-out failed', error);
    }
    logoutUser();
    emitAuthChange('SIGNED_OUT', null);
};

/**
 * Gets the current session and user.
 */
export const getCurrentUser = async () => {
    if (typeof window !== 'undefined') {
        try {
            await restoreSessionFromUrl();
            const { data, error } = await supabase.auth.getSession();
            if (!error && data?.session?.user) {
                return syncSupabaseSession(data.session.user);
            }
        } catch (error) {
            console.warn('Supabase session check failed', error);
        }
    }

    return getLocalCurrentUser();
};

/**
 * Sets up a listener for auth state changes.
 */
export const onAuthStateChange = (callback: (event: string, session: AuthSession) => void) => {
    if (!authEventTarget) {
        return { unsubscribe: () => undefined };
    }

    const handler = (event: Event) => {
        const detail = (event as CustomEvent<AuthChangeDetail>).detail;
        callback(detail.event, detail.session);
    };

    authEventTarget.addEventListener('auth-change', handler);

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user ? syncSupabaseSession(session.user) : null;
        emitAuthChange(event, user);
    });

    return {
        unsubscribe: () => {
            authEventTarget.removeEventListener('auth-change', handler);
            data?.subscription?.unsubscribe();
        }
    };
};

/**
 * Stores a local password reset intent for the provided email.
 */
export const resetPasswordForEmail = async (email: string) => {
    if (typeof window !== 'undefined') {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: getPasswordResetRedirectUrl()
            });
            if (!error) {
                return { success: true };
            }
            console.warn('Supabase password reset failed', error);
        } catch (error) {
            console.warn('Supabase password reset failed', error);
        }
    }

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
    if (typeof window !== 'undefined') {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pass
            });
            if (!error && data?.user) {
                const storedUser = syncSupabaseSession(data.user);
                emitAuthChange('SIGNED_IN', storedUser);
                return { success: true };
            }
            if (error) {
                console.warn('Supabase email sign-in failed', error);
            }
        } catch (error) {
            console.warn('Supabase email sign-in failed', error);
        }
    }

    const result = loginUser(email, pass);
    if (!result.success || !result.user) {
        throw new Error(result.message);
    }
    setCurrentUserSession(result.user);
    emitAuthChange('SIGNED_IN', result.user);
    return { success: true };
};

/**
 * Signs up a new user with email and password (local storage).
 */
export const signUpWithEmail = async (email: string, password: string, fullName?: string): Promise<EmailAuthResult> => {
    if (typeof window !== 'undefined') {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: fullName ? { data: { full_name: fullName } } : undefined
            });

            if (!error && data?.user) {
                if (data.session?.user) {
                    const storedUser = syncSupabaseSession(data.session.user);
                    emitAuthChange('SIGNED_IN', storedUser);
                    return { user: storedUser };
                }

                upsertUser(mapSupabaseUser(data.user));
                return { user: mapSupabaseUser(data.user), needsEmailConfirmation: true };
            }

            if (error) {
                console.warn('Supabase email sign-up failed', error);
            }
        } catch (error) {
            console.warn('Supabase email sign-up failed', error);
        }
    }

    const result = registerUser(email, password, fullName);
    if (!result.success || !result.user) {
        throw new Error(result.message);
    }
    setCurrentUserSession(result.user);
    emitAuthChange('SIGNED_IN', result.user);
    return { user: result.user };
};

/**
 * Updates the current user password in local storage.
 */
export const updateCurrentUserPassword = async (currentPassword: string | null, newPassword: string) => {
    if (typeof window !== 'undefined') {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (!error && data?.session) {
                const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
                if (!updateError) {
                    return { success: true };
                }
                console.warn('Supabase password update failed', updateError);
            }
        } catch (error) {
            console.warn('Supabase password update failed', error);
        }
    }

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
    if (typeof window !== 'undefined') {
        try {
            await restoreSessionFromUrl();
            const { data, error } = await supabase.auth.getSession();
            if (!error && data?.session) {
                const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
                if (!updateError) {
                    return { success: true };
                }
                console.warn('Supabase password reset failed', updateError);
            }
        } catch (error) {
            console.warn('Supabase password reset failed', error);
        }
    }

    const result = consumePasswordReset(newPassword);
    if (!result.success) {
        throw new Error(result.message);
    }
    return { success: true };
};

export const hasPendingPasswordReset = () => Boolean(getPasswordResetUserId());
