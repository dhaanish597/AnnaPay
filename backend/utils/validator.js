/**
 * Validates the request payload for an event-driven notification.
 */
export const validateEventPayload = (payload) => {
    if (!payload) return 'Payload is missing';

    const { event_type, college_id, department, priority } = payload;

    if (!event_type || !college_id || !department || !priority) {
        return 'Missing required fields: event_type, college_id, department, priority';
    }

    const validEventTypes = [
        'SALARY_PROCESSED',
        'PAYROLL_FAILED',
        'APPROVAL_PENDING',
        'PAYMENT_TRANSFERRED',
        'SYSTEM_ERROR'
    ];
    const validPriorities = ['HIGH', 'MEDIUM', 'LOW'];

    if (!validEventTypes.includes(event_type)) {
        return `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}`;
    }

    if (!validPriorities.includes(priority)) {
        return 'Invalid priority. Must be HIGH, MEDIUM, or LOW';
    }

    return null; // Return null if perfectly valid
};
