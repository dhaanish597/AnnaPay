import { sendToChannel } from './channel.service.js';

/**
 * Determines which communication channels to use based on Anna University platform roles.
 */
export const routeByRole = async (notification) => {
    const { role, priority, message } = notification;

    switch (role) {
        case 'UNIVERSITY_ADMIN':
            await sendToChannel('IN_APP', { userId: 'university-admin-group', message: `[Admin Alert] ${message}` });
            if (priority === 'HIGH') {
                await sendToChannel('EMAIL', { to: 'admin@annauniv.edu', subject: `Global Urgent Alert`, message });
            }
            break;

        case 'COLLEGE_ADMIN':
            await sendToChannel('EMAIL', { to: 'college-admins@annauniv.edu', subject: `College Admin Notice - Priority: ${priority}`, message });
            await sendToChannel('IN_APP', { userId: 'college-admin-group', message });
            break;

        case 'FINANCE_OFFICER':
            await sendToChannel('IN_APP', { userId: 'finance-group', message });
            if (priority === 'HIGH' || priority === 'MEDIUM') {
                await sendToChannel('EMAIL', { to: 'finance@annauniv.edu', subject: 'Finance Division Alert', message });
            }
            break;

        case 'FACULTY':
            await sendToChannel('IN_APP', { userId: 'faculty-group', message });
            await sendToChannel('EMAIL', { to: 'faculty@annauniv.edu', subject: `Faculty Update`, message });
            if (priority === 'HIGH') {
                await sendToChannel('SMS', { to: 'faculty-emergency-list', message });
            }
            break;

        case 'IT_SUPPORT':
            await sendToChannel('SLACK', { channel: '#it-support-alerts', message });
            if (priority === 'HIGH') {
                await sendToChannel('SMS', { to: 'it-on-call', message });
            }
            break;

        default:
            console.warn(`No specific routing defined for Anna Univ role: ${role}`);
            await sendToChannel('LOG', { message: `Unrouted notification: ${message}` });
    }
};
