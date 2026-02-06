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
