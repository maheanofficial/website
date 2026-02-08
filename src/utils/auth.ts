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
    type User
} from './userManager';

type AuthSession = { user: User | null } | null;

type AuthChangeDetail = {
    event: string;
    session: AuthSession;
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

/**
 * Google OAuth is not available in local-only mode.
 */
export const signInWithGoogle = async () => {
    throw new Error('Google sign-in is disabled in local-only mode.');
};

/**
 * Signs the current user out.
 */
export const signOut = async () => {
    logoutUser();
    emitAuthChange('SIGNED_OUT', null);
};

/**
 * Gets the current session and user.
 */
export const getCurrentUser = async () => {
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
