import { Router } from 'express';
import { handleNotificationEvent } from '../services/event.service.js';

const router = Router();

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
