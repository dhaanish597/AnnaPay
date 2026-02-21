/**
 * RuleEngine Service
 * 
 * Intercepts event payloads before dispatch to dynamically enforce system rules.
 * Automatically overrides priorities and manipulates target channels based on strict Event definitions.
 */

export const applyEventRules = (payload, currentRoles) => {
    let determinedPriority = payload.priority || 'LOW';
    const dynamicRoles = new Set(currentRoles);

    switch (payload.event_type) {
        case 'PAYROLL_FAILED':
            determinedPriority = 'HIGH';
            break;
        case 'SALARY_PROCESSED':
            determinedPriority = 'MEDIUM';
            break;
        case 'SYSTEM_ERROR':
            determinedPriority = 'HIGH';
            dynamicRoles.add('IT_SUPPORT'); // Append IT explicitly into matrix
            break;
        default:
            // If the user specified a priority for an unknown event, respect it
            break;
    }

    return {
        priority: determinedPriority,
        targetRoles: Array.from(dynamicRoles)
    };
};
