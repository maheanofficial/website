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
const OAUTH_PROVIDER_KEY = 'mahean_oauth_provider';
const DEFAULT_SELF_SERVICE_ROLE: LocalUser['role'] = 'moderator';

const getStoredOAuthProvider = () => {
    if (typeof window === 'undefined') return undefined;
    try {
        return localStorage.getItem(OAUTH_PROVIDER_KEY) || undefined;
    } catch {
        return undefined;
    }
};

const setStoredOAuthProvider = (provider: string) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(OAUTH_PROVIDER_KEY, provider);
    } catch {
        // Ignore storage errors.
    }
};

const clearStoredOAuthProvider = () => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(OAUTH_PROVIDER_KEY);
    } catch {
        // Ignore storage errors.
    }
};

const enforceStoredProviderRole = (user: LocalUser | null) => {
    if (!user) return user;
    const storedProvider = getStoredOAuthProvider();
    if (!storedProvider) return user;
    clearStoredOAuthProvider();
    return user;
};

const resolveSelfServiceRole = (storedUser: LocalUser | null): LocalUser['role'] => {
    if (storedUser?.role === 'admin') {
        return 'admin';
    }
    return DEFAULT_SELF_SERVICE_ROLE;
};

const emitAuthChange = (event: string, user: LocalUser | null) => {
    if (!authEventTarget) return;
    const detail: AuthChangeDetail = {
        event,
        session: { user }
    };
    authEventTarget.dispatchEvent(new CustomEvent('auth-change', { detail }));
};

const pickMetadataString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const mapSupabaseUser = (user: SupabaseUser): LocalUser => {
    const metadata = user.user_metadata ?? {};
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const identityEmail = identities
        .map((identity) => (identity as { identity_data?: Record<string, unknown> }).identity_data)
        .map((data) => pickMetadataString(data?.email))
        .find(Boolean);
    const metadataEmail = pickMetadataString(metadata.email)
        || pickMetadataString(metadata.email_address);
    const email = (identityEmail || metadataEmail || user.email || '').toLowerCase() || undefined;
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
    const storedProvider = getStoredOAuthProvider();
    if (storedProvider) {
        clearStoredOAuthProvider();
    }
    const role = resolveSelfServiceRole(storedUser);

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
    const mappedUser = mapSupabaseUser(user);
    const storedUser = upsertUser(mappedUser);
    setCurrentUserSession(storedUser);
    return storedUser;
};

const getOAuthRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    const configured = import.meta.env.VITE_SUPABASE_REDIRECT_URL as string | undefined;
    if (configured) {
        try {
            const url = new URL(configured);
            if (url.origin === window.location.origin) {
                return configured;
            }
        } catch (error) {
            console.warn('Invalid VITE_SUPABASE_REDIRECT_URL', error);
        }
    }
    return `${window.location.origin}/admin/dashboard`;
};

const getPasswordResetRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    const configured = import.meta.env.VITE_SUPABASE_RESET_REDIRECT_URL as string | undefined;
    if (configured) {
        try {
            const url = new URL(configured);
            if (url.origin === window.location.origin) {
                return configured;
            }
        } catch (error) {
            console.warn('Invalid VITE_SUPABASE_RESET_REDIRECT_URL', error);
        }
    }
    return `${window.location.origin}/update-password`;
};

/**
 * Google OAuth sign-in.
 */
export const signInWithGoogle = async () => {
    if (typeof window === 'undefined') {
        throw new Error('Google sign-in requires a browser environment.');
    }

    setStoredOAuthProvider('google');

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
    clearStoredOAuthProvider();
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

    return enforceStoredProviderRole(getLocalCurrentUser());
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
        if (!session?.user) {
            const localUser = enforceStoredProviderRole(getLocalCurrentUser());
            if (localUser) {
                emitAuthChange('SIGNED_IN', localUser);
                return;
            }
        }
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
    const identifier = email.trim();
    const looksLikeEmail = (value: string) => {
        const parts = value.split('@');
        if (parts.length !== 2) return false;
        return parts[1].includes('.');
    };
    clearStoredOAuthProvider();
    const localAttempt = loginUser(identifier, pass);

    if (typeof window !== 'undefined') {
        try {
            if (looksLikeEmail(identifier)) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: identifier,
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
            }
        } catch (error) {
            console.warn('Supabase email sign-in failed', error);
        }
    }

    if (localAttempt.success && localAttempt.user) {
        setCurrentUserSession(localAttempt.user);
        emitAuthChange('SIGNED_IN', localAttempt.user);
        return { success: true };
    }

    throw new Error(localAttempt.message);
};

/**
 * Signs up a new user with email and password (local storage).
 */
export const signUpWithEmail = async (email: string, password: string, fullName?: string): Promise<EmailAuthResult> => {
    if (typeof window !== 'undefined') {
        try {
            const signupMetadata: Record<string, string> = {
                role: DEFAULT_SELF_SERVICE_ROLE
            };
            if (fullName) {
                signupMetadata.full_name = fullName;
            }
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: signupMetadata }
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
