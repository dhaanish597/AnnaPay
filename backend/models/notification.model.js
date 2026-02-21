import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('[DB] Supabase credentials not found. Database operations will be mocked locally.');
}

/**
 * Handles database operations related to notifications.
 */
export const saveNotification = async (payload) => {
    if (!supabase) {
        // Mock database insertion successfully
        const mockRecord = {
            id: crypto.randomUUID(),
            role: payload.role,
            priority: payload.priority,
            message: payload.message,
            status: 'sent',
            created_at: new Date().toISOString()
        };
        console.log('[DB Mock] Saved notification:', mockRecord.id);
        return { data: mockRecord, error: null };
    }

    // Real Supabase insertion
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            role: payload.role,
            priority: payload.priority,
            message: payload.message,
            status: 'sent',
        })
        .select()
        .single();

    return { data, error };
};
