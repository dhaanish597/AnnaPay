import { Router } from 'express';
import { handleNotificationEvent } from '../services/event.service.js';
import { getNotifications, updateNotificationStatus, getAuditLogs, addAuditLog } from '../models/notification.model.js';
import { escalateHighPriorityIssues } from '../services/cron.service.js';

const router = Router();

// GET /api/notifications
// Supports query: ?priority=HIGH (or MEDIUM, LOW)
router.get('/', async (req, res, next) => {
    try {
        const priorityFilter = req.query.priority;
        const result = await getNotifications(priorityFilter);

        if (result.error) {
            return res.status(500).json({ error: 'Failed to fetch notification logs', details: result.error });
        }

        return res.status(200).json({
            success: true,
            count: result.data.length,
            notifications: result.data
        });

    } catch (error) {
        next(error);
    }
});

// PATCH /api/notifications/:id/resolve
router.patch('/:id/resolve', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { actor_identifier } = req.body || {};

        const result = await updateNotificationStatus(id, 'resolved');

        if (result.error) {
            return res.status(500).json({ error: 'Failed to resolve notification', details: result.error });
        }

        await addAuditLog(id, 'RESOLVED', actor_identifier, { status: 'resolved' });

        return res.status(200).json({ success: true, notification: result.data });
    } catch (error) {
        next(error);
    }
});

// GET /api/notifications/:id/audit
router.get('/:id/audit', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await getAuditLogs(id);

        if (result.error) {
            return res.status(500).json({ error: 'Failed to fetch audit logs', details: result.error });
        }

        return res.status(200).json(result.data);
    } catch (error) {
        next(error);
    }
});

// POST /api/notifications/trigger-escalation
router.post('/trigger-escalation', async (req, res, next) => {
    try {
        const result = await escalateHighPriorityIssues(true); // Demo mode activated to bypass 3 hour strictness
        if (result && result.error) {
            return res.status(500).json({ error: 'Failed to trigger escalations', details: result.error });
        }
        return res.status(200).json({ success: true, count: result?.count || 0, message: 'Escalation sequence executed and engine refreshed.' });
    } catch (err) {
        next(err);
    }
});

// POST /api/notifications
// Accepts payload: { event_type, college_id, department, priority }
router.post('/', async (req, res, next) => {
    try {
        const payload = req.body;

        // Delegate to the event coordinator/service
        const result = await handleNotificationEvent(payload);

        if (result.error) {
            return res.status(result.status || 400).json({ error: result.error, details: result.details });
        }

        return res.status(201).json({
            success: true,
            notifications: result.data,
            message: 'Event-driven notifications generated and dispatched successfully',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
