import { supabase } from '../lib/supabase';

/**
 * Initiates the Google OAuth sign-in flow.
 * Note: Redirects the user to the Google sign-in page.
 */
export const signInWithGoogle = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // Redirect to the author dashboard after successful OAuth
                redirectTo: `${window.location.origin}/author/dashboard`,
            },
        });

        if (error) throw error;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

/**
 * Signs the current user out.
 */
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Gets the current session and user.
 */
export const getCurrentUser = async () => {
    try {
        // If the URL contains an OAuth fragment (after redirect), complete the sign-in
        // by extracting the session from the URL first. This fixes blank pages after
        // OAuth redirects which leave tokens in the hash (e.g. /author/dashboard#...).
        if (typeof window !== 'undefined' && window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('code') || window.location.hash.includes('type='))) {
            try {
                // This will parse the URL and set the session in the client
                await supabase.auth.getSessionFromUrl({ storeSession: true });
                // Remove fragment to keep URLs clean
                history.replaceState(null, '', window.location.pathname + window.location.search);
            } catch (err) {
                console.warn('getSessionFromUrl failed:', err);
            }
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session?.user || null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
};

/**
 * Sets up a listener for auth state changes.
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });

    return subscription;
};

/**
 * Sends a password reset email to the user.
 */
export const resetPasswordForEmail = async (email: string) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error sending reset password email:', error);
    }
};

/**
 * Signs in with email and password.
 */
export const signInWithEmailOnly = async (email: string, pass: string) => {
    try {
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error signing in with Email:', error);
        throw error;
    }
};

/**
 * Signs up a new user with email and password.
 */
export const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        }, {
            data: { full_name: fullName }
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error signing up with Email:', error);
        throw error;
    }
};
