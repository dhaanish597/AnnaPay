import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import notificationRoutes from './routes/notification.routes.js';
import { initWebSocket } from './services/websocket.service.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Notification Microservice' });
});

import cron from 'node-cron';
import { escalateHighPriorityIssues, processScheduledAlerts } from './services/cron.service.js';

app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Run the escalation job roughly every hour
cron.schedule('0 * * * *', async () => {
  console.log('[Cron Scheduler] Triggering hourly HIGH PRIORITY SLA escalation pipeline.');
  await escalateHighPriorityIssues();
});

// Run scheduled events sweeper every minute
cron.schedule('* * * * *', async () => {
  await processScheduledAlerts();
});

// Initialize WebSockets
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Notification Microservice is running on port ${PORT}`);
});
