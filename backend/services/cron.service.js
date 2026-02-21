import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { routeByPriorityAndRole } from './role.service.js';
import { addAuditLog } from '../models/notification.model.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn('[DB] Supabase credentials not found. Cron jobs will be mocked/skipped.');
}

/**
 * Sweeps the database for HIGH priority notifications that have not been marked 
 * as "resolved" within 3 hours (or demo threshold).
 * Upgrades them to ESCALATED status, stores escalation_time, and reroutes to UNIVERSITY_ADMIN.
 */
export const escalateHighPriorityIssues = async (demoMode = false) => {
    if (!supabase) {
        console.log('[Cron Mock] SLA Escalation check skipped - no real db connection');
        return { count: 0, error: 'No DB connection' };
    }

    console.log(`[Cron Task] Running SLA escalation check for HIGH priority events... (Demo Mode: ${demoMode})`);

    // In demo mode, we escalate anything older than 1 minute to easily show it working.
    // In production, we strictly use the 3-hour requirement.
    const timeLimitMs = demoMode ? (1 * 60 * 1000) : (3 * 60 * 60 * 1000);
    const timeLimit = new Date(Date.now() - timeLimitMs).toISOString();

    const { data: notifications, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('priority', 'HIGH')
        .in('status', ['sent', 'pending', 'failed']) // Ignore resolved or already escalated manually
        .lt('timestamp', timeLimit);

    if (error) {
        console.error('[Cron Task] Error fetching SLA breaches:', error);
        return { count: 0, error };
    }

    if (!notifications || notifications.length === 0) {
        console.log('[Cron Task] No SLA breaches requiring escalation at this time.');
        return { count: 0 };
    }

    console.log(`[Cron Task] Found ${notifications.length} unresolved HIGH priority SLA breaches. Activating escalation sequence...`);

    let escalatedCount = 0;

    for (const notification of notifications) {

        // 1. Tag message with ESCALATED flag explicitly if not already present
        const upgradedMsg = notification.message.startsWith('[ESCALATED]')
            ? notification.message
            : `[ESCALATED] ${notification.message}`;

        // 2. Map payload dynamically forcing UNIVERSITY_ADMIN as recipient explicitly for escalation scenarios.
        const upgradedNotification = {
            ...notification,
            priority: 'HIGH',
            message: upgradedMsg,
            recipient_role: 'UNIVERSITY_ADMIN',
            status: 'escalated'
        };

        try {
            // 3. Re-dispatch the engine channels (WebSocket pushes, emergency Emails)
            await routeByPriorityAndRole(upgradedNotification);

            await supabase
                .from('notification_logs')
                .update({
                    status: 'escalated',
                    escalation_time: new Date().toISOString(),
                    recipient_role: 'UNIVERSITY_ADMIN',
                    message: upgradedMsg
                })
                .eq('id', notification.id);

            await addAuditLog(notification.id, 'ESCALATED', 'CRON_SYSTEM', { previous_role: notification.recipient_role, new_role: 'UNIVERSITY_ADMIN', time_limit: timeLimit });

            escalatedCount++;
            console.log(`[Cron Task] Successfully escalated Log ID: ${notification.id} to UNIVERSITY_ADMIN`);

        } catch (routeError) {
            console.error(`[Cron Task] Failed to execute escalation subroutines for ID: ${notification.id}`);
        }
    }

    return { count: escalatedCount };
};

/**
 * Sweeps the database every minute for scheduled notifications whose timestamps
 * have elapsed, bypassing the dispatcher and directly pushing to channels securely.
 */
export const processScheduledAlerts = async () => {
    if (!supabase) return;

    const now = new Date().toISOString();

    const { data: notifications, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', now);

    if (error) {
        console.error('[Cron Task] Error fetching scheduled alerts:', error);
        return;
    }

    if (!notifications || notifications.length === 0) {
        return;
    }

    console.log(`[Cron Task] Found ${notifications.length} scheduled alerts triggering now...`);

    for (const notification of notifications) {
        try {
            // Route the alert through WebSocket/Channels as usual natively expecting .role
            const routingPayload = {
                ...notification,
                role: notification.recipient_role
            };
            await routeByPriorityAndRole(routingPayload);

            // Mark status as 'sent'
            await supabase
                .from('notification_logs')
                .update({ status: 'sent', scheduled_at: null })
                .eq('id', notification.id);

            await addAuditLog(notification.id, 'SCHEDULED_TRIGGERED', 'CRON_SYSTEM', { scheduled_at: notification.scheduled_at });

            console.log(`[Cron Task] Successfully dispatched scheduled alert ID: ${notification.id}`);
        } catch (e) {
            console.error(`[Cron Task] Failed to dispatch scheduled alert ID: ${notification.id}`, e);
            await supabase.from('notification_logs').update({ status: 'failed' }).eq('id', notification.id);
        }
    }
};
