import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read templates from JSON file (Configurable)
const templatesPath = path.join(__dirname, '../config/templates.json');
let notificationTemplates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

/**
 * Utility to reload templates from the file system dynamically.
 * This can be wired to a particular endpoint if live-reloading is ever needed without server restart.
 */
export const reloadTemplates = () => {
    try {
        notificationTemplates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
        console.log('[Template Engine] Reloaded templates configuration successfully');
    } catch (e) {
        console.error('[Template Engine] Failed to reload templates:', e);
    }
};

/**
 * Utility function to replace placeholders in a string, e.g., {department} with the corresponding value from payload
 */
const interpolateString = (template, data) => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return typeof data[key] !== 'undefined' ? data[key] : match;
    });
};

/**
 * Engine to map event types to their dynamic template messages and target roles.
 */
export const generateEventTemplate = (payload) => {
    // Dynamically fallback 'college_name' to 'college_id' if name isn't explicitly provided in the API call
    const enrichedPayload = {
        college_name: payload.college_id,
        ...payload
    };

    const { event_type } = enrichedPayload;

    const baseRoles = ['UNIVERSITY_ADMIN']; // Admins receive all event-driven messages by default
    const templateConfig = notificationTemplates[event_type] || notificationTemplates['DEFAULT'];

    const messageString = templateConfig.message;
    const mappedRoles = templateConfig.targetRoles || [];

    // Interpolate variables from payload into the specified JSON message string
    const message = interpolateString(messageString, enrichedPayload);

    // Merge base roles and mapped roles uniquely
    const targetRoles = [...new Set([...baseRoles, ...mappedRoles])];

    return { message, targetRoles };
};
