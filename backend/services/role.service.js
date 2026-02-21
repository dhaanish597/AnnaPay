import { sendToChannel } from './channel.service.js';

/**
 * Executes priority-based logic explicitly mapping channels to PRIORITY values.
 * RULES:
 * - HIGH → Send Email + Dashboard (IN_APP)
 * - MEDIUM → Dashboard (IN_APP) only
 * - LOW → Store only (Handled implicitly by NOT sending to any channels here, since DB save happens before routeByRole)
 */
export const routeByPriorityAndRole = async (notification) => {
    const { role, priority, message } = notification;

    // Rule 1: LOW priority notifications are strictly stored in DB and NOT broadcast to any active channels.
    if (priority === 'LOW') {
        console.log(`[Priority Strategy] LOW priority event stored. Bypassing active channels for role: ${role}`);
        return;
    }

    // Rule 2: MEDIUM priority notifications go strictly to Dashboard (IN_APP) for target role, NO emails.
    if (priority === 'MEDIUM') {
        const dashboardId = getRoleDashboardId(role);
        if (dashboardId) {
            await sendToChannel('IN_APP', { userId: dashboardId, message: `[${priority}] ${message}` });
        }
        return;
    }

    // Rule 3: HIGH priority notifications go to Dashboard (IN_APP) PLUS Email
    if (priority === 'HIGH') {
        const dashboardId = getRoleDashboardId(role);
        const emailTo = getRoleEmailAddress(role);

        if (dashboardId) {
            await sendToChannel('IN_APP', { userId: dashboardId, message: `[URGENT] ${message}` });
        }

        if (emailTo) {
            await sendToChannel('EMAIL', { to: emailTo, subject: `URGENT ALERT - Priority: HIGH`, message });
        }

        // Keep specific escalations originally requested for high priority IT / Faculty
        if (role === 'IT_SUPPORT') {
            await sendToChannel('SLACK', { channel: '#it-support-alerts', message });
            await sendToChannel('SMS', { to: 'it-on-call', message });
        } else if (role === 'FACULTY') {
            await sendToChannel('SMS', { to: 'faculty-emergency-list', message });
        } else if (role === 'UNIVERSITY_ADMIN') {
            // Admin specifically gets a master global email
            await sendToChannel('EMAIL', { to: 'admin@annauniv.edu', subject: `Global Urgent Alert`, message });
        }
        return;
    }
};

/**
 * Utility to map a role to its dashboard identifier
 */
const getRoleDashboardId = (role) => {
    switch (role) {
        case 'UNIVERSITY_ADMIN': return 'university-admin-group';
        case 'COLLEGE_ADMIN': return 'college-admin-group';
        case 'FINANCE_OFFICER': return 'finance-group';
        case 'FACULTY': return 'faculty-group';
        case 'IT_SUPPORT': return 'it-support-dashboard'; // Add IT support to dashboard explicitly if needed
        default: return null;
    }
};

/**
 * Utility to map a role to its functional email list
 */
const getRoleEmailAddress = (role) => {
    switch (role) {
        case 'UNIVERSITY_ADMIN': return 'admin@annauniv.edu';
        case 'COLLEGE_ADMIN': return 'college-admins@annauniv.edu';
        case 'FINANCE_OFFICER': return 'finance@annauniv.edu';
        case 'FACULTY': return 'faculty@annauniv.edu';
        case 'IT_SUPPORT': return 'it-support@annauniv.edu';
        default: return null;
    }
};
