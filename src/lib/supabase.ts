import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gepywlhveafqosoyitcb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHl3bGh2ZWFmcW9zb3lpdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODc2OTEsImV4cCI6MjA4NTY2MzY5MX0.Ibn6RPloHkN2VPYMlvYLssecy27DiP6CvXiPvoD_zPA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to safely execute Supabase operations without blocking
export const safeSupabaseCall = async <T>(operation: Promise<T>) => {
    try {
        await operation;
    } catch (error) {
        console.error('Supabase operation failed:', error);
    }
};

// If the app was redirected back from an OAuth provider, Supabase may place
// the session tokens in the URL. Parse them before checking session state.
export const restoreSessionFromUrl = async () => {
    if (typeof window === 'undefined') return false;

    const url = new URL(window.location.href);
    const authCode = url.searchParams.get('code');
    const hashParams = new URLSearchParams(url.hash.replace('#', ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!authCode && !accessToken) {
        return false;
    }

    try {
        if (authCode) {
            await supabase.auth.exchangeCodeForSession(authCode);
        } else if (accessToken && refreshToken) {
            await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
        }

        url.hash = '';
        url.searchParams.delete('code');
        url.searchParams.delete('type');
        history.replaceState(null, '', url.pathname + url.search);
        console.log('Supabase: restored session from URL');
        return true;
    } catch (err) {
        console.warn('Supabase: session restore failed during init', err);
        return false;
    }
};
