import { routeByPriorityAndRole } from './role.service.js';
import { saveNotification, updateNotificationStatus, addAuditLog } from '../models/notification.model.js';
import { validateEventPayload } from '../utils/validator.js';
import { generateEventTemplate } from './template.service.js';
import { applyEventRules } from './rule.engine.service.js';

/**
 * Coordinates the full lifecycle of an EVENT-DRIVEN notification.
 * Validates -> Templates -> Persists -> Routes
 */
export const handleNotificationEvent = async (payload) => {
    // 1. Validation Logic
    const validationError = validateEventPayload(payload);
    if (validationError) {
        return { error: validationError, status: 400 };
    }

    // 2. Generate Message and Initial Roles
    const { message, targetRoles: initialRoles } = generateEventTemplate(payload);

    // 3. Rule Engine Intervention (Dynamic Priorities / Dynamic IT Escalations)
    const { priority, targetRoles } = applyEventRules(payload, initialRoles);

    const isScheduled = payload.scheduled_at && new Date(payload.scheduled_at) > new Date();

    const results = [];

    // 4. Process sending for each targeted role
    for (const role of targetRoles) {
        const notificationRecord = {
            event_type: payload.event_type,
            recipient_role: role,
            priority,
            message,
            college: payload.college_id, // added
            status: isScheduled ? 'scheduled' : 'pending',
            scheduled_at: isScheduled ? payload.scheduled_at : null
        };

        // Database Logic (Persist the event first as 'pending' or 'scheduled')
        const dbResult = await saveNotification(notificationRecord);

        if (dbResult.error) {
            console.error(`Failed to record notification log for ${role}:`, dbResult.error);
            results.push({ role, success: false, error: dbResult.error });
            continue;
        }

        await addAuditLog(dbResult.data.id, 'CREATED', payload.actor_identifier, {
            event_type: payload.event_type,
            status: notificationRecord.status,
            priority
        });

        if (isScheduled) {
            console.log(`[Event Engine] Notification securely locked & scheduled for ${role} at ${payload.scheduled_at}`);
            results.push({ role, dbRecord: dbResult.data, success: true });
            continue; // Break out of sending loop, hand off securely to CRON scheduler
        }

        // Role Routing Logic (Determine destinations based on role)
        // Adjust the notification format specifically for the router expectations which wants `.role` backward explicitly 
        const routingPayload = {
            ...dbResult.data,
            role: dbResult.data.recipient_role,
        };

        try {
            await routeByPriorityAndRole(routingPayload);

            // Mark as sent internally since delivery logic concluded securely
            await updateNotificationStatus(dbResult.data.id, 'sent');
            results.push({ role, dbRecord: { ...dbResult.data, status: 'sent' }, success: true });
        } catch (routeError) {
            console.error(`Failed to route notification for ${role}:`, routeError);

            // Mark as failed if actual channel pushing threw an exception natively
            await updateNotificationStatus(dbResult.data.id, 'failed');
            results.push({ role, dbRecord: { ...dbResult.data, status: 'failed' }, success: false, error: routeError });
        }
    }

    // If literally every database insertion failed, return a 500
    const successfulDbInserts = results.filter(r => r.dbRecord);
    if (successfulDbInserts.length === 0) {
        return {
            error: 'Failed to create any database records for event',
            status: 500
        };
    }

    return { data: results };
};
