import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gepywlhveafqosoyitcb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHl3bGh2ZWFmcW9zb3lpdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODc2OTEsImV4cCI6MjA4NTY2MzY5MX0.Ibn6RPloHkN2VPYMlvYLssecy27DiP6CvXiPvoD_zPA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper to safely execute Supabase operations without blocking
export const safeSupabaseCall = async (operation: Promise<any>) => {
    try {
        await operation;
    } catch (error) {
        console.error('Supabase operation failed:', error);
    }
};

// If the app was redirected back from an OAuth provider, Supabase may place
// the session tokens in the URL fragment (hash). Parse them early so the
// client session is established before the app's routing and components mount.
if (typeof window !== 'undefined' && window.location.hash) {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('code') || hash.includes('type=')) {
        // Run asynchronously but don't block import; log any errors for debugging
        (async () => {
            try {
                await supabase.auth.getSessionFromUrl({ storeSession: true });
                // Clean up the URL fragment
                history.replaceState(null, '', window.location.pathname + window.location.search);
                console.log('Supabase: restored session from URL fragment');
            } catch (err) {
                console.warn('Supabase: getSessionFromUrl failed during init', err);
            }
        })();
    }
}
