import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { broadcastNotification } from './websocket.service.js';
dotenv.config();

let transporter = null;

/**
 * Initializes the Nodemailer transporter.
 * Uses real SMTP credentials if available in .env, otherwise defaults to Ethereal email for safe local testing.
 */
const initTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log('[EMAIL] Using configured SMTP server.');
    } else {
        console.log('[EMAIL] No SMTP config found. Generating Ethereal test account...');
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log('[EMAIL] Ethereal test account generated and ready.');
        } catch (err) {
            console.error('[EMAIL] Failed to create test account:', err);
        }
    }
    return transporter;
};

/**
 * Abstraction layer for actually dispatching messages to specific providers.
 * E.g., SendGrid, Twilio, Slack Webhooks, WebSockets.
 */
export const sendToChannel = async (channel, payload) => {
    switch (channel) {
        case 'EMAIL':
            console.log(`[EMAIL Channel] Preparing to send to: ${payload.to} | Subject: ${payload.subject}`);
            try {
                const mailer = await initTransporter();
                if (mailer) {
                    const info = await mailer.sendMail({
                        from: process.env.SMTP_FROM || '"AnnaPay Notifications" <noreply@annauniv.edu>',
                        to: payload.to,
                        subject: payload.subject,
                        text: payload.message,
                        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                                 <h2 style="color: #0056b3;">AnnaPay Notification</h2>
                                 <p><strong>Subject:</strong> ${payload.subject}</p>
                                 <p style="padding: 15px; border-left: 4px solid #0056b3; background: #f9f9f9;">
                                    ${payload.message}
                                 </p>
                                 <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply.</p>
                               </div>`
                    });
                    console.log(`[EMAIL SUCCESS] Delivery to ${payload.to} successful. Message ID: ${info.messageId}`);
                    // Log the ethereal url if using the test account so you can visually click and see what the sent email looks like
                    if (mailer.options.host === 'smtp.ethereal.email') {
                        console.log(`[EMAIL PREVIEW] View email here: ${nodemailer.getTestMessageUrl(info)}`);
                    }
                }
            } catch (error) {
                console.error(`[EMAIL FAILURE] Failed to deliver to ${payload.to}. Reason:`, error.message);
            }
            break;

        case 'SMS':
            console.log(`[SMS Channel] Sending to: ${payload.to} | Message: ${payload.message}`);
            // TODO: Integration with Twilio / AWS SNS
            break;

        case 'SLACK':
            console.log(`[SLACK Channel] Posting to: ${payload.channel}`);
            // TODO: Integration with Slack Webhooks
            break;

        case 'IN_APP':
            console.log(`[IN-APP Channel] Alerting user group: ${payload.userId}`);
            // Live Push immediately via WebSockets
            broadcastNotification(payload);
            break;

        case 'LOG':
            console.log(`[LOG Channel] Payload:`, payload);
            break;

        default:
            console.error(`[Unknown Channel] ${channel} not supported.`);
    }
};
