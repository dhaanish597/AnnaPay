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
 * Persists a notification event to the notification_logs table.
 */
export const saveNotification = async (payload) => {
    if (!supabase) {
        // Mock database insertion successfully
        const mockRecord = {
            id: crypto.randomUUID(),
            event_type: payload.event_type,
            message: payload.message,
            recipient_role: payload.recipient_role,
            priority: payload.priority,
            college: payload.college,
            status: payload.status || 'pending',
            scheduled_at: payload.scheduled_at || null,
            timestamp: new Date().toISOString()
        };
        console.log('[DB Mock] Saved notification log:', mockRecord.id);
        return { data: mockRecord, error: null };
    }

    // Real Supabase insertion
    const { data, error } = await supabase
        .from('notification_logs')
        .insert({
            event_type: payload.event_type,
            message: payload.message,
            recipient_role: payload.recipient_role,
            priority: payload.priority,
            college: payload.college,
            status: payload.status || 'pending',
            scheduled_at: payload.scheduled_at || null,
        })
        .select()
        .single();

    return { data, error };
};

/**
 * Retrieves notifications optionally filtered by priority.
 */
export const getNotifications = async (priorityFilter) => {
    if (!supabase) {
        console.log('[DB Mock] Fetching mocked notification logs.');
        const mockRow = {
            id: crypto.randomUUID(),
            event_type: 'SYSTEM_MOCK',
            message: 'Mock log entry',
            recipient_role: 'UNIVERSITY_ADMIN',
            priority: priorityFilter || 'LOW',
            status: 'sent',
            timestamp: new Date().toISOString()
        };
        return { data: [mockRow], error: null };
    }

    let query = supabase
        .from('notification_logs')
        .select('*')
        .order('timestamp', { ascending: false });

    if (priorityFilter) {
        query = query.eq('priority', priorityFilter.toUpperCase());
    }

    const { data, error } = await query;
    return { data, error };
};

/**
 * Updates an existing notification's status
 */
export const updateNotificationStatus = async (id, status) => {
    if (!supabase) {
        console.log(`[DB Mock] Updated notification ${id} to status: ${status}`);
        return { data: { id, status }, error: null };
    }

    const { data, error } = await supabase
        .from('notification_logs')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
};

export const addAuditLog = async (notificationId, action, actorIdentifier, details = {}) => {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
        .from('notification_audit_logs')
        .insert({
            notification_id: notificationId,
            action,
            actor_identifier: actorIdentifier || 'SYSTEM',
            details
        });
    return { data, error };
};

export const getAuditLogs = async (notificationId) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
        .from('notification_audit_logs')
        .select('*')
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: false });
    return { data, error };
};
