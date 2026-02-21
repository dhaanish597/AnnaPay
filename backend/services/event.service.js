import { routeByRole } from './role.service.js';
import { saveNotification } from '../models/notification.model.js';
import { validateEventPayload } from '../utils/validator.js';
import { generateEventTemplate } from './template.service.js';

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

    // 2. Generate Message and Target Roles
    const { message, targetRoles } = generateEventTemplate(payload);
    const { priority } = payload;

    const results = [];

    // 3. Process sending for each targeted role
    for (const role of targetRoles) {
        const notificationRecord = {
            role,
            priority,
            message,
        };

        // Database Logic (Persist the event first)
        const dbResult = await saveNotification(notificationRecord);

        if (dbResult.error) {
            console.error(`Failed to record notification for ${role}:`, dbResult.error);
            // Alternatively, could rollback or collect errors, we'll just log and continue for the robustness assumption
            results.push({ role, success: false, error: dbResult.error });
            continue;
        }

        // Role Routing Logic (Determine destinations based on role)
        try {
            await routeByRole(dbResult.data);
            results.push({ role, dbRecord: dbResult.data, success: true });
        } catch (routeError) {
            console.error(`Failed to route notification for ${role}:`, routeError);
            results.push({ role, success: false, error: routeError });
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
