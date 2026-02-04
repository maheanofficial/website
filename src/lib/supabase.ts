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
